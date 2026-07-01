package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"lotto-backend/internal/repositories"
	"lotto-backend/prisma/db"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ── Interface ─────────────────────────────────────────────────────────────────

type LaoService interface {
	GetDraws(ctx context.Context, page, limit int) ([]db.LaoLotteryResultModel, error)
	GetStats(ctx context.Context) (*repositories.LaoStatsResult, error)
	InsertResult(ctx context.Context, dateStr, full string, verified bool) (*db.LaoLotteryResultModel, error)
	SeedBatch(ctx context.Context, entries []LaoSeedEntry) (int, error)
	DeleteResult(ctx context.Context, id string) error
	SyncLatest(ctx context.Context) (*db.LaoLotteryResultModel, error)
}

// LaoSeedEntry represents a single historical Lao draw record for bulk-seeding.
type LaoSeedEntry struct {
	Date     string // ISO "YYYY-MM-DD"
	Full     string // 6-digit draw number
	Verified bool
}

// ── Implementation ────────────────────────────────────────────────────────────

type laoService struct {
	repo  repositories.LaoRepository
	cache CacheService
}

func NewLaoService(repo repositories.LaoRepository, cache CacheService) LaoService {
	return &laoService{repo: repo, cache: cache}
}

func (s *laoService) GetDraws(ctx context.Context, page, limit int) ([]db.LaoLotteryResultModel, error) {
	skip := (page - 1) * limit
	return s.repo.FindAll(ctx, skip, limit)
}

func (s *laoService) DeleteResult(ctx context.Context, id string) error {
	err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	// Invalidate cache
	_ = s.cache.DeleteByPrefix(ctx, "stats:lao:")
	return nil
}

func (s *laoService) GetStats(ctx context.Context) (*repositories.LaoStatsResult, error) {
	const cacheKey = "stats:lao:full"
	var cached repositories.LaoStatsResult
	if err := s.cache.Get(ctx, cacheKey, &cached); err == nil {
		return &cached, nil
	}

	result, err := s.repo.GetStats(ctx)
	if err != nil {
		return nil, err
	}

	// Cache for 6 hours (Lao draws come out ~5 times/week)
	_ = s.cache.Set(ctx, cacheKey, result, 6*time.Hour)
	return result, nil
}

func (s *laoService) InsertResult(ctx context.Context, dateStr, full string, verified bool) (*db.LaoLotteryResultModel, error) {
	if len(full) != 6 {
		return nil, fmt.Errorf("full number must be exactly 6 digits, got %d", len(full))
	}
	for _, ch := range full {
		if ch < '0' || ch > '9' {
			return nil, fmt.Errorf("full number must contain only digits")
		}
	}

	drawDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, fmt.Errorf("invalid date format: %w", err)
	}

	// Derive sub-fields from the 6-digit number:
	// tail4   = full[2:]    → last 4 digits
	// top3    = full[3:]    → last 3 digits
	// top2    = full[4:]    → last 2 digits
	// bottom2 = full[2:4]   → digits at positions 2-3
	model := &db.LaoLotteryResultModel{
		InnerLaoLotteryResult: db.InnerLaoLotteryResult{
			DrawDate:   drawDate,
			Tail4:      full[2:],
			Top3:       full[3:],
			Top2:       full[4:],
			Bottom2:    full[2:4],
			IsVerified: verified,
		},
	}

	saved, err := s.repo.Upsert(ctx, model)
	if err != nil {
		return nil, err
	}

	// Invalidate stats cache on new data
	_ = s.cache.DeleteByPrefix(ctx, "stats:lao:")
	return saved, nil
}

func (s *laoService) SeedBatch(ctx context.Context, entries []LaoSeedEntry) (int, error) {
	count := 0
	for _, e := range entries {
		_, err := s.InsertResult(ctx, e.Date, e.Full, e.Verified)
		if err != nil {
			// Log and continue — don't abort the whole seed on a single bad entry
			continue
		}
		count++
	}
	return count, nil
}

func (s *laoService) SyncLatest(ctx context.Context) (*db.LaoLotteryResultModel, error) {
	entries, err := scrapeLatestLaoDraws()
	if err != nil {
		log.Printf("SyncLatest scrape failed: %v", err)
		return nil, err
	}
	if len(entries) == 0 {
		log.Printf("SyncLatest: no valid entries parsed from index")
		return nil, fmt.Errorf("no valid draws found during scrape")
	}

	var latestDraw *db.LaoLotteryResultModel
	// Insert in chronological order (from oldest to newest)
	for i := len(entries) - 1; i >= 0; i-- {
		entry := entries[i]
		draw, err := s.InsertResult(ctx, entry.Date, entry.Full, entry.Verified)
		if err != nil {
			log.Printf("SyncLatest insert failed for %s: %v", entry.Date, err)
			continue
		}
		latestDraw = draw
	}

	if latestDraw == nil {
		return nil, fmt.Errorf("failed to sync any draws")
	}

	return latestDraw, nil
}

// ── Scraper Helper Functions ───────────────────────────────────────────────────

var thaiMonths = map[string]time.Month{
	"มกราคม":     time.January,
	"กุมภาพันธ์":   time.February,
	"มีนาคม":     time.March,
	"เมษายน":     time.April,
	"พฤษภาคม":    time.May,
	"มิถุนายน":    time.June,
	"กรกฎาคม":    time.July,
	"สิงหาคม":     time.August,
	"กันยายน":    time.September,
	"ตุลาคม":     time.October,
	"พฤศจิกายน":  time.November,
	"ธันวาคม":    time.December,
}

func decodeUnicodeEscapes(s string) string {
	r := regexp.MustCompile(`\\u([0-9a-fA-F]{4})`)
	return r.ReplaceAllStringFunc(s, func(m string) string {
		hex := m[2:]
		val, err := strconv.ParseUint(hex, 16, 32)
		if err != nil {
			return m
		}
		return string(rune(val))
	})
}

func scrapeLatestLaoDraws() ([]LaoSeedEntry, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	url := "https://thethaiger.com/th/news/lotto/"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf(" scrapeLatestLaoDraws: error creating request: %v", err)
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf(" scrapeLatestLaoDraws request error: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf(" scrapeLatestLaoDraws response status: %d", resp.StatusCode)
		return nil, fmt.Errorf("Thaiger lotto category returned HTTP status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf(" scrapeLatestLaoDraws: read error: %v", err)
		return nil, err
	}

	bodyStr := string(body)

	// Regex to find links matching /th/news/xxxxx
	linkRegex := regexp.MustCompile(`/th/news/\d+`)
	matches := linkRegex.FindAllString(bodyStr, -1)
	if len(matches) == 0 {
		log.Printf(" scrapeLatestLaoDraws: no article links found on Thaiger page")
		return nil, fmt.Errorf("no article links found on page")
	}

	seen := make(map[string]bool)
	var articleURLs []string
	for _, u := range matches {
		fullURL := "https://thethaiger.com" + u
		if !seen[fullURL] {
			seen[fullURL] = true
			articleURLs = append(articleURLs, fullURL)
			if len(articleURLs) >= 10 { // Fetch top 10 articles to ensure we find Lao draws
				break
			}
		}
	}

	var entries []LaoSeedEntry
	for _, u := range articleURLs {
		dateStr, full, err := scrapeLaoArticle(client, u)
		if err != nil {
			continue
		}
		entries = append(entries, LaoSeedEntry{
			Date:     dateStr,
			Full:     full,
			Verified: true,
		})
	}

	return entries, nil
}

func scrapeLaoArticle(client *http.Client, url string) (string, string, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf(" scrapeLaoArticle request error for %s: %v", url, err)
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf(" scrapeLaoArticle status code %d for %s", resp.StatusCode, url)
		return "", "", fmt.Errorf("HTTP status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}

	bodyStr := decodeUnicodeEscapes(string(body))

	// Verify that this is a Lao lottery page
	if !strings.Contains(bodyStr, "หวยลาว") && !strings.Contains(bodyStr, "หวยพัฒนา") {
		return "", "", fmt.Errorf("article %s is not related to Lao lottery", url)
	}

	// Regex for 6-digit draw result
	r6 := regexp.MustCompile(`เลข 6 ตัว\s*:\s*(\d{6})`)
	r6Alt := regexp.MustCompile(`เลข 6 ตัว\s*.*?\s*(\d{6})`)
	match6 := r6.FindStringSubmatch(bodyStr)
	if len(match6) < 2 {
		match6 = r6Alt.FindStringSubmatch(bodyStr)
	}
	if len(match6) < 2 {
		return "", "", fmt.Errorf("6-digit number not found in article")
	}
	full := match6[1]

	// Regex for draw date (Thai format)
	rDate := regexp.MustCompile(`งวด(?:ประจำ)?วันที่\s*(\d+)\s+(\S+)\s+(25\d{2}|2\d{3})`)
	rDateAlt := regexp.MustCompile(`งวด\s*(\d+)\s+(\S+)\s+(25\d{2}|2\d{3})`)
	matchDate := rDate.FindStringSubmatch(bodyStr)
	if len(matchDate) < 4 {
		matchDate = rDateAlt.FindStringSubmatch(bodyStr)
	}
	if len(matchDate) < 4 {
		return "", "", fmt.Errorf("draw date not found in article")
	}

	dayStr := matchDate[1]
	monthStr := matchDate[2]
	yearStr := matchDate[3]

	// Map month to integer
	month, ok := thaiMonths[monthStr]
	if !ok {
		// Clean up month string (e.g. remove HTML tags/symbols)
		monthStrClean := regexp.MustCompile(`[^\u0e00-\u0e7f]`).ReplaceAllString(monthStr, "")
		month, ok = thaiMonths[monthStrClean]
		if !ok {
			return "", "", fmt.Errorf("unknown Thai month name: %s", monthStr)
		}
	}

	dayVal, err := strconv.Atoi(dayStr)
	if err != nil {
		return "", "", fmt.Errorf("invalid day: %s", dayStr)
	}

	yearVal, err := strconv.Atoi(yearStr)
	if err != nil {
		return "", "", fmt.Errorf("invalid year: %s", yearStr)
	}

	// Convert BE to CE
	if yearVal > 2400 {
		yearVal -= 543
	}

	dateStr := fmt.Sprintf("%04d-%02d-%02d", yearVal, int(month), dayVal)
	return dateStr, full, nil
}

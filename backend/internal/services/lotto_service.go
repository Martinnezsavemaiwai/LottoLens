package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"lotto-backend/internal/repositories"
	"lotto-backend/prisma/db"
	"net/http"
	"time"
)

type LottoService interface {
	GetDraws(ctx context.Context, page, limit int) ([]db.LottoDrawModel, error)
	GetDrawByDate(ctx context.Context, dateStr string) (*db.LottoDrawModel, error)
	SyncLatest(ctx context.Context) (*db.LottoDrawModel, error)
	RebuildAnalytics(ctx context.Context) error
	AutoSeed(ctx context.Context) error
}

type lottoService struct {
	repo    repositories.LottoRepository
	scraper ScraperService
	chRepo  repositories.ClickHouseRepo
	cache   CacheService
}

func NewLottoService(repo repositories.LottoRepository, scraper ScraperService, chRepo repositories.ClickHouseRepo, cache CacheService) LottoService {
	return &lottoService{repo: repo, scraper: scraper, chRepo: chRepo, cache: cache}
}

func (s *lottoService) GetDraws(ctx context.Context, page, limit int) ([]db.LottoDrawModel, error) {
	skip := (page - 1) * limit
	return s.repo.FindAll(ctx, skip, limit)
}

func (s *lottoService) GetDrawByDate(ctx context.Context, dateStr string) (*db.LottoDrawModel, error) {
	// dateStr format: "2024-03-16"
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, err
	}
	return s.repo.FindByDate(ctx, date)
}

func (s *lottoService) SyncLatest(ctx context.Context) (*db.LottoDrawModel, error) {
	// 1. Scrape data
	latest, err := s.scraper.FetchLatest()
	if err != nil {
		return nil, err
	}

	// 2. Save to DB (Upsert)
	if latest.FirstPrize == "xxxxxx" || latest.FirstPrize == "" {
		return nil, fmt.Errorf("latest draw results are not yet available (xxxxxx)")
	}

	draw, err := s.repo.Upsert(ctx, latest)
	if err != nil {
		return nil, err
	}

	// 3. Sync to ClickHouse (Soft fail)
	if s.chRepo != nil {
		if err := s.chRepo.InsertDrawAnalytics(ctx, draw); err != nil {
			log.Printf("⚠️ ClickHouse Sync Error: %v", err)
		} else {
			log.Printf("✅ ClickHouse Sync Success for date: %v", draw.DrawDate)
			
			// 4. Invalidate Cache
			if err := s.cache.DeleteByPrefix(ctx, "stats:"); err != nil {
				log.Printf("⚠️ Cache Invalidation Error: %v", err)
			} else {
				log.Printf("🧹 Cache invalidated for prefix 'stats:'")
			}
		}
	}

	return draw, nil
}

func (s *lottoService) RebuildAnalytics(ctx context.Context) error {
	if s.chRepo == nil {
		return nil
	}

	// 1. Fetch all from Postgres
	draws, err := s.repo.FindAll(ctx, 0, 1000) // Adjust limit if needed
	if err != nil {
		return err
	}

	log.Printf("🔄 Rebuilding ClickHouse analytics for %d draws...", len(draws))

	// 1.5 Truncate
	if err := s.chRepo.TruncateAnalytics(ctx); err != nil {
		log.Printf("⚠️ Truncate Error: %v", err)
	}

	for _, d := range draws {
		if err := s.chRepo.InsertDrawAnalytics(ctx, &d); err != nil {
			log.Printf("⚠️  Error inserting draw %v: %v", d.DrawDate, err)
		}
	}

	// 2. Invalidate Cache
	_ = s.cache.DeleteByPrefix(ctx, "stats:")
	log.Println("✅ ClickHouse analytics rebuild complete!")
	
	return nil
}
func (s *lottoService) AutoSeed(ctx context.Context) error {
	count, err := s.repo.Count(ctx)
	if err != nil {
		return err
	}

	if count > 0 {
		log.Printf("📊 Database already has %d draws, skipping auto-seed", count)
		return nil
	}

	log.Println("🚀 Cold Start detected! Automatically seeding historical data (target ~240 draws)...")

	// We fetch 12 pages (12 * 20 = 240 draws)
	maxPages := 12
	totalSaved := 0

	go func() {
		bgCtx := context.Background()
		for page := 1; page <= maxPages; page++ {
			listURL := fmt.Sprintf("https://lotto.api.rayriffy.com/list/%d", page)
			resp, err := http.Get(listURL)
			if err != nil {
				log.Printf("❌ Failed to fetch list page %d: %v", page, err)
				continue
			}

			var listData struct {
				Response []struct {
					ID string `json:"id"`
				} `json:"response"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&listData); err != nil {
				resp.Body.Close()
				continue
			}
			resp.Body.Close()

			if len(listData.Response) == 0 {
				break
			}

			for _, item := range listData.Response {
				// Check if exists (safety)
				// Note: we just checked count == 0, but for robustness:
				draw, err := s.scraper.FetchByID(item.ID)
				if err != nil {
					log.Printf("⚠️ Skip draw %s: %v", item.ID, err)
					continue
				}

				if draw.FirstPrize == "" || draw.Back2 == "" || draw.FirstPrize == "xxxxxx" {
					continue
				}

				saved, err := s.repo.Upsert(bgCtx, draw)
				if err == nil {
					totalSaved++
					// Also sync to ClickHouse
					if s.chRepo != nil {
						_ = s.chRepo.InsertDrawAnalytics(bgCtx, saved)
					}
				}
				
				// Small delay to avoid 429
				time.Sleep(800 * time.Millisecond)
			}
			log.Printf("✅ Auto-seed progress: Page %d finished. Total saved: %d", page, totalSaved)
		}
		
		log.Printf("🏁 Auto-seed complete! Total draws: %d. Invalidating cache...", totalSaved)
		
		// Final cleanup for any future placeholder draws that might have slipped in
		_, _ = s.repo.DeleteByPrize(bgCtx, "xxxxxx")
		
		_ = s.cache.DeleteByPrefix(bgCtx, "stats:")
	}()

	return nil
}

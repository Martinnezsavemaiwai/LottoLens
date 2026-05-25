package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"lotto-backend/prisma/db"
	"net/http"
	"strconv"
	"time"
)

type GloResponse struct {
	Status        interface{} `json:"status"` // Decode status dynamically (bool or string)
	StatusCode    interface{} `json:"statusCode"`
	StatusMessage string      `json:"statusMessage"`
	Response      *struct {
		Result *struct {
			Date    string `json:"date"`
			PdfURL  string `json:"pdf_url"`
			Data    struct {
				First  GloPrize `json:"first"`
				Second GloPrize `json:"second"`
				Third  GloPrize `json:"third"`
				Fourth GloPrize `json:"fourth"`
				Fifth  GloPrize `json:"fifth"`
				Last2  GloPrize `json:"last2"`
				Last3f GloPrize `json:"last3f"`
				Last3b GloPrize `json:"last3b"`
				Near1  GloPrize `json:"near1"`
			} `json:"data"`
		} `json:"result"`
	} `json:"response"`
}

type GloPrize struct {
	Price  string `json:"price"`
	Number []struct {
		Round interface{} `json:"round"` // Can be int or string
		Value string      `json:"value"`
	} `json:"number"`
}

type ScraperService interface {
	FetchLatest() (*db.LottoDrawModel, error)
	FetchByID(id string) (*db.LottoDrawModel, error)
}

type scraperService struct{}

func NewScraperService() ScraperService {
	return &scraperService{}
}

func (s *scraperService) FetchLatest() (*db.LottoDrawModel, error) {
	// Try candidate dates going backwards from Bangkok time
	loc, err := time.LoadLocation("Asia/Bangkok")
	var now time.Time
	if err != nil {
		// Fallback to UTC+7 offset if zoneinfo is not packed in container
		now = time.Now().UTC().Add(7 * time.Hour)
	} else {
		now = time.Now().In(loc)
	}

	candidates := getCandidateDrawDates(now)
	for _, c := range candidates {
		day := fmt.Sprintf("%02d", c.Day())
		month := fmt.Sprintf("%02d", int(c.Month()))
		year := fmt.Sprintf("%04d", c.Year())

		draw, err := s.fetchFromGlo(day, month, year)
		if err == nil && draw != nil && draw.FirstPrize != "" && draw.FirstPrize != "xxxxxx" {
			log.Printf("🎉 Successfully fetched latest draw from GLO API for date: %s", draw.DrawDate.Format("2006-01-02"))
			return draw, nil
		}
	}

	return nil, fmt.Errorf("failed to fetch latest draw results from GLO API after trying several candidate dates")
}

func (s *scraperService) FetchByID(id string) (*db.LottoDrawModel, error) {
	// Old Rayriffy ID format was ddmmyyyy (e.g. "16052026")
	if len(id) < 8 {
		return nil, fmt.Errorf("invalid draw ID format: %s", id)
	}
	day := id[0:2]
	month := id[2:4]
	year := id[4:8]

	// Check if BE year is supplied (e.g., > 2400) and convert to AD if so
	yInt, err := strconv.Atoi(year)
	if err == nil && yInt > 2400 {
		year = fmt.Sprintf("%04d", yInt-543)
	}

	return s.fetchFromGlo(day, month, year)
}

func (s *scraperService) fetchFromGlo(day, month, year string) (*db.LottoDrawModel, error) {
	url := "https://www.glo.or.th/api/checking/getLotteryResult"

	reqBody, err := json.Marshal(map[string]string{
		"date":  day,
		"month": month,
		"year":  year,
	})
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GLO API returned HTTP status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var gloResp GloResponse
	if err := json.Unmarshal(body, &gloResp); err != nil {
		return nil, err
	}

	if gloResp.Response == nil || gloResp.Response.Result == nil || gloResp.Response.Result.Date == "" {
		return nil, fmt.Errorf("no lottery draw data found for date %s-%s-%s", year, month, day)
	}

	result := gloResp.Response.Result

	// Map to LottoDrawModel
	drawDate, err := time.Parse("2006-01-02", result.Date)
	if err != nil {
		return nil, fmt.Errorf("failed to parse draw date %s: %v", result.Date, err)
	}

	firstPrize := ""
	if len(result.Data.First.Number) > 0 {
		firstPrize = result.Data.First.Number[0].Value
	}

	back2 := ""
	if len(result.Data.Last2.Number) > 0 {
		back2 = result.Data.Last2.Number[0].Value
	}

	return &db.LottoDrawModel{
		InnerLottoDraw: db.InnerLottoDraw{
			DrawDate:     drawDate,
			DrawDay:      drawDate.Day(),
			Month:        int(drawDate.Month()),
			Year:         drawDate.Year(),
			FirstPrize:   firstPrize,
			NearbyPrizes: mapGloPrizeToJSON(result.Data.Near1),
			SecondPrizes: mapGloPrizeToJSON(result.Data.Second),
			ThirdPrizes:  mapGloPrizeToJSON(result.Data.Third),
			FourthPrizes: mapGloPrizeToJSON(result.Data.Fourth),
			FifthPrizes:  mapGloPrizeToJSON(result.Data.Fifth),
			Front3:       mapGloPrizeToJSON(result.Data.Last3f),
			Back3:        mapGloPrizeToJSON(result.Data.Last3b),
			Back2:        back2,
		},
	}, nil
}

func mapGloPrizeToJSON(gp GloPrize) []byte {
	nums := []string{}
	for _, n := range gp.Number {
		if n.Value != "" {
			nums = append(nums, n.Value)
		}
	}
	b, _ := json.Marshal(nums)
	return b
}

func getCandidateDrawDates(t time.Time) []time.Time {
	candidates := []time.Time{}
	y, m, d := t.Date()

	currYear := y
	currMonth := m

	// Generate candidates for the current month and the last 2 months (total 6 draws)
	for i := 0; i < 3; i++ {
		targetYear := currYear
		targetMonth := currMonth - time.Month(i)
		if targetMonth <= 0 {
			targetMonth += 12
			targetYear -= 1
		}

		if i == 0 {
			if d >= 16 {
				candidates = append(candidates, time.Date(targetYear, targetMonth, 16, 0, 0, 0, 0, time.UTC))
				candidates = append(candidates, time.Date(targetYear, targetMonth, 1, 0, 0, 0, 0, time.UTC))
			} else {
				candidates = append(candidates, time.Date(targetYear, targetMonth, 1, 0, 0, 0, 0, time.UTC))
			}
		} else {
			candidates = append(candidates, time.Date(targetYear, targetMonth, 16, 0, 0, 0, 0, time.UTC))
			candidates = append(candidates, time.Date(targetYear, targetMonth, 1, 0, 0, 0, 0, time.UTC))
		}
	}

	// Add special shifted dates (May 1 -> May 2, Jan 1 -> Dec 30/Jan 2)
	adjustedCandidates := []time.Time{}
	for _, c := range candidates {
		cy, cm, cd := c.Date()
		if cm == time.May && cd == 1 {
			adjustedCandidates = append(adjustedCandidates, time.Date(cy, cm, 2, 0, 0, 0, 0, time.UTC))
		}
		if cm == time.January && cd == 1 {
			adjustedCandidates = append(adjustedCandidates, time.Date(cy, cm, 2, 0, 0, 0, 0, time.UTC))
			adjustedCandidates = append(adjustedCandidates, time.Date(cy-1, time.December, 30, 0, 0, 0, 0, time.UTC))
		}
		adjustedCandidates = append(adjustedCandidates, c)
	}

	return adjustedCandidates
}

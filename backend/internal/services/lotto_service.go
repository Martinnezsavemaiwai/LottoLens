package services

import (
	"context"
	"log"
	"lotto-backend/internal/repositories"
	"lotto-backend/prisma/db"
	"time"
)

type LottoService interface {
	GetDraws(ctx context.Context, page, limit int) ([]db.LottoDrawModel, error)
	GetDrawByDate(ctx context.Context, dateStr string) (*db.LottoDrawModel, error)
	SyncLatest(ctx context.Context) (*db.LottoDrawModel, error)
	RebuildAnalytics(ctx context.Context) error
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

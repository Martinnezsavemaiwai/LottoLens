package services

import (
	"context"
	"fmt"
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

	targetCount := 240
	if count >= targetCount {
		log.Printf("📊 Database already has %d draws, skipping auto-seed", count)
		return nil
	}

	log.Printf("🚀 Backfill/Seeding detected! Database has %d draws, target is at least %d draws. Starting background backfiller...", count, targetCount)

	go func() {
		bgCtx := context.Background()
		
		loc, err := time.LoadLocation("Asia/Bangkok")
		var now time.Time
		if err != nil {
			now = time.Now().UTC().Add(7 * time.Hour)
		} else {
			now = time.Now().In(loc)
		}
		
		currYear := now.Year()
		currMonth := now.Month()
		
		totalSaved := 0
		failuresInARow := 0
		
		// Loop backwards up to 130 months (~10 years, which has 260 possible draws)
		for i := 0; i < 130; i++ {
			c, err := s.repo.Count(bgCtx)
			if err == nil && c >= targetCount {
				log.Printf("🏁 Target count of %d draws reached! Historical backfill successfully completed. Total saved in this session: %d", targetCount, totalSaved)
				break
			}
			
			targetMonth := currMonth - time.Month(i)
			targetYear := currYear
			for targetMonth <= 0 {
				targetMonth += 12
				targetYear -= 1
			}
			
			daysToTry := []int{16, 1}
			
			for _, day := range daysToTry {
				checkDate := time.Date(targetYear, targetMonth, day, 0, 0, 0, 0, time.UTC)
				
				// Skip if this date already exists in the database
				exists, err := s.repo.FindByDate(bgCtx, checkDate)
				if err == nil && exists != nil {
					continue
				}
				
				id := fmt.Sprintf("%02d%02d%04d", day, int(targetMonth), targetYear)
				draw, err := s.scraper.FetchByID(id)
				if err != nil {
					// Try shifted dates if standard date fails (e.g. May 2nd, Jan 2nd, Dec 30th)
					if targetMonth == time.May && day == 1 {
						draw, err = s.scraper.FetchByID(fmt.Sprintf("0205%04d", targetYear))
					}
					if targetMonth == time.January && day == 1 {
						draw, err = s.scraper.FetchByID(fmt.Sprintf("0201%04d", targetYear))
						if err != nil {
							draw, err = s.scraper.FetchByID(fmt.Sprintf("3012%04d", targetYear-1))
						}
					}
				}
				
				if err != nil || draw == nil || draw.FirstPrize == "" || draw.FirstPrize == "xxxxxx" {
					log.Printf("⚠️ Failed to fetch draw %s: %v", id, err)
					failuresInARow++
					if failuresInARow > 15 {
						log.Printf("⚠️ Too many failures in a row (%d), stopping historical backfill to protect GLO API.", failuresInARow)
						break
					}
					continue
				}
				
				failuresInARow = 0
				
				saved, err := s.repo.Upsert(bgCtx, draw)
				if err == nil {
					totalSaved++
					log.Printf("✅ Backfiller successfully saved historical draw: %s (First Prize: %s)", draw.DrawDate.Format("2006-01-02"), draw.FirstPrize)
					if s.chRepo != nil {
						_ = s.chRepo.InsertDrawAnalytics(bgCtx, saved)
					}
				}
				
				// Respectful rate limit delay (100ms)
				time.Sleep(100 * time.Millisecond)
			}
			
			if failuresInARow > 15 {
				break
			}
		}
		
		_ = s.cache.DeleteByPrefix(bgCtx, "stats:")
		log.Printf("🏁 Seeding session completed. Total draws saved in this run: %d", totalSaved)
	}()

	return nil
}

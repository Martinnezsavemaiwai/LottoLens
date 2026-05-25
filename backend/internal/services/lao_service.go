package services

import (
	"context"
	"fmt"
	"lotto-backend/internal/repositories"
	"lotto-backend/prisma/db"
	"time"
)

// ── Interface ─────────────────────────────────────────────────────────────────

type LaoService interface {
	GetDraws(ctx context.Context, page, limit int) ([]db.LaoLotteryResultModel, error)
	GetStats(ctx context.Context) (*repositories.LaoStatsResult, error)
	InsertResult(ctx context.Context, dateStr, full string, verified bool) (*db.LaoLotteryResultModel, error)
	SeedBatch(ctx context.Context, entries []LaoSeedEntry) (int, error)
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

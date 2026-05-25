package services

import (
	"context"
	"fmt"
	"lotto-backend/internal/repositories"
	"time"
)

type AnalyticsService interface {
	GetFrequencyStats(ctx context.Context, prizeType string, limit int) ([]repositories.FreqResult, error)
	GetPositionalStats(ctx context.Context, prizeType string) (*repositories.PositionalFreqResult, error)
	GetZScoresStats(ctx context.Context, prizeType string) ([]repositories.DigitZScore, error)
}

type analyticsService struct {
	chRepo repositories.ClickHouseRepo
	cache  CacheService
}

func NewAnalyticsService(chRepo repositories.ClickHouseRepo, cache CacheService) AnalyticsService {
	return &analyticsService{chRepo: chRepo, cache: cache}
}

func (s *analyticsService) GetFrequencyStats(ctx context.Context, prizeType string, limit int) ([]repositories.FreqResult, error) {
	cacheKey := fmt.Sprintf("stats:freq:%s:%d", prizeType, limit)
	var stats []repositories.FreqResult

	// Try cache
	if err := s.cache.Get(ctx, cacheKey, &stats); err == nil {
		return stats, nil
	}

	if s.chRepo == nil {
		return nil, fmt.Errorf("clickhouse repository is not initialized")
	}
	if limit <= 0 {
		limit = 10
	}
	
	stats, err := s.chRepo.GetFrequency(ctx, prizeType, limit)
	if err == nil {
		_ = s.cache.Set(ctx, cacheKey, stats, 24*time.Hour)
	}
	return stats, err
}

func (s *analyticsService) GetPositionalStats(ctx context.Context, prizeType string) (*repositories.PositionalFreqResult, error) {
	cacheKey := fmt.Sprintf("stats:pos:%s", prizeType)
	var stats *repositories.PositionalFreqResult

	// Try cache
	if err := s.cache.Get(ctx, cacheKey, &stats); err == nil {
		return stats, nil
	}

	if s.chRepo == nil {
		return nil, fmt.Errorf("clickhouse repository is not initialized")
	}

	stats, err := s.chRepo.GetPositionalFrequency(ctx, prizeType)
	if err == nil {
		_ = s.cache.Set(ctx, cacheKey, stats, 24*time.Hour)
	}
	return stats, err
}

func (s *analyticsService) GetZScoresStats(ctx context.Context, prizeType string) ([]repositories.DigitZScore, error) {
	cacheKey := fmt.Sprintf("stats:zscores:%s", prizeType)
	var stats []repositories.DigitZScore

	// Try cache
	if err := s.cache.Get(ctx, cacheKey, &stats); err == nil {
		return stats, nil
	}

	if s.chRepo == nil {
		return nil, fmt.Errorf("clickhouse repository is not initialized")
	}

	stats, err := s.chRepo.GetZScores(ctx, prizeType)
	if err == nil {
		_ = s.cache.Set(ctx, cacheKey, stats, 24*time.Hour)
	}
	return stats, err
}


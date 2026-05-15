package services

import (
	"context"
	"lotto-backend/internal/repositories"
	"time"
	"fmt"
)

type StatsService interface {
	GetSummary(ctx context.Context) (map[string]interface{}, error)
}

type statsService struct {
	chRepo repositories.ClickHouseRepo
	cache  CacheService
}

func NewStatsService(chRepo repositories.ClickHouseRepo, cache CacheService) StatsService {
	return &statsService{chRepo: chRepo, cache: cache}
}

func (s *statsService) GetSummary(ctx context.Context) (map[string]interface{}, error) {
	cacheKey := "stats_summary"
	var summary map[string]interface{}

	// 1. ลองดึงจาก Cache
	if err := s.cache.Get(ctx, cacheKey, &summary); err == nil {
		return summary, nil
	}

	// 2. ถ้าไม่มีใน Cache ให้คำนวณใหม่
	if s.chRepo == nil {
		return nil, fmt.Errorf("ClickHouse repository is not initialized. Please ensure ClickHouse is running.")
	}

	freq, err := s.chRepo.GetFrequency(ctx, "back2", 10)
	if err != nil {
		return nil, err
	}

	// จำลอง Markov Chain (ในระบบจริงจะใช้ Query ที่ซับซ้อนกว่านี้ใน ClickHouse)
	markov := map[string]float64{
		"09": 0.15,
		"88": 0.12,
		"11": 0.08,
	}

	summary = map[string]interface{}{
		"top_frequency": freq,
		"markov_preds":  markov,
		"generated_at":  time.Now().Format(time.RFC3339),
	}

	// 3. เซฟลง Cache (TTL 24h)
	_ = s.cache.Set(ctx, cacheKey, summary, 24*time.Hour)

	return summary, nil
}

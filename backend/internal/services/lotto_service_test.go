package services

import (
	"context"
	"errors"
	"lotto-backend/prisma/db"
	"lotto-backend/internal/repositories"
	"testing"
	"time"
)

// ── Mock Repository ──
type mockLottoRepo struct {
	draws []db.LottoDrawModel
	err   error
}

func (m *mockLottoRepo) FindAll(ctx context.Context, skip, take int) ([]db.LottoDrawModel, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.draws, nil
}

func (m *mockLottoRepo) FindByDate(ctx context.Context, date time.Time) (*db.LottoDrawModel, error) {
	if m.err != nil {
		return nil, m.err
	}
	if len(m.draws) > 0 {
		return &m.draws[0], nil
	}
	return nil, errors.New("not found")
}

func (m *mockLottoRepo) Upsert(ctx context.Context, d *db.LottoDrawModel) (*db.LottoDrawModel, error) {
	return d, nil
}

func (m *mockLottoRepo) FindLatest(ctx context.Context) (*db.LottoDrawModel, error) {
	if len(m.draws) > 0 {
		return &m.draws[0], nil
	}
	return nil, nil
}

func (m *mockLottoRepo) Count(ctx context.Context) (int, error) {
	return len(m.draws), nil
}

func (m *mockLottoRepo) DeleteByPrize(ctx context.Context, prize string) (int, error) {
	return 0, nil
}

// ── Mock ClickHouse Repository ──
type mockClickHouseRepo struct{}

func (m *mockClickHouseRepo) InitAnalyticsTable() error { return nil }
func (m *mockClickHouseRepo) InsertDrawAnalytics(ctx context.Context, draw *db.LottoDrawModel) error {
	return nil
}
func (m *mockClickHouseRepo) GetFrequency(ctx context.Context, prizeType string, limit int) ([]repositories.FreqResult, error) {
	return nil, nil
}
func (m *mockClickHouseRepo) GetPositionalFrequency(ctx context.Context, prizeType string) (*repositories.PositionalFreqResult, error) {
	return nil, nil
}
func (m *mockClickHouseRepo) GetZScores(ctx context.Context, prizeType string) ([]repositories.DigitZScore, error) {
	return nil, nil
}
func (m *mockClickHouseRepo) GetMarkovTransitions(ctx context.Context, prizeType string, lastNum string) ([]repositories.MarkovResult, error) {
	return nil, nil
}
func (m *mockClickHouseRepo) GetRecencyWeightedStats(ctx context.Context, prizeType string) ([]repositories.WeightedResult, error) {
	return nil, nil
}
func (m *mockClickHouseRepo) TruncateAnalytics(ctx context.Context) error { return nil }
func (m *mockClickHouseRepo) Ping(ctx context.Context) error             { return nil }

// ── Mock Cache Service ──
type mockCacheService struct{}

func (m *mockCacheService) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	return nil
}
func (m *mockCacheService) Get(ctx context.Context, key string, dest interface{}) error {
	return errors.New("not found")
}
func (m *mockCacheService) Delete(ctx context.Context, key string) error             { return nil }
func (m *mockCacheService) DeleteByPrefix(ctx context.Context, prefix string) error { return nil }
func (m *mockCacheService) Ping(ctx context.Context) error                          { return nil }

// ── Mock Scraper Service ──
type mockScraperService struct{}
func (m *mockScraperService) FetchLatest() (*db.LottoDrawModel, error) { return nil, nil }
func (m *mockScraperService) FetchByID(id string) (*db.LottoDrawModel, error) { return nil, nil }

// ── Tests ──

func TestGetDraws(t *testing.T) {
	// Setup
	mockRepo := &mockLottoRepo{
		draws: []db.LottoDrawModel{
			{InnerLottoDraw: db.InnerLottoDraw{FirstPrize: "123456", Back2: "88"}},
			{InnerLottoDraw: db.InnerLottoDraw{FirstPrize: "654321", Back2: "11"}},
		},
	}
	service := NewLottoService(mockRepo, &mockScraperService{}, &mockClickHouseRepo{}, &mockCacheService{})

	// Execute
	results, err := service.GetDraws(context.Background(), 1, 10)

	// Assert
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if len(results) != 2 {
		t.Errorf("Expected 2 results, got %d", len(results))
	}
	if results[0].FirstPrize != "123456" {
		t.Errorf("Expected first prize 123456, got %s", results[0].FirstPrize)
	}
}

func TestGetDrawByDate_InvalidFormat(t *testing.T) {
	service := NewLottoService(nil, nil, nil, nil)
	_, err := service.GetDrawByDate(context.Background(), "invalid-date")

	if err == nil {
		t.Error("Expected error for invalid date format, got nil")
	}
}

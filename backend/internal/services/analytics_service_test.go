package services

import (
	"context"
	"errors"
	"testing"

	"lotto-backend/internal/repositories"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Mock ClickHouseRepo (extended with all interface methods) ─────────────────
// NOTE: The base mock types (mockClickHouseRepo, mockCacheService) are defined
// in lotto_service_test.go (same package) and reused here.

// analyticsClickHouseMock — overrides specific methods for analytics tests
type analyticsClickHouseMock struct {
	mockClickHouseRepo // embed base (returns nil,nil)
	freqResult         []repositories.FreqResult
	posResult          *repositories.PositionalFreqResult
	zScoreResult       []repositories.DigitZScore
	err                error
}

func (m *analyticsClickHouseMock) GetFrequency(_ context.Context, _ string, _ int) ([]repositories.FreqResult, error) {
	return m.freqResult, m.err
}
func (m *analyticsClickHouseMock) GetPositionalFrequency(_ context.Context, _ string) (*repositories.PositionalFreqResult, error) {
	return m.posResult, m.err
}
func (m *analyticsClickHouseMock) GetZScores(_ context.Context, _ string) ([]repositories.DigitZScore, error) {
	return m.zScoreResult, m.err
}

// cacheMissService — always returns cache miss (forces DB call)
type cacheMissService struct{ mockCacheService }

// cacheHitFreqService — simulates a cache hit for frequency stats
type cacheHitFreqService struct {
	mockCacheService
	data []repositories.FreqResult
}

func (m *cacheHitFreqService) Get(_ context.Context, _ string, dest interface{}) error {
	// Copy data into dest via type assertion
	if ptr, ok := dest.(*[]repositories.FreqResult); ok {
		*ptr = m.data
		return nil
	}
	return errors.New("type mismatch")
}

// ── Tests: GetFrequencyStats ──────────────────────────────────────────────────

func TestGetFrequencyStats_FromClickHouse(t *testing.T) {
	expected := []repositories.FreqResult{
		{Number: "88", Count: 25},
		{Number: "55", Count: 20},
	}
	chMock := &analyticsClickHouseMock{freqResult: expected}
	svc := NewAnalyticsService(chMock, &mockCacheService{})

	result, err := svc.GetFrequencyStats(context.Background(), "back2", 10)

	require.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestGetFrequencyStats_FromCache(t *testing.T) {
	cachedData := []repositories.FreqResult{
		{Number: "11", Count: 50},
	}
	// chMock would error if called — but cache hit should prevent it
	chMock := &analyticsClickHouseMock{err: errors.New("should not be called")}
	cacheSvc := &cacheHitFreqService{data: cachedData}
	svc := NewAnalyticsService(chMock, cacheSvc)

	result, err := svc.GetFrequencyStats(context.Background(), "back2", 10)

	require.NoError(t, err)
	assert.Equal(t, cachedData, result)
}

func TestGetFrequencyStats_NilRepo(t *testing.T) {
	svc := NewAnalyticsService(nil, &mockCacheService{})

	_, err := svc.GetFrequencyStats(context.Background(), "back2", 10)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "clickhouse")
}

func TestGetFrequencyStats_ZeroLimit(t *testing.T) {
	// limit=0 should default to 10 inside service
	expected := make([]repositories.FreqResult, 10)
	for i := range expected {
		expected[i] = repositories.FreqResult{Number: "00", Count: uint64(i)}
	}
	chMock := &analyticsClickHouseMock{freqResult: expected}
	svc := NewAnalyticsService(chMock, &mockCacheService{})

	result, err := svc.GetFrequencyStats(context.Background(), "back2", 0)

	require.NoError(t, err)
	assert.NotNil(t, result)
}

// ── Tests: GetPositionalStats ─────────────────────────────────────────────────

func TestGetPositionalStats_Success(t *testing.T) {
	expected := &repositories.PositionalFreqResult{
		Pos1: []repositories.DigitCount{{Digit: 1, Count: 10}},
		Pos2: []repositories.DigitCount{{Digit: 2, Count: 8}},
		Pos3: []repositories.DigitCount{{Digit: 3, Count: 5}},
	}
	chMock := &analyticsClickHouseMock{posResult: expected}
	svc := NewAnalyticsService(chMock, &mockCacheService{})

	result, err := svc.GetPositionalStats(context.Background(), "back2")

	require.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestGetPositionalStats_NilRepo(t *testing.T) {
	svc := NewAnalyticsService(nil, &mockCacheService{})

	_, err := svc.GetPositionalStats(context.Background(), "back2")

	assert.Error(t, err)
}

func TestGetPositionalStats_ClickHouseError(t *testing.T) {
	chMock := &analyticsClickHouseMock{err: errors.New("clickhouse timeout")}
	svc := NewAnalyticsService(chMock, &mockCacheService{})

	_, err := svc.GetPositionalStats(context.Background(), "back2")

	assert.Error(t, err)
}

// ── Tests: GetZScoresStats ────────────────────────────────────────────────────

func TestGetZScoresStats_Success(t *testing.T) {
	expected := []repositories.DigitZScore{
		{Digit: 5, Count: 20, ZScore: 1.5},
		{Digit: 3, Count: 10, ZScore: -0.5},
	}
	chMock := &analyticsClickHouseMock{zScoreResult: expected}
	svc := NewAnalyticsService(chMock, &mockCacheService{})

	result, err := svc.GetZScoresStats(context.Background(), "back2")

	require.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestGetZScoresStats_NilRepo(t *testing.T) {
	svc := NewAnalyticsService(nil, &mockCacheService{})

	_, err := svc.GetZScoresStats(context.Background(), "back2")

	assert.Error(t, err)
}


package handlers_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"lotto-backend/internal/handlers"
	"lotto-backend/internal/repositories"
	"lotto-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Mock AnalyticsService ─────────────────────────────────────────────────────

type mockAnalyticsService struct {
	freqResult []repositories.FreqResult
	posResult  *repositories.PositionalFreqResult
	zScoreResult []repositories.DigitZScore
	err        error
}

func (m *mockAnalyticsService) GetFrequencyStats(_ context.Context, _ string, _ int) ([]repositories.FreqResult, error) {
	return m.freqResult, m.err
}
func (m *mockAnalyticsService) GetPositionalStats(_ context.Context, _ string) (*repositories.PositionalFreqResult, error) {
	return m.posResult, m.err
}
func (m *mockAnalyticsService) GetZScoresStats(_ context.Context, _ string) ([]repositories.DigitZScore, error) {
	return m.zScoreResult, m.err
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newStatsTestApp(svc services.AnalyticsService) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		},
	})
	h := handlers.NewStatsHandler(svc)
	app.Get("/stats/frequency", h.GetFrequency)
	app.Get("/stats/positional", h.GetPositional)
	app.Get("/stats/zscores", h.GetZScores)
	return app
}

func doStatsRequest(t *testing.T, app *fiber.App, path string) *http.Response {
	t.Helper()
	req := httptest.NewRequest("GET", path, nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)
	return resp
}

// ── GetFrequency Tests ────────────────────────────────────────────────────────

func TestGetFrequency_ValidParams(t *testing.T) {
	data := []repositories.FreqResult{
		{Number: "88", Count: 25},
		{Number: "55", Count: 20},
	}
	svc := &mockAnalyticsService{freqResult: data}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/frequency?prize_type=back2&limit=10")

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "back2", body["prize_type"])
	assert.Contains(t, body, "data")
}

func TestGetFrequency_InvalidPrizeType(t *testing.T) {
	// The handler returns 200 with empty data for invalid prize types
	svc := &mockAnalyticsService{}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/frequency?prize_type=invalid")

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	dataArr, ok := body["data"].([]interface{})
	require.True(t, ok, "expected data to be an array")
	assert.Empty(t, dataArr, "expected empty data for invalid prize type")
}

func TestGetFrequency_DefaultLimit(t *testing.T) {
	// No limit param — should default to 10
	svc := &mockAnalyticsService{freqResult: []repositories.FreqResult{}}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/frequency?prize_type=back2")

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestGetFrequency_ServiceError(t *testing.T) {
	svc := &mockAnalyticsService{err: errors.New("clickhouse connection timeout")}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/frequency?prize_type=back2")

	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
}

// ── GetPositional Tests ───────────────────────────────────────────────────────

func TestGetPositional_ValidParams(t *testing.T) {
	data := &repositories.PositionalFreqResult{
		Pos1: []repositories.DigitCount{{Digit: 5, Count: 10}},
		Pos2: []repositories.DigitCount{{Digit: 3, Count: 8}},
		Pos3: []repositories.DigitCount{{Digit: 1, Count: 6}},
	}
	svc := &mockAnalyticsService{posResult: data}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/positional?prize_type=back2")

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "back2", body["prize_type"])
	assert.Contains(t, body, "data")
}

func TestGetPositional_InvalidPrizeType(t *testing.T) {
	svc := &mockAnalyticsService{}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/positional?prize_type=invalid")

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestGetPositional_ServiceError(t *testing.T) {
	svc := &mockAnalyticsService{err: errors.New("db error")}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/positional?prize_type=back2")

	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
}

// ── GetZScores Tests ──────────────────────────────────────────────────────────

func TestGetZScores_ValidParams(t *testing.T) {
	data := []repositories.DigitZScore{
		{Digit: 5, Count: 20, ZScore: 1.5},
		{Digit: 3, Count: 10, ZScore: -0.5},
	}
	svc := &mockAnalyticsService{zScoreResult: data}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/zscores?prize_type=back2")

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "back2", body["prize_type"])
	dataArr, ok := body["data"].([]interface{})
	require.True(t, ok)
	assert.Len(t, dataArr, 2)
}

func TestGetZScores_InvalidPrizeType(t *testing.T) {
	svc := &mockAnalyticsService{}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/zscores?prize_type=invalid")

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestGetZScores_ServiceError(t *testing.T) {
	svc := &mockAnalyticsService{err: errors.New("query failed")}
	app := newStatsTestApp(svc)

	resp := doStatsRequest(t, app, "/stats/zscores?prize_type=back2")

	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
}

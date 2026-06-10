package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"lotto-backend/internal/handlers"
	"lotto-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Mock AIService ────────────────────────────────────────────────────────────

type mockAIService struct {
	contextResult       *services.AIResponse
	contextErr          error
	predictResult       *services.AIPredictionResponse
	predictErr          error
	capturedSkipContext bool
	capturedPrompt      string
}

func (m *mockAIService) GenerateMathContext(_ context.Context, _ string) (*services.AIResponse, error) {
	return m.contextResult, m.contextErr
}
func (m *mockAIService) Predict(_ context.Context, _ string, _ int, prompt, _ string, skipContext bool) (*services.AIPredictionResponse, error) {
	m.capturedSkipContext = skipContext
	m.capturedPrompt = prompt
	return m.predictResult, m.predictErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newAITestApp(svc services.AIService) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		},
	})
	h := handlers.NewAIHandler(svc)
	app.Get("/ai/context", h.GetContext)
	app.Get("/ai/predict", h.Predict)
	app.Post("/ai/predict", h.Predict)
	return app
}

// ── GetContext Tests ──────────────────────────────────────────────────────────

func TestGetContext_Success(t *testing.T) {
	svc := &mockAIService{
		contextResult: &services.AIResponse{
			Context:  "Statistical context for back2",
			RawStats: map[string]interface{}{},
		},
	}
	app := newAITestApp(svc)

	req := httptest.NewRequest("GET", "/ai/context?prize_type=back2", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Contains(t, body, "context")
}

func TestGetContext_InvalidPrizeType(t *testing.T) {
	// Handler returns 200 with "ไม่มีข้อมูล..." for invalid prize types
	svc := &mockAIService{}
	app := newAITestApp(svc)

	req := httptest.NewRequest("GET", "/ai/context?prize_type=invalid", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Contains(t, body, "context")
}

func TestGetContext_DefaultPrizeType(t *testing.T) {
	// No prize_type param → defaults to back2
	svc := &mockAIService{
		contextResult: &services.AIResponse{Context: "default context"},
	}
	app := newAITestApp(svc)

	req := httptest.NewRequest("GET", "/ai/context", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestGetContext_ServiceError(t *testing.T) {
	svc := &mockAIService{contextErr: errors.New("template execution error")}
	app := newAITestApp(svc)

	req := httptest.NewRequest("GET", "/ai/context?prize_type=back2", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
}

// ── Predict Tests (GET) ───────────────────────────────────────────────────────

func TestPredict_GET_Success(t *testing.T) {
	svc := &mockAIService{
		predictResult: &services.AIPredictionResponse{
			Prediction: `{"primary":["88","55"]}`,
			Model:      "gemini-2.5-flash",
		},
	}
	app := newAITestApp(svc)

	req := httptest.NewRequest("GET", "/ai/predict?prize_type=back2&limit=4", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Contains(t, body, "prediction")
	assert.Contains(t, body, "model")
}

func TestPredict_MissingGeminiAPIKey(t *testing.T) {
	// GEMINI_API_KEY error → handler should return 503
	svc := &mockAIService{predictErr: errors.New("GEMINI_API_KEY is not configured")}
	app := newAITestApp(svc)

	req := httptest.NewRequest("GET", "/ai/predict?prize_type=back2", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusServiceUnavailable, resp.StatusCode)
}

func TestPredict_GeminiError(t *testing.T) {
	// Generic gemini error → 502
	svc := &mockAIService{predictErr: errors.New("gemini returned no prediction")}
	app := newAITestApp(svc)

	req := httptest.NewRequest("GET", "/ai/predict?prize_type=back2", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusBadGateway, resp.StatusCode)
}

func TestPredict_OtherError(t *testing.T) {
	// Unknown error → 400
	svc := &mockAIService{predictErr: errors.New("prize_type must be either back2 or first")}
	app := newAITestApp(svc)

	req := httptest.NewRequest("GET", "/ai/predict?prize_type=back3", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

// ── Predict Tests (POST) ──────────────────────────────────────────────────────

func TestPredict_POST_Success(t *testing.T) {
	svc := &mockAIService{
		predictResult: &services.AIPredictionResponse{
			Prediction: `{"primary":["88"]}`,
			Model:      "gemini-2.0-flash",
		},
	}
	app := newAITestApp(svc)

	body, _ := json.Marshal(map[string]interface{}{
		"prize_type": "back2",
		"limit":      4,
		"prompt":     "give me lucky numbers",
	})
	req := httptest.NewRequest("POST", "/ai/predict", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestPredict_POST_InvalidBody(t *testing.T) {
	svc := &mockAIService{}
	app := newAITestApp(svc)

	req := httptest.NewRequest("POST", "/ai/predict", bytes.NewReader([]byte("{bad json")))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestPredict_SkipContext_POST(t *testing.T) {
	svc := &mockAIService{
		predictResult: &services.AIPredictionResponse{
			Prediction: `{"primary":["88"]}`,
			Model:      "gemini-2.0-flash",
		},
	}
	app := newAITestApp(svc)

	body, _ := json.Marshal(map[string]interface{}{
		"prompt":       "dream of elephant",
		"skip_context": true,
	})
	req := httptest.NewRequest("POST", "/ai/predict", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.True(t, svc.capturedSkipContext)
	assert.Equal(t, "dream of elephant", svc.capturedPrompt)
}

func TestPredict_SkipContext_GET(t *testing.T) {
	svc := &mockAIService{
		predictResult: &services.AIPredictionResponse{
			Prediction: `{"primary":["88"]}`,
			Model:      "gemini-2.0-flash",
		},
	}
	app := newAITestApp(svc)

	req := httptest.NewRequest("GET", "/ai/predict?prompt=dream+of+elephant&skip_context=true", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.True(t, svc.capturedSkipContext)
	assert.Equal(t, "dream of elephant", svc.capturedPrompt)
}

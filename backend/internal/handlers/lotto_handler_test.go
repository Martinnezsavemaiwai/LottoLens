package handlers_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lotto-backend/internal/handlers"
	"lotto-backend/internal/services"
	"lotto-backend/prisma/db"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Mock LottoService ─────────────────────────────────────────────────────────

type mockLottoService struct {
	draws      []db.LottoDrawModel
	singleDraw *db.LottoDrawModel
	err        error
}

func (m *mockLottoService) GetDraws(_ context.Context, _, _ int) ([]db.LottoDrawModel, error) {
	return m.draws, m.err
}
func (m *mockLottoService) GetDrawByDate(_ context.Context, _ string) (*db.LottoDrawModel, error) {
	return m.singleDraw, m.err
}
func (m *mockLottoService) SyncLatest(_ context.Context) (*db.LottoDrawModel, error) {
	return m.singleDraw, m.err
}
func (m *mockLottoService) RebuildAnalytics(_ context.Context) error {
	return m.err
}
func (m *mockLottoService) AutoSeed(_ context.Context) error {
	return m.err
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newLottoTestApp(svc services.LottoService) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		},
	})
	h := handlers.NewLottoHandler(svc)
	app.Get("/draws", h.ListDraws)
	app.Get("/draws/:date", h.GetByDate)
	return app
}

func fakeDraw(firstPrize, back2 string) db.LottoDrawModel {
	return db.LottoDrawModel{
		InnerLottoDraw: db.InnerLottoDraw{
			FirstPrize: firstPrize,
			Back2:      back2,
			DrawDate:   time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		},
	}
}

// ── ListDraws Tests ───────────────────────────────────────────────────────────

func TestListDraws_Success(t *testing.T) {
	draws := []db.LottoDrawModel{
		fakeDraw("123456", "88"),
		fakeDraw("654321", "11"),
	}
	svc := &mockLottoService{draws: draws}
	app := newLottoTestApp(svc)

	req := httptest.NewRequest("GET", "/draws?page=1&limit=10", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestListDraws_EmptyResult(t *testing.T) {
	svc := &mockLottoService{draws: []db.LottoDrawModel{}}
	app := newLottoTestApp(svc)

	req := httptest.NewRequest("GET", "/draws", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestListDraws_ServiceError(t *testing.T) {
	svc := &mockLottoService{err: errors.New("db connection lost")}
	app := newLottoTestApp(svc)

	req := httptest.NewRequest("GET", "/draws", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
}

// ── GetByDate Tests ───────────────────────────────────────────────────────────

func TestGetByDate_Success(t *testing.T) {
	draw := fakeDraw("123456", "88")
	svc := &mockLottoService{singleDraw: &draw}
	app := newLottoTestApp(svc)

	req := httptest.NewRequest("GET", "/draws/2025-01-01", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	// Handler calls c.JSON(draw) which serializes the Prisma model
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestGetByDate_NotFound(t *testing.T) {
	svc := &mockLottoService{err: errors.New("record not found")}
	app := newLottoTestApp(svc)

	req := httptest.NewRequest("GET", "/draws/2025-01-01", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestGetByDate_InvalidDate(t *testing.T) {
	svc := &mockLottoService{err: errors.New("invalid date format")}
	app := newLottoTestApp(svc)

	req := httptest.NewRequest("GET", "/draws/invalid-date", nil)
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	// Service returns error for invalid date → 500 or 400 depending on handler
	assert.True(t, resp.StatusCode >= 400)
}

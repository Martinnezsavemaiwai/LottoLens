package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"lotto-backend/internal/handlers"
	"lotto-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Mock AuthService ──────────────────────────────────────────────────────────

type mockAuthService struct {
	registerResult *services.AuthToken
	registerErr    error
	loginResult    *services.AuthToken
	loginErr       error
	validateClaims *jwt.RegisteredClaims
	validateErr    error
}

func (m *mockAuthService) Register(_ context.Context, _, _ string) (*services.AuthToken, error) {
	return m.registerResult, m.registerErr
}

func (m *mockAuthService) Login(_ context.Context, _, _ string) (*services.AuthToken, error) {
	return m.loginResult, m.loginErr
}

func (m *mockAuthService) ValidateToken(_ string) (*jwt.RegisteredClaims, error) {
	return m.validateClaims, m.validateErr
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newAuthTestApp(svc services.AuthService) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		},
	})
	h := handlers.NewAuthHandler(svc)
	app.Post("/register", h.Register)
	app.Post("/login", h.Login)
	return app
}

func doJSONRequest(t *testing.T, app *fiber.App, method, path string, body interface{}) *http.Response {
	t.Helper()
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		reqBody = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, reqBody)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)
	return resp
}

func fakeToken() *services.AuthToken {
	return &services.AuthToken{
		Token:     "eyJ.fake.token",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
}

// ── Register Tests ────────────────────────────────────────────────────────────

func TestRegister_Success(t *testing.T) {
	svc := &mockAuthService{registerResult: fakeToken()}
	app := newAuthTestApp(svc)

	resp := doJSONRequest(t, app, "POST", "/register", map[string]string{
		"email":    "newuser@example.com",
		"password": "password123",
	})

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Contains(t, body, "token")
	assert.Contains(t, body, "expires_at")
}

func TestRegister_DuplicateEmail(t *testing.T) {
	svc := &mockAuthService{registerErr: services.ErrUserExists}
	app := newAuthTestApp(svc)

	resp := doJSONRequest(t, app, "POST", "/register", map[string]string{
		"email":    "dupe@example.com",
		"password": "password123",
	})

	assert.Equal(t, http.StatusConflict, resp.StatusCode)
}

func TestRegister_WeakPassword(t *testing.T) {
	svc := &mockAuthService{registerErr: errors.New("password must be at least 8 characters")}
	app := newAuthTestApp(svc)

	resp := doJSONRequest(t, app, "POST", "/register", map[string]string{
		"email":    "test@example.com",
		"password": "short",
	})

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestRegister_MissingFields(t *testing.T) {
	// Send invalid JSON — BodyParser should fail
	svc := &mockAuthService{}
	app := newAuthTestApp(svc)

	req := httptest.NewRequest("POST", "/register", strings.NewReader("not-json"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

// ── Login Tests ───────────────────────────────────────────────────────────────

func TestLogin_Success(t *testing.T) {
	svc := &mockAuthService{loginResult: fakeToken()}
	app := newAuthTestApp(svc)

	resp := doJSONRequest(t, app, "POST", "/login", map[string]string{
		"email":    "user@example.com",
		"password": "password123",
	})

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Contains(t, body, "token")
	assert.Contains(t, body, "expires_at")
}

func TestLogin_WrongPassword(t *testing.T) {
	svc := &mockAuthService{loginErr: services.ErrInvalidCredentials}
	app := newAuthTestApp(svc)

	resp := doJSONRequest(t, app, "POST", "/login", map[string]string{
		"email":    "user@example.com",
		"password": "wrongpassword",
	})

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestLogin_UserNotFound(t *testing.T) {
	// Should also return 401 — not leak "user not found"
	svc := &mockAuthService{loginErr: services.ErrInvalidCredentials}
	app := newAuthTestApp(svc)

	resp := doJSONRequest(t, app, "POST", "/login", map[string]string{
		"email":    "ghost@example.com",
		"password": "password123",
	})

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	// Must not leak whether user exists or not
	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	errMsg, _ := body["error"].(string)
	assert.NotContains(t, errMsg, "not found")
}

func TestLogin_MissingFields(t *testing.T) {
	svc := &mockAuthService{}
	app := newAuthTestApp(svc)

	req := httptest.NewRequest("POST", "/login", strings.NewReader("{invalid"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

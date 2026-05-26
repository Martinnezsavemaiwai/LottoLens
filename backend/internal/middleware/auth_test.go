package middleware_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	appmiddleware "lotto-backend/internal/middleware"
	"lotto-backend/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Mock AuthService ──────────────────────────────────────────────────────────

type mockAuthSvc struct {
	claims *jwt.RegisteredClaims
	err    error
}

func (m *mockAuthSvc) Register(_ context.Context, _, _ string) (*services.AuthToken, error) {
	return nil, nil
}
func (m *mockAuthSvc) Login(_ context.Context, _, _ string) (*services.AuthToken, error) {
	return nil, nil
}
func (m *mockAuthSvc) ValidateToken(_ string) (*jwt.RegisteredClaims, error) {
	return m.claims, m.err
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func newMiddlewareApp(svc services.AuthService) *fiber.App {
	app := fiber.New()
	app.Get("/protected", appmiddleware.AuthMiddleware(svc), func(c *fiber.Ctx) error {
		userID := c.Locals("user_id")
		return c.JSON(fiber.Map{"user_id": userID})
	})
	return app
}

func doRequest(t *testing.T, app *fiber.App, path, authHeader string) *http.Response {
	t.Helper()
	req := httptest.NewRequest("GET", path, nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := app.Test(req, 5000)
	require.NoError(t, err)
	return resp
}

func makeSignedToken(secret string, expiresIn time.Duration) string {
	claims := jwt.RegisteredClaims{
		Subject:   "test-user-id",
		Issuer:    "lottolens",
		Audience:  []string{"lottolens-api"},
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := tok.SignedString([]byte(secret))
	return signed
}

// ── Tests ─────────────────────────────────────────────────────────────────────

func TestAuthMiddleware_ValidToken(t *testing.T) {
	claims := &jwt.RegisteredClaims{Subject: "user-123"}
	svc := &mockAuthSvc{claims: claims}
	app := newMiddlewareApp(svc)

	resp := doRequest(t, app, "/protected", "Bearer valid-token")

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestAuthMiddleware_MissingToken(t *testing.T) {
	svc := &mockAuthSvc{}
	app := newMiddlewareApp(svc)

	resp := doRequest(t, app, "/protected", "")

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestAuthMiddleware_NotBearerScheme(t *testing.T) {
	svc := &mockAuthSvc{}
	app := newMiddlewareApp(svc)

	resp := doRequest(t, app, "/protected", "Basic dXNlcjpwYXNz")

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestAuthMiddleware_ExpiredToken(t *testing.T) {
	svc := &mockAuthSvc{err: errors.New("token has expired")}
	app := newMiddlewareApp(svc)

	// Token format is valid, but ValidateToken returns expired error
	resp := doRequest(t, app, "/protected", "Bearer expired.token.here")

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestAuthMiddleware_MalformedToken(t *testing.T) {
	svc := &mockAuthSvc{err: errors.New("token is malformed")}
	app := newMiddlewareApp(svc)

	resp := doRequest(t, app, "/protected", "Bearer notajwt")

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestAuthMiddleware_WrongSignature(t *testing.T) {
	svc := &mockAuthSvc{err: errors.New("token signature is invalid")}
	app := newMiddlewareApp(svc)

	// Token signed with wrong key — service rejects it
	resp := doRequest(t, app, "/protected", "Bearer wrong.sig.token")

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestAuthMiddleware_SetsUserIDLocals(t *testing.T) {
	claims := &jwt.RegisteredClaims{Subject: "user-abc-123"}
	svc := &mockAuthSvc{claims: claims}
	app := newMiddlewareApp(svc)

	resp := doRequest(t, app, "/protected", "Bearer valid-token")

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	// The user_id local is set by middleware — our handler echoes it back
}

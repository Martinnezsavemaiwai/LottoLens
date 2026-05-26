package services

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"lotto-backend/prisma/db"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// ── Mock UserRepository ──────────────────────────────────────────────────────

type mockUserRepo struct {
	user *db.UserModel
	err  error
}

func (m *mockUserRepo) Create(_ context.Context, _ string, _ string) (*db.UserModel, error) {
	return m.user, m.err
}

func (m *mockUserRepo) FindByEmail(_ context.Context, _ string) (*db.UserModel, error) {
	return m.user, m.err
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func newTestAuthService(t *testing.T, repo *mockUserRepo, secret string) AuthService {
	t.Helper()
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("JWT_EXPIRY_HOURS", "24")
	return NewAuthService(repo)
}

func makeExpiredToken(secret string) string {
	claims := jwt.RegisteredClaims{
		Subject:   "user-id",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := tok.SignedString([]byte(secret))
	return signed
}

func makeValidToken(secret string) string {
	claims := jwt.RegisteredClaims{
		Subject:   "user-id",
		Issuer:    "lottolens",
		Audience:  []string{"lottolens-api"},
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := tok.SignedString([]byte(secret))
	return signed
}

func hashPassword(t *testing.T, password string) string {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	require.NoError(t, err)
	return string(hash)
}

func fakeUser(id, email, passwordHash string) *db.UserModel {
	return &db.UserModel{
		InnerUser: db.InnerUser{
			ID:           id,
			Email:        email,
			PasswordHash: passwordHash,
		},
	}
}

// ── validateCredentials ──────────────────────────────────────────────────────

func TestValidateCredentials_WeakPassword(t *testing.T) {
	err := validateCredentials("test@example.com", "short")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "8 characters")
}

func TestValidateCredentials_InvalidEmail(t *testing.T) {
	err := validateCredentials("notanemail", "password123")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "email")
}

func TestValidateCredentials_Valid(t *testing.T) {
	err := validateCredentials("test@example.com", "password123")
	assert.NoError(t, err)
}

// ── Register ─────────────────────────────────────────────────────────────────

func TestAuthService_Register_Success(t *testing.T) {
	user := fakeUser("user-123", "test@example.com", "")
	svc := newTestAuthService(t, &mockUserRepo{user: user}, "test-secret-key")

	token, err := svc.Register(context.Background(), "test@example.com", "password123")

	require.NoError(t, err)
	require.NotNil(t, token)
	assert.NotEmpty(t, token.Token)
	assert.True(t, token.ExpiresAt.After(time.Now()))
}

func TestAuthService_Register_DuplicateEmail(t *testing.T) {
	svc := newTestAuthService(t, &mockUserRepo{err: errors.New("unique constraint violation")}, "test-secret-key")

	_, err := svc.Register(context.Background(), "dupe@example.com", "password123")

	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrUserExists), "expected ErrUserExists, got: %v", err)
}

func TestAuthService_Register_WeakPassword(t *testing.T) {
	svc := newTestAuthService(t, &mockUserRepo{}, "test-secret-key")

	_, err := svc.Register(context.Background(), "test@example.com", "short")

	require.Error(t, err)
	assert.Contains(t, err.Error(), "8 characters")
}

func TestAuthService_Register_InvalidEmail(t *testing.T) {
	svc := newTestAuthService(t, &mockUserRepo{}, "test-secret-key")

	_, err := svc.Register(context.Background(), "notanemail", "password123")

	require.Error(t, err)
}

func TestAuthService_Register_MissingJWTSecret(t *testing.T) {
	os.Unsetenv("JWT_SECRET")
	svc := NewAuthService(&mockUserRepo{user: fakeUser("id", "a@b.com", "")})

	_, err := svc.Register(context.Background(), "a@b.com", "password123")

	require.Error(t, err)
	assert.Contains(t, err.Error(), "JWT_SECRET")
}

// ── Login ─────────────────────────────────────────────────────────────────────

func TestAuthService_Login_Success(t *testing.T) {
	hash := hashPassword(t, "password123")
	user := fakeUser("user-456", "login@example.com", hash)
	svc := newTestAuthService(t, &mockUserRepo{user: user}, "test-secret-key")

	token, err := svc.Login(context.Background(), "login@example.com", "password123")

	require.NoError(t, err)
	require.NotNil(t, token)
	assert.NotEmpty(t, token.Token)
	assert.True(t, token.ExpiresAt.After(time.Now()))
}

func TestAuthService_Login_WrongPassword(t *testing.T) {
	hash := hashPassword(t, "correct-password")
	user := fakeUser("user-789", "user@example.com", hash)
	svc := newTestAuthService(t, &mockUserRepo{user: user}, "test-secret-key")

	_, err := svc.Login(context.Background(), "user@example.com", "wrong-password")

	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrInvalidCredentials))
}

func TestAuthService_Login_UserNotFound(t *testing.T) {
	svc := newTestAuthService(t, &mockUserRepo{err: errors.New("record not found")}, "test-secret-key")

	_, err := svc.Login(context.Background(), "notfound@example.com", "password123")

	require.Error(t, err)
	// Must return ErrInvalidCredentials — must not leak "user not found"
	assert.True(t, errors.Is(err, ErrInvalidCredentials))
}

// ── ValidateToken ─────────────────────────────────────────────────────────────

func TestAuthService_ValidateToken_Valid(t *testing.T) {
	const secret = "my-test-secret"
	svc := newTestAuthService(t, &mockUserRepo{}, secret)

	tokenStr := makeValidToken(secret)
	claims, err := svc.ValidateToken(tokenStr)

	require.NoError(t, err)
	assert.Equal(t, "user-id", claims.Subject)
}

func TestAuthService_ValidateToken_Expired(t *testing.T) {
	const secret = "my-test-secret"
	svc := newTestAuthService(t, &mockUserRepo{}, secret)

	expiredToken := makeExpiredToken(secret)
	_, err := svc.ValidateToken(expiredToken)

	assert.Error(t, err)
}

func TestAuthService_ValidateToken_WrongSignature(t *testing.T) {
	svc := newTestAuthService(t, &mockUserRepo{}, "correct-secret")

	wrongToken := makeValidToken("wrong-secret")
	_, err := svc.ValidateToken(wrongToken)

	assert.Error(t, err)
}

func TestAuthService_ValidateToken_MalformedToken(t *testing.T) {
	svc := newTestAuthService(t, &mockUserRepo{}, "some-secret")

	_, err := svc.ValidateToken("this.is.notajwt")

	assert.Error(t, err)
}

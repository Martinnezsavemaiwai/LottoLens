package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"lotto-backend/internal/repositories"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserExists         = errors.New("user already exists")
)

type AuthToken struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

type AuthService interface {
	Register(ctx context.Context, email, password string) (*AuthToken, error)
	Login(ctx context.Context, email, password string) (*AuthToken, error)
	ValidateToken(tokenString string) (*jwt.RegisteredClaims, error)
}

type authService struct {
	users       repositories.UserRepository
	jwtSecret   []byte
	expiryHours int
}

func NewAuthService(users repositories.UserRepository) AuthService {
	expiryHours, err := strconv.Atoi(os.Getenv("JWT_EXPIRY_HOURS"))
	if err != nil || expiryHours <= 0 {
		expiryHours = 24
	}

	return &authService{
		users:       users,
		jwtSecret:   []byte(os.Getenv("JWT_SECRET")),
		expiryHours: expiryHours,
	}
}

func (s *authService) Register(ctx context.Context, email, password string) (*AuthToken, error) {
	if err := validateCredentials(email, password); err != nil {
		return nil, err
	}
	if len(s.jwtSecret) == 0 {
		return nil, errors.New("JWT_SECRET is not configured")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return nil, err
	}

	user, err := s.users.Create(ctx, email, string(hash))
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil, ErrUserExists
		}
		return nil, err
	}

	return s.issueToken(user.ID, user.Email)
}

func (s *authService) Login(ctx context.Context, email, password string) (*AuthToken, error) {
	if len(s.jwtSecret) == 0 {
		return nil, errors.New("JWT_SECRET is not configured")
	}

	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.issueToken(user.ID, user.Email)
}

func (s *authService) ValidateToken(tokenString string) (*jwt.RegisteredClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %s", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func (s *authService) issueToken(userID, email string) (*AuthToken, error) {
	expiresAt := time.Now().UTC().Add(time.Duration(s.expiryHours) * time.Hour)
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		Issuer:    "lottolens",
		Audience:  []string{"lottolens-api"},
		ExpiresAt: jwt.NewNumericDate(expiresAt),
		IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
		ID:        email,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}
	return &AuthToken{Token: signed, ExpiresAt: expiresAt}, nil
}

func validateCredentials(email, password string) error {
	if !strings.Contains(email, "@") {
		return errors.New("valid email is required")
	}
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	return nil
}

package repositories

import (
	"context"
	"strings"

	"lotto-backend/prisma/db"
)

type UserRepository interface {
	Create(ctx context.Context, email, passwordHash string) (*db.UserModel, error)
	FindByEmail(ctx context.Context, email string) (*db.UserModel, error)
}

type userRepository struct {
	client *db.PrismaClient
}

func NewUserRepository(client *db.PrismaClient) UserRepository {
	return &userRepository{client: client}
}

func (r *userRepository) Create(ctx context.Context, email, passwordHash string) (*db.UserModel, error) {
	return r.client.User.CreateOne(
		db.User.Email.Set(normalizeEmail(email)),
		db.User.PasswordHash.Set(passwordHash),
	).Exec(ctx)
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*db.UserModel, error) {
	return r.client.User.FindUnique(
		db.User.Email.Equals(normalizeEmail(email)),
	).Exec(ctx)
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

package middleware

import (
	"strings"

	"lotto-backend/internal/services"

	"github.com/gofiber/fiber/v2"
)

func AuthMiddleware(auth services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing Bearer token",
			})
		}

		claims, err := auth.ValidateToken(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		c.Locals("user_id", claims.Subject)
		return c.Next()
	}
}

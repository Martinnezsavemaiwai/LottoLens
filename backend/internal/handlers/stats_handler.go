package handlers

import (
	"lotto-backend/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type StatsHandler struct {
	analyticsService services.AnalyticsService
}

func NewStatsHandler(analyticsService services.AnalyticsService) *StatsHandler {
	return &StatsHandler{analyticsService: analyticsService}
}

// GetFrequency returns number frequency for a specific prize type
func (h *StatsHandler) GetFrequency(c *fiber.Ctx) error {
	prizeType := c.Query("prize_type", "back2")
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	stats, err := h.analyticsService.GetFrequencyStats(c.Context(), prizeType, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"prize_type": prizeType,
		"limit":      limit,
		"data":       stats,
	})
}

// GetPositional returns digit frequency per position
func (h *StatsHandler) GetPositional(c *fiber.Ctx) error {
	prizeType := c.Query("prize_type", "back2")

	stats, err := h.analyticsService.GetPositionalStats(c.Context(), prizeType)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"prize_type": prizeType,
		"data":       stats,
	})
}

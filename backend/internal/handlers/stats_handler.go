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

func isValidPrizeType(pt string) bool {
	return pt == "first" || pt == "front3" || pt == "back3" || pt == "back2"
}

// GetFrequency returns number frequency for a specific prize type
func (h *StatsHandler) GetFrequency(c *fiber.Ctx) error {
	prizeType := c.Query("prize_type", "back2")
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	if !isValidPrizeType(prizeType) {
		return c.JSON(fiber.Map{
			"prize_type": prizeType,
			"limit":      limit,
			"data":       []interface{}{},
		})
	}

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

	if !isValidPrizeType(prizeType) {
		return c.JSON(fiber.Map{
			"prize_type": prizeType,
			"data": fiber.Map{
				"pos1": []interface{}{},
				"pos2": []interface{}{},
				"pos3": []interface{}{},
				"pos4": []interface{}{},
				"pos5": []interface{}{},
				"pos6": []interface{}{},
			},
		})
	}

	stats, err := h.analyticsService.GetPositionalStats(c.Context(), prizeType)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"prize_type": prizeType,
		"data":       stats,
	})
}

// GetZScores returns digit-level Z-Scores
func (h *StatsHandler) GetZScores(c *fiber.Ctx) error {
	prizeType := c.Query("prize_type", "back2")

	if !isValidPrizeType(prizeType) {
		return c.JSON(fiber.Map{
			"prize_type": prizeType,
			"data":       []interface{}{},
		})
	}

	stats, err := h.analyticsService.GetZScoresStats(c.Context(), prizeType)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"prize_type": prizeType,
		"data":       stats,
	})
}


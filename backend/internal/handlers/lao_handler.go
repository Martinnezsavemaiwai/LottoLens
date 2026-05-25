package handlers

import (
	"lotto-backend/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// LaoHandler handles all /api/v2/lottery/* routes scoped to Lao lottery.
type LaoHandler struct {
	laoSvc  services.LaoService
	thaiSvc services.LottoService // re-use existing Thai service for ?type=thai
}

func NewLaoHandler(laoSvc services.LaoService, thaiSvc services.LottoService) *LaoHandler {
	return &LaoHandler{laoSvc: laoSvc, thaiSvc: thaiSvc}
}

// GET /api/v2/lottery/history?type=lao|thai&page=1&limit=20
func (h *LaoHandler) GetHistory(c *fiber.Ctx) error {
	lotteryType := c.Query("type", "lao")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 1000 {
		limit = 1000
	}

	switch lotteryType {
	case "thai":
		draws, err := h.thaiSvc.GetDraws(c.Context(), page, limit)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{
			"type":  "thai",
			"page":  page,
			"limit": limit,
			"data":  draws,
		})

	default: // "lao"
		draws, err := h.laoSvc.GetDraws(c.Context(), page, limit)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{
			"type":  "lao",
			"page":  page,
			"limit": limit,
			"data":  draws,
		})
	}
}

// GET /api/v2/lottery/stats?type=lao|thai
func (h *LaoHandler) GetStats(c *fiber.Ctx) error {
	lotteryType := c.Query("type", "lao")

	switch lotteryType {
	case "thai":
		// Delegate to existing stats endpoint logic
		return c.Status(307).Redirect("/api/v1/stats/summary")

	default: // "lao"
		stats, err := h.laoSvc.GetStats(c.Context())
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error":   "Failed to compute Lao stats",
				"details": err.Error(),
			})
		}
		return c.JSON(fiber.Map{
			"type": "lao",
			"data": stats,
		})
	}
}

// POST /api/v2/lottery/result
// Body: { "type": "lao", "date": "2026-05-15", "full": "807095", "verified": true }
func (h *LaoHandler) PostResult(c *fiber.Ctx) error {
	var body struct {
		Type     string `json:"type"`
		Date     string `json:"date"`
		Full     string `json:"full"`
		Verified bool   `json:"verified"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if body.Date == "" || body.Full == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Fields 'date' and 'full' are required"})
	}

	switch body.Type {
	case "thai":
		return c.Status(400).JSON(fiber.Map{
			"error": "Thai lottery inserts must use POST /api/v1/draws/sync",
		})

	default: // "lao"
		saved, err := h.laoSvc.InsertResult(c.Context(), body.Date, body.Full, body.Verified)
		if err != nil {
			return c.Status(422).JSON(fiber.Map{
				"error":   "Failed to insert Lao result",
				"details": err.Error(),
			})
		}
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Lao draw result saved successfully",
			"data":    saved,
		})
	}
}

// DELETE /api/v2/lottery/result/:id
func (h *LaoHandler) DeleteResult(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ID parameter is required"})
	}

	err := h.laoSvc.DeleteResult(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to delete lottery result",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Lottery result deleted successfully",
	})
}

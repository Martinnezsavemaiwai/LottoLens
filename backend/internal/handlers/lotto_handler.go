package handlers

import (
	"lotto-backend/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type LottoHandler struct {
	service services.LottoService
}

func NewLottoHandler(service services.LottoService) *LottoHandler {
	return &LottoHandler{service: service}
}

func (h *LottoHandler) ListDraws(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	draws, err := h.service.GetDraws(c.Context(), page, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":  draws,
		"page":  page,
		"limit": limit,
	})
}

func (h *LottoHandler) GetByDate(c *fiber.Ctx) error {
	date := c.Params("date") // Format: 2024-03-16
	draw, err := h.service.GetDrawByDate(c.Context(), date)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Draw not found"})
	}

	return c.JSON(draw)
}

func (h *LottoHandler) Sync(c *fiber.Ctx) error {
	draw, err := h.service.SyncLatest(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Sync failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Sync successfully",
		"data":    draw,
	})
}
func (h *LottoHandler) RebuildAnalytics(c *fiber.Ctx) error {
	err := h.service.RebuildAnalytics(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Rebuild failed", "details": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Analytics rebuilt successfully",
	})
}

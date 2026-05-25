package handlers

import (
	"lotto-backend/internal/services"
	"github.com/gofiber/fiber/v2"
)

type AIHandler struct {
	aiService services.AIService
}

func NewAIHandler(aiService services.AIService) *AIHandler {
	return &AIHandler{aiService: aiService}
}

func (h *AIHandler) GetContext(c *fiber.Ctx) error {
	prizeType := c.Query("prize_type", "back2")

	if prizeType != "first" && prizeType != "front3" && prizeType != "back3" && prizeType != "back2" {
		return c.JSON(fiber.Map{
			"context": "ไม่มีข้อมูลสถิติสำหรับรางวัลประเภทนี้",
		})
	}

	resp, err := h.aiService.GenerateMathContext(c.Context(), prizeType)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Return as plain text/markdown if requested
	if c.Get("Accept") == "text/plain" {
		return c.SendString(resp.Context)
	}

	return c.JSON(resp)
}

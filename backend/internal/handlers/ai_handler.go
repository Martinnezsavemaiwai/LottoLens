package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"lotto-backend/internal/services"
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

func (h *AIHandler) Predict(c *fiber.Ctx) error {
	var body struct {
		PrizeType         string `json:"prize_type"`
		Limit             int    `json:"limit"`
		Prompt            string `json:"prompt"`
		SystemInstruction string `json:"system_instruction"`
	}
	if len(c.Body()) > 0 {
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
		}
	}
	if body.PrizeType == "" {
		body.PrizeType = c.Query("prize_type", "back2")
	}
	if body.Limit == 0 {
		body.Limit = c.QueryInt("limit", 4)
	}
	if body.Prompt == "" {
		body.Prompt = c.Query("prompt", "")
	}
	if body.SystemInstruction == "" {
		body.SystemInstruction = c.Query("system_instruction", "")
	}

	resp, err := h.aiService.Predict(c.Context(), body.PrizeType, body.Limit, body.Prompt, body.SystemInstruction)
	if err != nil {
		status := fiber.StatusBadRequest
		if strings.Contains(err.Error(), "GEMINI_API_KEY") {
			status = fiber.StatusServiceUnavailable
		} else if strings.Contains(strings.ToLower(err.Error()), "gemini") {
			status = fiber.StatusBadGateway
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

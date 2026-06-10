package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"lotto-backend/internal/repositories"
	"net/http"
	"net/url"
	"os"
	"strings"
	"text/template"
	"time"
)

type AIResponse struct {
	Context  string      `json:"context"`
	RawStats interface{} `json:"raw_stats"`
}

type AIService interface {
	GenerateMathContext(ctx context.Context, prizeType string) (*AIResponse, error)
	Predict(ctx context.Context, prizeType string, limit int, promptOverride, systemInstruction string, skipContext bool) (*AIPredictionResponse, error)
}

type aiService struct {
	chRepo    repositories.ClickHouseRepo
	lottoRepo repositories.LottoRepository
	client    *http.Client
}

func NewAIService(chRepo repositories.ClickHouseRepo, lottoRepo repositories.LottoRepository) AIService {
	return &aiService{
		chRepo:    chRepo,
		lottoRepo: lottoRepo,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type AIPredictionResponse struct {
	Prediction string `json:"prediction"`
	Model      string `json:"model"`
}

type geminiRequest struct {
	SystemInstruction geminiContent   `json:"systemInstruction"`
	Contents          []geminiContent `json:"contents"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
		Status  string `json:"status"`
		Code    int    `json:"code"`
	} `json:"error,omitempty"`
}

const mathContextTemplate = `
# Thai Lotto Mathematical Analysis Context
Prize Type: {{.PrizeType}}

## 1. Z-Scores (Digit Level)
Positive Z-score means higher than average frequency across all positions.
{{range .ZScores}}- Digit {{.Digit}}: {{printf "%.2f" .ZScore}} (Count: {{.Count}})
{{end}}

## 2. Markov Chain Transitions
Predictions based on the most recent winning number ({{.LastNum}}).
Most likely numbers to follow:
{{range .Markov}}- Next: {{.NextNumber}} (Occurred {{.Count}} times after {{$.LastNum}})
{{else}}- No transition data available for {{.LastNum}}
{{end}}

## 3. Recency Weighted Trends
Numbers with high scores based on frequency weighted by recency (Last 5=5x, 6-15=3x, 16-30=2x).
{{range .Weighted}}- Number {{.Number}}: Score {{printf "%d" .Score}}
{{end}}

## 4. Top Positional Frequencies
{{range $i, $pos := .Positional}}
### Position {{add $i 1}}
{{range $pos}}- Digit {{.Digit}}: {{.Count}} times
{{end}}{{end}}
`

func (s *aiService) GenerateMathContext(ctx context.Context, prizeType string) (*AIResponse, error) {
	// 1. Fetch data from ClickHouse & Postgres
	zScores, _ := s.chRepo.GetZScores(ctx, prizeType)
	weighted, _ := s.chRepo.GetRecencyWeightedStats(ctx, prizeType)
	pos, _ := s.chRepo.GetPositionalFrequency(ctx, prizeType)

	lastDraw, _ := s.lottoRepo.FindLatest(ctx)
	lastNum := "N/A"
	if lastDraw != nil {
		switch prizeType {
		case "first":
			lastNum = lastDraw.FirstPrize
		case "back2":
			lastNum = lastDraw.Back2
		case "back3":
			lastNum = "N/A" // Simplified
		}
	}

	markov, _ := s.chRepo.GetMarkovTransitions(ctx, prizeType, lastNum)

	// 2. Prepare Template Data
	templateData := struct {
		PrizeType    string
		ZScores      []repositories.DigitZScore
		LastNum      string
		Markov       []repositories.MarkovResult
		Weighted     []repositories.WeightedResult
		Positional   [][]repositories.DigitCount
		TopFrequency []repositories.FreqResult
	}{
		PrizeType: prizeType,
		ZScores:   zScores,
		LastNum:   lastNum,
		Markov:    markov,
		Weighted:  weighted,
		Positional: [][]repositories.DigitCount{
			limitDigitCount(pos.Pos1, 5),
			limitDigitCount(pos.Pos2, 5),
			limitDigitCount(pos.Pos3, 5),
		},
		TopFrequency: weightedToFreq(weighted), // ใช้ Weighted มาเป็น Top Frequency เบื้องต้น หรือดึงตรงๆ
	}

	// 3. Execute Template
	funcMap := template.FuncMap{
		"add": func(a, b int) int { return a + b },
	}
	tmpl, err := template.New("mathContext").Funcs(funcMap).Parse(mathContextTemplate)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, templateData); err != nil {
		return nil, err
	}

	return &AIResponse{
		Context:  buf.String(),
		RawStats: templateData,
	}, nil
}

func (s *aiService) Predict(ctx context.Context, prizeType string, limit int, promptOverride, systemInstruction string, skipContext bool) (*AIPredictionResponse, error) {
	apiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if apiKey == "" {
		return nil, errors.New("GEMINI_API_KEY is not configured")
	}

	var prompt string
	if skipContext {
		if strings.TrimSpace(promptOverride) == "" {
			return nil, errors.New("prompt is required when skip_context is true")
		}
		prompt = promptOverride
	} else {
		if prizeType != "back2" && prizeType != "first" {
			return nil, errors.New("prize_type must be either back2 or first")
		}
		if limit <= 0 {
			limit = 4
		}
		if limit > 10 {
			limit = 10
		}

		contextResp, err := s.GenerateMathContext(ctx, prizeType)
		if err != nil {
			return nil, err
		}

		prompt = fmt.Sprintf(`Use the statistical context to produce a cautious lottery analysis.
Prize type: %s
Prediction limit: %d

%s

Return concise JSON text only with suggested numbers, confidence, methods, and reasoning. Do not include markdown.`, prizeType, limit, contextResp.Context)
		if strings.TrimSpace(promptOverride) != "" {
			prompt = fmt.Sprintf(`Use the statistical context below to answer the user's request.
Prize type: %s
Prediction limit: %d

%s

User request:
%s`, prizeType, limit, contextResp.Context, promptOverride)
		}
	}

	models := []string{"gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"}
	var lastErr error
	for _, model := range models {
		prediction, err := s.callGemini(ctx, model, prompt, systemInstruction)
		if err == nil {
			return &AIPredictionResponse{Prediction: prediction, Model: model}, nil
		}
		lastErr = err
		if !isRetryableGeminiError(err) {
			break
		}
	}

	return nil, lastErr
}

func (s *aiService) callGemini(ctx context.Context, model, prompt, systemInstruction string) (string, error) {
	endpoint := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		url.PathEscape(model),
		url.QueryEscape(os.Getenv("GEMINI_API_KEY")),
	)

	payload := geminiRequest{
		SystemInstruction: geminiContent{Parts: []geminiPart{{Text: defaultString(systemInstruction, "You are a senior data scientist. Return JSON text only.")}}},
		Contents:          []geminiContent{{Parts: []geminiPart{{Text: prompt}}}},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var decoded geminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return "", err
	}
	if resp.StatusCode >= 400 {
		if decoded.Error != nil {
			return "", fmt.Errorf("gemini %d: %s", resp.StatusCode, decoded.Error.Message)
		}
		return "", fmt.Errorf("gemini %d", resp.StatusCode)
	}
	if len(decoded.Candidates) == 0 || len(decoded.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("gemini returned no prediction")
	}

	return decoded.Candidates[0].Content.Parts[0].Text, nil
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func isRetryableGeminiError(err error) bool {
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "429") ||
		strings.Contains(msg, "503") ||
		strings.Contains(msg, "quota") ||
		strings.Contains(msg, "overloaded")
}

func weightedToFreq(w []repositories.WeightedResult) []repositories.FreqResult {
	res := make([]repositories.FreqResult, len(w))
	for i, v := range w {
		res[i] = repositories.FreqResult{Number: v.Number, Count: uint64(v.Score)}
	}
	return res
}

func limitDigitCount(counts []repositories.DigitCount, limit int) []repositories.DigitCount {
	if len(counts) > limit {
		return counts[:limit]
	}
	return counts
}

package services

import (
	"bytes"
	"context"
	"lotto-backend/internal/repositories"
	"text/template"
)

type AIResponse struct {
	Context  string      `json:"context"`
	RawStats interface{} `json:"raw_stats"`
}

type AIService interface {
	GenerateMathContext(ctx context.Context, prizeType string) (*AIResponse, error)
}

type aiService struct {
	chRepo    repositories.ClickHouseRepo
	lottoRepo repositories.LottoRepository
}

func NewAIService(chRepo repositories.ClickHouseRepo, lottoRepo repositories.LottoRepository) AIService {
	return &aiService{chRepo: chRepo, lottoRepo: lottoRepo}
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

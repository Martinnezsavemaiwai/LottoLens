package services

import (
	"encoding/json"
	"fmt"
	"io"
	"lotto-backend/prisma/db"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type RayriffyResponse struct {
	Status   string `json:"status"`
	Response struct {
		Date     string `json:"date"`
		Endpoint string `json:"endpoint"`
		Prizes   []struct {
			ID     string      `json:"id"`
			Name   string      `json:"name"`
			Reward string      `json:"reward"`
			Amount int         `json:"amount"`
			Number interface{} `json:"number"`
		} `json:"prizes"`
		RunningNumbers []struct {
			ID     string      `json:"id"`
			Name   string      `json:"name"`
			Reward string      `json:"reward"`
			Amount int         `json:"amount"`
			Number interface{} `json:"number"`
		} `json:"runningNumbers"`
	} `json:"response"`
}

type ScraperService interface {
	FetchLatest() (*db.LottoDrawModel, error)
	FetchByID(id string) (*db.LottoDrawModel, error)
}

type scraperService struct{}

func NewScraperService() ScraperService {
	return &scraperService{}
}

func (s *scraperService) FetchLatest() (*db.LottoDrawModel, error) {
	return s.fetchDraw("https://lotto.api.rayriffy.com/latest")
}

func (s *scraperService) FetchByID(id string) (*db.LottoDrawModel, error) {
	return s.fetchDraw("https://lotto.api.rayriffy.com/lotto/" + id)
}

func (s *scraperService) fetchDraw(targetURL string) (*db.LottoDrawModel, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(targetURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Rayriffy API returned status %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var rayResp RayriffyResponse
	if err := json.Unmarshal(body, &rayResp); err != nil {
		return nil, err
	}

	data := rayResp.Response

	// Parse date from endpoint (ddmmyyyy)
	endpoint := data.Endpoint
	parts := strings.Split(endpoint, "/")
	datePart := parts[len(parts)-1]
	
	var drawDate time.Time
	if len(datePart) >= 8 {
		day, _ := strconv.Atoi(datePart[0:2])
		month, _ := strconv.Atoi(datePart[2:4])
		year, _ := strconv.Atoi(datePart[4:8])
		drawDate = time.Date(year-543, time.Month(month), day, 0, 0, 0, 0, time.UTC)
	} else {
		return nil, fmt.Errorf("could not parse valid date from API endpoint: %s", endpoint)
	}

	// Map Prizes
	prizeMap := make(map[string][]string)
	for _, p := range data.Prizes {
		prizeMap[p.ID] = parseNumbers(p.Number)
	}
	for _, r := range data.RunningNumbers {
		prizeMap[r.ID] = parseNumbers(r.Number)
	}

	// Helper to get prize JSON or empty array
	getPrizeJSON := func(id string) []byte {
		nums := prizeMap[id]
		if nums == nil {
			nums = []string{}
		}
		b, _ := json.Marshal(nums)
		return b
	}

	back2 := ""
	if nums := prizeMap["runningNumberBackTwo"]; len(nums) > 0 {
		back2 = nums[0]
	} else if nums := prizeMap["back2"]; len(nums) > 0 {
		back2 = nums[0]
	}

	firstPrize := ""
	if nums := prizeMap["prizeFirst"]; len(nums) > 0 {
		firstPrize = nums[0]
	}

	return &db.LottoDrawModel{
		InnerLottoDraw: db.InnerLottoDraw{
			DrawDate:     drawDate,
			DrawDay:      drawDate.Day(),
			Month:        int(drawDate.Month()),
			Year:         drawDate.Year(),
			FirstPrize:   firstPrize,
			NearbyPrizes: getPrizeJSON("prizeFirstNear"),
			SecondPrizes: getPrizeJSON("prizeSecond"),
			ThirdPrizes:  getPrizeJSON("prizeThird"),
			FourthPrizes: getPrizeJSON("prizeFourth"),
			FifthPrizes:  getPrizeJSON("prizeFifth"),
			Front3:       getPrizeJSON("runningNumberFrontThree"),
			Back3:        getPrizeJSON("runningNumberBackThree"),
			Back2:        back2,
		},
	}, nil
}

func parseNumbers(val interface{}) []string {
	if s, ok := val.(string); ok {
		return strings.Fields(s)
	}
	if arr, ok := val.([]interface{}); ok {
		res := make([]string, len(arr))
		for i, v := range arr {
			res[i] = fmt.Sprint(v)
		}
		return res
	}
	return []string{}
}

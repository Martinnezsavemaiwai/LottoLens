package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"lotto-backend/internal/services"
	"lotto-backend/prisma/db"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type ListResponse struct {
	Status   string `json:"status"`
	Response []struct {
		ID   string `json:"id"`
		URL  string `json:"url"`
		Date string `json:"date"`
	} `json:"response"`
}

func main() {
	godotenv.Load()
	client := db.NewClient(db.WithDatasourceURL(os.Getenv("DATABASE_URL")))
	if err := client.Connect(); err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect()

	ctx := context.Background()
	scraper := services.NewScraperService()

	// เราต้องการประมาณ 240-500 งวด (10-20 ปี)
	maxPages := 25
	count := 0

	log.Printf("🚀 Starting historical fetch (Target: ~500 draws)...")

	for page := 1; page <= maxPages; page++ {
		log.Printf("📄 Fetching list page %d...", page)
		listURL := fmt.Sprintf("https://lotto.api.rayriffy.com/list/%d", page)
		
		resp, err := http.Get(listURL)
		if err != nil {
			log.Printf("❌ Failed to fetch list page %d: %v", page, err)
			continue
		}
		
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var listData ListResponse
		if err := json.Unmarshal(body, &listData); err != nil {
			log.Printf("❌ JSON Error on page %d: %v", page, err)
			continue
		}

		if len(listData.Response) == 0 {
			log.Printf("⏹️ No more draws found at page %d", page)
			break
		}

		for _, item := range listData.Response {
			func() {
				defer func() {
					if r := recover(); r != nil {
						log.Printf("🔥 Panic recovered on %s: %v", item.ID, r)
					}
				}()

				if len(item.ID) < 8 {
					return
				}

				day, _ := strconv.Atoi(item.ID[0:2])
				month, _ := strconv.Atoi(item.ID[2:4])
				year, _ := strconv.Atoi(item.ID[4:8])
				drawDateCheck := time.Date(year-543, time.Month(month), day, 0, 0, 0, 0, time.UTC)

				exists, _ := client.LottoDraw.FindUnique(
					db.LottoDraw.DrawDate.Equals(drawDateCheck),
				).Exec(ctx)

				if exists != nil {
					return
				}

				log.Printf("📥 Fetching draw %s (%s)...", item.ID, item.Date)
				draw, err := scraper.FetchByID(item.ID)
				if err != nil {
					log.Printf("❌ Failed to fetch draw %s: %v", item.ID, err)
					return
				}

				// Validity check: skip if key data is missing
				if draw.FirstPrize == "" || draw.Back2 == "" {
					log.Printf("⚠️ Skipping incomplete draw %s (%s)", item.ID, item.Date)
					return
				}

				_, err = client.LottoDraw.CreateOne(
					db.LottoDraw.DrawDate.Set(draw.DrawDate),
					db.LottoDraw.DrawDay.Set(draw.DrawDay),
					db.LottoDraw.Month.Set(draw.Month),
					db.LottoDraw.Year.Set(draw.Year),
					db.LottoDraw.FirstPrize.Set(draw.FirstPrize),
					db.LottoDraw.NearbyPrizes.Set(draw.NearbyPrizes),
					db.LottoDraw.SecondPrizes.Set(draw.SecondPrizes),
					db.LottoDraw.ThirdPrizes.Set(draw.ThirdPrizes),
					db.LottoDraw.FourthPrizes.Set(draw.FourthPrizes),
					db.LottoDraw.FifthPrizes.Set(draw.FifthPrizes),
					db.LottoDraw.Front3.Set(draw.Front3),
					db.LottoDraw.Back3.Set(draw.Back3),
					db.LottoDraw.Back2.Set(draw.Back2),
				).Exec(ctx)

				if err == nil {
					count++
					log.Printf("✅ Saved %s (%d total)", item.ID, count)
				} else {
					log.Printf("❌ Error saving %s: %v", item.ID, err)
				}

				time.Sleep(500 * time.Millisecond)
			}()
		}
	}

	log.Printf("🏁 Finished! Total new draws: %d", count)
}

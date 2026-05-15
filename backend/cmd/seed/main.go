package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"lotto-backend/prisma/db"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	client := db.NewClient(db.WithDatasourceURL(dbURL))
	if err := client.Connect(); err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect()

	ctx := context.Background()

	// ล้างข้อมูลเก่าออกก่อนเพื่อให้ข้อมูลใหม่ไม่ซ้ำซ้อน
	log.Println("🧹 กำลังล้างข้อมูลเก่า...")
	_, _ = client.LottoDraw.FindMany().Delete().Exec(ctx)

	log.Println("🌱 กำลัง Seed ข้อมูลตัวอย่าง 50 งวด (อ้างอิงวันที่ 1 และ 16)...")

	now := time.Now()
	// เริ่มจากเดือนที่แล้ว เพื่อไม่ให้ทับกับงวดปัจจุบัน
	currentDate := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, -1, 0)

	for i := 0; i < 50; i++ {
		var drawDate time.Time
		// สลับระหว่างวันที่ 1 และ 16
		if i%2 == 0 {
			drawDate = time.Date(currentDate.Year(), currentDate.Month(), 16, 0, 0, 0, 0, time.UTC)
		} else {
			drawDate = time.Date(currentDate.Year(), currentDate.Month(), 1, 0, 0, 0, 0, time.UTC)
			// ถอยไปเดือนก่อนหน้าสำหรับคู่ถัดไป
			currentDate = currentDate.AddDate(0, -1, 0)
		}
		
		firstPrize := fmt.Sprintf("%06d", 100000+i*1234%899999)
		back2 := fmt.Sprintf("%02d", (i*7)%100)
		
		empty, _ := json.Marshal([]string{})
		f3, _ := json.Marshal([]string{fmt.Sprintf("%03d", (i*3)%1000), fmt.Sprintf("%03d", (i*9)%1000)})
		b3, _ := json.Marshal([]string{fmt.Sprintf("%03d", (i*11)%1000), fmt.Sprintf("%03d", (i*13)%1000)})

		_, err := client.LottoDraw.CreateOne(
			db.LottoDraw.DrawDate.Set(drawDate),
			db.LottoDraw.DrawDay.Set(drawDate.Day()),
			db.LottoDraw.Month.Set(int(drawDate.Month())),
			db.LottoDraw.Year.Set(drawDate.Year()),
			db.LottoDraw.FirstPrize.Set(firstPrize),
			db.LottoDraw.NearbyPrizes.Set(empty),
			db.LottoDraw.SecondPrizes.Set(empty),
			db.LottoDraw.ThirdPrizes.Set(empty),
			db.LottoDraw.FourthPrizes.Set(empty),
			db.LottoDraw.FifthPrizes.Set(empty),
			db.LottoDraw.Front3.Set(f3),
			db.LottoDraw.Back3.Set(b3),
			db.LottoDraw.Back2.Set(back2),
		).Exec(ctx)

		if err != nil {
			// ตรวจสอบว่า Error เพราะมีข้อมูลอยู่แล้วหรือไม่ (Unique constraint)
			log.Printf("⚠️ Skip งวดที่ %d (%s): %v", i, drawDate.Format("2006-01-02"), err)
		}
	}

	log.Printf("✅ Seed สำเร็จ!")
}

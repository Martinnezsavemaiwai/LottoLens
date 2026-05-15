package main

import (
	"context"
	"log"
	"lotto-backend/prisma/db"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	client := db.NewClient(db.WithDatasourceURL(os.Getenv("DATABASE_URL")))
	if err := client.Connect(); err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect()

	ctx := context.Background()
	
	// ลบข้อมูลที่ผิดพลาดทีละเงื่อนไขเพื่อความชัวร์
	c1, _ := client.LottoDraw.FindMany(db.LottoDraw.FirstPrize.Equals("")).Delete().Exec(ctx)
	c2, _ := client.LottoDraw.FindMany(db.LottoDraw.Back2.Equals("")).Delete().Exec(ctx)
	c3, _ := client.LottoDraw.FindMany(db.LottoDraw.Back2.Equals("xx")).Delete().Exec(ctx)
	
	log.Printf("🧹 Cleaned: Empty1=%d, Empty2=%d, XX=%d", c1.Count, c2.Count, c3.Count)
}

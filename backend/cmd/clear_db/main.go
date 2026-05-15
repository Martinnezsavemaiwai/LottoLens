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
	count, err := client.LottoDraw.FindMany().Delete().Exec(ctx)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("🧹 Cleared %d records from LottoDraw", count)
}

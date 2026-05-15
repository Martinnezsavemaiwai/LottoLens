package main

import (
	"log"
	"os"
	"time"

	"lotto-backend/internal/handlers"
	"lotto-backend/internal/repositories"
	"lotto-backend/internal/services"
	"lotto-backend/prisma/db"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// 0. Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ Warning: .env file not found, using system environment variables")
	}

	// 1. Initialize DB Clients
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("❌ DATABASE_URL is not set in .env or environment")
	}

	client := db.NewClient(db.WithDatasourceURL(dbURL))
	if err := client.Connect(); err != nil {
		log.Fatalf("❌ Postgres error: %v", err)
	}
	defer client.Disconnect()

	chRepo, err := repositories.NewClickHouseRepo(os.Getenv("CLICKHOUSE_HOST"))
	if err != nil {
		log.Printf("⚠️ ClickHouse error: %v", err)
	} else {
		chRepo.InitAnalyticsTable()
	}

	cacheService := services.NewCacheService(os.Getenv("REDIS_HOST"))

	// 2. Setup Layers
	lottoRepo := repositories.NewLottoRepository(client)
	scraperService := services.NewScraperService()
	lottoService := services.NewLottoService(lottoRepo, scraperService, chRepo, cacheService)
	statsService := services.NewStatsService(chRepo, cacheService)
	lottoHandler := handlers.NewLottoHandler(lottoService)
	
	analyticsService := services.NewAnalyticsService(chRepo, cacheService)
	statsHandler := handlers.NewStatsHandler(analyticsService)

	aiService := services.NewAIService(chRepo, lottoRepo)
	aiHandler := handlers.NewAIHandler(aiService)

	// 3. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "Thai Lotto API v1",
	})

	// Middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))
	app.Use(logger.New())
	app.Use(recover.New())

	// 4. Routes
	api := app.Group("/api/v1")
	
	// Draws Group
	draws := api.Group("/draws")
	draws.Get("/", lottoHandler.ListDraws)
	draws.Get("/:date", lottoHandler.GetByDate)
	draws.Post("/sync", lottoHandler.Sync)
	draws.Post("/rebuild-analytics", lottoHandler.RebuildAnalytics)

	// Stats Group (Explicit registration)
	api.Get("/stats/frequency", statsHandler.GetFrequency)
	api.Get("/stats/positional", statsHandler.GetPositional)
	api.Get("/ai/context", aiHandler.GetContext)
	api.Get("/stats/summary", func(c *fiber.Ctx) error {
		log.Println("📡 Request reached /stats/summary")
		summary, err := statsService.GetSummary(c.Context())
		if err != nil {
			log.Printf("❌ Summary Error: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(summary)
	})

	// Root route
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"message": "Welcome to Thai Lotto API",
			"version": "v1.0.0",
			"status":  "healthy",
			"docs":    "/api/v1/draws",
		})
	})

	// Health check (Deep Check)
	app.Get("/health", func(c *fiber.Ctx) error {
		ctx := c.Context()
		status := 200
		
		// 1. Check Postgres (Prisma)
		pgStatus := "up"
		// Simple connectivity check
		if _, err := client.Prisma.ExecuteRaw("SELECT 1").Exec(ctx); err != nil {
			pgStatus = "down: " + err.Error()
			status = 503
		}

		// 2. Check ClickHouse
		chStatus := "up"
		if chRepo != nil {
			if err := chRepo.Ping(ctx); err != nil {
				chStatus = "down: " + err.Error()
				status = 503
			}
		} else {
			chStatus = "down: not initialized"
			status = 503
		}

		// 3. Check Redis
		redisStatus := "up"
		if err := cacheService.Ping(ctx); err != nil {
			redisStatus = "down: " + err.Error()
			status = 503
		}

		return c.Status(status).JSON(fiber.Map{
			"status":      "processed",
			"postgres":    pgStatus,
			"clickhouse":  chStatus,
			"redis":       redisStatus,
			"server_time": time.Now().Format(time.RFC3339),
		})
	})

	// 404 Handler (Debug Server Identity)
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(404).JSON(fiber.Map{
			"error":          "Route not found",
			"requested_path": c.Path(),
			"server_version": "Stats-Explicit-Fix",
		})
	})

	// 5. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🔥 Server is starting on port %s [Version: Stats-Explicit-Fix]", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}

package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"time"

	"lotto-backend/internal/handlers"
	appmiddleware "lotto-backend/internal/middleware"
	"lotto-backend/internal/repositories"
	"lotto-backend/internal/services"
	"lotto-backend/prisma/db"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// 0. Setup Structured Logging (log/slog)
	jsonHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	slog.SetDefault(slog.New(jsonHandler))

	// 0.1 Load .env file
	if err := godotenv.Load(); err != nil {
		slog.Warn("Warning: .env file not found, using system environment variables")
	}

	// 1. Initialize DB Clients
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		slog.Error("DATABASE_URL is not set in .env or environment")
		os.Exit(1)
	}

	client := db.NewClient(db.WithDatasourceURL(dbURL))
	if err := client.Connect(); err != nil {
		slog.Error("Postgres error", "error", err)
		os.Exit(1)
	}
	defer client.Disconnect()

	chRepo, err := repositories.NewClickHouseRepo(os.Getenv("CLICKHOUSE_HOST"))
	if err != nil {
		slog.Warn("ClickHouse error", "error", err)
	} else {
		chRepo.InitAnalyticsTable()
	}

	cacheService := services.NewCacheService(os.Getenv("REDIS_HOST"))

	// 2. Setup Layers
	lottoRepo := repositories.NewLottoRepository(client)
	userRepo := repositories.NewUserRepository(client)
	scraperService := services.NewScraperService()
	lottoService := services.NewLottoService(lottoRepo, scraperService, chRepo, cacheService)
	authService := services.NewAuthService(userRepo)
	statsService := services.NewStatsService(chRepo, cacheService)
	lottoHandler := handlers.NewLottoHandler(lottoService)
	authHandler := handlers.NewAuthHandler(authService)

	analyticsService := services.NewAnalyticsService(chRepo, cacheService)
	statsHandler := handlers.NewStatsHandler(analyticsService)

	aiService := services.NewAIService(chRepo, lottoRepo)
	aiHandler := handlers.NewAIHandler(aiService)

	// ── Lao Lottery Layer ──
	laoRepo := repositories.NewLaoRepository(client)
	laoService := services.NewLaoService(laoRepo, cacheService)
	laoHandler := handlers.NewLaoHandler(laoService, lottoService)

	// 3. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "Thai Lotto API v1 (Hardened)",
	})

	// Global Middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'")
		return c.Next()
	})

	// 4. Routes
	api := app.Group("/api/v1")

	authRoutes := api.Group("/auth")
	authRoutes.Post("/register", authHandler.Register)
	authRoutes.Post("/login", authHandler.Login)

	requireAuth := appmiddleware.AuthMiddleware(authService)

	// Draws Group
	draws := api.Group("/draws")
	draws.Get("/", lottoHandler.ListDraws)
	draws.Get("/:date", lottoHandler.GetByDate)
	draws.Post("/sync", requireAuth, lottoHandler.Sync)
	draws.Post("/rebuild-analytics", requireAuth, lottoHandler.RebuildAnalytics)
	api.Post("/lottery/result", requireAuth, lottoHandler.Sync)

	// ── API v2 — Multi-Lottery Engine ──
	v2 := app.Group("/api/v2")
	lottery := v2.Group("/lottery")
	lottery.Get("/history", laoHandler.GetHistory)
	lottery.Get("/stats", laoHandler.GetStats)
	lottery.Post("/result", requireAuth, laoHandler.PostResult)
	lottery.Delete("/result/:id", requireAuth, laoHandler.DeleteResult)

	// Stats Group (Explicit registration)
	api.Get("/stats/frequency", statsHandler.GetFrequency)
	api.Get("/stats/positional", statsHandler.GetPositional)
	api.Get("/stats/zscores", statsHandler.GetZScores)

	// AI Context with Rate Limiter (Hardening Phase)
	api.Get("/ai/context", limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			slog.Warn("Rate limit reached", "ip", c.IP(), "path", c.Path())
			return c.Status(429).JSON(fiber.Map{
				"error":   "Too many AI requests",
				"message": "Limit: 5 requests per 1 minute. Please wait.",
				"status":  429,
			})
		},
	}), aiHandler.GetContext)

	api.Get("/ai/predict", limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			slog.Warn("Rate limit reached", "ip", c.IP(), "path", c.Path())
			return c.Status(429).JSON(fiber.Map{
				"error":   "Too many AI requests",
				"message": "Limit: 5 requests per 1 minute. Please wait.",
				"status":  429,
			})
		},
	}), aiHandler.Predict)
	api.Post("/ai/predict", limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			slog.Warn("Rate limit reached", "ip", c.IP(), "path", c.Path())
			return c.Status(429).JSON(fiber.Map{
				"error":   "Too many AI requests",
				"message": "Limit: 5 requests per 1 minute. Please wait.",
				"status":  429,
			})
		},
	}), aiHandler.Predict)

	api.Get("/stats/summary", func(c *fiber.Ctx) error {
		slog.Info("📡 Request reached /stats/summary")
		summary, err := statsService.GetSummary(c.Context())
		if err != nil {
			slog.Error("Summary Error", "error", err)
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(summary)
	})

	// Root route
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"message": "Welcome to Thai Lotto API",
			"version": "v1.1.0-hardened",
			"status":  "healthy",
		})
	})

	// Health check (Deep Check)
	app.Get("/health", func(c *fiber.Ctx) error {
		ctx := c.Context()
		status := 200

		// 1. Check Postgres (Prisma)
		pgStatus := "up"
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

	// 404 Handler
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(404).JSON(fiber.Map{
			"error":          "Route not found",
			"requested_path": c.Path(),
			"server_version": "Hardened-v1",
		})
	})

	// 5. Cold Start Auto-Seeding
	go func() {
		ctx := context.Background()
		if err := lottoService.AutoSeed(ctx); err != nil {
			slog.Error("Auto-seed check failed", "error", err)
		}
	}()

	// 5.1 Auto-Seed default admin user if not exists
	go func() {
		ctx := context.Background()
		_, err := authService.Register(ctx, "admin@lottolens.com", "admin1234")
		if err != nil {
			if errors.Is(err, services.ErrUserExists) {
				slog.Info("Default admin user already exists, skipping creation")
			} else {
				slog.Error("Failed to create default admin user", "error", err)
			}
		} else {
			slog.Info("Default admin user created successfully: admin@lottolens.com / admin1234")
		}
	}()

	// 6. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	slog.Info("🔥 Server is starting", "port", port, "version", "Hardened-v1")
	if err := app.Listen(":" + port); err != nil {
		slog.Error("Failed to start server", "error", err)
		os.Exit(1)
	}
}

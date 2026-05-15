# ──────────────────────────────────────────────────────
# Thai Lotto Analytics — Windows Helper Script (PowerShell)
# ──────────────────────────────────────────────────────

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("tidy", "generate", "migrate", "seed", "dev", "docker-up", "docker-down", "test")]
    $action
)

$env:CGO_ENABLED = "0"

switch ($action) {
    "tidy" {
        go mod tidy
    }
    "generate" {
        go run github.com/steebchen/prisma-client-go generate
    }
    "migrate" {
        go run github.com/steebchen/prisma-client-go db push
    }
    "seed" {
        go run ./cmd/seed
    }
    "dev" {
        go run ./cmd/api
    }
    "test" {
        go test ./internal/services/... -v
    }
    "docker-up" {
        docker compose up --build -d
    }
    "docker-down" {
        docker compose down
    }
}

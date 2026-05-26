# ──────────────────────────────────────────────────────
# Thai Lotto Analytics — Backend Makefile
# ──────────────────────────────────────────────────────
# ป้องกันปัญหา CGO บน Windows โดยตั้งค่า CGO_ENABLED=0

.PHONY: generate tidy migrate dev seed build test test-coverage test-race

## ดึง dependencies ทั้งหมด
tidy:
	go mod tidy

## สร้าง Prisma Go Client (ต้องมี .env ก่อน)
generate:
	CGO_ENABLED=0 go run github.com/steebchen/prisma-client-go generate

## Push schema ไปยัง Database (สร้างตาราง)
migrate:
	CGO_ENABLED=0 go run github.com/steebchen/prisma-client-go db push

## Seed ข้อมูลตัวอย่าง
seed:
	CGO_ENABLED=0 go run ./cmd/seed

## รัน API server
dev:
	CGO_ENABLED=0 go run ./cmd/api

## รัน Unit Tests (ทุก package)
test:
	CGO_ENABLED=0 go test ./... -v -timeout 30s

## รัน Tests พร้อม Coverage Report
test-coverage:
	CGO_ENABLED=0 go test ./... -coverprofile=coverage.out -covermode=atomic -timeout 60s
	go tool cover -func=coverage.out | grep total
	go tool cover -html=coverage.out -o coverage.html

## รัน Tests พร้อมตรวจ Race Condition
test-race:
	go test ./... -race -timeout 60s

## รันระบบทั้งหมดด้วย Docker
docker-up:
	docker-compose up --build -d

## ปิดระบบ Docker
docker-down:
	docker-compose down

## Build binary สำหรับ production
build:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ./bin/lotto-api ./cmd/api/main.go

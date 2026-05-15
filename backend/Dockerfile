# ── STAGE 1: Build ──
FROM golang:1.24-alpine AS builder

WORKDIR /app

# ติดตั้ง dependencies ที่จำเป็น
RUN apk add --no-cache git

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Generate Prisma Client
RUN go run github.com/steebchen/prisma-client-go generate

# Build binary (CGO_ENABLED=0 เพื่อความปลอดภัยบน Alpine)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /lotto-api ./cmd/api/main.go


# ── STAGE 2: Runtime ──
FROM alpine:latest

# ติดตั้ง ca-certificates สำหรับ HTTPS
RUN apk --no-cache add ca-certificates tzdata

# สร้าง non-root user
RUN adduser -D -u 1000 appuser

WORKDIR /app

# Copy binary จาก stage แรก
COPY --from=builder /lotto-api ./lotto-api
# Copy schema สำหรับ Prisma runtime
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma

# เปลี่ยนเจ้าของไฟล์เป็น appuser
RUN chown -R appuser:appuser /app

# สลับไปใช้ non-root user
USER appuser

# เปิด port 8080
EXPOSE 8080

# รันแอป
ENTRYPOINT ["./lotto-api"]

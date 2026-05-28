package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"lotto-backend/prisma/db"
	"os"
	"strconv"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type ClickHouseRepo interface {
	InitAnalyticsTable() error
	InsertDrawAnalytics(ctx context.Context, draw *db.LottoDrawModel) error
	GetFrequency(ctx context.Context, prizeType string, limit int) ([]FreqResult, error)
	GetPositionalFrequency(ctx context.Context, prizeType string) (*PositionalFreqResult, error)
	GetZScores(ctx context.Context, prizeType string) ([]DigitZScore, error)
	GetMarkovTransitions(ctx context.Context, prizeType string, lastNum string) ([]MarkovResult, error)
	GetRecencyWeightedStats(ctx context.Context, prizeType string) ([]WeightedResult, error)
	TruncateAnalytics(ctx context.Context) error
	Ping(ctx context.Context) error
}

type DigitZScore struct {
	Digit  uint8   `json:"digit" ch:"digit"`
	Count  uint64  `json:"count" ch:"count"`
	ZScore float64 `json:"z_score" ch:"z_score"`
}

type MarkovResult struct {
	NextNumber string `json:"next_number" ch:"next_number"`
	Count      uint64 `json:"count" ch:"count"`
}

type WeightedResult struct {
	Number string `json:"number" ch:"number"`
	Score  uint64 `json:"score" ch:"score"`
}

type FreqResult struct {
	Number string `json:"number" ch:"number"`
	Count  uint64 `json:"count" ch:"count"`
}

type PositionalFreqResult struct {
	Pos1 []DigitCount `json:"pos1"`
	Pos2 []DigitCount `json:"pos2"`
	Pos3 []DigitCount `json:"pos3"`
}

type DigitCount struct {
	Digit uint8  `json:"digit" ch:"digit"`
	Count uint64 `json:"count" ch:"count"`
}

type clickHouseRepo struct {
	conn clickhouse.Conn
}

func NewClickHouseRepo(host string) (ClickHouseRepo, error) {
	user := os.Getenv("CLICKHOUSE_USER")
	if user == "" {
		user = "default"
	}
	pass := os.Getenv("CLICKHOUSE_PASSWORD")

	var conn clickhouse.Conn
	var err error
	maxRetries := 15

	// 1. Connect to default database first to ensure we can execute administrative queries
	for i := 0; i < maxRetries; i++ {
		conn, err = clickhouse.Open(&clickhouse.Options{
			Addr: []string{host + ":9000"},
			Auth: clickhouse.Auth{
				Database: "default", // Use default db first
				Username: user,
				Password: pass,
			},
		})
		if err == nil {
			// Ping to ensure connection is ready
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			err = conn.Ping(ctx)
			cancel()
			if err == nil {
				break
			}
			conn.Close()
		}

		fmt.Printf("⚠️ ClickHouse not ready yet (attempt %d/%d): %v. Retrying in 2s...\n", i+1, maxRetries, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to clickhouse after %d retries: %v", maxRetries, err)
	}

	// 2. Create database if not exists
	ctx := context.Background()
	if err := conn.Exec(ctx, "CREATE DATABASE IF NOT EXISTS lotto_analytics"); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to create database: %v", err)
	}

	// 3. Re-open connection with the correct database
	conn.Close()

	for i := 0; i < maxRetries; i++ {
		conn, err = clickhouse.Open(&clickhouse.Options{
			Addr: []string{host + ":9000"},
			Auth: clickhouse.Auth{
				Database: "lotto_analytics",
				Username: user,
				Password: pass,
			},
		})
		if err == nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			err = conn.Ping(ctx)
			cancel()
			if err == nil {
				break
			}
			conn.Close()
		}

		fmt.Printf("⚠️ ClickHouse lotto_analytics reconnect not ready yet (attempt %d/%d): %v. Retrying in 2s...\n", i+1, maxRetries, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to lotto_analytics after %d retries: %v", maxRetries, err)
	}

	return &clickHouseRepo{conn: conn}, nil
}

func (r *clickHouseRepo) InitAnalyticsTable() error {
	// สร้างตาราง draw_analytics ตาม Blueprint ข้อ 3.B
	query := `
	CREATE TABLE IF NOT EXISTS draw_analytics (
		draw_date Date,
		prize_type Enum8('first' = 1, 'front3' = 2, 'back3' = 3, 'back2' = 4),
		number String,
		pos1 UInt8, pos2 UInt8, pos3 UInt8,
		is_odd UInt8,
		is_high UInt8
	) ENGINE = MergeTree() 
	ORDER BY (prize_type, draw_date)`
	
	return r.conn.Exec(context.Background(), query)
}

func (r *clickHouseRepo) InsertDrawAnalytics(ctx context.Context, draw *db.LottoDrawModel) error {
	// 1. Unmarshal JSON fields (front3, back3)
	var front3, back3 []string
	if err := json.Unmarshal(draw.Front3, &front3); err != nil {
		return fmt.Errorf("failed to unmarshal front3: %v", err)
	}
	if err := json.Unmarshal(draw.Back3, &back3); err != nil {
		return fmt.Errorf("failed to unmarshal back3: %v", err)
	}

	// 2. Prepare Batch
	batch, err := r.conn.PrepareBatch(ctx, "INSERT INTO draw_analytics")
	if err != nil {
		return fmt.Errorf("failed to prepare batch: %v", err)
	}

	// Helper to extract digits and append to batch
	addRows := func(prizeType string, num string) error {
		var p1, p2, p3 uint8
		
		// Logic: Take last 3 digits for positional analysis if length >= 3
		// For back2, p1=tens, p2=units, p3=0
		nLen := len(num)
		
		// Default positions based on Thai Lotto common analysis
		if prizeType == "first" && nLen >= 6 {
			// Take last 3 digits of first prize
			d1, _ := strconv.Atoi(string(num[3]))
			d2, _ := strconv.Atoi(string(num[4]))
			d3, _ := strconv.Atoi(string(num[5]))
			p1, p2, p3 = uint8(d1), uint8(d2), uint8(d3)
		} else if nLen >= 3 {
			d1, _ := strconv.Atoi(string(num[0]))
			d2, _ := strconv.Atoi(string(num[1]))
			d3, _ := strconv.Atoi(string(num[2]))
			p1, p2, p3 = uint8(d1), uint8(d2), uint8(d3)
		} else if nLen == 2 {
			d1, _ := strconv.Atoi(string(num[0]))
			d2, _ := strconv.Atoi(string(num[1]))
			p1, p2, p3 = uint8(d1), uint8(d2), 0
		}

		// Metadata (based on last digit)
		lastDigit := 0
		if nLen > 0 {
			lastDigit, _ = strconv.Atoi(string(num[nLen-1]))
		}
		
		isOdd := uint8(0)
		if lastDigit%2 != 0 {
			isOdd = 1
		}
		
		isHigh := uint8(0)
		if lastDigit >= 5 {
			isHigh = 1
		}

		return batch.Append(
			draw.DrawDate,
			prizeType,
			num,
			p1, p2, p3,
			isOdd,
			isHigh,
		)
	}

	// 3. Fan-out
	// First Prize
	if err := addRows("first", draw.FirstPrize); err != nil {
		return err
	}
	// Front 3
	for _, n := range front3 {
		if err := addRows("front3", n); err != nil {
			return err
		}
	}
	// Back 3
	for _, n := range back3 {
		if err := addRows("back3", n); err != nil {
			return err
		}
	}
	// Back 2
	if err := addRows("back2", draw.Back2); err != nil {
		return err
	}

	return batch.Send()
}

func (r *clickHouseRepo) GetFrequency(ctx context.Context, prizeType string, limit int) ([]FreqResult, error) {
	var results []FreqResult
	query := fmt.Sprintf(`
		SELECT number, count() as count 
		FROM draw_analytics 
		WHERE prize_type = '%s' 
		GROUP BY number 
		ORDER BY count DESC 
		LIMIT %d`, prizeType, limit)

	err := r.conn.Select(ctx, &results, query)
	return results, err
}

func (r *clickHouseRepo) GetPositionalFrequency(ctx context.Context, prizeType string) (*PositionalFreqResult, error) {
	result := &PositionalFreqResult{
		Pos1: make([]DigitCount, 0),
		Pos2: make([]DigitCount, 0),
		Pos3: make([]DigitCount, 0),
	}

	// Helper function for individual positions
	fetchPos := func(column string) ([]DigitCount, error) {
		var counts []DigitCount
		query := fmt.Sprintf(`
			SELECT %s as digit, count() as count 
			FROM draw_analytics 
			WHERE prize_type = '%s' 
			GROUP BY digit 
			ORDER BY digit ASC`, column, prizeType)
		
		err := r.conn.Select(ctx, &counts, query)
		return counts, err
	}

	var err error
	if result.Pos1, err = fetchPos("pos1"); err != nil {
		return nil, err
	}
	if result.Pos2, err = fetchPos("pos2"); err != nil {
		return nil, err
	}
	if result.Pos3, err = fetchPos("pos3"); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *clickHouseRepo) GetZScores(ctx context.Context, prizeType string) ([]DigitZScore, error) {
	var results []DigitZScore
	// Calculate Z-score for each digit (0-9) based on total occurrences across all positions
	query := fmt.Sprintf(`
		WITH 
			raw_digits AS (
				SELECT pos1 as d FROM draw_analytics WHERE prize_type = '%s'
				UNION ALL
				SELECT pos2 as d FROM draw_analytics WHERE prize_type = '%s'
				UNION ALL
				SELECT pos3 as d FROM draw_analytics WHERE prize_type = '%s' AND pos3 > 0
			),
			counts AS (
				SELECT d as digit, count() as count FROM raw_digits GROUP BY digit
			),
			stats AS (
				SELECT avg(count) as mean, stddevSamp(count) as stddev FROM counts
			)
		SELECT 
			digit, 
			count, 
			if((SELECT stddev FROM stats) > 0, (count - (SELECT mean FROM stats)) / (SELECT stddev FROM stats), 0) as z_score
		FROM counts
		ORDER BY digit ASC`, prizeType, prizeType, prizeType)

	err := r.conn.Select(ctx, &results, query)
	return results, err
}

func (r *clickHouseRepo) GetMarkovTransitions(ctx context.Context, prizeType string, lastNum string) ([]MarkovResult, error) {
	var results []MarkovResult
	// Requirement: ORDER BY draw_date ASC in subquery
	query := fmt.Sprintf(`
		SELECT next_number, count() as count
		FROM (
			SELECT 
				number, 
				neighbor(number, 1) as next_number 
			FROM (
				SELECT number 
				FROM draw_analytics 
				WHERE prize_type = '%s' 
				ORDER BY draw_date ASC
			)
		)
		WHERE number = '%s' AND next_number != ''
		GROUP BY next_number
		ORDER BY count DESC
		LIMIT 5`, prizeType, lastNum)

	err := r.conn.Select(ctx, &results, query)
	return results, err
}

func (r *clickHouseRepo) GetRecencyWeightedStats(ctx context.Context, prizeType string) ([]WeightedResult, error) {
	var results []WeightedResult
	// Weight: Last 5 = 5x, 6-15 = 3x, 16-30 = 2x, rest = 1x
	query := fmt.Sprintf(`
		SELECT number, sum(weight) as score
		FROM (
			SELECT 
				number,
				row_number() OVER (ORDER BY draw_date DESC) as rank,
				multiIf(rank <= 5, 5, rank <= 15, 3, rank <= 30, 2, 1) as weight
			FROM draw_analytics
			WHERE prize_type = '%s'
		)
		GROUP BY number
		ORDER BY score DESC
		LIMIT 10`, prizeType)

	err := r.conn.Select(ctx, &results, query)
	return results, err
}

func (r *clickHouseRepo) TruncateAnalytics(ctx context.Context) error {
	return r.conn.Exec(ctx, "TRUNCATE TABLE draw_analytics")
}

func (r *clickHouseRepo) Ping(ctx context.Context) error {
	return r.conn.Ping(ctx)
}

package repositories

import (
	"context"
	"lotto-backend/prisma/db"
	"math"
	"sort"
	"time"
)

// ── Types ─────────────────────────────────────────────────────────────────────

// LaoStatsResult holds pre-calculated analytics for Lao lottery fields.
type LaoStatsResult struct {
	Hot      []DigitStat          `json:"hot"`
	Cold     []DigitStat          `json:"cold"`
	Overdue  []DigitStat          `json:"overdue"`
	Positional map[string][]PosDigit `json:"positional"` // field → [pos0..posN]
	TopTail4 []FreqResult         `json:"top_tail4"`
	TopTop2  []FreqResult         `json:"top_top2"`
	TopBottom2 []FreqResult       `json:"top_bottom2"`
	Deep     LaoDeepStats         `json:"deep"`
	TotalDraws int                `json:"total_draws"`
	ZScores  []DigitZScore        `json:"z_scores"`
}

type DigitStat struct {
	Digit int `json:"digit"`
	Count int `json:"count"`
	Gap   int `json:"gap"` // งวดที่แล้วครั้งล่าสุด
}

type PosDigit struct {
	Digit int `json:"digit"`
	Count int `json:"count"`
}

type LaoDeepStats struct {
	OddPct  int `json:"odd_pct"`
	EvenPct int `json:"even_pct"`
	HiPct   int `json:"hi_pct"`
	LoPct   int `json:"lo_pct"`
	Dbl2Pct int `json:"dbl2_pct"` // % งวดที่ bottom2 เป็นเลขเบิ้ล
}

// ── Interface ────────────────────────────────────────────────────────────────

type LaoRepository interface {
	FindAll(ctx context.Context, skip, take int) ([]db.LaoLotteryResultModel, error)
	FindByDate(ctx context.Context, date time.Time) (*db.LaoLotteryResultModel, error)
	Upsert(ctx context.Context, d *db.LaoLotteryResultModel) (*db.LaoLotteryResultModel, error)
	Count(ctx context.Context) (int, error)
	GetStats(ctx context.Context) (*LaoStatsResult, error)
	Delete(ctx context.Context, id string) error
}

// ── Implementation ────────────────────────────────────────────────────────────

type laoRepository struct {
	client *db.PrismaClient
}

func NewLaoRepository(client *db.PrismaClient) LaoRepository {
	return &laoRepository{client: client}
}

func (r *laoRepository) FindAll(ctx context.Context, skip, take int) ([]db.LaoLotteryResultModel, error) {
	return r.client.LaoLotteryResult.FindMany().
		OrderBy(db.LaoLotteryResult.DrawDate.Order(db.SortOrderDesc)).
		Skip(skip).
		Take(take).
		Exec(ctx)
}

func (r *laoRepository) FindByDate(ctx context.Context, date time.Time) (*db.LaoLotteryResultModel, error) {
	draw, err := r.client.LaoLotteryResult.FindUnique(
		db.LaoLotteryResult.DrawDate.Equals(date),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}
	return draw, nil
}

func (r *laoRepository) Upsert(ctx context.Context, d *db.LaoLotteryResultModel) (*db.LaoLotteryResultModel, error) {
	return r.client.LaoLotteryResult.UpsertOne(
		db.LaoLotteryResult.DrawDate.Equals(d.DrawDate),
	).Create(
		db.LaoLotteryResult.DrawDate.Set(d.DrawDate),
		db.LaoLotteryResult.Tail4.Set(d.Tail4),
		db.LaoLotteryResult.Top3.Set(d.Top3),
		db.LaoLotteryResult.Top2.Set(d.Top2),
		db.LaoLotteryResult.Bottom2.Set(d.Bottom2),
		db.LaoLotteryResult.IsVerified.Set(d.IsVerified),
	).Update(
		db.LaoLotteryResult.Tail4.Set(d.Tail4),
		db.LaoLotteryResult.Top3.Set(d.Top3),
		db.LaoLotteryResult.Top2.Set(d.Top2),
		db.LaoLotteryResult.Bottom2.Set(d.Bottom2),
		db.LaoLotteryResult.IsVerified.Set(d.IsVerified),
	).Exec(ctx)
}

func (r *laoRepository) Count(ctx context.Context) (int, error) {
	results, err := r.client.LaoLotteryResult.FindMany().Exec(ctx)
	if err != nil {
		return 0, err
	}
	return len(results), nil
}

func (r *laoRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.LaoLotteryResult.FindUnique(
		db.LaoLotteryResult.ID.Equals(id),
	).Delete().Exec(ctx)
	return err
}

// GetStats computes all analytics in Go — no ClickHouse dependency for Lao data.
func (r *laoRepository) GetStats(ctx context.Context) (*LaoStatsResult, error) {
	// Fetch all draws (sorted desc by date — most recent first)
	draws, err := r.client.LaoLotteryResult.FindMany().
		OrderBy(db.LaoLotteryResult.DrawDate.Order(db.SortOrderDesc)).
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	N := len(draws)
	if N == 0 {
		return &LaoStatsResult{TotalDraws: 0}, nil
	}

	// ── Digit frequency across tail4 digits ─────────────────────────────────
	digFreq := make([]int, 10)
	lastDigSeen := make(map[int]int) // digit → index of last appearance
	var odd, even, hi, lo, totDig int
	var dbl2Count int

	// Positional frequency: tail4 (4 pos), top3 (3 pos), top2 (2 pos), bottom2 (2 pos)
	tail4Pos := [4][10]int{}
	top3Pos  := [3][10]int{}
	top2Pos  := [2][10]int{}
	bot2Pos  := [2][10]int{}

	tail4Freq  := map[string]int{}
	top2Freq   := map[string]int{}
	bottom2Freq := map[string]int{}

	for i, d := range draws {
		// tail4 positional
		for p, ch := range d.Tail4 {
			if p >= 4 { break }
			n := int(ch - '0')
			tail4Pos[p][n]++
			digFreq[n]++
			if _, seen := lastDigSeen[n]; !seen { lastDigSeen[n] = i }
			if n%2 == 0 { even++ } else { odd++ }
			if n >= 5 { hi++ } else { lo++ }
			totDig++
		}
		// top3 positional
		for p, ch := range d.Top3 {
			if p >= 3 { break }
			top3Pos[p][int(ch-'0')]++
		}
		// top2 positional
		for p, ch := range d.Top2 {
			if p >= 2 { break }
			top2Pos[p][int(ch-'0')]++
		}
		// bottom2 positional + double check
		for p, ch := range d.Bottom2 {
			if p >= 2 { break }
			bot2Pos[p][int(ch-'0')]++
		}
		if len(d.Bottom2) == 2 && d.Bottom2[0] == d.Bottom2[1] { dbl2Count++ }

		// Pair/combo frequency
		tail4Freq[d.Tail4]++
		top2Freq[d.Top2]++
		bottom2Freq[d.Bottom2]++
	}

	// ── Hot / Cold / Overdue ─────────────────────────────────────────────────
	type ds struct{ digit, count, gap int }
	digArr := make([]ds, 10)
	for d := 0; d < 10; d++ {
		gap := 999
		if g, ok := lastDigSeen[d]; ok { gap = g }
		digArr[d] = ds{d, digFreq[d], gap}
	}

	hot := make([]DigitStat, 10)
	for i, x := range digArr { hot[i] = DigitStat{x.digit, x.count, x.gap} }
	sort.Slice(hot, func(a, b int) bool { return hot[a].Count > hot[b].Count })
	hot = hot[:4]

	cold := make([]DigitStat, 10)
	for i, x := range digArr { cold[i] = DigitStat{x.digit, x.count, x.gap} }
	sort.Slice(cold, func(a, b int) bool { return cold[a].Count < cold[b].Count })
	cold = cold[:4]

	overdue := make([]DigitStat, 10)
	for i, x := range digArr { overdue[i] = DigitStat{x.digit, x.count, x.gap} }
	sort.Slice(overdue, func(a, b int) bool { return overdue[a].Gap > overdue[b].Gap })
	overdue = overdue[:4]

	// ── Top Pairs ────────────────────────────────────────────────────────────
	topTail4   := freqMapToSorted(tail4Freq, 20)
	topTop2    := freqMapToSorted(top2Freq, 20)
	topBottom2 := freqMapToSorted(bottom2Freq, 20)

	// ── Positional ───────────────────────────────────────────────────────────
	pos := map[string][]PosDigit{}
	pos["tail4"]   = posArr4(tail4Pos)
	pos["top3"]    = posArr3(top3Pos)
	pos["top2"]    = posArr2(top2Pos)
	pos["bottom2"] = posArr2(bot2Pos)

	// ── Deep Stats ───────────────────────────────────────────────────────────
	deep := LaoDeepStats{
		OddPct:  pct(odd, totDig),
		EvenPct: pct(even, totDig),
		HiPct:   pct(hi, totDig),
		LoPct:   pct(lo, totDig),
		Dbl2Pct: pct(dbl2Count, N),
	}

	// ── Z-Score calculation ─────────────────────────────────────────────────
	mean := float64(totDig) / 10.0
	var varianceSum float64
	for d := 0; d < 10; d++ {
		diff := float64(digFreq[d]) - mean
		varianceSum += diff * diff
	}
	stdDev := 0.0
	if varianceSum > 0 {
		stdDev = math.Sqrt(varianceSum / 9.0)
	}

	zScores := make([]DigitZScore, 10)
	for d := 0; d < 10; d++ {
		zScoreVal := 0.0
		if stdDev > 0 {
			zScoreVal = (float64(digFreq[d]) - mean) / stdDev
		}
		zScores[d] = DigitZScore{
			Digit:  uint8(d),
			Count:  uint64(digFreq[d]),
			ZScore: zScoreVal,
		}
	}

	return &LaoStatsResult{
		Hot: hot, Cold: cold, Overdue: overdue,
		Positional: pos,
		TopTail4: topTail4, TopTop2: topTop2, TopBottom2: topBottom2,
		Deep: deep, TotalDraws: N,
		ZScores: zScores,
	}, nil
}

// ── Internal helpers ─────────────────────────────────────────────────────────

func freqMapToSorted(m map[string]int, limit int) []FreqResult {
	res := make([]FreqResult, 0, len(m))
	for k, v := range m {
		res = append(res, FreqResult{Number: k, Count: uint64(v)})
	}
	sort.Slice(res, func(a, b int) bool { return res[a].Count > res[b].Count })
	if len(res) > limit { res = res[:limit] }
	return res
}

func posArr4(arr [4][10]int) []PosDigit {
	out := make([]PosDigit, 0, 40)
	for p := 0; p < 4; p++ {
		for d := 0; d < 10; d++ {
			out = append(out, PosDigit{Digit: p*10 + d, Count: arr[p][d]})
		}
	}
	return out
}

func posArr3(arr [3][10]int) []PosDigit {
	out := make([]PosDigit, 0, 30)
	for p := 0; p < 3; p++ {
		for d := 0; d < 10; d++ {
			out = append(out, PosDigit{Digit: p*10 + d, Count: arr[p][d]})
		}
	}
	return out
}

func posArr2(arr [2][10]int) []PosDigit {
	out := make([]PosDigit, 0, 20)
	for p := 0; p < 2; p++ {
		for d := 0; d < 10; d++ {
			out = append(out, PosDigit{Digit: p*10 + d, Count: arr[p][d]})
		}
	}
	return out
}

func pct(num, den int) int {
	if den == 0 { return 0 }
	return int(float64(num) / float64(den) * 100)
}

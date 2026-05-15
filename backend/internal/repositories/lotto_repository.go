package repositories

import (
	"context"
	"lotto-backend/prisma/db"
	"time"
)

type LottoRepository interface {
	FindAll(ctx context.Context, skip, take int) ([]db.LottoDrawModel, error)
	FindByDate(ctx context.Context, date time.Time) (*db.LottoDrawModel, error)
	FindLatest(ctx context.Context) (*db.LottoDrawModel, error)
	Upsert(ctx context.Context, draw *db.LottoDrawModel) (*db.LottoDrawModel, error)
}

type lottoRepository struct {
	client *db.PrismaClient
}

func NewLottoRepository(client *db.PrismaClient) LottoRepository {
	return &lottoRepository{client: client}
}

func (r *lottoRepository) FindAll(ctx context.Context, skip, take int) ([]db.LottoDrawModel, error) {
	return r.client.LottoDraw.FindMany().
		OrderBy(db.LottoDraw.DrawDate.Order(db.SortOrderDesc)).
		Skip(skip).
		Take(take).
		Exec(ctx)
}

func (r *lottoRepository) FindByDate(ctx context.Context, date time.Time) (*db.LottoDrawModel, error) {
	draw, err := r.client.LottoDraw.FindUnique(
		db.LottoDraw.DrawDate.Equals(date),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}
	return draw, nil
}

func (r *lottoRepository) FindLatest(ctx context.Context) (*db.LottoDrawModel, error) {
	draws, err := r.client.LottoDraw.FindMany().
		OrderBy(db.LottoDraw.DrawDate.Order(db.SortOrderDesc)).
		Take(1).
		Exec(ctx)
	
	if err != nil {
		return nil, err
	}
	if len(draws) == 0 {
		return nil, nil
	}
	return &draws[0], nil
}

func (r *lottoRepository) Upsert(ctx context.Context, d *db.LottoDrawModel) (*db.LottoDrawModel, error) {
	return r.client.LottoDraw.UpsertOne(
		db.LottoDraw.DrawDate.Equals(d.DrawDate),
	).Create(
		db.LottoDraw.DrawDate.Set(d.DrawDate),
		db.LottoDraw.DrawDay.Set(d.DrawDay),
		db.LottoDraw.Month.Set(d.Month),
		db.LottoDraw.Year.Set(d.Year),
		db.LottoDraw.FirstPrize.Set(d.FirstPrize),
		db.LottoDraw.NearbyPrizes.Set(d.NearbyPrizes),
		db.LottoDraw.SecondPrizes.Set(d.SecondPrizes),
		db.LottoDraw.ThirdPrizes.Set(d.ThirdPrizes),
		db.LottoDraw.FourthPrizes.Set(d.FourthPrizes),
		db.LottoDraw.FifthPrizes.Set(d.FifthPrizes),
		db.LottoDraw.Front3.Set(d.Front3),
		db.LottoDraw.Back3.Set(d.Back3),
		db.LottoDraw.Back2.Set(d.Back2),
	).Update(
		db.LottoDraw.FirstPrize.Set(d.FirstPrize),
		db.LottoDraw.NearbyPrizes.Set(d.NearbyPrizes),
		db.LottoDraw.SecondPrizes.Set(d.SecondPrizes),
		db.LottoDraw.ThirdPrizes.Set(d.ThirdPrizes),
		db.LottoDraw.FourthPrizes.Set(d.FourthPrizes),
		db.LottoDraw.FifthPrizes.Set(d.FifthPrizes),
		db.LottoDraw.Front3.Set(d.Front3),
		db.LottoDraw.Back3.Set(d.Back3),
		db.LottoDraw.Back2.Set(d.Back2),
	).Exec(ctx)
}

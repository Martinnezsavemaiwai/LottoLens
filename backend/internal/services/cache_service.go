package services

import (
	"context"
	"encoding/json"
	"github.com/redis/go-redis/v9"
	"time"
)

type CacheService interface {
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Get(ctx context.Context, key string, dest interface{}) error
	Delete(ctx context.Context, key string) error
	DeleteByPrefix(ctx context.Context, prefix string) error
	Ping(ctx context.Context) error
}

type cacheService struct {
	client *redis.Client
}

func NewCacheService(addr string) CacheService {
	client := redis.NewClient(&redis.Options{
		Addr: addr,
	})
	return &cacheService{client: client}
}

func (s *cacheService) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return s.client.Set(ctx, key, data, ttl).Err()
}

func (s *cacheService) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := s.client.Get(ctx, key).Result()
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(val), dest)
}

func (s *cacheService) Delete(ctx context.Context, key string) error {
	return s.client.Del(ctx, key).Err()
}

func (s *cacheService) DeleteByPrefix(ctx context.Context, prefix string) error {
	var cursor uint64
	for {
		var keys []string
		var err error
		keys, cursor, err = s.client.Scan(ctx, cursor, prefix+"*", 100).Result()
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			if err := s.client.Del(ctx, keys...).Err(); err != nil {
				return err
			}
		}
		if cursor == 0 {
			break
		}
	}
	return nil
}

func (s *cacheService) Ping(ctx context.Context) error {
	return s.client.Ping(ctx).Err()
}

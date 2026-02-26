import Redis from "ioredis";

let _redis: Redis | null = null;
let _bullRedis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      retryStrategy(times) {
        return Math.min(times * 200, 5000);
      },
    });
  }
  return _redis;
}

/**
 * BullMQ requires maxRetriesPerRequest=null on its Redis connections.
 * Always call this for BullMQ queues/workers, never share with the cache client.
 */
export function createBullConnection(): Redis {
  return new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      return Math.min(times * 200, 5000);
    },
  });
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
  if (_bullRedis) {
    await _bullRedis.quit();
    _bullRedis = null;
  }
}

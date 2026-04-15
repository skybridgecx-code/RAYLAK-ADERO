import { Redis } from "ioredis";
import { env } from "./env";

/**
 * Lazy singleton Redis client.
 * Do not construct Redis at module import time because Next static builds import
 * server modules while collecting page data.
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export function getRedis(): Redis {
  const existing = globalForRedis.redis;
  if (existing) {
    return existing;
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on("error", (err) => {
    console.error("[Redis] connection error:", err);
  });

  if (env.NODE_ENV !== "production") {
    globalForRedis.redis = redis;
  }

  return redis;
}

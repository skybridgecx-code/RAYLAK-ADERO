import { Redis } from "ioredis";
import { env } from "./env";

/**
 * Singleton Redis client.
 * Reused across hot-reloads in development via globalThis caching.
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

redis.on("error", (err) => {
  console.error("[Redis] connection error:", err);
});

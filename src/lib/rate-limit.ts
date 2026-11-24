/**
 * Production-ready rate limiter with Redis support and in-memory fallback.
 *
 * Usage:
 * - Development: Uses in-memory Map (no external dependencies)
 * - Production: Uses Upstash Redis (or any Redis-compatible client)
 *
 * Environment variables:
 * - UPSTASH_REDIS_REST_URL: Redis REST API URL (e.g., from Upstash)
 * - UPSTASH_REDIS_REST_TOKEN: Redis REST API token
 * - RATE_LIMIT_PREFIX: Prefix for rate limit keys (default: "rl:")
 */

import { Redis } from "@upstash/redis";

// ============================================
// Types
// ============================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key prefix for Redis/in-memory storage */
  prefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
  /** Total limit */
  limit: number;
}

export interface RateLimiter {
  /** Check and increment the rate limit for a key */
  limit(key: string): Promise<RateLimitResult>;
  /** Reset the rate limit for a key */
  reset(key: string): Promise<void>;
}

// ============================================
// In-Memory Rate Limiter (Development)
// ============================================

class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();
  private config: Required<RateLimitConfig>;
  private cleanupCounter = 0;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      prefix: config.prefix || "rl:",
    };
  }

  async limit(key: string): Promise<RateLimitResult> {
    const fullKey = this.config.prefix + key;
    const now = Date.now();
    const entry = this.store.get(fullKey);

    if (!entry || now > entry.resetAt) {
      // New window
      const resetAt = now + this.config.windowMs;
      this.store.set(fullKey, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt,
        limit: this.config.maxRequests,
      };
    }

    if (entry.count >= this.config.maxRequests) {
      // Rate limited
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        limit: this.config.maxRequests,
      };
    }

    // Increment
    entry.count += 1;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.resetAt,
      limit: this.config.maxRequests,
    };
  }

  async reset(key: string): Promise<void> {
    const fullKey = this.config.prefix + key;
    this.store.delete(fullKey);
  }

  // Periodic cleanup of stale entries
  private maybeCleanup(): void {
    if (++this.cleanupCounter % 100 !== 0) return;
    const now = Date.now();
    for (const [k, entry] of this.store.entries()) {
      if (now > entry.resetAt) this.store.delete(k);
    }
  }
}

// ============================================
// Redis Rate Limiter (Production)
// ============================================

class RedisRateLimiter implements RateLimiter {
  private redis: Redis;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      prefix: config.prefix || "rl:",
    };

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set for Redis rate limiter"
      );
    }

    this.redis = new Redis({ url, token });
  }

  async limit(key: string): Promise<RateLimitResult> {
    const fullKey = this.config.prefix + key;
    const now = Date.now();
    const windowSec = Math.ceil(this.config.windowMs / 1000);

    // Use Redis sorted set for sliding window rate limiting
    // ZSET members: timestamp-ms, score: timestamp-ms
    // Remove expired entries
    await this.redis.zremrangebyscore(fullKey, 0, now - this.config.windowMs);

    // Count current requests
    const count = await this.redis.zcard(fullKey);

    if (count >= this.config.maxRequests) {
      // Get the oldest entry to calculate reset time
      const oldest = await this.redis.zrange(fullKey, 0, 0, { withScores: true });
      const resetAt = oldest.length > 0 ? (oldest[1] as number) + this.config.windowMs : now + this.config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: this.config.maxRequests,
      };
    }

    // Add current request
    const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;
    await this.redis.zadd(fullKey, { score: now, member });
    await this.redis.expire(fullKey, windowSec);

    return {
      allowed: true,
      remaining: this.config.maxRequests - count - 1,
      resetAt: now + this.config.windowMs,
      limit: this.config.maxRequests,
    };
  }

  async reset(key: string): Promise<void> {
    const fullKey = this.config.prefix + key;
    await this.redis.del(fullKey);
  }
}

// ============================================
// Factory
// ============================================

const limiterInstances = new Map<string, RateLimiter>();

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  // Check if Redis is configured for production
  const useRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (useRedis) {
    return new RedisRateLimiter(config);
  }

  // Development: use in-memory
  return new InMemoryRateLimiter(config);
}

export function getRateLimiter(config?: RateLimitConfig): RateLimiter {
  if (!config) {
    let defaultLimiter = limiterInstances.get("rl:default:");
    if (!defaultLimiter) {
      defaultLimiter = createRateLimiter({ maxRequests: 100, windowMs: 60 * 1000, prefix: "rl:default:" });
      limiterInstances.set("rl:default:", defaultLimiter);
    }
    return defaultLimiter;
  }

  const key = config.prefix || `rl:${config.maxRequests}:${config.windowMs}:`;
  let instance = limiterInstances.get(key);
  if (!instance) {
    instance = createRateLimiter(config);
    limiterInstances.set(key, instance);
  }
  return instance;
}

// ============================================
// Pre-configured limiters for common use cases
// ============================================

/** Login attempts: 5 per 15 minutes per IP */
export const loginRateLimiter = () =>
  getRateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000, prefix: "rl:login:" });

/** General API: 100 per minute per IP */
export const apiRateLimiter = () =>
  getRateLimiter({ maxRequests: 100, windowMs: 60 * 1000, prefix: "rl:api:" });

/** Password reset: 3 per hour per IP */
export const passwordResetRateLimiter = () =>
  getRateLimiter({ maxRequests: 3, windowMs: 60 * 60 * 1000, prefix: "rl:pwd-reset:" });

/** Upload: 10 per minute per user */
export const uploadRateLimiter = () =>
  getRateLimiter({ maxRequests: 10, windowMs: 60 * 1000, prefix: "rl:upload:" });

/** Public reservations: 10 per 10 minutes per IP */
export const reservationRateLimiter = () =>
  getRateLimiter({ maxRequests: 10, windowMs: 10 * 60 * 1000, prefix: "rl:reservation:" });

/** Public orders: 10 per 10 minutes per IP */
export const orderRateLimiter = () =>
  getRateLimiter({ maxRequests: 10, windowMs: 10 * 60 * 1000, prefix: "rl:order:" });
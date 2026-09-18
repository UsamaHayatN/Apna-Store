/**
 * Rate Limiter for Sensitive Authentication Endpoints.
 * Uses a sliding-window algorithm to throttle brute-force attacks on login, registration,
 * and password recovery while remaining transparent during standard development.
 */

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Duration in milliseconds
}

const actionConfigs: Record<string, RateLimitConfig> = {
  login: { maxRequests: 10, windowMs: 5 * 60 * 1000 }, // 10 attempts per 5 min
  register: { maxRequests: 10, windowMs: 10 * 60 * 1000 }, // 10 registrations per 10 min
  forgot_password: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 resets per 15 min
  reset_password: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 submissions per 15 min
  verify_email: { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 verification requests per 15 min
};

// Global in-memory storage for sliding window timestamps
declare global {
  // eslint-disable-next-line no-var
  var _authRateLimitStore: Map<string, RateLimitRecord> | undefined;
}

const store: Map<string, RateLimitRecord> =
  global._authRateLimitStore || (global._authRateLimitStore = new Map());

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTimeMs: number;
  retryAfterSeconds?: number;
}

export function checkRateLimit(action: string, identifier: string): RateLimitResult {
  const config = actionConfigs[action] || { maxRequests: 30, windowMs: 60 * 1000 };
  const key = `${action}:${identifier.toLowerCase().trim()}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const record = store.get(key) || { timestamps: [] };

  // Remove timestamps outside the active window
  const activeTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= config.maxRequests) {
    const oldest = activeTimestamps[0];
    const resetTimeMs = oldest + config.windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

    return {
      success: false,
      remaining: 0,
      resetTimeMs,
      retryAfterSeconds,
    };
  }

  // Record this attempt
  activeTimestamps.push(now);
  store.set(key, { timestamps: activeTimestamps });

  // Periodically clean stale records if store grows large
  if (store.size > 5000) {
    for (const [k, v] of store.entries()) {
      if (v.timestamps.length === 0 || v.timestamps[v.timestamps.length - 1] < now - 3600000) {
        store.delete(k);
      }
    }
  }

  return {
    success: true,
    remaining: config.maxRequests - activeTimestamps.length,
    resetTimeMs: now + config.windowMs,
  };
}

/**
 * Resets rate limit for a given action and identifier (e.g. upon successful authentication).
 */
export function resetRateLimit(action: string, identifier: string): void {
  const key = `${action}:${identifier.toLowerCase().trim()}`;
  store.delete(key);
}

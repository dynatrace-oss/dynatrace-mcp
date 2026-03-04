/**
 * Result of a rate limit check.
 */
export type RateLimitResult =
  | {
      /** Whether the rate limit was exceeded */
      exceeded: false;
    }
  | {
      /** Whether the rate limit was exceeded */
      exceeded: true;
      /** Human-readable message when rate limit is exceeded */
      message: string;
      /** Milliseconds until the next request slot becomes available */
      retryAfterMs: number;
    };

/**
 * Simple in-memory rate limiter: allows at most `maxRequests` calls within a sliding `windowMs` window.
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter(5, 20_000); // 5 requests per 20 seconds
 * const result = limiter.check();
 * if (result.exceeded) {
 *   console.error(result.message);
 * }
 * ```
 */
export class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  /**
   * Check whether the current call exceeds the rate limit.
   * If within limits, records the call timestamp.
   * @param currentTimestamp - Current timestamp in milliseconds (defaults to Date.now())
   * @returns RateLimitResult indicating whether the limit was exceeded
   */
  check(currentTimestamp = Date.now()): RateLimitResult {
    const windowStart = currentTimestamp - this.windowMs;
    this.timestamps = this.timestamps.filter((ts) => ts > windowStart);

    if (this.timestamps.length >= this.maxRequests) {
      const retryAfterMs = this.timestamps[0] + this.windowMs - currentTimestamp;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      return {
        exceeded: true,
        message: `Rate limit exceeded: Maximum ${this.maxRequests} tool calls per ${this.windowMs / 1000} seconds. Please retry in ${retryAfterSeconds} second${retryAfterSeconds !== 1 ? 's' : ''}.`,
        retryAfterMs,
      };
    }

    this.timestamps.push(currentTimestamp);
    return { exceeded: false };
  }

  /**
   * Reset the rate limiter (primarily for testing)
   */
  reset(): void {
    this.timestamps = [];
  }
}

// Global singleton: 10 requests per 10 seconds
let globalRateLimiter: RateLimiter | null = null;

/**
 * Returns the global singleton tool-call rate limiter (10 requests / 10 s).
 * The same instance is reused across all calls; use {@link resetToolCallRateLimiter} to reset it (e.g. in tests).
 *
 * @example
 * ```ts
 * const result = getToolCallRateLimiter().check();
 * if (result.exceeded) {
 *   throw new Error(result.message);
 * }
 * ```
 */
export function getToolCallRateLimiter(): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(10, 10000);
  }
  return globalRateLimiter;
}

/**
 * Reset the global tool-call rate limiter (primarily for testing).
 */
export function resetToolCallRateLimiter(): void {
  globalRateLimiter = null;
}

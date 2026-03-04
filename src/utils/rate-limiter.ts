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
    };

/**
 * Simple in-memory rate limiter: allows at most `maxRequests` calls within a sliding `windowMs` window.
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
      return {
        exceeded: true,
        message: `Rate limit exceeded: Maximum ${this.maxRequests} tool calls per ${this.windowMs / 1000} seconds. Please try again later.`,
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

// Global singleton: 5 requests per 20 seconds
let globalRateLimiter: RateLimiter | null = null;

/**
 * Get the global tool-call rate limiter instance (5 requests / 20 s).
 */
export function getToolCallRateLimiter(): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(5, 20000);
  }
  return globalRateLimiter;
}

/**
 * Reset the global tool-call rate limiter (primarily for testing).
 */
export function resetToolCallRateLimiter(): void {
  globalRateLimiter = null;
}

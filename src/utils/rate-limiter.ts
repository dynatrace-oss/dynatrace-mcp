/**
 * Rate limiter for tool calls.
 * Enforces a maximum number of calls within a sliding time window.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxCalls: number;
  private readonly windowMs: number;

  /**
   * @param maxCalls - Maximum number of calls allowed within the time window
   * @param windowMs - Time window in milliseconds
   */
  constructor(maxCalls: number = 5, windowMs: number = 20000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  /**
   * Check if a new call is allowed and record it if so.
   * @returns true if the call is allowed, false if rate limited
   */
  tryAcquire(): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter((ts) => ts > windowStart);

    // Check if we're at the limit
    if (this.timestamps.length >= this.maxCalls) {
      return false;
    }

    // Record this call
    this.timestamps.push(now);
    return true;
  }

  /**
   * Reset the rate limiter state.
   */
  reset(): void {
    this.timestamps = [];
  }
}

// Global rate limiter instance for tool calls (5 calls per 20 seconds)
let globalRateLimiter: RateLimiter | null = null;

export const getGlobalRateLimiter = (): RateLimiter => {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(5, 20000);
  }
  return globalRateLimiter;
};

export const resetGlobalRateLimiter = (): void => {
  globalRateLimiter = null;
};

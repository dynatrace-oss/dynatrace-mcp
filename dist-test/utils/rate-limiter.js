'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.RateLimiter = void 0;
exports.getToolCallRateLimiter = getToolCallRateLimiter;
exports.resetToolCallRateLimiter = resetToolCallRateLimiter;
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
class RateLimiter {
  maxRequests;
  windowMs;
  timestamps = [];
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  /**
   * Check whether the current call exceeds the rate limit.
   * If within limits, records the call timestamp.
   * @param currentTimestamp - Current timestamp in milliseconds (defaults to Date.now())
   * @returns RateLimitResult indicating whether the limit was exceeded
   */
  check(currentTimestamp = Date.now()) {
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
  reset() {
    this.timestamps = [];
  }
}
exports.RateLimiter = RateLimiter;
// Global singleton: 5 requests per 20 seconds
let globalRateLimiter = null;
/**
 * Returns the global singleton tool-call rate limiter (5 requests / 20 s).
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
function getToolCallRateLimiter() {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(5, 20000);
  }
  return globalRateLimiter;
}
/**
 * Reset the global tool-call rate limiter (primarily for testing).
 */
function resetToolCallRateLimiter() {
  globalRateLimiter = null;
}

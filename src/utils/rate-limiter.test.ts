import { RateLimiter, getGlobalRateLimiter, resetGlobalRateLimiter } from './rate-limiter';

/**
 * Unit tests for RateLimiter using a Fake Timer
 */

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('tryAcquire', () => {
    it('should allow calls within the limit', () => {
      const limiter = new RateLimiter(3, 10000);

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
    });

    it('should reject calls exceeding the limit', () => {
      const limiter = new RateLimiter(3, 10000);

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });

    it('should allow calls after the time window expires', () => {
      const limiter = new RateLimiter(2, 10000);

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);

      // Advance time past the window
      jest.advanceTimersByTime(10001);

      expect(limiter.tryAcquire()).toBe(true);
    });

    it('should use sliding window correctly', () => {
      const limiter = new RateLimiter(2, 10000);

      expect(limiter.tryAcquire()).toBe(true); // t=0

      jest.advanceTimersByTime(5000); // t=5000
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false); // at limit

      jest.advanceTimersByTime(5001); // t=10001, first call expired
      expect(limiter.tryAcquire()).toBe(true);
    });

    it('should use default values (5 calls per 20 seconds)', () => {
      const limiter = new RateLimiter();

      for (let i = 0; i < 5; i++) {
        expect(limiter.tryAcquire()).toBe(true);
      }
      expect(limiter.tryAcquire()).toBe(false);

      jest.advanceTimersByTime(20001);
      expect(limiter.tryAcquire()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all timestamps and allow new calls', () => {
      const limiter = new RateLimiter(2, 10000);

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);

      // just reset the limiter, but don't advance the timer
      limiter.reset();

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
    });
  });
});

describe('Global RateLimiter', () => {
  afterEach(() => {
    resetGlobalRateLimiter();
  });

  it('should return a singleton instance', () => {
    const limiter1 = getGlobalRateLimiter();
    const limiter2 = getGlobalRateLimiter();

    expect(limiter1).toBe(limiter2);
  });

  it('should create a new instance after reset', () => {
    const limiter1 = getGlobalRateLimiter();
    resetGlobalRateLimiter();
    const limiter2 = getGlobalRateLimiter();

    expect(limiter1).not.toBe(limiter2);
  });

  it('should use default rate limit of 5 calls per 20 seconds', () => {
    jest.useFakeTimers();
    const limiter = getGlobalRateLimiter();

    for (let i = 0; i < 5; i++) {
      expect(limiter.tryAcquire()).toBe(true);
    }
    expect(limiter.tryAcquire()).toBe(false);

    jest.useRealTimers();
  });
});

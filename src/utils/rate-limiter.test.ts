import { RateLimiter, getToolCallRateLimiter, resetToolCallRateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  describe('check', () => {
    it('should allow calls within the limit', () => {
      const limiter = new RateLimiter(5, 20000);
      for (let i = 0; i < 5; i++) {
        const result = limiter.check(1000 + i);
        expect(result.exceeded).toBe(false);
      }
    });

    it('should reject the call that exceeds the limit', () => {
      const limiter = new RateLimiter(5, 20000);
      for (let i = 0; i < 5; i++) {
        limiter.check(1000 + i);
      }
      const result = limiter.check(1005);
      expect(result.exceeded).toBe(true);
      if (result.exceeded) {
        expect(result.message).toContain('Rate limit exceeded');
        expect(result.message).toContain('5 tool calls per 20 seconds');
      }
    });

    it('should allow calls again after the window slides past old timestamps', () => {
      const limiter = new RateLimiter(5, 20000);
      // Fill up the window at t=0
      for (let i = 0; i < 5; i++) {
        limiter.check(i);
      }
      // At t=20001, all old calls are outside the 20 s window
      const result = limiter.check(20001);
      expect(result.exceeded).toBe(false);
    });

    it('should include the correct window seconds in the message', () => {
      const limiter = new RateLimiter(3, 10000);
      for (let i = 0; i < 3; i++) {
        limiter.check(i);
      }
      const result = limiter.check(3);
      expect(result.exceeded).toBe(true);
      if (result.exceeded) {
        expect(result.message).toContain('3 tool calls per 10 seconds');
      }
    });
  });

  describe('reset', () => {
    it('should allow calls again after reset', () => {
      const limiter = new RateLimiter(5, 20000);
      for (let i = 0; i < 5; i++) {
        limiter.check(i);
      }
      // 6th call should be rejected
      expect(limiter.check(5).exceeded).toBe(true);

      limiter.reset();

      // After reset, calls should be allowed again
      expect(limiter.check(5).exceeded).toBe(false);
    });
  });
});

describe('getToolCallRateLimiter / resetToolCallRateLimiter', () => {
  beforeEach(() => {
    resetToolCallRateLimiter();
  });

  afterEach(() => {
    resetToolCallRateLimiter();
  });

  it('should return a RateLimiter instance', () => {
    const limiter = getToolCallRateLimiter();
    expect(limiter).toBeInstanceOf(RateLimiter);
  });

  it('should return the same instance on repeated calls', () => {
    const limiter1 = getToolCallRateLimiter();
    const limiter2 = getToolCallRateLimiter();
    expect(limiter1).toBe(limiter2);
  });

  it('should return a fresh instance after reset', () => {
    const limiter1 = getToolCallRateLimiter();
    resetToolCallRateLimiter();
    const limiter2 = getToolCallRateLimiter();
    expect(limiter1).not.toBe(limiter2);
  });

  it('should enforce the 5-per-20s default limit', () => {
    const limiter = getToolCallRateLimiter();
    for (let i = 0; i < 5; i++) {
      expect(limiter.check(i).exceeded).toBe(false);
    }
    expect(limiter.check(5).exceeded).toBe(true);
  });
});

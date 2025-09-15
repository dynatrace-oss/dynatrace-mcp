import {
  createGrailBudgetTracker,
  getGrailBudgetTracker,
  resetGrailBudgetTracker,
  formatBytesAsGB,
  generateBudgetWarning,
} from './grail-budget-tracker';

describe('Grail Budget Tracker', () => {
  describe('unlimited budget (-1)', () => {
    it('should never exceed budget and always allow queries when budget is -1', () => {
      const tracker = createGrailBudgetTracker(-1);
      expect(tracker.getState().budgetLimitGB).toBe(-1);
      expect(tracker.getState().budgetLimitBytes).toBe(-1);
      expect(tracker.getState().isBudgetExceeded).toBe(false);
      expect(tracker.getState().remainingBudgetBytes).toBe(-1);
      expect(tracker.getState().remainingBudgetGB).toBe(-1);

      // Add a huge number of bytes, should still not be exceeded
      tracker.addBytesScanned(1e15);
      expect(tracker.getState().isBudgetExceeded).toBe(false);
      expect(tracker.getState().remainingBudgetBytes).toBe(-1);
      expect(tracker.getState().remainingBudgetGB).toBe(-1);
    });
  });
  beforeEach(() => {
    resetGrailBudgetTracker();
  });

  describe('createGrailBudgetTracker', () => {
    it('should create a tracker with the specified budget limit', () => {
      const tracker = createGrailBudgetTracker(5);
      const state = tracker.getState();

      expect(state.budgetLimitGB).toBe(5);
      expect(state.budgetLimitBytes).toBe(5000000000); // 5 GB in bytes (base 1000)
      expect(state.totalBytesScanned).toBe(0);
      expect(state.isBudgetExceeded).toBe(false);
      expect(state.remainingBudgetGB).toBe(5);
    });

    it('should correctly track bytes scanned', () => {
      const tracker = createGrailBudgetTracker(1); // 1 GB limit
      const bytesToScan = 500000000; // 0.5 GB

      const state = tracker.addBytesScanned(bytesToScan);

      expect(state.totalBytesScanned).toBe(bytesToScan);
      expect(state.remainingBudgetBytes).toBe(500000000); // 0.5 GB remaining
      expect(state.remainingBudgetGB).toBe(0.5);
      expect(state.isBudgetExceeded).toBe(false);
    });

    it('should detect when budget is exceeded', () => {
      const tracker = createGrailBudgetTracker(1); // 1 GB limit
      const bytesToScan = 1500000000; // 1.5 GB

      const state = tracker.addBytesScanned(bytesToScan);

      expect(state.totalBytesScanned).toBe(bytesToScan);
      expect(state.isBudgetExceeded).toBe(true);
      expect(state.remainingBudgetBytes).toBe(0);
      expect(state.remainingBudgetGB).toBe(0);
    });

    it('should accumulate bytes scanned across multiple calls', () => {
      const tracker = createGrailBudgetTracker(2); // 2 GB limit

      tracker.addBytesScanned(500000000); // 0.5 GB
      tracker.addBytesScanned(700000000); // 0.7 GB
      const state = tracker.addBytesScanned(300000000); // 0.3 GB

      expect(state.totalBytesScanned).toBe(1500000000); // 1.5 GB total
      expect(state.remainingBudgetBytes).toBe(500000000); // 0.5 GB remaining
      expect(state.isBudgetExceeded).toBe(false);
    });

    it('should reset tracker correctly', () => {
      const tracker = createGrailBudgetTracker(1);
      tracker.addBytesScanned(500000000);

      tracker.reset();
      const state = tracker.getState();

      expect(state.totalBytesScanned).toBe(0);
      expect(state.remainingBudgetGB).toBe(1);
      expect(state.isBudgetExceeded).toBe(false);
    });
  });

  describe('getGrailBudgetTracker', () => {
    it('should create a global tracker with default budget when called first time', () => {
      const tracker = getGrailBudgetTracker();
      const state = tracker.getState();

      expect(state.budgetLimitGB).toBe(1000); // Default budget
    });

    it('should create a global tracker with specified budget when called first time', () => {
      const tracker = getGrailBudgetTracker(15);
      const state = tracker.getState();

      expect(state.budgetLimitGB).toBe(15);
    });

    it('should return the same global tracker instance on subsequent calls', () => {
      const tracker1 = getGrailBudgetTracker(5);
      const tracker2 = getGrailBudgetTracker(20); // Different budget, but should return existing

      expect(tracker1).toBe(tracker2);
      expect(tracker1.getState().budgetLimitGB).toBe(5); // Should keep original budget
    });

    it('should persist state across getGrailBudgetTracker calls', () => {
      const tracker1 = getGrailBudgetTracker(3);
      tracker1.addBytesScanned(1000000000); // 1 GB

      const tracker2 = getGrailBudgetTracker();
      const state = tracker2.getState();

      expect(state.totalBytesScanned).toBe(1000000000);
      expect(state.budgetLimitGB).toBe(3);
    });
  });

  describe('formatBytesAsGB', () => {
    it('should format large GB values with 1 decimal place', () => {
      expect(formatBytesAsGB(15000000000)).toBe('15.0'); // 15 GB
      expect(formatBytesAsGB(123456789000)).toBe('123.5'); // ~123.5 GB
    });

    it('should format medium GB values with 2 decimal places', () => {
      expect(formatBytesAsGB(1500000000)).toBe('1.50'); // 1.5 GB
      expect(formatBytesAsGB(5230000000)).toBe('5.23'); // 5.23 GB
    });

    it('should format small GB values with 3 decimal places', () => {
      expect(formatBytesAsGB(150000000)).toBe('0.150'); // 0.15 GB
      expect(formatBytesAsGB(523000000)).toBe('0.523'); // 0.523 GB
    });

    it('should format very small GB values with 4 decimal places', () => {
      expect(formatBytesAsGB(15000000)).toBe('0.0150'); // 0.015 GB
      expect(formatBytesAsGB(1500000)).toBe('0.0015'); // 0.0015 GB
    });

    it('should handle zero bytes', () => {
      expect(formatBytesAsGB(0)).toBe('0.0000');
    });
  });

  describe('generateBudgetWarning', () => {
    it('should return budget exceeded warning when budget is exceeded', () => {
      const tracker = createGrailBudgetTracker(1); // 1 GB limit
      tracker.addBytesScanned(1200000000); // 1.2 GB
      const state = tracker.getState();

      const warning = generateBudgetWarning(state, 200000000); // Current query: 0.2 GB

      expect(warning).toContain('🚨 **Grail Budget Exceeded:**');
      expect(warning).toContain('1.20 GB');
      expect(warning).toContain('1 GB budget limit');
      expect(warning).toContain('0.200 GB');
    });

    it('should return warning when approaching budget (80% threshold)', () => {
      const tracker = createGrailBudgetTracker(1); // 1 GB limit
      tracker.addBytesScanned(850000000); // 0.85 GB (85%)
      const state = tracker.getState();

      const warning = generateBudgetWarning(state, 50000000); // Current query: 0.05 GB

      expect(warning).toContain('⚠️ **Grail Budget Warning:**');
      expect(warning).toContain('85.0%');
      expect(warning).toContain('0.150 GB'); // Remaining
    });

    it('should return no warning when well below budget', () => {
      const tracker = createGrailBudgetTracker(1); // 1 GB limit
      tracker.addBytesScanned(300000000); // 0.3 GB (30%)
      const state = tracker.getState();

      const warning = generateBudgetWarning(state, 100000000); // Current query: 0.1 GB

      expect(warning).toBeNull();
    });

    it('should return warning when exactly at 80% threshold', () => {
      const tracker = createGrailBudgetTracker(1); // 1 GB limit
      tracker.addBytesScanned(800000000); // 0.8 GB (80%)
      const state = tracker.getState();

      const warning = generateBudgetWarning(state, 0);

      expect(warning).toContain('⚠️ **Grail Budget Warning:**');
      expect(warning).toContain('80.0%');
    });

    it('should prioritize exceeded warning over approaching warning', () => {
      const tracker = createGrailBudgetTracker(1); // 1 GB limit
      tracker.addBytesScanned(1100000000); // 1.1 GB (110% - exceeded)
      const state = tracker.getState();

      const warning = generateBudgetWarning(state, 100000000);

      expect(warning).toContain('🚨 **Grail Budget Exceeded:**');
      expect(warning).not.toContain('⚠️ **Grail Budget Warning:**');
    });
  });

  describe('edge cases', () => {
    it('should handle fractional GB budgets', () => {
      const tracker = createGrailBudgetTracker(0.5); // 0.5 GB limit
      const state = tracker.getState();

      expect(state.budgetLimitGB).toBe(0.5);
      expect(state.budgetLimitBytes).toBe(500000000); // 0.5 GB in bytes
    });

    it('should handle very large budgets', () => {
      const tracker = createGrailBudgetTracker(1000); // 1TB limit
      const state = tracker.getState();

      expect(state.budgetLimitGB).toBe(1000);
      expect(state.budgetLimitBytes).toBe(1000000000000); // 1TB in bytes
    });

    it('should handle zero bytes scanned', () => {
      const tracker = createGrailBudgetTracker(1);
      const state = tracker.addBytesScanned(0);

      expect(state.totalBytesScanned).toBe(0);
      expect(state.isBudgetExceeded).toBe(false);
      expect(state.remainingBudgetGB).toBe(1);
    });
  });
});

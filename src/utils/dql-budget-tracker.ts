/**
 * DQL Budget Tracker - tracks and limits bytes scanned by DQL queries
 */

export interface DqlBudgetTracker {
  /** Current total bytes scanned in this session */
  totalBytesScanned: number;
  /** Budget limit in bytes */
  budgetLimitBytes: number;
  /** Budget limit in GB for display purposes */
  budgetLimitGB: number;
  /** Whether the budget has been exceeded */
  isBudgetExceeded: boolean;
  /** Remaining budget in bytes */
  remainingBudgetBytes: number;
  /** Remaining budget in GB for display purposes */
  remainingBudgetGB: number;
}

/**
 * In-memory tracker for DQL budget across the session
 */
class DqlBudgetTrackerImpl implements DqlBudgetTracker {
  private _totalBytesScanned = 0;
  private readonly _budgetLimitBytes: number;
  private readonly _budgetLimitGB: number;

  constructor(budgetLimitGB: number) {
    this._budgetLimitGB = budgetLimitGB;
    this._budgetLimitBytes = budgetLimitGB * 1000 * 1000 * 1000; // Convert GB to bytes (base 1000)
  }

  get totalBytesScanned(): number {
    return this._totalBytesScanned;
  }

  get budgetLimitBytes(): number {
    return this._budgetLimitBytes;
  }

  get budgetLimitGB(): number {
    return this._budgetLimitGB;
  }

  get isBudgetExceeded(): boolean {
    return this._totalBytesScanned >= this._budgetLimitBytes;
  }

  get remainingBudgetBytes(): number {
    return Math.max(0, this._budgetLimitBytes - this._totalBytesScanned);
  }

  get remainingBudgetGB(): number {
    return this.remainingBudgetBytes / (1000 * 1000 * 1000);
  }

  /**
   * Add bytes scanned to the tracker
   * @param bytesScanned Number of bytes scanned in the DQL query
   * @returns Updated tracker state
   */
  addBytesScanned(bytesScanned: number): DqlBudgetTracker {
    this._totalBytesScanned += bytesScanned;
    return this.getState();
  }

  /**
   * Get current state of the tracker
   */
  getState(): DqlBudgetTracker {
    return {
      totalBytesScanned: this.totalBytesScanned,
      budgetLimitBytes: this.budgetLimitBytes,
      budgetLimitGB: this.budgetLimitGB,
      isBudgetExceeded: this.isBudgetExceeded,
      remainingBudgetBytes: this.remainingBudgetBytes,
      remainingBudgetGB: this.remainingBudgetGB,
    };
  }

  /**
   * Reset the tracker (for testing purposes)
   */
  reset(): void {
    this._totalBytesScanned = 0;
  }
}

// Global instance for the current session
let globalBudgetTracker: DqlBudgetTrackerImpl | null = null;

/**
 * Initialize or get the global DQL budget tracker
 * @param budgetLimitGB Budget limit in GB (base 1000). If not provided and tracker doesn't exist, defaults to 1000 GB
 * @returns DQL budget tracker instance
 */
export function getDqlBudgetTracker(budgetLimitGB?: number): DqlBudgetTrackerImpl {
  if (!globalBudgetTracker) {
    const defaultBudget = budgetLimitGB ?? 1000; // Default to 1000 GB if not specified
    globalBudgetTracker = new DqlBudgetTrackerImpl(defaultBudget);
  }
  return globalBudgetTracker;
}

/**
 * Reset the global DQL budget tracker (primarily for testing)
 */
export function resetDqlBudgetTracker(): void {
  globalBudgetTracker = null;
}

/**
 * Create a new DQL budget tracker instance (for testing)
 * @param budgetLimitGB Budget limit in GB (base 1000)
 * @returns New DQL budget tracker instance
 */
export function createDqlBudgetTracker(budgetLimitGB: number): DqlBudgetTrackerImpl {
  return new DqlBudgetTrackerImpl(budgetLimitGB);
}

/**
 * Format bytes as GB with appropriate precision
 * @param bytes Number of bytes
 * @returns Formatted string with GB value
 */
export function formatBytesAsGB(bytes: number): string {
  const gb = bytes / (1000 * 1000 * 1000);
  if (gb >= 10) {
    return gb.toFixed(1);
  } else if (gb >= 1) {
    return gb.toFixed(2);
  } else if (gb >= 0.1) {
    return gb.toFixed(3);
  } else {
    return gb.toFixed(4);
  }
}

/**
 * Generate a budget warning message based on current state
 * @param budgetState Current budget tracker state
 * @param currentQueryBytes Bytes scanned in the current query
 * @returns Warning message or null if no warning needed
 */
export function generateBudgetWarning(budgetState: DqlBudgetTracker, currentQueryBytes: number): string | null {
  if (budgetState.isBudgetExceeded) {
    const totalGB = formatBytesAsGB(budgetState.totalBytesScanned);
    const currentGB = formatBytesAsGB(currentQueryBytes);
    return `🚨 **DQL Budget Exceeded:** This query scanned ${currentGB} GB. Total session usage: ${totalGB} GB / ${budgetState.budgetLimitGB} GB budget limit. Consider optimizing queries or increasing the budget limit.`;
  }

  // Warning when approaching budget (80% threshold)
  const usagePercentage = (budgetState.totalBytesScanned / budgetState.budgetLimitBytes) * 100;
  if (usagePercentage >= 80) {
    const remainingGB = formatBytesAsGB(budgetState.remainingBudgetBytes);
    const totalGB = formatBytesAsGB(budgetState.totalBytesScanned);
    return `⚠️ **DQL Budget Warning:** Session usage: ${totalGB} GB / ${budgetState.budgetLimitGB} GB (${usagePercentage.toFixed(1)}%). Remaining: ${remainingGB} GB.`;
  }

  return null;
}

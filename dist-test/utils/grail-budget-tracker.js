'use strict';
/**
 * Grail Budget Tracker - tracks and limits bytes scanned by Grail queries (DQL, etc.)
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.getGrailBudgetTracker = getGrailBudgetTracker;
exports.resetGrailBudgetTracker = resetGrailBudgetTracker;
exports.createGrailBudgetTracker = createGrailBudgetTracker;
exports.formatBytesAsGB = formatBytesAsGB;
exports.generateBudgetWarning = generateBudgetWarning;
/**
 * In-memory tracker for Grail budget across the session
 */
class GrailBudgetTrackerImpl {
  _totalBytesScanned = 0;
  _budgetLimitBytes;
  _budgetLimitGB;
  _unlimited;
  constructor(budgetLimitGB) {
    this._budgetLimitGB = budgetLimitGB;
    this._unlimited = budgetLimitGB === -1;
    this._budgetLimitBytes = this._unlimited ? Number.POSITIVE_INFINITY : budgetLimitGB * 1000 * 1000 * 1000; // Convert GB to bytes (base 1000)
  }
  get totalBytesScanned() {
    return this._totalBytesScanned;
  }
  get budgetLimitBytes() {
    return this._unlimited ? -1 : this._budgetLimitBytes;
  }
  get budgetLimitGB() {
    return this._budgetLimitGB;
  }
  get isBudgetExceeded() {
    return this._unlimited ? false : this._totalBytesScanned >= this._budgetLimitBytes;
  }
  get remainingBudgetBytes() {
    return this._unlimited ? -1 : Math.max(0, this._budgetLimitBytes - this._totalBytesScanned);
  }
  get remainingBudgetGB() {
    return this._unlimited ? -1 : this.remainingBudgetBytes / (1000 * 1000 * 1000);
  }
  /**
   * Add bytes scanned to the tracker
   * @param bytesScanned Number of bytes scanned in the Grail query
   * @returns Updated tracker state
   */
  addBytesScanned(bytesScanned) {
    this._totalBytesScanned += bytesScanned;
    return this.getState();
  }
  /**
   * Get current state of the tracker
   */
  getState() {
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
  reset() {
    this._totalBytesScanned = 0;
  }
}
// Global instance for the current session
let globalBudgetTracker = null;
/**
 * Initialize or get the global Grail budget tracker
 * @param budgetLimitGB Budget limit in GB (base 1000). If not provided and tracker doesn't exist, defaults to 1000 GB
 * @returns Grail budget tracker instance
 */
function getGrailBudgetTracker(budgetLimitGB) {
  if (!globalBudgetTracker) {
    const defaultBudget = budgetLimitGB ?? 1000; // Default to 1000 GB if not specified
    globalBudgetTracker = new GrailBudgetTrackerImpl(defaultBudget);
  }
  return globalBudgetTracker;
}
/**
 * Reset the global Grail budget tracker (primarily for testing)
 */
function resetGrailBudgetTracker() {
  globalBudgetTracker = null;
}
/**
 * Create a new Grail budget tracker instance (for testing)
 * @param budgetLimitGB Budget limit in GB (base 1000)
 * @returns New Grail budget tracker instance
 */
function createGrailBudgetTracker(budgetLimitGB) {
  return new GrailBudgetTrackerImpl(budgetLimitGB);
}
/**
 * Format bytes as GB with appropriate precision
 * @param bytes Number of bytes
 * @returns Formatted string with GB value
 */
function formatBytesAsGB(bytes) {
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
function generateBudgetWarning(budgetState, currentQueryBytes) {
  if (budgetState.isBudgetExceeded) {
    const totalGB = formatBytesAsGB(budgetState.totalBytesScanned);
    const currentGB = formatBytesAsGB(currentQueryBytes);
    return `🚨 **Grail Budget Exceeded:** This query scanned ${currentGB} GB. Total session usage: ${totalGB} GB / ${budgetState.budgetLimitGB} GB budget limit. You will not be able to perform any more queries in this session.`;
  }
  // Warning when approaching budget (80% threshold)
  const usagePercentage = (budgetState.totalBytesScanned / budgetState.budgetLimitBytes) * 100;
  if (usagePercentage >= 80) {
    const remainingGB = formatBytesAsGB(budgetState.remainingBudgetBytes);
    const totalGB = formatBytesAsGB(budgetState.totalBytesScanned);
    return `⚠️ **Grail Budget Warning:** Session usage: ${totalGB} GB / ${budgetState.budgetLimitGB} GB (${usagePercentage.toFixed(1)}%). Remaining: ${remainingGB} GB.`;
  }
  return null;
}

// Valid DQL duration units: s=seconds, m=minutes, h=hours, d=days, w=weeks, M=months, y=years
const TIMEFRAME_PATTERN = /^[1-9]\d*[smhdwMy]$/;

/**
 * Validates a DQL timeframe string (e.g. "24h", "7d", "30m").
 * Throws if the format is not a positive integer followed by a single duration unit.
 */
export function validateTimeframe(value: string): void {
  if (!TIMEFRAME_PATTERN.test(value)) {
    throw new Error(
      `Invalid timeframe "${value}". Expected a number followed by a unit (s/m/h/d/w/M/y), e.g. "24h" or "7d".`,
    );
  }
}

/**
 * Validates a DQL filter expression intended for use after "| filter".
 * Rejects pipe characters and newlines that would allow injecting additional pipeline stages.
 *
 * Note: bracket-based subqueries (e.g. `x in [fetch ...]`) are not blocked here,
 * but are bounded by the OAuth scopes of each tool — this is acceptable and intentional.
 */
export function validateAdditionalFilter(value: string): void {
  if (/[|\n\r]/.test(value)) {
    throw new Error('additionalFilter must not contain pipe (|) or newline characters.');
  }
}

/**
 * Escapes a value for safe embedding inside a DQL double-quoted string literal.
 * Escapes backslashes first, then double quotes.
 */
export function escapeDqlStringValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

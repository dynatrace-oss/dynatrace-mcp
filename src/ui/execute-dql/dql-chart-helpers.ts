/**
 * NOTE: This module is AI-engineered / vibe-coded based on observed execute_dql responses.
 * It serves as a black-box fallback for Strato's convertToTimeseries and is not intended
 * to be improved or maintained beyond its current scope.
 */

import type { RangedFieldTypes, ResultRecord } from '@dynatrace-sdk/client-query';
import { convertToTimeseries, type Timeseries } from '@dynatrace/strato-components/charts';

/** Default fallback timeframe when analysisTimeframe is not available (2 hours). */
const DEFAULT_TIMEFRAME_MS = 2 * 60 * 60 * 1000;

/**
 * Safely convert DQL records to Timeseries using Strato's convertToTimeseries.
 *
 * Strato's `convertToTimeseries` handles two data shapes:
 * 1. **Array-based timeseries** (e.g. `timeseries avg(dt.host.cpu.usage)`) — requires
 *    exactly 1 `timeframe` field, 1 `duration` field, and ≥1 numeric array field.
 * 2. **Scalar value rows** (e.g. `fetch logs | ... | summarize count(), by:{bin(timestamp, 1h)}`) —
 *    requires a `timeframe` or `timestamp` field on each row.
 *
 * When a user explicitly removes the time columns — for example:
 * ```
 * timeseries avg(dt.host.cpu.usage), by:{dt.entity.host} | fieldsRemove timeframe, interval
 * ```
 * …the result still contains numeric arrays (metric values) but no `timeframe`/`duration`
 * columns. Strato's converter will:
 *   - fail the array-timeseries check (missing timeframe + duration), then
 *   - throw in the scalar path because no timeframe/timestamp field exists.
 *
 * This wrapper catches that error and delegates to {@link fallbackConvertArrayTimeseries},
 * which reconstructs time points from the `analysisTimeframe` query metadata.
 */
export function safeConvertToTimeseries(
  records: ResultRecord[],
  fieldTypes: RangedFieldTypes[],
  analysisTimeframe?: { start?: string; end?: string },
): Timeseries[] {
  if (records.length === 0 || fieldTypes.length === 0) return [];
  try {
    const result = convertToTimeseries(records, fieldTypes);
    if (result.length > 0) return result;
  } catch (error) {
    console.warn('Failed to convert to timeseries using standard conversion:', error);
    // Fall back to manual conversion
  }

  // Fallback: build timeseries manually from numeric array columns.
  // This handles cases where timeseries data has no timeframe/interval columns.
  return fallbackConvertArrayTimeseries(records, fieldTypes, analysisTimeframe);
}

/**
 * Fallback conversion for timeseries data stored as numeric arrays without
 * explicit timeframe/interval columns.
 *
 * This is needed when Strato's `convertToTimeseries` cannot handle the result
 * because the required `timeframe` and `duration` (interval) columns have been
 * removed from the query output. Example DQL queries that trigger this path:
 *
 * ```dql
 * timeseries avg(dt.host.cpu.usage) | fieldsRemove timeframe, interval
 * timeseries avg(dt.host.cpu.usage), by:{dt.entity.host} | fieldsRemove timeframe, interval
 * ```
 *
 * In these cases the records still contain numeric arrays (the aggregated metric
 * values per bucket) but lack the metadata Strato needs to place them on a time
 * axis. This function reconstructs evenly-spaced datapoints using:
 *   - `analysisTimeframe` from query metadata (`metadata.grail.analysisTimeframe`), or
 *   - a default 2-hour window ending at the current time.
 */
export function fallbackConvertArrayTimeseries(
  records: ResultRecord[],
  fieldTypes: RangedFieldTypes[],
  analysisTimeframe?: { start?: string; end?: string },
): Timeseries[] {
  // Identify numeric array columns and string (label) columns from field types
  const arrayColumns: string[] = [];
  const stringColumns: string[] = [];

  for (const rangedType of fieldTypes) {
    for (const [key, fieldType] of Object.entries(rangedType.mappings)) {
      if (!fieldType) continue;
      if (fieldType.type === 'array' && fieldType.types?.length) {
        const hasNumeric = fieldType.types.some((t) => {
          const elType = t.mappings?.element?.type;
          return elType === 'double' || elType === 'long';
        });
        if (hasNumeric) arrayColumns.push(key);
      }
      if (fieldType.type === 'string') {
        stringColumns.push(key);
      }
    }
  }

  if (arrayColumns.length === 0) return [];

  // Determine time range from metadata or default to 2h
  const now = new Date();
  const defaultStart = new Date(now.getTime() - DEFAULT_TIMEFRAME_MS);
  const rangeStart = analysisTimeframe?.start ? new Date(analysisTimeframe.start) : defaultStart;
  const rangeEnd = analysisTimeframe?.end ? new Date(analysisTimeframe.end) : now;

  const result: Timeseries[] = [];

  for (const record of records) {
    for (const arrayCol of arrayColumns) {
      const values = record[arrayCol];
      if (!Array.isArray(values) || values.length === 0) continue;

      // Build the series name from string columns or fall back to array column name
      const label = stringColumns.length > 0 ? stringColumns.map((c) => String(record[c] ?? '')).join(' – ') : arrayCol;
      const seriesName: string | string[] = arrayColumns.length > 1 ? [label, arrayCol] : label;

      // Compute interval per data point
      const totalMs = rangeEnd.getTime() - rangeStart.getTime();
      const intervalMs = totalMs / values.length;

      const datapoints: Timeseries['datapoints'] = [];
      for (let i = 0; i < values.length; i++) {
        const v = values[i] as number | null;
        if (v !== null && v !== undefined) {
          datapoints.push({
            start: new Date(rangeStart.getTime() + i * intervalMs),
            end: new Date(rangeStart.getTime() + (i + 1) * intervalMs),
            value: v,
          });
        }
      }

      if (datapoints.length > 0) {
        result.push({ name: seriesName, datapoints });
      }
    }
  }

  return result;
}

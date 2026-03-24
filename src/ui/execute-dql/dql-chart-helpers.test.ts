/**
 * NOTE: These tests cover AI-engineered / vibe-coded helpers from dql-chart-helpers.ts.
 * The underlying functions are based on observed execute_dql responses and should be
 * treated as a black box — no further improvements are planned.
 */

import type { RangedFieldTypes, ResultRecord } from '@dynatrace-sdk/client-query';
import type { Timeseries } from '@dynatrace/strato-components/charts';

// Mock Strato's convertToTimeseries before importing the module under test
const mockConvertToTimeseries = jest.fn<Timeseries[], [ResultRecord[], RangedFieldTypes[]]>();
jest.mock('@dynatrace/strato-components/charts', () => ({
  convertToTimeseries: (...args: [ResultRecord[], RangedFieldTypes[]]) => mockConvertToTimeseries(...args),
}));

import { safeConvertToTimeseries, fallbackConvertArrayTimeseries } from './dql-chart-helpers';

// ---------------------------------------------------------------------------
// Helpers to build RangedFieldTypes fixtures
// ---------------------------------------------------------------------------

/** Build a RangedFieldTypes entry for a numeric (double) array column. */
function numericArrayFieldType(columnName: string): RangedFieldTypes {
  return {
    indexRange: [0, 0],
    mappings: {
      [columnName]: {
        type: 'array',
        types: [{ indexRange: [0, 0], mappings: { element: { type: 'double' } } }],
      },
    },
  } as unknown as RangedFieldTypes;
}

/** Build a RangedFieldTypes entry for a string column. */
function stringFieldType(columnName: string): RangedFieldTypes {
  return {
    indexRange: [0, 0],
    mappings: {
      [columnName]: { type: 'string' },
    },
  } as unknown as RangedFieldTypes;
}

/** Build a RangedFieldTypes that combines multiple column mappings. */
function combinedFieldTypes(mappings: Record<string, unknown>): RangedFieldTypes {
  return { indexRange: [0, 0], mappings } as unknown as RangedFieldTypes;
}

// ---------------------------------------------------------------------------
// Tests: fallbackConvertArrayTimeseries
// ---------------------------------------------------------------------------

describe('fallbackConvertArrayTimeseries', () => {
  const analysisTimeframe = {
    start: '2026-02-23T10:00:00.000Z',
    end: '2026-02-23T12:00:00.000Z',
  };

  it('returns empty array when records are empty', () => {
    const result = fallbackConvertArrayTimeseries([], [numericArrayFieldType('avg_cpu')], analysisTimeframe);
    expect(result).toEqual([]);
  });

  it('returns empty array when fieldTypes have no numeric array columns', () => {
    const records: ResultRecord[] = [{ host: 'host-1' }];
    const result = fallbackConvertArrayTimeseries(records, [stringFieldType('host')], analysisTimeframe);
    expect(result).toEqual([]);
  });

  it('converts a single numeric array column into timeseries datapoints', () => {
    const records: ResultRecord[] = [{ avg_cpu: [10, 20, 30] }];
    const fieldTypes = [numericArrayFieldType('avg_cpu')];

    const result = fallbackConvertArrayTimeseries(records, fieldTypes, analysisTimeframe);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('avg_cpu');
    expect(result[0].datapoints).toHaveLength(3);

    // Verify evenly-spaced intervals across the 2h timeframe (2h / 3 points = 40min each)
    const intervalMs = (2 * 60 * 60 * 1000) / 3;
    const startMs = new Date(analysisTimeframe.start).getTime();
    for (let i = 0; i < 3; i++) {
      expect(result[0].datapoints[i].start.getTime()).toBe(startMs + i * intervalMs);
      expect(result[0].datapoints[i].end!.getTime()).toBe(startMs + (i + 1) * intervalMs);
      expect(result[0].datapoints[i].value).toBe([10, 20, 30][i]);
    }
  });

  it('skips null values in the array', () => {
    const records: ResultRecord[] = [{ avg_cpu: [10, null, 30] }];
    const fieldTypes = [numericArrayFieldType('avg_cpu')];

    const result = fallbackConvertArrayTimeseries(records, fieldTypes, analysisTimeframe);

    expect(result).toHaveLength(1);
    expect(result[0].datapoints).toHaveLength(2);
    expect(result[0].datapoints[0].value).toBe(10);
    expect(result[0].datapoints[1].value).toBe(30);
  });

  it('skips records where the array column is empty or not an array', () => {
    const records: ResultRecord[] = [{ avg_cpu: [] }, { avg_cpu: 'not-an-array' }, { avg_cpu: [5] }];
    const fieldTypes = [numericArrayFieldType('avg_cpu')];

    const result = fallbackConvertArrayTimeseries(records, fieldTypes, analysisTimeframe);

    expect(result).toHaveLength(1);
    expect(result[0].datapoints[0].value).toBe(5);
  });

  it('uses string columns as series labels when present', () => {
    const records: ResultRecord[] = [{ 'dt.entity.host': 'host-1', 'avg_cpu': [10, 20] }];
    const fieldTypes = [
      combinedFieldTypes({
        'dt.entity.host': { type: 'string' },
        'avg_cpu': {
          type: 'array',
          types: [{ indexRange: [0, 0], mappings: { element: { type: 'double' } } }],
        },
      }),
    ];

    const result = fallbackConvertArrayTimeseries(records, fieldTypes, analysisTimeframe);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('host-1');
  });

  it('handles multiple records (grouped timeseries)', () => {
    const records: ResultRecord[] = [
      { host: 'host-1', avg_cpu: [10, 20] },
      { host: 'host-2', avg_cpu: [30, 40] },
    ];
    const fieldTypes = [
      combinedFieldTypes({
        host: { type: 'string' },
        avg_cpu: {
          type: 'array',
          types: [{ indexRange: [0, 0], mappings: { element: { type: 'double' } } }],
        },
      }),
    ];

    const result = fallbackConvertArrayTimeseries(records, fieldTypes, analysisTimeframe);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('host-1');
    expect(result[1].name).toBe('host-2');
  });

  it('uses compound name [label, column] when multiple array columns exist', () => {
    const records: ResultRecord[] = [{ avg_cpu: [10], avg_mem: [80] }];
    const fieldTypes = [
      combinedFieldTypes({
        avg_cpu: {
          type: 'array',
          types: [{ indexRange: [0, 0], mappings: { element: { type: 'double' } } }],
        },
        avg_mem: {
          type: 'array',
          types: [{ indexRange: [0, 0], mappings: { element: { type: 'double' } } }],
        },
      }),
    ];

    const result = fallbackConvertArrayTimeseries(records, fieldTypes, analysisTimeframe);

    expect(result).toHaveLength(2);
    // With no string columns, label falls back to column name; compound name = [columnName, columnName]
    expect(result[0].name).toEqual(['avg_cpu', 'avg_cpu']);
    expect(result[1].name).toEqual(['avg_mem', 'avg_mem']);
  });

  it('falls back to a default 2h window when analysisTimeframe is undefined', () => {
    const now = Date.now();
    jest.useFakeTimers({ now });

    const records: ResultRecord[] = [{ avg_cpu: [10, 20] }];
    const fieldTypes = [numericArrayFieldType('avg_cpu')];

    const result = fallbackConvertArrayTimeseries(records, fieldTypes, undefined);

    expect(result).toHaveLength(1);
    const twoHoursMs = 2 * 60 * 60 * 1000;
    expect(result[0].datapoints[0].start.getTime()).toBe(now - twoHoursMs);
    expect(result[0].datapoints[1].end!.getTime()).toBe(now);

    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Tests: safeConvertToTimeseries
// ---------------------------------------------------------------------------

describe('safeConvertToTimeseries', () => {
  beforeEach(() => {
    mockConvertToTimeseries.mockReset();
  });

  it('returns empty array for empty records', () => {
    const result = safeConvertToTimeseries([], [numericArrayFieldType('x')]);
    expect(result).toEqual([]);
    expect(mockConvertToTimeseries).not.toHaveBeenCalled();
  });

  it('returns empty array for empty fieldTypes', () => {
    const result = safeConvertToTimeseries([{ x: [1] }], []);
    expect(result).toEqual([]);
    expect(mockConvertToTimeseries).not.toHaveBeenCalled();
  });

  it('returns Strato result when convertToTimeseries succeeds', () => {
    const stratoResult: Timeseries[] = [
      { name: 'cpu', datapoints: [{ start: new Date(), end: new Date(), value: 42 }] },
    ];
    mockConvertToTimeseries.mockReturnValue(stratoResult);

    const records: ResultRecord[] = [{ avg_cpu: [42] }];
    const fieldTypes = [numericArrayFieldType('avg_cpu')];

    const result = safeConvertToTimeseries(records, fieldTypes);

    expect(result).toBe(stratoResult);
    expect(mockConvertToTimeseries).toHaveBeenCalledWith(records, fieldTypes);
  });

  it('falls back when convertToTimeseries returns empty array', () => {
    mockConvertToTimeseries.mockReturnValue([]);

    const analysisTimeframe = {
      start: '2026-02-23T10:00:00.000Z',
      end: '2026-02-23T12:00:00.000Z',
    };
    const records: ResultRecord[] = [{ avg_cpu: [10, 20] }];
    const fieldTypes = [numericArrayFieldType('avg_cpu')];

    const result = safeConvertToTimeseries(records, fieldTypes, analysisTimeframe);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('avg_cpu');
    expect(result[0].datapoints).toHaveLength(2);
  });

  it('falls back when convertToTimeseries throws', () => {
    mockConvertToTimeseries.mockImplementation(() => {
      throw new Error('Could not find "timeframe" or "timestamp"');
    });

    const analysisTimeframe = {
      start: '2026-02-23T10:00:00.000Z',
      end: '2026-02-23T12:00:00.000Z',
    };
    const records: ResultRecord[] = [{ avg_cpu: [10, 20] }];
    const fieldTypes = [numericArrayFieldType('avg_cpu')];

    // Should not throw
    const result = safeConvertToTimeseries(records, fieldTypes, analysisTimeframe);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('avg_cpu');
  });
});

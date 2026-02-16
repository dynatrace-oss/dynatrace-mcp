import { executeDql, isChartWorthyResult } from './execute-dql';
import { HttpClient } from '@dynatrace-sdk/http-client';
import { QueryExecutionClient, QueryStartResponse, RangedFieldTypes } from '@dynatrace-sdk/client-query';
import { resetGrailBudgetTracker, getGrailBudgetTracker } from '../utils/grail-budget-tracker';

// Mock the external dependencies
jest.mock('@dynatrace-sdk/client-query');
jest.mock('../utils/user-agent', () => ({
  getUserAgent: () => 'test-user-agent',
}));

describe('isChartWorthyResult', () => {
  it('should return true for timeseries data with timeframe + double fields', () => {
    const types: RangedFieldTypes[] = [
      {
        mappings: {
          'timeframe': { type: 'timeframe' },
          'avg(cpu.usage)': { type: 'double' },
        },
      },
    ];
    expect(isChartWorthyResult(types)).toBe(true);
  });

  it('should return true for data with timestamp + long fields', () => {
    const types: RangedFieldTypes[] = [
      {
        mappings: {
          timestamp: { type: 'timestamp' },
          count: { type: 'long' },
        },
      },
    ];
    expect(isChartWorthyResult(types)).toBe(true);
  });

  it('should return false for purely tabular string data', () => {
    const types: RangedFieldTypes[] = [
      {
        mappings: {
          'dt.entity.host': { type: 'string' },
          'entity.name': { type: 'string' },
          'status': { type: 'string' },
        },
      },
    ];
    expect(isChartWorthyResult(types)).toBe(false);
  });

  it('should return false for data with timestamp but no numeric fields', () => {
    const types: RangedFieldTypes[] = [
      {
        mappings: {
          timestamp: { type: 'timestamp' },
          message: { type: 'string' },
        },
      },
    ];
    expect(isChartWorthyResult(types)).toBe(false);
  });

  it('should return false for data with numeric fields but no time component', () => {
    const types: RangedFieldTypes[] = [
      {
        mappings: {
          name: { type: 'string' },
          count: { type: 'long' },
          average: { type: 'double' },
        },
      },
    ];
    expect(isChartWorthyResult(types)).toBe(false);
  });

  it('should return false for empty types array', () => {
    expect(isChartWorthyResult([])).toBe(false);
  });

  it('should detect chart-worthy data across multiple RangedFieldTypes entries', () => {
    const types: RangedFieldTypes[] = [
      {
        mappings: {
          timeframe: { type: 'timeframe' },
        },
      },
      {
        mappings: {
          value: { type: 'double' },
        },
        indexRange: [0, 5],
      },
    ];
    expect(isChartWorthyResult(types)).toBe(true);
  });

  it('should return true for timeseries data with numeric values nested in an array', () => {
    // This matches the real DQL response shape for:
    //   timeseries avg_response = avg(dt.service.request.response_time)
    const types: RangedFieldTypes[] = [
      {
        indexRange: [0, 0],
        mappings: {
          timeframe: { type: 'timeframe' },
          interval: { type: 'duration' },
          avg_response: {
            type: 'array',
            types: [{ indexRange: [0, 48], mappings: { element: { type: 'double' } } }],
          },
        },
      },
    ];
    expect(isChartWorthyResult(types)).toBe(true);
  });

  it('should return true for nested record types with numeric fields', () => {
    const types: RangedFieldTypes[] = [
      {
        mappings: {
          timestamp: { type: 'timestamp' },
          data: {
            type: 'record',
            types: [{ mappings: { cpu: { type: 'double' }, host: { type: 'string' } } }],
          },
        },
      },
    ];
    expect(isChartWorthyResult(types)).toBe(true);
  });

  it('should return true for timeseries grouped by a string field (no explicit timeframe column)', () => {
    // This matches the real DQL response shape for:
    //   timeseries avg_cpu = avg(dt.process.cpu.usage), by: { dt.entity.process_group_instance }
    // where the time dimension is encoded in the array indices.
    const types: RangedFieldTypes[] = [
      {
        indexRange: [0, 99],
        mappings: {
          pgi_name: { type: 'string' },
          avg_cpu: {
            type: 'array',
            types: [{ indexRange: [0, 7], mappings: { element: { type: 'double' } } }],
          },
        },
      },
    ];
    expect(isChartWorthyResult(types)).toBe(true);
  });

  it('should return false for an array of strings (not numeric)', () => {
    const types: RangedFieldTypes[] = [
      {
        mappings: {
          name: { type: 'string' },
          tags: {
            type: 'array',
            types: [{ mappings: { element: { type: 'string' } } }],
          },
        },
      },
    ];
    expect(isChartWorthyResult(types)).toBe(false);
  });
});

describe('executeDql Budget Check', () => {
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockQueryExecutionClient: jest.Mocked<QueryExecutionClient>;

  beforeEach(() => {
    // Reset budget tracker before each test
    resetGrailBudgetTracker();

    // Create mock HTTP client
    mockHttpClient = {
      // Add any necessary properties/methods for HttpClient mock
    } as jest.Mocked<HttpClient>;

    // Create mock QueryExecutionClient
    mockQueryExecutionClient = {
      queryExecute: jest.fn(),
      queryPoll: jest.fn(),
      queryCancel: jest.fn(),
    } as unknown as jest.Mocked<QueryExecutionClient>;

    // Mock the QueryExecutionClient constructor
    (QueryExecutionClient as jest.MockedClass<typeof QueryExecutionClient>).mockImplementation(
      () => mockQueryExecutionClient,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetGrailBudgetTracker();
  });

  it('should prevent execution when budget is exceeded', async () => {
    const budgetLimitGB = 0.001; // Very small budget limit (1 MB)

    // First, exhaust the budget by adding bytes to tracker
    const tracker = getGrailBudgetTracker(budgetLimitGB);
    tracker.addBytesScanned(2 * 1000 * 1000); // Add 2 MB, exceeding the 1 MB limit

    const dqlStatement = 'fetch logs | limit 10';
    const body = { query: dqlStatement };

    // Execute DQL with budget limit and expect it to throw
    await expect(executeDql(mockHttpClient, body, budgetLimitGB)).rejects.toThrow(/budget/);

    // Verify that queryExecute was NOT called
    expect(mockQueryExecutionClient.queryExecute).not.toHaveBeenCalled();
  });

  it('should allow execution when budget is not exceeded', async () => {
    const budgetLimitGB = 1; // 1 GB budget limit
    const dqlStatement = 'fetch logs | limit 10';
    const body = { query: dqlStatement };

    // Mock successful response
    const mockResponse: QueryStartResponse = {
      state: 'RUNNING',
      result: {
        records: [{ field1: 'value1' }],
        types: [],
        metadata: {
          grail: {
            scannedBytes: 1000,
            scannedRecords: 1,
            executionTimeMilliseconds: 100,
            queryId: 'test-query-id',
          },
        },
      },
    };

    mockQueryExecutionClient.queryExecute.mockResolvedValue(mockResponse);

    // Execute DQL with budget limit
    const result = await executeDql(mockHttpClient, body, budgetLimitGB);

    // Verify that queryExecute WAS called
    expect(mockQueryExecutionClient.queryExecute).toHaveBeenCalledWith({
      body,
      dtClientContext: 'test-user-agent',
    });

    // Verify the result is returned correctly
    expect(result).toBeDefined();
    expect(result?.records).toEqual([{ field1: 'value1' }]);
    expect(result?.scannedBytes).toBe(1000);
    expect(result?.budgetState?.isBudgetExceeded).toBe(false);
  });

  it('should allow execution when no budget limit is provided', async () => {
    const dqlStatement = 'fetch logs | limit 10';
    const body = { query: dqlStatement };

    // Mock successful response
    const mockResponse: QueryStartResponse = {
      state: 'RUNNING',
      result: {
        records: [{ field1: 'value1' }],
        types: [],
        metadata: {
          grail: {
            scannedBytes: 1000000000, // 1 GB - would exceed small budgets
            scannedRecords: 1000,
            executionTimeMilliseconds: 100,
            queryId: 'test-query-id',
          },
        },
      },
    };

    mockQueryExecutionClient.queryExecute.mockResolvedValue(mockResponse);

    // Execute DQL without budget limit
    const result = await executeDql(mockHttpClient, body);

    // Verify that queryExecute WAS called
    expect(mockQueryExecutionClient.queryExecute).toHaveBeenCalledWith({
      body,
      dtClientContext: 'test-user-agent',
    });

    // Verify the result is returned correctly
    expect(result).toBeDefined();
    expect(result?.records).toEqual([{ field1: 'value1' }]);
    expect(result?.scannedBytes).toBe(1000000000);
    expect(result?.budgetState).toBeUndefined(); // No budget tracking
  });
});

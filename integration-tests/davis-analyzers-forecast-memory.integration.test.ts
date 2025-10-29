/**
 * Integration test for Davis analyzers - memory forecasting
 *
 * Verifies the Davis analyzer execution by making actual API calls
 * to the Dynatrace environment.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { executeDavisAnalyzer } from '../src/capabilities/davis-analyzers';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';

// Load environment variables
config();

const API_RATE_LIMIT_DELAY = 2000; // Delay in milliseconds to avoid hitting API rate limits

const scopesBase = ['app-engine:apps:run'];

const scopesDavisAnalyzers = [
  'davis:analyzers:read', // needed for listing and getting Davis analyzer definitions
  'davis:analyzers:execute', // needed for executing Davis analyzers
];

describe('Davis Analyzers - Memory Forecasting Integration Tests', () => {
  let dynatraceEnv: DynatraceEnv;

  // Setup that runs once before all tests
  beforeAll(async () => {
    try {
      dynatraceEnv = getDynatraceEnv();
      console.log(`Testing against environment: ${dynatraceEnv.dtEnvironment}`);
    } catch (err) {
      throw new Error(`Environment configuration error: ${(err as Error).message}`);
    }
  });

  afterEach(async () => {
    // Add delay to avoid hitting API rate limits
    await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT_DELAY));
  });

  // Helper function to create HTTP client for Davis analyzers
  const createHttpClient = async () => {
    const { oauthClientId, oauthClientSecret, dtEnvironment, dtPlatformToken } = dynatraceEnv;

    return await createDtHttpClient(
      dtEnvironment,
      scopesBase.concat(scopesDavisAnalyzers),
      oauthClientId,
      oauthClientSecret,
      dtPlatformToken,
    );
  };

  test('should execute forecast analyzer for memory usage', async () => {
    const dtClient = await createHttpClient();

    // Use a DQL query to forecast process memory usage
    const forecastInput = {
      timeSeriesData: 'timeseries avg(dt.process.memory.usage)',
      forecastHorizon: 12,
    };

    const result = await executeDavisAnalyzer(dtClient, 'dt.statistics.GenericForecastAnalyzer', forecastInput);

    expect(result).toBeDefined();
    expect(result.analysisStatus).toBe('OK');

    // Check forecast quality assessment
    expect(result.forecastQualityAssessment).toBeDefined();
    expect(['VALID', 'INVALID', 'UNKNOWN']).toContain(result.forecastQualityAssessment);

    // Check that we have forecast data
    expect(result.timeSeriesDataWithPredictions).toBeDefined();
    expect(result.timeSeriesDataWithPredictions.records).toBeDefined();
    expect(Array.isArray(result.timeSeriesDataWithPredictions.records)).toBe(true);

    if (result.timeSeriesDataWithPredictions.records.length > 0) {
      const forecastRecord = result.timeSeriesDataWithPredictions.records[0];

      // Check that forecast contains the expected fields
      expect(forecastRecord['dt.davis.forecast:point']).toBeDefined();
      expect(forecastRecord['dt.davis.forecast:lower']).toBeDefined();
      expect(forecastRecord['dt.davis.forecast:upper']).toBeDefined();

      // Check that forecast arrays have the expected length (forecastHorizon)
      expect(Array.isArray(forecastRecord['dt.davis.forecast:point'])).toBe(true);
      expect(forecastRecord['dt.davis.forecast:point'].length).toBe(12);

      expect(Array.isArray(forecastRecord['dt.davis.forecast:lower'])).toBe(true);
      expect(forecastRecord['dt.davis.forecast:lower'].length).toBe(12);

      expect(Array.isArray(forecastRecord['dt.davis.forecast:upper'])).toBe(true);
      expect(forecastRecord['dt.davis.forecast:upper'].length).toBe(12);

      // Check that forecast values are reasonable (should be numbers)
      forecastRecord['dt.davis.forecast:point'].forEach((value: any) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      });
    }
  });

  test('should handle invalid analyzer name gracefully', async () => {
    const dtClient = await createHttpClient();

    const invalidAnalyzerName = 'dt.nonexistent.analyzer';
    const forecastInput = {
      timeSeriesData: 'timeseries avg(dt.process.memory.usage)',
      forecastHorizon: 1,
    };

    await expect(executeDavisAnalyzer(dtClient, invalidAnalyzerName, forecastInput)).rejects.toThrow();
  });

  test('should handle invalid time series data gracefully', async () => {
    const dtClient = await createHttpClient();

    const invalidInput = {
      timeSeriesData: 'invalid dql query syntax {{{',
      forecastHorizon: 1,
    };

    const result = await executeDavisAnalyzer(dtClient, 'dt.statistics.GenericForecastAnalyzer', invalidInput);

    // The analyzer might still return a result but with FAILED status
    expect(result).toBeDefined();
    expect(result.analysisStatus).toBeDefined();

    // If it fails, it should indicate the failure
    if (result.analysisStatus !== 'OK') {
      expect(result.analysisStatus).toBe('FAILED');
    }
  });
});

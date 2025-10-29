/**
 * Integration test for Davis analyzers - listing functionality
 *
 * Verifies the Davis analyzer listing by making actual API calls
 * to the Dynatrace environment.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { listDavisAnalyzers, DavisAnalyzer } from '../src/capabilities/davis-analyzers';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';

// Load environment variables
config();

const API_RATE_LIMIT_DELAY = 1000; // Delay in milliseconds to avoid hitting API rate limits

const scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
];

const scopesDavisAnalyzers = [
  'davis:analyzers:read', // needed for listing and getting Davis analyzer definitions
];

describe('Davis Analyzers - Listing Integration Tests', () => {
  let dynatraceEnv: DynatraceEnv;

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

  test('should list available Davis analyzers', async () => {
    const dtClient = await createHttpClient();

    const analyzers = await listDavisAnalyzers(dtClient);

    expect(analyzers).toBeDefined();
    expect(Array.isArray(analyzers)).toBe(true);
    expect(analyzers.length).toBeGreaterThan(0);

    // Check that we have the forecast analyzer
    const forecastAnalyzer = analyzers.find(
      (analyzer: DavisAnalyzer) => analyzer.name === 'dt.statistics.GenericForecastAnalyzer',
    );
    expect(forecastAnalyzer).toBeDefined();
    expect(forecastAnalyzer?.displayName).toContain('Forecast');
    expect(forecastAnalyzer?.description).toContain('Forecast');

    // Check that all analyzers have required fields
    analyzers.forEach((analyzer: DavisAnalyzer) => {
      expect(analyzer.name).toBeDefined();
      expect(typeof analyzer.name).toBe('string');
      expect(analyzer.displayName).toBeDefined();
      expect(typeof analyzer.displayName).toBe('string');
      expect(analyzer.description).toBeDefined();
      expect(typeof analyzer.description).toBe('string');
    });

    // Check that we have anomaly detection analyzers
    const anomalyAnalyzers = analyzers.filter(
      (analyzer: DavisAnalyzer) =>
        analyzer.name.includes('anomaly_detection') || analyzer.description.toLowerCase().includes('anomaly'),
    );
    expect(anomalyAnalyzers.length).toBeGreaterThan(0);

    console.log(
      `Found ${analyzers.length} Davis analyzers:`,
      analyzers.map((a) => `${a.name} - ${a.displayName}`),
    );
  });

  test('should return analyzers with proper structure', async () => {
    const dtClient = await createHttpClient();

    const analyzers = await listDavisAnalyzers(dtClient);

    expect(analyzers).toBeDefined();
    expect(Array.isArray(analyzers)).toBe(true);

    if (analyzers.length > 0) {
      const firstAnalyzer = analyzers[0];

      // Check the structure of the analyzer object
      expect(firstAnalyzer).toHaveProperty('name');
      expect(firstAnalyzer).toHaveProperty('displayName');
      expect(firstAnalyzer).toHaveProperty('description');

      // Check optional fields
      expect(firstAnalyzer.type === undefined || typeof firstAnalyzer.type === 'string').toBe(true);
      expect(firstAnalyzer.category === undefined || typeof firstAnalyzer.category === 'string').toBe(true);
      expect(firstAnalyzer.labels === undefined || Array.isArray(firstAnalyzer.labels)).toBe(true);
    }
  });
});

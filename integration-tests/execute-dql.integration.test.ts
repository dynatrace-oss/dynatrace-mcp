/**
 * Integration test for execute DQL functionality
 *
 * This test verifies the DQL execution functionality by making actual API calls
 * to the Dynatrace environment. These tests require valid authentication credentials.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { executeDql, verifyDqlStatement } from '../src/capabilities/execute-dql';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';

// Load environment variables
config();

const API_RATE_LIMIT_DELAY = 100; // Delay in milliseconds to avoid hitting API rate limits

const scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
];

const scopesDqlExecution = [
  'storage:buckets:read', // Read all system data stored on Grail
  'storage:logs:read', // Read logs for reliability guardian validations
  'storage:metrics:read', // Read metrics for reliability guardian validations
  'storage:bizevents:read', // Read bizevents for reliability guardian validations
  'storage:spans:read', // Read spans from Grail
  'storage:entities:read', // Read Entities from Grail
  'storage:events:read', // Read events from Grail
  'storage:system:read', // Read System Data from Grail
  'storage:user.events:read', // Read User events from Grail
  'storage:user.sessions:read', // Read User sessions from Grail
  'storage:security.events:read', // Read Security events from Grail
];

describe('Execute DQL Integration Tests', () => {
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
    // sleep after every call to avoid hitting API Rate limits
    await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT_DELAY)); // Delay to avoid hitting API rate limits
  });

  // Helper function to create HTTP client for DQL execution
  const createHttpClient = async () => {
    const { oauthClientId, oauthClientSecret, dtEnvironment, dtPlatformToken } = dynatraceEnv;

    return await createDtHttpClient(
      dtEnvironment,
      scopesBase.concat(scopesDqlExecution),
      oauthClientId,
      oauthClientSecret,
      dtPlatformToken,
    );
  };

  // Helper function to create HTTP client for verification only
  const createVerificationClient = async () => {
    const { oauthClientId, oauthClientSecret, dtEnvironment, dtPlatformToken } = dynatraceEnv;

    return await createDtHttpClient(
      dtEnvironment,
      scopesBase, // verification doesn't need storage scopes
      oauthClientId,
      oauthClientSecret,
      dtPlatformToken,
    );
  };

  test('should verify and execute a simple DQL query', async () => {
    const dtClient = await createHttpClient();

    // Simple query to fetch limited logs
    const simpleDql = 'fetch logs | limit 10';

    // First verify the DQL
    const verificationResponse = await verifyDqlStatement(dtClient, simpleDql);
    expect(verificationResponse.valid).toBe(true);

    // Then execute it
    const executionResponse = await executeDql(dtClient, {
      query: simpleDql,
      maxResultRecords: 10, // Limit results to avoid large responses
    });

    expect(executionResponse).toBeDefined();
    expect(executionResponse?.records).toBeDefined();
    expect(Array.isArray(executionResponse?.records)).toBe(true);

    // Should return an array of records (even if empty)
    if (executionResponse?.records && executionResponse.records.length > 0) {
      // Check that records have expected structure
      expect(typeof executionResponse.records[0]).toBe('object');
    }

    // Check that cost information is available
    expect(executionResponse?.scannedBytes).toBeDefined();
    expect(typeof executionResponse?.scannedBytes).toBe('number');
    expect(executionResponse?.scannedRecords).toBeDefined();
    expect(typeof executionResponse?.scannedRecords).toBe('number');
  });

  test('should execute metrics query', async () => {
    const dtClient = await createHttpClient();

    // Valid timeseries query for host CPU usage
    const metricsDql = 'timeseries from:now() - 1h, to:now(), avg_cpu_usage = avg(dt.host.cpu.usage)';

    // First verify the DQL
    const verificationResponse = await verifyDqlStatement(dtClient, metricsDql);
    console.log('Verification response:', verificationResponse);
    expect(verificationResponse.valid).toBe(true);

    // Then execute it
    const executionResponse = await executeDql(dtClient, {
      query: metricsDql,
      maxResultRecords: 5,
    });

    expect(executionResponse).toBeDefined();
    expect(executionResponse?.records).toBeDefined();
    expect(Array.isArray(executionResponse?.records)).toBe(true);

    // Metrics might not always have data, so we just check structure
    if (executionResponse?.records && executionResponse.records.length > 0) {
      expect(typeof executionResponse.records[0]).toBe('object');
    }
  });

  test('should execute events query', async () => {
    const dtClient = await createHttpClient();

    // Query to fetch events from the last hour
    const eventsDql = 'fetch events | limit 10';

    // First verify the DQL
    const verificationResponse = await verifyDqlStatement(dtClient, eventsDql);
    console.log('Events verification response:', verificationResponse);
    expect(verificationResponse.valid).toBe(true);

    // Then execute it
    const executionResponse = await executeDql(dtClient, {
      query: eventsDql,
      maxResultRecords: 10,
    });

    expect(executionResponse).toBeDefined();
    expect(executionResponse?.records).toBeDefined();
    expect(Array.isArray(executionResponse?.records)).toBe(true);

    // Events might not always have data, so we just check structure
    if (executionResponse?.records && executionResponse.records.length > 0) {
      expect(typeof executionResponse.records[0]).toBe('object');
      // Events should have common fields like timestamp, event.type, etc.
      const firstEvent = executionResponse.records[0] as Record<string, any>;
      expect(firstEvent).toHaveProperty('timestamp');
    }
  });

  test('should handle invalid DQL syntax gracefully', async () => {
    const dtClient = await createVerificationClient();

    const invalidDql = 'this is not valid dql syntax';

    // Verify should return invalid
    const verificationResponse = await verifyDqlStatement(dtClient, invalidDql);
    expect(verificationResponse.valid).toBe(false);
    expect(verificationResponse.notifications).toBeDefined();
    expect(verificationResponse.notifications?.length).toBeGreaterThan(0);

    if (verificationResponse.notifications && verificationResponse.notifications.length > 0) {
      expect(verificationResponse.notifications[0].severity).toBe('ERROR');
    }
  });

  test('should handle empty DQL statement', async () => {
    const dtClient = await createVerificationClient();

    // Test with empty string
    const emptyDql = '';

    const verificationResponse = await verifyDqlStatement(dtClient, emptyDql);
    expect(verificationResponse.valid).toBe(false);
    expect(verificationResponse.notifications).toBeDefined();
    expect(verificationResponse.notifications?.length).toBeGreaterThan(0);
  });
});

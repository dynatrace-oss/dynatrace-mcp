/**
 * Integration test for find monitored entity by name functionality
 *
 * This test verifies the entity finding functionality by making actual API calls
 * to the Dynatrace environment. These tests require valid authentication credentials.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { findMonitoredEntityByName } from '../src/capabilities/find-monitored-entity-by-name';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';
import { time } from 'console';

// Load environment variables
config();

const API_RATE_LIMIT_DELAY = 100; // Delay in milliseconds to avoid hitting API rate limits

const scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
  'app-engine:functions:run', // needed for environmentInformationClient
];

const scopesEntitySearch = [
  'storage:entities:read', // Read entities from Grail
];

describe('Find Monitored Entity by Name Integration Tests', () => {
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

  // Helper function to create HTTP client for entity search
  const createHttpClient = async () => {
    const { oauthClientId, oauthClientSecret, dtEnvironment, dtPlatformToken } = dynatraceEnv;

    return await createDtHttpClient(
      dtEnvironment,
      scopesBase.concat(scopesEntitySearch),
      oauthClientId,
      oauthClientSecret,
      dtPlatformToken,
    );
  };

  test('should handle search for non-existent entity gracefully', async () => {
    const dtClient = await createHttpClient();

    // Search for an entity name that is very unlikely to exist
    const searchTerm = 'this-entity-definitely-does-not-exist-12345';

    const response = await findMonitoredEntityByName(dtClient, searchTerm);

    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response).toBe('No monitored entity found with the specified name.');
  }, 30_000); // Increased timeout for API calls

  test('should handle search with empty string', async () => {
    const dtClient = await createHttpClient();

    // Test with empty string
    const searchTerm = '';

    const response = await findMonitoredEntityByName(dtClient, searchTerm);

    expect(response).toBeDefined();
    expect(typeof response).toBe('string');

    // Should handle gracefully - likely will return many results or handle empty search
    expect(
      response.includes('The following monitored entities were found:') ||
        response.includes('No monitored entity found with the specified name.'),
    ).toBe(true);
  });

  test('should return properly formatted response when entities are found', async () => {
    const dtClient = await createHttpClient();

    // Search for a pattern that is likely to find at least one entity
    // "host" is common in most Dynatrace environments
    const searchTerm = 'host';

    const response = await findMonitoredEntityByName(dtClient, searchTerm);

    expect(response).toBeDefined();
    expect(typeof response).toBe('string');

    // If entities are found, check the format
    if (response.includes('The following monitored entities were found:')) {
      // Each line should follow the expected format
      const lines = response.split('\n').filter((line) => line.startsWith('- Entity'));

      lines.forEach((line) => {
        expect(line).toMatch(/^- Entity '.*' of type '.* has entity id '.*'$/);
      });
    }
  });
});

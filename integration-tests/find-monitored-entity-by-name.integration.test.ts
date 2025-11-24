/**
 * Integration test for find monitored entity by name functionality
 *
 * This test verifies the entity finding functionality by making actual API calls
 * to the Dynatrace environment. These tests require valid authentication credentials.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { findMonitoredEntitiesByName } from '../src/capabilities/find-monitored-entity-by-name';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';
import { getEntityTypeFromId } from '../src/utils/dynatrace-entity-types';

// Load environment variables
config();

const API_RATE_LIMIT_DELAY = 100; // Delay in milliseconds to avoid hitting API rate limits

const scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
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
    const extendedSearch = false;

    const response = await findMonitoredEntitiesByName(dtClient, [searchTerm], extendedSearch);

    expect(response).toBeDefined();
    expect(response?.records).toBeDefined();
    expect(response?.records?.length).toEqual(0);
  }, 30_000); // Increased timeout for API calls

  test('should handle search with empty list', async () => {
    const dtClient = await createHttpClient();

    // Test with empty string
    const searchTerms = [] as string[];
    const extendedSearch = false;

    await expect(findMonitoredEntitiesByName(dtClient, searchTerms, extendedSearch)).rejects.toThrow(
      /No entity names supplied to search for/,
    );
  });

  test('should return properly formatted response when entities are found', async () => {
    const dtClient = await createHttpClient();

    // Search for a pattern that is likely to find at least one entity
    // "host" is common in most Dynatrace environments
    const searchTerm = 'host';
    const extendedSearch = false;

    const response = await findMonitoredEntitiesByName(dtClient, [searchTerm], extendedSearch);

    // Assert, based on the DqlExecutionResult
    expect(response).toBeDefined();
    if (response?.records && response.records.length > 0) {
      response.records.forEach((entity) => {
        expect(entity?.id).toBeDefined();
        expect(getEntityTypeFromId(String(entity?.id))).toBeDefined();
      });
    } else {
      // Nothing to assert; environment for testing has no entities found.
    }
  });
});

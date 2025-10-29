/**
 * Integration test for dynatrace client functionality
 *
 * Verifies authentication behaviour by making actual API calls
 * to the Dynatrace environment.
 *
 * The error tests use deliberately incorrect authentication credentials.
 *
 * Other integration tests will use dynatrace-clients, so the happy-path is
 * implicitly tested via other tests.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';

// Load environment variables
config();

const API_RATE_LIMIT_DELAY = 100; // Delay in milliseconds to avoid hitting API rate limits

const scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
];

describe('Dynatrace Clients Integration Tests', () => {
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

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      // Create client with invalid credentials
      await expect(
        createDtHttpClient(
          dynatraceEnv.dtEnvironment,
          scopesBase,
          'invalid-client-id',
          'invalid-client-secret',
          undefined,
        ),
      ).rejects.toThrow(`Failed to retrieve OAuth token`);
    }, 30000);
  });
});

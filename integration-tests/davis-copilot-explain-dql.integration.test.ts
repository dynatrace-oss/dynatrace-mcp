/**
 * Integration test for davis-copilot explainDqlInNaturalLanguage function
 *
 * This test verifies the DQL explanation functionality by making actual API calls
 * to the Dynatrace environment. These tests require valid authentication credentials.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { explainDqlInNaturalLanguage, Dql2NlResponse } from '../src/capabilities/davis-copilot';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';

// Load environment variables
config();

const scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
];

describe('DQL Explanation Integration Tests', () => {
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
    await new Promise((resolve) => setTimeout(resolve, 3000)); // three second delay
  });

  // Helper function to create HTTP client
  const createHttpClient = async () => {
    const { oauthClientId, oauthClientSecret, dtEnvironment, dtPlatformToken } = dynatraceEnv;

    return await createDtHttpClient(
      dtEnvironment,
      scopesBase.concat('davis-copilot:dql2nl:execute'),
      oauthClientId,
      oauthClientSecret,
      dtPlatformToken,
    );
  };

  test('should handle empty DQL query gracefully', async () => {
    const dtClient = await createHttpClient();

    // Test with empty string - this might succeed or fail depending on API behavior
    const response = await explainDqlInNaturalLanguage(dtClient, '');

    expect(response).toBeDefined();
    expect(response.status).toBeDefined();
    expect(response.messageToken).toBeDefined();

    expect(response.status).toBe('FAILED'); // Assuming empty DQL should fail
  });

  test('should handle invalid DQL syntax', async () => {
    const dtClient = await createHttpClient();

    const invalidDql = 'this is not valid dql syntax';
    const response = await explainDqlInNaturalLanguage(dtClient, invalidDql);

    expect(response).toBeDefined();
    expect(response.status).toBeDefined();
    expect(response.messageToken).toBeDefined();

    expect(response.status).toBe('FAILED'); // Assuming invalid DQL should fail

    expect(response.metadata).toBeDefined();
    expect(response.metadata?.notifications).toBeDefined();
    expect(response.metadata?.notifications?.length).toBeGreaterThan(0);

    if (!response.metadata || !response.metadata?.notifications || response.metadata?.notifications?.length === 0) {
      expect(false).toBeTruthy(); // Fail the test if no notifications are present
    } else {
      expect(response.metadata.notifications[0].severity).toBe('ERROR');
      expect(response.metadata.notifications[0].message).toContain('DQL query is not valid');
    }
  });

  test('should handle complex DQL with multiple operations', async () => {
    const dtClient = await createHttpClient();

    const complexDql = `
      fetch logs
      | summarize count(), by:{host.name, service.name}
    `.trim();

    const response = await explainDqlInNaturalLanguage(dtClient, complexDql);

    expect(response).toBeDefined();
    expect(response.status).toBeDefined();
    expect(response.messageToken).toBeDefined();

    expect(response.status === 'SUCCESSFUL' || response.status === 'SUCCESSFUL_WITH_WARNINGS').toBeTruthy();

    // Can say any of:
    //   - "...calculate the total number of logs"
    //   - "...calculate the total number of log entries"
    //   - "...count the number of logs"
    //   - "...count the number of log entries"
    //
    // Can also fail intermittently with:
    //   - "I'm sorry, but I can't generate a response for you right now due to unusually high
    //     demand. Please try again in a few minutes."
    expect(response.summary.toLowerCase()).toContain('group logs by');
    expect(response.summary.toLowerCase()).toMatch(/calculate the total number of log|count the number of log/);
    // The explanation should be reasonably detailed
    expect(response.explanation.length).toBeGreaterThan(50);
  });
});

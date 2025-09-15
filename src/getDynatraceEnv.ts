// Helper to validate and extract required environment variables for Dynatrace MCP
export interface DynatraceEnv {
  oauthClientId?: string;
  oauthClientSecret?: string;
  dtPlatformToken?: string;
  dtEnvironment: string;
  slackConnectionId: string;
  grailBudgetGB: number;
}

/**
 * Reads and validates required environment variables for Dynatrace MCP.
 * Throws an Error if validation fails.
 */
export function getDynatraceEnv(env: NodeJS.ProcessEnv = process.env): DynatraceEnv {
  const oauthClientId = env.OAUTH_CLIENT_ID;
  const oauthClientSecret = env.OAUTH_CLIENT_SECRET;
  const dtPlatformToken = env.DT_PLATFORM_TOKEN;
  const dtEnvironment = env.DT_ENVIRONMENT;
  const slackConnectionId = env.SLACK_CONNECTION_ID || 'fake-slack-connection-id';
  const grailBudgetGB = parseFloat(env.DT_GRAIL_QUERY_BUDGET_GB || '1000'); // Default to 1000 GB

  if (!dtEnvironment) {
    throw new Error('Please set DT_ENVIRONMENT environment variable to your Dynatrace Platform Environment');
  }

  if (!oauthClientId && !oauthClientSecret && !dtPlatformToken) {
    throw new Error(
      'Please set either OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET, or DT_PLATFORM_TOKEN environment variables',
    );
  }

  // ToDo: Allow the case of -1 for unlimited Budget
  if (isNaN(grailBudgetGB) || (grailBudgetGB <= 0 && grailBudgetGB !== -1)) {
    throw new Error('DT_GRAIL_QUERY_BUDGET_GB must be a positive number representing GB budget for Grail queries');
  }

  if (!dtEnvironment.startsWith('https://')) {
    throw new Error(
      'Please set DT_ENVIRONMENT to a valid Dynatrace Environment URL (e.g., https://<environment-id>.apps.dynatrace.com)',
    );
  }

  if (!dtEnvironment.includes('apps.dynatrace.com') && !dtEnvironment.includes('apps.dynatracelabs.com')) {
    throw new Error(
      'Please set DT_ENVIRONMENT to a valid Dynatrace Platform Environment URL (e.g., https://<environment-id>.apps.dynatrace.com)',
    );
  }

  return { oauthClientId, oauthClientSecret, dtPlatformToken, dtEnvironment, slackConnectionId, grailBudgetGB };
}

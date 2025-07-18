// Helper to validate and extract required environment variables for Dynatrace MCP
export interface DynatraceEnv {
  oauthClientId?: string;
  oauthClientSecret?: string;
  dtPlatformToken?: string;
  dtEnvironment: string;
  slackConnectionId: string;
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

  if (!dtEnvironment) {
    throw new Error('Please set DT_ENVIRONMENT environment variable to your Dynatrace Platform Environment');
  }

  if (!oauthClientId && !oauthClientSecret && !dtPlatformToken) {
    throw new Error(
      'Please set either OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET, or DT_PLATFORM_TOKEN environment variables',
    );
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

  return { oauthClientId, oauthClientSecret, dtPlatformToken, dtEnvironment, slackConnectionId };
}

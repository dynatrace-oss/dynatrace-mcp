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
 * Returns the value of an optional env var, or undefined if it is absent or an empty string.
 * Logs a warning when an empty string is detected, because tools like Claude Desktop may set
 * env vars to "" when the user leaves the field blank.
 */
function normalizeOptionalEnvVar(name: string, value: string | undefined): string | undefined {
  if (value === '') {
    console.warn(`⚠️ ${name} is set to an empty string – ignoring it and treating it as unset.`);
    return undefined;
  }
  return value;
}

/**
 * Reads and validates required environment variables for Dynatrace MCP.
 * Throws an Error if validation fails.
 */
export function getDynatraceEnv(env: NodeJS.ProcessEnv = process.env): DynatraceEnv {
  const oauthClientId = normalizeOptionalEnvVar('OAUTH_CLIENT_ID', env.OAUTH_CLIENT_ID);
  const oauthClientSecret = normalizeOptionalEnvVar('OAUTH_CLIENT_SECRET', env.OAUTH_CLIENT_SECRET);
  const dtPlatformToken = normalizeOptionalEnvVar('DT_PLATFORM_TOKEN', env.DT_PLATFORM_TOKEN);
  const dtEnvironment = env.DT_ENVIRONMENT;
  const slackConnectionId = env.SLACK_CONNECTION_ID || 'fake-slack-connection-id';
  let grailBudgetGB = parseFloat(env.DT_GRAIL_QUERY_BUDGET_GB || '1000'); // Default to 1000 GB

  if (!dtEnvironment) {
    throw new Error('Please set DT_ENVIRONMENT environment variable to your Dynatrace Platform Environment');
  }

  // Allow case where no auth credentials are provided - OAuth auth code flow will be inferred
  // We only require DT_ENVIRONMENT to be set

  // For dev and hardening stages, set unlimited budget (-1) unless explicitly overridden
  if (dtEnvironment.includes('apps.dynatracelabs.com') && !env.DT_GRAIL_QUERY_BUDGET_GB) {
    grailBudgetGB = -1;
  }

  // ToDo: Allow the case of -1 for unlimited Budget
  if (isNaN(grailBudgetGB) || (grailBudgetGB < 0 && grailBudgetGB !== -1)) {
    throw new Error(
      'DT_GRAIL_QUERY_BUDGET_GB must be a positive number or -1 (for unlimited) representing GB budget for Grail queries',
    );
  }

  if (!dtEnvironment.startsWith('https://')) {
    throw new Error(
      'Please set DT_ENVIRONMENT to a valid Dynatrace Environment URL (e.g., https://<environment-id>.apps.dynatrace.com)',
    );
  }

  // Only allow certain Dynatrace specific Platform URLs (this is to avoid that users enter URLs like <enviornment-i>.live.dynatrace.com)
  if (!/\.apps\.(dynatrace|dynatracelabs)\.com\/?$/.test(dtEnvironment)) {
    throw new Error(
      'Please set DT_ENVIRONMENT to a valid Dynatrace Platform Environment URL (e.g., https://<environment-id>.apps.dynatrace.com or https://<environment-id>.sprint.apps.dynatracelabs.com)',
    );
  }

  return { oauthClientId, oauthClientSecret, dtPlatformToken, dtEnvironment, slackConnectionId, grailBudgetGB };
}

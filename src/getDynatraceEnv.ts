// Helper to validate and extract required environment variables for Dynatrace MCP
export interface DynatraceEnv {
  oauthClient: string;
  oauthClientSecret: string;
  dtEnvironment: string;
  slackConnectionId: string;
}

interface ProcessEnv {
  [key: string]: string | undefined;
}

declare const process: {
  env: ProcessEnv;
};

/**
 * Reads and validates required environment variables for Dynatrace MCP.
 * Throws an Error if validation fails.
 */
export function getDynatraceEnv(env: ProcessEnv = process.env): DynatraceEnv {
  const oauthClient = env.OAUTH_CLIENT_ID;
  const oauthClientSecret = env.OAUTH_CLIENT_SECRET;
  const dtEnvironment = env.DT_ENVIRONMENT;
  const slackConnectionId = env.SLACK_CONNECTION_ID || "fake-slack-connection-id";

  if (!oauthClient || !oauthClientSecret || !dtEnvironment) {
    throw new Error(
      "Please set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET and DT_ENVIRONMENT environment variables"
    );
  }

  if (!dtEnvironment.startsWith("https://")) {
    throw new Error(
      "Please set DT_ENVIRONMENT to a valid Dynatrace Environment URL (e.g., https://<environment-id>.apps.dynatrace.com)"
    );
  }

  if (!dtEnvironment.includes("apps.dynatrace.com") && !dtEnvironment.includes("apps.dynatracelabs.com")) {
    throw new Error(
      "Please set DT_ENVIRONMENT to a valid Dynatrace Platform Environment URL (e.g., https://<environment-id>.apps.dynatrace.com)"
    );
  }

  return { oauthClient, oauthClientSecret, dtEnvironment, slackConnectionId };
}

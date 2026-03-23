import { getDynatraceEnv, DynatraceEnv } from './getDynatraceEnv';

describe('getDynatraceEnv', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const baseEnv = {
    OAUTH_CLIENT_ID: 'dt0s02.SAMPLE',
    OAUTH_CLIENT_SECRET: 'dt0s02.SAMPLE.abcd1234',
    DT_ENVIRONMENT: 'https://abc123.apps.dynatrace.com',
    DT_PLATFORM_TOKEN: 'dt0s16.SAMPLE.abcd1234',
    SLACK_CONNECTION_ID: 'slack-conn-id',
  };

  it('returns all required values when environment is valid', () => {
    const env = { ...baseEnv };
    const result = getDynatraceEnv(env);
    expect(result).toEqual({
      oauthClientId: env.OAUTH_CLIENT_ID,
      oauthClientSecret: env.OAUTH_CLIENT_SECRET,
      dtEnvironment: env.DT_ENVIRONMENT,
      dtPlatformToken: env.DT_PLATFORM_TOKEN,
      slackConnectionId: env.SLACK_CONNECTION_ID,
      grailBudgetGB: 1000, // Default value
    });
  });

  it('uses default slackConnectionId if not set', () => {
    const env = { ...baseEnv, SLACK_CONNECTION_ID: undefined };
    const result = getDynatraceEnv(env);
    expect(result.slackConnectionId).toBe('fake-slack-connection-id');
  });

  it('allows missing auth credentials (OAuth auth code flow will be inferred)', () => {
    const env = {
      ...baseEnv,
      OAUTH_CLIENT_ID: undefined,
      OAUTH_CLIENT_SECRET: undefined,
      DT_PLATFORM_TOKEN: undefined,
    };
    expect(() => getDynatraceEnv(env)).not.toThrow();
    const result = getDynatraceEnv(env);
    expect(result.oauthClientId).toBeUndefined();
    expect(result.oauthClientSecret).toBeUndefined();
    expect(result.dtPlatformToken).toBeUndefined();
  });

  it('treats empty string OAUTH_CLIENT_ID as unset and warns', () => {
    const env = { ...baseEnv, OAUTH_CLIENT_ID: '' };
    const result = getDynatraceEnv(env);
    expect(result.oauthClientId).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('OAUTH_CLIENT_ID is set to an empty string'));
  });

  it('treats empty string OAUTH_CLIENT_SECRET as unset and warns', () => {
    const env = { ...baseEnv, OAUTH_CLIENT_SECRET: '' };
    const result = getDynatraceEnv(env);
    expect(result.oauthClientSecret).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('OAUTH_CLIENT_SECRET is set to an empty string'));
  });

  it('treats empty string DT_PLATFORM_TOKEN as unset and warns', () => {
    const env = { ...baseEnv, DT_PLATFORM_TOKEN: '' };
    const result = getDynatraceEnv(env);
    expect(result.dtPlatformToken).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('DT_PLATFORM_TOKEN is set to an empty string'));
  });

  it('treats all empty string auth credentials as unset and warns for each', () => {
    const env = {
      ...baseEnv,
      OAUTH_CLIENT_ID: '',
      OAUTH_CLIENT_SECRET: '',
      DT_PLATFORM_TOKEN: '',
    };
    const result = getDynatraceEnv(env);
    expect(result.oauthClientId).toBeUndefined();
    expect(result.oauthClientSecret).toBeUndefined();
    expect(result.dtPlatformToken).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('OAUTH_CLIENT_ID is set to an empty string'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('OAUTH_CLIENT_SECRET is set to an empty string'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('DT_PLATFORM_TOKEN is set to an empty string'));
  });

  it('throws if DT_ENVIRONMENT is missing', () => {
    const env = { ...baseEnv, DT_ENVIRONMENT: undefined };
    expect(() => getDynatraceEnv(env)).toThrow(/DT_ENVIRONMENT/);
  });

  it('throws if DT_ENVIRONMENT does not start with https://', () => {
    const env = {
      ...baseEnv,
      DT_ENVIRONMENT: 'http://abc123.apps.dynatrace.com',
    };
    expect(() => getDynatraceEnv(env)).toThrow(/https:\/\//);
  });

  it('throws if DT_ENVIRONMENT is not a Dynatrace Platform URL (any URL)', () => {
    const env = { ...baseEnv, DT_ENVIRONMENT: 'https://abc123.example.com' };
    expect(() => getDynatraceEnv(env)).toThrow(/Dynatrace Platform Environment URL/);
  });

  it('throws if DT_ENVIRONMENT is not a Dynatrace Platform URL (contains live)', () => {
    const env = {
      ...baseEnv,
      DT_ENVIRONMENT: 'https://abc123.live.dynatrace.com',
    };
    expect(() => getDynatraceEnv(env)).toThrow(/Dynatrace Platform Environment URL/);
  });

  it('throws if DT_ENVIRONMENT is malformed with extra domain', () => {
    const env = {
      ...baseEnv,
      DT_ENVIRONMENT: 'https://demo.dev.apps.dynatracelabs.com.example.com',
    };
    expect(() => getDynatraceEnv(env)).toThrow(/Dynatrace Platform Environment URL/);
  });

  it('accepts DT_ENVIRONMENT with apps.dynatracelabs.com', () => {
    const env = {
      ...baseEnv,
      DT_ENVIRONMENT: 'https://xyz789.apps.dynatracelabs.com',
    };
    expect(() => getDynatraceEnv(env)).not.toThrow();
  });

  it('accepts DT_ENVIRONMENT with apps.dynatrace.com', () => {
    const env = {
      ...baseEnv,
      DT_ENVIRONMENT: 'https://env123.apps.dynatrace.com',
    };
    expect(() => getDynatraceEnv(env)).not.toThrow();
  });

  it('accepts DT_ENVIRONMENT with apps.dynatrace.com with trailing slash', () => {
    const env = {
      ...baseEnv,
      DT_ENVIRONMENT: 'https://env123.apps.dynatrace.com/',
    };
    expect(() => getDynatraceEnv(env)).not.toThrow();
  });

  it('accepts DT_ENVIRONMENT with apps.dynatracelabs.com with trailing slash', () => {
    const env = {
      ...baseEnv,
      DT_ENVIRONMENT: 'https://xyz789.apps.dynatracelabs.com/',
    };
    expect(() => getDynatraceEnv(env)).not.toThrow();
  });

  it('Defaults the Grail Budget to 1000', () => {
    const env = {
      ...baseEnv,
      GRAIL_BUDGET_GB: undefined,
      DT_ENVIRONMENT: 'https://abc123.apps.dynatrace.com',
    };
    const result = getDynatraceEnv(env);
    expect(result).toEqual({
      oauthClientId: env.OAUTH_CLIENT_ID,
      oauthClientSecret: env.OAUTH_CLIENT_SECRET,
      dtEnvironment: env.DT_ENVIRONMENT,
      dtPlatformToken: env.DT_PLATFORM_TOKEN,
      slackConnectionId: env.SLACK_CONNECTION_ID,
      grailBudgetGB: 1000, // Default value
    });
  });

  it('Resets the Grail Budget if a dev/sprint URL is used', () => {
    const env = {
      ...baseEnv,
      GRAIL_BUDGET_GB: undefined,
      DT_ENVIRONMENT: 'https://abc123.dev.apps.dynatracelabs.com',
    };
    const result = getDynatraceEnv(env);
    expect(result).toEqual({
      oauthClientId: env.OAUTH_CLIENT_ID,
      oauthClientSecret: env.OAUTH_CLIENT_SECRET,
      dtEnvironment: env.DT_ENVIRONMENT,
      dtPlatformToken: env.DT_PLATFORM_TOKEN,
      slackConnectionId: env.SLACK_CONNECTION_ID,
      grailBudgetGB: -1, // Default value for dynatracelabs.com
    });
  });
});

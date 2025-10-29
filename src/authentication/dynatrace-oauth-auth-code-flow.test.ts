import { randomBytes } from 'crypto';
import { createAuthorizationUrl, startOAuthRedirectServer } from './dynatrace-oauth-auth-code-flow';
import { OAuthAuthorizationConfig } from './types';

describe('OAuth Authorization Code Flow', () => {
  const mockConfig: OAuthAuthorizationConfig = {
    clientId: 'dt0s08.mocked-client',
    redirectUri: 'http://localhost:5343/auth/login',
    scopes: ['app-engine:apps:run', 'storage:logs:read'], // Basic Example scopes
  };

  test('createAuthorizationUrl generates valid URL with PKCE', () => {
    const result = createAuthorizationUrl('https://sso.dynatrace.com', mockConfig);

    // URL needs to match sso.dynatrace.com/oauth2/authorize
    expect(result.authorizationUrl).toMatch(/^https:\/\/sso\.dynatrace\.com\/oauth2\/authorize\?/);
    expect(result.codeVerifier).toMatch(/^[A-Za-z0-9_-]{62}$/); // Base64URL without padding (46 bytes = ~62 chars)
    expect(result.state).toMatch(/^[a-f0-9]{40}$/); // Hex string (20 bytes = 40 hex chars)

    // Parse the URL and verify query parameters
    const url = new URL(result.authorizationUrl);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('dt0s08.mocked-client');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5343/auth/login');
    expect(url.searchParams.get('scope')).toBe('app-engine:apps:run storage:logs:read');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/); // SHA256 base64url = 43 chars
    expect(url.searchParams.get('state')).toBe(result.state);
  });

  test('createAuthorizationUrl encodes scopes with %20 for spaces instead of +', () => {
    const result = createAuthorizationUrl('https://sso.dynatrace.com', mockConfig);

    // Check that the raw URL string contains %20 for spaces, not +
    expect(result.authorizationUrl).toMatch(/scope=app-engine%3Aapps%3Arun%20storage%3Alogs%3Aread/);

    // Verify that + is not used for space encoding in scopes
    expect(result.authorizationUrl).not.toMatch(/scope=.*\+.*(?=&|$)/);

    // Verify that colons are properly encoded as %3A
    expect(result.authorizationUrl).toMatch(/app-engine%3Aapps%3Arun/);
    expect(result.authorizationUrl).toMatch(/storage%3Alogs%3Aread/);

    // Double-check by parsing the URL and verifying the decoded scope
    const url = new URL(result.authorizationUrl);
    expect(url.searchParams.get('scope')).toBe('app-engine:apps:run storage:logs:read');
  });

  test('startOAuthRedirectServer returns server configuration', async () => {
    const port = (randomBytes(2).readUInt16BE(0) % 10000) + 5000; // Random port between 5000-5999
    const result = await startOAuthRedirectServer(port);

    expect(result.redirectUri).toBe(`http://localhost:${port}/auth/login`);
    expect(result.server).toBeDefined();
    expect(result.waitForAuthorizationCode).toBeDefined();

    // Clean up
    result.server.close();
  });

  test('startOAuthRedirectServer uses forwarded URL in GitHub Codespaces', async () => {
    const originalEnv = process.env;

    try {
      // Mock Codespaces environment variables
      process.env.CODESPACE_NAME = 'test-codespace';
      process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'app.github.dev';

      const port = 8080;
      const result = await startOAuthRedirectServer(port);

      expect(result.redirectUri).toBe('https://test-codespace-8080.app.github.dev/auth/login');
      expect(result.server).toBeDefined();
      expect(result.waitForAuthorizationCode).toBeDefined();

      // Clean up
      result.server.close();
    } finally {
      // Restore original environment
      process.env = originalEnv;
    }
  });

  test('startOAuthRedirectServer falls back to localhost when not in Codespaces', async () => {
    const originalEnv = process.env;

    try {
      // Ensure Codespaces environment variables are not set
      delete process.env.CODESPACE_NAME;
      delete process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

      const port = 8080;
      const result = await startOAuthRedirectServer(port);

      expect(result.redirectUri).toBe('http://localhost:8080/auth/login');
      expect(result.server).toBeDefined();
      expect(result.waitForAuthorizationCode).toBeDefined();

      // Clean up
      result.server.close();
    } finally {
      // Restore original environment
      process.env = originalEnv;
    }
  });
});

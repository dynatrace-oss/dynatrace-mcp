import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import {
  createAuthorizationUrl,
  startOAuthRedirectServer,
  performOAuthAuthorizationCodeFlow,
} from './dynatrace-oauth-auth-code-flow';
import { OAuthAuthorizationConfig } from './types';

// Mock the 'open' module
jest.mock('open');
import open from 'open';
const mockedOpen = jest.mocked(open);

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

  describe('performOAuthAuthorizationCodeFlow - open() error handling', () => {
    // Use a unique port range for these tests to avoid conflicts
    let port: number;

    beforeEach(() => {
      port = (randomBytes(2).readUInt16BE(0) % 10000) + 15000;
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('does not crash when open() rejects with an error', async () => {
      mockedOpen.mockRejectedValue(new Error('spawn powershell.exe ENOENT'));

      // Start the flow; it will hang waiting for auth code, but shouldn't crash.
      // Immediately attach .catch to prevent unhandled rejection.
      const flowPromise = performOAuthAuthorizationCodeFlow(
        'https://sso.dynatrace.com',
        { clientId: 'test', redirectUri: '', scopes: ['test:scope'] },
        port,
      ).catch(() => {
        // Expected: the flow will eventually reject when we trigger cleanup below
      });

      // Give it time to pass the open() call
      await new Promise((resolve) => setTimeout(resolve, 200));

      // The process should still be alive (not crashed).
      // Verify the warning was logged.
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Could not open browser automatically'));

      // Clean up: trigger an error callback so the flow rejects and the server closes.
      // Let fetch errors surface so the test fails fast instead of timing out.
      const response = await fetch(`http://localhost:${port}/auth/login?error=test_cleanup&error_description=cleanup`);
      expect(response.status).toBe(400);
      await flowPromise;
    });

    test('does not crash when child process emits an error event after open() resolves', async () => {
      const fakeProcess = new EventEmitter();
      mockedOpen.mockResolvedValue(fakeProcess as any);

      // Start the flow; immediately attach .catch to prevent unhandled rejection.
      const flowPromise = performOAuthAuthorizationCodeFlow(
        'https://sso.dynatrace.com',
        { clientId: 'test', redirectUri: '', scopes: ['test:scope'] },
        port,
      ).catch(() => {
        // Expected: the flow will eventually reject when we trigger cleanup below
      });

      // Give it time to pass the open() call and attach the error handler
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Simulate the child process emitting an error (as in the WSL ENOENT scenario)
      fakeProcess.emit('error', new Error('spawn powershell.exe ENOENT'));

      // Give it a tick to process the error handler
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The process should still be alive (not crashed).
      // Verify the warning was logged.
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Could not open browser automatically'));

      // Clean up: trigger an error callback so the flow rejects and the server closes.
      // Let fetch errors surface so the test fails fast instead of timing out.
      const response = await fetch(`http://localhost:${port}/auth/login?error=test_cleanup&error_description=cleanup`);
      expect(response.status).toBe(400);
      await flowPromise;
    });

    test('exits cleanly when SIGINT is received while waiting for authorization code', async () => {
      // Mock process.exit to prevent the test runner from actually exiting
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      const fakeProcess = new EventEmitter();
      mockedOpen.mockResolvedValue(fakeProcess as any);

      const flowPromise = performOAuthAuthorizationCodeFlow(
        'https://sso.dynatrace.com',
        { clientId: 'test', redirectUri: '', scopes: ['test:scope'] },
        port,
      ).catch(() => {
        // process.exit is mocked, so the promise remains pending; ignore any rejection
      });

      // Give it time to reach the waitForAuthorizationCode() await
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Simulate CTRL+C / SIGINT
      process.emit('SIGINT');

      // Give the handler time to run
      await new Promise((resolve) => setTimeout(resolve, 50));

      // process.exit(0) should have been called, indicating a clean shutdown
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
      // flowPromise remains pending because process.exit was mocked, which is expected
      void flowPromise;
    });

    test('exits cleanly when SIGTERM is received while waiting for authorization code', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      const fakeProcess = new EventEmitter();
      mockedOpen.mockResolvedValue(fakeProcess as any);

      const flowPromise = performOAuthAuthorizationCodeFlow(
        'https://sso.dynatrace.com',
        { clientId: 'test', redirectUri: '', scopes: ['test:scope'] },
        port,
      ).catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 200));

      process.emit('SIGTERM');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
      void flowPromise;
    });
  });
});

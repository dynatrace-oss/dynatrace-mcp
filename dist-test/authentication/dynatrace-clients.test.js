'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const dynatrace_clients_1 = require('./dynatrace-clients');
const http_client_1 = require('@dynatrace-sdk/http-client');
const get_sso_url_1 = require('./get-sso-url');
const dynatrace_oauth_auth_code_flow_1 = require('./dynatrace-oauth-auth-code-flow');
const token_cache_1 = require('./token-cache');
// Mock external dependencies
jest.mock('@dynatrace-sdk/http-client');
jest.mock('./get-sso-url');
jest.mock('./dynatrace-oauth-auth-code-flow');
jest.mock('./token-cache');
jest.mock('../../package.json', () => ({
  version: '1.0.0-test',
}));
// Mock fetch globally
global.fetch = jest.fn();
const mockPlatformHttpClient = http_client_1.PlatformHttpClient;
const mockGetSSOUrl = get_sso_url_1.getSSOUrl;
const mockPerformOAuthAuthorizationCodeFlow = dynatrace_oauth_auth_code_flow_1.performOAuthAuthorizationCodeFlow;
const mockRefreshAccessToken = dynatrace_oauth_auth_code_flow_1.refreshAccessToken;
const mockGlobalTokenCache = token_cache_1.globalTokenCache;
const mockFetch = global.fetch;
describe('dynatrace-clients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock token cache methods
    mockGlobalTokenCache.getToken.mockReturnValue(null);
    mockGlobalTokenCache.isTokenValid.mockReturnValue(false);
    mockGlobalTokenCache.setToken.mockImplementation(() => {});
    mockGlobalTokenCache.clearToken.mockImplementation(() => {});
    // Mock getSSOUrl
    mockGetSSOUrl.mockResolvedValue('https://sso.dynatrace.com');
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('createDtHttpClient', () => {
    const environmentUrl = 'https://test123.apps.dynatrace.com';
    const scopes = ['scope1', 'scope2'];
    describe('with OAuth credentials', () => {
      const clientId = 'test-client-id';
      const clientSecret = 'test-client-secret';
      const platformToken = 'test-platform-token';
      beforeEach(() => {
        mockGetSSOUrl.mockResolvedValue('https://sso.dynatrace.com');
      });
      it('should create OAuth client successfully', async () => {
        const mockTokenResponse = {
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'scope1 scope2',
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });
        const result = await (0, dynatrace_clients_1.createDtHttpClient)(
          environmentUrl,
          scopes,
          clientId,
          clientSecret,
        );
        expect(mockGetSSOUrl).toHaveBeenCalledWith(environmentUrl);
        expect(mockFetch).toHaveBeenCalledWith('https://sso.dynatrace.com/sso/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: scopes.join(' '),
          }),
        });
        expect(mockPlatformHttpClient).toHaveBeenCalledWith({
          baseUrl: environmentUrl,
          defaultHeaders: {
            'Authorization': 'Bearer test-access-token',
            'User-Agent': expect.stringMatching(/^dynatrace-mcp-server\/v1\.0\.0-test \(\w+-\w+\)$/),
          },
        });
        expect(result).toBeInstanceOf(http_client_1.PlatformHttpClient);
      });
      it('should throw error when token request fails with HTTP error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({
            error: 'invalid_client',
            error_description: 'Invalid client credentials',
          }),
        });
        await expect(
          (0, dynatrace_clients_1.createDtHttpClient)(environmentUrl, scopes, clientId, clientSecret),
        ).rejects.toThrow('Failed to retrieve OAuth token');
        expect(console.error).toHaveBeenCalledWith('Failed to fetch token: 401 Unauthorized');
      });
      it('should throw error when token response contains error', async () => {
        const mockErrorResponse = {
          error: 'invalid_scope',
          error_description: 'The requested scope is invalid',
          issueId: 'issue-123',
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockErrorResponse,
        });
        await expect(
          (0, dynatrace_clients_1.createDtHttpClient)(environmentUrl, scopes, clientId, clientSecret),
        ).rejects.toThrow(
          'Failed to retrieve OAuth token (IssueId: issue-123): invalid_scope - The requested scope is invalid',
        );
      });
      it('should throw error when token response is missing access_token', async () => {
        const mockIncompleteResponse = {
          token_type: 'Bearer',
          expires_in: 3600,
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockIncompleteResponse,
        });
        await expect(
          (0, dynatrace_clients_1.createDtHttpClient)(environmentUrl, scopes, clientId, clientSecret),
        ).rejects.toThrow('Failed to retrieve OAuth token');
      });
      it('should log authentication details', async () => {
        const mockTokenResponse = {
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });
        await (0, dynatrace_clients_1.createDtHttpClient)(environmentUrl, scopes, clientId, clientSecret);
        expect(console.error).toHaveBeenCalledWith(
          `🔒 Client-Creds-Flow: Trying to authenticate API Calls to ${environmentUrl} via OAuthClientId ${clientId} with the following scopes: ${scopes.join(', ')}`,
        );
      });
    });
    describe('with Bearer token', () => {
      const dtPlatformToken = 'test-platform-token';
      it('should create Bearer token client successfully', async () => {
        const result = await (0, dynatrace_clients_1.createDtHttpClient)(
          environmentUrl,
          scopes,
          undefined,
          undefined,
          dtPlatformToken,
        );
        expect(mockPlatformHttpClient).toHaveBeenCalledWith({
          baseUrl: environmentUrl,
          defaultHeaders: {
            'Authorization': `Bearer ${dtPlatformToken}`,
            'User-Agent': expect.stringMatching(/^dynatrace-mcp-server\/v1\.0\.0-test \(\w+-\w+\)$/),
          },
        });
        expect(result).toBeInstanceOf(http_client_1.PlatformHttpClient);
      });
    });
    describe('with OAuth auth code flow (clientId only)', () => {
      const clientId = 'test-client-id';
      it('should deduplicate concurrent token refresh attempts', async () => {
        const expiredCachedToken = {
          access_token: 'expired-access-token',
          refresh_token: 'valid-refresh-token',
          expires_at: Date.now() - 60000, // expired 1 minute ago
          scopes,
        };
        const newTokenResponse = {
          access_token: 'new-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'new-refresh-token',
        };
        mockGlobalTokenCache.getToken.mockReturnValue(expiredCachedToken);
        mockGlobalTokenCache.isTokenValid.mockReturnValue(false);
        // Simulate a slow refresh (10ms) so concurrent callers have time to pile up
        mockRefreshAccessToken.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(newTokenResponse), 10)),
        );
        // Initiate two concurrent calls – both see the same expired token
        const [client1, client2] = await Promise.all([
          (0, dynatrace_clients_1.createDtHttpClient)(environmentUrl, scopes, clientId),
          (0, dynatrace_clients_1.createDtHttpClient)(environmentUrl, scopes, clientId),
        ]);
        // The refresh must only have been attempted once (no race on the refresh token)
        expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(client1).toBeInstanceOf(http_client_1.PlatformHttpClient);
        expect(client2).toBeInstanceOf(http_client_1.PlatformHttpClient);
      });
    });
  });
  describe('requestToken function (indirectly tested)', () => {
    it('should handle fetch errors gracefully', async () => {
      mockGetSSOUrl.mockResolvedValue('https://sso.dynatrace.com');
      // Mock fetch to throw an error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(
        (0, dynatrace_clients_1.createDtHttpClient)(
          'https://test.apps.dynatrace.com',
          ['scope1'],
          'client-id',
          'client-secret',
        ),
      ).rejects.toThrow('Network error');
    });
    it('should format request body correctly', async () => {
      mockGetSSOUrl.mockResolvedValue('https://sso.dynatrace.com');
      const mockTokenResponse = {
        access_token: 'test-token',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });
      await (0, dynatrace_clients_1.createDtHttpClient)(
        'https://test.apps.dynatrace.com',
        ['scope1', 'scope2'],
        'test-client',
        'test-secret',
      );
      const expectedBody = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'test-client',
        client_secret: 'test-secret',
        scope: 'scope1 scope2',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expectedBody,
        }),
      );
    });
  });
  describe('User-Agent header', () => {
    it('should include correct User-Agent format', async () => {
      const dtPlatformToken = 'test-token';
      await (0, dynatrace_clients_1.createDtHttpClient)(
        'https://test.apps.dynatrace.com',
        ['scope1'],
        undefined,
        undefined,
        dtPlatformToken,
      );
      expect(mockPlatformHttpClient).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultHeaders: expect.objectContaining({
            'User-Agent': expect.stringMatching(/^dynatrace-mcp-server\/v\d+\.\d+\.\d+(-\w+)? \(\w+-\w+\)$/),
          }),
        }),
      );
    });
  });
});

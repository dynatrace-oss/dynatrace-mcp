'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createDtHttpClient = void 0;
const http_client_1 = require('@dynatrace-sdk/http-client');
const user_agent_1 = require('../utils/user-agent');
const dynatrace_oauth_auth_code_flow_1 = require('./dynatrace-oauth-auth-code-flow');
const token_cache_1 = require('./token-cache');
const utils_1 = require('./utils');
const dynatrace_oauth_client_credentials_1 = require('./dynatrace-oauth-client-credentials');
const get_sso_url_1 = require('./get-sso-url');
/**
 * Create a Dynatrace Http Client (from the http-client SDK) based on the provided authentication credentials
 * Supports Platform Token, OAuth Client Credentials Flow, and OAuth Authorization Code Flow (interactive)
 * @param environmentUrl
 * @param scopes
 * @param clientId
 * @param clientSecret
 * @param dtPlatformToken
 * @returns an authenticated HttpClient
 */
const createDtHttpClient = async (environmentUrl, scopes, clientId, clientSecret, dtPlatformToken) => {
  /** Logic:
   * * if a platform token is provided, use it
   * * If no platform token is provided, but clientId and clientSecret are provided, use client credentials flow
   * * If no platform token is provided, and no clientSecret is provided, but a clientId is provided, use OAuth authorization code flow (interactive)
   * * If neither platform token nor OAuth credentials are provided, throw an error
   */
  if (dtPlatformToken) {
    // create a simple HTTP client if only the platform token is provided
    return createPlatformTokenHttpClient(environmentUrl, dtPlatformToken);
  } else if (clientId && clientSecret) {
    // create an Oauth client using client credentials flow (non-interactive)
    return createOAuthClientCredentialsHttpClient(environmentUrl, scopes, clientId, clientSecret);
  } else if (clientId) {
    // create an OAuth client using authorization code flow (interactive)
    return createOAuthAuthCodeFlowHttpClient(environmentUrl, scopes, clientId);
  }
  throw new Error(
    'Failed to create Dynatrace HTTP Client: Please provide either clientId and clientSecret for client credentials flow, clientId only for interactive OAuth flow, or just a platform token.',
  );
};
exports.createDtHttpClient = createDtHttpClient;
/**
 * Creates an HTTP Client based on environmentUrl and a bearer token, and also sets the user agent
 */
const createBearerTokenHttpClient = async (environmentUrl, bearerToken) => {
  return new http_client_1.PlatformHttpClient({
    baseUrl: environmentUrl,
    defaultHeaders: {
      'Authorization': `Bearer ${bearerToken}`,
      'User-Agent': (0, user_agent_1.getUserAgent)(),
    },
  });
};
/**
 * Creates an HTTP Client based on environmentUrl and a platform token (as bearer token)
 */
const createPlatformTokenHttpClient = async (environmentUrl, dtPlatformToken) => {
  console.error(`🔒 Using Platform Token to authenticate API Calls to ${environmentUrl}`);
  return createBearerTokenHttpClient(environmentUrl, dtPlatformToken);
};
/**
 * Create an OAuth Client based on clientId, clientSecret, environmentUrl and scopes
 * This uses a client-credentials flow to request a token from the SSO endpoint.
 * Note: We do not refresh the token here, we always request a new one on each client creation.
 */
const createOAuthClientCredentialsHttpClient = async (environmentUrl, scopes, clientId, clientSecret) => {
  console.error(
    `🔒 Client-Creds-Flow: Trying to authenticate API Calls to ${environmentUrl} via OAuthClientId ${clientId} with the following scopes: ${scopes.join(', ')}`,
  );
  // Get SSO Base URL
  const ssoBaseURL = await (0, get_sso_url_1.getSSOUrl)(environmentUrl);
  // try to request a token, just to verify that everything is set up correctly
  const tokenResponse = await (0, dynatrace_oauth_client_credentials_1.requestTokenForClientCredentials)(
    clientId,
    clientSecret,
    ssoBaseURL,
    scopes,
  );
  // in case we didn't get a token, or error / error_description / issueId is set, we throw an error
  if (!tokenResponse.access_token || tokenResponse.error || tokenResponse.error_description || tokenResponse.issueId) {
    throw new Error(
      `Failed to retrieve OAuth token (IssueId: ${tokenResponse.issueId}): ${tokenResponse.error} - ${tokenResponse.error_description}. Note: Your OAuth client is most likely not configured correctly and/or is missing scopes.`,
    );
  }
  console.error(
    `Successfully retrieved token from SSO! Token valid for ${tokenResponse.expires_in}s with scopes: ${tokenResponse.scope}`,
  );
  // now that we have the access token, we can just use a plain bearer token client
  return createBearerTokenHttpClient(environmentUrl, tokenResponse.access_token);
};
/**
 * Shared promise for an in-progress token refresh (prevents concurrent refresh races).
 * When multiple callers find an expired token simultaneously, only the first starts a refresh;
 * all others await the same promise so the refresh token is only consumed once.
 *
 * Note: this relies on Node.js's single-threaded event loop — no concurrent synchronous
 * access can occur between the null-check and the assignment below.
 */
let ongoingRefreshPromise = null;
/** Create an OAuth Client using authorization code flow (interactive authentication)
 * This starts a local HTTP server to handle the OAuth redirect and requires user interaction.
 * Implements an in-memory token cache (not persisted to disk). After every server restart a new
 * authentication flow (or token refresh) may be required.
 * Note: Always requests a complete set of scopes for maximum token reusability. Else the user will end up having to approve multiple requests.
 */
const createOAuthAuthCodeFlowHttpClient = async (environmentUrl, scopes, clientId) => {
  // Get SSO Base URL
  const ssoBaseURL = await (0, get_sso_url_1.getSSOUrl)(environmentUrl);
  // Fast Track: Fetch cached token and check if it is still valid
  const cachedToken = token_cache_1.globalTokenCache.getToken(scopes);
  const isValid = token_cache_1.globalTokenCache.isTokenValid(scopes);
  // If we have a valid cached token, we can use it
  if (isValid && cachedToken) {
    const expiresIn = cachedToken.expires_at ? Math.round((cachedToken.expires_at - Date.now()) / 1000) : 'never';
    console.error(`✅ Auth-Code-Flow: Using cached access token (expires in ${expiresIn}s)`);
    // just use the cached token as a bearer token
    return createBearerTokenHttpClient(environmentUrl, cachedToken.access_token);
  }
  // If we have an expired token that can be refreshed, refresh it.
  // Use a single shared promise to deduplicate concurrent refresh attempts so the refresh token
  // is only consumed once (OAuth refresh tokens are rotated/invalidated on use).
  if (cachedToken && cachedToken.refresh_token && !isValid) {
    const expiresIn = cachedToken.expires_at ? Math.round((cachedToken.expires_at - Date.now()) / 1000) : 'never';
    if (!ongoingRefreshPromise) {
      console.error(`🔍 Auth-Code-Flow: Found expired cached token (expires in ${expiresIn}s), attempting refresh...`);
      ongoingRefreshPromise = (0, dynatrace_oauth_auth_code_flow_1.refreshAccessToken)(
        ssoBaseURL,
        clientId,
        cachedToken.refresh_token,
        scopes,
      ).finally(() => {
        ongoingRefreshPromise = null;
      });
    } else {
      console.error(`🔄 Token refresh already in progress, waiting for it to complete...`);
    }
    try {
      const tokenResponse = await ongoingRefreshPromise;
      if (tokenResponse.access_token && !tokenResponse.error) {
        console.error(`✅ Successfully refreshed access token!`);
        // Update the cache with the new token
        token_cache_1.globalTokenCache.setToken(scopes, tokenResponse);
        // now use the updated token as a bearer token
        return createBearerTokenHttpClient(environmentUrl, tokenResponse.access_token);
      } else {
        console.error(`❌ Token refresh failed: ${tokenResponse.error} - ${tokenResponse.error_description}`);
        // Clear the invalid token from cache
        token_cache_1.globalTokenCache.clearToken();
      }
    } catch (error) {
      console.error(`❌ Token refresh failed with error: ${error instanceof Error ? error.message : String(error)}`);
      // Clear the invalid token from cache
      token_cache_1.globalTokenCache.clearToken();
    }
  }
  // If we get here, we are currently not authenticated, and need to perform a full OAuth Authorization Code Flow
  console.error(`🚀 Auth-Code-Flow: No valid cached token found, initiating OAuth Authorization Code Flow...`);
  console.error(`Using SSO base URL ${ssoBaseURL}`);
  // Try to start OAuth server with retry logic for port conflicts
  const maxAttempts = 3;
  let lastError = null;
  const alreadyUsedPorts = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Randomly select a port for the OAuth redirect URL (e.g., 5344)
    const port = (0, utils_1.getRandomPort)(undefined, undefined, alreadyUsedPorts);
    alreadyUsedPorts.push(port);
    try {
      console.error(`🔄 Attempting to start OAuth callback server on port ${port} (attempt ${attempt}/${maxAttempts})`);
      // Perform the OAuth authorization code flow with all scopes
      const tokenResponse = await (0, dynatrace_oauth_auth_code_flow_1.performOAuthAuthorizationCodeFlow)(
        ssoBaseURL,
        {
          clientId,
          // redirectUri will be used as a redirect/callback from the authorization code flow
          redirectUri: `http://localhost:${port}/auth/login`,
          scopes: scopes, // Request all scopes upfront
        },
        port,
      );
      // Check if we got a valid token
      if (
        !tokenResponse.access_token ||
        tokenResponse.error ||
        tokenResponse.error_description ||
        tokenResponse.issueId
      ) {
        throw new Error(
          `Failed to retrieve OAuth token via authorization code flow (IssueId: ${tokenResponse.issueId}): ${tokenResponse.error} - ${tokenResponse.error_description}`,
        );
      }
      // Cache the new token with all scopes
      token_cache_1.globalTokenCache.setToken(scopes, tokenResponse);
      console.error(
        `✅ Successfully retrieved token from SSO! Token cached for future use with scopes: ${scopes.join(', ')}`,
      );
      // Success - return the client
      return createBearerTokenHttpClient(environmentUrl, tokenResponse.access_token);
    } catch (error) {
      lastError = error;
      // Check if this is a port conflict error
      if (error.code === 'EADDRINUSE' || error.message?.includes('EADDRINUSE')) {
        console.error(
          `❌ Port ${port} is already in use. ${attempt < maxAttempts ? 'Retrying with a different port...' : ''}`,
        );
        if (attempt < maxAttempts) {
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
      }
      // For non-port errors, don't retry
      break;
    }
  }
  // If we get here, all attempts failed
  throw new Error(
    `Failed to start OAuth callback server after ${maxAttempts} attempts. Last error: ${lastError?.message}`,
  );
};

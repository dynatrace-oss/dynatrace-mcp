'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.createAuthorizationUrl = createAuthorizationUrl;
exports.exchangeCodeForToken = exchangeCodeForToken;
exports.refreshAccessToken = refreshAccessToken;
exports.startOAuthRedirectServer = startOAuthRedirectServer;
exports.performOAuthAuthorizationCodeFlow = performOAuthAuthorizationCodeFlow;
const node_crypto_1 = require('node:crypto');
const node_http_1 = require('node:http');
const node_url_1 = require('node:url');
const dynatrace_oauth_base_1 = require('./dynatrace-oauth-base');
const utils_1 = require('./utils');
const open_1 = __importDefault(require('open'));
const environment_detection_1 = require('../utils/environment-detection');
/**
 * Generates PKCE code verifier and challenge according to RFC 7636
 * Uses 46 bytes for code verifier as recommended by Auth0/OAuth best practices
 */
function generatePKCEChallenge() {
  const codeVerifier = (0, utils_1.base64URLEncode)((0, node_crypto_1.randomBytes)(46));
  const codeChallenge = (0, utils_1.base64URLEncode)(
    (0, node_crypto_1.createHash)('sha256').update(codeVerifier).digest(),
  );
  return { codeVerifier, codeChallenge };
}
/**
 * Constructs the OAuth authorization URL with PKCE
 */
function createAuthorizationUrl(ssoBaseURL, config) {
  const state = (0, utils_1.generateRandomState)();
  const { codeVerifier, codeChallenge } = generatePKCEChallenge();
  const authUrl = new node_url_1.URL('/oauth2/authorize', ssoBaseURL);
  // Build query parameters manually to control encoding and exact order
  // Order parameters to match working OAuth implementation:
  // client_id → redirect_uri → state → response_type → code_challenge_method → code_challenge → scope
  const queryParts = [
    `client_id=${encodeURIComponent(config.clientId)}`,
    `redirect_uri=${encodeURIComponent(config.redirectUri)}`,
    `state=${encodeURIComponent(state)}`,
    `response_type=code`,
    `code_challenge_method=S256`,
    `code_challenge=${encodeURIComponent(codeChallenge)}`,
    `scope=${encodeURIComponent(config.scopes.join(' ')).replace(/%20/g, '%20')}`, // Ensure %20 for spaces
  ];
  const queryString = queryParts.join('&');
  // Manually construct the final URL to ensure exact parameter order and encoding required by some OAuth implementations.
  const finalUrl = `${authUrl.origin}${authUrl.pathname}?${queryString}`;
  return {
    authorizationUrl: finalUrl,
    codeVerifier,
    state,
  };
}
/**
 * Exchanges authorization code for access token using PKCE
 */
async function exchangeCodeForToken(ssoBaseURL, config, code, codeVerifier) {
  return (0, dynatrace_oauth_base_1.requestOAuthToken)(ssoBaseURL, {
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });
}
/**
 * Refreshes an access token using a refresh token
 */
async function refreshAccessToken(ssoBaseURL, clientId, refreshToken, scopes) {
  const tokenResponse = await (0, dynatrace_oauth_base_1.requestOAuthToken)(ssoBaseURL, {
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
    scope: scopes.join(' '),
  });
  // For refresh token, we want to throw an error if the request failed
  // since this is different from other flows where we just return the error response
  if (!tokenResponse.access_token || tokenResponse.error) {
    throw new Error(`Failed to refresh access token: ${tokenResponse.error} - ${tokenResponse.error_description}`);
  }
  return tokenResponse;
}
/**
 * Starts a temporary HTTP server to handle the OAuth redirect
 */
async function startOAuthRedirectServer(port = 5344) {
  // Check if we're running in GitHub Codespaces and use forwarded URL if so
  const forwardedUrl = (0, environment_detection_1.getCodespacesForwardedUrl)(port);
  const redirectUri = forwardedUrl ? `${forwardedUrl}/auth/login` : `http://localhost:${port}/auth/login`;
  let resolveAuthCode;
  let rejectAuthCode;
  const authCodePromise = new Promise((resolve, reject) => {
    resolveAuthCode = resolve;
    rejectAuthCode = reject;
  });
  const server = (0, node_http_1.createServer)((req, res) => {
    const url = new node_url_1.URL(req.url || '', `http://localhost:${port}`);
    if (url.pathname === '/auth/login') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');
      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>OAuth Error</title></head>
            <body>
              <h1>OAuth Authorization Error</h1>
              <p><strong>Error:</strong> ${error}</p>
              <p><strong>Description:</strong> ${errorDescription || 'Unknown error'}</p>
              <p>You can close this tab and check the console for more information.</p>
            </body>
          </html>
        `);
        rejectAuthCode(new Error(`OAuth error: ${error} - ${errorDescription}`));
        return;
      }
      if (code && state) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>OAuth Success</title></head>
            <body>
              <h1>Authorization Successful!</h1>
              <p>You have successfully authorized the Dynatrace MCP Server.</p>
              <p>You can close this tab and return to your terminal.</p>
              <script>
                // Auto-close after 3 seconds
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);
        resolveAuthCode({ code, state });
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Invalid Request</title></head>
            <body>
              <h1>Invalid OAuth Callback</h1>
              <p>The authorization code or state parameter is missing.</p>
              <p>You can close this tab and try again.</p>
            </body>
          </html>
        `);
        rejectAuthCode(new Error('Missing authorization code or state parameter'));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
  return new Promise((resolve, reject) => {
    server.listen(port, 'localhost', () => {
      console.error(`🌐 OAuth redirect server listening on ${redirectUri}`);
      resolve({
        server,
        redirectUri,
        waitForAuthorizationCode: () => authCodePromise,
      });
    });
    server.on('error', reject);
  });
}
/**
 * Performs the complete OAuth authorization code flow
 */
async function performOAuthAuthorizationCodeFlow(ssoBaseURL, config, serverPort = 5344) {
  console.error('🚀 Starting OAuth Authorization Code Flow with local redirect/callback...');
  // Start the redirect server
  const { server, redirectUri, waitForAuthorizationCode } = await startOAuthRedirectServer(serverPort);
  try {
    // Update config with the actual redirect URI
    const updatedConfig = { ...config, redirectUri };
    // Create authorization URL
    const { authorizationUrl, codeVerifier, state } = createAuthorizationUrl(ssoBaseURL, updatedConfig);
    // Print a pretty message telling the user to open the URL
    console.error('\n' + '='.repeat(60));
    console.error('🔐 OAuth Authorization Required');
    console.error('='.repeat(60));
    console.error('');
    // Open the authorization URL in the default browser
    console.error('Trying to open the authorization URL in your default browser...');
    try {
      (0, open_1.default)(authorizationUrl);
    } catch (error) {
      console.error(
        'Failed to open browser automatically. Please click on the following URL to authorize the application:',
        error.message,
      );
    }
    console.error('');
    console.error('👉 ' + authorizationUrl);
    console.error('');
    console.error('After authorization, you will be redirected back and the server will continue automatically.');
    console.error('');
    console.error('='.repeat(60) + '\n');
    // Wait for the authorization code
    const { code, state: receivedState } = await waitForAuthorizationCode();
    // Validate state parameter
    if (receivedState !== state) {
      throw new Error('OAuth state parameter mismatch - possible CSRF attack');
    }
    console.error('✅ Authorization code received! Exchanging for access token...');
    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(ssoBaseURL, updatedConfig, code, codeVerifier);
    if (!tokenResponse.access_token || tokenResponse.error) {
      throw new Error(`Failed to exchange code for token: ${tokenResponse.error} - ${tokenResponse.error_description}`);
    }
    console.error('🎉 Successfully obtained access token via OAuth Authorization Code Flow!');
    return tokenResponse;
  } finally {
    // Clean up the server
    server.close();
  }
}

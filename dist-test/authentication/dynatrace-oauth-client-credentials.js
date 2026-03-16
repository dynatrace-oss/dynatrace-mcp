'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.requestTokenForClientCredentials = void 0;
const dynatrace_oauth_base_1 = require('./dynatrace-oauth-base');
/**
 * Uses the provided oauth Client ID and Secret and requests a token via client-credentials flow
 * @param clientId - OAuth Client ID for Dynatrace
 * @param clientSecret - OAuth Client Secret for Dynatrace
 * @param ssoBaseURL - SSO Base URL (e.g., sso.dynatrace.com)
 * @param scopes - List of requested scopes
 * @returns Response of the OAuth Endpoint (which, in the best case includes a token)
 */
const requestTokenForClientCredentials = async (clientId, clientSecret, ssoBaseURL, scopes) => {
  return (0, dynatrace_oauth_base_1.requestOAuthToken)(ssoBaseURL, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: scopes.join(' '),
  });
};
exports.requestTokenForClientCredentials = requestTokenForClientCredentials;

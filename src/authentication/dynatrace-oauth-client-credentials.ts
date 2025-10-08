import { requestOAuthToken } from './dynatrace-oauth-base';
import { OAuthTokenResponse } from './types';

/**
 * Uses the provided oauth Client ID and Secret and requests a token via client-credentials flow
 * @param clientId - OAuth Client ID for Dynatrace
 * @param clientSecret - OAuth Client Secret for Dynatrace
 * @param ssoBaseURL - SSO Base URL (e.g., sso.dynatrace.com)
 * @param scopes - List of requested scopes
 * @returns Response of the OAuth Endpoint (which, in the best case includes a token)
 */
export const requestTokenForClientCredentials = async (
  clientId: string,
  clientSecret: string,
  ssoBaseURL: string,
  scopes: string[],
): Promise<OAuthTokenResponse> => {
  return requestOAuthToken(ssoBaseURL, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: scopes.join(' '),
  });
};

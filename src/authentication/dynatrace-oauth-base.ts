import { OAuthTokenResponse, OAuthTokenParams } from './types';

/**
 * Generic OAuth token request function that can handle different grant types
 * @param ssoBaseURL - SSO Base URL (e.g., sso.dynatrace.com)
 * @param params - OAuth parameters for the specific grant type (client_credentials, authorization_code, or refresh_token)
 * @returns Response of the OAuth Endpoint
 */
export const requestOAuthToken = async (ssoBaseURL: string, params: OAuthTokenParams): Promise<OAuthTokenResponse> => {
  const tokenUrl = new URL('/sso/oauth2/token', ssoBaseURL).toString();
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });

  // check if the response was okay (HTTP 2xx) or not (HTTP 4xx or 5xx)
  if (!res.ok) {
    // log the error
    console.error(`Failed to fetch token: ${res.status} ${res.statusText}`);
    // Note: Do not throw here, as we want to return the error response from the OAuth endpoint
  }

  // and return the JSON result, as it contains additional information
  return await res.json();
};

import { HttpClient, PlatformHttpClient } from '@dynatrace-sdk/http-client';
import { getSSOUrl } from 'dt-app';
import { version as VERSION } from '../../package.json';
import { OAuthTokenResponse } from './types';

/**
 * Uses the provided oauth Client ID and Secret and requests a token via client-credentials flow
 * @param clientId - OAuth Client ID for Dynatrace
 * @param clientSecret - Oauth Client Secret for Dynatrace
 * @param ssoAuthUrl - SSO Authentication URL
 * @param scopes - List of requested scopes
 * @returns
 */
const requestToken = async (
  clientId: string,
  clientSecret: string,
  ssoAuthUrl: string,
  scopes: string[],
): Promise<OAuthTokenResponse> => {
  const res = await fetch(ssoAuthUrl, {
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
  // check if the response was okay (HTTP 2xx) or not (HTTP 4xx or 5xx)
  if (!res.ok) {
    // log the error
    console.error(`Failed to fetch token: ${res.status} ${res.statusText}`);
  }
  // and return the JSON result, as it contains additional information
  return await res.json();
};

/**
 * Create a Dynatrace Http Client (from the http-client SDK) based on the provided authentication credentails
 * @param environmentUrl
 * @param scopes
 * @param clientId
 * @param clientSecret
 * @param dtPlatformToken
 * @returns
 */
export const createDtHttpClient = async (
  environmentUrl: string,
  scopes: string[],
  clientId?: string,
  clientSecret?: string,
  dtPlatformToken?: string,
): Promise<HttpClient> => {
  if (clientId && clientSecret) {
    // create an OAuth client if clientId and clientSecret are provided
    return createOAuthHttpClient(environmentUrl, scopes, clientId, clientSecret);
  }
  if (dtPlatformToken) {
    // create a simple HTTP client if only the platform token is provided
    return createBearerTokenHttpClient(environmentUrl, dtPlatformToken);
  }
  throw new Error(
    'Failed to create Dynatrace HTTP Client: Please provide either clientId and clientSecret or dtPlatformToken',
  );
};

/** Creates an HTTP Client based on environmentUrl and a platform token */
const createBearerTokenHttpClient = async (environmentUrl: string, dtPlatformToken: string): Promise<HttpClient> => {
  return new PlatformHttpClient({
    baseUrl: environmentUrl,
    defaultHeaders: {
      'Authorization': `Bearer ${dtPlatformToken}`,
      'User-Agent': `dynatrace-mcp-server/v${VERSION} (${process.platform}-${process.arch})`,
    },
  });
};

/** Create an Oauth Client based on clientId, clientSecret, environmentUrl and scopes
 * This uses a client-credentials flow to request a token from the SSO endpoint.
 */
const createOAuthHttpClient = async (
  environmentUrl: string,
  scopes: string[],
  clientId: string,
  clientSecret: string,
): Promise<HttpClient> => {
  if (!clientId) {
    throw new Error('Failed to retrieve OAuth client id from env "DT_APP_OAUTH_CLIENT_ID"');
  }
  if (!clientSecret) {
    throw new Error('Failed to retrieve OAuth client secret from env "DT_APP_OAUTH_CLIENT_SECRET"');
  }
  if (!environmentUrl) {
    throw new Error('Failed to retrieve environment URL from env "DT_ENVIRONMENT"');
  }

  console.error(
    `Trying to authenticate API Calls to ${environmentUrl} via OAuthClientId ${clientId} with the following scopes: ${scopes.join(', ')}`,
  );

  const ssoBaseUrl = await getSSOUrl(environmentUrl);
  const ssoAuthUrl = new URL('/sso/oauth2/token', ssoBaseUrl).toString();
  console.error(`Using SSO auth URL: ${ssoAuthUrl}`);

  // try to request a token, just to verify that everything is set up correctly
  const tokenResponse = await requestToken(clientId, clientSecret, ssoAuthUrl, scopes);

  // in case we didn't get a token, or error / error_description / issueId is set, we throw an error
  if (!tokenResponse.access_token || tokenResponse.error || tokenResponse.error_description || tokenResponse.issueId) {
    throw new Error(
      `Failed to retrieve OAuth token (IssueId: ${tokenResponse.issueId}): ${tokenResponse.error} - ${tokenResponse.error_description}. Note: Your OAuth client is most likely not configured correctly and/or is missing scopes.`,
    );
  }
  console.error(`Successfully retrieved token from SSO!`);

  return createBearerTokenHttpClient(environmentUrl, tokenResponse.access_token);
};

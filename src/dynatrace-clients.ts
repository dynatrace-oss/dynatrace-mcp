import { _OAuthHttpClient } from '@dynatrace-sdk/http-client';
import { getSSOUrl } from 'dt-app';

/** Uses the provided oauth Client ID and Secret and requests a token */
const requestToken = async (clientId: string, clientSecret: string, authUrl: string, scopes: string[]): Promise<any> => {
  const res = await fetch(authUrl, {
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
  if (!res.ok) {
    console.error(`Failed to fetch token: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

/** Create an Oauth Client based on clientId, clientSecret, environmentUrl and scopes */
export const createOAuthClient = async (clientId: string, clientSecret: string, environmentUrl: string, scopes: string[]): Promise<_OAuthHttpClient> => {
  if (!clientId) {
    throw new Error('Failed to retrieve OAuth client id from env "DT_APP_OAUTH_CLIENT_ID"');
  }
  if (!clientSecret) {
    throw new Error('Failed to retrieve OAuth client secret from env "DT_APP_OAUTH_CLIENT_SECRET"');
  }
  if (!environmentUrl) {
    throw new Error('Failed to retrieve environment URL from env "DT_ENVIRONMENT"');
  }

  console.error(`Trying to authenticate API Calls to ${environmentUrl} via OAuthClientId ${clientId}`);

  const ssoBaseUrl = await getSSOUrl(environmentUrl);
  const ssoAuthUrl = new URL('/sso/oauth2/token', ssoBaseUrl).toString();
  console.error(`Using SSO auth URL: ${ssoAuthUrl}`);

  // try to request a token, just to verify that everything is set up correctly
  const tokenResponse = await requestToken(clientId, clientSecret, ssoAuthUrl, scopes);
  if (tokenResponse.error && tokenResponse.error_description) {
    throw new Error(`Failed to retrieve OAuth token: ${tokenResponse.error} - ${tokenResponse.error_description}`);
  }
  console.error(`Successfully retrieved token from SSO!`);

  return new _OAuthHttpClient({
    scopes,
    clientId,
    secret: clientSecret,
    environmentUrl,
    authUrl: ssoAuthUrl,
  });
};

/** Helper function to call an app-function via platform-api */
export const callAppFunction = async (dtClient: _OAuthHttpClient, appId: string, functionName: string, payload: any) => {
  console.error(`Sending payload ${JSON.stringify(payload)}`);

  const response = await dtClient.send({
    url: `/platform/app-engine/app-functions/v1/apps/${appId}/api/${functionName}`,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: payload,
    statusValidator: (status: number) => {
      return [200].includes(status);
    },
  });

  return await response.body('json');
}

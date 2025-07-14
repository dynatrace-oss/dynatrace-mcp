import { _OAuthHttpClient } from '@dynatrace-sdk/http-client';

/** Helper function to call an app-function via platform-api */
export const callAppFunction = async (
  dtClient: _OAuthHttpClient,
  appId: string,
  functionName: string,
  payload: any,
) => {
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
};

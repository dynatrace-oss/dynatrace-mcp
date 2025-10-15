import { ClientRequestError } from '@dynatrace-sdk/shared-errors';

export function handleClientRequestError(error: ClientRequestError): string {
  let additionalErrorInformation = '';
  if (error.response.status === 403) {
    additionalErrorInformation =
      'Note: Your user or service-user is most likely lacking the necessary permissions/scopes for this API Call.';
  }

  return `Client Request Error: ${error.message} with HTTP status: ${error.response.status}. ${additionalErrorInformation} (body: ${JSON.stringify(error.body)})`;
}

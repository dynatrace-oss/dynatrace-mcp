import { ClientRequestError } from '@dynatrace-sdk/shared-errors';

/**
 * Extracts missing scopes from a Dynatrace API error body.
 * The error body may contain `error.details.missingScopes` as an array of strings.
 */
export function extractMissingScopes(body: unknown): string[] {
  if (body && typeof body === 'object') {
    const errorObj = (body as Record<string, unknown>).error;
    if (errorObj && typeof errorObj === 'object') {
      const details = (errorObj as Record<string, unknown>).details;
      if (details && typeof details === 'object') {
        const missingScopes = (details as Record<string, unknown>).missingScopes;
        if (Array.isArray(missingScopes) && missingScopes.every((s) => typeof s === 'string')) {
          return missingScopes as string[];
        }
      }
    }
  }
  return [];
}

export function handleClientRequestError(error: ClientRequestError): string {
  let additionalErrorInformation = '';
  if (error.response.status === 403) {
    const missingScopes = extractMissingScopes(error.body);
    if (missingScopes.length > 0) {
      additionalErrorInformation = `Add the scope(s) ${missingScopes.join(', ')} to your platform token / OAuth client.`;
    } else {
      additionalErrorInformation =
        'Note: Your user or service-user is most likely lacking the necessary permissions/scopes for this API Call.';
    }
  }

  return `Client Request Error: ${error.message} with HTTP status: ${error.response.status}. ${additionalErrorInformation} (body: ${JSON.stringify(error.body)})`;
}

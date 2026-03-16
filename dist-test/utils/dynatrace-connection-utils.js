'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.handleClientRequestError = handleClientRequestError;
function handleClientRequestError(error) {
  let additionalErrorInformation = '';
  if (error.response.status === 403) {
    additionalErrorInformation =
      'Note: Your user or service-user is most likely lacking the necessary permissions/scopes for this API Call.';
  }
  return `Client Request Error: ${error.message} with HTTP status: ${error.response.status}. ${additionalErrorInformation} (body: ${JSON.stringify(error.body)})`;
}

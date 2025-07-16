// Define the OAuthTokenResponse interface to match the expected structure of the response
export interface OAuthTokenResponse {
  scope?: string;
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  errorCode?: number;
  message?: string;
  issueId?: string;
  error?: string;
  error_description?: string;
}

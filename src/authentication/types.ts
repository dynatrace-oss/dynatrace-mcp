// Define the OAuthTokenResponse interface to match the expected structure of the response
export interface OAuthTokenResponse {
  scope?: string;
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  errorCode?: number;
  message?: string;
  issueId?: string;
  error?: string;
  error_description?: string;
}

// OAuth parameter types for different grant flows
export interface ClientCredentialsParams extends Record<string, string> {
  grant_type: 'client_credentials';
  client_id: string;
  client_secret: string;
  scope: string;
}

export interface AuthorizationCodeParams extends Record<string, string> {
  grant_type: 'authorization_code';
  client_id: string;
  code: string;
  redirect_uri: string;
  code_verifier: string;
}

export interface RefreshTokenParams extends Record<string, string> {
  grant_type: 'refresh_token';
  client_id: string;
  refresh_token: string;
  scope: string;
}

// Union type for all OAuth token request parameters
export type OAuthTokenParams = ClientCredentialsParams | AuthorizationCodeParams | RefreshTokenParams;

// OAuth Authorization Code Flow specific types
export interface OAuthAuthorizationConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthAuthorizationResult {
  authorizationUrl: string;
  codeVerifier: string;
  state: string;
}

// Token cache interfaces
export interface CachedToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // Unix timestamp when the token expires
  scopes: string[];
}

export interface TokenCache {
  getToken(scopes: string[]): CachedToken | null;
  setToken(scopes: string[], token: OAuthTokenResponse): void;
  clearToken(scopes?: string[]): void;
  isTokenValid(scopes: string[]): boolean;
}

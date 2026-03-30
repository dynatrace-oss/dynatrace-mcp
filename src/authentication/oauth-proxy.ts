/**
 * OAuth 2.0 Authorization Server Proxy for the Dynatrace MCP Server's `--sso` HTTP mode.
 *
 * When running with `--http --sso`, the MCP server acts as an OAuth proxy AS in front of
 * Dynatrace SSO.  This enables MCP clients that support RFC 9728 Protected Resource Metadata
 * (PRM) and Client ID Metadata Documents (CIMD) to discover and complete the full OAuth
 * Authorization Code + PKCE flow automatically — without Dynamic Client Registration (DCR).
 *
 * Flow overview:
 *  1. MCP client makes unauthenticated request → 401 + WWW-Authenticate pointing to PRM.
 *  2. Client fetches GET /.well-known/oauth-protected-resource → PRM (lists MCP server as AS).
 *  3. Client fetches GET /.well-known/oauth-authorization-server → AS metadata with
 *     client_id_metadata_document_supported: true.
 *  4. Client starts OAuth flow: GET /oauth/authorize → server redirects to Dynatrace SSO using
 *     the pre-registered application, passing through the client's PKCE code_challenge.
 *  5. User completes Dynatrace SSO browser login.
 *  6. Dynatrace SSO redirects to GET /oauth/callback on the MCP server.
 *  7. Server relays the authorization code to the client's original redirect_uri.
 *  8. Client exchanges the code: POST /oauth/token → server proxies to Dynatrace SSO.
 *  9. Client receives the Dynatrace access token and uses it as a Bearer token in MCP requests.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { URL, URLSearchParams } from 'node:url';
import { requestOAuthToken } from './dynatrace-oauth-base';

// ---------------------------------------------------------------------------
// Metadata types (aligned with RFC 9728 and RFC 8414)
// ---------------------------------------------------------------------------

/** RFC 9728 OAuth 2.0 Protected Resource Metadata document */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported?: string[];
  resource_name?: string;
  bearer_methods_supported?: string[];
}

/** RFC 8414 Authorization Server Metadata document (subset relevant to the proxy) */
export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  response_types_supported: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  scopes_supported?: string[];
  /**
   * When true, MCP clients may use a URL as their client_id (pointing to a CIMD document)
   * instead of registering dynamically — as described in
   * draft-ietf-oauth-client-id-metadata-document.
   */
  client_id_metadata_document_supported?: boolean;
}

// ---------------------------------------------------------------------------
// In-flight flow state
// ---------------------------------------------------------------------------

/** Tracks one pending OAuth authorization flow (between /authorize and /callback). */
interface PendingFlow {
  /** The redirect URI supplied by the MCP client — we relay the auth code here. */
  clientRedirectUri: string;
  /** Creation time for TTL-based cleanup. */
  createdAt: number;
}

/** Tracks a DT authorization code waiting for the client to exchange via /token. */
interface PendingCode {
  /** The redirect_uri we registered with Dynatrace SSO (must match on token exchange). */
  dtRedirectUri: string;
  /** Creation time for TTL-based cleanup. */
  createdAt: number;
}

/**
 * Maximum lifetime for a pending flow or code before it is discarded.
 * 10 minutes covers typical SSO login times including MFA; flows that exceed this
 * require the user to restart the authorization sequence.
 */
const FLOW_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Per-server-instance state for the OAuth proxy.
 * Tracks flows in progress and codes awaiting exchange.
 */
export class OAuthProxyState {
  private pendingFlows = new Map<string, PendingFlow>();
  private pendingCodes = new Map<string, PendingCode>();

  storePendingFlow(state: string, flow: PendingFlow): void {
    this.cleanExpired();
    this.pendingFlows.set(state, flow);
  }

  consumePendingFlow(state: string): PendingFlow | undefined {
    const flow = this.pendingFlows.get(state);
    this.pendingFlows.delete(state);
    return flow;
  }

  storePendingCode(code: string, pending: PendingCode): void {
    this.cleanExpired();
    this.pendingCodes.set(code, pending);
  }

  consumePendingCode(code: string): PendingCode | undefined {
    const pending = this.pendingCodes.get(code);
    this.pendingCodes.delete(code);
    return pending;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, flow] of this.pendingFlows) {
      if (now - flow.createdAt > FLOW_TTL_MS) this.pendingFlows.delete(key);
    }
    for (const [key, code] of this.pendingCodes) {
      if (now - code.createdAt > FLOW_TTL_MS) this.pendingCodes.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Metadata builders
// ---------------------------------------------------------------------------

/**
 * Builds the RFC 9728 Protected Resource Metadata document.
 * Lists the MCP server itself as the authorization server (the proxy AS).
 */
export function buildProtectedResourceMetadata(
  serverBaseUrl: string,
  scopes: string[],
): ProtectedResourceMetadata {
  return {
    resource: serverBaseUrl,
    authorization_servers: [serverBaseUrl],
    scopes_supported: scopes,
    resource_name: 'Dynatrace MCP Server',
    bearer_methods_supported: ['header'],
  };
}

/**
 * Builds the RFC 8414 Authorization Server Metadata document for the MCP proxy.
 * Advertises CIMD support so MCP clients can authenticate without Dynamic Client Registration.
 */
export function buildAuthorizationServerMetadata(
  serverBaseUrl: string,
  scopes: string[],
): AuthorizationServerMetadata {
  return {
    issuer: serverBaseUrl,
    authorization_endpoint: `${serverBaseUrl}/oauth/authorize`,
    token_endpoint: `${serverBaseUrl}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: scopes,
    // Advertise CIMD support — MCP clients may pass a metadata URL as their client_id
    // instead of registering dynamically with the authorization server.
    client_id_metadata_document_supported: true,
  };
}

// ---------------------------------------------------------------------------
// Well-known endpoint handler
// ---------------------------------------------------------------------------

/**
 * Serves the OAuth discovery well-known documents.
 * Returns true if the request was handled, false if the path is not a well-known endpoint.
 */
export function handleWellKnown(
  req: IncomingMessage,
  res: ServerResponse,
  serverBaseUrl: string,
  scopes: string[],
): boolean {
  const url = new URL(req.url || '', serverBaseUrl);
  const path = url.pathname;

  const wellKnownPaths = [
    '/.well-known/oauth-protected-resource',
    '/.well-known/oauth-authorization-server',
  ];

  if (!wellKnownPaths.includes(path)) {
    return false;
  }

  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    res.writeHead(405, { Allow: 'GET, OPTIONS', 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method_not_allowed' }));
    return true;
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  let metadata: ProtectedResourceMetadata | AuthorizationServerMetadata;

  if (path === '/.well-known/oauth-protected-resource') {
    metadata = buildProtectedResourceMetadata(serverBaseUrl, scopes);
  } else {
    metadata = buildAuthorizationServerMetadata(serverBaseUrl, scopes);
  }

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify(metadata));
  return true;
}

// ---------------------------------------------------------------------------
// OAuth proxy endpoint handlers
// ---------------------------------------------------------------------------

/**
 * Handles GET /oauth/authorize
 *
 * Validates the authorization request and redirects the user to Dynatrace SSO using the
 * pre-registered Dynatrace OAuth application.  The client's PKCE code_challenge is passed
 * through so Dynatrace SSO validates the code_verifier during token exchange.
 */
export async function handleAuthorize(
  req: IncomingMessage,
  res: ServerResponse,
  ssoBaseUrl: string,
  dtClientId: string,
  serverBaseUrl: string,
  proxyState: OAuthProxyState,
): Promise<void> {
  const reqUrl = new URL(req.url || '', serverBaseUrl);

  const clientRedirectUri = reqUrl.searchParams.get('redirect_uri');
  const clientState = reqUrl.searchParams.get('state');
  const codeChallenge = reqUrl.searchParams.get('code_challenge');
  const codeChallengeMethod = reqUrl.searchParams.get('code_challenge_method');
  const scope = reqUrl.searchParams.get('scope') || '';

  if (!clientRedirectUri || !clientState || !codeChallenge || !codeChallengeMethod) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'invalid_request',
        error_description: 'Required parameters missing: redirect_uri, state, code_challenge, code_challenge_method',
      }),
    );
    return;
  }

  if (codeChallengeMethod !== 'S256') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'invalid_request',
        error_description: 'Only code_challenge_method=S256 is supported',
      }),
    );
    return;
  }

  // Our callback URL — Dynatrace SSO will redirect here after successful login.
  const dtRedirectUri = `${serverBaseUrl}/oauth/callback`;

  // Record the mapping state → client redirect URI so we can relay the code in /callback.
  proxyState.storePendingFlow(clientState, { clientRedirectUri, createdAt: Date.now() });

  // Redirect to Dynatrace SSO, passing the client's PKCE code_challenge verbatim.
  // This preserves the end-to-end PKCE binding: DT SSO will verify the code_verifier
  // that the client later sends to our /token endpoint.
  const ssoAuthUrl = new URL('/oauth2/authorize', ssoBaseUrl);
  ssoAuthUrl.search = new URLSearchParams({
    client_id: dtClientId,
    redirect_uri: dtRedirectUri,
    state: clientState,
    response_type: 'code',
    code_challenge_method: codeChallengeMethod,
    code_challenge: codeChallenge,
    scope,
  }).toString();

  res.writeHead(302, { Location: ssoAuthUrl.toString() });
  res.end();
}

/** Simple HTML entity encoder to prevent XSS in dynamically-constructed error pages. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Handles GET /oauth/callback
 *
 * Receives the authorization code from Dynatrace SSO and relays it to the MCP client's
 * original redirect_uri, preserving the state parameter.
 */
export async function handleCallback(
  req: IncomingMessage,
  res: ServerResponse,
  serverBaseUrl: string,
  proxyState: OAuthProxyState,
): Promise<void> {
  const reqUrl = new URL(req.url || '', serverBaseUrl);

  const code = reqUrl.searchParams.get('code');
  const clientState = reqUrl.searchParams.get('state');
  const error = reqUrl.searchParams.get('error');
  const errorDescription = reqUrl.searchParams.get('error_description');

  if (error) {
    // Dynatrace SSO returned an error — show a minimal error page.
    const safeError = escapeHtml(error);
    const safeDesc = escapeHtml(errorDescription ?? 'Unknown error');
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      `<!DOCTYPE html><html><head><title>Authorization Error</title></head><body>` +
        `<h1>Authorization Error</h1><p><strong>${safeError}</strong>: ${safeDesc}</p>` +
        `<p>You may close this tab and try again.</p></body></html>`,
    );
    return;
  }

  if (!code || !clientState) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_request', error_description: 'Missing code or state parameter' }));
    return;
  }

  const pendingFlow = proxyState.consumePendingFlow(clientState);
  if (!pendingFlow) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_state', error_description: 'Unknown or expired state parameter' }));
    return;
  }

  // Remember the redirect_uri we used for this code (needed for token exchange validation).
  proxyState.storePendingCode(code, {
    dtRedirectUri: `${serverBaseUrl}/oauth/callback`,
    createdAt: Date.now(),
  });

  // Relay the authorization code to the MCP client's redirect_uri.
  const clientCallbackUrl = new URL(pendingFlow.clientRedirectUri);
  clientCallbackUrl.searchParams.set('code', code);
  clientCallbackUrl.searchParams.set('state', clientState);

  res.writeHead(302, { Location: clientCallbackUrl.toString() });
  res.end();
}

/**
 * Handles POST /oauth/token
 *
 * Proxies the authorization_code token exchange to Dynatrace SSO using the pre-registered
 * Dynatrace OAuth application.  The client's code_verifier is passed through so Dynatrace SSO
 * can validate it against the code_challenge from the original authorization request.
 */
export async function handleToken(
  req: IncomingMessage,
  res: ServerResponse,
  ssoBaseUrl: string,
  dtClientId: string,
  proxyState: OAuthProxyState,
): Promise<void> {
  // Collect POST body
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = new URLSearchParams(Buffer.concat(chunks).toString());

  const grantType = body.get('grant_type');
  const code = body.get('code');
  const codeVerifier = body.get('code_verifier');

  if (grantType !== 'authorization_code' || !code || !codeVerifier) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'invalid_request',
        error_description: 'Only authorization_code grant with PKCE (code_verifier) is supported',
      }),
    );
    return;
  }

  // Look up the redirect_uri we used when directing the user to Dynatrace SSO.
  const pending = proxyState.consumePendingCode(code);
  if (!pending) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Unknown or expired authorization code' }));
    return;
  }

  // Proxy the token exchange to Dynatrace SSO.  Using the pre-registered client and the
  // server-side redirect_uri ensures the request is valid from DT SSO's perspective.
  const tokenResponse = await requestOAuthToken(ssoBaseUrl, {
    grant_type: 'authorization_code',
    client_id: dtClientId,
    code,
    redirect_uri: pending.dtRedirectUri,
    code_verifier: codeVerifier,
  });

  if (!tokenResponse.access_token || tokenResponse.error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: tokenResponse.error ?? 'token_error',
        error_description: tokenResponse.error_description ?? 'Token exchange with Dynatrace SSO failed',
      }),
    );
    return;
  }

  // Return the Dynatrace access token to the MCP client.
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(tokenResponse));
}

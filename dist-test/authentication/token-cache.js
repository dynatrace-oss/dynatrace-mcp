'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.globalTokenCache = exports.InMemoryTokenCache = void 0;
/**
 * In-memory token cache implementation (no persistence across process restarts).
 * The previous implementation stored tokens on disk in `.dt-mcp/token.json` – this has been
 * intentionally removed to avoid writing credentials to the local filesystem. A new login /
 * OAuth authorization code flow (or token retrieval) will be required after every server restart.
 */
class InMemoryTokenCache {
  token = null;
  /**
   * Retrieves the cached token (ignores scopes since we use a global token)
   */
  getToken(scopes) {
    // Scopes parameter ignored – single global token covers all requested scopes.
    return this.token;
  }
  /**
   * Stores the global token in the cache and persists it to file
   */
  setToken(scopes, token) {
    this.token = {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
      scopes: [...scopes],
    };
  }
  /**
   * Removes the cached token and deletes the file
   */
  clearToken(scopes) {
    this.token = null;
  }
  /**
   * Checks if the token exists and is still valid (not expired)
   */
  isTokenValid(scopes) {
    // We ignore the scopes parameter since we use a single token with all scopes
    if (!this.token) return false;
    if (!this.token.expires_at) return true; // treat as non-expiring
    // Add a 30-second buffer to avoid using tokens that are about to expire
    const bufferMs = 30 * 1000; // 30 seconds
    const now = Date.now();
    const expiresAt = this.token.expires_at;
    return now + bufferMs < expiresAt;
  }
}
exports.InMemoryTokenCache = InMemoryTokenCache;
// Global token cache instance - In-memory only
exports.globalTokenCache = new InMemoryTokenCache();

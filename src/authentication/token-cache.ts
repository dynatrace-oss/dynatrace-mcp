import { CachedToken, TokenCache, OAuthTokenResponse } from './types';

const KEYCHAIN_SERVICE = 'dynatrace-mcp';

// Lazily-loaded keyring module.
// Three-state: `undefined` = require() not yet attempted; `null` = not available; otherwise the module.
type KeyringModule = {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
};
let lazyKeyringModule: KeyringModule | null | undefined = undefined;

function tryGetKeyring(): KeyringModule | null {
  if (lazyKeyringModule !== undefined) {
    return lazyKeyringModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lazyKeyringModule = require('@napi-rs/keyring/keytar') as KeyringModule;
  } catch {
    lazyKeyringModule = null;
  }
  return lazyKeyringModule;
}

/**
 * In-memory token cache implementation (no persistence across process restarts).
 */
export class InMemoryTokenCache implements TokenCache {
  private token: CachedToken | null = null;

  /**
   * Retrieves the cached token (ignores scopes since we use a global token)
   */
  getToken(scopes: string[]): CachedToken | null {
    // Scopes parameter ignored – single global token covers all requested scopes.
    return this.token;
  }

  /**
   * Stores the token in the in-memory cache
   */
  setToken(scopes: string[], token: OAuthTokenResponse): void {
    this.token = {
      access_token: token.access_token!,
      refresh_token: token.refresh_token,
      expires_at: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
      scopes: [...scopes],
    };
  }

  /**
   * Removes the cached token
   */
  clearToken(scopes?: string[]): void {
    this.token = null;
  }

  /**
   * Checks if the token exists and is still valid (not expired)
   */
  isTokenValid(scopes: string[]): boolean {
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

/**
 * OS keychain-backed token cache that persists OAuth Authorization Code Flow tokens
 * across process restarts. Falls back to in-memory-only behavior when the native
 * keychain is unavailable (e.g., headless servers without a secret service).
 *
 * Keychain entry: service = 'dynatrace-mcp', account = the OAuth clientId.
 */
export class KeychainTokenCache implements TokenCache {
  private token: CachedToken | null = null;
  private keychainAvailable = false;

  constructor(private readonly account: string) {}

  /**
   * Loads a previously stored token from the OS keychain (if available).
   * Must be called once before using the cache.
   */
  async initialize(): Promise<void> {
    const keyring = tryGetKeyring();
    if (!keyring) {
      console.error('⚠️ OS keychain not available – auth tokens will not be persisted across restarts.');
      return;
    }
    this.keychainAvailable = true;
    try {
      const stored = await keyring.getPassword(KEYCHAIN_SERVICE, this.account);
      if (stored) {
        const parsed = JSON.parse(stored) as CachedToken;
        this.token = parsed;
        console.error(`🔑 Loaded existing auth token from OS keychain.`);
      }
    } catch (e) {
      console.error(`⚠️ Failed to load token from OS keychain: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  getToken(scopes: string[]): CachedToken | null {
    return this.token;
  }

  setToken(scopes: string[], token: OAuthTokenResponse): void {
    this.token = {
      access_token: token.access_token!,
      refresh_token: token.refresh_token,
      expires_at: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
      scopes: [...scopes],
    };
    void this.persistToKeychain();
  }

  clearToken(scopes?: string[]): void {
    this.token = null;
    void this.deleteFromKeychain();
  }

  isTokenValid(scopes: string[]): boolean {
    if (!this.token) return false;
    if (!this.token.expires_at) return true;
    const bufferMs = 30 * 1000;
    return Date.now() + bufferMs < this.token.expires_at;
  }

  private async persistToKeychain(): Promise<void> {
    if (!this.keychainAvailable || !this.token) return;
    const keyring = tryGetKeyring();
    if (!keyring) return;
    try {
      await keyring.setPassword(KEYCHAIN_SERVICE, this.account, JSON.stringify(this.token));
      console.error(`🔑 Auth token saved to OS keychain.`);
    } catch (e) {
      console.error(`⚠️ Failed to save token to OS keychain: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async deleteFromKeychain(): Promise<void> {
    if (!this.keychainAvailable) return;
    const keyring = tryGetKeyring();
    if (!keyring) return;
    try {
      await keyring.deletePassword(KEYCHAIN_SERVICE, this.account);
    } catch {
      // Ignore errors when deleting from keychain
    }
  }
}

// Module-level map of per-account KeychainTokenCache instances (keyed by clientId).
// Initialization promises are stored to deduplicate concurrent initialize() calls.
const keychainCacheInitPromises = new Map<string, Promise<KeychainTokenCache>>();

/**
 * Returns (and lazily initializes) a KeychainTokenCache for the given account name.
 * Subsequent calls with the same account return the same initialized instance.
 */
export function getOrCreateKeychainCache(account: string): Promise<KeychainTokenCache> {
  if (!keychainCacheInitPromises.has(account)) {
    const initPromise = (async () => {
      const cache = new KeychainTokenCache(account);
      await cache.initialize();
      return cache;
    })();
    keychainCacheInitPromises.set(account, initPromise);
  }
  return keychainCacheInitPromises.get(account)!;
}

// Global token cache instance - In-memory only (kept for backward compatibility)
export const globalTokenCache = new InMemoryTokenCache();

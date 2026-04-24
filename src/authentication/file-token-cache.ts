import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CachedToken, TokenCache, OAuthTokenResponse } from './types';

/** Default path where tokens are persisted when --remember-me is enabled. */
export const DEFAULT_TOKEN_FILE_PATH = join(homedir(), '.dt-mcp', '.tokens.json');

/** Shape of the JSON file on disk. */
interface TokenFile {
  tokens: CachedToken[];
}

/**
 * A {@link TokenCache} implementation that persists tokens to a JSON file on disk.
 * Used when the `--remember-me` flag is set at server startup.
 *
 * The file format is:
 * ```json
 * { "tokens": [{ "access_token": "...", "refresh_token": "...", "expires_at": 1234567890, "scopes": ["..."] }] }
 * ```
 *
 * The `tokens` array is intentionally kept as an array to match the documented format and allow
 * future extension. The current implementation stores exactly one token (index 0), because the
 * auth-code flow always requests all required scopes in a single token.
 *
 * Design goals:
 * - Never throw an error (read/write failures are silently ignored, JSON parse issues emit a warning).
 * - Read tokens from disk on construction and keep an in-memory copy that is kept in sync.
 */
export class FileTokenCache implements TokenCache {
  private token: CachedToken | null = null;

  constructor(private readonly filePath: string = DEFAULT_TOKEN_FILE_PATH) {
    this.loadFromDisk();
  }

  // ---------------------------------------------------------------------------
  // TokenCache interface
  // ---------------------------------------------------------------------------

  /**
   * Returns the cached token, ignoring the `scopes` parameter.
   * The auth-code flow always requests **all** scopes upfront, so a single global
   * token covers every operation. This mirrors the behaviour of {@link InMemoryTokenCache}.
   */
  getToken(_scopes: string[]): CachedToken | null {
    return this.token;
  }

  /**
   * Stores the token in memory and immediately persists it to disk.
   * The `scopes` parameter is stored in the token but not used for lookup/validation,
   * since the auth-code flow requests all required scopes in a single token.
   */
  setToken(scopes: string[], tokenResponse: OAuthTokenResponse): void {
    this.token = {
      access_token: tokenResponse.access_token!,
      refresh_token: tokenResponse.refresh_token,
      expires_at: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : undefined,
      scopes: [...scopes],
    };
    this.saveToDisk();
  }

  clearToken(_scopes?: string[]): void {
    this.token = null;
    this.saveToDisk();
  }

  /**
   * Returns `true` if the token exists and is not within 30 seconds of expiry.
   * Scopes are ignored; see {@link getToken} for rationale.
   */
  isTokenValid(_scopes: string[]): boolean {
    if (!this.token) return false;
    if (!this.token.expires_at) return true; // treat as non-expiring

    // Add a 30-second buffer to avoid using tokens that are about to expire
    const bufferMs = 30 * 1000;
    return Date.now() + bufferMs < this.token.expires_at;
  }

  // ---------------------------------------------------------------------------
  // Disk I/O helpers (never throw)
  // ---------------------------------------------------------------------------

  private loadFromDisk(): void {
    if (!existsSync(this.filePath)) {
      return;
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed: TokenFile = JSON.parse(raw);
      if (Array.isArray(parsed.tokens) && parsed.tokens.length > 0) {
        this.token = parsed.tokens[0];
      }
    } catch (err) {
      // Warn on JSON parse errors, silently ignore other I/O errors
      if (err instanceof SyntaxError) {
        console.error(
          `⚠️ Warning: Failed to parse token file at ${this.filePath}. The file will be overwritten on next login.`,
        );
      }
      // All other errors (e.g., EACCES) are silently swallowed
    }
  }

  private saveToDisk(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data: TokenFile = { tokens: this.token ? [this.token] : [] };
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Silently ignore write errors
    }
  }
}

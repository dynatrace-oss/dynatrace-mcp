import { CachedToken, TokenCache, OAuthTokenResponse } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * File-based token cache implementation that persists tokens to disk
 * Stores tokens in .dt-mcp/token.json for persistence across dynatrace-mcp-server restarts
 */
export class FileTokenCache implements TokenCache {
  private readonly tokenFilePath: string;
  private token: CachedToken | null = null;

  constructor() {
    // Create .dt-mcp directory in the current working directory
    const tokenDir = path.join(process.cwd(), '.dt-mcp');
    this.tokenFilePath = path.join(tokenDir, 'token.json');

    // Ensure the directory exists
    if (!fs.existsSync(tokenDir)) {
      fs.mkdirSync(tokenDir, { recursive: true });
    }

    this.loadToken();
  }

  /**
   * Loads the token from the file system
   */
  private loadToken(): void {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const tokenData = fs.readFileSync(this.tokenFilePath, 'utf8');
        this.token = JSON.parse(tokenData);
        console.error(`🔍 Loaded token from file: ${this.tokenFilePath}`);
      } else {
        console.error(`🔍 No token file found at: ${this.tokenFilePath}`);
        this.token = null;
      }
    } catch (error) {
      console.error(`❌ Failed to load token from file: ${error}`);
      this.token = null;
    }
  }

  /**
   * Saves the token to the file system
   */
  private saveToken(): void {
    try {
      if (this.token) {
        fs.writeFileSync(this.tokenFilePath, JSON.stringify(this.token, null, 2), 'utf8');
        console.error(`✅ Saved token to file: ${this.tokenFilePath}`);
      } else {
        // Remove the file if no token exists
        if (fs.existsSync(this.tokenFilePath)) {
          fs.unlinkSync(this.tokenFilePath);
          console.error(`🗑️ Removed token file: ${this.tokenFilePath}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to save token to file: ${error}`);
    }
  }

  /**
   * Retrieves the cached token (ignores scopes since we use a global token)
   */
  getToken(scopes: string[]): CachedToken | null {
    // We ignore the scopes parameter since we use a single token with all scopes
    return this.token;
  }

  /**
   * Stores the global token in the cache and persists it to file
   */
  setToken(scopes: string[], token: OAuthTokenResponse): void {
    // We ignore the scopes parameter since we use a single token with all scopes
    this.token = {
      access_token: token.access_token!,
      refresh_token: token.refresh_token,
      expires_at: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
      scopes: [...scopes], // Store the actual scopes that were granted
    };

    this.saveToken();
  }

  /**
   * Removes the cached token and deletes the file
   */
  clearToken(scopes?: string[]): void {
    // We ignore the scopes parameter since we use a single global token
    this.token = null;
    this.saveToken();
  }

  /**
   * Checks if the token exists and is still valid (not expired)
   */
  isTokenValid(scopes: string[]): boolean {
    // We ignore the scopes parameter since we use a single token with all scopes
    if (!this.token) {
      console.error(`🔍 Token validation: No token in cache`);
      return false;
    }

    // If no expiration time is set, assume token is valid
    if (!this.token.expires_at) {
      console.error(`🔍 Token validation: Token has no expiration, assuming valid`);
      return true;
    }

    // Add a 30-second buffer to avoid using tokens that are about to expire
    const bufferMs = 30 * 1000; // 30 seconds
    const now = Date.now();
    const expiresAt = this.token.expires_at;
    const isValid = now + bufferMs < expiresAt;

    return isValid;
  }
}

// Global token cache instance - uses file-based persistence
export const globalTokenCache = new FileTokenCache();

import { InMemoryTokenCache, KeychainTokenCache, getOrCreateKeychainCache } from './token-cache';
import { OAuthTokenResponse } from './types';

// Mock @napi-rs/keyring/keytar (the keytar-compatible shim) to avoid needing the native module in tests
jest.mock('@napi-rs/keyring/keytar', () => ({
  getPassword: jest.fn(),
  setPassword: jest.fn(),
  deletePassword: jest.fn(),
}));

import * as keyring from '@napi-rs/keyring/keytar';
const mockGetPassword = keyring.getPassword as jest.MockedFunction<typeof keyring.getPassword>;
const mockSetPassword = keyring.setPassword as jest.MockedFunction<typeof keyring.setPassword>;
const mockDeletePassword = keyring.deletePassword as jest.MockedFunction<typeof keyring.deletePassword>;

const mockTokenResponse: OAuthTokenResponse = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

const scopes = ['scope1', 'scope2'];

describe('InMemoryTokenCache', () => {
  let cache: InMemoryTokenCache;

  beforeEach(() => {
    cache = new InMemoryTokenCache();
  });

  it('returns null when no token is cached', () => {
    expect(cache.getToken(scopes)).toBeNull();
  });

  it('stores and retrieves a token', () => {
    cache.setToken(scopes, mockTokenResponse);
    const token = cache.getToken(scopes);
    expect(token).not.toBeNull();
    expect(token!.access_token).toBe('test-access-token');
    expect(token!.refresh_token).toBe('test-refresh-token');
  });

  it('isTokenValid returns false when no token', () => {
    expect(cache.isTokenValid(scopes)).toBe(false);
  });

  it('isTokenValid returns true for a fresh token', () => {
    cache.setToken(scopes, mockTokenResponse);
    expect(cache.isTokenValid(scopes)).toBe(true);
  });

  it('isTokenValid returns false for an expired token', () => {
    const expiredResponse: OAuthTokenResponse = {
      ...mockTokenResponse,
      expires_in: -100, // already expired
    };
    cache.setToken(scopes, expiredResponse);
    // The token's expires_at should be in the past
    const token = cache.getToken(scopes);
    expect(token).not.toBeNull();
    // Manually set expires_at to the past to simulate expiry
    token!.expires_at = Date.now() - 60000;
    expect(cache.isTokenValid(scopes)).toBe(false);
  });

  it('clearToken removes the cached token', () => {
    cache.setToken(scopes, mockTokenResponse);
    cache.clearToken();
    expect(cache.getToken(scopes)).toBeNull();
    expect(cache.isTokenValid(scopes)).toBe(false);
  });
});

describe('KeychainTokenCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetPassword.mockResolvedValue(null);
    mockSetPassword.mockResolvedValue(undefined);
    mockDeletePassword.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null before initialization', () => {
    const cache = new KeychainTokenCache('test-account');
    expect(cache.getToken(scopes)).toBeNull();
  });

  it('loads a stored token from keychain on initialize', async () => {
    const storedToken = {
      access_token: 'stored-access-token',
      refresh_token: 'stored-refresh-token',
      expires_at: Date.now() + 3600000,
      scopes,
    };
    mockGetPassword.mockResolvedValue(JSON.stringify(storedToken));

    const cache = new KeychainTokenCache('test-account');
    await cache.initialize();

    const token = cache.getToken(scopes);
    expect(token).not.toBeNull();
    expect(token!.access_token).toBe('stored-access-token');
    expect(mockGetPassword).toHaveBeenCalledWith('dynatrace-mcp', 'test-account');
  });

  it('does not throw when keychain has no stored token', async () => {
    mockGetPassword.mockResolvedValue(null);

    const cache = new KeychainTokenCache('test-account');
    await cache.initialize();

    expect(cache.getToken(scopes)).toBeNull();
  });

  it('handles corrupted keychain data gracefully', async () => {
    mockGetPassword.mockResolvedValue('not-valid-json{{{');

    const cache = new KeychainTokenCache('test-account');
    await cache.initialize();

    // Should not throw; token remains null
    expect(cache.getToken(scopes)).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load token from OS keychain'));
  });

  it('persists a new token to keychain when setToken is called', async () => {
    const cache = new KeychainTokenCache('test-account');
    await cache.initialize();

    cache.setToken(scopes, mockTokenResponse);

    // Allow the async persist to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSetPassword).toHaveBeenCalledWith('dynatrace-mcp', 'test-account', expect.any(String));
    const savedData = JSON.parse(mockSetPassword.mock.calls[0][2]);
    expect(savedData.access_token).toBe('test-access-token');
    expect(savedData.refresh_token).toBe('test-refresh-token');
  });

  it('deletes the token from keychain when clearToken is called', async () => {
    const cache = new KeychainTokenCache('test-account');
    await cache.initialize();

    cache.setToken(scopes, mockTokenResponse);
    cache.clearToken();

    // Allow the async delete to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockDeletePassword).toHaveBeenCalledWith('dynatrace-mcp', 'test-account');
    expect(cache.getToken(scopes)).toBeNull();
  });

  it('isTokenValid returns true for a valid cached token', async () => {
    const storedToken = {
      access_token: 'valid-token',
      expires_at: Date.now() + 3600000,
      scopes,
    };
    mockGetPassword.mockResolvedValue(JSON.stringify(storedToken));

    const cache = new KeychainTokenCache('test-account');
    await cache.initialize();

    expect(cache.isTokenValid(scopes)).toBe(true);
  });

  it('isTokenValid returns false for an expired cached token', async () => {
    const storedToken = {
      access_token: 'expired-token',
      expires_at: Date.now() - 60000, // expired 1 minute ago
      scopes,
    };
    mockGetPassword.mockResolvedValue(JSON.stringify(storedToken));

    const cache = new KeychainTokenCache('test-account');
    await cache.initialize();

    expect(cache.isTokenValid(scopes)).toBe(false);
  });
});

describe('getOrCreateKeychainCache', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetPassword.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the same instance for the same account', async () => {
    // Both calls with the same account should resolve to the same object
    const [cache1, cache2] = await Promise.all([getOrCreateKeychainCache('same-account'), getOrCreateKeychainCache('same-account')]);
    expect(cache1).toBe(cache2);
  });

  it('returns different instances for different accounts', async () => {
    const cacheA = await getOrCreateKeychainCache('unique-account-a');
    const cacheB = await getOrCreateKeychainCache('unique-account-b');
    expect(cacheA).not.toBe(cacheB);
  });
});

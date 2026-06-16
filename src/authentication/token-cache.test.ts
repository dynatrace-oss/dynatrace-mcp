import {
  InMemoryTokenCache,
  KeychainTokenCache,
  getOrCreateKeychainCache,
  FileTokenCache,
  getOrCreateTokenCache,
} from './token-cache';
import { OAuthTokenResponse } from './types';

// Mock @napi-rs/keyring/keytar (the keytar-compatible shim) to avoid needing the native module in tests.
// virtual: true is required because the package may not be physically installed (optional native dep).
jest.mock(
  '@napi-rs/keyring/keytar',
  () => ({
    getPassword: jest.fn(),
    setPassword: jest.fn(),
    deletePassword: jest.fn(),
  }),
  { virtual: true },
);

// Mock node:fs/promises so FileTokenCache tests don't touch the real filesystem
jest.mock('node:fs/promises');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const keyring = require('@napi-rs/keyring/keytar') as {
  getPassword: jest.Mock;
  setPassword: jest.Mock;
  deletePassword: jest.Mock;
};
import fsPromises from 'node:fs/promises';
const mockFs = fsPromises as jest.Mocked<typeof fsPromises>;
const mockGetPassword: jest.Mock = keyring.getPassword;
const mockSetPassword: jest.Mock = keyring.setPassword;
const mockDeletePassword: jest.Mock = keyring.deletePassword;

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

  it('rejects structurally invalid keychain data', async () => {
    mockGetPassword.mockResolvedValue(JSON.stringify({ not_a_token: true }));

    const cache = new KeychainTokenCache('test-account');
    await cache.initialize();

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
    const [cache1, cache2] = await Promise.all([
      getOrCreateKeychainCache('same-account'),
      getOrCreateKeychainCache('same-account'),
    ]);
    expect(cache1).toBe(cache2);
  });

  it('returns different instances for different accounts', async () => {
    const cacheA = await getOrCreateKeychainCache('unique-account-a');
    const cacheB = await getOrCreateKeychainCache('unique-account-b');
    expect(cacheA).not.toBe(cacheB);
  });
});

describe('FileTokenCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null before initialization', () => {
    const cache = new FileTokenCache('test-account');
    expect(cache.getToken(scopes)).toBeNull();
  });

  it('loads a stored token from file on initialize', async () => {
    const storedToken = {
      access_token: 'file-access-token',
      refresh_token: 'file-refresh-token',
      expires_at: Date.now() + 3600000,
      scopes,
    };
    (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(storedToken));

    const cache = new FileTokenCache('test-account');
    await cache.initialize();

    const token = cache.getToken(scopes);
    expect(token).not.toBeNull();
    expect(token!.access_token).toBe('file-access-token');
  });

  it('does not throw when no cache file exists (ENOENT)', async () => {
    const cache = new FileTokenCache('test-account');
    await cache.initialize();

    expect(cache.getToken(scopes)).toBeNull();
    // ENOENT should not be logged as a warning
    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining('Failed to load token'));
  });

  it('logs a warning for unexpected read errors', async () => {
    mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

    const cache = new FileTokenCache('test-account');
    await cache.initialize();

    expect(cache.getToken(scopes)).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load token from file cache'));
  });

  it('handles corrupted file data gracefully', async () => {
    (mockFs.readFile as jest.Mock).mockResolvedValue('not-valid-json{{{');

    const cache = new FileTokenCache('test-account');
    await cache.initialize();

    expect(cache.getToken(scopes)).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load token from file cache'));
  });

  it('rejects structurally invalid file data', async () => {
    (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ not_a_token: true }));

    const cache = new FileTokenCache('test-account');
    await cache.initialize();

    expect(cache.getToken(scopes)).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load token from file cache'));
  });

  it('persists a new token to file when setToken is called', async () => {
    const cache = new FileTokenCache('test-account');
    await cache.initialize();

    cache.setToken(scopes, mockTokenResponse);

    // Allow the async persist to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFs.mkdir).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('token-test-account.json'),
      expect.any(String),
      { mode: 0o600 },
    );
    const savedData = JSON.parse(mockFs.writeFile.mock.calls[0][1] as string);
    expect(savedData.access_token).toBe('test-access-token');
  });

  it('deletes the cache file when clearToken is called', async () => {
    const cache = new FileTokenCache('test-account');
    await cache.initialize();

    cache.setToken(scopes, mockTokenResponse);
    cache.clearToken();

    // Allow the async delete to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('token-test-account.json'));
    expect(cache.getToken(scopes)).toBeNull();
  });

  it('sanitizes special characters in account name for the filename', async () => {
    const cache = new FileTokenCache('client@example.com:8080');
    cache.setToken(scopes, mockTokenResponse);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('token-client_example_com_8080.json'),
      expect.any(String),
      { mode: 0o600 },
    );
  });

  it('isTokenValid returns true for a valid token', async () => {
    const storedToken = { access_token: 'valid', expires_at: Date.now() + 3600000, scopes };
    (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(storedToken));

    const cache = new FileTokenCache('test-account');
    await cache.initialize();

    expect(cache.isTokenValid(scopes)).toBe(true);
  });

  it('isTokenValid returns false for an expired token', async () => {
    const storedToken = { access_token: 'expired', expires_at: Date.now() - 60000, scopes };
    (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(storedToken));

    const cache = new FileTokenCache('test-account');
    await cache.initialize();

    expect(cache.isTokenValid(scopes)).toBe(false);
  });
});

describe('getOrCreateTokenCache', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetPassword.mockResolvedValue(null);
    mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    mockFs.mkdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.DT_MCP_TOKEN_STORAGE;
  });

  it('returns a KeychainTokenCache by default', async () => {
    delete process.env.DT_MCP_TOKEN_STORAGE;
    const cache = await getOrCreateTokenCache('selector-keychain-account');
    expect(cache).toBeInstanceOf(KeychainTokenCache);
  });

  it('returns a FileTokenCache when DT_MCP_TOKEN_STORAGE=file', async () => {
    process.env.DT_MCP_TOKEN_STORAGE = 'file';
    const cache = await getOrCreateTokenCache('selector-file-account');
    expect(cache).toBeInstanceOf(FileTokenCache);
  });
});

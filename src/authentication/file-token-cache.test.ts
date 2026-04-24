import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { FileTokenCache, DEFAULT_TOKEN_FILE_PATH } from './file-token-cache';
import { OAuthTokenResponse } from './types';

jest.mock('node:fs');
jest.mock('node:os', () => ({ homedir: () => '/home/testuser' }));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;

const TEST_FILE_PATH = '/tmp/test/.tokens.json';

const SAMPLE_TOKEN_RESPONSE: OAuthTokenResponse = {
  access_token: 'at-123',
  refresh_token: 'rt-456',
  expires_in: 3600,
  scope: 'storage:logs:read',
};

const SAMPLE_SCOPES = ['storage:logs:read'];

describe('FileTokenCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Default: file does not exist
    mockExistsSync.mockReturnValue(false);
    mockMkdirSync.mockReturnValue(undefined as any);
    mockWriteFileSync.mockReturnValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // DEFAULT_TOKEN_FILE_PATH
  // ---------------------------------------------------------------------------
  describe('DEFAULT_TOKEN_FILE_PATH', () => {
    it('should be under the home directory', () => {
      expect(DEFAULT_TOKEN_FILE_PATH).toContain('.dt-mcp');
      expect(DEFAULT_TOKEN_FILE_PATH).toContain('.tokens.json');
    });
  });

  // ---------------------------------------------------------------------------
  // Constructor / loadFromDisk
  // ---------------------------------------------------------------------------
  describe('constructor', () => {
    it('starts empty when the token file does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      const cache = new FileTokenCache(TEST_FILE_PATH);
      expect(cache.getToken(SAMPLE_SCOPES)).toBeNull();
    });

    it('loads a valid token from disk on construction', () => {
      const onDisk = {
        tokens: [
          {
            access_token: 'at-loaded',
            refresh_token: 'rt-loaded',
            expires_at: Date.now() + 60_000,
            scopes: SAMPLE_SCOPES,
          },
        ],
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(onDisk));

      const cache = new FileTokenCache(TEST_FILE_PATH);
      const token = cache.getToken(SAMPLE_SCOPES);
      expect(token).not.toBeNull();
      expect(token!.access_token).toBe('at-loaded');
      expect(token!.refresh_token).toBe('rt-loaded');
    });

    it('prints a warning and starts empty when the file contains invalid JSON', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('not-valid-json{{{');

      const cache = new FileTokenCache(TEST_FILE_PATH);
      expect(cache.getToken(SAMPLE_SCOPES)).toBeNull();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Warning'));
    });

    it('starts empty when the file exists but tokens array is empty', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ tokens: [] }));

      const cache = new FileTokenCache(TEST_FILE_PATH);
      expect(cache.getToken(SAMPLE_SCOPES)).toBeNull();
    });

    it('does not throw when readFileSync throws a non-JSON error', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      expect(() => new FileTokenCache(TEST_FILE_PATH)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // setToken / getToken
  // ---------------------------------------------------------------------------
  describe('setToken', () => {
    it('stores the token in memory and persists it to disk', () => {
      mockExistsSync.mockReturnValue(false);
      const cache = new FileTokenCache(TEST_FILE_PATH);

      cache.setToken(SAMPLE_SCOPES, SAMPLE_TOKEN_RESPONSE);

      const token = cache.getToken(SAMPLE_SCOPES);
      expect(token).not.toBeNull();
      expect(token!.access_token).toBe('at-123');
      expect(token!.refresh_token).toBe('rt-456');
      expect(typeof token!.expires_at).toBe('number');

      expect(mockWriteFileSync).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      expect(writtenContent.tokens).toHaveLength(1);
      expect(writtenContent.tokens[0].access_token).toBe('at-123');
    });

    it('sets expires_at to undefined when expires_in is absent', () => {
      mockExistsSync.mockReturnValue(false);
      const cache = new FileTokenCache(TEST_FILE_PATH);

      const noExpiry: OAuthTokenResponse = { access_token: 'at-noexp', refresh_token: 'rt-noexp' };
      cache.setToken(SAMPLE_SCOPES, noExpiry);

      expect(cache.getToken(SAMPLE_SCOPES)!.expires_at).toBeUndefined();
    });

    it('creates the directory if it does not exist', () => {
      // First call is for the dir check in saveToDisk
      mockExistsSync.mockReturnValue(false);
      const cache = new FileTokenCache(TEST_FILE_PATH);
      cache.setToken(SAMPLE_SCOPES, SAMPLE_TOKEN_RESPONSE);

      expect(mockMkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('does not throw when writeFileSync fails', () => {
      mockExistsSync.mockReturnValue(false);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const cache = new FileTokenCache(TEST_FILE_PATH);
      expect(() => cache.setToken(SAMPLE_SCOPES, SAMPLE_TOKEN_RESPONSE)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // clearToken
  // ---------------------------------------------------------------------------
  describe('clearToken', () => {
    it('removes the token from memory and writes an empty tokens array', () => {
      mockExistsSync.mockReturnValue(false);
      const cache = new FileTokenCache(TEST_FILE_PATH);
      cache.setToken(SAMPLE_SCOPES, SAMPLE_TOKEN_RESPONSE);

      cache.clearToken();

      expect(cache.getToken(SAMPLE_SCOPES)).toBeNull();
      const writtenContent = JSON.parse(mockWriteFileSync.mock.calls.at(-1)![1] as string);
      expect(writtenContent.tokens).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // isTokenValid
  // ---------------------------------------------------------------------------
  describe('isTokenValid', () => {
    it('returns false when there is no token', () => {
      const cache = new FileTokenCache(TEST_FILE_PATH);
      expect(cache.isTokenValid(SAMPLE_SCOPES)).toBe(false);
    });

    it('returns true when token has no expiry', () => {
      const cache = new FileTokenCache(TEST_FILE_PATH);
      cache.setToken(SAMPLE_SCOPES, { access_token: 'at', refresh_token: 'rt' }); // no expires_in
      expect(cache.isTokenValid(SAMPLE_SCOPES)).toBe(true);
    });

    it('returns true when token expires far in the future', () => {
      const cache = new FileTokenCache(TEST_FILE_PATH);
      cache.setToken(SAMPLE_SCOPES, { ...SAMPLE_TOKEN_RESPONSE, expires_in: 7200 });
      expect(cache.isTokenValid(SAMPLE_SCOPES)).toBe(true);
    });

    it('returns false when token has already expired (including 30s buffer)', () => {
      const onDisk = {
        tokens: [
          {
            access_token: 'at-expired',
            expires_at: Date.now() - 1000, // expired in the past
            scopes: SAMPLE_SCOPES,
          },
        ],
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(onDisk));

      const cache = new FileTokenCache(TEST_FILE_PATH);
      expect(cache.isTokenValid(SAMPLE_SCOPES)).toBe(false);
    });
  });
});

import { configureProxyFromEnvironment, shouldBypassProxy } from './proxy-config';

// Mock undici
jest.mock('undici', () => ({
  ProxyAgent: jest.fn(),
  setGlobalDispatcher: jest.fn(),
  getGlobalDispatcher: jest.fn(),
}));

import { ProxyAgent, setGlobalDispatcher } from 'undici';

describe('proxy-config', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear all proxy-related env vars
    delete process.env.https_proxy;
    delete process.env.HTTPS_PROXY;
    delete process.env.http_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.no_proxy;
    delete process.env.NO_PROXY;

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('configureProxyFromEnvironment', () => {
    it('should configure proxy when HTTPS_PROXY is set', () => {
      process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';

      configureProxyFromEnvironment();

      expect(ProxyAgent).toHaveBeenCalledWith({
        uri: 'http://proxy.example.com:8080',
      });
      expect(setGlobalDispatcher).toHaveBeenCalled();
    });

    it('should configure proxy when https_proxy is set (lowercase)', () => {
      process.env.https_proxy = 'http://proxy.example.com:8080';

      configureProxyFromEnvironment();

      expect(ProxyAgent).toHaveBeenCalledWith({
        uri: 'http://proxy.example.com:8080',
      });
      expect(setGlobalDispatcher).toHaveBeenCalled();
    });

    it('should prefer HTTPS_PROXY over HTTP_PROXY', () => {
      process.env.HTTPS_PROXY = 'http://https-proxy.example.com:8443';
      process.env.HTTP_PROXY = 'http://http-proxy.example.com:8080';

      configureProxyFromEnvironment();

      expect(ProxyAgent).toHaveBeenCalledWith({
        uri: 'http://https-proxy.example.com:8443',
      });
    });

    it('should fall back to HTTP_PROXY if HTTPS_PROXY is not set', () => {
      process.env.HTTP_PROXY = 'http://proxy.example.com:8080';

      configureProxyFromEnvironment();

      expect(ProxyAgent).toHaveBeenCalledWith({
        uri: 'http://proxy.example.com:8080',
      });
    });

    it('should not configure proxy when no proxy env vars are set', () => {
      configureProxyFromEnvironment();

      expect(ProxyAgent).not.toHaveBeenCalled();
      expect(setGlobalDispatcher).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
      const mockProxyAgent = ProxyAgent as unknown as jest.Mock;
      mockProxyAgent.mockImplementation(() => {
        throw new Error('ProxyAgent error');
      });

      // Should not throw
      expect(() => configureProxyFromEnvironment()).not.toThrow();

      // Should still attempt to create ProxyAgent
      expect(ProxyAgent).toHaveBeenCalled();
      // Should not set dispatcher if ProxyAgent creation fails
      expect(setGlobalDispatcher).not.toHaveBeenCalled();
    });
  });

  describe('shouldBypassProxy', () => {
    it('should return false when no_proxy is not set', () => {
      expect(shouldBypassProxy('example.com')).toBe(false);
      expect(shouldBypassProxy('localhost')).toBe(false);
    });

    it('should return true for exact match', () => {
      process.env.no_proxy = 'localhost,example.com';

      expect(shouldBypassProxy('localhost')).toBe(true);
      expect(shouldBypassProxy('example.com')).toBe(true);
    });

    it('should return true for wildcard (*)', () => {
      process.env.no_proxy = '*';

      expect(shouldBypassProxy('any-host.com')).toBe(true);
      expect(shouldBypassProxy('localhost')).toBe(true);
    });

    it('should handle domain patterns (starting with .)', () => {
      process.env.no_proxy = '.example.com';

      expect(shouldBypassProxy('sub.example.com')).toBe(true);
      expect(shouldBypassProxy('example.com')).toBe(true);
      expect(shouldBypassProxy('other.com')).toBe(false);
    });

    it('should handle wildcard subdomain patterns (*.domain)', () => {
      process.env.no_proxy = '*.example.com';

      expect(shouldBypassProxy('sub.example.com')).toBe(true);
      expect(shouldBypassProxy('example.com')).toBe(true);
      expect(shouldBypassProxy('other.com')).toBe(false);
    });

    it('should handle multiple patterns', () => {
      process.env.no_proxy = 'localhost,127.0.0.1,.local,*.internal.com';

      expect(shouldBypassProxy('localhost')).toBe(true);
      expect(shouldBypassProxy('127.0.0.1')).toBe(true);
      expect(shouldBypassProxy('service.local')).toBe(true);
      expect(shouldBypassProxy('api.internal.com')).toBe(true);
      expect(shouldBypassProxy('example.com')).toBe(false);
    });

    it('should handle patterns with spaces', () => {
      process.env.no_proxy = 'localhost, 127.0.0.1 , .local';

      expect(shouldBypassProxy('localhost')).toBe(true);
      expect(shouldBypassProxy('127.0.0.1')).toBe(true);
      expect(shouldBypassProxy('service.local')).toBe(true);
    });

    it('should use NO_PROXY (uppercase) if no_proxy is not set', () => {
      process.env.NO_PROXY = 'localhost';

      expect(shouldBypassProxy('localhost')).toBe(true);
    });
  });
});

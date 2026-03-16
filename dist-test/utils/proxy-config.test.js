'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const proxy_config_1 = require('./proxy-config');
// Mock undici
jest.mock('undici', () => ({
  ProxyAgent: jest.fn(),
  setGlobalDispatcher: jest.fn(),
  getGlobalDispatcher: jest.fn(),
}));
const undici_1 = require('undici');
describe('proxy-config', () => {
  let originalEnv;
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
      (0, proxy_config_1.configureProxyFromEnvironment)();
      expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
        uri: 'http://proxy.example.com:8080',
      });
      expect(undici_1.setGlobalDispatcher).toHaveBeenCalled();
    });
    it('should configure proxy when https_proxy is set (lowercase)', () => {
      process.env.https_proxy = 'http://proxy.example.com:8080';
      (0, proxy_config_1.configureProxyFromEnvironment)();
      expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
        uri: 'http://proxy.example.com:8080',
      });
      expect(undici_1.setGlobalDispatcher).toHaveBeenCalled();
    });
    it('should prefer HTTPS_PROXY over HTTP_PROXY', () => {
      process.env.HTTPS_PROXY = 'http://https-proxy.example.com:8443';
      process.env.HTTP_PROXY = 'http://http-proxy.example.com:8080';
      (0, proxy_config_1.configureProxyFromEnvironment)();
      expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
        uri: 'http://https-proxy.example.com:8443',
      });
    });
    it('should fall back to HTTP_PROXY if HTTPS_PROXY is not set', () => {
      process.env.HTTP_PROXY = 'http://proxy.example.com:8080';
      (0, proxy_config_1.configureProxyFromEnvironment)();
      expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
        uri: 'http://proxy.example.com:8080',
      });
    });
    it('should not configure proxy when no proxy env vars are set', () => {
      (0, proxy_config_1.configureProxyFromEnvironment)();
      expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
      expect(undici_1.setGlobalDispatcher).not.toHaveBeenCalled();
    });
    it('should handle errors gracefully', () => {
      process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
      const mockProxyAgent = undici_1.ProxyAgent;
      mockProxyAgent.mockImplementation(() => {
        throw new Error('ProxyAgent error');
      });
      // Should not throw
      expect(() => (0, proxy_config_1.configureProxyFromEnvironment)()).not.toThrow();
      // Should still attempt to create ProxyAgent
      expect(undici_1.ProxyAgent).toHaveBeenCalled();
      // Should not set dispatcher if ProxyAgent creation fails
      expect(undici_1.setGlobalDispatcher).not.toHaveBeenCalled();
    });
  });
});

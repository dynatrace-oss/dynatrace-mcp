import { isRunningInCodespaces, getCodespacesForwardedUrl } from './environment-detection';

describe('isRunningInCodespaces', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
  });

  it('should return true when both CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN are set', () => {
    process.env.CODESPACE_NAME = 'my-codespace';
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'app.github.dev';

    expect(isRunningInCodespaces()).toBe(true);
  });

  it('should return false when CODESPACE_NAME is missing', () => {
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'app.github.dev';
    // CODESPACE_NAME is not set

    expect(isRunningInCodespaces()).toBe(false);
  });

  it('should return false when GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN is missing', () => {
    process.env.CODESPACE_NAME = 'my-codespace';
    // GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN is not set

    expect(isRunningInCodespaces()).toBe(false);
  });

  it('should return false when both environment variables are missing', () => {
    // Neither CODESPACE_NAME nor GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN are set

    expect(isRunningInCodespaces()).toBe(false);
  });

  it('should return false when CODESPACE_NAME is empty string', () => {
    process.env.CODESPACE_NAME = '';
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'app.github.dev';

    expect(isRunningInCodespaces()).toBe(false);
  });

  it('should return false when GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN is empty string', () => {
    process.env.CODESPACE_NAME = 'my-codespace';
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = '';

    expect(isRunningInCodespaces()).toBe(false);
  });
});

describe('getCodespacesForwardedUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
  });

  it('should return the correct forwarded URL when running in Codespaces', () => {
    process.env.CODESPACE_NAME = 'my-codespace';
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'app.github.dev';

    const result = getCodespacesForwardedUrl(8080);

    expect(result).toBe('https://my-codespace-8080.app.github.dev');
  });

  it('should return null when not running in Codespaces', () => {
    // Neither environment variable is set

    const result = getCodespacesForwardedUrl(8080);

    expect(result).toBeNull();
  });

  it('should return null when CODESPACE_NAME is missing', () => {
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'app.github.dev';

    const result = getCodespacesForwardedUrl(8080);

    expect(result).toBeNull();
  });

  it('should return null when GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN is missing', () => {
    process.env.CODESPACE_NAME = 'my-codespace';

    const result = getCodespacesForwardedUrl(8080);

    expect(result).toBeNull();
  });

  it('should handle different port numbers correctly', () => {
    process.env.CODESPACE_NAME = 'test-codespace';
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'preview.app.github.dev';

    expect(getCodespacesForwardedUrl(3000)).toBe('https://test-codespace-3000.preview.app.github.dev');
    expect(getCodespacesForwardedUrl(5344)).toBe('https://test-codespace-5344.preview.app.github.dev');
    expect(getCodespacesForwardedUrl(9999)).toBe('https://test-codespace-9999.preview.app.github.dev');
  });

  it('should handle codespace names with special characters', () => {
    process.env.CODESPACE_NAME = 'my-special_codespace.v1';
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'app.github.dev';

    const result = getCodespacesForwardedUrl(8080);

    expect(result).toBe('https://my-special_codespace.v1-8080.app.github.dev');
  });

  it('should handle different domain formats', () => {
    process.env.CODESPACE_NAME = 'codespace-123';
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'githubpreview.dev';

    const result = getCodespacesForwardedUrl(4000);

    expect(result).toBe('https://codespace-123-4000.githubpreview.dev');
  });
});

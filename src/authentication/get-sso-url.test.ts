import { getSSOUrl } from './get-sso-url';

// Mock the global fetch function
global.fetch = jest.fn();

describe('getSSOUrl', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DT_SSO_URL;
  });

  it('should return SSO URL from environment variable if set', async () => {
    process.env.DT_SSO_URL = 'https://custom-sso.example.com';

    const result = await getSSOUrl('https://abc12345.live.dynatrace.com');

    expect(result).toBe('https://custom-sso.example.com');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should discover SSO URL by following redirect', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: new Headers({
        location: 'https://sso.dynatrace.com/sso/oauth2/authorize?params=123',
      }),
    } as Response);

    const result = await getSSOUrl('https://abc12345.live.dynatrace.com');

    expect(result).toBe('https://sso.dynatrace.com');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://abc12345.live.dynatrace.com/platform/oauth2/authorization/dynatrace-sso',
      {
        method: 'HEAD',
        redirect: 'manual',
      },
    );
  });

  it('should handle sprint environment SSO URL', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: new Headers({
        location: 'https://sso.sprint.dynatracelabs.com/sso/oauth2/authorize',
      }),
    } as Response);

    const result = await getSSOUrl('https://abc12345.sprint.dynatracelabs.com');

    expect(result).toBe('https://sso.sprint.dynatracelabs.com');
  });

  it('should handle dev environment SSO URL', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: new Headers({
        location: 'https://sso.dev.dynatracelabs.com/sso/oauth2/authorize',
      }),
    } as Response);

    const result = await getSSOUrl('https://abc12345.dev.dynatracelabs.com');

    expect(result).toBe('https://sso.dev.dynatracelabs.com');
  });

  it('should return default SSO URL if no redirect', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Headers(),
    } as Response);

    const result = await getSSOUrl('https://abc12345.live.dynatrace.com');

    expect(result).toBe('https://sso.dynatrace.com');
  });

  it('should return default SSO URL if no location header in redirect', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: new Headers(),
    } as Response);

    const result = await getSSOUrl('https://abc12345.live.dynatrace.com');

    expect(result).toBe('https://sso.dynatrace.com');
  });

  it('should return default SSO URL on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await getSSOUrl('https://abc12345.live.dynatrace.com');

    expect(result).toBe('https://sso.dynatrace.com');
  });

  it('should handle 301 permanent redirect', async () => {
    mockFetch.mockResolvedValue({
      status: 301,
      headers: new Headers({
        location: 'https://sso.dynatrace.com/sso/oauth2/authorize',
      }),
    } as Response);

    const result = await getSSOUrl('https://abc12345.live.dynatrace.com');

    expect(result).toBe('https://sso.dynatrace.com');
  });

  it('should handle 307 temporary redirect', async () => {
    mockFetch.mockResolvedValue({
      status: 307,
      headers: new Headers({
        location: 'https://sso.dynatrace.com/sso/oauth2/authorize',
      }),
    } as Response);

    const result = await getSSOUrl('https://abc12345.live.dynatrace.com');

    expect(result).toBe('https://sso.dynatrace.com');
  });
});

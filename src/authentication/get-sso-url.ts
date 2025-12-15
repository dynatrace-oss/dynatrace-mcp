/**
 * Retrieves the SSO URL for a given Dynatrace environment by following the OAuth redirect
 * @param environmentUrl The Dynatrace environment URL (e.g., https://abc12345.live.dynatrace.com)
 * @returns The SSO base URL (e.g., https://sso.dynatrace.com)
 */
export async function getSSOUrl(environmentUrl: string): Promise<string> {
  // Default SSO URL for most Dynatrace SaaS environments
  const defaultSSOUrl = 'https://sso.dynatrace.com';

  // Allow override via environment variable for special cases (managed, sprint, dev environments)
  const envOverride = process.env.DT_SSO_URL;
  if (envOverride) {
    console.error(`Using SSO URL from DT_SSO_URL environment variable: ${envOverride}`);
    return envOverride;
  }

  try {
    // Construct the OAuth authorization endpoint
    const authUrl = new URL(environmentUrl);
    authUrl.pathname = '/platform/oauth2/authorization/dynatrace-sso';

    // Make a HEAD request with redirect: 'manual' to get the Location header
    const response = await fetch(authUrl.toString(), {
      method: 'HEAD',
      redirect: 'manual', // Don't follow redirects automatically
    });

    // Check if we got a redirect response (3xx)
    if (response.status >= 300 && response.status < 400) {
      const locationHeader = response.headers.get('location');
      if (locationHeader) {
        const ssoUrl = new URL(locationHeader);
        return ssoUrl.origin;
      }
    }

    // If no redirect or location header, fall back to default
    console.error(`No redirect found when discovering SSO URL for ${environmentUrl}, using default: ${defaultSSOUrl}`);
    return defaultSSOUrl;
  } catch (error) {
    // On error, fall back to the default SSO URL
    console.error(
      `Error discovering SSO URL for ${environmentUrl}: ${error instanceof Error ? error.message : String(error)}. Using default: ${defaultSSOUrl}`,
    );
    return defaultSSOUrl;
  }
}

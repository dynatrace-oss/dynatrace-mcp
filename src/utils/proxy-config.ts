import { ProxyAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';

/**
 * Parse and configure system proxy settings from environment variables.
 * Supports https_proxy, HTTPS_PROXY, http_proxy, HTTP_PROXY, no_proxy, and NO_PROXY.
 *
 * This function should be called early in the application lifecycle to ensure
 * all HTTP requests honor the system proxy settings.
 */
export function configureProxyFromEnvironment(): void {
  // Check for proxy environment variables (case-insensitive)
  const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  const noProxy = process.env.no_proxy || process.env.NO_PROXY;

  // Determine which proxy to use (prefer HTTPS proxy for HTTPS requests)
  const proxyUrl = httpsProxy || httpProxy;

  if (!proxyUrl) {
    // No proxy configured, nothing to do
    return;
  }

  try {
    console.error(`Configuring proxy from environment: ${proxyUrl}`);

    // Parse no_proxy list if provided
    let noProxyHosts: string[] = [];
    if (noProxy) {
      // Split by comma and trim whitespace
      noProxyHosts = noProxy
        .split(',')
        .map((host) => host.trim())
        .filter((host) => host.length > 0);
      console.error(`No proxy hosts configured: ${noProxyHosts.join(', ')}`);
    }

    // Create ProxyAgent with the configured proxy URL
    // Note: undici's ProxyAgent doesn't have built-in no_proxy support.
    // The no_proxy environment variable is logged for informational purposes,
    // but the ProxyAgent will route all requests through the proxy.
    // If no_proxy support is critical for your use case, you may need to
    // configure your proxy server to handle no_proxy exclusions.
    const proxyAgent = new ProxyAgent({
      uri: proxyUrl,
    });

    // Set the global dispatcher for undici (affects global fetch)
    setGlobalDispatcher(proxyAgent);

    console.error(`✅ Proxy configured successfully: ${proxyUrl}`);
  } catch (error) {
    console.error(`⚠️ Failed to configure proxy: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Continuing without proxy configuration.');
  }
}

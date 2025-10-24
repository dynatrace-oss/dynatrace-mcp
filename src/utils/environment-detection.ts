/**
 * Utility functions for detecting and handling different runtime environments
 */

/**
 * Detects if the application is running in GitHub Codespaces
 * @returns true if running in Codespaces, false otherwise
 */
export function isRunningInCodespaces(): boolean {
  return !!(process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN);
}

/**
 * Gets the forwarded URL for OAuth redirect in GitHub Codespaces
 * @param port The port number to use in the forwarded URL
 * @returns The forwarded URL if in Codespaces, null otherwise
 */
export function getCodespacesForwardedUrl(port: number): string | null {
  if (!isRunningInCodespaces()) {
    return null;
  }

  const codespaceName = process.env.CODESPACE_NAME!;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN!;

  return `https://${codespaceName}-${port}.${domain}`;
}

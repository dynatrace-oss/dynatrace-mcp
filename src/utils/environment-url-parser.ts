/**
 * Parses a Dynatrace environment URL to extract the environment ID and stage.
 * @param dtEnvironmentUrl The Dynatrace environment URL (e.g., https://abc12345.apps.dynatrace.com)
 * @returns Object containing environmentId and stage
 */
export function parseEnvironmentUrl(dtEnvironmentUrl: string): { environmentId: string; stage: string } {
  try {
    const url = new URL(dtEnvironmentUrl);
    const hostname = url.hostname;

    // Extract environment ID (first part of the hostname)
    const parts = hostname.split('.');
    const environmentId = parts[0] || 'unknown';

    // Determine stage from the hostname
    // Check specific patterns after parsing to avoid substring matching issues
    let stage = 'prod'; // Default to prod

    // Check for sprint stage
    if (
      parts.includes('sprint') &&
      (hostname.endsWith('.apps.dynatracelabs.com') || hostname.endsWith('.dynatracelabs.com'))
    ) {
      stage = 'sprint';
    }
    // Check for dev stage
    else if (
      parts.includes('dev') &&
      (hostname.endsWith('.apps.dynatracelabs.com') || hostname.endsWith('.dynatracelabs.com'))
    ) {
      stage = 'dev';
    }
    // Check for hardening stage
    else if (
      parts.includes('hardening') &&
      (hostname.endsWith('.apps.dynatracelabs.com') || hostname.endsWith('.dynatracelabs.com'))
    ) {
      stage = 'hardening';
    }
    // If none of the above, it's production (apps.dynatrace.com or live.dynatrace.com)

    return { environmentId, stage };
  } catch (error) {
    // If URL parsing fails, return unknown values
    return { environmentId: 'unknown', stage: 'unknown' };
  }
}

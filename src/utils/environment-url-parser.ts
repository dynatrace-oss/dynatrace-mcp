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
    let stage = 'prod'; // Default to prod

    if (hostname.includes('.sprint.apps.dynatracelabs.com') || hostname.includes('.sprint.dynatracelabs.com')) {
      stage = 'sprint';
    } else if (hostname.includes('.dev.apps.dynatracelabs.com') || hostname.includes('.dev.dynatracelabs.com')) {
      stage = 'dev';
    } else if (
      hostname.includes('.hardening.apps.dynatracelabs.com') ||
      hostname.includes('.hardening.dynatracelabs.com')
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

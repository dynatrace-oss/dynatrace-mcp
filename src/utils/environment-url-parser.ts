/**
 * Parses a Dynatrace environment URL to extract the environment ID and stage.
 * @param dtEnvironmentUrl The Dynatrace environment URL (e.g., https://abc12345.apps.dynatrace.com)
 * @returns Object containing environmentId and stage
 */
type Stage = 'sprint' | 'dev' | 'prod' | 'unknown';
export function parseEnvironmentUrl(dtEnvironmentUrl: string): { environmentId: string; stage: Stage } {
  try {
    const url = new URL(dtEnvironmentUrl);
    const hostname = url.hostname;
    const parts = hostname.split('.');

    // Extract environment ID (first part of the hostname)
    const environmentId = parts[0] || 'unknown';

    // Determine stage based on URL pattern:
    // - ${environmentId}.${stage}.apps.dynatracelabs.com (stage given in URL)
    // - ${environmentId}.apps.dynatrace.com (stage inferred as 'prod')
    let stage: Stage = 'prod'; // Default to prod

    if (hostname.endsWith('.apps.dynatracelabs.com') && parts.length >= 4) {
      // Second part is the stage for dynatracelabs URLs
      const stagePart = parts[1];
      if (stagePart === 'sprint' || stagePart === 'dev') {
        stage = stagePart;
      }
    }

    return { environmentId, stage };
  } catch (error) {
    // If URL parsing fails, return unknown values
    return { environmentId: 'unknown', stage: 'unknown' };
  }
}

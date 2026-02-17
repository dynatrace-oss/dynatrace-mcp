import { parseEnvironmentUrl, createNotebooksURL } from './environment-url-parser';

describe('parseEnvironmentUrl', () => {
  it('should parse production environment URL (apps.dynatrace.com)', () => {
    const result = parseEnvironmentUrl('https://abc12345.apps.dynatrace.com');
    expect(result).toEqual({ environmentId: 'abc12345', stage: 'prod' });
  });

  it('should parse sprint environment URL', () => {
    const result = parseEnvironmentUrl('https://abc12345.sprint.apps.dynatracelabs.com');
    expect(result).toEqual({ environmentId: 'abc12345', stage: 'sprint' });
  });

  it('should parse dev environment URL', () => {
    const result = parseEnvironmentUrl('https://def67890.dev.apps.dynatracelabs.com');
    expect(result).toEqual({ environmentId: 'def67890', stage: 'dev' });
  });

  it('should handle URL with trailing slash', () => {
    const result = parseEnvironmentUrl('https://abc12345.apps.dynatrace.com/');
    expect(result).toEqual({ environmentId: 'abc12345', stage: 'prod' });
  });

  it('should handle invalid URL gracefully', () => {
    const result = parseEnvironmentUrl('not-a-valid-url');
    expect(result).toEqual({ environmentId: 'unknown', stage: 'unknown' });
  });

  it('should handle empty string gracefully', () => {
    const result = parseEnvironmentUrl('');
    expect(result).toEqual({ environmentId: 'unknown', stage: 'unknown' });
  });
});

describe('createNotebooksURL', () => {
  it('should create a valid Notebooks URL with a simple query', () => {
    const environmentUrl = 'https://abc12345.apps.dynatrace.com';
    const query = 'fetch events | limit 10';
    const result = createNotebooksURL(environmentUrl, query);

    expect(result).toContain('https://abc12345.apps.dynatrace.com/ui/intent/dynatrace.notebooks/view-query#');
    expect(result).toContain(encodeURIComponent('"dt.query":"fetch events | limit 10"'));
    expect(result).toContain(encodeURIComponent('"sourceApplication":"dynatrace.notebooks"'));
  });

  it('should handle environment URL with trailing slash', () => {
    const environmentUrl = 'https://abc12345.apps.dynatrace.com/';
    const query = 'fetch logs';
    const result = createNotebooksURL(environmentUrl, query);

    expect(result).toBe(
      `https://abc12345.apps.dynatrace.com/ui/intent/dynatrace.notebooks/view-query#${encodeURIComponent(
        JSON.stringify({
          'visualizationSettings': { autoSelectVisualization: true },
          'dt.query': query,
          'hideInput': false,
          'sourceApplication': 'dynatrace.notebooks',
        }),
      )}`,
    );
  });

  it('should properly encode query with special characters', () => {
    const environmentUrl = 'https://test123.apps.dynatrace.com';
    const query = 'fetch logs | filter status == "error" && message contains "test & demo"';
    const result = createNotebooksURL(environmentUrl, query);

    expect(result).toContain('https://test123.apps.dynatrace.com/ui/intent/dynatrace.notebooks/view-query#');
    // Verify the URL contains the encoded query
    const urlHash = result.split('#')[1];
    const decodedParams = JSON.parse(decodeURIComponent(urlHash));
    expect(decodedParams['dt.query']).toBe(query);
  });

  it('should include all required parameters in the URL', () => {
    const environmentUrl = 'https://env.apps.dynatrace.com';
    const query = 'fetch metrics';
    const result = createNotebooksURL(environmentUrl, query);

    const urlHash = result.split('#')[1];
    const decodedParams = JSON.parse(decodeURIComponent(urlHash));

    expect(decodedParams).toHaveProperty('visualizationSettings');
    expect(decodedParams['visualizationSettings']).toEqual({ autoSelectVisualization: true });
    expect(decodedParams['dt.query']).toBe(query);
    expect(decodedParams['hideInput']).toBe(false);
    expect(decodedParams['sourceApplication']).toBe('dynatrace.notebooks');
  });
});

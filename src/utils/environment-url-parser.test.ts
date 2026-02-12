import { parseEnvironmentUrl } from './environment-url-parser';

describe('parseEnvironmentUrl', () => {
  it('should parse production environment URL (apps.dynatrace.com)', () => {
    const result = parseEnvironmentUrl('https://abc12345.apps.dynatrace.com');
    expect(result).toEqual({ environmentId: 'abc12345', stage: 'prod' });
  });

  it('should parse production environment URL (live.dynatrace.com)', () => {
    const result = parseEnvironmentUrl('https://xyz98765.live.dynatrace.com');
    expect(result).toEqual({ environmentId: 'xyz98765', stage: 'prod' });
  });

  it('should parse sprint environment URL', () => {
    const result = parseEnvironmentUrl('https://abc12345.sprint.apps.dynatracelabs.com');
    expect(result).toEqual({ environmentId: 'abc12345', stage: 'sprint' });
  });

  it('should parse dev environment URL', () => {
    const result = parseEnvironmentUrl('https://def67890.dev.apps.dynatracelabs.com');
    expect(result).toEqual({ environmentId: 'def67890', stage: 'dev' });
  });

  it('should parse hardening environment URL', () => {
    const result = parseEnvironmentUrl('https://test123.hardening.apps.dynatracelabs.com');
    expect(result).toEqual({ environmentId: 'test123', stage: 'hardening' });
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

  it('should parse legacy sprint URL format', () => {
    const result = parseEnvironmentUrl('https://abc12345.sprint.dynatracelabs.com');
    expect(result).toEqual({ environmentId: 'abc12345', stage: 'sprint' });
  });

  it('should parse legacy dev URL format', () => {
    const result = parseEnvironmentUrl('https://abc12345.dev.dynatracelabs.com');
    expect(result).toEqual({ environmentId: 'abc12345', stage: 'dev' });
  });
});

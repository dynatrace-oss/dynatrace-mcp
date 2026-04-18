import { isValidHostTheme } from './theme';

describe('isValidHostTheme', () => {
  it('returns true for "light" and "dark"', () => {
    expect(isValidHostTheme('light')).toBe(true);
    expect(isValidHostTheme('dark')).toBe(true);
  });

  it('returns false for unknown strings', () => {
    expect(isValidHostTheme('system')).toBe(false);
    expect(isValidHostTheme('default')).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isValidHostTheme(null)).toBe(false);
    expect(isValidHostTheme(undefined)).toBe(false);
  });
});

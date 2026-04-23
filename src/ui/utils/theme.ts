export type HostTheme = 'light' | 'dark';

export function isValidHostTheme(theme: unknown): theme is HostTheme {
  return theme === 'light' || theme === 'dark';
}

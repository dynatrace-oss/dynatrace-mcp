import { getPackageJsonVersion } from './version';

/**
 * Generate a user agent string for Dynatrace MCP Server
 * @returns User agent string in format: dynatrace-mcp-server/vX.X.X (platform-arch)
 */
export const getUserAgent = (): string => {
  return `dynatrace-mcp-server/v${getPackageJsonVersion()} (${process.platform}-${process.arch})`;
};

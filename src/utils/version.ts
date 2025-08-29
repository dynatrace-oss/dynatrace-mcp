import { version as packageVersion } from '../../package.json';

/**
 * Gets the current version of the Dynatrace MCP Server from package.json
 * Note: we have package.json listed in exports, such that we can ensure it's always part of the bundle
 * @returns The version string from package.json
 */
export function getPackageJsonVersion(): string {
  return packageVersion;
}

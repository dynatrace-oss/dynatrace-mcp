import { version as packageVersion } from '../../package.json';

/**
 * Gets the current version of the Dynatrace MCP Server from package.json
 * Note: package.json is listed in exports to allow external access via require('pkg/package.json')
 * @returns The version string from package.json
 */
export function getPackageJsonVersion(): string {
  return packageVersion;
}

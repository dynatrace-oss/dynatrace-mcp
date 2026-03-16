'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getPackageJsonVersion = getPackageJsonVersion;
const package_json_1 = require('../../package.json');
/**
 * Gets the current version of the Dynatrace MCP Server from package.json
 * Note: we have package.json listed in exports, such that we can ensure it's always part of the bundle
 * @returns The version string from package.json
 */
function getPackageJsonVersion() {
  return package_json_1.version;
}

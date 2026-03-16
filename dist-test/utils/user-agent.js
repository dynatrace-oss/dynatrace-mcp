'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getUserAgent = void 0;
const version_1 = require('./version');
/**
 * Generate a user agent string for Dynatrace MCP Server
 * @returns User agent string in format: dynatrace-mcp-server/vX.X.X (platform-arch)
 */
const getUserAgent = () => {
  return `dynatrace-mcp-server/v${(0, version_1.getPackageJsonVersion)()} (${process.platform}-${process.arch})`;
};
exports.getUserAgent = getUserAgent;

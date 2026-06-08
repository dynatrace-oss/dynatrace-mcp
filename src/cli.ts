import { Command } from 'commander';

export const createCliProgram = (version: string) =>
  new Command()
    .name('dynatrace-mcp-server')
    .description('Dynatrace Model Context Protocol (MCP) Server')
    .version(version)
    .option('--http', 'enable HTTP server mode instead of stdio')
    .option('--server', 'enable HTTP server mode (alias for --http)')
    .option('-p, --port <number>', 'port for HTTP server', '3000')
    .option('-H, --host <host>', 'host for HTTP server', '127.0.0.1')
    .option('--oauth-redirect-port <number>', 'fixed port for the OAuth redirect server')
    .allowUnknownOption() // Claude Desktop / Electron UtilityProcess may inject extra arguments
    .allowExcessArguments(); // Avoid "too many arguments" when launched from .mcpb bundles

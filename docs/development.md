# Development

This file is intended for contributors/developers of the dynatrace-mcp-server package.

## Local Development

For local development purposes, you can use VS Code and GitHub Copilot in **Agent Mode**, 
with the following MCP config added to `.vscode/mcp.json`:

```json
{
  "servers": {
    "my-dynatrace-mcp-server": {
      "command": "node",
      "args": ["--watch", "${workspaceFolder}/dist/index.js"],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

Create a `.env` file in this repository (you can copy from `.env.template`) and configure environment variables:
```
DT_ENVIRONMENT=https://<environment-id>.apps.dynatrace.com
# OPTIONAL
# DT_PLATFORM_TOKEN=...
```

Finally, make changes to your code and compile it with `npm run build` or just run `npm run watch` and it auto-compiles.

## Running Tests

Unit tests can be run with:

```bash
npm run test:unit
```

Telemetry is automatically disabled during tests via the Jest configuration. If you run tests outside of Jest (or in a custom setup), disable telemetry explicitly:

```bash
DT_MCP_DISABLE_TELEMETRY=true npm test
```

## Releasing

When you are preparing for a release, you can use GitHub Copilot to guide you through the preparations.

In Visual Studio Code, you can use `/release` in the chat with Copilot in Agent Mode, which will execute [release.prompt.md](.github/prompts/release.prompt.md).

You may include additional information such as the version number. If not specified, you will be asked.

This will

- prepare the [changelog](CHANGELOG.md),
- update the version number in [package.json](package.json),
- commit the changes.

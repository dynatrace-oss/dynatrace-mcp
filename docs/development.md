# Development

This file is intended for contributors/developers of the dynatrace-mcp-server package.

## Local Development

For local development purposes, you can use VSCode and GitHub Copilot.

First, enable Copilot for your Workspace `.vscode/settings.json`:

```json
{
  "github.copilot.enable": {
    "*": true
  }
}
```

and make sure that you are using Agent Mode in Copilot.

Second, add the MCP to `.vscode/mcp.json`:

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

Third, create a `.env` file in this repository (you can copy from `.env.template`) and configure environment variables as [described above](#environment-variables).

Finally, make changes to your code and compile it with `npm run build` or just run `npm run watch` and it auto-compiles.

## Releasing

When you are preparing for a release, you can use GitHub Copilot to guide you through the preparations.

In Visual Studio Code, you can use `/release` in the chat with Copilot in Agent Mode, which will execute [release.prompt.md](.github/prompts/release.prompt.md).

You may include additional information such as the version number. If not specified, you will be asked.

This will

- prepare the [changelog](CHANGELOG.md),
- update the version number in [package.json](package.json),
- commit the changes.

# Dynatrace MCP Server

This prototype for a remote MCP server allows interaction with [Dynatrace](https://www.dynatrace.com/) observability platform. 
Get real-time observability data early on in the daily development cycle.

<img width="1046" alt="image" src="https://github.com/user-attachments/assets/1537d5df-be2a-4b9c-b1d6-c024541b5f35" />

## Use cases

- Real-time observability, fetch production-level data for early detection.
- Fix issues in the context from monitored exceptions, logs, and anomalies.
- More context on security level issues
- Natural language to query log data


## Quickstart

**Work in progress**

You can add this MCP server (using STDIO) to your MCP Client like VS Code, Claude, Cursor, Windsurf Github Copilot via the package `@dynatrace-oss/dynatrace-mcp`. 

**VS Code**
```json
{
  "servers": {
    "npx-dynatrace-mcp-server": {
      "command": "npx",
      "args": ["-y", "@dynatrace-oss/dynatrace-mcp@latest"],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

**Claude Desktop**
```json
{
  "mcpServers": {
    "mobile-mcp": {
      "command": "npx",
      "args": ["-y", "@dynatrace-oss/dynatrace-mcp@latest"],
      "env": {
        "OAUTH_CLIENT_ID": "",
        "OAUTH_CLIENT_SECRET": "",
        "DT_ENVIRONMENT": ""
      }
    }
  }
}
```

## Environment Variables

A **Dynatrace OAuth Client** is needed to communicate with your Dynatrace Environment. Please follow the documentation about
[creating an Oauth Client in Dynatrace](https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/oauth-clients),
and set up the following environment variables in order for this MCP to work:

* `DT_ENVIRONMENT` (string, e.g., https://abcd1234.apps.dynatrace.com) - URL to your Dynatrace Platform
* `OAUTH_CLIENT_ID` (string, e.g., `dt0s02.SAMPLE`) - Dynatrace OAuth Client ID
* `OAUTH_CLIENT_SECRET` (string, e.g., `dt0s02.SAMPLE.abcd1234`) - Dynatrace OAuth Client Secret
* OAuth Client Scopes:
  * `app-engine:apps:run` - needed for environmentInformationClient
  * `app-engine:functions:run` - needed for environmentInformationClient
  * `hub:catalog:read` - get details about installed Apps on Dynatrace Environment
  * `environment-api:security-problems:read` - needed for reading security problems
  * `environment-api:entities:read` - read monitored entities
  * `environment-api:problems:read` - get problems
  * `environment-api:metrics:read` - read metrics
  * `environment-api:slo:read` - read SLOs
  * `settings:objects:read` - needed for reading ownership information and Guardians (SRG) from settings
  * `storage:buckets:read` - Read all system data stored on Grail
  * `storage:logs:read` - Read logs for reliability guardian validations
  * `storage:metrics:read` - Read metrics for reliability guardian validations
  * `storage:bizevents:read` - Read bizevents for reliability guardian validations
  * `storage:spans:read` - Read spans from Grail
  * `storage:entities:read` - Read Entities from Grail
  * `storage:system:read` - Read System Data from Grail
  * `storage:user.events:read` - Read User events from Grail
  * `storage:user.sessions:read` - Read User sessions from Grail

In addition, depending on the features you use, the following variables can be configured:

* `SLACK_CONNECTION_ID` (string) - connection ID of a [Slack Connection](https://docs.dynatrace.com/docs/analyze-explore-automate/workflows/actions/slack)
* `USE_APP_SETTINGS`  (boolean, `true` or `false`; default: `false`)
  * Requires scope `app-settings:objects:read` to read settings-objects from app settings
* `USE_WORKFLOWS` (boolean, `true` or `false`; default: `false`)
  * Requires scopes `automation:workflows:read`, `automation:workflows:write` and `automation:workflows:run` to read, write and execute Workflows

## Development

For development purposes, you can use VSCode and GitHub Copilot.

First, enable Copilot for your Workspace `.vscode/settings.json`:
```json
{
  "github.copilot.enable": {
    "*": true
  }
}

```

Second, add the MCP to `.vscode/mcp.json`:
```json
{
  "servers": {
    "my-dynatrace-mcp-server": {
      "command": "node",
      "args": [
        "${workspaceFolder}/dist/index.js"
      ],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

Third, create a `.env` file in this repository (you can copy from `.env.template`) and configure environment variables as [described above](#environment-variables).

Last but not least, switch to Agent Mode in CoPilot and reload tools:
![CoPilot Enable Agent Mode](assets/copilot-enable-agent-mode.gif)




## Notes
This product is not officially supported by Dynatrace. 
Please contact us via [GitHub Issues](https://github.com/dynatrace-oss/dynatrace-mcp/issues) if you have feature requests, questions, or need help.

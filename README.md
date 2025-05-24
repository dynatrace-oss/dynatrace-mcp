# Dynatrace MCP Server

This remote MCP server allows interaction with the [Dynatrace](https://www.dynatrace.com/) observability platform.
Bring real-time observability data directly into your development workflow.

<img width="1046" alt="image" src="/assets/dynatrace-mcp-arch.png" />

## Use cases

- Real-time observability, fetch production-level data for early detection.
- Fix issues in the context from monitored exceptions, logs, and anomalies.
- More context on security level issues
- Natural language to query log data

## Capabilities

- List and get [problem](https://www.dynatrace.com/hub/detail/problems/) details from your services (for example Kubernetes)
- List and get security problems / [vulnerability](https://www.dynatrace.com/hub/detail/vulnerabilities/) details
- Execute DQL(Dynatrace Query Language) like getting events or logs
- Send Slack messages (via Slack Connector)
- Set up notification Workflow (via Dynatrace [AutomationEngine](https://docs.dynatrace.com/docs/discover-dynatrace/platform/automationengine))
- Get Ownership of an entity

## Quickstart

**Work in progress**

You can add this MCP server (using STDIO) to your MCP Client like VS Code, Claude, Cursor, Amazon Q Developer CLI, Windsurf Github Copilot via the package `@dynatrace-oss/dynatrace-mcp-server`.

**VS Code**

```json
{
  "servers": {
    "npx-dynatrace-mcp-server": {
      "command": "npx",
      "args": ["-y", "@dynatrace-oss/dynatrace-mcp-server@latest"],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

Please note: In this config, [the `${workspaceFolder}` variable](https://code.visualstudio.com/docs/reference/variables-reference#_predefined-variables) is used.
This only works if the config is stored in the current workspaces, e.g., `<your-repo>/.vscode/mcp.json`. Alternatively, this can also be stored in user-settings, and you can define `env` as follows:

```json
{
  "servers": {
    "npx-dynatrace-mcp-server": {
      "command": "npx",
      "args": ["-y", "@dynatrace-oss/dynatrace-mcp-server@latest"],
      "env": {
        "OAUTH_CLIENT_ID": "",
        "OAUTH_CLIENT_SECRET": "",
        "DT_ENVIRONMENT": ""
      }
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
      "args": ["-y", "@dynatrace-oss/dynatrace-mcp-server@latest"],
      "env": {
        "OAUTH_CLIENT_ID": "",
        "OAUTH_CLIENT_SECRET": "",
        "DT_ENVIRONMENT": ""
      }
    }
  }
}
```

**Amazon Q Developer CLI**

The [Amazon Q Developer CLI](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-mcp-configuration.html) provides an interactive chat experience directly in your terminal. You can ask questions, get help with AWS services, troubleshoot issues, and generate code snippets without leaving your command line environment.
```json
{
  "mcpServers": {
    "mobile-mcp": {
      "command": "npx",
      "args": ["-y", "@dynatrace-oss/dynatrace-mcp-server@latest"],
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
  * `storage:events:read` -  Read Events from Grail
  * `storage:system:read` - Read System Data from Grail
  * `storage:user.events:read` - Read User events from Grail
  * `storage:user.sessions:read` - Read User sessions from Grail

In addition, depending on the features you use, the following variables can be configured:

* `SLACK_CONNECTION_ID` (string) - connection ID of a [Slack Connection](https://docs.dynatrace.com/docs/analyze-explore-automate/workflows/actions/slack)
* `USE_APP_SETTINGS`  (boolean, `true` or `false`; default: `false`)
  * Requires scope `app-settings:objects:read` to read settings-objects from app settings
* `USE_WORKFLOWS` (boolean, `true` or `false`; default: `false`)
  * Requires scopes `automation:workflows:read`, `automation:workflows:write` and `automation:workflows:run` to read, write and execute Workflows

## ✨ Example prompts ✨

Use these example prompts as a starting point. Just copy them into your IDE or agent setup, adapt them to your services/stack/architecture,
and extend them as needed. They’re here to help you imagine how real-time observability and automation work together in the MCP context in your IDE.

**Find open vulnerabilities on production, setup alert.**
```
I have this code snippet here in my IDE, where I get a dependency vulnerability warning for my code.
Check if I see any open vulnerability/cve on production.
Analyze a specific production problem.
Setup a workflow that sends Slack alerts to the #devops-alerts channel when availability problems occur.
```
**Debug intermittent 503 errors.**
```
Our load balancer is intermittently returning 503 errors during peak traffic.
Pull all recent problems detected for our front-end services and
run a query to correlate error rates with service instance health indicators.
I suspect we have circuit breakers triggering, but need confirmation from the telemetry data.
```
**Correlate memory issue with logs.**
```
There's a problem with high memory usage on one of our hosts.
Get the problem details and then fetch related logs to help understand
what's causing the memory spike? Which file in this repo is this related to?
```
**Trace request flow analysis.**
```
Our users are experiencing slow checkout processes.
Can you execute a DQL query to show me the full request trace for our checkout flow,
so I can identify which service is causing the bottleneck?
```
**Analyze Kubernetes cluster events.**
```
Our application deployments seem to be failing intermittently.
Can you fetch recent events from our "production-cluster"
to help identify what might be causing these deployment issues?
```

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

Last but not least, switch to Agent Mode in CoPilot and reload tools.


## Notes
This product is not officially supported by Dynatrace.
Please contact us via [GitHub Issues](https://github.com/dynatrace-oss/dynatrace-mcp/issues) if you have feature requests, questions, or need help.

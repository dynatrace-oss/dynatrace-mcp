# Dynatrace MCP Server

This local MCP server allows interaction with the [Dynatrace](https://www.dynatrace.com/) observability platform.
Bring real-time observability data directly into your development workflow.

<img width="1046" alt="image" src="/assets/dynatrace-mcp-arch.png" />

## Use cases

- **Real-time observability** - Fetch production-level data for early detection and proactive monitoring
- **Contextual debugging** - Fix issues with full context from monitored exceptions, logs, and anomalies
- **Security insights** - Get detailed vulnerability analysis and security problem tracking
- **Natural language queries** - Use AI-powered DQL generation and explanation

## Capabilities

- List and get [problem](https://www.dynatrace.com/hub/detail/problems/) details from your services (for example Kubernetes)
- List and get security problems / [vulnerability](https://www.dynatrace.com/hub/detail/vulnerabilities/) details
- Execute DQL (Dynatrace Query Language) and retrieve logs, events, spans and metrics
- Send Slack messages (via Slack Connector)
- Set up notification Workflow (via Dynatrace [AutomationEngine](https://docs.dynatrace.com/docs/discover-dynatrace/platform/automationengine))
- Get more information about a monitored entity
- Get Ownership of an entity

### AI-Powered Assistance (Preview)

- **Natural Language to DQL** - Convert plain English queries to Dynatrace Query Language
- **DQL Explanation** - Get plain English explanations of complex DQL queries
- **AI Chat Assistant** - Get contextual help and guidance for Dynatrace questions
- **Feedback System** - Provide feedback to improve AI responses over time

> **Note:** While Davis CoPilot AI is generally available (GA), the Davis CoPilot APIs are currently in preview. For more information, visit the [Davis CoPilot Preview Community](https://dt-url.net/copilot-community).

## Quickstart

You can add this MCP server (using STDIO) to your MCP Client like VS Code, Claude, Cursor, Amazon Q Developer CLI, Windsurf Github Copilot via the package `@dynatrace-oss/dynatrace-mcp-server`.

We recommend to always set it up for your current workspace instead of using it globally.

**VS Code**

```json
{
  "servers": {
    "npx-dynatrace-mcp-server": {
      "command": "npx",
      "cwd": "${workspaceFolder}",
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

This configuration should be stored in `<your-repo>/.amazonq/mcp.json`.

## Environment Variables

You can set up authentication via **OAuth Client** or **Platform Tokens** (v0.5.0 and newer) via the following environment variables:

- `DT_ENVIRONMENT` (string, e.g., https://abc12345.apps.dynatrace.com) - URL to your Dynatrace Platform (do not use Dynatrace classic URLs like `abc12345.live.dynatrace.com`)
- `OAUTH_CLIENT_ID` (string, e.g., `dt0s02.SAMPLE`) - Dynatrace OAuth Client ID
- `OAUTH_CLIENT_SECRET` (string, e.g., `dt0s02.SAMPLE.abcd1234`) - Dynatrace OAuth Client Secret
- With v0.5.0 and newer: `DT_PLATFORM_TOKEN` (string, e.g., `dt0s16.SAMPLE.abcd1234`) - Dynatrace Platform Token (limited support, as not all scopes are available; see below)

For more information, please have a look at the documentation about
[creating an Oauth Client in Dynatrace](https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/oauth-clients), as well as
[creating a Platform Token in Dynatrace](https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/platform-tokens).

In addition, depending on the features you use, the following variables can be configured:

- `SLACK_CONNECTION_ID` (string) - connection ID of a [Slack Connection](https://docs.dynatrace.com/docs/analyze-explore-automate/workflows/actions/slack)

### Scopes for Authentication

Depending on the features you are using, the following scopes are needed:

- `app-engine:apps:run` - needed for almost all tools
- `app-engine:functions:run` - needed for for almost all tools
- `environment-api:security-problems:read` - needed for reading security problems (_currently not available for Platform Tokens_)
- `environment-api:entities:read` - read monitored entities (_currently not available for Platform Tokens_)
- `automation:workflows:read` - read Workflows
- `automation:workflows:write` - create and update Workflows
- `automation:workflows:run` - run Workflows
- `storage:buckets:read` - needed for `execute_dql` tool to read all system data stored on Grail
- `storage:logs:read` - needed for `execute_dql` tool to read logs for reliability guardian validations
- `storage:metrics:read` - needed for `execute_dql` tool to read metrics for reliability guardian validations
- `storage:bizevents:read` - needed for `execute_dql` tool to read bizevents for reliability guardian validations
- `storage:spans:read` - needed for `execute_dql` tool to read spans from Grail
- `storage:entities:read` - needed for `execute_dql` tool to read Entities from Grail
- `storage:events:read` - needed for `execute_dql` tool to read Events from Grail
- `storage:security.events:read`- needed for `execute_dql` tool to read Security Events from Grail
- `storage:system:read` - needed for `execute_dql` tool to read System Data from Grail
- `storage:user.events:read` - needed for `execute_dql` tool to read User events from Grail
- `storage:user.sessions:read` - needed for `execute_dql` tool to read User sessions from Grail
- `davis-copilot:conversations:execute` - execute conversational skill (chat with Copilot)
- `davis-copilot:nl2dql:execute` - execute Davis Copilot Natural Language (NL) to DQL skill
- `davis-copilot:dql2nl:execute` - execute DQL to Natural Language (NL) skill
- `settings:objects:read` - needed for reading ownership information and Guardians (SRG) from settings

  **Note**: Please ensure that `settings:objects:read` is used, and _not_ the similarly named scope `app-settings:objects:read`.

## ✨ Example prompts ✨

Use these example prompts as a starting point. Just copy them into your IDE or agent setup, adapt them to your services/stack/architecture,
and extend them as needed. They’re here to help you imagine how real-time observability and automation work together in the MCP context in your IDE.

**Write a DQL query from natural language:**

```
Show me error rates for the payment service in the last hour
```

**Explain a DQL query:**

```
What does this DQL do?
fetch logs | filter dt.source_entity == 'SERVICE-123' | summarize count(), by:{severity} | sort count() desc
```

**Chat with Davis CoPilot:**

```
How can I investigate slow database queries in Dynatrace?
```

**Find open vulnerabilities on production, setup alert:**

```
I have this code snippet here in my IDE, where I get a dependency vulnerability warning for my code.
Check if I see any open vulnerability/cve on production.
Analyze a specific production problem.
Setup a workflow that sends Slack alerts to the #devops-alerts channel when availability problems occur.
```

**Debug intermittent 503 errors:**

```
Our load balancer is intermittently returning 503 errors during peak traffic.
Pull all recent problems detected for our front-end services and
run a query to correlate error rates with service instance health indicators.
I suspect we have circuit breakers triggering, but need confirmation from the telemetry data.
```

**Correlate memory issue with logs:**

```
There's a problem with high memory usage on one of our hosts.
Get the problem details and then fetch related logs to help understand
what's causing the memory spike? Which file in this repo is this related to?
```

**Trace request flow analysis:**

```
Our users are experiencing slow checkout processes.
Can you execute a DQL query to show me the full request trace for our checkout flow,
so I can identify which service is causing the bottleneck?
```

**Analyze Kubernetes cluster events:**

```
Our application deployments seem to be failing intermittently.
Can you fetch recent events from our "production-cluster"
to help identify what might be causing these deployment issues?
```

## Troubleshooting

### Authentication Issues

In most cases, something is wrong with the OAuth Client. Please ensure that you have added all scopes as requested above.
In addition, please ensure that your user also has all necessary permissions on your Dynatrace Environment.

In case of any problems, you can troubleshoot SSO/OAuth issues based on our [Dynatrace Developer Documentation](https://developer.dynatrace.com/develop/access-platform-apis-from-outside/#get-bearer-token-and-call-app-function) and providing the list of scopes.

It is recommended to try access the following API (which requires minimal scopes `app-engine:apps:run` and `app-engine:functions:run`):

1. Use OAuth Client ID and Secret to retrieve a Bearer Token (only valid for a couple of minutes):

```bash
curl --request POST 'https://sso.dynatrace.com/sso/oauth2/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode 'client_id={your-client-id}' \
  --data-urlencode 'client_secret={your-client-secret}' \
  --data-urlencode 'scope=app-engine:apps:run app-engine:functions:run'
```

2. Use `access_token` from the response of the above call as the bearer-token in the next call:

```bash
curl -X GET https://abc12345.apps.dynatrace.com/platform/management/v1/environment \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer {your-bearer-token}'
```

3. You should retrieve a result like this:

```json
{
  "environmentId": "abc12345",
  "createTime": "2023-01-01T00:10:57.123Z",
  "blockTime": "2025-12-07T00:00:00Z",
  "state": "ACTIVE"
}
```

### Problem accessing data on Grail

Grail has a dedicated section about permissions in the Dynatrace Docs. Please refer to https://docs.dynatrace.com/docs/discover-dynatrace/platform/grail/data-model/assign-permissions-in-grail for more details.

## Development

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

## Notes

This product is not officially supported by Dynatrace.
Please contact us via [GitHub Issues](https://github.com/dynatrace-oss/dynatrace-mcp/issues) if you have feature requests, questions, or need help.

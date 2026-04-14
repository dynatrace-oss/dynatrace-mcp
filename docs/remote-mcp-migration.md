# Migrating from Local to Remote Dynatrace MCP Server

Dynatrace now offers an official **Remote MCP Server** that runs directly in your Dynatrace SaaS environment — no local setup, no Node.js, and no `npx` required.

👉 **[Dynatrace Remote MCP Server Documentation](https://docs.dynatrace.com/docs/dynatrace-intelligence/dynatrace-mcp)**

👉 **[Install from Dynatrace Hub](https://www.dynatrace.com/hub/detail/dynatrace-mcp-server/)**

## Why Migrate?

| Aspect             | Local MCP Server                                                                                                | Remote MCP Server                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Hosting**        | Runs on your machine via `npx` / Node.js                                                                        | Hosted in your Dynatrace environment    |
| **Setup**          | Requires Node.js, environment variables, and MCP client configuration                                           | Connect via URL — no local dependencies |
| **Authentication** | OAuth Authorization Code Flow (browser-based, no token management), Platform Token, or OAuth Client credentials | Platform Token only                     |
| **Updates**        | Manual (`@latest` tag or version pin)                                                                           | Automatically updated by Dynatrace      |
| **Support**        | Community-supported (open-source, via [GitHub Issues](https://github.com/dynatrace-oss/dynatrace-mcp/issues))   | Officially supported by Dynatrace       |
| **Transport**      | stdio (default) or HTTP                                                                                         | Streamable HTTP (remote URL)            |

## Tool Comparison

| Capability                                  | Local MCP Tool                       | Remote MCP Tool                      |
| ------------------------------------------- | ------------------------------------ | ------------------------------------ |
| Execute DQL queries                         | `execute_dql`                        | `execute-dql`                        |
| Verify DQL syntax                           | `verify_dql`                         | —                                    |
| Reset Grail query budget                    | `reset_grail_budget`                 | —                                    |
| Generate DQL from natural language          | `generate_dql_from_natural_language` | `create-dql`                         |
| Explain DQL in natural language             | `explain_dql_in_natural_language`    | `explain-dql`                        |
| Ask Dynatrace documentation / AI assistance | `chat_with_davis_copilot`            | `ask-dynatrace-docs`                 |
| Query / list problems                       | `list_problems`                      | `query-problems`                     |
| Get problem details by ID                   | —                                    | `get-problem-by-id`                  |
| List vulnerabilities                        | `list_vulnerabilities`               | `get-vulnerabilities`                |
| List exceptions                             | `list_exceptions`                    | —                                    |
| Get Kubernetes events                       | `get_kubernetes_events`              | `get-events-for-kubernetes-cluster`  |
| Find entity ID by name                      | `find_entity_by_name`                | `get-entity-id`                      |
| Get entity name by ID                       | —                                    | `get-entity-name`                    |
| Get environment info                        | `get_environment_info`               | —                                    |
| List Davis analyzers                        | `list_davis_analyzers`               | —                                    |
| Adaptive anomaly detection                  | `execute_davis_analyzer`             | `adaptive-anomaly-detector`          |
| Seasonal baseline anomaly detection         | `execute_davis_analyzer`             | `seasonal-baseline-anomaly-detector` |
| Static threshold analysis                   | `execute_davis_analyzer`             | `static-threshold-analyzer`          |
| Time series forecasting                     | `execute_davis_analyzer`             | `timeseries-forecast`                |
| Time series novelty detection               | `execute_davis_analyzer`             | `timeseries-novelty-detection`       |
| Find documents                              | —                                    | `find-documents`                     |
| Find troubleshooting guides                 | —                                    | `find-troubleshooting-guides`        |
| Create workflow for notification            | `create_workflow_for_notification`   | —                                    |
| Make workflow public                        | `make_workflow_public`               | —                                    |
| Send Slack message                          | `send_slack_message`                 | —                                    |
| Send email                                  | `send_email`                         | —                                    |
| Send event                                  | `send_event`                         | —                                    |
| Create Dynatrace Notebook                   | `create_dynatrace_notebook`          | —                                    |

> **Legend:** — = not available (as of the 2026-04-13) - check the [official documentation](https://docs.dynatrace.com/docs/dynatrace-intelligence/dynatrace-mcp) for the latest tool list.

## Migration Steps

### 1. Obtain a Platform Token

> **Note:** The local MCP server currently offers a better authentication experience via OAuth Authorization Code Flow (via your logged in Browser session). The remote MCP server currently requires a Platform Token.

Create a [Platform Token in your Dynatrace environment](https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/platform-tokens) with the required scopes. The remote MCP server requires the following scopes:

- `mcp-gateway:servers:invoke`
- `mcp-gateway:servers:read`

as well as tool-specific scopes (see [Server and server tools](https://docs.dynatrace.com/docs/dynatrace-intelligence/dynatrace-mcp#server)):

- `storage:buckets:read` as well as `storage:events:read`, `storage:logs:read`, ... - see [Grail permissions table](https://docs.dynatrace.com/docs/platform/grail/organize-data/assign-permissions-in-grail#grail-permissions-table)
- `davis:analyzers:read`, `davis:analyzers:execute`
- `document:documents:read`
- `davis-copilot:nl2dql:execute`, `davis-copilot:dql2nl:execute` and `davis-copilot:conversations:execute`

See [Platform Tokens documentation](https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/platform-tokens) for details.

### 2. Update Your MCP Client Configuration

Replace your local server configuration with the remote server URL.

**Before (local MCP server in VS Code):**

```json
{
  "servers": {
    "npx-dynatrace-mcp-server": {
      "command": "npx",
      "args": ["-y", "@dynatrace-oss/dynatrace-mcp-server@latest"],
      "env": {
        "DT_ENVIRONMENT": "https://abc12345.apps.dynatrace.com"
      }
    }
  }
}
```

**After (remote MCP server in VS Code):**

```json
{
  "servers": {
    "dynatrace-mcp": {
      "url": "https://abc12345.apps.dynatrace.com/platform-reserved/mcp-gateway/v0.1/servers/dynatrace-mcp/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_PLATFORM_TOKEN>"
      }
    }
  }
}
```

Replace `abc12345` with your Dynatrace tenant identifier and `<YOUR_PLATFORM_TOKEN>` with your token.

### 3. Verify the Connection

1. Open your MCP client (e.g., VS Code Copilot Chat).
2. Check that the Dynatrace MCP tools are listed.
3. Run a simple prompt such as `Show me last 10 logs` to confirm everything works.

### 4. Handle Local-Only Tools

If you rely on tools only available in the local server (such as `send_slack_message`, `send_email`, `create_workflow_for_notification`, or `create_dynatrace_notebook`), you can keep the local MCP server running alongside the remote one, or wait for the remote server to add parity.

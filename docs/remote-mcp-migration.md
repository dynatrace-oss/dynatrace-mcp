# Migrating from Local to Remote Dynatrace MCP Server

Dynatrace now offers an official **Remote MCP Server** that runs directly in your Dynatrace environment — no local setup, no Node.js, and no `npx` required.

👉 **[Dynatrace Remote MCP Server Documentation](https://docs.dynatrace.com/docs/dynatrace-intelligence/dynatrace-mcp)**

👉 **[Install from Dynatrace Hub](https://www.dynatrace.com/hub/detail/dynatrace-mcp-server/)**

## Why Migrate?

| Aspect | Local MCP Server | Remote MCP Server |
| --- | --- | --- |
| **Hosting** | Runs on your machine via `npx` / Node.js | Hosted in your Dynatrace environment |
| **Setup** | Requires Node.js, environment variables, and MCP client configuration | Connect via URL — no local dependencies |
| **Authentication** | OAuth Authorization Code Flow (browser-based, no token management), Platform Token, or OAuth Client credentials | Platform Token only (OAuth support coming soon) |
| **Updates** | Manual (`@latest` tag or version pin) | Automatically updated by Dynatrace |
| **Support** | Community-supported (open-source, via [GitHub Issues](https://github.com/dynatrace-oss/dynatrace-mcp/issues)) | Officially supported by Dynatrace |
| **Transport** | stdio (default) or HTTP | Streamable HTTP (remote URL) |

## Tool Comparison

| Capability | Local MCP Tool | Remote MCP |
| --- | --- | --- |
| Execute DQL queries | `execute_dql` | ✅ |
| Verify DQL syntax | `verify_dql` | — |
| Reset Grail query budget | `reset_grail_budget` | — |
| Generate DQL from natural language | `generate_dql_from_natural_language` | ✅ |
| Explain DQL in natural language | `explain_dql_in_natural_language` | ✅ |
| Chat with Davis CoPilot | `chat_with_davis_copilot` | ✅ |
| List problems | `list_problems` | ✅ |
| List vulnerabilities | `list_vulnerabilities` | ✅ |
| List exceptions | `list_exceptions` | — |
| Get Kubernetes events | `get_kubernetes_events` | ✅ |
| Find entity by name | `find_entity_by_name` | ✅ |
| Get environment info | `get_environment_info` | — |
| List Davis analyzers | `list_davis_analyzers` | ✅ |
| Execute Davis analyzer | `execute_davis_analyzer` | ✅ |
| Find documents & troubleshooting guides | — | ✅ |
| Create workflow for notification | `create_workflow_for_notification` | — |
| Make workflow public | `make_workflow_public` | — |
| Send Slack message | `send_slack_message` | — |
| Send email | `send_email` | — |
| Send event | `send_event` | — |
| Create Dynatrace Notebook | `create_dynatrace_notebook` | — |

> **Legend:** ✅ = available, — = not available (as of the last documentation update). The remote MCP server is actively developed; check the [official documentation](https://docs.dynatrace.com/docs/dynatrace-intelligence/dynatrace-mcp) for the latest tool list.

## Migration Steps

### 1. Obtain a Platform Token

> **Authentication note:** The local MCP server offers a better authentication experience today — it supports the OAuth Authorization Code Flow, which opens a browser window so you never need to manage tokens manually. The remote MCP server currently requires a Platform Token. OAuth support for the remote server is coming soon.

Create a Platform Token in your Dynatrace environment with the required scopes. In addition to tool-specific scopes, the remote MCP server requires:

- `mcp-gateway:servers:invoke`
- `mcp-gateway:servers:read`

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

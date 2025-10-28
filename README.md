# Dynatrace MCP Server

<h4 align="center">
  <a href="https://github.com/dynatrace-oss/dynatrace-mcp/releases">
    <img src="https://img.shields.io/github/release/dynatrace-oss/dynatrace-mcp" />
  </a>
  <a href="https://github.com/dynatrace-oss/dynatrace-mcp/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-mit-blue.svg" alt="Dynatrace MCP Server is released under the MIT License" />
  </a>
  <a href="https://vscode.dev/redirect/mcp/install?name=dynatrace-mcp-server&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40dynatrace-oss%2Fdynatrace-mcp-server%22%5D%2C%22env%22%3A%7B%7D%7D">
    <img src="https://img.shields.io/badge/Install_in-VS_Code-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white" />
  </a>
  <a href="[https://vscode.dev/redirect/mcp/install?name=dynatrace-mcp-server&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40dynatrace-oss%2Fdynatrace-mcp-server%22%5D%2C%22env%22%3A%7B%7D%7D](https://cursor.com/en/install-mcp?name=dynatrace-mcp-server&config=eyJuYW1lIjoiZHluYXRyYWNlLW1jcC1zZXJ2ZXIiLCJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBkeW5hdHJhY2Utb3NzL2R5bmF0cmFjZS1tY3Atc2VydmVyIl0sImVudiI6e319)">
    <img src="https://img.shields.io/badge/Install_in-Cursor-000000?style=flat-square&logoColor=white" />
  </a>
  <a href="https://www.npmjs.com/package/@dynatrace-oss/dynatrace-mcp-server">
    <img src="https://img.shields.io/npm/dm/@dynatrace-oss/dynatrace-mcp-server?logo=npm&style=flat&color=red" alt="npm" />
  </a>
  <a href="https://github.com/dynatrace-oss/dynatrace-mcp">
    <img src="https://img.shields.io/github/stars/dynatrace-oss/dynatrace-mcp" alt="Dynatrace MCP Server Stars on GitHub" />
  </a>
  <a href="https://github.com/dynatrace-oss/dynatrace-mcp">
    <img src="https://img.shields.io/github/contributors/dynatrace-oss/dynatrace-mcp?color=green" alt="Dynatrace MCP Server Contributors on GitHub" />
  </a>
</h4>

The local _Dynatrace MCP server_ allows AI Assistants to interact with the [Dynatrace](https://www.dynatrace.com/) observability platform,
bringing real-time observability data directly into your development workflow.

> Note: This product is not officially supported by Dynatrace.

If you need help, please contact us via [GitHub Issues](https://github.com/dynatrace-oss/dynatrace-mcp/issues) if you have feature requests, questions, or need help.

https://github.com/user-attachments/assets/25c05db1-8e09-4a7f-add2-ed486ffd4b5a

## Quickstart

You can add this MCP server to your MCP Client like VSCode, Claude, Cursor, Amazon Q, Windsurf, ChatGPT, or Github Copilot via the command is `npx -y @dynatrace-oss/dynatrace-mcp-server` (type: `stdio`). For more details, please refer to the [configuration section below](#configuration).

Furthermore, you need to configure the URL to a Dynatrace environment:

- `DT_ENVIRONMENT` (string, e.g., `https://abc12345.apps.dynatrace.com`) - URL to your Dynatrace Platform (do not use Dynatrace classic URLs like `abc12345.live.dynatrace.com`)

Once you are done, we recommend looking into [example prompts](#-example-prompts-), like `Get all details of the entity 'my-service'` or `Show me error logs`. Please mind that these prompts lead to executing DQL statements which may incur [costs](#costs) in accordance to your licence.

## Architecture

![Architecture](https://github.com/dynatrace-oss/dynatrace-mcp/blob/main/assets/dynatrace-mcp-arch.png?raw=true)

## Use cases

- **Real-time observability** - Fetch production-level data for early detection and proactive monitoring
- **Contextual debugging** - Fix issues with full context from monitored exceptions, logs, and anomalies
- **Security insights** - Get detailed vulnerability analysis and security problem tracking
- **Natural language queries** - Use AI-powered DQL generation and explanation
- **Multi-phase incident investigation** - Systematic 4-phase approach with automated impact assessment
- **Advanced transaction analysis** - Precise root cause identification with file/line-level accuracy
- **Cross-data source correlation** - Connect problems → spans → logs with trace ID correlation
- **DevOps automation** - Deployment health gates with automated promotion/rollback logic
- **Security compliance monitoring** - Multi-cloud compliance assessment with evidence-based investigation

## Capabilities

- List and get [problem](https://www.dynatrace.com/hub/detail/problems/) details from your services (for example Kubernetes)
- List and get security problems / [vulnerability](https://www.dynatrace.com/hub/detail/vulnerabilities/) details
- Execute DQL (Dynatrace Query Language) and retrieve logs, events, spans and metrics
- Send Slack messages (via Slack Connector)
- Set up notification Workflow (via Dynatrace [AutomationEngine](https://docs.dynatrace.com/docs/discover-dynatrace/platform/automationengine))
- Get more information about a monitored entity
- Get Ownership of an entity

### Costs

**Important:** While this local MCP server is provided for free, using certain capabilities to access data in Dynatrace Grail may incur additional costs based
on your Dynatrace consumption model. This affects `execute_dql` tool and other capabilities that **query** Dynatrace Grail storage, and costs
depend on the volume (GB scanned).

**Before using this MCP server extensively, please:**

1. Review your current Dynatrace consumption model and pricing
2. Understand the cost implications of the specific data you plan to query (logs, events, metrics) - see [Dynatrace Pricing and Rate Card](https://www.dynatrace.com/pricing/)
3. Start with smaller timeframes (e.g., 12h-24h) and make use of [buckets](https://docs.dynatrace.com/docs/discover-dynatrace/platform/grail/data-model#built-in-grail-buckets) to reduce the cost impact
4. Set an appropriate `DT_GRAIL_QUERY_BUDGET_GB` environment variable (default: 1000 GB) to control and monitor your Grail query consumption

**Grail Budget Tracking:**

The MCP server includes built-in budget tracking for Grail queries to help you monitor and control costs:

- Set `DT_GRAIL_QUERY_BUDGET_GB` (default: 1000 GB) to define your session budget limit
- The server tracks bytes scanned across all Grail queries in the current session
- You'll receive warnings when approaching 80% of your budget
- Budget exceeded alerts help prevent unexpected high consumption
- Budget resets when you restart the MCP server session

**To understand costs that occured:**

Execute the following DQL statement in a notebook to see how much bytes have been queried from Grail (Logs, Events, etc...):

```
fetch dt.system.events
| filter event.kind == "QUERY_EXECUTION_EVENT" and contains(client.client_context, "dynatrace-mcp")
| sort timestamp desc
| fields timestamp, query_id, query_string, scanned_bytes, table, bucket, user.id, user.email, client.client_context
| maketimeSeries sum(scanned_bytes), by: { user.email, user.id, table }
```

### AI-Powered Assistance (Preview)

- **Natural Language to DQL** - Convert plain English queries to Dynatrace Query Language
- **DQL Explanation** - Get plain English explanations of complex DQL queries
- **AI Chat Assistant** - Get contextual help and guidance for Dynatrace questions
- **Feedback System** - Provide feedback to improve AI responses over time

> **Note:** While Davis CoPilot AI is generally available (GA), the Davis CoPilot APIs are currently in preview. For more information, visit the [Davis CoPilot Preview Community](https://dt-url.net/copilot-community).

## Configuration

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
    "dynatrace-mcp-server": {
      "command": "npx",
      "args": ["-y", "@dynatrace-oss/dynatrace-mcp-server@latest"],
      "env": {
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
    "dynatrace-mcp-server": {
      "command": "npx",
      "args": ["-y", "@dynatrace-oss/dynatrace-mcp-server@latest"],
      "env": {
        "DT_ENVIRONMENT": ""
      }
    }
  }
}
```

This configuration should be stored in `<your-repo>/.amazonq/mcp.json`.

**Google Gemini CLI**

The [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) is Google's official command-line AI assistant that supports MCP server integration. You can add the Dynatrace MCP server using either the built-in management commands or manual configuration.

Using `gemini` CLI directly (recommended):

```bash
gemini extensions install https://github.com/dynatrace-oss/dynatrace-mcp
export DT_PLATFORM_TOKEN=... # optional
export DT_ENVIRONMENT=https://...
```

and verify that the server is running via

```bash
gemini mcp list
```

Or manually in your `~/.gemini/settings.json` or `.gemini/settings.json`:

```json
{
  "mcpServers": {
    "dynatrace": {
      "command": "npx",
      "args": ["@dynatrace-oss/dynatrace-mcp-server@latest"],
      "env": {
        "DT_ENVIRONMENT": ""
      },
      "timeout": 30000,
      "trust": false
    }
  }
}
```

### HTTP Server Mode (Alternative)

For scenarios where you need to run the MCP server as an HTTP service instead of using stdio (e.g., for stateful sessions, load balancing, or integration with web clients), you can use the HTTP server mode:

**Running as HTTP server:**

```bash
# Get help and see all available options
npx -y @dynatrace-oss/dynatrace-mcp-server@latest --help

# Run with HTTP server on default port 3000
npx -y @dynatrace-oss/dynatrace-mcp-server@latest --http

# Run with custom port (using short or long flag)
npx -y @dynatrace-oss/dynatrace-mcp-server@latest --server -p 8080
npx -y @dynatrace-oss/dynatrace-mcp-server@latest --http --port 3001

# Run with custom host/IP (using short or long flag)
npx -y @dynatrace-oss/dynatrace-mcp-server@latest --http --host 127.0.0.1 # recommended for local computers
npx -y @dynatrace-oss/dynatrace-mcp-server@latest --http --host 0.0.0.0 # recommended for container
npx -y @dynatrace-oss/dynatrace-mcp-server@latest --http -H 192.168.0.1 # recommended when sharing connection over a local network

# Check version
npx -y @dynatrace-oss/dynatrace-mcp-server@latest --version
```

**Configuration for MCP clients that support HTTP transport:**

```json
{
  "mcpServers": {
    "dynatrace-http": {
      "url": "http://localhost:3000",
      "transport": "http"
    }
  }
}
```

### Rule File

For efficient result retrieval from Dynatrace, please consider creating a rule file (e.g., [.github/copilot-instructions.md](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions), [.amazonq/rules/](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/context-project-rules.html)), instructing coding agents on how to get more details for your component/app/service. Here is an example for [easytrade](https://github.com/Dynatrace/easytrade), please adapt the names and filters to fit your use-cases and components:

```
# Observability

We use Dynatrace as an Observability solution. This document provides instructions on how to get data for easytrade from Dynatrace using DQL.

## How to get any data for my App

Depending on the query and tool used, the following filters can be applied to narrow down results:

* `contains(entity.name, "easytrade")`
* `contains(affected_entity.name, "easytrade")`
* `contains(container.name, "easytrade")`

For best results, you can combine these filters with an `OR` operator.

## Logs

To fetch logs for easytrade, execute `fetch logs | filter contains(container.name, "easyatrade")`.
For fetching just error-logs, add `| filter loglevel == "ERROR"`.
```

## Environment Variables

- `DT_ENVIRONMENT` (**required**, string, e.g., `https://abc12345.apps.dynatrace.com`) - URL to your Dynatrace Platform (do not use Dynatrace classic URLs like `abc12345.live.dynatrace.com`)
- `DT_PLATFORM_TOKEN` (optional, string, e.g., `dt0s16.SAMPLE.abcd1234`) - Dynatrace Platform Token
- `OAUTH_CLIENT_ID` (optional, string, e.g., `dt0s02.SAMPLE`) - Alternative: Dynatrace OAuth Client ID (for advanced use cases)
- `OAUTH_CLIENT_SECRET` (optional, string, e.g., `dt0s02.SAMPLE.abcd1234`) - Alternative: Dynatrace OAuth Client Secret (for advanced use cases)
- `DT_GRAIL_QUERY_BUDGET_GB` (optional, number, default: `1000`) - Budget limit in GB (base 1000) for Grail query bytes scanned per session. The MCP server tracks your Grail usage and warns when approaching or exceeding this limit.

When just providing `DT_ENVIRONMENT`, the local MCP server will try to open a browser window to authenticate against the Dynatrace SSO.

For more information about the other authentication methods, please have a look at the documentation about
[creating a Platform Token in Dynatrace](https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/platform-tokens), as well as
[creating an OAuth Client in Dynatrace](https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/oauth-clients) for advanced scenarios.

In addition, depending on the features you use, the following variables can be configured:

- `SLACK_CONNECTION_ID` (string) - connection ID of a [Slack Connection](https://docs.dynatrace.com/docs/analyze-explore-automate/workflows/actions/slack)

### Proxy Configuration

The MCP server honors system proxy settings for corporate environments:

- `https_proxy` or `HTTPS_PROXY` (optional, string, e.g., `http://proxy.example.com:8080`) - Proxy server URL for HTTPS requests
- `http_proxy` or `HTTP_PROXY` (optional, string, e.g., `http://proxy.example.com:8080`) - Proxy server URL for HTTP requests
- `no_proxy` or `NO_PROXY` (optional, string, e.g., `localhost,127.0.0.1,.local`) - Comma-separated list of hostnames or domains that should bypass the proxy

**Note:** The `no_proxy` environment variable is currently logged for informational purposes but not fully enforced by the underlying HTTP client. If you need to bypass the proxy for specific hosts, consider configuring your proxy server to handle these exclusions.

Example configuration with proxy:

```bash
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,.company.local
export DT_ENVIRONMENT=https://abc12345.apps.dynatrace.com
```

### Scopes for Authentication

Depending on the features you are using, the following scopes are needed:

**Available for both Platform Tokens and OAuth Clients:**

- `app-engine:apps:run` - needed for almost all tools
- `environment-api:entities:read` - for retrieving ownership details from monitored entities (_currently not available for Platform Tokens_)
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
- `storage:smartscape:read` - needed for `execute_dql` tool to read Smartscape Data
- `davis-copilot:conversations:execute` - execute conversational skill (chat with Copilot)
- `davis-copilot:nl2dql:execute` - execute Davis Copilot Natural Language (NL) to DQL skill
- `davis-copilot:dql2nl:execute` - execute DQL to Natural Language (NL) skill
- `email:emails:send` - needed for `send_email` tool to send emails
- `settings:objects:read` - needed for reading ownership information and Guardians (SRG) from settings

**Notes**:

- Please ensure that `settings:objects:read` is used, and _not_ the similarly named scope `app-settings:objects:read`.
- Versions before 0.12.0 required the scope `app-engine:functions:run`, which is no longer required.

**Important**: Some features requiring `environment-api:entities:read` will not work with Platform Tokens.

## ✨ Example prompts ✨

Use these example prompts as a starting point. Just copy them into your IDE or agent setup, adapt them to your services/stack/architecture,
and extend them as needed. They're here to help you imagine how real-time observability and automation work together in the MCP context in your IDE.

### **Basic Queries & AI Assistance**

**Find a monitored entity**

```
Get all details of the entity 'my-service'
```

**Find error logs**

```
Show me error logs
```

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

**Send email notifications:**

```
Send an email notification about the incident to the responsible team at team@example.com with CC to manager@example.com
```

### **Advanced Incident Investigation**

**Multi-phase incident response:**

```
Our checkout service is experiencing high error rates. Start a systematic 4-phase incident investigation:
1. Detect and triage the active problems
2. Assess user impact and affected services
3. Perform cross-data source analysis (problems → spans → logs)
4. Identify root cause with file/line-level precision
```

**Cross-service failure analysis:**

```
We have cascading failures across our microservices architecture.
Analyze the entity relationships and trace the failure propagation from the initial problem
through all downstream services. Show me the correlation timeline.
```

### **Security & Compliance Analysis**

**Latest-scan vulnerability assessment:**

```
Perform a comprehensive security analysis using the latest scan data:
- Check for new vulnerabilities in our production environment
- Focus on critical and high-severity findings
- Provide evidence-based remediation paths
- Generate risk scores with team-specific guidance
```

**Multi-cloud compliance monitoring:**

```
Run a compliance assessment across our AWS, Azure, and Kubernetes environments.
Check for configuration drift and security posture changes in the last 24 hours.
```

### **DevOps & SRE Automation**

**Deployment health gate analysis:**

```
Our latest deployment is showing performance degradation.
Run deployment health gate analysis with:
- Golden signals monitoring (Rate, Errors, Duration, Saturation)
- SLO/SLI validation with error budget calculations
- Generate automated rollback recommendation if needed
```

**Infrastructure as Code remediation:**

```
Generate Infrastructure as Code templates to remediate the current alert patterns.
Include automated scaling policies and resource optimization recommendations.
```

### **Deep Transaction Analysis**

**Business logic error investigation:**

```
Our payment processing is showing intermittent failures.
Perform advanced transaction analysis:
- Extract exception details with full stack traces
- Correlate with deployment events and ArgoCD changes
- Identify the exact code location causing the issue
```

**Performance correlation analysis:**

```
Analyze the performance impact across our distributed system for the slow checkout flow.
Show me the complete trace analysis with business context and identify bottlenecks.
```

### **Traditional Use Cases (Enhanced)**

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

In most cases, authentication issues are related to missing scopes or invalid tokens. Please ensure that you have added all required scopes as listed above.

**For Platform Tokens:**

1. Verify your Platform Token has all the necessary scopes listed in the "Scopes for Authentication" section
2. Ensure your token is valid and not expired
3. Check that your user has the required permissions in your Dynatrace Environment

**For OAuth Clients:**
In case of OAuth-related problems, you can troubleshoot SSO/OAuth issues based on our [Dynatrace Developer Documentation](https://developer.dynatrace.com/develop/access-platform-apis-from-outside/#get-bearer-token-and-call-app-function).

It is recommended to test access with the following API (which requires minimal scopes `app-engine:apps:run` and, e.g., `storage:logs:read`):

1. Use OAuth Client ID and Secret to retrieve a Bearer Token (only valid for a couple of minutes):

```bash
curl --request POST 'https://sso.dynatrace.com/sso/oauth2/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode 'client_id={your-client-id}' \
  --data-urlencode 'client_secret={your-client-secret}' \
  --data-urlencode 'scope=app-engine:apps:run storage:logs:read'
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

## Telemetry

The Dynatrace MCP Server includes sending Telemetry Data via Dynatrace OpenKit to help improve the product. This includes:

- Server start events
- Tool usage (which tools are called, success/failure, execution duration)
- Error tracking for debugging and improvement

**Privacy and Opt-out:**

- Telemetry is **enabled by default** but can be disabled by setting `DT_MCP_DISABLE_TELEMETRY=true`
- No sensitive data from your Dynatrace environment is tracked
- Only anonymous usage statistics and error information are collected
- Usage statistics and error data are transmitted to Dynatrace’s analytics endpoint

**Configuration options:**

- `DT_MCP_DISABLE_TELEMETRY` (boolean, default: `false`) - Disable Telemetry
- `DT_MCP_TELEMETRY_APPLICATION_ID` (string, default: `dynatrace-mcp-server`) - Application ID for tracking
- `DT_MCP_TELEMETRY_ENDPOINT_URL` (string, default: Dynatrace endpoint) - OpenKit endpoint URL
- `DT_MCP_TELEMETRY_DEVICE_ID` (string, default: auto-generated) - Device identifier for tracking

To disable usage tracking, add this to your environment:

```bash
DT_MCP_DISABLE_TELEMETRY=true
```

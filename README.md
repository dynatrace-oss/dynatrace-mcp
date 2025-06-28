# Dynatrace MCP Server

This remote MCP server provides comprehensive access to the [Dynatrace](https://www.dynatrace.com/) observability platform, bringing real-time production data directly into your development workflow.

<img width="1046" alt="image" src="/assets/dynatrace-mcp-arch.png" />

## 🎯 Use Cases

- **Real-time observability** - Fetch production-level data for early detection and proactive monitoring
- **Contextual debugging** - Fix issues with full context from monitored exceptions, logs, and anomalies
- **Security insights** - Get detailed vulnerability analysis and security problem tracking
- **Natural language queries** - Use AI-powered DQL generation and explanation
- **Infrastructure monitoring** - Monitor hosts, processes, and system health
- **Deployment tracking** - Track changes and correlate with performance issues

## 🚀 Capabilities

### Core Observability
- **Problems & Issues** - List and get detailed problem information from your services
- **Security & Vulnerabilities** - Track security problems and vulnerability details with CVE information
- **Entity Management** - Get detailed information about monitored entities and find entities by name
- **Ownership Information** - Retrieve ownership details for entities and teams

### Data Query & Analysis
- **DQL Execution** - Execute Dynatrace Query Language (DQL) to retrieve logs, events, spans, and metrics. DQL is the most powerful way to query any data in Dynatrace, including problem events, security issues, and custom metrics.
- **DQL Validation** - Verify DQL statements before execution to prevent errors
- **Davis CoPilot AI** - Natural language to DQL conversion, DQL explanation, and AI assistance *(Note: Davis CoPilot AI is GA, but the Davis CoPilot APIs are in preview)*

### Infrastructure & Performance
- **Infrastructure Health** - Monitor host status, CPU, memory, disk usage, and network performance
- **Process Monitoring** - Track running processes and their resource usage across hosts
- **Real-time Metrics** - Get comprehensive performance data for any entity with CPU, memory, response time, and throughput
- **Distributed Tracing** - Analyze request flows across microservices with detailed span information

### Business & User Experience
- **SLO Monitoring** - Track service level objectives, violations, and error budget consumption
- **User Experience** - Monitor user sessions, page views, and application performance metrics
- **Synthetic Monitoring** - Check website availability and performance from different geographic locations

### Operations & Automation
- **Change Detection** - Track deployments, configuration changes, and custom annotations
- **Maintenance Windows** - Get information about scheduled maintenance and monitoring reductions
- **Service Dependencies** - Understand service relationships and dependencies
- **Slack Integration** - Send notifications to Slack channels via Dynatrace connectors
- **Workflow Automation** - Create and manage notification workflows for teams

### AI-Powered Assistance
- **Natural Language to DQL** - Convert plain English queries to Dynatrace Query Language
- **DQL Explanation** - Get plain English explanations of complex DQL queries
- **AI Chat Assistant** - Get contextual help and guidance for Dynatrace questions
- **Feedback System** - Provide feedback to improve AI responses over time

> **Note:** While Davis CoPilot AI is generally available (GA), the Davis CoPilot APIs are currently in preview. For more information, visit the [Davis CoPilot Preview Community](https://dt-url.net/copilot-community).

## ⚡ Quickstart

**Work in progress**

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

## 🔐 Environment Variables

A **Dynatrace OAuth Client** is needed to communicate with your Dynatrace Environment. Please follow the documentation about
[creating an Oauth Client in Dynatrace](https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/oauth-clients),
and set up the following environment variables in order for this MCP to work:

### Required Variables
* `DT_ENVIRONMENT` (string, e.g., https://abc12345.apps.dynatrace.com) - URL to your Dynatrace Platform (do not use Dynatrace classic URLs like `abc12345.live.dynatrace.com`)
* `OAUTH_CLIENT_ID` (string, e.g., `dt0s02.SAMPLE`) - Dynatrace OAuth Client ID
* `OAUTH_CLIENT_SECRET` (string, e.g., `dt0s02.SAMPLE.abcd1234`) - Dynatrace OAuth Client Secret

### Required OAuth Client Scopes
  * `app-engine:apps:run` - needed for environmentInformationClient
  * `app-engine:functions:run` - needed for environmentInformationClient
  * `hub:catalog:read` - get details about installed Apps on Dynatrace Environment
  * `environment-api:security-problems:read` - needed for reading security problems
  * `environment-api:entities:read` - read monitored entities
  * `environment-api:problems:read` - get problems
  * `environment-api:metrics:read` - read metrics
  * `environment-api:slo:read` - read SLOs
  * `environment-api:synthetic:read` - read synthetic monitors
  * `davis-copilot:conversations:execute` - execute conversational skill
  * `davis-copilot:nl2dql:execute` - execute NL to DQL skill
  * `davis-copilot:dql2nl:execute` - execute DQL to NL skill
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
  * `settings:objects:read` - needed for reading ownership information and Guardians (SRG) from settings

    **Note**: Please ensure that `settings:objects:read` is used, and *not* the similarly named scope `app-settings:objects:read`.

### Optional Variables
* `SLACK_CONNECTION_ID` (string) - connection ID of a [Slack Connection](https://docs.dynatrace.com/docs/analyze-explore-automate/workflows/actions/slack)
* `USE_APP_SETTINGS`  (boolean, `true` or `false`; default: `false`)
  * Requires scope `app-settings:objects:read` to read settings-objects from app settings
* `USE_WORKFLOWS` (boolean, `true` or `false`; default: `false`)
  * Requires scopes `automation:workflows:read`, `automation:workflows:write` and `automation:workflows:run` to read, write and execute Workflows

## 💡 Example Prompts

Use these example prompts as a starting point. Just copy them into your IDE or agent setup, adapt them to your services/stack/architecture,
and extend them as needed. They're here to help you imagine how real-time observability and automation work together in the MCP context in your IDE.

### Security & Vulnerability Management
**Find open vulnerabilities on production, setup alert.**
```
I have this code snippet here in my IDE, where I get a dependency vulnerability warning for my code.
Check if I see any open vulnerability/cve on production.
Analyze a specific production problem.
Setup a workflow that sends Slack alerts to the #devops-alerts channel when availability problems occur.
```

### Performance Troubleshooting
**Debug intermittent 503 errors.**
```
Our load balancer is intermittently returning 503 errors during peak traffic.
Pull all recent problems detected for our front-end services and
run a DQL query to correlate error rates with service instance health indicators.
I suspect we have circuit breakers triggering, but need confirmation from the telemetry data.
```

**Correlate memory issue with logs.**
```
There's a problem with high memory usage on one of our hosts.
Get the problem details and then fetch related logs to help understand
what's causing the memory spike? Which file in this repo is this related to?
```

**Query problem events with DQL.**
```
We're seeing intermittent failures in our payment service.
Use DQL to query for all problem events related to the payment service
in the last 24 hours and show me the correlation with infrastructure metrics.
```

### Distributed Tracing & Request Flow
**Trace request flow analysis.**
```
Our users are experiencing slow checkout processes.
Can you execute a DQL query to show me the full request trace for our checkout flow,
so I can identify which service is causing the bottleneck?
```

### Infrastructure & Operations
**Analyze Kubernetes cluster events.**
```
Our application deployments seem to be failing intermittently.
Can you fetch recent events from our "production-cluster"
to help identify what might be causing these deployment issues?
```

**Monitor website availability from multiple locations.**
```
Our customers in Europe are reporting slow website performance.
Can you check our synthetic monitors to see if there are any availability issues
from different geographic locations and get the test results?
```

**Investigate infrastructure health issues.**
```
We're seeing high CPU usage alerts on our production hosts.
Can you get the infrastructure health data and check which processes
are consuming the most resources on our affected hosts?
```

**Track deployment impact on services.**
```
We just deployed a new version of our payment service.
Can you check the deployment events and see if there were any
configuration changes that might have affected service performance?
```

### AI-Powered Assistance
**Use Davis CoPilot to generate DQL queries.**
```
I need to analyze error rates for our payment service.
Can you use Davis CoPilot to convert this natural language request
into a DQL query: "Show me error rates for the payment service in the last hour"?
```

**Get AI assistance for troubleshooting.**
```
Our application is experiencing high memory usage.
Can you chat with Davis CoPilot to get guidance on how to
investigate memory issues in Dynatrace?
```

**Understand complex DQL queries.**
```
I found this complex DQL query but I'm not sure what it does.
Can you use Davis CoPilot to explain this query in plain English:
"fetch logs | filter dt.source_entity == 'SERVICE-123' | summarize count(), by:{severity} | sort count() desc"?
```

## 🔧 Troubleshooting

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

## 🤖 Agent Workflow Guide

This section provides guidance for AI agents on how to effectively use the Dynatrace MCP tools, especially for complex workflows that require multiple tool interactions.

### 🔄 Natural Language to DQL Workflow

**When to use this workflow:** When users ask questions in natural language that require data analysis, such as "Show me error rates for the payment service" or "What are the slowest database queries?"

**Step-by-step process:**

1. **Generate DQL from Natural Language**
   - Use `generate_dql_from_natural_language` tool
   - Provide a clear, specific natural language description
   - Example: "Show me error rates for the payment service in the last hour"

2. **Validate the Generated DQL**
   - Use `verify_dql` tool to check if the generated DQL is valid
   - This prevents execution errors and helps identify issues

3. **Execute the DQL Query**
   - Use `execute_dql` tool to run the validated query
   - Review the results to ensure they match the user's intent

4. **Iterate if Needed**
   - If results don't match expectations, refine the natural language description
   - Use `explain_dql_in_natural_language` to understand what the current query does
   - Generate a new DQL query with more specific requirements

5. **Provide Context and Analysis**
   - Use the results to provide meaningful insights
   - Correlate with other data sources if needed (problems, metrics, etc.)

**Example Iteration:**
```
User: "Show me database performance issues"
→ Generate DQL: "fetch logs | filter dt.source_entity == 'database'"
→ Verify DQL: Valid
→ Execute DQL: Returns logs but not performance metrics
→ Refine: "Show me database performance metrics and slow queries"
→ Generate new DQL: "fetch metrics | filter metricId in ('builtin:database.performance')"
→ Execute and provide results
```

### 🔍 Problem Investigation Workflow

**When to use:** When investigating incidents, errors, or performance issues.

**Recommended tool sequence:**
1. `list_problems` - Get overview of current issues
2. `get_problem_details` - Get detailed information about specific problems
3. `get_entity_details` - Understand affected entities
4. `get_entity_metrics` - Get performance data for affected entities
5. `execute_dql` - Query specific logs, metrics, or events
6. `get_trace_details` - Analyze request flows if applicable

### 🏗️ Infrastructure Health Workflow

**When to use:** When monitoring system health, capacity planning, or troubleshooting infrastructure issues.

**Recommended tool sequence:**
1. `get_infrastructure_health` - Get host status overview
2. `get_processes` - Check running processes on specific hosts
3. `get_infrastructure_metrics` - Get detailed performance metrics
4. `get_maintenance_windows` - Check if maintenance is affecting monitoring
5. `execute_dql` - Query specific infrastructure data

### 🚀 Deployment Impact Analysis Workflow

**When to use:** When analyzing the impact of deployments or configuration changes.

**Recommended tool sequence:**
1. `get_deployment_events` - Get recent deployment information
2. `get_change_events` - Check for configuration changes
3. `get_entity_metrics` - Compare before/after performance
4. `get_slo_details` - Check if SLAs were affected
5. `execute_dql` - Query specific time ranges for detailed analysis

### 🎯 Best Practices for Agents

1. **Always validate DQL before execution** - Use `verify_dql` to prevent errors
2. **Iterate on natural language queries** - Refine descriptions based on results
3. **Provide context** - Explain what you're doing and why
4. **Use multiple tools** - Combine different tools for comprehensive analysis
5. **Handle errors gracefully** - If a tool fails, try alternative approaches
6. **Ask for clarification** - If user requests are ambiguous, ask for more details

### 🔧 Tool-Specific Guidelines

**Davis CoPilot Tools:**
- Use `generate_dql_from_natural_language` for initial query generation
- Use `explain_dql_in_natural_language` to understand complex queries
- Use `chat_with_davis_copilot` for general Dynatrace guidance
- Provide feedback using `submit_davis_copilot_feedback` to improve future responses

**DQL Execution:**
- Always verify DQL statements before execution
- Use specific time ranges and filters for better performance
- Consider using sampling for large datasets
- Provide clear explanations of what the query does

**Entity Analysis:**
- Start with entity names, then get entity IDs for detailed analysis
- Use entity IDs consistently across multiple tools
- Correlate entity data with problems and metrics

This workflow guide helps agents understand the most effective ways to use the Dynatrace MCP tools and provides clear patterns for common scenarios.

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

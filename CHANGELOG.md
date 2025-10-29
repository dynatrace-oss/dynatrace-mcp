# @dynatrace-oss/dynatrace-mcp-server

## Unreleased Changes

### Tools

- Added `status` parameter to `list_problems` tool to filter problems by status (ACTIVE, CLOSED, or ALL).
- Added `timeframe` parameter to `list_problems` tool to support flexible time ranges (e.g., "12h", "24h", "7d", "30d"). Default: "24h".

## 0.12.0

- Fixed OAuth callback URL to work in GitHub Codespaces by detecting the environment and using the forwarded URL instead of localhost
- Breaking: Changed default HTTP server host binding from `0.0.0.0` to `127.0.0.1` for improved security
- Removed scope `app-engine:functions:run` as it's not needed

## 0.11.0

- Fixed usage percentage to no longer be printed when no budget is set
- Fixed an issue with `find_entity_by_name` tool filtering out valid entries
- Added proxy support for corporate environments via `HTTPS_PROXY`

## 0.10.0

### Tools

- Improved the `find_entities_by_name` tool to use the `smartscapeNode` DQL command for more efficient entity discovery, with a fallback to fetching entity types directly.
- Added default response limiting to the `execute_dql` tool to prevent excessively large payloads. The new `recordLimit` and `recordSizeLimitMB` parameters help control the size of the data returned to the language model.

### Scopes

- Added the `storage:smartscape:read` OAuth scope to support the improved `find_entities_by_name` tool.

### Other Changes

- Fixed an issue where disabling telemetry with `DT_MCP_DISABLE_TELEMETRY=true` would show a stack trace instead of a concise message.

### Proxy Support

- Added support for system proxy configuration via environment variables (`https_proxy`, `HTTPS_PROXY`, `http_proxy`, `HTTP_PROXY`, `no_proxy`, `NO_PROXY`)
- The MCP server now honors corporate proxy settings for all HTTP requests to Dynatrace environments

### Other Changes

- Removed unused `shouldBypassProxy` function from proxy configuration utilities

## 0.9.2

- Improved error handling when initializing the connection for the first time

## 0.9.1

- Replaced file-based token cache with an in-memory cache to avoid writing credentials to disk. Tokens now reset on server restart.

## 0.9.0

**Highlights**
🔑 **Simplified Authentication**: Added OAuth authorization code flow. Users can now simply set `DT_ENVIRONMENT` and complete an interactive browser authentication flow.

### Other Changes

- Dependency updates
- Added Snyk Dependency scans
- Fixed publishing to official MCP Registry

## 0.8.0

### Tools

- Added a `limit` argument to the `get_kubernetes_events` tool, allowing you to control the number of events returned and improving performance for large clusters

### Other Changes

- Fixed some typos
- Respond with a proper JSON RPC Error message

## 0.7.0

**Highlights**
🔒 Human approval for critical operations
🔍 Enhanced entity discovery with automatic detection
🛠️ Improved error handling and internal optimizations

### Tools

- Removed the `get_entity_details` tool and consolidated its functionality into the `find_entity_by_name` tool for a streamlined user experience
- Enhanced the `find_entity_by_name` tool with automatic entity name detection for improved usability
- Added human approval steps for critical operations in `send_email`, `send_slack_message`, `create_workflow_for_notification`, and `make_workflow_public` tools to ensure user consent and prevent unintended actions

### Other Changes

- Disabled Grail budget enforcement for Dynatrace-internal development and hardening stages to facilitate testing and development workflows
- Improved error handling for environments without Davis Copilot enabled, now providing direct links to enable the feature

## 0.6.1

- Fixed an issue with MCP communication failing with `SyntaxError: Unexpected token 'd'` due to `dotenv`
- Added Support for Google Gemini CLI

## 0.6.0

**Highlights**:
💰 Grail budget tracking and cost control
📧 Send findings via E-Mail via the Dynatrace E-Mail API
🔧 Enhanced tool annotations for better LLM integration
🏪 Published to official MCP Registry and GitHub MCP Registry

### Scopes

- Added OAuth scope `email:emails:send` to enable email functionality

### Tools Added/Removed

- Added `send_email` tool for sending emails via the Dynatrace Email API with support for multiple recipients (TO, CC, BCC), custom subject lines, and rich body content
- Added tool-annotations `readOnlyHint`, `idempotentHint`, and `openWorldHint` to improve tool usage by providing better hints to LLM clients about tool behavior
- Added next-steps guidance to `get_entity_details` tool to help users discover related metrics, problems, and logs for entities

### Other Changes

- Fixed an issue with the stateless HTTP server that prevented it from accepting multiple simultaneous connections
- Added Grail budget tracking with `DT_GRAIL_QUERY_BUDGET_GB` environment variable (default: 1000 GB, setting it to `-1` disables budget tracking), providing cost control and visibility with warnings and alerts in `execute_dql` tool responses
- Added budget enforcement that prevents further DQL query execution when the configured Grail budget has been exceeded, protecting against unexpected costs
- Improved Davis CoPilot integration by migrating to the official `@dynatrace-sdk/client-davis-copilot` package, enhancing reliability and maintainability while reducing manual API implementation
- Added metadata output to `execute_dql` tool which includes scanned bytes information, enabling better cost tracking for Dynatrace Grail data access
- Added telemetry via Dynatrace OpenKit to improve the product with anonymous usage statistics and error information, enhancing product development while respecting user privacy (can be disabled via `DT_MCP_DISABLE_TELEMETRY` environment variable)
- Added `server.json` configuration and published the MCP server to the official MCP Registry, making it easier for users to discover and install the server

## 0.6.0 (Release Candidate 2)

- Fixed an issue with the stateless HTTP server that prevented it from accepting multiple simultaneous connections
- Added Grail budget tracking with `DT_GRAIL_QUERY_BUDGET_GB` environment variable (default: 1000 GB, setting it to `-1` disables budget tracking), providing cost control and visibility with warnings and alerts in `execute_dql` tool responses
- Added budget enforcement that prevents further DQL query execution when the configured Grail budget has been exceeded, protecting against unexpected costs
- Added `send_email` tool for sending emails via the Dynatrace Email API with support for multiple recipients (TO, CC, BCC), custom subject lines, and rich body content
- Added OAuth scope `email:emails:send` to enable email functionality
- Improved Davis CoPilot integration by migrating to the official `@dynatrace-sdk/client-davis-copilot` package, enhancing reliability and maintainability while reducing manual API implementation

## 0.6.0 (Release Candidate 1)

- Added metadata output to `execute_dql` tool which includes scanned bytes information, enabling better cost tracking for Dynatrace Grail data access
- Added next-steps guidance to `get_entity_details` tool to help users discover related metrics, problems, and logs for entities
- Added telemetry via Dynatrace OpenKit to improve the product with anonymous usage statistics and error information, enhancing product development while respecting user privacy (can be disabled via `DT_MCP_DISABLE_TELEMETRY` environment variable)
- Added `server.json` configuration and published the MCP server to the official MCP Registry, making it easier for users to discover and install the server
- Added metadata output which includes Grail scanned bytes (for cost tracking) to `execute_dql`
- Added next-steps for `get_entity_details` to find out about metrics, problems and logs
- Added Telemetry via Dynatrace OpenKit to improve the product with anonymous usage statistics and error information (can be disabled via `DT_MCP_DISABLE_TELEMETRY` environment variable)

## 0.5.0

**Highlights**:
🚀 Davis CoPilot AI, supporting natural language to DQL
🌐 HTTP transport support
🔑 Platform Token authentication
📚 Tool consolidation into `execute_dql`

### Scopes

- Removed unnecessary scope `environment-api:security.problems:read` as it's no longer needed
- Removed unneeded scopes `environment-api:slo:read` and `environment-api:metrics:read` as functionality is handled via the `execute_dql` tool

### Tools Added/Removed

- Added tools to translate between natural language and DQL via Davis CoPilot, enabling easier query creation
- Added tool to chat with Davis CoPilot for interactive assistance and guidance
- Removed `get_logs_for_entity` tool in favor of the more flexible `execute_dql` tool
- Removed `get_vulnerability_details` tool as the same functionality can now be achieved with a simple `execute_dql` call, simplifying the tool set
- Removed `get_problem_details` tool as the same functionality can be achieved with a simple `execute_dql` call

### Other Changes

- Added cost considerations disclaimer in README about Dynatrace Grail data access to help users understand potential costs
- Added `dtClientContext` to `execute_dql` tool, enabling usage monitoring for Grail access and better cost tracking
- Added information about Semantic Dictionary for `execute_dql` tool description, improving user guidance for DQL queries
- Added Streamable HTTP transport support with `--http`/`--server`, `--port`, and `--host` arguments, enabling you to run the server over HTTP while maintaining stdio as the default for backward compatibility
- Enhanced `find_entity_by_name` tool to include all entities from the Smartscape topology, providing comprehensive entity discovery capabilities
- Optimized `get_monitored_entity_details` tool to use direct entity type lookup for better performance and faster response times
- Improved `list_vulnerabilities` tool to use DQL statements instead of classic API, aligned parameters with `list_problems` tool for consistent user experience
- Added comprehensive AI-Powered Observability Workshop Rules with hierarchical workflow architecture for advanced analysis scenarios
- Enhanced README with advanced analysis capabilities including incident response, security compliance, and DevOps automation workflows
- Added support for multi-phase incident investigation, cross-data source correlation, and precise root cause identification
- Introduced streamlined rule structure optimized for LLM context windows with all files under 6,500 tokens for better AI assistant performance
- Added integration guides for multiple AI assistants including Amazon Q, Cursor, Windsurf, Cline, and GitHub Copilot
- Enhanced example prompts with sophisticated use cases for transaction analysis, security assessment, and DevOps workflows
- Removed `metrics` from `execute_dql` example with `fetch` to improve clarity
- Clarified usage of `verify_dql` to avoid unnecessary tool calls and improve efficiency
- Improved `list_problems` tool to use DQL statements for retrieving data from Dynatrace and provide better next steps for problem resolution
- Added support for authorization via Platform Tokens using the `DT_PLATFORM_TOKEN` environment variable, providing an alternative authentication method

## 0.5.0 (Release Candidate 4)

- Added Streamable HTTP transport support with `--http`/`--server`, `--port`, and `--host` arguments (default remains stdio for backward compatibility)
- Adapted `find_entity_by_name` tool to include all entities from the Smartscape topology.
- Optimized `get_monitored_entity_details` tool to use direct entity type lookup for better performance.

## 0.5.0 (Release Candidate 3)

- Improved `list_vulnerabilities` tool to use DQL statement instead of classic API, and aligned parameters with `list_problems` tool
- Removed `get_vulnerability_details` tool as the same can now be achieved with a simple `execute_dql` call
- Removed scope `environment-api:security.problems:read` as it's no longer needed
- Added comprehensive AI-Powered Observability Workshop Rules with hierarchical workflow architecture
- Enhanced README with advanced analysis capabilities including incident response, security compliance, and DevOps automation
- Added support for multi-phase incident investigation, cross-data source correlation, and precise root cause identification
- Introduced streamlined rule structure optimized for LLM context windows (all files under 6,500 tokens)
- Added integration guides for multiple AI assistants (Amazon Q, Cursor, Windsurf, Cline, GitHub Copilot)
- Enhanced example prompts with sophisticated use cases for transaction analysis, security assessment, and DevOps workflows
- Removed unneeded scopes `environment-api:slo:read` (no tool is using this) and `environment-api:metrics:read` (anyway handled via execute DQL tool)
- Removed `metrics` from `execute_dql` example with `fetch`.
- Clarified usage of `verify_dql` to avoid unnecessary tool calls.

## 0.5.0 (Release Candidate 2)

- Improved `list_problems` tool to use a DQL statement to retrieve data from Dynatrace, and provide better next steps
- Removed `get_problem_details` tool, as the same can be achieved with a simple "execute_dql" call
- Removed scope `environment-api:problems:read` as it's no longer needed

## 0.5.0 (Release Candidate 1)

- Added support for Authorization via Platform Tokens via environment variable `DT_PLATFORM_TOKEN`
- Added tools to translate between natural language and DQL via Davis CoPilot
- Added tool to chat with Davis CoPilot

## 0.4.0

- Improve Authentication - fine-grained OAuth calls per tool
- Fixed: Missing scope `storage:security.events:read` for execute DQL

## 0.3.0

- Provide version of dynatrace-mcp-server on startup
- Define HTTP user-agent of dynatrace-mcp-server

## 0.2.0

- Added new tool `get_entity_by_name` which allows to find the entity ID of a monitored entity by its name
- Improved handling and description of `execute_dql` tool
- Improved checking for Dynatrace Environment URL

## 0.1.4

- Improved error-handling of authentication mechanism

## 0.1.3

- Improved error-handling of authentication mechanism

## 0.1.2

- Fix: Added missing `storage:events:read` scope

## 0.1.1

- Maintenance release

## 0.1.0

- Initial Release

# @dynatrace-oss/dynatrace-mcp-server

## Unreleased Changes

- Fixed an issue with stateless HTTP server only taking a single connection
- Added Grail budget tracking with `DT_GRAIL_QUERY_BUDGET_GB` environment variable (default: 1000 GB, setting it to `-1` disables it), as well as warnings and exceeded alerts in `execute_dql` tool responses
- Enforce Grail budget by throwing an exception when the budget has been exceeded, preventing further DQL query execution
- Added `send_email` tool for sending emails via Dynatrace Email API with support for multiple recipients (TO, CC, BCC), subject, body content
- Added OAuth scope `email:emails:send` for email functionality

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

# @dynatrace-oss/dynatrace-mcp-server

## Unreleased changes

- Removed unneeded scopes `environment-api:slo:read` (no tool is using this) and `environment-api:metrics:read` (anyway handled via execute DQL tool)

## 0.5.0 (Release Candidate 2)

- Improved "List Problems" tool to use a DQL statement to retrieve data from Dynatrace, and provide better next steps
- Removed "Get Problem Details" tool, as the same can be achieved with a simple "execute_dql" call
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

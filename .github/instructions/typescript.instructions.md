---
applyTo: 'src/**.ts'
---

# MCP Server – TypeScript Agent Instructions

This document provides guidance for AI agents working on the TypeScript MCP server implementation. It covers the key concepts, patterns and conventions used in this project.

## Reference Documentation

- **Tools**: https://modelcontextprotocol.io/docs/concepts/tools
- **Tool Annotations**: https://modelcontextprotocol.io/docs/concepts/tools#tool-annotations
- **Resources**: https://modelcontextprotocol.io/docs/concepts/resources
- **Transports** (stdio & Streamable HTTP): https://modelcontextprotocol.io/docs/concepts/transports

## Project-Specific Patterns

### console.error for Logging

Use `console.error` for all logging purposes in the MCP server code. This ensures that all log output is visible in the MCP host's log, which typically captures `stderr` output. Avoid using `console.log` as this prints to `stdin`, which is reserved for the MCP protocol communication and may not be visible in logs.

### Implementing MCP Tools

Please refer to [./.github/instructions/mcp-tools.instructions.md](./mcp-tools.instructions.md) for detailed instructions on implementing MCP tools in this codebase.

### Capability Modules

Tools call capabilities (features), which live in `src/capabilities/<feature-name>.ts`. These files export plain async functions that accept an `HttpClient` and return data. They do **not** register tools themselves – that is done in `src/index.ts`.

```
src/capabilities/list-problems.ts        ← pure business logic
src/index.ts                             ← tool registration using tool() helper
```

Follow this separation when adding new features:

1. Create `src/capabilities/my-feature.ts` with the core logic.
2. Import and register it in `src/index.ts` using `tool()`.

### Authentication – `createAuthenticatedHttpClient`

Use `createAuthenticatedHttpClient(scopes)` to get a Dynatrace `HttpClient` scoped to exactly the permissions required for the operation:

```typescript
const dtClient = await createAuthenticatedHttpClient(['storage:logs:read', 'storage:entities:read']);
```

When adding a new tool, check whether the required scopes already exist in `allRequiredScopes` (at the top of `src/index.ts`). If not:

1. Add the new scope to `allRequiredScopes`.
2. Update the "Scopes for Authentication" section in `README.md` with a description.

### Human-in-the-Loop Approval

For irreversible or destructive operations (e.g. creating workflows, modifying entities), use `requestHumanApproval()` before executing:

```typescript
const approved = await requestHumanApproval('Create a new workflow for problem notification');
if (!approved) {
  return 'Operation cancelled by user.';
}
// proceed with the write operation
```

Set `annotations: { destructiveHint: true }` for any tool that uses this pattern.

### Response Format

Simple read-only tools can return a plain `string`. For tools that also surface structured data to an MCP App UI, return `{ text, _meta }`:

```typescript
return {
  text: 'Human-readable summary for the AI agent',
  _meta: {
    records: queryResult.records, // consumed by the MCP App renderer
    environmentUrl: dtEnvironment,
  },
};
```

### Error Handling

- Throw errors naturally inside tool callbacks – `wrapToolCallback` catches them.
- For expected Dynatrace API errors, use `isClientRequestError(error)` from `@dynatrace-sdk/shared-errors` to detect client request errors, and `handleClientRequestError(error)` from `./utils/dynatrace-connection-utils` to translate them into readable messages.
- Log unexpected errors with `console.error` before re-throwing; all stderr output is visible in the MCP host's server logs.

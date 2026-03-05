---
applyTo: 'src/**'
---

# MCP Server – TypeScript Agent Instructions

This document provides guidance for AI agents working on the TypeScript MCP server implementation. It covers the key concepts, patterns and conventions used in this project.

## Reference Documentation

- **Tools**: https://modelcontextprotocol.io/docs/concepts/tools
- **Tool Annotations**: https://modelcontextprotocol.io/docs/concepts/tools#tool-annotations
- **Resources**: https://modelcontextprotocol.io/docs/concepts/resources
- **Transports** (stdio & Streamable HTTP): https://modelcontextprotocol.io/docs/concepts/transports

## Project-Specific Patterns

### The `tool()` Helper

**Always use the `tool()` helper function** (see [`src/index.ts`](../../src/index.ts)) instead of calling `server.registerTool()` directly.

```typescript
tool(
  'my_tool_name', // snake_case name, used as MCP tool identifier
  'My Tool Title', // human-readable title
  'What this tool does.', // description shown to the agent
  {
    // Zod parameter schema (ZodRawShape)
    entityId: z.string().describe('The entity ID to look up'),
  },
  // Tool Annotations
  {
    readOnlyHint: true, // only reads data, never modifies it
    destructiveHint: true, // may perform irreversible actions, requires human approval
    idempotentHint: true, // repeated calls with the same arguments produce the same result with no additional side-effects
    openWorldHint: true, // interacts with external or live data sources
  },
  // Tool Implementation
  async ({ entityId }) => {
    const dtClient = await createAuthenticatedHttpClient(['storage:entities:read']);
    // ... call Dynatrace SDK or capability function
    // And return the result
    return `Result: ${entityId}`;
  },
);
```

The callback must return either a `string` or `{ text: string; _meta?: Record<string, unknown> }`. Errors thrown inside are caught and returned as `isError: true` responses automatically.

### Capability Modules

Each logical feature lives in `src/capabilities/<feature-name>.ts`. These files export plain async functions that accept a `HttpClient` and return data. They do **not** register tools themselves – that is done in `src/index.ts`.

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

## Development Workflow

1. **Build**: `npm run build` – compiles TypeScript to `dist/`.
2. **Verify startup**: `node dist/index.js` (stdio mode) or `node dist/index.js --http` (HTTP mode) – server must start without errors.
3. **Unit tests**: `npm test` – runs Jest unit tests in `src/**/*.test.ts`.

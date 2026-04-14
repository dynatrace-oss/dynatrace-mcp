---
applyTo: 'src/index.ts'
---

# Implementing MCP Tools

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

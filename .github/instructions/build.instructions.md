---
applyTo: '*'
---

# Build Instructions

1. **Build**: `npm run build` – compiles TypeScript to `dist/`.
2. **Verify startup**: `DT_MCP_DISABLE_TELEMETRY=true node dist/index.js` (stdio mode) or `DT_MCP_DISABLE_TELEMETRY=true node dist/index.js --http` (HTTP mode) – server must start without errors.
3. **Unit tests**: `npm test` – runs Jest unit tests in `src/**/*.test.ts`. Telemetry is automatically disabled via the Jest configuration.

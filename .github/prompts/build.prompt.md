---
agent: agent
---

# Build Instructions

1. **Build**: `npm run build` – compiles TypeScript to `dist/`.
2. **Verify startup**: `node dist/index.js` (stdio mode) or `node dist/index.js --http` (HTTP mode) – server must start without errors.
3. **Unit tests**: `npm test` – runs Jest unit tests in `src/**/*.test.ts`.

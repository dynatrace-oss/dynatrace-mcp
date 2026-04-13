# Agent Instructions

This file contains instructions for AI agents working in this repository.

## Running Tests

Telemetry is automatically disabled during all test runs via the Jest configuration (`jest.config.js`), so no extra setup is required when using `npm test`, `npm run test:unit`, or `npm run test:integration`.

If you run tests outside of Jest (e.g. in a custom script or CI step that bypasses the Jest config), disable telemetry explicitly to avoid unnecessary network connections:

```bash
DT_MCP_DISABLE_TELEMETRY=true <your-test-command>
```

## Building

```bash
npm run build
```

## Linting

```bash
npm run lint
npm run prettier
```

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/). All commit messages must follow the format:

```
<type>(<optional scope>): <description>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`, `build`, `revert`.

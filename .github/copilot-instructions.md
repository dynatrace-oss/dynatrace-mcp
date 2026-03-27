# Dynatrace MCP Server

You are a Developer working on the Dynatrace Model-Context-Protocol (MCP) Server project.

It is written in TypeScript and uses Node.js as its runtime. You need to understand how to write MCP server code based on https://www.npmjs.com/package/@modelcontextprotocol/sdk, primarily the terms `tool` and `resource`.

## Guidelines

- Follow the user's requirements carefully & to the letter.
- First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.
- Focus on easy and readable code, over being performant.
- Fully implement all requested functionality.
- Leave NO todo's, placeholders or missing pieces.
- Include all required imports, and ensure proper naming of key components.
- Be concise, minimize any other prose.
- If you think there might not be a correct answer, you say so.
- If you do not know the answer, say so, instead of guessing.
- When the user asks you to solve a bug in the project, consider adding a test case.

## Repo Structure

The repository is structured as follows:

- `src/`: Contains the source code for the MCP server.
- `src/index.ts`: Main entrypoint of the MCP server. Defines tools and OAuth clients.
- `src/capabilities/*.ts`: Contains the actual tool definition and implementation.
- `src/dynatrace-clients.ts`: Contains OAuth client creation and configuration.
- `src/getDynatraceEnv.ts`: Contains environment detection utilities.
- `dist/`: Output directory for compiled JavaScript files.

## Coding Guidelines

Please try to follow basic TypeScript and Node.js coding conventions, especially [mtypescript.instructions.md](/.github/instructions/typescript.instructions.md).

## Dependencies

The following dependencies are allowed:

- Core MCP SDK (`@modelcontextprotocol/sdk`),
- ZOD schema validation (`zod-to-json-schema`),
- the Dynatrace app framework (`dt-app`),
- `vite` / `vite-plugin-singlefile` and `react` for the UI part of the project,
- and `@dynatrace` as well as `@dynatrace-sdk` packages.

Avoid installing any other dependencies, unless explicitly approved.

## Authentication

For authentication, we are using OAuth Client ID and Secrets from Dynatrace. We are making use of `@dynatrace-sdk` packages, which always take an `httpClient` as a parameter. When introducing new tools, please investigate whether all scopes required are already present, or whether they need to be added.
Make sure to not just update the code, but also update README.md with those required scopes.

**Important:** OAuth scopes must always be kept in sync between implementation and documentation:

- Implementation: `src/index.ts` defines all scopes in the `allRequiredScopes` array
- Documentation: `README.md` section "Scopes for Authentication" lists all scopes with descriptions
- Use the same scope names and maintain consistent descriptions

## Building and Running

See [build.instructions.md](/.github/instructions/build.instructions.md) for instructions on how to build and run the MCP server.

## Commit Messages and PR Titles

This project uses **[Conventional Commits](https://www.conventionalcommits.org/)** (semantic commits). All commit messages **and PR titles** must follow the format:

```
<type>(<optional scope>): <description>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`, `build`, `revert`.

Examples:

- `feat(tools): add new problem analysis tool`
- `fix(auth): handle token refresh race condition`
- `chore(deps): bump @modelcontextprotocol/sdk from 1.25.0 to 1.26.0`

## Changelog

See [changelog.instructions.md](/.github/instructions/changelog.instructions.md) for full guidance on what to include and how to format changelog entries.

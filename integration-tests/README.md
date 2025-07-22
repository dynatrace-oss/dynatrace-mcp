# Integration Tests

This directory contains integration tests that make actual API calls to Dynatrace services. These tests are designed to verify the functionality of the MCP server against a real Dynatrace environment.

## Prerequisites

Before running integration tests, ensure you have:

**Environment Variables Set Up:**

- `OAUTH_CLIENT_ID` - Your Dynatrace OAuth client ID
- `OAUTH_CLIENT_SECRET` - Your Dynatrace OAuth client secret
- `DT_ENVIRONMENT` - Your Dynatrace environment URL (e.g., `https://abc123.apps.dynatrace.com`)
- `DT_PLATFORM_TOKEN` - (Optional) Your Dynatrace platform token

Run tests via

```bash
npm run test:integration
```

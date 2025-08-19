# Integration Tests

This directory contains integration tests that make actual API calls to Dynatrace services. These tests are designed to verify the functionality of the MCP server against a real Dynatrace environment.

## Test Suites

### **execute-dql.integration.test.ts**

Tests DQL query execution functionality including:

- Basic DQL query execution
- Query verification
- Error handling for invalid queries

### **davis-copilot-explain-dql.integration.test.ts**

Tests Davis CoPilot AI functionality including:

- Natural language to DQL translation
- DQL explanation capabilities
- Conversational AI features

### **send-email.integration.test.ts**

Tests email sending functionality including:

- Basic plain text emails
- Formatted content with markdown-style syntax
- Multiple recipients (TO, CC, BCC)
- Incident notification templates
- Security alert templates
- Error handling and validation

## Prerequisites

Before running integration tests, ensure you have:

**Environment Variables Set Up:**

- `OAUTH_CLIENT_ID` - Your Dynatrace OAuth client ID
- `OAUTH_CLIENT_SECRET` - Your Dynatrace OAuth client secret
- `DT_ENVIRONMENT` - Your Dynatrace environment URL (e.g., `https://abc123.apps.dynatrace.com`)
- `DT_PLATFORM_TOKEN` - (Optional) Your Dynatrace platform token

**Required OAuth Scopes:**

For DQL tests:

- `storage:*:read` - Various storage read permissions
- `app-engine:apps:run`
- `app-engine:functions:run`

For Davis CoPilot tests:

- `davis-copilot:*:execute` - AI capabilities
- All DQL-related scopes

For Email tests:

- `email:emails:send` - Email sending capability
- `app-engine:apps:run`
- `app-engine:functions:run`

## Running Tests

Run all integration tests:

```bash
npm run test:integration
```

Run specific test suite:

```bash
# DQL tests
npm test -- integration-tests/execute-dql.integration.test.ts

# Davis CoPilot tests
npm test -- integration-tests/davis-copilot-explain-dql.integration.test.ts

# Email tests
npm test -- integration-tests/send-email.integration.test.ts
```

## Important Notes

- **Rate Limiting**: Tests include delays between API calls to avoid rate limits
- **Real Environment**: These tests make actual API calls and may incur costs
- **Email Testing**: Email tests send actual emails to test addresses
- **Credentials**: Ensure your OAuth client has all required scopes enabled

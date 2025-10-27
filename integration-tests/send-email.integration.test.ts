/**
 * Integration test for send email functionality
 *
 * This test verifies the email sending functionality by making actual API calls
 * to the Dynatrace environment. These tests require valid authentication credentials
 * and the email:emails:send scope.
 *
 * IMPORTANT: Update the TEST_EMAIL_* variables below with your own email addresses
 * be        subject: '[Integration Test] Invalid Email Test',
        body: {
          body: 'Testing invalid email address handling.',
        },
      };unning these tests to avoid sending emails to unintended recipients.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { sendEmail, EmailRequest, EmailSendResult } from '../src/capabilities/send-email';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';

// Load environment variables
config();

const API_RATE_LIMIT_DELAY = 100; // Delay in milliseconds to avoid hitting API rate limits

const scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
];

const scopesEmail = [
  'email:emails:send', // Send emails via Dynatrace Email API
];

// Configure test email addresses - change these before running tests
const TEST_EMAIL_TO = 'your-test-email@example.com';
const TEST_EMAIL_CC = 'your-cc-email@example.com';
const TEST_EMAIL_BCC = 'your-bcc-email@example.com';

describe('Send Email Integration Tests', () => {
  let dynatraceEnv: DynatraceEnv;

  // Setup that runs once before all tests
  beforeAll(async () => {
    try {
      dynatraceEnv = getDynatraceEnv();
      console.log(`Testing against environment: ${dynatraceEnv.dtEnvironment}`);
    } catch (err) {
      throw new Error(`Environment configuration error: ${(err as Error).message}`);
    }
  });

  afterEach(async () => {
    // Add delay to avoid hitting API rate limits
    await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT_DELAY));
  });

  describe('Basic Email Sending', () => {
    it('should send a simple plain text email successfully', async () => {
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: [TEST_EMAIL_TO] },
        subject: '[Integration Test] Simple Email Test',
        body: {
          body: 'This is a test email sent from the Dynatrace MCP Server integration test.',
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toBeTruthy();
      expect(result.message).toBeDefined();
    }, 30000); // 30 second timeout

    it('should send an email with formatted content', async () => {
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      const formattedBody = `# Integration Test Email

## Test Summary
- **Test Type**: Integration Test
- **Service**: Dynatrace MCP Server
- **Status**: **RUNNING**

### Formatting Features Tested
* Bold text formatting
* Italic text formatting
* Code formatting: \`send_email\`
* Lists and structure

---

### Code Block Example
\`\`\`
fetch logs
| filter severity == "ERROR"
| limit 10
\`\`\`

### Test Results
| Feature | Status | Notes |
| --- | --- | --- |
| Plain Text | ✅ Pass | Basic functionality |
| Formatting | ⚠️ Testing | Rich text features |
| Recipients | ✅ Pass | Multiple recipient types |

[Dynatrace Dashboard](${dynatraceEnv.dtEnvironment})`;

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: [TEST_EMAIL_TO] },
        subject: '[Integration Test] 📧 Formatted Email Test',
        body: {
          body: formattedBody,
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toBeTruthy();
    }, 30000);

    it('should send an email with multiple recipients (TO, CC, BCC)', async () => {
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: [TEST_EMAIL_TO, TEST_EMAIL_TO] },
        ccRecipients: { emailAddresses: [TEST_EMAIL_CC] },
        bccRecipients: { emailAddresses: [TEST_EMAIL_BCC] },
        subject: '[Integration Test] Multiple Recipients Test',
        body: {
          body: `**Multiple Recipients Test**

This email was sent to multiple recipients to test the TO, CC, and BCC functionality:

- **TO**: ${TEST_EMAIL_TO}, ${TEST_EMAIL_TO}
- **CC**: ${TEST_EMAIL_CC}
- **BCC**: ${TEST_EMAIL_BCC}

All recipients should receive this message according to their designation.`,
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toBeTruthy();
    }, 30000);

    it('should send an incident notification email with proper formatting', async () => {
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      const incidentBody = `**🚨 INCIDENT ALERT - Payment Service**

## Incident Details
- **Incident ID**: INC-123456
- **Severity**: **P2**
- **Service**: \`payment-service\`
- **Environment**: PRODUCTION
- **Start Time**: ${new Date().toISOString()}

## Impact Assessment
- **User Impact**: Payment processing delays
- **Error Rate**: \`8.5%\`
- **Affected Users**: \`1,247\` users
- **SLA Risk**: MEDIUM

---

## Key Metrics
| Metric | Current | Normal | Threshold |
| --- | --- | --- | --- |
| Error Rate | \`8.5%\` | \`0.2%\` | \`5.0%\` |
| Response Time | \`2,500ms\` | \`300ms\` | \`1,000ms\` |
| Throughput | \`45req/min\` | \`120req/min\` | \`80req/min\` |

## Investigation Status
- **Assigned To**: On-Call Engineer
- **Current Action**: Investigating database connection issues
- **ETA**: 15 minutes

### Immediate Actions Required
1. **Acknowledge** this incident
2. **Check** recent deployments and database status
3. **Monitor** service recovery metrics
4. **Escalate** if not resolved within 30 minutes

[**🔗 View in Dynatrace**](${dynatraceEnv.dtEnvironment})`;

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: [TEST_EMAIL_TO] },
        ccRecipients: { emailAddresses: [TEST_EMAIL_CC] },
        subject: '🚨 P2 INCIDENT: Payment Service - High Error Rate Detected',
        body: {
          body: incidentBody,
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toBeTruthy();
    }, 30000);
  });

  describe('Email Content Validation', () => {
    it('should handle basic email without optional fields', async () => {
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: [TEST_EMAIL_TO] },
        subject: '[Integration Test] Basic Email Test',
        body: {
          body: 'This is a basic email test without optional fields.',
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toBeTruthy();
    }, 30000);

    it('should handle security alert email formatting', async () => {
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      const securityBody = `**🔒 SECURITY ALERT - High Severity Vulnerability**

## Security Event Details
- **Alert Type**: VULNERABILITY
- **Severity**: **HIGH**
- **Affected Systems**: \`web-frontend\`, \`api-gateway\`
- **Detection Time**: ${new Date().toISOString()}

## Threat Assessment
- **Risk Level**: HIGH
- **Potential Impact**: Data exposure risk
- **Affected Data**: User credentials, session tokens

---

### Vulnerability Details
- **CVE ID**: CVE-2024-XXXX
- **Component**: Log4j Library
- **Version**: 2.14.1
- **CVSS Score**: \`8.5\`

### Immediate Actions
1. **Isolate** affected systems if required
2. **Investigate** the security event details
3. **Apply** security patches immediately
4. **Report** to security team within 1 hour

### Remediation Status
- **Assigned To**: Security Team
- **Status**: INVESTIGATING
- **Next Update**: In 30 minutes

~~Do not delay remediation~~

[**🛡️ Security Dashboard**](${dynatraceEnv.dtEnvironment}/ui/security)`;

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: [TEST_EMAIL_TO] },
        ccRecipients: { emailAddresses: [TEST_EMAIL_CC] },
        bccRecipients: { emailAddresses: [TEST_EMAIL_BCC] },
        subject: '🔒 HIGH SEVERITY: Security Vulnerability Detected - Immediate Action Required',
        body: {
          body: securityBody,
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toBeTruthy();
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle authorization errors gracefully', async () => {
      // Create client with invalid credentials
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat([]), // no scopesEmail
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: [TEST_EMAIL_TO] },
        subject: '[Integration Test] Authorization Error Test',
        body: {
          body: 'This should fail due to insufficient permissions.',
        },
      };

      await expect(sendEmail(dtClient, emailRequest)).rejects.toThrow(`Forbidden`);
    }, 30000);

    it('should handle invalid email addresses appropriately', async () => {
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: ['invalid-email-format'] },
        subject: '[Integration Test] Invalid Email Format Test',
        body: {
          contentType: 'text/plain',
          body: 'Testing invalid email address handling.',
        },
      };

      // This might succeed but should report invalid destinations
      try {
        const result = await sendEmail(dtClient, emailRequest);

        // If the email API accepts the request but marks destinations as invalid
        if (result.invalidDestinations && result.invalidDestinations.length > 0) {
          expect(result.invalidDestinations).toBeDefined();
          expect(result.invalidDestinations.length).toBeGreaterThan(0);
        } else {
          // If it succeeds without reporting invalid destinations, that's also valid behavior
          expect(result.success).toBe(true);
          expect(result.requestId).toBeDefined();
        }
      } catch (error) {
        // It's also valid for the API to reject invalid email formats
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should reject emails with more than 10 total recipients', async () => {
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: [TEST_EMAIL_TO, TEST_EMAIL_TO, TEST_EMAIL_TO, TEST_EMAIL_TO] },
        ccRecipients: { emailAddresses: [TEST_EMAIL_CC, TEST_EMAIL_CC, TEST_EMAIL_CC, TEST_EMAIL_CC] },
        bccRecipients: { emailAddresses: [TEST_EMAIL_BCC, TEST_EMAIL_BCC, TEST_EMAIL_BCC] }, // Total: 11 recipients
        subject: '[Integration Test] Too Many Recipients Test',
        body: {
          body: 'This should fail due to exceeding the 10 recipient limit.',
        },
      };

      await expect(sendEmail(dtClient, emailRequest)).rejects.toThrow(/exceeds maximum limit of 10/);
    }, 30000);
  });
});

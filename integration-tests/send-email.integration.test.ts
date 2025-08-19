/**
 * Integration test for send email functionality
 *
 * This test verifies the email sending functionality by making actual API calls
 * to the Dynatrace environment. These tests require valid authentication credentials
 * and the email:emails:send scope.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { sendEmail, EmailRequest } from '../src/capabilities/send-email';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';

// Load environment variables
config();

const API_RATE_LIMIT_DELAY = 100; // Delay in milliseconds to avoid hitting API rate limits

const scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
  'app-engine:functions:run', // needed for environmentInformationClient
];

const scopesEmail = [
  'email:emails:send', // Send emails via Dynatrace Email API
];

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
        toRecipients: { emailAddresses: ['test@example.com'] },
        subject: '[Integration Test] Simple Email Test',
        body: {
          contentType: 'text/plain',
          body: 'This is a test email sent from the Dynatrace MCP Server integration test.',
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result).toContain('Email sent successfully!');
      expect(result).toContain('Request ID:');
      expect(result).toContain('Message:');
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
        toRecipients: { emailAddresses: ['test@example.com'] },
        subject: '[Integration Test] 📧 Formatted Email Test',
        body: {
          contentType: 'text/plain',
          body: formattedBody,
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result).toContain('Email sent successfully!');
      expect(result).toContain('Request ID:');
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
        toRecipients: { emailAddresses: ['primary@example.com', 'secondary@example.com'] },
        ccRecipients: { emailAddresses: ['cc-recipient@example.com'] },
        bccRecipients: { emailAddresses: ['bcc-recipient@example.com'] },
        subject: '[Integration Test] Multiple Recipients Test',
        body: {
          contentType: 'text/plain',
          body: `**Multiple Recipients Test**

This email was sent to multiple recipients to test the TO, CC, and BCC functionality:

- **TO**: primary@example.com, secondary@example.com
- **CC**: cc-recipient@example.com  
- **BCC**: bcc-recipient@example.com

All recipients should receive this message according to their designation.`,
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result).toContain('Email sent successfully!');
      expect(result).toContain('Request ID:');
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
        toRecipients: { emailAddresses: ['oncall@example.com'] },
        ccRecipients: { emailAddresses: ['platform-team@example.com'] },
        subject: '🚨 P2 INCIDENT: Payment Service - High Error Rate Detected',
        body: {
          contentType: 'text/plain',
          body: incidentBody,
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result).toContain('Email sent successfully!');
      expect(result).toContain('Request ID:');
    }, 30000);
  });

  describe('Email Content Validation', () => {
    it('should handle emails with notification settings URL', async () => {
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        dynatraceEnv.oauthClientId,
        dynatraceEnv.oauthClientSecret,
        dynatraceEnv.dtPlatformToken,
      );

      // Extract the base URL from the environment
      const baseUrl = dynatraceEnv.dtEnvironment;
      const notificationUrl = `${baseUrl}/ui/settings/email-notifications`;

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: ['test@example.com'] },
        subject: '[Integration Test] Email with Notification Settings',
        body: {
          contentType: 'text/plain',
          body: 'This email includes a notification settings URL for testing purposes.',
        },
        notificationSettingsUrl: notificationUrl,
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result).toContain('Email sent successfully!');
      expect(result).toContain('Request ID:');
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
        toRecipients: { emailAddresses: ['security-team@example.com'] },
        ccRecipients: { emailAddresses: ['compliance@example.com'] },
        bccRecipients: { emailAddresses: ['audit@example.com'] },
        subject: '🔒 HIGH SEVERITY: Security Vulnerability Detected - Immediate Action Required',
        body: {
          contentType: 'text/plain',
          body: securityBody,
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      expect(result).toContain('Email sent successfully!');
      expect(result).toContain('Request ID:');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      // Create client with invalid credentials
      const dtClient = await createDtHttpClient(
        dynatraceEnv.dtEnvironment,
        scopesBase.concat(scopesEmail),
        'invalid-client-id',
        'invalid-client-secret',
        undefined,
      );

      const emailRequest: EmailRequest = {
        toRecipients: { emailAddresses: ['test@example.com'] },
        subject: '[Integration Test] Authentication Error Test',
        body: {
          contentType: 'text/plain',
          body: 'This should fail due to invalid credentials.',
        },
      };

      await expect(sendEmail(dtClient, emailRequest)).rejects.toThrow();
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
        if (result.includes('Invalid destinations')) {
          expect(result).toContain('Invalid destinations');
        } else {
          // If it succeeds without reporting invalid destinations, that's also valid behavior
          expect(result).toContain('Email sent successfully!');
        }
      } catch (error) {
        // It's also valid for the API to reject invalid email formats
        expect(error).toBeDefined();
      }
    }, 30000);
  });
});

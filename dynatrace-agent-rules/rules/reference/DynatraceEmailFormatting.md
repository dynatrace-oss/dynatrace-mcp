# Dynatrace Email Formatting Reference

This reference guide provides the complete formatting syntax and best practices for sending emails through the Dynatrace Email API using the `send_email` tool. The Dynatrace email system supports rich text formatting that enhances communication clarity and professional presentation.

**Related Files:**

- **../workflows/DynatraceIncidentResponse.md** - Use email notifications for incident escalation
- **../workflows/DynatraceDevOpsIntegration.md** - Automated deployment notifications via email
- **../workflows/DynatraceSecurityCompliance.md** - Security alert email formatting

## 🎯 **Quick Reference Summary**

### **Essential Email Structure**

```markdown
**URGENT: [Service Name] Incident - [Severity Level]**

## Incident Overview

- **Service**: [Service Name]
- **Status**: [Current Status]
- **Impact**: [User Impact Description]
- **Start Time**: [Timestamp]

## Key Metrics

- **Error Rate**: `[percentage]%`
- **Response Time**: `[time]ms`
- **Affected Users**: `[count]`

---

### Next Steps

1. Check service logs: `[log query]`
2. Review recent deployments
3. Escalate if not resolved in [timeframe]

[Link to Dynatrace Dashboard](https://your-tenant.dynatrace.com/dashboard)
```

## 📝 **Formatting Syntax Reference**

### **Text Formatting**

#### **Italics**

Use single asterisks for _emphasis_:

```
*This text will be italicized*
```

#### **Bold**

Use double asterisks for **strong emphasis**:

```
**This text will be bold**
```

#### **Strikethrough**

Use double tildes for ~~crossed out text~~:

```
~~This text will be crossed out~~
```

#### **Code Formatting**

Use backticks for `inline code`:

```
`service.error.rate`
```

Use triple backticks for code blocks:

````
```
fetch logs
| filter severity == "ERROR"
| summarize count(), by: {service.name}
```
````

### **Structure Elements**

#### **Headings**

Create hierarchical structure with hash symbols:

```
# Main Heading
## Sub Heading
### Detail Heading
```

#### **Horizontal Lines**

Separate sections with three dashes:

```
---
```

#### **Lists**

**Unordered Lists** (asterisk or dash):

```
* Critical issue identified
* Investigation in progress
* ETA for resolution: 30 minutes

- Alternative syntax
- Using dashes
- Same visual result
```

**Ordered Lists** (numbers):

```
1. Identify the root cause
2. Implement temporary fix
3. Monitor service recovery
4. Post-incident review
```

#### **Tables**

Create structured data displays:

```
| Service | Status | Error Rate | Response Time |
| --- | --- | --- | --- |
| Payment API | Critical | 15% | 2.5s |
| User Service | Warning | 3% | 800ms |
| Checkout | Healthy | 0.1% | 200ms |
```

#### **Links**

Create clickable references:

```
[Dynatrace Dashboard](https://your-tenant.dynatrace.com/dashboard)
[Incident Runbook](https://docs.company.com/runbooks/payment-api)
```

### **Line Breaks**

Use Enter key for single line breaks in email content.

## 📧 **Email Field Guidelines**

### **Recipients Configuration**

#### **TO Recipients** (Required)

Primary recipients who need to take action:

```typescript
toRecipients: ['oncall-team@company.com', 'service-owner@company.com'];
```

#### **CC Recipients** (Optional)

Stakeholders who need visibility:

```typescript
ccRecipients: ['manager@company.com', 'platform-team@company.com'];
```

#### **BCC Recipients** (Optional)

Recipients who need discrete notification:

```typescript
bccRecipients: ['audit@company.com', 'compliance@company.com'];
```

### **Subject Line Best Practices**

#### **Critical Incidents**

```
🚨 CRITICAL: Payment Service Down - P1 Incident #12345
```

#### **Warnings**

```
⚠️ WARNING: High Error Rate Detected - User Service
```

#### **Information**

```
ℹ️ INFO: Deployment Complete - Checkout Service v2.1.0
```

#### **Resolution**

```
✅ RESOLVED: Payment Service Incident #12345 - Service Restored
```

## 🎨 **Content Templates**

### **Incident Alert Template**

```markdown
**🚨 INCIDENT ALERT - [SERVICE_NAME]**

## Incident Details

- **Incident ID**: [INCIDENT_ID]
- **Severity**: **[P1/P2/P3/P4]**
- **Service**: `[SERVICE_NAME]`
- **Environment**: [PRODUCTION/STAGING]
- **Start Time**: [TIMESTAMP]

## Impact Assessment

- **User Impact**: [DESCRIPTION]
- **Error Rate**: `[PERCENTAGE]%`
- **Affected Users**: `[COUNT]` users
- **SLA Risk**: [HIGH/MEDIUM/LOW]

---

## Key Metrics

| Metric        | Current            | Normal            | Threshold       |
| ------------- | ------------------ | ----------------- | --------------- |
| Error Rate    | `[CURRENT]%`       | `[NORMAL]%`       | `[THRESHOLD]%`  |
| Response Time | `[CURRENT]ms`      | `[NORMAL]ms`      | `[THRESHOLD]ms` |
| Throughput    | `[CURRENT]req/min` | `[NORMAL]req/min` | `[MIN]req/min`  |

## Investigation Status

- **Assigned To**: [ENGINEER_NAME]
- **Current Action**: [DESCRIPTION]
- **ETA**: [TIMEFRAME]

### Immediate Actions Required

1. **Acknowledge** this incident in PagerDuty
2. **Join** the incident bridge: [BRIDGE_LINK]
3. **Check** recent deployments and changes
4. **Monitor** service recovery metrics

[**🔗 View in Dynatrace**]([DASHBOARD_LINK])
[**📊 Incident Timeline**]([TIMELINE_LINK])
```

### **Deployment Notification Template**

```markdown
**✅ DEPLOYMENT COMPLETE - [SERVICE_NAME] v[VERSION]**

## Deployment Summary

- **Service**: `[SERVICE_NAME]`
- **Version**: `[VERSION]`
- **Environment**: [ENVIRONMENT]
- **Deploy Time**: [TIMESTAMP]
- **Duration**: [DURATION]

## Health Metrics

- **Success Rate**: `[PERCENTAGE]%`
- **Response Time**: `[TIME]ms`
- **Error Rate**: `[PERCENTAGE]%`

---

### Changes Included

- [CHANGE_1]
- [CHANGE_2]
- [CHANGE_3]

### Monitoring

Service health will be monitored for the next **2 hours**.

**Rollback criteria**: Error rate > 5% or response time > 2s

[**📊 Service Dashboard**]([DASHBOARD_LINK])
```

### **Security Alert Template**

```markdown
**🔒 SECURITY ALERT - [ALERT_TYPE]**

## Security Event Details

- **Alert Type**: [VULNERABILITY/BREACH/ANOMALY]
- **Severity**: **[CRITICAL/HIGH/MEDIUM/LOW]**
- **Affected Systems**: `[SYSTEM_LIST]`
- **Detection Time**: [TIMESTAMP]

## Threat Assessment

- **Risk Level**: [HIGH/MEDIUM/LOW]
- **Potential Impact**: [DESCRIPTION]
- **Affected Data**: [DATA_TYPES]

---

### Immediate Actions

1. **Isolate** affected systems if required
2. **Investigate** the security event
3. **Document** findings and remediation steps
4. **Report** to security team within 1 hour

### Remediation Status

- **Assigned To**: [SECURITY_TEAM]
- **Status**: [IN_PROGRESS/INVESTIGATING/RESOLVED]
- **Next Update**: [TIMEFRAME]

[**🛡️ Security Dashboard**]([SECURITY_LINK])
[**📋 Incident Report**]([REPORT_LINK])
```

## 🚀 **Best Practices**

### **Content Guidelines**

1. **Start with Impact**: Lead with what users/business are experiencing
2. **Be Specific**: Include exact metrics, timestamps, and service names
3. **Use Visual Hierarchy**: Headers, tables, and lists for scanability
4. **Include Actions**: Clear next steps for recipients
5. **Add Context**: Links to dashboards, runbooks, and documentation

### **Professional Formatting**

1. **Consistent Structure**: Use templates for similar notification types
2. **Visual Indicators**: Use emojis sparingly for severity indicators
3. **Readable Metrics**: Format numbers and percentages clearly
4. **Actionable Links**: Include relevant dashboard and documentation links

### **Email Limits and Constraints**

- **Maximum Recipients**: 10 recipients total across TO, CC, and BCC
- **Content Limits**: 262,144 bytes maximum message size
- **No HTML Support**: Only markdown-style formatting supported

### **Integration with Workflows**

```markdown
Use the `send_email` tool in automation workflows:

- **Incident Response**: Automatic escalation emails
- **Deployment Gates**: Success/failure notifications
- **Security Compliance**: Alert stakeholders of violations
- **Performance Monitoring**: Threshold breach notifications
```

## 📧 **Example Usage Patterns**

### **Incident Escalation Chain**

```typescript
// P1 Incident - Immediate notification
{
  toRecipients: ["oncall@company.com"],
  ccRecipients: ["platform-team@company.com"],
  subject: "🚨 P1 INCIDENT: Payment Service Critical Failure",
  contentType: "text/plain"
}

// 15 minutes later - Management escalation
{
  toRecipients: ["engineering-director@company.com"],
  ccRecipients: ["cto@company.com", "oncall@company.com"],
  subject: "🚨 P1 ESCALATION: Payment Service - 15min without resolution",
  contentType: "text/plain"
}
```

### **Automated Monitoring Alerts**

```typescript
// Performance threshold breach
{
  toRecipients: ["service-owner@company.com"],
  ccRecipients: ["platform-team@company.com"],
  subject: "⚠️ WARNING: [SERVICE] Performance Degradation Detected",
  contentType: "text/plain"
}

// Security compliance violation
{
  toRecipients: ["security-team@company.com"],
  ccRecipients: ["compliance@company.com"],
  bccRecipients: ["audit@company.com"],
  subject: "🔒 SECURITY: Compliance Violation - [POLICY]",
  contentType: "text/plain"
}
```

---

**Remember**: This formatting system is designed for operational communication clarity. Keep messages focused, actionable, and professionally formatted for maximum impact and readability.

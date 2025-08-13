# 🔍 Investigation Validation Checklist

## 🚨 MANDATORY Validation Points

Use this checklist to ensure complete and accurate incident investigations. **ALL items must be completed before concluding any investigation.**

---

## Phase 1: Problem Discovery ✅

- [ ] **Active problems identified** using `fetch events | filter event.kind == "DAVIS_PROBLEM"`
- [ ] **Affected services mapped** from problem descriptions
- [ ] **Problem severity assessed** (CRITICAL, HIGH, MEDIUM, LOW)
- [ ] **Maintenance windows checked** to rule out planned changes

---

## Phase 2: Exception Analysis (CRITICAL - NEVER SKIP) 🚨

### Exception Discovery

- [ ] **Span exceptions analyzed** using `fetch spans | filter isNotNull(span.events)`
- [ ] **Exception patterns identified** across all failed services
- [ ] **Business logic errors found** (contradictory validation messages)
- [ ] **Stack traces examined** for file locations and line numbers

### Search-Based Discovery

- [ ] **Search commands used** to find hidden error patterns
- [ ] **Business terms searched** (payment, validation, credit card types, etc.)
- [ ] **Exception messages analyzed** for contradictory logic

### Validation Requirements

- [ ] **File/line locations identified** from stack traces (e.g., `/usr/src/app/charge.js:73`)
- [ ] **Exact exception messages captured** (not paraphrased)
- [ ] **Exception frequency analyzed** by service and error type
- [ ] **Business logic contradictions documented** (e.g., "AmEx not accepted...AmEx accepted")

---

## Phase 3: Cross-Correlation Analysis ✅

- [ ] **Trace IDs used** to correlate spans with logs
- [ ] **Deployment timing checked** for correlation with failures
- [ ] **Infrastructure context validated** (Kubernetes pods, services, etc.)
- [ ] **Error patterns cross-referenced** across multiple data sources

---

## Phase 4: Root Cause Validation ✅

- [ ] **Exception analysis confirms** the identified root cause
- [ ] **Business logic errors validated** against application behavior
- [ ] **Alternative theories ruled out** using exception data
- [ ] **Service recovery confirmed** through metrics and span analysis

---

## Phase 5: Documentation & Follow-up ✅

- [ ] **Exact error messages documented** (with quotes)
- [ ] **File locations and line numbers recorded**
- [ ] **Business impact assessed** and quantified
- [ ] **Remediation steps provided** based on exact root cause

---

## 🚫 Investigation Failure Indicators

**STOP and restart investigation if:**

- [ ] **No span.events analyzed** for failed services
- [ ] **Only alert descriptions used** as root cause evidence
- [ ] **No exact exception messages found** or documented
- [ ] **Business logic not examined** for contradictions
- [ ] **Search commands not used** for pattern discovery

---

## ✅ Investigation Success Criteria

**Investigation is complete ONLY when:**

- [ ] **Exact exception message identified** with stack trace
- [ ] **File and line number located** (e.g., `/usr/src/app/charge.js:73`)
- [ ] **Business logic error confirmed** (e.g., contradictory validation)
- [ ] **Root cause validated** through multiple data sources
- [ ] **Service behavior explained** by exception analysis

---

## 📋 Critical DQL Patterns (Copy-Paste Ready)

### Exception Discovery

```dql
fetch spans, from:now() - 4h
| filter request.is_failed == true and isNotNull(span.events)
| expand span.events
| filter span.events.name == "exception"
| summarize exception_count = count(), by: {service.name, exception_message = span.events.attributes["exception.message"]}
| sort exception_count desc
| limit 20
```

### Service-Specific Exception Analysis

```dql
fetch spans, from:now() - 4h
| filter service.name == "SERVICE_NAME" and request.is_failed == true
| fields trace.id, span.events, dt.failure_detection.results
| limit 10
```

### Search-Based Pattern Discovery

```dql
fetch spans, from:now() - 4h | search "BUSINESS_TERM" | fields service.name, span.events
```

---

## 🎯 Real-World Example: Payment Service AmEx Bug

**✅ Complete Investigation:**

- **Exception Found**: "Sorry, we cannot process American Express credit cards. Only Visa or Mastercard or American Express are accepted."
- **Location Identified**: `/usr/src/app/charge.js:73`
- **Root Cause**: Business logic contradiction in credit card validation
- **Pattern**: Multiple traces showing identical exception message
- **Resolution**: Fix contradictory validation logic in charge.js

**❌ Incomplete Investigation:**

- **Alert Description**: "Payment service failure rate increase"
- **Service Health**: "Service recovered, error rate back to normal"
- **Missing**: Actual exception analysis and business logic error identification

---

**Use this checklist for EVERY investigation to ensure nothing is missed.**

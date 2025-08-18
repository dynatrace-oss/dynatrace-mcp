# Incident Response Workflow

This guide provides the core incident response workflow for analyzing problems and incidents in Dynatrace using a structured investigation approach.

**Related Files:**

- **DynatraceInvestigationChecklist.md** - **MANDATORY** validation checklist for all investigations
- **DynatraceDataInvestigation.md** - Detailed logs, service metrics, and process analysis techniques
- **DynatraceSpanAnalysis.md** - Transaction-level root cause analysis
- **../reference/DynatraceQueryLanguage.md** - Core DQL syntax and patterns foundation
- **../reference/DynatraceProblemsSpec.md** - Official Davis problems schema reference

---

# 🚨 Core Incident Response Process

## Phase 1: Problem Detection & Triage

### Quick Active Problems Assessment

```dql
// Get all currently active problems
fetch events, from:now() - 2h
| filter event.kind == "DAVIS_PROBLEM"
| filter event.status == "OPEN"
| fields timestamp, display_id, event.name, event.category, affected_entity_ids
| sort timestamp desc
| limit 10
```

## Phase 1.5: Environment Discovery & Exception Analysis (MANDATORY for Unfamiliar Services)

**🚨 CRITICAL**: When investigating unknown services or unexpected failures, NEVER proceed without discovery analysis.

### Exception Pattern Discovery (PRIORITY 1)

```dql
// Find all exception patterns in failed requests
fetch spans, from:now() - 4h
| filter request.is_failed == true and isNotNull(span.events)
| expand span.events
| filter span.events.name == "exception"
| summarize exception_count = count(), by: {service.name, exception_message = span.events.attributes["exception.message"]}
| sort exception_count desc
| limit 20
```

### Search-Based Error Discovery

```dql
// Use search to find specific error patterns across all data
fetch spans, from:now() - 4h | search "exception" | fields service.name, span.events | limit 10
fetch logs, from:now() - 4h | search "error" and "failed" | fields content, k8s.pod.name | limit 10
```

### Service-Specific Exception Analysis

```dql
// Deep dive into specific service exceptions
fetch spans, from:now() - 4h
| filter service.name == "IDENTIFIED_PROBLEM_SERVICE" and request.is_failed == true
| fields trace.id, span.events, dt.failure_detection.results
| limit 10
```

**💡 Pro Tip**: The search command finds patterns you might miss with specific filters. Always combine search with targeted analysis.

### Service Failure Detection

```dql
// Find recent service failures with error rates
fetch events, from:now() - 2h
| filter event.kind == "DAVIS_PROBLEM"
| filter matchesPhrase(event.name, "failure") or matchesPhrase(event.name, "error")
| fields timestamp, display_id, event.name, event.status, root_cause_entity_name
| sort timestamp desc
| limit 15
```

### Problem Categorization

```dql
// Categorize active problems by type
fetch events, from:now() - 4h
| filter event.kind == "DAVIS_PROBLEM"
| filter event.status == "OPEN"
| summarize problem_count = count(), by: {event.category}
| sort problem_count desc
```

## Phase 2: Impact Assessment

### Affected Services Analysis

```dql
// Identify affected services and entities
fetch events, from:now() - 2h
| filter event.kind == "DAVIS_PROBLEM"
| filter event.status == "OPEN"
| fields display_id, event.name, affected_entity_ids, dt.entity.service
| expand dt.entity.service
| summarize problem_count = count(), by: {dt.entity.service}
| sort problem_count desc
```

### Kubernetes Impact Assessment

```dql
// Check Kubernetes context for problems
fetch events, from:now() - 2h
| filter event.kind == "DAVIS_PROBLEM"
| filter event.status == "OPEN"
| fields display_id, event.name, k8s.namespace.name, k8s.cluster.name
| summarize issues = count(), by: {k8s.namespace.name, k8s.cluster.name}
| sort issues desc
```

### User Impact Estimation

```dql
// Assess user impact from problems
fetch events, from:now() - 1h
| filter event.kind == "DAVIS_PROBLEM"
| filter event.status == "OPEN"
| fields display_id, event.name, dt.davis.affected_users_count
| sort dt.davis.affected_users_count desc
| limit 10
```

## Phase 3: Root Cause Investigation

⚠️ **CRITICAL**: Never accept alert descriptions as root cause. They are symptoms requiring investigation.

### Step 1: Error Log Analysis (PRIORITY)

```dql
// ALWAYS check error logs first for concrete evidence
fetch logs, from:now() - 2h
| filter loglevel == "ERROR" or loglevel == "WARN"
| filter matchesPhrase(content, "error") or matchesPhrase(content, "failed") or matchesPhrase(content, "exception")
| fields timestamp, content, loglevel, k8s.pod.name, exception.message
| sort timestamp desc
| limit 20
```

### Step 2: Problem Details Analysis

```dql
// Get comprehensive problem details for specific incident
fetch events, from:now() - 4h
| filter event.kind == "DAVIS_PROBLEM"
| filter display_id == "P-YOUR-PROBLEM-ID"
| fields event.name, event.description, event.start, event.end,
        root_cause_entity_id, root_cause_entity_name, affected_entity_ids
```

### Step 3: Error Pattern Validation

```dql
// Analyze specific error messages and frequency
fetch logs, from:now() - 4h
| filter loglevel == "ERROR"
| summarize error_count = count(), by: {content, k8s.pod.name}
| sort error_count desc
| limit 15
```

### Timeline Investigation

```dql
// Problem timeline and transitions
fetch events, from:now() - 6h
| filter event.kind == "DAVIS_PROBLEM"
| filter display_id == "P-YOUR-PROBLEM-ID"
| fields timestamp, event.status_transition, event.status, event.category
| sort timestamp asc
```

### Entity Relationship Mapping

```dql
// Map entity relationships for root cause
fetch events, from:now() - 2h
| filter event.kind == "DAVIS_PROBLEM"
| filter event.status == "OPEN"
| fields display_id, root_cause_entity_name, affected_entity_ids, related_entity_ids
| expand affected_entity_ids
| limit 20
```

## Phase 4: Data Source Investigation

At this point, proceed to detailed data analysis using:

### → **DynatraceDataInvestigation.md** for:

- **Log Analysis**: Error messages, stack traces, deployment correlation
- **Service Metrics**: Golden signals, performance trends, capacity analysis
- **Process Investigation**: Resource utilization, technology stack analysis

### → **DynatraceSpanAnalysis.md** for:

- **Transaction Analysis**: Individual request failures, exception details
- **Distributed Tracing**: Cross-service error propagation
- **Performance Bottlenecks**: Slow operations and timeout analysis

---

# 🔍 Investigation Techniques

## 🚨 Critical Investigation Principles

### 1. Exception-First Investigation (MANDATORY)

**✅ ALWAYS Start with Span Exception Analysis**

- Check `span.events` for exact exception messages and stack traces
- Look for business logic contradictions (e.g., "AmEx not accepted...AmEx accepted")
- Identify file locations and line numbers from stack traces
- **NEVER conclude investigation without analyzing span.events**

### 2. Symptoms vs. Root Cause

**❌ NEVER Accept Alert Descriptions as Root Cause**

- Alert names like "Revenue Above Threshold" or "Failure Rate Increase" are **symptoms**
- Always investigate underlying **concrete error evidence**
- Look for actual error messages, exceptions, and failure patterns

### 3. Search-Driven Discovery

**✅ Use Search Commands for Unknown Error Patterns**

- Use `search "term"` to find patterns across all fields
- Search for business terms (e.g., "AmEx", "payment", "validation")
- Combine search with targeted filters for comprehensive discovery

### 4. Exception Validation Requirement

**✅ Always Cross-Check Exception Details**

- Form hypotheses based on actual exception messages, not alert descriptions
- Look for contradictory business logic in error messages
- Validate stack traces against code behavior expectations

### 5. Business Logic Error Focus

**✅ Look for Application-Level Issues First**

- Payment processing errors, validation failures, configuration issues
- Check for contradictory logic or business rule violations
- Examine user-facing error messages for clues

## Data Source Selection Strategy

### When to Use Each Data Source

**Use Problems (Events) When:**

- Starting incident investigation
- Understanding overall impact and scope
- Identifying affected services and infrastructure
- Getting Davis AI analysis and insights

**Use Logs When:** (→ DynatraceDataInvestigation.md)

- Finding specific error messages
- Analyzing deployment-related issues
- Investigating business logic failures
- Correlating with trace IDs

**Use Service Metrics When:** (→ DynatraceDataInvestigation.md)

- Monitoring golden signals (rate, errors, duration)
- Capacity planning and trend analysis
- SLA validation and alerting
- Performance comparison

**Use Spans When:** (→ DynatraceSpanAnalysis.md)

- Root cause analysis of individual transactions
- Exception debugging with stack traces
- Cross-service failure analysis
- Performance bottleneck identification

## Core Problem Query Patterns

### Problem Data Source Options

#### Option 1: Official dt.davis.problems (Structured)

```dql
fetch dt.davis.problems
| filter not(dt.davis.is_duplicate)
| fields id=display_id, title=event.name, status=event.status
```

#### Option 2: Events with DAVIS_PROBLEM filter (Comprehensive)

```dql
fetch events, from:now() - 24h
| filter event.kind == "DAVIS_PROBLEM"
| fields timestamp, display_id, event.name, event.status, event.description
| sort timestamp desc
| limit 20
```

**Recommendation**: Use Option 2 (events) for investigation as it provides richer context including Kubernetes fields, entity relationships, and detailed descriptions.

### Problem Search and Filtering

#### Find Problems by Service

```dql
fetch events, from:now() - 4h
| filter event.kind == "DAVIS_PROBLEM"
| filter dt.entity.service == "SERVICE-YOUR-ID"
| fields timestamp, display_id, event.name, event.status
| sort timestamp desc
```

#### Find Problems by Keyword

```dql
fetch events, from:now() - 6h
| filter event.kind == "DAVIS_PROBLEM"
| filter matchesPhrase(event.name, "payment") or matchesPhrase(event.description, "timeout")
| fields timestamp, display_id, event.name, event.category
| sort timestamp desc
```

#### Find Problems in Kubernetes Namespace

```dql
fetch events, from:now() - 2h
| filter event.kind == "DAVIS_PROBLEM"
| filter k8s.namespace.name == "production"
| fields timestamp, display_id, event.name, k8s.pod.name
| sort timestamp desc
```

## Available Problem Data Fields

### Primary Problem Fields

- **display_id** - Problem ID (e.g., "P-25071206")
- **event.name** - Problem title/description
- **timestamp** - When the problem event occurred
- **event.status** - Problem status (ACTIVE, CLOSED)
- **event.description** - Full problem description with root cause analysis
- **event.start/event.end** - Problem duration timestamps
- **event.category** - Standard categorization (AVAILABILITY, ERROR, SLOWDOWN, etc.)

### Entity & Infrastructure Fields

- **affected_entity_ids** - Array of affected entities
- **root_cause_entity_id/name** - Root cause entity information
- **dt.entity.service** - Affected service entity IDs
- **k8s.namespace.name** - Kubernetes namespace names
- **k8s.cluster.name** - Kubernetes cluster names
- **k8s.pod.name** - Specific pod names

### Davis AI Analysis Fields

- **dt.davis.affected_users_count** - Estimated user impact
- **dt.davis.is_duplicate** - Duplicate problem indicator
- **dt.davis.mute.status** - Problem muting status
- **maintenance.is_under_maintenance** - Maintenance window indicator

---

# 📋 Incident Response Checklist

## Immediate Response (0-5 minutes)

- [ ] **Identify active problems** using quick assessment queries
- [ ] **Assess severity** by checking affected services and user impact
- [ ] **Check for duplicates** using dt.davis.is_duplicate
- [ ] **Verify maintenance windows** to rule out planned activities

## Discovery & Exception Analysis (5-15 minutes) - MANDATORY

- [ ] **🚨 CRITICAL: Analyze span.events** for exact exception messages and stack traces
- [ ] **Use search commands** to find error patterns across all data sources
- [ ] **Identify business logic errors** and contradictions in exception messages
- [ ] **Map exception frequency** by service and error type
- [ ] **Extract file/line locations** from stack traces for precise root cause

## Impact Analysis (15-25 minutes)

- [ ] **Map affected services** and their dependencies based on exception analysis
- [ ] **Estimate user impact** using dt.davis.affected_users_count
- [ ] **Check Kubernetes context** for containerized applications
- [ ] **Correlate exceptions with infrastructure** changes and deployments

## Root Cause Validation (25-60 minutes)

- [ ] **Validate exception patterns** against service behavior expectations
- [ ] **Cross-check business logic** for contradictory validation rules
- [ ] **Analyze problem timeline** and status transitions
- [ ] **Trace individual transactions** for complete failure context (→ DynatraceSpanAnalysis.md)
- [ ] **Check service metrics** for performance correlation (→ DynatraceDataInvestigation.md)

## Resolution & Follow-up

- [ ] **Document findings** and resolution steps
- [ ] **Monitor resolution** through problem status changes
- [ ] **Verify service recovery** using golden signals
- [ ] **Conduct post-incident review** for prevention

---

# 🔗 Integration with Analysis Workflows

## Investigation Flow Chain

1. **Start Here**: DynatraceIncidentResponse.md - Overall workflow and problem context
2. **Data Deep-dive**: DynatraceDataInvestigation.md - Logs, metrics, and process analysis
3. **Transaction Analysis**: DynatraceSpanAnalysis.md - Individual request investigation
4. **Reference**: ../reference/DynatraceQueryLanguage.md - DQL syntax and patterns

## Cross-Analysis Correlation

### Problem → Data Source Mapping

```dql
// Get problem context first
fetch events, from:now() - 2h
| filter event.kind == "DAVIS_PROBLEM"
| filter display_id == "P-YOUR-ID"
| fields event.start, event.end, affected_entity_ids, dt.entity.service

// Then use results to filter other data sources:
// - Use event.start/event.end for time filtering in logs/spans
// - Use dt.entity.service for service-specific analysis
// - Use affected_entity_ids for entity correlation
```

### Trace ID Correlation

Extract trace IDs from logs and use them in span analysis for complete transaction context.

## String Matching Best Practices

### ✅ Correct Operations

```dql
| filter matchesPhrase(event.name, "failure")       // Text search
| filter event.status == "OPEN"                     // Exact match
| filter startsWith(display_id, "P-")               // Prefix match
```

### ❌ Unsupported Operations

```dql
| filter contains(event.name, "error")              // NOT supported
| filter event.name like "%failure%"                // NOT supported
```

---

# ⚡ Performance & Best Practices

## Query Optimization

1. **Always include timeframes**: Avoid queries without time bounds
2. **Filter early**: Apply restrictive filters first in pipeline
3. **Use dedup for latest state**: `| dedup {display_id}, sort: {timestamp desc}`
4. **Limit results appropriately**: Balance between completeness and performance
5. **Sort by timestamp desc**: For chronological incident analysis

## Timeframe Recommendations

- **Active incident triage**: 15 minutes - 2 hours
- **Recent incident analysis**: 2-6 hours
- **Incident pattern analysis**: 24-48 hours
- **Historical incident research**: Use specific date ranges

## MCP Tool Integration

- **Always verify DQL syntax** with `verify_dql` before execution
- **Use entity discovery tools** to get precise entity IDs
- **Cross-reference with other MCP calls** for comprehensive analysis
- **Combine problem context** with detailed data source investigation

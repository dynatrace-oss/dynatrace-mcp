# Data Investigation Guide - Logs, Services & Processes

This comprehensive guide covers investigating incidents through multiple data sources: logs for troubleshooting, service metrics for performance analysis, and process investigation for infrastructure issues.

**Related Files:**

- **../reference/DynatraceQueryLanguage.md** - Core DQL syntax and patterns foundation
- **DynatraceIncidentResponse.md** - Primary incident investigation workflow using this data
- **DynatraceSpanAnalysis.md** - Trace correlation for transaction-level analysis

---

# 📋 Log Analysis for Troubleshooting

## 🚨 ERROR-FIRST INVESTIGATION PRIORITY

**CRITICAL**: Always start incident investigation with error log analysis before metrics or other data sources.

### Step 1: Immediate Error Assessment

```dql
// FIRST QUERY: Get recent errors for immediate assessment
fetch logs, from:now() - 2h
| filter loglevel == "ERROR"
| fields timestamp, content, loglevel, k8s.pod.name, exception.message
| sort timestamp desc
| limit 20
```

### Step 2: Error Pattern Analysis

```dql
// SECOND QUERY: Identify most frequent error patterns
fetch logs, from:now() - 4h
| filter loglevel == "ERROR"
| summarize error_count = count(), by: {content, k8s.pod.name}
| sort error_count desc
| limit 15
```

## Core DQL Pattern for Logs

### Basic Log Query Structure

```dql
fetch logs, from:now() - 2h
| filter loglevel == "ERROR" or loglevel == "WARN"
| fields timestamp, content, loglevel, k8s.pod.name, k8s.namespace.name
| sort timestamp desc
| limit 20
```

## Available Log Data Points

### Primary Fields

- **content** - The actual log message content
- **loglevel** - Log level (ERROR, WARN, INFO, DEBUG, TRACE)
- **timestamp** - When the log entry was created
- **message** - Structured message field (alternative to content)

### Kubernetes Context Fields

- **k8s.pod.name** - Pod name generating the log
- **k8s.namespace.name** - Kubernetes namespace
- **k8s.container.name** - Container name within the pod
- **k8s.cluster.name** - Kubernetes cluster name

### Trace Correlation Fields

- **trace_id** - Distributed trace ID
- **span_id** - Span ID within the trace
- **dt.trace_id** - Dynatrace trace ID
- **dt.span_id** - Dynatrace span ID

### Error Context Fields

- **exception.message** - Exception message text
- **exception.type** - Exception type/class
- **exception.stack_trace** - Full stack trace

## Common Log Query Patterns

### 1. Error Logs from Specific Service

```dql
fetch logs, from:now() - 4h
| filter dt.entity.service == "SERVICE-YOUR-ID"
| filter loglevel == "ERROR"
| fields timestamp, content, exception.message, trace_id
| sort timestamp desc
| limit 15
```

### 2. Application Errors by Pod

```dql
fetch logs, from:now() - 2h
| filter matchesPhrase(k8s.pod.name, "payment")
| filter loglevel == "ERROR" or matchesPhrase(content, "error")
| fields timestamp, content, k8s.pod.name, k8s.container.name
| sort timestamp desc
| limit 20
```

### 3. Logs with Stack Traces

```dql
fetch logs, from:now() - 6h
| filter exception.stack_trace != ""
| fields timestamp, exception.message, exception.type, exception.stack_trace, k8s.pod.name
| sort timestamp desc
| limit 10
```

### 4. Deployment-Related Logs

```dql
fetch logs, from:now() - 1h
| filter matchesPhrase(content, "deployment") or matchesPhrase(content, "restart")
| fields timestamp, content, k8s.pod.name, k8s.namespace.name
| sort timestamp desc
| limit 25
```

### 5. High-Frequency Error Analysis

```dql
fetch logs, from:now() - 2h
| filter loglevel == "ERROR"
| fields timestamp, exception.message, k8s.pod.name
| summarize error_count = count(), by: {exception.message, k8s.pod.name}
| sort error_count desc
| limit 15
```

## Business Logic Error Detection

### Payment Processing Errors

```dql
fetch logs, from:now() - 4h
| filter matchesPhrase(content, "payment") or matchesPhrase(content, "credit card")
| filter loglevel == "WARN" or loglevel == "ERROR"
| fields timestamp, content, exception.message, k8s.pod.name
| sort timestamp desc
| limit 20
```

### Configuration Change Detection

```dql
fetch logs, from:now() - 2h
| filter matchesPhrase(content, "config") or matchesPhrase(content, "environment")
| filter loglevel == "INFO" or loglevel == "WARN" or loglevel == "ERROR"
| fields timestamp, content, k8s.pod.name, loglevel
| sort timestamp desc
```

---

# 📊 Service Analytics for Performance Analysis

## Service Golden Signals

Service analytics focuses on the four golden signals: **Rate**, **Errors**, **Duration**, and **Saturation**. Use timeseries queries for continuous monitoring data.

### Core Golden Signals Timeseries

#### 1. Request Rate (Throughput)

```dql
// Time-based visualization (for dashboards)
timeseries avg(dt.service.request.count), from: now()-1h, interval: 5m

// Single aggregated value (for reports/alerts)
timeseries total_requests = sum(dt.service.request.count, scalar: true), from: now()-1h

// Rate-normalized throughput (requests per second)
timeseries rps = sum(dt.service.request.count, scalar: true, rate: 1s), from: now()-1h
```

#### 2. Error Rate (Failures)

```dql
// Time-based error tracking
timeseries avg(dt.service.request.failure_count), from: now()-1h, interval: 5m

// Total failures in time period
timeseries total_failures = sum(dt.service.request.failure_count, scalar: true), from: now()-1h

// Error rate per minute for alerting
timeseries errors_per_minute = sum(dt.service.request.failure_count, scalar: true, rate: 1m), from: now()-1h
```

#### 3. Response Time (Duration)

```dql
// Response time trends
timeseries avg(dt.service.request.response_time), from: now()-1h, interval: 5m

// Average response time for period
timeseries avg_response_time = avg(dt.service.request.response_time, scalar: true), from: now()-1h
```

**💡 Key Pattern:** Use `scalar: true` when you need single aggregated values instead of time-based arrays.

### Rate-Normalized Service Metrics

```dql
// Service throughput analysis with different rates
timeseries {
  requests_per_second = sum(dt.service.request.count, scalar: true, rate: 1s),
  requests_per_minute = sum(dt.service.request.count, scalar: true, rate: 1m),
  errors_per_minute = sum(dt.service.request.failure_count, scalar: true, rate: 1m),
  avg_response_time = avg(dt.service.request.response_time, scalar: true, rate: 1m)
  },
  from: now()-2h
```

### Service Health Assessment

#### Service Error Rate Calculation

```dql
timeseries {
  error_percentage = (sum(dt.service.request.failure_count, scalar: true) * 100.0) / sum(dt.service.request.count, scalar: true)
  },
  filter: { dt.entity.service == "SERVICE-YOUR-ID" },
  from: now()-1h
```

#### Service Capacity Analysis

```dql
timeseries {
  throughput_trend = sum(dt.service.request.count, scalar: true, rate: 1m),
  latency_trend = avg(dt.service.request.response_time, scalar: true),
  error_trend = sum(dt.service.request.failure_count, scalar: true, rate: 1m)
  },
  from: now()-6h, interval: 30m
```

### Service Comparison Queries

#### Multi-Service Performance Comparison

```dql
timeseries {
  avg_response_time = avg(dt.service.request.response_time, scalar: true),
  request_rate = sum(dt.service.request.count, scalar: true, rate: 1m),
  error_rate = sum(dt.service.request.failure_count, scalar: true, rate: 1m)
  },
  by: { dt.entity.service },
  from: now()-2h
```

---

# 🔧 Process Investigation for Infrastructure Issues

## Process Group Instance (PGI) Fundamentals

A **Process Group Instance** represents a "process" running on a specific host. Dynatrace automatically merges related processes for better observability.

### Basic PGI Query Structure

```dql
// Basic Process Group Instance exploration
fetch dt.entity.process_group_instance
| fieldsAdd entity.name, entity.detected_name, processType, softwareTechnologies
| filter host.name == "your-host"
| limit 10
```

### Key PGI Fields for Investigation

#### Essential Fields

- `entity.name` - Process name (customized > conditional > detected)
- `entity.detected_name` - Name as detected by Dynatrace
- `processType` - Key technology (NODE_JS, LINUX_SYSTEM, GO, etc.)
- `softwareTechnologies` - Collection of technologies and versions
- `bitness` - Architecture (32/64 bit)
- `listenPorts` - Array of open listen ports
- `lifetime` - Start and end timestamps of the process

#### Infrastructure Context

- `belongs_to[host]` - Host entity ID where process runs
- `belongs_to[container_group_instance]` - Container context if containerized

#### Relationship Fields

- `runs[service]` - Services provided by this process
- `runs[service_instance]` - Service instances
- `calls` / `called_by` - Process communication patterns

### Process Investigation Workflows

#### 1. Process Discovery by Host

```dql
// Find all processes on a specific host
fetch dt.entity.process_group_instance
| filter belongs_to[host] == "HOST-XXXXXXXXXXXXXXXXX"
| fieldsAdd entity.name, processType, softwareTechnologies, listenPorts
| summarize process_count = count(), by: {entity.name, processType}
| sort process_count desc
```

#### 2. Technology Stack Analysis

```dql
// Analyze software technologies across processes
fetch dt.entity.process_group_instance
| filter belongs_to[host] == "HOST-XXXXXXXXXXXXXXXXX"
| fieldsAdd entity.name, softwareTechnologies, appVersion
| expand softwareTechnologies
| summarize process_count = count(), by: {softwareTechnologies, entity.name}
| sort process_count desc
```

#### 3. Process Communication Analysis

```dql
// Understand process communication patterns
fetch dt.entity.process_group_instance
| filter entity.name == "your-process-name"
| fieldsAdd calls, called_by, runs[service]
| expand calls
| limit 10
```

### Process Performance Investigation

#### CPU and Memory Analysis

```dql
// Basic process resource utilization
timeseries {
  cpu_usage = avg(dt.process.cpu.usage, scalar: true),
  memory_usage = avg(dt.process.memory.usage, scalar: true)
  },
  filter: { dt.entity.process_group_instance == "PROCESS_GROUP_INSTANCE-YOUR-ID" },
  from: now()-2h, interval: 5m
```

#### Process-Level Error Detection

```dql
// Find processes with high error rates
timeseries error_count = sum(dt.process.errors, scalar: true, rate: 1m),
  by: { dt.entity.process_group_instance },
  from: now()-1h
| sort error_count desc
```

---

# 🔄 Integrated Investigation Workflows

## Problem-Driven Data Investigation

### ✅ CORRECTED INVESTIGATION ORDER

### 1. Start with Error Logs (PRIORITY)

**ALWAYS begin with concrete error evidence before analyzing metrics.**

- Get recent error messages and exceptions immediately
- Analyze error patterns and frequency to identify root causes
- Look for business logic errors, validation failures, configuration issues

### 2. Validate with Service Metrics

Use service analytics to confirm error patterns identified in logs.

- Check if error spikes correlate with service failure rates
- Verify impact scope using golden signals (rate, errors, duration)

### 3. Correlate with Process Data

Check if service issues correlate with process-level resource constraints or failures.

### 4. Cross-Reference with Spans

Use trace IDs from logs to get detailed transaction-level analysis (see DynatraceSpanAnalysis.md).

## Investigation Chain Example (CORRECTED ORDER)

```dql
// 1. FIRST: Get immediate error evidence (ERROR-FIRST APPROACH)
fetch logs, from:now() - 2h
| filter loglevel == "ERROR"
| fields timestamp, content, loglevel, k8s.pod.name, exception.message
| sort timestamp desc
| limit 20

// 2. SECOND: Analyze error patterns for root cause
fetch logs, from:now() - 4h
| filter loglevel == "ERROR"
| summarize error_count = count(), by: {content, k8s.pod.name}
| sort error_count desc
| limit 15

// 3. THIRD: Validate with service metrics (after understanding errors)
timeseries error_rate = sum(dt.service.request.failure_count, scalar: true, rate: 1m),
  by: { dt.entity.service },
  from: now()-1h
| sort error_rate desc
| limit 5

// 4. FOURTH: Check underlying processes
fetch dt.entity.process_group_instance
| filter runs[service] == "SERVICE-FROM-ERROR-ANALYSIS"
| fieldsAdd entity.name, processType, belongs_to[host]
```

## String Matching Best Practices

### ✅ Correct String Operations

```dql
| filter matchesPhrase(content, "payment")              // Text search in content
| filter loglevel == "ERROR"                            // Exact level match
| filter startsWith(k8s.pod.name, "payment-")          // Pod prefix match
| filter endsWith(exception.type, "Exception")          // Exception type suffix
```

### ❌ Unsupported Operations

```dql
| filter contains(content, "error")                     // NOT supported
| filter content like "%payment%"                       // NOT supported
```

## Performance Optimization Tips

### Query Efficiency

1. **Always include timeframe**: `from:now() - 2h` (avoid overly broad searches)
2. **Filter early**: Apply restrictive filters first
3. **Use entity filters**: Filter by specific pods/services when possible
4. **Limit results**: Always include reasonable limits
5. **Sort efficiently**: Sort by timestamp desc for recent data

### Timeframe Recommendations

- **Real-time debugging**: 15-30 minutes
- **Incident investigation**: 2-4 hours
- **Deployment analysis**: 1-2 hours around deployment time
- **Pattern analysis**: 24 hours maximum

## Integration with Other Analysis

### Cross-Reference Workflow

1. **DynatraceIncidentResponse.md** - Primary incident workflow and context
2. **DynatraceDataInvestigation.md** - This file for detailed data analysis
3. **DynatraceSpanAnalysis.md** - Transaction-level investigation using trace IDs
4. **../reference/DynatraceQueryLanguage.md** - DQL syntax reference

### MCP Tool Integration

- **Always verify DQL syntax** with `verify_dql` before execution
- **Use MCP entity tools** to get precise entity IDs for filtering
- **Combine multiple data sources** for comprehensive root cause analysis
- **Reference trace IDs** for correlation between logs, spans, and metrics

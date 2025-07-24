# Dynatrace Log Analysis with DQL

## Overview

This guide covers comprehensive log analysis using DQL (Dynatrace Query Language) for troubleshooting, debugging, and root cause analysis. Logs are crucial for understanding application behavior, especially during incidents and deployments.

## Core DQL Pattern for Logs

### Basic Log Query Structure

```dql
fetch logs, from:now() - 2h
| filter loglevel == "ERROR" or loglevel == "WARN"
| fields timestamp, content, loglevel, k8s.pod.name, k8s.namespace.name
| sort timestamp desc
| limit 20
```

## Available Data Points

### Primary Fields

- **content** - The actual log message content
- **loglevel** - Log level (ERROR, WARN, INFO, DEBUG, TRACE)
- **timestamp** - When the log entry was created
- **message** - Structured message field (alternative to content)
- **log.source** - Source of the log (e.g., "Container Output")

### Kubernetes Context Fields

- **k8s.pod.name** - Pod name generating the log
- **k8s.namespace.name** - Kubernetes namespace
- **k8s.container.name** - Container name within the pod
- **k8s.cluster.name** - Kubernetes cluster name
- **k8s.node.name** - Node where pod is running
- **k8s.workload.name** - Workload (deployment/statefulset) name

### Dynatrace Entity Fields

- **dt.entity.service** - Service entity ID
- **dt.entity.process_group_instance** - Process group instance entity ID
- **dt.entity.host** - Host entity ID
- **dt.entity.kubernetes_cluster** - Kubernetes cluster entity ID

### Trace Correlation Fields

- **trace_id** - Distributed trace ID
- **span_id** - Span ID within the trace
- **dt.trace_id** - Dynatrace trace ID
- **dt.span_id** - Dynatrace span ID

### Error Context Fields

- **exception.message** - Exception message text
- **exception.type** - Exception type/class
- **exception.stack_trace** - Full stack trace
- **status** - Log status (often mirrors loglevel)

## Common Query Patterns

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
| filter loglevel == "ERROR" or matchesPhrase(content, "error") or matchesPhrase(content, "exception")
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
| filter matchesPhrase(content, "deployment") or matchesPhrase(content, "restart") or matchesPhrase(content, "startup")
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

### 6. Trace-Correlated Logs

```dql
fetch logs, from:now() - 1h
| filter trace_id == "your-trace-id"
| fields timestamp, content, span_id, k8s.pod.name
| sort timestamp asc
```

## Business Logic Error Detection

### Credit Card Processing Errors (Real Example)

```dql
fetch logs, from:now() - 4h
| filter matchesPhrase(content, "credit card") or matchesPhrase(content, "payment")
| filter loglevel == "WARN" or loglevel == "ERROR"
| fields timestamp, content, exception.message, k8s.pod.name
| sort timestamp desc
| limit 20
```

### Payment Service Specific Analysis

```dql
fetch logs, from:now() - 4h
| filter matchesPhrase(k8s.pod.name, "payment") and matchesPhrase(content, "American Express")
| fields timestamp, content, exception.message, trace_id
| sort timestamp desc
| limit 10
```

## Integration with Problem Analysis

### Correlating Logs with Problems

```dql
fetch logs, from:now() - 2h
| filter loglevel == "ERROR" or loglevel == "WARN"
| filter matchesPhrase(k8s.namespace.name, "astroshop")
| fields timestamp, content, k8s.pod.name, dt.entity.service
| sort timestamp desc
| limit 30
```

### Problem Timeline Correlation

When analyzing a specific problem timeframe (e.g., 11:54 AM - 12:29 PM):

```dql
fetch logs, from:now() - 4h
| filter matchesPhrase(k8s.pod.name, "payment-6977fffc7-2r2hb")
| filter loglevel == "WARN" or loglevel == "ERROR"
| fields timestamp, content, exception.message
| sort timestamp desc
| limit 20
```

## Advanced Analysis Patterns

### Log Rate Analysis

```dql
fetch logs, from:now() - 2h
| filter loglevel == "ERROR"
| fieldsAdd time_bucket = bin(timestamp, 5m)
| summarize log_count = count(), by: {time_bucket, k8s.pod.name}
| sort time_bucket desc
```

### Multi-Service Error Correlation

```dql
fetch logs, from:now() - 2h
| filter loglevel == "ERROR"
| filter matchesPhrase(k8s.namespace.name, "astroshop")
| summarize error_count = count(), latest_error = max(timestamp), by: {k8s.pod.name, exception.message}
| sort error_count desc
```

### Performance Issue Detection

```dql
fetch logs, from:now() - 1h
| filter matchesPhrase(content, "timeout") or matchesPhrase(content, "slow") or matchesPhrase(content, "performance")
| fields timestamp, content, k8s.pod.name, k8s.container.name
| sort timestamp desc
| limit 15
```

## String Matching Best Practices

### ✅ Correct String Operations for Logs

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

### Content Search Techniques

```dql
// Multiple keyword search
| filter matchesPhrase(content, "error") or matchesPhrase(content, "exception") or matchesPhrase(content, "failed")

// Case variations
| filter matchesPhrase(content, "Error") or matchesPhrase(content, "ERROR") or matchesPhrase(content, "error")

// Specific error patterns
| filter matchesPhrase(content, "cannot process") or matchesPhrase(content, "validation failed")
```

## Real-World Investigation Examples

### Payment Service American Express Bug Investigation

**Context**: 57.95% error rate during deployment
**Timeline**: 11:54 AM - 12:29 PM

```dql
fetch logs, from:now() - 4h
| filter matchesPhrase(k8s.pod.name, "payment")
| filter loglevel == "WARN" and matchesPhrase(content, "American Express")
| fields timestamp, content, exception.message, trace_id
| sort timestamp desc
| limit 10
```

**Key Findings from Real Data**:

- **Error Location**: `/usr/src/app/charge.js:73:11`
- **Business Logic Bug**: "Sorry, we cannot process American Express credit cards. Only Visa or Mastercard or American Express are accepted."
- **Trace Correlation**: Each error has associated trace_id for transaction tracking
- **Pod Consistency**: All errors from same pod `payment-6977fffc7-2r2hb`

### Deployment Impact Analysis

```dql
fetch logs, from:now() - 4h
| filter matchesPhrase(k8s.namespace.name, "astroshop")
| filter matchesPhrase(content, "ArgoCD") or matchesPhrase(content, "deployment") or matchesPhrase(content, "git#")
| fields timestamp, content, k8s.pod.name
| sort timestamp desc
| limit 15
```

## Structured Log Analysis

### JSON Log Parsing

For structured JSON logs, the content field contains JSON that can be analyzed:

```dql
fetch logs, from:now() - 2h
| filter matchesPhrase(content, "level")
| fields timestamp, content, k8s.pod.name
| sort timestamp desc
| limit 10
```

### Extracting Values from JSON Logs

```dql
fetch logs, from:now() - 1h
| filter matchesPhrase(content, "\"level\":\"warn\"")
| fields timestamp, content, exception.message, k8s.pod.name
| sort timestamp desc
```

## Performance Considerations

### Optimizing Log Queries

1. **Always include timeframe**: `from:now() - 2h` (avoid overly broad searches)
2. **Filter early**: Apply restrictive filters first
3. **Use entity filters**: Filter by specific pods/services when possible
4. **Limit results**: Always include reasonable limits
5. **Sort efficiently**: Sort by timestamp desc for recent logs

### Query Timeframe Recommendations

- **Real-time debugging**: 15-30 minutes
- **Incident investigation**: 2-4 hours
- **Deployment analysis**: 1-2 hours around deployment time
- **Pattern analysis**: 24 hours maximum
- **Historical research**: Use specific time windows, not broad ranges

## Troubleshooting Log Queries

### Common Issues

1. **Empty Results**: Check timeframe, pod names, and filter criteria
2. **Performance Issues**: Reduce timeframe or add more specific filters
3. **Missing Logs**: Verify log ingestion and entity IDs
4. **Field Access**: Use `| limit 1` to explore available fields

### Field Discovery Technique

```dql
fetch logs, from:now() - 1h
| filter matchesPhrase(k8s.pod.name, "your-pod-name")
| limit 1
```

### Debugging Query Performance

```dql
fetch logs, from:now() - 30m  // Shorter timeframe
| filter k8s.pod.name == "specific-pod-name"  // Exact match
| filter loglevel == "ERROR"  // Specific level
| limit 10  // Small result set
```

## Integration with MCP Tools

### Using Logs After Entity Discovery

After finding entities with MCP tools, use their names in log queries:

```dql
fetch logs, from:now() - 2h
| filter dt.entity.service == "SERVICE-BECA49FB15C72B6A"  // From MCP entity lookup
| filter loglevel == "ERROR"
| fields timestamp, content, exception.message
| sort timestamp desc
| limit 15
```

### Cross-Referencing with Problems

1. **Find problems** with `fetch events | filter event.kind == "DAVIS_PROBLEM"`
2. **Extract affected entities** from problem results
3. **Query logs** for those specific entities during problem timeframe
4. **Correlate trace IDs** between problems and logs

## Follow-up Analysis Workflows

### After Finding Error Logs

1. **Extract stack traces** for deeper code analysis
2. **Find related spans** using trace IDs
3. **Check entity health** for affected services
4. **Analyze deployment correlation** with timestamps
5. **Search for similar errors** across other pods/services

### Log-Driven Root Cause Analysis Process

1. **Start with problem timeframe** from Davis AI analysis
2. **Filter logs to error level** during that period
3. **Identify error patterns** and affected components
4. **Trace correlation** using trace/span IDs
5. **Business logic validation** through error message analysis
6. **Infrastructure correlation** with deployment events

## Integration Notes

- **Always verify DQL syntax** with `verify_dql` before execution
- **Use MCP entity tools** to get precise entity IDs for log filtering
- **Combine with spans** for complete transaction analysis
- **Correlate with metrics** for performance context
- **Reference problem events** for incident context
- **Consider log sampling** for high-volume environments

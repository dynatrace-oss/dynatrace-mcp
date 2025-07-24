# Dynatrace Span Analysis with DQL

## Overview

This guide covers comprehensive span analysis using DQL for root cause analysis, error detection, and distributed tracing investigation. Spans provide the most detailed transaction-level insights, including precise exception details, stack traces, and failure detection results.

## Core DQL Pattern for Spans

### Basic Span Query Structure

```dql
fetch spans, from:now() - 2h
| filter service.name == "your-service"
| fields timestamp, span.name, trace.id, request.is_failed, duration
| sort timestamp desc
| limit 20
```

## Available Data Points

### Primary Fields

- **span.name** - Span operation name (e.g., "oteldemo.PaymentService/Charge")
- **trace.id** - Distributed trace identifier
- **span.id** - Unique span identifier
- **service.name** - Service generating the span
- **duration** - Span duration in nanoseconds
- **start_time** / **end_time** - Span timing boundaries

### Error Detection Fields

- **request.is_failed** - Boolean indicating span failure
- **span.status_code** - Status code ("ok", "error", etc.)
- **span.is_exit_by_exception** - Boolean indicating exception exit
- **dt.failure_detection.results** - Detailed failure analysis

### **🔍 Semantic Error Fields (Enhanced Analysis)**

- **error.id** - Unique identifier for error grouping (16-byte hex ID)
- **error.display_name** - Human-readable error identifier
- **error.type** - Main error type (anr, crash, csp, exception, reported, request)
- **error.is_fatal** - Boolean indicating fatal exit (unhandled exception)
- **error.source** - Error source (console, document_request, exception, fetch, promise_rejection, xhr)
- **error.reason** - Error reason (abort, csp, no_network, timeout)
- **error.code** - Numeric error code
- **aggregation.exception_count** - Number of aggregated spans with exceptions
- **error.exception_count** - Total exceptions observed
- **error.dropped_exception_count** - Exceptions not captured due to limits

### Exception Details

- **span.events** - Array containing exception events
  - **exception.message** - Exception message text
  - **exception.type** - Exception class/type
  - **exception.file.full** - Full file path where exception occurred
  - **exception.line_number** - Exact line number
  - **exception.stack_trace** - Complete stack trace
  - **exception.id** - Unique exception identifier

### Service Context Fields

- **endpoint.name** - API endpoint name
- **code.function** - Function name where span occurs
- **code.filepath** - Source code file path
- **rpc.method** - RPC method name
- **rpc.service** - RPC service name

### Kubernetes Context

- **k8s.pod.name** - Pod generating the span
- **k8s.namespace.name** - Kubernetes namespace
- **k8s.container.name** - Container name
- **k8s.cluster.name** - Cluster name
- **k8s.node.name** - Node name

## Common Query Patterns

### 1. Failed Spans Analysis

```dql
fetch spans, from:now() - 2h
| filter service.name == "payment"
| filter request.is_failed == true
| fields trace.id, span.name, span.events, duration, k8s.pod.name
| sort duration desc
| limit 15
```

### 2. Exception Details Extraction

```dql
fetch spans, from:now() - 4h
| filter service.name == "payment" and request.is_failed == true
| fields trace.id, span.events, dt.failure_detection.results
| limit 10
```

### 3. Specific Exception Pattern Search

```dql
fetch spans, from:now() - 4h
| filter service.name == "payment"
| filter matchesPhrase(span.events, "American Express")
| fields trace.id, span.events, span.status_code
| limit 10
```

### 4. Performance Analysis of Failed Spans

```dql
fetch spans, from:now() - 2h
| filter request.is_failed == true
| fields service.name, span.name, duration, trace.id
| summarize avg_duration = avg(duration), failure_count = count(), by: {service.name, span.name}
| sort failure_count desc
```

### 5. Error Rate by Service

```dql
fetch spans, from:now() - 1h
| filter service.name == "payment"
| fieldsAdd is_error = if(request.is_failed == true, 1, else: 0)
| summarize
    total_requests = count(),
    failed_requests = sum(is_error),
    by: {service.name, endpoint.name}
| fieldsAdd error_rate_percent = (failed_requests * 100.0) / total_requests
| sort error_rate_percent desc
```

### **🔍 Enhanced Error Analysis with Semantic Fields**

#### Semantic Error Classification

```dql
fetch spans, from:now() - 2h
| filter service.name == "payment"
| filter error.is_fatal == true  // Focus on fatal errors only
| summarize
    fatal_errors = count(),
    exception_count = sum(error.exception_count),
    by: {error.type, error.source, error.reason}
| sort fatal_errors desc
```

#### Error Grouping and Correlation

```dql
fetch spans, from:now() - 4h
| filter service.name == "payment" and isNotNull(error.id)
| summarize
    unique_errors = countDistinct(error.id),
    total_occurrences = count(),
    avg_exceptions_per_span = avg(aggregation.exception_count),
    by: {error.display_name, error.type}
| sort total_occurrences desc
```

#### HTTP Error Classification

```dql
fetch spans, from:now() - 2h
| filter service.name == "payment"
| summarize
    http_4xx_errors = sum(error.http_4xx_count),
    http_5xx_errors = sum(error.http_5xx_count),
    http_other_errors = sum(error.http_other_count),
    total_exceptions = sum(error.exception_count),
    by: {service.name, endpoint.name}
| fieldsAdd total_http_errors = http_4xx_errors + http_5xx_errors + http_other_errors
| sort total_http_errors desc
```

#### Exception Drop Rate Analysis

```dql
fetch spans, from:now() - 1h
| filter service.name == "payment"
| filter error.exception_count > 0
| summarize
    total_exceptions = sum(error.exception_count),
    dropped_exceptions = sum(error.dropped_exception_count),
    by: {service.name, k8s.pod.name}
| fieldsAdd drop_rate_percent = (dropped_exceptions * 100.0) / total_exceptions
| filter drop_rate_percent > 0
| sort drop_rate_percent desc
```

### 6. Trace-Based Error Investigation

```dql
fetch spans, from:now() - 2h
| filter trace.id == "your-trace-id"
| fields span.name, service.name, request.is_failed, span.events, duration
| sort start_time asc
```

## Real-World Investigation Examples

### Payment Service American Express Bug Analysis

**Context**: 57.95% error rate during deployment investigation
**Root Cause Found in Spans**: Business logic contradiction in credit card validation

#### Step 1: Identify Failed Payment Spans

```dql
fetch spans, from:now() - 4h
| filter service.name == "payment" and request.is_failed == true
| fields trace.id, span.events, span.status_code
| limit 5
```

**Key Findings from Span Data**:

```json
{
  "span.events": [
    {
      "span_event.name": "exception",
      "exception.message": "Sorry, we cannot process American Express credit cards. Only Visa or Mastercard or American Express are accepted.",
      "exception.type": "Error",
      "exception.file.full": "/usr/src/app/charge.js",
      "exception.line_number": "73",
      "exception.stack_trace": "module.exports.charge (/usr/src/app/charge.js:73)\\nprocess.processTicksAndRejections (node:internal/process/task_queues:105)\\nasync (/usr/src/app/index.js:21)"
    }
  ],
  "span.status_code": "error",
  "dt.failure_detection.results": [
    {
      "verdict": "failure",
      "reason": "exception"
    }
  ]
}
```

#### Step 2: Analyze Exception Pattern

```dql
fetch spans, from:now() - 4h
| filter service.name == "payment" and request.is_failed == true
| summarize error_count = count(), by: {span.events[0].exception.message}
| sort error_count desc
| limit 5
```

**Business Logic Bug Confirmed**:

- **Exact Location**: `/usr/src/app/charge.js:73`
- **Logic Error**: "cannot process American Express" but then says "American Express are accepted"
- **Impact**: All AmEx transactions failing with contradictory validation

#### Step 3: Error Distribution Analysis

```dql
fetch spans, from:now() - 4h
| filter service.name == "payment"
| fieldsAdd has_amex_error = if(matchesPhrase(span.events, "American Express"), 1, else: 0)
| summarize
    total_spans = count(),
    amex_errors = sum(has_amex_error),
    by: {k8s.pod.name}
| fieldsAdd amex_error_rate = (amex_errors * 100.0) / total_spans
| sort amex_error_rate desc
```

## Advanced Span Analysis Patterns

### Multi-Service Error Correlation

```dql
fetch spans, from:now() - 2h
| filter request.is_failed == true
| filter matchesPhrase(k8s.namespace.name, "astroshop")
| summarize
    error_count = count(),
    unique_traces = countDistinct(trace.id),
    by: {service.name, span.events[0].exception.message}
| sort error_count desc
```

### Exception Propagation Analysis

```dql
// Find root cause exceptions
fetch spans, from:now() - 2h
| filter request.is_failed == true
| filter span.events[0].exception.is_caused_by_root == true
| fields trace.id, service.name, span.events[0].exception.message, span.events[0].exception.file.full
| summarize root_exceptions = count(), by: {service.name, span.events[0].exception.message}
| sort root_exceptions desc
```

### Performance Impact of Errors

```dql
fetch spans, from:now() - 2h
| filter service.name == "payment"
| fieldsAdd error_category = if(request.is_failed == true, "failed", else: "success")
| summarize
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95),
    count = count(),
    by: {error_category}
| sort avg_duration desc
```

## Integration with Problems and Logs

### Complete Investigation Workflow

#### Phase 1: Problem Context Extraction

```dql
// Start with problem identification
fetch events, from:now() - 24h
| filter event.kind == "DAVIS_PROBLEM" and display_id == "P-25071206"
| fields event.start, event.end, affected_entity_ids, k8s.pod.name
```

#### Phase 2: Span-Level Root Cause Analysis

```dql
// Get detailed span exceptions during problem period
fetch spans, from:now() - 4h  // Adjust based on problem timeframe
| filter service.name == "payment" and request.is_failed == true
| fields trace.id, span.events, dt.failure_detection.results, k8s.pod.name
| limit 10
```

#### Phase 3: Cross-Reference with Logs

```dql
// Correlate span trace IDs with log entries
fetch logs, from:now() - 4h
| filter trace_id == "162aaed047f724043441c38744bcf37d"  // From span analysis
| fields timestamp, content, exception.message, k8s.pod.name
| sort timestamp desc
```

### Span-Log-Problem Correlation

**Advantages of Span Analysis**:

1. **Precise Exception Location**: Exact file and line number
2. **Complete Stack Traces**: Full call stack for debugging
3. **Failure Detection Results**: Automated root cause classification
4. **Performance Context**: Duration and timing information
5. **Distributed Context**: Complete trace relationships

**Best Practice Integration**:

```dql
// 1. Find failed spans
fetch spans, from:now() - 2h
| filter service.name == "payment" and request.is_failed == true
| fields trace.id, span.events[0].exception.message, span.events[0].exception.line_number

// 2. Cross-reference with logs for additional context
fetch logs, from:now() - 2h
| filter trace_id in ["trace-id-1", "trace-id-2", "trace-id-3"]  // From spans
| fields timestamp, content, exception.stack_trace

// 3. Validate against problem events
fetch events, from:now() - 24h
| filter event.kind == "DAVIS_PROBLEM"
| filter matchesPhrase(event.description, "payment")
```

## String Matching for Span Analysis

### ✅ Effective Span Queries

```dql
| filter matchesPhrase(span.events, "American Express")        // Exception content search
| filter service.name == "payment"                             // Exact service match
| filter span.name == "oteldemo.PaymentService/Charge"         // Exact span name
| filter startsWith(span.events[0].exception.file.full, "/usr/src/app/")  // File path prefix
```

### Exception Pattern Matching

```dql
// Multiple exception types
| filter matchesPhrase(span.events, "credit card") or matchesPhrase(span.events, "payment")

// Specific error categories
| filter matchesPhrase(span.events, "validation") or matchesPhrase(span.events, "invalid")

// File-based filtering
| filter matchesPhrase(span.events[0].exception.file.full, "charge.js")
```

## Performance Considerations

### Optimizing Span Queries

1. **Filter by service first**: `service.name == "payment"`
2. **Use failure filters early**: `request.is_failed == true`
3. **Limit timeframes**: `from:now() - 2h` for recent analysis
4. **Limit result sets**: Always include reasonable limits
5. **Target specific traces**: Use trace.id when available

### Query Timeframe Recommendations

- **Real-time debugging**: 15-30 minutes
- **Incident investigation**: 2-4 hours
- **Performance analysis**: 1-24 hours
- **Historical research**: Use specific time windows

## Troubleshooting Span Queries

### Common Issues and Solutions

1. **No timestamp in results**: Spans may not populate timestamp field consistently
2. **Empty span.events**: Not all spans have exception events
3. **Performance issues**: Reduce timeframe and add service filters
4. **Missing exception details**: Use `limit 1` to explore span structure

### **CRITICAL: Field Reference Issues Found During Investigation**

**❌ WRONG - Invalid field references:**

```dql
// These field names cause errors in DQL
| filter dt.trace.id == "trace-id"           // Use dt.trace_id instead
| summarize avg(duration), count()
| sort avg_duration desc                     // Field doesn't exist after summarize
| filter status.code != "STATUS_CODE_OK"    // Most spans don't have status.code populated
```

**✅ CORRECT - Working field references:**

```dql
// Proper field names and references
| filter dt.trace_id == "trace-id"           // Correct trace ID field
| summarize avg_duration = avg(duration), count()
| sort avg_duration desc                     // Named field works
| sort `count()` desc                        // Or use backticks for functions

// Status checking - most spans don't populate status.code
| filter request.is_failed == true           // More reliable failure detection
| filter span.status_code == "error"         // Use span.status_code when available
```

### **Entity Filter Patterns**

```dql
// Service filtering by entity ID (most reliable)
| filter dt.entity.service == "SERVICE-BECA49FB15C72B6A"

// Service filtering by name (may not always work)
| filter service.name == "payment"           // Sometimes works
| filter dt.entity.service_name == "payment" // Alternative if available
```

### **Large Result Set Issues**

**Problem**: Span queries can return massive datasets exceeding token limits

**❌ Causes token overflow:**

```dql
fetch spans, from:now() - 6h
| filter dt.entity.service == "SERVICE-BECA49FB15C72B6A"
| limit 100                                  // Still too much data
```

**✅ SOLUTIONS - Reduce data volume:**

```dql
// Option 1: Use summarize to aggregate
fetch spans, from:now() - 6h
| filter dt.entity.service == "SERVICE-BECA49FB15C72B6A"
| summarize count(), avg(duration), by: {span.name, request.is_failed}

// Option 2: Filter errors only
fetch spans, from:now() - 6h
| filter dt.entity.service == "SERVICE-BECA49FB15C72B6A"
| filter request.is_failed == true
| limit 5

// Option 3: Select specific fields only
fetch spans, from:now() - 2h
| filter dt.entity.service == "SERVICE-BECA49FB15C72B6A"
| fields trace.id, span.name, request.is_failed, duration
| limit 20
```

### Field Discovery for Spans

```dql
fetch spans, from:now() - 1h
| filter service.name == "payment" and request.is_failed == true
| limit 1
```

This returns the complete span structure with all available fields for investigation.

## Key Insights from Real Data

### Payment Service Investigation Results

- **Exception Location**: `/usr/src/app/charge.js:73` (precise line number)
- **Business Logic Error**: Contradictory validation message
- **Error Pattern**: Consistent across all failed American Express transactions
- **Trace Correlation**: Perfect match between spans, logs, and problems
- **Performance Impact**: Failed spans had varying durations but consistent error pattern

### Span Analysis Advantages

1. **Most Precise**: exact file and line number for exceptions
2. **Complete Context**: full stack traces and failure detection
3. **Performance Metrics**: duration and timing information
4. **Distributed Tracing**: complete transaction flow visibility
5. **Automated Classification**: Dynatrace failure detection results

## Integration Notes

- **Always verify DQL syntax** with `verify_dql` before execution
- **Use spans for precise root cause analysis** when exceptions occur
- **Correlate trace IDs** across spans, logs, and metrics
- **Focus on span.events** for detailed exception information
- **Leverage dt.failure_detection.results** for automated insights
- **Cross-reference with logs and problems** for complete investigation

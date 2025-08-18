# Dynatrace Span Analytics - Complete Reference

## Overview

**⚠️ Important**: Spans use `start_time` for timestamp field (not `timestamp` like other data sources)

Spans provide precise root cause analysis with exact exception details, stack traces, and failure detection for transaction-level investigation and distributed tracing analysis.

**When to Use Spans vs Service Metrics:**

- **Use Spans**: Root cause analysis, exception debugging, individual request investigation
- **Use Service Timeseries**: Continuous monitoring, dashboards, SLA tracking

**Related Files:**

- [`../DynatraceInvestigationChecklist.md`](../DynatraceInvestigationChecklist.md) - **MANDATORY** validation checklist for all investigations
- [`DynatraceServiceAnalytics.md`](DynatraceServiceAnalytics.md) - Service-level golden signals monitoring
- [`DynatraceLogAnalysis.md`](DynatraceLogAnalysis.md) - Log correlation using trace IDs
- [`observabilityProblems.md`](observabilityProblems.md) - Problem investigation framework
- [`DynatraceProcessInvestigation.md`](DynatraceProcessInvestigation.md) - Process-level investigation

## 🚨 PRIORITY 1: Exception Root Cause Analysis (MANDATORY)

**CRITICAL**: ALWAYS start with exception analysis for failed services. This is the most precise way to identify root causes.

### 🔍 Exception Discovery & Business Logic Analysis

```dql
// STEP 1: Find all exception patterns across services
fetch spans, from:now() - 4h
| filter request.is_failed == true and isNotNull(span.events)
| expand span.events
| filter span.events.name == "exception"
| summarize exception_count = count(), by: {service.name, exception_message = span.events.attributes["exception.message"]}
| sort exception_count desc
| limit 20
```

### 🎯 Service-Specific Exception Deep Dive

```dql
// STEP 2: Analyze specific service exceptions with full context
fetch spans, from:now() - 4h
| filter service.name == "IDENTIFIED_SERVICE" and request.is_failed == true
| fields trace.id, span.events, dt.failure_detection.results, duration
| limit 10
```

**🔍 What to Look For:**

- **Contradictory business logic** in exception messages (e.g., "AmEx not accepted...AmEx accepted")
- **File locations and line numbers** from stack traces (`/usr/src/app/charge.js:73`)
- **Repeated exception patterns** indicating systematic issues
- **Business validation errors** vs. technical failures

### 🔍 Exception Stack Trace Analysis

```dql
// STEP 3: Extract detailed stack traces and file locations
fetch spans, from:now() - 2h
| filter request.is_failed == true and isNotNull(span.events)
| fieldsAdd service_name = entityName(dt.entity.service)
| fields trace.id, span.events, span.name, service_name, duration
| limit 15
```

**Example Critical Finding:**

- **Exception**: "Sorry, we cannot process American Express credit cards. Only Visa or Mastercard or American Express are accepted."
- **Location**: `/usr/src/app/charge.js:73`
- **Root Cause**: Business logic contradiction in credit card validation

### Service-Specific Error Analysis

```dql
// Analyze errors for a specific service
fetch spans, from:now() - 4h
| filter dt.entity.service == "SERVICE-ID"
| filter request.is_failed == true
| fieldsAdd service_name = entityName(dt.entity.service)
| fields trace.id, span.events, dt.failure_detection.results, duration
| summarize
    total_errors = count(),
    avg_duration = avg(duration),
    by: {span.name, service_name}
| sort total_errors desc
```

### Timeline-Based Error Investigation

```dql
// Track error patterns over time during incidents
fetch spans, from:now() - 4h
| filter request.is_failed == true
| makeTimeseries errors = count(), interval:5m
```

## 🚀 Exception-First Quick Start Guide

### 1. Exception Discovery (ALWAYS START HERE)

```dql
// Find all exception patterns first
fetch spans, from:now() - 30m
| filter request.is_failed == true and isNotNull(span.events)
| expand span.events
| filter span.events.name == "exception"
| fields service.name, exception_message = span.events.attributes["exception.message"], trace.id
| limit 10
```

### 2. Service-Specific Exception Analysis

```dql
// Deep dive into specific service exceptions
fetch spans, from:now() - 30m
| filter service.name == "payment" and request.is_failed == true
| fields trace.id, span.events, dt.failure_detection.results
| limit 5
```

### 3. Search-Based Exception Discovery

```dql
// Use search to find hidden patterns
fetch spans, from:now() - 30m | search "AmEx" or "validation" | fields service.name, span.events
```

**⚠️ CRITICAL**: Never skip exception analysis. It provides exact error messages, file locations, and business logic errors that metrics alone cannot reveal.

## Field Reference & Best Practices

### Field Reliability Guide

| Field                           | Reliability | Notes                                     |
| ------------------------------- | ----------- | ----------------------------------------- |
| `trace.id`                      | 100%        | Always available, primary correlation key |
| `span.name`                     | 100%        | Most reliable operation identifier        |
| `request.is_failed`             | 100%        | Primary failure detection mechanism       |
| `duration`                      | 100%        | Always present, in nanoseconds            |
| `timestamp`                     | 100%        | Correct field name for sorting            |
| `entityName(dt.entity.service)` | 95%         | Reliable service name enrichment          |
| `span.events`                   | ~40%        | Only when actual exceptions occur         |
| `dt.failure_detection.results`  | 95%         | Dynatrace AI analysis                     |

### Service Identification Best Practices

**Always prefer `entityName(dt.entity.service)` for service identification:**

- `service.name` is only present for OpenTelemetry spans
- `entityName(dt.entity.service)` provides 95% reliability vs ~30% for `service.name`
- Use for filtering, grouping, and displaying service names in all span queries

### Service Filtering Patterns

```dql
// By service name
fetch spans, from:now() - 2h
| filter entityName(dt.entity.service) == "myapp"
| filter request.is_failed == true
| fieldsAdd service_name = entityName(dt.entity.service)

// By service ID
fetch spans, from:now() - 2h
| filter dt.entity.service == "SERVICE-XXXXXXXXXXXXXXXX"
| filter request.is_failed == true
| fieldsAdd service_name = entityName(dt.entity.service)
```

### Log Correlation Patterns

**Do not use service entities for logs. Use infrastructure context instead:**

```dql
// Kubernetes context
fetch logs, from:now() - 1h
| filter k8s.pod.name == "myapp-pod-xxx"
| filter k8s.namespace.name == "production"

// Host context
fetch logs, from:now() - 1h
| filter host.name == "web-server-01"
```

### Common Issues & Solutions

1. **Empty span.events**: Check `isNotNull(span.events)` before accessing
2. **Null service.name**: Use `entityName(dt.entity.service)` instead
3. **Parse errors**: Avoid complex nested access like `span.events[0].exception.type`
4. **Performance issues**: Add failure filters first, reduce timeframes
5. **Large datasets**: Use summarize or filter errors only

### Query Optimization Guidelines

1. **Start with failure filter**: `request.is_failed == true` — most important filter
2. **Use service name enrichment**: `fieldsAdd service_name = entityName(dt.entity.service)`
3. **Limit timeframes**: `from:now() - 2h` for recent analysis, `30m` for real-time
4. **Always include limits**: Prevent overwhelming datasets with `| limit N`
5. **Check isNotNull(span.events)**: Not all failed spans have exception details

### Time Range Optimization

| Use Case               | Recommended Range | Reasoning                       |
| ---------------------- | ----------------- | ------------------------------- |
| Real-time monitoring   | 15-30 minutes     | Fresh data, fast queries        |
| Incident investigation | 1-4 hours         | Context without performance hit |
| Pattern analysis       | 4 hours max       | Longer ranges may timeout       |
| Exception trending     | Start 1 hour      | Expand carefully if needed      |

## Complete Investigation Workflows

### High Error Rate Investigation

```dql
// 1. Quick Assessment (30 seconds)
fetch spans, from:now() - 30m
| filter request.is_failed == true
| summarize count(), by: {span.name}
| sort count() desc

// 2. Error Rate Analysis (2 minutes)
fetch spans, from:now() - 1h
| filter request.is_root_span == true
| fieldsAdd is_error = if(request.is_failed == true, 1, else: 0)
| fieldsAdd service_name = entityName(dt.entity.service)
| summarize
    total = count(),
    failed = sum(is_error),
    by: {span.name, service_name}
| fieldsAdd error_rate = (failed * 100.0) / total
| sort error_rate desc

// 3. Exception Analysis (3 minutes)
fetch spans, from:now() - 2h
| filter request.is_failed == true and span.name == "TOP_FAILING_OPERATION"
| fieldsAdd service_name = entityName(dt.entity.service)
| fields trace.id, span.events, duration, service_name
| limit 3
```

### Exceptions

Exceptions that happen in the context of a distributed trace are stored within individual spans as a list of span.events.

It's possible to query for those exceptions via iAny command.

It's also possible to expand and flatten the span events, so that the exception attributes appear as top level attributes. With this, it's easy to create timeseries or any other aggregation from exceptions.

Remember, every attribute is full-text searchable and this also applies to exception messages and stack traces.

It's even possible to apply DQL parse command to extract structured information.

### Find exceptions, excluding specific ones

```
fetch spans

// only spans which contain a span event of type "exception"
| filter iAny(span.events[][span_event.name] == "exception")

// exclude specific exception
| filter iAny(not contains(span.events[][exception.message], "connect"))

// make exception attributes top level attributes
| expand span.events | fields span.events | fieldsFlatten span.events | fieldsRemove span.events

```

### Full text search on exception stack_trace

```
fetch spans

// full text search on stacktrace
| filter iAny(contains(span.events[][exception.stack_trace], "invoke"))

// make exception attributes top level attributes
| expand span.events | fields span.events | fieldsFlatten span.events | fieldsRemove span.events

```

### Exception counts

```
fetch spans

// only spans which contain a span event of type "exception"
| filter iAny(span.events[][span_event.name] == "exception")

// make exception type top level attribute
| expand span.events | fieldsFlatten span.events, fields: { exception.type }

| summarize count(), by: { exception.type }
```

### Performance Impact Assessment

```dql
fetch spans, from:now() - 2h
| filter request.is_root_span == true
| fieldsAdd status = if(request.is_failed == true, "failed", else: "success")
| summarize
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95),
    count = count(),
    by: {status}
```

### Trace Investigation

```dql
fetch spans, from:now() - 2h
| filter trace.id == toUid("your-trace-id")
| fieldsAdd service_name = entityName(dt.entity.service)
| fields span.name, service_name, request.is_failed, span.events, duration, start_time
| sort start_time asc
```

## Syntax Reference

### ❌ Common Errors to Avoid

```dql
// Field name errors for spans
| sort timestamp asc                     // Use start_time for spans instead
| filter trace.id == "trace-id"         // Use toUid() function

// Complex nested access (parse failures)
| summarize count(), by: {span.events[0].exception.type}

// Unreliable service filtering
| filter service.name == "payment"       // Often null

// WRONG for logs - service entities not available
fetch logs | filter dt.entity.service == "SERVICE-ID"
```

### ✅ Verified Working Patterns

```dql
// Correct field names and functions
| sort start_time asc
| filter trace.id == toUid("trace-id")
| filter request.is_failed == true

// Simple aggregation
| summarize error_count = count(), by: {span.name}

// Service filtering with enrichment
| filter entityName(dt.entity.service) == "myapp"
| fieldsAdd service_name = entityName(dt.entity.service)

// Service entity filtering
| filter dt.entity.service == "SERVICE-XXXXXXXXXXXXXXXX"

// Log filtering (use infrastructure context)
| filter k8s.pod.name == "myapp-pod-xxx"
| filter host.name == "web-server-01"
```

### Requests

Requests in Dynatrace are represented by "special" spans, which are marked as request roots (request.is_root_span: true). These are spans that represent an incoming call.

#### Request root spans

```
fetch spans

// filter only for request root spans
| filter request.is_root_span == true

| fields trace.id, span.id, start_time, response_time = duration, endpoint.name

| limit 100
```

#### Failed Requests

Requests which are considered "failed" are marked with request.is_failed: true.

```
fetch spans

// filter only for request root spans
| filter request.is_root_span == true

// select specific endpoint
//| filter endpoint.name == "/api/v1/payment"

// chart number of failed requests over time
| makeTimeseries { failed_requests=countIf(request.is_failed == true) }, by: {endpoint.name}
```

#### Request Attributes

You can also have your request attributes added on your spans. Therefore make sure that they (and also all OpenTelemetry attributes) are forwarded to Grail by selecting "Allow all attributes" in your "Settings" -> "Server side monitoring" -> "Attribute capturing" -> "Preferences"

Semantic Dictionary, will also include "request attributes" and "captured attributes".

Request attributes are respresented as span attributes on the "request root span" (request.is_root: true) with the following key: request_attribute.<name of the request attribute>.

In case the request attribute name contains has special, you need to use backticks:

```
fetch spans

// no backticks required
| filter isNotNull(request_attribute.my_customer_id)

// backticks required
| filter isNotNull(`request_attribute.My Customer ID`)
```

The data-type of request_attribute.\* depends on the request attribute config. If the config says "All values", the data-type will be an array.

If a request attribute is configured to be captured from method parameters, there are additional attributes on the span on which the attribute has been captured with the following key: captured_attribute.<name of the request attribute>.

Note, that the data-type of captured_attribute.\* will always be an array. This is because at capture time it is not known yet if there is only a single value or multiple values.

### Logs

Logs can be enriched with trace_id and span_id. OneAgent can even enrich such context into logs automatically.

With this information it is possible to join spans and logs. For example: Find traces & spans which emit specific logs.

```
fetch logs

// only logs that have a trace context
| filter isNotNull(trace_id)

| limit 10
```

#### Find traces/spans, in which the log line contains something

```
fetch spans

| filter trace.id in [
    fetch logs

    // only logs that have a trace context
    | filter isNotNull(trace_id)

    // search for a particular string in logs content
    | filter contains(content, "VISA")

    // convert from string to UID type
    | fields toUid(trace_id)
]
| limit 10
```

Note: Subqueries within an in statement do have a limit in regards to the size of the subquery result.

If the subquery result is too large, you will get a IN_KEYWORD_TABLE_SIZE DQL error.

From logs that contain the word "Fitzgerald", show performance of spans in which the log was emitted.

```
fetch spans

| filter span.id in [
    fetch logs

    // only logs that have a trace context
    | filter isNotNull(span_id)

    | filter contains(content, "User")

    // convert from string to UID type
    | fields toUid(span_id)
]

// pick either span.name or code namespace+function, depending what is available
| fieldsAdd name = coalesce(span.name, concat(code.namespace, ".", code.function))

| summarize { count(), avg(duration), p99=percentile(duration, 99), trace.id=takeAny(trace.id) } , by: { k8s.pod.name, name }
```

#### Join spans and logs

```
fetch spans

| fieldsAdd trace_id = toString(trace.id)

| join [ fetch logs ]
  , on:{ left[trace_id] == right[trace_id] }
  , fields: { content, loglevel }

| fields start_time, trace.id, span.id, code=concat(code.namespace, ".", code.function), loglevel, content

| limit 100
```

### Sampling, Aggregation and Extrapolation

There are multiple situations when one span can represent multiple real operations. This can be cause by aggregation or by sampling, whereas there are multiple types of sampling.

#### Aggregation

Certain types of operations of the same type can be aggregated into one single span. This is an optimization to reduce the amount of spans.

One example are database spans. If there are many database operations with the same statement, on the same database, OneAgent may choose to aggregate them. Such aggregated spans can be identified by the presence of the aggregation.count attribute.

#### Sampling

- Adaptive Traffic Management (ATM) is a rate-limiting, head-based sampling mechanism, that adaptively reacts to the rate of requests. The decision is made on the agent, at the beginning of a trace (thus "head-based").
- Adaptive Load Reduction (ALR) is a server-side sampling mechanism, that is aimed to protect the backend infrastructure from being overloaded.
- Read Sampling
  - With read sampling, a user can control how much data should be read in a query, via the parameter samplingRatio.
  - With a value greater than 1, only a sampled fraction of the data is read.
  - The following sampling rates are available: 1, 10, 100, 1000, 10000, 100000. Whereas 1 means 100% data, and 100 means 1% of data.
  - The actually applied read-sampling ratio can be used via dt.system.sampling_ratio. Even if samplingRatio: 17, Grail may decide to fall back to an actual sampling rate of 10.

#### Extrapolation

To take all of this into account, when counting operations, you need to extrapolate span counts to actual operation count, by using the correct extrapolation-factor.

```
// calculate multiplicity factor for every span, to for extrapolations
| fieldsAdd sampling.probability = (power(2, 56) - coalesce(sampling.threshold, 0)) * power(2, -56)
| fieldsAdd sampling.multiplicity = 1/sampling.probability
| fieldsAdd multiplicity = coalesce(sampling.multiplicity, 1)
                         * coalesce(aggregation.count, 1)
                         * dt.system.sampling_ratio
```

To use the extrapolation, for example to count the number of requests, sum() needs to be used, instead of count().

```
| summarize count = sum(multiplicity)
```

Counting requests, with extrapolions:

```
fetch spans

// read only 1% of data for better read performance
, samplingRatio:100

// only request roots
| filter request.is_root_span == true

// calculate multiplicity factor for every span, to for extrapolations
| fieldsAdd sampling.probability = (power(2, 56) - coalesce(sampling.threshold, 0)) * power(2, -56)
| fieldsAdd sampling.multiplicity = 1/sampling.probability
| fieldsAdd multiplicity = coalesce(sampling.multiplicity, 1)
                         * coalesce(aggregation.count, 1)
                         * dt.system.sampling_ratio

| summarize  span_count=count(), request_count_extrapolated = sum(multiplicity)
```

Database call count and durations, extrapolated:

```
fetch spans

// read only 1% of data for better read performance
, samplingRatio:100

// only database spans
| filter isNotNull(db.statement)

// calculate multiplicity factor for every span, to for extrapolations
| fieldsAdd sampling.probability = (power(2, 56) - coalesce(sampling.threshold, 0)) * power(2, -56)
| fieldsAdd sampling.multiplicity = 1/sampling.probability
| fieldsAdd multiplicity = coalesce(sampling.multiplicity, 1)
                         * coalesce(aggregation.count, 1)
                         * dt.system.sampling_ratio

| fieldsAdd aggregation.duration_avg = coalesce(aggregation.duration_sum / aggregation.count, duration)

| summarize {
    operation_count_extrapolated = sum(multiplicity),
    operation_duration_extrapolated = sum(aggregation.duration_avg * multiplicity) / sum(multiplicity)
}
```

### IP Addresses and networking

Trace data contains information about networking, for example which IP addresses a request is being made to, or IP address of a client.

The following example shows which requests all services in the environment make, including server.address and the IP address of that server. Note, that the field server.resolved_ips contains an array of IP addresses, which represent the result of a DNS lookup on the server.address at the time the request has been made.

Server addresses and IP addresses of all outgoing request:

```
fetch spans
| filter isNotNull(server.resolved_ips)

// collect all server IP addresses of the whole environment
| summarize { ips=collectDistinct( arraySort(server.resolved_ips)) }, by: { server.address, server.port }

// ips is an array of arrays, thus double expand to make it a flat list
| expand ips | expand ips
| sort ips
```

Server addresses and IP addresses of all outgoing request, split by originating service:

```
fetch spans
| filter isNotNull(server.resolved_ips)

| fieldsAdd entityName(dt.entity.service) // adds dt.entity.service.name

| summarize { count(), ips=collectDistinct( server.resolved_ips) }, by: { k8s.namespace.name, dt.entity.service.name, server.address, operation=coalesce(span.name, concat(code.namespace, ".", code.function)), span.kind }
| expand ips
```

Client IP address count per service, with masked IP list:

```
fetch spans
| filter isNotNull(client.ip)

// make it a structured IP type to be able to work with ip functions
| fieldsAdd client.ip = toIp(client.ip)

// mask to not expose full ip in result
| fieldsAdd client.ip.masked = ipMask(client.ip, 16)

| fieldsAdd entityName(dt.entity.service) // adds dt.entity.service.name

| summarize { distinct_clients = countDistinct(client.ip), masked_client_ips=toString(arraySort(collectDistinct(client.ip.masked))) }
  , by: { k8s.namespace.name, dt.entity.service.name, span.kind }
| sort distinct_clients desc
```

### Databases

Top database statements per service

```
fetch spans

// filter for database spans
| filter span.kind == "client" and isNotNull(db.namespace)

| fieldsAdd entityName(dt.entity.service) // adds dt.entity.service.name

// calculate multiplicity factor for every span, to for extrapolations
| fieldsAdd sampling.probability = (power(2, 56) - coalesce(sampling.threshold, 0)) * power(2, -56)
| fieldsAdd sampling.multiplicity = 1/sampling.probability
| fieldsAdd multiplicity = coalesce(sampling.multiplicity, 1)
                         * coalesce(aggregation.count, 1)
                         * dt.system.sampling_ratio

| summarize { db_calls = sum(multiplicity) }, by: { dt.entity.service.name, code.function, db.system, db.namespace, db.query.text }

// top 100
| sort db_calls desc | limit 100
```

Database calls per endpoint as timeseries

```
fetch spans

// calculate multiplicity factor for every span, to for extrapolations
| fieldsAdd sampling.probability = (power(2, 56) - coalesce(sampling.threshold, 0)) * power(2, -56)
| fieldsAdd sampling.multiplicity = 1/sampling.probability
| fieldsAdd multiplicity = coalesce(sampling.multiplicity, 1)
                         * coalesce(aggregation.count, 1)
                         * dt.system.sampling_ratio

| summarize {
    spans = count(),
    db_spans = countIf(span.kind == "client" and isNotNull(db.name)),
    db_calls = sum(
      if(span.kind == "client" and isNotNull(db.name),
         multiplicity,
         else: 0)
    ),

    // from all spans in the summarized group, select the one that is the request root
    request_root = takeMin(record(
        root_detection_helper = coalesce(if(isNotNull(endpoint.name), 1), 2),
        start_time, endpoint.name, duration
      ))
}, by: { trace.id, request.id }

| fields
    start_time = request_root[start_time],
    endpoint = request_root[endpoint.name],
    respopnse_time = request_root[duration],
    spans,
    db_spans, db_calls,
    trace.id

| makeTimeseries { avg(db_calls) }, by: { endpoint }, time: start_time

// only show top 30 timeseries
| sort arraySum(`avg(db_calls)`) desc | limit 30
```

## Advanced Patterns & Real-World Examples

### Multi-Service Error Correlation

```dql
fetch spans, from:now() - 2h
| filter request.is_failed == true
| filter matchesPhrase(k8s.namespace.name, "astroshop")
| fieldsAdd service_name = entityName(dt.entity.service)
| summarize
    error_count = count(),
    unique_traces = countDistinct(trace.id),
    by: {service_name, span.name}
| sort error_count desc
```

### Performance Impact Analysis

```dql
fetch spans, from:now() - 2h
| fieldsAdd error_category = if(request.is_failed == true, "failed", else: "success")
| fieldsAdd service_name = entityName(dt.entity.service)
| summarize
    avg_duration = avg(duration),
    p95_duration = percentile(duration, 95),
    by: {error_category, service_name}
```

### Real-World Error Patterns

**Common Issues:**

- Authentication failures (e.g., `NotLoggedInException`)
- HTTP GET/POST failures with high duration (800-1000ms)
- API endpoints with 100% error rates
- Cascading failures in microservices

**Performance Characteristics:**

- Failed requests typically last 800-1000ms
- Error hotspots: timeline and conversion rate endpoints
- Example: `GET /timeline` (1250 errors), `GET /conversion-rate` (1011 errors)

## Integration & Troubleshooting Workflow

### Cross-File Investigation Flow

1. **Start with Service Analytics:** Use [`DynatraceServiceAnalytics.md`](DynatraceServiceAnalytics.md) to identify service anomalies
2. **Deep Dive with Span Analysis:** Use this file to analyze error patterns, exceptions, and root causes
3. **Correlate with Logs:** Use [`DynatraceLogAnalysis.md`](DynatraceLogAnalysis.md) to validate findings with trace IDs
4. **Systematic Problem Resolution:** Follow [`observabilityProblems.md`](observabilityProblems.md) for structured troubleshooting

### Key Advantages

- Exact file and line number for exceptions
- Full stack traces and failure detection
- Performance metrics (duration, timing)
- Distributed tracing for complete transaction flow
- Automated failure classification by Dynatrace

### Integration Tips

- Always verify DQL syntax before execution
- Use `trace.id` to correlate across spans, logs, and problems
- Focus on `span.events` for detailed exception information
- Cross-reference with logs and problems for complete investigation
- Example: `GET /timeline` (1250 errors), `GET /conversion-rate` (1011 errors)

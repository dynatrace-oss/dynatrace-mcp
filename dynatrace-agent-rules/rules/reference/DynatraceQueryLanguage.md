# Dynatrace Query Language (DQL) Reference

Dynatrace Query Language (DQL) is a powerful, pipeline-based query language designed to explore and analyze observability data stored in Dynatrace Grail. It enables users to fetch, filter, transform, and visualize data from logs, metrics, events, and more.

**Related Files:**

- **DynatraceExplore.md** - Environment discovery and field exploration using DQL
- **../workflows/DynatraceIncidentResponse.md** - Problem investigation with DQL patterns
- **../workflows/dataSourceGuides/DynatraceDataInvestigation.md** - Log analysis and service monitoring using DQL
- **../workflows/dataSourceGuides/DynatraceSpanAnalysis.md** - Span analytics with DQL
- **../workflows/DynatraceSecurityCompliance.md** - Security and compliance DQL patterns

## 🎯 **Key Patterns & Best Practices Summary**

> **📖 Complete Analysis Guides**: For detailed workflows and examples:
>
> - **[DynatraceIncidentResponse.md](../workflows/DynatraceIncidentResponse.md)** - Problem investigation with real examples
> - **[DynatraceSpanAnalysis.md](../workflows/dataSourceGuides/DynatraceSpanAnalysis.md)** - Detailed span failure analysis
> - **[DynatraceDataInvestigation.md](../workflows/dataSourceGuides/DynatraceDataInvestigation.md)** - Log correlation and service monitoring

### **Essential Query Structure**

```dql
fetch [data_source], from:now() - [timeframe]
| filter [conditions]
| dedup {key_fields}, sort: {timestamp desc}  // For latest snapshots (logs/events/problems)
| dedup {key_fields}, sort: {start_time desc} // For latest snapshots (spans)
| summarize [aggregations], by: {grouping_fields}
| sort [field] desc
| limit [number]
```

### **Critical Best Practices**

1. **Start Broad, Then Filter**: Begin with wide queries to discover available fields
2. **Use Appropriate Timeframes**: 24h+ for cloud compliance, default for K8s/logs
3. **Latest Snapshots Only**: Always use `dedup` for current state analysis
4. **Never Aggregate Over Time**: For compliance, focus on latest scan results only
5. **Leverage Pipeline Structure**: Build complex queries step by step
6. **Use Scalar for Single Values**: For single aggregated values from timeseries, use `scalar: true`
7. **Normalize with Rate**: Use `rate` parameter for time-normalized metrics (MB/s, requests/min)
8. **Timestamp Field Names**: Use `start_time` for spans, `timestamp` for logs/events/problems

### **Core Data Source Quick Reference**

```dql
// Service metrics (for monitoring dashboards - see ../workflows/dataSourceGuides/DynatraceDataInvestigation.md)
timeseries avg(dt.service.request.count), from: now()-1h, interval: 5m

// Problems (comprehensive workflows in observabilityProblems.md)
fetch events, from:now() - 24h | filter event.kind == "DAVIS_PROBLEM"
fetch dt.davis.problems | filter not(dt.davis.is_duplicate)

// Spans (detailed patterns in DynatraceSpanAnalysis.md - ALWAYS filter by service/namespace)
fetch spans, from:now() - 1h
| filter dt.entity.service == "SERVICE-ID" and request.is_failed == true

// Logs (extensive patterns in DynatraceLogAnalysis.md)
fetch logs, from:now() - 2h
| filter loglevel == "ERROR" and k8s.namespace.name == "production"

// Security events
fetch security.events, from:now() - 24h
```

### **Timeseries Scalar Pattern**

```dql
// ❌ WRONG - Returns array of time-based values
timeseries total_bytes = sum(dt.host.net.nic.bytes_rx), from: now()-1h, interval: 30m
// Returns: [164306530095, 163387047026, 20547359107]

// ✅ CORRECT - Returns single aggregated value
timeseries total_bytes = sum(dt.host.net.nic.bytes_rx, scalar: true), from: now()-1h
// Returns: 326139539760.11975

// Use scalar when you need a single total/average across the entire timeframe
timeseries
  total_network_in = sum(dt.host.net.nic.bytes_rx, scalar: true),
  total_network_out = sum(dt.host.net.nic.bytes_tx, scalar: true),
  avg_cpu_usage = avg(dt.host.cpu.usage, scalar: true),
  max_cpu_usage = max(dt.host.cpu.usage, scalar: true),
  active_processes = count(dt.process.cpu.usage, scalar: true),
  from: now()-2h
```

### **Timeseries Rate Normalization**

Use the `rate` parameter to normalize values to specific time units (MB/s, MB/m, MB/h):

```dql
// Rate-normalized metrics for better comparison
timeseries {
  network_mbps = sum(dt.host.net.nic.bytes_rx, scalar: true, rate: 1s),     // Bytes per second
  network_per_minute = sum(dt.host.net.nic.bytes_rx, scalar: true, rate: 1m), // Bytes per minute
  network_per_hour = sum(dt.host.net.nic.bytes_rx, scalar: true, rate: 1h),   // Bytes per hour
  cpu_utilization_rate = avg(dt.host.cpu.usage, scalar: true, rate: 1m)       // CPU % per minute
  },
  from: now()-2h

// Practical example: Network throughput analysis
timeseries {
  incoming_mbps = sum(dt.host.net.nic.bytes_rx, scalar: true, rate: 1s) / 1024 / 1024,
  outgoing_mbps = sum(dt.host.net.nic.bytes_tx, scalar: true, rate: 1s) / 1024 / 1024,
  total_mbps = (sum(dt.host.net.nic.bytes_rx, scalar: true, rate: 1s) + sum(dt.host.net.nic.bytes_tx, scalar: true, rate: 1s)) / 1024 / 1024
  },
  from: now()-1h
```

**Rate Examples:**

- `rate: 1s` → Values per second (throughput monitoring)
- `rate: 1m` → Values per minute (standard monitoring)
- `rate: 1h` → Values per hour (capacity planning)

**When to Use Scalar:**

- ✅ Single totals, averages, counts for reports
- ✅ Alert thresholds and SLA calculations
- ✅ Dashboard summary cards and KPIs
- ✅ Rate-normalized metrics for comparison
- ❌ Time-based visualizations and charts
- ❌ Trend analysis and pattern recognition

### **Security Data Patterns**

```dql
// Standard security event filtering (see DynatraceSecurityEvents.md for complete patterns)
fetch security.events, from:now() - 24h
| filter dt.system.bucket == "default_securityevents_builtin"
    AND event.provider == "Dynatrace"
    AND event.type == "VULNERABILITY_STATE_REPORT_EVENT"
    AND event.level == "ENTITY"
| dedup {vulnerability.display_id, affected_entity.id}, sort: {timestamp desc}
```

### **String Operations and Essential Functions**

**String Operations:**

- ✅ `matchesPhrase(field, "text")` - Text search
- ✅ `field == "exact_value"` - Exact match
- ✅ `field startsWith "prefix"` - Prefix match
- ❌ `contains()`, `like()` - Not supported

**Essential Functions:**

- `dedup` - Get latest snapshots
- `summarize` - Aggregate data
- `fieldsAdd` - Add computed fields
- `timeseries` - Time-based metrics
- `scalar: true` - Single aggregated values
- `rate: 1s/1m/1h` - Time-normalized metrics

> **📖 For complete service monitoring patterns, see [DynatraceDataInvestigation.md](../workflows/dataSourceGuides/DynatraceDataInvestigation.md)**

- `takeFirst()` / `takeMax()` / `takeAny()` - Aggregation
- `countDistinctExact()` - Precise counting
- `in()` - Array membership
- `coalesce()` - Handle nulls
- `lookup` - Join with entity data

### **🔍 Field Discovery with Semantic Dictionary**

**Field Discovery Helper Pattern**:

```dql
// Discover available fields for any concept or data type
fetch dt.semantic_dictionary.fields
| filter matchesPhrase(name, "your_search_term") or matchesPhrase(description, "your_concept")
| fields name, type, stability, description, examples
| sort stability, name
| limit 20
```

**Examples of Field Discovery**:

```dql
// Find all error-related fields
fetch dt.semantic_dictionary.fields
| filter matchesPhrase(name, "error") or matchesPhrase(description, "error")
| fields name, type, stability, description
| sort stability, name

// Find all Kubernetes context fields
fetch dt.semantic_dictionary.fields
| filter matchesPhrase(name, "k8s") or matchesPhrase(description, "kubernetes")
| fields name, type, stability, description

// Find all entity reference fields
fetch dt.semantic_dictionary.fields
| filter startsWith(name, "dt.entity.")
| filter stability == "stable"
| fields name, description, examples
```

**Entity Relationship Mapping**:

```dql
// Complete stable entity hierarchy
fetch dt.semantic_dictionary.fields
| filter startsWith(name, "dt.entity.") and stability == "stable"
| summarize entity_types = count(), by: {type}
| sort entity_types desc
```

**Field Stability Check**:

```dql
// Check field stability before using in production
fetch dt.semantic_dictionary.fields
| filter name == "your_field_name"
| fields name, type, stability, description
```

### **🏗️ Entity Relationship Mapping with Semantic Fields**

**Complete Entity Hierarchy**:

```dql
// Discover all available entity types and their relationships
fetch dt.semantic_dictionary.fields
| filter startsWith(name, "dt.entity.") and stability == "stable"
| fields name, description
| sort name
```

**Entity Cross-Reference Patterns**:

```dql
// Join problems with entity details using semantic entity fields
fetch events, from:now() - 24h
| filter event.kind == "DAVIS_PROBLEM"
| lookup [
    fetch dt.semantic_dictionary.fields
    | filter startsWith(name, "dt.entity.service") and stability == "stable"
], sourceField:affected_entity_ids, lookupField:name
| fields display_id, event.name, affected_entity_ids, description
```

**Multi-Entity Problem Correlation**:

```dql
// Correlate problems across entity hierarchy
fetch events, from:now() - 24h
| filter event.kind == "DAVIS_PROBLEM"
| summarize
    problems = count(),
    services = countDistinct(dt.entity.service),
    hosts = countDistinct(dt.entity.host),
    clusters = countDistinct(dt.entity.kubernetes_cluster),
    by: {k8s.namespace.name}
| fieldsAdd entity_diversity = services + hosts + clusters
| sort entity_diversity desc
```

**Entity Type Distribution Analysis**:

```dql
// Understand which entity types are most represented in your data
fetch dt.semantic_dictionary.fields
| filter startsWith(name, "dt.entity.") and stability == "stable"
| summarize entity_count = count(), by: {type}
| sort entity_count desc
```

### **Risk Level Mapping**

```dql
| fieldsAdd risk_level = if(score >= 9, "CRITICAL",
    else: if(score >= 7, "HIGH",
    else: if(score >= 4, "MEDIUM",
    else: if(score >= 0.1, "LOW", else: "NONE"))))
```

---

## 🔧 **Core Concepts of DQL**

1. **Pipeline Structure**: DQL uses a pipeline model where each command is separated by a pipe (`|`). Data flows from one command to the next.
2. **Tabular Data**: Each command returns a table (rows and columns), which is passed to the next command.
3. **Read-Only**: DQL is used for querying and analyzing data, not modifying it.

---

## 🧱 **Basic Syntax and Commands**

### 1. **`fetch`** – Load data

```dql
fetch logs
```

Loads all logs within the default time range (2 hours unless specified).

### 2. **`filter`** – Narrow down results

```dql
fetch logs | filter loglevel == "ERROR"
```

Filters logs to only include those with log level "ERROR".

### 3. **`summarize`** – Aggregate data

```dql
fetch logs | filter loglevel == "ERROR" | summarize numErr = count()
```

Counts the number of error logs.

### 4. **`fields` / `fieldsAdd`** – Select or add fields

```dql
fetch logs | fields timestamp, loglevel, content
```

### 5. **`sort`** – Order results

```dql
fetch logs | sort timestamp desc
```

### 6. **`makeTimeseries`** – Create time series for visualization

```dql
fetch logs | filter loglevel == "ERROR" | makeTimeseries count = count(), by:loglevel, interval:5m
```

---

## 🕒 **Time Range Control**

You can override the default time range:

```dql
fetch logs, from:now() - 24h, to:now() - 2h
```

Or use absolute time:

```dql
fetch logs, timeframe:"2025-06-01T00:00:00Z/2025-06-10T00:00:00Z"
```

---

## 📊 **Advanced Example: Business Hours Aggregation**

```dql
fetch bizevents
| filter event.type == "booking.process.started"
| fieldsAdd hour = formatTimestamp(timestamp, format:"hh"), day_of_week = formatTimestamp(timestamp, format:"EE")
| filterOut (day_of_week == "Sat" or day_of_week == "Sun") or (toLong(hour) <= 08 or toLong(hour) >= 17)
| summarize numStarts = count(), by:{product}
```

This query counts booking events during business hours on weekdays.

## Best Practices

- Always start with a broad query and limit the amount of results, then filter down
- This allows you to identify the available data fields and their content for filtering
- Use appropriate time ranges based on your data source and requirements
- Leverage the pipeline structure to build complex queries step by step

---

## ⚠️ **CRITICAL: Field Reference and Data Access Issues**

### **Metrics Data Access**

**❌ WRONG - Invalid data objects:**

```dql
// These data objects DO NOT exist in DQL
fetch metrics, from:now() - 6h              // metrics not valid
fetch dt.metrics, from:now() - 6h           // dt.metrics not valid
```

**✅ CORRECT - Valid data sources:**

```dql
// Use these supported data sources
fetch logs, from:now() - 6h
fetch events, from:now() - 6h
fetch spans, from:now() - 6h
fetch bizevents, from:now() - 6h
```

### **Field Reference Issues**

**❌ WRONG - Invalid field references:**

```dql
// These field names DO NOT work
| sort avg_duration_ms desc                  // Field doesn't exist after summarize
| sort count desc                           // Use `count()` with backticks
| filter timestamp > now() - 1h             // Use timeframe parameter instead
```

**✅ CORRECT - Proper field references:**

```dql
// Correct summarize and sort syntax
| summarize avg_duration = avg(duration_ms), count()
| sort `avg_duration` desc                   // Reference calculated fields correctly
| sort `count()` desc                        // Use backticks for function names

// Correct time filtering
fetch spans, from:now() - 6h                // Use timeframe in fetch
| filter start_time > "2025-01-01"          // Or filter by time fields
```

### **Aggregation Function References**

**❌ WRONG - Incorrect function field names:**

```dql
| summarize avg(duration), count()
| sort avg_duration desc                     // Field doesn't exist
```

**✅ CORRECT - Reference aggregated fields:**

```dql
| summarize avg_duration = avg(duration), count()
| sort avg_duration desc                     // Named field works
| sort `count()` desc                        // Or use backticks for functions
```

---

## ⚠️ **CRITICAL: DQL Syntax Corrections**

### **Span Analysis Field Corrections (Live Session Learnings)**

**❌ WRONG - Field names that cause errors:**

```dql
// These field names DO NOT work for spans
| sort timestamp asc                         // Use start_time for spans instead
| summarize error_count = count(), by: {span.events[0].exception.type}  // Complex nested access fails
| filter trace.id == "trace-id"             // Use toUid() function
```

**✅ CORRECT - Verified working field names:**

```dql
// Correct field names from live testing
| sort start_time asc                        // Correct timestamp field for spans
| filter trace.id == toUid("trace-id")      // Trace ID filtering with toUid() function
| filter request.is_failed == true          // Most reliable failure detection
| fields span.name, service.name, span.events, duration, start_time  // Core working fields
| filter isNotNull(span.events)             // Check for exception data availability
```

### **Service and Entity Identification (Live Verified)**

**❌ WRONG - Unreliable or incorrect patterns:**

```dql
// service.name is often null in many environments
| filter service.name == "payment"

// WRONG for logs - dt.entity.service not available
fetch logs, from:now() - 1h
| filter dt.entity.service == "SERVICE-ID"
```

**✅ CORRECT - Reliable service filtering patterns:**

```dql
// For direct service lookup
fetch dt.entity.service
| filter entity.name == "myapp"
| fields entity.name, id

// For span filtering by service name
fetch spans, from:now() - 2h
| filter entityName(dt.entity.service) == "myapp"
| filter request.is_failed == true

// For span filtering by service ID
fetch spans, from:now() - 2h
| filter dt.entity.service == "SERVICE-XXXXXXXXXXXXXXXX"
| filter request.is_failed == true

// Use span.name as primary operation identifier when service context not needed
| summarize error_count = count(), by: {span.name}
| filter span.name == "GET /timeline"
```

### **Log Analysis - Different Patterns (Logs don't have service entities)**

**✅ CORRECT - Use infrastructure context for logs:**

```dql
// Use Kubernetes attributes for container logs
fetch logs, from:now() - 1h
| filter k8s.pod.name == "myapp-pod-xxx"
| filter k8s.namespace.name == "production"

// Use host information for host-based logs
fetch logs, from:now() - 1h
| filter host.name == "web-server-01"

// Use application context when available
fetch logs, from:now() - 1h
| filter matchesPhrase(content, "myapp")
```

### **Service and Entity Identification**

**❌ WRONG - Unreliable patterns:**

```dql
// service.name is often null in many environments
| filter service.name == "payment"
| filter dt.entity.service == "SERVICE-ID"  // May not work in all setups
```

**✅ CORRECT - Reliable patterns:**

```dql
// Use span.name as primary operation identifier
| filter request.is_failed == true          // Start with failure detection
| summarize error_count = count(), by: {span.name}  // Group by operation name
| filter span.name == "GET /timeline"       // Filter by specific operations
```

### **Exception Analysis Syntax**

**❌ WRONG - Complex nested field access:**

```dql
// This pattern fails in DQL parsing
| summarize error_count = count(), by: {span.events[0].exception.type}
| filter span_event.name == "exception"     // Field doesn't exist after expand
```

**✅ CORRECT - Working exception patterns:**

```dql
// Simple aggregation by operation
| filter request.is_failed == true
| summarize error_count = count(), by: {span.name}

// Exception details when available
| filter request.is_failed == true and isNotNull(span.events)
| fields trace.id, span.events, dt.failure_detection.results
| limit 5
```

### **String Matching and Filtering**

**❌ WRONG - Unsupported operators:**

```dql
// These operators DO NOT work in DQL
filter vulnerability.title contains "log4j"          // contains not supported
filter vulnerability.title like "*log4j*"            // like not supported
filter vulnerability.id in ["123", "456"]            // string array filtering issues
```

**✅ CORRECT - Supported string operations:**

```dql
// Use matchesPhrase() for text searching
filter matchesPhrase(vulnerability.title, "log4j")
filter matchesPhrase(vulnerability.description, "Log4Shell")

// Use exact equality for precise matches
filter vulnerability.references.cve == "CVE-2021-44228"
filter vulnerability.id == "CVE-2021-44228"

// Use startsWith/endsWith for prefix/suffix matching
filter vulnerability.title startsWith "CVE-"
filter object.type startsWith "k8s"
```

### **Array and Multi-Value Field Filtering**

**✅ CORRECT - Working with arrays:**

```dql
// For array fields like vulnerability.references.cve
filter vulnerability.references.cve == "CVE-2021-44228"  // checks if array contains value

// For filtering multiple severity levels
filter compliance.rule.severity.level in ["CRITICAL", "HIGH"]

// For object type filtering
filter object.type in ["awsbucket", "awsvpc", "awsinstance"]
```

### **Vulnerability Search Patterns**

**Comprehensive vulnerability search (Log4Shell example):**

```dql
fetch events, from:now() - 7d
| filter event.kind == "SECURITY_EVENT"
| filter event.type == "VULNERABILITY_STATE_REPORT_EVENT"
| filter (
    vulnerability.references.cve == "CVE-2021-44228" or
    vulnerability.id == "CVE-2021-44228" or
    matchesPhrase(vulnerability.title, "log4j") or
    matchesPhrase(vulnerability.title, "Log4Shell") or
    matchesPhrase(vulnerability.description, "log4j")
  )
| fields timestamp, vulnerability.id, vulnerability.title, affected_entity.name, vulnerability.davis_assessment.level
```

**Component-based vulnerability search:**

```dql
fetch events, from:now() - 7d
| filter event.kind == "SECURITY_EVENT"
| filter event.type == "VULNERABILITY_STATE_REPORT_EVENT"
| filter (
    matchesPhrase(affected_entity.vulnerable_component.name, "log4j") or
    matchesPhrase(affected_entity.vulnerable_component.short_name, "log4j")
  )
| fields affected_entity.vulnerable_component.name, vulnerability.title, affected_entity.name
```

---

## ⚠️ **CRITICAL: Compliance Query Best Practices**

**NEVER aggregate COMPLIANCE_FINDING events over time periods!** This creates thousands of outdated findings.

### **Correct Approach: Latest Scan Analysis**

**Step 1: Identify Latest Scan**

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_SCAN_COMPLETED" AND object.type == "AWS"
| sort timestamp desc
| limit 1
| fields scan.id, timestamp
```

**Step 2: Analyze Current Findings from Latest Scan**

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING" AND scan.id == "<latest_scan_id>"
| filter compliance.result.status.level == "FAILED"
| summarize count = count(), by:{compliance.rule.severity.level}
```

**❌ WRONG - Time-based aggregation:**

```dql
// This includes outdated findings from multiple scans!
fetch events, from:now() - 7d
| filter event.type == "COMPLIANCE_FINDING"
| summarize count = count()
```

**✅ CORRECT - Scan-specific analysis:**

```dql
// Current compliance state from latest scan only
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING" AND scan.id == "<latest_scan_id>"
| summarize count = count()
```

---

## 📊 **Remediation-Focused DQL Patterns**

### **Compliance Monitoring Dashboards**

**Real-time Compliance Status (Latest Scan Only):**

```dql
// First get latest scan IDs by provider
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_SCAN_COMPLETED"
| summarize latest_scan = max(timestamp), by:{object.type}
| join [
    fetch events, from:now() - 24h
    | filter event.type == "COMPLIANCE_SCAN_COMPLETED"
], on:{object.type}, prefix:"scan_"
| filter scan_timestamp == latest_scan
| fields object.type, scan_scan.id
// Then analyze findings from latest scans only
| join [
    fetch events, from:now() - 24h
    | filter event.type == "COMPLIANCE_FINDING"
], on:{scan.id: scan_scan.id}, prefix:"finding_"
| summarize
    total_findings = count(),
    failed_findings = countIf(finding_compliance.result.status.level == "FAILED"),
    critical_findings = countIf(finding_compliance.rule.severity.level == "CRITICAL"),
    by:{finding_cloud.provider, finding_compliance.standard.short_name}
| fieldsAdd compliance_score = round((total_findings - failed_findings) / total_findings * 100, 1)
```

**Remediation Progress Tracking (Compare Latest vs Previous Scan):**

```dql
// Get current scan findings
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_SCAN_COMPLETED" AND object.type == "AWS"
| sort timestamp desc | limit 1
| fields current_scan_id = scan.id
| join [
    fetch events, from:now() - 48h, to:now() - 24h
    | filter event.type == "COMPLIANCE_SCAN_COMPLETED" AND object.type == "AWS"
    | sort timestamp desc | limit 1
    | fields previous_scan_id = scan.id
], on:{1:1}
// Compare findings between scans
| join [
    fetch events, from:now() - 48h
    | filter event.type == "COMPLIANCE_FINDING"
    | filter compliance.result.status.level == "FAILED"
], on:{scan.id: current_scan_id OR scan.id: previous_scan_id}
| summarize
    current_critical = countIf(scan.id == current_scan_id AND compliance.rule.severity.level == "CRITICAL"),
    previous_critical = countIf(scan.id == previous_scan_id AND compliance.rule.severity.level == "CRITICAL"),
    by:{cloud.provider}
| fieldsAdd progress = current_critical - previous_critical
```

### **Alert-Worthy Queries for Proactive Monitoring**

**New Critical Findings from Latest Scan (for immediate alerts):**

```dql
// Get most recent scan
fetch events, from:now() - 2h
| filter event.type == "COMPLIANCE_SCAN_COMPLETED"
| sort timestamp desc | limit 1
| fields latest_scan_id = scan.id, scan_timestamp = timestamp
// Get critical findings from that scan only
| join [
    fetch events, from:now() - 2h
    | filter event.type == "COMPLIANCE_FINDING"
    | filter compliance.rule.severity.level == "CRITICAL" AND compliance.result.status.level == "FAILED"
], on:{scan.id: latest_scan_id}
| fields scan_timestamp, cloud.provider, object.type, compliance.rule.title, compliance.result.object.evidence_json
```

**Configuration Drift Detection:**

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING"
| summarize
    current_failed = countIf(compliance.result.status.level == "FAILED"),
    by:{object.id, compliance.rule.title}
| join [
    fetch events, from:now() - 48h, to:now() - 24h
    | filter event.type == "COMPLIANCE_FINDING"
    | summarize
        previous_failed = countIf(compliance.result.status.level == "FAILED"),
        by:{object.id, compliance.rule.title}
], on:{object.id, compliance.rule.title}
| filter current_failed > previous_failed
```

### **Team-Specific Reporting Queries**

**Security Team Dashboard:**

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING" AND compliance.result.status.level == "FAILED"
| filter compliance.rule.severity.level in ["CRITICAL", "HIGH"]
| summarize count = count(), by:{compliance.standard.short_name, compliance.rule.severity.level, object.type}
| sort compliance.rule.severity.level asc, count desc
```

**DevOps Team Infrastructure Focus:**

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING" AND compliance.result.status.level == "FAILED"
| filter object.type in ["awsbucket", "awsvpc", "awsinstance", "k8spod", "k8snode"]
| summarize count = count(), by:{object.type, compliance.rule.title}
| sort count desc
```

### **SLO and Performance Metrics**

**Remediation Time SLO:**

```dql
fetch events, from:now() - 30d
| filter event.type == "COMPLIANCE_FINDING"
| filter compliance.rule.severity.level == "CRITICAL"
| summarize
    avg_resolution_time = avg(resolution_time_hours),
    slo_target = 24, // 24 hours for critical findings
    by:{cloud.provider}
| fieldsAdd slo_compliance = if(avg_resolution_time <= slo_target, "PASS", "FAIL")
```

**Compliance Trend Analysis:**

```dql
fetch events, from:now() - 90d
| filter event.type == "COMPLIANCE_FINDING"
| makeTimeseries
    compliance_score = round((count() - countIf(compliance.result.status.level == "FAILED")) / count() * 100, 1),
    by:{cloud.provider}, interval:1d
| fieldsAdd trend = if(compliance_score > lag(compliance_score, 1), "IMPROVING", "DECLINING")
```

# Explore Dynatrace

This guide provides essential DQL queries for exploring and discovering available metrics, fields, and data structures in your Dynatrace environment.

**Related Analysis Files:**

- **DynatraceQueryLanguage.md** - Core DQL syntax foundation for exploration queries
- **DynatraceSecurityEvents.md** - Security event schema discovered through exploration
- **DynatraceServiceAnalytics.md** - Service metrics discovered through metric exploration
- **observabilityProblems.md** - Problem investigation using discovered entity fields
- **DynatraceLogAnalysis.md** - Log field exploration for troubleshooting

## 🔍 Find Available Metrics

```dql
fetch metric.series
```

Example response:

```json
{
  "metric.key": "dt.process.network.packets.re_tx_aggr",
  "aws.availability_zone": "us-east-1b",
  "dt.entity.aws_availability_zone": "AWS_AVAILABILITY_ZONE-0000000000000001",
  "dt.entity.ec2_instance": "EC2_INSTANCE-C3E02D2B49FFB027",
  "dt.entity.host": "HOST-C3E02D2B49FFB027",
  "dt.entity.host_group": "HOST_GROUP-530F73EC2754E115",
  "dt.entity.process_group": "PROCESS_GROUP-476D77531A1A1CBB",
  "dt.entity.process_group_instance": "PROCESS_GROUP_INSTANCE-45BFBCC0AF02F454",
  "dt.host_group.id": "HOST_GROUP-CWS-1-IG-1-HG",
  "dt.source_entity": "PROCESS_GROUP_INSTANCE-45BFBCC0AF02F454",
  "dt.source_entity.type": "process_group_instance",
  "host.name": "HOST-IG-8-50072"
}
```

### 🎯 Targeted Metric Discovery

```dql
// Find CPU-related metrics
fetch metric.series | filter matchesPhrase(metric.key, "cpu") | limit 10

// Find network metrics
fetch metric.series | filter matchesPhrase(metric.key, "network") | limit 10

// Find memory metrics
fetch metric.series | filter matchesPhrase(metric.key, "memory") | limit 10

// Find host-level metrics
fetch metric.series | filter startsWith(metric.key, "dt.host") | limit 10

// Find process-level metrics
fetch metric.series | filter startsWith(metric.key, "dt.process") | limit 10

// Find service-level metrics
fetch metric.series | filter startsWith(metric.key, "dt.service") | limit 10
```

### 📊 Metric Analysis Patterns

```dql
// Count metrics by type
fetch metric.series
| summarize metric_count = count(), by: {metric_type = substr(metric.key, 0, indexof(metric.key, "."))}
| sort metric_count desc

// Find metrics by source entity type
fetch metric.series
| summarize metric_count = count(), by: {dt.source_entity.type}
| sort metric_count desc

// Discover cloud provider metrics
fetch metric.series
| filter isNotNull(aws.availability_zone) or isNotNull(gcp.project.id) or isNotNull(azure.resource.group.name)
| summarize aws_metrics = sum(if(isNotNull(aws.availability_zone), 1, 0)),
            gcp_metrics = sum(if(isNotNull(gcp.project.id), 1, 0)),
            azure_metrics = sum(if(isNotNull(azure.resource.group.name), 1, 0))
```

## 📚 Field Descriptions Discovery

```dql
fetch dt.semantic_dictionary.fields
```

Example response:

```json
{
  "name": "gcp.location",
  "type": "string",
  "supported_values": [],
  "stability": "stable",
  "tags": ["primary-field"],
  "description": "Region or zone the instance of the GCP resource is running on.",
  "examples": ["europe-west3-c"]
}
```

### 🔎 Field Analysis Queries

```dql
// Find fields by name pattern
fetch dt.semantic_dictionary.fields
| filter matchesPhrase(name, "kubernetes")
| fields name, description, stability, type
| limit 20

// Find experimental vs stable fields
fetch dt.semantic_dictionary.fields
| summarize field_count = count(), by: {stability}
| sort field_count desc

// Find fields with examples
fetch dt.semantic_dictionary.fields
| filter arraySize(examples) > 0
| fields name, type, examples, description
| limit 15

// Find fields by data type
fetch dt.semantic_dictionary.fields
| filter type == "number"
| fields name, description, examples
| limit 10

// Find deprecated or experimental fields
fetch dt.semantic_dictionary.fields
| filter stability == "experimental" or stability == "deprecated"
| fields name, stability, description
| sort stability
| limit 20
```

## 🏗️ Entity Discovery

### 📋 Entity Types and Counts

```dql
// Discover all entity types in environment
fetch spans | summarize span_count = count(), by: {dt.source_entity.type} | sort span_count desc | limit 15

// Count entities by type using logs
fetch logs | summarize log_count = count(), by: {dt.source_entity.type} | sort log_count desc | limit 15
```

### 🖥️ Infrastructure Discovery

```dql
// Find all hosts and their details
fetch dt.entity.host
| fieldsAdd entity.name, entity.detected_name
| limit 10

// Discover host groups
fetch dt.entity.host_group
| fieldsAdd entity.name, entity.detected_name
| limit 10

// Find process groups
fetch dt.entity.process_group
| fieldsAdd entity.name, entity.detected_name
| limit 10

// Discover services
fetch dt.entity.service
| fieldsAdd entity.name, entity.detected_name, service.type
| limit 10
```

### ☁️ Cloud Resource Discovery

```dql
// Find AWS resources
fetch metric.series
| filter isNotNull(aws.availability_zone)
| summarize resource_count = count(), by: {aws.availability_zone, dt.entity.ec2_instance}
| sort resource_count desc
| limit 10

// Find GCP resources
fetch metric.series
| filter isNotNull(gcp.project.id)
| summarize resource_count = count(), by: {gcp.project.id, gcp.region}
| sort resource_count desc
| limit 10

// Kubernetes discovery
fetch metric.series
| filter isNotNull(k8s.cluster.name)
| summarize resource_count = count(), by: {k8s.cluster.name, k8s.namespace.name}
| sort resource_count desc
| limit 15
```

## 🚀 Technology Stack Discovery

### 💻 Application Technologies

```dql
// Find technologies from process groups
fetch dt.entity.process_group_instance
| fieldsAdd entity.name, processType, softwareTechnologies
| expand softwareTechnologies
| summarize process_count = count(), by: {softwareTechnologies}
| sort process_count desc
| limit 20

// Discover programming languages
fetch spans
| filter isNotNull(span.code.language)
| summarize span_count = count(), by: {span.code.language}
| sort span_count desc

// Find web frameworks
fetch spans
| filter isNotNull(http.server.name)
| summarize span_count = count(), by: {http.server.name}
| sort span_count desc
```

### 🗄️ Database Discovery

```dql
// Find database technologies
fetch spans
| filter isNotNull(db.system)
| summarize span_count = count(), by: {db.system, db.instance}
| sort span_count desc
| limit 15

// Discover messaging systems
fetch spans
| filter isNotNull(messaging.system)
| summarize span_count = count(), by: {messaging.system, messaging.destination}
| sort span_count desc
| limit 10
```

## 🌐 Network and Communication Discovery

### 🔗 Service Communication Patterns

```dql
// Find service-to-service communication
fetch spans
| filter isNotNull(service.name) and span.kind == "client"
| summarize call_count = count(), by: {caller = service.name, callee = peer.service.name}
| sort call_count desc
| limit 20

// Discover external dependencies
fetch spans
| filter span.kind == "client" and isNotNull(http.url)
| summarize call_count = count(), by: {service.name, external_url = http.url}
| sort call_count desc
| limit 15
```

### 🚦 Protocol and Port Discovery

```dql
// Find network protocols in use
fetch spans
| filter isNotNull(net.transport)
| summarize span_count = count(), by: {net.transport, net.peer.port}
| sort span_count desc
| limit 15

// Discover HTTP endpoints
fetch spans
| filter isNotNull(http.route)
| summarize request_count = count(), by: {service.name, http.method, http.route}
| sort request_count desc
| limit 20
```

## 🛡️ Security and Compliance Discovery

### 🔐 Security Context Analysis

```dql
// Find security contexts
fetch metric.series
| filter isNotNull(dt.security_context)
| summarize metric_count = count(), by: {dt.security_context}
| sort metric_count desc

// Discover authentication patterns
fetch spans
| filter isNotNull(enduser.id) or isNotNull(auth.type)
| summarize span_count = count(), by: {auth.type, user_type = if(isNotNull(enduser.id), "authenticated", "anonymous")}
| sort span_count desc
```

### 🏷️ Tag and Label Discovery

```dql
// Kubernetes labels discovery
fetch spans
| filter startsWith(k8s.pod.name, "")
| summarize pod_count = count(), by: {k8s.namespace.name, k8s.deployment.name}
| sort pod_count desc
| limit 15

// Environment and deployment discovery
fetch spans
| filter isNotNull(deployment.environment)
| summarize span_count = count(), by: {deployment.environment, service.name}
| sort span_count desc
| limit 15
```

## 🔧 Troubleshooting Discovery Queries

### ⚠️ Error Pattern Discovery

```dql
// Find error-prone services
fetch spans
| filter request.is_failed == true
| summarize error_count = count(), by: {service.name, http.status_code}
| sort error_count desc
| limit 15

// Discover exception types
fetch spans
| filter isNotNull(span.events) and request.is_failed == true
| expand span.events
| filter span.events.name == "exception"
| summarize exception_count = count(), by: {service.name, exception_type = span.events.attributes["exception.type"]}
| sort exception_count desc
| limit 15
```

### 📈 Performance Pattern Discovery

```dql
// Find slow operations
fetch spans
| filter duration > 5000000000  // 5 seconds in nanoseconds
| summarize slow_span_count = count(), avg_duration = avg(duration), by: {service.name, span.name}
| sort avg_duration desc
| limit 15

// Discover high-throughput services
fetch spans
| summarize span_count = count(), by: {service.name}
| sort span_count desc
| limit 10
```

## 💡 Pro Tips for Exploration

### 🎯 Best Practices

1. **Start Broad, Then Narrow**: Begin with `fetch metric.series` or `fetch spans`, then apply filters
2. **Use Patterns**: Search for patterns with `matchesPhrase()`, `startsWith()`, and `contains()`
3. **Limit Results**: Always use `| limit N` to prevent overwhelming responses
4. **Group and Count**: Use `summarize count() by: {field}` to understand data distribution
5. **Sort Results**: Use `sort` to prioritize the most relevant results

### 🔍 Search Command for Quick Exploration

Use the `search` command for simple, search-bar-like exploration across all fields:

```dql
// Search for keywords across all fields (case-insensitive)
fetch logs | search "nullpointer"

// Search in specific fields using ~ operator
fetch logs | search content ~ "error"

// Search with wildcards for partial matches
fetch logs | search content ~ "*timeout"

// Combine search with filters for targeted exploration
fetch spans | search "exception" | summarize count(), by: {service.name}

// Multi-condition search
fetch logs | search "error" and loglevel == "CRITICAL"
```

**Search Tips:**

- Use `search "term"` to search across all fields
- Use `field ~ "term"` to search specific fields
- Supports wildcards (`*`) for partial matching
- Case-insensitive token-based matching
- Combine with filters for precise exploration

### 🔍 Advanced Discovery Techniques

```dql
// Find correlation between technologies and performance
fetch spans
| filter isNotNull(span.code.language) and duration > 1000000000
| summarize avg_duration = avg(duration), span_count = count(), by: {span.code.language, service.name}
| sort avg_duration desc
| limit 15

// Discover deployment patterns
fetch spans
| filter isNotNull(deployment.environment) and isNotNull(service.version)
| summarize service_count = countDistinct(service.name), by: {deployment.environment, service.version}
| sort service_count desc
| limit 15

// Find resource utilization patterns by entity type
fetch metric.series
| filter matchesPhrase(metric.key, "cpu") or matchesPhrase(metric.key, "memory")
| summarize metric_count = count(), by: {dt.source_entity.type, metric_category = substr(metric.key, 0, indexof(metric.key, "."))}
| sort metric_count desc
| limit 20
```

This guide provides a comprehensive foundation for exploring and discovering the wealth of data available in your Dynatrace environment. Use these queries as starting points and adapt them to your specific investigation needs.

## 🧪 Advanced Exploration Examples

### 📊 Real-World Discovery Patterns

```dql
// Find the most active entity types by metric count
fetch metric.series
| summarize metric_count = count(), by: {dt.source_entity.type}
| sort metric_count desc
// Typical results: process_group_instance (~65k), host (~11k), virtualmachine (~500)

// Discover network communication patterns
fetch spans
| filter isNotNull(service.name) and span.kind == "client"
| summarize call_count = count(), by: {caller = service.name, callee = peer.service.name}
| filterOut isNull(callee)  // Filter out null callees
| sort call_count desc
| limit 15

// Find hosts with the most network activity
fetch metric.series
| filter matchesPhrase(metric.key, "network") or matchesPhrase(metric.key, "net")
| summarize network_metric_count = count(), by: {host.name, dt.entity.host}
| sort network_metric_count desc
| limit 10
```

### 🎯 Environment-Specific Discovery

```dql
// Analyze AWS infrastructure distribution
fetch metric.series
| filter isNotNull(aws.availability_zone)
| summarize
    host_count = countDistinct(dt.entity.host),
    ec2_count = countDistinct(dt.entity.ec2_instance),
    metric_count = count(),
    by: {aws.availability_zone}
| sort host_count desc

// Discover technology diversity
fetch dt.entity.process_group_instance
| fieldsAdd processType, softwareTechnologies
| expand softwareTechnologies
| summarize
    process_count = count(),
    unique_processes = countDistinct(id),
    by: {technology = softwareTechnologies}
| sort process_count desc
| limit 25
```

### 🔍 Operational Intelligence

```dql
// Find entities generating the most metrics
fetch metric.series
| summarize
    metric_count = count(),
    unique_metric_types = countDistinct(metric.key),
    by: {dt.source_entity, dt.source_entity.type}
| sort metric_count desc
| limit 15

// Discover monitoring coverage gaps
fetch dt.semantic_dictionary.fields
| filter stability == "experimental" or stability == "deprecated"
| summarize field_count = count(), by: {stability, type}
| sort field_count desc
```

These advanced patterns help you understand your environment's scale, technology distribution, and monitoring coverage. Adapt the filters and groupings to match your specific exploration needs.

# Dynatrace MCP Server Integration

🔄 **Loading Dynatrace Agent...**

## Available Analysis Modes

### 🔧 **SRE & Operations**

**(1) Problem & Incident Investigation** - Real-time problem analysis and root cause identification

**🚨 CRITICAL INVESTIGATION REQUIREMENT**: ALWAYS analyze span exceptions for failed services before concluding investigations.

**Mandatory Investigation Sequence:**

1. **Problem Discovery**: Identify active problems and affected services
2. **🔍 Environment Exploration**: Use discovery patterns for unfamiliar services ([DynatraceExplore.md](reference/DynatraceExplore.md))
3. **⚠️ Exception Analysis**: MANDATORY - Check span.events for exact error details
4. **Cross-correlation**: Validate findings with logs and metrics

```dql
// Step 1: Problem Discovery
fetch events, from:now() - 24h
| filter event.kind == "DAVIS_PROBLEM"
| filter event.status == "OPEN"
| fields display_id, event.name, event.category, affected_entity_ids
| sort timestamp desc

// Step 2: MANDATORY Exception Analysis for Failed Services
fetch spans, from:now() - 4h
| filter service.name == "AFFECTED_SERVICE" and request.is_failed == true
| fields trace.id, span.events, dt.failure_detection.results
| limit 10
```

**⚠️ NEVER conclude service investigation without checking span.events for exceptions and business logic errors.**

**📚 See:** [DynatraceIncidentResponse.md](workflows/DynatraceIncidentResponse.md) for complete investigation workflows

---

**(2) Log Analysis & Troubleshooting** - Application and system log investigation with trace correlation

Search logs, correlate with traces, and identify error patterns across your infrastructure.

```dql
fetch logs, from:now() - 2h
| filter loglevel == "ERROR"
| filter k8s.namespace.name == "production"
| fields timestamp, content, trace_id, k8s.pod.name
```

**📚 See:** [DynatraceDataInvestigation.md](workflows/dataSourceGuides/DynatraceDataInvestigation.md) for comprehensive data analysis patterns

---

**(3) Entity Investigation & Environment Discovery** - Infrastructure analysis and semantic dictionary exploration

**Two-Phase Approach**: First **discover your environment's data structure**, then **investigate specific entities**

**Phase 1 - Semantic Dictionary Exploration** (Essential for unknown environments):

```dql
// Discover available Kubernetes fields in your environment
fetch dt.semantic_dictionary.fields
| filter matchesPhrase(name, "k8s")
| fields name, description, examples
| limit 10
```

**Phase 2 - Entity Investigation** (Using discovered field names):

```dql
// Find specific services using discovered field structure
fetch dt.entity.service
| filter entity.name == "payment-service"
| fields entity.name, id, tags
```

**💡 Why This Matters**: The semantic dictionary reveals your environment's exact field names, descriptions, and example values - critical for building accurate queries in unfamiliar environments.

**📚 See:** [DynatraceExplore.md](reference/DynatraceExplore.md) for complete environment discovery and entity investigation patterns

---

**(4) DevOps Automation & CI/CD Integration** - Automated deployment health gates and SRE workflows

Integrate observability data into CI/CD pipelines, deployment health checks, and automated incident response.

```dql
fetch events, from:now() - 30m
| filter event.kind == "DAVIS_PROBLEM" and problem.status == "OPEN"
| filter matchesPhrase(affected_entity.name, "${DEPLOYMENT_TARGET}")
| fieldsAdd deployment_risk = if(problem.severity == "CRITICAL", "BLOCK", "PROCEED")
```

**📚 See:** [DynatraceDevOpsIntegration.md](workflows/DynatraceDevOpsIntegration.md) for complete automation workflows

---

### 🛡️ **Security & Compliance**

**(5) Security Vulnerability Analysis** - Vulnerability assessment and risk analysis

Query security events, analyze vulnerability states, and assess risk levels across your infrastructure.

```dql
fetch events, from:now() - 7d
| filter event.kind == "SECURITY_EVENT"
| filter event.type == "VULNERABILITY_STATE_REPORT_EVENT"
| filter vulnerability.davis_assessment.level in ["CRITICAL", "HIGH"]
| dedup {vulnerability.id, affected_entity.id}, sort: {timestamp desc}
```

**📚 See:** [DynatraceSecurityCompliance.md](workflows/DynatraceSecurityCompliance.md) for security analysis patterns

---

**(6) Compliance Findings Analysis** - Configuration compliance monitoring and drift detection

Analyze compliance scan results, track configuration drift, and monitor policy violations across cloud and Kubernetes environments.

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING"
| filter compliance.result.status.level == "FAILED"
| filter compliance.rule.severity.level in ["CRITICAL", "HIGH"]
| dedup {object.id, compliance.rule.id}, sort: {timestamp desc}
```

**📚 See:** [DynatraceSecurityCompliance.md](workflows/DynatraceSecurityCompliance.md) for compliance monitoring workflows

---

### ⚡ **Advanced Analysis**

**(7) Custom DQL Queries** - Advanced data analysis with custom Dynatrace Query Language

Execute custom queries for specialized analysis, advanced metrics, and complex data correlations.

```dql
fetch spans, from:now() - 1h
| filter service.name == "payment" and request.is_failed == true
| summarize error_count = count(), by: {span.name}
| sort error_count desc
```

**📚 See:** [DynatraceQueryLanguage.md](reference/DynatraceQueryLanguage.md) for complete DQL reference and best practices

---

## 🔍 **Environment Discovery & Exception Analysis - Critical for Unfamiliar Services**

**MANDATORY**: When investigating unfamiliar services or encountering unexpected failures, ALWAYS start with exploration and exception discovery:

### **Phase 1: Service & Exception Discovery**

```dql
// Find error-prone services and exception patterns
fetch spans
| filter request.is_failed == true
| summarize error_count = count(), by: {service.name, http.status_code}
| sort error_count desc
| limit 15

// Discover exception types across services
fetch spans
| filter isNotNull(span.events) and request.is_failed == true
| expand span.events
| filter span.events.name == "exception"
| summarize exception_count = count(), by: {service.name, exception_type = span.events.attributes["exception.type"]}
| sort exception_count desc
| limit 15
```

### **Phase 2: Search-Based Error Pattern Discovery**

```dql
// Search for specific error patterns across all data
fetch spans | search "AmEx" or "American Express" | fields service.name, span.events
fetch logs | search "payment" and "failed" | fields content, k8s.pod.name
```

### **Phase 3: Field & Metric Discovery**

```dql
// Find all Kubernetes-related fields in your environment
fetch dt.semantic_dictionary.fields
| filter matchesPhrase(name, "k8s")
| fields name, description, examples
| limit 20

// Discover available service metrics
fetch metric.series
| filter startsWith(metric.key, "dt.service")
| limit 10
```

**💡 CRITICAL**: Use search commands (`search "term"`) to find error patterns you might miss with specific filters.

**📚 Complete Discovery Guide:** [DynatraceExplore.md](reference/DynatraceExplore.md)

---

## Common Observability Scenarios

### 🔴 **Service Failures**

Service-level failures impacting application functionality and user experience.

**Common Issues:** Failure rate increase, API failures, authentication failures, JavaScript errors  
**Primary Analysis Mode:** Problem Investigation (1) + Span Analysis → [DynatraceSpanAnalysis.md](workflows/dataSourceGuides/DynatraceSpanAnalysis.md)  
**Investigation Flow:** Identify affected services → Check deployments → Analyze error patterns → Verify dependencies

### 🚫 **Availability Issues**

Critical outages and infrastructure failures rendering services completely unavailable.

**Common Issues:** Service unavailable, host unavailable, database connection failures  
**Primary Analysis Mode:** Entity Investigation (3) + Data Investigation → [DynatraceDataInvestigation.md](workflows/dataSourceGuides/DynatraceDataInvestigation.md)  
**Investigation Flow:** Check service status → Verify infrastructure → Test connectivity → Review system logs

### 📈 **Performance Degradation**

Performance issues degrading service quality and user experience.

**Common Issues:** Response time increase, CPU/memory saturation, network connectivity problems  
**Primary Analysis Mode:** Service Analytics → [DynatraceDataInvestigation.md](workflows/dataSourceGuides/DynatraceDataInvestigation.md)  
**Investigation Flow:** Analyze response trends → Check resource utilization → Review database performance → Identify bottlenecks

---

## Documentation Reference Library

### **SRE & Operations**

- **[DynatraceInvestigationChecklist.md](workflows/DynatraceInvestigationChecklist.md)** - **MANDATORY** validation checklist for all investigations
- **[DynatraceIncidentResponse.md](workflows/DynatraceIncidentResponse.md)** - Complete incident response workflow and problem investigation
- **[DynatraceDataInvestigation.md](workflows/dataSourceGuides/DynatraceDataInvestigation.md)** - Comprehensive data analysis: logs, services, processes
- **[DynatraceSpanAnalysis.md](workflows/dataSourceGuides/DynatraceSpanAnalysis.md)** - Distributed tracing investigation techniques
- **[DynatraceExplore.md](reference/DynatraceExplore.md)** - Entity discovery and field exploration
- **[DynatraceDevOpsIntegration.md](workflows/DynatraceDevOpsIntegration.md)** - CI/CD automation and SRE workflows

### **Security & Compliance**

- **[DynatraceSecurityCompliance.md](workflows/DynatraceSecurityCompliance.md)** - Security and compliance analysis patterns
- **[DynatraceSecurityEvents.md](reference/DynatraceSecurityEvents.md)** - Complete security events schema reference with visual diagrams

### **Core Reference**

- **[DynatraceQueryLanguage.md](reference/DynatraceQueryLanguage.md)** - Complete DQL syntax and best practices
- **[DynatraceProblemsSpec.md](reference/DynatraceProblemsSpec.md)** - Official Davis problems schema documentation

---

## 🛠️ **Post-Analysis Workflow**

**IMPORTANT**: After completing any analysis, always offer follow-up assistance:

**"What would you like me to help you with next?"**

### Available Follow-up Options:

1. **📋 Team-specific guidance** (Security, DevOps, Development, or Compliance teams)
2. **🏗️ Infrastructure automation** (Infrastructure-as-Code templates)
3. **📊 Monitoring setup** (Dashboards, notebooks, alerts, SLOs)
4. **📝 Detailed remediation guides** (Step-by-step instructions)
5. **📈 Executive reporting** (High-level summaries and recommendations)

**Wait for user response before providing specific content.**

---

## 🔗 **Integration Architecture**

### **Data Sources:**

- **Events**: Security events, compliance findings, problems
- **Entities**: Infrastructure components, applications, services
- **Logs**: Application and system logs
- **Spans**: Distributed tracing data
- **Metrics**: Performance and business metrics

### **Analysis Capabilities:**

- **Real-time querying** via DQL (Dynatrace Query Language)
- **Entity relationship mapping** across infrastructure
- **Time-series analysis** for trends and patterns
- **Cross-platform correlation** (cloud, on-premises, hybrid)

### **Key Integration Points:**

- **MCP Protocol**: Model Context Protocol for AI integration
- **Grail Data Lake**: Unified data storage and querying
- **Entity Model**: Comprehensive infrastructure topology
- **Security Events**: Dedicated security data bucket (`default_security_events`)

**Note:** When using Dynatrace tools, the appropriate analysis mode will be automatically selected based on your request. Always use `verify_dql` before `execute_dql` to ensure query validity.

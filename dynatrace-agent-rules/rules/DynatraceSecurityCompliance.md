# Dynatrace Security & Compliance Analysis Guide

Use the Dynatrace MCP server to look up configuration issues. Here is how:

- Call the Dynatrace DQL tool (execute_dql)
- **FIRST**: Always analyze scan types to understand what data is available using COMPLIANCE_SCAN_COMPLETED events
- Always start with a broad query and limit the amount of results, and only then filter down - this allows you to identify the available data fields and their content for filtering.
- **CRITICAL**: For cloud provider compliance findings (AWS/GCP/Azure), always use extended timeframes (24h+) as cloud scans are infrequent and findings may be outside the default 2-hour window.
- For Kubernetes compliance findings, the default timeframe usually works as scans run more frequently.

---

## 🔐 **Security Events Architecture**

Dynatrace security events are stored in a dedicated bucket (`default_security_events`) with `event.kind=="SECURITY_EVENT"` for enhanced access control and data separation.

### **Event Categories:**

#### **Compliance Events**

- **COMPLIANCE_SCAN_COMPLETED** - Scan completion notifications with `scan.id`
- **COMPLIANCE_FINDING** - Individual compliance evaluation results linked by `scan.id`

#### **Vulnerability Events**

- **VULNERABILITY_FINDING** - Generic vulnerability findings with extensions
- **VULNERABILITY_STATE_REPORT_EVENT** - Current vulnerability states (entity/vulnerability level)
- **VULNERABILITY_STATUS_CHANGE_EVENT** - Status transitions and changes
- **VULNERABILITY_ASSESSMENT_CHANGE_EVENT** - Assessment updates and modifications

### **Key Relationship Fields:**

- **scan.id** - Links compliance scan completion to individual findings
- **vulnerability.id** - Links all vulnerability events across types
- **affected_entity.id** - Connects vulnerabilities to Dynatrace entities
- **object.id** - Links compliance findings to specific infrastructure objects
- **dt.entity.\*** - Direct references to Dynatrace entity model

### **Critical Analysis Patterns:**

**✅ CORRECT - Latest scan analysis:**

```dql
// Get most recent scan first
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_SCAN_COMPLETED" AND object.type == "AWS"
| sort timestamp desc | limit 1
| fields scan.id
```

**❌ WRONG - Time-based aggregation:**

```dql
// This includes outdated findings from multiple scans!
fetch events, from:now() - 7d
| filter event.type == "COMPLIANCE_FINDING"
| summarize count = count()
```

## 🔍 **Step 1: Analyze Available Scan Types**

**ALWAYS start compliance analysis by understanding what scan types are available:**

```dql
fetch events, from:now() - 7d
| filter event.type == "COMPLIANCE_SCAN_COMPLETED"
| summarize scan_count = count(), by:{object.type}
| sort scan_count desc
```

**Use this information to:**

1. Set appropriate timeframes for each platform
2. Understand scan frequency patterns
3. Identify which platforms have active scanning

## ⚠️ CRITICAL: Time Range Requirements for Compliance Findings

**AWS/GCP/Azure Compliance Findings require extended time ranges (24h+) because:**

- Cloud provider scans run infrequently (daily or less frequent)
- All findings are generated in batches during scan time
- Default 2-hour window often misses cloud findings

**Kubernetes Compliance Findings work with default time range because:**

- Kubernetes scans run more frequently
- Findings are typically recent and within default window

### Recommended Query Patterns:

**For AWS findings - ALWAYS use 24h+ timeframe:**

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING" AND cloud.provider == "aws"
```

**For Kubernetes findings - default timeframe works:**

```dql
fetch events
| filter event.type == "COMPLIANCE_FINDING"
| filter compliance.result.object.type startsWith "k8s"
```

**For comprehensive compliance analysis - use extended timeframe:**

```dql
fetch events, from:now() - 7d
| filter event.type == "COMPLIANCE_FINDING"
```

## Example Queries for AWS Compliance Findings

All AWS compliance findings (with proper timeframe):

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING" AND cloud.provider == "aws"
```

AWS findings by compliance standard:

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING" AND cloud.provider == "aws"
| summarize count = count(), by:{compliance.standard.short_name}
```

AWS S3 bucket specific findings:

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING"
| filter cloud.provider == "aws" AND object.type == "awsbucket"
| fields timestamp, compliance.rule.severity.level, compliance.standard.short_name, compliance.rule.title, compliance.result.object.evidence_json
```

AWS failed findings by severity:

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING"
| filter compliance.result.status.level == "FAILED"
| filter cloud.provider == "aws"
| sort compliance.rule.severity.level asc
| fields timestamp, cloud.provider, compliance.rule.severity.level, compliance.standard.short_name, compliance.rule.title, object.type, compliance.result.object.evidence_json
```

**Note**: evidence_json contains detailed information about the compliance finding and should be analyzed to provide specific, actionable remediation steps.

## ⚠️ **CRITICAL: Latest Scan Analysis Only**

**NEVER aggregate compliance findings over time - this creates thousands of outdated results!**

**Always focus on the most recent scan for current compliance status.**

### **CRITICAL RULE: Focus on Latest Scan Only**

**❌ WRONG - Aggregating over time:**

```dql
// This creates thousands of outdated findings!
fetch events, from:now() - 7d
| filter event.type == "COMPLIANCE_FINDING"
| summarize count = count(), by:{compliance.rule.title}
```

**✅ CORRECT - Latest scan findings:**

```dql
// Get the most recent scan first
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_SCAN_COMPLETED" AND object.type == "AWS"
| sort timestamp desc
| limit 1
| fields scan.id
```

Then use that `scan.id` to get current findings:

```dql
fetch events, from:now() - 24h
| filter event.type == "COMPLIANCE_FINDING" AND scan.id == "<latest_scan_id>"
| summarize count = count(), by:{compliance.rule.title}
```

### Troubleshooting Missing Findings:

1. **No cloud provider findings?** → Use `from:now() - 24h` or longer
2. **No recent findings?** → Check if scans are running with COMPLIANCE_SCAN_COMPLETED query
3. **Partial results?** → Extend timeframe to capture full scan cycles

---

## 🛠️ **Compliance Remediation Framework**

**MANDATORY**: After every compliance analysis, ask the user what type of remediation support they need:

**"Based on these compliance findings, what would you like me to help you with next?"**

### Quick Options:

- **🔥 Immediate action plan** for critical/high severity findings
- **🛠️ Infrastructure templates** (CloudFormation, Terraform, K8s)
- **📊 Monitoring setup** (Dashboards, alerts)
- **📝 Detailed remediation guide** for specific findings
- **📈 Executive report** for leadership

**Wait for user selection before providing detailed remediation content.**

### 🎯 **Team-Specific Remediation Guidance**

#### **Security Teams**

- **Focus**: Critical and high-severity findings requiring immediate attention
- **Deliverables**:
  - Prioritized remediation roadmap
  - Security policy updates
  - Incident response procedures
  - Risk assessment documentationn

#### **DevOps/Platform Teams**

- **Focus**: Infrastructure automation and configuration management
- **Deliverables**: Infrastructure-as-Code templates, CI/CD security enhancements, automated compliance integration

#### **Development Teams**

- **Focus**: Application-level security and secure coding practices
- **Deliverables**: Secure coding guidelines, dependency management, security testing integration

#### **Compliance/Audit Teams**

- **Focus**: Documentation, reporting, and governance
- **Deliverables**: Compliance reports, audit documentation, policy frameworks

**Remember**: Always tailor remediation advice to the specific team, technology stack, and organizational context of the findings.

---

## 🔐 **Threat Observability DQL Examples**

### **Vulnerability Analysis Patterns**

**Open vulnerabilities by library/component:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents_builtin"
    AND event.provider == "Dynatrace"
    AND event.type == "VULNERABILITY_STATE_REPORT_EVENT"
    AND event.level == "ENTITY"
// filter for the latest snapshot per entity
| dedup {vulnerability.display_id, affected_entity.id}, sort: {timestamp desc}
// filter for open non-muted vulnerabilities
| filter vulnerability.resolution.status == "OPEN"
    AND vulnerability.parent.mute.status != "MUTED"
    AND vulnerability.mute.status != "MUTED"
// filter by the vulnerable library/component name
    AND contains(affected_entity.vulnerable_component.name, "log4j", caseSensitive: false)
// now summarize on the vulnerability level
| summarize {
    vulnerability.risk.score = round(takeMax(vulnerability.risk.score), decimals: 1),
    vulnerability.title = takeFirst(vulnerability.title),
    vulnerability.references.cve = takeFirst(vulnerability.references.cve),
    last_detected = coalesce(takeMax(vulnerability.resolution.change_date), takeMax(vulnerability.parent.first_seen)),
    affected_entities = countDistinctExact(affected_entity.id),
    vulnerable_function_in_use = if(in("IN_USE", collectArray(vulnerability.davis_assessment.vulnerable_function_status)), true, else: false),
    public_internet_exposure = if(in("PUBLIC_NETWORK", collectArray(vulnerability.davis_assessment.exposure_status)), true, else: false),
    public_exploit_available = if(in("AVAILABLE", collectArray(vulnerability.davis_assessment.exploit_status)), true, else: false),
    data_assets_within_reach = if(in("REACHABLE", collectArray(vulnerability.davis_assessment.data_assets_status)), true, else: false)
}, by: {vulnerability.display_id}
// map the risk level
| fieldsAdd vulnerability.risk.level = if(vulnerability.risk.score >= 9, "CRITICAL",
    else: if(vulnerability.risk.score >= 7, "HIGH",
    else: if(vulnerability.risk.score >= 4, "MEDIUM",
    else: if(vulnerability.risk.score >= 0.1, "LOW", else: "NONE"))))
| sort {vulnerability.risk.score, direction: "descending"}, {affected_entities, direction: "descending"}
```

**Vulnerabilities on a specific host:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents_builtin"
    AND event.provider == "Dynatrace"
    AND event.type == "VULNERABILITY_STATE_REPORT_EVENT"
    AND event.level == "ENTITY"
// filter for the latest snapshot per entity
| dedup {vulnerability.display_id, affected_entity.id}, sort: {timestamp desc}
// filter for open non-muted vulnerabilities
| filter vulnerability.resolution.status == "OPEN"
    AND vulnerability.parent.mute.status != "MUTED"
    AND vulnerability.mute.status != "MUTED"
// filter by the host name of the related/affected host
    AND (in("easytravel-demo2", related_entities.hosts.names) OR affected_entity.name == "easytravel-demo2")
// now summarize on the vulnerability level
| summarize {
    vulnerability.risk.score = round(takeMax(vulnerability.risk.score), decimals: 1),
    vulnerability.title = takeFirst(vulnerability.title),
    vulnerability.references.cve = takeFirst(vulnerability.references.cve),
    last_detected = coalesce(takeMax(vulnerability.resolution.change_date), takeMax(vulnerability.parent.first_seen)),
    affected_entities = countDistinctExact(affected_entity.id),
    vulnerable_function_in_use = if(in("IN_USE", collectArray(vulnerability.davis_assessment.vulnerable_function_status)), true, else: false),
    public_internet_exposure = if(in("PUBLIC_NETWORK", collectArray(vulnerability.davis_assessment.exposure_status)), true, else: false),
    public_exploit_available = if(in("AVAILABLE", collectArray(vulnerability.davis_assessment.exploit_status)), true, else: false),
    data_assets_within_reach = if(in("REACHABLE", collectArray(vulnerability.davis_assessment.data_assets_status)), true, else: false)
}, by: {vulnerability.display_id}
// map the risk level
| fieldsAdd vulnerability.risk.level = if(vulnerability.risk.score >= 9, "CRITICAL",
    else: if(vulnerability.risk.score >= 7, "HIGH",
    else: if(vulnerability.risk.score >= 4, "MEDIUM",
    else: if(vulnerability.risk.score >= 0.1, "LOW", else: "NONE"))))
| sort {vulnerability.risk.score, direction: "descending"}, {affected_entities, direction: "descending"}
```

**Top 10 affected entities by vulnerability count:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents_builtin"
    AND event.provider == "Dynatrace"
    AND event.type == "VULNERABILITY_STATE_REPORT_EVENT"
    AND event.level == "ENTITY"
// filter for the latest snapshot per entity
| dedup {vulnerability.display_id, affected_entity.id}, sort: {timestamp desc}
// filter for open non-muted vulnerabilities
| filter vulnerability.resolution.status == "OPEN"
    AND vulnerability.parent.mute.status != "MUTED"
    AND vulnerability.mute.status != "MUTED"
| summarize {
    `Affected entity name` = takeFirst(affected_entity.name),
    Type = takeFirst(affected_entity.type),
    Vulnerabilities = countDistinctExact(vulnerability.display_id)
}, by: {dt.source_entity = affected_entity.id}
| sort {Vulnerabilities, direction: "descending"}
| limit 10
```

### **Container Security Analysis**

**Total number of critical vulnerability findings:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents"
    AND event.type == "VULNERABILITY_FINDING"
    AND isNotNull(component.name)
// latest findings per affected object, vulnerability and component
| dedup {object.id, vulnerability.id, component.name, component.version}, sort: {timestamp desc}
// aggregation and custom filtering
| filter dt.security.risk.level == "CRITICAL"
| summarize {Vulnerabilities = countDistinctExact(vulnerability.id)}
```

**Total number of vulnerable container images:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents"
    AND event.type == "VULNERABILITY_FINDING"
    AND isNotNull(component.name)
// latest findings per affected object, vulnerability and component
| dedup {object.id, vulnerability.id, component.name, component.version,
    container_image.registry, container_image.repository, container_image.tags}, sort: {timestamp desc}
// aggregation and custom filtering
| summarize {containerImages = countDistinctExact(container_image.digest)}
```

**Most recent vulnerability findings:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents"
    AND event.type == "VULNERABILITY_FINDING"
    AND isNotNull(component.name)
// latest findings per affected object, vulnerability and component
| dedup {object.id, vulnerability.id, component.name, component.version}, sort: {timestamp desc}
| sort timestamp desc
```

### **Advanced Compliance Analysis Patterns**

**Latest compliance results for all covered systems:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents_builtin"
    AND event.type == "COMPLIANCE_SCAN_COMPLETED"
// filter for the latest assessment
| dedup {object.name}, sort: {timestamp desc}
// parse the compliance percentage from json
| parse `scan.result.summary_json`,
    """JSON{JSON_ARRAY{JSON{ STRING:standardCode, INT:compliancePercentage }}:standardResultSummaries}(flat=true)"""
| expand standardResultSummaries
| fieldsFlatten standardResultSummaries
| fields timestamp, object.name, standard = standardResultSummaries.standardCode, compliance = standardResultSummaries.compliancePercentage
```

**Latest analysis results for a specific system:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents_builtin"
    AND event.type == "COMPLIANCE_FINDING"
// filter for the latest rule assessment results in the timeframe
| join [
    fetch security.events
    | filter dt.system.bucket == "default_securityevents_builtin"
        AND event.type == "COMPLIANCE_SCAN_COMPLETED"
    // filter for desired system
        AND object.name == "dt-cluster-01"
    | sort timestamp desc
    | fields scan.id
    | limit 1
], on: {scan.id}
// summarize findings on rule level
| summarize {
    compliance.rule.severity.level = takeFirst(compliance.rule.severity.level),
    compliance.standard.short_name = takeFirst(compliance.standard.short_name),
    compliance.rule.title = takeFirst(compliance.rule.title),
    compliance.standard.url = takeFirst(compliance.standard.url),
    finding.time.created = takeFirst(finding.time.created),
    compliance.result.count.passed = countIf(compliance.result.status.level == "PASSED"),
    compliance.result.count.failed = countIf(compliance.result.status.level == "FAILED"),
    compliance.result.count.manual = countIf(compliance.result.status.level == "MANUAL"),
    compliance.result.count.not_relevant = countIf(compliance.result.status.level == "NOT_RELEVANT"),
    compliance.rule.metadata_json = takeFirst(compliance.rule.metadata_json)
}, by: { compliance.rule.id }
// add rule level status
| fieldsAdd compliance.result.status.level =
    if(compliance.result.count.failed > 0, "FAILED",
    else: if(compliance.result.count.manual > 0, "MANUAL",
    else: if(compliance.result.count.passed > 0, "PASSED", else: "NOT_RELEVANT")))
```

### **Advanced Entity Analysis with Ownership**

**Top 10 process groups with owners:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents_builtin"
    AND event.provider == "Dynatrace"
    AND event.type == "VULNERABILITY_STATE_REPORT_EVENT"
    AND event.level == "ENTITY"
// filter for the latest snapshot per entity
| dedup {vulnerability.display_id, affected_entity.id}, sort: {timestamp desc}
// filter for open non-muted vulnerabilities
| filter vulnerability.resolution.status == "OPEN"
    AND vulnerability.parent.mute.status != "MUTED"
    AND vulnerability.mute.status != "MUTED"
    AND affected_entity.type == "PROCESS_GROUP"
// summarize per process group
| summarize {
    `Affected entity name` = takeFirst(affected_entity.name),
    Type = takeFirst(affected_entity.type),
    Vulnerabilities = countDistinctExact(vulnerability.display_id)
}, by: {dt.source_entity = affected_entity.id}
| sort {Vulnerabilities, direction: "descending"}
| limit 10
// add ownership information
| lookup [
    fetch dt.entity.process_group
    | parse toString(tags), "LD ('owner:'|'owner\\\\:') (SPACE)? LD:Team ('\"')"
    | fields id, Team = coalesce(Team, "-")
], sourceField: dt.source_entity, lookupField: id, fields: {Team}
| sort Vulnerabilities, direction: "descending"
```

**Vulnerable software components of a host with owners:**

```dql
fetch security.events
| filter dt.system.bucket == "default_securityevents_builtin"
    AND event.provider == "Dynatrace"
    AND event.type == "VULNERABILITY_STATE_REPORT_EVENT"
    AND event.level == "ENTITY"
// filter for the latest snapshot per entity
| dedup {vulnerability.display_id, affected_entity.id}, sort: {timestamp desc}
// filter for open non-muted vulnerabilities
| filter vulnerability.resolution.status == "OPEN"
    AND vulnerability.parent.mute.status != "MUTED"
    AND vulnerability.mute.status != "MUTED"
// filter by ID of the related or affected host
    AND (in("HOST-DBF63A01C27E4B50", related_entities.hosts.ids) or affected_entity.id == "HOST-DBF63A01C27E4B50")
| summarize {
    entities = countDistinctExact(affected_entity.id),
    vulnerable_functions = arraySize(collectDistinct(affected_entity.vulnerable_functions, expand: true)),
    vulnerable_component.name = takeAny(affected_entity.vulnerable_component.name)
}, by: {dt.entity.software_component = affected_entity.vulnerable_component.id}
| filterOut isNull(dt.entity.software_component)
// add component information
| lookup [
    fetch dt.entity.software_component
    | fieldsAdd softwareComponentFileName
], sourceField: dt.entity.software_component, lookupField: id, fields: {softwareComponentFileName}
| fields dt.entity.software_component, vulnerable_component.name, softwareComponentFileName, entities, vulnerable_functions
| sort {entities, direction: "descending"}, {vulnerable_functions, direction: "descending"}
```

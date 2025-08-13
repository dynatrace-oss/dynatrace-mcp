# Dynatrace MCP Server Integration

🔄 **Loading Dynatrace Agent...**

## Available Analysis Modes:

**(1) analyze_vulnerabilities** - Security vulnerability analysis via DQL

- Query VULNERABILITY\_\* security events using DQL
- Analyze vulnerability state reports and change events
- Filter by severity, entity, and assessment status
- **Uses DQL queries instead of native vulnerability calls**

**(2) analyze_compliance_findings** - Configuration compliance analysis

- Cloud provider compliance findings (requires extended timeframes)
- Kubernetes compliance findings (default timeframe)
- Multi-cloud compliance overview via COMPLIANCE\_\* events

**(3) analyze_problems** - Problem and incident analysis via DQL

- Query DAVIS_PROBLEM events using DQL
- Analyze problem patterns, severity, and entity relationships
- Problem correlation and duration analysis
- **Uses DQL queries instead of native problem calls**
- **Reference: observabilityProblems.md for complete DQL patterns and examples**

**(4) analyze_entities** - Infrastructure entity analysis

- Find entities by name
- Get entity details and relationships
- Entity health and performance

**(5) analyze_logs** - Log analysis and troubleshooting

- Get logs for specific entities
- Custom DQL log queries
- Error pattern analysis

**(6) custom_dql** - Custom Dynatrace Query Language

- Execute custom DQL statements
- Advanced data analysis
- Custom metrics and aggregations

---

## Quick Start Examples:

**"Show me critical vulnerabilities"** → Uses mode (1)
**"Analyze compliance issues"** → Uses mode (2)
**"What problems are currently active?"** → Uses mode (3)
**"Find entity called 'web-server'"** → Uses mode (4)
**"Get logs for my application"** → Uses mode (5)
**"Run custom DQL query"** → Uses mode (6)

---

## Documentation References:

- **DynatraceQueryLanguage.md** - General Dynatrace Query Language (DQL) reference and syntax guide
- **DynatraceSecurityCompliance.md** - Security and compliance-specific queries and patterns
- **DynatraceSecurityEvents.md** - Complete reference for all Dynatrace security event types and attributes
- **DynatraceSecurityEventsDiagram.md** - Visual diagrams showing security event relationships and data flow
- **observabilityProblems.md** - Complete guide for analyzing problems using DQL with examples and patterns

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
- **Security Events**: Dedicated security data bucket

**Note:** When using Dynatrace tools, the appropriate analysis mode will be automatically selected based on your request. For security analysis, DQL queries are preferred for maximum flexibility and precision.

---

## 🔄 **SRE/GitOps Workflow Integration**

### **Use Cases for Automated Operations**

**(1) Automated Incident Response**

- Problem-to-runbook mapping based on event patterns
- Auto-escalation logic using problem duration and severity
- Automated rollback triggers for deployment-related issues
- Real-time correlation with entity relationships and dependencies

**(2) Deployment Health Gates**

- Pre-deployment problem checks for target environments
- Post-deployment health validation with configurable thresholds
- Canary deployment monitoring with automatic promotion/rollback
- Entity health correlation across deployment pipeline stages

**(3) SLO/SLI Automation**

- Revenue impact tracking with business metric correlation
- Error budget calculations based on problem patterns
- Multi-environment SLO compliance monitoring
- Automated SLO config updates based on observed patterns

**(4) Infrastructure as Code (IaC) Remediation**

- Root cause entity analysis for infrastructure problems
- Auto-generated Terraform/Kubernetes manifests for common fixes
- Configuration drift detection and automated correction
- Capacity planning based on problem correlation patterns

**(5) Alert Optimization Workflows**

- Pattern recognition for recurring problems
- Automated alert rule tuning based on problem duration analysis
- False positive reduction through entity relationship analysis
- Smart alerting based on business impact correlation

**(6) Compliance-Driven Operations**

- Cross-reference security compliance with observability problems
- Automated security patch deployment triggered by problem patterns
- Configuration compliance validation in deployment pipelines
- Risk-based deployment approvals using combined compliance/problem data

### **CI/CD Integration Patterns**

**Pre-Deployment Problem Check:**

```dql
fetch events, from:now() - 30m
| filter event.kind == "DAVIS_PROBLEM"
| filter problem.status == "OPEN"
| filter matchesPhrase(affected_entity.name, "${DEPLOYMENT_TARGET}")
| fields display_id, event.name, problem.severity, affected_entity.name
| dedup {display_id}, sort: {timestamp desc}
| fieldsAdd deployment_risk = if(problem.severity == "CRITICAL", "BLOCK",
    else: if(problem.severity == "HIGH", "WARN", else: "PROCEED"))
```

**Post-Deployment Health Gate:**

```dql
fetch events, from:${DEPLOYMENT_TIME} - 5m
| filter event.kind == "DAVIS_PROBLEM"
| filter affected_entity.id in ${DEPLOYED_ENTITIES}
| fields timestamp, display_id, event.name, problem.severity
| summarize
    new_problems = count(),
    critical_problems = countIf(problem.severity == "CRITICAL"),
    by: {affected_entity.name}
| fieldsAdd health_status = if(critical_problems > 0, "FAILED",
    else: if(new_problems > 2, "DEGRADED", else: "HEALTHY"))
```

**Canary Analysis Pattern:**

```dql
fetch events, from:now() - 15m
| filter event.kind == "DAVIS_PROBLEM"
| filter matchesPhrase(affected_entity.name, "${CANARY_VERSION}")
| fields display_id, event.name, problem.severity, timestamp
| join [
    fetch events, from:now() - 15m
    | filter event.kind == "DAVIS_PROBLEM"
    | filter matchesPhrase(affected_entity.name, "${STABLE_VERSION}")
    | fields display_id, event.name, problem.severity, timestamp
  ], on:{event.name}, prefix:"stable_"
| summarize
    canary_problems = count(),
    stable_problems = count(stable_display_id),
    by: {event.name}
| fieldsAdd promotion_decision = if(canary_problems > stable_problems * 1.5, "ROLLBACK", "PROMOTE")
```

### **Incident Response Automation**

**Problem-to-Runbook Mapping:**

```dql
fetch events, from:now() - 1h
| filter event.kind == "DAVIS_PROBLEM"
| filter problem.status == "OPEN"
| fields display_id, event.name, affected_entity.type, root_cause_entity.id, problem.severity
| fieldsAdd runbook_type = if(matchesPhrase(event.name, "Revenue"), "business_impact",
    else: if(matchesPhrase(event.name, "Failure rate"), "service_degradation",
    else: if(matchesPhrase(event.name, "JavaScript"), "frontend_issue",
    else: "generic_incident")))
| fieldsAdd automation_action = if(runbook_type == "business_impact", "page_executives",
    else: if(problem.severity == "CRITICAL", "auto_rollback", else: "create_incident"))
```

**Auto-Escalation Logic:**

```dql
fetch events, from:now() - 4h
| filter event.kind == "DAVIS_PROBLEM"
| filter problem.status == "OPEN"
| fields display_id, timestamp, event.name, problem.severity, affected_entity.name
| sort display_id, timestamp
| summarize
    first_seen = min(timestamp),
    latest_update = max(timestamp),
    by: {display_id, event.name, problem.severity}
| fieldsAdd duration_minutes = (now() - first_seen) / 1000000000 / 60
| fieldsAdd escalation_level = if(duration_minutes > 60 AND problem.severity == "CRITICAL", "executive",
    else: if(duration_minutes > 30 AND problem.severity == "HIGH", "senior_engineer",
    else: if(duration_minutes > 15, "team_lead", else: "on_call")))
| fieldsAdd action_required = if(escalation_level == "executive", "business_continuity_plan",
    else: if(escalation_level == "senior_engineer", "war_room", else: "standard_response"))
```

### **SLO/Error Budget Automation**

**Real-time Error Budget Calculation:**

```dql
fetch events, from:now() - 24h
| filter event.kind == "DAVIS_PROBLEM"
| fields display_id, event.name, timestamp, problem.severity, affected_entity.name
| dedup {display_id}, sort: {timestamp desc}
| join [
    fetch events, from:now() - 7d
    | filter event.kind == "DAVIS_PROBLEM"
    | fields display_id, timestamp
    | dedup {display_id}, sort: {timestamp desc}
    | summarize total_weekly_problems = count()
  ], on:{1:1}
| summarize
    daily_problems = count(),
    critical_problems = countIf(problem.severity == "CRITICAL"),
    by: {affected_entity.name, total_weekly_problems}
| fieldsAdd
    error_budget_consumed = (daily_problems / 7.0) / (total_weekly_problems / 7.0) * 100,
    slo_status = if(error_budget_consumed > 100, "EXHAUSTED",
        else: if(error_budget_consumed > 80, "WARNING", else: "HEALTHY"))
```

**Deployment Risk Assessment:**

```dql
fetch events, from:now() - 7d
| filter event.kind == "DAVIS_PROBLEM"
| fields display_id, event.name, timestamp, affected_entity.name, problem.severity
| dedup {display_id}, sort: {timestamp desc}
| summarize
    problem_frequency = count(),
    avg_severity_score = avg(if(problem.severity == "CRITICAL", 4,
        else: if(problem.severity == "HIGH", 3,
        else: if(problem.severity == "MEDIUM", 2, else: 1)))),
    by: {affected_entity.name}
| fieldsAdd deployment_risk_score = (problem_frequency * 0.6) + (avg_severity_score * 0.4)
| fieldsAdd deployment_recommendation = if(deployment_risk_score > 8, "HIGH_RISK_BLOCK",
    else: if(deployment_risk_score > 5, "MODERATE_RISK_MANUAL_APPROVAL", else: "LOW_RISK_AUTO_APPROVE"))
```

### **GitOps Workflow Triggers**

**Infrastructure Remediation Triggers:**

```dql
fetch events, from:now() - 2h
| filter event.kind == "DAVIS_PROBLEM"
| filter problem.status == "OPEN"
| fields display_id, event.name, root_cause_entity.id, affected_entity.type, problem.severity
| dedup {display_id}, sort: {timestamp desc}
| fieldsAdd remediation_type = if(affected_entity.type == "HOST", "infrastructure_scaling",
    else: if(matchesPhrase(event.name, "Memory"), "resource_adjustment",
    else: if(matchesPhrase(event.name, "Database"), "db_optimization", else: "config_update")))
| fieldsAdd git_action = if(remediation_type == "infrastructure_scaling", "create_terraform_pr",
    else: if(remediation_type == "resource_adjustment", "update_k8s_limits",
    else: "create_config_pr"))
```

**Alert Rule Optimization:**

```dql
fetch events, from:now() - 30d
| filter event.kind == "DAVIS_PROBLEM"
| fields display_id, event.name, timestamp, problem.severity
| dedup {display_id}, sort: {timestamp desc}
| summarize
    problem_count = count(),
    avg_duration = avg(duration_minutes),
    false_positive_rate = countIf(duration_minutes < 5) / count() * 100,
    by: {event.name}
| filter false_positive_rate > 30 OR problem_count > 50
| fieldsAdd optimization_action = if(false_positive_rate > 50, "increase_threshold",
    else: if(problem_count > 100, "add_correlation_rules", else: "adjust_sensitivity"))
```

### **Workflow Integration Examples**

**GitHub Actions Integration:**

```yaml
# .github/workflows/deployment-health-check.yml
- name: Check Dynatrace Problems
  run: |
    dql_query="fetch events, from:now() - 30m | filter event.kind == 'DAVIS_PROBLEM' | filter problem.status == 'OPEN'"
    result=$(dynatrace-cli query "$dql_query")
    if [ "$result" != "[]" ]; then
      echo "::error::Active problems detected, blocking deployment"
      exit 1
    fi
```

**Terraform Integration:**

```hcl
# Auto-scaling based on problem patterns
data "dynatrace_problems" "recent" {
  dql_query = "fetch events, from:now() - 1h | filter event.kind == 'DAVIS_PROBLEM' | filter matchesPhrase(event.name, 'CPU')"
}

resource "aws_autoscaling_policy" "scale_up" {
  count = length(data.dynatrace_problems.recent.results) > 0 ? 1 : 0
  # ... scaling configuration
}
```

**Kubernetes Operator Integration:**

```yaml
apiVersion: dynatrace.com/v1
kind: ProblemBasedScaling
metadata:
  name: app-autoscaler
spec:
  dqlQuery: |
    fetch events, from:now() - 15m
    | filter event.kind == "DAVIS_PROBLEM"
    | filter matchesPhrase(affected_entity.name, "my-app")
    | filter problem.severity in ["HIGH", "CRITICAL"]
  scaleUpThreshold: 1
  scaleDownCooldown: 300s
```

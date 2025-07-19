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

**(3) analyze_problems** - Problem and incident analysis

- List active problems
- Get problem details and root cause
- Problem impact analysis

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

# Examples

## Copilot Instructions

- [Copilot-Instructions](easytrade.md) for [EasyTrade](https://github.com/Dynatrace/easytrade)

## Prompts

Use these example prompts as a starting point. Just copy them into your IDE or agent setup, adapt them to your services/stack/architecture,
and extend them as needed. They're here to help you imagine how real-time observability and automation work together in the MCP context in your IDE.

### **Basic Queries & AI Assistance**

**Find a monitored entity**

```
Get all details of the entity 'my-service-name'
```

or

```
Is my repository monitored by Dynatrace?
```

**Find error logs**

```
Show me error logs
```

**Write a DQL query from natural language:**

```
Show me error rates for the payment service in the last hour
```

**Explain a DQL query:**

```
What does this DQL do?
fetch logs | filter dt.source_entity == 'SERVICE-123' | summarize count(), by:{severity} | sort count() desc
```

**Chat with Davis CoPilot:**

```
How can I investigate slow database queries in Dynatrace?
```

### **Advanced Incident Investigation**

**Multi-phase incident response:**

```
Our checkout service is experiencing high error rates. Start a systematic 4-phase incident investigation:
1. Detect and triage the active problems
2. Assess user impact and affected services
3. Perform cross-data source analysis (problems → spans → logs)
4. Identify root cause with file/line-level precision
```

**Cross-service failure analysis:**

```
We have cascading failures across our microservices architecture.
Analyze the entity relationships and trace the failure propagation from the initial problem
through all downstream services. Show me the correlation timeline.
```

### **Security & Compliance Analysis**

**Latest-scan vulnerability assessment:**

```
Perform a comprehensive security analysis using the latest scan data:
- Check for new vulnerabilities in our production environment
- Focus on critical and high-severity findings
- Provide evidence-based remediation paths
- Generate risk scores with team-specific guidance
```

**Multi-cloud compliance monitoring:**

```
Run a compliance assessment across our AWS, Azure, and Kubernetes environments.
Check for configuration drift and security posture changes in the last 24 hours.
```

### **DevOps & SRE Automation**

**Deployment health gate analysis:**

```
Our latest deployment is showing performance degradation.
Run deployment health gate analysis with:
- Golden signals monitoring (Rate, Errors, Duration, Saturation)
- SLO/SLI validation with error budget calculations
- Generate automated rollback recommendation if needed
```

**Infrastructure as Code remediation:**

```
Generate Infrastructure as Code templates to remediate the current alert patterns.
Include automated scaling policies and resource optimization recommendations.
```

### **Deep Transaction Analysis**

**Business logic error investigation:**

```
Our payment processing is showing intermittent failures.
Perform advanced transaction analysis:
- Extract exception details with full stack traces
- Correlate with deployment events and ArgoCD changes
- Identify the exact code location causing the issue
```

**Performance correlation analysis:**

```
Analyze the performance impact across our distributed system for the slow checkout flow.
Show me the complete trace analysis with business context and identify bottlenecks.
```

### **Traditional Use Cases (Enhanced)**

**Find open vulnerabilities on production, setup alert:**

```
I have this code snippet here in my IDE, where I get a dependency vulnerability warning for my code.
Check if I see any open vulnerability/cve on production.
Analyze a specific production problem.
Setup a workflow that sends Slack alerts to the #devops-alerts channel when availability problems occur.
```

**Debug intermittent 503 errors:**

```
Our load balancer is intermittently returning 503 errors during peak traffic.
Pull all recent problems detected for our front-end services and
run a query to correlate error rates with service instance health indicators.
I suspect we have circuit breakers triggering, but need confirmation from the telemetry data.
```

**Correlate memory issue with logs:**

```
There's a problem with high memory usage on one of our hosts.
Get the problem details and then fetch related logs to help understand
what's causing the memory spike? Which file in this repo is this related to?
```

**Trace request flow analysis:**

```
Our users are experiencing slow checkout processes.
Can you execute a DQL query to show me the full request trace for our checkout flow,
so I can identify which service is causing the bottleneck?
```

**Analyze Kubernetes cluster events:**

```
Our application deployments seem to be failing intermittently.
Can you fetch recent events from our Kubernetes cluster "production-cluster"
to help identify what might be causing these deployment issues?
```

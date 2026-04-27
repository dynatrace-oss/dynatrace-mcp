---
name: Dynatrace Production Investigation
description: Step-by-step skill for investigating production issues using the Dynatrace MCP Server. Covers problem triage, log analysis, entity lookup, vulnerability review, and DQL queries.
---

# Dynatrace Production Investigation

Use this skill to systematically investigate production issues using live Dynatrace data from within Cursor.

## Phase 1 — Triage

1. List active problems: `list_problems` — filter by `ACTIVE` status
2. Get problem details for the most critical issue
3. Identify affected entities and services

## Phase 2 — Root Cause Analysis

1. Use `find_entity_by_name` to locate the affected service or host
2. Execute a DQL query via `execute_dql` to fetch recent error logs:
   ```
   fetch logs
   | filter loglevel == "ERROR"
   | filter contains(service.name, "<your-service>")
   | sort timestamp desc
   | limit 50
   ```
3. Check for exceptions with `list_exceptions`
4. Ask Davis AI for causal analysis: `chat_with_davis_copilot`

## Phase 3 — Security Review

1. Run `list_vulnerabilities` to check for open CVEs affecting the service
2. Note Davis risk score, exploit availability, and whether the vulnerable function is in use

## Phase 4 — Resolution

1. Document findings in a Dynatrace Notebook: `create_dynatrace_notebook`
2. Create an alert workflow if needed: `create_workflow_for_notification`

## Tips

- Use `generate_dql_from_natural_language` if you're unsure how to write a query
- Use `explain_dql_in_natural_language` to understand an existing query
- Use `execute_davis_analyzer` for anomaly detection on specific metrics

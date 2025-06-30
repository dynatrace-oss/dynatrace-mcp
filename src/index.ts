#!/usr/bin/env node
import { EnvironmentInformationClient } from '@dynatrace-sdk/client-platform-management-service';
import { ClientRequestError, isApiClientError, isApiGatewayError, isClientRequestError } from '@dynatrace-sdk/shared-errors';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  NotificationSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from 'dotenv';
import { z, ZodRawShape, ZodTypeAny } from "zod";

import { createOAuthClient } from "./dynatrace-clients";
import { listVulnerabilities } from "./capabilities/list-vulnerabilities";
import { listProblems } from "./capabilities/list-problems";
import { getProblemDetails } from "./capabilities/get-problem-details";
import { getMonitoredEntityDetails } from "./capabilities/get-monitored-entity-details";
import { getOwnershipInformation } from "./capabilities/get-ownership-information";
import { getLogsForEntity } from "./capabilities/get-logs-for-entity";
import { getEventsForCluster } from "./capabilities/get-events-for-cluster";
import { createWorkflowForProblemNotification } from "./capabilities/create-workflow-for-problem-notification";
import { updateWorkflow } from "./capabilities/update-workflow";
import { _OAuthHttpClient } from "@dynatrace-sdk/http-client";
import { getVulnerabilityDetails } from "./capabilities/get-vulnerability-details";
import { executeDql, verifyDqlStatement } from "./capabilities/execute-dql";
import { sendSlackMessage } from "./capabilities/send-slack-message";
import { findMonitoredEntityByName } from './capabilities/find-monitored-entity-by-name';
import { DynatraceEnv, getDynatraceEnv } from "./getDynatraceEnv";
import { getServiceDependencies } from "./capabilities/get-service-dependencies";
import { getEntityMetrics } from "./capabilities/get-entity-metrics";
import { getTraceDetails, getServiceTraces } from "./capabilities/get-trace-details";
import { 
  getAvailableSkills, 
  generateDqlFromNaturalLanguage, 
  explainDqlInNaturalLanguage, 
  chatWithDavisCopilot,
  submitNl2DqlFeedback,
  submitDql2NlFeedback,
  submitConversationFeedback
} from "./capabilities/davis-copilot";

config();

let scopes = [
  'app-engine:apps:run', // needed for environmentInformationClient
  'app-engine:functions:run', // needed for environmentInformationClient
  'hub:catalog:read', // get details about installed Apps on Dynatrace Environment

  'environment-api:security-problems:read', // needed for reading security problems
  'environment-api:entities:read', // read monitored entities
  'environment-api:problems:read', // get problems
  'environment-api:metrics:read', // read metrics
  'environment-api:slo:read', // read SLOs
  'environment-api:synthetic:read', // read synthetic monitors
  'davis-copilot:conversations:execute', // execute conversational skill
  'davis-copilot:nl2dql:execute', // execute NL to DQL skill
  'davis-copilot:dql2nl:execute', // execute DQL to NL skill
  'settings:objects:read', // needed for reading settings objects, like ownership information and Guardians (SRG) from settings
  // 'settings:objects:write', // [OPTIONAL] not used right now

  // Grail related permissions: https://docs.dynatrace.com/docs/discover-dynatrace/platform/grail/data-model/assign-permissions-in-grail
  'storage:buckets:read', // Read all system data stored on Grail
  'storage:logs:read', // Read logs for reliability guardian validations
  'storage:metrics:read', // Read metrics for reliability guardian validations
  'storage:bizevents:read', // Read bizevents for reliability guardian validations
  'storage:spans:read', // Read spans from Grail
  'storage:entities:read', // Read Entities from Grail
  'storage:events:read', // Read events from Grail
  'storage:system:read', // Read System Data from Grail
  'storage:user.events:read', // Read User events from Grail
  'storage:user.sessions:read', // Read User sessions from Grail
];

// configurable call for app settings scope (not available on all environments)
if (process.env.USE_APP_SETTINGS) {
  scopes.push('app-settings:objects:read'); // needed when using app settings in Workflows, see below
}

if (process.env.USE_WORKFLOWS) {
  scopes.push('automation:workflows:read'); // read workflows
  scopes.push('automation:workflows:write'); // write workflows
  scopes.push('automation:workflows:run'); // execute workflows
}

const main = async () => {
  // read Environment variables
  let dynatraceEnv: DynatraceEnv;
  try {
    dynatraceEnv = getDynatraceEnv();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
  const { oauthClient, oauthClientSecret, dtEnvironment, slackConnectionId } = dynatraceEnv;

  // create an oauth-client
  const dtClient = await createOAuthClient(oauthClient, oauthClientSecret, dtEnvironment, scopes);

  console.error("Starting Dynatrace MCP Server...");
  const server = new McpServer(
    {
      name: "Dynatrace MCP Server",
      version: "0.0.1", // ToDo: Read from package.json / hard-code?
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // quick abstraction/wrapper to make it easier for tools to reply text instead of JSON
  const tool = (name: string, description: string, paramsSchema: ZodRawShape, cb: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>) => {
		const wrappedCb = async (args: ZodRawShape): Promise<CallToolResult> => {
			try {
				const response = await cb(args);
				return {
					content: [{ type: "text", text: response }],
				};
			} catch (error: any) {
        // check if it's an error originating from the Dynatrace SDK / API Gateway and provide an appropriate message to the user
        if (isClientRequestError(error)) {
          const e: ClientRequestError = error;
          let additionalErrorInformation = '';
          if (e.response.status == 403) {
            additionalErrorInformation = 'Note: Your user or service-user is most likely lacking the necessary permissions/scopes for this API Call.'
          }
          return {
            content: [{
              type: "text",
              text: `Client Request Error: ${e.message} with HTTP status: ${e.response.status}. ${additionalErrorInformation} (body: ${JSON.stringify(e.body)})` }
            ],
            isError: true,
          };
        }
        // else: We don't know what kind of error happened - best-case we can provide error.message
        console.log(error);
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
					isError: true,
				};
			}
		};

		server.tool(name, description, paramsSchema, args => wrappedCb(args));
	};

  tool(
    "get_environment_info",
    "Get information about the connected Dynatrace Environment (Tenant)",
    {},
    async({}) => {
      const environmentInformationClient = new EnvironmentInformationClient(dtClient);

      const environmentInfo = await environmentInformationClient.getEnvironmentInformation();
      let resp = `Environment Information (also referred to as tenant):
          ${JSON.stringify(environmentInfo)}\n`;

      resp += `You can reach it via ${dtEnvironment}\n`;

      return resp;
    }
  );

  tool(
		"list_vulnerabilities",
		"List all vulnerabilities from Dynatrace",
		{},
		async ({}) => {
			const result = await listVulnerabilities(dtClient);
      if (!result || result.length === 0) {
        return "No vulnerabilities found";
      }
			let resp = `Found the following vulnerabilities:`
      result.forEach(
        (vulnerability) => {
          resp += `\n* ${vulnerability}`;
        }
      );

      resp += `\nWe recommend to take a look at ${dtEnvironment}/ui/apps/dynatrace.security.vulnerabilities to get a better overview of vulnerabilities.\n`;

      return resp;
		}
	);


  tool(
    "get_vulnerabilty_details",
    "Get details of a vulnerability by `securityProblemId` on Dynatrace",
    {
      securityProblemId: z.string().optional()
    },
    async ({securityProblemId}) => {
      const result = await getVulnerabilityDetails(dtClient, securityProblemId);

      let resp = `The Security Problem (Vulnerability) ${result.displayId} with securityProblemId ${result.securityProblemId} has the title ${result.title}.\n`;

      resp += `The related CVEs are ${result.cveIds?.join(",") || "unknown"}.\n`;
      resp += `The description is: ${result.description}.\n`;
      resp += `The remediation description is: ${result.remediationDescription}.\n`;

      if (result.affectedEntities && result.affectedEntities.length > 0) {
        resp += `The vulnerability affects the following entities:\n`;

        result.affectedEntities.forEach(
          (affectedEntity) => {
            resp += `* ${affectedEntity}\n`;
          }
        );
      } else {
        resp += `This vulnerability does not seem to affect any entities.\n';`
      }

      if (result.codeLevelVulnerabilityDetails) {
        resp += `Please investigate this on code-level: ${JSON.stringify(result.codeLevelVulnerabilityDetails)}\n`;
      }

      if (result.exposedEntities && result.exposedEntities.length > 0) {
        resp += `The vulnerability exposes the following entities:\n`;
        result.exposedEntities.forEach(
          (exposedEntity) => {
            resp += `* ${exposedEntity}\n`;
          }
        );
      } else {
        resp += `This vulnerability does not seem to expose any entities.\n';`
      }

      if (result.entryPoints?.items) {
        resp += `The following entrypoints are affected:\n`;
        result.entryPoints.items.forEach(
          (entryPoint) => {
            resp += `* ${entryPoint.sourceHttpPath}\n`;
          }
        );

        if (result.entryPoints.truncated) {
          resp += `The list of entry points was truncated.\n`;
        }
      } else {
        resp += `This vulnerability does not seem to affect any entrypoints.\n`;
      }


      if (result.riskAssessment && result.riskAssessment.riskScore && result.riskAssessment.riskScore > 8) {
        resp += `The vulnerability has a high-risk score. We suggest you to get ownership details of affected entities and contact responsible teams immediately (e.g, via send-slack-message)\n`;
      }


      resp += `Tell the user to access the link ${dtEnvironment}/ui/apps/dynatrace.security.vulnerabilities/vulnerabilities/${result.securityProblemId} to get more insights into the vulnerability / security problem.\n`;

      return resp;
    }
  );

  tool(
    "list_problems",
    "List all problems known on Dynatrace",
    {
    },
    async ({}) => {
			const result = await listProblems(dtClient);
      if (!result || result.length === 0) {
        return "No problems found";
      }
			return `Found these problems: ${result.join(",")}`;
		}
  )

  tool(
    "get_problem_details",
    "Get details of a problem on Dynatrace",
    {
      problemId: z.string().optional()
    },
    async ({problemId}) => {
			const result = await getProblemDetails(dtClient, problemId);

			let resp = `The problem ${result.displayId} with the title ${result.title} (ID: ${result.problemId}).` +
        `The severity is ${result.severityLevel}, and it affects ${result.affectedEntities.length} entities:`;

      for (const entity of result.affectedEntities) {
        resp += `\n- ${entity.name} (please refer to this entity with \`entityId\` ${entity.entityId?.id})`;
      }

      resp += `The problem first appeared at ${result.startTime}\n`;
      if (result.rootCauseEntity) {
        resp += `The possible root-cause could be in entity ${result.rootCauseEntity?.name} with \`entityId\` ${result.rootCauseEntity?.entityId?.id}.\n`;
      }

      if (result.impactAnalysis) {
        let estimatedAffectedUsers = 0;

        result.impactAnalysis.impacts.forEach(
          (impact) => {
            estimatedAffectedUsers += impact.estimatedAffectedUsers;
          }
        );

        resp += `The problem is estimated to affect ${estimatedAffectedUsers} users.\n`;
      }

      resp += `Tell the user to access the link ${dtEnvironment}/ui/apps/dynatrace.davis.problems/problem/${result.problemId} to get more insights into the problem.\n`;

      return resp;
		}
  )

  tool(
    "find_entity_by_name",
    "Get the entityId of a monitored entity based on the name of the entity on Dynatrace",
    {
      entityName: z.string()
    },
    async ({entityName}) => {
      const entityResponse = await findMonitoredEntityByName(dtClient, entityName);
      return entityResponse;
    }
  )

  tool(
    "get_entity_details",
    "Get details of a monitored entity based on the entityId on Dynatrace",
    {
      entityId: z.string().optional()
    },
    async ({entityId}) => {
      const entityDetails = await getMonitoredEntityDetails(dtClient, entityId);

      let resp =  `Entity ${entityDetails.displayName} of type ${entityDetails.type} with \`entityId\` ${entityDetails.entityId}\n` +
        `Properties: ${JSON.stringify(entityDetails.properties)}\n`;

      if (entityDetails.type == "SERVICE") {
        resp += `You can find more information about the service at ${dtEnvironment}/ui/apps/dynatrace.services/explorer?detailsId=${entityDetails.entityId}&sidebarOpen=false`
      } else if (entityDetails.type == "HOST") {
        resp += `You can find more information about the host at ${dtEnvironment}/ui/apps/dynatrace.infraops/hosts/${entityDetails.entityId}`
      } else if (entityDetails.type == "KUBERNETES_CLUSTER") {
        resp += `You can find more information about the cluster at ${dtEnvironment}/ui/apps/dynatrace.infraops/kubernetes/${entityDetails.entityId}`
      } else if (entityDetails.type == "CLOUD_APPLICATION") {
        resp += `You can find more details about the application at ${dtEnvironment}/ui/apps/dynatrace.kubernetes/explorer/workload?detailsId=${entityDetails.entityId}`
      }

      return resp;
    }
  )

  tool(
    "send_slack_message",
    "Sends a Slack message to a dedicated Slack Channel via Slack Connector on Dynatrace",
    {
      channel: z.string().optional(),
      message: z.string().optional()
    },
    async ({channel, message}) => {
      const response = await sendSlackMessage(dtClient, slackConnectionId, channel, message);

      return `Message sent to Slack channel: ${JSON.stringify(response)}`;
    }
  )

  tool(
    "get_logs_for_entity",
    "Get Logs for a monitored entity based on name of the entity on Dynatrace",
    {
      entityName: z.string().optional()
    },
    async ({entityName}) => {
      const logs = await getLogsForEntity(dtClient, entityName);

      return `Logs:\n${JSON.stringify(logs?.map(logLine => logLine?logLine.content:'Empty log'))}`;
    }
  )

  tool(
    "verify_dql",
    "Verify a Dynatrace Query Language (DQL) statement on Dynatrace GRAIL before executing it. This is useful to ensure that the DQL statement is valid and can be executed without errors.",
    {
      dqlStatement: z.string()
    },
    async ({dqlStatement}) => {
      const response = await verifyDqlStatement(dtClient, dqlStatement);

      let resp = 'DQL Statement Verification:\n';

      if (response.notifications && response.notifications.length > 0) {
        resp += `Please consider the following notifications for adapting the your DQL statement:\n`;
        response.notifications.forEach(
          (notification) => {
            resp += `* ${notification.severity}: ${notification.message}\n`;
          }
        );
      }

      if (response.valid) {
        resp += `The DQL statement is valid - you can use the "execute_dql" tool.\n`;
      } else {
        resp += `The DQL statement is invalid. Please adapt your statement.\n`;
      }

      return resp;
    }
  )

  tool(
    "execute_dql",
    'Execute Dynatrace Query Language (DQL) to retrieve logs, metrics, spans, or events from Dynatrace GRAIL. DQL is the most powerful way to query any data in Dynatrace, including problem events, security issues, logs, metrics, spans, and custom data. Always use "verify_dql" tool before you execute a DQL statement. A valid statement looks like this: "fetch [logs, metrics, spans, events] | filter <some-filter> | summarize count(), by:{some-fields}. Adapt filters for certain attributes: `traceId` could be `trace_id` or `trace.id`.',
    {
      dqlStatement: z.string()
    },
    async ({dqlStatement}) => {
      const response = await executeDql(dtClient, dqlStatement);

      return `DQL Response: ${JSON.stringify(response)}`;
    }
  );


  tool(
    "create_workflow_for_notification",
    "Create a notification for a team based on a problem type within Workflows in Dynatrace",
    {
      problemType: z.string().optional(),
      teamName: z.string().optional(),
      channel: z.string().optional(),
      isPrivate: z.boolean().optional().default(false)
    },
    async ({problemType, teamName, channel, isPrivate}) => {
      const response = await createWorkflowForProblemNotification(dtClient, teamName, channel, problemType, isPrivate);

      let resp = `Workflow Created: ${response?.id} with name ${response?.title}.\nYou can access the Workflow via the following link: ${dtEnvironment}/ui/apps/dynatrace.automations/workflows/${response?.id}.\nTell the user to inspect the Workflow by visiting the link.\n`;

      if (response.type == "SIMPLE") {
        resp += `Note: This is a simple workflow. Workflow-hours will not be billed.\n`;
      } else if (response.type == "STANDARD") {
        resp += `Note: This is a standard workflow. Workflow-hours will be billed.\n`;
      }

      if (isPrivate) {
        resp += `This workflow is private and can only be accessed by the owner of the authentication credentials. In case you can not access it, you can instruct me to make the workflow public.`;
      }

      return resp;
    }
  )

  tool(
    "make_workflow_public",
    "Modify a workflow and make it publicly available to everyone on the Dynatrace Environment",
    {
      workflowId: z.string().optional()
    },
    async ({workflowId}) => {
      const response = await updateWorkflow(dtClient, workflowId, {
        isPrivate: false,
      });

      return `Workflow ${response.id} is now public!\nYou can access the Workflow via the following link: ${dtEnvironment}/ui/apps/dynatrace.automations/workflows/${response?.id}.\nTell the user to inspect the Workflow by visiting the link.\n`;
    }
  )

  tool(
    "get_kubernetes_events",
    "Get all events from a specific Kubernetes (K8s) cluster",
    {
      clusterId: z.string().optional().describe(`The Kubernetes (K8s) Cluster Id, referred to as k8s.cluster.uid (this is NOT the Dynatrace environment)`)
    },
    async ({clusterId}) => {
      const events = await getEventsForCluster(dtClient, clusterId);

      return `Kubernetes Events:\n${JSON.stringify(events)}`;
    }
  )

  tool(
    "get_ownership",
    "Get detailed Ownership information for one or multiple entities on Dynatrace",
    {
      entityIds: z.string().optional().describe("Comma separated list of entityIds"),
    },
    async ({entityIds}) => {
      console.error(`Fetching ownership for ${entityIds}`);
      const ownershipInformation = await getOwnershipInformation(dtClient, entityIds);
      console.error(`Done!`);
      let resp = 'Ownership information:\n';
      resp += JSON.stringify(ownershipInformation);
      return resp;
    }
  )

  tool(
    "get_entity_metrics",
    "Get comprehensive real-time metrics and performance data for any entity. This provides CPU, memory, response time, throughput, and error rate data.",
    {
      entityId: z.string().describe("The entity ID to get metrics for"),
      metricSelector: z.string().optional().describe("Optional specific metrics to retrieve (comma-separated)"),
      timeframe: z.string().optional().default('1h').describe("Timeframe for metrics: '1h', '24h' (default: '1h')")
    },
    async ({entityId, metricSelector, timeframe}) => {
      const metrics = await getEntityMetrics(dtClient, entityId, metricSelector, timeframe);
      
      let resp = `Metrics for ${metrics.entityName} (ID: ${metrics.entityId}):\n\n`;
      
      // Summary section
      if (metrics.summary) {
        resp += `📊 Performance Summary:\n`;
        if (metrics.summary.cpuUsage !== undefined) {
          resp += `  - CPU Usage: ${metrics.summary.cpuUsage.toFixed(2)}%\n`;
        }
        if (metrics.summary.memoryUsage !== undefined) {
          resp += `  - Memory Usage: ${metrics.summary.memoryUsage.toFixed(2)}%\n`;
        }
        if (metrics.summary.responseTime !== undefined) {
          resp += `  - Response Time: ${metrics.summary.responseTime.toFixed(2)}ms\n`;
        }
        if (metrics.summary.throughput !== undefined) {
          resp += `  - Throughput: ${metrics.summary.throughput.toFixed(2)} req/s\n`;
        }
        if (metrics.summary.errorRate !== undefined) {
          resp += `  - Error Rate: ${metrics.summary.errorRate.toFixed(2)}%\n`;
        }
        resp += `\n`;
      }
      
      // Detailed metrics
      resp += `📈 Detailed Metrics:\n`;
      Object.entries(metrics.metrics).forEach(([metricId, metricData]) => {
        if (metricData.dataPoints.length > 0) {
          const latestValue = metricData.dataPoints[metricData.dataPoints.length - 1].value;
          resp += `  - ${metricId}: ${latestValue.toFixed(2)} ${metricData.unit}\n`;
        }
      });
      
      return resp;
    }
  )

  tool(
    "get_trace_details",
    "Get detailed distributed tracing information for a specific trace ID. This shows the complete request flow across services.",
    {
      traceId: z.string().describe("The trace ID to get details for")
    },
    async ({traceId}) => {
      const trace = await getTraceDetails(dtClient, traceId);
      
      let resp = `🔍 Trace Details for ${traceId}:\n\n`;
      resp += `Service: ${trace.serviceName}\n`;
      resp += `Operation: ${trace.operationName}\n`;
      resp += `Duration: ${trace.duration.toFixed(2)}ms\n`;
      resp += `Status: ${trace.status}\n`;
      resp += `Total Spans: ${trace.summary.totalSpans}\n`;
      resp += `Error Spans: ${trace.summary.errorSpans}\n\n`;
      
      if (trace.summary.slowestSpan) {
        resp += `🐌 Slowest Span: ${trace.summary.slowestSpan.serviceName} - ${trace.summary.slowestSpan.operationName} (${trace.summary.slowestSpan.duration.toFixed(2)}ms)\n\n`;
      }
      
      if (trace.summary.errorSpansList.length > 0) {
        resp += `❌ Error Spans:\n`;
        trace.summary.errorSpansList.forEach((span) => {
          resp += `  - ${span.serviceName}: ${span.operationName}\n`;
        });
        resp += `\n`;
      }
      
      resp += `📋 Span Details:\n`;
      trace.spans.slice(0, 10).forEach((span, index) => {
        resp += `  ${index + 1}. ${span.serviceName} - ${span.operationName} (${span.duration.toFixed(2)}ms) [${span.status}]\n`;
      });
      
      if (trace.spans.length > 10) {
        resp += `  ... and ${trace.spans.length - 10} more spans\n`;
      }
      
      return resp;
    }
  )

  tool(
    "get_service_traces",
    "Get recent traces for a specific service to understand request patterns and performance.",
    {
      serviceId: z.string().describe("The service ID to get traces for"),
      timeframe: z.string().optional().default('1h').describe("Timeframe: '1h', '24h' (default: '1h')"),
      limit: z.number().optional().default(5).describe("Maximum number of traces to retrieve (default: 5)")
    },
    async ({serviceId, timeframe, limit}) => {
      const traces = await getServiceTraces(dtClient, serviceId, timeframe, limit);
      
      if (traces.length === 0) {
        return "No traces found for this service";
      }
      
      let resp = `🔍 Recent Traces for Service (${traces.length} found):\n\n`;
      
      traces.forEach((trace, index) => {
        resp += `${index + 1}. Trace ${trace.traceId}\n`;
        resp += `   - Operation: ${trace.operationName}\n`;
        resp += `   - Duration: ${trace.duration.toFixed(2)}ms\n`;
        resp += `   - Status: ${trace.status}\n`;
        resp += `   - Spans: ${trace.summary.totalSpans} (${trace.summary.errorSpans} errors)\n\n`;
      });
      
      return resp;
    }
  )

  tool(
    "get_davis_copilot_skills",
    "Get available Davis CoPilot skills. This shows which AI capabilities are available in your Dynatrace environment.",
    {},
    async ({}) => {
      const skills = await getAvailableSkills(dtClient);
      
      if (!skills.skills || skills.skills.length === 0) {
        return "No Davis CoPilot skills available. Please ensure Davis CoPilot is enabled for your environment.";
      }
      
      let resp = `🤖 Davis CoPilot Skills Available:\n\n`;
      
      skills.skills.forEach((skill) => {
        switch (skill) {
          case 'conversation':
            resp += `💬 **Conversation** - Chat with Davis CoPilot for assistance\n`;
            break;
          case 'nl2dql':
            resp += `🔤 **Natural Language to DQL** - Convert natural language to Dynatrace Query Language\n`;
            break;
          case 'dql2nl':
            resp += `📝 **DQL to Natural Language** - Explain DQL queries in plain English\n`;
            break;
          default:
            resp += `❓ **${skill}** - Unknown skill type\n`;
        }
      });
      
      resp += `\nUse the other Davis CoPilot tools to interact with these capabilities.`;
      
      return resp;
    }
  )

  tool(
    "generate_dql_from_natural_language",
    "Convert natural language queries to Dynatrace Query Language (DQL) using Davis CoPilot AI. DQL is the most powerful way to query any data in Dynatrace, including problem events, security issues, logs, metrics, spans, and custom data. This helps you write powerful DQL queries without knowing the exact syntax. Workflow: 1) Generate DQL, 2) Verify with verify_dql tool, 3) Execute with execute_dql tool, 4) Iterate if results don't match expectations. *(Note: Davis CoPilot AI is GA, but the Davis CoPilot APIs are in preview)*",
    {
      text: z.string().describe("Natural language description of what you want to query. Be specific and include time ranges, entities, and metrics of interest.")
    },
    async ({text}) => {
      const response = await generateDqlFromNaturalLanguage(dtClient, text);
      
      let resp = `🔤 Natural Language to DQL:\n\n`;
      resp += `**Query:** "${text}"\n\n`;
      resp += `**Generated DQL:**\n\`\`\`\n${response.dql}\n\`\`\`\n\n`;
      resp += `**Status:** ${response.status}\n`;
      resp += `**Message Token:** ${response.messageToken}\n`;
      
      if (response.metadata?.notifications && response.metadata.notifications.length > 0) {
        resp += `\n**Notifications:**\n`;
        response.metadata.notifications.forEach((notification) => {
          resp += `- ${notification.severity}: ${notification.message}\n`;
        });
      }
      
      resp += `\n💡 **Next Steps:**\n`;
      resp += `1. Use "verify_dql" tool to validate this query\n`;
      resp += `2. Use "execute_dql" tool to run the query\n`;
      resp += `3. If results don't match expectations, refine your natural language description and try again\n`;
      
      return resp;
    }
  )

  tool(
    "explain_dql_in_natural_language",
    "Explain Dynatrace Query Language (DQL) statements in natural language using Davis CoPilot AI. DQL is the most powerful way to query any data in Dynatrace, including problem events, security issues, logs, metrics, spans, and custom data. This helps you understand what complex DQL queries do. *(Note: Davis CoPilot AI is GA, but the Davis CoPilot APIs are in preview)*",
    {
      dql: z.string().describe("The DQL statement to explain")
    },
    async ({dql}) => {
      const response = await explainDqlInNaturalLanguage(dtClient, dql);
      
      let resp = `📝 DQL to Natural Language:\n\n`;
      resp += `**DQL Query:**\n\`\`\`\n${dql}\n\`\`\`\n\n`;
      resp += `**Summary:** ${response.summary}\n\n`;
      resp += `**Detailed Explanation:**\n${response.explanation}\n\n`;
      resp += `**Status:** ${response.status}\n`;
      resp += `**Message Token:** ${response.messageToken}\n`;
      
      if (response.metadata?.notifications && response.metadata.notifications.length > 0) {
        resp += `\n**Notifications:**\n`;
        response.metadata.notifications.forEach((notification) => {
          resp += `- ${notification.severity}: ${notification.message}\n`;
        });
      }
      
      return resp;
    }
  )

  tool(
    "chat_with_davis_copilot",
    "Chat with Davis CoPilot AI for assistance with Dynatrace questions, troubleshooting, and guidance. This provides contextual help based on your environment. *(Note: Davis CoPilot AI is GA, but the Davis CoPilot APIs are in preview)*",
    {
      text: z.string().describe("Your question or request for Davis CoPilot"),
      context: z.string().optional().describe("Optional context to provide additional information"),
      instruction: z.string().optional().describe("Optional instruction for how to format the response")
    },
    async ({text, context, instruction}) => {
      const conversationContext: any[] = [];
      
      if (context) {
        conversationContext.push({
          type: "supplementary",
          value: context
        });
      }
      
      if (instruction) {
        conversationContext.push({
          type: "instruction",
          value: instruction
        });
      }
      
      const response = await chatWithDavisCopilot(dtClient, text, conversationContext);
      
      let resp = `🤖 Davis CoPilot Response:\n\n`;
      resp += `**Your Question:** "${text}"\n\n`;
      resp += `**Answer:**\n${response.text}\n\n`;
      resp += `**Status:** ${response.status}\n`;
      resp += `**Message Token:** ${response.messageToken}\n`;
      
      if (response.metadata?.sources && response.metadata.sources.length > 0) {
        resp += `\n**Sources:**\n`;
        response.metadata.sources.forEach((source) => {
          resp += `- ${source.title || 'Untitled'}: ${source.url || 'No URL'}\n`;
        });
      }
      
      if (response.metadata?.notifications && response.metadata.notifications.length > 0) {
        resp += `\n**Notifications:**\n`;
        response.metadata.notifications.forEach((notification) => {
          resp += `- ${notification.severity}: ${notification.message}\n`;
        });
      }
      
      if (response.state?.conversationId) {
        resp += `\n**Conversation ID:** ${response.state.conversationId}`;
      }
      
      return resp;
    }
  )

  tool(
    "submit_davis_copilot_feedback",
    "Submit feedback for Davis CoPilot responses to help improve the AI. This can be used for any Davis CoPilot interaction.",
    {
      messageToken: z.string().describe("The message token from the Davis CoPilot response"),
      feedbackType: z.enum(["positive", "negative"]).describe("Whether the response was helpful"),
      feedbackText: z.string().optional().describe("Optional detailed feedback text"),
      origin: z.string().optional().default("Dynatrace MCP Server").describe("Origin of the feedback")
    },
    async ({messageToken, feedbackType, feedbackText, origin}) => {
      const feedbackRequest = {
        messageToken,
        origin,
        feedback: {
          type: feedbackType,
          text: feedbackText
        }
      };
      
      try {
        await submitConversationFeedback(dtClient, feedbackRequest);
        return `✅ Feedback submitted successfully!\n\n**Type:** ${feedbackType}\n**Message Token:** ${messageToken}\n${feedbackText ? `**Feedback:** ${feedbackText}` : ''}`;
      } catch (error) {
        return `❌ Failed to submit feedback: ${error.message}`;
      }
    }
  )

  const transport = new StdioServerTransport();

  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("Dynatrace MCP Server running on stdio");
};

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

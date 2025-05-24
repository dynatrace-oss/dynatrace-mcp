#!/usr/bin/env node
import { EnvironmentInformationClient } from '@dynatrace-sdk/client-platform-management-service';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
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
  const oauthClient = process.env.OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.OAUTH_CLIENT_SECRET;
  const dtEnvironment = process.env.DT_ENVIRONMENT;

  const slackConnectionId = process.env.SLACK_CONNECTION_ID || "fake-slack-connection-id";

  // ensure oauthClient and dtEnvironment are set
  if (!oauthClient || !oauthClientSecret || !dtEnvironment) {
    console.error(
      "Please set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET and DT_ENVIRONMENT environment variables",
    );
    process.exit(1);
  }

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

  // quick abstraction/wrapper to make it easier to reply with text
  const tool = (name: string, description: string, paramsSchema: ZodRawShape, cb: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>) => {
		const wrappedCb = async (args: ZodRawShape): Promise<CallToolResult> => {
			try {
				const response = await cb(args);
				return {
					content: [{ type: "text", text: response }],
				};
			} catch (error: any) {
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
    "Verify a DQL statement on Dynatrace",
    {
      dqlStatement: z.string()
    },
    async ({dqlStatement}) => {
      const response = await verifyDqlStatement(dtClient, dqlStatement);
      return `Parsing DQL Statement resulted in: ${JSON.stringify(response)}`;
    }
  )

  tool(
    "execute_dql",
    "Get Logs, Metrics, Spans, Events from Dynatrace by executing a DQL statement. Please use verify_dql tool before you execute a DQL statement.",
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

  const transport = new StdioServerTransport();

  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("Dynatrace MCP Server running on stdio");
};

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

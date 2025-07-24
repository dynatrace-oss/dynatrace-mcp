#!/usr/bin/env node
import { EnvironmentInformationClient } from '@dynatrace-sdk/client-platform-management-service';
import {
  ClientRequestError,
  isApiClientError,
  isApiGatewayError,
  isClientRequestError,
} from '@dynatrace-sdk/shared-errors';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolRequest,
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  NotificationSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { z, ZodRawShape, ZodTypeAny } from 'zod';

import { version as VERSION } from '../package.json';
import { createDtHttpClient } from './authentication/dynatrace-clients';
import { listVulnerabilities } from './capabilities/list-vulnerabilities';
import { listProblems } from './capabilities/list-problems';
import { getMonitoredEntityDetails } from './capabilities/get-monitored-entity-details';
import { getOwnershipInformation } from './capabilities/get-ownership-information';
import { getLogsForEntity } from './capabilities/get-logs-for-entity';
import { getEventsForCluster } from './capabilities/get-events-for-cluster';
import { createWorkflowForProblemNotification } from './capabilities/create-workflow-for-problem-notification';
import { updateWorkflow } from './capabilities/update-workflow';
import { getVulnerabilityDetails } from './capabilities/get-vulnerability-details';
import { executeDql, verifyDqlStatement } from './capabilities/execute-dql';
import { sendSlackMessage } from './capabilities/send-slack-message';
import { findMonitoredEntityByName } from './capabilities/find-monitored-entity-by-name';
import {
  chatWithDavisCopilot,
  explainDqlInNaturalLanguage,
  generateDqlFromNaturalLanguage,
} from './capabilities/davis-copilot';
import { DynatraceEnv, getDynatraceEnv } from './getDynatraceEnv';

config();

let scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
  'app-engine:functions:run', // needed for environmentInformationClient
];

const main = async () => {
  // read Environment variables
  let dynatraceEnv: DynatraceEnv;
  try {
    dynatraceEnv = getDynatraceEnv();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
  console.error(`Initializing Dynatrace MCP Server v${VERSION}...`);
  const { oauthClientId, oauthClientSecret, dtEnvironment, dtPlatformToken, slackConnectionId } = dynatraceEnv;

  console.error(`Starting Dynatrace MCP Server v${VERSION}...`);
  const server = new McpServer(
    {
      name: 'Dynatrace MCP Server',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // quick abstraction/wrapper to make it easier for tools to reply text instead of JSON
  const tool = (
    name: string,
    description: string,
    paramsSchema: ZodRawShape,
    cb: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>,
  ) => {
    const wrappedCb = async (args: ZodRawShape): Promise<CallToolResult> => {
      try {
        const response = await cb(args);
        return {
          content: [{ type: 'text', text: response }],
        };
      } catch (error: any) {
        // check if it's an error originating from the Dynatrace SDK / API Gateway and provide an appropriate message to the user
        if (isClientRequestError(error)) {
          const e: ClientRequestError = error;
          let additionalErrorInformation = '';
          if (e.response.status == 403) {
            additionalErrorInformation =
              'Note: Your user or service-user is most likely lacking the necessary permissions/scopes for this API Call.';
          }
          return {
            content: [
              {
                type: 'text',
                text: `Client Request Error: ${e.message} with HTTP status: ${e.response.status}. ${additionalErrorInformation} (body: ${JSON.stringify(e.body)})`,
              },
            ],
            isError: true,
          };
        }
        // else: We don't know what kind of error happened - best-case we can provide error.message
        console.log(error);
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    };

    server.tool(name, description, paramsSchema, (args) => wrappedCb(args));
  };

  tool('get_environment_info', 'Get information about the connected Dynatrace Environment (Tenant)', {}, async ({}) => {
    // create an oauth-client
    const dtClient = await createDtHttpClient(
      dtEnvironment,
      scopesBase,
      oauthClientId,
      oauthClientSecret,
      dtPlatformToken,
    );
    const environmentInformationClient = new EnvironmentInformationClient(dtClient);

    const environmentInfo = await environmentInformationClient.getEnvironmentInformation();
    let resp = `Environment Information (also referred to as tenant):
          ${JSON.stringify(environmentInfo)}\n`;

    resp += `You can reach it via ${dtEnvironment}\n`;

    return resp;
  });

  tool('list_vulnerabilities', 'List all vulnerabilities from Dynatrace', {}, async ({}) => {
    const dtClient = await createDtHttpClient(
      dtEnvironment,
      scopesBase.concat('environment-api:security-problems:read'),
      oauthClientId,
      oauthClientSecret,
      dtPlatformToken,
    );
    const result = await listVulnerabilities(dtClient);
    if (!result || result.length === 0) {
      return 'No vulnerabilities found';
    }
    let resp = `Found the following vulnerabilities:`;
    result.forEach((vulnerability) => {
      resp += `\n* ${vulnerability}`;
    });

    resp += `\nWe recommend to take a look at ${dtEnvironment}/ui/apps/dynatrace.security.vulnerabilities to get a better overview of vulnerabilities.\n`;

    return resp;
  });

  tool(
    'get_vulnerabilty_details',
    'Get details of a vulnerability by `securityProblemId` on Dynatrace',
    {
      securityProblemId: z.string().optional(),
    },
    async ({ securityProblemId }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('environment-api:security-problems:read'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const result = await getVulnerabilityDetails(dtClient, securityProblemId);

      let resp = `The Security Problem (Vulnerability) ${result.displayId} with securityProblemId ${result.securityProblemId} has the title ${result.title}.\n`;

      resp += `The related CVEs are ${result.cveIds?.join(',') || 'unknown'}.\n`;
      resp += `The description is: ${result.description}.\n`;
      resp += `The remediation description is: ${result.remediationDescription}.\n`;

      if (result.affectedEntities && result.affectedEntities.length > 0) {
        resp += `The vulnerability affects the following entities:\n`;

        result.affectedEntities.forEach((affectedEntity) => {
          resp += `* ${affectedEntity}\n`;
        });
      } else {
        resp += `This vulnerability does not seem to affect any entities.\n';`;
      }

      if (result.codeLevelVulnerabilityDetails) {
        resp += `Please investigate this on code-level: ${JSON.stringify(result.codeLevelVulnerabilityDetails)}\n`;
      }

      if (result.exposedEntities && result.exposedEntities.length > 0) {
        resp += `The vulnerability exposes the following entities:\n`;
        result.exposedEntities.forEach((exposedEntity) => {
          resp += `* ${exposedEntity}\n`;
        });
      } else {
        resp += `This vulnerability does not seem to expose any entities.\n';`;
      }

      if (result.entryPoints?.items) {
        resp += `The following entrypoints are affected:\n`;
        result.entryPoints.items.forEach((entryPoint) => {
          resp += `* ${entryPoint.sourceHttpPath}\n`;
        });

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
    },
  );

  tool(
    'list_problems',
    'List all problems (dt.davis.problems) known on Dynatrace, sorted by their recency. An additional filter can be provided using DQL filter.',
    {
      additionalFilter: z
        .string()
        .optional()
        .describe(
          'Additional filter for DQL statement for dt.davis.problems, e.g., \'entity_tags == array("dt.owner:team-foobar", "tag:tag")\'',
        ),
      maxProblemsToDisplay: z.number().default(10).describe('Maximum number of problems to display in the response.'),
    },
    async ({ additionalFilter, maxProblemsToDisplay }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('storage:events:read', 'storage:buckets:read'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      // get problems (uses fetch)
      const result = await listProblems(dtClient, additionalFilter);
      if (result && result.length > 0) {
        let resp = `Found ${result.length} problems! Displaying the top ${maxProblemsToDisplay} problems:\n`;
        // iterate over dqlResponse and create a string with the problem details, but only show the top maxProblemsToDisplay problems
        result.slice(0, maxProblemsToDisplay).forEach((problem) => {
          if (problem) {
            resp += `Problem ${problem['display_id']} (please refer to this problem with \`problemId\` or \`event.id\` ${problem['problem_id']}))
                  with event.status ${problem['event.status']}, event.category ${problem['event.category']}: ${problem['event.name']} -
                  affects ${problem['affected_users_count']} users and ${problem['affected_entity_count']} entities for a duration of ${problem['duration']}\n`;
          }
        });

        resp +=
          `\nNext Steps:` +
          `\n1. Use "execute_dql" tool with the following query to get more details about a specific problem:
          "fetch dt.davis.problems, from: now()-10h, to: now() | filter event.id == \"<problem-id>\" | fields event.description, event.status, event.category, event.start, event.end,
            root_cause_entity_id, root_cause_entity_name, duration, affected_entities_count,
            event_count, affected_users_count, problem_id, dt.davis.mute.status, dt.davis.mute.user,
            entity_tags, labels.alerting_profile, maintenance.is_under_maintenance,
            aws.account.id, azure.resource.group, azure.subscription, cloud.provider, cloud.region,
            dt.cost.costcenter, dt.cost.product, dt.host_group.id, dt.security_context, gcp.project.id,
            host.name, k8s.cluster.name, k8s.cluster.uid, k8s.container.name, k8s.namespace.name, k8s.node.name, k8s.pod.name, k8s.service.name, k8s.workload.kind, k8s.workload.name"` +
          `\n2. Use "chat_with_davis_copilot" tool and provide \`problemId\` as context, to get insights about a specific problem via Davis Copilot.` +
          `\n3. Tell the user to visit ${dtEnvironment}/ui/apps/dynatrace.davis.problems/problem/<problem-id> for more details.`;

        return resp;
      } else {
        return 'No problems found';
      }
    },
  );

  tool(
    'find_entity_by_name',
    'Get the entityId of a monitored entity based on the name of the entity on Dynatrace',
    {
      entityName: z.string(),
    },
    async ({ entityName }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('environment-api:entities:read', 'storage:entities:read'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const entityResponse = await findMonitoredEntityByName(dtClient, entityName);
      return entityResponse;
    },
  );

  tool(
    'get_entity_details',
    'Get details of a monitored entity based on the entityId on Dynatrace',
    {
      entityId: z.string().optional(),
    },
    async ({ entityId }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('environment-api:entities:read'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const entityDetails = await getMonitoredEntityDetails(dtClient, entityId);

      let resp =
        `Entity ${entityDetails.displayName} of type ${entityDetails.type} with \`entityId\` ${entityDetails.entityId}\n` +
        `Properties: ${JSON.stringify(entityDetails.properties)}\n`;

      if (entityDetails.type == 'SERVICE') {
        resp += `You can find more information about the service at ${dtEnvironment}/ui/apps/dynatrace.services/explorer?detailsId=${entityDetails.entityId}&sidebarOpen=false`;
      } else if (entityDetails.type == 'HOST') {
        resp += `You can find more information about the host at ${dtEnvironment}/ui/apps/dynatrace.infraops/hosts/${entityDetails.entityId}`;
      } else if (entityDetails.type == 'KUBERNETES_CLUSTER') {
        resp += `You can find more information about the cluster at ${dtEnvironment}/ui/apps/dynatrace.infraops/kubernetes/${entityDetails.entityId}`;
      } else if (entityDetails.type == 'CLOUD_APPLICATION') {
        resp += `You can find more details about the application at ${dtEnvironment}/ui/apps/dynatrace.kubernetes/explorer/workload?detailsId=${entityDetails.entityId}`;
      }

      return resp;
    },
  );

  tool(
    'send_slack_message',
    'Sends a Slack message to a dedicated Slack Channel via Slack Connector on Dynatrace',
    {
      channel: z.string().optional(),
      message: z.string().optional(),
    },
    async ({ channel, message }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('app-settings:objects:read'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const response = await sendSlackMessage(dtClient, slackConnectionId, channel, message);

      return `Message sent to Slack channel: ${JSON.stringify(response)}`;
    },
  );

  tool(
    'get_logs_for_entity',
    'Get Logs for a monitored entity based on name of the entity on Dynatrace',
    {
      entityName: z.string().optional(),
    },
    async ({ entityName }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('storage:logs:read'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const logs = await getLogsForEntity(dtClient, entityName);

      return `Logs:\n${JSON.stringify(logs?.map((logLine) => (logLine ? logLine.content : 'Empty log')))}`;
    },
  );

  tool(
    'verify_dql',
    'Verify a Dynatrace Query Language (DQL) statement on Dynatrace GRAIL before executing it. This is useful to ensure that the DQL statement is valid and can be executed without errors.',
    {
      dqlStatement: z.string(),
    },
    async ({ dqlStatement }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase,
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const response = await verifyDqlStatement(dtClient, dqlStatement);

      let resp = 'DQL Statement Verification:\n';

      if (response.notifications && response.notifications.length > 0) {
        resp += `Please consider the following notifications for adapting the your DQL statement:\n`;
        response.notifications.forEach((notification) => {
          resp += `* ${notification.severity}: ${notification.message}\n`;
        });
      }

      if (response.valid) {
        resp += `The DQL statement is valid - you can use the "execute_dql" tool.\n`;
      } else {
        resp += `The DQL statement is invalid. Please adapt your statement.\n`;
      }

      return resp;
    },
  );

  tool(
    'execute_dql',
    'Get Logs, Metrics, Spans or Events from Dynatrace GRAIL by executing a Dynatrace Query Language (DQL) statement. Always use "verify_dql" tool before you execute a DQL statement. A valid statement looks like this: "fetch [logs, metrics, spans, events] | filter <some-filter> | summarize count(), by:{some-fields}. Adapt filters for certain attributes: `traceId` could be `trace_id` or `trace.id`.',
    {
      dqlStatement: z.string(),
    },
    async ({ dqlStatement }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat(
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
          'storage:security.events:read', // Read Security events from Grail
        ),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const response = await executeDql(dtClient, dqlStatement);

      return `DQL Response: ${JSON.stringify(response)}`;
    },
  );

  tool(
    'generate_dql_from_natural_language',
    "Convert natural language queries to Dynatrace Query Language (DQL) using Davis CoPilot AI. You can ask for problem events, security issues, logs, metrics, spans, and custom data. Workflow: 1) Generate DQL, 2) Verify with verify_dql tool, 3) Execute with execute_dql tool, 4) Iterate if results don't match expectations.",
    {
      text: z
        .string()
        .describe(
          'Natural language description of what you want to query. Be specific and include time ranges, entities, and metrics of interest.',
        ),
    },
    async ({ text }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('davis-copilot:nl2dql:execute'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );

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
    },
  );

  tool(
    'explain_dql_in_natural_language',
    'Explain Dynatrace Query Language (DQL) statements in natural language using Davis CoPilot AI.',
    {
      dql: z.string().describe('The DQL statement to explain'),
    },
    async ({ dql }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('davis-copilot:dql2nl:execute'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );

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
    },
  );

  tool(
    'chat_with_davis_copilot',
    'Use this tool in case no specific tool is available. Get an answer to any Dynatrace related question as well as troubleshooting, and guidance. *(Note: Davis CoPilot AI is GA, but the Davis CoPilot APIs are in preview)*',
    {
      text: z.string().describe('Your question or request for Davis CoPilot'),
      context: z.string().optional().describe('Optional context to provide additional information'),
      instruction: z.string().optional().describe('Optional instruction for how to format the response'),
    },
    async ({ text, context, instruction }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('davis-copilot:conversations:execute'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );

      const conversationContext: any[] = [];

      if (context) {
        conversationContext.push({
          type: 'supplementary',
          value: context,
        });
      }

      if (instruction) {
        conversationContext.push({
          type: 'instruction',
          value: instruction,
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
    },
  );

  tool(
    'create_workflow_for_notification',
    'Create a notification for a team based on a problem type within Workflows in Dynatrace',
    {
      problemType: z.string().optional(),
      teamName: z.string().optional(),
      channel: z.string().optional(),
      isPrivate: z.boolean().optional().default(false),
    },
    async ({ problemType, teamName, channel, isPrivate }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('automation:workflows:write', 'automation:workflows:read', 'automation:workflows:run'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const response = await createWorkflowForProblemNotification(dtClient, teamName, channel, problemType, isPrivate);

      let resp = `Workflow Created: ${response?.id} with name ${response?.title}.\nYou can access the Workflow via the following link: ${dtEnvironment}/ui/apps/dynatrace.automations/workflows/${response?.id}.\nTell the user to inspect the Workflow by visiting the link.\n`;

      if (response.type == 'SIMPLE') {
        resp += `Note: This is a simple workflow. Workflow-hours will not be billed.\n`;
      } else if (response.type == 'STANDARD') {
        resp += `Note: This is a standard workflow. Workflow-hours will be billed.\n`;
      }

      if (isPrivate) {
        resp += `This workflow is private and can only be accessed by the owner of the authentication credentials. In case you can not access it, you can instruct me to make the workflow public.`;
      }

      return resp;
    },
  );

  tool(
    'make_workflow_public',
    'Modify a workflow and make it publicly available to everyone on the Dynatrace Environment',
    {
      workflowId: z.string().optional(),
    },
    async ({ workflowId }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('automation:workflows:write', 'automation:workflows:read', 'automation:workflows:run'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const response = await updateWorkflow(dtClient, workflowId, {
        isPrivate: false,
      });

      return `Workflow ${response.id} is now public!\nYou can access the Workflow via the following link: ${dtEnvironment}/ui/apps/dynatrace.automations/workflows/${response?.id}.\nTell the user to inspect the Workflow by visiting the link.\n`;
    },
  );

  tool(
    'get_kubernetes_events',
    'Get all events from a specific Kubernetes (K8s) cluster',
    {
      clusterId: z
        .string()
        .optional()
        .describe(
          `The Kubernetes (K8s) Cluster Id, referred to as k8s.cluster.uid (this is NOT the Dynatrace environment)`,
        ),
    },
    async ({ clusterId }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('storage:events:read'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const events = await getEventsForCluster(dtClient, clusterId);

      return `Kubernetes Events:\n${JSON.stringify(events)}`;
    },
  );

  tool(
    'get_ownership',
    'Get detailed Ownership information for one or multiple entities on Dynatrace',
    {
      entityIds: z.string().optional().describe('Comma separated list of entityIds'),
    },
    async ({ entityIds }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('environment-api:entities:read', 'settings:objects:read'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      console.error(`Fetching ownership for ${entityIds}`);
      const ownershipInformation = await getOwnershipInformation(dtClient, entityIds);
      console.error(`Done!`);
      let resp = 'Ownership information:\n';
      resp += JSON.stringify(ownershipInformation);
      return resp;
    },
  );

  const transport = new StdioServerTransport();

  console.error('Connecting server to transport...');
  await server.connect(transport);

  console.error('Dynatrace MCP Server running on stdio');
};

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

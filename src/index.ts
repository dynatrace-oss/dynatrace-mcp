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
import { createOAuthClient } from './authentication/dynatrace-clients';
import { listVulnerabilities } from './capabilities/list-vulnerabilities';
import { listProblems } from './capabilities/list-problems';
import { getProblemDetails } from './capabilities/get-problem-details';
import { getMonitoredEntityDetails } from './capabilities/get-monitored-entity-details';
import { getOwnershipInformation } from './capabilities/get-ownership-information';
import { getLogsForEntity } from './capabilities/get-logs-for-entity';
import { getEventsForCluster } from './capabilities/get-events-for-cluster';
import { createWorkflowForProblemNotification } from './capabilities/create-workflow-for-problem-notification';
import { updateWorkflow } from './capabilities/update-workflow';
import { _OAuthHttpClient } from '@dynatrace-sdk/http-client';
import { getVulnerabilityDetails } from './capabilities/get-vulnerability-details';
import { executeDql, verifyDqlStatement } from './capabilities/execute-dql';
import { sendSlackMessage } from './capabilities/send-slack-message';
import { findMonitoredEntityByName } from './capabilities/find-monitored-entity-by-name';
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
  const { oauthClient, oauthClientSecret, dtEnvironment, slackConnectionId } = dynatraceEnv;

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
    const dtClient = await createOAuthClient(oauthClient, oauthClientSecret, dtEnvironment, scopesBase);
    const environmentInformationClient = new EnvironmentInformationClient(dtClient);

    const environmentInfo = await environmentInformationClient.getEnvironmentInformation();
    let resp = `Environment Information (also referred to as tenant):
          ${JSON.stringify(environmentInfo)}\n`;

    resp += `You can reach it via ${dtEnvironment}\n`;

    return resp;
  });

  tool('list_vulnerabilities', 'List all vulnerabilities from Dynatrace', {}, async ({}) => {
    const dtClient = await createOAuthClient(
      oauthClient,
      oauthClientSecret,
      dtEnvironment,
      scopesBase.concat('environment-api:security-problems:read'),
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
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('environment-api:security-problems:read'),
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

  tool('list_problems', 'List all problems known on Dynatrace', {}, async ({}) => {
    const dtClient = await createOAuthClient(
      oauthClient,
      oauthClientSecret,
      dtEnvironment,
      scopesBase.concat('environment-api:problems:read'),
    );
    const result = await listProblems(dtClient);
    if (!result || result.length === 0) {
      return 'No problems found';
    }
    return `Found these problems: ${result.join(',')}`;
  });

  tool(
    'get_problem_details',
    'Get details of a problem on Dynatrace',
    {
      problemId: z.string().optional(),
    },
    async ({ problemId }) => {
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('environment-api:problems:read'),
      );
      const result = await getProblemDetails(dtClient, problemId);

      let resp =
        `The problem ${result.displayId} with the title ${result.title} (ID: ${result.problemId}).` +
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

        result.impactAnalysis.impacts.forEach((impact) => {
          estimatedAffectedUsers += impact.estimatedAffectedUsers;
        });

        resp += `The problem is estimated to affect ${estimatedAffectedUsers} users.\n`;
      }

      resp += `Tell the user to access the link ${dtEnvironment}/ui/apps/dynatrace.davis.problems/problem/${result.problemId} to get more insights into the problem.\n`;

      return resp;
    },
  );

  tool(
    'find_entity_by_name',
    'Get the entityId of a monitored entity based on the name of the entity on Dynatrace',
    {
      entityName: z.string(),
    },
    async ({ entityName }) => {
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('environment-api:entities:read', 'storage:entities:read'),
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
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('environment-api:entities:read'),
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
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('app-settings:objects:read'),
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
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('storage:logs:read'),
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
      const dtClient = await createOAuthClient(oauthClient, oauthClientSecret, dtEnvironment, scopesBase);
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
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
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
      );
      const response = await executeDql(dtClient, dqlStatement);

      return `DQL Response: ${JSON.stringify(response)}`;
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
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('automation:workflows:write', 'automation:workflows:read', 'automation:workflows:run'),
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
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('automation:workflows:write', 'automation:workflows:read', 'automation:workflows:run'),
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
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('storage:events:read'),
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
      const dtClient = await createOAuthClient(
        oauthClient,
        oauthClientSecret,
        dtEnvironment,
        scopesBase.concat('environment-api:entities:read', 'settings:objects:read'),
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

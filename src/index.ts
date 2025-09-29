#!/usr/bin/env node
import { EnvironmentInformationClient } from '@dynatrace-sdk/client-platform-management-service';
import {
  ClientRequestError,
  isApiClientError,
  isApiGatewayError,
  isClientRequestError,
} from '@dynatrace-sdk/shared-errors';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolRequest,
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  NotificationSchema,
  Tool,
  ToolAnnotations,
  ElicitRequest,
  ElicitResult,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Command } from 'commander';
import { z, ZodRawShape, ZodTypeAny } from 'zod';

import { getPackageJsonVersion } from './utils/version';
import { createDtHttpClient } from './authentication/dynatrace-clients';
import { listVulnerabilities } from './capabilities/list-vulnerabilities';
import { listProblems } from './capabilities/list-problems';
import { getMonitoredEntityDetails } from './capabilities/get-monitored-entity-details';
import { getOwnershipInformation } from './capabilities/get-ownership-information';
import { getEventsForCluster } from './capabilities/get-events-for-cluster';
import { createWorkflowForProblemNotification } from './capabilities/create-workflow-for-problem-notification';
import { updateWorkflow } from './capabilities/update-workflow';
import { executeDql, verifyDqlStatement } from './capabilities/execute-dql';
import { sendSlackMessage } from './capabilities/send-slack-message';
import { sendEmail } from './capabilities/send-email';
import { findMonitoredEntityByName } from './capabilities/find-monitored-entity-by-name';
import {
  chatWithDavisCopilot,
  explainDqlInNaturalLanguage,
  generateDqlFromNaturalLanguage,
} from './capabilities/davis-copilot';
import { DynatraceEnv, getDynatraceEnv } from './getDynatraceEnv';
import { createTelemetry, Telemetry } from './utils/telemetry-openkit';
import { getEntityTypeFromId } from './utils/dynatrace-entity-types';
import { Http2ServerRequest } from 'node:http2';
import { resetGrailBudgetTracker, getGrailBudgetTracker } from './utils/grail-budget-tracker';
import { read } from 'node:fs';

// Load environment variables from .env file if available, and suppress warnings/logging to stdio
// as it breaks MCP communication when using stdio transport
const dotEnvOutput = config({ quiet: true });

if (dotEnvOutput.error) {
  // Only log error if it's not about missing .env file
  if ((dotEnvOutput.error as NodeJS.ErrnoException).code !== 'ENOENT') {
    console.error('Error loading .env file:', dotEnvOutput.error);
    process.exit(1);
  }
} else {
  // Successfully loaded .env file
  console.error(
    `.env file loaded successfully - loaded ${dotEnvOutput.parsed ? Object.keys(dotEnvOutput.parsed).length : 0} environment variables: ${Object.keys(dotEnvOutput.parsed || {}).join(', ')}`,
  );
}

let scopesBase = [
  'app-engine:apps:run', // needed for environmentInformationClient
  'app-engine:functions:run', // needed for environmentInformationClient
];

/**
 * Performs a connection test to the Dynatrace environment.
 * Throws an error if the connection or authentication fails.
 */
async function testDynatraceConnection(
  dtEnvironment: string,
  oauthClientId?: string,
  oauthClientSecret?: string,
  dtPlatformToken?: string,
) {
  const dtClient = await createDtHttpClient(
    dtEnvironment,
    scopesBase,
    oauthClientId,
    oauthClientSecret,
    dtPlatformToken,
  );
  const environmentInformationClient = new EnvironmentInformationClient(dtClient);
  // This call will fail if authentication is incorrect.
  await environmentInformationClient.getEnvironmentInformation();
}

function handleClientRequestError(error: ClientRequestError): string {
  let additionalErrorInformation = '';
  if (error.response.status === 403) {
    additionalErrorInformation =
      'Note: Your user or service-user is most likely lacking the necessary permissions/scopes for this API Call.';
  }
  return `Client Request Error: ${error.message} with HTTP status: ${error.response.status}. ${additionalErrorInformation} (body: ${JSON.stringify(error.body)})`;
}

/**
 * Try to connect to Dynatrace environment with retries and exponential backoff.
 */
async function retryTestDynatraceConnection(
  dtEnvironment: string,
  oauthClientId?: string,
  oauthClientSecret?: string,
  dtPlatformToken?: string,
) {
  let retryCount = 0;
  const maxRetries = 3; // Max retries
  const delayMs = 2000; // Initial delay of 2 seconds
  while (true) {
    try {
      console.error(
        `Testing connection to Dynatrace environment: ${dtEnvironment}... (Attempt ${retryCount + 1} of ${maxRetries})`,
      );
      await testDynatraceConnection(dtEnvironment, oauthClientId, oauthClientSecret, dtPlatformToken);
      console.error(`Successfully connected to the Dynatrace environment at ${dtEnvironment}.`);
      break;
    } catch (error: any) {
      console.error(`Error: Could not connect to the Dynatrace environment.`);
      if (isClientRequestError(error)) {
        console.error(handleClientRequestError(error));
      } else {
        console.error(`Error: ${error.message}`);
      }
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error(`Fatal: Maximum number of connection retries (${maxRetries}) exceeded. Exiting.`);
        throw new Error(
          `Failed to connect to Dynatrace environment ${dtEnvironment} after ${maxRetries} attempts. Most likely your configuration is incorrect. Last error: ${error.message}`,
          { cause: error },
        );
      }
      const delay = Math.pow(2, retryCount) * delayMs; // Exponential backoff
      console.error(`Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

const main = async () => {
  console.error(`Initializing Dynatrace MCP Server v${getPackageJsonVersion()}...`);

  // read Environment variables
  let dynatraceEnv: DynatraceEnv;
  try {
    dynatraceEnv = getDynatraceEnv();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  // Unpack environment variables
  const { oauthClientId, oauthClientSecret, dtEnvironment, dtPlatformToken, slackConnectionId, grailBudgetGB } =
    dynatraceEnv;

  // Test connection on startup
  try {
    await retryTestDynatraceConnection(dtEnvironment, oauthClientId, oauthClientSecret, dtPlatformToken);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(2);
  }

  // Ready to start the server
  console.error(`Starting Dynatrace MCP Server v${getPackageJsonVersion()}...`);

  // Initialize usage tracking
  const telemetry = createTelemetry();
  await telemetry.trackMcpServerStart();

  // Create a shutdown handler that takes shutdown operations as parameters
  const shutdownHandler = (...shutdownOps: Array<() => void | Promise<void>>) => {
    return async () => {
      console.error('Shutting down MCP server...');
      for (const op of shutdownOps) {
        await op();
      }
      process.exit(0);
    };
  };

  // Initialize Metadata for MCP Server
  const server = new McpServer(
    {
      name: 'Dynatrace MCP Server',
      version: getPackageJsonVersion(),
    },
    {
      capabilities: {
        tools: {},
        elicitation: {},
      },
    },
  );

  // quick abstraction/wrapper to make it easier for tools to reply text instead of JSON
  const tool = (
    name: string,
    description: string,
    paramsSchema: ZodRawShape,
    annotations: ToolAnnotations,
    cb: (args: z.objectOutputType<ZodRawShape, ZodTypeAny>) => Promise<string>,
  ) => {
    const wrappedCb = async (args: ZodRawShape): Promise<CallToolResult> => {
      // track starttime for telemetry
      const startTime = Date.now();
      // track toolcall for telemetry
      let toolCallSuccessful = false;

      try {
        // call the tool
        const response = await cb(args);
        toolCallSuccessful = true;
        return {
          content: [{ type: 'text', text: response }],
        };
      } catch (error: any) {
        // Track error
        telemetry.trackError(error, `tool_${name}`).catch((e) => console.warn('Failed to track error:', e));

        // check if it's an error originating from the Dynatrace SDK / API Gateway and provide an appropriate message to the user
        if (isClientRequestError(error)) {
          return {
            content: [{ type: 'text', text: handleClientRequestError(error) }],
            isError: true,
          };
        }
        // else: We don't know what kind of error happened - best-case we can provide error.message
        console.log(error);
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      } finally {
        // Track tool usage
        const duration = Date.now() - startTime;
        telemetry
          .trackMcpToolUsage(name, toolCallSuccessful, duration)
          .catch((e) => console.warn('Failed to track tool usage:', e));
      }
    };

    server.tool(name, description, paramsSchema, annotations, (args: z.ZodRawShape) => wrappedCb(args));
  };

  /**
   * Helper function to request human approval for potentially sensitive operations
   * @param operation - Description of the operation requiring approval
   * @returns Promise<boolean> - true if approved, false if declined or cancelled
   */
  const requestHumanApproval = async (operation: string): Promise<boolean> => {
    try {
      const result = await server.server.elicitInput({
        message: `Please review: ${operation}`,
        requestedSchema: {
          type: 'object',
          properties: {
            approval: {
              type: 'boolean',
              title: 'Approve this operation?',
              description: 'Select true to approve this operation, or false to decline.',
              default: false,
            },
          },
          required: ['approval'],
        },
      });

      if (result.action === 'accept' && result.content?.approval === true) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to elicit human approval:', error);
      return false; // Default to deny if elicitation fails
    }
  };

  /** Tool Definitions below */

  tool(
    'get_environment_info',
    'Get information about the connected Dynatrace Environment (Tenant) and verify the connection and authentication.',
    {},
    {
      readOnlyHint: true,
    },
    async ({}) => {
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
    },
  );

  tool(
    'list_vulnerabilities',
    'List all non-muted vulnerabilities from Dynatrace for the last 30 days. An additional filter can be provided using DQL filter.',
    {
      riskScore: z
        .number()
        .optional()
        .default(8.0)
        .describe('Minimum risk score of vulnerabilities to list (default: 8.0)'),
      additionalFilter: z
        .string()
        .optional()
        .describe(
          'Additional filter for DQL statement for vulnerabilities, e.g., \'vulnerability.stack == "CODE_LIBRARY"\' or \'vulnerability.risk.level == "CRITICAL"\' or \'affected_entity.name contains "prod"\' or \'vulnerability.davis_assessment.exposure_status == "PUBLIC_NETWORK"\'',
        ),
      maxVulnerabilitiesToDisplay: z
        .number()
        .default(25)
        .describe('Maximum number of vulnerabilities to display in the response.'),
    },
    {
      readOnlyHint: true,
    },
    async ({ riskScore, additionalFilter, maxVulnerabilitiesToDisplay }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat(
          'storage:events:read',
          'storage:buckets:read',
          'storage:security.events:read', // Read Security events from Grail
        ),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const result = await listVulnerabilities(dtClient, additionalFilter, riskScore);
      if (!result || result.length === 0) {
        return 'No vulnerabilities found in the last 30 days';
      }
      let resp = `Found ${result.length} problems in the last 30 days! Displaying the top ${maxVulnerabilitiesToDisplay} problems:\n`;
      result.slice(0, maxVulnerabilitiesToDisplay).forEach((vulnerability) => {
        resp += `\n* ${vulnerability}`;
      });

      resp +=
        `\nNext Steps:` +
        `\n1. For specific vulnerabilities, first always fetch more details using the "execute_dql" tool and the following query:
          "fetch security.events, from: now()-30d, to: now()
            | filter event.provider=="Dynatrace"
                    AND event.type=="VULNERABILITY_STATE_REPORT_EVENT"
                    AND event.level=="ENTITY"
            | filter vulnerability.id == "<vulnerability-id>"
            | dedup {vulnerability.display_id, affected_entity.id}, sort:{timestamp desc}

            | fields vulnerability.external_id, vulnerability.display_id, vulnerability.external_url, vulnerability.cvss.vector, vulnerability.type, vulnerability.risk.score,
                    vulnerability.stack, vulnerability.remediation.description, vulnerability.parent.davis_assessment.score,
                    affected_entity.name, affected_entity.affected_processes.names, affected_entity.vulnerable_functions,
                    related_entities.databases.count, related_entities.databases.ids, related_entities.hosts.ids, related_entities.hosts.names, related_entities.kubernetes_clusters.names, related_entities.kubernetes_workloads.count, related_entities.services.count,
                    // is it muted?
                    vulnerability.resolution.status, vulnerability.parent.mute.status, vulnerability.mute.status,
                    // specific description and code
                    vulnerability.description, vulnerability.technology, vulnerability.code_location.name,
                    // entrypoints (pure paths etc...)
                    entry_points.entry_point_jsons"` +
        `\nThis will give you more details about the vulnerability, including the affected entity, risk score, code-level insights, and remediation actions. Please use this information.` +
        `\n2. For a high-level overview, you can leverage the "chat_with_davis_copilot" tool and provide \`vulnerability.id\` as context.` +
        `\n3. Last but not least, tell the user to visit ${dtEnvironment}/ui/apps/dynatrace.security.vulnerabilities/vulnerabilities/<vulnerability-id> for full details.`;

      return resp;
    },
  );

  tool(
    'list_problems',
    'List all problems (dt.davis.problems) known on Dynatrace, sorted by their recency, for the last 12h. An additional filter can be provided using DQL filter.',
    {
      additionalFilter: z
        .string()
        .optional()
        .describe(
          'Additional filter for DQL statement for dt.davis.problems, e.g., \'entity_tags == array("dt.owner:team-foobar", "tag:tag")\'',
        ),
      maxProblemsToDisplay: z.number().default(10).describe('Maximum number of problems to display in the response.'),
    },
    {
      readOnlyHint: true,
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
      if (result && result.records && result.records.length > 0) {
        let resp = `Found ${result.records.length} problems! Displaying the top ${maxProblemsToDisplay} problems:\n`;
        // iterate over dqlResponse and create a string with the problem details, but only show the top maxProblemsToDisplay problems
        result.records.slice(0, maxProblemsToDisplay).forEach((problem) => {
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
    'Get the entityId of a monitored entity (service, host, process-group, application, kubernetes-node, ...) within the topology based on the name of the entity on Dynatrace',
    {
      entityName: z.string().describe('Name of the entity to search for, e.g., "my-service" or "my-host"'),
    },
    {
      readOnlyHint: true,
    },
    async ({ entityName }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('storage:entities:read'),
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
    {
      readOnlyHint: true,
    },
    async ({ entityId }) => {
      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('storage:entities:read'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );
      const entityDetails = await getMonitoredEntityDetails(dtClient, entityId);

      if (!entityDetails) {
        return `No entity found with entityId: ${entityId}`;
      }

      let resp =
        `Entity ${entityDetails.displayName} of type ${entityDetails.type} with \`entityId\` ${entityDetails.entityId}\n` +
        `Properties: ${JSON.stringify(entityDetails.allProperties)}\n`;

      if (entityDetails.type == 'SERVICE') {
        resp += `You can find more information about the service at ${dtEnvironment}/ui/apps/dynatrace.services/explorer?detailsId=${entityDetails.entityId}&sidebarOpen=false`;
      } else if (entityDetails.type == 'HOST') {
        resp += `You can find more information about the host at ${dtEnvironment}/ui/apps/dynatrace.infraops/hosts/${entityDetails.entityId}`;
      } else if (entityDetails.type == 'KUBERNETES_CLUSTER') {
        resp += `You can find more information about the cluster at ${dtEnvironment}/ui/apps/dynatrace.infraops/kubernetes/${entityDetails.entityId}`;
      } else if (entityDetails.type == 'CLOUD_APPLICATION') {
        resp += `You can find more details about the application at ${dtEnvironment}/ui/apps/dynatrace.kubernetes/explorer/workload?detailsId=${entityDetails.entityId}`;
      }

      resp += `\n\n**Filter**:`;

      // Use entityTypeTable as the filter (e.g., fetch logs | filter dt.entity.service == "SERVICE-1234")
      if (entityDetails.entityTypeTable) {
        resp += ` You can use the following filter to get relevant information from other tools: \`| filter ${entityDetails.entityTypeTable} == "${entityDetails.entityId}"\`. `;
      } else {
        resp += ` Try to use search command as follows: \`| search "${entityDetails.entityId}"\`. `;
      }

      resp += `\n\n**Next Steps**\n\n`;
      resp += `1. Find available metrics for this entity, by using execute_dql tool with the following DQL statement: "fetch metric.series" and the filter defined above\n`;
      resp += `2. Find out whether any problems exist for this entity using the list_problems tool\n`;
      resp += `3. Explore logs for this entity by using execute_dql with "fetch logs" and applying the filter mentioned above'\n`;

      return resp;
    },
  );

  tool(
    'send_slack_message',
    'Sends a Slack message to a dedicated Slack Channel via Slack Connector on Dynatrace',
    {
      channel: z.string(),
      message: z
        .string()
        .describe(
          'Slack markdown supported. Avoid sending sensitive data like log lines. Focus on context, insights, links, and summaries.',
        ),
    },
    {
      // not read-only, not open-world, not destructive
      readOnlyHint: false,
    },
    async ({ channel, message }) => {
      // Request human approval before sending the message
      const approved = await requestHumanApproval(`Send information via Slack to ${channel}`);

      if (!approved) {
        return 'Operation cancelled: Human approval was not granted for sending this Slack message.';
      }

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
    'verify_dql',
    'Verify a Dynatrace Query Language (DQL) statement on Dynatrace GRAIL before executing it. This step is recommended for DQL statements that have been dynamically created by non-expert tools. For statements coming from the `generate_dql_from_natural_language` tool as well as from documentation, this step can be omitted.',
    {
      dqlStatement: z.string(),
    },
    {
      readOnlyHint: true,
      idempotentHint: true, // same input always yields same output
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
    'Get Logs, Metrics, Spans or Events from Dynatrace GRAIL by executing a Dynatrace Query Language (DQL) statement. ' +
      'You can also use the "generate_dql_from_natural_language" tool upfront to generate or refine a DQL statement based on your request. ' +
      'Note: For more information about available fields for filters and aggregation, use the query "fetch dt.semantic_dictionary.models | filter data_object == \"logs\""',
    {
      dqlStatement: z
        .string()
        .describe(
          'DQL Statement (Ex: "fetch [logs, spans, events] | filter <some-filter> | summarize count(), by:{some-fields}.", or for metrics: "timeseries { avg(<metric-name>), value.A = avg(<metric-name>, scalar: true) }")',
        ),
    },
    {
      // not readonly (DQL statements may modify things), not idempotent (may change over time)
      readOnlyHint: false,
      idempotentHint: false,
      // while we are not strictly talking to the open world here, the response from execute DQL could interpreted as a web-search, which often is referred to open-world
      openWorldHint: true,
    },
    async ({ dqlStatement }) => {
      // Create a HTTP Client that has all storage:*:read scopes
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
      const response = await executeDql(dtClient, { query: dqlStatement }, grailBudgetGB);

      if (!response) {
        return 'DQL execution failed or returned no result.';
      }

      let result = `📊 **DQL Query Results**\n\n`;

      // Budget warning comes first if present
      if (response.budgetWarning) {
        result += `${response.budgetWarning}\n\n`;
      }

      // Cost and Performance Information
      if (response.scannedRecords !== undefined) {
        result += `- **Scanned Records:** ${response.scannedRecords.toLocaleString()}\n`;
      }

      if (response.scannedBytes !== undefined) {
        const scannedGB = response.scannedBytes / (1000 * 1000 * 1000);
        result += `- **Scanned Bytes:** ${scannedGB.toFixed(2)} GB`;

        // Show budget status if available
        if (response.budgetState) {
          const usagePercentage =
            (response.budgetState.totalBytesScanned / response.budgetState.budgetLimitBytes) * 100;
          result += ` (Session total: ${(response.budgetState.totalBytesScanned / (1000 * 1000 * 1000)).toFixed(2)} GB / ${response.budgetState.budgetLimitGB} GB budget, ${usagePercentage.toFixed(1)}% used)`;
        }
        result += '\n';

        if (scannedGB > 500) {
          result += `    ⚠️ **Very High Data Usage Warning:** This query scanned ${scannedGB.toFixed(1)} GB of data, which may impact your Dynatrace consumption. Please take measures to optimize your query, like limiting the timeframe or selecting a bucket.\n`;
        } else if (scannedGB > 50) {
          result += `    ⚠️ **High Data Usage Warning:** This query scanned ${scannedGB.toFixed(2)} GB of data, which may impact your Dynatrace consumption.\n`;
        } else if (scannedGB > 5) {
          result += `    💡 **Moderate Data Usage:** This query scanned ${scannedGB.toFixed(2)} GB of data.\n`;
        } else if (response.scannedBytes === 0) {
          result += `    💡 **No Data consumed:** This query did not consume any data.\n`;
        }
      }

      if (response.sampled !== undefined && response.sampled) {
        result += `- **⚠️ Sampling Used:** Yes (results may be approximate)\n`;
      }

      result += `\n📋 **Query Results**: (${response.records?.length || 0} records):\n\n`;
      result += `\`\`\`json\n${JSON.stringify(response.records, null, 2)}\n\`\`\``;

      return result;
    },
  );

  tool(
    'generate_dql_from_natural_language',
    'Convert natural language queries to Dynatrace Query Language (DQL) using Davis CoPilot AI. You can ask for problem events, security issues, logs, metrics, spans, and custom data.',
    {
      text: z
        .string()
        .describe(
          'Natural language description of what you want to query. Be specific and include time ranges, entities, and metrics of interest.',
        ),
    },
    {
      readOnlyHint: true,
      idempotentHint: true,
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
      if (response.dql) {
        // Typically, the DQL response is empty if status == FAILED
        resp += `**Generated DQL:**\n\`\`\`\n${response.dql}\n\`\`\`\n\n`;
      }
      resp += `**Status:** ${response.status}\n`;
      resp += `**Message Token:** ${response.messageToken}\n`;

      if (response.metadata?.notifications && response.metadata.notifications.length > 0) {
        resp += `\n**Notifications:**\n`;
        response.metadata.notifications.forEach((notification) => {
          resp += `- ${notification.severity}: ${notification.message}\n`;
        });
      }

      if (response.status != 'FAILED') {
        resp += `\n💡 **Next Steps:**\n`;
        resp += `1. Use "execute_dql" tool to run the query (you can omit running the "verify_dql" tool)\n`;
        resp += `2. If results don't match expectations, refine your natural language description and try again\n`;
      }

      return resp;
    },
  );

  tool(
    'explain_dql_in_natural_language',
    'Explain Dynatrace Query Language (DQL) statements in natural language using Davis CoPilot AI.',
    {
      dql: z.string().describe('The DQL statement to explain'),
    },
    {
      readOnlyHint: true,
      idempotentHint: true,
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
    {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true, // web-search like characteristics
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
      if (response.text) {
        // Typically, text is empty if status is FAILED
        resp += `**Answer:**\n${response.text}\n\n`;
      }
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

      if (response.status == 'FAILED') {
        resp += `\n❌ **Your request was not successful**\n`;
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
    {
      // not read only, not idempotent
      readOnlyHint: false,
      idempotentHint: false, // creating the same workflow multiple times is possible
    },
    async ({ problemType, teamName, channel, isPrivate }) => {
      // ask for human approval
      const approved = await requestHumanApproval(
        `Create a workflow for notifying team ${teamName} via ${channel} about ${problemType} problems`,
      );

      if (!approved) {
        return 'Operation cancelled: Human approval was not granted for creating this workflow.';
      }

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
    {
      // not read only, but idempotent
      readOnlyHint: false,
      idempotentHint: true, // making the same workflow public multiple times yields the same result
    },
    async ({ workflowId }) => {
      // ask for human approval
      const approved = await requestHumanApproval(
        `Make workflow ${workflowId} publicly available to everyone on the Dynatrace Environment`,
      );

      if (!approved) {
        return 'Operation cancelled: Human approval was not granted for making this workflow public.';
      }

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
    {
      readOnlyHint: true,
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
    {
      readOnlyHint: true,
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

  tool(
    'reset_grail_budget',
    'Reset the Grail query budget after it was exhausted, allowing new queries to be executed. This clears all tracked bytes scanned in the current session.',
    {},
    {
      readonlyHint: false, // modifies state
      idempotentHint: true, // multiple resets yield the same result
    },
    async ({}) => {
      // Reset the global tracker
      resetGrailBudgetTracker();

      // Get a fresh tracker to show the reset state
      const freshTracker = getGrailBudgetTracker(grailBudgetGB);
      const state = freshTracker.getState();

      return `✅ **Grail Budget Reset Successfully!**

Budget status after reset:
- Total bytes scanned: ${state.totalBytesScanned} bytes (0 GB)
- Budget limit: ${state.budgetLimitGB} GB
- Remaining budget: ${state.budgetLimitGB} GB
- Budget exceeded: ${state.isBudgetExceeded ? 'Yes' : 'No'}

You can now execute new Grail queries (DQL, etc.) again. If this happens more often, please consider

- Optimizing your queries (timeframes, bucket selection, filters)
- Creating or optimizing bucket configurations that fit your queries (see https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-bucket-assignment for details)
- Increasing \`DT_GRAIL_QUERY_BUDGET_GB\` in your environment configuration
`;
    },
  );

  tool(
    'send_email',
    'Send an email using the Dynatrace Email API. The sender will be no-reply@apps.dynatrace.com. Maximum 10 recipients total across TO, CC, and BCC.',
    {
      toRecipients: z.array(z.string().email()).describe('Array of email addresses for TO recipients'),
      ccRecipients: z.array(z.string().email()).optional().describe('Array of email addresses for CC recipients'),
      bccRecipients: z.array(z.string().email()).optional().describe('Array of email addresses for BCC recipients'),
      subject: z.string().describe('Subject line of the email'),
      body: z
        .string()
        .describe(
          'Body content of the email (plain text only). Avoid sending sensitive data like log lines. Focus on context, insights, links, and summaries.',
        ),
    },
    {
      openWorldHint: true, // email is as close to the open-world as we can get with our system
    },
    async ({ toRecipients, ccRecipients, bccRecipients, subject, body }) => {
      // Validate total recipients limit (10 max across TO, CC, and BCC)
      const totalRecipients = toRecipients.length + (ccRecipients?.length || 0) + (bccRecipients?.length || 0);

      if (totalRecipients > 10) {
        throw new Error(
          `Total recipients (${totalRecipients}) exceeds maximum limit of 10 across TO, CC, and BCC fields`,
        );
      }

      // Request human approval before sending the email
      const allRecipients = [...toRecipients, ...(ccRecipients || []), ...(bccRecipients || [])];

      const approved = await requestHumanApproval(`Send information via Email to ${allRecipients.join(', ')}`);

      if (!approved) {
        return 'Operation cancelled: Human approval was not granted for sending this email.';
      }

      const dtClient = await createDtHttpClient(
        dtEnvironment,
        scopesBase.concat('email:emails:send'),
        oauthClientId,
        oauthClientSecret,
        dtPlatformToken,
      );

      const emailRequest = {
        toRecipients: { emailAddresses: toRecipients },
        ...(ccRecipients && { ccRecipients: { emailAddresses: ccRecipients } }),
        ...(bccRecipients && { bccRecipients: { emailAddresses: bccRecipients } }),
        subject,
        body: {
          contentType: 'text/plain' as const,
          body,
        },
      };

      const result = await sendEmail(dtClient, emailRequest);

      // Format the structured response into a user-friendly string
      let responseMessage = `Email send request accepted. Request ID: ${result.requestId}\n`;
      responseMessage += `Message: ${result.message}\n`;

      if (result.invalidDestinations && result.invalidDestinations.length > 0) {
        responseMessage += `Invalid destinations: ${result.invalidDestinations.join(', ')}\n`;
      }

      if (result.bouncingDestinations && result.bouncingDestinations.length > 0) {
        responseMessage += `Bouncing destinations: ${result.bouncingDestinations.join(', ')}\n`;
      }

      if (result.complainingDestinations && result.complainingDestinations.length > 0) {
        responseMessage += `Complaining destinations: ${result.complainingDestinations.join(', ')}\n`;
      }

      responseMessage += `\nNext Steps:\n- Delivery is asynchronous.\n- Investigate any invalid, bouncing, or complaining destinations before retrying.`;

      return responseMessage;
    },
  );

  // Parse command line arguments using commander
  const program = new Command();

  program
    .name('dynatrace-mcp-server')
    .description('Dynatrace Model Context Protocol (MCP) Server')
    .version(getPackageJsonVersion())
    .option('--http', 'enable HTTP server mode instead of stdio')
    .option('--server', 'enable HTTP server mode (alias for --http)')
    .option('-p, --port <number>', 'port for HTTP server', '3000')
    .option('-H, --host <host>', 'host for HTTP server', '0.0.0.0')
    .parse();

  const options = program.opts();
  const httpMode = options.http || options.server;
  const httpPort = parseInt(options.port, 10);
  const host = options.host || '0.0.0.0';

  // HTTP server mode (Stateless)
  if (httpMode) {
    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Parse request body for POST requests
      let body: unknown;
      // Create a new Stateless HTTP Transport
      const httpTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // No Session ID needed
      });

      res.on('close', () => {
        // close transport and server, but not the httpServer itself
        httpTransport.close();
        server.close();
      });

      // Connecting MCP-server to HTTP transport
      await server.connect(httpTransport);

      // Handle POST Requests for this endpoint
      if (req.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString();
        try {
          body = JSON.parse(rawBody);
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
      }

      await httpTransport.handleRequest(req, res, body);
    });

    // Start HTTP Server on the specified host and port
    httpServer.listen(httpPort, host, () => {
      console.error(`Dynatrace MCP Server running on HTTP at http://${host}:${httpPort}`);
    });

    // Handle graceful shutdown for http server mode
    process.on(
      'SIGINT',
      shutdownHandler(
        async () => await telemetry.shutdown(),
        () => new Promise<void>((resolve) => httpServer.close(() => resolve())),
      ),
    );
  } else {
    // Default stdio mode
    const transport = new StdioServerTransport();

    console.error('Connecting server to transport...');
    await server.connect(transport);

    console.error('Dynatrace MCP Server running on stdio');

    // Handle graceful shutdown for stdio mode
    process.on(
      'SIGINT',
      shutdownHandler(async () => await telemetry.shutdown()),
    );
    process.on(
      'SIGTERM',
      shutdownHandler(async () => await telemetry.shutdown()),
    );
  }
};

main().catch(async (error) => {
  console.error('Fatal error in main():', error);
  try {
    // report error in main
    const telemetry = createTelemetry();
    await telemetry.trackError(error, 'main_error');
    await telemetry.shutdown();
  } catch (e) {
    console.warn('Failed to track fatal error:', e);
  }
  process.exit(1);
});

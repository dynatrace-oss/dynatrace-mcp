import { HttpClient } from '@dynatrace-sdk/http-client';
import { EventTriggerConfig, WorkflowCreate, WorkflowsClient } from '@dynatrace-sdk/client-automation';

export const createWorkflowForProblemNotification = async (
  dtClient: HttpClient,
  teamName: string,
  channel: string,
  problemType: string,
  isPrivate: boolean,
) => {
  const workflowsclient = new WorkflowsClient(dtClient);

  // Map problem types to categories
  const categories = {
    monitoringUnavailable: false,
    availability: false,
    error: false,
    slowdown: false,
    resource: false,
    custom: false,
    info: false,
  };

  // default trigger config
  let triggerConfig: EventTriggerConfig = {
    type: 'event',
    value: {
      eventType: 'events',
      query: '',
    },
  };

  // special case: Security Problems
  if (problemType.toUpperCase().indexOf('SECURITY') !== -1) {
    triggerConfig.value.query = `event.kind=="SECURITY_EVENT"
        and event.type=="VULNERABILITY_STATUS_CHANGE_EVENT"
        and event.level == "ENTITY"
        and affected_entity.type=="PROCESS_GROUP"
        and event.status_transition=="NEW_OPEN"
        and (vulnerability.risk.level=="CRITICAL" or
        vulnerability.risk.level=="HIGH")`;
  } else {
    // Set the appropriate category based on problem type
    switch (problemType.toUpperCase()) {
      case 'MONITORING_UNAVAILABLE':
        categories.monitoringUnavailable = true;
        break;
      case 'AVAILABILITY':
        categories.availability = true;
        break;
      case 'ERROR':
        categories.error = true;
        break;
      case 'SLOWDOWN':
        categories.slowdown = true;
        break;
      case 'RESOURCE':
        categories.resource = true;
        break;
      case 'CUSTOM':
      case 'CUSTOM_ALERT':
        categories.custom = true;
        break;
      case 'INFO':
        categories.info = true;
        break;
      default:
        // Set custom by default if type doesn't match
        categories.custom = true;
    }

    // davis trigger config
    triggerConfig = {
      type: 'davis-problem',
      value: {
        categories,
      },
    };
  }

  let notificationWorkflow: WorkflowCreate = {
    title: `[MCP POC] Notify team ${teamName} on problem of type ${problemType}`,
    description: `Automatically created workflow to notify team ${teamName} on problems of type ${problemType} - please delete me after the demo!`,
    isPrivate: isPrivate,
    type: 'SIMPLE',
    // define the send_notification task
    tasks: {
      send_notification: {
        name: 'Send notification',
        action: 'dynatrace.slack:slack-send-message',
        description: 'Sends a notification to a Slack channel',
        input: {
          connectionId: 'slack-connection-id',
          channel: `{{ \"${channel}\" }}`,
          message: `🚨 Alert for Team ${teamName}\n*Problem Type*: ${problemType}\n*Problem ID*: {{ event()["display_id"] }}\n*Status*: {{ event()["event.status"] }}\n\n<{{ environment().url }}/ui/apps/dynatrace.davis.problems/problem/{{ event()["event.id"] }}|Click here for details>`,
        },
        active: true,
      },
    },
    // define a trigger
    trigger: {
      eventTrigger: {
        isActive: true,
        triggerConfiguration: triggerConfig,
      },
    },
  };

  return await workflowsclient.createWorkflow({
    body: notificationWorkflow,
  });
};

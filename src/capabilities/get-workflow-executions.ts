import { HttpClient } from '@dynatrace-sdk/http-client';
import { ExecutionsClient } from '@dynatrace-sdk/client-automation';

export const getWorkflowExecutions = async (dtClient: HttpClient, workflowId: string, adminAccess: boolean = false) => {
  const executionsClient = new ExecutionsClient(dtClient);

  return await executionsClient.getExecutions({
    workflow: [workflowId],
    adminAccess,
  });
};

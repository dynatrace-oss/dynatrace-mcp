import { HttpClient } from '@dynatrace-sdk/http-client';
import { WorkflowsClient } from '@dynatrace-sdk/client-automation';

export const getWorkflow = async (dtClient: HttpClient, workflowId: string, adminAccess: boolean = false) => {
  const workflowsClient = new WorkflowsClient(dtClient);

  return await workflowsClient.getWorkflow({
    id: workflowId,
    adminAccess,
  });
};

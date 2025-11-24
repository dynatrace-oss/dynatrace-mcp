import { HttpClient } from '@dynatrace-sdk/http-client';
import { WorkflowsClient } from '@dynatrace-sdk/client-automation';

export const updateWorkflow = async (dtClient: HttpClient, workflowId: string, body: any) => {
  const workflowsClient = new WorkflowsClient(dtClient);

  return await workflowsClient.updateWorkflow({
    id: workflowId,
    body: body,
  });
};

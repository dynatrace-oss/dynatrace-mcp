import { HttpClient } from '@dynatrace-sdk/http-client';
import { ExecutionsClient } from '@dynatrace-sdk/client-automation';

export const getTaskExecutionLog = async (
  dtClient: HttpClient,
  executionId: string,
  taskId: string,
  adminAccess: boolean = false,
) => {
  const executionsClient = new ExecutionsClient(dtClient);

  return await executionsClient.getTaskExecutionLog({
    executionId,
    id: taskId,
    adminAccess,
  });
};

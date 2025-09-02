import { HttpClient } from '@dynatrace-sdk/http-client';
import { ExecutionsClient } from '@dynatrace-sdk/client-automation';

export const getExecution = async (dtClient: HttpClient, executionId: string, adminAccess: boolean = false) => {
  const executionsClient = new ExecutionsClient(dtClient);

  return await executionsClient.getExecution({
    id: executionId,
    adminAccess,
  });
};

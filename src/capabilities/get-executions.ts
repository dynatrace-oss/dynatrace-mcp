import { ExecutionsClient } from '@dynatrace-sdk/client-automation';
import { HttpClient } from '@dynatrace-sdk/http-client';

export const getExecutions = async (dtClient: HttpClient, adminAccess: boolean = false) => {
  const executionsClient = new ExecutionsClient(dtClient);

  return await executionsClient.getExecutions({ adminAccess });
};

import { HttpClient } from '@dynatrace-sdk/http-client';
import { ProblemsClient } from '@dynatrace-sdk/client-classic-environment-v2';

export const getProblemDetails = async (dtClient: HttpClient, problemId: string) => {
  console.error(`Fetchin problem with problemId ${problemId}`);
  const problemsClient = new ProblemsClient(dtClient);
  const problemDetails = await problemsClient.getProblem({
    problemId: problemId,
    fields: 'evidenceDetails,affectedEntities',
  });
  return problemDetails;
};

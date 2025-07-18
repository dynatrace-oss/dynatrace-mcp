import { HttpClient } from '@dynatrace-sdk/http-client';
import { ProblemsClient } from '@dynatrace-sdk/client-classic-environment-v2';

export const listProblems = async (dtClient: HttpClient) => {
  const problemsClient = new ProblemsClient(dtClient);

  const securityProblems = await problemsClient.getProblems({
    pageSize: 100,
  });

  const problems = securityProblems.problems?.map((problem) => {
    return `${problem.displayId} (please refer to this problem with \`problemId\` ${problem.problemId}): ${problem.title}`;
  });

  return problems;
};

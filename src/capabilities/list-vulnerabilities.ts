import { HttpClient } from '@dynatrace-sdk/http-client';
import { SecurityProblemsClient } from '@dynatrace-sdk/client-classic-environment-v2';

export const listVulnerabilities = async (dtClient: HttpClient) => {
  const securityProblemsClient = new SecurityProblemsClient(dtClient);

  const response = await securityProblemsClient.getSecurityProblems({
    sort: '-riskAssessment.riskScore',
    pageSize: 100,
    securityProblemSelector: `minRiskScore("8.0")`,
  });

  const securityProblems = response.securityProblems?.map((secProb) => {
    return `${secProb.displayId} (please refer to this vulnerability with \`securityProblemId\` ${secProb.securityProblemId}): ${secProb.title} (Technology: ${secProb.technology}, External Vulnerability ID: ${secProb.externalVulnerabilityId}, CVE: ${secProb.cveIds?.join(', ')})`;
  });

  return securityProblems;
};

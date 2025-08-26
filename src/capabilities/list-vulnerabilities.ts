import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';

export const listVulnerabilities = async (dtClient: HttpClient, additionalFilter?: string, riskScore?: number) => {
  // DQL query to fetch vulnerabilities with extended timeframe (last 30 days)
  const dqlStatement = `fetch security.events
    | filter dt.system.bucket=="default_securityevents_builtin"
        AND event.provider=="Dynatrace"
        AND event.type=="VULNERABILITY_STATE_REPORT_EVENT"
        AND event.level=="ENTITY"
    // filter for the latest snapshot per entity
    | dedup {vulnerability.display_id, affected_entity.id}, sort:{timestamp desc}
    // filter for open non-muted vulnerabilities with minimum risk score of 8.0
    | filter vulnerability.resolution.status=="OPEN"
        AND vulnerability.risk.score >= ${riskScore || 8.0}
    ${additionalFilter ? `| filter ${additionalFilter}` : ''}
    | sort vulnerability.risk.score desc
    | limit 100`;

  const response = await executeDql(dtClient, {
    query: dqlStatement,
    maxResultRecords: 5000,
    maxResultBytes: 5_000_000, // 5 MB
  });

  if (!response || !response.records || response.records.length === 0) {
    return [];
  }

  const vulnerabilities = response.records.map((vuln: any) => {
    const vulnerabilityId = vuln['vulnerability.id'] || 'N/A';
    const vulnerabilityDisplayId = vuln['vulnerability.display_id'] || 'N/A';
    const riskScore = vuln['vulnerability.risk.score'] || 'N/A';
    const riskLevel = vuln['vulnerability.risk.level'] || 'N/A';
    const title = vuln['vulnerability.title'] || 'Unknown';
    const externalId = vuln['vulnerability.external_id'] || 'N/A';
    const cve = vuln['vulnerability.references.cve'] || 'N/A';
    const affectedEntity = vuln['affected_entity.name'] || 'N/A';
    const vulnerabilityUrl = vuln['vulnerability.url'] || 'N/A';

    // mute status, parent mute status
    const muteStatus = vuln['vulnerability.mute.status'] || 'N/A';
    const parentMuteStatus = vuln['vulnerability.parent.mute.status'] || 'N/A';

    return `${title} (Vulnerability ID: ${vulnerabilityId}, Vulnerability Display ID: ${vulnerabilityDisplayId}, Risk Score: ${riskScore}, Risk Level: ${riskLevel},
              Affected Entity: ${affectedEntity}, External Vulnerability ID: ${externalId}, CVE: ${cve}, Mute Status: ${muteStatus}, Parent Mute Status: ${parentMuteStatus},
              Full Details: ${vulnerabilityUrl})`;
  });

  return vulnerabilities;
};

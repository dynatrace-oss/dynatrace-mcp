import { _OAuthHttpClient } from "@dynatrace-sdk/http-client";
import { SyntheticClient } from '@dynatrace-sdk/client-classic-environment-v2';

export interface SyntheticMonitor {
  entityId: string;
  name: string;
  type: string;
  enabled: boolean;
  frequency: number;
  locations: string[];
  lastTestResult?: {
    status: string;
    responseTime: number;
    timestamp: string;
    location: string;
    errorMessage?: string;
  };
  availability: {
    total: number;
    successful: number;
    percentage: number;
  };
}

export const getSyntheticMonitors = async (dtClient: _OAuthHttpClient, monitorId?: string) => {
  const syntheticClient = new SyntheticClient(dtClient);

  if (monitorId) {
    // Get specific monitor
    const monitor = await syntheticClient.getMonitor({
      entityId: monitorId,
      fields: 'entityId,name,type,enabled,frequency,locations,lastTestResult,availability'
    });
    
    return [monitor];
  } else {
    // Get all monitors
    const monitors = await syntheticClient.getMonitors({
      fields: 'entityId,name,type,enabled,frequency,locations,lastTestResult,availability'
    });
    
    return monitors.monitors || [];
  }
};

export const getSyntheticTestResults = async (dtClient: _OAuthHttpClient, monitorId: string, timeframe: string = '1h') => {
  const syntheticClient = new SyntheticClient(dtClient);
  
  const now = new Date();
  const from = new Date(now.getTime() - (timeframe === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  
  const results = await syntheticClient.getTestResults({
    entityId: monitorId,
    from: from.toISOString(),
    to: now.toISOString(),
    fields: 'entityId,status,responseTime,timestamp,location,errorMessage'
  });
  
  return results.testResults || [];
}; 
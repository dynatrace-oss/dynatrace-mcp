import { _OAuthHttpClient } from "@dynatrace-sdk/http-client";
import { MonitoredEntitiesClient } from '@dynatrace-sdk/client-classic-environment-v2';
import { executeDql } from "./execute-dql";

export interface HostHealth {
  entityId: string;
  name: string;
  type: string;
  status: string;
  osType: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkThroughput: number;
  processes: number;
  lastSeen: string;
  tags: string[];
}

export interface ProcessInfo {
  entityId: string;
  name: string;
  status: string;
  cpuUsage: number;
  memoryUsage: number;
  commandLine: string;
  hostId: string;
  lastSeen: string;
}

export const getInfrastructureHealth = async (dtClient: _OAuthHttpClient, hostId?: string) => {
  const monitoredEntitiesClient = new MonitoredEntitiesClient(dtClient);
  
  if (hostId) {
    // Get specific host
    const host = await monitoredEntitiesClient.getEntity({
      entityId: hostId,
      fields: 'entityId,name,type,status,osType,tags,lastSeen'
    });
    
    // Get host metrics
    const metricsDql = `
      fetch metrics
      | filter dt.source_entity == "${hostId}"
      | filter metricId in ("builtin:host.cpu.usage", "builtin:host.memory.usage", "builtin:host.disk.used.percent", "builtin:host.network.throughput")
      | summarize avg(value), by:{metricId}
    `;
    
    const metrics = await executeDql(dtClient, metricsDql);
    
    return [{
      entityId: host.entityId,
      name: host.displayName,
      type: host.type,
      status: host.status,
      osType: host.osType || 'Unknown',
      cpuUsage: 0, // Will be populated from metrics
      memoryUsage: 0, // Will be populated from metrics
      diskUsage: 0, // Will be populated from metrics
      networkThroughput: 0, // Will be populated from metrics
      processes: 0,
      lastSeen: host.lastSeen,
      tags: host.tags || []
    }];
  } else {
    // Get all hosts
    const hosts = await monitoredEntitiesClient.getEntities({
      entitySelector: 'type(HOST)',
      fields: 'entityId,name,type,status,osType,tags,lastSeen',
      pageSize: 100
    });
    
    return hosts.entities || [];
  }
};

export const getProcesses = async (dtClient: _OAuthHttpClient, hostId?: string) => {
  const monitoredEntitiesClient = new MonitoredEntitiesClient(dtClient);
  
  if (hostId) {
    // Get processes for specific host
    const processes = await monitoredEntitiesClient.getEntities({
      entitySelector: `type(PROCESS_GROUP_INSTANCE),fromRelationships.isProcessOf(entityId("${hostId}"))`,
      fields: 'entityId,name,status,commandLine,tags,lastSeen',
      pageSize: 100
    });
    
    return processes.entities || [];
  } else {
    // Get all processes
    const processes = await monitoredEntitiesClient.getEntities({
      entitySelector: 'type(PROCESS_GROUP_INSTANCE)',
      fields: 'entityId,name,status,commandLine,tags,lastSeen',
      pageSize: 100
    });
    
    return processes.entities || [];
  }
};

export const getInfrastructureMetrics = async (dtClient: _OAuthHttpClient, entityId: string, timeframe: string = '1h') => {
  const now = new Date();
  const from = new Date(now.getTime() - (timeframe === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  
  const metricsDql = `
    fetch metrics
    | filter dt.source_entity == "${entityId}"
    | filter metricId in (
      "builtin:host.cpu.usage",
      "builtin:host.memory.usage", 
      "builtin:host.disk.used.percent",
      "builtin:host.network.throughput",
      "builtin:host.network.packets",
      "builtin:host.disk.read.throughput",
      "builtin:host.disk.write.throughput"
    )
    | filter timestamp >= datetime("${from.toISOString()}")
    | summarize avg(value), by:{metricId}
  `;
  
  return await executeDql(dtClient, metricsDql);
}; 
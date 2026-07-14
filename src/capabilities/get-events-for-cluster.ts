import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';
import { escapeDqlStringValue, validateTimeframe } from '../utils/dql-sanitize';

/**
 * Get events for a Kubernetes cluster
 * @param dtClient Dynatrace HTTP Client
 * @param clusterId The Kubernetes Cluster ID (k8s.cluster.uid)
 * @param kubernetesEntityId The Dynatrace Kubernetes Entity ID (dt.entity.kubernetes_cluster)
 * @param eventType Filter by specific event type
 * @param timeframe Timeframe to query events (e.g., '12h', '24h', '7d', '30d'). Default: '24h'
 * @returns DQL query result
 */
export const getEventsForCluster = async (
  dtClient: HttpClient,
  clusterId?: string,
  kubernetesEntityId?: string,
  eventType?: string,
  timeframe: string = '24h',
) => {
  validateTimeframe(timeframe);

  let dql = `fetch events, from: now()-${timeframe}, to: now()`;

  const clusterFilters: string[] = [];
  if (clusterId) clusterFilters.push(`k8s.cluster.uid == "${escapeDqlStringValue(clusterId)}"`);
  if (kubernetesEntityId)
    clusterFilters.push(`dt.entity.kubernetes_cluster == "${escapeDqlStringValue(kubernetesEntityId)}"`);

  if (clusterFilters.length > 0) {
    dql += ` | filter ${clusterFilters.join(' or ')}`;
  } else {
    // No IDs provided — return all kubernetes related events
    dql += ` | filter isNotNull(k8s.cluster.uid)`;
  }

  // filter by eventType if provided — eventType is validated as z.enum at the schema level
  if (eventType) {
    dql += ` | filter eventType == "${escapeDqlStringValue(eventType)}"`;
  }

  // sort by timestamp
  dql += ' | sort timestamp desc';

  return executeDql(dtClient, { query: dql });
};

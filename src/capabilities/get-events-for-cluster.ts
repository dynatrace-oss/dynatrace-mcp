import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';

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
  clusterId: string,
  kubernetesEntityId: string,
  eventType: string,
  timeframe: string = '24h',
) => {
  let dql = `fetch events, from: now()-${timeframe}, to: now()`;

  if (!clusterId && !kubernetesEntityId) {
    // If no clusterId or kubernetesEntityId is provided, return all kubernetes related events
    dql += ` | filter isNotNull(k8s.cluster.uid)`;
  } else if (clusterId || kubernetesEntityId) {
    // filter by clusterId or kubernetesEntityId if provided
    dql += ` | filter k8s.cluster.uid == "${clusterId}" or dt.entity.kubernetes_cluster == "${kubernetesEntityId}"`;
  }

  // filter by eventType if provided
  if (eventType) {
    dql += ` | filter eventType == "${eventType}"`;
  }

  // sort by timestamp
  dql += ' | sort timestamp desc';

  return executeDql(dtClient, { query: dql });
};

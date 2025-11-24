import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';

export const getEventsForCluster = async (
  dtClient: HttpClient,
  clusterId: string,
  kubernetesEntityId: string,
  eventType: string,
) => {
  let dql = 'fetch events';

  if (!clusterId && !kubernetesEntityId) {
    // If no clusterId or kubernetesEntityId is provided, return all kubernetes related events
    dql += ` | filter isNotNull(k8s.cluster.uid) | limit 50`;
  } else if (clusterId || kubernetesEntityId) {
    // filter by clusterId or kubernetesEntityId if provided
    dql += `| filter k8s.cluster.uid == "${clusterId}" or dt.entity.kubernetes_cluster == "${kubernetesEntityId}" | limit 50`;
  }

  // filter by eventType if provided
  if (eventType) {
    dql += ` | filter eventType == "${eventType}"`;
  }

  // sort by timestamp
  dql += ' | sort timestamp desc';

  return executeDql(dtClient, { query: dql });
};

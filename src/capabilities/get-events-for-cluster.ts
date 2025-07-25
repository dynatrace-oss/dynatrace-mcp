import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';

export const getEventsForCluster = async (dtClient: HttpClient, clusterId: string) => {
  let dql = `fetch events | filter k8s.cluster.uid == "${clusterId}"`;

  if (!clusterId) {
    // if no clusterId is provided, we need to fetch all events
    dql = `fetch events | filter isNotNull(k8s.cluster.uid)`;
  }

  return executeDql(dtClient, { query: dql });
};

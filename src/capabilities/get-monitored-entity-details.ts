import { HttpClient } from '@dynatrace-sdk/http-client';
import { MonitoredEntitiesClient } from '@dynatrace-sdk/client-classic-environment-v2';

export const getMonitoredEntityDetails = async (dtClient: HttpClient, entityId: string) => {
  const monitoredEntitiesClient = new MonitoredEntitiesClient(dtClient);

  const entityDetails = await monitoredEntitiesClient.getEntity({
    entityId: entityId,
  });

  return entityDetails;
};

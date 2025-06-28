// Get service dependencies and relationships from Dynatrace
export interface ServiceDependency {
  fromEntityId: string;
  toEntityId: string;
  type: string;
  source: string;
}

export interface ServiceTopology {
  serviceId: string;
  serviceName: string;
  dependencies: ServiceDependency[];
  dependents: ServiceDependency[];
}

export async function getServiceDependencies(dtClient: any, serviceId?: string): Promise<ServiceTopology> {
  const url = serviceId 
    ? `/api/v2/entities/${serviceId}/relationships`
    : '/api/v2/entities?entitySelector=type(SERVICE)&from=now-1h&to=now';
    
  const response = await dtClient.send({
    url,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const data = await response.body('json');
  
  if (serviceId) {
    // Get relationships for specific service
    const relationships = data.relationships || [];
    const dependencies = relationships
      .filter((rel: any) => rel.fromEntityId === serviceId)
      .map((rel: any) => ({
        fromEntityId: rel.fromEntityId,
        toEntityId: rel.toEntityId,
        type: rel.type,
        source: rel.source
      }));
      
    const dependents = relationships
      .filter((rel: any) => rel.toEntityId === serviceId)
      .map((rel: any) => ({
        fromEntityId: rel.fromEntityId,
        toEntityId: rel.toEntityId,
        type: rel.type,
        source: rel.source
      }));

    return {
      serviceId,
      serviceName: data.displayName || serviceId,
      dependencies,
      dependents
    };
  } else {
    // Get first service as example
    const firstService = data.entities?.[0];
    if (!firstService) {
      throw new Error('No services found');
    }
    
    return {
      serviceId: firstService.entityId,
      serviceName: firstService.displayName,
      dependencies: [],
      dependents: []
    };
  }
} 
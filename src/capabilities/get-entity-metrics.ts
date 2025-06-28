// Get real-time metrics and performance data for entities
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  unit: string;
}

export interface EntityMetrics {
  entityId: string;
  entityName: string;
  metrics: {
    [metricId: string]: {
      dataPoints: MetricDataPoint[];
      unit: string;
      description?: string;
    };
  };
  summary: {
    cpuUsage?: number;
    memoryUsage?: number;
    responseTime?: number;
    throughput?: number;
    errorRate?: number;
  };
}

export async function getEntityMetrics(dtClient: any, entityId: string, metricSelector?: string, timeframe: string = '1h'): Promise<EntityMetrics> {
  // Default metrics for comprehensive monitoring
  const defaultMetrics = [
    'builtin:host.cpu.usage',
    'builtin:host.memory.usage', 
    'builtin:host.disk.used',
    'builtin:service.response.time',
    'builtin:service.requests.per.second',
    'builtin:service.error.rate',
    'builtin:service.apdex'
  ].join(',');
  
  const metrics = metricSelector || defaultMetrics;
  const from = Date.now() - (timeframe === '1h' ? 3600000 : timeframe === '24h' ? 86400000 : 3600000);
  const to = Date.now();
  
  const response = await dtClient.send({
    url: `/api/v2/metrics/query`,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: {
      metricSelector: metrics,
      entitySelector: `entityId(${entityId})`,
      from,
      to,
      resolution: '5m'
    },
  });

  const data = await response.body('json');
  
  // Get entity details for name
  const entityResponse = await dtClient.send({
    url: `/api/v2/entities/${entityId}`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  
  const entityData = await entityResponse.body('json');
  
  const result: EntityMetrics = {
    entityId,
    entityName: entityData.displayName || entityId,
    metrics: {},
    summary: {}
  };
  
  // Process metrics data
  data.result?.forEach((metricResult: any) => {
    const metricId = metricResult.metricId;
    const dataPoints = metricResult.data?.[0]?.values?.map((point: any) => ({
      timestamp: point[0],
      value: point[1],
      unit: metricResult.unit
    })) || [];
    
    result.metrics[metricId] = {
      dataPoints,
      unit: metricResult.unit,
      description: metricResult.description
    };
    
    // Calculate summary statistics
    if (dataPoints.length > 0) {
      const latestValue = dataPoints[dataPoints.length - 1].value;
      if (metricId.includes('cpu.usage')) {
        result.summary.cpuUsage = latestValue;
      } else if (metricId.includes('memory.usage')) {
        result.summary.memoryUsage = latestValue;
      } else if (metricId.includes('response.time')) {
        result.summary.responseTime = latestValue;
      } else if (metricId.includes('requests.per.second')) {
        result.summary.throughput = latestValue;
      } else if (metricId.includes('error.rate')) {
        result.summary.errorRate = latestValue;
      }
    }
  });
  
  return result;
} 
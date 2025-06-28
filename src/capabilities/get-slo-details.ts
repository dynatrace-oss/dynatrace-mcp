// Get SLO (Service Level Objective) details and business metrics
export interface SloMetric {
  metricId: string;
  name: string;
  value: number;
  target: number;
  warning: number;
  unit: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface SloDetails {
  id: string;
  name: string;
  description?: string;
  target: number;
  warning: number;
  timeframe: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  errorBudget: number;
  remainingErrorBudget: number;
  consumedErrorBudget: number;
  metrics: SloMetric[];
  violations: Array<{
    startTime: number;
    endTime: number;
    duration: number;
    severity: string;
  }>;
}

export async function getSloDetails(dtClient: any, sloId?: string): Promise<SloDetails[]> {
  const url = sloId 
    ? `/api/v2/slo/${sloId}`
    : '/api/v2/slo';
    
  const response = await dtClient.send({
    url,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const data = await response.body('json');
  
  if (sloId) {
    // Single SLO
    const slo = data;
    return [{
      id: slo.id,
      name: slo.name,
      description: slo.description,
      target: slo.target,
      warning: slo.warning,
      timeframe: slo.timeframe,
      status: slo.status,
      errorBudget: slo.errorBudget,
      remainingErrorBudget: slo.remainingErrorBudget,
      consumedErrorBudget: slo.consumedErrorBudget,
      metrics: slo.metrics || [],
      violations: slo.violations || []
    }];
  } else {
    // List of SLOs
    return data.slo?.map((slo: any) => ({
      id: slo.id,
      name: slo.name,
      description: slo.description,
      target: slo.target,
      warning: slo.warning,
      timeframe: slo.timeframe,
      status: slo.status,
      errorBudget: slo.errorBudget,
      remainingErrorBudget: slo.remainingErrorBudget,
      consumedErrorBudget: slo.consumedErrorBudget,
      metrics: slo.metrics || [],
      violations: slo.violations || []
    })) || [];
  }
}

export async function getSloViolations(dtClient: any, sloId: string, timeframe: string = '24h'): Promise<Array<{
  startTime: number;
  endTime: number;
  duration: number;
  severity: string;
  description: string;
}>> {
  const from = Date.now() - (timeframe === '1h' ? 3600000 : timeframe === '24h' ? 86400000 : 86400000);
  const to = Date.now();
  
  const response = await dtClient.send({
    url: `/api/v2/slo/${sloId}/violations`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    query: {
      from,
      to
    }
  });

  const data = await response.body('json');
  
  return data.violations?.map((violation: any) => ({
    startTime: violation.startTime,
    endTime: violation.endTime,
    duration: violation.endTime - violation.startTime,
    severity: violation.severity,
    description: violation.description
  })) || [];
}

export async function getErrorBudgetConsumption(dtClient: any, sloId: string, timeframe: string = '24h'): Promise<{
  consumed: number;
  remaining: number;
  total: number;
  consumptionRate: number;
  projectedExhaustion?: number;
}> {
  const slos = await getSloDetails(dtClient, sloId);
  if (slos.length === 0) {
    throw new Error(`SLO not found: ${sloId}`);
  }
  
  const slo = slos[0];
  const consumptionRate = slo.consumedErrorBudget / slo.errorBudget;
  const projectedExhaustion = consumptionRate > 0 ? 
    Date.now() + (slo.remainingErrorBudget / consumptionRate) * 3600000 : undefined;
  
  return {
    consumed: slo.consumedErrorBudget,
    remaining: slo.remainingErrorBudget,
    total: slo.errorBudget,
    consumptionRate,
    projectedExhaustion
  };
} 
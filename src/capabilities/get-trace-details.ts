// Get distributed tracing details and request flow analysis
export interface TraceSpan {
  spanId: string;
  parentSpanId?: string;
  serviceName: string;
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: string;
  tags: { [key: string]: string };
  logs?: Array<{
    timestamp: number;
    fields: { [key: string]: string };
  }>;
}

export interface TraceDetails {
  traceId: string;
  serviceName: string;
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: string;
  spans: TraceSpan[];
  summary: {
    totalSpans: number;
    errorSpans: number;
    slowestSpan?: TraceSpan;
    errorSpansList: TraceSpan[];
  };
}

export async function getTraceDetails(dtClient: any, traceId: string): Promise<TraceDetails> {
  const response = await dtClient.send({
    url: `/api/v2/spans/query`,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: {
      query: `fetch spans | filter trace_id == "${traceId}" | sort timestamp asc`,
      from: Date.now() - 86400000, // 24 hours ago
      to: Date.now(),
      limit: 1000
    },
  });

  const data = await response.body('json');
  
  if (!data.records || data.records.length === 0) {
    throw new Error(`No trace found with ID: ${traceId}`);
  }
  
  const spans: TraceSpan[] = data.records.map((record: any) => ({
    spanId: record.span_id,
    parentSpanId: record.parent_span_id,
    serviceName: record.service_name,
    operationName: record.operation_name,
    startTime: record.timestamp,
    endTime: record.timestamp + (record.duration || 0),
    duration: record.duration || 0,
    status: record.status,
    tags: record.tags || {},
    logs: record.logs || []
  }));
  
  // Find root span (no parent)
  const rootSpan = spans.find(span => !span.parentSpanId);
  const errorSpans = spans.filter(span => span.status === 'ERROR');
  const slowestSpan = spans.reduce((slowest, current) => 
    current.duration > slowest.duration ? current : slowest, spans[0]);
  
  return {
    traceId,
    serviceName: rootSpan?.serviceName || 'Unknown',
    operationName: rootSpan?.operationName || 'Unknown',
    startTime: rootSpan?.startTime || 0,
    endTime: rootSpan?.endTime || 0,
    duration: rootSpan?.duration || 0,
    status: errorSpans.length > 0 ? 'ERROR' : 'SUCCESS',
    spans,
    summary: {
      totalSpans: spans.length,
      errorSpans: errorSpans.length,
      slowestSpan,
      errorSpansList: errorSpans
    }
  };
}

export async function getServiceTraces(dtClient: any, serviceId: string, timeframe: string = '1h', limit: number = 10): Promise<TraceDetails[]> {
  const from = Date.now() - (timeframe === '1h' ? 3600000 : timeframe === '24h' ? 86400000 : 3600000);
  const to = Date.now();
  
  const response = await dtClient.send({
    url: `/api/v2/spans/query`,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: {
      query: `fetch spans | filter dt.source_entity == "${serviceId}" | summarize count(), by:{trace_id} | sort count desc | limit ${limit}`,
      from,
      to
    },
  });

  const data = await response.body('json');
  
  const traceIds = data.records?.map((record: any) => record.trace_id) || [];
  const traces: TraceDetails[] = [];
  
  // Get details for each trace
  for (const traceId of traceIds) {
    try {
      const traceDetails = await getTraceDetails(dtClient, traceId);
      traces.push(traceDetails);
    } catch (error) {
      console.error(`Failed to get details for trace ${traceId}:`, error);
    }
  }
  
  return traces;
} 
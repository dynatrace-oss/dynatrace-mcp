import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';

export const listExceptions = async (
  dtClient: HttpClient,
  additionalFilter?: string,
  timeframe: string = '24h',
  maxResultRecords: number = 5000,
) => {
  // DQL statement to fetch exception data from user.events for the specified timeframe
  const dql = `fetch user.events, from: now()-${timeframe}, to: now()
| filter isNotNull(exception.stack_trace)
| filter isNotNull(error.id)
${additionalFilter ? `| filter ${additionalFilter}` : ''}
| fields error.id, error.type, exception.message, os.name, dt.rum.application.id, dt.rum.application.entity, start_time
| sort start_time desc
`;

  return await executeDql(dtClient, { query: dql, maxResultRecords, maxResultBytes: /* 5 MB */ 5000000 });
};

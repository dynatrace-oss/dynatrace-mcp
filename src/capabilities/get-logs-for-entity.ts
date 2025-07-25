import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';

export const getLogsForEntity = async (dtClient: HttpClient, entityId: string) => {
  const dql = `fetch logs | filter dt.source_entity == "${entityId}"`;

  return executeDql(dtClient, { query: dql });
};

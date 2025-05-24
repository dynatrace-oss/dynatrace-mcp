import { _OAuthHttpClient } from "@dynatrace-sdk/http-client";
import { executeDql } from "./execute-dql";



export const getLogsForEntity = async (dtClient: _OAuthHttpClient, entityId: string) => {
  const dql = `fetch logs | filter dt.source_entity == "${entityId}"`;

  return executeDql(dtClient, dql);
};

import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';
import { getEntityTypeFromId } from '../utils/dynatrace-entity-types';
import { ResultRecord } from '@dynatrace-sdk/client-query';

type MonitoredEntityDetails = {
  entityId: string;
  displayName: string;
  entityTypeTable: string;
  type: string;
  allProperties: ResultRecord | undefined;
};

/**
 * Get monitored entity details by entity ID via DQL
 * @param dtClient
 * @param entityId
 * @returns Details about the monitored entity, or undefined in case we couldn't find it
 */
export const getMonitoredEntityDetails = async (
  dtClient: HttpClient,
  entityId: string,
): Promise<MonitoredEntityDetails | undefined> => {
  // Try to determine the entity type directly from the entity ID (e.g., PROCESS_GROUP-F84E4759809ADA84 -> dt.entity.process_group)
  const entityType = getEntityTypeFromId(entityId);

  if (!entityType) {
    console.error(
      `Couldn't determine entity type for ID: ${entityId}. Please raise an issue at https://github.com/dynatrace-oss/dynatrace-mcp/issues if you believe this is a bug.`,
    );
    return;
  }

  // construct DQL statement like `fetch dt.entity.hosts | filter id == "HOST-1234"`
  const dql = `fetch ${entityType} | filter id == "${entityId}" | expand tags | fieldsAdd entity.type`;

  // Get response from API
  const dqlResponse = await executeDql(dtClient, { query: dql });

  // verify response and length
  if (!dqlResponse || !dqlResponse.records || dqlResponse.records.length === 0) {
    console.error(`No entity found for ID: ${entityId}`);
    return;
  }

  // in case we have more than one entity -> log it
  if (dqlResponse.records.length > 1) {
    console.error(
      `Multiple entities (${dqlResponse.records.length}) found for entity ID: ${entityId}. Returning the first one.`,
    );
  }

  const entity = dqlResponse.records[0];
  // make typescript happy; entity should never be null though
  if (!entity) {
    console.error(`No entity found for ID: ${entityId}`);
    return;
  }

  // return entity details
  return {
    entityId: String(entity.id),
    entityTypeTable: entityType,
    displayName: String(entity['entity.name']),
    type: String(entity['entity.type']),
    allProperties: entity || undefined,
  };
};

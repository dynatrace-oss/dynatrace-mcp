import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';
import { DYNATRACE_ENTITY_TYPES, getEntityTypeFromId } from '../utils/dynatrace-entity-types';

/**
 * Get monitored entity details by entity ID via DQL
 * @param dtClient
 * @param entityId
 * @returns
 */
export const getMonitoredEntityDetails = async (dtClient: HttpClient, entityId: string) => {
  // Try to determine the entity type directly from the entity ID (e.g., PROCESS_GROUP-F84E4759809ADA84 -> dt.entity.process_group)
  const entityType = getEntityTypeFromId(entityId);

  let dql: string;

  if (entityType) {
    // query only the specific entity type - this should be the default case, and rather quick
    // ToDo: Support smartscapeNodes in the near future :)
    dql = `fetch ${entityType} | filter id == "${entityId}" | expand tags | fieldsAdd entity.type`;
  } else {
    // Fallback: query all entity types - it's inefficient and unlikely that this works, but maybe some entity type is not correctly mapped
    console.error(
      `Couldn't determine entity type for ID: ${entityId}. Falling back to querying all entity types. This may be slow! Please raise an issue at https://github.com/dynatrace-oss/dynatrace-mcp/issues if you believe this is a bug.`,
    );
    dql =
      `fetch ${DYNATRACE_ENTITY_TYPES[0]} | filter id == "${entityId}" | expand tags | fieldsAdd entity.type` +
      DYNATRACE_ENTITY_TYPES.slice(1)
        .map(
          (entityType) =>
            ` | append [ fetch ${entityType} | filter id == "${entityId}" | expand tags | fieldsAdd entity.type ]`,
        )
        .join('');
  }

  // Get response from API
  const dqlResponse = await executeDql(dtClient, { query: dql });

  if (dqlResponse && dqlResponse.length > 0) {
    // Return the first (and should be only) entity found
    const entity = dqlResponse[0];
    if (entity) {
      return {
        entityId: entity.id,
        displayName: entity['entity.name'],
        type: entity['entity.type'], // Use 'type' instead of 'entityType' to match expected structure
        allProperties: entity, // Include all other properties returned by DQL
      };
    }
  }
};

import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';
import {
  DYNATRACE_ENTITY_TYPES_ALL,
  DYNATRACE_ENTITY_TYPES_BASICS,
  getEntityTypeFromId,
} from '../utils/dynatrace-entity-types';

/**
 * Construct a DQL statement like "fetch <entityType> | search "*<entityName1>*" OR "*<entityName2>*" | fieldsAdd entity.type" for each entity type,
 * and join them with " | append [ ... ]"
 * @param entityName
 * @returns DQL Statement for searching all entity types
 */
export const generateDqlSearchEntityCommand = (entityNames: string[], extendedSearch: boolean): string => {
  // If extendedSearch is true, use all entity types, otherwise use only basic ones
  const fetchDqlCommands = (extendedSearch ? DYNATRACE_ENTITY_TYPES_ALL : DYNATRACE_ENTITY_TYPES_BASICS).map(
    (entityType, index) => {
      const dql = `fetch ${entityType} | search "*${entityNames.join('*" OR "*')}*" | fieldsAdd entity.type | expand tags`;
      if (index === 0) {
        return dql;
      }
      return `  | append [ ${dql} ]\n`;
    },
  );

  return fetchDqlCommands.join('');
};

/**
 * Find a monitored entity by name via DQL
 * @param dtClient
 * @param entityName
 * @returns A string with the entity details like id, name and type, or an error message if no entity was found
 */
export const findMonitoredEntitiesByName = async (
  dtClient: HttpClient,
  entityNames: string[],
  extendedSearch: boolean,
) => {
  // construct a DQL statement for searching the entityName over all entity types
  const dql = generateDqlSearchEntityCommand(entityNames, extendedSearch);

  // Get response from API
  // Note: This may be slow, as we are appending multiple entity types above
  return await executeDql(dtClient, { query: dql });
};

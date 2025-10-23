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
  if (entityNames == undefined || entityNames.length == 0) {
    throw new Error(`No entity names supplied to search for`);
  }

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
 * Find a monitored entity via "smartscapeNodes" by name via DQL
 * @param dtClient
 * @param entityNames Array of entitiy names to search for
 * @returns An array with the entity details like id, name and type
 */
export const findMonitoredEntityViaSmartscapeByName = async (dtClient: HttpClient, entityNames: string[]) => {
  const dql = `smartscapeNodes "*" | search "*${entityNames.join('*" OR "*')}*" | fields id, name, type`;
  console.error(`Executing DQL: ${dql}`);

  try {
    const smartscapeResult = await executeDql(dtClient, { query: dql });

    if (smartscapeResult && smartscapeResult.records && smartscapeResult.records.length > 0) {
      // return smartscape results if we found something
      return smartscapeResult;
    }
  } catch (error) {
    // ignore errors here, as smartscapeNodes may not be ready for all environments/users
    console.error('Error while querying smartscapeNodes:', error);
  }

  console.error('No results from smartscapeNodes');
  return null;
};

/**
 * Find a monitored entity via "dt.entity.${entityType}" by name via DQL
 * @param dtClient
 * @param entityNames Array of entitiy names to search for
 * @param extendedSearch If true, search over all entity types, otherwise only basic ones
 * @returns An array with the entity details like id, name and type
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

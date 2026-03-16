'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.findMonitoredEntitiesByName =
  exports.findMonitoredEntityViaSmartscapeByName =
  exports.generateDqlSearchEntityCommand =
    void 0;
const execute_dql_1 = require('./execute-dql');
const dynatrace_entity_types_1 = require('../utils/dynatrace-entity-types');
/**
 * Construct a DQL statement like "fetch <entityType> | search "*<entityName1>*" OR "*<entityName2>*" | fieldsAdd entity.type" for each entity type,
 * and join them with " | append [ ... ]"
 * @param entityName
 * @returns DQL Statement for searching all entity types
 */
const generateDqlSearchEntityCommand = (entityNames, extendedSearch) => {
  if (entityNames == undefined || entityNames.length == 0) {
    throw new Error(`No entity names supplied to search for`);
  }
  // If extendedSearch is true, use all entity types, otherwise use only basic ones
  const fetchDqlCommands = (
    extendedSearch
      ? dynatrace_entity_types_1.DYNATRACE_ENTITY_TYPES_ALL
      : dynatrace_entity_types_1.DYNATRACE_ENTITY_TYPES_BASICS
  ).map((entityType, index) => {
    const dql = `fetch ${entityType} | search "*${entityNames.join('*" OR "*')}*" | fieldsAdd entity.type | expand tags`;
    if (index === 0) {
      return dql;
    }
    return `  | append [ ${dql} ]\n`;
  });
  return fetchDqlCommands.join('');
};
exports.generateDqlSearchEntityCommand = generateDqlSearchEntityCommand;
/**
 * Find a monitored entity via "smartscapeNodes" by name via DQL
 * @param dtClient
 * @param entityNames Array of entitiy names to search for
 * @returns An array with the entity details like id, name and type
 */
const findMonitoredEntityViaSmartscapeByName = async (dtClient, entityNames) => {
  const dql = `smartscapeNodes "*" | search "*${entityNames.join('*" OR "*')}*" | fields id, name, type`;
  console.error(`Executing DQL: ${dql}`);
  try {
    const smartscapeResult = await (0, execute_dql_1.executeDql)(dtClient, { query: dql });
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
exports.findMonitoredEntityViaSmartscapeByName = findMonitoredEntityViaSmartscapeByName;
/**
 * Find a monitored entity via "dt.entity.${entityType}" by name via DQL
 * @param dtClient
 * @param entityNames Array of entitiy names to search for
 * @param extendedSearch If true, search over all entity types, otherwise only basic ones
 * @returns An array with the entity details like id, name and type
 */
const findMonitoredEntitiesByName = async (dtClient, entityNames, extendedSearch) => {
  // construct a DQL statement for searching the entityName over all entity types
  const dql = (0, exports.generateDqlSearchEntityCommand)(entityNames, extendedSearch);
  // Get response from API
  // Note: This may be slow, as we are appending multiple entity types above
  return await (0, execute_dql_1.executeDql)(dtClient, { query: dql });
};
exports.findMonitoredEntitiesByName = findMonitoredEntitiesByName;

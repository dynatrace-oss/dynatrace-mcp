import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';
import { DYNATRACE_ENTITY_TYPES } from '../utils/dynatrace-entity-types';

/**
 * Find a monitored entity by name via DQL
 * @param dtClient
 * @param entityName
 * @returns A string with the entity details like id, name and type, or an error message if no entity was found
 */
export const findMonitoredEntityByName = async (dtClient: HttpClient, entityName: string) => {
  if (entityName == '') {
    return 'You need to provide an entity name to search for.';
  }

  // construct a DQL statement like "fetch <entityType> | search "*<entityName>*" | fieldsAdd entity.type" for each entity type
  // and join them with " | append "
  // for example: fetch dt.entity.application | search "*<entityName>*" | fieldsAdd entity.type | append fetch dt.entity.service | search "*<entityName>*" | fieldsAdd entity.type
  const dql =
    `fetch ${DYNATRACE_ENTITY_TYPES[0]} | search "*${entityName}*" | fieldsAdd entity.type` +
    DYNATRACE_ENTITY_TYPES.slice(1)
      .map((entityType) => ` | append [ fetch ${entityType} | search "*${entityName}*" | fieldsAdd entity.type ]`)
      .join('');

  // Get response from API
  // Note: This may be slow, as we are appending multiple entity types above
  const dqlResponse = await executeDql(dtClient, { query: dql });

  if (dqlResponse && dqlResponse.length > 0) {
    let resp = 'The following monitored entities were found:\n';
    // iterate over dqlResponse and create a string with the entity names
    dqlResponse.forEach((entity) => {
      if (entity) {
        resp += `- Entity '${entity['entity.name']}' of type '${entity['entity.type']} has entity id '${entity.id}'\n`;
      }
    });
    return resp;
  } else {
    return 'No monitored entity found with the specified name.';
  }
};

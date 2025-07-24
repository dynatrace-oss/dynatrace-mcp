import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';

export const findMonitoredEntityByName = async (dtClient: HttpClient, entityName: string) => {
  const dql = `fetch dt.entity.application | search "*${entityName}*" | fieldsAdd entity.type
                | append [fetch dt.entity.service | search "*${entityName}*" | fieldsAdd entity.type]
                | append [fetch dt.entity.host | search "*${entityName}*" | fieldsAdd entity.type]
                | append [fetch dt.entity.process_group | search "*${entityName}*" | fieldsAdd entity.type]
                | append [fetch dt.entity.cloud_application | search "*${entityName}*" | fieldsAdd entity.type]`;

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

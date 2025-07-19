import { _OAuthHttpClient } from '@dynatrace-sdk/http-client';
import { callAppFunction } from './call-app-function';

export const getOwnershipInformation = async (dtClient: _OAuthHttpClient, entityIds: string) => {
  const ownershipResponse = await callAppFunction(dtClient, 'dynatrace.ownership', 'get-ownership-from-entity', {
    entityIds: entityIds,
  });

  if (ownershipResponse.error) {
    // e.g., "Not enough parameters provided"
    return `Error: ${ownershipResponse.error}`;
  }

  if (ownershipResponse.result && ownershipResponse.result.owners && ownershipResponse.result.owners.length == 0) {
    return 'No owners found - please check out how to setup owners on https://docs.dynatrace.com/docs/deliver/ownership';
  }

  return ownershipResponse.result;
};

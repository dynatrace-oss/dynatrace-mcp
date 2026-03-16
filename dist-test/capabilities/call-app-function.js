'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.callAppFunction = void 0;
/** Helper function to call an app-function via platform-api */
const callAppFunction = async (dtClient, appId, functionName, payload) => {
  console.error(`Sending payload ${JSON.stringify(payload)}`);
  const response = await dtClient.send({
    url: `/platform/app-engine/app-functions/v1/apps/${appId}/api/${functionName}`,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: payload,
    statusValidator: (status) => {
      return [200].includes(status);
    },
  });
  return await response.body('json');
};
exports.callAppFunction = callAppFunction;

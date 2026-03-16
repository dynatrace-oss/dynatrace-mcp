'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.updateWorkflow = void 0;
const client_automation_1 = require('@dynatrace-sdk/client-automation');
const updateWorkflow = async (dtClient, workflowId, body) => {
  const workflowsClient = new client_automation_1.WorkflowsClient(dtClient);
  return await workflowsClient.updateWorkflow({
    id: workflowId,
    body: body,
  });
};
exports.updateWorkflow = updateWorkflow;

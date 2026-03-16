'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sendSlackMessage = void 0;
const call_app_function_1 = require('./call-app-function');
const sendSlackMessage = async (dtClient, connectionId, channel, message) => {
  const response = await (0, call_app_function_1.callAppFunction)(dtClient, 'dynatrace.slack', 'slack-send-message', {
    message: message,
    channel: channel,
    connection: connectionId,
    workflowID: 'foobar-123',
    executionID: 'exec-123',
    executionDate: new Date().toString(),
    appendToThread: false,
  });
  if (response.error) {
    // e.g., "Not enough parameters provided"
    return `Error sending message to Slack: ${response.error}`;
  }
  return `Message sent to Slack: ${JSON.stringify(response.result)}`;
};
exports.sendSlackMessage = sendSlackMessage;

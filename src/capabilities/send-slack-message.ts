import { _OAuthHttpClient } from '@dynatrace-sdk/http-client';
import { callAppFunction } from './call-app-function';

export const sendSlackMessage = async (
  dtClient: _OAuthHttpClient,
  connectionId: string,
  channel: string,
  message: string,
) => {
  const response = await callAppFunction(dtClient, 'dynatrace.slack', 'slack-send-message', {
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

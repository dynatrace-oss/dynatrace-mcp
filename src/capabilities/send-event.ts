import { HttpClient } from '@dynatrace-sdk/http-client';
import { EventsClient, EventIngest, EventIngestEventType } from '@dynatrace-sdk/client-classic-environment-v2';

export interface EventRequest {
  eventType: EventIngestEventType;
  title: string;
  entitySelector?: string;
  properties?: Record<string, string>;
  startTime?: number;
  endTime?: number;
}

export interface EventSendResult {
  success: boolean;
  reportCount: number;
  eventIngestResults?: Array<{
    correlationId: string;
    status: string;
  }>;
}

/**
 * Send an event to Dynatrace using the Events API v2
 * @param dtClient - Dynatrace HTTP Client with authentication
 * @param eventRequest - Event request parameters
 * @returns Structured event response with status
 */
export const sendEvent = async (dtClient: HttpClient, eventRequest: EventRequest): Promise<EventSendResult> => {
  try {
    const eventsClient = new EventsClient(dtClient);

    const eventBody: EventIngest = {
      eventType: eventRequest.eventType,
      title: eventRequest.title,
      ...(eventRequest.entitySelector && { entitySelector: eventRequest.entitySelector }),
      ...(eventRequest.properties && { properties: eventRequest.properties }),
      ...(eventRequest.startTime && { startTime: eventRequest.startTime }),
      ...(eventRequest.endTime && { endTime: eventRequest.endTime }),
    };

    const response = await eventsClient.createEvent({
      body: eventBody,
    });

    return {
      success: true,
      reportCount: response.reportCount || 0,
      eventIngestResults: response.eventIngestResults?.map((result) => ({
        correlationId: result.correlationId || '',
        status: result.status || 'UNKNOWN',
      })),
    };
  } catch (error: any) {
    // Enhanced error logging to surface HTTP/SDK errors for debugging
    try {
      console.error('Failed to send event', {
        message: error?.message,
        stack: error?.stack,
        // Many SDK errors include a response object with status/body
        response: error?.response
          ? {
              status: error.response.status,
              headers: error.response.headers,
              body: error.response.body ? error.response.body : undefined,
            }
          : undefined,
        rawError: error,
      });
    } catch (logErr) {
      // Ensure logging itself doesn't throw
      console.error('Failed while logging event send error', logErr);
    }

    // Construct a more helpful error message to return to callers
    const status = error?.response?.status ? `status=${error.response.status}` : undefined;
    const body = error?.response?.body ? `body=${JSON.stringify(error.response.body)}` : undefined;
    const details = [error?.message, status, body].filter(Boolean).join(' | ');

    throw new Error(`Error sending event: ${details || 'Unexpected error'}`);
  }
};

// Re-export the EventIngestEventType enum for use in index.ts
export { EventIngestEventType };

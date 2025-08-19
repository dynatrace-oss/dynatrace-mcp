import { HttpClient } from '@dynatrace-sdk/http-client';

export interface EmailRecipients {
  emailAddresses: string[];
}

export interface EmailBody {
  contentType?: 'text/plain';
  body: string;
}

export interface EmailRequest {
  toRecipients: EmailRecipients;
  ccRecipients?: EmailRecipients;
  bccRecipients?: EmailRecipients;
  subject: string;
  body: EmailBody;
}

export interface EmailResponse {
  requestId: string;
  message: string;
  rejectedDestinations?: {
    bouncingDestinations: string[];
    complainingDestinations: string[];
  };
  invalidDestinations?: string[];
}

export interface EmailSendResult {
  success: boolean;
  requestId: string;
  message: string;
  invalidDestinations?: string[];
  bouncingDestinations?: string[];
  complainingDestinations?: string[];
}

/**
 * Send an email using the Dynatrace Email API
 * @param dtClient - Dynatrace HTTP client
 * @param emailRequest - Email request parameters
 * @returns Structured email response with request ID and status
 */
export const sendEmail = async (dtClient: HttpClient, emailRequest: EmailRequest): Promise<EmailSendResult> => {
  // Validate total recipients limit (10 max across TO, CC, and BCC)
  const totalRecipients =
    emailRequest.toRecipients.emailAddresses.length +
    (emailRequest.ccRecipients?.emailAddresses.length || 0) +
    (emailRequest.bccRecipients?.emailAddresses.length || 0);

  if (totalRecipients > 10) {
    throw new Error(`Total recipients (${totalRecipients}) exceeds maximum limit of 10 across TO, CC, and BCC fields`);
  }

  try {
    // Ensure contentType is set to 'text/plain' (our only supported format)
    const requestBody = {
      ...emailRequest,
      body: {
        ...emailRequest.body,
        contentType: 'text/plain' as const,
      },
    };

    const response = await dtClient.send({
      url: '/platform/email/v1/emails',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: requestBody,
      statusValidator: (status: number) => {
        return status === 202; // Email API returns 202 for successful requests
      },
    });

    const result: EmailResponse = await response.body('json');

    const sendResult: EmailSendResult = {
      success: true,
      requestId: result.requestId,
      message: result.message,
    };

    if (result.invalidDestinations && result.invalidDestinations.length > 0) {
      sendResult.invalidDestinations = result.invalidDestinations;
    }

    if (result.rejectedDestinations) {
      if (result.rejectedDestinations.bouncingDestinations.length > 0) {
        sendResult.bouncingDestinations = result.rejectedDestinations.bouncingDestinations;
      }
      if (result.rejectedDestinations.complainingDestinations.length > 0) {
        sendResult.complainingDestinations = result.rejectedDestinations.complainingDestinations;
      }
    }

    return sendResult;
  } catch (error: any) {
    throw new Error(`Error sending email: ${error.message}`);
  }
};

import { HttpClient } from '@dynatrace-sdk/http-client';

export interface EmailRecipients {
  emailAddresses: string[];
}

export interface EmailBody {
  contentType: 'text/plain' | 'text/html';
  body: string;
}

export interface EmailRequest {
  toRecipients: EmailRecipients;
  ccRecipients?: EmailRecipients;
  bccRecipients?: EmailRecipients;
  subject: string;
  body: EmailBody;
  notificationSettingsUrl?: string;
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

/**
 * Send an email using the Dynatrace Email API
 * @param dtClient - Dynatrace HTTP client
 * @param emailRequest - Email request parameters
 * @returns Email response with request ID and status
 */
export const sendEmail = async (dtClient: HttpClient, emailRequest: EmailRequest): Promise<string> => {
  try {
    const response = await dtClient.send({
      url: '/platform/email/v1/emails',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: emailRequest,
      statusValidator: (status: number) => {
        return status === 202; // Email API returns 202 for successful requests
      },
    });

    const result: EmailResponse = await response.body('json');
    
    let responseMessage = `Email sent successfully! Request ID: ${result.requestId}\n`;
    responseMessage += `Message: ${result.message}\n`;

    if (result.invalidDestinations && result.invalidDestinations.length > 0) {
      responseMessage += `Invalid destinations: ${result.invalidDestinations.join(', ')}\n`;
    }

    if (result.rejectedDestinations) {
      if (result.rejectedDestinations.bouncingDestinations.length > 0) {
        responseMessage += `Bouncing destinations: ${result.rejectedDestinations.bouncingDestinations.join(', ')}\n`;
      }
      if (result.rejectedDestinations.complainingDestinations.length > 0) {
        responseMessage += `Complaining destinations: ${result.rejectedDestinations.complainingDestinations.join(', ')}\n`;
      }
    }

    return responseMessage;
  } catch (error: any) {
    throw new Error(`Error sending email: ${error.message}`);
  }
};

import { randomUUID } from 'crypto';
import { HttpClient } from '@dynatrace-sdk/http-client';
import { DocumentsClient, CreateDocumentBody } from '@dynatrace-sdk/client-document';

/**
 * Creates a Dynatrace notebook and optionally attempts to attach it to a problem.
 * Note: Attaching to problems requires the custom document ID to be accepted by Dynatrace,
 * which may only work from within Dynatrace workflows (not external API calls).
 * @param dtClient Dynatrace HTTP Client
 * @param name The name of the notebook
 * @param content Array of DQL or markdown sections
 * @param description Optional description
 * @param problemId Optional problem ID to attach the notebook to.
 *                  Accepts either display ID (e.g., "P-12345678") or
 *                  full event ID (e.g., "8763210598712345678_1234567890000V2")
 */
export const createDynatraceNotebook = async (
  dtClient: HttpClient,
  name: string,
  content: Array<{ type: 'dql' | 'markdown'; text: string }>,
  description?: string,
  problemId?: string,
) => {
  const documentsClient = new DocumentsClient(dtClient);

  /** Notebooks Body - structure based on working Dynatrace workflow */
  const notebooksBody = {
    defaultTimeframe: { from: 'now()-2h', to: 'now()' },
    defaultSegments: [] as any[],
    sections: [] as any[],
  };

  for (const item of content) {
    // check every line whether it starts with a DQL statement, or it's a normal markdown like text
    if (item.type === 'dql') {
      // DQL Query
      notebooksBody.sections.push({
        id: randomUUID(),
        type: 'dql',
        showTitle: false,
        state: {
          input: {
            // the DQL statement
            value: item.text,
          },
        },
      });
    } else {
      // Markdown Statement
      notebooksBody.sections.push({
        id: randomUUID(),
        type: 'markdown',
        markdown: item.text, // multi-line markdown
      });
    }
  }

  // Generate document ID for problem attachment if problemId is provided
  // Pattern: problem-TSG-{problemId}-{suffix} with max 100 chars
  // Allowed characters: A-Z a-z 0-9 -
  // Must NOT be a pure UUID, but can contain a UUID with a prefix
  // Example: problem-TSG-1589269324049748129-1747888020000V2-225b65bd
  let documentId: string | undefined;
  if (problemId) {
    // Normalize the problem ID: remove "P-" prefix if present (display ID format)
    const normalizedProblemId = problemId.startsWith('P-') ? problemId.substring(2) : problemId;
    // Replace underscores with hyphens first (underscores not allowed in document IDs)
    const sanitizedProblemId = normalizedProblemId.replaceAll('_', '-');
    // Use short suffix for uniqueness (similar to Dynatrace workflow pattern)
    const suffix = randomUUID().substring(0, 8);
    documentId = `problem-TSG-${sanitizedProblemId}-${suffix}`.substring(0, 100);
    console.log(`Generated document ID for problem attachment: ${documentId}`);
  }

  // Build the request body for createDocument using explicit typing
  const requestBody: CreateDocumentBody = {
    name: name,
    type: 'notebook',
    description: description || '',
    content: new Blob([JSON.stringify(notebooksBody)], {
      type: 'application/json',
    }),
  };

  // Add custom ID if attaching to a problem
  if (documentId) {
    requestBody.id = documentId;
  }

  console.log(`Creating document with body:`, {
    id: requestBody.id,
    name: requestBody.name,
    type: requestBody.type,
    description: requestBody.description,
    content: '[Blob]',
  });

  const document = await documentsClient.createDocument({
    body: requestBody,
  });

  console.log(`Document created with ID: ${document.id}`);
  if (documentId && document.id !== documentId) {
    console.warn(`WARNING: Custom ID was not applied! Expected: ${documentId}, Got: ${document.id}`);
  }

  // If attaching to a problem, make the document public (not private)
  // This is required for the notebook to be visible in the problem's troubleshooting section
  if (problemId && document.id) {
    try {
      // Make the document public by setting isPrivate to false
      // This matches the working Dynatrace workflow pattern
      console.log(`Attempting to make document public. ID: ${document.id}, Version: ${document.version}`);
      const updateResult = await documentsClient.updateDocument({
        id: document.id,
        optimisticLockingVersion: document.version,
        body: {
          isPrivate: false,
        },
      });
      console.log(`Document made public (isPrivate: false). New version: ${updateResult.documentMetadata?.version}`);
    } catch (error: any) {
      // Log the full error details to understand what's happening
      console.error('Failed to make document public:', {
        message: error?.message,
        status: error?.response?.status,
        body: error?.body,
        fullError: error,
      });
    }
  }

  return document;
};

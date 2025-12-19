import { HttpClient } from '@dynatrace-sdk/http-client';
import { DocumentsClient } from '@dynatrace-sdk/client-document';

function generateUUID() {
  // Generate a simple UUID (version 4) for section IDs, e.g., d73d7c64-6a86-4bef-84d7-011ab65d5f89
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16),
  );
}

export const createDynatraceNotebook = async (
  dtClient: HttpClient,
  name: string,
  content: Array<{ type: 'dql' | 'markdown'; text: string }>,
  description?: string,
) => {
  const documentsClient = new DocumentsClient(dtClient);

  /** Notebooks Body - unfortunately not very well structured and not very well defined in TypeScript */
  const notebooksBody = {
    version: '7',
    sections: [] as any[],
  };

  for (const item of content) {
    // check every line whether it starts with a DQL statement, or it's a normal markdown like text
    if (item.type === 'dql') {
      // DQL Query
      notebooksBody.sections.push({
        id: generateUUID(),
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
        id: generateUUID(),
        type: 'markdown',
        markdown: item.text, // multi-line markdown
      });
    }
  }

  return await documentsClient.createDocument({
    body: {
      name: name,
      description: description || '',
      type: 'notebook',
      content: new Blob([JSON.stringify(notebooksBody)], {
        type: 'application/json',
      }),
    },
  });
};

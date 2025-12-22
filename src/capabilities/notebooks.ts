import { randomUUID } from 'crypto';
import { HttpClient } from '@dynatrace-sdk/http-client';
import { DocumentsClient } from '@dynatrace-sdk/client-document';

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

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createDynatraceNotebook = void 0;
const crypto_1 = require('crypto');
const client_document_1 = require('@dynatrace-sdk/client-document');
const createDynatraceNotebook = async (dtClient, name, content, description) => {
  const documentsClient = new client_document_1.DocumentsClient(dtClient);
  /** Notebooks Body - unfortunately not very well structured and not very well defined in TypeScript */
  const notebooksBody = {
    version: '7',
    sections: [],
  };
  for (const item of content) {
    // check every line whether it starts with a DQL statement, or it's a normal markdown like text
    if (item.type === 'dql') {
      // DQL Query
      notebooksBody.sections.push({
        id: (0, crypto_1.randomUUID)(),
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
        id: (0, crypto_1.randomUUID)(),
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
exports.createDynatraceNotebook = createDynatraceNotebook;

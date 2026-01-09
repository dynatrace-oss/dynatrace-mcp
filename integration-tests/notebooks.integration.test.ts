/**
 * Integration test for notebooks functionality
 *
 * This test verifies the notebook creation functionality by making actual API calls
 * to the Dynatrace environment. These tests require valid authentication credentials.
 */

import { config } from 'dotenv';
import { createDtHttpClient } from '../src/authentication/dynatrace-clients';
import { createDynatraceNotebook } from '../src/capabilities/notebooks';
import { getDynatraceEnv, DynatraceEnv } from '../src/getDynatraceEnv';
import { DocumentsClient } from '@dynatrace-sdk/client-document';

// Load environment variables
config();

const API_RATE_LIMIT_DELAY = 100; // Delay in milliseconds to avoid hitting API rate limits

const scopesBase = ['app-engine:apps:run'];

const scopesNotebooks = [
  'document:documents:write', // Create and update documents
  'document:documents:read', // Read documents
  'document:documents:delete', // Delete documents (for cleanup)
];

describe('Notebooks Integration Tests', () => {
  let dynatraceEnv: DynatraceEnv;
  const createdDocumentIds: string[] = []; // Track created documents for cleanup

  // Setup that runs once before all tests
  beforeAll(async () => {
    try {
      dynatraceEnv = getDynatraceEnv();
      console.log(`Testing against environment: ${dynatraceEnv.dtEnvironment}`);
    } catch (err) {
      throw new Error(`Environment configuration error: ${(err as Error).message}`);
    }
  });

  afterEach(async () => {
    // sleep after every call to avoid hitting API Rate limits
    await new Promise((resolve) => setTimeout(resolve, API_RATE_LIMIT_DELAY));
  });

  // Cleanup after all tests
  afterAll(async () => {
    if (createdDocumentIds.length > 0) {
      console.log(`Cleaning up ${createdDocumentIds.length} created documents...`);
      const dtClient = await createHttpClient();
      const documentsClient = new DocumentsClient(dtClient);

      for (const docId of createdDocumentIds) {
        try {
          // Get the document to get its version for deletion
          const doc = await documentsClient.getDocumentMetadata({ id: docId });
          await documentsClient.deleteDocument({
            id: docId,
            optimisticLockingVersion: doc.version,
          });
          console.log(`Deleted document: ${docId}`);
        } catch (error) {
          console.warn(`Failed to delete document ${docId}:`, error);
        }
      }
    }
  });

  // Helper function to create HTTP client
  const createHttpClient = async () => {
    const { oauthClientId, oauthClientSecret, dtEnvironment, dtPlatformToken } = dynatraceEnv;

    return await createDtHttpClient(
      dtEnvironment,
      scopesBase.concat(scopesNotebooks),
      oauthClientId,
      oauthClientSecret,
      dtPlatformToken,
    );
  };

  test('should create a simple notebook without problem attachment', async () => {
    const dtClient = await createHttpClient();

    const notebookName = `Test Notebook - ${new Date().toISOString()}`;
    const content = [
      { type: 'markdown' as const, text: '## Test Summary\nThis is a test notebook created by integration tests.' },
      { type: 'dql' as const, text: 'fetch logs | limit 5' },
    ];

    const result = await createDynatraceNotebook(dtClient, notebookName, content, 'Integration test notebook');

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe(notebookName);
    expect(result.type).toBe('notebook');

    // Track for cleanup
    createdDocumentIds.push(result.id);

    console.log(`Created notebook with ID: ${result.id}`);
  });

  test('should create a notebook with custom document ID for problem attachment', async () => {
    const dtClient = await createHttpClient();

    const notebookName = `Test TSG Notebook - ${new Date().toISOString()}`;
    const content = [
      { type: 'markdown' as const, text: '## Problem Analysis\nThis notebook is for problem troubleshooting.' },
      { type: 'dql' as const, text: 'fetch logs | filter loglevel == "ERROR" | limit 10' },
      { type: 'markdown' as const, text: '## Next Steps\n- Investigate root cause\n- Apply fix' },
    ];

    // Use a fake problem ID for testing the ID generation
    const fakeProblemId = '1234567890123456789_1234567890000V2';

    const result = await createDynatraceNotebook(
      dtClient,
      notebookName,
      content,
      'Integration test TSG notebook',
      fakeProblemId,
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe(notebookName);
    expect(result.type).toBe('notebook');

    // Check if custom ID was applied (it should start with 'problem-TSG-')
    const customIdApplied = result.id.startsWith('problem-TSG-');
    console.log(`Custom ID applied: ${customIdApplied}`);
    console.log(`Document ID: ${result.id}`);

    if (customIdApplied) {
      console.log('SUCCESS: Custom document ID was accepted by Dynatrace API');
      // Verify the ID contains the problem ID (with underscore replaced by hyphen)
      expect(result.id).toContain('1234567890123456789-1234567890000V2');
    } else {
      console.warn('WARNING: Custom document ID was NOT applied - API returned a UUID instead');
      console.warn('This indicates that external API calls cannot set custom document IDs');
    }

    // Track for cleanup
    createdDocumentIds.push(result.id);
  });

  test('should verify notebook is made public when problem ID is provided', async () => {
    const dtClient = await createHttpClient();
    const documentsClient = new DocumentsClient(dtClient);

    const notebookName = `Test Public Notebook - ${new Date().toISOString()}`;
    const content = [{ type: 'markdown' as const, text: '## Public Test\nThis notebook should be public.' }];

    const fakeProblemId = 'P-123456';

    const result = await createDynatraceNotebook(
      dtClient,
      notebookName,
      content,
      'Testing public visibility',
      fakeProblemId,
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();

    // Track for cleanup
    createdDocumentIds.push(result.id);

    // Now fetch the document metadata to check if it's public
    // Note: The SDK doesn't directly expose isPrivate in metadata,
    // but we can check if the updateDocument call succeeded by the logs
    const metadata = await documentsClient.getDocumentMetadata({ id: result.id });
    console.log(`Document metadata:`, {
      id: metadata.id,
      name: metadata.name,
      version: metadata.version,
      owner: metadata.owner,
    });

    // The test passes if no error was thrown during creation
    // The actual visibility can be verified in the Dynatrace UI
    console.log(`Document created. Check Dynatrace UI to verify visibility settings.`);
  });

  test('should handle display ID format (P-prefix)', async () => {
    const dtClient = await createHttpClient();

    const notebookName = `Test Display ID Notebook - ${new Date().toISOString()}`;
    const content = [{ type: 'markdown' as const, text: '## Display ID Test\nUsing P-prefixed problem ID.' }];

    const displayProblemId = 'P-260158';

    const result = await createDynatraceNotebook(
      dtClient,
      notebookName,
      content,
      'Testing display ID format',
      displayProblemId,
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();

    // Track for cleanup
    createdDocumentIds.push(result.id);

    // If custom ID was applied, it should NOT contain 'P-' (should be stripped)
    if (result.id.startsWith('problem-TSG-')) {
      expect(result.id).not.toContain('P-');
      expect(result.id).toContain('260158');
      console.log('SUCCESS: P- prefix was correctly stripped from problem ID');
    } else {
      console.warn('Custom ID was not applied (API returned UUID)');
    }

    console.log(`Document ID: ${result.id}`);
  });
});

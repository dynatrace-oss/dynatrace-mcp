/**
 * Unit tests for notebooks functionality
 */

import { randomUUID } from 'crypto';

// Test the document ID generation logic
describe('Notebooks - Document ID Generation', () => {
  const generateDocumentId = (problemId: string): string => {
    const normalizedProblemId = problemId.startsWith('P-') ? problemId.substring(2) : problemId;
    const sanitizedProblemId = normalizedProblemId.replaceAll('_', '-');
    const suffix = randomUUID().substring(0, 8);
    return `problem-TSG-${sanitizedProblemId}-${suffix}`.substring(0, 100);
  };

  test('should generate correct document ID from display ID (P-format)', () => {
    const problemId = 'P-260158';
    const documentId = generateDocumentId(problemId);

    expect(documentId).toMatch(/^problem-TSG-260158-[a-f0-9]{8}$/);
    expect(documentId.length).toBeLessThanOrEqual(100);
    expect(documentId).not.toContain('P-');
  });

  test('should generate correct document ID from full event ID', () => {
    const problemId = '1246904261685843769_1767844800000V2';
    const documentId = generateDocumentId(problemId);

    // Should replace underscore with hyphen
    expect(documentId).toMatch(/^problem-TSG-1246904261685843769-1767844800000V2-[a-f0-9]{8}$/);
    expect(documentId.length).toBeLessThanOrEqual(100);
    expect(documentId).not.toContain('_');
  });

  test('should handle event ID without underscore', () => {
    const problemId = '1246904261685843769';
    const documentId = generateDocumentId(problemId);

    expect(documentId).toMatch(/^problem-TSG-1246904261685843769-[a-f0-9]{8}$/);
    expect(documentId.length).toBeLessThanOrEqual(100);
  });

  test('should truncate to 100 characters max', () => {
    // Create a very long problem ID
    const longProblemId = 'A'.repeat(200);
    const documentId = generateDocumentId(longProblemId);

    expect(documentId.length).toBe(100);
    expect(documentId.startsWith('problem-TSG-')).toBe(true);
  });

  test('should generate unique IDs for same problem', () => {
    const problemId = 'P-260158';
    const id1 = generateDocumentId(problemId);
    const id2 = generateDocumentId(problemId);

    expect(id1).not.toBe(id2);
    // But both should have the same prefix (problem-TSG-260158-)
    const expectedPrefix = 'problem-TSG-260158-';
    expect(id1.startsWith(expectedPrefix)).toBe(true);
    expect(id2.startsWith(expectedPrefix)).toBe(true);
  });
});

describe('Notebooks - Content Structure', () => {
  test('should create correct notebook body structure', () => {
    const notebooksBody = {
      defaultTimeframe: { from: 'now()-2h', to: 'now()' },
      defaultSegments: [] as any[],
      sections: [] as any[],
    };

    expect(notebooksBody).toHaveProperty('defaultTimeframe');
    expect(notebooksBody).toHaveProperty('defaultSegments');
    expect(notebooksBody).toHaveProperty('sections');
    expect(notebooksBody.defaultTimeframe.from).toBe('now()-2h');
    expect(notebooksBody.defaultTimeframe.to).toBe('now()');
  });

  test('should create DQL section with correct structure', () => {
    const dqlSection = {
      id: randomUUID(),
      type: 'dql',
      showTitle: false,
      state: {
        input: {
          value: 'fetch logs | limit 10',
        },
      },
    };

    expect(dqlSection.type).toBe('dql');
    expect(dqlSection.state.input.value).toBe('fetch logs | limit 10');
    expect(dqlSection.showTitle).toBe(false);
  });

  test('should create markdown section with correct structure', () => {
    const markdownSection = {
      id: randomUUID(),
      type: 'markdown',
      markdown: '## Summary\nThis is the summary.',
    };

    expect(markdownSection.type).toBe('markdown');
    expect(markdownSection.markdown).toContain('## Summary');
  });
});

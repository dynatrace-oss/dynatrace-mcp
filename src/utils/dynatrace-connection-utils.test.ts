import { ClientRequestError } from '@dynatrace-sdk/shared-errors';
import { handleClientRequestError, extractMissingScopes } from './dynatrace-connection-utils';

// Helper to create a mock ClientRequestError
function createMockClientRequestError(status: number, message: string, body: unknown): ClientRequestError {
  return {
    message,
    response: { status },
    body,
  } as unknown as ClientRequestError;
}

describe('extractMissingScopes', () => {
  it('should extract missing scopes from a valid error body', () => {
    const body = {
      error: {
        code: 403,
        details: {
          missingScopes: ['platform-management:environments:read', 'storage:logs:read'],
        },
        message: 'The authorization token does not provide the necessary permissions.',
      },
    };
    expect(extractMissingScopes(body)).toEqual(['platform-management:environments:read', 'storage:logs:read']);
  });

  it('should return empty array when body is null', () => {
    expect(extractMissingScopes(null)).toEqual([]);
  });

  it('should return empty array when body has no error property', () => {
    expect(extractMissingScopes({ something: 'else' })).toEqual([]);
  });

  it('should return empty array when error has no details', () => {
    expect(extractMissingScopes({ error: { code: 403 } })).toEqual([]);
  });

  it('should return empty array when details has no missingScopes', () => {
    expect(extractMissingScopes({ error: { details: {} } })).toEqual([]);
  });

  it('should return empty array when missingScopes is not an array', () => {
    expect(extractMissingScopes({ error: { details: { missingScopes: 'not-an-array' } } })).toEqual([]);
  });

  it('should return empty array when missingScopes contains non-string items', () => {
    expect(extractMissingScopes({ error: { details: { missingScopes: [123, true] } } })).toEqual([]);
  });
});

describe('handleClientRequestError', () => {
  it('should include actionable missing scopes message for 403 with missingScopes', () => {
    const error = createMockClientRequestError(
      403,
      'The authorization token does not provide the necessary permissions.',
      {
        error: {
          code: 403,
          details: {
            missingScopes: ['platform-management:environments:read'],
          },
          message: 'The authorization token does not provide the necessary permissions.',
        },
      },
    );

    const result = handleClientRequestError(error);
    expect(result).toContain(
      'Add the scope(s) platform-management:environments:read to your platform token / OAuth client.',
    );
    expect(result).toContain('Client Request Error');
    expect(result).toContain('403');
  });

  it('should list multiple missing scopes', () => {
    const error = createMockClientRequestError(403, 'Forbidden', {
      error: {
        code: 403,
        details: {
          missingScopes: ['scope:a', 'scope:b', 'scope:c'],
        },
        message: 'Forbidden',
      },
    });

    const result = handleClientRequestError(error);
    expect(result).toContain('Add the scope(s) scope:a, scope:b, scope:c to your platform token / OAuth client.');
  });

  it('should fall back to generic message for 403 without missingScopes', () => {
    const error = createMockClientRequestError(403, 'Forbidden', {});

    const result = handleClientRequestError(error);
    expect(result).toContain(
      'Note: Your user or service-user is most likely lacking the necessary permissions/scopes for this API Call.',
    );
  });

  it('should not include permissions note for non-403 errors', () => {
    const error = createMockClientRequestError(500, 'Internal Server Error', {});

    const result = handleClientRequestError(error);
    expect(result).not.toContain('scope');
    expect(result).not.toContain('permissions');
    expect(result).toContain('500');
  });
});

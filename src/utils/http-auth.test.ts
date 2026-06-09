import { EventEmitter } from 'node:events';
import { IncomingMessage } from 'node:http';
import { validateBearerToken, readBodyWithLimit, MAX_BODY_BYTES } from './http-auth';

// ---------------------------------------------------------------------------
// validateBearerToken
// ---------------------------------------------------------------------------

describe('validateBearerToken', () => {
  const TOKEN = 'super-secret-token';

  it('returns true for a valid bearer token', () => {
    expect(validateBearerToken(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  it('returns false for a wrong token', () => {
    expect(validateBearerToken('Bearer wrong-token', TOKEN)).toBe(false);
  });

  it('returns false when the header is undefined', () => {
    expect(validateBearerToken(undefined, TOKEN)).toBe(false);
  });

  it('returns false when the header is an empty string', () => {
    expect(validateBearerToken('', TOKEN)).toBe(false);
  });

  it('returns false when the header has no "Bearer " prefix', () => {
    expect(validateBearerToken(TOKEN, TOKEN)).toBe(false);
  });

  it('returns false when the header uses a different scheme', () => {
    expect(validateBearerToken(`Basic ${TOKEN}`, TOKEN)).toBe(false);
  });

  it('returns false for a token that is a prefix of the expected token', () => {
    expect(validateBearerToken(`Bearer super-secret`, TOKEN)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// readBodyWithLimit
// ---------------------------------------------------------------------------

/**
 * Creates a fake IncomingMessage that emits the given chunks.
 */
function makeFakeRequest(chunks: Buffer[]): IncomingMessage {
  const emitter = new EventEmitter() as IncomingMessage;

  // Provide the async-iterator protocol used by `for await (const chunk of req)`
  (emitter as any)[Symbol.asyncIterator] = async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  };

  // Stub destroy so readBodyWithLimit can call it without errors
  (emitter as any).destroy = () => {};

  return emitter;
}

describe('readBodyWithLimit', () => {
  it('returns the complete body when under the limit', async () => {
    const body = Buffer.from('hello world');
    const req = makeFakeRequest([body]);

    const result = await readBodyWithLimit(req);
    expect(result).toEqual(body);
  });

  it('concatenates multiple chunks into a single buffer', async () => {
    const chunks = [Buffer.from('foo'), Buffer.from('bar'), Buffer.from('baz')];
    const req = makeFakeRequest(chunks);

    const result = await readBodyWithLimit(req);
    expect(result.toString()).toBe('foobarbaz');
  });

  it('succeeds for a body exactly at the limit', async () => {
    const body = Buffer.alloc(MAX_BODY_BYTES, 0x41); // MAX_BODY_BYTES of 'A'
    const req = makeFakeRequest([body]);

    const result = await readBodyWithLimit(req);
    expect(result.length).toBe(MAX_BODY_BYTES);
  });

  it('throws when the body exceeds the limit', async () => {
    const oversized = Buffer.alloc(MAX_BODY_BYTES + 1, 0x42);
    const req = makeFakeRequest([oversized]);

    await expect(readBodyWithLimit(req)).rejects.toThrow('Request body too large');
  });

  it('throws when multiple chunks together exceed the limit', async () => {
    const half = Buffer.alloc(MAX_BODY_BYTES / 2 + 1, 0x43);
    const req = makeFakeRequest([half, half]);

    await expect(readBodyWithLimit(req)).rejects.toThrow('Request body too large');
  });

  it('returns an empty buffer for an empty body', async () => {
    const req = makeFakeRequest([]);

    const result = await readBodyWithLimit(req);
    expect(result.length).toBe(0);
  });
});

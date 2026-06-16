import { timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';

/**
 * Maximum allowed request body size in bytes (1 MiB).
 */
export const MAX_BODY_BYTES = 1_048_576;

/**
 * Validates a bearer token from an HTTP Authorization header using constant-time comparison.
 *
 * @param authHeader - The value of the `Authorization` request header (may be undefined).
 * @param expectedToken - The token that the header value must match.
 * @returns `true` if the header contains a valid `Bearer <token>` that matches `expectedToken`,
 *          `false` otherwise (missing header, wrong format, or token mismatch).
 */
export function validateBearerToken(authHeader: string | undefined, expectedToken: string): boolean {
  const prefix = 'Bearer ';

  if (!authHeader || !authHeader.startsWith(prefix)) {
    return false;
  }

  // grab token from `Bearer <token>`
  const providedToken = authHeader.slice(prefix.length);

  try {
    const a = Buffer.from(providedToken);
    const b = Buffer.from(expectedToken);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Reads the full request body while enforcing a maximum byte limit.
 *
 * @param req - The incoming HTTP request.
 * @returns A `Buffer` containing the entire request body.
 * @throws An error with message `'Request body too large'` if the body exceeds `MAX_BODY_BYTES`.
 */
export async function readBodyWithLimit(req: Readable): Promise<Buffer> {
  let totalBytes = 0;
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    totalBytes += (chunk as Buffer).length;
    if (totalBytes > MAX_BODY_BYTES) {
      req.destroy();
      throw new Error('Request body too large');
    }
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks);
}

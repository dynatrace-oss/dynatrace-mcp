import { randomBytes, createHash } from 'node:crypto';

/**
 * Base64URL encoding according to RFC 7636
 */
export const base64URLEncode = (buffer: Buffer): string => {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Generates a cryptographically secure random string for OAuth state parameter
 * Uses hex encoding for better compatibility
 */
export const generateRandomState = (): string => {
  return randomBytes(20).toString('hex');
};

/**
 * Generates a random port number between min and max (inclusive)
 */
export const getRandomPort = (min = 5344, max = 5349): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

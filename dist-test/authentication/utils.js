'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getRandomPort = exports.generateRandomState = exports.base64URLEncode = void 0;
const node_crypto_1 = require('node:crypto');
/**
 * Base64URL encoding according to RFC 7636
 */
const base64URLEncode = (buffer) => {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};
exports.base64URLEncode = base64URLEncode;
/**
 * Generates a cryptographically secure random string for OAuth state parameter
 * Uses hex encoding for better compatibility
 */
const generateRandomState = () => {
  return (0, node_crypto_1.randomBytes)(20).toString('hex');
};
exports.generateRandomState = generateRandomState;
/**
 * Generates a random port number between min and max (inclusive), excluding specified (already used) ports
 * @param min Minimum port number (default: 5344)
 * @param max Maximum port number (default: 5349)
 * @param excludePorts Array of port numbers to exclude (e.g., already used ports)
 * @returns A random port number between min and max, excluding already used ports
 */
const getRandomPort = (min = 5344, max = 5349, excludePorts = []) => {
  // ensure that we have at least one port to choose from
  if (excludePorts.length >= max - min + 1) {
    throw new Error('No available ports to choose from');
  }
  // pick a random port between max and min
  let port;
  do {
    port = Math.floor(Math.random() * (max - min + 1)) + min;
    // keep iterating until we find a port that is not in the excludePorts list
  } while (excludePorts.includes(port));
  return port;
};
exports.getRandomPort = getRandomPort;

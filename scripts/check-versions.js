#!/usr/bin/env node
/**
 * Verifies that the version field is identical across all version-bearing files:
 *   - package.json
 *   - package-lock.json
 *   - manifest.json
 *   - gemini-extension.json
 *   - server.json (all occurrences of "version")
 *
 * Exits with code 1 and prints a diff when versions are out of sync.
 * No external dependencies – uses only built-in Node.js modules.
 *
 * Usage: node scripts/check-versions.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

/**
 * Reads a single version value from a JSON file via a selector function.
 * Returns { file, version } or exits with code 1 if the version cannot be read.
 */
function readVersion(file, selector) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const version = selector(JSON.parse(content));
  if (!version) {
    console.error(`ERROR: Could not read "version" from ${file}`);
    process.exit(1);
  }
  return { file, version };
}

/**
 * Reads all "version" values from a file using the same regex as update-versions.js,
 * verifies they are internally consistent, and returns the single resolved version.
 */
function readAllVersions(file) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const matches = [...content.matchAll(/"version":\s*"(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)"/g)].map((m) => m[1]);
  if (matches.length === 0) {
    console.error(`ERROR: Could not read any "version" from ${file}`);
    process.exit(1);
  }
  const unique = [...new Set(matches)];
  if (unique.length > 1) {
    console.error(`ERROR: Inconsistent "version" values within ${file}: ${unique.join(', ')}`);
    process.exit(1);
  }
  return { file, version: unique[0] };
}

const versions = [
  readVersion('package.json', (p) => p.version),
  readVersion('package-lock.json', (p) => p.version),
  readVersion('manifest.json', (p) => p.version),
  readVersion('gemini-extension.json', (p) => p.version),
  readAllVersions('server.json'),
];

const unique = [...new Set(versions.map((v) => v.version))];

if (unique.length === 1) {
  console.log(`✔ All versions are in sync: ${unique[0]}`);
  process.exit(0);
}

console.error('ERROR: Version mismatch detected across files:');
for (const { file, version } of versions) {
  console.error(`  ${file}: ${version}`);
}
process.exit(1);

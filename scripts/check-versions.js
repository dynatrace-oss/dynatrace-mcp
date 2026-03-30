#!/usr/bin/env node
/**
 * Verifies that the version field is identical across all version-bearing files:
 *   - package.json
 *   - package-lock.json
 *   - manifest.json
 *   - server.json
 *
 * Exits with code 1 and prints a diff when versions are out of sync.
 * No external dependencies – uses only built-in Node.js modules.
 *
 * Usage: node scripts/check-versions.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

const FILES = [
  { file: 'package.json', read: (content) => JSON.parse(content).version },
  { file: 'package-lock.json', read: (content) => JSON.parse(content).version },
  { file: 'manifest.json', read: (content) => JSON.parse(content).version },
  { file: 'server.json', read: (content) => JSON.parse(content).version },
];

const versions = FILES.map(({ file, read }) => {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const version = read(content);
  if (!version) {
    console.error(`ERROR: Could not read "version" from ${file}`);
    process.exit(1);
  }
  return { file, version };
});

const unique = [...new Set(versions.map((v) => v.version))];

if (unique.length === 1) {
  console.log(`✔ All versions are in sync: ${unique[0]}`);
  process.exit(0);
} else {
  console.error('ERROR: Version mismatch detected across files:');
  for (const { file, version } of versions) {
    console.error(`  ${file}: ${version}`);
  }
  process.exit(1);
}

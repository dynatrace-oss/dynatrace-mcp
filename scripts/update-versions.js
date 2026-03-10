#!/usr/bin/env node
/**
 * Updates the version field in server.json and gemini-extension.json.
 * The version in package.json is handled separately by `npm version`.
 *
 * Usage: node scripts/update-versions.js <version>
 */

'use strict';

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/update-versions.js <version>');
  process.exit(1);
}

/**
 * Replaces all `"version": "<semver>"` occurrences in a file with the new version.
 * Using string replacement preserves the original file formatting.
 */
function updateVersionInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(/"version":\s*"\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?"/g, `"version": "${version}"`);
  fs.writeFileSync(filePath, updated);
  console.log(`Updated ${path.basename(filePath)} to version ${version}.`);
}

updateVersionInFile(path.join(process.cwd(), 'server.json'));
updateVersionInFile(path.join(process.cwd(), 'gemini-extension.json'));

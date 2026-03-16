#!/usr/bin/env node
/**
 * Runs `changeset version` to bump package.json and update CHANGELOG.md,
 * then syncs the version to server.json, gemini-extension.json, and package-lock.json.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// Apply changeset version bumps
execSync('npx changeset version', { stdio: 'inherit' });

// Read the updated version from package.json
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
const version = pkg.version;

// Sync the version to other files (use spawnSync to avoid shell injection)
const result = spawnSync('node', ['scripts/update-versions.js', version], { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

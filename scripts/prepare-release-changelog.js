#!/usr/bin/env node
/**
 * Prepares CHANGELOG.md for a new release by:
 * 1. Moving "Unreleased Changes" entries to a new versioned section.
 * 2. If no unreleased entries exist, generating bullet points from git log since the last tag.
 *
 * Usage: node scripts/prepare-release-changelog.js <version>
 */

'use strict';

const fs = require('fs');
const { execSync, spawnSync } = require('child_process');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/prepare-release-changelog.js <version>');
  process.exit(1);
}

const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');
const UNRELEASED_HEADER = '## Unreleased Changes';

const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');

const headerIndex = changelog.indexOf(UNRELEASED_HEADER);
if (headerIndex === -1) {
  console.error('Could not find "## Unreleased Changes" section in CHANGELOG.md');
  process.exit(1);
}

const afterHeader = headerIndex + UNRELEASED_HEADER.length;
const rest = changelog.slice(afterHeader);

// Find where the next ## section starts (i.e., the previous release)
const nextSectionMatch = rest.match(/\n## /);
const nextSectionOffset = nextSectionMatch ? nextSectionMatch.index : rest.length;

const unreleasedContent = rest.slice(0, nextSectionOffset).trim();

let newEntries;
if (unreleasedContent) {
  newEntries = unreleasedContent;
  console.log('Using existing "Unreleased Changes" entries for the new version section.');
} else {
  // Generate entries from git log since the last tag
  try {
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf8' }).trim();
    const result = spawnSync('git', ['log', '--pretty=format:- %s', `${lastTag}..HEAD`, '--no-merges'], {
      encoding: 'utf8',
    });
    const commits = (result.stdout || '').trim();
    if (commits) {
      newEntries = commits;
      console.log(`Generated entries from git log since ${lastTag}.`);
    } else {
      newEntries = '- Minor updates and improvements.';
      console.log('No new commits found since last tag; using default entry.');
    }
  } catch {
    // No tags exist yet – use all non-merge commits
    try {
      const result = spawnSync('git', ['log', '--pretty=format:- %s', '--no-merges'], {
        encoding: 'utf8',
      });
      const commits = (result.stdout || '').trim();
      newEntries = commits || '- Initial release.';
    } catch {
      newEntries = '- Initial release.';
    }
    console.log('No previous tags found; using all commits.');
  }
}

// Reconstruct the changelog:
// <everything up to and including "## Unreleased Changes">
// \n\n
// ## <version>\n\n<entries>\n
// <rest of the file starting from the next section>
const beforeUnreleased = changelog.slice(0, afterHeader);
const afterUnreleased = rest.slice(nextSectionOffset);

const newChangelog = beforeUnreleased + '\n\n' + `## ${version}\n\n${newEntries}\n` + afterUnreleased;

fs.writeFileSync(CHANGELOG_PATH, newChangelog);
console.log(`CHANGELOG.md updated: added "## ${version}" section.`);

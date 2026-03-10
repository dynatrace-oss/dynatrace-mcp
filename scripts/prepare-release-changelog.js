#!/usr/bin/env node
/**
 * Prepares CHANGELOG.md for a new release by generating AI-powered release notes
 * via the GitHub Models API (gpt-4o-mini).
 *
 * Requires GITHUB_TOKEN to be set for AI generation. Falls back to simple git log
 * bullet points when the token is unavailable (e.g., local runs without auth).
 *
 * Usage: node scripts/prepare-release-changelog.js <version>
 */

'use strict';

const fs = require('fs');
const https = require('https');
const { spawnSync } = require('child_process');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/prepare-release-changelog.js <version>');
  process.exit(1);
}

const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');
const CHANGELOG_INSTRUCTIONS_PATH = path.join(
  process.cwd(),
  '.github/instructions/changelog.instructions.md',
);
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

/** Returns commit subjects since the last git tag, or all commits if no tag exists. */
function getCommitsSinceLastTag() {
  const tagResult = spawnSync('git', ['describe', '--tags', '--abbrev=0'], { encoding: 'utf8' });
  let gitArgs;
  if (tagResult.status === 0) {
    const lastTag = tagResult.stdout.trim();
    gitArgs = ['log', `${lastTag}..HEAD`, '--no-merges', '--pretty=format:%s'];
    console.log(`Collecting commits since ${lastTag}...`);
  } else {
    gitArgs = ['log', '--no-merges', '--pretty=format:%s'];
    console.log('No previous tags found; collecting all commits...');
  }
  const result = spawnSync('git', gitArgs, { encoding: 'utf8' });
  return (result.stdout || '')
    .trim()
    .split('\n')
    .filter(Boolean);
}

/** Calls GitHub Models API and returns the AI-generated changelog entries, or null on failure. */
function generateWithAI(commits, existingUnreleased) {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.log('GITHUB_TOKEN not set – skipping AI generation.');
    return Promise.resolve(null);
  }

  // Read and strip frontmatter from the changelog style instructions
  let styleGuide = '';
  if (fs.existsSync(CHANGELOG_INSTRUCTIONS_PATH)) {
    styleGuide = fs.readFileSync(CHANGELOG_INSTRUCTIONS_PATH, 'utf8').replace(/^---[\s\S]*?---\n/, '');
  }

  const contextParts = [];
  if (commits.length > 0) {
    contextParts.push(`Git commits since the last release:\n${commits.map((c) => `- ${c}`).join('\n')}`);
  }
  if (existingUnreleased) {
    contextParts.push(`Manually curated unreleased notes (use as additional context):\n${existingUnreleased}`);
  }

  if (contextParts.length === 0) {
    console.log('No commits or unreleased notes to process.');
    return Promise.resolve(null);
  }

  const systemPrompt =
    `You are a technical writer preparing release notes for a software project.\n\n` +
    `${styleGuide}\n\n` +
    `Your task: generate clear, concise, user-facing changelog entries for a new release.\n` +
    `Output ONLY a list of bullet points (no headers, no version number, no preamble).\n` +
    `Each bullet must start with "- ". Write in past tense. Do not use emojis.`;

  const userPrompt =
    `Generate release notes for version ${version} based on:\n\n` +
    contextParts.join('\n\n');

  const payload = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'models.inference.ai.azure.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${githubToken}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const content = response?.choices?.[0]?.message?.content?.trim();
          if (content) {
            resolve(content);
          } else {
            console.error('Unexpected API response:', JSON.stringify(response));
            resolve(null);
          }
        } catch (e) {
          console.error('Failed to parse API response:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('GitHub Models API request failed:', e.message);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  const commits = getCommitsSinceLastTag();

  // Attempt AI generation
  console.log('Generating release notes with GitHub Models (gpt-4o-mini)...');
  const aiNotes = await generateWithAI(commits, unreleasedContent);

  let newEntries;
  if (aiNotes) {
    newEntries = aiNotes;
    console.log('AI-generated release notes ready.');
  } else if (unreleasedContent) {
    // Fallback 1: use manually curated unreleased notes as-is
    newEntries = unreleasedContent;
    console.log('Falling back to existing "Unreleased Changes" entries.');
  } else if (commits.length > 0) {
    // Fallback 2: plain git log bullets
    newEntries = commits.map((c) => `- ${c}`).join('\n');
    console.log('Falling back to raw git log commits.');
  } else {
    newEntries = '- Minor updates and improvements.';
    console.log('No commits found; using default entry.');
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
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});

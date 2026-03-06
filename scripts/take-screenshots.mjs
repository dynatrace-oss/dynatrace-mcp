#!/usr/bin/env node
/**
 * take-screenshots.mjs
 *
 * Takes Playwright screenshots of the MCP App preview pages and saves them to
 * the `screenshots/` output directory.
 *
 * Usage:
 *   node scripts/take-screenshots.mjs [--output <dir>] [--width <px>] [--height <px>]
 *
 * Prerequisites:
 *   npm install --no-save playwright
 *   npx playwright install chromium --with-deps
 *   npm run build:ui
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    output: { type: 'string', short: 'o', default: 'screenshots' },
    width: { type: 'string', short: 'w', default: '1280' },
    height: { type: 'string', short: 'h', default: '720' },
  },
  allowPositionals: false,
  strict: false,
});

const OUTPUT_DIR = resolve(args.output);
const VIEWPORT_WIDTH = Number(args.width);
const VIEWPORT_HEIGHT = Number(args.height);

// ---------------------------------------------------------------------------
// Screenshots to capture
// ---------------------------------------------------------------------------

/** Each entry describes a screenshot to take. */
const SCREENSHOTS = [
  {
    name: 'execute-dql-table',
    label: 'DQL Results – Table View',
    path: '/execute-dql/preview.html?state=table',
  },
  {
    name: 'execute-dql-loading',
    label: 'DQL Results – Loading State',
    path: '/execute-dql/preview.html?state=loading',
  },
  {
    name: 'execute-dql-error',
    label: 'DQL Results – Error State',
    path: '/execute-dql/preview.html?state=error',
  },
  {
    name: 'execute-dql-empty',
    label: 'DQL Results – Empty Results',
    path: '/execute-dql/preview.html?state=empty',
  },
];

// ---------------------------------------------------------------------------
// Minimal static file server
// ---------------------------------------------------------------------------

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const UI_DIST = resolve(__dirname, '..', 'dist', 'ui');

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const urlPath = req.url?.split('?')[0] ?? '/';
      const filePath = join(UI_DIST, urlPath);

      try {
        const data = readFileSync(filePath);
        const ext = extname(filePath);
        const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });

    server.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Starting local file server from ${UI_DIST} …`);
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Serving at ${baseUrl}`);

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    colorScheme: 'light',
  });

  const results = [];

  for (const screenshot of SCREENSHOTS) {
    const url = `${baseUrl}${screenshot.path}`;
    console.log(`  Screenshotting ${screenshot.label} → ${url}`);

    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15_000 });
      // Wait a tick for React to finish rendering
      await page.waitForTimeout(500);

      const outputFile = join(OUTPUT_DIR, `${screenshot.name}.png`);
      await page.screenshot({ path: outputFile, fullPage: false });
      console.log(`    Saved → ${outputFile}`);
      results.push({ ...screenshot, file: outputFile, success: true });
    } catch (err) {
      console.error(`    Failed: ${err.message}`);
      results.push({ ...screenshot, success: false, error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();

  // Print summary
  console.log('\nScreenshot summary:');
  for (const r of results) {
    const status = r.success ? '✓' : '✗';
    console.log(`  ${status} ${r.label}${r.success ? '' : ` – ${r.error}`}`);
  }

  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

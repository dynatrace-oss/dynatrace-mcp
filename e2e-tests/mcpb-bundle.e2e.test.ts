/**
 * End-to-end test for the MCPB bundle published on GitHub Releases.
 *
 * Steps:
 *  1. Fetch the latest release metadata from the GitHub API.
 *  2. Locate the .mcpb asset and download it using only Node.js built-ins.
 *  3. Extract the ZIP archive with the system `unzip` utility.
 *  4. Run `node dist/index.js` (the bundle entry point declared in manifest.json)
 *     and verify that the process starts correctly: without DT_ENVIRONMENT configured
 *     it must exit with a clear diagnostic that mentions "DT_ENVIRONMENT" rather than
 *     crashing with a missing-module or other unexpected error.
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, spawnSync } from 'child_process';

const GITHUB_REPO = 'dynatrace-oss/dynatrace-mcp';
const USER_AGENT = 'dynatrace-mcp-e2e-test';
const PROCESS_SPAWN_TIMEOUT_MS = 10_000;

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubReleaseAsset[];
}

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/vnd.github.v3+json',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => (data += chunk.toString()));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error(`Failed to parse JSON response from ${url}: ${data}`));
            }
          });
          res.on('error', reject);
        },
      )
      .on('error', reject);
  });
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doGet = (currentUrl: string): void => {
      const lib: typeof https | typeof http = currentUrl.startsWith('https://') ? https : http;
      lib
        .get(currentUrl, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
          const { statusCode, headers } = res;

          // Follow redirects
          if (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) {
            const location = headers.location;
            if (!location) {
              reject(new Error(`Redirect with no location header from ${currentUrl}`));
              return;
            }
            res.resume(); // consume response body to free the socket
            doGet(location);
            return;
          }

          if (statusCode !== 200) {
            reject(new Error(`Unexpected HTTP ${statusCode} from ${currentUrl}`));
            return;
          }

          const file = fs.createWriteStream(destPath);
          res.pipe(file);
          file.on('finish', () => file.close(() => resolve()));
          file.on('error', (err) => {
            fs.unlink(destPath, () => {}); // clean up partial file
            reject(err);
          });
        })
        .on('error', reject);
    };
    doGet(url);
  });
}

describe('MCPB bundle (GitHub Release)', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynatrace-mcp-e2e-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('fetches the latest release, downloads the mcpb bundle, extracts it, and verifies it runs with Node.js', async () => {
    // ── 1. Fetch the latest release metadata ──────────────────────────────
    const release = (await fetchJson(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)) as GitHubRelease;

    expect(release.tag_name).toMatch(/^v\d+\.\d+\.\d+/);
    console.error(`Testing mcpb bundle from release ${release.tag_name}`);

    // ── 2. Locate the .mcpb asset ─────────────────────────────────────────
    const mcpbAsset = release.assets.find((asset) => asset.name.endsWith('.mcpb'));
    expect(mcpbAsset).toBeDefined();
    console.error(`Found asset: ${mcpbAsset!.name} (${mcpbAsset!.size} bytes)`);

    // ── 3. Download the .mcpb file ────────────────────────────────────────
    const mcpbPath = path.join(tmpDir, mcpbAsset!.name);
    await downloadFile(mcpbAsset!.browser_download_url, mcpbPath);

    const { size } = fs.statSync(mcpbPath);
    expect(size).toBeGreaterThan(0);
    console.error(`Downloaded ${mcpbPath} (${size} bytes)`);

    // ── 4. Extract the ZIP archive ────────────────────────────────────────
    const extractDir = path.join(tmpDir, 'extracted');
    fs.mkdirSync(extractDir);
    execSync(`unzip -q "${mcpbPath}" -d "${extractDir}"`);

    // ── 5. Verify the bundle entry point declared in manifest.json exists ─
    const entryPoint = path.join(extractDir, 'dist', 'index.js');
    expect(fs.existsSync(entryPoint)).toBe(true);

    // ── 6. Run the entry point ────────────────────────────────────────────
    // Without DT_ENVIRONMENT the server must exit with a diagnostic message
    // that mentions "DT_ENVIRONMENT".  A crash caused by a missing Node.js
    // module (e.g. "Cannot find module 'open'") would indicate the bundle
    // is incomplete and must be treated as a test failure.
    const result = spawnSync(process.execPath, [entryPoint], {
      env: { ...process.env, DT_MCP_DISABLE_TELEMETRY: 'true' },
      timeout: PROCESS_SPAWN_TIMEOUT_MS,
      encoding: 'utf8',
    });

    const combinedOutput = (result.stdout ?? '') + (result.stderr ?? '');
    console.error(`Server output:\n${combinedOutput}`);

    expect(combinedOutput).not.toContain('Cannot find module');
    expect(combinedOutput).toContain('DT_ENVIRONMENT');
    expect(result.status).toBe(1);
  });
});

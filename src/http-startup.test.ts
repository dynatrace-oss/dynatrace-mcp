import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const TSNODE = resolve(ROOT, 'node_modules', '.bin', 'ts-node');

// Strips MCP_BEARER_TOKEN from the current env so the test isn't affected by
// whatever the developer happens to have set locally.
const { MCP_BEARER_TOKEN: _stripped, ...baseEnv } = process.env;
const testEnv = {
  ...baseEnv,
  DT_ENVIRONMENT: 'https://abc12345.apps.dynatrace.com',
  DT_MCP_DISABLE_TELEMETRY: 'true',
};

describe('HTTP mode startup', () => {
  it('exits with code 1 when MCP_BEARER_TOKEN is not set', () => {
    const result = spawnSync(TSNODE, ['src/index.ts', '--http'], {
      env: testEnv,
      cwd: ROOT,
      timeout: 15000,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MCP_BEARER_TOKEN is required');
  }, 20000);
});

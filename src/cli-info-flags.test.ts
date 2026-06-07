import { spawnSync } from 'node:child_process';
import { version } from '../package.json';

function runCli(...args: string[]) {
  const env = { ...process.env };
  delete env.DT_ENVIRONMENT;
  delete env.OAUTH_CLIENT_ID;
  delete env.OAUTH_CLIENT_SECRET;
  delete env.DT_PLATFORM_TOKEN;
  delete env.NODE_OPTIONS;

  return spawnSync(process.execPath, ['-r', 'ts-node/register', 'src/index.ts', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...env,
      DT_MCP_DISABLE_TELEMETRY: 'true',
    },
  });
}

describe('CLI information flags', () => {
  it('prints help without requiring Dynatrace environment variables', () => {
    const result = runCli('--help');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('Dynatrace Model Context Protocol');
    expect(result.stderr).not.toContain('DT_ENVIRONMENT');
  });

  it('prints short help without requiring Dynatrace environment variables', () => {
    const result = runCli('-h');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('Dynatrace Model Context Protocol');
    expect(result.stderr).not.toContain('DT_ENVIRONMENT');
  });

  it('prints version without requiring Dynatrace environment variables', () => {
    const result = runCli('--version');

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(version);
    expect(result.stderr).not.toContain('DT_ENVIRONMENT');
  });

  it('prints short version without requiring Dynatrace environment variables', () => {
    const result = runCli('-v');

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(version);
    expect(result.stderr).not.toContain('DT_ENVIRONMENT');
  });

  it('rejects unknown top-level flags before environment validation', () => {
    const result = runCli('--definitely-not-a-real-flag');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("error: unknown option '--definitely-not-a-real-flag'");
    expect(result.stderr).not.toContain('DT_ENVIRONMENT');
  });

  it('keeps environment validation for server startup', () => {
    const result = runCli();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DT_ENVIRONMENT');
  });
});

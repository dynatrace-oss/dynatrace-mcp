import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Read package.json at test time (path relative to repo root, not dist)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json') as {
  bin: Record<string, string>;
  exports: Record<string, string | Record<string, string>>;
  main: string;
};

const repoRoot = resolve(__dirname, '../..');

/**
 * Resolves an export path from package.json to an absolute path.
 * Package.json export paths are relative to the package root.
 */
function resolveExportPath(exportPath: string): string {
  return resolve(repoRoot, exportPath);
}

/**
 * These tests verify that all paths declared in package.json (exports, bin, main)
 * actually exist on disk after running `npm run build`.
 *
 * Background: version 1.5.0-beta.3 shipped with broken exports pointing to
 * non-existent files (./index.js, ./index.d.ts), causing
 *   sh: 1: mcp-server-dynatrace: not found
 * when users ran `npx -y @dynatrace-oss/dynatrace-mcp-server`.
 *
 * npm auto-corrected the bin path during publish and emitted:
 *   npm warn publish "bin[mcp-server-dynatrace]" script name was cleaned
 *
 * Root cause: the exports["."] entry was introduced pointing to ./index.js (root)
 * instead of ./dist/index.js. Node.js uses exports over main, so all consumers
 * got a module-not-found error instead of the correct dist/index.js entry point.
 */
describe('package.json paths exist after build', () => {
  describe('exports field', () => {
    it('all export paths must point to existing files', () => {
      for (const [, exportValue] of Object.entries(pkg.exports)) {
        if (typeof exportValue === 'string') {
          // Simple string export (e.g. "./package.json": "./package.json")
          const absPath = resolveExportPath(exportValue);
          expect(existsSync(absPath)).toBe(true);
        } else {
          // Conditional export object (e.g. ".": { "default": "./dist/index.js" })
          for (const [, condPath] of Object.entries(exportValue)) {
            const absPath = resolveExportPath(condPath);
            expect(existsSync(absPath)).toBe(true);
          }
        }
      }
    });

    it('the default "." export must point to an existing file', () => {
      const dotExport = pkg.exports['.'];
      expect(dotExport).toBeDefined();
      const defaultPath = typeof dotExport === 'string' ? dotExport : (dotExport as Record<string, string>)['default'];
      expect(defaultPath).toBeDefined();
      expect(existsSync(resolveExportPath(defaultPath))).toBe(true);
    });
  });

  describe('bin field', () => {
    it('the mcp-server-dynatrace bin entry must point to an existing file', () => {
      const binPath = pkg.bin['mcp-server-dynatrace'];
      expect(binPath).toBeDefined();
      const absPath = resolveExportPath(binPath);
      expect(existsSync(absPath)).toBe(true);
    });

    it('the bin path must not have a leading "./" (prevents npm publish warning)', () => {
      const binPath = pkg.bin['mcp-server-dynatrace'];
      expect(binPath).not.toMatch(/^\.\//);
    });
  });

  describe('main field', () => {
    it('the main field must point to an existing file', () => {
      expect(existsSync(resolveExportPath(pkg.main))).toBe(true);
    });
  });
});

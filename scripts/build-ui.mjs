/**
 * Build script that compiles each UI app in src/ui/<app>/ separately.
 *
 * vite-plugin-singlefile requires a single HTML entry per build
 * (it sets rollup's inlineDynamicImports=true which is incompatible with multiple inputs).
 * This script discovers all apps and runs one vite build per app.
 */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(__dirname, '../src/ui');
const outDir = path.resolve(__dirname, '../dist/ui');

// Discover all app directories that contain an index.html
const appDirs = readdirSync(uiRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .filter((entry) => existsSync(path.resolve(uiRoot, entry.name, 'index.html')));

if (appDirs.length === 0) {
  throw new Error(`No UI entry files found. Expected at least one index.html in ${uiRoot}/<app>/`);
}

let firstBuild = true;
for (const appDir of appDirs) {
  const inputPath = path.resolve(uiRoot, appDir.name, 'index.html');
  console.log(`Building UI app: ${appDir.name}`);
  await build({
    root: uiRoot,
    configFile: false,
    plugins: [react(), viteSingleFile()],
    build: {
      outDir,
      // Only clear dist/ui/ on the first app to avoid deleting previous apps' output
      emptyOutDir: firstBuild,
      rollupOptions: {
        input: inputPath,
      },
    },
    publicDir: false,
    logLevel: 'info',
  });
  firstBuild = false;
}

console.log(`✓ All ${appDirs.length} UI app(s) built successfully.`);

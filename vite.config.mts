import react from '@vitejs/plugin-react';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const uiRoot = path.resolve(__dirname, 'src/ui');
const buildInputs = readdirSync(uiRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.resolve(uiRoot, entry.name, 'index.html'))
  .filter((indexPath) => existsSync(indexPath));

if (buildInputs.length === 0) {
  throw new Error(`No UI entry files discovered. Expected at least one file like: ${uiRoot}/<app>/index.html`);
}

export default defineConfig(({ command }) => ({
  root: uiRoot,
  plugins: [react(), ...(command === 'build' ? [viteSingleFile()] : [])],
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: true,
    rollupOptions: {
      input: buildInputs,
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  publicDir: false,
}));

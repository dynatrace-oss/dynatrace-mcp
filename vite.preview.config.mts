/**
 * Vite config for building the preview/demo pages used for automated UI screenshots.
 *
 * Unlike the main build (`vite.config.mts`), the preview pages are NOT bundled with
 * vite-plugin-singlefile because that plugin only supports a single entry point.
 * The preview pages are loaded from a local static server in CI, so multi-chunk output
 * works fine.
 */
import react from '@vitejs/plugin-react';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const uiRoot = path.resolve(__dirname, 'src/ui');

const buildInputs = readdirSync(uiRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.resolve(uiRoot, entry.name, 'preview.html'))
  .filter((previewPath) => existsSync(previewPath));

export default defineConfig({
  root: uiRoot,
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: false,
    rollupOptions: {
      input: buildInputs,
    },
  },
  publicDir: false,
});

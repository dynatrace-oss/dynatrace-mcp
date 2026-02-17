import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const input = process.env.INPUT;
if (!input) {
  throw new Error(
    'INPUT environment variable must be set to the HTML entry file (e.g. INPUT=src/ui/execute-dql/index.html)',
  );
}

// Derive the app name from the parent directory of the HTML entry file.
// e.g. src/ui/execute-dql/index.html -> "execute-dql"
const inputPath = path.resolve(__dirname, input);
const appName = path.basename(path.dirname(inputPath));

export default defineConfig(({ command }) => ({
  root: path.dirname(inputPath),
  plugins: [react(), ...(command === 'build' ? [viteSingleFile()] : [])],
  build: {
    outDir: path.resolve(__dirname, 'dist/ui', appName),
    emptyOutDir: true,
    rollupOptions: {
      input: inputPath,
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  publicDir: false,
}));

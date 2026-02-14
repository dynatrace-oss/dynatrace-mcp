import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';
import fs from 'node:fs';

const input = process.env.INPUT;
if (!input) {
  throw new Error('INPUT environment variable must be set to the HTML entry file (e.g. INPUT=src/ui/execute-dql.html)');
}

export default defineConfig({
  root: path.dirname(path.resolve(__dirname, input)),
  plugins: [viteSingleFile()],
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, input),
    },
  },
  // Use the dedicated UI tsconfig for type checking
  // Note: esbuild transform() does not support the "tsconfig" option, so we read the file and pass it as tsconfigRaw
  esbuild: {
    tsconfigRaw: fs.readFileSync(path.resolve(__dirname, 'tsconfig.ui.json'), 'utf-8'),
  },
});

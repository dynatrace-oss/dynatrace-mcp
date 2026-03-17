import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const external = Object.keys(pkg.dependencies ?? {});

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format: 'cjs',
  outfile: 'dist/index.js',
  external,
});

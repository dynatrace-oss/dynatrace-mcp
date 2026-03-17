import { build } from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format: 'cjs',
  outfile: 'dist/index.js',
  // Only native .node addons must stay external
  external: ['*.node'],
});

// Generate dist/package.json for `npm publish dist/`
// Paths are relative to dist/, dependencies are empty (everything is bundled)
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  mcpName: pkg.mcpName,
  description: pkg.description,
  keywords: pkg.keywords,
  type: pkg.type,
  main: './index.js',
  bin: { 'mcp-server-dynatrace': './index.js' },
  author: pkg.author,
  license: pkg.license,
  repository: pkg.repository,
  bugs: pkg.bugs,
  dependencies: {},
};

writeFileSync('./dist/package.json', JSON.stringify(distPkg, null, 2) + '\n');

// Copy documentation and registry files into dist/ for npm publish
for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md', 'manifest.json', 'server.json']) {
  copyFileSync(`./${file}`, `./dist/${file}`);
}

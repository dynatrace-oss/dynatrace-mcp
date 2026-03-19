import { context, build } from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const watchMode = process.argv.includes('--watch');

const esbuildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format: 'cjs',
  outfile: 'dist/index.js',
  // Only native .node addons must stay external
  external: ['*.node'],
};

if (watchMode) {
  const ctx = await context(esbuildOptions);
  await ctx.watch();
  console.error('esbuild watching for changes...');
} else {
  await build(esbuildOptions);

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
  for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md', 'server.json']) {
    copyFileSync(`./${file}`, `./dist/${file}`);
  }

  // Generate dist/manifest.json with paths relative to dist/ (used by mcpb pack dist/)
  const manifest = JSON.parse(readFileSync('./manifest.json', 'utf-8'));
  const distManifest = {
    ...manifest,
    server: {
      ...manifest.server,
      entry_point: 'index.js',
      mcp_config: {
        ...manifest.server.mcp_config,
        args: ['${__dirname}/index.js'],
      },
    },
  };
  writeFileSync('./dist/manifest.json', JSON.stringify(distManifest, null, 2) + '\n');
}

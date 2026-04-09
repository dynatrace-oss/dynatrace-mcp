import { context, build } from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';

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

  // The `open` package (v8) includes a bundled `xdg-open` shell script that it uses on Linux
  // instead of relying on the system `xdg-open`. When esbuild bundles the code, __dirname
  // resolves to dist/ rather than node_modules/open/, so we copy the script there so that
  // the bundled code can still find and use it.
  copyFileSync('./node_modules/open/xdg-open', './dist/xdg-open');

  // Create dist-bundle/ staging directory for mcpb pack
  // Layout: dist-bundle/dist/index.js + dist-bundle/dist/ui/ so that __dirname resolves correctly
  const bundleDir = './dist-bundle';
  rmSync(bundleDir, { recursive: true, force: true });
  mkdirSync(`${bundleDir}/dist`, { recursive: true });

  copyFileSync('./dist/index.js', `${bundleDir}/dist/index.js`);
  copyFileSync('./dist/xdg-open', `${bundleDir}/dist/xdg-open`);
  cpSync('./dist/ui', `${bundleDir}/dist/ui`, { recursive: true });

  // Copy source manifest.json unchanged — it already references dist/index.js
  copyFileSync('./manifest.json', `${bundleDir}/manifest.json`);

  // Copy assets/ (icon referenced by manifest.json)
  cpSync('./assets', `${bundleDir}/assets`, { recursive: true });

  for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md', 'server.json']) {
    copyFileSync(`./${file}`, `${bundleDir}/${file}`);
  }
}

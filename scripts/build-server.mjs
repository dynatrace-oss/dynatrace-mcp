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
  // Keep `open` external so npm manages it as a runtime dependency.
  // This lets `open` resolve xdg-open from its own node_modules/open/ directory on Linux.
  external: ['*.node', 'open'],
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
    dependencies: {
      // `open` is kept external and must be present in node_modules at runtime.
      open: pkg.dependencies.open,
    },
  };

  writeFileSync('./dist/package.json', JSON.stringify(distPkg, null, 2) + '\n');

  // Copy documentation and registry files into dist/ for npm publish
  for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md', 'server.json']) {
    copyFileSync(`./${file}`, `./dist/${file}`);
  }

  // Create dist-mcpb/ staging directory for mcpb pack
  // Layout: dist-mcpb/dist/index.js + dist-mcpb/dist/ui/ so that __dirname resolves correctly
  const bundleDir = './dist-mcpb';
  rmSync(bundleDir, { recursive: true, force: true });
  mkdirSync(`${bundleDir}/dist`, { recursive: true });

  // Build MCPB bundle: bundle `open` in since there is no node_modules at MCPB runtime.
  // xdg-open is NOT copied: MCPB only runs on macOS and Windows,
  // where `open` uses native `open` / `start` commands, not xdg-open.
  await build({
    ...esbuildOptions,
    outfile: `${bundleDir}/dist/index.js`,
    external: ['*.node'],
  });

  cpSync('./dist/ui', `${bundleDir}/dist/ui`, { recursive: true });

  // Copy source manifest.json unchanged — it already references dist/index.js
  copyFileSync('./manifest.json', `${bundleDir}/manifest.json`);

  // Copy assets/ (icon referenced by manifest.json)
  cpSync('./assets', `${bundleDir}/assets`, { recursive: true });

  for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md', 'server.json']) {
    copyFileSync(`./${file}`, `${bundleDir}/${file}`);
  }
}

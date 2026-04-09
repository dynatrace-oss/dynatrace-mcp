import { context, build } from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const watchMode = process.argv.includes('--watch');

// npm distribution: `open` stays external so it is resolved from node_modules at runtime.
const esbuildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format: 'cjs',
  outfile: 'dist/index.js',
  external: ['*.node', 'open'],
};

// mcpb bundle: `open` is bundled directly because the .mcpb archive has no node_modules.
// The xdg-open shell script (used by `open` on Linux) is copied alongside the bundle so
// that path.join(__dirname, 'xdg-open') resolves correctly at runtime.
const esbuildMcpbOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  format: 'cjs',
  outfile: 'dist-bundle/dist/index.js',
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
    dependencies: {
      open: pkg.dependencies.open,
    },
  };

  writeFileSync('./dist/package.json', JSON.stringify(distPkg, null, 2) + '\n');

  // Copy documentation and registry files into dist/ for npm publish
  for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md', 'server.json']) {
    copyFileSync(`./${file}`, `./dist/${file}`);
  }

  // Create dist-bundle/ staging directory for mcpb pack
  // Layout: dist-bundle/dist/index.js + dist-bundle/dist/ui/ so that __dirname resolves correctly
  const bundleDir = './dist-bundle';
  rmSync(bundleDir, { recursive: true, force: true });
  mkdirSync(`${bundleDir}/dist`, { recursive: true });

  // Build a separate bundle for mcpb with `open` included (no node_modules available inside .mcpb).
  await build(esbuildMcpbOptions);

  // Copy the xdg-open shell script next to the bundle so that `open` can find it on Linux
  // via path.join(__dirname, 'xdg-open') at runtime.
  const xdgOpenSrc = './node_modules/open/xdg-open';
  if (existsSync(xdgOpenSrc)) {
    copyFileSync(xdgOpenSrc, `${bundleDir}/dist/xdg-open`);
  }

  cpSync('./dist/ui', `${bundleDir}/dist/ui`, { recursive: true });

  // Copy source manifest.json unchanged — it already references dist/index.js
  copyFileSync('./manifest.json', `${bundleDir}/manifest.json`);

  // Copy assets/ (icon referenced by manifest.json)
  cpSync('./assets', `${bundleDir}/assets`, { recursive: true });

  for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md', 'server.json']) {
    copyFileSync(`./${file}`, `${bundleDir}/${file}`);
  }
}

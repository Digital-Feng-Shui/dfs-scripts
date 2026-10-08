// Builds dist/ with every file the website loads from this repo:
//   dist/main.min.js     the script the website loads
//   dist/styles.min.css  the stylesheet the website loads
//   dist/night/night-early.min.js, night.min.js, night.min.css, *.webp   night mode
//   dist/main.js, dist/styles.css, dist/night/*.js|css  readable copies (handy for debugging)
//   dist/version.json which version is in this build
// Usage: node scripts/build.mjs            (version from the latest git tag + "-dev")
//        DFS_VERSION=v1.2.0 node scripts/build.mjs
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

function git(cmd) {
  try { return execSync('git ' + cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch (e) { return ''; }
}

const version = process.env.DFS_VERSION || ((git('describe --tags --abbrev=0') || 'v0.0.0') + '-dev');
const commit = git('rev-parse --short HEAD') || 'unknown';

const banner = `/* dfs-scripts ${version} (${commit}) */`;
const sizes = [];

async function buildJs(src, out) {
  const code = await readFile(src, 'utf8');
  const result = await minify(code, { compress: true, mangle: true, format: { comments: false, preamble: banner } });
  if (!result.code) throw new Error('Minify produced no output for ' + src);
  await writeFile('dist/' + out, result.code + '\n');
  await writeFile('dist/' + src, code);
  sizes.push(`${out} ${result.code.length}`);
}

async function buildCss(src, out) {
  const css = await readFile(src, 'utf8');
  const result = new CleanCSS({ level: 1 }).minify(css);
  if (result.errors.length) throw new Error('CSS errors in ' + src + ': ' + result.errors.join('; '));
  await writeFile('dist/' + out, banner + '\n' + result.styles + '\n');
  await writeFile('dist/' + src, css);
  sizes.push(`${out} ${result.styles.length}`);
}

await mkdir('dist/night', { recursive: true });
await buildJs('main.js', 'main.min.js');
await buildCss('styles.css', 'styles.min.css');
await buildJs('night/night-early.js', 'night/night-early.min.js');
await buildJs('night/night.js', 'night/night.min.js');
await buildCss('night/night.css', 'night/night.min.css');
for (const f of await readdir('night')) {
  if (f.endsWith('.webp')) await copyFile('night/' + f, 'dist/night/' + f);
}

await writeFile('dist/version.json', JSON.stringify({
  version, commit, built: new Date().toISOString()
}, null, 2) + '\n');

console.log(`Built ${version} (${commit}): ${sizes.join(', ')} bytes`);

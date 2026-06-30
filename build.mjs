/**
 * IRAP Pulse — build script
 *
 * Steps:
 *   1. esbuild compiles src/main.ts → dist/bundle.js  (IIFE, no minification)
 *   2. template.html is read and the compiled bundle is injected before </body>
 *   3. The result is written to index.html (the single-file distributable)
 *
 * CDN scripts (xlsx-js-style, pdf.js, Chart.js) remain as-is in the template —
 * their globals (XLSX, pdfjsLib, Chart, ChartDataLabels) are declared as ambient
 * globals in src/globals.d.ts so TypeScript is happy, and esbuild leaves them
 * as plain identifiers in the IIFE output (no imports needed at runtime).
 *
 * Usage:  pnpm build
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { createHash } from 'crypto';

const start = Date.now();

// ---- 1. Compile TypeScript → IIFE bundle -----------------------------------
await esbuild.build({
  entryPoints:  ['src/main.ts'],
  bundle:       true,
  format:       'iife',
  platform:     'browser',
  target:       'es2020',
  outfile:      'dist/bundle.js',
  sourcemap:    false,  // set to 'inline' for debug builds
  minify:       false,  // keep readable; minify manually for production if needed
  logLevel:     'info',
});

// ---- 2. Read template + bundle ---------------------------------------------
const template = readFileSync('template.html', 'utf8');
const bundle   = readFileSync('dist/bundle.js', 'utf8');

// ---- 3. Inject bundle before </body> and write distributable ---------------
if (!template.includes('</body>')) {
  throw new Error('template.html does not contain </body> — cannot inject bundle');
}

// The exact text content of the inline <script> (between the tags) is what the
// browser hashes for CSP, so hash precisely that string.
const inlineScript = `\n${bundle}\n`;
const bundleHash = `'sha256-${createHash('sha256').update(inlineScript, 'utf8').digest('base64')}'`;

if (!template.includes('__BUNDLE_CSP_HASH__')) {
  throw new Error('template.html does not contain the __BUNDLE_CSP_HASH__ CSP placeholder');
}

let html = template
  .replace('__BUNDLE_CSP_HASH__', bundleHash)
  .replace('</body>', () => `<script>${inlineScript}</script>\n</body>`);

if (html.includes('__BUNDLE_CSP_HASH__')) {
  throw new Error('CSP bundle-hash placeholder was not replaced');
}

writeFileSync('dist/index.html', html, 'utf8');
copyFileSync('dist/index.html', 'index.html');
console.log(`CSP inline-bundle hash: ${bundleHash}`);

const elapsed = ((Date.now() - start) / 1000).toFixed(2);
const sizeKB  = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
console.log(`\nBuild complete in ${elapsed}s → dist/index.html + index.html (${sizeKB} KB)`);

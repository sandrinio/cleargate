#!/usr/bin/env node
/**
 * postprocess-expect.mjs — STORY-028-06
 *
 * Second pass: finds *.node.test.ts files that still contain `expect()` calls
 * and injects a minimal expect() shim at the top of the file.
 * The shim is read from postprocess-expect-shim.txt to avoid template-literal parsing issues.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}
function hasFlag(flag) { return args.includes(flag); }

const rootArg = getArg('--root');
if (!rootArg) { console.error('ERROR: --root required'); process.exit(2); }
const root = path.resolve(rootArg);
const isDryRun = hasFlag('--dry-run');

// Read shim from adjacent .txt file to avoid JS parser issues with special chars in template literals
const shimPath = path.join(__dirname, 'postprocess-expect-shim.txt');
if (!fs.existsSync(shimPath)) {
  console.error('ERROR: shim file not found at ' + shimPath);
  process.exit(2);
}
const EXPECT_SHIM = fs.readFileSync(shimPath, 'utf8');
const SHIM_MARKER = '// Minimal expect() shim (STORY-028-06)';

// Walk dir collecting *.node.test.ts files (excluding fixtures, red tests, examples)
function walkDir(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      const skip = ['node_modules', 'dist', 'examples', '.git', 'fixtures'];
      if (skip.includes(e.name)) continue;
      walkDir(fp, results);
    } else if (e.isFile()) {
      const n = e.name;
      if (n.includes('.red.')) continue;
      if (n.endsWith('.node.test.ts')) results.push(fp);
    }
  }
  return results;
}

const files = walkDir(root);
let patchedCount = 0;
let skippedCount = 0;

for (const filePath of files) {
  const relPath = path.relative(root, filePath);
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); }
  catch { continue; }

  // Check if file uses expect()
  if (!text.includes('expect(')) {
    skippedCount++;
    continue;
  }

  // Check if shim already injected
  if (text.includes(SHIM_MARKER)) {
    console.log('[ALREADY-PATCHED] ' + relPath);
    skippedCount++;
    continue;
  }

  // Inject the shim after the import block.
  const lines = text.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].match(/^}\s*from\s*['"]/)) {
      lastImportIdx = i;
    }
  }

  let newText;
  if (lastImportIdx === -1) {
    newText = EXPECT_SHIM + '\n' + text;
  } else {
    lines.splice(lastImportIdx + 1, 0, EXPECT_SHIM);
    newText = lines.join('\n');
  }

  if (!isDryRun) {
    fs.writeFileSync(filePath, newText, 'utf8');
    console.log('[PATCHED] ' + relPath);
  } else {
    console.log('[DRY-RUN] Would patch: ' + relPath);
  }
  patchedCount++;
}

console.log('\nSummary: ' + patchedCount + ' patched, ' + skippedCount + ' skipped.');

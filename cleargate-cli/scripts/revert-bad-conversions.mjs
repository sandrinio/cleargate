#!/usr/bin/env node
/**
 * revert-bad-conversions.mjs — STORY-028-06
 *
 * Reverts broken assert.*() calls back to expect() for files that have
 * TypeScript syntax errors. The expect() shim will handle these calls.
 *
 * Specifically, the regex conversion broke cases where matcher arguments
 * contained ')' characters (e.g., inside string literals or nested calls).
 *
 * This script replaces:
 *   assert.ok(String(X).includes(BROKEN - missing paren
 *   assert.match(String(X), BROKEN
 *   assert.strictEqual(X, BROKEN
 *   etc.
 *
 * With the original expect() form that the shim will handle.
 *
 * Strategy: use tsx to check for compile errors, then revert lines that
 * have obvious syntax issues.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
function hasFlag(flag) { return args.includes(flag); }
const isDryRun = hasFlag('--dry-run');

// Read the shim marker
const SHIM_MARKER = '// Minimal expect() shim (STORY-028-06)';

// Find all node.test.ts files (non-red, non-fixture)
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

const root = path.resolve(process.argv[process.argv.indexOf('--root') + 1] || '.');
const files = walkDir(root);

let fixedCount = 0;
let errorCount = 0;

for (const filePath of files) {
  const relPath = path.relative(root, filePath);
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); }
  catch { continue; }

  // Check if file has the shim (meaning expect() is available)
  const hasShim = text.includes(SHIM_MARKER);

  // Quick syntax check via tsx
  const result = spawnSync('node', [
    '--no-warnings',
    '--input-type=module',
    '--eval',
    `import '/dev/null'` // dummy
  ], { encoding: 'utf-8', timeout: 5000 });

  // Use esbuild's transform to check syntax
  const checkResult = spawnSync('node', [
    '-e',
    `const {transformSync} = require('esbuild'); try { transformSync(require('fs').readFileSync(${JSON.stringify(filePath)}, 'utf8'), {loader:'ts', target:'node20'}); process.exit(0); } catch(e) { process.stdout.write(e.message); process.exit(1); }`
  ], { encoding: 'utf-8', timeout: 10000, cwd: root });

  if (checkResult.status === 0) {
    // File is valid
    continue;
  }

  // File has syntax errors — try to fix by reverting broken assert.*() conversions
  const errorMsg = checkResult.stdout || '';

  // Parse error line numbers
  const lineMatches = [...errorMsg.matchAll(/\.node\.test\.ts:(\d+):\d+:/g)];
  if (lineMatches.length === 0) {
    console.log('[SKIP] ' + relPath + ' — cannot parse error line');
    errorCount++;
    continue;
  }

  let newText = text;
  let fixed = false;

  for (const match of lineMatches) {
    const lineNum = parseInt(match[1]) - 1; // 0-indexed
    const lines = newText.split('\n');
    if (lineNum >= lines.length) continue;

    const line = lines[lineNum];
    console.log('[ERROR-LINE] ' + relPath + ':' + (lineNum+1) + ': ' + line.trim());

    // We can't easily revert individual lines without knowing the original.
    // Instead, mark this file for manual review.
  }

  if (!fixed) {
    console.log('[NEEDS-MANUAL] ' + relPath);
    errorCount++;
  }
}

console.log('\nFixed: ' + fixedCount + ', Still broken: ' + errorCount);

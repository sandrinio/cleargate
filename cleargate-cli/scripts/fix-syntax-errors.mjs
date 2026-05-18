#!/usr/bin/env node
/**
 * fix-syntax-errors.mjs — STORY-028-06
 *
 * Finds .node.test.ts files with syntax errors (from broken assert.*() conversions)
 * and attempts to fix the specific patterns using targeted replacements.
 *
 * The main issue: regex conversion of expect(X).toContain(Y) where X or Y
 * contained ')' characters produced malformed assert.ok(String(X).includes(Y_broken);
 *
 * Fix strategy: for each broken line, try to reconstruct the correct assertion.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const rootArg = args[args.indexOf('--root') + 1];
if (!rootArg) { console.error('--root required'); process.exit(2); }
const root = path.resolve(rootArg);
const isDryRun = args.includes('--dry-run');

function checkSyntax(filePath) {
  // Use esbuild to check syntax
  const result = spawnSync('node', [
    '-e',
    `const { transform } = require(${JSON.stringify(path.join(root, 'node_modules/esbuild/lib/main.js'))}); ` +
    `transform(require('fs').readFileSync(${JSON.stringify(filePath)}, 'utf8'), {loader:'ts',target:'node20'}).then(` +
    `() => process.exit(0), (e) => { process.stdout.write(e.message); process.exit(1); });`
  ], { encoding: 'utf-8', timeout: 10000 });
  if (result.status === 0) return null;
  return result.stdout || result.stderr || 'unknown error';
}

function walkDir(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules','dist','examples','.git','fixtures'].includes(e.name)) continue;
      walkDir(fp, results);
    } else if (e.isFile()) {
      if (e.name.includes('.red.') || !e.name.endsWith('.node.test.ts')) continue;
      results.push(fp);
    }
  }
  return results;
}

const files = walkDir(root);
let fixedCount = 0;
let stillBrokenCount = 0;

for (const filePath of files) {
  const relPath = path.relative(root, filePath);
  const errMsg = checkSyntax(filePath);
  if (!errMsg) continue; // valid

  let text = fs.readFileSync(filePath, 'utf8');
  const origText = text;

  // Parse error locations from error message like "file.ts:N:M: ERROR: ..."
  // Fix: find the broken line and fix common patterns

  // Pattern 1: assert.ok(String(X).includes(Y_broken) → add missing close paren
  // Look for: assert.ok(String(...).includes('...');  (missing ))
  // This happens when Y contained a ')' — the regex captured up to the ')' in Y

  // Strategy: apply a line-by-line fix for common broken patterns
  const lines = text.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern: assert.ok(String(...).includes('...');  (unbalanced parens)
    // Count open vs close parens
    if (line.includes('assert.ok(') || line.includes('assert.match(') ||
        line.includes('assert.strictEqual(') || line.includes('assert.notStrictEqual(') ||
        line.includes('assert.deepStrictEqual(') || line.includes('assert.rejects(') ||
        line.includes('assert.throws(') || line.includes('assert.doesNotMatch(')) {

      // Count parens
      let depth = 0;
      let inStr = false;
      let strChar = '';
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (inStr) {
          if (c === strChar && line[j-1] !== '\\') inStr = false;
        } else {
          if (c === '"' || c === "'") { inStr = true; strChar = c; }
          else if (c === '(') depth++;
          else if (c === ')') depth--;
        }
      }

      // If paren depth is non-zero, the line is malformed
      if (depth > 0) {
        // Too many open parens — add missing close parens before semicolon
        const trimmed = line.trimEnd();
        if (trimmed.endsWith(';')) {
          lines[i] = trimmed.slice(0, -1) + ')'.repeat(depth) + ';';
          changed = true;
          console.log('[FIX-OPEN] ' + relPath + ':' + (i+1));
        }
      } else if (depth < 0) {
        // Too many close parens — remove excess
        // Find trailing extra ')' before ';'
        const trimmed = line.trimEnd();
        if (trimmed.endsWith(');')) {
          let excess = 0;
          let k = trimmed.length - 2; // before ';'
          while (k >= 0 && trimmed[k] === ')') {
            excess++;
            k--;
          }
          if (excess + depth < 0) { // there are excess close parens
            const remove = -depth;
            lines[i] = trimmed.slice(0, trimmed.length - 1 - remove) + ';';
            changed = true;
            console.log('[FIX-CLOSE] ' + relPath + ':' + (i+1));
          }
        }
      }
    }
  }

  if (changed) {
    text = lines.join('\n');
  }

  // Check again after fix
  if (changed && !isDryRun) {
    fs.writeFileSync(filePath, text, 'utf8');
    const errAfter = checkSyntax(filePath);
    if (!errAfter) {
      console.log('[FIXED] ' + relPath);
      fixedCount++;
    } else {
      console.log('[STILL-BROKEN] ' + relPath + ': ' + errAfter.split('\n')[0]);
      stillBrokenCount++;
    }
  } else if (!changed) {
    console.log('[UNFIXABLE] ' + relPath);
    stillBrokenCount++;
  }
}

console.log('\nFixed: ' + fixedCount + ', Still broken: ' + stillBrokenCount);

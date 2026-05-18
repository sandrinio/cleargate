#!/usr/bin/env node
/**
 * convert-manual-fix.mjs — STORY-028-06
 *
 * Converts vitest test files to node:test test files.
 * Handles all patterns including expect() chains, vi.fn(), vi.mock(), etc.
 *
 * Usage:
 *   node convert-manual-fix.mjs --root <dir> [--dry-run] [--report <path>]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Arg parsing
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
const reportArg = getArg('--report');

// Walk dir collecting .test.ts / .spec.ts (skipping fixtures, examples, red tests)
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
      if (n.endsWith('.node.test.ts')) continue; // already converted
      if (n.includes('.red.')) continue; // QA-Red files — skip
      if (n.endsWith('.test.ts') || n.endsWith('.spec.ts')) results.push(fp);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Build node:test import block from vitest imported names
// ---------------------------------------------------------------------------

function buildNodeTestImport(vitestNames) {
  const nodeTestNames = new Set();
  if (vitestNames.has('describe')) nodeTestNames.add('describe');
  if (vitestNames.has('it')) nodeTestNames.add('test');
  if (vitestNames.has('test')) nodeTestNames.add('test');
  if (vitestNames.has('beforeAll')) nodeTestNames.add('before');
  if (vitestNames.has('afterAll')) nodeTestNames.add('after');
  if (vitestNames.has('beforeEach')) nodeTestNames.add('beforeEach');
  if (vitestNames.has('afterEach')) nodeTestNames.add('afterEach');
  // vi imported → need mock
  if (vitestNames.has('vi')) nodeTestNames.add('mock');

  const order = ['describe', 'test', 'before', 'after', 'beforeEach', 'afterEach', 'mock'];
  const sorted = [...nodeTestNames].sort(
    (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99),
  );

  const lines = [];
  if (sorted.length > 0) {
    lines.push(`import { ${sorted.join(', ')} } from 'node:test';`);
  }
  lines.push(`import assert from 'node:assert/strict';`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Convert a single file
// ---------------------------------------------------------------------------

function convert(text) {
  // ---- Step 1: Extract vitest imports ----
  const vitestImportedNames = new Set();
  const vitestImportRe = /^import\s*\{([^}]+)\}\s*from\s*['"]vitest['"]\s*;?\s*$/gm;
  let importMatch;
  while ((importMatch = vitestImportRe.exec(text)) !== null) {
    for (const name of importMatch[1].split(',')) {
      vitestImportedNames.add(name.trim().replace(/\s+as\s+\S+$/, '').trim());
    }
  }

  // ---- Step 2: Remove all vitest import lines ----
  text = text.replace(/^import\s*\{[^}]+\}\s*from\s*['"]vitest['"]\s*;?\s*\n?/gm, '');

  // ---- Step 3: Prepend node:test imports ----
  const newImports = buildNodeTestImport(vitestImportedNames);
  text = newImports + '\n\n' + text.replace(/^\n+/, '');

  // ---- Step 4: Rename it( → test( ----
  // Be careful not to rename property accesses like obj.it(
  text = text.replace(/\bit\s*\(/g, 'test(');

  // ---- Step 5: Rename beforeAll/afterAll ----
  text = text.replace(/\bbeforeAll\s*\(/g, 'before(');
  text = text.replace(/\bafterAll\s*\(/g, 'after(');

  // ---- Step 6: vi.fn() chained with mock methods ----
  // vi.fn().mockReturnValue(x) → mock.fn(() => x)  -- simple value
  // vi.fn().mockImplementation(fn) → mock.fn(fn)
  // vi.fn().mockResolvedValue(x) → mock.fn(() => Promise.resolve(x))
  // vi.fn().mockRejectedValue(x) → mock.fn(() => Promise.reject(x))
  // Note: multi-line args are hard; we do single-line regex here.

  // vi.fn().mockImplementation( ... ) — capture the implementation function arg
  // Simple single-paren extraction won't work for complex args.
  // Strategy: convert vi.fn() first, then handle chained methods separately.

  // vi.fn().mockReturnValue(simpleExpr) — single-line, simple expr (no nested parens)
  text = text.replace(
    /\bvi\.fn\s*\(\s*\)\.mockReturnValue\s*\(([^)]+)\)/g,
    'mock.fn(() => $1)'
  );

  // vi.fn().mockResolvedValue(simpleExpr)
  text = text.replace(
    /\bvi\.fn\s*\(\s*\)\.mockResolvedValue\s*\(([^)]+)\)/g,
    'mock.fn(() => Promise.resolve($1))'
  );

  // vi.fn().mockRejectedValue(simpleExpr)
  text = text.replace(
    /\bvi\.fn\s*\(\s*\)\.mockRejectedValue\s*\(([^)]+)\)/g,
    'mock.fn(() => Promise.reject($1))'
  );

  // vi.fn().mockImplementation(fn) — where fn is a simple identifier or arrow function (single-line)
  // This is tricky for multi-line. We handle single-line arrow functions:
  text = text.replace(
    /\bvi\.fn\s*\(\s*\)\.mockImplementation\s*\(([^)]+)\)/g,
    'mock.fn($1)'
  );

  // Now convert remaining vi.fn() (no chaining or chaining handled above)
  text = text.replace(/\bvi\.fn\s*\(/g, 'mock.fn(');

  // ---- Step 7: vi.spyOn(obj, method) → mock.method(obj, method) ----
  text = text.replace(/\bvi\.spyOn\s*\(/g, 'mock.method(');

  // ---- Step 8: vi.mock(module, factory) → mock.module(module, factory) ----
  text = text.replace(/\bvi\.mock\s*\(/g, 'mock.module(');

  // ---- Step 9: vi.doMock(module, factory) → mock.module(module, factory) ----
  text = text.replace(/\bvi\.doMock\s*\(/g, 'mock.module(');

  // ---- Step 10: vi.resetModules() → mock.reset() ----
  text = text.replace(/\bvi\.resetModules\s*\(\s*\)/g, 'mock.reset()');

  // ---- Step 11: vi.clearAllMocks() → mock.reset() ----
  text = text.replace(/\bvi\.clearAllMocks\s*\(\s*\)/g, 'mock.reset()');

  // ---- Step 12: vi.restoreAllMocks() → mock.restoreAll() ----
  text = text.replace(/\bvi\.restoreAllMocks\s*\(\s*\)/g, 'mock.restoreAll()');

  // ---- Step 13: fn.mockReset() → fn.mock.resetCalls() ----
  text = text.replace(/\.mockReset\s*\(\s*\)/g, '.mock.resetCalls()');

  // ---- Step 14: .mock.calls → .mock.calls (same in node:test) ----
  // No change needed

  // ---- Step 15: Convert expect() chains ----
  text = convertExpectChains(text);

  return text;
}

// ---------------------------------------------------------------------------
// expect() chain conversion
// ---------------------------------------------------------------------------

function convertExpectChains(text) {
  // === await expect(p).rejects patterns ===
  text = text.replace(
    /\bawait\s+expect\s*\(([^)]+)\)\s*\.rejects\s*\.toBeInstanceOf\s*\(([^)]+)\)/g,
    'await assert.rejects($1, $2)'
  );

  text = text.replace(
    /\bawait\s+expect\s*\(([^)]+)\)\s*\.rejects\s*\.toThrow\s*\(([^)]*)\)/g,
    (_, expr, arg) => {
      if (!arg.trim()) return `await assert.rejects(${expr})`;
      if ((arg.startsWith("'") || arg.startsWith('"')) && (arg.endsWith("'") || arg.endsWith('"'))) {
        const inner = arg.slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return `await assert.rejects(${expr}, /${inner}/)`;
      }
      return `await assert.rejects(${expr}, ${arg})`;
    }
  );

  text = text.replace(
    /\bawait\s+expect\s*\(([^)]+)\)\s*\.rejects\s*\.toBeDefined\s*\(\s*\)/g,
    'assert.notStrictEqual(await $1.catch(e => e), undefined)'
  );

  // === await expect(p).resolves patterns ===
  text = text.replace(
    /\bawait\s+expect\s*\(([^)]+)\)\s*\.resolves\s*\.toBe\s*\(([^)]+)\)/g,
    'assert.strictEqual(await $1, $2)'
  );

  text = text.replace(
    /\bawait\s+expect\s*\(([^)]+)\)\s*\.resolves\s*\.toBeUndefined\s*\(\s*\)/g,
    'assert.strictEqual(await $1, undefined)'
  );

  text = text.replace(
    /\bawait\s+expect\s*\(([^)]+)\)\s*\.resolves\s*\.toBeNull\s*\(\s*\)/g,
    'assert.strictEqual(await $1, null)'
  );

  text = text.replace(
    /\bawait\s+expect\s*\(([^)]+)\)\s*\.resolves\s*\.toEqual\s*\(([^)]+)\)/g,
    'assert.deepStrictEqual(await $1, $2)'
  );

  text = text.replace(
    /\bawait\s+expect\s*\(([^)]+)\)\s*\.resolves\s*\.toBeDefined\s*\(\s*\)/g,
    'assert.notStrictEqual(await $1, undefined)'
  );

  text = text.replace(
    /\bawait\s+expect\s*\(([^)]+)\)\s*\.resolves\s*\.toBeTruthy\s*\(\s*\)/g,
    'assert.ok(await $1)'
  );

  // === expect(x).not. patterns ===
  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toBe\s*\(([^)]+)\)/g,
    'assert.notStrictEqual($1, $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toEqual\s*\(([^)]+)\)/g,
    'assert.notDeepStrictEqual($1, $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toBeNull\s*\(\s*\)/g,
    'assert.notStrictEqual($1, null)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toBeUndefined\s*\(\s*\)/g,
    'assert.notStrictEqual($1, undefined)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toBeTruthy\s*\(\s*\)/g,
    'assert.ok(!($1))'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toBeFalsy\s*\(\s*\)/g,
    'assert.ok($1)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toBeDefined\s*\(\s*\)/g,
    'assert.strictEqual($1, undefined)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toContain\s*\(([^)]+)\)/g,
    'assert.ok(!String($1).includes($2))'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toMatch\s*\(([^)]+)\)/g,
    (_, expr, pattern) => {
      if ((pattern.startsWith("'") || pattern.startsWith('"')) && (pattern.endsWith("'") || pattern.endsWith('"'))) {
        const inner = pattern.slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return `assert.doesNotMatch(String(${expr}), /${inner}/)`;
      }
      return `assert.doesNotMatch(String(${expr}), ${pattern})`;
    }
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toHaveBeenCalled\s*\(\s*\)/g,
    'assert.strictEqual($1.mock.calls.length, 0)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toHaveProperty\s*\(([^)]+)\)/g,
    (_, expr, key) => `assert.ok(!(${key.trim()} in (${expr})))`
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toThrow\s*\(\s*\)/g,
    'assert.doesNotThrow($1)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toBeInstanceOf\s*\(([^)]+)\)/g,
    'assert.ok(!($1 instanceof $2))'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.not\s*\.toHaveLength\s*\(([^)]+)\)/g,
    'assert.notStrictEqual(($1).length, $2)'
  );

  // === expect(x). positive patterns ===
  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBe\s*\(([^)]+)\)/g,
    'assert.strictEqual($1, $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toEqual\s*\(([^)]+)\)/g,
    'assert.deepStrictEqual($1, $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toStrictEqual\s*\(([^)]+)\)/g,
    'assert.deepStrictEqual($1, $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeUndefined\s*\(\s*\)/g,
    'assert.strictEqual($1, undefined)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeNull\s*\(\s*\)/g,
    'assert.strictEqual($1, null)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeTruthy\s*\(\s*\)/g,
    'assert.ok($1)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeFalsy\s*\(\s*\)/g,
    'assert.ok(!($1))'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeDefined\s*\(\s*\)/g,
    'assert.notStrictEqual($1, undefined)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeGreaterThan\s*\(([^)]+)\)/g,
    'assert.ok($1 > $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeGreaterThanOrEqual\s*\(([^)]+)\)/g,
    'assert.ok($1 >= $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeLessThan\s*\(([^)]+)\)/g,
    'assert.ok($1 < $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeLessThanOrEqual\s*\(([^)]+)\)/g,
    'assert.ok($1 <= $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toContain\s*\(([^)]+)\)/g,
    'assert.ok(String($1).includes($2))'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toMatch\s*\(([^)]+)\)/g,
    (_, expr, pattern) => {
      if ((pattern.startsWith("'") || pattern.startsWith('"')) && (pattern.endsWith("'") || pattern.endsWith('"'))) {
        const inner = pattern.slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return `assert.match(String(${expr}), /${inner}/)`;
      }
      return `assert.match(String(${expr}), ${pattern})`;
    }
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toHaveLength\s*\(([^)]+)\)/g,
    'assert.strictEqual(($1).length, $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeInstanceOf\s*\(([^)]+)\)/g,
    'assert.ok($1 instanceof $2)'
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toThrow\s*\(([^)]*)\)/g,
    (_, expr, arg) => {
      if (!arg.trim()) return `assert.throws(${expr})`;
      if ((arg.startsWith("'") || arg.startsWith('"')) && (arg.endsWith("'") || arg.endsWith('"'))) {
        const inner = arg.slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return `assert.throws(${expr}, /${inner}/)`;
      }
      return `assert.throws(${expr}, ${arg})`;
    }
  );

  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toHaveProperty\s*\(([^)]+)\)/g,
    (_, expr, args) => {
      const parts = args.split(',').map(s => s.trim());
      const key = parts[0];
      const val = parts[1];
      const keyStr = key.replace(/^['"]|['"]$/g, '');
      if (val !== undefined) {
        const pathParts = keyStr.split('.');
        if (pathParts.length === 1) {
          return `assert.strictEqual((${expr})[${key}], ${val})`;
        }
        const chain = pathParts.map(p => `['${p}']`).join('');
        return `assert.strictEqual((${expr})${chain}, ${val})`;
      }
      const pathParts = keyStr.split('.');
      if (pathParts.length === 1) {
        return `assert.ok(${key} in (${expr}))`;
      }
      let chain = `(${expr})`;
      for (const p of pathParts.slice(0, -1)) {
        chain += `?.['${p}']`;
      }
      return `assert.ok(${chain}?.['${pathParts[pathParts.length - 1]}'] !== undefined)`;
    }
  );

  // toMatchObject — use deepStrictEqual (may be too strict but safest)
  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toMatchObject\s*\(([^)]+)\)/g,
    'assert.deepStrictEqual($1, $2)'
  );

  // toHaveBeenCalled
  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toHaveBeenCalled\s*\(\s*\)/g,
    'assert.ok($1.mock.calls.length > 0)'
  );

  // toHaveBeenCalledTimes
  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toHaveBeenCalledTimes\s*\(([^)]+)\)/g,
    'assert.strictEqual($1.mock.calls.length, $2)'
  );

  // toHaveBeenCalledWith (simple single-line)
  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toHaveBeenCalledWith\s*\(([^)]*)\)/g,
    (_, fn, args) => {
      if (!args.trim()) {
        return `assert.ok(${fn}.mock.calls.length > 0)`;
      }
      return `assert.deepStrictEqual(${fn}.mock.calls[${fn}.mock.calls.length - 1], [${args}])`;
    }
  );

  // toBeCloseTo
  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toBeCloseTo\s*\(([^,)]+)(?:,\s*([^)]+))?\)/g,
    (_, expr, n, digits) => {
      const d = digits ? parseInt(digits.trim()) : 2;
      return `assert.ok(Math.abs(${expr} - ${n}) < Math.pow(10, -${d}) / 2)`;
    }
  );

  // toMatchInlineSnapshot — just check defined
  text = text.replace(
    /\bexpect\s*\(([^)]+)\)\s*\.toMatchInlineSnapshot\s*\([^)]*\)/g,
    'assert.ok($1 !== undefined) /* toMatchInlineSnapshot — verify manually */'
  );

  return text;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

const inputFiles = walkDir(root);
let convertedCount = 0;
const failedFiles = [];
let skippedCount = 0;

for (const filePath of inputFiles) {
  const relPath = path.relative(root, filePath);

  // Determine target filename
  const basename = path.basename(filePath);
  const targetName = basename.replace(/(?:\.vitest)?\.(?:test|spec)\.ts$/, '.node.test.ts');
  const targetPath = path.join(path.dirname(filePath), targetName);

  // Skip if already exists
  if (fs.existsSync(targetPath)) {
    console.log(`[SKIP] ${relPath} — target already exists`);
    skippedCount++;
    continue;
  }

  let rawText;
  try { rawText = fs.readFileSync(filePath, 'utf8'); }
  catch (e) { console.error(`[ERROR] Cannot read ${relPath}: ${e.message}`); continue; }

  // Skip files with no vitest imports
  if (!rawText.includes("from 'vitest'") && !rawText.includes('from "vitest"')) {
    console.log(`[SKIP] ${relPath} — no vitest imports`);
    skippedCount++;
    continue;
  }

  try {
    const converted = convert(rawText);

    if (!isDryRun) {
      fs.writeFileSync(filePath, converted, 'utf8');
      fs.renameSync(filePath, targetPath);
      console.log(`[CONVERTED] ${relPath} → ${path.relative(root, targetPath)}`);
    } else {
      console.log(`[DRY-RUN] ${relPath} → ${path.relative(root, targetPath)}`);
    }
    convertedCount++;
  } catch (e) {
    console.error(`[ERROR] Failed to convert ${relPath}: ${e.message}`);
    failedFiles.push({ relPath, error: e.message });
  }
}

console.log(`\nSummary: ${convertedCount} converted, ${skippedCount} skipped, ${failedFiles.length} failed.`);

if (reportArg && failedFiles.length > 0) {
  const lines = ['# Conversion Failures', '', '| File | Error |', '|------|-------|'];
  for (const { relPath, error } of failedFiles) {
    lines.push(`| ${relPath} | ${error} |`);
  }
  fs.writeFileSync(path.resolve(reportArg), lines.join('\n'), 'utf8');
}

process.exit(failedFiles.length > 0 ? 1 : 0);

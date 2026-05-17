#!/usr/bin/env node
/**
 * codemod-vitest-to-node-test.mjs — STORY-028-04
 *
 * Transforms vitest test files to node:test test files in-place.
 * Handles the mechanical 80% of API mappings automatically.
 * Files containing vi.mock / vi.useFakeTimers / vi.spyOn / vi.stubGlobal / vi.hoisted
 * are flagged as MANUAL-FIX-REQUIRED and left unchanged.
 *
 * Uses ts-morph for AST analysis (detecting vi.* usage, locating imports/calls)
 * and raw string manipulation for all text replacements to avoid ts-morph
 * indentation adjustment side-effects.
 *
 * Usage:
 *   node codemod-vitest-to-node-test.mjs --root <dir> [--apply|--dry-run] [--report <path>]
 *
 * Exit codes:
 *   0 — all files auto-converted (zero MANUAL-FIX-REQUIRED)
 *   1 — one or more MANUAL-FIX-REQUIRED files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, SyntaxKind } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function hasFlag(flag) {
  return args.includes(flag);
}

const rootArg = getArg('--root');
if (!rootArg) {
  console.error('ERROR: --root <dir> is required.');
  process.exit(2);
}

const root = path.resolve(rootArg);
if (!fs.existsSync(root)) {
  console.error(`ERROR: root directory does not exist: ${root}`);
  process.exit(2);
}

const isDryRun = hasFlag('--dry-run');
const reportArg = getArg('--report');
const defaultReport = path.join(root, '.codemod-manual-fix-report.md');
const reportPath = reportArg ? path.resolve(reportArg) : defaultReport;

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/**
 * Recursively walk `dir`, collecting *.test.ts / *.spec.ts files.
 * Skips: node_modules, dist, examples, *.node.test.ts (already converted).
 */
function walkDir(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const skipDirs = ['node_modules', 'dist', 'examples', '.git'];
      if (skipDirs.includes(entry.name)) continue;
      walkDir(fullPath, results);
    } else if (entry.isFile()) {
      const name = entry.name;
      // Skip already-converted files (*.node.test.ts)
      if (name.endsWith('.node.test.ts')) continue;
      // Include *.test.ts and *.spec.ts
      if (name.endsWith('.test.ts') || name.endsWith('.spec.ts')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const inputFiles = walkDir(root);

// ---------------------------------------------------------------------------
// Analysis via ts-morph (read-only)
// ---------------------------------------------------------------------------

/**
 * Analyze a source file. Returns:
 * - vitestImportedNames: Set of names imported from 'vitest'
 * - manualFixApis: array of vi.* calls found (empty = auto-convertible)
 * - expectCalls: array of { start, end, argStart, argEnd, argText, matcher, matcherArgTexts }
 * - itCalls: array of { start, end } (identifier 'it' that is a call callee)
 * - hookRenames: array of { start, end, newName }
 * - importRanges: array of { start, end } for import declarations from 'vitest'
 */
function analyzeFile(sourceFile) {
  const vitestImportedNames = new Set();
  const manualFixApis = new Set();
  const expectCalls = [];
  const itCalls = [];
  const hookRenames = [];
  const importRanges = [];

  // --- Vitest imports ---
  const importDecls = sourceFile
    .getImportDeclarations()
    .filter((imp) => imp.getModuleSpecifierValue() === 'vitest');

  for (const imp of importDecls) {
    importRanges.push({ start: imp.getStart(), end: imp.getEnd() });
    for (const spec of imp.getNamedImports()) {
      vitestImportedNames.add(spec.getName());
    }
    const defaultImport = imp.getDefaultImport();
    if (defaultImport) {
      vitestImportedNames.add(defaultImport.getText());
    }
  }

  // --- vi.* detection ---
  for (const propAccess of sourceFile.getDescendantsOfKind(
    SyntaxKind.PropertyAccessExpression,
  )) {
    if (propAccess.getExpression().getText() === 'vi') {
      manualFixApis.add(`vi.${propAccess.getName()}`);
    }
  }

  if (manualFixApis.size > 0) {
    return {
      vitestImportedNames,
      manualFixApis: [...manualFixApis],
      expectCalls,
      itCalls,
      hookRenames,
      importRanges,
    };
  }

  // --- it → test rename ---
  for (const ident of sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)) {
    if (ident.getText() !== 'it') continue;
    const parent = ident.getParent();
    if (!parent) continue;
    if (
      parent.getKind() === SyntaxKind.CallExpression &&
      parent.getExpression() === ident
    ) {
      itCalls.push({ start: ident.getStart(), end: ident.getEnd() });
    }
  }

  // --- beforeAll→before, afterAll→after ---
  const hookMap = { beforeAll: 'before', afterAll: 'after' };
  for (const ident of sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)) {
    const text = ident.getText();
    if (!(text in hookMap)) continue;
    const parent = ident.getParent();
    if (!parent) continue;
    if (
      parent.getKind() === SyntaxKind.CallExpression &&
      parent.getExpression() === ident
    ) {
      hookRenames.push({
        start: ident.getStart(),
        end: ident.getEnd(),
        newName: hookMap[text],
      });
    }
  }

  // --- expect(...).matcher(...) calls ---
  const unknownMatchers = [];
  for (const callExpr of sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression,
  )) {
    const expr = callExpr.getExpression();
    if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) continue;

    const propAccess = expr;
    const innerExpr = propAccess.getExpression();
    if (innerExpr.getKind() !== SyntaxKind.CallExpression) continue;

    const innerCall = innerExpr;
    const callee = innerCall.getExpression();
    if (callee.getKind() !== SyntaxKind.Identifier) continue;
    if (callee.getText() !== 'expect') continue;

    const matcher = propAccess.getName();
    const expectArg = innerCall.getArguments()[0];
    const matcherArgNodes = callExpr.getArguments();

    const knownMatchers = [
      'toBe', 'toEqual', 'toBeUndefined', 'toBeNull',
      'toBeTruthy', 'toBeFalsy', 'toThrow',
    ];

    if (!knownMatchers.includes(matcher)) {
      unknownMatchers.push(matcher);
      continue;
    }

    expectCalls.push({
      start: callExpr.getStart(),
      end: callExpr.getEnd(),
      argStart: expectArg ? expectArg.getStart() : -1,
      argEnd: expectArg ? expectArg.getEnd() : -1,
      argText: expectArg ? expectArg.getText() : '',
      matcher,
      matcherArgTexts: matcherArgNodes.map((a) => a.getText()),
    });
  }

  // If any unrecognized matchers, treat entire file as manual-fix
  if (unknownMatchers.length > 0) {
    return {
      vitestImportedNames,
      manualFixApis: [`unrecognized-matcher: ${unknownMatchers.join(', ')}`],
      expectCalls: [],
      itCalls: [],
      hookRenames: [],
      importRanges,
    };
  }

  return {
    vitestImportedNames,
    manualFixApis: [],
    expectCalls,
    itCalls,
    hookRenames,
    importRanges,
  };
}

// ---------------------------------------------------------------------------
// Raw text transformation
// ---------------------------------------------------------------------------

/**
 * Apply all edits to the raw source text.
 * Edits are applied in reverse position order to preserve positions.
 *
 * @param {string} text - original file text
 * @param {Array<{start: number, end: number, replacement: string}>} edits
 * @returns {string} transformed text
 */
function applyEdits(text, edits) {
  // Sort by start position descending so replacements don't shift earlier positions
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let result = text;
  for (const edit of sorted) {
    result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
  }
  return result;
}

/**
 * Build replacement text for an expect call.
 * Returns the replacement string or null if MANUAL-FIX-REQUIRED.
 */
function buildExpectReplacement(matcher, argText, matcherArgTexts) {
  switch (matcher) {
    case 'toBe':
      return `assert.strictEqual(${argText}, ${matcherArgTexts[0] ?? 'undefined'})`;
    case 'toEqual':
      return `assert.deepStrictEqual(${argText}, ${matcherArgTexts[0] ?? 'undefined'})`;
    case 'toBeUndefined':
      return `assert.strictEqual(${argText}, undefined)`;
    case 'toBeNull':
      return `assert.strictEqual(${argText}, null)`;
    case 'toBeTruthy':
      return `assert.ok(${argText})`;
    case 'toBeFalsy':
      return `assert.ok(!${argText})`;
    case 'toThrow':
      if (matcherArgTexts.length === 0) {
        return `assert.throws(${argText})`;
      }
      return `assert.throws(${argText}, ${matcherArgTexts[0]})`;
    default:
      return null;
  }
}

/**
 * Build the node:test import line(s) given the set of vitest-imported names.
 * Maps vitest names → node:test equivalents (it→test, beforeAll→before, afterAll→after).
 */
function buildNodeTestImports(vitestNames) {
  const nodeTestNames = new Set();
  if (vitestNames.has('describe')) nodeTestNames.add('describe');
  if (vitestNames.has('it')) nodeTestNames.add('test'); // it renamed to test
  if (vitestNames.has('test')) nodeTestNames.add('test');
  if (vitestNames.has('beforeAll')) nodeTestNames.add('before');
  if (vitestNames.has('afterAll')) nodeTestNames.add('after');
  if (vitestNames.has('beforeEach')) nodeTestNames.add('beforeEach');
  if (vitestNames.has('afterEach')) nodeTestNames.add('afterEach');

  const order = ['describe', 'test', 'before', 'after', 'beforeEach', 'afterEach'];
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
// Main processing loop
// ---------------------------------------------------------------------------

const manualFixRows = [];
let autoConvertedCount = 0;

const project = new Project({
  skipAddingFilesFromTsConfig: true,
  compilerOptions: {
    strict: false,
    allowJs: true,
    noEmit: true,
  },
});

for (const filePath of inputFiles) {
  const relPath = path.relative(root, filePath);

  // Determine target filename.
  // Handle both plain .test.ts / .spec.ts and fixture-style .vitest.test.ts:
  //   foo.test.ts          → foo.node.test.ts
  //   foo.spec.ts          → foo.node.test.ts
  //   input.vitest.test.ts → input.node.test.ts  (strip .vitest infix too)
  const basename = path.basename(filePath);
  const targetName = basename.replace(
    /(?:\.vitest)?\.(?:test|spec)\.ts$/,
    '.node.test.ts',
  );
  const targetPath = path.join(path.dirname(filePath), targetName);

  // Check for target collision
  if (fs.existsSync(targetPath)) {
    const relTarget = path.relative(root, targetPath);
    console.log(`[MANUAL-FIX] ${relPath} — target file already exists: ${relTarget}`);
    manualFixRows.push({
      relPath,
      apis: 'target-collision',
      reason: 'target file already exists',
    });
    continue;
  }

  // Read raw source text
  let rawText;
  try {
    rawText = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`[ERROR] Cannot read ${relPath}: ${err.message}`);
    continue;
  }

  // Analyze via ts-morph (read-only, no modifications)
  let sourceFile;
  try {
    sourceFile = project.addSourceFileAtPath(filePath);
  } catch (err) {
    console.error(`[ERROR] Failed to parse ${relPath}: ${err.message}`);
    continue;
  }

  const analysis = analyzeFile(sourceFile);
  project.removeSourceFile(sourceFile);

  // Check for manual-fix APIs
  if (analysis.manualFixApis.length > 0) {
    console.log(`[MANUAL-FIX] ${relPath} — ${analysis.manualFixApis.join(', ')}`);
    manualFixRows.push({
      relPath,
      apis: analysis.manualFixApis.join(', '),
      reason: analysis.manualFixApis.join(', '),
    });
    continue;
  }

  // --- AUTO-CONVERTIBLE: build edit list ---
  const edits = [];

  // 1. Remove vitest import declarations (replace with empty string initially)
  //    We'll prepend the new imports to the file afterwards.
  for (const { start, end } of analysis.importRanges) {
    edits.push({ start, end, replacement: '' });
  }

  // 2. Rename it → test
  for (const { start, end } of analysis.itCalls) {
    edits.push({ start, end, replacement: 'test' });
  }

  // 3. Rename beforeAll→before, afterAll→after
  for (const { start, end, newName } of analysis.hookRenames) {
    edits.push({ start, end, replacement: newName });
  }

  // 4. Rewrite expect() calls
  for (const { start, end, argText, matcher, matcherArgTexts } of analysis.expectCalls) {
    const replacement = buildExpectReplacement(matcher, argText, matcherArgTexts);
    if (replacement !== null) {
      edits.push({ start, end, replacement });
    }
  }

  // Apply all edits to the raw text
  let newText = applyEdits(rawText, edits);

  // 5. Strip leading blank lines (from removed imports) and prepend new imports.
  //    After removing import declarations, we may have leading blank lines.
  //    Re-introduce exactly one blank line between imports and the body.
  newText = newText.replace(/^\n+/, '');

  // Build new import block
  const newImports = buildNodeTestImports(analysis.vitestImportedNames);
  newText = newImports + '\n\n' + newText;

  // Write the transformed file content
  if (!isDryRun) {
    fs.writeFileSync(filePath, newText, 'utf8');
    fs.renameSync(filePath, targetPath);
    console.log(`[AUTO] ${relPath} → ${path.relative(root, targetPath)}`);
  } else {
    console.log(`[DRY-RUN] ${relPath} → ${path.relative(root, targetPath)}`);
  }

  autoConvertedCount++;
}

// ---------------------------------------------------------------------------
// Write manual-fix report
// ---------------------------------------------------------------------------

if (manualFixRows.length > 0) {
  const reportLines = [
    '# Codemod Manual-Fix Report',
    '',
    '| File | APIs | Reason |',
    '|------|------|--------|',
  ];
  for (const row of manualFixRows) {
    reportLines.push(`| ${row.relPath} | ${row.apis} | ${row.reason} |`);
  }
  reportLines.push('');

  if (!isDryRun) {
    fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
    console.log(`[REPORT] Manual-fix report written to: ${reportPath}`);
  } else {
    console.log(`[DRY-RUN] Would write report to: ${reportPath}`);
  }
}

// ---------------------------------------------------------------------------
// Summary + exit code
// ---------------------------------------------------------------------------

console.log(
  `\nSummary: ${autoConvertedCount} auto-converted, ${manualFixRows.length} manual-fix-required.`,
);

process.exit(manualFixRows.length > 0 ? 1 : 0);

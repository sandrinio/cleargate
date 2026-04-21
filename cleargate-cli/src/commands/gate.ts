/**
 * gate.ts — `cleargate gate check|explain|qa|arch` command handlers.
 *
 * STORY-008-03: Wires readiness-predicates.evaluate() + frontmatter-cache into
 * two Commander subcommands (check + explain).
 *
 * STORY-013-08: Extends with gate qa|arch subcommands that shell out via
 * run_script.sh to pre_gate_runner.sh. Both are v1-inert.
 *
 * FLASHCARD #cli #commander #optional-key: opts.transition may be undefined — strip key.
 * FLASHCARD #cli #determinism #test-seam: thread `now`, `exit`, `stdout`, `stderr` seams.
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 * Output is agent-facing: only ❌ / ⚠ / ✅ emoji; no ANSI color codes.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  readSprintExecutionMode,
  printInertAndExit,
  type ExecutionModeOptions,
} from './execution-mode.js';
import yaml from 'js-yaml';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { evaluate } from '../lib/readiness-predicates.js';
import type { ParsedDoc } from '../lib/readiness-predicates.js';
import { readCachedGate, writeCachedGate } from '../lib/frontmatter-cache.js';
import type { CachedGate } from '../lib/frontmatter-cache.js';
import {
  detectWorkItemTypeFromFm,
  WORK_ITEM_TRANSITIONS,
} from '../lib/work-item-type.js';
import type { WorkItemType } from '../lib/work-item-type.js';
import { toIsoSecond } from '../lib/frontmatter-yaml.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GateCliOptions {
  cwd?: string;
  now?: () => Date;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Override path to readiness-gates.md (test seam). */
  gatesDocPath?: string;
  /** Override path to wiki index (test seam). */
  wikiIndexPath?: string;
}

// ─── Internal gate-block shape ────────────────────────────────────────────────

interface GateCriterion {
  id: string;
  check: string;
}

interface GateBlock {
  work_item_type: string;
  transition: string;
  severity: 'advisory' | 'enforcing';
  criteria: GateCriterion[];
}

// ─── Gate document loader ─────────────────────────────────────────────────────

/**
 * Load and parse all fenced ```yaml blocks from readiness-gates.md.
 * Each block's yaml.load() returns an array — unwrap [0] per FLASHCARD.
 */
function loadGateBlocks(gatesDocPath: string): GateBlock[] {
  const raw = fs.readFileSync(gatesDocPath, 'utf8');
  const blocks: GateBlock[] = [];

  // Match all fenced ```yaml ... ``` blocks
  const fenceRe = /^```yaml\n([\s\S]*?)^```/gm;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(raw)) !== null) {
    const yamlContent = match[1]!;
    const parsed = yaml.load(yamlContent);
    // Per FLASHCARD: readiness-gates.md fenced yaml blocks are YAML lists; unwrap [0]
    const block = Array.isArray(parsed) ? parsed[0] : parsed;
    if (
      block &&
      typeof block === 'object' &&
      'work_item_type' in block &&
      'transition' in block &&
      'severity' in block &&
      'criteria' in block
    ) {
      blocks.push(block as GateBlock);
    }
  }
  return blocks;
}

/**
 * Find the gate block matching a work-item type + transition.
 */
function findGate(
  blocks: GateBlock[],
  type: WorkItemType,
  transition: string,
): GateBlock | null {
  return blocks.find(
    (b) => b.work_item_type === type && b.transition === transition,
  ) ?? null;
}

/**
 * Infer the default transition for a work-item type given the current cached gate state.
 * - If cached_gate_result is absent or failing → return first transition.
 * - If cached_gate_result.pass === true and there's a next transition → return next.
 * - Otherwise return first transition.
 */
function inferTransition(
  type: WorkItemType,
  cachedGate: CachedGate | null,
): string {
  const transitions = WORK_ITEM_TRANSITIONS[type];
  if (!cachedGate || !cachedGate.pass) {
    return transitions[0]!;
  }
  // Find next unpassed transition
  // We don't know which transition was last checked from cache alone;
  // for Epic: if cached pass=true, assume first is done → pick second.
  // For types with only one transition: always return that one.
  if (transitions.length === 1) {
    return transitions[0]!;
  }
  // Multi-transition (Epic): if cached gate passes, infer next
  return transitions[1]!;
}

// ─── gateCheckHandler ─────────────────────────────────────────────────────────

export async function gateCheckHandler(
  file: string,
  opts: { verbose?: boolean; transition?: string },
  cli?: GateCliOptions,
): Promise<void> {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never =
    cli?.exit ?? ((code: number) => process.exit(code) as never);
  const cwd = cli?.cwd ?? process.cwd();
  const nowFn = cli?.now ?? (() => new Date());

  // Resolve file path
  const absPath = path.isAbsolute(file) ? file : path.resolve(cwd, file);
  if (!fs.existsSync(absPath)) {
    stderrFn(`[cleargate gate] error: file not found: ${absPath}`);
    return exitFn(1);
  }

  // Parse the document
  let raw: string;
  try {
    raw = fs.readFileSync(absPath, 'utf8');
  } catch (err) {
    stderrFn(`[cleargate gate] error: cannot read file: ${absPath}`);
    return exitFn(1);
  }

  let fm: Record<string, unknown>;
  let body: string;
  try {
    ({ fm, body } = parseFrontmatter(raw));
  } catch {
    stderrFn(`[cleargate gate] error: cannot parse frontmatter in: ${absPath}`);
    return exitFn(1);
  }

  // Detect work-item type from frontmatter
  const detectedType = detectWorkItemTypeFromFm(fm);
  if (!detectedType) {
    stderrFn(`[cleargate gate] error: unable to detect work-item type from frontmatter in: ${absPath}`);
    return exitFn(1);
  }

  // Load gates document
  const projectRoot = cwd;
  const gatesDocPath = cli?.gatesDocPath
    ?? path.join(projectRoot, '.cleargate', 'knowledge', 'readiness-gates.md');

  if (!fs.existsSync(gatesDocPath)) {
    stderrFn(`[cleargate gate] error: readiness-gates.md not found at: ${gatesDocPath}`);
    return exitFn(1);
  }

  let gateBlocks: GateBlock[];
  try {
    gateBlocks = loadGateBlocks(gatesDocPath);
  } catch (err) {
    stderrFn(`[cleargate gate] error: failed to parse readiness-gates.md: ${String(err)}`);
    return exitFn(1);
  }

  // Read current cached gate for transition inference
  const cachedGate = await readCachedGate(absPath);

  // Determine transition
  const transition = opts.transition ?? inferTransition(detectedType, cachedGate);

  // Find the matching gate
  const gate = findGate(gateBlocks, detectedType, transition);
  if (!gate) {
    stderrFn(
      `[cleargate gate] error: no gate definition found for ${detectedType}.${transition}`,
    );
    return exitFn(1);
  }

  const wikiIndexPath = cli?.wikiIndexPath;
  const parsedDoc: ParsedDoc = { fm, body, absPath };
  const evalOpts = { projectRoot, ...(wikiIndexPath ? { wikiIndexPath } : {}) };

  // Evaluate each criterion
  const failingCriteria: { id: string; detail: string }[] = [];
  const allResults: Array<{ id: string; pass: boolean; detail: string }> = [];

  for (const criterion of gate.criteria) {
    let result: { pass: boolean; detail: string };
    try {
      result = evaluate(criterion.check, parsedDoc, evalOpts);
    } catch (err) {
      result = { pass: false, detail: `predicate error: ${String(err)}` };
    }
    allResults.push({ id: criterion.id, ...result });
    if (!result.pass) {
      failingCriteria.push({ id: criterion.id, detail: result.detail });
    }
  }

  const overallPass = failingCriteria.length === 0;
  const lastGateCheck = toIsoSecond(nowFn());

  // Write cached gate result
  const cacheResult: CachedGate = {
    pass: overallPass,
    failing_criteria: failingCriteria,
    last_gate_check: lastGateCheck,
  };
  await writeCachedGate(absPath, cacheResult, { now: nowFn });

  // Format and emit output
  const isAdvisory = gate.severity === 'advisory';
  const headerLine = `Gate: ${detectedType}.${transition} (${gate.severity})`;
  stdoutFn(headerLine);

  if (overallPass) {
    stdoutFn(`\u2705 ${detectedType}.${transition} passed (${gate.criteria.length} criteria)`);
  } else {
    for (const r of allResults) {
      if (!r.pass) {
        if (isAdvisory) {
          stdoutFn(`\u26A0 ${r.id}: ${r.detail} (advisory)`);
        } else {
          stdoutFn(`\u274C ${r.id}: ${r.detail}`);
        }
      }
      if (opts.verbose) {
        // In verbose mode, emit full detail per criterion
        stdoutFn(`  [${r.pass ? 'pass' : 'fail'}] ${r.id}: ${r.detail}`);
      }
    }
  }

  // Severity-based exit routing
  if (!overallPass && !isAdvisory) {
    return exitFn(1);
  }
  // advisory or pass → exit 0 (implicit return)
}

// ─── gateExplainHandler ───────────────────────────────────────────────────────

export async function gateExplainHandler(
  file: string,
  cli?: GateCliOptions,
): Promise<void> {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never =
    cli?.exit ?? ((code: number) => process.exit(code) as never);
  const cwd = cli?.cwd ?? process.cwd();

  // Resolve file path
  const absPath = path.isAbsolute(file) ? file : path.resolve(cwd, file);
  if (!fs.existsSync(absPath)) {
    stderrFn(`[cleargate gate] error: file not found: ${absPath}`);
    return exitFn(1);
  }

  // Read cached gate result — read-only, no evaluate calls
  const cached = await readCachedGate(absPath);

  if (!cached) {
    stdoutFn('no gate check cached; run: cleargate gate check <file>');
    return;
  }

  // Parse frontmatter to get type info (read-only — no writes)
  let raw: string;
  try {
    raw = fs.readFileSync(absPath, 'utf8');
  } catch {
    stderrFn(`[cleargate gate] error: cannot read file: ${absPath}`);
    return exitFn(1);
  }

  let fm: Record<string, unknown>;
  try {
    ({ fm } = parseFrontmatter(raw));
  } catch {
    stderrFn(`[cleargate gate] error: cannot parse frontmatter in: ${absPath}`);
    return exitFn(1);
  }

  const detectedType = detectWorkItemTypeFromFm(fm) ?? 'unknown';

  // Render ≤50-LLM-token summary
  const failingIds = cached.failing_criteria.map((c) => c.id).join(', ');
  const statusStr = cached.pass ? 'pass' : 'fail';
  const summary = failingIds
    ? `${detectedType}: ${statusStr} at ${cached.last_gate_check}; ${cached.failing_criteria.length} failing: ${failingIds}`
    : `${detectedType}: ${statusStr} at ${cached.last_gate_check}`;

  stdoutFn(summary);
}

// ─── v2 gate qa|arch handlers ─────────────────────────────────────────────────

/**
 * Options for v2 gate subcommands (qa + arch).
 * Extends GateCliOptions with execution-mode seams.
 */
export interface GateV2CliOptions extends GateCliOptions, ExecutionModeOptions {
  /** Override path to run_script.sh (test seam). */
  runScriptPath?: string;
  /** Override spawnSync (test seam). */
  spawnFn?: typeof spawnSync;
  /** Sprint ID for execution_mode discovery. */
  sprintId?: string;
}

function resolveRunScriptForGate(opts: GateV2CliOptions): string {
  if (opts.runScriptPath) return opts.runScriptPath;
  const cwd = opts.cwd ?? process.cwd();
  return path.join(cwd, '.cleargate', 'scripts', 'run_script.sh');
}

/**
 * `cleargate gate qa <worktree> <branch>`
 *
 * v1: print inert message, exit 0.
 * v2: run `run_script.sh pre_gate_runner.sh qa <worktree> <branch>`
 */
export function gateQaHandler(
  opts: { worktree: string; branch: string },
  cli?: GateV2CliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never =
    cli?.exit ?? ((code: number) => process.exit(code) as never);
  const spawnFn = cli?.spawnFn ?? spawnSync;

  const sprintId = cli?.sprintId ?? 'SPRINT-UNKNOWN';
  const mode = readSprintExecutionMode(sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd: cli?.cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  const runScript = resolveRunScriptForGate(cli ?? {});
  const result = spawnFn(
    'bash',
    [runScript, 'pre_gate_runner.sh', 'qa', opts.worktree, opts.branch],
    { stdio: 'inherit' },
  );

  if (result.error) {
    stderrFn(`[cleargate gate qa] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  return exitFn(code);
}

/**
 * `cleargate gate arch <worktree> <branch>`
 *
 * v1: print inert message, exit 0.
 * v2: run `run_script.sh pre_gate_runner.sh arch <worktree> <branch>`
 */
export function gateArchHandler(
  opts: { worktree: string; branch: string },
  cli?: GateV2CliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never =
    cli?.exit ?? ((code: number) => process.exit(code) as never);
  const spawnFn = cli?.spawnFn ?? spawnSync;

  const sprintId = cli?.sprintId ?? 'SPRINT-UNKNOWN';
  const mode = readSprintExecutionMode(sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd: cli?.cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  const runScript = resolveRunScriptForGate(cli ?? {});
  const result = spawnFn(
    'bash',
    [runScript, 'pre_gate_runner.sh', 'arch', opts.worktree, opts.branch],
    { stdio: 'inherit' },
  );

  if (result.error) {
    stderrFn(`[cleargate gate arch] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  return exitFn(code);
}

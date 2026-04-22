/**
 * sprint.ts — `cleargate sprint init|close|archive` command handlers.
 *
 * STORY-013-08: CLI wrappers for sprint lifecycle scripts.
 * STORY-014-08: sprintArchiveHandler — final sprint close-out.
 *
 * All handlers are v1-inert: when execution_mode is "v1", they print the
 * inert-mode message and exit 0. Under "v2", they shell out via run_script.sh
 * or orchestrate filesystem + git operations directly.
 *
 * EPIC-013 §0 rule 5: never invoke `node .cleargate/scripts/*.mjs` directly —
 * always route through `run_script.sh`.
 *
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';
import {
  readSprintExecutionMode,
  printInertAndExit,
  type ExecutionModeOptions,
} from './execution-mode.js';

// ─── Public CLI option types ───────────────────────────────────────────────────

export interface SprintCliOptions extends ExecutionModeOptions {
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Override path to run_script.sh (test seam). */
  runScriptPath?: string;
  /** Override spawnSync (test seam). */
  spawnFn?: typeof spawnSync;
}

// ─── Shared run_script.sh resolution ─────────────────────────────────────────

function resolveRunScript(opts: SprintCliOptions): string {
  if (opts.runScriptPath) return opts.runScriptPath;
  const cwd = opts.cwd ?? process.cwd();
  return path.join(cwd, '.cleargate', 'scripts', 'run_script.sh');
}

function defaultExit(code: number): never {
  return process.exit(code) as never;
}

// ─── sprintInitHandler ────────────────────────────────────────────────────────

/**
 * `cleargate sprint init <sprint-id> --stories <csv>`
 *
 * v1: print inert message, exit 0.
 * v2: run `run_script.sh init_sprint.mjs <sprint-id> --stories <csv>`
 */
export function sprintInitHandler(
  opts: { sprintId: string; stories: string },
  cli?: SprintCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const spawnFn = cli?.spawnFn ?? spawnSync;

  const mode = readSprintExecutionMode(opts.sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd: cli?.cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // v2: shell out via run_script.sh
  const runScript = resolveRunScript(cli ?? {});
  const args = ['init_sprint.mjs', opts.sprintId, '--stories', opts.stories];

  const result = spawnFn('bash', [runScript, ...args], { stdio: 'inherit' });

  if (result.error) {
    stderrFn(`[cleargate sprint init] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  return exitFn(code);
}

// ─── sprintCloseHandler ───────────────────────────────────────────────────────

/**
 * `cleargate sprint close <sprint-id> [--assume-ack]`
 *
 * v1: print inert message, exit 0.
 * v2: run `run_script.sh close_sprint.mjs <sprint-id> [--assume-ack]`
 */
export function sprintCloseHandler(
  opts: { sprintId: string; assumeAck?: boolean },
  cli?: SprintCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const spawnFn = cli?.spawnFn ?? spawnSync;

  const mode = readSprintExecutionMode(opts.sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd: cli?.cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // v2: shell out via run_script.sh
  const runScript = resolveRunScript(cli ?? {});
  const args = ['close_sprint.mjs', opts.sprintId];
  // FLASHCARD #cli #commander #optional-key: omit the key when undefined; only
  // append --assume-ack when the flag was explicitly set (opts.assumeAck === true).
  if (opts.assumeAck === true) {
    args.push('--assume-ack');
  }

  const result = spawnFn('bash', [runScript, ...args], { stdio: 'inherit' });

  if (result.error) {
    stderrFn(`[cleargate sprint close] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  return exitFn(code);
}

// ─── sprintArchiveHandler ─────────────────────────────────────────────────────

/**
 * Parse just the frontmatter from a markdown file using js-yaml CORE_SCHEMA.
 * Returns { fm, body } where body is the content after the closing `---`.
 * FLASHCARD #cli #frontmatter #parse: body may start with blank line; we strip
 * one leading blank to match parseFrontmatter.ts convention.
 */
function parseFileFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const lines = raw.split('\n');
  if (lines[0] !== '---') return { fm: {}, body: raw };
  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { closeIdx = i; break; }
  }
  if (closeIdx === -1) return { fm: {}, body: raw };
  const yamlText = lines.slice(1, closeIdx).join('\n');
  const bodyLines = lines.slice(closeIdx + 1);
  if (bodyLines[0] === '') bodyLines.shift();
  const body = bodyLines.join('\n');
  if (yamlText.trim() === '') return { fm: {}, body };
  let parsed: unknown;
  try {
    parsed = yaml.load(yamlText, { schema: yaml.CORE_SCHEMA });
  } catch {
    return { fm: {}, body };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { fm: {}, body };
  return { fm: parsed as Record<string, unknown>, body };
}

/**
 * Serialize frontmatter + body back to a markdown string.
 * Always adds blank separator between `---` and body.
 */
function serializeFileContent(fm: Record<string, unknown>, body: string): string {
  const yamlBody = yaml.dump(fm, {
    schema: yaml.CORE_SCHEMA,
    lineWidth: -1,
    noRefs: true,
    noCompatMode: true,
    quotingType: '"',
    forceQuotes: false,
  });
  return `---\n${yamlBody.replace(/\n+$/, '')}\n---\n\n${body}`;
}

/**
 * Atomic write via tmp + rename (same pattern as story.ts / close_sprint.mjs).
 */
function atomicWriteStr(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

/**
 * Derive sprint branch from sprint ID.
 * `SPRINT-10` → `sprint/S-10` (zero-padded 2-digit).
 */
function deriveSprintBranchForArchive(sprintId: string): string {
  const match = /^SPRINT-(\d+)/.exec(sprintId);
  const branchNum = match ? match[1]!.replace(/^0+/, '') || '0' : sprintId;
  return `sprint/S-${branchNum.padStart(2, '0')}`;
}

/**
 * Stamp a file's frontmatter with status + completed_at.
 * Returns the stamped content string (does NOT write to disk).
 */
function stampFile(raw: string, status: string, completedAt: string): string {
  const { fm, body } = parseFileFrontmatter(raw);
  fm['status'] = status;
  fm['completed_at'] = completedAt;
  return serializeFileContent(fm, body);
}

/** Return state.json story keys that belong to a given epic. */
function storyKeysForEpic(
  stateStories: Record<string, unknown>,
  epicId: string,
): string[] {
  const epicNum = epicId.replace('EPIC-', '');
  return Object.keys(stateStories).filter((k) => k.startsWith(`STORY-${epicNum}-`));
}

/**
 * `cleargate sprint archive <sprint-id> [--dry-run]`
 *
 * v1: print inert message, exit 0.
 * v2:
 *   1. Read state.json — refuse if sprint_status !== 'Completed'.
 *   2. Resolve file set from sprint frontmatter + state.json + orphan scan.
 *   3. --dry-run: print plan; no writes.
 *   4. Live: stamp + move files, clear .active, git checkout main, merge, branch -d.
 */
export function sprintArchiveHandler(
  opts: { sprintId: string; dryRun?: boolean },
  cli?: SprintCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const spawnFn = cli?.spawnFn ?? spawnSync;
  const cwd = cli?.cwd ?? process.cwd();

  // Step 1: v1-inert check
  const mode = readSprintExecutionMode(opts.sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd,
  });
  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // Step 2: Read state.json — refuse if not Completed
  const stateFile = path.join(cwd, '.cleargate', 'sprint-runs', opts.sprintId, 'state.json');
  if (!fs.existsSync(stateFile)) {
    stderrFn(`[cleargate sprint archive] state.json not found at ${stateFile}`);
    return exitFn(1);
  }
  let state: {
    sprint_status?: string;
    stories?: Record<string, unknown>;
  } & Record<string, unknown>;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    stderrFn(`[cleargate sprint archive] failed to parse state.json: ${(err as Error).message}`);
    return exitFn(1);
  }
  if (state.sprint_status !== 'Completed') {
    stderrFn(
      `sprint not closed — run \`cleargate sprint close ${opts.sprintId} --assume-ack\` first`,
    );
    return exitFn(1);
  }

  const stateStories: Record<string, unknown> = state.stories ?? {};

  // Step 3: Resolve file set
  const pendingDir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');
  const archiveDir = path.join(cwd, '.cleargate', 'delivery', 'archive');

  // Sprint file
  let sprintFile: string | null = null;
  for (const entry of fs.readdirSync(pendingDir)) {
    if ((entry.startsWith(`${opts.sprintId}_`) || entry === `${opts.sprintId}.md`) && entry.endsWith('.md')) {
      sprintFile = path.join(pendingDir, entry);
      break;
    }
  }

  // Sprint frontmatter → epics list
  let epicIds: string[] = [];
  if (sprintFile && fs.existsSync(sprintFile)) {
    const { fm } = parseFileFrontmatter(fs.readFileSync(sprintFile, 'utf8'));
    const epics = fm['epics'];
    if (Array.isArray(epics)) {
      epicIds = epics.map(String);
    }
  }

  // Plan entries: { src, destName, status }
  interface FilePlan {
    src: string;
    destName: string;
    status: string;
  }
  const plan: FilePlan[] = [];

  if (sprintFile) {
    plan.push({
      src: sprintFile,
      destName: path.basename(sprintFile),
      status: 'Completed',
    });
  }

  for (const epicId of epicIds) {
    // Epic file
    for (const entry of fs.readdirSync(pendingDir)) {
      if ((entry.startsWith(`${epicId}_`) || entry === `${epicId}.md`) && entry.endsWith('.md')) {
        plan.push({
          src: path.join(pendingDir, entry),
          destName: entry,
          status: 'Approved',
        });
        break;
      }
    }

    // Story files (authoritative: state.json keys for this epic)
    const storyKeys = storyKeysForEpic(stateStories, epicId);
    for (const storyId of storyKeys) {
      for (const entry of fs.readdirSync(pendingDir)) {
        if ((entry.startsWith(`${storyId}_`) || entry === `${storyId}.md`) && entry.endsWith('.md')) {
          plan.push({
            src: path.join(pendingDir, entry),
            destName: entry,
            status: 'Done',
          });
          break;
        }
      }
    }
  }

  // Orphan scan: any STORY-*.md in pending-sync with parent_epic_ref matching
  // one of our epics but NOT in state.json keys.
  const storyIdsInState = new Set(Object.keys(stateStories));
  const planSrcs = new Set(plan.map((p) => p.src));
  const orphans: string[] = [];
  for (const entry of fs.readdirSync(pendingDir)) {
    if (!entry.startsWith('STORY-') || !entry.endsWith('.md')) continue;
    const candidate = path.join(pendingDir, entry);
    if (planSrcs.has(candidate)) continue;
    let raw: string;
    try {
      raw = fs.readFileSync(candidate, 'utf8');
    } catch { continue; }
    const { fm } = parseFileFrontmatter(raw);
    const parentRef = String(fm['parent_epic_ref'] ?? '');
    if (epicIds.includes(parentRef)) {
      // Derive story ID from filename (STORY-014-01_Something.md → STORY-014-01)
      const storyId = entry.replace(/\.md$/, '').replace(/_.*$/, '');
      if (!storyIdsInState.has(storyId)) {
        orphans.push(candidate);
        stderrFn(`WARN: orphan story ${entry} matches epic ${parentRef} but is not in state.json — archiving anyway`);
        plan.push({ src: candidate, destName: entry, status: 'Done' });
      }
    }
  }

  // Step 4: --dry-run: print plan + exit 0
  const completedAt = new Date().toISOString();
  const sprintBranch = deriveSprintBranchForArchive(opts.sprintId);
  const activePath = path.join(cwd, '.cleargate', 'sprint-runs', '.active');

  if (opts.dryRun) {
    stdoutFn(`[dry-run] Sprint archive plan for ${opts.sprintId}:`);
    stdoutFn(`  Sprint branch: ${sprintBranch}`);
    stdoutFn(`  Files to archive (${plan.length}):`);
    for (const entry of plan) {
      stdoutFn(
        `    ${path.basename(entry.src)} → archive/${entry.destName}  [stamp: status=${entry.status}, completed_at=<now>]`,
      );
    }
    if (orphans.length > 0) {
      stdoutFn(`  Orphan files (${orphans.length}): ${orphans.map((o) => path.basename(o)).join(', ')}`);
    }
    stdoutFn(`  .active → "" (truncate)`);
    stdoutFn(`  git checkout main`);
    stdoutFn(`  git merge --no-ff -m "merge: ${sprintBranch} → main" ${sprintBranch}`);
    stdoutFn(`  git branch -d ${sprintBranch}`);
    return exitFn(0);
  }

  // Step 5: Live run — stamp + move each file
  for (const entry of plan) {
    if (!fs.existsSync(entry.src)) {
      stderrFn(`[cleargate sprint archive] source not found: ${entry.src} — skipping`);
      continue;
    }
    const raw = fs.readFileSync(entry.src, 'utf8');
    const stamped = stampFile(raw, entry.status, completedAt);
    const dest = path.join(archiveDir, entry.destName);
    atomicWriteStr(entry.src, stamped);
    fs.renameSync(entry.src, dest);
    stdoutFn(`archived: ${entry.destName}`);
  }

  // Step 6: Truncate .active
  try {
    atomicWriteStr(activePath, '');
  } catch {
    // .active may not exist — not fatal
  }

  // Step 7: git checkout main
  const step7 = spawnFn('git', ['checkout', 'main'], { stdio: 'pipe', cwd, encoding: 'utf8' });
  if (step7.error || (step7.status ?? 0) !== 0) {
    stderrFn(`[cleargate sprint archive] git checkout main failed`);
    if (step7.stderr) stderrFn(String(step7.stderr));
    return exitFn(step7.status ?? 1);
  }

  // Step 8: git merge --no-ff -m "merge: sprint/<branch> → main" sprint/<branch>
  const mergeMsg = `merge: ${sprintBranch} → main`;
  const step8 = spawnFn(
    'git',
    ['merge', '--no-ff', '-m', mergeMsg, sprintBranch],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step8.error || (step8.status ?? 0) !== 0) {
    stderrFn(`[cleargate sprint archive] git merge failed — run \`git merge --abort\` if needed`);
    if (step8.stderr) stderrFn(String(step8.stderr));
    return exitFn(step8.status ?? 1);
  }
  const mergeSha = String(step8.stdout ?? '').trim().split('\n')[0] ?? '';

  // Step 9: git branch -d sprint/<branch>
  const step9 = spawnFn('git', ['branch', '-d', sprintBranch], { stdio: 'pipe', cwd, encoding: 'utf8' });
  if (step9.error || (step9.status ?? 0) !== 0) {
    stderrFn(`[cleargate sprint archive] git branch -d ${sprintBranch} failed`);
    if (step9.stderr) stderrFn(String(step9.stderr));
    return exitFn(step9.status ?? 1);
  }

  stdoutFn(
    `archive complete: ${plan.length} files moved, branch ${sprintBranch} deleted` +
      (mergeSha ? `, merge SHA: ${mergeSha}` : ''),
  );
  return exitFn(0);
}

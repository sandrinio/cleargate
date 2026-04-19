/**
 * doctor.ts — STORY-009-04 + STORY-008-06
 *
 * `cleargate doctor` base command + `--check-scaffold` / `--session-start` / `--pricing` modes.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { computeUsd, type DraftTokensInput } from '../lib/pricing.js';
import {
  loadPackageManifest,
  loadInstallSnapshot,
  computeCurrentSha,
  classify,
  writeDriftState,
  readDriftState,
  type DriftMap,
  type DriftMapEntry,
  type DriftState,
} from '../lib/manifest.js';
import { shortHash } from '../lib/sha256.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DoctorCliOptions {
  cwd?: string;
  now?: () => Date;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Override the package root for loadPackageManifest (test seam). */
  packageRoot?: string;
}

/**
 * Flags for `cleargate doctor`.
 *
 * Reserved keys for 008-06 (M3): sessionStart, pricing.
 * All flags are mutually exclusive — selectMode throws when >1 is set.
 */
export interface DoctorFlags {
  checkScaffold?: boolean;
  /** Hidden flag: used by the M3 session-start hook; enables daily throttle. */
  sessionStartMode?: boolean;
  verbose?: boolean;
  /** --session-start: emit blocked pending-sync items summary */
  sessionStart?: boolean;
  /** --pricing: compute USD estimate for a work item */
  pricing?: boolean;
  /** File path passed to --pricing <file> */
  pricingFile?: string;
}

export type DoctorMode = 'check-scaffold' | 'session-start' | 'pricing' | 'hook-health';

// ─── Mode dispatcher ──────────────────────────────────────────────────────────

/**
 * Determine which doctor mode to run based on flags.
 *
 * Throws when multiple mutually-exclusive mode flags are set.
 * Returns 'hook-health' when no mode flag is set (default).
 *
 * Exported so STORY-008-06 can add cases without re-editing the switch.
 */
export function selectMode(flags: DoctorFlags): DoctorMode {
  const modes: DoctorMode[] = [];
  if (flags.checkScaffold) modes.push('check-scaffold');
  if (flags.sessionStart) modes.push('session-start');
  if (flags.pricing) modes.push('pricing');

  if (modes.length > 1) {
    throw new Error(
      `cleargate doctor: mutually exclusive flags set: ${modes.join(', ')}. Use only one mode flag at a time.`
    );
  }

  if (modes.length === 1) {
    return modes[0]!;
  }

  return 'hook-health';
}

// ─── Hook-health default mode ─────────────────────────────────────────────────

const HOOK_LOG_24H_MS = 24 * 60 * 60 * 1000;

/**
 * Parse a single gate-check.log line.
 * Format: [ISO_TS] stamp=N gate=N ingest=N file=<path>
 * Returns null if the line does not match.
 */
export interface HookLogEntry {
  ts: string;
  stamp: number;
  gate: number;
  ingest: number;
  file: string;
}

export function parseHookLogLine(line: string): HookLogEntry | null {
  // [2026-04-19T12:00:00Z] stamp=0 gate=1 ingest=0 file=/some/path
  const m = line.match(
    /^\[([^\]]+)\]\s+stamp=(\d+)\s+gate=(\d+)\s+ingest=(\d+)\s+file=(.+)$/
  );
  if (!m) return null;
  return {
    ts: m[1]!,
    stamp: parseInt(m[2]!, 10),
    gate: parseInt(m[3]!, 10),
    ingest: parseInt(m[4]!, 10),
    file: m[5]!.trim(),
  };
}

function runHookHealth(
  stdout: (s: string) => void,
  cwd: string,
  now?: Date
): void {
  // Minimal hook-config report: check that .claude/settings.json has the
  // SubagentStop hook wired (if the .claude directory exists).
  const settingsPath = path.join(cwd, '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    stdout('[doctor] No .claude/settings.json found — hook config unavailable.');
    return;
  }

  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(raw) as unknown;
    const hasHooks =
      typeof settings === 'object' &&
      settings !== null &&
      'hooks' in settings;
    if (hasHooks) {
      stdout('[doctor] Hook config present in .claude/settings.json.');
    } else {
      stdout('[doctor] .claude/settings.json found but no hooks key — SubagentStop hook not wired.');
    }
  } catch {
    stdout('[doctor] .claude/settings.json is not valid JSON — cannot verify hook config.');
  }

  // Scan gate-check.log for recent failures
  const logPath = path.join(cwd, '.cleargate', 'hook-log', 'gate-check.log');
  if (!fs.existsSync(logPath)) {
    return;
  }

  let logContent: string;
  try {
    logContent = fs.readFileSync(logPath, 'utf-8');
  } catch {
    return;
  }

  const nowMs = (now ?? new Date()).getTime();
  const lines = logContent.split('\n').filter((l) => l.trim().length > 0);

  for (const line of lines) {
    const entry = parseHookLogLine(line);
    if (!entry) continue;

    const entryMs = new Date(entry.ts).getTime();
    if (isNaN(entryMs)) continue;

    // Only consider entries within the last 24h
    if (nowMs - entryMs > HOOK_LOG_24H_MS) continue;

    // A failure means ANY step exit code is non-zero
    const isFailing = entry.stamp !== 0 || entry.gate !== 0 || entry.ingest !== 0;
    if (!isFailing) continue;

    stdout(
      `\u26a0 hook failure at ${entry.ts}: stamp=${entry.stamp} gate=${entry.gate} ingest=${entry.ingest} file=${entry.file}`
    );
  }
}

// ─── Check-scaffold mode ──────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Throttle decision: returns true when the cache is fresh enough to skip
 * re-computation.
 *
 * Fresh = `now - lastRefreshed < 24h`.
 * Throttle only applies when `sessionStartMode` is set (non-interactive invocation).
 * Exported for unit tests.
 */
export function shouldUseCache(
  lastRefreshed: string,
  now: Date,
  sessionStartMode: boolean
): boolean {
  if (!sessionStartMode) {
    // Interactive mode always recomputes.
    return false;
  }
  const age = now.getTime() - new Date(lastRefreshed).getTime();
  return age < TWENTY_FOUR_HOURS_MS;
}

/**
 * Format a single non-clean file line for verbose output.
 * `<path>  <state>  (<installed>→<current> vs <package>)`
 * with 6-char short hashes.
 */
export function formatVerboseLine(
  filePath: string,
  entry: DriftMapEntry
): string {
  const inst = entry.install_sha ? shortHash(entry.install_sha).slice(0, 6) : 'null';
  const curr = entry.current_sha ? shortHash(entry.current_sha).slice(0, 6) : 'null';
  const pkg = entry.package_sha ? shortHash(entry.package_sha).slice(0, 6) : 'null';
  return `  ${filePath}  ${entry.state}  (${inst}→${curr} vs ${pkg})`;
}

type CountsByState = Record<Exclude<DriftState, 'untracked'>, number> & { untracked: number };

function zeroCounts(): CountsByState {
  return {
    'clean': 0,
    'user-modified': 0,
    'upstream-changed': 0,
    'both-changed': 0,
    'untracked': 0,
  };
}

async function runCheckScaffold(
  flags: DoctorFlags,
  cli: DoctorCliOptions,
  cwd: string,
  now: Date,
  stdout: (s: string) => void,
  _stderr: (s: string) => void
): Promise<void> {
  // 1. Check daily throttle when in session-start mode
  const sessionStartMode = flags.sessionStartMode ?? false;
  const existingState = await readDriftState(cwd);

  if (existingState && shouldUseCache(existingState.last_refreshed, now, sessionStartMode)) {
    // Reuse cached result — emit summary from cached data
    emitSummary(existingState.drift, flags.verbose ?? false, stdout);
    return;
  }

  // 2. Load manifests
  const pkgManifest = loadPackageManifest({ packageRoot: cli.packageRoot });
  const installSnapshot = await loadInstallSnapshot(cwd);

  // 3. Compute SHAs + classify
  const driftMap: DriftMap = {};

  await Promise.all(
    pkgManifest.files.map(async (entry) => {
      // Silently skip user-artifact tier (EPIC-009 §6 Q8)
      if (entry.tier === 'user-artifact') {
        return;
      }

      const currentSha = await computeCurrentSha(entry, cwd);
      const installSha =
        installSnapshot?.files.find((f) => f.path === entry.path)?.sha256 ?? null;
      const pkgSha = entry.sha256;
      const state = classify(pkgSha, installSha, currentSha, entry.tier);

      driftMap[entry.path] = {
        state,
        entry,
        install_sha: installSha,
        current_sha: currentSha,
        package_sha: pkgSha,
      };
    })
  );

  // 4. Write drift state atomically
  await writeDriftState(cwd, driftMap, { lastRefreshed: now.toISOString() });

  // 5. Emit summary
  emitSummary(driftMap, flags.verbose ?? false, stdout);
}

function emitSummary(
  driftMap: DriftMap,
  verbose: boolean,
  stdout: (s: string) => void
): void {
  const counts = zeroCounts();
  for (const entry of Object.values(driftMap)) {
    counts[entry.state]++;
  }

  stdout(
    `Scaffold drift: ${counts['user-modified']} user-modified, ` +
    `${counts['upstream-changed']} upstream-changed, ` +
    `${counts['both-changed']} both-changed, ` +
    `${counts['clean']} clean`
  );

  if (counts['upstream-changed'] > 0 || counts['both-changed'] > 0) {
    stdout('Run cleargate upgrade to review.');
  }

  if (verbose) {
    for (const [filePath, entry] of Object.entries(driftMap)) {
      if (entry.state !== 'clean' && entry.state !== 'untracked') {
        stdout(formatVerboseLine(filePath, entry));
      }
    }
  }
}

// ─── Session-start mode ───────────────────────────────────────────────────────

const SESSION_START_MAX_ITEMS = 10;
const SESSION_START_MAX_CHARS = 400;

interface BlockedItem {
  id: string;
  firstCriterionId: string;
}

/**
 * Parse `cached_gate_result` from a raw frontmatter string (opaque object form).
 * Returns null if absent or pass is not exactly false.
 */
function parseCachedGateResult(
  raw: string
): { pass: boolean | null; failing_criteria: Array<{ id: string }> } | null {
  try {
    const parsed = JSON.parse(raw) as {
      pass?: boolean | null;
      failing_criteria?: Array<{ id: string }>;
    };
    return {
      pass: parsed.pass ?? null,
      failing_criteria: parsed.failing_criteria ?? [],
    };
  } catch {
    return null;
  }
}

export async function runSessionStart(
  cwd: string,
  stdout: (s: string) => void
): Promise<void> {
  const pendingSyncDir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');

  let files: string[];
  try {
    files = fs
      .readdirSync(pendingSyncDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(pendingSyncDir, f));
  } catch {
    // Directory doesn't exist or unreadable — nothing to report
    return;
  }

  const blocked: BlockedItem[] = [];

  for (const filePath of files) {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    if (!raw.trimStart().startsWith('---')) continue;

    let fm: Record<string, unknown>;
    try {
      fm = parseFrontmatter(raw).fm;
    } catch {
      continue;
    }

    const gateRaw = fm['cached_gate_result'];
    if (typeof gateRaw !== 'string') continue;

    const gate = parseCachedGateResult(gateRaw);
    if (!gate || gate.pass !== false) continue;

    // Determine item ID from frontmatter
    const idKeys = ['story_id', 'epic_id', 'proposal_id', 'cr_id', 'bug_id', 'sprint_id'];
    let itemId = '';
    for (const key of idKeys) {
      const val = fm[key];
      if (typeof val === 'string' && val.trim()) {
        itemId = val.trim();
        break;
      }
    }
    if (!itemId) {
      // Fallback: use filename stem
      itemId = path.basename(filePath, '.md');
    }

    const firstCriterionId =
      gate.failing_criteria.length > 0 ? (gate.failing_criteria[0]?.id ?? '') : '';

    blocked.push({ id: itemId, firstCriterionId });
  }

  if (blocked.length === 0) {
    return;
  }

  const overflow = blocked.length > SESSION_START_MAX_ITEMS
    ? blocked.length - SESSION_START_MAX_ITEMS
    : 0;
  const visible = blocked.slice(0, SESSION_START_MAX_ITEMS);

  const lines: string[] = [`${blocked.length} items blocked:`];
  for (const item of visible) {
    const line = item.firstCriterionId
      ? `  ${item.id}: ${item.firstCriterionId}`
      : `  ${item.id}`;
    lines.push(line);
  }
  if (overflow > 0) {
    lines.push(`…and ${overflow} more — run cleargate doctor for full list`);
  }

  let output = lines.join('\n');

  // Cap at SESSION_START_MAX_CHARS (100-token proxy)
  if (output.length > SESSION_START_MAX_CHARS) {
    output = output.slice(0, SESSION_START_MAX_CHARS - 3) + '...';
  }

  stdout(output);
}

// ─── Pricing mode ─────────────────────────────────────────────────────────────

export async function runPricing(
  filePath: string,
  cwd: string,
  stdout: (s: string) => void,
  stderr: (s: string) => void,
  exit: (code: number) => never
): Promise<void> {
  if (!filePath) {
    stderr('cleargate doctor --pricing: missing <file> argument');
    exit(1);
    return;
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);

  let raw: string;
  try {
    raw = fs.readFileSync(absPath, 'utf-8');
  } catch {
    stderr(`cleargate doctor --pricing: cannot read file: ${absPath}`);
    exit(1);
    return;
  }

  if (!raw.trimStart().startsWith('---')) {
    stderr(`cleargate doctor --pricing: file has no frontmatter: ${absPath}`);
    exit(1);
    return;
  }

  let fm: Record<string, unknown>;
  try {
    fm = parseFrontmatter(raw).fm;
  } catch {
    stderr(`cleargate doctor --pricing: cannot parse frontmatter in: ${absPath}`);
    exit(1);
    return;
  }

  const draftTokensRaw = fm['draft_tokens'];
  if (!draftTokensRaw || typeof draftTokensRaw !== 'string') {
    stdout('draft_tokens unpopulated — run cleargate stamp-tokens first');
    exit(1);
    return;
  }

  let draftTokens: DraftTokensInput & { model: string | null };
  try {
    draftTokens = JSON.parse(draftTokensRaw) as DraftTokensInput & { model: string | null };
  } catch {
    stdout('draft_tokens unpopulated — run cleargate stamp-tokens first');
    exit(1);
    return;
  }

  // Check if tokens are actually populated
  if (
    draftTokens.input === null &&
    draftTokens.output === null &&
    draftTokens.cache_read === null &&
    draftTokens.cache_creation === null
  ) {
    stdout('draft_tokens unpopulated — run cleargate stamp-tokens first');
    exit(1);
    return;
  }

  const { usd, unknownModel } = computeUsd(draftTokens);
  const model = draftTokens.model ?? 'unknown';

  if (unknownModel) {
    stderr(`cleargate doctor --pricing: unknown model '${model}' — no pricing data available`);
  }

  const input = draftTokens.input ?? 0;
  const output = draftTokens.output ?? 0;
  const cacheRead = draftTokens.cache_read ?? 0;
  const cacheCreation = draftTokens.cache_creation ?? 0;
  const fileName = path.basename(absPath);

  stdout(
    `${fileName}: ${model} — input:${input} output:${output} cache_read:${cacheRead} cache_creation:${cacheCreation} ≈ $${usd.toFixed(4)}`
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function doctorHandler(
  flags: DoctorFlags,
  cli?: DoctorCliOptions
): Promise<void> {
  const cwd = cli?.cwd ?? process.cwd();
  const now = cli?.now ? cli.now() : new Date();
  const stdout = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderr = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exit = cli?.exit ?? ((code: number) => process.exit(code) as never);

  let mode: DoctorMode;
  try {
    mode = selectMode(flags);
  } catch (err) {
    stderr((err as Error).message);
    exit(1);
    return;
  }

  switch (mode) {
    case 'check-scaffold':
      await runCheckScaffold(flags, cli ?? {}, cwd, now, stdout, stderr);
      break;

    case 'hook-health':
      runHookHealth(stdout, cwd, now);
      break;

    case 'session-start':
      await runSessionStart(cwd, stdout);
      break;

    case 'pricing':
      await runPricing(flags.pricingFile ?? '', cwd, stdout, stderr, exit);
      break;

    default: {
      const exhaustiveCheck: never = mode;
      stderr(`cleargate doctor: unknown mode '${String(exhaustiveCheck)}'`);
      exit(1);
    }
  }
}

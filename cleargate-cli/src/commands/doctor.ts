/**
 * doctor.ts — STORY-009-04 + STORY-008-06
 *
 * `cleargate doctor` base command + `--check-scaffold` / `--session-start` / `--pricing` modes.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
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
import { getMembershipState } from '../lib/membership.js';
import {
  checkLatestVersion as defaultCheckLatestVersion,
  compareSemver,
  type CheckResult,
} from '../lib/registry-check.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DoctorCliOptions {
  cwd?: string;
  now?: () => Date;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Override the package root for loadPackageManifest (test seam). */
  packageRoot?: string;
  /** CR-011: override ~/.cleargate home path for getMembershipState (test seam). */
  cleargateHome?: string;
  /** CR-011: profile to pass to getMembershipState. */
  profile?: string;
  /** STORY-016-02: test seam — override checkLatestVersion for deterministic notifier tests. */
  checkLatestVersion?: () => Promise<CheckResult>;
  /** STORY-016-02: test seam — override the installed CLI version string for notifier tests. */
  installedVersion?: string;
}

/**
 * STORY-014-01: Accumulator passed by reference through all mode handlers.
 * Top-level doctorHandler reads at the end and exits per §3.2 pseudocode:
 *   configError → exit(2), blocker → exit(1), else → exit(0).
 */
export interface DoctorOutcome {
  configError: boolean;
  blocker: boolean;
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
  /** CR-008: --can-edit <file>: exits 0 if allowed, 1 if would-block */
  canEdit?: boolean;
  /** CR-008: the file path argument for --can-edit */
  canEditFile?: string;
}

export type DoctorMode = 'check-scaffold' | 'session-start' | 'pricing' | 'hook-health' | 'can-edit';

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
  if (flags.canEdit) modes.push('can-edit');

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
  now?: Date,
  outcome?: DoctorOutcome
): void {
  // STORY-014-01: config-error — missing .cleargate/ directory
  const cleargateDir = path.join(cwd, '.cleargate');
  if (!fs.existsSync(cleargateDir)) {
    stdout('cleargate misconfigured: no .cleargate/ found. Run: cleargate init');
    if (outcome) outcome.configError = true;
    return;
  }

  // STORY-014-01: config-error — missing install snapshot.
  // CR-053 moved the install snapshot to .cleargate/.install-manifest.json;
  // the previous check at cleargate-planning/MANIFEST.json was a path that
  // copy-payload.ts intentionally never creates (false-positive on every
  // healthy install).
  const manifestPath = path.join(cwd, '.cleargate', '.install-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    stdout(`cleargate misconfigured: .cleargate/.install-manifest.json not found. Run: cleargate init`);
    if (outcome) outcome.configError = true;
    // Do not return — continue with remaining checks
  }

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

      // BUG-023: pass pinVersion so pin-aware hook files are reverse-substituted before hashing.
      const currentSha = await computeCurrentSha(entry, cwd, { pinVersion: installSnapshot?.pin_version });
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
 * Coerce `cached_gate_result` into a typed shape.
 * Accepts both the current native-object form (parseFrontmatter via js-yaml)
 * and the legacy JSON-in-a-string form (pre-BUG-001 files).
 */
function parseCachedGateResult(
  raw: unknown
): { pass: boolean | null; failing_criteria: Array<{ id: string }> } | null {
  if (raw == null) return null;

  let parsed: { pass?: boolean | null; failing_criteria?: Array<{ id: string }> } | null = null;

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    parsed = raw as { pass?: boolean | null; failing_criteria?: Array<{ id: string }> };
  } else if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as { pass?: boolean | null; failing_criteria?: Array<{ id: string }> };
    } catch {
      return null;
    }
  } else {
    return null;
  }

  return {
    pass: parsed.pass ?? null,
    failing_criteria: parsed.failing_criteria ?? [],
  };
}

/**
 * CR-009: Probe the three-branch resolver chain at runtime and emit one
 * `cleargate CLI: <branch> — <one-line>` status line to stdout.
 * This line is emitted ALWAYS (success or failure) so Claude sees which resolver
 * the hooks will use before any hook fires.
 */
export function emitResolverStatusLine(
  cwd: string,
  stdout: (s: string) => void
): void {
  const distCliPath = path.join(cwd, 'cleargate-cli', 'dist', 'cli.js');

  if (fs.existsSync(distCliPath)) {
    stdout(`cleargate CLI: local dist — ${distCliPath}`);
    return;
  }

  // Check PATH
  const whichResult = spawnSync('command', ['-v', 'cleargate'], {
    shell: true,
    encoding: 'utf8',
    timeout: 3000,
  });
  if (whichResult.status === 0) {
    stdout('cleargate CLI: PATH (global install) — cleargate');
    return;
  }

  // Try to read the pinned version from the live hook script
  let pinVersion = 'unknown';
  const hookPath = path.join(cwd, '.claude', 'hooks', 'stamp-and-gate.sh');
  if (fs.existsSync(hookPath)) {
    try {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');
      // Pattern: # cleargate-pin: 0.5.0
      const pinMatch = hookContent.match(/^#\s*cleargate-pin:\s*(\S+)\s*$/m);
      if (pinMatch?.[1]) {
        pinVersion = pinMatch[1];
      } else {
        // Fallback: look for npx -y "@cleargate/cli@X.Y.Z"
        const npxMatch = hookContent.match(/@cleargate\/cli@([^\s"']+)/);
        if (npxMatch?.[1]) pinVersion = npxMatch[1];
      }
    } catch {
      // ignore
    }
  }

  if (pinVersion === 'unknown') {
    stdout('cleargate CLI: \u{1F534} not resolvable — hooks will no-op. Fix: npm i -g cleargate or npx cleargate doctor');
  } else {
    stdout(`cleargate CLI: npx @cleargate/cli@${pinVersion} (cold-start ~600ms first call)`);
  }
}

/**
 * CR-008: planning-first reminder block text.
 * Emitted when pending-sync has zero approved stories AND no sprint-active sentinel.
 */
export const PLANNING_FIRST_REMINDER = `Triage first, draft second:
Before any Edit/Write that creates user-facing code, you must:
  (1) classify the request (Epic / Story / CR / Bug),
  (2) draft a work item under .cleargate/delivery/pending-sync/ from .cleargate/templates/,
  (3) halt at Gate 1 (Proposal approval) for human sign-off.
Bypass this only if the user has explicitly waived planning in this conversation.`;

export async function runSessionStart(
  cwd: string,
  stdout: (s: string) => void,
  outcome?: DoctorOutcome,
  cli?: DoctorCliOptions
): Promise<void> {
  // CR-011: emit membership state banner as the FIRST line of --session-start output.
  // Placed before the resolver-status line so it is the first thing the agent sees.
  const membershipState = getMembershipState({
    cleargateHome: cli?.cleargateHome,
    profile: cli?.profile,
  });
  if (membershipState.state === 'member') {
    stdout(
      `ClearGate state: member (project: ${membershipState.project_id}) — full surface enabled.`
    );
  } else {
    stdout(
      'ClearGate state: pre-member — local planning enabled, sync requires join.'
    );
  }

  // CR-009: emit resolver-status line ALWAYS (before the blocked-items list).
  // STORY-014-01: if resolver is "not resolvable", set configError.
  const resolverLines: string[] = [];
  emitResolverStatusLine(cwd, (line) => {
    stdout(line);
    resolverLines.push(line);
  });
  // Check if resolver completely failed (🔴 not resolvable branch)
  if (outcome && resolverLines.some((l) => l.includes('\u{1F534}'))) {
    outcome.configError = true;
  }

  // STORY-016-02: emit update notifier BEFORE the pending-sync read so fresh installs
  // (no pending-sync/ dir) see the notice. Silent no-op on any error; never touches outcome.
  await (async () => {
    try {
      const checkFn = cli?.checkLatestVersion ?? defaultCheckLatestVersion;
      const result = await checkFn();
      if (result.latest !== null && result.from !== 'opt-out') {
        // Resolve installed version: test seam takes priority; fall back to reading
        // package.json alongside the compiled file (dist/../package.json in production).
        let installed: string;
        if (cli?.installedVersion !== undefined) {
          installed = cli.installedVersion;
        } else {
          installed = '0.0.0';
          try {
            // Resolve package.json in both environments:
            //   production (tsup flat dist/): dist/../package.json = cleargate-cli/package.json (1 level up)
            //   vitest (source):              src/commands/../../package.json = cleargate-cli/package.json (2 levels up)
            // Try 1 level up first (production); fall back to 2 levels up (vitest source).
            const thisDir = path.dirname(fileURLToPath(import.meta.url));
            const candidates = [
              path.join(thisDir, '..', 'package.json'),
              path.join(thisDir, '..', '..', 'package.json'),
            ];
            for (const pkgJsonPath of candidates) {
              try {
                const raw = fs.readFileSync(pkgJsonPath, 'utf-8');
                const pkg = JSON.parse(raw) as { version?: unknown };
                if (typeof pkg.version === 'string' && pkg.version.length > 0) {
                  installed = pkg.version;
                  break;
                }
              } catch {
                // Try next candidate
              }
            }
          } catch {
            // Ignore — 0.0.0 fallback means any real release looks "newer" (safe default).
          }
        }
        if (compareSemver(result.latest, installed) > 0) {
          stdout(
            `cleargate ${result.latest} available (current: ${installed}) — run \`cleargate upgrade\` or see CHANGELOG`
          );
        }
      }
    } catch {
      // Silent no-op on any error (offline, timeout, etc.)
    }
  })();

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
  let hasApprovedStory = false;

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

    // CR-008: track approved stories for planning-first gate
    if (fm['approved'] === true) {
      hasApprovedStory = true;
    }

    const gate = parseCachedGateResult(fm['cached_gate_result']);
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

  // CR-008: check sprint-active sentinel
  const activesentinel = path.join(cwd, '.cleargate', 'sprint-runs', '.active');
  const sprintActive = fs.existsSync(activesentinel);

  // CR-008: emit planning-first reminder when no approved stories AND no active sprint
  const shouldRemind = !hasApprovedStory && !sprintActive;
  if (shouldRemind) {
    stdout(PLANNING_FIRST_REMINDER);
    if (blocked.length > 0) {
      // Separator before blocked items
      stdout('');
    }
  }

  if (blocked.length === 0) {
    return;
  }

  // STORY-014-01: blocked items present → set blocker flag
  if (outcome) outcome.blocker = true;

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
  exit: (code: number) => never,
  outcome?: DoctorOutcome
): Promise<void> {
  if (!filePath) {
    // STORY-014-01: missing <file> argument is a config/input error → exit(2)
    stderr('cleargate doctor --pricing: missing <file> argument');
    if (outcome) outcome.configError = true;
    exit(2);
    return;
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);

  let raw: string;
  try {
    raw = fs.readFileSync(absPath, 'utf-8');
  } catch {
    // STORY-014-01: cannot read file is a config error → exit(2)
    stderr(`cleargate doctor --pricing: cannot read file: ${absPath}`);
    if (outcome) outcome.configError = true;
    exit(2);
    return;
  }

  if (!raw.trimStart().startsWith('---')) {
    // STORY-014-01: file has no frontmatter is a config error → exit(2)
    stderr(`cleargate doctor --pricing: file has no frontmatter: ${absPath}`);
    if (outcome) outcome.configError = true;
    exit(2);
    return;
  }

  let fm: Record<string, unknown>;
  try {
    fm = parseFrontmatter(raw).fm;
  } catch {
    // STORY-014-01: cannot parse frontmatter is a config error → exit(2)
    stderr(`cleargate doctor --pricing: cannot parse frontmatter in: ${absPath}`);
    if (outcome) outcome.configError = true;
    exit(2);
    return;
  }

  const draftTokensRaw = fm['draft_tokens'];
  if (!draftTokensRaw) {
    // STORY-014-01: draft_tokens unpopulated is a blocker (content exists, state incomplete) → exit(1)
    stdout('draft_tokens unpopulated — run cleargate stamp-tokens first');
    if (outcome) outcome.blocker = true;
    exit(1);
    return;
  }

  let draftTokens: DraftTokensInput & { model: string | null };
  if (typeof draftTokensRaw === 'object' && !Array.isArray(draftTokensRaw)) {
    draftTokens = draftTokensRaw as DraftTokensInput & { model: string | null };
  } else if (typeof draftTokensRaw === 'string') {
    try {
      draftTokens = JSON.parse(draftTokensRaw) as DraftTokensInput & { model: string | null };
    } catch {
      // STORY-014-01: unparseable draft_tokens is a blocker → exit(1)
      stdout('draft_tokens unpopulated — run cleargate stamp-tokens first');
      if (outcome) outcome.blocker = true;
      exit(1);
      return;
    }
  } else {
    // STORY-014-01: unexpected type is a blocker → exit(1)
    stdout('draft_tokens unpopulated — run cleargate stamp-tokens first');
    if (outcome) outcome.blocker = true;
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
    // STORY-014-01: all null values → blocker → exit(1)
    stdout('draft_tokens unpopulated — run cleargate stamp-tokens first');
    if (outcome) outcome.blocker = true;
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

// ─── Can-edit mode (CR-008 Phase B) ──────────────────────────────────────────

/**
 * CR-008: reasons why an edit would be blocked.
 */
export type CanEditBlockReason = 'no_approved_stories' | 'file_not_in_implementation_files';

/**
 * CR-008: result of the can-edit check.
 */
export interface CanEditResult {
  allowed: boolean;
  reason?: CanEditBlockReason;
}

/**
 * CR-008: simple glob-style match.
 * Supports `*` (any characters except `/`) and `**` (any characters including `/`).
 */
export function globMatch(pattern: string, filePath: string): boolean {
  // Normalise separators
  const normalPattern = pattern.replace(/\\/g, '/');
  const normalFile = filePath.replace(/\\/g, '/');

  // Escape regex specials except * and ?
  const regexStr = normalPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, ' ') // placeholder for **
    .replace(/\*/g, '[^/]*')
    .replace(/ /g, '.*');

  const re = new RegExp(`^${regexStr}$`);
  return re.test(normalFile);
}

/**
 * CR-008: check whether editing `filePath` is permitted.
 *
 * Logic:
 *  1. If sprint-active sentinel exists → always allowed.
 *  2. Read pending-sync/*.md; for each with approved: true:
 *     a. If no implementation_files field → treat as "any approved story → allow".
 *     b. If implementation_files present → glob-match filePath against each pattern.
 *  3. If zero approved stories → block with reason 'no_approved_stories'.
 *  4. If approved stories exist but filePath not covered → block with 'file_not_in_implementation_files'.
 */
export async function runCanEdit(
  filePath: string,
  cwd: string,
  stdout: (s: string) => void,
  exit: (code: number) => never,
  outcome?: DoctorOutcome
): Promise<void> {
  // Sprint-active sentinel → always allow
  const activeSentinel = path.join(cwd, '.cleargate', 'sprint-runs', '.active');
  if (fs.existsSync(activeSentinel)) {
    stdout('allowed: sprint active');
    return;
  }

  const pendingSyncDir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');

  let files: string[];
  try {
    files = fs
      .readdirSync(pendingSyncDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(pendingSyncDir, f));
  } catch {
    // No pending-sync dir → no approved stories → blocker → exit(1)
    stdout('blocked: no_approved_stories');
    if (outcome) outcome.blocker = true;
    exit(1);
    return;
  }

  let hasApprovedStory = false;
  let coveredByStory = false;

  for (const storyPath of files) {
    let raw: string;
    try {
      raw = fs.readFileSync(storyPath, 'utf-8');
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

    if (fm['approved'] !== true) continue;

    hasApprovedStory = true;

    const implFilesRaw = fm['implementation_files'];
    if (implFilesRaw === undefined || implFilesRaw === null) {
      // No implementation_files field → any approved story covers any file
      coveredByStory = true;
      break;
    }

    if (Array.isArray(implFilesRaw)) {
      for (const pattern of implFilesRaw) {
        if (typeof pattern !== 'string') continue;
        if (globMatch(pattern, filePath)) {
          coveredByStory = true;
          break;
        }
      }
    }

    if (coveredByStory) break;
  }

  if (!hasApprovedStory) {
    // STORY-014-01: blocked items → exit(1)
    stdout('blocked: no_approved_stories');
    if (outcome) outcome.blocker = true;
    exit(1);
    return;
  }

  if (!coveredByStory) {
    // STORY-014-01: blocked items → exit(1)
    stdout('blocked: file_not_in_implementation_files');
    if (outcome) outcome.blocker = true;
    exit(1);
    return;
  }

  stdout('allowed');
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

  // STORY-014-01: outcome accumulator — each mode pushes booleans here.
  // At the end, we exit per §3.2 pseudocode:
  //   configError → exit(2), blocker → exit(1), else → exit(0).
  const outcome: DoctorOutcome = { configError: false, blocker: false };

  // Track whether exit() was already called by a mode (e.g. runPricing early error)
  // so we don't double-exit from the final outcome block.
  let exitedEarly = false;
  const wrappedExit = (code: number): never => {
    exitedEarly = true;
    return exit(code);
  };

  let mode: DoctorMode;
  try {
    mode = selectMode(flags);
  } catch (err) {
    // STORY-014-01: mutually exclusive flags is a config error → exit(2)
    stderr((err as Error).message);
    exit(2);
    return;
  }

  switch (mode) {
    case 'check-scaffold':
      await runCheckScaffold(flags, cli ?? {}, cwd, now, stdout, stderr);
      break;

    case 'hook-health':
      runHookHealth(stdout, cwd, now, outcome);
      break;

    case 'session-start':
      await runSessionStart(cwd, stdout, outcome, cli);
      break;

    case 'pricing':
      await runPricing(flags.pricingFile ?? '', cwd, stdout, stderr, wrappedExit, outcome);
      break;

    case 'can-edit':
      await runCanEdit(flags.canEditFile ?? '', cwd, stdout, wrappedExit, outcome);
      break;

    default: {
      const exhaustiveCheck: never = mode;
      stderr(`cleargate doctor: unknown mode '${String(exhaustiveCheck)}'`);
      // STORY-014-01: unknown mode is a config error → exit(2)
      exit(2);
      return;
    }
  }

  // STORY-014-01: §3.2 pseudocode exit-code computation.
  // If a mode called exit() early (e.g. runPricing on bad input), don't double-exit.
  if (exitedEarly) return;

  if (outcome.configError) {
    exit(2);
  } else if (outcome.blocker) {
    exit(1);
  } else {
    exit(0);
  }
}

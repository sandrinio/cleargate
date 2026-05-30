#!/usr/bin/env node
/**
 * launch_wave.mjs — STORY-033-04 (EPIC-033 capstone): Parallel-Wave Execution + Barrier.
 *
 * Drives a `parallel()` Workflow of one worktree-isolated segment per story in an
 * Architect-planned wave (waves.json, produced by STORY-033-03), mints a stable per-thunk
 * RUN_ID for each segment, and returns the array of schema-typed segment verdicts to the
 * Orchestrator at the barrier. The Orchestrator consolidates serially: validate → process
 * flashcards (between-wave) → merge GREEN stories one worktree at a time → restore env.
 *
 * SPRINT-32 constraint (SDR §2.1): this sprint BUILDS the wave capability but runs SERIALLY.
 * No live `parallel()` dispatch executes here. The launcher ships for the NEXT (self-hosting)
 * sprint. The testable JS surface is the exported `validateVerdicts` barrier validator (plus
 * the helper constructors); the `parallel()` dispatch itself is exercised only when the
 * next sprint runs under `execution_mode: v2-parallel`.
 *
 * Spike facts honored (STORY-033-01-spike-result.md, FLASHCARD #workflow #token-ledger #worktree):
 *   - Per-agent SubagentStop attribution is DEAD under workflows → the barrier writes one
 *     ledger row per segment from `verdict.tokens`, keyed by RUN_ID (STORY-033-02 owns the write).
 *   - `PreToolUse:Task` never fires under workflows → no dispatch-marker auto-attribution.
 *   - Per-thunk child env is NOT settable → the Orchestrator sets `SKIP_FLASHCARD_GATE=1` in
 *     its OWN env before launch (inherited by all children) and restores it at the barrier.
 *   - `isolation:'worktree'` checks out tracked-files-only off the wrong base → segments use
 *     ClearGate's OWN `git worktree add .worktrees/STORY-X -b story/STORY-X sprint/S-NN`.
 *   - `resumeFromRunId` caches completed GREEN agents (0 tokens on replay) → complete-then-resume
 *     re-dispatches only the ESCALATED/BLOCKED segment.
 *
 * Kill-switch: `execution_mode: v2-serial` in sprint frontmatter OR `CLEARGATE_PARALLEL_WAVES=off`
 * in the session env routes to today's serial Phase C loop with ZERO behavior change — no
 * launch_wave.mjs invocation occurs on that path.
 *
 * Verdict schema (discriminated union, STORY-033-04 §1.2 — inherits protocol §23):
 *   {
 *     verdict: 'GREEN' | 'ESCALATED' | 'BLOCKED',
 *     storyId: string,
 *     runId: string,
 *     devSha: string,
 *     qaSha: string,
 *     archSha?: string,
 *     flashcards_flagged: string[],
 *     counters: { qa_bounces: number, arch_bounces: number, breaker_hits: number },
 *     tokens: { input, output, cache_creation, cache_read, model },
 *     blocker?: { type, message }   // REQUIRED iff verdict !== 'GREEN'
 *   }
 *   blocker.type ∈ the five §22 true-blocker kinds.
 */

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants — the verdict discriminated-union vocabulary (protocol §23).
// ---------------------------------------------------------------------------

/** The three terminal verdict states a segment may return at the barrier. */
export const VERDICT_KINDS = Object.freeze(['GREEN', 'ESCALATED', 'BLOCKED']);

/**
 * The five protocol-§22 true-blocker kinds. A non-GREEN verdict's `blocker.type`
 * MUST be one of these (inherited verbatim from §22 — do not redefine here).
 */
export const BLOCKER_TYPES = Object.freeze([
  'destructive', // force-push, git reset --hard, drop table, delete untracked file, kill process
  'secret', // reading .env / fetching a secret / persisting credential material
  'user-intent', // a genuine "what does the user want?" not inferable from goal/Gherkin
  'technical-impossibility', // required infra unavailable (test DB unreachable, MCP down)
  'spec-contradiction', // story Gherkin self-contradicts or two wave stories collide on a shared surface
]);

/** Required scalar fields present on EVERY verdict regardless of discriminant. */
const REQUIRED_SCALAR_FIELDS = Object.freeze(['storyId', 'runId', 'devSha', 'qaSha']);

/** Required `tokens` sub-fields (per-segment cost the barrier writes to the ledger). */
const REQUIRED_TOKEN_FIELDS = Object.freeze([
  'input',
  'output',
  'cache_creation',
  'cache_read',
  'model',
]);

/** Required `counters` sub-fields. */
const REQUIRED_COUNTER_FIELDS = Object.freeze(['qa_bounces', 'arch_bounces', 'breaker_hits']);

// ---------------------------------------------------------------------------
// RUN_ID minting — one stable, distinct id per wave segment.
// ---------------------------------------------------------------------------

/**
 * Mint a stable, distinct RUN_ID for a wave segment. Stable so a resumeFromRunId replay
 * can re-key the same segment; distinct so sibling segments do not collide on the
 * RUN_ID-keyed ledger row STORY-033-02 writes.
 *
 * @param {string} storyId   The story this segment executes (e.g. "STORY-033-04").
 * @param {string} sprintId  The active sprint (e.g. "SPRINT-32").
 * @returns {string}         A run id of the form "run-<sprint>-<story>-<8hex>".
 */
export function mintRunId(storyId, sprintId) {
  const entropy = crypto.randomBytes(4).toString('hex');
  const story = String(storyId || 'STORY-UNKNOWN').replace(/[^A-Za-z0-9-]/g, '');
  const sprint = String(sprintId || 'SPRINT-UNKNOWN').replace(/[^A-Za-z0-9-]/g, '');
  return `run-${sprint}-${story}-${entropy}`;
}

// ---------------------------------------------------------------------------
// Worktree command construction (spike decision 2 — ClearGate-managed worktrees).
// ---------------------------------------------------------------------------

/**
 * Build the bash `git worktree add` command for a segment. ClearGate manages its OWN
 * worktrees (NOT the Workflow tool's `isolation:'worktree'`, which checks out
 * tracked-files-only off the wrong base — spike decision 2). Worktrees are pre-created
 * SERIALLY at wave launch to avoid concurrent `git worktree add` racing the repo index.
 *
 * @param {string} storyId       e.g. "STORY-033-04"
 * @param {string} sprintBranch  e.g. "sprint/S-32"
 * @returns {string}             the bash command string
 */
export function worktreeAddCommand(storyId, sprintBranch) {
  const story = String(storyId);
  return `git worktree add .worktrees/${story} -b story/${story} ${sprintBranch}`;
}

// ---------------------------------------------------------------------------
// Kill-switch — does this run go parallel, or revert to the serial Phase C loop?
// ---------------------------------------------------------------------------

/**
 * Decide whether the wave loop should run in parallel. Returns false (serial) when EITHER
 * the sprint frontmatter `execution_mode` is `v2-serial` OR the session env carries
 * `CLEARGATE_PARALLEL_WAVES=off`. Either revert path runs today's serial five-dispatch
 * Phase C loop with ZERO behavior change — no launch_wave.mjs invocation occurs.
 *
 * @param {string|undefined} executionMode  sprint-frontmatter `execution_mode` value
 * @param {NodeJS.ProcessEnv} [env]         session env (defaults to process.env)
 * @returns {boolean}                       true → parallel waves; false → serial loop
 */
export function shouldRunParallel(executionMode, env = process.env) {
  if ((env.CLEARGATE_PARALLEL_WAVES || '').toLowerCase() === 'off') return false;
  if (executionMode === 'v2-serial') return false;
  return executionMode === 'v2-parallel';
}

// ---------------------------------------------------------------------------
// Barrier verdict validator (EXPORTED — STORY-033-04 §1.2 / §4.1).
// ---------------------------------------------------------------------------

/**
 * Internal: validate a single verdict, returning a human-readable reason string when it
 * is malformed, or null when it is well-formed. Never throws — the array-level
 * `validateVerdicts` owns the throw so it can name the offending storyId.
 *
 * @param {unknown} v
 * @returns {string|null}  malformation reason, or null if valid
 */
function verdictMalformationReason(v) {
  if (v === null || typeof v !== 'object') {
    return 'verdict is not an object';
  }
  const verdict = /** @type {Record<string, unknown>} */ (v);

  // Discriminant must be one of the three known verdict kinds.
  if (!VERDICT_KINDS.includes(/** @type {string} */ (verdict.verdict))) {
    return `'verdict' must be one of ${VERDICT_KINDS.join(', ')} (got ${JSON.stringify(verdict.verdict)})`;
  }

  // Required scalar fields.
  for (const field of REQUIRED_SCALAR_FIELDS) {
    if (typeof verdict[field] !== 'string' || verdict[field] === '') {
      return `missing or empty required field '${field}'`;
    }
  }

  // flashcards_flagged must be an array (may be empty).
  if (!Array.isArray(verdict.flashcards_flagged)) {
    return `'flashcards_flagged' must be an array`;
  }

  // counters object with the three required numeric sub-fields.
  const counters = verdict.counters;
  if (counters === null || typeof counters !== 'object') {
    return `missing required 'counters' object`;
  }
  for (const field of REQUIRED_COUNTER_FIELDS) {
    if (typeof (/** @type {Record<string, unknown>} */ (counters))[field] !== 'number') {
      return `'counters.${field}' must be a number`;
    }
  }

  // tokens object with the five required sub-fields (per-segment cost the ledger consumes).
  const tokens = verdict.tokens;
  if (tokens === null || typeof tokens !== 'object') {
    return `missing required 'tokens' object`;
  }
  for (const field of REQUIRED_TOKEN_FIELDS) {
    const val = (/** @type {Record<string, unknown>} */ (tokens))[field];
    if (field === 'model') {
      if (typeof val !== 'string' || val === '') return `'tokens.model' must be a non-empty string`;
    } else if (typeof val !== 'number') {
      return `'tokens.${field}' must be a number`;
    }
  }

  // blocker is REQUIRED iff verdict !== GREEN (§1.2).
  if (verdict.verdict !== 'GREEN') {
    const blocker = verdict.blocker;
    if (blocker === null || blocker === undefined || typeof blocker !== 'object') {
      return `non-GREEN verdict (${verdict.verdict}) is missing the required 'blocker' object`;
    }
    const b = /** @type {Record<string, unknown>} */ (blocker);
    if (!BLOCKER_TYPES.includes(/** @type {string} */ (b.type))) {
      return `'blocker.type' must be one of the §22 true-blocker kinds ${BLOCKER_TYPES.join(', ')} (got ${JSON.stringify(b.type)})`;
    }
    if (typeof b.message !== 'string' || b.message === '') {
      return `'blocker.message' must be a non-empty string`;
    }
  }

  return null;
}

/**
 * Barrier validator. Accepts a well-formed verdict array; raises a validation Error NAMING
 * the offending `storyId` on the first malformed verdict (missing required field, unknown
 * discriminant, or non-GREEN without a valid `blocker`). The named segment is the one the
 * Orchestrator marks ESCALATED (no ledger row); sibling GREEN verdicts consolidate.
 *
 * @param {unknown[]} verdicts
 * @returns {void}
 * @throws {Error} when any verdict is malformed — message contains the offending storyId.
 */
export function validateVerdicts(verdicts) {
  if (!Array.isArray(verdicts)) {
    throw new Error(
      `validateVerdicts: expected an array of segment verdicts, got ${typeof verdicts}.`,
    );
  }

  for (const v of verdicts) {
    const reason = verdictMalformationReason(v);
    if (reason !== null) {
      // Name the offending storyId so the Orchestrator can mark exactly that segment
      // ESCALATED. Fall back to a placeholder when the verdict has no usable storyId.
      const offendingId =
        v !== null && typeof v === 'object' && typeof v.storyId === 'string' && v.storyId !== ''
          ? v.storyId
          : '<unknown-storyId>';
      throw new Error(`Malformed segment verdict for ${offendingId}: ${reason}.`);
    }
  }
}

// ---------------------------------------------------------------------------
// launchWave — the parallel() driver (next-sprint surface; not exercised this sprint).
// ---------------------------------------------------------------------------

/**
 * Drive a `parallel()` Workflow of one segment per story in the wave. Each segment mints a
 * stable RUN_ID, runs the linear per-story pipeline inside its own ClearGate-managed
 * `.worktrees/STORY-X`, accumulates `tokens` from the outset, and RETURNS a verdict object —
 * it never blocks (a §22 true-blocker becomes a BLOCKED verdict with `blocker.type`, never an
 * `AskUserQuestion`).
 *
 * Flashcard write-gate (BUG-034 — code-enforced restore). Per the spike, per-thunk child env
 * is not settable, so the WRITE-gate is suppressed by setting `SKIP_FLASHCARD_GATE=1` in the
 * env inherited by every segment for the duration of the `parallel()` dispatch. This launcher
 * OWNS that save/set/restore in a `try/finally`: the prior value is snapshotted, `=1` is set
 * before dispatch, and the EXACT prior value is restored (deleted iff it was unset) in a
 * `finally` that runs even when `parallel()` or `validateVerdicts()` throws. Previously this
 * was an Orchestrator prose obligation (SKILL.md §C.0.1); a mid-barrier throw left the gate
 * suppressed session-wide, leaking into the serial fallback EPIC-033 promises is untouched.
 *
 * `validateVerdicts()` (the designed throw site) runs INSIDE the protected region so the
 * `finally` always restores the gate before the validation Error propagates to the caller.
 *
 * The `parallel`/`segmentRunner` seams are injected so this is testable without a live
 * Workflow runtime (SPRINT-32 runs serial — no real dispatch). When omitted, the function
 * documents the shape and performs NO env mutation; the live launcher wires the Workflow
 * `parallel()` primitive.
 *
 * @param {object} args
 * @param {string} args.sprintId
 * @param {string} args.sprintBranch
 * @param {{ wave: string, stories: string[], parallel: boolean }} args.wave  one wave from waves.json
 * @param {(thunks: Array<() => Promise<object>>) => Promise<object[]>} [args.parallel]  parallel() seam
 * @param {(story: string, runId: string) => Promise<object>} [args.segmentRunner]       per-segment seam
 * @param {NodeJS.ProcessEnv} [args.env]  env handle for the gate save/restore (defaults to process.env)
 * @returns {Promise<object[]>}  the validated array of segment verdicts
 * @throws {Error} from validateVerdicts when any verdict is malformed — gate is restored first.
 */
export async function launchWave({ sprintId, sprintBranch, wave, parallel, segmentRunner, env = process.env }) {
  const stories = (wave && Array.isArray(wave.stories) ? wave.stories : []).slice();

  // Pre-create each wave story's worktree SERIALLY (spike risk-mitigation: concurrent
  // `git worktree add` races the repo index). The actual exec is the Orchestrator's job;
  // here we surface the commands so the launcher / tests can assert their construction.
  const worktreeCommands = stories.map((story) => worktreeAddCommand(story, sprintBranch));

  // Build one thunk per story; each mints its own distinct RUN_ID.
  const segmentPlan = stories.map((story) => ({ story, runId: mintRunId(story, sprintId) }));

  if (typeof parallel !== 'function' || typeof segmentRunner !== 'function') {
    // No live runtime seam supplied (the SPRINT-32 serial-build case). Return the plan so a
    // caller can inspect the worktree commands + minted RUN_IDs without dispatching agents.
    // NO env mutation here — nothing is dispatched, so the gate need not be suppressed.
    return segmentPlan.map((seg) => ({
      storyId: seg.story,
      runId: seg.runId,
      worktreeCommand: worktreeAddCommand(seg.story, sprintBranch),
      planned: true,
    }));
  }

  // BUG-034: snapshot the PRIOR gate value, suppress it for the dispatch, restore it EXACTLY
  // in a `finally` — even if parallel()/validateVerdicts() throws. `hasOwnProperty` (not a
  // truthiness check) distinguishes "unset" from "set to empty string" so restore is exact.
  const hadPriorGate = Object.prototype.hasOwnProperty.call(env, 'SKIP_FLASHCARD_GATE');
  const priorGate = env.SKIP_FLASHCARD_GATE;
  env.SKIP_FLASHCARD_GATE = '1';
  try {
    const thunks = segmentPlan.map((seg) => () => segmentRunner(seg.story, seg.runId));
    const verdicts = await parallel(thunks);
    // Designed throw site (names the offending storyId). Inside the try so the finally below
    // restores the gate before the Error propagates to the Orchestrator.
    validateVerdicts(verdicts);
    void worktreeCommands; // pre-created by the Orchestrator before the parallel() call
    return verdicts;
  } finally {
    if (hadPriorGate) env.SKIP_FLASHCARD_GATE = priorGate;
    else delete env.SKIP_FLASHCARD_GATE;
  }
}

// When run directly (`node launch_wave.mjs`) print a short usage note — there is no live
// wave to drive in this sprint, so direct execution is informational only.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(
    'launch_wave.mjs — parallel-wave launcher (EPIC-033). ' +
      'Exports validateVerdicts, mintRunId, worktreeAddCommand, shouldRunParallel, launchWave. ' +
      'Not invoked under execution_mode: v2-serial or CLEARGATE_PARALLEL_WAVES=off (serial Phase C loop).\n',
  );
}

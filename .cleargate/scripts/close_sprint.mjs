#!/usr/bin/env node
/**
 * close_sprint.mjs — Eight-step sprint close pipeline
 *
 * Usage: node close_sprint.mjs <sprint-id> [--assume-ack]
 *        node close_sprint.mjs <sprint-id> --report-body-stdin   (STORY-014-10)
 *
 * Steps:
 *   1. Load and validate state.json via validateState
 *   2. Refuse if any story state is not in TERMINAL_STATES (exit non-zero, list offenders)
 *   3. Invoke prefill_report.mjs on all agent reports
 *   3.5 Build curated Reporter context bundle via prep_reporter_context.mjs (non-fatal)
 *   4. Orchestrator spawns Reporter separately (script validates preconditions only)
 *   5. On Reporter success + user ack (or --assume-ack flag), flip sprint_status -> "Completed"
 *   6. Invoke suggest_improvements.mjs unconditionally
 *   7. Auto-push per-artifact status updates to MCP via cleargate sync work-items (non-fatal)
 *   8. Verbose post-close handoff list (6-item next-steps block to stdout)
 *
 * Report filename: SPRINT-<#>_REPORT.md for new sprints (SPRINT-18+).
 *   Backwards-compat: if SPRINT-<#>_REPORT.md is absent but REPORT.md exists (legacy
 *   SPRINT-01..17), fall back to REPORT.md for read operations. New writes always
 *   use SPRINT-<#>_REPORT.md when the sprint-id carries a numeric portion.
 *   If the sprint-id has no numeric portion (e.g. SPRINT-TEST), plain REPORT.md is used.
 *
 * Stdin fallback (STORY-014-10): when `--report-body-stdin` is passed, the script
 * reads the full SPRINT-<#>_REPORT.md body from stdin and writes it atomically in lieu of
 * waiting for a Reporter-produced file. Replaces the Step-4 gate; implies ack.
 * Refuses empty stdin or pre-existing report file.
 *
 * Does NOT archive the sprint file (pending-sync -> archive stays human per EPIC-013 §4.5 step 7).
 *
 * Reuse: TERMINAL_STATES, VALID_STATES from constants.mjs
 *        validateState from validate_state.mjs
 *        atomicWrite pattern from update_state.mjs
 *
 * Test seams (CR-022 M1):
 *   CLEARGATE_SKIP_LIFECYCLE_CHECK=1  — skip Step 2.6 lifecycle reconciliation entirely
 *                                       (test environments where the CLI binary is present
 *                                       but real git history would produce drift false-positives).
 *   CLEARGATE_SKIP_WORKTREE_CHECK=1   — skip Step 2.7 entirely (test environments that cannot
 *                                       run git worktree list from a real git root).
 *   CLEARGATE_FORCE_WORKTREE_PATHS=p1,p2 — comma-separated fake worktree paths injected into
 *                                          Step 2.7 instead of running git worktree list.
 *                                          Used to exercise the v2 block / v1 advisory paths
 *                                          without a real .worktrees/STORY-* directory.
 *   CLEARGATE_SKIP_MERGE_CHECK=1     — skip Step 2.8 entirely (test environments where git
 *                                      refs are absent or merge state is irrelevant).
 *   CLEARGATE_FORCE_MERGE_STATUS=merged|unmerged — inject merge status for Step 2.8 without
 *                                                  running git merge-base. Used to exercise
 *                                                  the v2 block / v1 advisory paths.
 *   CLEARGATE_REPO_ROOT=<path>       — override REPO_ROOT for Step 2.8 git commands
 *                                      (used in tests that need a controlled git repo).
 *   CLEARGATE_SKIP_SPRINT_TRENDS=1   — skip Step 6.5 entirely (test environments).
 *   CLEARGATE_SKIP_SKILL_CANDIDATES=1 — skip Step 6.6 entirely (test environments).
 *   CLEARGATE_SKIP_FLASHCARD_CLEANUP=1 — skip Step 6.7 entirely (test environments).
 *   CLEARGATE_SPRINT_RUNS_DIR=<path> — override .cleargate/sprint-runs/ root for
 *                                      sibling-sprint counting in sprint_trends.mjs.
 *   CLEARGATE_FLASHCARD_PATH=<path>  — override .cleargate/FLASHCARD.md path for
 *                                      --flashcard-cleanup scan in suggest_improvements.mjs.
 *   CLEARGATE_FLASHCARD_LOOKBACK=<N> — override 3-sprint default lookback for
 *                                      --flashcard-cleanup scan.
 *   CLEARGATE_SKIP_BUNDLE_CHECK=1    — skip Step 3.5 bundle generation + size check entirely
 *                                      (CR-036 test seam; analogous to CLEARGATE_SKIP_MERGE_CHECK).
 *                                      Never use in production — Step 3.5 is v2-fatal in production.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { TERMINAL_STATES } from './constants.mjs';
import { validateState } from './validate_state.mjs';
import { reportFilename } from './lib/report-filename.mjs';

/**
 * Migrate a v1 state.json to v2 by injecting lane fields with defaults.
 * Inlined from update_state.mjs:migrateV1ToV2 to avoid triggering that
 * script's CLI main() on import (update_state.mjs has no module guard).
 * @param {object} state - Parsed v1 state object
 * @returns {object} - The mutated (now v2) state object
 */
function migrateV1ToV2(state) {
  state.schema_version = 2;
  const storyIds = Object.keys(state.stories || {});
  for (const id of storyIds) {
    const story = state.stories[id];
    if (story.lane == null) story.lane = 'standard';
    if (story.lane_assigned_by == null) story.lane_assigned_by = 'migration-default';
    if (story.lane_demoted_at === undefined) story.lane_demoted_at = null;
    if (story.lane_demotion_reason === undefined) story.lane_demotion_reason = null;
  }
  process.stderr.write(
    `migration: schema_version 1 → 2 for sprint ${state.sprint_id} (${storyIds.length} stories defaulted to lane: standard)\n`
  );
  return state;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.env.CLEARGATE_REPO_ROOT
  ? path.resolve(process.env.CLEARGATE_REPO_ROOT)
  : path.resolve(__dirname, '..', '..');
const SCRIPTS_DIR = __dirname;

function usage() {
  process.stderr.write(
    'Usage: node close_sprint.mjs <sprint-id> [--assume-ack | --report-body-stdin]\n' +
    '\n' +
    'Options:\n' +
    '  --assume-ack           Skip user acknowledgement prompt (automated tests ONLY — conversational orchestrators MUST NOT pass this)\n' +
    '  --report-body-stdin    Read SPRINT-<#>_REPORT.md body from stdin; implies ack (STORY-014-10)\n'
  );
  process.exit(2);
}


/**
 * Atomic write using tmp+rename pattern (per M1 update_state.mjs convention).
 * @param {string} filePath
 * @param {object} data
 */
function atomicWrite(filePath, data) {
  const tmpFile = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpFile, filePath);
}

/**
 * Atomic write for a string body. Separate from atomicWrite() so we don't
 * accidentally JSON.stringify a markdown body.
 * @param {string} filePath
 * @param {string} body
 */
function atomicWriteString(filePath, body) {
  const tmpFile = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpFile, body, 'utf8');
  fs.renameSync(tmpFile, filePath);
}

/**
 * Invoke a script via node (for .mjs scripts in the same directory).
 * Throws on non-zero exit.
 * @param {string} scriptName
 * @param {string[]} scriptArgs
 * @param {object} env
 */
function invokeScript(scriptName, scriptArgs, env) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  const argStr = scriptArgs.map(a => JSON.stringify(a)).join(' ');
  const cmd = `node ${JSON.stringify(scriptPath)} ${argStr}`;
  execSync(cmd, {
    stdio: 'inherit',
    env: Object.assign({}, process.env, env || {}),
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) usage();

  const sprintId = args[0];
  const reportBodyStdin = args.includes('--report-body-stdin');
  const assumeAck = args.includes('--assume-ack') || reportBodyStdin;

  const sprintDir = process.env.CLEARGATE_SPRINT_DIR
    ? path.resolve(process.env.CLEARGATE_SPRINT_DIR)
    : path.join(REPO_ROOT, '.cleargate', 'sprint-runs', sprintId);

  if (!fs.existsSync(sprintDir)) {
    process.stderr.write(`Error: sprint directory not found: ${sprintDir}\n`);
    process.exit(1);
  }

  const stateFile = process.env.CLEARGATE_STATE_FILE
    ? path.resolve(process.env.CLEARGATE_STATE_FILE)
    : path.join(sprintDir, 'state.json');

  // ── Step 1: Load and validate state.json ──────────────────────────────────
  if (!fs.existsSync(stateFile)) {
    process.stderr.write(
      `Error: state.json not found at ${stateFile}\n` +
      `Hint: run init_sprint.mjs ${sprintId} --stories <ids> first\n`
    );
    process.exit(1);
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    process.stderr.write(`Error: failed to parse state.json: ${err.message}\n`);
    process.exit(1);
  }

  // Migrate v1 → v2 if needed before strict validation
  if (state.schema_version === 1) {
    state = migrateV1ToV2(state);
    atomicWrite(stateFile, state);
  }

  const { valid, errors } = validateState(state);
  if (!valid) {
    process.stderr.write('Error: state.json validation failed:\n');
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.exit(1);
  }

  // ── Step 2: Refuse if any story not in TERMINAL_STATES ────────────────────
  const nonTerminal = [];
  for (const [storyId, story] of Object.entries(state.stories || {})) {
    if (!TERMINAL_STATES.includes(story.state)) {
      nonTerminal.push(`${storyId}: ${story.state} — not terminal`);
    }
  }

  if (nonTerminal.length > 0) {
    process.stderr.write('Error: sprint cannot close — non-terminal stories:\n');
    for (const msg of nonTerminal) {
      process.stderr.write(`  ${msg}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`Step 1-2 passed: all ${Object.keys(state.stories || {}).length} stories are terminal.\n`);

  // ── Step 2.5: v2.1 validation — activation-gated ──────────────────────────
  // Activation gate: schema_version >= 2 AND at least one story has lane: 'fast'
  const isV2 = (state.schema_version || 1) >= 2;
  const hasFastLane = isV2 && Object.values(state.stories || {}).some(
    (s) => /** @type {any} */ (s).lane === 'fast'
  );

  if (isV2 && hasFastLane) {
    // Naming convention: sprint dir must match ^SPRINT-\d{2,3}$
    const sprintDirName = path.basename(sprintDir);
    if (!/^SPRINT-\d{2,3}$/.test(sprintDirName)) {
      process.stderr.write(
        `close_sprint: sprint dir "${sprintDirName}" does not match ^SPRINT-\\d{2,3}$\n` +
        `  Expected format: SPRINT-NN or SPRINT-NNN (e.g. SPRINT-14)\n` +
        `  Got: "${sprintDirName}" at path: ${sprintDir}\n`
      );
      process.exit(1);
    }

    // Read SPRINT-<#>_REPORT.md (with legacy REPORT.md fallback for pre-CR-021 sprints)
    const reportFile2 = reportFilename(sprintDir, sprintId, { forRead: true });
    if (!fs.existsSync(reportFile2)) {
      process.stderr.write(
        `close_sprint: v2.1 validation requires ${path.basename(reportFile2)} at ${reportFile2}\n` +
        '  Run the Reporter agent first, then re-run close_sprint.mjs.\n'
      );
      process.exit(1);
    }
    const report = fs.readFileSync(reportFile2, 'utf8');

    // Check required §3 metric rows
    const requiredMetricRows = [
      /Fast-Track Ratio/,
      /Fast-Track Demotion Rate/,
      /Hotfix Count/,
      /Hotfix-to-Story Ratio/,
      /Hotfix Cap Breaches/,
      /LD events/,
    ];
    const missingMetrics = requiredMetricRows.filter((rx) => !rx.test(report));
    if (missingMetrics.length > 0) {
      process.stderr.write(
        `close_sprint: §3 missing rows: ${missingMetrics.map((rx) => rx.source).join(', ')}\n`
      );
      process.exit(1);
    }

    // Check required §5 sections
    const requiredSections = [
      /Lane Audit/,
      /Hotfix Audit/,
      /Hotfix Trend/,
    ];
    const missingSections = requiredSections.filter((rx) => !rx.test(report));
    if (missingSections.length > 0) {
      process.stderr.write(
        `close_sprint: §5 missing: ${missingSections.map((rx) => rx.source).join(', ')}\n`
      );
      process.exit(1);
    }

    process.stdout.write('Step 2.5 passed: v2.1 validation — all required §3 metrics and §5 sections present.\n');
  }

  // ── Step 2.6: Lifecycle Reconciliation (CR-017) ──────────────────────────
  // Block close if any artifact referenced in this sprint's commits is still
  // non-terminal in pending-sync (excluding carry_over: true).
  // Invokes `cleargate sprint reconcile-lifecycle <sprint-id>` CLI wrapper.
  // Fail-open if CLI binary is unavailable (non-blocking for test environments).
  // Test seam: CLEARGATE_SKIP_LIFECYCLE_CHECK=1 skips this step entirely (non-fatal).
  process.stdout.write('Step 2.6: running lifecycle reconciliation...\n');
  if (process.env.CLEARGATE_SKIP_LIFECYCLE_CHECK === '1') {
    process.stdout.write('Step 2.6 skipped: CLEARGATE_SKIP_LIFECYCLE_CHECK=1 set (test seam).\n');
  } else {
    try {
      // Resolve CLI binary: prefer local dist/
      const cliBin = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');

      if (fs.existsSync(cliBin)) {
        // Read sprint start_date from frontmatter for the --since arg
        let sinceArg = '';
        try {
          const pendingDir = path.join(REPO_ROOT, '.cleargate', 'delivery', 'pending-sync');
          if (fs.existsSync(pendingDir)) {
            const entries = fs.readdirSync(pendingDir);
            const sprintFile = entries.find(
              (e) => (e.startsWith(`${sprintId}_`) || e === `${sprintId}.md`) && e.endsWith('.md')
            );
            if (sprintFile) {
              const raw = fs.readFileSync(path.join(pendingDir, sprintFile), 'utf8');
              const startDateMatch = /^start_date:\s*(.+)$/m.exec(raw);
              if (startDateMatch && startDateMatch[1]) {
                sinceArg = `--since ${startDateMatch[1].trim()}`;
              }
            }
          }
        } catch { /* ignore */ }

        const reconcileArgs = [
          'node', JSON.stringify(cliBin), 'sprint', 'reconcile-lifecycle', JSON.stringify(sprintId),
        ];
        if (sinceArg) reconcileArgs.push(sinceArg);
        const reconcileCmd = reconcileArgs.join(' ');

        try {
          execSync(reconcileCmd, { stdio: 'inherit', env: process.env });
          process.stdout.write('Step 2.6 passed: lifecycle reconciliation clean.\n');
        } catch (_reconcileErr) {
          // Exit code 1 from reconcile-lifecycle means drift found
          process.stderr.write(
            'close_sprint: Step 2.6 FAILED — lifecycle drift blocks sprint close.\n' +
            '  Remediate the listed artifacts and re-run close_sprint.mjs.\n' +
            '  To carry over an artifact: set carry_over: true in its frontmatter.\n'
          );
          process.exit(1);
        }
      } else {
        process.stdout.write('Step 2.6 skipped: CLI binary not found at cleargate-cli/dist/cli.js (non-fatal).\n');
      }
    } catch (step26Err) {
      // Unexpected error — fail-open (log but do not block)
      process.stderr.write(`Step 2.6 warning: lifecycle reconciliation unavailable: ${step26Err.message}\n`);
    }
  }

  // ── Step 2.6b: Cross-Sprint Orphan Drift Check (CR-048) ─────────────────────
  // Detect items in pending-sync/ with non-terminal status whose state.json entry
  // in any closed sprint shows Done — i.e., completed but never archived.
  // v2: drift > 0 blocks close. v1: warn-only.
  // Test seam: CLEARGATE_SKIP_LIFECYCLE_CHECK=1 also skips this step.
  process.stdout.write('Step 2.6b: checking for cross-sprint orphan drift...\n');
  if (process.env.CLEARGATE_SKIP_LIFECYCLE_CHECK !== '1') {
    try {
      const cliBin26b = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');
      if (fs.existsSync(cliBin26b)) {
        // Dynamic import the compiled reconciler function
        const reconcilerMod = await import(
          path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'lib', 'lifecycle-reconcile.js')
        ).catch(() => null);

        if (reconcilerMod && typeof reconcilerMod.reconcileCrossSprintOrphans === 'function') {
          const deliveryRoot = path.join(REPO_ROOT, '.cleargate', 'delivery');
          const sprintRunsRoot = path.join(REPO_ROOT, '.cleargate', 'sprint-runs');
          const orphanResult = reconcilerMod.reconcileCrossSprintOrphans({ deliveryRoot, sprintRunsRoot });

          if (orphanResult.drift.length > 0) {
            process.stderr.write(
              `Step 2.6b: ${orphanResult.drift.length} cross-sprint orphan(s) detected:\n`
            );
            for (const item of orphanResult.drift) {
              process.stderr.write(
                `  ${item.id} — status: ${item.pending_sync_status} in pending-sync, ` +
                `state: ${item.state_json_state} in ${item.state_json_sprint}\n`
              );
            }
            if (isV2) {
              process.stderr.write(
                'close_sprint: Step 2.6b FAILED — orphan drift blocks sprint close under v2.\n' +
                '  Archive the listed items and re-run close_sprint.mjs.\n'
              );
              process.exit(1);
            } else {
              process.stdout.write('Step 2.6b warning (v1): orphan drift detected above — remediate before next sprint.\n');
            }
          } else {
            process.stdout.write('Step 2.6b passed: no cross-sprint orphan drift.\n');
          }
        } else {
          process.stdout.write('Step 2.6b skipped: reconcileCrossSprintOrphans not available in built CLI.\n');
        }
      } else {
        process.stdout.write('Step 2.6b skipped: CLI binary not found (non-fatal).\n');
      }
    } catch (step26bErr) {
      process.stderr.write(`Step 2.6b warning: orphan check unavailable: ${step26bErr.message}\n`);
    }
  } else {
    process.stdout.write('Step 2.6b skipped: CLEARGATE_SKIP_LIFECYCLE_CHECK=1 set (test seam).\n');
  }

  // ── Step 2.7: Worktree-Closed Check (CR-022 M1) ──────────────────────────
  // Block close if any .worktrees/STORY-* path is present.
  // v2 enforcing (exit 1); v1 advisory (warn + continue).
  // Skip if git worktree list is unavailable (non-fatal — tests run against tmpdirs).
  // Test seams: CLEARGATE_SKIP_WORKTREE_CHECK=1 bypasses entirely;
  //             CLEARGATE_FORCE_WORKTREE_PATHS=p1,p2 injects fake paths (no git call).
  process.stdout.write('Step 2.7: checking for leftover worktrees...\n');
  {
    if (process.env.CLEARGATE_SKIP_WORKTREE_CHECK === '1') {
      process.stdout.write('Step 2.7 skipped: CLEARGATE_SKIP_WORKTREE_CHECK=1 set (test seam).\n');
    } else {
      let leftoverWorktrees = [];
      let worktreeListAvailable = true;

      if (process.env.CLEARGATE_FORCE_WORKTREE_PATHS) {
        // Test seam: inject fake worktree paths without running git
        leftoverWorktrees = process.env.CLEARGATE_FORCE_WORKTREE_PATHS
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
      } else {
        try {
          const output = execSync('git worktree list --porcelain', {
            cwd: REPO_ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          });
          for (const line of output.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('worktree ')) continue;
            const wtPath = trimmed.slice('worktree '.length);
            if (/[/\\]\.worktrees[/\\]STORY-/.test(wtPath)) {
              const m = /(\.(worktrees)[/\\]STORY-.+)$/.exec(wtPath);
              leftoverWorktrees.push(m ? m[1] : wtPath);
            }
          }
        } catch {
          worktreeListAvailable = false;
        }
      }

      // Step 2.7 enforcing mode: v2 execution_mode (not just schema_version, since
      // migration bumps schema_version to 2 for all sprints before isV2 is evaluated).
      // Using execution_mode preserves v1 advisory behaviour for sprints initialised
      // with execution_mode: "v1" even after their schema is migrated.
      const isEnforcingV2 = isV2 && state.execution_mode === 'v2';

      if (!worktreeListAvailable) {
        process.stdout.write('Step 2.7 skipped: git worktree list unavailable (non-fatal).\n');
      } else if (leftoverWorktrees.length === 0) {
        process.stdout.write('Step 2.7 passed: no leftover worktrees.\n');
      } else if (isEnforcingV2) {
        // v2 enforcing — block close
        process.stderr.write(
          `close_sprint: Step 2.7 failed: leftover worktree at ${leftoverWorktrees[0]}\n` +
          `  ${leftoverWorktrees.length === 1 ? '' : `(plus ${leftoverWorktrees.length - 1} more)\n  `}` +
          `Run \`git worktree remove ${leftoverWorktrees[0]}\` if abandoned, or merge the work in progress.\n` +
          `  All worktrees must be closed before sprint close.\n`
        );
        process.exit(1);
      } else {
        // v1 advisory — warn + continue
        process.stderr.write(
          `Step 2.7 warning: leftover worktree at ${leftoverWorktrees[0]} (advisory in v1).\n`
        );
      }
    }
  }

  // ── Step 2.8: Sprint branch merged to main (verify-only, NO auto-merge) ──────
  // CR-022 §1: verify-only — script asserts merge ancestry, does NOT run the merge.
  // On miss: list unmerged commits + exit 1 (v2 enforcing); warn + continue (v1 advisory).
  // Skip when sprintId has no numeric portion (e.g. SPRINT-TEST fixture).
  // Test seams: CLEARGATE_SKIP_MERGE_CHECK=1 bypasses entirely;
  //             CLEARGATE_FORCE_MERGE_STATUS=merged|unmerged injects status without git call.
  {
    if (process.env.CLEARGATE_SKIP_MERGE_CHECK === '1') {
      process.stdout.write('Step 2.8 skipped: CLEARGATE_SKIP_MERGE_CHECK=1 set (test seam).\n');
    } else {
      const sprintNumMatch = /^SPRINT-(\d{2,3})$/.exec(sprintId);
      if (!sprintNumMatch) {
        process.stdout.write(`Step 2.8 skipped: sprint-id "${sprintId}" has no numeric portion.\n`);
      } else {
        const sprintBranch = `refs/heads/sprint/S-${sprintNumMatch[1]}`;
        const mainBranch = 'refs/heads/main';
        process.stdout.write(`Step 2.8: verifying ${sprintBranch} merged to ${mainBranch}...\n`);

        const isEnforcingV2 = isV2 && state.execution_mode === 'v2';

        const forcedStatus = process.env.CLEARGATE_FORCE_MERGE_STATUS;
        let isMerged = false;
        let mergeCheckAvailable = true;

        if (forcedStatus === 'merged') {
          isMerged = true;
        } else if (forcedStatus === 'unmerged') {
          isMerged = false;
        } else {
          try {
            execSync(
              `git merge-base --is-ancestor ${sprintBranch} ${mainBranch}`,
              { stdio: 'pipe', cwd: REPO_ROOT, env: process.env }
            );
            isMerged = true;
          } catch (mergeErr) {
            const exitStatus = /** @type {any} */ (mergeErr).status;
            if (exitStatus === 1) {
              isMerged = false;
            } else {
              // exit 128: refs missing or other git failure — fail-open with warning
              mergeCheckAvailable = false;
              process.stderr.write(
                `Step 2.8 warning: git merge-base check unavailable (${/** @type {Error} */ (mergeErr).message}). ` +
                `Skipping merge verification.\n`
              );
            }
          }
        }

        if (!mergeCheckAvailable) {
          // fail-open: refs missing or git unavailable — continue to Step 3
        } else if (isMerged) {
          process.stdout.write(`Step 2.8 passed: ${sprintBranch} is merged to ${mainBranch}.\n`);
        } else if (isEnforcingV2) {
          // v2 enforcing — block close
          let unmergedLog = '';
          if (!forcedStatus) {
            try {
              unmergedLog = execSync(
                `git log ${mainBranch}..${sprintBranch} --oneline`,
                { encoding: 'utf8', cwd: REPO_ROOT, env: process.env }
              );
            } catch { /* unmerged-log fetch failed — proceed without */ }
          }
          process.stderr.write(
            `Step 2.8 failed: sprint/S-${sprintNumMatch[1]} not merged to main.\n` +
            (unmergedLog ? `  Unmerged commits:\n${unmergedLog}` : '') +
            `  Resolve: merge sprint/S-${sprintNumMatch[1]} → main, then re-run close_sprint.mjs.\n`
          );
          process.exit(1);
        } else {
          // v1 advisory — warn + continue
          process.stderr.write(
            `Step 2.8 warning: sprint/S-${sprintNumMatch[1]} not merged to main (advisory in v1).\n`
          );
        }
      }
    }
  }

  // ── Step 3: Invoke prefill_report.mjs ─────────────────────────────────────
  process.stdout.write('Step 3: running prefill_report.mjs...\n');
  try {
    invokeScript('prefill_report.mjs', [sprintId], {
      CLEARGATE_STATE_FILE: stateFile,
      CLEARGATE_SPRINT_DIR: sprintDir,
    });
  } catch (err) {
    process.stderr.write(`Error: prefill_report.mjs failed: ${err.message}\n`);
    process.exit(1);
  }

  // ── Step 3.5: Build curated Reporter context bundle ───────────────────────
  const bundlePath = path.join(sprintDir, '.reporter-context.md');
  const isEnforcingV2 = isV2 && state.execution_mode === 'v2';
  const MIN_BUNDLE_BYTES = 2048;
  if (process.env.CLEARGATE_SKIP_BUNDLE_CHECK === '1') {
    process.stdout.write('Step 3.5 skipped: CLEARGATE_SKIP_BUNDLE_CHECK=1 set (test seam).\n');
  } else {
    process.stdout.write('Step 3.5: building Reporter context bundle...\n');
    try {
      invokeScript('prep_reporter_context.mjs', [sprintId], {
        CLEARGATE_STATE_FILE: stateFile,
        CLEARGATE_SPRINT_DIR: sprintDir,
      });
      if (!fs.existsSync(bundlePath)) {
        throw new Error(`bundle not written at ${bundlePath}`);
      }
      const bundleSize = fs.statSync(bundlePath).size;
      if (bundleSize < MIN_BUNDLE_BYTES) {
        throw new Error(`bundle too small (${bundleSize}B < ${MIN_BUNDLE_BYTES}B): ${bundlePath}`);
      }
      process.stdout.write(`Step 3.5 passed: ${bundlePath} ready (${Math.round(bundleSize / 1024)}KB).\n`);
    } catch (err) {
      const msg = /** @type {Error} */ (err).message;
      if (isEnforcingV2) {
        process.stderr.write(
          `close_sprint: Step 3.5 FAILED (v2 hard-block): ${msg}\n` +
          `  Cannot dispatch Reporter without bundle. Fix prep_reporter_context.mjs or run with execution_mode: v1.\n` +
          `  Diagnostic: node .cleargate/scripts/prep_reporter_context.mjs ${sprintId}\n`
        );
        process.exit(1);
      } else {
        process.stderr.write(`Step 3.5 warning (v1 advisory): ${msg}\n`);
        process.stderr.write('Reporter will fall back to broad-fetch context loading.\n');
      }
    }
  }

  // ── Step 4: Orchestrator spawns Reporter separately ───────────────────────
  // This script only validates preconditions; it does NOT fork the Reporter agent.
  const reportFile = reportFilename(sprintDir, sprintId);
  const reportBasename = path.basename(reportFile);
  process.stdout.write(
    'Step 4: preconditions satisfied — orchestrator should now spawn the Reporter agent.\n' +
    `        The Reporter writes ${reportBasename} using the sprint_report.md template.\n` +
    `        Expected output: ${reportFile}\n`
  );

  // ── Step 4.5 (STORY-014-10): --report-body-stdin fallback ────────────────
  // Orchestrator pipes the Reporter's markdown body here when the Reporter's
  // Write tool is blocked. Refuses empty stdin + pre-existing report file.
  if (reportBodyStdin) {
    if (fs.existsSync(reportFile)) {
      process.stderr.write(
        `Error: ${reportBasename} already exists at ${reportFile}\n` +
        'Delete it or skip --report-body-stdin mode to use the primary Reporter-write path.\n'
      );
      process.exit(1);
    }
    let body;
    try {
      body = fs.readFileSync(0, 'utf8');
    } catch (err) {
      process.stderr.write(`Error: failed to read stdin: ${/** @type {Error} */ (err).message}\n`);
      process.exit(1);
    }
    if (!body || body.trim().length === 0) {
      process.stderr.write('Error: empty report body — refusing to write.\n');
      process.exit(1);
    }
    atomicWriteString(reportFile, body);
    process.stdout.write(
      `Step 4.5 (stdin mode): ${reportBasename} written (${body.length} bytes) at ${reportFile}\n`
    );
    // Fall through to Step 5 + 6 + 7 unconditionally — stdin mode implies ack.
  } else if (!assumeAck) {
    // Apply read-fallback for legacy sprints (e.g. SPRINT-15 with plain REPORT.md)
    const reportFileForCheck = reportFilename(sprintDir, sprintId, { forRead: true });
    if (!fs.existsSync(reportFileForCheck)) {
      process.stdout.write(
        `\nWaiting for Reporter to produce ${reportBasename}...\n` +
        'After Reporter succeeds, re-run with --assume-ack to complete the close.\n'
      );
      process.exit(0);
    }
    // In non-assume-ack mode with existing report, prompt user
    process.stdout.write(
      `\n${reportBasename} found at ${reportFileForCheck}\n` +
      'Review the report, then confirm close by re-running with --assume-ack\n'
    );
    process.exit(0);
  }

  // ── Step 5: Flip sprint_status to "Completed" ────────────────────────────
  process.stdout.write('Step 5: flipping sprint_status to "Completed"...\n');
  const now = new Date().toISOString();
  state.sprint_status = 'Completed';
  state.last_action = `close_sprint: sprint ${sprintId} completed`;
  state.updated_at = now;
  atomicWrite(stateFile, state);
  process.stdout.write(`sprint_status flipped to "Completed" at ${now}\n`);

  // ── Step 6: Invoke suggest_improvements.mjs unconditionally ───────────────
  process.stdout.write('Step 6: running suggest_improvements.mjs...\n');
  try {
    invokeScript('suggest_improvements.mjs', [sprintId], {
      CLEARGATE_STATE_FILE: stateFile,
      CLEARGATE_SPRINT_DIR: sprintDir,
    });
  } catch (err) {
    // suggest_improvements failure is non-fatal — log but do not abort
    process.stderr.write(`Warning: suggest_improvements.mjs failed: ${/** @type {Error} */ (err).message}\n`);
    process.stderr.write('Sprint is still marked Completed; improvement suggestions may be incomplete.\n');
  }

  // ── Step 6.5: Run sprint_trends.mjs (stub — full impl deferred to CR-027) ──
  if (process.env.CLEARGATE_SKIP_SPRINT_TRENDS !== '1') {
    process.stdout.write('Step 6.5: running sprint_trends.mjs (stub)...\n');
    try {
      invokeScript('sprint_trends.mjs', [sprintId], {
        CLEARGATE_STATE_FILE: stateFile,
        CLEARGATE_SPRINT_DIR: sprintDir,
      });
    } catch (err) {
      // Non-fatal — sprint stays Completed; trends are advisory only.
      process.stderr.write(`Step 6.5 warning: sprint_trends.mjs failed: ${/** @type {Error} */ (err).message}\n`);
    }
  }

  // ── Step 6.6: Skill-candidate detection (folds into suggest_improvements.mjs) ──
  if (process.env.CLEARGATE_SKIP_SKILL_CANDIDATES !== '1') {
    process.stdout.write('Step 6.6: scanning for skill candidates...\n');
    try {
      invokeScript('suggest_improvements.mjs', [sprintId, '--skill-candidates'], {
        CLEARGATE_STATE_FILE: stateFile,
        CLEARGATE_SPRINT_DIR: sprintDir,
      });
    } catch (err) {
      process.stderr.write(`Step 6.6 warning: skill-candidate scan failed: ${/** @type {Error} */ (err).message}\n`);
    }
  }

  // ── Step 6.7: FLASHCARD cleanup pass (folds into suggest_improvements.mjs) ──
  if (process.env.CLEARGATE_SKIP_FLASHCARD_CLEANUP !== '1') {
    process.stdout.write('Step 6.7: scanning FLASHCARD.md for cleanup candidates...\n');
    try {
      invokeScript('suggest_improvements.mjs', [sprintId, '--flashcard-cleanup'], {
        CLEARGATE_STATE_FILE: stateFile,
        CLEARGATE_SPRINT_DIR: sprintDir,
      });
    } catch (err) {
      process.stderr.write(`Step 6.7 warning: FLASHCARD cleanup scan failed: ${/** @type {Error} */ (err).message}\n`);
    }
  }

  // ── Step 7: Auto-push per-artifact status updates to MCP ─────────────────
  // Runs after Gate 4 ack succeeds. Non-fatal: sprint stays Completed on failure.
  process.stdout.write('Step 7: pushing per-artifact status updates to MCP...\n');
  try {
    const cliBin = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');
    if (fs.existsSync(cliBin)) {
      // cleargate sync work-items takes ZERO positional args (verified cli.ts:592-598).
      // CR-021 §3.2.3 spec shows a sprint-id arg — that is spec drift; drop it.
      execSync(`node ${JSON.stringify(cliBin)} sync work-items`, {
        stdio: 'inherit',
        env: process.env,
        timeout: 30000,
      });
      process.stdout.write('Step 7 passed: work-item statuses synced.\n');
    } else {
      process.stdout.write('Step 7 skipped: CLI binary not found (non-fatal).\n');
    }
  } catch (err) {
    // Non-fatal — sprint stays Completed; sync can be retried manually
    process.stderr.write(`Step 7 warning: sync work-items failed: ${/** @type {Error} */ (err).message}\n`);
    process.stderr.write('Run `cleargate sync work-items` manually to retry.\n');
  }

  // ── Step 8: Verbose post-close handoff list ───────────────────────────────
  // Prints 6 explicit next-step items to stdout (CR-022 §3 M4).
  {
    const sprintNumMatch = /^SPRINT-(\d{2,3})$/.exec(sprintId);
    const nextSprintNum = sprintNumMatch
      ? String(parseInt(sprintNumMatch[1], 10) + 1).padStart(sprintNumMatch[1].length, '0')
      : null;
    const nextSprintId = nextSprintNum ? `SPRINT-${nextSprintNum}` : '<next-sprint-id>';
    const reportBasename = path.basename(reportFile);
    const suggestionsPath = path.join(sprintDir, 'improvement-suggestions.md');

    process.stdout.write(`\n${sprintId} closed. Next steps:\n`);
    process.stdout.write(`  1. Review ${reportBasename}\n`);
    process.stdout.write(
      `  2. Review improvement-suggestions.md (sections: Suggestions / Skill Candidates / FLASHCARD Cleanup)\n`,
    );
    process.stdout.write(
      `  3. Approve or reject Skill Candidates → run /improve or cleargate skill create <name>\n`,
    );
    process.stdout.write(
      `  4. Approve or reject FLASHCARD cleanup entries → run /improve or cleargate flashcard prune\n`,
    );
    process.stdout.write(
      `  5. Push approved status changes to MCP if Step 7 warned (\`cleargate sync work-items\`)\n`,
    );
    process.stdout.write(
      `  6. Initialize next sprint: \`cleargate sprint init ${nextSprintId} --stories <ids>\`\n`,
    );

    // Surface artifact paths for convenience
    process.stdout.write(`\nArtifacts:\n`);
    process.stdout.write(`  report:               ${reportFile}\n`);
    process.stdout.write(`  improvement-suggestions: ${suggestionsPath}\n`);
  }
}

await main();

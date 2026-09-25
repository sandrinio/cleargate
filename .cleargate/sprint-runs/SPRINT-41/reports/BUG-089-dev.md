# BUG-089 Developer Report

role: developer

## Implementation

Built the approved shared handler and wired both blocking Claude PreToolUse gates through it.

- `cleargate-cli/src/hooks/hook-signal.ts` — `resolveHookSignal({host, decision})`: Claude
  `block`→`{exitCode: 2}`, `allow`→`{exitCode: 0}`; throws on an unknown host or decision.
  Codex mapping is left to STORY-058-10 (M5) rather than duplicated here.
- `cleargate-cli/src/commands/hook.ts` + `src/cli.ts` — `cleargate hook signal <block|allow>
  --host <host>` (hidden CLI verb under a visible `hook` parent command). On any resolver
  failure it prints the reason to stderr and exits `2` — fail closed at the CLI layer too,
  not just in the shell wrapper.
- `cleargate-planning/.claude/hooks/pre-edit-gate.sh` and `pending-task-sentinel.sh` — both
  now parse a leading `--host` argument (default `claude` if absent), and on their blocking
  branch call `"${CG[@]}" hook signal block --host "${HOST}"` through the existing three-branch
  CLI resolver (dist → PATH → pinned npx). Whatever that call returns, the branch **always**
  exits exactly `2` afterward — a non-2 resolver outcome (missing CLI, crash, unexpected
  status) is logged (`hook-signal-non-2 exit=<n>`) but still fails closed, never falls through
  to 0/1/127. `pending-task-sentinel.sh` gained its own copy of the three-branch CLI resolver
  (it previously had none) since only `pre-edit-gate.sh` needed to call `doctor` before.
  Non-blocking scripts (`pre-tool-use-task.sh`, `pre-tool-use-autonomy.sh`, `stamp-and-gate.sh`)
  are untouched. No new `CLEARGATE_ADVISORY` honor site was added to `pre-edit-gate.sh` — the
  existing single honor site in `pending-task-sentinel.sh` is unchanged, per
  `cleargate-enforcement.md` §15's "no new honor site" rule.
- `cleargate-planning/.claude/settings.json` — both registered commands now carry an explicit
  `--host claude` suffix; matchers, other hooks, and policy untouched.
- `.cleargate/knowledge/cleargate-enforcement.md` (both copies, byte-identical) — §4.6
  "Enforcement logic" step 4 and §15's `CLEARGATE_ADVISORY` paragraph corrected: both used to
  describe a `pending-task-sentinel.sh` blocking signal in terms that assumed a bare non-zero
  exit was sufficient; now name the exact `exit 2` contract and the pre-BUG-089 fail-open
  exposure. Also corrected a stale line-number reference (`:129` → `:167`) for the
  `CLEARGATE_ADVISORY` honor site, since the new `--host` argument parser shifted it.

### Plan-adjacent fix (not in BUG-089's listed §4, self-amended — see item file)

`cleargate-cli/src/commands/init.ts`'s `HOOK_ADDITION` constant (used by `mergeSettings` to
inject the PreToolUse/PostToolUse block into an *existing* `.claude/settings.json` on every
`cleargate init`, including immediately after a fresh `copyPayload` write) still carried the
old `pre-edit-gate.sh` command string with no `--host claude`. `mergeSettings` dedups by
**exact** command string, so leaving it stale would have registered `pre-edit-gate.sh` twice
under `PreToolUse` `Edit|Write` on every fresh install (one with `--host claude` from the
canonical payload, one without from `HOOK_ADDITION`) — the very defect class this bug is
fixing, one layer up. Updated the literal to match the canonical string, and updated the one
`test/commands/init.node.test.ts` fixture (CR-059 scenario 5) that hand-authors an equivalent
object so its "idempotent, no duplicate" assertion stays true. Confirmed via a full run of
`test/commands/init.node.test.ts` (28/29 pass; the 1 failure is the expected Rule-15 case
below) that `scenario 2: re-run idempotent` still asserts exactly one inner hook.

### BUG-038 → BUG-089 snapshot succession (self-amended §4, per the item's own dispensation)

The frozen `test/commands/init.node.test.ts` test that renders `pre-edit-gate.sh` via
`initHandler` and compares it byte-for-byte to `test/snapshots/hooks/pre-edit-gate.bug-038.sh`
breaks on any change to the hook body. Added `test/snapshots/hooks/pre-edit-gate.bug-089.sh`
(the worktree's `pre-edit-gate.sh` with `__CLEARGATE_VERSION__` substituted for `0.5.0`, the
same substitution `copyPayload` performs — verified via `diff` against the worktree hook before
committing), split the old test into an existence-only check (bug-038, historical, untouched)
and a new byte-comparison test against the bug-089 successor. The bug-038 snapshot file itself
is untouched.

## Verification

All commands run through `bash .cleargate/scripts/run_script.sh <cmd>` per the Script
Invocation contract, except the final full-suite cross-check noted below.

- `CLEARGATE_META_ROOT=<worktree> npm run test:file -- test/hooks/hook-signal.red.node.test.ts
  test/hooks/hook-signal.red.integration.node.test.ts` → **17/17 pass** (14 unit + 3
  integration).
- `PRE_EDIT_GATE_HOOK=<worktree>/cleargate-planning/.claude/hooks/pre-edit-gate.sh bash
  test/scripts/test_pre_edit_gate.sh` → **11/11 pass**.
- (in the outer worktree) `PENDING_TASK_SENTINEL_HOOK=<worktree>/cleargate-planning/.claude/hooks/pending-task-sentinel.sh
  bash .cleargate/scripts/test/test_flashcard_enforcement.sh` → **12/12 pass**.
- `bash .cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` → **10/10 pass** (unmodified;
  ran read-only, confirms the flashcard-gate exit-2 change doesn't break dispatch attribution).
- `npm run typecheck` → clean.
- Full `npm test`, wrapped as required: **2698 tests, 2669 pass, 26 fail, 3 skipped.** All 26
  named and accounted for (none are BUG-089 regressions):
  - **9** read the outer MAIN checkout's unmerged canonical (Rule 15): the BUG-089 snapshot
    test (`test/commands/init.node.test.ts:131` hardcodes `META_ROOT = <cli>/..`, does not
    support a `CLEARGATE_META_ROOT` override) plus all 8 `hook-signal.red.node.test.ts`
    direct-script sub-tests under "U5-U12" (that file's own `META_ROOT` also defaults to
    `<cli>/..` when the env var isn't set — the full-suite run doesn't set it). All 9 will turn
    green once DevOps merges the outer half first, per this sprint's merge order.
  - **17** are a `run_script.sh` self-reentrancy artifact, already flashcarded
    (`.cleargate/FLASHCARD.md` 2026-06-04 `#test #run_script #isolation`): wrapping the whole
    `npm test` invocation leaks `RUN_SCRIPT_ACTIVE=1` into the child test process, so
    `run-script-wrapper.red.node.test.ts`, `run-script-utf8-truncation.red.node.test.ts`, and
    `wrap-script.red.node.test.ts` (which invoke the wrapper as their subject-under-test) find
    0 incident files where they expect one. Confirmed by re-running exactly those three files
    unwrapped: **21/21 + 8/8 = 29/29 pass**, zero failures.
  - A clean **unwrapped** full run (diagnostic cross-check, not the mandated invocation) came
    back **2698 tests, 2686 pass, 9 fail, 3 skipped** — exactly the 9 Rule-15 cases above, zero
    reentrancy noise, zero unexplained failures. This reconciles fully against the stated
    baseline (2683/2680/0/3): 15 net-new tests (14 in `hook-signal.red.node.test.ts` + 1 net
    from splitting the BUG-038 test), 6 of which pass immediately (`hook-signal` U1-U4/U13-U16)
    and 9 of which are the named Rule-15 cases.
- Per rule 14, reverted `.cleargate/delivery/**` and `cleargate-planning/MANIFEST.json` in the
  outer MAIN checkout after confirming (`git status --porcelain`) nothing else under those
  paths was dirtied by the test run.
- Did not run `npm run build` — `dist` stays owned by cli `main`, rebuilt by DevOps after
  merge, per rule 11.

## Script Incidents

Expected/explained failures only; no infra faults.

- `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T002711Z-032cbcfa7f35.json`
  and `…20260925T002726Z-032cbcfa7f35.json` — the two `test/commands/init.node.test.ts` targeted
  runs (1 expected Rule-15 failure each time).
- `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T003321Z-cefb9267289f.json`
  — the mandated wrapped `npm test` run (26 failures, all named above).

## Not mine

Live Claude session re-sync, backed-up hook replacement, and real-host denial/allow controls
are BUG-085's M0-B operational slice (Task Breakdown row 6, explicitly dropped from this
dispatch — see the item's Task Breakdown for the one-sentence reason). STORY-058-10's `codex`
host mapping and the `resolveHookSignal` vs `resolveBlockSignal` naming reconciliation (TPV
Advisory A2) remain the orchestrator's cross-story amendment.

## Rework 1 (qa_bounces=1, post-merge DevOps blocker)

Both halves merged (outer `sprint/S-41` `ebd70b09`, cli `main` `19a8a0f`). DevOps' post-merge
full suite found 1 failure: `test/docs/pin-placeholder-coverage.node.test.ts` — canonical
`pending-task-sentinel.sh` now embeds `HOOK_PIN="__CLEARGATE_VERSION__"` (in its own copy of
the three-branch CLI resolver, added by the original BUG-089 commit), but
`cleargate-cli/scripts/build-manifest.ts` had no dedicated `pin-aware` rule for that path — the
same gap class BUG-038 fixed for `pre-edit-gate.sh`. It fell through to the general
`.claude/hooks/**` `always` rule, so `cleargate upgrade` would never substitute the pin. This
was invisible pre-merge because the test reads the outer MAIN checkout's canonical (Rule 15).
Full details: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/reports/BUG-089-devops-blockers.md`.

**Fix (cli `story/BUG-089-r1`, cut from cli `main` `19a8a0f`):**

- `cleargate-cli/scripts/build-manifest.ts` — added a dedicated `overwrite_policy: 'pin-aware'`
  `TIER_RULES` entry for `.claude/hooks/pending-task-sentinel.sh`, immediately after BUG-038's
  `pre-edit-gate.sh` entry, with a one-line BUG-089 comment. This is the **only** place that
  needed a matching entry: `src/init/copy-payload.ts` already substitutes
  `__CLEARGATE_VERSION__` by scanning file *content* for the placeholder (no hardcoded list, per
  BUG-038's own fix), and `upgrade.ts`/`doctor.ts` both key off the manifest entry's
  `overwrite_policy` field dynamically — grepped `pre-edit-gate.sh` across `src/` and `scripts/`
  to confirm no other hardcoded per-file list exists.
- This file is off BUG-089's original §4 list — added a §4 self-amendment line to the item
  (below) and this Rework 1 section, per skill §9.

**Verification:**

- Regenerated `cleargate-planning/MANIFEST.json` in the outer MAIN checkout
  (`npx tsx scripts/build-manifest.ts`, through the wrapper) to prove the fix — confirmed
  `pending-task-sentinel.sh` now shows `overwrite_policy: "pin-aware"` with a fresh sha256.
- `npm run test:file -- test/docs/pin-placeholder-coverage.node.test.ts` → **4/4 pass**.
- `npm run test:file -- test/scripts/build-manifest.node.test.ts test/lib/manifest.node.test.ts
  test/commands/init.node.test.ts test/commands/upgrade-pin-and-prune.node.test.ts
  test/commands/upgrade-registers-new-files.node.test.ts
  test/commands/upgrade-preserves-gate-commands.node.test.ts test/commands/upgrade.node.test.ts
  test/commands/doctor.node.test.ts` → **151/151 pass**.
- `npm run typecheck` → clean.
- Full `npm test`, **plain** (not wrapped, per dispatch instruction 3): **2698 tests, 2695
  pass, 0 fail, 3 skipped** — matches the expected post-merge baseline exactly.
- Per rule 14, reverted `.cleargate/delivery/**` and `cleargate-planning/MANIFEST.json` in the
  outer MAIN checkout after confirming (`git status --porcelain`) nothing else under those
  paths was dirtied. The regenerated `MANIFEST.json` snapshot in outer main is DevOps' own
  boundary-BD responsibility (after this fix lands there via merge), not authored here.
- Did not run `npm run build`.

Commit: cli `story/BUG-089-r1` @ `c400d07` — "fix(BUG-089): pin-aware manifest rule for
pending-task-sentinel.sh".

BUG: BUG-089
STATUS: done
COMMIT: cli c400d07 (rework 1, on top of 9493236 / merge 19a8a0f), outer ae3e9120 (see rework 1 follow-up commit on story/BUG-089 for report + §4 amendment)
TYPECHECK: pass
TESTS: hook-signal unit+integration 17 passed 0 failed; test_pre_edit_gate.sh 11 passed 0 failed; test_flashcard_enforcement.sh 12 passed 0 failed; bug068_dispatch_tool_name.red.sh 10 passed 0 failed; pin-placeholder-coverage 4 passed 0 failed; manifest/init/upgrade/doctor suite 151 passed 0 failed; full cli suite post-rework-1 (plain, mandated) 2695 passed 0 failed 3 skipped — matches expected baseline exactly
FILES_CHANGED: cleargate-cli/src/hooks/hook-signal.ts (new), cleargate-cli/src/commands/hook.ts (new), cleargate-cli/src/cli.ts, cleargate-cli/src/commands/init.ts, cleargate-cli/test/commands/init.node.test.ts, cleargate-cli/test/snapshots/hooks/pre-edit-gate.bug-089.sh (new), cleargate-cli/scripts/build-manifest.ts (rework 1), cleargate-planning/.claude/hooks/pre-edit-gate.sh, cleargate-planning/.claude/hooks/pending-task-sentinel.sh, cleargate-planning/.claude/settings.json, .cleargate/knowledge/cleargate-enforcement.md, cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md, .cleargate/delivery/pending-sync/BUG-089_pretooluse_gates_exit_1_fail_open.md (Task Breakdown + §4 self-amendment x2), .cleargate/sprint-runs/SPRINT-41/reports/BUG-089-dev.md (this file, rework 1 section)
NOTES: One unilateral deviation from the Architect's plan in the original pass: the plan's "BUG-089 prerequisite" section didn't mention `src/commands/init.ts`'s `HOOK_ADDITION` constant, but leaving it stale would have silently double-registered `pre-edit-gate.sh` on every fresh `cleargate init` — fixed in the same commit and flagged below as not orchestrator-confirmed. The BUG-038→BUG-089 snapshot succession was pre-authorized by the item text itself, so that one is orchestrator_confirmed: true. Rework 1's `build-manifest.ts` fix was explicitly dispatched by the coordinator (post-merge DevOps blocker), so it is orchestrator_confirmed: true. BUG-085's live-session coordination (Task Breakdown row 6) is explicitly out of scope for this dispatch (M0-B, a separate item) and left unchecked with a one-sentence reason in the item's own Task Breakdown section, per the box-ticking contract.
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }
  - { r_id: "R2", covered: true, deferred: false, clarified: false }
  - { r_id: "R3", covered: true, deferred: false, clarified: false }
  - { r_id: "R4", covered: true, deferred: false, clarified: false }
  - { r_id: "R5", covered: false, deferred: true, clarified: false }
  - { r_id: "R6", covered: true, deferred: false, clarified: false }
  - { r_id: "R7", covered: true, deferred: false, clarified: false }
plan_deviations:
  - { what: "Updated src/commands/init.ts's HOOK_ADDITION (+ its CR-059 scenario 5 test fixture) to carry --host claude, matching the canonical settings.json string", why: "mergeSettings dedups PreToolUse hooks by exact command string; a stale HOOK_ADDITION literal would double-register pre-edit-gate.sh on every fresh cleargate init", orchestrator_confirmed: false }
  - { what: "Added test/snapshots/hooks/pre-edit-gate.bug-089.sh and repointed the one BUG-038 byte-comparison test in test/commands/init.node.test.ts to it, keeping the bug-038 lock + its existence-only test as historical baseline", why: "pre-authorized verbatim by the BUG-089 item's own dispatch text (skill §9 self-amend clause) for exactly this frozen-snapshot scenario", orchestrator_confirmed: true }
  - { what: "Added a pin-aware TIER_RULES entry for pending-task-sentinel.sh in cleargate-cli/scripts/build-manifest.ts (rework 1)", why: "explicitly dispatched by the coordinator to fix DevOps' post-merge full-suite blocker (test/docs/pin-placeholder-coverage.node.test.ts)", orchestrator_confirmed: true }
adjacent_files:
  - "cleargate-cli/src/lib/settings-json-surgery.ts"
  - "cleargate-cli/src/commands/doctor.ts"
  - ".claude/hooks/pre-edit-gate.sh"
  - ".claude/hooks/pending-task-sentinel.sh"
  - ".cleargate/delivery/pending-sync/STORY-058-10_codex_payload_surfaces.md"
  - "cleargate-planning/MANIFEST.json"
flashcards_flagged:
  - "2026-09-25 · #cli #settings-json #danger · mergeSettings dedups PreToolUse hooks by EXACT command string; a HOOK_ADDITION literal in src/commands/init.ts must byte-match the canonical settings.json string or a fresh install double-registers the hook."
  - "2026-09-25 · #cli #manifest #pin-aware · A new __CLEARGATE_VERSION__ literal in any canonical hook needs its OWN pin-aware TIER_RULES entry in scripts/build-manifest.ts — copying an existing resolver block (as pending-task-sentinel.sh did from pre-edit-gate.sh) copies the placeholder but not its manifest registration; test/docs/pin-placeholder-coverage.node.test.ts only catches this post-merge, reading the outer MAIN checkout."

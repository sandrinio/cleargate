---
role: architect
mode: TPV
story_id: STORY-066-02
sprint_id: SPRINT-28
qa_red_commit: 2c1620c3
verdict: APPROVED
emitted_at: 2026-05-18
---

# TPV Report — STORY-066-02 (Sprint Close Step 2.6c + `--parents` CLI Wiring)

## Scope

Wiring-only verification of the QA-Red commit `2c1620c3` against two test files plus the three-verdict fixture tree.

Test files audited:
- `cleargate-cli/test/scripts/close-sprint-step-2-6c.red.node.test.ts` (5 scenarios, 8 `it()` blocks)
- `cleargate-cli/test/commands/sprint-reconcile-lifecycle-parents.red.node.test.ts` (3 scenarios, 6 `it()` blocks — Scenario 2 has 4 sub-asserts)

Fixture tree audited:
- `cleargate-cli/test/fixtures/close-sprint-step-2-6c/auto-flip/{archive/STORY-FXTRA-0[1-3].md, pending-sync/EPIC-FXTRA.md}`
- `cleargate-cli/test/fixtures/close-sprint-step-2-6c/halt-partial/{archive/STORY-FXTRB-0[1-2].md, pending-sync/{EPIC-FXTRB.md, STORY-FXTRB-03.md}}`
- `cleargate-cli/test/fixtures/close-sprint-step-2-6c/halt-zero-children/pending-sync/EPIC-FXTRC.md`

## Five-Check Result

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Imports resolve to real modules | PASS | Stdlib only — `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:os`, `node:child_process`, `node:url`. No relative imports. `CLOSE_SPRINT_SCRIPT` and `CLI_BIN` paths resolved relative to repo root; both files confirmed present on main (`.cleargate/scripts/close_sprint.mjs` 39.6K + mirror clean; `cleargate-cli/dist/cli.js` 393K). |
| 2 | Constructor / signature calls match | PASS | `spawnSync(process.execPath, [script, sprintId, '--assume-ack'], {…})` matches Node 24 `child_process.spawnSync(file, args, opts)` signature. Both invocation shapes correct — `close_sprint.mjs <sprintId> --assume-ack` matches the script's existing CLI surface (verified at `cleargate-cli/src/cli.ts:284` which invokes the same form). `[CLI_BIN, 'sprint', 'reconcile-lifecycle', sprintId, '--parents']` matches the Commander subcommand `reconcile-lifecycle <sprint-id>` at `cli.ts:352`; `--parents` is the option under test. |
| 3 | No `t.mock.method()` usage | PASS | Neither file uses mocks. Real child-process invocation throughout — matches CLEARGATE preference for real-infra testing. |
| 4 | Before/after hooks paired | PASS | close-sprint test: 4 scenarios with `before()` (assertScriptExists + buildCloseSprintFixture writing tmpdir) all paired with `after()` (`fs.rmSync(repoRoot, { recursive: true, force: true })`). Scenario 5 (mirror parity) has no state setup → no after-hook needed. parents-flag test: 3 scenarios with `before()` (assertCliBinExists + buildCombinedFixture writing tmpdir) all paired with `after()` (same rmSync). Tmpdir prefixes namespaced (`cg-2-6c-`, `cg-parents-flag-`) — no cross-test collision. |
| 5 | File naming `*.red.node.test.ts` | PASS | Both files end in `.red.node.test.ts`. CR-043 immutability marker present in header comments ("sealed post-Red"). |

## Cancellation Semantics — Specifically Audited

QA-Red reported `6 cancelled` for the CLI tests because `cleargate-cli/dist/cli.js` was not in the QA worktree at QA-Red commit time. The concern: does cancellation get reported as PASS?

**Verified safe.** `assertCliBinExists()` lives inside each `describe`'s `before()` hook (lines 167, 198, 263 of the file). In `node:test`, when an assertion inside `before()` throws (`AssertionError` from `assert.ok(false, …)`), the `node:test` runner:
1. Records the suite-level hook failure (`'before' hook failed`).
2. Marks every `it()` in that suite as `cancelled`, not `passed`.
3. Surfaces cancellations in the TAP/spec output as distinct from `ok` lines (the spec reporter prints `~` glyphs for cancelled; TAP emits `# cancelled` directives).

This is exactly the inverse of the BUG-024 false-pass pattern (where `it.skip()` or vacuous assertions read as ok). The `assert.ok(false, …)` in the guard produces an `AssertionError` → `before` hook fail → all 6 child `it()`s cancel. No PASS leaks. After Dev rebuilds dist/ (which already exists on main and will be inherited into the story branch via merge or build step), `assertCliBinExists()` succeeds, `before()` completes, and the 6 cancelled tests become 6 failures (they still fail because `--parents` is not yet wired in `cli.ts` — verified at `commands/sprint.ts:314` reconcileLifecycleCliHandler signature has no `parents` field).

The dist/ cancellation pattern is therefore wiring-acceptable: cancellation ≠ false-pass, Dev's `npm run build` (or existing dist on the integration branch) transitions cancel → fail → green via implementation.

## Cross-Reference Verification (informational, beyond the 5 checks)

- **close_sprint.mjs Step 2.6c absence confirmed.** Grep on main: `grep -n "Step 2.6c\|walkActiveParents" .cleargate/scripts/close_sprint.mjs` → 0 matches. Step 2.6c block has not been inserted → Scenarios 1–4 will FAIL at baseline as intended.
- **Mirror parity baseline confirmed.** `diff .cleargate/scripts/close_sprint.mjs cleargate-planning/.cleargate/scripts/close_sprint.mjs` → clean. Scenario 5 PASSES at baseline (regression guard pattern, documented in test header).
- **`walkActiveParents` shipped in STORY-066-01.** `cleargate-cli/src/lib/parent-rollup.ts:392` exports the function. Dev will import this in `close_sprint.mjs` Step 2.6c and in `reconcileLifecycleCliHandler` for `--parents`.
- **Environment isolation.** Both tests delete `NODE_TEST_CONTEXT` from child env before spawnSync — prevents the nested-tsx-skip pattern logged in FLASHCARD `#node-test #child-process`. Both tests set `CLEARGATE_REPO_ROOT` to tmpdir → fixture isolation from the host repo.
- **close_sprint test skip flags.** `CLEARGATE_SKIP_LIFECYCLE_CHECK=1`, `CLEARGATE_SKIP_WORKTREE_CHECK=1`, `CLEARGATE_SKIP_BUNDLE_CHECK=1` set in child env to isolate Step 2.6c from neighboring close steps. Sound test-isolation pattern.

## Verdict

`TPV: APPROVED`

Dev may proceed to GREEN phase. Pre-conditions for Dev:
1. Ensure `cleargate-cli/dist/cli.js` exists in the worktree (run `npm run build` in cleargate-cli/ before re-running the test suite).
2. Insert Step 2.6c block into BOTH `.cleargate/scripts/close_sprint.mjs` AND `cleargate-planning/.cleargate/scripts/close_sprint.mjs` in the same commit (mirror parity, Scenario 5).
3. Wire `--parents` option onto `reconcile-lifecycle` Commander subcommand at `cleargate-cli/src/cli.ts:352` and implement the audit-table emission in `reconcileLifecycleCliHandler` at `cleargate-cli/src/commands/sprint.ts:314`.

role: qa

# BUG-101 QA-Red Report — Codex dispatch attribution (SPRINT-41 M7)

**Mode:** RED. **Commit:** `story/BUG-101` @ `59da7707868d4c1ea834c0998265212ebf7c41cd` (cli worktree `.worktrees/BUG-101/cleargate-cli`, base `main` `f0c33f7`).

QA-RED: WRITTEN
RED_TESTS:
  - test/hooks/codex-dispatch-attribution.red.node.test.ts (new)
BASELINE_FAIL: 5 (of 6 tests in the new file; T6 is a declared already-green anchor)

## Per-file table

| File | Tests | Red | Green | Why red |
|---|---|---|---|---|
| `test/hooks/codex-dispatch-attribution.red.node.test.ts` (new) | 6 | T1, T2, T3, T4, T5 | T6 | **T1** (task_name): baseline's codex branch never reads `tool_input.task_name`; PROMPT = the ciphertext `message`, which matches no work-item regex, so `work_item_id` comes back `''` ≠ `STORY-001-01`. **T2** (marker): baseline has no `.dispatch-*.json` claim logic at all; same ciphertext-message fallback yields `''` ≠ `STORY-001-01`. **T3** (stale/wrong-type marker falls through to message): the *resolved id* is already correct at baseline (the codex branch already reads a plaintext `message`) — it fails solely on the **new** `source=` log field, which does not exist yet (`sourceField(line) === null`, expected `'message'`). Deliberately designed so a marker-precedence bug (wrongly claiming the stale/mistyped marker) would ALSO fail on the id itself: the marker's `work_item_id` (`STORY-999-99`) is set to a different value than the message's (`STORY-001-01`). **T4** (plaintext message, scripted path): same shape as T3 — id already correct at baseline (regression-anchor half), red only on the missing `source=` field. **T5** (no source at all): `work_item_id: ''` is already correct at baseline; red only on the missing `source=none` field. **T6** [ALREADY-GREEN ANCHOR]: the Claude path (`--host claude`) is untouched by this bug and must stay untouched — proves the prompt-derived id wins, a fresh matching marker is never consulted/consumed, and the Claude printf carries no `source=` token. Passes today (by design, Test-40 pattern) and is the regression lock for errata E1's reworded Gherkin 4 ("the Claude path is unchanged"). |
| `test/scripts/codex-sprint-execution-render.red.node.test.ts` (edited) | 3 (unchanged) | Test 31 | Test 32, Test 33 | Re-pinned the `R4`/`R5` JS constants to the M7 §3 blueprint text (OD-M7-3 fold: QA-Red is sole owner of these adjacent lines and Test 31's pins). `R4`: "Per-story gate" → "Per-dispatch gate" + reworded body. `R5`: the spawn row's cell now names `task_name`; the `write_dispatch.sh` row's cell is reworded to state the encrypted-message limitation (no more `Agent\|.*spawn_agent` mention in that cell — that phrase stays only in R4's first sentence, unescaped, since R4 is prose not a table). `mod.CODEX_SKILL_REPLACEMENTS` still holds the OLD `build-codex-payload.mjs` text (untouched — Developer's job), so `assert.deepEqual({...}, {R1..R6})` fails exactly on R4/R5 (`deepStrictEqual` diff shown in the run below). Test 31's own count is unchanged (still 1 test); Tests 32/33 (anchor mechanics, `--check`) are unaffected and stay green. |
| `test/helpers/init-fixture.ts` (edited) | n/a (shared fixture module, no test of its own) | — | — | Added `BUG101_SENTINEL_PRE = '162a1b1739e9239bdae818b1c1a3dac0ccc6c104057d1ec3b109238be34058ab'` (pin-substituted sha256 of the CURRENT, pre-fix `.claude/hooks/pending-task-sentinel.sh`, measured at this seal on cli main `f0c33f7`) to `bug085SentinelCurrentHash()`'s refusal chain (M3-A54 convention, 4th entry after BUG-085/STORY-058-10/STORY-058-11's own refused hashes). Dormant in a bare `npm run test:file` run — `captureOrCompare()` no-ops unless a real M2 baseline dir is passed in (`/private/tmp/cg-s41-m2-init-baseline`, boundary-step-only) — but this is the mechanism that turns the M2-pair regression witness red at this seal and green again only once the Developer's fix changes the sentinel's bytes (`assert.strictEqual(recordEntry.sha256, delta.currentHash(id), ...)` at `init-fixture.ts:1131-1136`). Confirmed the one existing consumer test that references this file's real `SANCTIONED_BASELINE_DELTAS` machinery with a concrete `rel` (`test/commands/init-host-snapshot.red.node.test.ts` Scenario 15) uses `REL = '.cleargate/.install-manifest.json'` (the STORY-058-06 row), not the sentinel row — confirmed unaffected, not run (out of this bug's regression-witness scope). |

## Anchor / regression-witness runs (all solo, all green)

| Suite | Result |
|---|---|
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 91 tests, 91 pass, 0 fail |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 18 tests, 18 pass, 0 fail (incl. Test 38 codex sentinel, Test 40 already-green Claude anchor) |
| `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | 13 tests, 13 pass, 0 fail |
| `test/scripts/flashcard-gate-parity.red.node.test.ts` | 14 tests, 14 pass, 0 fail |
| `test/hooks/hooks-claude-parity.red.integration.node.test.ts` | 19 tests, 19 pass, 0 fail (run via `tsx --test` directly — `test:file` is a raw passthrough, no tier-exclusion glob, so the `.integration.` suffix runs solo the same way) |
| `npm run typecheck` | clean, after every edit |

None of these five suites touch `pending-task-sentinel.sh`'s bytes or `test/helpers/init-fixture.ts`'s STORY-058-06 row, so all five are expected-green both before and after this commit — confirmed by running each one solo post-commit.

## D4 delta (default tier)

Plan projection (plans/M7.md §2.3): BUG-101 is +6 over the STORY-058-13 merge baseline (3653/3651 → 3659/3657). This QA-Red commit's own file-level delta: `test/hooks/codex-dispatch-attribution.red.node.test.ts` is a new file with exactly 6 tests (matches the pinned count); `test/scripts/codex-sprint-execution-render.red.node.test.ts`'s own count is unchanged at 3 (re-pin only, no new test); `test/helpers/init-fixture.ts` adds no test of its own. Net default-tier delta from this commit: **+6 tests**, matching the plan's D4 row for BUG-101 exactly.

## Plan-vs-code discrepancies found

1. **Internal plan self-consistency note (not a code/plan mismatch):** plans/M7.md §3 BUG-101's "Source order" row states that when `task_name` yields an id, the hook should "also consume one fresh marker with the same work_item_id and agent_type, if present (so no orphan pile-up)" — but the pinned "Tests" row (T1-T6) has no dedicated scenario for this specific sub-behavior (T1 uses no marker at all). Per the Task Breakdown row's explicit count "(6)" and the QA-Red contract's file-naming/count discipline, I did not add a 7th test to cover it, to avoid an unrequested scope change to the pinned red-test count. Flagging this so the Developer implements the orphan-consumption behavior in good faith from the prose, and so the Architect can decide whether a follow-up test belongs in QA-Verify's adversarial-probe pass (lane: standard) or a later CR.
2. Line-citation spot-check: M7.md §1 errata E3 cites `pending-task-sentinel.sh` extraction at `:321-331`; independently re-measured on cli main `f0c33f7` and confirmed exact (`321` = `if [[ "${HOST}" == "codex" ]]`, `331` = the `WORK_ITEM_ID=` line). No drift found.

## Notes on scope discipline

- No implementation file was read-then-edited: `pending-task-sentinel.sh` and `scripts/build-codex-payload.mjs` were Read only (to ground wiring/fixture shapes and confirm baseline behavior — both files are cited with exact line numbers in the binding plan itself). Neither was modified. `npm run gen:codex` was not run (nothing to regenerate; the Claude canonical's bytes are unchanged by this commit).
- No script was invoked outside the wrapper for anything that writes sprint-run state; the only scripts run were `npm run typecheck` and `npm run test:file -- <path>` (plus one direct `tsx --test` invocation for the integration-tier witness, equivalent to what `test:file` would do), all read-only against the cli worktree and its own scratch tmp dirs — no `.cleargate/sprint-runs/**` writes.
- Scratch dirs (`fs.mkdtempSync` under the OS tmp dir) are cleaned up per-test (`finally` blocks) and via the file's own `after()` hook; nothing left under `/private/tmp/cg-s41-qared101-*` (no such prefix was needed — all fixtures used Node's own `os.tmpdir()` mkdtemp, consistent with the sibling files in `test/hooks/`).

flashcards_flagged:
  - "2026-09-27 · #qa-red #test-harness #npm-scripts · npm run test:file is tier-agnostic — it also runs *.integration.node.test.ts solo (only `npm test`'s glob excludes it)."
  - "2026-09-27 · #qa-red #test-harness · A scenario whose id-resolution is already correct at baseline can still be a real red via a new log/observability field alone — pin the field, not just the id."

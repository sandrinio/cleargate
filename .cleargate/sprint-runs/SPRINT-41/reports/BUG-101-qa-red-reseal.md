role: qa

# BUG-101 QA-Red RE-SEAL report (SPRINT-41 M7)

```
QA-RED: WRITTEN
RESEAL_APPLIED: 672579375a464bd11e01581ec040fdc151ca0663afebd9cbac93cb119f589fe5
CLI_COMMIT: d07d4a06430a9afefce1902f0c010e09ce10aebc
BASELINE_FAIL: 5 (+ Test 31 in the render file)
TESTS_IN_FILE: 6
flashcards_flagged: []
```

## 3-point gate (before apply)

1. `git -C <cw> rev-parse HEAD` = `59da7707868d4c1ea834c0998265212ebf7c41cd`; `git -C <cw> status --short` empty (clean).
2. `shasum -a 256` of `reports/BUG-101-tpv-reseal.patch` = `a185dfc58e6726d3b94b4b7c5f6d3e5fad8c44ea550eeba84759471014c6b09b` — matches the TPV's declared value exactly (flashcard note: TPV-reported reseal hashes have been wrong before — recomputed independently, confirmed).
3. `git -C <cw> apply --check <patch>` clean; applied; `git -C <cw> status --short` lists exactly one file: `test/hooks/codex-dispatch-attribution.red.node.test.ts`.

## Typecheck

`npm run typecheck` in `<cw>` — exit 0, clean.

## Solo test:file runs

**`test/hooks/codex-dispatch-attribution.red.node.test.ts`** — 6 tests, 1 pass / 5 fail:

| Test | Result | Failure reason |
|---|---|---|
| T1 (task_name + ciphertext, sub-cases B/C) | RED | `AssertionError`: `'' !== 'STORY-001-01'` — the id must come from `task_name`; baseline has no task_name extraction, assertion fails on the pre-existing first check (sub-cases B/C never reached — same test body, throws on first assert) |
| T2 (marker consumed, sub-case B) | RED | `AssertionError`: `'' !== 'STORY-001-01'` — the id must come from the marker; baseline has no marker source |
| T3 (stale/wrong-agent_type marker falls through) | RED | `AssertionError`: `null !== 'message'` — baseline writes no `source=` field on the codex printf at all |
| T4 (plaintext message attributes) | RED | `AssertionError`: `null !== 'message'` — same missing `source=` field |
| T5 (no source at all, sub-case B) | RED | `AssertionError`: `null !== 'none'` — same missing `source=` field |
| T6 [ALREADY-GREEN ANCHOR] (Claude path unchanged) | GREEN | passes at baseline as designed |

Every red fails on an `AssertionError` against the hook's actual output (an empty id or a missing `source=` field) — never on fixture setup, `mkRoom`, spawn failure, or a thrown exception outside the assertion. This matches the TPV's reproduced counts exactly (1/6 sealed → 1/6 re-sealed at this commit).

**`test/scripts/codex-sprint-execution-render.red.node.test.ts`** — unchanged, 3 tests, 2 pass / 1 fail (Test 31 red on `CODEX_SKILL_REPLACEMENTS.R4`/`R5` still holding the old "Per-dispatch gate" / no-`task_name` text; Tests 32–33 green). File was not touched by the patch (byte-for-byte confirmed via `git status --short` in step 2 listing only the one attribution file).

## Regression witnesses (all solo via `test:file`, all green, matching TPV counts)

| Witness | Result |
|---|---|
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 91/91 |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 18/18 |
| `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | 13/13 |
| `test/scripts/flashcard-gate-parity.red.node.test.ts` | 14/14 |
| `test/hooks/hooks-claude-parity.red.integration.node.test.ts` | 19/19 |

## Commit

`story/BUG-101` @ `d07d4a06430a9afefce1902f0c010e09ce10aebc`, test-only (1 file, +105/-7), no `--no-verify`. `cleargate-cli` carries no pre-commit hook (Cross-Cutting Rule 12) so none fired; typecheck and the affected tests above were run manually before the commit per that rule.

## Scope discipline

- No implementation file read or touched (`pending-task-sentinel.sh`, `build-codex-payload.mjs` untouched, not opened beyond what the patch/report context already showed).
- No credentials, `~/.codex`, or `CODEX_HOME` touched.
- Nothing outside `<cw>` written except this report (uncommitted, per instructions).
- Patch content applied byte-identical; not edited.

## Script Incidents

None. No script was invoked via `run_script.sh` for this dispatch (only `git`, `npm run typecheck`, `npm run test:file`, `shasum` — none of which route through the wrapper per the task's own step list).

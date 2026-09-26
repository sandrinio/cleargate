role: qa

# BUG-099 — QA-Verify (fast lane)

STORY: BUG-099
TYPECHECK: pass
TESTS: 176 passed, 0 failed, 0 skipped (4 targeted files, each run solo)
WITNESS: real-data witness confirms the fix — see §3 below
VERDICT: PASS — ship it. Diff scope is exactly the two declared files, the sealed test is byte-identical to QA-Red's 3051626, all four targeted files are green, typecheck is clean, and a live invocation against the real sprint evidence file proves the writer now emits the STORY-058-09 shape with a real diagnostic reason instead of `status=unknown exit_code=unknown`.

## 1. Diff scope

`git -C <cw> diff e720592 abd9afb --stat`:
```
 scripts/clean-room/codex-hooks.mjs                 |  17 +-
 .../codex-hooks-write-result.red.node.test.ts      | 249 +++++++++++++++++++++
 2 files changed, 264 insertions(+), 2 deletions(-)
```
Exactly the new test file plus `codex-hooks.mjs` — matches BUG-099 §4's sandbox exactly.

Inside `codex-hooks.mjs`, the diff touches only:
- the usage header (adds `[--story STORY-058-10]` to the `check` line), and
- the `check` subcommand's `--write-result` block (:868-885), which now writes `{ story, command, ran_at, exit_code, status, reason }` — the STORY-058-09 shape (`claude-baseline.mjs:766-776`), with `story` defaulting to `'STORY-058-10'` and overridable by the new `--story` option (read by the existing generic `parseArgs`, unchanged).

Nothing else in the file changed. `close_sprint.mjs`, `claude-baseline.mjs` and `evidence.mjs` are untouched (confirmed — not present in the diff-stat).

The sealed test `test/scripts/codex-hooks-write-result.red.node.test.ts` is byte-identical between QA-Red's 3051626 and Developer's abd9afb (`git diff 3051626 abd9afb -- <file>` → empty).

Both worktrees (`.worktrees/BUG-099` and `.worktrees/BUG-099/cleargate-cli`) show a clean `git status --porcelain` after all runs.

## 2. Tests, each solo (`command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

| File | tests | pass | fail | skipped |
|---|---|---|---|---|
| `test/scripts/codex-hooks-write-result.red.node.test.ts` | 4 | 4 | 0 | 0 |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 90 | 90 | 0 | 0 |
| `test/scripts/clean-room-evidence.red.node.test.ts` | 60 | 60 | 0 | 0 |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 18 | 18 | 0 | 0 |
| `npm run typecheck` | — | exit 0 | — | — |

90/90 on `codex-hooks-harness.red` confirms main's real count — the item's Task Breakdown text ("91/91") is the same stale-count typo QA-Red already flagged; no regression, no test added/removed in that file by this change.

Total: 4 + 90 + 60 + 18 = **176 passed, 0 failed, 0 skipped**, plus a clean typecheck.

## 3. Real-data witness

Ran (read-only) from `<cw>`:
```
node scripts/clean-room/codex-hooks.mjs check \
  --evidence .cleargate/sprint-runs/SPRINT-41/codex-hooks-evidence.md \
  --write-result /private/tmp/cg-s41-qa099/STORY-058-10.json
```
`EXIT_CODE=1`. Written file:
```json
{
  "story": "STORY-058-10",
  "command": "node scripts/clean-room/codex-hooks.mjs check --evidence <path> --ref main",
  "ran_at": "2026-09-26T21:03:00.140Z",
  "exit_code": 1,
  "status": "red",
  "reason": "stale: last scripted run's artifact_inputs (802ee5c9...) does not match the current ref's (a51001a1...)"
}
```
The real reason is **staleness**, not "missing live run" as the dispatch's prose guessed — `checkCodexEvidence` (`evidence.mjs:1178-1206`) checks the last-scripted-run's `artifact_inputs` against the current ref *before* it checks for a live PASS, and the sprint evidence file's only run (RS-4, provider `scripted`) was captured against cli SHA `0399beb`, several commits behind the worktree's current tree. This is expected, real, pre-existing evidence staleness (STORY-058-10/RS-4L's concern), not a BUG-099 regression — BUG-099's scope is the writer's shape, not `checkCodexEvidence`'s logic, and it explicitly forbids editing `evidence.mjs`.

**Step 2.9 predicate, evaluated verbatim** (`resultJson.status !== 'green' || resultJson.exit_code !== 0`) against this file: **fails** (status is `red`, not `green`) — same close-blocking outcome as before, because the real evidence isn't fully green yet. But the *reason string* it would now report is `status=red exit_code=1` — the true state — not `status=unknown exit_code=unknown`.

**Before-state comparison.** Ran the identical command against the pre-fix script in the cli main checkout (`e720592`, read-only, no build):
```json
{
  "ok": false,
  "reason": "stale: last scripted run's artifact_inputs (802ee5c9...) does not match the current ref's (a51001a1...)",
  "artifactInputs": "a51001a1...",
  "checkedAt": "2026-09-26T21:03:34.454Z"
}
```
No `status`, no `exit_code` — `resultJson.status ?? 'unknown'` and `resultJson.exit_code ?? 'unknown'` both resolve to `'unknown'`, reproducing BUG-099 §1's exact symptom. Evaluated the same predicate literally against both files with a one-line script:
```
BEFORE (cli main e720592, pre-fix) -> Step 2.9 predicate fails: true | reason: status=unknown exit_code=unknown
AFTER  (story/BUG-099 abd9afb, post-fix) -> Step 2.9 predicate fails: true | reason: status=red exit_code=1
```
This isolates the fix precisely: both fail today (because the real evidence is stale, an orthogonal and pre-existing condition), but only the post-fix file gives Step 2.9 a diagnosable reason instead of `unknown`/`unknown`. Scenario 1's own test (in the sealed red file) independently proves the green path: it builds a synthetic evidence file whose `artifact_inputs` matches a scratch git repo's current ref, gets `status: 'green', exit_code: 0`, and asserts Step 2.9's predicate (copied verbatim) accepts it.

`/private/tmp/cg-s41-qa099` deleted by exact path after recording contents. No write under `.cleargate/sprint-runs/SPRINT-41/deferred-verify/`.

## 4. Gherkin map

| # | Scenario | Test | Evidence |
|---|---|---|---|
| 1 | Passing check writes a green result close accepts | `describe('BUG-099 Scenario 1 …')` | Synthetic matched-artifact-inputs evidence → `status:'green', exit_code:0`, Step 2.9 predicate (copied verbatim) accepts it |
| 2 | Failing check writes a red result close rejects | `describe('BUG-099 Scenario 2 …')` | `status:'red', exit_code:1`, non-empty `reason`, command itself exits 1 |
| 3 | Missing evidence file is a FAIL | `describe('BUG-099 Scenario 3 …')` | `status:'red', exit_code:1` |
| 4 | `--story` overrides the story id | `describe('BUG-099 Scenario 4 …')` | `resultJson.story === 'STORY-058-13'` |

ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios have matching, now-passing tests (0/4 at QA-Red baseline 3051626 → 4/4 at abd9afb — red-now-green, CR-081).
MISSING: none.
REGRESSIONS: none — all three anchor files (`codex-hooks-harness.red`, `clean-room-evidence.red`, `codex-hook-scripts.red`) unchanged and green; typecheck clean.

**Task Breakdown (advisory).** All three `- [ ]` rows in BUG-099's own Task Breakdown are unchecked in the file, but each is satisfied by evidence: row 1 (QA-Red) by 3051626, row 2 (the -09 shape + `--story`) by abd9afb's diff (§1 above), row 3 (typecheck + targeted tests, `codex-hooks-harness.red` green) by §2 above. Both QA-Red and the Developer report noted the rows are intentionally left unticked in the item file per dispatch — advisory only, not a bounce reason.

**Out of scope, noted not bounced.** STORY-058-10's own Task Breakdown row ("codex-hooks-evidence.md gates sprint close through this story's deferred_verification … at least one live PASS") is *not* satisfied by this fix and is not meant to be — BUG-099 only fixes the writer's shape. The real evidence file still needs a fresh scripted run against the current artifact and a live PASS run before STORY-058-10's own deferred verification will actually go green at close; that is STORY-058-13/RS-4L's job, not BUG-099's.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked — every command was a direct `git`/`npm`/`node` invocation for verification, consistent with the QA-Red and Developer reports' convention (`run_script.sh` wraps sprint-automation scripts, not ad hoc test/build/witness commands).

```yaml
flashcards_flagged:
  - "2026-09-27 · #qa #clean-room · checkCodexEvidence checks scripted artifact_inputs staleness before the live-run check — a stale scripted run masks a missing-live-run reason."
```

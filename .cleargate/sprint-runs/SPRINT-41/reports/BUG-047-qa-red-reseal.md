role: qa

# BUG-047 QA-Red RE-SEAL report

```
QA-RED: WRITTEN
RESEAL_APPLIED: fbd599f3fcce046544a27673f4f32e308e6c34c1e1301cca0fdc9f402a83507e
CLI_COMMIT: 9a44e4b
BASELINE_FAIL: 3
TESTS_IN_FILE: 5
flashcards_flagged: []
```

## Steps

1. Verified `<cw>` HEAD = `cbb72481d1a3150bfbdab5c043bf9f5dd3166abb`, tree clean, branch `story/BUG-047`. Recomputed patch sha256 myself: `fda59c755350f752d9dbabf62a71ffc5503584eed2d3ee3e10ea71987216852e` — matches the dispatch and the TPV report.
2. `git apply --check` clean, then `git apply`. `git status --short` shows only `test/lib/gate-cache-staleness.red.node.test.ts` modified. Post-apply file sha256: `fbd599f3fcce046544a27673f4f32e308e6c34c1e1301cca0fdc9f402a83507e`.
3. `npm run typecheck` — clean (no output beyond the tsc invocation).
4. Solo `npm run test:file -- test/lib/gate-cache-staleness.red.node.test.ts`: 5 tests, 2 pass / 3 fail.
   - T1 "a same-verdict re-check ends with last_gate_check >= updated_at" — **FAIL**: `AssertionError: BUG-047: expected last_gate_check (2026-01-01T01:00:00Z) >= updated_at (2026-01-01T02:00:00Z)`. Matches TPV's stated reason exactly.
   - T2 "exit code 0 — the item is no longer reported (stale)" — **FAIL**: `1 !== 0`, stderr shows `EPIC-047-02 (stale)` in the punch list. Matches TPV.
   - T3 "a second, unedited gate check on an already-fresh item changes nothing" — **PASS**.
   - T4 "introducing a TBD flips pass:true -> pass:false and advances last_gate_check" — **PASS**.
   - T5 "a stale item keeps its Step-0 stamp advance; an already-fresh item is still restored" — **FAIL**: `AssertionError [ERR_ASSERTION] ... notStrictEqual` — actual equals expected (Step-0 restore guard reverted a stale item's stamp advance instead of keeping it). Matches TPV.
   - No red failed on fixture setup/throw before reaching its target assertion; all three fail exactly at the assertion the TPV names.
5. Regression witnesses unchanged:
   - `test/commands/sprint-preflight.node.test.ts` — 27/27 pass.
   - `test/lib/frontmatter-cache.node.test.ts` — 11/11 pass.
6. Committed test-only on `story/BUG-047`: `9a44e4b` — `qa-red(BUG-047): TPV re-seal — equal-timestamp, failing-verdict, stale-flip and sprint-plan stale sub-cases; 5 tests (3 red), 22/22 mutants per TPV`. 1 file changed, 169 insertions(+), 19 deletions(-). No `--no-verify` used; pre-commit hooks ran clean.

## Script Incidents

None. No `run_script.sh` invocation was needed — all steps were `git`, `npm run typecheck`, and `npm run test:file`, run directly per the QA agent's normal test-runner allowance (not a sprint script under `.cleargate/scripts/`).

## Scope discipline

- Touched nothing outside `<cw>` except this report.
- No scratch files written (no intermediate script needed for this task).
- Did not read the patch's cited implementation files (`frontmatter-cache.ts`, `sprint.ts`) — only the TPV report's prose and the patch diff text itself, per the "no implementation Read access" / re-seal-is-test-only constraint.
- Did not edit the patch content; it applied cleanly on the first try.

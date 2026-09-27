role: qa

# BUG-103 QA-Red re-seal report (SPRINT-41 M7)

```
QA-RED: WRITTEN
RESEAL_APPLIED:
  test/scaffold/sprint-execution-skill-drift.red.node.test.ts sha256=ab44f9a9ded92d81c00fec7b87619e722a6a0bfc510c85c9cdf7c57dc0d6972e
  test/scaffold/skill-md-serial-pointers.red.node.test.ts sha256=61cd074b080dd8c48ad59de7f95687d71c5cb832b045ddb97808be27266cabac
CLI_COMMIT: 8729313b293b5d247a6bb09733d466be40e1f19f
BASELINE_FAIL: 19
TESTS_IN_FILE: 22
flashcards_flagged: []
```

## Steps performed

1. `git -C <cw> rev-parse HEAD` = `833b6a4f220ca0765038e3f992c73b97c4f239fb`, `git status --porcelain` empty (clean).
2. `git apply --check` on `BUG-103-tpv-reseal.patch` (sha256 of the patch file itself = `0da981c577776974121c3e40fb8a82d21d9a905a4467c061e88998fa0e0cc555`, matches `RESEAL_SHA256` verbatim) exited 0. Applied cleanly. `git status --porcelain` after apply showed exactly the two declared files modified, nothing else. sha256 of each changed test file recorded above.
3. `npm run typecheck` — clean (`tsc --noEmit`, no output).
4. Solo `npm run test:file -- test/scaffold/sprint-execution-skill-drift.red.node.test.ts`: **22 tests, 3 pass, 19 fail, 0 skip.** All 19 failing tests fail on a plain `AssertionError` comparing unedited canonical/render text (or the unedited `validate_bounce_readiness.mjs` behavior) against the expected post-fix content — none fail on an import error, undefined symbol, or fixture-setup exception. T7, T7b and T7c (the three already-green regression guards) all pass:
   - T1 (6 leaves): all 6 fail — plain string-not-found assertions (`--stories`, "Five automated checks", CR-046 concrete example) on both Claude and Codex renders.
   - T2 (2 leaves): both fail — §A.2 bookkeeping rule / §C.1 wiki-exclusion text not yet present.
   - T3 (4 leaves): all 4 fail — main-checkout absolute-reports-path phrase not yet in §C.2-§C.6 / dispatch-serial.md step 3.
   - T4 (2 leaves): both fail — §C.9 lead serial-host sentence not yet present (Claude + Codex render).
   - T5 (4 leaves): all 4 fail — §A.4 one-wave/`"stories"`-entry text and architect.md/architect.toml E9 carve-out not yet present.
   - T6 (1 leaf): fails — `validate_bounce_readiness.mjs` still exits 1 on wiki-only dirt (expected 0; fix not yet landed).
   - T7 / T7b / T7c (3 leaves): **pass** — real `src/` dirt still blocks, non-wiki bookkeeping dirt next to wiki churn still blocks, and a rename out of `.cleargate/wiki/` still blocks. These are regression guards for already-correct behavior and are unaffected by the unlanded fix.
   This reproduces the TPV's predicted "22 / 3 / 19; the same 19 plain assertion reasons, T7/T7b/T7c green" exactly.
5. Solo `npm run test:file -- test/scaffold/skill-md-serial-pointers.red.node.test.ts`: **3/3 pass** (Test 20 re-scoped per the patch, Test 21 anchor, Test 22 prebuild-output-matches-canonical) — fully green, same test count (3) as before the patch.
6. Regression witnesses: ran the six named files together (`test/scripts/collision-surface-planning-workflow.red.node.test.ts`, `test/scaffold/portable-skills.red.node.test.ts`, `test/scaffold/codex-payload.red.node.test.ts`, `test/docs/contract-first-dag-text.red.node.test.ts`, `test/scripts/codex-sprint-execution-render.red.node.test.ts`, `test/commands/init-codex-sprint-execution.red.node.test.ts`) — **51/51 pass**, matching the TPV prototype run. M2 pair (`test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` + `test/commands/init-host-parity.red.integration.node.test.ts`) run with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (read-only compare mode; directory timestamps confirmed unchanged after the run, all Sep 25): **20 tests, 0 pass, 20 fail**, and every single failure is the same reason — `sanctioned delta ".cleargate/scripts/validate_bounce_readiness.mjs" (BUG-103): current hash mismatch` — i.e. the pair fails only at the BUG-103 row because the implementation has not landed yet, matching "the M2 pair should still fail only at the BUG-103 row for the right reason, as in your original seal."
7. Committed test-only on `story/BUG-103` at `8729313`. `git diff --cached --stat` before commit showed exactly `2 files changed, 205 insertions(+), 52 deletions(-)`, matching `RESEAL_SCOPE` (`+205/-52`, split `sprint-execution-skill-drift.red +183/-27` / `skill-md-serial-pointers.red +22/-25`). No `--no-verify` used (cli has no pre-commit hook per sprint-context rule 12). Post-commit `git status --porcelain` is empty.

## Scope check

Only the two declared test files were touched in `<cw>`: `test/scaffold/sprint-execution-skill-drift.red.node.test.ts` and `test/scaffold/skill-md-serial-pointers.red.node.test.ts`. No implementation file was read or edited (no `src/`, `scaffold/`, or `scripts/` files were opened by this dispatch beyond the TPV report's prose and the patch itself). Nothing outside `<cw>` was written. `~/.codex`/CODEX_HOME untouched — no codex binary invoked.

## Script Incidents

None. All commands (`git`, `npm run typecheck`, `npm run test:file`, `shasum`) were run directly per the dispatch's own instructions; no `.cleargate/scripts/*` script was invoked in this dispatch, so `run_script.sh` does not apply here.

flashcards_flagged: []

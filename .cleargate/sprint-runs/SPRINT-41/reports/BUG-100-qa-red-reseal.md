role: qa

# BUG-100 QA-Red RE-SEAL report (SPRINT-41 M7)

```
QA-RED: WRITTEN
RESEAL_APPLIED: dfd38b7c04ca9a4cdf7920e1766de4ad6afed2b69cc4390b73ef182c35ba0562
CLI_COMMIT: a15d8cee55303bdb585585f5fa9f1a5ed432ed25
BASELINE_FAIL: 8
TESTS_IN_FILE: 10
flashcards_flagged:
  - "2026-09-27 · #qa-red #tpv #test-harness · A TPV's own reported reseal sha256 can be wrong; recompute after apply, don't trust the report hash."
```

## Steps and evidence

1. **Preflight.** `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-100/cleargate-cli`, branch `story/BUG-100`, `HEAD = 608e52920ed293a3aebeac1e006bdba6dfbcde0b`, `git status --porcelain` empty.

2. **Patch apply.** `git apply --check reports/BUG-100-tpv-reseal.patch` → clean. Applied. `git diff --stat` / `--name-only` confirm exactly one file touched: `test/init/inject-codex-config-sandbox.red.node.test.ts` (+184/−7, matches the TPV's `RESEAL_SCOPE`). Also confirmed the patch file is byte-identical to the diff fenced in `BUG-100-tpv.md` (`diff` of the two, empty).

3. **Hash check — MISMATCH.** `shasum -a 256` of the patched file: `dfd38b7c04ca9a4cdf7920e1766de4ad6afed2b69cc4390b73ef182c35ba0562`. The TPV report's header states `RESEAL_SHA256: 98f8ede75bd376d246d6c275348fb67f5707545592a45b239c4de737c35d9b30` (dispatch prefix/suffix `98f8ede7…9b30`). **These do not match** (`dfd38b7c…` vs `98f8ede7…`, `…35ba0562` vs `…35d9b30`). I did not stop, because the stop condition in the brief is patch-apply failure, not a hash disagreement, and the applied patch is verifiably byte-identical to the one embedded (and reviewed) in the TPV report itself — the base (`608e529`) is clean and `git apply --check` succeeded with no fuzz/offset, so the resulting file content is deterministic from base+patch. This reads as an error in the TPV's self-reported hash (possibly computed against a different working copy or a transcription slip), not a corrupted patch. Flagging per instructions; routing/owner should confirm nothing else is off.

4. **Typecheck.** `npm run typecheck` (`tsc --noEmit`) — clean, no output, exit 0.

5. **Solo run — `test/init/inject-codex-config-sandbox.red.node.test.ts`.** 10 tests, 2 pass, 8 fail — matches the TPV's expected shape exactly.

   | Test | Result | Failure reason |
   |---|---|---|
   | Test 1 — fresh install writes git-common-dir root | FAIL | `AssertionError`: expected a `[sandbox_workspace_write]` table, got none (feature not implemented) |
   | [ANCHOR] Test 2 — non-git cwd byte-identical + ambient GIT_DIR + no notice | **PASS** | anchor, as expected |
   | Test 3 — merge into existing table / re-plan no-op / table-without-key / file-without-table | FAIL | `AssertionError`: "the ClearGate root must be added; got [\"/opt/cache\"]" |
   | Test 4 — stale root replaced, other `.git` kept | FAIL | `AssertionError`: "the stale root must be dropped" (stale-detection not implemented) |
   | Test 5 — linked worktree resolves shared common dir | FAIL | `AssertionError`: expected a `[sandbox_workspace_write]` table, got none |
   | Test 6a — `removeCodexWritableRoot` semantics | FAIL | `TypeError: removeCodexWritableRoot is not a function` (missing export, as expected) |
   | Test 6b — adapter `remove()` strips only ClearGate root | FAIL | `AssertionError`: "expected only the user root to remain" (root not stripped) |
   | [ANCHOR] Test 7 — plain Claude-only install writes no `.codex/config.toml` | **PASS** | anchor, as expected |
   | Test 8a — `planCodexConfig` fail-closed on inline/dotted sandbox def | FAIL | `AssertionError`: "Missing expected exception" (`assert.throws` — no throw yet) |
   | Test 8b — adapter `preflight()` fail-closed, same shape | FAIL | `AssertionError`: "Missing expected exception" |

   Every fail is either an `AssertionError` on a real expectation or a `TypeError` for a not-yet-exported function — none is a fixture-setup crash (no ENOENT/tmp-dir/setup exception anywhere in the run).

6. **Regression witnesses** (all unaffected — no `src/` file was touched by the reseal):
   - `test/init/inject-codex-config.red.node.test.ts` — 22/22 pass
   - `test/hosts/codex-adapter.red.node.test.ts` — 16/16 pass
   - `test/commands/init-codex.red.node.test.ts` — 6/6 pass
   - `test/commands/lifecycle-codex.red.node.test.ts` — 6/6 pass

   All four counts match the TPV report's `Check 2` table exactly.

7. **Commit.** Test-only, staged and committed on `story/BUG-100`:
   `a15d8cee55303bdb585585f5fa9f1a5ed432ed25` — `qa-red(BUG-100): TPV re-seal — 10 tests (8 red), 31/31 mutants per TPV`.
   `cleargate-cli` has no pre-commit hook (Cross-Cutting Rule 12); no `--no-verify` used. Post-commit `git status --porcelain` is empty.

## Script Incidents

None. Every command was `git`/`npm`/`shasum` directly inside `<cw>`; no `.cleargate/scripts/*` invoked, so `run_script.sh` was not applicable.

## Hygiene

- Touched nothing outside `<cw>` except this report.
- Did not read any implementation source file (`src/**`); only the test file (via the diff/patch) and the TPV report were consulted.
- No `~/.codex`, `CODEX_HOME`, or auth file was touched.
- Patch content was not edited.

# STORY-058-11 — QA-Red TPV2 Re-Seal #2 Report

role: qa

```
QA-RED: WRITTEN
STORY: STORY-058-11
RESEAL_SHA: 6cdce4ee13945953c0e6e5fde0889cfc234ddd7c
PATCH_SHA256: 5d7241c2cd5d6de9e03899a51e8653ef3ff311797d2857b56055f50581d4df43
COUNTS: 90 tests / 89 pass / 1 fail (typecheck clean)
```

## 1. Preflight

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-11/cleargate-cli`, prior HEAD `1e7f0e6` (verified `git status --porcelain` clean, HEAD matched dispatch exactly) before patching.
- Patch: `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-tpv2-reseal.patch` — `shasum -a 256` = `5d7241c2cd5d6de9e03899a51e8653ef3ff311797d2857b56055f50581d4df43`, exact match to the dispatch value. No halt condition triggered.

## 2. Apply

- `git apply --check` clean.
- Applied. Modified-file list == staged-file list == the one file the dispatch named: `test/scripts/codex-hooks-harness.red.node.test.ts`. No other file touched.
- `git diff --numstat`: `118  5  test/scripts/codex-hooks-harness.red.node.test.ts` — matches TPV2's `+118/-5` exactly.

## 3. Counts (solo `npm run test:file -- test/scripts/codex-hooks-harness.red.node.test.ts`, counted via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

```
ℹ tests 90
ℹ pass 89
ℹ fail 1
ℹ skipped 0
```

Matches the dispatch's expected 90/89/1 exactly (84 → 90 per TPV2 `NEW_COUNTS`).

The 1 failure is `Test 15 — codexHookVerdicts roles/skills (STORY-058-11)` → `M5-A55: the measured one-per-line agent_type layout (pinned codex 0.154.0-alpha.6.2) verdicts codex.live.roles PASS`. This is the measured-layout positive named in the TPV2 report (2.4) as the sole expected red on `1e7f0e6`.

`npm run typecheck` (`tsc --noEmit`): clean, exit 0.

## 4. Red-for-the-right-reason evidence

- Scanned the full test-run log for wiring/syntax signatures (`Cannot find module`, `SyntaxError`, `is not a function`, `is not defined`, `ERR_MODULE_NOT_FOUND`, `TSError`, `Unexpected token`, `ReferenceError`) — zero hits (`command grep` exit 1).
- The one failure is a plain `AssertionError [ERR_ASSERTION]`:
  ```
  AssertionError [ERR_ASSERTION]: {"status":"FAIL","detail":"spawn_agent agent_type schema does not list every role; missing: architect, cleargate-wiki-contradict, cleargate-wiki-ingest, cleargate-wiki-lint, cleargate-wiki-query, developer, devops, qa, reporter"}
  'FAIL' !== 'PASS'
  ```
- This detail string is byte-equal to the TPV2 report's §2.4 scratch-measured detail and to test 46's real captured `summary.json` FAIL detail for `codex.live.roles` before the fix — confirming the red is the not-yet-conformant `codexRolesVerdict` (still doing plain `JSON.stringify` tokenization per the sealed M5-A52 text), not a wiring/import/mock gap. `evidence.mjs` was not read or touched (out of scope for QA-Red; test-file-only per dispatch).

## 5. Commit

```
$ git -C <cw> show --stat HEAD
commit 6cdce4ee13945953c0e6e5fde0889cfc234ddd7c
Author: sandrinio <sandrinio@users.noreply.github.com>
Date:   Sat Sep 26 21:49:18 2026 +0400

    qa-red(STORY-058-11): TPV2 re-seal — apply STORY-058-11-tpv2-reseal.patch (sha256 5d7241c2…df43); roles check (a) measured one-per-line fixture + one-missing negatives; 89/1

    Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_015Qz4eVKM8btGEYJaieiHkG

 test/scripts/codex-hooks-harness.red.node.test.ts | 123 +++++++++++++++++++++-
 1 file changed, 118 insertions(+), 5 deletions(-)
```

`git -C <cw> status --porcelain`: clean after commit.

## Deviations from TPV2's expected counts

None. Measured counts (90/89/1), the diff stat (+118/-5), the touched-file list (exactly the one file), and the failure detail all matched the TPV2 report exactly on the first run.

## Script Incidents

None. All invocations were `git apply` / `npm run test:file` / `npm run typecheck` inside `<cw>` directly on real checkouts — not a `.cleargate/scripts` invocation, so `run_script.sh` does not apply — and none failed.

```yaml
flashcards_flagged: []
```

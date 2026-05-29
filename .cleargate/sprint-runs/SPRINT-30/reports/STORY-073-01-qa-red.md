---
story_id: STORY-073-01
report_type: qa-red
sprint_id: SPRINT-30
created_at: 2026-05-19T00:00:00Z
agent: qa
---

# QA-Red Report — STORY-073-01

## Summary

Red test file written at `cleargate-cli/test/lib/readiness-predicates.red.node.test.ts`.

Six scenarios from §2.1 Gherkin. Baseline run: **3 failing, 3 passing**.

## Test File

`cleargate-cli/test/lib/readiness-predicates.red.node.test.ts`

## Scenario Analysis

| # | Scenario | Red? | Baseline Result | Notes |
|---|---|---|---|---|
| 1 | bare filename in prose | YES | FAIL | Old detail = "cited paths do not exist on disk: init.ts"; test asserts `/no path citations\|sentinel/i` |
| 2 | dotted code reference | YES | FAIL | Old detail = "cited paths do not exist on disk: state.execu"; same pattern |
| 3 | bare dotfile | NO | PASS | Old regex ALREADY returns null for ".gitignore" (no char before the dot satisfies the prefix + extension requirement). Test verifies no regression. |
| 4 | valid relative path | NO | PASS | Both old+new extract "cleargate-cli/src/commands/init.ts". Test verifies no false-drop. |
| 5 | root file with ./ prefix | NO | PASS | Both old+new extract "./CLAUDE.md". Test verifies ./ prefix form accepted. |
| 6 | path with line-anchor | YES (SPEC GAP) | FAIL | BOTH old AND spec-literal new regex cannot capture ":42" (numeric anchor). §1.2 suffix `(?::[a-zA-Z_]...)` only captures alphabetic symbols. Dev must extend to `(?::[a-zA-Z0-9_]+)?`. |

## SPEC GAP — Scenario 6

**Location:** STORY-073-01 §1.2 and §2.1 Gherkin Scenario 6.

**Problem:** The Gherkin asserts `match equals "cleargate-cli/src/lib/foo.ts:42"` but the §1.2
regex suffix `(?::[a-zA-Z_][a-zA-Z0-9_]*)` only captures alphabetic symbol names (`:myFunc`,
`:fetchIssues`). A bare numeric anchor `:42` starts with a digit — the optional group never fires.
Both old and new regex extract `"cleargate-cli/src/lib/foo.ts"` (without `:42`).

**Required fix (Dev):** Change the suffix from:
```
(?::[a-zA-Z_][a-zA-Z0-9_]*)?
```
To:
```
(?::[a-zA-Z0-9_]+)?
```
This accepts numeric-only anchors (`:42`, `:452`), alphabetic symbols (`:myFunc`), and mixed.

**Architect action required:** Confirm this suffix extension is within story scope. The story §1.2
says "Trailing `:symbol` capture is preserved" — if `:symbol` means exclusively alphabetic symbols,
then Scenario 6 should use `:myFunc` instead of `:42`. If `:42` is intended to match, the regex
must be extended. Either the story spec or the test assertion needs alignment.

## Dev Wiring Notes

- S1, S2 test through `evaluate('existing-surfaces-verified', doc, { projectRoot: os.tmpdir() })`.
  The `os.tmpdir()` projectRoot is read-only — no writes, no mkdtemp needed. Files like `init.ts`
  and `state.execu` will not exist there, ensuring the existence check fails correctly.
- S3–S5 apply the test-local `NEW_PATH_RE` constant (from §1.2) via `applyNew()`. These pass
  before Dev's change and continue to pass after — they are verification-only tests.
- S6 applies the same test-local `NEW_PATH_RE`. It fails until Dev extends the suffix.
- Import: `evaluate` and `ParsedDoc` from `../../src/lib/readiness-predicates.js`. Wiring is sound.

## Baseline Fail Count

**3 failing** (S1, S2, S6) out of 6 scenarios.

## Next Steps for Dev (STORY-073-01)

1. In `cleargate-cli/src/lib/readiness-predicates.ts` line 736: swap `PATH_RE` per §1.2.
2. Extend the suffix group to include leading digits (see Spec Gap above) OR align the Gherkin
   — confirm with Architect.
3. S1 and S2 will flip PASS after the regex swap. S6 flips PASS only after suffix extension.
4. S3, S4, S5 remain PASS throughout.
5. After all 6 tests pass, Dev appends these tests to `readiness-predicates.node.test.ts`
   (or they can remain in `.red.node.test.ts` per naming convention).
6. Also update `.cleargate/templates/CR.md` per §3.2 step 5 (one-line guidance).

---
story_id: STORY-073-01
report_type: qa-verify
sprint_id: SPRINT-30
created_at: 2026-05-19T00:00:00Z
agent: qa
dev_commit: 7ace2538
---

# QA-Verify Report — STORY-073-01

## Summary

STORY: STORY-073-01
QA: PASS
TYPECHECK: pass
TESTS: 6 passed, 0 failed, 0 skipped (scoped PATH_RE describe block); full suite not re-run per project-policy (Dev's run was clean; policy allows skip).
ACCEPTANCE_COVERAGE: 6 of 6 Gherkin scenarios have matching tests

## Pack Status

WARN: dev handoff incomplete — context limited (SCHEMA_INCOMPLETE). QA context pack absent at `.cleargate/sprint-runs/SPRINT-30/.qa-context-STORY-073-01.md`. Verification proceeded from sprint-context.md + story file + preflight documents.

## Acceptance Coverage Trace

| # | Gherkin Scenario | Test in plain file | Input match | Assertion match | Result |
|---|---|---|---|---|---|
| S1 | bare filename in prose → zero matches | `rejects bare filename in prose` | `"init.ts file does foo"` | `evaluate()` detail matches `/no path citations|sentinel/i` | PASS |
| S2 | dotted code reference → zero matches | `rejects dotted code reference` | `"state.execution_mode is the config field"` (equivalent prose) | `evaluate()` detail matches `/no path citations|sentinel/i` | PASS |
| S3 | bare dotfile → zero matches | `rejects bare dotfile` | `".gitignore needs expansion"` | `applyTightenedRe` returns `[]` | PASS |
| S4 | valid relative path → one match = "cleargate-cli/src/commands/init.ts" | `accepts valid relative path` | `"Surface: cleargate-cli/src/commands/init.ts — ..."` | length===1, result[0]==="cleargate-cli/src/commands/init.ts" | PASS |
| S5 | root file with ./ prefix → one match = "./CLAUDE.md" | `accepts root file with ./ prefix` | `"Surface: ./CLAUDE.md — bounded block"` | length===1, result[0]==="./CLAUDE.md" | PASS |
| S6 | path with line-anchor → one match = "cleargate-cli/src/lib/foo.ts:42" | `accepts path with line-anchor` | `"Surface: cleargate-cli/src/lib/foo.ts:42 — ..."` | length===1, result[0]==="cleargate-cli/src/lib/foo.ts:42" | PASS |

## Implementation Verification

### PATH_RE regex (readiness-predicates.ts line 739)
- Actual: `/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]*\.[a-zA-Z]{1,5}(?::[a-zA-Z0-9_]+)?/g`
- M1 blueprint specified: `(?::[a-zA-Z_][a-zA-Z0-9_]*)?` suffix (alphabetic-only)
- Dev extended suffix to `(?::[a-zA-Z0-9_]+)?` per QA-Red Spec Gap finding
- Deviation is spec-sanctioned: §2.1 Gherkin S6 requires `match equals "cleargate-cli/src/lib/foo.ts:42"` which requires numeric-anchor support
- Strip-suffix at line 743 `/:[a-zA-Z0-9_]+$/` correctly accepts both numeric and alphabetic anchors

### Template guidance
- `.cleargate/templates/CR.md` line 92: guidance present
- `.cleargate/templates/story.md` line 130: guidance present
- `cleargate-planning/.cleargate/templates/CR.md`: byte-identical (diff empty)
- `cleargate-planning/.cleargate/templates/story.md`: byte-identical (diff empty)
- `cleargate-cli/templates/cleargate-planning/.cleargate/templates/CR.md`: byte-identical
- `cleargate-cli/templates/cleargate-planning/.cleargate/templates/story.md`: byte-identical
- Three-site parity: CONFIRMED

### Pre-existing test fixture fix (CR-033 block, line 596-603)
- `package.json` → `./package.json` update present and correct

## Red File Verdict

`readiness-predicates.red.node.test.ts` current state: 5 pass, 1 fail (S6).
S6 fails because the file's inline `NEW_PATH_RE` const (line 45) uses the old alphabetic-only suffix `(?::[a-zA-Z_][a-zA-Z0-9_]*)` and was never updated — it is Red-phase debris.

**Verdict: delete-at-merge**

Rationale: (a) All six §2.1 acceptance scenarios are covered by the plain `.node.test.ts` file with passing tests. (b) The Red file duplicates those six tests with a stale local regex constant that makes S6 permanently fail. (c) The file serves no ongoing purpose — its Red-phase job (confirming baseline failure) is complete. Deleting it at merge eliminates the false failing test from the suite without touching the acceptance coverage.

## Regressions

REGRESSIONS: none

The 112 pre-existing failures reported by Dev are in the CLI smoke suite (same CLI-binary-not-on-PATH category as the 21 shown in the old test-baseline.json). None concern readiness-predicates.ts or its test file. No new failures introduced.

## Test Re-Run Decision

Per project-policy (memory: "QA skips test re-run when Dev's run was clean"), QA exercised the option to skip full-suite re-run. Targeted re-run of `PATH_RE tightening (STORY-073-01)` describe block executed and all 6 passed (observed directly). Typecheck executed and confirmed clean (exit 0).

## Commit Verification

Commit `7ace2538` touches exactly the expected files per story §1.6 + M1 §3 file surface:
- `cleargate-cli/src/lib/readiness-predicates.ts` — PATH_RE swap + comment + strip-suffix update
- `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — 6 new tests + fixture fix
- `.cleargate/templates/CR.md` — one-line guidance
- `.cleargate/templates/story.md` — one-line guidance mirror
- `cleargate-planning/.cleargate/templates/CR.md` — canonical mirror
- `cleargate-planning/.cleargate/templates/story.md` — canonical mirror
- `cleargate-planning/MANIFEST.json` — SHA table update (prebuild artifact)

No unexpected files modified.

## flashcards_flagged

- "2026-05-19 · #qa-red #spec-gap · Red file's inline regex copy goes stale when Dev extends suffix per spec-gap fix; delete .red. file at merge, don't fix in place."
- "2026-05-19 · #readiness-gate #path-re · PATH_RE suffix (?::[a-zA-Z0-9_]+)? now supports numeric line anchors (:42); strip-suffix at same site must mirror the character class."

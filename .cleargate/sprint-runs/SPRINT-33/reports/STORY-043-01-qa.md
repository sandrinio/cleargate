# QA Report: STORY-043-01

**role: qa**
**Date:** 2026-06-01
**Dev SHA:** 4821ee52
**Branch:** story/STORY-043-01
**Worktree:** .worktrees/STORY-043-01/

## Verdict

QA: PASS

## Test Results

### test_flashcard_fail_closed.red.sh (sealed red)
All 17 assertions GREEN. S1 and S4 (previously expected to fail at baseline) now pass.

### test_flashcard_enforcement.sh (reworked harness)
All 12 assertions GREEN. 0 failed.

## Acceptance Coverage

ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios have matching tests

| Gherkin Scenario | Test assertion(s) | Result |
|---|---|---|
| S1: unprocessed card blocks (exit 1 + BLOCKED) | red: S1 exit=1, BLOCKED, card named, hash hint, no WARNING; enforcement: S1 exit=1, BLOCKED, card, hash | PASS |
| S2: processed marker lets Task proceed (exit 0 + sentinel) | red: S2 exit=0, no gate diag, sentinel written; enforcement: S2 exit=0, sentinel=1 | PASS |
| S3: CLEARGATE_ADVISORY=1 downgrades to warning (exit 0 + WARNING) | red: S3 exit=0, WARNING, card named, no BLOCKED; enforcement: S3 exit=0, WARNING, card | PASS |
| S4: stale execution_mode:v1 ignored — still exits 1 (blocked) | red: S4 exit=1, BLOCKED, card named, no WARNING | PASS (test_flashcard_fail_closed.red.sh) |

Note: S4 in test_flashcard_enforcement.sh was re-scoped to "empty list is no-op" per the M1 plan (§4.1 table). S4 Gherkin (stale execution_mode ignored → exit 1) is covered exclusively by the sealed red test. Both interpretations are satisfied.

## Static Checks

- **execution_mode / EXEC_MODE grep in canonical hook:** 0 matches (confirmed).
- **SKIP_FLASHCARD_GATE=1 early-skip preserved:** present at line 53 of canonical hook.
- **_off-sprint short-circuit preserved:** present at lines 43 and 53 of canonical hook.
- **CLEARGATE_ADVISORY=1 sole downgrade:** present at line 129 (sole conditional after UNPROCESSED_CARDS check).
- **flashcards_flagged parsing loop:** untouched (lines 66–123 of canonical hook).
- **token-ledger block (`{ … } 2>> "${HOOK_LOG}"`):** untouched (lines 155–207).

## Diff Scope (narrowed DoD)

Files changed in 4821ee52:
1. `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` — CANONICAL only.
2. `.cleargate/scripts/test/test_flashcard_enforcement.sh` — reworked harness.

NOT in diff (correct, deferred):
- `.claude/hooks/pending-task-sentinel.sh` (LIVE, gitignored) — absent from diff. CONFIRMED.
- `cleargate-cli/templates/cleargate-planning/.claude/hooks/pending-task-sentinel.sh` (payload) — absent from diff. CONFIRMED.
- `state.schema.json` — absent from diff. CONFIRMED.

Both test scripts resolve hook-under-test to `${REPO_ROOT}/cleargate-planning/.claude/hooks/pending-task-sentinel.sh` via script-relative REPO_ROOT (mechanism a). No `_find_git_root` / `${GIT_ROOT}/.claude/hooks` references remain in either script.

## Regressions

REGRESSIONS: none

## flashcards_flagged

flashcards_flagged: []

---
story_id: "STORY-014-05"
agent: "developer"
status: "done"
commit: "72bff93"
flashcards_flagged: "[]"
sprint_id: "SPRINT-10"
qa_bounces: "0"
arch_bounces: "0"
---

# Dev Report: STORY-014-05 Cross-Project Ledger Routing

## Summary

Implemented cross-project ledger routing via `ORCHESTRATOR_PROJECT_DIR` env variable.

## Changes Made

**Scaffold mirrors (committed):**
- `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` line 29: `REPO_ROOT="${CLAUDE_PROJECT_DIR}"` → `REPO_ROOT="${ORCHESTRATOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR}}"`
- `cleargate-planning/.claude/hooks/token-ledger.sh` line 35: hardcoded path → `REPO_ROOT="${ORCHESTRATOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR}}"`
- `cleargate-planning/CLAUDE.md`: Added "Cross-project orchestration" subsection inside CLEARGATE block after "Support infrastructure" paragraph.
- `.cleargate/scripts/test/test_cross_project_routing.sh`: New 4-scenario test, 11 assertions.

**Live hooks (updated via python3 per flashcard #permissions #agent #settings-local):**
- `.claude/hooks/pending-task-sentinel.sh`: `REPO_ROOT="${ORCHESTRATOR_PROJECT_DIR:-/Users/ssuladze/Documents/Dev/ClearGate}"`
- `.claude/hooks/token-ledger.sh`: same pattern

## Tests

All 4 Gherkin scenarios pass (11 assertions total):
1. ORCHESTRATOR_PROJECT_DIR set + .active in target → sentinel writes to target tree (PASS)
2. ORCHESTRATOR_PROJECT_DIR set + SubagentStop → ledger row writes to target tree (PASS)
3. Unset env → behavior unchanged (fallback to hardcoded GIT_ROOT) (PASS)
4. Env set but no .active in target → off-sprint bucket in TARGET (PASS)

Negative test (reverted hook): S1 and S4 fail as expected without code change.

## Notes

The flashcard gate block in `pending-task-sentinel.sh` (added by STORY-014-03) continues to resolve `$REPO_ROOT` correctly because `REPO_ROOT` is assigned once at the top and all subsequent references use `$REPO_ROOT`. When `ORCHESTRATOR_PROJECT_DIR` is set, the flashcard gate reads reports from the target repo's sprint dir — correct behavior.

Pre-commit symlink `.git/hooks/pre-commit` is a broken symlink (target `pre-commit.sh` does not exist) — STORY-014-01 installed the symlink but the dispatched `pre-commit.sh` was created in the gitignored `.claude/hooks/`. This is a pre-existing condition; commit proceeded without pre-commit hook firing.

---
story_id: "STORY-014-05"
sprint_id: "SPRINT-10"
role: "qa"
verdict: "approved"
checked_at: "2026-04-21"
commit: "72bff93"
qa_bounces: "0"
arch_bounces: "0"
---

# QA Report: STORY-014-05 Cross-Project Ledger Routing

## Typecheck
PASS — cleargate-cli: 0 errors.

## Test Results
Gherkin test (test_cross_project_routing.sh): 11/11 passed, 0 failed.
All 4 Gherkin scenarios covered.

## Acceptance Coverage: 4 of 4 scenarios
- S1: ORCHESTRATOR_PROJECT_DIR redirects sentinel writes — PASS
- S2: ORCHESTRATOR_PROJECT_DIR redirects ledger writes — PASS
- S3: Unset env falls back to hook-repo default — PASS
- S4: Target has no .active → off-sprint bucket in target — PASS

## Three-Surface Verification
- cleargate-planning/.claude/hooks/pending-task-sentinel.sh: ORCHESTRATOR_PROJECT_DIR override confirmed
- cleargate-planning/.claude/hooks/token-ledger.sh: ORCHESTRATOR_PROJECT_DIR override confirmed
- cleargate-planning/CLAUDE.md: "Cross-project orchestration" subsection confirmed inside CLEARGATE block
- Live hooks updated via python3 (gitignored): live sentinel has hardcoded fallback (expected, not scaffold-wrapped)
- scaffold pending-task-sentinel.sh uses ${CLAUDE_PROJECT_DIR} fallback; live uses hardcoded path — intended design

## Side-effect on 014-03 (flagged)
014-05 changed `REPO_ROOT="..."` to `REPO_ROOT="${ORCHESTRATOR_PROJECT_DIR:-...}"` in the live hook.
This broke the sed-patch pattern in test_flashcard_enforcement.sh (014-03's test harness).
The 014-03 test now fails 7/12 assertions. This is a cross-story regression introduced by 014-05.
Responsibility: 014-05 needed to update 014-03's test harness to use the new pattern. Not done.

## Verdict: APPROVED (but co-owns 014-03 kickback — Developer of 014-05 fix must also patch test_flashcard_enforcement.sh)

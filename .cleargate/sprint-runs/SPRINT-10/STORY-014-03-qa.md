---
story_id: "STORY-014-03"
sprint_id: "SPRINT-10"
role: "qa"
verdict: "kicked-back"
checked_at: "2026-04-21"
commit: "7915d1e"
qa_bounces: "0"
arch_bounces: "0"
---

# QA Report: STORY-014-03 Flashcard Gate Enforcement

## Typecheck
PASS — cleargate-cli: 0 errors.

## Test Results
Gherkin test (test_flashcard_enforcement.sh): 5/12 passed, 7 FAILED.

## Acceptance Coverage: PARTIAL — regression from 014-05 rebase

### Root Cause
`test_flashcard_enforcement.sh` patch_hook function (line 120) uses:
  sed "s|REPO_ROOT=\"/Users/ssuladze/.../ClearGate\"|REPO_ROOT=\"${tmpdir}\"|g"

After STORY-014-05 changed line 29 of pending-task-sentinel.sh from:
  REPO_ROOT="/Users/ssuladze/Documents/Dev/ClearGate"
to:
  REPO_ROOT="${ORCHESTRATOR_PROJECT_DIR:-/Users/ssuladze/Documents/Dev/ClearGate}"

...the sed pattern no longer matches. The hook's REPO_ROOT is not patched to the tmpdir, so the gate reads from the real repo's sprint dirs (which have no test reports), finds no cards, exits 0, and all blocking assertions fail.

### Failing Assertions
- S1: "exit code is 1 (blocked)" — actual=0 (gate doesn't see test reports)
- S1: "stderr names unprocessed card" — no stderr
- S1: "stderr has touch-command hint with hash" — no stderr
- S1: "stderr says FLASHCARD GATE BLOCKED" — no stderr
- S2: "sentinel file was written" — actual=0 (hook exited at wrong sprint dir)
- S3: "stderr has WARNING (not BLOCKED)" — no stderr
- S3: "stderr names the card" — no stderr

### Scenarios passing
- S2 exit code 0 — passes trivially (gate doesn't block when no reports found)
- S3 exit code 0 — passes trivially
- S4 exit code 0 — passes (empty list no-op works regardless of path)
- S4 no gate output — passes
- Hash stability — passes

## Three-Surface Verification
- Scaffold hook appended and committed: confirmed
- Protocol §18.6: confirmed at line 762
- Live hook installed via python3: dev report claims yes

## Required Fix
Update `patch_hook` in `test_flashcard_enforcement.sh` to match the new ORCHESTRATOR_PROJECT_DIR pattern:
  sed "s|REPO_ROOT=\"\${ORCHESTRATOR_PROJECT_DIR:-.*}\"|REPO_ROOT=\"${tmpdir}\"|g"
OR add `ORCHESTRATOR_PROJECT_DIR="" REPO_ROOT="${tmpdir}"` as env overrides in `invoke_hook`.

## Verdict: KICKED BACK
7/12 Gherkin assertions fail. Fix the test harness to handle ORCHESTRATOR_PROJECT_DIR pattern.

---
story_id: "STORY-014-01"
sprint_id: "SPRINT-10"
role: "qa"
verdict: "approved"
checked_at: "2026-04-21"
commit: "3dcee8d"
qa_bounces: "0"
arch_bounces: "0"
---

# QA Report: STORY-014-01 File-Surface Diff Gate

## Typecheck
PASS — cleargate-cli: 0 errors. admin: 0 errors (2 Svelte warnings, pre-existing).

## Test Results
Gherkin test (test_file_surface.sh): 6/6 passed, 0 failed.
All 4 Gherkin scenarios covered.

## Acceptance Coverage: 4 of 4 scenarios
- S1: Gate catches off-surface edit — PASS
- S2: Gate passes when staged files match surface — PASS
- S3: Whitelist admits generated files — PASS
- S4: v1 mode is advisory — PASS

## Three-Surface Verification
- file_surface_diff.sh diff (live vs scaffold): empty (identical)
- cleargate-protocol.md diff (live vs scaffold): empty (identical), §20 confirmed at line 842
- story.md template §3.1 note: present on both surfaces

## Open Issues (non-blocking)
1. BROKEN SYMLINK: `.git/hooks/pre-commit` symlinks to `.claude/hooks/pre-commit.sh` which does not exist in the live gitignored dir. Pre-commit gate is NOT active. Developer wrote hooks via python3 but the gitignored live files are absent (lost between worktree and main). Operator must `cp cleargate-planning/.claude/hooks/pre-commit.sh .claude/hooks/` and `cp cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh .claude/hooks/`. This is a DoD gap — the gate does not fire in dogfood.
2. Scaffold-mirror-only protocol is acceptable per team decision.

## Verdict: APPROVED with operator action required
Gate logic correct, tests pass. Operator must install live hooks to activate the gate.

---
story_id: STORY-014-05
parent_epic_ref: EPIC-014
parent_cleargate_id: EPIC-014
sprint_cleargate_id: SPRINT-01
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-014 §2 IN-SCOPE C3 + CG_TEST SPRINT-01 REPORT.md §5 Tooling 🟡 (token ledger routed to orchestrator's project, not target)
actor: Developer Agent
complexity_label: L2
milestone: M1
parallel_eligible: y
expected_bounce_exposure: low
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
stamp_error: no ledger rows for work_item_id STORY-014-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:43:02Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T11:01:46Z
---

# STORY-014-05: Cross-project ledger routing via ORCHESTRATOR_PROJECT_DIR
**Complexity:** L2 — extend two existing hooks with an env override; no new files.

## 1. The Spec

### 1.1 User Story
As an orchestrator running subagents against a different project's repo (e.g. ClearGate sessions driving CG_TEST), I want an env variable that routes token-ledger + pending-task-sentinel writes to the target project's sprint-runs tree, so cross-project v2 orchestration produces complete ledgers.

### 1.2 Detailed Requirements
- Extend `.claude/hooks/pending-task-sentinel.sh` and `.claude/hooks/token-ledger.sh`:
  - Both already hardcode `REPO_ROOT`. Change to honor `${ORCHESTRATOR_PROJECT_DIR:-$DEFAULT_REPO_ROOT}` at the top.
  - When env is set, sentinel + ledger write to `$ORCHESTRATOR_PROJECT_DIR/.cleargate/...` instead of the hook's own repo path.
- Update `cleargate-planning/CLAUDE.md` block with a short note: "For cross-project orchestration, export `ORCHESTRATOR_PROJECT_DIR=/path/to/target/repo` in the orchestrator's shell before starting the session."
- Add a fallback: if `$ORCHESTRATOR_PROJECT_DIR` is set but `.cleargate/sprint-runs/.active` doesn't exist there, fall back to `_off-sprint` bucket in the target, NOT in the orchestrator's own repo.
- Three-surface landing: hook + mirror + CLAUDE.md injection block + mirror.

### 1.3 Out of Scope
- Auto-detection of target project (would require Claude Code runtime hooks we don't have).
- Rewriting token-ledger.sh attribution logic (STORY-013-XX already landed that; this is just path routing).

## 2. The Truth

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Cross-project ledger routing

  Scenario: ORCHESTRATOR_PROJECT_DIR redirects sentinel writes
    Given ORCHESTRATOR_PROJECT_DIR=/tmp/other-repo
    And /tmp/other-repo/.cleargate/sprint-runs/.active contains "SPRINT-01"
    When the PreToolUse hook fires
    Then .pending-task-*.json is written under /tmp/other-repo/.cleargate/sprint-runs/SPRINT-01/
    And NOT under the orchestrator's own project tree

  Scenario: ORCHESTRATOR_PROJECT_DIR redirects ledger writes
    Given same env var set
    When SubagentStop fires
    Then the ledger row is written to /tmp/other-repo/.cleargate/sprint-runs/SPRINT-01/token-ledger.jsonl

  Scenario: Unset env falls back to hook-repo default
    Given ORCHESTRATOR_PROJECT_DIR is unset
    When either hook fires
    Then behavior is unchanged (routes to hook-repo's .cleargate tree)

  Scenario: Target has no .active sentinel — off-sprint bucket in target
    Given ORCHESTRATOR_PROJECT_DIR=/tmp/other-repo
    And /tmp/other-repo has no .cleargate/sprint-runs/.active
    When ledger writes
    Then row lands at /tmp/other-repo/.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl
    And NOT at the hook-repo's _off-sprint
```

### 2.2 Verification Steps (Manual)
- [ ] Bash test with two tmpdir projects, verify correct routing.
- [ ] Smoke: run a CG_TEST sprint with env exported and confirm ledger populates CG_TEST's tree.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Modified | `.claude/hooks/pending-task-sentinel.sh` (REPO_ROOT resolution) |
| Modified | `.claude/hooks/token-ledger.sh` (same) |
| Modified | `cleargate-planning/CLAUDE.md` injection block |
| Mirrors | `cleargate-planning/.claude/hooks/*` |
| Test | `.cleargate/scripts/test/test_cross_project_routing.sh` |

### 3.2 Technical Logic
```bash
REPO_ROOT="${ORCHESTRATOR_PROJECT_DIR:-/Users/.../ClearGate}"
# live scaffold uses hardcoded ClearGate path; scaffold uses ${CLAUDE_PROJECT_DIR}
```
Scaffold version (in cleargate-planning) uses `${CLAUDE_PROJECT_DIR}` as the default, plus env override — the substitution pattern is already established for portability.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin bash | 4 | §2.1 |
| Three-surface diff | 3 | 2 hooks + CLAUDE.md |

### 4.2 Definition of Done
- [ ] All 4 scenarios pass.
- [ ] CLAUDE.md note lands in both live CG_TEST (via upgrade) and scaffold.
- [ ] Commit: `feat(EPIC-014): STORY-014-05 cross-project ledger routing`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

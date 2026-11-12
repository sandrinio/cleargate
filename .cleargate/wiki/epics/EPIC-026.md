---
type: epic
id: "EPIC-026"
parent: ""
children: 
  - "[[CR-084-Sprint-Dashboard-In-CLI-Payload]]"
  - "[[STORY-026-01]]"
  - "[[STORY-026-02]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-026_Sprint_Execution_Skill_Adoption.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
sprint_cleargate_id: "SPRINT-20"
---

# EPIC-026: Sprint Execution Skill Adoption

**Status:** Completed · **Sprint:** SPRINT-20 · **Gate:** fail: gherkin-error-path

## Objective
Promote .claude/skills/sprint-execution/SKILL.md to the canonical orchestration playbook — auto-loaded on sprint-active sessions, mirrored to the cleargate-init scaffold, and authoritative over CLAUDE.md's duplicated four-agent-loop content.

## Problem & Value
**Why are we doing this?**

Sprint orchestration content is duplicated across four always-loaded surfaces (CLAUDE.md, cleargate-protocol.md, cleargate-enforcement.md, per-agent contracts). Adding a new pattern means editing four files and hoping they stay aligned.

[+2,491 bytes not shown — read .cleargate/delivery/archive/EPIC-026_Sprint_Execution_Skill_Adoption.md]

## Scope
**In:**
- [ ] **M1.1 — SessionStart auto-load directive.** Extend `.claude/hooks/session-start.sh` to read `.cleargate/sprint-runs/.active`. If non-empty, append exactly one line to stdout after the doctor banner: `→ Active sprint detected.
**Out:**
- **Background watcher / heartbeat infra** for stall detection (Option 2/3 from the design conversation). Defer until Option 1 (wall-clock budgets) has been observed across ≥ 2 sprints to know whether ambient monitoring is actually needed.

[+2,594 bytes not shown — read .cleargate/delivery/archive/EPIC-026_Sprint_Execution_Skill_Adoption.md]

## Architecture rules
- Must use the existing three-tuple skill location pattern (live dogfood + cleargate-planning canonical + cleargate-cli/templates derived).
- Must use existing PostToolUse / SessionStart hook surfaces; do NOT add new hook event types.
- Must preserve all halt-at-gates rules in CLAUDE.md as one-liner pointers — pruning content is allowed, but Gate 1/Gate 4/triage/halt rules MUST remain visible without loading any skill.

[+541 bytes not shown — read .cleargate/delivery/archive/EPIC-026_Sprint_Execution_Skill_Adoption.md]

## Decisions
All human answers received 2026-05-02; integrated into the spec above. Listed here for audit:

1. **Emit load directive on partial preflight failures?** — **NO, only on success.** Preflight failures halt the orchestrator at the punch list; auto-loading the skill mid-failure is meaningless.
2.

[+755 bytes not shown — read .cleargate/delivery/archive/EPIC-026_Sprint_Execution_Skill_Adoption.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (3): [[CR-084-Sprint-Dashboard-In-CLI-Payload]], [[STORY-026-01]], [[STORY-026-02]]
<!-- END relations -->

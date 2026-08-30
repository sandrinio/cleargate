---
type: epic
id: "EPIC-026"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-026_Sprint_Execution_Skill_Adoption.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
---

# EPIC-026: Sprint Execution Skill Adoption

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Promote .claude/skills/sprint-execution/SKILL.md to the canonical orchestration playbook — auto-loaded on sprint-active sessions, mirrored to the cleargate-init scaffold, and authoritative over CLAUDE.md's duplicated four-agent-loop content.</objective>
  <architecture_rules>
    <rule>Must use the existing three-tuple skill location pattern (live dogfood + cleargate-planning canonical + cleargate-cli/templates derived).</rule>
    <rule>Must use existing PostToolUse / SessionStart hook surfaces; do NOT add new hook event types.</rule>
    <rule>Must preserve all halt-at-gates rules in CLAUDE.md as one-liner pointers — pruning content is allowed, but Gate 1/Gate 4/triage/halt rules MUST remain visible without loading any skill.</rule>
    <rule>No changes to .claude/agents/{architect,developer,qa,reporter}.md role contracts — the skill consumes their existing outputs, it does not redefine them.</rule>
    <rule>No changes to existing scripts (close_sprint.mjs, init_sprint.mjs, validate_bounce_readiness.mjs, write_dispatch.sh).</rule>
    <rule>Mirror parity: edits to the canonical skill at

[+17,831 bytes not shown — read .cleargate/delivery/archive/EPIC-026_Sprint_Execution_Skill_Adoption.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

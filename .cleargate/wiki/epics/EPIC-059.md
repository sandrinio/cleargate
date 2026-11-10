---
type: epic
id: "EPIC-059"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-059_planning_catches_what_execution_stopped_for.md"
last_ingest: "2026-11-10T18:20:47.120Z"
last_ingest_commit: "7ba61eb5110056cbc5302b31b3248bf5e2331090"
repo: "planning"
---

# EPIC-059: Planning Catches What Execution Stopped For

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Add four short process rules to the canonical scaffold, learned from a downstream sprint, so that conflicts already present in story drafts surface once at plan confirmation instead of as mid-sprint halts.</objective>
  <architecture_rules>
    <rule>Text and template changes only. No new script, agent, CLI command or readiness predicate.</rule>
    <rule>Canonical edits land in cleargate-cli/scaffold/** on a story branch in the cleargate-cli repo; the live .claude/ and .cleargate/ mirrors are updated in the same story and diffed for parity.</rule>
    <rule>Every new behaviour is optional or defaults to today's behaviour: an empty draft-reviewer list changes nothing.</rule>
    <rule>Do not edit cleargate-planning/** (frozen since STORY-058-01).</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md" action="modify" />
    <file

[+12,067 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-059_planning_catches_what_execution_stopped_for.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

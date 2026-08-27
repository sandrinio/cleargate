---
type: epic
id: "EPIC-057"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-057_Multi_Repo_Story_Execution.md"
last_ingest: "2026-08-25T21:20:02.162Z"
last_ingest_commit: ""
repo: "planning"
---

# EPIC-057: Multi-repo story execution — routing, not just detection

> **Not scheduled.** Filed 2026-08-26 as the recorded follow-on to [[BUG-046]], which detects worktree-unreachable surfaces but deliberately does not route them.

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Let a story whose file surface lives outside the worktree-reachable tree execute correctly, by declaring repo topology in config.yml and routing each story to the right checkout with the right branch.</objective>
  <architecture_rules>
    <rule>Must consume BUG-046's reachability classification — do NOT reimplement path classification</rule>
    <rule>Must not run `git worktree add` inside a nested independent repo (cleargate-enforcement.md §1.3)</rule>
    <rule>Cross-repo atomic merge is impossible and is explicitly not attempted — see OUT-OF-SCOPE</rule>
    <rule>Topology is declared per-install in config.yml; never hardcode cli/mcp/admin (they are this repo's shape, not every repo's)</rule>
  </architecture_rules>
  <target_files>
    <file path=".cleargate/config.yml" action="modify" />
    <file path=".claude/agents/architect-synth.md" action="modify" />
    <file path=".claude/skills/sprint-execution/SKILL.md" action="modify" />

[+9,473 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-057_Multi_Repo_Story_Execution.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

---
type: epic
id: "EPIC-024"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-024_AI_Orientation_Surface_Slim.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "7cbc665f6f3a6c98cfacf10f23c14b95ebf481a9"
repo: "planning"
---

# EPIC-024: AI Orientation Surface Slim

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make four currently-implicit ClearGate rules explicit in CLAUDE.md, split cleargate-protocol.md into "AI reads" + "hooks enforce" files with full citation rewrite (no stub redirects), and remove Story §3.1 duplication from per-milestone Architect plans — without changing any gate semantic, CLI surface, or four-agent loop contract.</objective>
  <architecture_rules>
    <rule>Preserve every existing gate semantic: Gate 1 (proposal approval), Gate 2 (ambiguity 🔴→🟢), Gate 3 (push approved+confirmed), Gate 3.5 (sprint close ack). No mechanical changes — only document split, full citation rewrite, CLAUDE.md surfacing, and Architect plan template edit.</rule>
    <rule>Preserve four-agent loop and existing v1/v2 enforcement. The execution_mode flag's behaviour is unchanged; only its *visibility* in CLAUDE.md changes.</rule>
    <rule>Mirror parity invariant — every edit to .claude/agents/* and .cleargate/knowledge/* MUST also edit cleargate-planning/.claude/agents/* and cleargate-planning/.cleargate/knowledge/* identically (FLASHCARD 2026-04-19 #wiki #protocol #mirror).

[+24,137 bytes not shown — read .cleargate/delivery/archive/EPIC-024_AI_Orientation_Surface_Slim.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

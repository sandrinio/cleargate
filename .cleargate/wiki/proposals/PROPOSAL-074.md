---
type: proposal
id: "PROPOSAL-074"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "9c391f2be41469898f0ee5620fffbf8042a5ba28"
repo: "planning"
---

# PROPOSAL-074: EPIC-074: Antigravity 2.0 Host Port — Full-Parity Scaffold

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Port the ClearGate execution scaffold (four-agent loop + lifecycle hooks + skills + settings + context-injection contract) from Claude Code to Google Antigravity 2.0 such that a target repo running `cleargate init --host antigravity` receives a payload functionally equivalent to today's `.claude/` payload, with no regression to existing Claude Code targets.</objective>
  <architecture_rules>
    <rule>Planning surface (`.cleargate/**` — templates, protocol, wiki, delivery folders, FLASHCARD, knowledge) is host-agnostic and MUST NOT change shape for Antigravity. Only the execution scaffold is host-specific.</rule>
    <rule>Antigravity payload lives in `.agents/` at the target repo root (workspace scope). Global user-level config (`~/.gemini/antigravity/`) is read-only context — `cleargate init` never writes there. The historical `.antigravity/` name in one community repo is not the official convention and we do not use it.</rule>
    <rule>Context injection targets `AGENTS.md` at repo root (cross-vendor convention, also read by Cursor and Claude Code per the AGENTS.md standard).

[+31,976 bytes not shown — read .cleargate/delivery/pending-sync/PROPOSAL-074_Antigravity_2_Host_Port.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

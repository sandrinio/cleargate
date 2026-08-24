---
type: proposal
id: "PROPOSAL-002"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-002_Knowledge_Wiki.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-002: Work Item Awareness via Karpathy-Style LLM Wiki

## 1. Initiative & Context

### 1.1 Objective
Add a compiled `.cleargate/wiki/` layer that Claude Code reads first at every triage, so the agent stays aware of project state across sessions without re-scanning the raw filesystem. The wiki covers four planes — **work items, sprints, product state, roadmap** — and is derived from raw state (`delivery/`, `plans/`) and maintained automatically by dedicated subagents following the Karpathy LLM-Wiki pattern. Scope expanded 2026-04-18 from work-items-only to the full four-plane view (see §4 Q6 amendment).

### 1.2 The "Why"

- **No more duplicate proposals.** Claude sees `[[PROPOSAL-stripe-webhooks]] → LIN-987, archived` on read — tells the Vibe Coder "this shipped last month, are you extending it?" instead of drafting a conflicting duplicate.
- **Cross-session continuity.** Today, every new session starts blind to prior work. With the wiki's `index.md`, any session starts with full situational awareness in ~3k tokens.

[+11,656 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-002_Knowledge_Wiki.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

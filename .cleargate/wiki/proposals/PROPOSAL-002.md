---
type: proposal
id: "PROPOSAL-002"
parent: ""
children: []
cites: 
  - "[[CR-007]]"
cited_by: 
  - "[[CR-103]]"
  - "[[EPIC-052]]"
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-002_Knowledge_Wiki.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-002: Work Item Awareness via Karpathy-Style LLM Wiki

**Status:** Abandoned · **Sprint:** none · **Gate:** not run

## Initiative & Context
### 1.1 Objective
Add a compiled `.cleargate/wiki/` layer that Claude Code reads first at every triage, so the agent stays aware of project state across sessions without re-scanning the raw filesystem. The wiki covers four planes — **work items, sprints, product state, roadmap** — and is derived from raw state (`delivery/`, `plans/`) and maintained automatically by dedicated subagents following the Karpathy LLM-Wiki pattern.

[+1,441 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-002_Knowledge_Wiki.md]

## Technical Architecture & Constraints
### 2.1 Directory Layout

```
.cleargate/
├── knowledge/                      # protocol (unchanged, not in wiki)
├── templates/                      # blueprints (unchanged, not in wiki)
├── delivery/
│   ├── pending-sync/               # raw: hot drafts
│   └── archive/                    # raw: shipped items w/ remote IDs
├── plans/                          # raw: pulled PM context
└── wiki/                           # 🆕 compiled
```

[+5,840 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-002_Knowledge_Wiki.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files — must be modified

**Protocol:**
- `.cleargate/knowledge/cleargate-protocol.md` — add §10 "Knowledge Wiki Protocol" covering ingest/query/lint, gate enforcement, and backlink conventions.

**None of the templates need to change.** Raw files keep their current YAML frontmatter (per PROPOSAL-001); the wiki derives from them.

### 3.2 Expected New Entities

Once the npm package exists:

[+1,149 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-002_Knowledge_Wiki.md]

## AI Interrogation Loop — RESOLVED
Q1–Q8 resolved by Vibe Coder 2026-04-17 (accepting AI recommendations). Q9–Q10 added 2026-04-18 during scope expansion to the full Karpathy pattern; Q6 and Q7 amended at the same time.

1. **Wiki page content depth** — **Resolved:** metadata + summary + edges only. Raw content stays in the raw file. Keeps pages ~200 tokens each.
2. **Git policy for `wiki/`** — **Resolved:** commit to git.

[+2,103 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-002_Knowledge_Wiki.md]

## Approval Gate — PASSED
Approved by Vibe Coder on 2026-04-17. AI authorized to proceed with Epic/Story decomposition for this feature once PROPOSAL-001 is also approved (hard dependency).

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (1): [[CR-007]]
- Cited by (2): [[CR-103]], [[EPIC-052]]
<!-- END relations -->

---
type: epic
id: "EPIC-015"
parent: ""
children: 
  - "[[CR-002]]"
  - "[[STORY-015-01]]"
  - "[[STORY-015-02]]"
  - "[[STORY-015-03]]"
  - "[[STORY-015-04]]"
cites: 
  - "[[STORY-015-01]]"
  - "[[STORY-015-02]]"
  - "[[STORY-015-03]]"
  - "[[STORY-015-04]]"
cited_by: 
  - "[[EPIC-063]]"
  - "[[STORY-063-08]]"
  - "[[STORY-063-09]]"
  - "[[STORY-063-11]]"
  - "[[STORY-063-13]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-015_Wiki_Index_Hygiene_And_Scale.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
sprint_cleargate_id: "SPRINT-10"
---

# EPIC-015: Wiki Index Hygiene & Scale

**Status:** Completed · **Sprint:** SPRINT-10 · **Gate:** fail: affected-files-declared

## Objective
Reshape .cleargate/wiki/index.md from a flat 151-row table into a scale-ready hierarchical index and fix the stale frontmatter that causes half its rows to lie about status.

## Problem & Value
**Why are we doing this?**
The wiki index is the first thing every ClearGate agent reads at session start (CLAUDE.md orientation step 1). Today it contains 151 rows in a single flat table, ~4k tokens, and ~60% of those rows are stale or abandoned items (EPIC-001/008/009 and their never-shipped child stories, SPRINT-10 marked "Planned" despite being merged). Agents waste tokens scanning noise and — worse — make decisions on lies (e.g.

[+657 bytes not shown — read .cleargate/delivery/archive/EPIC-015_Wiki_Index_Hygiene_And_Scale.md]

## Scope
**In:**
- [ ] Hierarchical index rendering: Active / Archive split; stories collapsed under parent epic with count + expand link
- [ ] `cleargate wiki audit-status` — detects items whose status/location disagree; exits non-zero; `--fix` flag
**Out:**
- BM25, vector search, embeddings, or any RAG retrieval layer
- Sharding the index into multiple files (reserved for the next epic at ~300 pages)
- Changing the raw-item directory layout (pending-sync / archive split stays)
-

[+711 bytes not shown — read .cleargate/delivery/archive/EPIC-015_Wiki_Index_Hygiene_And_Scale.md]

## Architecture rules
- Source of truth stays the raw-item frontmatter in .cleargate/delivery/{pending-sync,archive}/; index.md is derived
- No retrieval augmentation (BM25, vector, embeddings) — this epic stays inside Karpathy's flat-index regime
- Status vocabulary remains protocol-defined (Draft / Ready / Approved / Completed / Done). Adding "Abandoned" is the only new literal permitted and must land in the protocol doc in the same story
- wiki-build must remain idempotent — same inputs produce byte-identical output

## Decisions
*(Resolved 2026-04-24 — human approved all recommended defaults.)*

- **Q1. Tokenizer vs chars/4 heuristic?** → **chars/4 heuristic.** Zero deps, ~10% error on markdown is acceptable. Revisit only if false-positives hurt.
- **Q2. `audit-status --fix` confirmation UX?** → **Always require `--yes`** (or TTY prompt) unless `--quiet`. Single predictable rule.
- **Q3.

[+598 bytes not shown — read .cleargate/delivery/archive/EPIC-015_Wiki_Index_Hygiene_And_Scale.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (5): [[CR-002]], [[STORY-015-01]], [[STORY-015-02]], [[STORY-015-03]], [[STORY-015-04]]
- Cites (4): [[STORY-015-01]], [[STORY-015-02]], [[STORY-015-03]], [[STORY-015-04]]
- Cited by (5): [[EPIC-063]], [[STORY-063-08]], [[STORY-063-09]], [[STORY-063-11]], [[STORY-063-13]]
<!-- END relations -->

---
type: proposal
id: "PROPOSAL-012"
parent: ""
children: []
cites: 
  - "[[STORY-013-04]]"
  - "[[STORY-014-02]]"
cited_by: 
  - "[[EPIC-063]]"
  - "[[STORY-063-01]]"
status: "Approved"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-012_Wiki_Contradiction_Detection.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "6aff4e920b21cae00c271fb74009ee9e3ed09312"
repo: "planning"
---

# PROPOSAL-012: Wiki Contradiction Detection

**Status:** Approved · **Sprint:** none · **Gate:** pass

## Initiative & Context
### 1.1 Objective

Add a semantic, neighborhood-scoped contradiction check to the wiki layer so that when a new draft (Proposal / Epic / Story / CR / Bug) makes a claim that conflicts with an already-ingested item it cites or shares an epic with, the conflict is surfaced **before** it propagates into synthesis pages and downstream agent context. v1 ships in **advisory mode** (non-blocking, ledger-tracked); promotion to enforcing is a deferred decision after calibration.

### 1.2 The "Why"

[+2,332 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-012_Wiki_Contradiction_Detection.md]

## Technical Architecture & Constraints
### 2.1 Trigger point — ingest phase, not a separate hook

The check fires from inside `cleargate-wiki-ingest`, **after** the per-item page is written and the affected-synthesis recompile completes, **before** the ingest agent returns. This keeps the design hook-free in v1 — no change to `stamp-and-gate.sh`. Idempotency rule §10.7 still applies: if the raw file content is byte-identical to last ingest, ingest is a no-op and the contradict phase does not run.

Pseudocode for the new ingest tail:

```
# existing ingest flow:
write per-item wiki page
append YAML event to wiki/log.md
recompile affected synthesis pages
```

[+3,974 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-012_Wiki_Contradiction_Detection.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files (modified)

- `.claude/agents/cleargate-wiki-ingest.md` — append "Phase 4: contradict invocation" to the workflow; document the §10.7 idempotency interaction.
- `.cleargate/knowledge/cleargate-protocol.md` — add §10.10 (Wiki Contradiction Detection) describing the advisory check, neighborhood rule, and calibration plan. Add `last_contradict_sha` as an optional field in the §10.4 schema (lint must NOT reject pages missing it; lint must NOT reject pages that have it).
- `.claude/agents/cleargate-wiki-lint.md` — one-line addition: lint ignores `last_contradict_sha`.

[+2,096 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-012_Wiki_Contradiction_Detection.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (2): [[STORY-013-04]], [[STORY-014-02]]
- Cited by (2): [[EPIC-063]], [[STORY-063-01]]
<!-- END relations -->

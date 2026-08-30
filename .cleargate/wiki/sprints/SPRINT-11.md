---
type: sprint
id: "SPRINT-11"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-11_Wiki_Hygiene.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# SPRINT-11: Wiki Index Hygiene & Scale

## Sprint Goal

Ship **EPIC-015** — reshape `.cleargate/wiki/index.md` from a flat 151-row table into a scale-ready hierarchical index, land a status-audit CLI that reconciles stale frontmatter (SPRINT-10, EPIC-001, EPIC-008, EPIC-009 and their stranded child stories), add a token-budget lint to block index bloat at the gate, and wire a sprint-close stamp so the drift we just fixed stays fixed.

After this sprint: agents reading `index.md` at session start see an Active surface ≤ 2k tokens (80% case), `cleargate wiki lint` fails if the index exceeds 8k tokens, and `cleargate sprint-archive` stamps sprint frontmatter to Completed atomically before rebuilding the wiki.

**Scope:** 4 stories, 1 epic. All four already approved 🟢 Low Ambiguity from the 2026-04-24 interrogation pass (6 questions resolved).

## 1. Consolidated Deliverables

[+7,053 bytes not shown — read .cleargate/delivery/archive/SPRINT-11_Wiki_Hygiene.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

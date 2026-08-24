---
type: proposal
id: "PROPOSAL-012"
parent: ""
children: []
status: "Approved"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-012_Wiki_Contradiction_Detection.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "6aff4e920b21cae00c271fb74009ee9e3ed09312"
repo: "planning"
---

# PROPOSAL-012: Wiki Contradiction Detection

## 1. Initiative & Context

### 1.1 Objective

Add a semantic, neighborhood-scoped contradiction check to the wiki layer so that when a new draft (Proposal / Epic / Story / CR / Bug) makes a claim that conflicts with an already-ingested item it cites or shares an epic with, the conflict is surfaced **before** it propagates into synthesis pages and downstream agent context. v1 ships in **advisory mode** (non-blocking, ledger-tracked); promotion to enforcing is a deferred decision after calibration.

### 1.2 The "Why"

1. **Current lint is structural-only.** `cleargate-wiki-lint` enforces frontmatter schema, backlink bidirectionality, stale SHAs, exclusion list, mtime skew, and pagination. It does **not** read prose. Two drafts can each pass lint while asserting incompatible facts ("auth uses JWT" vs "auth uses OAuth client credentials"), and the inconsistency only surfaces during execution — at which point the four-agent loop has already burned tokens building on a poisoned premise.
2.

[+9,241 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-012_Wiki_Contradiction_Detection.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

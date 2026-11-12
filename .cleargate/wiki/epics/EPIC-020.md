---
type: epic
id: "EPIC-020"
parent: ""
children: 
  - "[[STORY-020-01]]"
  - "[[STORY-020-02]]"
  - "[[STORY-020-03]]"
cites: []
cited_by: 
  - "[[EPIC-063]]"
  - "[[STORY-063-01]]"
  - "[[STORY-063-02]]"
  - "[[STORY-063-06]]"
  - "[[STORY-063-07]]"
  - "[[STORY-063-10]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-020_Wiki_Contradiction_Detection.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "6aff4e920b21cae00c271fb74009ee9e3ed09312"
repo: "planning"
---

# EPIC-020: Wiki Contradiction Detection (Advisory v1)

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Add a semantic contradiction-check phase to wiki-ingest so Draft/In-Review work items are screened against their cited neighborhood; emit advisory findings to wiki/contradictions.md without blocking any gate.

## Problem & Value
**Why are we doing this?**
`cleargate-wiki-lint` is structural-only — schema, backlinks, stale SHAs, exclusion list, mtime skew. Two drafts can each pass lint while asserting incompatible facts (e.g. "auth uses JWT" vs "auth uses OAuth client_credentials"). The corpus silently rots, downstream agents inherit poisoned premises, and the inconsistency only surfaces during execution where recovery cost is high.

[+619 bytes not shown — read .cleargate/delivery/archive/EPIC-020_Wiki_Contradiction_Detection.md]

## Scope
**In:**
- [ ] New read-only subagent `cleargate-wiki-contradict` (sonnet, tools Read/Grep/Glob).
- [ ] Phase 4 wired into `cleargate-wiki-ingest`: only fires for `status ∈ {Draft, In Review}`, only on raw-SHA change.
**Out:**
- Auto-resolution of contradictions. The agent flags; the human decides.
- Cross-repo contradictions (story-vs-code). Wiki-only.
- Contradictions across approved/archived items (frozen — assumed correct).

[+951 bytes not shown — read .cleargate/delivery/archive/EPIC-020_Wiki_Contradiction_Detection.md]

## Architecture rules
- Read-only subagent — Write/Edit/Bash forbidden in cleargate-wiki-contradict.md.
- Neighborhood-scoping is mandatory: full-corpus scans are forbidden. The subagent receives an explicit list of pages from the ingest caller.
- Idempotency via last_contradict_sha is mandatory — skip the LLM call when raw SHA matches.
- v1 always exits 0. No gate (1, 2, or 3) is blocked by a contradiction finding.

[+207 bytes not shown — read .cleargate/delivery/archive/EPIC-020_Wiki_Contradiction_Detection.md]

## Decisions
All four questions answered — recommendations accepted by human (sandrinio).

- **Q1:** Should Phase 4 run when a page transitions `In Review → Approved`?
  - **A1:** **No.** Skip-on-Approved stands. Rely on In-Review checks; the most expensive moment is also the one with the smallest marginal information gain (the human is approving — they've already reviewed). Locked into status filter in §3 Reality Check.

[+711 bytes not shown — read .cleargate/delivery/archive/EPIC-020_Wiki_Contradiction_Detection.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (3): [[STORY-020-01]], [[STORY-020-02]], [[STORY-020-03]]
- Cited by (6): [[EPIC-063]], [[STORY-063-01]], [[STORY-063-02]], [[STORY-063-06]], [[STORY-063-07]], [[STORY-063-10]]
<!-- END relations -->

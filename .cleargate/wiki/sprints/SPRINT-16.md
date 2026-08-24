---
type: sprint
id: "SPRINT-16"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-16_Upgrade_UX_And_MCP_Native_Slice.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
---

# SPRINT-16: Upgrade UX + MCP-Native Source of Truth (slice 1)

## Sprint Goal

Two anchor epics, each previously locked at the architectural level, now executing:

1. **Upgrade UX (EPIC-016)** — close the three gaps EPIC-009 left open. Users on N-1 see an "available" notice within 24h; `cleargate upgrade` prints release narrative before the merge loop; the meta-repo installs through `--from-source` and runs the same scaffold-clean validation downstream users hit. Six stories pre-decomposed during SPRINT-15 prep; spec stable. Ships **0.10.0** (CHANGELOG ships in tarball + registry-check + delta print + dogfood path).
2. **EPIC-023 — Work-Item Sync v2** — first slice of PROPOSAL-013's "MCP as native source of truth" reframe. Replaces the `PmAdapter` noop indirection with direct `cleargate sync` for work items. Status-blind sync per PROPOSAL-013 §2.1 (Drafts and unapproved items ARE the in-progress thinking, belong in the source of truth). Story files (STORY-023-NN) are drafted by the Architect as **between-sprints transition work** (post-SPRINT-15 close, pre-SPRINT-16 activation) per CR-017 §11 — they exist in pending-sync, gate-clean, before this sprint activates. M2 is pure execution.

[+11,750 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-16_Upgrade_UX_And_MCP_Native_Slice.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

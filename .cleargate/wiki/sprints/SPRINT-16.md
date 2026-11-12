---
type: sprint
id: "SPRINT-16"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-16_Upgrade_UX_And_MCP_Native_Slice.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
sprint_cleargate_id: "SPRINT-16"
report_raw_path: ".cleargate/sprint-runs/SPRINT-16/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-16: Upgrade UX + MCP-Native Source of Truth (slice 1)

**Status:** Abandoned · **Sprint:** SPRINT-16 · **Gate:** not run

## Goal
Two anchor epics, each previously locked at the architectural level, now executing:

1. **Upgrade UX (EPIC-016)** — close the three gaps EPIC-009 left open. Users on N-1 see an "available" notice within 24h; `cleargate upgrade` prints release narrative before the merge loop; the meta-repo installs through `--from-source` and runs the same scaffold-clean validation downstream users hit. Six stories pre-decomposed during SPRINT-15 prep; spec stable. Ships **0.10.0** (CHANGELOG ships in tarball + registry-check + delta print + dogfood path).
2. **EPIC-023 — Work-Item Sync v2** — first slice of PROPOSAL-013's "MCP as native source of truth" reframe. Replaces the `PmAdapter` noop indirection with direct `cleargate sync` for work items. Status-blind sync per PROPOSAL-013 §2.1 (Drafts and unapproved items ARE the in-progress thinking, belong in the source of truth). Story files (STORY-023-NN) are drafted by the Architect as **between-sprints transition work** (post-SPRINT-15 close, pre-SPRINT-16 activation) per CR-017 §11 — they exist in pending-sync, gate-clean, before this sprint activates. M2 is pure execution.

[+221 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-16_Upgrade_UX_And_MCP_Native_Slice.md]

## Deliverables
| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|---|---|
| `STORY-016-01` | Story | Registry-check library + 24h cache (`lib/registry-check.ts` + opt-out env var + offline silent) | standard | L2 | y | low | M1 |
| `STORY-016-02` | Story | `cleargate doctor --session-start` surfaces update notifier (consumes 016-01) | standard | L1 | n | low | M1 |
| `STORY-016-03` | Story | `CHANGELOG.md` backfill + ship in npm tarball | fast | L1 | y | low | M1 |
| `STORY-016-04` | Story | `cleargate upgrade` prints CHANGELOG delta before merge loop (consumes 016-03) | standard | L2 | n | med | M1 |
| `STORY-016-05` | Story | `cleargate init --from-source <path>` for meta-repo dogfood | standard | L2 | y | med | M1 |
| `STORY-016-06` | Story | E2E integration test — dogfood install → `doctor --check-scaffold` clean (consumes 016-05) | standard | L2 | n | med | M1 |

[+2,986 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-16_Upgrade_UX_And_MCP_Native_Slice.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-16/REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-16/improvement-suggestions.md

### Carried Over
- None.
<!-- END sprint-report -->

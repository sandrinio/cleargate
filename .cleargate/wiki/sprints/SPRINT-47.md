---
type: sprint
id: "SPRINT-47"
parent: ""
children: 
  - "[[EPIC-065]]"
  - "[[STORY-065-01]]"
  - "[[STORY-065-02]]"
  - "[[STORY-065-03]]"
  - "[[STORY-065-04]]"
  - "[[STORY-065-05]]"
  - "[[STORY-065-06]]"
cites: 
  - "[[CR-082]]"
  - "[[CR-128]]"
  - "[[CR-129]]"
  - "[[EPIC-065]]"
  - "[[EPIC-066]]"
  - "[[INITIATIVE-002]]"
  - "[[SPRINT-46]]"
cited_by: []
status: "Active"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-47_proof_decides_done.md"
last_ingest: "2026-11-16T09:43:45.073Z"
last_ingest_commit: "69215e50029869654bf2f3fc33019d23da5c5539"
repo: "planning"
last_contradict_sha: "c14c59842c9b56819cd6b7bb72245c47089b0f027339d852bc9a9c20c3c4876f"
---

# SPRINT-47: Proof Decides Done

**Status:** Active · **Dates:** 2026-11-17 → 2026-11-21 · **Gate:** pass

## Goal
Make proof decide Done: every item declares a proof tier, a script records each proof as evidence, an item becomes Done only when evidence for its tier exists, and close and the report show the tier promised and the evidence produced, or "built, not proven at tier X".

## Deliverables
<!-- cleargate:ignore-ids -->The Proof column applies INITIATIVE-002 rule 1 by hand, as in SPRINT-45 and SPRINT-46: the recorder this sprint builds is not live until Gate 4.<!-- /cleargate:ignore-ids --> Lanes are computed by `assign_lane.mjs` at kickoff; the values below are its output on the drafts.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `STORY-065-01` | Items declare a proof tier <!-- cleargate:ignore-ids -->(absorbs CR-128)<!-- /cleargate:ignore-ids --> | runtime | SDR | y | med | Unit + integration — `proof-declared` reds; preflight on a fixture sprint; before/after gate sweep over `pending-sync/` unchanged |
| `STORY-065-02` | Record evidence for a proof | runtime | SDR | y | med | Unit + integration + clean-room — recorder reds on a temp repo; init/upgrade reds; `cleargate init` from the packed tarball shows the `proof` block |
| `STORY-065-03` | Done waits for evidence | standard | SDR | after 02's contract | low | Unit + integration — Done-guard reds; `merge_story.mjs` on a temp repo: pass → Done, pending → Sprint Review |
| `STORY-065-04` | Prove stage in the build loop | standard | SDR | after 02's contract | med | Unit + docs pins — `stagesFor` per lane; verdicts on the runner and serial paths; skill-text pins |
| `STORY-065-05` | Holdout scenarios and property tests | standard | SDR | y | med | Unit + integration — view and count reds; `seal_red.mjs --amendment` on real git |
| `STORY-065-06` | Close and report show proof <!-- cleargate:ignore-ids -->(absorbs CR-129)<!-- /cleargate:ignore-ids --> | standard | SDR | after 02's contract | med | Unit + integration — a fixture sprint closed end to end with one unproven item; Step 2.5 on the new report template |

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (7): [[EPIC-065]], [[STORY-065-01]], [[STORY-065-02]], [[STORY-065-03]], [[STORY-065-04]], [[STORY-065-05]], [[STORY-065-06]]
- Cites (7): [[CR-082]], [[CR-128]], [[CR-129]], [[EPIC-065]], [[EPIC-066]], [[INITIATIVE-002]], [[SPRINT-46]]
<!-- END relations -->

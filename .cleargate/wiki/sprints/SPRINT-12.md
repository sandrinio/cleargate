---
type: sprint
id: "SPRINT-12"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-12_Framework_Universality.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
sprint_cleargate_id: "SPRINT-12"
report_raw_path: ".cleargate/sprint-runs/SPRINT-12/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-12: Framework Universality — Public Ship

**Status:** Completed · **Sprint:** SPRINT-12 · **Gate:** not run

## Goal
Ship **EPIC-018** — make ClearGate installable into any target repo. Remove the dogfood-specific assumptions that leak through the scaffold (`npm test` / `npm run typecheck` hard-codes, stack vocabulary, no LICENSE, dogfood-first README), and prove it works end-to-end via an automated foreign-repo integration test.

After this sprint: a stranger with no prior context can `npm i -D cleargate && npx cleargate init` in a blank Node or Go repo and drive the four-agent loop without forking the scaffold. Hygiene (bugs + EPIC-018 pruning that was renumbered + awareness polish) is **deferred to SPRINT-13** per Option C of the 2026-04-24 conversation.

**This sprint is the vibe-coder-product-market-fit gate.** Until it lands, ClearGate is a private dogfood repo; after it lands, ClearGate is a public framework.

## Deliverables
| Story | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|
| [`STORY-018-01`](STORY-018-01_LICENSE_MIT.md) LICENSE (MIT) | L1 | y | low | M1 |
| [`STORY-018-02`](STORY-018-02_README_Split_Onboarding.md) README split + onboarding walkthrough | L2 | y | low | M1 |
| [`STORY-018-03`](STORY-018-03_Config_Driven_Gates.md) Config-driven gates | L2 | y | med | M1 |
| [`STORY-018-04`](STORY-018-04_Scaffold_Lint.md) `cleargate scaffold-lint` + CI | L2 | n | low | M2 |
| [`STORY-018-05`](STORY-018-05_Foreign_Repo_Integration_Test.md) Foreign-repo integration test + CI | L2 | n | med | M2 |

**Totals: 5 stories, 1 Epic. Complexity: 1×L1 + 4×L2. No L3/L4.**

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** unknown · **Report:** .cleargate/sprint-runs/SPRINT-12/REPORT.md

### Carried Over
(none recorded)
<!-- END sprint-report -->

---
type: sprint
id: "SPRINT-45"
parent: ""
children: 
  - "[[BUG-117]]"
  - "[[BUG-133]]"
  - "[[BUG-134]]"
  - "[[CR-120]]"
  - "[[EPIC-064]]"
  - "[[STORY-064-01]]"
  - "[[STORY-064-02]]"
cites: []
cited_by: 
  - "[[SPRINT-46]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-45_measured_loop_and_safe_upgrade.md"
last_ingest: "2026-11-15T20:37:32.192Z"
last_ingest_commit: "d6a2009862610c558f6143c294fac643bf8cf7c8"
repo: "planning"
last_contradict_sha: "9f4323fce86953e6a8c25dfc6074064025057e9cbf36a85baad100dd56b430fe"
report_raw_path: ".cleargate/sprint-runs/SPRINT-45/SPRINT-45_REPORT.md"
last_report_ingest_commit: "d6a2009862610c558f6143c294fac643bf8cf7c8"
---

# SPRINT-45: Measured Loop and Safe Upgrade

**Status:** Completed · **Dates:** 2026-11-14 → 2026-11-17 · **Gate:** pass

## Goal
Make the sprint report's rework and cost figures come from what actually happened (the host's subagent transcripts and git), and make `cleargate upgrade` safe for repos with local edits, proven against a holdout recount of SPRINT-44 and dispenser_adapter's sprints.

## Deliverables
<!-- cleargate:ignore-ids -->The Proof column applies INITIATIVE-002 rule 1 by hand: the tier, and the check that produces the evidence. Sprint 44 below is the last closed sprint, used as evidence, not a roster item.<!-- /cleargate:ignore-ids -->

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `CR-120` | Measure the subagent, not the orchestrator — dispatch ledger incl. workflow runs | standard | M1 | y | med | Real run — reader on sprint 44 and dispenser_adapter sessions; dispatch counts match the holdout recount |
| `STORY-064-01` | Per-item metrics derived from transcripts and git | standard | M1 | y (on contract C1) | med | Real run — `sprint_metrics.mjs` on the evidence set vs the holdout recount (10% / ±1 per item) |
| `STORY-064-02` | Sprint report reads derived metrics | standard | M2 | n (after 064-01) | low | Real run — bundle for sprint 44 and this sprint's own close |
| `BUG-117` | Pricing table lacks Claude 5 models | fast | M1 | y | low | Unit — pricing lookups for every Claude 5 model id |
| `BUG-133` | Upgrade output hides lost local edits | standard | M1 | y | med | Real run — packed RC, `upgrade --dry-run` on a copy of dispenser_adapter |
| `BUG-134` | Upgrade settings merge reorders hooks | standard | M1 | y | low | Real run — packed RC, `upgrade --yes` on a copy of dispenser_adapter; `settings.json` diff shows only ClearGate hooks |

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (7): [[BUG-117]], [[BUG-133]], [[BUG-134]], [[CR-120]], [[EPIC-064]], [[STORY-064-01]], [[STORY-064-02]]
- Cited by (1): [[SPRINT-46]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Draft · **Report:** .cleargate/sprint-runs/SPRINT-45/SPRINT-45_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-45/improvement-suggestions.md

### Carried Over
- Stories: none.
- Carried findings (not roster items): R4 files post-merge rounds as `post_merge` (see §4/§6); `test_close_sprint_v21` Scenario 10 is stale and 105 integration reds predate the sprint and are unlisted; Reporter bundle ~197 KB vs 160 KB budget (deferred with owner sign-off); OpenRouter pricing-refresh CR to be drafted after close.
- Not done by design: no live re-sync at Gate 4. It follows the dispenser_adapter verdict (RC installed there after its SPRINT-03 closes). Live-vs-canonical drift (six canonical files, doctor scaffold-drift lines, parity reds 5a/5d, `sprint-execution-mirror`, `template-stubs.integration:211`) is **expected**, not a defect (rules 9 and 17).
<!-- END sprint-report -->

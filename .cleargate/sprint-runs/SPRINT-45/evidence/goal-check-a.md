# Goal check (a) — derived metrics vs the holdout recount

Script: `sprint_metrics.mjs` at `story/STORY-064-01-r2` 7458176 (cli main 6ad41e8 + SC-5/SC-6); identical blob (6e23bcb) on integrated cli main 9462dcf, so these are the canonical results. Runs on scratch copies only (SPRINT-44 copy; dispenser clones with sprint-runs rsynced). Targets: total within 10% of the judged recount, each item within ±1, unattributed.share ≤ 0.05.

| Sprint | Derived rework | Holdout judged | Δ total | Items exact / ±1 / worse | unattributed.share | Tuned on it? |
|---|---|---|---|---|---|---|
| ClearGate SPRINT-44 | 3 | 3 | 0% | 6 / 0 / 0 | 0.000 | yes (SC-4) |
| dispenser SPRINT-01 | 4 | 4 | 0% | 11 / 0 / 0 | 0.000 | yes (SC-6) |
| dispenser SPRINT-02 | 8 | 8 | 0% | 11 / 0 / 0 | **0.075** | yes (SC-5) |
| dispenser SPRINT-03 (cutoff 2026-11-14T09:40Z) | 31 | 31 (30–32) | 0% | 15 / 2 / 0 | 0.000 | **no — untuned check** |

- SPRINT-03 ±1 items: STORY-003-14 derived 3 vs judged 4 (the recount counts a QA-Verify FAIL round the workflow recorded; derived d2/r1/v0), STORY-003-15 derived 1 vs judged 0 (item still Bouncing at the cutoff). 225 dispatches derived = 225 in the recount.
- SPRINT-02 share 0.075: 4 dispatches of SPIKE-001 prototype work ran in the same session and window. The recount lists the same work as non-SPRINT-02 (17 unattributed by its rule). The script reports it as unattributed, which is true; the 0.05 bar misses on this sprint.
- Before the in-sprint fixes: SPRINT-44 share 0.0915 (SC-4), SPRINT-01 total 6 (SC-6), SPRINT-02 share 0.481 and 432 dispatches (SC-5).
- state.json counters read 0 on every dispenser sprint against judged 4 / 8 / 31.

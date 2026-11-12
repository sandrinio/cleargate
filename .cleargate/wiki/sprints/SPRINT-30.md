---
type: sprint
id: "SPRINT-30"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-30_Solo_Onboarding_Dogfood_Hardening.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "db53f81843ad19394191eb9fe3a8628ddc7c3061"
repo: "planning"
sprint_cleargate_id: "SPRINT-30"
report_raw_path: ".cleargate/sprint-runs/SPRINT-30/SPRINT-30_REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-30: Solo Onboarding Dogfood Hardening

**Status:** Completed · **Sprint:** SPRINT-30 · **Gate:** pass

## Goal
Ship BUG-031 + CR-068 + CR-069 + CR-070 — the four findings produced by pdf_processor's first install + first sprint — plus any additional findings filed during pdf_processor SPRINT-02. Net result: the next solo developer who runs `cleargate init` gets a hardened first-touch experience.

## Deliverables
| Story / Item ID | Title | Type | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|---|
| `BUG-031` | `cleargate init` inherits global project_id, skips pre-member | Bug (P1) | standard | M1 | n | med — identity/state resolver refactor |
| `CR-068` | Silence DEP0190 `shell:true` warning | CR | fast | M1 | y | low |
| `CR-069` | Loud final stderr banner for MCP-restart need | CR | standard | M1 | y | low |
| `CR-070` | Collapse v1/v2 `execution_mode` to single always-enforced behavior | CR | standard | M2 | n | high — wide blast radius across templates/scripts/docs |
| `CR-071` | Sprint execution autonomy contract — protocol anchor + agent propagation + soft hook | CR | standard | M2 | y | med — touches every agent definition + dogfood-mirror |
| `BUG-032` | `close_sprint.mjs` back-sync silently skips story frontmatter | Bug (P1) | standard | M1 | n | high — root cause may be two bugs (Case A SPRINT-01 + Case B SPRINT-02 in pdf_processor); test fixtures from both available |
| `CR-072` | Expand default `cleargate init` `.gitignore` — secrets + language artifacts + OS junk | CR | fast | M1 | y | low — pure template expansion |
| `CR-073` | Tighten readiness-gate path-extractor regex to eliminate false-positive matches | CR | fast | M1 | y | low — one regex change + tests |
| _(future)_ | Filed mid-sprint from pdf_processor SPRINT-02 watch | — | — | M2/M3 | — | — |

**Initial milestone slicing:**

- **M1 — Install-hygiene quick wins.** BUG-031 + CR-068 + CR-069 + CR-072 + BUG-032. First four touch install / init surface; BUG-032 touches close_sprint.mjs but lives in M1 because it's P1-High severity and blocks future clean closes. Can decompose into ~6 stories total. CR-068, CR-069, CR-072 can run parallel (disjoint surfaces in init.ts vs gitignore template).
- **M2 — Protocol vocabulary + agent contracts.** CR-070 (vocabulary collapse) + CR-071 (autonomy contract). Can run partially parallel — CR-070 owns

[+340 bytes not shown — read .cleargate/delivery/archive/SPRINT-30_Solo_Onboarding_Dogfood_Hardening.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-30/SPRINT-30_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-30/improvement-suggestions.md

### Carried Over
- None. All 8 items reached Done and merged to main (close merge `33101a89`).
<!-- END sprint-report -->

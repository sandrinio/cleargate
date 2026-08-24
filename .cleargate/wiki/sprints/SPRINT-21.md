---
type: sprint
id: "SPRINT-21"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-21_Framework_Hardening_Test_Surfaced.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "28642e312bd5eb624293c5f36e7225c80b0f1f58"
repo: "planning"
---

# SPRINT-21: Framework Hardening — Test-Surfaced Findings (Visibility + Cost + Initiative)

## 0. Stakeholder Brief

> Sponsor-readable summary. Pushed to PM tool.

- **Sprint Goal:** Land 11 framework-hardening items surfaced by the 2026-05-03 end-to-end install test. Make the framework see itself (CR-032 + CR-038 chat injection), cut Reporter cost ~99% (CR-036), make Initiative+Sprint first-class (CR-030+CR-031), align predicates with templates (CR-034), tighten L0 Code-Truth (CR-033), and patch the broken state mutation script (BUG-026). Plus low-cost agent prompt edits (CR-035, CR-037) and a 1-day spike (CR-039) on session-reset cost reduction.

- **Business Outcome:** Framework's silent-failure bias is eliminated for the dominant signal classes (gate fails, hook errors, stale caches, dep drift, budget overruns). Sprint close cost drops from ~24M to ~10-12M tokens (Reporter alone from 13M to ~100k). Initiative→Epic flow stops requiring three workarounds. Test-folder regression fixture continues serving as ground truth for future hardening rounds.

[+25,313 bytes not shown — read .cleargate/delivery/archive/SPRINT-21_Framework_Hardening_Test_Surfaced.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

---
type: sprint
id: "SPRINT-24"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-24_Loop_Tightening.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "7e6385bcbc4a018586e14c9a6555d28952dd8bbe"
repo: "planning"
---

# SPRINT-24: Tighten the Loop — Carry-over Cleanup + TPV Dogfood

## 0. Stakeholder Brief

> Sponsor-readable summary.

- **Sprint Goal:** Close the gaps SPRINT-23's own dogfood surfaced. Reconcile canonical-vs-live drift for 4 known-divergent scripts + add parity CI guard (CR-049). Retire the run_script.sh back-compat shim by migrating 6 production CLI callers to the canonical arbitrary-cmd interface (CR-050). Investigate + fix DevOps subagent registration so future sprints don't need orchestrator-fallback (CR-051). Promote the wrapper-e2e test pattern into a shared helper (CR-052). Passive: dogfood TPV (CR-047) on standard-lane stories — track whether it catches ≥1 wiring gap.
- **Business Outcome:** Single canonical wrapper interface (no shim debt). Mirror parity drift caught by CI before next sprint kickoff (no surprise reverts). DevOps merge dispatches reliable (no orchestrator-fallback fragility). Test pattern that catches wrapper-interface regressions becomes reusable. Net expected impact on SPRINT-25+: lower mid-sprint surprise rate, faster sprint kickoffs (no manual canonical-cure), TPV gate operational.
- **Risks (top 3):**
  1.

[+15,855 bytes not shown — read .cleargate/delivery/archive/SPRINT-24_Loop_Tightening.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

---
type: sprint
id: "SPRINT-40"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-40_field_defect_remediation.md"
last_ingest: "2026-11-10T18:20:47.120Z"
last_ingest_commit: "a6e6d2b749ca8aac494c2d5ffd3c13bbe825fb38"
repo: "planning"
---

# SPRINT-40: Field-Defect Remediation

## 0. Stakeholder Brief

- **Sprint Goal:** Restore the agent-dispatch telemetry that a host tool rename silently broke, so sprint accounting and the pre-dispatch flashcard gate work again.
- **Business Outcome:** Sprint reports stop publishing confidently wrong cost data, and the flashcard gate starts enforcing again instead of silently passing every dispatch through. Both are trust defects — the framework was not failing loudly, it was succeeding falsely.
- **Risks (top 3):** the fix depends on a host contract that can change again; the ledger fix cannot be verified in the field until the dispatch fix lands; canonical-only edits will appear to work and change nothing at runtime.
- **Metrics:** dispatch markers written on 100% of agent spawns; zero ledger rows carrying inherited attribution.

## Sprint Goal

Restore the agent-dispatch telemetry that a host tool rename silently broke, so sprint accounting and the pre-dispatch flashcard gate work again.

[+8,724 bytes not shown — read .cleargate/delivery/archive/SPRINT-40_field_defect_remediation.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

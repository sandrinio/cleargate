---
type: sprint
id: "SPRINT-38"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-38_Enforcement_Integrity_Restoration.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "7e88816746b8ec8d0bc9de8ae06915ce3fcaff0c"
repo: "planning"
---

# SPRINT-38: Enforcement Integrity Restoration

## 0. Stakeholder Brief
*(Sponsor-readable summary. Pair with §3 Risks below.)*

- **Sprint Goal:** Make every "always enforced" ClearGate gate actually block again after the CR-070/CR-074 execution_mode retirement — no dead vocabulary, no silent no-ops, and a guard so canonical↔live drift cannot recur.
- **Business Outcome:** The framework's enforcement claims become trustworthy again; end users of the npm payload stop shipping broken pre-commit gates; the scaffold stops drifting out from under its own docs.
- **Risks (top 3):** dogfood canonical→live→payload sync errors; shared-doc-surface merge collisions (CLAUDE.md / protocol.md) across M1/M2 stories; the heaviest story (07) spanning ~20 files across three tiers.
- **Metrics:** all three "always enforced" gates block on violation (proven by test); zero live execution_mode/v1/v2 tokens in shipping surfaces; `cleargate doctor` fails on injected drift.

[+6,969 bytes not shown — read .cleargate/delivery/archive/SPRINT-38_Enforcement_Integrity_Restoration.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

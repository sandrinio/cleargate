---
type: sprint
id: "SPRINT-33"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-33_Framework_Hygiene_And_Gate_Correctness.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "6e23e2f35012c083f40fa1e641c3590d25abffec"
repo: "planning"
---

# SPRINT-33: Framework Hygiene & Gate Correctness

## 0. Stakeholder Brief
*(Sponsor-readable summary. Pushed via `cleargate push`. Pair with §3 Risks below.)*

- **Sprint Goal:** Make every ClearGate gate fire correctly on the right signal, retire stale/duplicated scaffold debt, and add a sprint-end consolidation pass — strengthening delivery quality while cutting weak signals and token cost, without touching the adversarial core.
- **Business Outcome:** The framework stops blocking well-formed work for template bugs, stops loading ~45k of stale context per session, and gains a cross-story quality pass — so agents are more reliable, more token-efficient, and ship cleaner code.
- **Risks (top 3):** (1) CR-070 must land before the flashcard-sentinel fix; (2) `SKILL.md`/`qa.md` are touched by multiple stories — merge order matters; (3) every scaffold edit must mirror canonical→payload→live or it ships buggy (BUG-024 class).
- **Metrics:** 0 items blocked by template false-negatives; flashcard gate enforces again; ~45k session tax trends down; standard-lane stories drop 6→5 dispatches; per-edit wiki recompiles −≥75%.

[+13,598 bytes not shown — read .cleargate/delivery/archive/SPRINT-33_Framework_Hygiene_And_Gate_Correctness.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

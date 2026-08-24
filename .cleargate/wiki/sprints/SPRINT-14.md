---
type: sprint
id: "SPRINT-14"
parent: ""
children: 
  - "[[STORY-014-01]]"
  - "[[STORY-014-02]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-14_Process_v2.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "89539e8bfcdb817b90712e9e148c6e392145214e"
repo: "planning"
---

# SPRINT-14: Process v2 — Planning-First Enforcement, Lane Classifier, Advisory Gates

## Sprint Goal

Promote ClearGate's process layer from "documentation-as-rules" to "machine-enforced rules." Three things land together:

1. **The framework's value prop becomes mechanical, not advisory.** CR-009 + CR-008 close the loop where hooks silently no-op and the planning-first rule lives only in CLAUDE.md text. After this sprint, an agent in a freshly-init'd repo *cannot* skip triage without being intercepted, and a missing CLI surfaces a loud preflight error instead of zero signal.
2. **Push semantics stop being all-or-nothing.** CR-010 converts `cached_gate_result.pass !== true` from a hard reject into a PM-tool advisory tag, unblocking the 24 items currently stuck at gate-check (mostly product-side answers a non-coder needs to provide).
3. **The four-agent loop earns a fast lane.** EPIC-022 (decomposed from PROPOSAL-013) ships the Architect-judged lane classifier + Hotfix path. Trivial work stops paying the full ~30–60k-token loop tax that SPRINT-12/13 spent on single-file fixes.

[+31,477 bytes not shown — read .cleargate/delivery/archive/SPRINT-14_Process_v2.md]

## Blast radius
Affects: [[STORY-014-01]], [[STORY-014-02]]

---
type: sprint
id: "SPRINT-20"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-20_Skill_Adoption_And_Tooling_Cleanup.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "48d4662ae95734288afb720f8f820383c5d15ee5"
repo: "planning"
---

# SPRINT-20: Skill Adoption + Tooling Cleanup (Post-SDLC-Trilogy)

## 0. Stakeholder Brief

> Sponsor-readable summary. Pushed to PM tool.

- **Sprint Goal:** Adopt the V-Bounce-style sprint-execution skill as the single source of truth for orchestration (EPIC-026); fix the token-ledger attribution defect that's been Red since SPRINT-15 (CR-026); fix the PostToolUse hook bug that duplicates frontmatter keys (BUG-025); raise the planning-quality bar with composite per-item readiness gates at preflight + new Discovery/Risk criteria (CR-027); codify the code-truth triage principle (Reuse / Right-Size / Justify-Complexity) as protocol + template + predicate edits (CR-028); clear SPRINT-19 carry-forward debt.
- **Business Outcome:** Orchestrator behavior becomes deterministic + skill-driven; per-agent / per-story token accounting becomes recoverable for the first time since SPRINT-15; close pipeline stops jamming on hook-induced YAML corruption; sprint preflight starts validating the *content* of in-scope work items (not just environment health) and fires Discovery + Risk + Reuse + Right-Size + Justify-Complexity gates that were absent from the predicate set; downstream cleargate users get the skill + the new principle stack via `cleargate init`.

[+35,535 bytes not shown — read .cleargate/delivery/archive/SPRINT-20_Skill_Adoption_And_Tooling_Cleanup.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

---
type: sprint
id: "SPRINT-34"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-34_Polyglot_Portability_Hardening.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "a06160cd6d6b5743501f46d7a77155617b88a5b1"
repo: "planning"
---

# SPRINT-34: Polyglot Portability Hardening

## 0. Stakeholder Brief
*(Sponsor-readable summary. Pushed to PM tool. Pair with §3 Risks below.)*

- **Sprint Goal:** Harden ClearGate so a fresh install runs a sprint end-to-end on an arbitrary (non-node, worktree-isolated) target repo without orchestrator hand-fixes — fixing the 11 portability/loop defects the SPRINT-66 polyglot dogfood surfaced — and ship the two carried hygiene CRs.
- **Business Outcome:** ClearGate becomes genuinely "ships-to-many-repos" portable. A first-time non-node adopter (pytest / vitest / go) can `cleargate init` and execute a sprint without an expert orchestrator patching the scaffold's hardcoded `cleargate-cli` / `node:test` assumptions. Removes the guaranteed false-FAILs that today block any non-node target out of the box.
- **Risks (top 3):**
  - Three shared agent files (`qa.md`, `architect.md`, `developer.md`) are edited by CR-077 + CR-081 + CR-082 — merge contention if landed concurrently (see §2.2/§2.3).
  - Canonical edits under `cleargate-planning/**` do NOT auto-propagate to the live `/.claude/` instance — every CR needs a post-merge re-sync or the meta-repo keeps running the buggy scaffold (the BUG-024 trap).

[+15,670 bytes not shown — read .cleargate/delivery/archive/SPRINT-34_Polyglot_Portability_Hardening.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

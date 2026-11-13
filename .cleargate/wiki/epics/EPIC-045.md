---
type: epic
id: "EPIC-045"
parent: ""
children: 
  - "[[CR-077]]"
  - "[[CR-078]]"
  - "[[CR-079]]"
  - "[[CR-080]]"
  - "[[CR-081]]"
  - "[[CR-082]]"
cites: []
cited_by: 
  - "[[CR-087]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "d97967c6fb6744e704f6359d5ef5ebaabe6ea85b"
repo: "planning"
sprint_cleargate_id: "SPRINT-66"
---

# EPIC-045: Polyglot Portability & Parallel-Dogfood Hardening

**Status:** Completed · **Sprint:** SPRINT-66 · **Gate:** pass

## Objective
Make ClearGate's shipped scaffold runner/path/convention-agnostic so a fresh install on a non-node, worktree-isolated target repo executes a sprint end-to-end without orchestrator hand-fixes.

## Problem & Value
**Why are we doing this?**
ClearGate's stated goal is to ship to *many* repos (memory `project_codemap_general_purpose`), but SPRINT-66 — the first dogfood on a polyglot, worktree-isolated target — proved the shipped scaffold encodes the meta-repo's own conventions and layout as universal law.

[+1,356 bytes not shown — read .cleargate/delivery/archive/EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md]

## Scope
**In:**
- [ ] **CR-077 — Portability / test-stack** (F3 + F6): strip ClearGate-internal node:test/vitest-forbidden rules from the shipped agent payload; make agents read an authoritative `test_stack` (runner + red-test naming) from `sprint_context.md`;
**Out:**
- EPIC-044's serial-verdict / prompt-cache / model-tier dispatch-efficiency work (separate epic).
- Re-architecting `launch_wave.mjs` `parallel()` or the parallel-wave codepath (it shipped; SPRINT-66 hand-rolled parallelism — that abstraction

[+1,932 bytes not shown — read .cleargate/delivery/archive/EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md]

## Architecture rules
- Parameterize, do not hardcode: agents and gate-checks.json MUST read the target's test stack (runner + red-test naming) from sprint_context.md / init-detection, never assume node:test or `cd cleargate-cli`.
- No changes to mcp/ store, the MCP adapter surface, or launch_wave.mjs parallel() internals — this epic is scaffold-portability + script-correctness only.

[+453 bytes not shown — read .cleargate/delivery/archive/EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md]

## Decisions
- "Test-stack source of truth — `init`-time detection that templatizes the shipped agents, or an authoritative `test_stack` block in `sprint_context.md` that… → Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.
- "Sequencing — one consolidation CR or six child CRs (CR-077…082)? (Recommended: six, sequenced CR-077 → CR-079/080 → CR-078 → CR-081/082,… → Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

[+485 bytes not shown — read .cleargate/delivery/archive/EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (6): [[CR-077]], [[CR-078]], [[CR-079]], [[CR-080]], [[CR-081]], [[CR-082]]
- Cited by (1): [[CR-087]]
<!-- END relations -->

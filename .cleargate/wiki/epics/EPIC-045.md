---
type: epic
id: "EPIC-045"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "d97967c6fb6744e704f6359d5ef5ebaabe6ea85b"
repo: "planning"
---

# EPIC-045: Polyglot Portability & Parallel-Dogfood Hardening

## 0.5 Open Questions

> Epic stays 🔴 until §6 is answered. These are the genuine design forks; each carries a Recommended answer.

- **Question:** Test-stack source of truth — should `cleargate init` *detect* the target stack (pytest / vitest / go test / …) and templatize the runner block into the shipped agents, OR should an authoritative structured `test_stack` block in `sprint_context.md` override the agents' defaults at dispatch time?
- **Recommended:** Both, layered. `init` detects and seeds a `test_stack` block (best first-run experience); the `sprint_context.md` block is the authoritative override the agents read each sprint (handles polyglot + per-sprint change). Critically, the shipped agents must *defer* to that block rather than hardcode node:test — detection alone, baked into agent prose, is still brittle.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

[+22,458 bytes not shown — read .cleargate/delivery/archive/EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

## Open questions
- **Question:** Test-stack source of truth — should `cleargate init` *detect* the target stack (pytest / vitest / go test / …) and templatize the runner block into the shipped agents, OR should an authoritative structured `test_stack` block in `sprint_context.md` override the agents' defaults at dispatch time?
- **Recommended:** Both, layered. `init` detects and seeds a `test_stack` block (best first-run experience); the `sprint_context.md` block is the authoritative override the agents read each sprint (handles polyglot + per-sprint change). Critically, the shipped agents must *defer* to that block rather than hardcode node:test — detection alone, baked into agent prose, is still brittle.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

[+1,013 bytes not shown — read .cleargate/delivery/archive/EPIC-045_Polyglot_Portability_And_Parallel_Dogfood_Hardening.md]

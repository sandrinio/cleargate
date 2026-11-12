---
type: epic
id: "EPIC-018"
parent: ""
children: 
  - "[[BUG-004]]"
  - "[[STORY-018-01]]"
  - "[[STORY-018-02]]"
  - "[[STORY-018-03]]"
  - "[[STORY-018-04]]"
  - "[[STORY-018-05]]"
cites: 
  - "[[STORY-018-01]]"
  - "[[STORY-018-02]]"
  - "[[STORY-018-03]]"
  - "[[STORY-018-04]]"
  - "[[STORY-018-05]]"
cited_by: 
  - "[[PROPOSAL-074]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-018_Framework_Universality_Public_Ship.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-018: Framework Universality — Public Ship

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Make ClearGate installable into any target repo by stripping ClearGate-specific assumptions from the scaffold (npm/vitest/monorepo hard-codes), adding LICENSE + stranger-onboarding README, and proving it works end-to-end via an automated foreign-repo integration test.

## Problem & Value
**Why are we doing this?**
ClearGate is a public-repo product. Its value proposition is "install this in any repo and your Claude Code agents behave like a disciplined engineering team." Today that proposition is untested: we've shipped three SPRINTs of dogfooding inside this repo, but have never run `cleargate init` in a non-ClearGate codebase and driven a sprint through.

[+950 bytes not shown — read .cleargate/delivery/archive/EPIC-018_Framework_Universality_Public_Ship.md]

## Scope
**In:**
- [ ] **LICENSE (MIT)** at repo root + `cleargate-cli/LICENSE` for the npm package.
- [ ] **README split.** New `README.md` = stranger onboarding (install → first proposal → first epic in ≤10 min).
**Out:**
- Standalone binary distribution (bun compile / pkg) — defer to EPIC-016 Upgrade UX family or a dedicated distribution epic.
- Non-Claude-Code frontend adapters (Cursor, Windsurf, Aider) — different integration model, not universality per se.

[+1,968 bytes not shown — read .cleargate/delivery/archive/EPIC-018_Framework_Universality_Public_Ship.md]

## Architecture rules
- The scaffold (cleargate-planning/) must contain ZERO stack-specific strings — no `drizzle`, `svelte`, `coolify`, `fastify`, `postgres`, concrete version numbers for user-project deps
- Gate commands (`precommit`, `typecheck`, `test`) must be user-configurable via `.cleargate/config.yml`; default to sensible fallback (`echo "no precommit configured"` exits 0) rather than npm-specific invocations
- Agent definitions reference `cleargate gate <name>` CLI verbs, not raw language-specific commands.

[+337 bytes not shown — read .cleargate/delivery/archive/EPIC-018_Framework_Universality_Public_Ship.md]

## Decisions
- **Q1. Foreign-repo fixtures — Node only, or Node + Go, or Node + Go + Python?**
  - **Recommended default:** Node + Go (two fixtures). Node validates the happy path; Go validates the non-Node claim. Python adds testing time without materially different coverage.

[+1,447 bytes not shown — read .cleargate/delivery/archive/EPIC-018_Framework_Universality_Public_Ship.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (6): [[BUG-004]], [[STORY-018-01]], [[STORY-018-02]], [[STORY-018-03]], [[STORY-018-04]], [[STORY-018-05]]
- Cites (5): [[STORY-018-01]], [[STORY-018-02]], [[STORY-018-03]], [[STORY-018-04]], [[STORY-018-05]]
- Cited by (1): [[PROPOSAL-074]]
<!-- END relations -->

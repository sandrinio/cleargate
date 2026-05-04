---
sprint_id: "SPRINT-23"
created_at: "2026-05-04T12:43:49.095Z"
last_updated: "2026-05-04T12:43:49.095Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Make the SPRINT-22 disciplined loop ergonomic by adopting 3 V-Bounce-inspired tooling patterns (Sprint Context File CR-045, run_script.sh wrapper CR-046, Mid-Sprint Triage rubric + TPV gate CR-047) plus a one-time orphan cleanup with reconciler hardening (CR-048). After this sprint, cross-cutting sprint rules propagate to every dispatch via a single file; script failures become structured incident reports instead of raw bash output; mid-sprint user input has deterministic Bug/Clarification/Scope/Approach routing; lifecycle reconciler catches cross-sprint orphan drift that SPRINT-21's close missed.

## Locked Versions

Frozen dependency versions for this sprint. Orchestrator populates from `package.json` snapshots at sprint init; Developers must not upgrade these mid-sprint without an explicit CR.

| Package | Version |
|---------|---------|
| Node    | `>=24.0.0` |
| TypeScript | `^5.8.0` |
| (add rows per workspace below) |  |

## Cross-Cutting Rules

Sprint-wide architecture rules and UI/API tokens that every story must honour. Populated from the parent Epic's `<architecture_rules>` block.

1. (rule 1)
2. (rule 2)
3. (rule 3)

## Active FLASHCARD Tags

FLASHCARD tags that appear in any story's `<agent_context>` for this sprint. Auto-populated by grepping `.cleargate/FLASHCARD.md` at sprint init. Agents: grep the flashcard file for each tag listed here before starting work.

- `#tag1` — one-line summary of the most recent card
- `#tag2` — one-line summary

## Adjacent Implementations (Reuse First)

Exported helpers and modules from already-merged stories in this sprint. The Architect updates this section after each story merges. Developers check here before writing new helpers — if the module already exists, import it; duplication is a kick-back criterion.

| Story | Module / Export | Path |
|-------|----------------|------|
| (populated as stories merge) | | |

## Mid-Sprint Amendments

_(populated by Architect on CR:scope-change or CR:approach-change; never rewrite, only append. Format: '<ISO-ts> · <ID> · <one-line note>')_

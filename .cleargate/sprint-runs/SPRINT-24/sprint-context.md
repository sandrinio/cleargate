---
sprint_id: "SPRINT-24"
created_at: "2026-05-04T14:01:57.527Z"
last_updated: "2026-05-04T14:01:57.527Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Close the gaps SPRINT-23's own dogfood surfaced. Reconcile canonical-vs-live drift for 4 known-divergent scripts + add parity CI guard (CR-049). Retire the run_script.sh back-compat shim by migrating 6 production CLI callers to the canonical arbitrary-cmd interface (CR-050). Investigate + fix DevOps subagent registration so future sprints don't need orchestrator-fallback (CR-051). Promote the wrapper-e2e test pattern into a shared helper (CR-052). Passive: dogfood TPV (CR-047) on standard-lane stories — track whether it catches ≥1 wiring gap.

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

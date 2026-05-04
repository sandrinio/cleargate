---
sprint_id: "SPRINT-25"
created_at: "2026-05-04T19:04:48.956Z"
last_updated: "2026-05-04T19:04:48.956Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Finish the SDLC Hardening arc with 5 small carry-over CRs (CR-053 root MANIFEST bug, CR-054 UTF-8 truncation, CR-055 wrapScript adoption, CR-056 skill-heuristic investigation, CR-057 self-repair) and bring docs current with the SPRINT-22..SPRINT-24 reality (CR-058 — README + cleargate-cli/README + lifecycle diagram image-gen prompt). After this sprint, the framework's "five-role 7-step loop with 4 gates" is accurately documented; the SDLC Hardening arc closes; future sprints return to product direction.

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

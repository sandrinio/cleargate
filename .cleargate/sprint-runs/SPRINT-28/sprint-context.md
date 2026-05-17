---
sprint_id: "SPRINT-28"
created_at: "2026-05-17T18:50:41.615Z"
last_updated: "2026-05-17T18:50:41.615Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Three foundation tracks — sprint-close parent reconciliation (CR-066), status-vocabulary unification to `Completed` (CR-067), and full vitest elimination (EPIC-028) — plus EPIC-010 closeout (STORY-010-02), wiki-lint bugfix (BUG-004), and a one-shot reconciler harvest pass against the six stale epics surfaced 2026-05-16.

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
| STORY-066-01 | rollUpParentStatus, walkActiveParents, RollupResult | cleargate-cli/src/lib/parent-rollup.ts (re-exported via lifecycle-reconcile.ts) |
| STORY-067-01 | migrate-status-to-completed.mjs (CLI: --dry-run/--apply), push.ts .migration-lock guard | cleargate-cli/scripts/migrate-status-to-completed.mjs + cleargate-cli/src/commands/push.ts |
| STORY-028-04 | codemod-vitest-to-node-test.mjs (CLI: --apply --root <dir> [--report <path>]) | cleargate-cli/scripts/codemod-vitest-to-node-test.mjs |

## Mid-Sprint Amendments

_(populated by Architect on CR:scope-change or CR:approach-change; never rewrite, only append. Format: '<ISO-ts> · <ID> · <one-line note>')_

2026-05-18T00:00:00.000Z · STORY-067-01-arch · Architect post-flight raised 4 advisory risks for STORY-067-02 dispatch: (1) walk is non-recursive — subdirectories of pending-sync/archive are not traversed; (2) single-status-line break — only first frontmatter status: line is rewritten, multi-line values silently ignored; (3) dry-run output should be piped to audit log before --apply runs in CI; (4) exit-handler removal — process.on('exit') lock cleanup removed from final build; review before STORY-067-02 wires CI step.
2026-05-18T21:04:56.000Z · STORY-028-04-arch · Architect post-flight (PASS) raised 3 advisory items for STORY-028-05/-06/-07 dispatch: (1) pre-flight grep for `.each(` — test.each/describe.each are not converted by the codemod and must be detected before bulk apply; (2) pre-flight grep for `expect.assertions|expect.hasAssertions|expect.extend` — these are not mapped and require manual-fix handling; (3) test-glob bleed deferral to STORY-028-08 — `test/fixtures/**` matches cleargate-cli/package.json test script glob; recommended fix: exclude `test/fixtures/**` from the test script before running the codemod at scale.

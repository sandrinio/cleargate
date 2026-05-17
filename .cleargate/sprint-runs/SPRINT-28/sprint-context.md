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
| STORY-067-02 | 16 templates use Completed enum; 114 archive items + 8 canonical templates migrated | .cleargate/delivery/archive/ + 7+7 templates + MANIFEST.json |
| STORY-066-02 | Step 2.6c parent rollup at close (block on halt) + `cleargate sprint reconcile-lifecycle --parents` (audit-only) + `setFrontmatterStatusAtomic` raw-bytes helper | .cleargate/scripts/close_sprint.mjs (+ canonical mirror) + cleargate-cli/src/commands/sprint.ts + cleargate-cli/src/cli.ts |
| STORY-028-05 | mcp/ test runner: node:test with --test-concurrency=1 --experimental-test-module-mocks; vitest devDep + config removed | mcp/ (nested git repo) inner commit b14e23e |

## Mid-Sprint Amendments

_(populated by Architect on CR:scope-change or CR:approach-change; never rewrite, only append. Format: '<ISO-ts> · <ID> · <one-line note>')_

2026-05-18T00:00:00.000Z · STORY-067-01-arch · Architect post-flight raised 4 advisory risks for STORY-067-02 dispatch: (1) walk is non-recursive — subdirectories of pending-sync/archive are not traversed; (2) single-status-line break — only first frontmatter status: line is rewritten, multi-line values silently ignored; (3) dry-run output should be piped to audit log before --apply runs in CI; (4) exit-handler removal — process.on('exit') lock cleanup removed from final build; review before STORY-067-02 wires CI step.
2026-05-18T21:04:56.000Z · STORY-028-04-arch · Architect post-flight (PASS) raised 3 advisory items for STORY-028-05/-06/-07 dispatch: (1) pre-flight grep for `.each(` — test.each/describe.each are not converted by the codemod and must be detected before bulk apply; (2) pre-flight grep for `expect.assertions|expect.hasAssertions|expect.extend` — these are not mapped and require manual-fix handling; (3) test-glob bleed deferral to STORY-028-08 — `test/fixtures/**` matches cleargate-cli/package.json test script glob; recommended fix: exclude `test/fixtures/**` from the test script before running the codemod at scale.
2026-05-18T21:35:37.000Z · STORY-067-02-arch · Architect post-flight (PASS). Phase B completed cleanly — 114 archive flips, 7+7 template edits, three-way mirror parity verified. Two policy decisions: (a) 36 flagged-for-review items deferred to SPRINT-29 backlog cleanup (NOT folded into STORY-067-03 scope); (b) sprint_report.md prose "Done" refs at lines 36+75 confirmed intentional (state.json vocabulary domain, distinct from artifact-status domain — out of scope for CR-067). STORY-067-03 dispatch brief MUST flag the gap between story §1.2 prose ("tighten to {Completed} only") and codebase reality at lifecycle-reconcile.ts:27-36 (8-element set including Resolved/Closed/Abandoned) — Architect to reconcile before bulk-pruning the set.
2026-05-17T22:55:25.000Z · STORY-066-02-arch · Architect post-flight (PASS). CR-066 Phase B foundations clean: Step 2.6c block-mode + `--parents` audit-only flag both wired. Three advisories for Wave 3: (1) STORY-028-01 MUST run `cd cleargate-cli && npm run build` before close_sprint.mjs (defensive guard at :446 no-ops on stale dist); (2) STORY-028-01 should run `--parents` audit-only first then close_sprint.mjs (block on halts); (3) SPRINT-29: extract close_sprint.mjs to single shared module. STORY-067-03 forward-compat: parent-rollup.ts reads ARTIFACT_TERMINAL_STATUSES via re-export — tightening safe.
2026-05-17T22:55:25.000Z · STORY-028-05-arch-1 · STORY-028-06 dispatch addendum: inherit the runner-flag pair `--test-concurrency=1 --experimental-test-module-mocks` as the baseline test-script template; bump manual-fix escalation threshold from 20→40 given the 3× file-count scale (138 vitest files vs mcp/'s 50). STORY-028-07 dispatch unchanged (small + clean). Architect frames as template reuse not new behavior — orchestrator may pass via dispatch text rather than M-plan amendment.
2026-05-17T22:55:25.000Z · STORY-028-05-arch-2 · Deploy advisory for SPRINT-28 close: inner commit b14e23e is in mcp/'s git history but NOT pushed to mcp/'s origin. Coolify deploys mcp/ from mcp/'s main, so the refactor will NOT ship to https://cleargate-mcp.soula.ge/ at sprint close. This is correct (no runtime change), but Reporter MUST surface this in REPORT.md and human decides mcp/ push timing separately.

---
sprint_id: "SPRINT-44"
created_at: "2026-11-10T06:22:14.265Z"
last_updated: "2026-11-10T06:30:00.000Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Ship `cleargate dashboard`: one local page where the owner sees every open work item, assembles the next sprint, and follows the running one, with `cleargate sprint add|remove` as the single write path for sprint membership.

## Goal Acceptance Check

Confirmed by the owner at Gate 2, 2026-11-10 ("4. yes"). The goal is met when all five hold on the integrated tree:

1. With no `.cleargate/sprint-runs/.active` sentinel, `cleargate dashboard --open` serves a page with Backlog, Plan and Sprint tabs, and the Backlog lists the repo's pending-sync items with gate badges.
2. `cleargate sprint add <draft-sprint> <ids> --json` followed by `cleargate sprint remove` round-trips, and `git diff` on the touched files shows only frontmatter list, `sprint_cleargate_id` and stamp changes.
3. `POST /plan` without the launch token returns 403; with it, a Plan-tab commit changes membership exactly as the command does.
4. `npm run typecheck` and `npm test` are green in `cleargate-cli/`.
5. After the Gate 4 rebuild and live re-sync, `node cleargate-cli/dist/cli.js doctor` reports no scaffold drift for the sprint-dashboard skill.

## Locked Versions

| Package | Version |
|---------|---------|
| Node    | `>=24.0.0` |
| TypeScript | `^5.8.0` |
| cleargate (cli) | `0.27.0` at sprint start; release `0.28.0` after Gate 4 |

No story adds a dependency (EPIC-062 rule). `crypto` is Node built-in.

## Test Stack

| Field | Value |
|-------|-------|
| Backend runner    | Full suite: `npm test` in `cleargate-cli/` (merge lane only). Single files: `npm run test:file -- <file>` (adds `--experimental-test-module-mocks`; bare `tsx --test` fails mock.module files). |
| Frontend runner   | none (the dashboard is server-rendered HTML; client script is asserted from `render.node.test.ts`) |
| Typecheck command | `npm run typecheck` (`tsc --noEmit`) in the cli worktree |
| Red-test naming   | `*.red.node.test.ts` (integration-layer reds: `*.red.integration.node.test.ts`) |

Run full suites with a short private `TMPDIR` (flashcard 2026-11-07 #qa #macos / #test-harness). Never run two full suites at once (fixed ports in `cr097`/`cr101` tests).

## Cross-Cutting Rules

From EPIC-062 `<architecture_rules>`:

1. Extend `cleargate-cli/src/dashboard/**`; no second server, port or daemon.
2. The Sprint tab renders today's `collect()` output unchanged; `SprintDashboardData` stays backward-compatible (it is the `/data` contract and the snapshot input).
3. The page never writes a file itself. `POST /plan` calls the same `sprintScopeHandler` as the CLI, in-process.
4. `sprint add|remove` refuses Active or Completed sprints and stale `--expect` hashes, touching nothing.
5. Edit frontmatter only through `src/lib/frontmatter-locator.ts`; never regex-rewrite YAML, never re-dump the whole block with `yaml.dump` (drops comments and reformats `|` values — flashcard 2026-09-26 #frontmatter #sprint-init).
6. Every source degrades to an empty panel plus a visible diagnostics entry, never a throw and never a silent blank (CR-097).
7. Server stays bound to `127.0.0.1`; every POST needs the per-launch token and a loopback `Origin`/`Host`, else 403.
8. No new runtime dependency; zero-network, self-contained HTML.
9. Tests are `*.node.test.ts` under node:test; new server tests take port 0.

Execution (owner ruling (a), Gate 2 2026-11-10; same layout as SPRINT-41 rule 19):

10. **Worktrees.** `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate`, `CLI` = `OUTER/cleargate-cli`. Each item has an outer host `OUTER/.worktrees/<ID>` (`-b story/<ID> sprint/S-44` for STORY-062-01, which has one outer `.gitignore` line; `--detach sprint/S-44` for the cli-only items 02/03/04) and a nested cli worktree `OUTER/.worktrees/<ID>/cleargate-cli` (`-b story/<ID> <base from plans/waves.json>`). Setup, by the orchestrator, serially: `ln -s CLI/node_modules <cli wt>/node_modules`; `ln -s OUTER/.claude <outer wt>/.claude` (`/.claude` is in `OUTER/.git/info/exclude`); `(cd <cli wt> && npm run prebuild)`. Never `npm install`/`npm ci` in a worktree. **No agent edits files in the cli main checkout** — it stays on `main` and is the merge lane.
11. **Concurrency.** At most 4 build lanes and 1 merge lane. Build lanes run typecheck plus targeted test files only; the full `npm test` runs only in the merge lane. Invoke scripts as `ORCHESTRATOR_PROJECT_DIR=OUTER bash OUTER/.cleargate/scripts/run_script.sh …`. Dispatch briefs name the work-item id on line 1.
12. **Contracts (CR-124).** C1 `contract/S-44-shell` (owner 01), C2 `contract/S-44-backlog` (owner 02, on C1), C3 `contract/S-44-scope` (owner 03), C4 `contract/S-44-plan` (C2 merged with C3). Frozen exports are in sprint plan §2.1. Owners replace stub bodies, never rename or retype a frozen name.
13. **Integration.** An item integrates only after every `upstream` item has merged into cli `main`: in its cli worktree `git merge --no-ff main`; the owner's file wins and the item re-applies its insertions; a conflict inside an existing or red test goes to QA-Red, never the Developer. Re-run `prebuild`, typecheck and the item's tests, then QA-Verify on the integrated tree. If `main` moves before the merge, integrate again.
14. **Merge.** Order 01 → 03 → 02 → 04. DevOps merges `story/<ID>` into cli `main` with `--no-ff` (local only — no push, no publish during the sprint), runs the full suite in the cli main checkout, and for 01 also merges the outer `story/STORY-062-01` into `sprint/S-44`. Teardown: both `git status --porcelain` empty, remove the cli worktree first, then the outer worktree.
15. **Detached hosts.** For cli-only items the outer host is detached, so the Developer cannot tick Task Breakdown rows in the story file; the orchestrator ticks them at merge (flashcard 2026-09-27 #worktree #task-breakdown).
16. **Live surfaces.** `/.claude/**` re-sync and the `dist` rebuild are deferred to Gate 4 (dogfood split). STORY-062-04 edits only the canonical `scaffold/hosts/claude/.claude/skills/sprint-dashboard/SKILL.md`.

## Active FLASHCARD Tags

- `#dashboard` — §1 tables parsed by header name; escaped `\|` cells; the dashboard groups by the plan's first Story ID+Title table.
- `#test-harness #ports` — cr097/cr101 bind fixed ports; never run two full suites at once.
- `#frontmatter` — locator throws on malformed framing; `yaml.dump` re-dumps drop comments; the stamp hook unquotes scalars.
- `#worktree` — detached cli-only hosts; nested cli worktrees; contracts fast-forward to the owner's integrated commit.
- `#sdr #collision-surface` — keep new files out of the "New Files Needed" cell.

## Adjacent Implementations (Reuse First)

| Story | Module / Export | Path |
|-------|----------------|------|
| (existing) | `locateFrontmatter`, `frontmatterYaml`, `withFrontmatterYaml` | `cleargate-cli/src/lib/frontmatter-locator.ts` |
| (existing) | `parseFrontmatter` | `cleargate-cli/src/wiki/parse-frontmatter.ts` |
| (existing) | `detectWorkItemTypeFromFm` | `cleargate-cli/src/lib/work-item-type.ts` |
| (existing) | `stampFrontmatter`, `gateCheckHandler`, `wikiIngestHandler` | `cleargate-cli/src/lib/stamp-frontmatter.ts`, `src/commands/gate.ts`, `src/commands/wiki-ingest.ts` |
| (existing) | `findSprintPlanFile`, `resolveActiveSprint` | `cleargate-cli/src/commands/sprint-file-locate.ts` |
| (populated as stories merge) | | |

## Mid-Sprint Amendments

_(append only: '<ISO-ts> · <ID> · <one-line note>')_
- 2026-11-10T07:05Z · STORY-062-04 · CR:spec-clarification from M2 plan: bodyOutOfDate excludes epics (stories ∪ bugs ∪ crs ∪ proposals vs §1 ids minus EPIC-*); remove→add commit not atomic, refusal after a write returns `partial`; §3.1 adds the gen:codex SKILL.md copy and four red test files.
- 2026-11-10T07:35Z · STORY-062-03 · CR:spec-clarification (M1 decision 1): a claim by a Completed/archived/missing sprint is stale — `add` reassigns with a warning; only an open sprint's claim refuses. New @rules scenario. R9 clarified per M2 risks: sha = raw bytes after stamp/gate/ingest; paths from cli.cwd; exit seams; no import of commands/sprint.ts.
- 2026-11-10T07:35Z · STORY-062-04 · R2 clarified to match: stale claims are enabled rows with a "will be reassigned" warning.
- 2026-11-10T07:35Z · STORY-062-01 · CR:spec-clarification (M1 decision 2): `src/commands/init.ts` joins §3.1 for one generated-gitignore line `/.dashboard.json`.
- 2026-11-10T07:35Z · orchestrator · M1 decision 3: `sprint close` keeps stopping the dashboard. Decision 4: Goal Check 2's demo uses yaml fixed-point files; whole-block re-dumps by stamp/gate on non-normalized files count as stamp changes; follow-up CR for line-level stamp/gate writers at close. Decision 5: new red files use `*.red.node.test.ts`; QA-Red edits existing test files only where an existing assertion must change; §3.1 amended with the red file names once written.
- 2026-11-10T09:20Z · merge order · Rule 14's order changes to 03 → 01 → 02 → 04 (orchestrator decision; SDR §2.2 "either works"; Architect post-flight 03 confirmed with merge-tree previews). 01 integrates `main` (with 03) and re-runs QA-Verify before its merge. waves.json layering is unchanged (both are layer 0).
- 2026-11-10T11:45Z · STORY-062-04 · Defect found in 02 post-flight: 04's Plan tab disables stale claims (M2 predates the R2 clarification). Route: Architect amends M2 → QA-Red adds a red file for the stale-claim rows → 04 Developer integrates main + fixes. Also R1: Abandoned sprints are excluded from the Plan picker (orchestrator decision).
- 2026-11-10T12:05Z · STORY-062-04 · M2 amended (§A1–A5): plan.ts mirrors sprint-scope's stale-claim classification (no sprint file → Completed → archived; else open); Abandoned excluded from the picker; a claim BY an Abandoned sprint stays "open" (matches sprint add). New red file plan-stale-claims.red.node.test.ts; QA-Red re-scopes plan.red A4 fixture (adds the missing SPRINT-42 file). Follow-ups for close: A-2 (Abandoned claims as stale, needs 03+04 change) and A-3 (export the classifier from sprint-scope.ts).

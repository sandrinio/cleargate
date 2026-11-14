---
sprint_id: "SPRINT-45"
created_at: "2026-11-14T08:13:39.707Z"
last_updated: "2026-11-14T08:30:00.000Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Make the sprint report's rework and cost figures come from what actually happened (the host's subagent transcripts and git), and make `cleargate upgrade` safe for repos with local edits, proven against a holdout recount of SPRINT-44 and dispenser_adapter's sprints.

## Goal Acceptance Check

Confirmed by the owner at Gate 2, 2026-11-14 ("approved. please execute"). The goal is met when all three hold on the integrated cli `main`:

1. **Measured matches the recount.** The canonical `sprint_metrics.mjs`, run by path against SPRINT-44 and dispenser_adapter SPRINT-01 and SPRINT-02, gives a rework total within 10% of the holdout's judged figures (3, 4 and 8), with no item off by more than one round, and `unattributed.share` ≤ 0.05 (at least 95% of subagent tokens attributed). dispenser_adapter SPRINT-03 is recounted by hand at check time and held to the same bar. The orchestrator or QA-Verify compares; the result goes to `sprint-runs/SPRINT-45/evidence/`.
2. **Upgrade is safe on a real customised repo.** A packed RC built from cli `main`, run against a fresh copy of dispenser_adapter (never the real repo): `cleargate upgrade --dry-run` lists only files that change and names every file whose local edits it replaces; `cleargate upgrade --yes` leaves `.claude/settings.json` hook order intact, so `git diff` there shows only hooks ClearGate added, removed or changed.
3. **The report reads the measurement.** SPRINT-45's own close report §3 fills its rework, first-pass and cost rows from the bundle's `## Measured Metrics` section.

## Locked Versions

| Package | Version |
|---------|---------|
| Node    | `>=24.0.0` |
| TypeScript | `^5.8.0` |
| cleargate (cli) | `0.30.1` at sprint start. No release this sprint: the RC is an unpublished tarball. |

No item adds a runtime dependency (EPIC-064 rule). Node built-ins only.

## Test Stack

| Field | Value |
|-------|-------|
| Backend runner    | Full suite: `npm test` in a cli tree (merge lane only, see rule 16). Single files: `npm run test:file -- <file>` (adds `--experimental-test-module-mocks`; bare `tsx --test` fails mock.module files). |
| Frontend runner   | none |
| Typecheck command | `npm run typecheck` (`tsc --noEmit`) in the cli worktree |
| Red-test naming   | `*.red.node.test.ts` (integration-layer reds: `*.red.integration.node.test.ts`) |

Run full suites with a short private `TMPDIR` (flashcard 2026-11-07 #qa #macos). Never run two full suites at once (fixed ports in the `cr097`/`cr101` tests).

## Cross-Cutting Rules

From EPIC-064 `<architecture_rules>`:

1. **Read-only derivation.** Never write `events.jsonl`, never add an event kind, never edit `state-events.mjs` (its `fold()` moves `updated_at` before the kind switch, so an unknown kind breaks every later `update_state.mjs` call).
2. `state.json` `qa_bounces`/`arch_bounces` stay as they are. The report shows derived numbers and names a counter only where the two disagree.
3. **Never fail a close.** A missing transcript directory, a missing repo or an unparseable row is a warning plus exit 0 and a visible "not measured" line, never a throw. "Not measured" is never rendered as 0.
4. **Canonical edits only:** `cleargate-cli/scaffold/core/.cleargate/**`, `cleargate-cli/scaffold/hosts/claude/.claude/**` and `cleargate-cli/src/**`. The live copies in the meta-repo do not change in this sprint (rule 9).
5. No new runtime dependency. Tests are `*.node.test.ts` under node:test in `cleargate-cli/test/`.
6. `count_tokens.mjs` and `prep_reporter_context.mjs` keep their positional `<sprint-id>` with no required flags (`close_sprint.mjs` Step 3.5 calls them). `count_tokens.mjs --json` keeps its keys and only adds.
7. The six rows `close_sprint.mjs` requires (Fast-Track Ratio, Fast-Track Demotion Rate, Hotfix Count, Hotfix-to-Story Ratio, Hotfix Cap Breaches, LD events) stay in the report template.

Hand-applied INITIATIVE-002 rules (sprint plan, Execution Guidelines):

8. **Proof per item.** An item is Done only when the evidence in its sprint-plan Proof column exists, recorded in its DevOps report or in `sprint-runs/SPRINT-45/evidence/`.
9. **Fixed roster, loop unchanged.** The six items are the roster. Anything found mid-sprint goes to `sprint-runs/SPRINT-45/intake.md` and enters only with the owner's recorded OK. No edit to live `/.claude/**` or live `.cleargate/{scripts,knowledge,templates}` during the sprint; no live re-sync at Gate 4 (it follows the dispenser_adapter verdict).
10. **Holdout.** QA-Red and Developer dispatches never read `sprint-runs/SPRINT-45/holdout/`. Only QA-Verify or the orchestrator compares against it.
11. **Fixtures are scrubbed.** Transcript fixtures under `test/fixtures/subagent-ledger/` and `test/fixtures/sprint-metrics/` are synthetic or scrubbed: no prompt text, user paths or names.

Execution (owner, Gate 2 2026-11-14; the SPRINT-44 ruling (a) layout; the full plan of record is `plans/waves.json`):

12. **Worktrees.** `OUTER` = `/Users/ssuladze/Documents/Dev/ClearGate`, `CLI` = `OUTER/cleargate-cli`. Each item has a detached outer host `OUTER/.worktrees/<ID>` (`git worktree add --detach … sprint/S-45`; no item has an outer change) and a nested cli worktree `OUTER/.worktrees/<ID>/cleargate-cli` (`git -C CLI worktree add <path> -b story/<ID> <base from waves.json>`). Setup, by the orchestrator, serially: `ln -s CLI/node_modules <cli wt>/node_modules`; `ln -s OUTER/.claude <outer host>/.claude`; `(cd <cli wt> && npm run prebuild)`. Never `npm install`/`npm ci` in a worktree. **No agent edits files in the cli main checkout.**
13. **Concurrency.** At most 4 build lanes and 1 merge lane. Build lanes run typecheck plus targeted test files only. Invoke scripts as `ORCHESTRATOR_PROJECT_DIR=OUTER bash OUTER/.cleargate/scripts/run_script.sh …`. Dispatch briefs name the work-item id on line 1.
14. **Contracts (CR-124).** C1 `contract/S-45-ledger` (owner CR-120, base cli `main`) and C2 `contract/S-45-metrics` (owner STORY-064-01, on C1). Frozen exports are in `plans/waves.json` `contracts[]`. Owners replace stub bodies; never rename or retype a frozen name, never make a reader async, never change C2's exit codes (0 runs, 2 usage), its `CLEARGATE_SPRINT_DIR` override or the meaning of "not measured". `unattributed.share` is a token fraction in [0, 1].
15. **Integration.** An item integrates only after every `upstream` item has merged into cli `main`: in its cli worktree `git merge --no-ff main`; the owner's file wins and the item re-applies its insertions; a conflict inside an existing or red test goes to QA-Red, never the Developer. Then `npm run gen:codex` (must leave no diff), `prebuild`, typecheck and the item's tests, then QA-Verify on the integrated tree. If `main` moves before the merge, integrate again.
16. **Merge.** Order CR-120 → STORY-064-01 → BUG-117 → BUG-133 → BUG-134 → STORY-064-02, taken as items pass QA-Verify subject to upstream. DevOps merges `story/<ID>` into cli `main` with `--no-ff` (local only — no push, no publish). **No `dist` rebuild on cli `main`** (five live hooks run `CLI/dist/cli.js`): the post-merge full suite runs in a throwaway cli worktree at `main`'s tip. Teardown: both `git status --porcelain` empty, remove the cli worktree first, then the outer host.
17. **Known reds.** Canonical-live parity breaks by design: `canonical-live-parity` 5d is red from the CR-120 merge, 5a and 5c from the STORY-064-02 merge, and doctor prints scaffold-drift lines from the first canonical merge. `template-stubs.integration.node.test.ts:211` (sprint_report.md live === mirror) also goes red from the STORY-064-02 merge, and `sprint-execution-mirror.integration.node.test.ts:216-246` (live vs canonical SKILL.md diff) from the CR-120 merge (amendments 2026-11-14). Pre-existing failures at cli dbccc79 (dist built in a throwaway tree) are listed in `evidence/baseline-failures-dbccc79.txt`; a failure in that list is not a merge regression. Each is logged in sprint plan §6 when it starts; DevOps confirms the full-suite failures are exactly those. Never hand-port live.
18. **Codex companions.** `prebuild` runs `build-codex-payload.mjs --check`. CR-120 owns the generated `scaffold/core/.agents/skills/sprint-execution/SKILL.md` and `scaffold/hosts/codex/.codex/hooks/token-ledger.sh`; STORY-064-02 owns `scaffold/hosts/codex/.codex/agents/reporter.toml`. Regenerate with `npm run gen:codex`, never hand-edit.
19. **Detached hosts.** The Developer cannot tick Task Breakdown rows in the item file; the orchestrator ticks them at merge.
20. **Proof runs.** Run proofs with the canonical scripts by path from a cli tree, never the live copies; set `CLEARGATE_SPRINT_DIR` (and `CLEARGATE_PENDING_SYNC_DIR` for `prep_reporter_context.mjs`) to the target sprint. `npm pack` runs no lifecycle script: `npm run prebuild && npm run build` first. RCs run against a fresh copy of dispenser_adapter only.

## Active FLASHCARD Tags

- `#ledger #transcripts #workflow` — workflow agents write to `<session>/subagents/workflows/<run>/`; resumed sessions copy `.meta.json` without the `.jsonl` (count only agents with a transcript, dedupe by `toolUseId`); "dispatches minus one" overcounts rework ~4x.
- `#upgrade #hash #classify` — a hooks-only settings hash must reach MANIFEST, snapshot and current-file sha; `classify()` calls user artifacts `untracked`; reds that fake install hashes go vacuous.
- `#codex` — upgrade never calls the codex adapter's install; generated Codex copies fail `prebuild --check` when stale.
- `#test-harness` — dynamic-import not-yet-existing modules per test; import `.mjs` drivers in a child process; never stub `dist/cli.js` through a symlinked cli; `CLEARGATE_NO_UPDATE_CHECK=1` for subprocess doctor runs.
- `#worktree` — detached cli-only hosts; nested cli worktrees; contracts fast-forward to the owner's integrated commit.

## Adjacent Implementations (Reuse First)

| Story | Module / Export | Path |
|-------|----------------|------|
| (existing) | `count_tokens.mjs` child-process call pattern | `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs` (~:247) |
| (existing) | ledger digest | `cleargate-cli/scaffold/core/.cleargate/scripts/lib/ledger-digest.mjs` |
| (existing) | work-item id matching | `cleargate-cli/scaffold/core/.cleargate/scripts/lib/work-item-id.mjs` |
| (existing) | `mergeSettings`, `removeClearGateHooks` | `cleargate-cli/src/init/merge-settings.ts`, `cleargate-cli/src/lib/settings-json-surgery.ts` |
| (existing) | `computeUsd`, `PRICING_TABLE` | `cleargate-cli/src/lib/pricing.ts` |
| (populated as stories merge) | | |

## Mid-Sprint Amendments

_(append only: '<ISO-ts> · <ID> · <one-line note>')_
- 2026-11-14T08:05Z · BUG-117 · CR:spec-clarification at kickoff: price table re-grounded against the claude-api reference cached 2026-11-03 — Fable 5.2 ($8/$40, cache read 0.20) and Haiku 5.5 ($0.10/$0.50) added, Sonnet 5.5 cache read 0.20 → 0.10. Outline now has seven rows.
- 2026-11-14T08:45Z · STORY-064-02 · CR:spec-clarification SC-1 (R2 failure line + 'not measured' rows fall back to git; prep_reporter_context warns, never exits 1 on a missing ledger — BUG-081) and SC-2 (§3.1 adds prep-reporter-measured-metrics.red and reporter-measured-metrics.red test files).
- 2026-11-14T08:45Z · STORY-064-01 · CR:spec-clarification SC-3 (R10): totals cover every dispatch read; share = unattributed.tokens / totals.tokens; totals.rework sums items; sources.repos lists only repos read. No C2 key renamed or retyped.
- 2026-11-14T08:45Z · STORY-064-02 · known red added (orchestrator, same class as the Gate-2 parity reds): `template-stubs.integration.node.test.ts:211` sprint_report.md live === mirror goes red at the STORY-064-02 merge with parity 5a, for the same rule-9 cause. No hand-port, no test edit. Rule 17 now lists four.
- 2026-11-14T08:45Z · close · Goal check 3 recipe (M2 OD-C): before close Step 3.5, run the canonical prep_reporter_context.mjs by path for SPRINT-45 (CLEARGATE_SPRINT_DIR + CLEARGATE_PENDING_SYNC_DIR), keep it as evidence/STORY-064-02/SPRINT-45.reporter-context.canonical.md, let Step 3.5 write the live bundle, and hand the Reporter the canonical `## Measured Metrics` section, M2's step-6 text and the canonical template path. Never edit live.
- 2026-11-14T09:45Z · M1 · CR:spec-clarifications from the M1 plan: C-1 CR-120 (red file name, hook snapshot lock moves to token-ledger.cr-120.sh, skill-md-serial-pointers Test 20 re-scoped, three whitelist rows); C-2 STORY-064-01 (red file names; a description naming two or more roster items is unattributed); C-3 BUG-133 (dry run omits unchanged files except host surgery targets, one `[dry-run] <U> unchanged (not listed)` line; merge-3way local-edit labels; changelog notes after the plan via extractUpgradeNotes — implements Goal check 2's 'lists only files that change'); C-4 BUG-134 (mergeUpstreamSettings on upgrade's take path only; user-only events keep their placement).
- 2026-11-14T09:45Z · CR-120 · known red added (same class as the Gate-2 parity reds): sprint-execution-mirror.integration :216-246 (live vs canonical SKILL.md) from the CR-120 merge. hooks-snapshots and skill-md-serial-pointers Test 20 are NOT known reds — CR-120 fixes them in-item.
- 2026-11-14T09:45Z · BUG-117 · merged to cli main cd54e93; full suite at the tip: 80 failures, all pre-existing at dbccc79 (list in evidence/baseline-failures-dbccc79.txt).
- 2026-11-14T10:40Z · BUG-134 · approach change (Architect post-flight FAIL on e4a4094, arch_bounces=1): PF-1 event placement as built is accepted; PF-2 an upstream hook group pairs only with an ours group holding a ClearGate hook or an equal command, so user groups sharing a matcher are never folded; PF-3 dedupe only string commands. QA-Red re-scopes red 3 and adds 3b, 3c, 9b. Spec text unchanged. M1 BUG-134 "Post-flight amendments" governs.
- 2026-11-14T10:40Z · STORY-064-01 · plan deviation accepted by the orchestrator: matchItem takes the union of full-ID and short-form candidates (spec R3 / C-2 and the red test require it); M1 R3 step 2 "short forms only when no full ID matched" is superseded.
- 2026-11-14T11:30Z · STORY-064-01 · CR:spec-clarification SC-4 (R3 sprint-level): also sprint-level when an item-less description names a playbook sprint stage (M<N>, contract, consolidation, cleanup, simplify, walkthrough, wiki, contradiction) or the sprint's own ID, or its agent type is sprint-only (architect-reader, architect-synth, reporter, cleargate-wiki-query, cleargate-wiki-contradict, code-simplifier, any plugin prefix). Trigger: the post-integration SPRINT-44 smoke gave unattributed.share 0.0915 from six sprint-stage dispatches. Disclosure: informed by SPRINT-44's descriptions; dispenser SPRINT-03 (not yet recounted) stays the untuned check for Goal check 1. Rework round on 064-01 before merge (QA-Red rows, then Developer).
- 2026-11-14T09:55Z · STORY-064-01 · goal-check defects found after merge, fixed in-sprint on `story/STORY-064-01-r2` (off cli main 6ad41e8) — CR:spec-clarification SC-5 (R7: every dispatch is windowed, ledger-sourced sessions included; dispenser S02 read share 0.481 because a ledger-named session also held S03 workflows) and SC-6 (R4: planned passes counted per item across red + Build; dispenser S01 001-02/03 counted a planned Developer pass 2 as rework). Orchestrator scratch simulation with both: SPRINT-44 3/3, S01 4/4, S02 8/8 per item vs holdout judged; S02 share 0.075 from SPIKE-001 prototype work in the same session (holdout also lists it as non-sprint). Disclosure: both informed by holdout S01/S02; dispenser S03 stays the untuned check.

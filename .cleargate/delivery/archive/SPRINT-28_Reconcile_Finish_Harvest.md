---
sprint_id: SPRINT-28
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-28
carry_over: false
lifecycle_init_mode: warn
remote_id: null
source_tool: local
status: Active
approved: true
approved_by: sandrinio
approved_at: 2026-05-17T00:00:00Z
activated_at: 2026-05-17T16:45:00Z
completed_at: null
execution_mode: v2
start_date: 2026-05-19
end_date: 2026-06-01
created_at: 2026-05-16T00:00:00Z
updated_at: 2026-05-16T20:00:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
area: cli,scripts,tests,templates,migration,reconciler
context_source: |
  Planned 2026-05-16 after SPRINT-27 close. Re-shaped 2026-05-17 after user
  resolved CR-066's three Open Questions:
    Q1 (auto-flip if epic goal met) → auto-flip on 100% coverage, no human ack
    Q2 (1 meaning of done = "Completed") → spawned CR-067 vocab migration
    Q3 (block close) → CR-066 Step 2.6c is hard-block by default
    Q4 (sub-epic rollup) → recursive walk; DEFERRED excluded from denominator
    Q7 (add STORY-027-06) → deferred to SPRINT-29 (capacity overflow)
    Q8 (no vitests) → spawned EPIC-028 full vitest elimination; CR-029 abandoned

  Q2 + Q8 added ~8 stories of foundation work. User selected (via
  AskUserQuestion 2026-05-17) "Accept the trim — defer EPIC-012, EPIC-021
  audit, STORY-027-06 to SPRINT-29" — SPRINT-28 becomes a focused foundation
  + closeout sprint.

  Theme: "Reconcile, finish, harvest" remains. Substitute EPIC-012 harvest
  with the two new foundations (CR-067 vocab + EPIC-028 vitest):

    Thread A — Reconciler (CR-066): teach sprint close to roll children's
    statuses up to their parent Epic/Sprint. Block close on partial coverage,
    auto-flip on 100%, recurse into sub-epics.

    Thread B — Vocabulary unification (CR-067): "Done" / "Verified" → "Completed"
    across templates + gate-checks + scripts + ~113 archived items. Forward-only
    plus one-pass migration. Tightens CR-066's terminal set to {Completed} at
    Phase C.

    Thread C — Test runner unification (EPIC-028): 222 vitest files → node:test
    across mcp/ (50) + cleargate-cli/ (138) + admin/ (34). Delete vitest configs,
    remove vitest from package.json. After: one test runner, no two-runner state.

    Thread D — Finish (STORY-010-02 + BUG-004 + STORY-028-01 dogfood): close
    EPIC-010 with its last outstanding story; fix BUG-004 wiki-lint backtick;
    dogfood CR-066 on the six stale Epics surfaced 2026-05-16.

  Items in scope: CR-066 + CR-067 + EPIC-028 + STORY-010-02 + BUG-004 +
  STORY-028-01 (harvest) = 6 items, ~13 stories at SDR.

  Deferred to SPRINT-29:
    - EPIC-012 harvest (STORY-028-03/-04/-05): admin UI SprintDetail.svelte,
      FLASHCARD project-metadata sync, `cleargate pull SPRINT-NN` write-back
    - STORY-028-02: EPIC-021 audit + decompose-or-abandon
    - STORY-027-06: `cleargate lint` + frontmatter-schema parser (L3, from
      SPRINT-27 deferred)
    - STORY-027-07: `@cleargate/types` shared npm package (from SPRINT-27
      deferred)
    - EPIC-023 sub-epic 2 (sprint plan/report unified sync, partly absorbed
      by CR-064)
    - EPIC-023 sub-epic 4 (`cleargate sync --scope`)
    - SPRINT-07 (EPIC-010 v1.1 deferrals)

  CR-029 abandoned 2026-05-17 (superseded by EPIC-028).
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-16T21:01:20Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id SPRINT-28
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-16T23:31:17Z
  sessions: []
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-16T23:31:35.484Z
push_version: 1
---

# SPRINT-28: Reconcile, Finish, Harvest

## 0. Stakeholder Brief

- **Sprint Goal:** Three foundation tracks — sprint-close parent reconciliation (CR-066), status-vocabulary unification to `Completed` (CR-067), and full vitest elimination (EPIC-028) — plus EPIC-010 closeout (STORY-010-02), wiki-lint bugfix (BUG-004), and a one-shot reconciler harvest pass against the six stale epics surfaced 2026-05-16.
- **Business Outcome:** (a) Sprint close stops leaking stale Epic statuses — six rotting epics get reconciled in one pass, and every future sprint maintains parent state automatically. (b) ONE and only one meaning of "done" across all artifact types — `Completed`. Reconciler and gate-check simplify; cross-artifact audit queries collapse to one terminal label. (c) ONE test runner in the repo — node:test only. Two-runner cognitive overhead eliminated; vitest dep + configs removed. (d) EPIC-010 formally completes after STORY-010-02 ships. (e) BUG-004 closes.
- **Risks (top 3):** EPIC-028 is the largest scope item — 222 file conversions in three batches; risk of svelte-testing-library incompat in the admin/ batch (mitigated by early preflight). CR-067 migration touches ~113 archived frontmatters in one atomic commit — risk of race with concurrent `cleargate push` (mitigated by `.migration-lock` flock). CR-066's block-mode default could halt SPRINT-28's own close on partial-coverage epics (mitigated by Wave 3 harvest pass that resolves the six stale epics BEFORE Step 2.6c runs at SPRINT-28 close).
- **Metrics:** EPIC-028 reduces `node_modules` size ≥10% across all three packages. CR-067 collapses `TERMINAL_STATUSES` from a 3-element set to `['Completed']`. CR-066's harvest pass auto-flips EPIC-016 (6/6 → Completed) and halts on EPIC-010 partial / EPIC-021 zero-children / EPIC-023 sub-epic placeholders. STORY-010-02 closes EPIC-010 with `cleargate_pull_item` + `list_remote_updates` + `pull_comments` + `detect_new_items` shipped. `npm test` runs node:test only in all three packages; zero vitest references in any package.json.

## Sprint Goal

Ship three foundations (CR-066 parent reconciliation, CR-067 vocab unification, EPIC-028 vitest elimination) plus EPIC-010 closeout (STORY-010-02), BUG-004 fix, and STORY-028-01 reconciler harvest. Close the books before SPRINT-29 pulls EPIC-012 harvest + EPIC-021 audit forward.

## 1. Consolidated Deliverables

| ID | Type | Title | Lane | Bounce Exposure | Status |
|---|---|---|---|---|---|
| [[CR-066]] | CR | Sprint-close parent reconciler (`rollUpParentStatus` + Step 2.6c block-mode + `cleargate sprint reconcile-lifecycle --parents` flag + sub-epic recursion + zero-children skip) | standard | low | 🟢 |
| [[CR-067]] | CR | Status vocab unification — `Done`/`Verified` → `Completed` across templates + gate-checks + scripts + ~113 archived items; tighten `TERMINAL_STATUSES` to `['Completed']` | standard | med | 🟢 |
| [[EPIC-028]] | Epic | Vitest elimination — 222 files → node:test across mcp/ (50) + cleargate-cli/ (138) + admin/ (34); delete configs; remove vitest deps. 5 stories: codemod + 3 per-package batches + docs | standard | high | 🟢 |
| [[STORY-010-02]] | Story (EPIC-010, existing) | Four new MCP endpoints + generic `PmAdapter` interface (final EPIC-010 deliverable; sitting since 2026-04-19) | standard | med | 🟢 Approved |
| [[STORY-028-01]] | Story (CR-066 dogfood) | One-shot reconciliation pass over EPIC-010 / -012 / -016 / -021 / -023 / -026 — runs CR-066's new flag, commits auto-flips, captures halt-list for human ack | fast | low | **To draft @ SDR** |
| [[BUG-004]] | Bug (existing, Draft) | Scaffold wiki-lint agent YAML backtick — close the long-standing Draft | fast | low | Draft (lift to 🟢 @ Gate-1) |

**Decomposition note:** CR-066 splits into ~2 stories at SDR (lib + script/CLI wiring). CR-067 splits into ~3 stories (migration script + template/gate-check update + reconciler tighten). EPIC-028 splits into 5 stories per §7 (codemod + mcp/ + cleargate-cli/ + admin/ + docs). STORY-028-01 is a single fast-lane story. STORY-010-02 + BUG-004 are single-story items. Total ~13 stories.

**Cross-thread dependency note:**
- CR-066 Wave 1 must complete before STORY-028-01 (Wave 3 dogfood) can run.
- CR-067 Phase C (tighten `TERMINAL_STATUSES` to `['Completed']`) must land AFTER CR-066 ships AND after CR-067 Phase B archive migration completes. The tighten is one line in `lifecycle-reconcile.ts:28` — guarded by CR-067's own story.
- EPIC-028 is independent of CR-066/CR-067 (disjoint surfaces: tests vs frontmatter vs reconciler).
- STORY-010-02 is independent of all the above (mcp/ endpoints + adapter; touches only `mcp/src/endpoints/` + `mcp/src/adapters/`).

## 1.5 Items Deferred (not in scope)

> Acknowledged backlog — out of §1 so the preflight extractor doesn't pull these IDs as in-scope. All listed items remain in pending-sync; SPRINT-29 prep will pick from this list.

- **STORY-028-03/-04/-05** (EPIC-012 re-scoped harvest): admin UI SprintDetail.svelte, FLASHCARD project-metadata sync, `cleargate pull SPRINT-NN` write-back. User-visible value from SPRINT-27's MCP sync work; SPRINT-29 anchor candidate.
- **STORY-028-02** (EPIC-021 audit): zero STORY-021-* drafted but adjacent CRs shipped most scope; SPRINT-29 fast-lane.
- **STORY-027-06**: `cleargate lint` + frontmatter-schema parser (L3, deferred from SPRINT-27).
- **STORY-027-07**: `@cleargate/types` shared npm package (deferred from SPRINT-27).
- **EPIC-023 sub-epic 2** (sprint plan/report unified sync): partly absorbed by CR-064; re-evaluate at SPRINT-29 prep.
- **EPIC-023 sub-epic 4** (`cleargate sync --scope <all|work-items|sprints|reports>`): placeholder; needs decomposition pass before activation.
- **EPIC-023 sub-epic 3**: DEFERRED 2026-04-30 by user direction. Do not schedule.
- **SPRINT-07** (EPIC-010 v1.1 deferrals): revisit after STORY-010-02 lands.
- **CR-029**: abandoned 2026-05-17 (superseded by EPIC-028).
- **Full SPRINT-01..24 backfill push to MCP**: separate CR.

## 2. Execution Strategy (LOCKED at Architect SDR — 2026-05-17)

> SDR Phase A.4 binding output. SPRINT-28 in-scope IDs (10 new stories drafted + 3 existing): STORY-066-01, STORY-066-02, STORY-067-01, STORY-067-02, STORY-067-03, STORY-028-04, STORY-028-05, STORY-028-06, STORY-028-07, STORY-028-08, STORY-010-02, STORY-028-01, BUG-004. v2 execution mode.

### 2.1 Phase Plan

Three waves. Wave 1 runs three foundation tracks in parallel; Wave 2 applies the foundations sequentially within each track but parallel-safe across tracks; Wave 3 dogfoods + tightens + closes the sprint.

**Wave 1 — Foundation libs (parallel-safe across all four tracks):**

- **Track A (CR-066 lib):** `STORY-066-01` — `parent-rollup.ts` library + 5 fixture-shape tests. `parallel_eligible: y`. `lane: standard`. Predecessor for STORY-066-02 only.
- **Track B (CR-067 script):** `STORY-067-01` — `migrate-status-to-completed.mjs` + 6 fixture tests + push.ts lock-check edit. `parallel_eligible: y`. `lane: standard`. Predecessor for STORY-067-02 only.
- **Track C (EPIC-028 codemod):** `STORY-028-04` — vitest→node:test codemod tool + 6 golden-fixture tests. `parallel_eligible: y`. `lane: standard`. Predecessor for STORY-028-05/-06/-07.
- **Track D (EPIC-010 closeout):** `STORY-010-02` — four new MCP endpoints + generic `PmAdapter` interface. `parallel_eligible: y`. `lane: standard`. Independent of all foundations (disjoint surface = `mcp/src/endpoints/` + `mcp/src/adapters/`).
- **Fast lane (any wave):** `BUG-004` — single-line backtick fix in `cleargate-wiki-lint.md` + widen `assertMdFilesParseClean` scope. `lane: fast`. Can run in Wave 1 or any later wave.

**Wave 2 — Apply foundations (sequential within each track; parallel-safe across tracks):**

- **Track A → STORY-066-02** — close_sprint.mjs Step 2.6c insert + `--parents` CLI flag. Mirror parity in both close_sprint.mjs copies. Predecessor: STORY-066-01 merged + `npm run build` in cleargate-cli/ regenerates `dist/`.
- **Track B → STORY-067-02** — Phase B archive migration application + 8 templates updated (live + canonical) + prebuild verifies npm payload. Predecessor: STORY-067-01 merged. **Lock discipline:** orchestrator MUST NOT dispatch any `cleargate push` agent during this story's execution window (per Cross-Cutting Rule 4).
- **Track C → STORY-028-05, STORY-028-06, STORY-028-07 (serial within track, but track is parallel with A/B):**
  - STORY-028-05 (mcp/, 50 files) → STORY-028-06 (cleargate-cli/, 138 files) → STORY-028-07 (admin/, 34 files, preflight-gated for svelte compat).
  - Order is intentional: mcp/ flushes mock patterns first (smallest); cli/ second (largest, mostly DI); admin/ last (highest-risk preflight).

**Wave 3 — Dogfood + tighten + finish:**

- **STORY-028-01** (CR-066 dogfood harvest, `lane: fast`, `parallel_eligible: n`) — Predecessor: STORY-066-02 merged. Runs CR-066's `--parents` audit against the six stale Epics; commits auto-flips; captures halt-list. **Must complete BEFORE SPRINT-28's own close** (Cross-Cutting Rule 6) or Step 2.6c will halt close on EPIC-010 / EPIC-021 / EPIC-023.
- **STORY-067-03** (`lane: fast`, `parallel_eligible: n`) — Tighten `ARTIFACT_TERMINAL_STATUSES` to `{Completed}` + adapter README. Predecessors: STORY-067-02 merged (archive clean) AND STORY-066-02 merged (reconciler still passes against tightened set). Runs AFTER STORY-066-01's parent-rollup tests have proven the lib works with the tolerant set; tightening here closes the migration window.
- **STORY-028-08** (`lane: fast`) — Docs + agent prompts + FLASHCARD + no-vitest pre-commit guard. Predecessor: STORY-028-05/-06/-07 all merged. Last story of EPIC-028.

**Parallelization matrix (Wave-internal):**

| Wave | Concurrent stories (safe to dispatch in same window) |
|------|------------------------------------------------------|
| 1 | STORY-066-01 ∥ STORY-067-01 ∥ STORY-028-04 ∥ STORY-010-02 ∥ BUG-004 |
| 2 | STORY-066-02 ∥ STORY-067-02 ∥ (STORY-028-05 → -06 → -07 serial within track) |
| 3 | STORY-028-01 → STORY-067-03 → STORY-028-08 (strict serial; each predecessor blocks the next) |

### 2.2 Merge Ordering — Shared-File Surface

Every file touched by more than one in-scope story. Order column reflects the wave/story landing sequence.

| Shared File | Stories | Order | Rationale |
|---|---|---|---|
| `cleargate-cli/src/lib/lifecycle-reconcile.ts` | STORY-066-01 (re-export `rollUpParentStatus`+`walkActiveParents`) → STORY-067-03 (tighten ARTIFACT_TERMINAL_STATUSES + expected[] literals at lines 47/51/309/329) | -01 first, -067-03 last | -01 is additive (re-export); -067-03 mutates the constant. Sequencing keeps the tolerant set live during the migration window. |
| `cleargate-cli/src/commands/sprint.ts` | STORY-066-02 (`--parents` flag on reconcileLifecycleHandler) | (single) | Additive option; no other in-scope story touches this handler. |
| `cleargate-cli/src/commands/push.ts` | STORY-067-01 (`.migration-lock` check before frontmatter writes) | (single) | Top-of-handler guard; no other in-scope story modifies push. |
| `.cleargate/scripts/close_sprint.mjs` + `cleargate-planning/.cleargate/scripts/close_sprint.mjs` (mirror pair) | STORY-066-02 (Step 2.6c insert) | (single, both files in same commit) | Mirror-parity per FLASHCARD `#mirror #parity` (2026-05-04). `diff` must return empty post-commit. |
| `.cleargate/templates/{story,Bug,CR,epic,initiative,Sprint Plan Template,sprint_report,hotfix}.md` + `cleargate-planning/.cleargate/templates/*` (8 + 8 = 16 files) | STORY-067-02 | (single batch — all 16 in one commit) | Status-enum guidance update + npm payload regenerated via prebuild. |
| `mcp/src/adapters/README.md` | STORY-010-02 (creates file) → STORY-067-03 (appends Status Vocabulary Mapping section) | -010-02 first, -067-03 appends | -010-02 owns the file shape; -067-03 adds the mapping table. Per STORY-067-03 §1.5: if -010-02 has not yet shipped at -067-03 dispatch, -067-03 creates the file from scratch with the mapping section. |
| `mcp/package.json` | STORY-028-05 (remove vitest devDep + scripts) + STORY-010-02 (potentially add `js-yaml` per FLASHCARD `#mcp #deps`) + STORY-028-08 (add `check:no-vitest` script) | -010-02 first → -028-05 second → -028-08 last | -010-02 in Wave 1 (additive); -028-05 in Wave 2 (subtractive); -028-08 in Wave 3 (additive script only). |
| `cleargate-cli/package.json` | STORY-028-04 (add ts-morph devDep, Wave 1) → STORY-028-06 (remove vitest devDep + scripts, Wave 2) → STORY-028-08 (add `check:no-vitest` script, Wave 3) | -028-04 → -028-06 → -028-08 | Each is a different edit region; no semantic collision. |
| `admin/package.json` | STORY-028-07 (remove vitest devDep + scripts, KEEP @testing-library/svelte) + STORY-028-08 (add `check:no-vitest` script) | -028-07 → -028-08 | Sequential by wave. |
| `mcp/vitest.config.ts`, `cleargate-cli/vitest.config.ts`, `admin/vitest.config.ts` | STORY-028-05 / -06 / -07 (DELETE each in its package's commit) | (per-package, in each Wave-2/-3 commit) | One DELETE per file, fold into the per-package conversion commit. |
| `CLAUDE.md` + `cleargate-planning/CLAUDE.md` (mirror pair) | STORY-028-08 (single edit) | (single, both files in same commit) | Mirror-parity. No other in-scope story touches CLAUDE.md. |
| `cleargate-planning/.claude/agents/developer.md` | STORY-028-08 (canonical only — live is gitignored per FLASHCARD `#mirror #dogfood-split`) | (single) | PR description carries `cleargate init` re-sync reminder. |
| `.cleargate/FLASHCARD.md` | STORY-028-08 (one new line at top) | (single) | Append-only log; newest entry at top. |
| `.claude/hooks/pre-commit-surface-gate.sh` | STORY-028-08 (insert no-vitest grep line BEFORE the `exec` line per FLASHCARD `#pre-commit #stub-extension`) | (single) | Single-line addition. |
| `cleargate-cli/test/**/*.{test,spec}.ts` | STORY-028-06 (138-file conversion + rename to `*.node.test.ts`) | (single commit) | Atomic per-package. |
| `mcp/test/**/*.test.ts` | STORY-028-05 (50-file conversion + rename) | (single commit) | Atomic per-package. |
| `admin/src/**/*.test.ts` + `admin/test/**/*.test.ts` | STORY-028-07 (34-file conversion + rename, preflight-gated) | (single commit) | Atomic per-package. |
| `.cleargate/delivery/{pending-sync,archive}/**/*.md` (frontmatter bulk rewrites, ~113 items) | STORY-067-02 (one dedicated commit) | (single bulk commit) | `.migration-lock` enforces serialization with concurrent push. |
| `.cleargate/delivery/pending-sync/EPIC-*.md` (status flips at harvest) | STORY-028-01 (one or more frontmatter `status:` rewrites for auto-flipped epics) | (single commit, post-Wave-2A) | Mutated via STORY-066-02's reconciler write path; orchestrator runs the apply step. |

### 2.3 Shared-Surface Warnings

One warning per shared-file pair where the risk is non-obvious.

- **`lifecycle-reconcile.ts` — STORY-066-01 add-re-export vs STORY-067-03 mutate-constant.** STORY-066-01 must NOT touch lines 27-30 / 47 / 51 / 309 / 329 (the constants and expected[] literals). It only ADDs `export { rollUpParentStatus, walkActiveParents } from './parent-rollup.ts';` near the existing exports. STORY-067-03 owns the constant tightening; -01 leaving the constants alone preserves the tolerant set throughout Wave 1+2.
- **`close_sprint.mjs` live+canonical mirror — STORY-066-02 only.** No other in-scope story edits close_sprint.mjs. Risk: if a future hotfix CR-NNN lands during SPRINT-28 mid-flight touching close_sprint.mjs, it must coordinate with STORY-066-02's Step 2.6c block insertion (line ~407 anchor). Architect monitors via mid-sprint amendment log.
- **`mcp/src/adapters/README.md` — STORY-010-02 creates / STORY-067-03 appends.** If STORY-067-03 dispatches before STORY-010-02 ships (possible if STORY-010-02 hits an unforeseen L3 blocker), STORY-067-03 creates the README from scratch with the mapping section. Orchestrator confirms file existence at -067-03 dispatch and adjusts story prose accordingly.
- **`mcp/package.json` triple-edit.** STORY-010-02 (Wave 1, additive: `js-yaml`?) → STORY-028-05 (Wave 2, subtractive: vitest) → STORY-028-08 (Wave 3, additive: `check:no-vitest`). Three edits to one file across three waves. Each edit must rebase cleanly on the prior; no semantic collision because they touch different keys, but any merge-conflict on the JSON keyspace requires manual resolution preserving all three intents.
- **`cleargate-cli/package.json` triple-edit.** STORY-028-04 (add ts-morph) → STORY-028-06 (remove vitest) → STORY-028-08 (add check:no-vitest). Same shape as mcp/.
- **EPIC-028 `vitest` → `*.node.test.ts` rename in `cleargate-cli/test/`.** STORY-066-01 (`parent-rollup.node.test.ts`) and STORY-067-01 (`migrate-status-to-completed.node.test.ts`) ship as node:test from birth in Wave 1. STORY-028-06 (Wave 2) walks `cleargate-cli/test/`; its codemod is idempotent and skips already-`*.node.test.ts` files. Risk: if STORY-066-01 or -067-01 accidentally writes a `*.test.ts` (not `*.node.test.ts`) file, STORY-028-06 renames it. **Mitigation: Developer for -066-01/-067-01 names test files with `.node.test.ts` from birth (already required by Cross-Cutting Rule 1).**
- **`cleargate-cli/examples/` exclusion.** STORY-028-06's codemod must NOT walk `cleargate-cli/examples/` per FLASHCARD `#fixtures #sprint-22` (intentionally-failing Red examples). `--root cleargate-cli/test` excludes naturally; no flag needed.
- **`.migration-lock` semantic ownership.** Created by STORY-067-01 (script) and STORY-067-02 (apply phase). Read by STORY-067-01 (push.ts edit). The lock file path is `.cleargate/.migration-lock`. Orchestrator-level rule: NO push agent dispatch while STORY-067-02 is executing. This is an out-of-band sequencing constraint, not a git-merge ordering one.
- **STORY-028-01 ↔ CR-066 default block-mode.** STORY-028-01's dry-run will surface 3+ halts (EPIC-010 partial / EPIC-021 zero-children / EPIC-023 sub-epic placeholders). Manual ack inline; do NOT introduce an env-flag bypass (per CR-066 §1 Q3 resolution).

### 2.4 Lane Audit

Per the seven-check Lane Classification rubric. Every in-scope story listed; non-`standard` rows include rationale ≤80 chars.

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| STORY-066-01 | standard | New lib + 5 fixture tests; >50 LOC; med bounce exposure |
| STORY-066-02 | standard | Touches close_sprint.mjs mirror pair + CLI handler; med exposure |
| STORY-067-01 | standard | New script + 6 fixture tests + push.ts edit; >50 LOC |
| STORY-067-02 | standard | Bulk archive migration; 8+8 template edits; mirror parity gate |
| STORY-067-03 | fast | 5-line edit on lifecycle-reconcile.ts + README append; ≤50 LOC, doc-heavy |
| STORY-028-04 | standard | New ts-morph codemod + 6 golden fixtures + new devDep; med exposure |
| STORY-028-05 | standard | 50-file conversion + config delete; high exposure |
| STORY-028-06 | standard | 138-file conversion (largest); high exposure |
| STORY-028-07 | standard | 34-file conversion + preflight-gated svelte compat; high exposure |
| STORY-028-08 | fast | CLAUDE.md + developer.md + FLASHCARD prose + hook line; doc/config only |
| STORY-010-02 | standard | 4 endpoints + new adapter interface; net-new code; med exposure |
| STORY-028-01 | fast | One-shot dogfood; commit a status-flip diff + halt-list notes |
| BUG-004 | fast | Single-line backtick frontmatter fix + 1-line test scope widen |

Lane distribution: 9 standard + 4 fast = 31% fast (matches §2.4 target in original §1 metadata).

Rubric notes for fast-lane assignments:
- STORY-067-03: ≤50 LOC + no forbidden surface + no new dep + single concern + existing tests cover (lifecycle-reconcile tests) + low exposure + within EPIC-028/CR-067 scope.
- STORY-028-08: doc-only + ≤50 LOC + no forbidden surface + no new dep + single concern (rename two-runner→single-runner + add guard) + low exposure.
- STORY-028-01: doc/state-mutation only (no source code edits) + ≤50 LOC (one apply commit) + single concern + low exposure.
- BUG-004: ≤50 LOC (1-line frontmatter + 1-line test scope) + single concern + low exposure + scaffold content (forbidden-surface-adjacent but not in the forbidden table).

### 2.5 ADR-Conflict Flags

Scanned against CLAUDE.md "Architectural decisions locked" + flashcards #adr-conflict / #scope-bleed.

- **None identified at SDR.** Rationale: SPRINT-28 work either (a) implements decisions that were freshly locked at parent-CR Gate-1 ack 2026-05-17 (CR-066 Q1-Q4, CR-067 Q1-Q3, EPIC-028 Q1-Q5 — all locked) or (b) extends in-scope subsystems without crossing locked boundaries.
- **Locked decisions referenced (not violated):**
  - Invite storage (2026-04-18 Postgres-authoritative): not touched.
  - Wiki drift detection (2026-04-19 git-SHA): not touched.
  - Admin deploy mirror (2026-05-15 `cleargate-admin` remote): not in scope (no admin/** runtime changes; STORY-028-07 admin test conversion touches admin/test/ only — no Coolify-deploy impact).
  - EPIC-027 boundary (2026-05-17 no PM-tool SDK in cleargate-cli/.claude/): preserved by STORY-010-02 placing all Linear logic in `mcp/src/adapters/`.
  - Status vocabulary 2026-05-17 (one Completed only): CR-067 implements; no conflict.
  - Test runner 2026-05-17 reversal (no two-runner state, all node:test): EPIC-028 implements; no conflict.
- **One soft adjacency to monitor:** STORY-028-07's possible JSDOM-direct fallback (if @testing-library/svelte breaks under node:test) could surface a new architectural choice — node:test + jsdom-global setup — that warrants a CR if it requires more than a 1-line `--import` flag. Architect monitors at -028-07 preflight; escalates to a follow-up CR rather than amending SPRINT-28 scope.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| CR-066's block-mode halts SPRINT-28's own close on partial-coverage epics | Wave 3 STORY-028-01 harvest resolves the 6 stale Epics BEFORE Step 2.6c runs at SPRINT-28 close. If STORY-028-01 surfaces new partial-coverage epics during the harvest, they get manual ack inline; do NOT bypass via env flag. |
| CR-067 Phase B race with concurrent `cleargate push` corrupting frontmatter | `.cleargate/.migration-lock` flock acquired by migration script; push commands check the lock and exit with retry message. CRITICAL: orchestrator must NOT dispatch any push agent during Phase B execution window. |
| EPIC-028 admin/ batch — @testing-library/svelte incompat with node:test | Story PREFLIGHT verifies compat on ONE sample test before mass conversion. If incompat, escalate to human; do not start batch. Possible fallback: swap to a node:test-friendly testing pattern (component snapshot via JSDOM directly). |
| EPIC-028 vi.mock manual fixes blow up scope | Codemod produces a manual-fix report before conversion. If >20 files need manual fix in any single package, escalate at story preflight; consider splitting that package's story. |
| CR-029 abandonment leaves dangling references | CR-029's body kept; frontmatter `status: Abandoned` with `abandoned_reason` pointing at EPIC-028. No grep-for-CR-029 in CLAUDE.md or protocol. |
| Sprint-end gate (Step 2.6c block-mode) firing on something we missed | First-real-run of CR-066 block-mode at SPRINT-28 close. REPORT §5 Process documents the first-time experience; if false-positive surfaces, file a follow-up CR to tighten the rollup heuristic. |
| EPIC-021 audit deferred but EPIC-021 still rots | Acknowledged. SPRINT-29 prep MUST include EPIC-021 audit (STORY-028-02 as drafted). CR-066's block-mode will halt SPRINT-29 close if EPIC-021 stays in zero-children state — natural forcing function. |

## Metrics & Metadata

- **Expected Impact:**
  - One terminal status (`Completed`) across all artifacts; one test runner (node:test) across the repo; sprint close auto-rolls parent statuses with block-mode partial detection.
  - Six stale Epics reconciled in one harvest pass (EPIC-016 auto-flips; EPIC-010 / -021 / -023 surfaced for manual decision; EPIC-026 likely auto-flips after Wave 3 confirms full coverage).
  - EPIC-010 formally completes after STORY-010-02 ships.
  - `node_modules` shrinks ≥10% per package after EPIC-028 removes vitest.
  - 0.13.0 release cut (CR-066 + CR-067 + EPIC-028 + STORY-010-02 + BUG-004 all ship).
- **Priority Alignment:** Foundation sprint enabling SPRINT-29's harvest of EPIC-012 user-visible work; closes long-standing backlog drift (CR-029, STORY-010-02, BUG-004) and resolves three architectural questions (vocab, test runner, parent reconciliation) that have been deferred for multiple sprints.
- **Lane Distribution Target:** ~30% fast lane (STORY-028-01 + BUG-004 + EPIC-028 docs + CR-067 Phase C = 4 of ~13 stories).

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** Wave 1 = three foundation libs in parallel (CR-066 `parent-rollup.ts`, CR-067 `migrate-status-to-completed.mjs`, EPIC-028 codemod). All decomposition for CR-066 + CR-067 + EPIC-028 sub-stories happens at Architect SDR per CR-017 §11.
- **Relevant Context:**
  - CR-066 + CR-067 + EPIC-028 all drafted 2026-05-17 (this slate-sizing pass); all 🟢 with approved frontmatter.
  - STORY-010-02 has sat in pending-sync since 2026-04-19 with `approved: true, status: Draft`. Its parent EPIC-010 has 7/8 stories archived; this is the last one.
  - BUG-004 has sat in Draft since wiki-lint surfaced the YAML backtick issue; trivial fix.
  - The 6 stale Epics surfaced 2026-05-16 audit: EPIC-010 (7/8 → halts on partial until STORY-010-02 ships in this sprint, then auto-flips), EPIC-012 (0/5 → harvest skips; stays Ready), EPIC-016 (6/6 → auto-flip Completed), EPIC-021 (0/0 → halts on zero-children, manual ack at harvest), EPIC-023 (sub-epic structure → halts on placeholders 2/4, manual ack), EPIC-026 (likely auto-flip if Wave 3 harvest confirms full coverage).
- **Constraints:**
  - **CR-066 block-mode default.** No `--no-strict` opt-out flag in v1. If Step 2.6c halts SPRINT-28 close, manual ack inline; do NOT introduce a bypass.
  - **CR-067 Phase B must run with `.migration-lock` engaged.** Orchestrator MUST NOT dispatch any `cleargate push` agent during the Phase B execution window. Migration script writes the lock; lock-respecting push lands as part of Phase A.
  - **EPIC-028 atomic per-package commits.** No partial conversion mid-state — each package's vitest config + dep removal lands in the SAME commit as its file conversions.
  - **No SPRINT-28 → SPRINT-29 carry-over for deferred items.** EPIC-012 harvest + STORY-028-02 EPIC-021 audit + STORY-027-06 stay in pending-sync; SPRINT-29 prep pulls them.
  - **0.13.0 bump at sprint close**, not before. One bump per sprint.

### Commit cadence

One commit per Story = ~13 commits. CR-067 splits into 3 (Phase A script, Phase B archive migration, Phase C tighten). EPIC-028 splits into 5 (codemod + 3 per-package + docs). CR-066 splits into 2. Plus STORY-010-02 + BUG-004 + STORY-028-01 = ~14 commits total.

### Next Sprint Preview

**SPRINT-29 candidates** (post-foundation): EPIC-012 re-scoped harvest (STORY-028-03/-04/-05 = admin UI SprintDetail.svelte, FLASHCARD sync, `cleargate pull SPRINT-NN` write-back); EPIC-021 audit (STORY-028-02); STORY-027-06 `cleargate lint`; EPIC-023 sub-epic 2/4 re-scope (after CR-064 absorbed half of sub-epic 2's scope). Total likely 8-10 items — user-visible features now that foundations are clean.

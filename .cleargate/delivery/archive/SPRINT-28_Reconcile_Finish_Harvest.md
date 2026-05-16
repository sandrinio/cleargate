---
sprint_id: SPRINT-28
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-28
carry_over: false
lifecycle_init_mode: warn
remote_id: null
source_tool: local
status: Approved
approved: true
approved_by: sandrinio
approved_at: 2026-05-17T00:00:00Z
activated_at: null
completed_at: null
execution_mode: v2
start_date: 2026-05-19
end_date: 2026-06-01
created_at: 2026-05-16T00:00:00Z
updated_at: 2026-05-17T00:00:00Z
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

## 2. Execution Strategy (to be locked at Architect SDR)

> Conversational-agent proposal — Architect SDR replaces this section with binding waves at sprint init. v2 mode.

### 2.1 Phase Plan (proposed)

Three waves. v2 mode; Wave 1 + Wave 2 run partially parallel (disjoint surfaces).

**Wave 1 — Foundation libs** (parallel-safe; 3 tracks):
- **Track A:** CR-066 — `rollUpParentStatus()` lib + tests + sub-epic recursion + zero-children skip.
- **Track B:** CR-067 — migration script `migrate-status-to-completed.mjs` + tests; template + gate-check updates queued (not applied until Wave 2's archive migration runs).
- **Track C:** EPIC-028 — codemod tool `codemod-vitest-to-node-test.mjs` + golden-fixture tests.

**Wave 2 — Apply foundations** (parallel-safe within track; sequential within each track):
- **Track A:** CR-066 — close_sprint.mjs Step 2.6c insert; `cleargate sprint reconcile-lifecycle --parents` flag. Depends on Wave 1A complete.
- **Track B:** CR-067 — Phase B archive migration (~113 items rewritten in one commit). Depends on Wave 1B + a tightening lock against concurrent push during the migration window.
- **Track C:** EPIC-028 — three per-package conversion stories run in series (mcp/ first, cleargate-cli/ second, admin/ third). Each story includes config-delete + package.json cleanup.

**Wave 3 — Dogfood + tighten + finish** (parallel-safe across all tracks):
- **STORY-028-01** — runs CR-066's harvest against the 6 stale Epics (depends on Wave 2A).
- **CR-067 Phase C** — tighten `TERMINAL_STATUSES = ['Completed']` (depends on Wave 2A AND Wave 2B; one-line edit guarded by CR-067 final story).
- **STORY-010-02** — independent; can run any wave (mcp/ endpoints surface). Architect may schedule in Wave 1 if Developer capacity permits.
- **BUG-004** — fast lane; any wave.
- **EPIC-028 docs story** — last; after all 3 per-package batches land.

### 2.2 Merge Ordering — Shared-File Surface

| Shared File | Stories | Order | Rationale |
|---|---|---|---|
| `cleargate-cli/src/lib/lifecycle-reconcile.ts` | CR-066 (re-export `rollUpParentStatus` + TERMINAL_STATUSES read-tolerance) + CR-067 (tighten TERMINAL_STATUSES to `['Completed']`) | **CR-066 first → CR-067 tighten last** | CR-066's reconciler must tolerate `{Done, Verified, Completed}` during the CR-067 migration window. CR-067's Phase C is the only story that touches the TERMINAL_STATUSES literal. |
| `cleargate-cli/src/lib/parent-rollup.ts` (NEW) | CR-066 | (single) | New file. |
| `cleargate-cli/scripts/migrate-status-to-completed.mjs` (NEW) | CR-067 | (single) | New file. |
| `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs` (NEW) | EPIC-028 | (single) | New file. |
| `.cleargate/scripts/close_sprint.mjs` + mirror | CR-066 (Step 2.6c insert) | (single, both mirrors) | Mirror-parity per FLASHCARD `#scaffold #mirror`. |
| `cleargate-cli/src/commands/sprint.ts` | CR-066 (`--parents` flag on `reconcileLifecycleHandler`) | (single, additive) | One handler, additive flag. |
| `.cleargate/templates/*.md` (8 artifact templates) + mirrors | CR-067 | (single batch, all mirrors) | Status enum guidance update; all 8 templates in one commit. |
| `cleargate-cli/src/lib/gate/*.ts` | CR-067 | (single batch) | Terminal-state checks consolidate to `Completed`. |
| `cleargate-cli/test/**/*.test.ts` + `*.spec.ts` | EPIC-028 cleargate-cli/ story | (single) | 138-file batch; one commit. |
| `mcp/test/**/*.test.ts` | EPIC-028 mcp/ story | (single) | 50-file batch; one commit. |
| `admin/src/**/*.test.ts` + `admin/test/**/*.test.ts` | EPIC-028 admin/ story | (single) | 34-file batch; one commit. |
| `mcp/package.json` + `cleargate-cli/package.json` + `admin/package.json` | EPIC-028 (vitest dep removal per-package) | (folded into each per-package story) | Same commit as the file conversions for that package. |
| `mcp/vitest.config.ts` + `cleargate-cli/vitest.config.ts` + `admin/vitest.config.ts` | EPIC-028 (DELETE per-package) | (folded into each per-package story) | Same commit. |
| `CLAUDE.md` + `cleargate-planning/CLAUDE.md` | EPIC-028 docs story | (single, both mirrors) | Remove "two-runner" language; add "node:test only" rule. |
| `cleargate-planning/.claude/agents/developer.md` | EPIC-028 docs story | (single, canonical only — prebuild regenerates derived) | Test-runner section update. |

### 2.3 Shared-Surface Warnings

- **CR-066 ↔ CR-067 on `TERMINAL_STATUSES`:** CR-066's lib initially reads the 3-element set for back-compat during the CR-067 migration. CR-067's Phase C is the only story that flips it to `['Completed']`. Wave 3 ordering enforces this — STORY-028-01 (harvest) runs against the tolerant set; Phase C tighten is the last commit of Wave 3.
- **CR-067 archive migration ↔ concurrent `cleargate push`:** migration script acquires `.cleargate/.migration-lock`; push commands respect the lock. Critical that no orchestrator runs `cleargate push` while Phase B is executing.
- **EPIC-028 admin/ batch ↔ @testing-library/svelte compat:** verify in admin/ story PREFLIGHT before mass-conversion. If incompat, escalate; do not start the 34-file batch.
- **STORY-028-01 ↔ CR-066 default block-mode:** dogfood pass will hit partial-coverage halts on EPIC-010 / EPIC-021 / EPIC-023 (per §0 metrics). STORY-028-01 includes manual ack steps for these halts — does NOT silently bypass via env flag.

### 2.4 Lane Audit

| Item | Lane | Rationale (≤80 chars) |
|---|---|---|
| STORY-028-01 | fast | One-shot dogfood; commit a status-flip diff + warn-list notes |
| BUG-004 | fast | Single backtick fix; trivial |
| EPIC-028 codemod story | standard | New tool + golden fixtures; not trivial |
| EPIC-028 docs story | fast | CLAUDE.md + developer.md + FLASHCARD prose; doc-only |

All other items run `standard`. CR-067 Phase A (migration script) standard; Phase B (archive backfill) standard; Phase C (tighten TERMINAL_STATUSES) fast. EPIC-028 per-package batches all standard.

### 2.5 ADR-Conflict Flags

None at draft time. Re-check at Architect SDR.

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

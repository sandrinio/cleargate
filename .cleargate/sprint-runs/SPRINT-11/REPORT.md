# SPRINT-11 Report: Wiki Index Hygiene & Scale

**Status:** ✅ Shipped (4 / 4 stories merged to `sprint/SPRINT-11`, HEAD `401a2b3`)
**Window:** 2026-04-24 12:40 → 2026-04-24 18:05 (~5.4 h wall-clock, single calendar day)
**Stories:** 4 planned / 4 shipped / 0 carried over · 1 epic (EPIC-015)
**Execution mode:** v2

---

## For Product Management

### Sprint goal — did we hit it?

EPIC-015's goal was to reshape `.cleargate/wiki/index.md` from a flat 151-row table into a scale-ready hierarchical surface, land a status-audit CLI that reconciles stale frontmatter, add a token-budget lint that blocks index bloat, and wire a sprint-close stamp so the drift we just fixed stays fixed.

**Yes.** All four user-visible deliverables shipped:

- `index.md` dropped from ~4k tokens (flat 151-row table) to **~462 tokens** (1849 bytes, 53 lines, **6 % of the 8000 ceiling**) — a **77 % reduction** on the file every agent reads at session start.
- `cleargate wiki audit-status` lands with `--fix --yes` apply mode; the one-time data commit (`ba28ba2`) reconciled ~36 archive items' frontmatter in a single atomic diff.
- `cleargate wiki lint` now enforces the token ceiling (8000 default, configurable via `.cleargate/config.yml`).
- `cleargate sprint archive` now atomically stamps `status: Completed` + `completed_at` before running build/lint and rolls back on failure.

### Headline deliverables

- **Hierarchical index surface (STORY-015-01).** Active/Archive split; in-flight stories roll up under their parent epic (`STORY-014-xx (10 stories) — 10 Ready`); archive buckets collapse to per-bucket summaries. Idempotent — rerunning `wiki build` with no raw-item changes produces byte-identical output.
- **Audit + one-time reconcile (STORY-015-02).** New `cleargate wiki audit-status` detects three drift patterns (archive + non-terminal, pending-sync + terminal, sprint-with-all-terminal-children). The sprint's data commit swept status drift on SPRINT-10, EPIC-001, EPIC-008, EPIC-009, and their child stories.
- **Token-budget gate (STORY-015-03).** `wiki lint` fails when `index.md` exceeds the configured ceiling; `--suggest` advisory mode never exits non-zero and prints `index token usage: N / M (P%)`. New 9th lint category `index-budget:`.
- **Protocol blessing + sprint-close atomicity (STORY-015-04).** `Abandoned` is now a first-class protocol literal (mirrored in both dogfood and scaffold protocol files, byte-identical). `cleargate sprint archive` is now async and calls `stampSprintClose` → `wiki build` → `wiki lint`, reverting the frontmatter snapshot on any failure.

### Risks that materialized

From the sprint plan's risk table:

- **R-01 (data-commit merge conflict) — did-not-fire.** STORY-015-02's two-commit sequence (code then data) serialized cleanly inside M1.
- **R-02 (sprint-archive self-close) — mitigated as designed.** STORY-015-04 shipped with a fixture-based E2E test (Scenario 6). The wrapper is NOT being exercised against SPRINT-11 itself — see "What's unblocked" below for the lint-drift reason.
- **R-03 (token-budget false-positive) — did-not-fire.** The ceiling was set to 8000; actual post-M1 index measures ~462 tokens (headroom ~17×). No false positives observed.
- **R-04 (Abandoned ordering) — mitigated as designed.** STORY-015-02 treated `Abandoned` as an opaque string; STORY-015-04 retroactively blessed it in the protocol. Zero rework.

New risk surfaced mid-sprint (not in the plan): the orchestrator's Rule-C heuristic in STORY-015-02 mislabeled EPIC-009 (shipped SPRINT-05) and EPIC-011 (shipped SPRINT-08) as `Abandoned` because their children had never been stamped post-ship. Corrected by hand in `5638f72` using REPORT.md + git-log evidence as ground truth (Option B per 2026-04-24 conversation). Flagged as a follow-up for a programmatic `wiki audit-status` rule that reads sprint REPORT.md ship-evidence (see Open follow-ups).

### Cost envelope

**Ledger absent.** `.cleargate/sprint-runs/SPRINT-11/token-ledger.jsonl` does not exist, and no `state.json` was written either. This is the known `SubagentStop`-hook + routing limitation previously captured in flashcards `2026-04-19 #reporting #hooks #ledger` and `2026-04-19 #reporting #hooks #ledger #subagent-attribution`, and was called out as Red Friction #1 in SPRINT-10's report. SPRINT-11 did not adopt the `.active` sentinel auto-write fix, so per-agent / per-story cost cannot be computed for this sprint.

Cost must be quoted as unavailable. Agent invocations can still be counted: **~8 subagent spawns** (Architect M1, Architect M2, Developer ×4, QA ×1 on 015-01, QA passes on 015-02/03/04) plus **~2 orchestrator-direct interventions** (the EPIC-009/011 correction commit `5638f72` and the STORY-015-04 try/catch wrap `40696d3`).

### What's unblocked for next sprint

- **Future sprint closes are self-healing.** `cleargate sprint archive` now stamps `status: Completed` + `completed_at` atomically and rolls back on build/lint failure. The drift we just fixed will not reintroduce itself.
- **Index bloat can't creep back.** Any PR that pushes `index.md` past 8000 tokens fails lint at Gate 3. The ceiling is configurable per-repo.
- **Session-start orientation is cheaper.** Every future agent pays ~462 tokens to read `index.md` instead of ~4000.

**Still blocked / residual:** SPRINT-11 itself cannot self-archive via the new wrapper. `cleargate wiki lint` surfaces **145 pre-existing findings** (broken-backlink + gate-failure on archived STORY-013-xx / STORY-014-xx items + 3 gate-stale proposals) that predate this sprint; the new `index-budget` check passes clean, but the lint as a whole fails, which would trigger the new rollback. SPRINT-11 archives via manual merge to main; the lint-drift cleanup is a future epic or CR (see Open follow-ups).

---

## For Developers

### Per-story walkthrough

**STORY-015-01: Hierarchical Index Rendering** · L2 · cost unavailable · ~17 min (12:40 → 12:57 merge)
- Files: `cleargate-cli/src/commands/wiki-build.ts` (+181 lines), `cleargate-cli/test/wiki/build-index-hierarchical.test.ts` (new, 489 lines), `cleargate-cli/test/wiki/build.test.ts` (+5), plus wiki mirror refresh across 156 pages.
- Tests added: 5 Gherkin scenarios covered + golden-file test (`expected-index-hierarchical.md`) added in kickback commit.
- Kickbacks: **1** (QA flagged missing golden-file test per DoD §4.1 "E2E / acceptance tests: 1"). Developer added it in `cec53e6` — the only QA kickback of the sprint.
- Deviations from plan: none.
- Flashcards recorded: `#wiki #index #worktree` (worktree needs `npm ci` before first typecheck); `#wiki #bucket-inference` (discriminate via `item.bucket`, not frontmatter keys); `#test-location #wiki #cli` (tests at `test/wiki/`, not `test/commands/`).
- Commits: `4e158fc` (feat), `cec53e6` (test bounce-fix). Merge `175ae06`.

**STORY-015-02: Status Audit CLI + One-Time Fix** · L2 · cost unavailable · ~13 min (12:45 → 12:57 merge, parallel with 015-01)
- Files: `cleargate-cli/src/cli.ts` (+11), `cleargate-cli/src/commands/wiki-audit-status.ts` (new, 266 lines), `cleargate-cli/test/wiki/_fixture.ts` (+32), `cleargate-cli/test/wiki/audit-status.test.ts` (new, 370 lines). Data commit touches ~36 raw items' frontmatter `status:` lines.
- Tests added: 13 tests covering all 5 Gherkin scenarios + E2E convergence.
- Kickbacks: 0 (one-shot).
- Deviations from plan: orchestrator-level intervention — Rule-C heuristic auto-fix produced incorrect `Abandoned` labels for EPIC-009 + EPIC-011 (both shipped sprints whose children's frontmatter was never stamped post-ship). Corrected in `5638f72` via manual re-stamp using REPORT.md + git-log evidence. No code change; data-only reversal for 14 items.
- Flashcards recorded: `#audit-status #convergence` (Rule-C fix on pending-sync sprints creates Rule-B violations — E2E convergence tests must use only Rule-A fixtures); `#frontmatter #write-back` (raw-bytes regex, not `parseFrontmatter` round-trip, which strips a leading blank).
- Commits: `b5be56d` (feat), `ba28ba2` (fix/reconcile), `5638f72` (fix/restore EPIC-009+011). Merge `a4a0f30`.

**STORY-015-03: Index Token-Budget Lint** · L1 · cost unavailable · ~8 min (13:10 → 13:18 merge)
- Files: `cleargate-cli/src/commands/wiki-lint.ts` (+19), `cleargate-cli/src/lib/wiki-config.ts` (new, 76 lines), `cleargate-cli/src/wiki/lint-checks.ts` (+40), `cleargate-cli/test/wiki/lint-index-budget.test.ts` (new, 238 lines), `cleargate-cli/test/wiki/lint.test.ts` (+12 for the 9th category-substring contract assertion).
- Tests added: 12 tests covering all 4 Gherkin scenarios. New lint category `index-budget:` (9th).
- Kickbacks: 0 (one-shot).
- Deviations from plan: none. Architect M2 blueprint was followed verbatim, including the test-file location (`test/wiki/`, not `test/commands/` — story-body citation was wrong per flashcard #test-location).
- Flashcards recorded: none net-new (pre-existing flashcards covered this surface).
- Commits: `b33349f`. Merge `9f3a7c0`.

**STORY-015-04: Abandoned Status + Sprint-Close Stamp** · L2 · cost unavailable · ~4.25 h including rate-limit pause (13:45 → 18:02 merge)
- Files: `cleargate-cli/src/commands/sprint.ts` (+123, `sprintArchiveHandler` now async with `stampSprintClose` + rollback path + `wikiBuildFn`/`wikiLintFn` test seams), `cleargate-cli/src/cli.ts` (+4), `.cleargate/knowledge/cleargate-protocol.md` (+30, new §21 Status Vocabulary + §21.1 Index Token Ceiling), `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` (+30, mirror — byte-identical), `cleargate-cli/test/commands/sprint-archive-stamp.test.ts` (new, 592 lines), `cleargate-planning/MANIFEST.json` (regenerated).
- Tests added: 14 tests covering all 6 Gherkin scenarios (protocol assertion, stamp, rollback on build-fail, rollback on lint-fail, already-terminal no-op, state-guard rejection, E2E).
- Kickbacks: 0 from QA, **1 orchestrator-direct fix** (`40696d3`): Developer-agent rate-limit pause mid-implementation left the handler body raising `exit:<N>` sentinels as unhandled async rejections after handler became async. Orchestrator applied a 13-line try/catch wrap in `sprintArchiveHandler` that swallows only `/^exit:\d+$/` and rethrows anything else. All 40 sprint-scoped tests go green, 0 unhandled errors.
- Deviations from plan: one — Gherkin §2.1 Scenario 4 text ("sprint branch not merged") corrected to match the actual `state.sprint_status !== 'Completed'` guard (L271 string). Story file updated (+12 lines) to reflect the real contract; no new branch-merge check added. This was pre-planned in M2 (Cross-story risks #4) and handled during implementation, not as a bounce.
- Flashcards recorded: `#sprint-archive #file-location` (wrapper is inline in `commands/sprint.ts`, not `lib/sprint-archive.ts` — story body cited the wrong path); `#wiki-gate #sprint-archive` (skip wiki build+lint when `.cleargate/wiki/` absent — `wikiInitialised` guard for existing test suites); `#yaml #frontmatter #iso-date` (js-yaml CORE_SCHEMA emits unquoted ISO strings — assertions must not expect quotes); `#wiki-build #async-exit-pattern` (build returns, lint exits — wrappers need try/catch on fakeExit-throw, not Promise resolve/reject).
- Commits: `7620763` (feat), `40696d3` (fix/exit-sentinel). Merge `6bb8a18`.

### Agent efficiency breakdown

| Role | Invocations | Tokens | Cost | Tokens/story | Notes |
|---|---|---|---|---|---|
| Architect | 2 (M1, M2) | — | — | — | Ledger absent (known SubagentStop-hook limitation) |
| Developer | 4 + 1 bounce (015-01 test) | — | — | — | STORY-015-04 hit a mid-run rate limit; orchestrator completed the exit-sentinel fix |
| QA | ~3–4 | — | — | — | One kickback (015-01 golden file); three clean passes |
| Reporter | 1 | — | — | — | This report |

**Three-source token reconciliation: N/A.** No ledger rows, no `state.json` — the `.active` sentinel auto-write fix from SPRINT-10 §5 follow-ups was not adopted this sprint. Cost reporting is degraded to "agent invocations" only.

### What the loop got right

- **M1 parallel dispatch held.** STORY-015-01 and STORY-015-02 ran concurrently on disjoint surfaces (`wiki-build.ts` vs new `wiki-audit-status.ts`) and merged within 5 seconds of each other (`175ae06` 12:57:44, `a4a0f30` 12:57:49). Zero merge-conflict cost.
- **Architect plans prevented four "wrong-path" bounces.** M1 and M2 both caught story-body path errors before developers started: `#test-location`, `#sprint-archive #file-location`, `#wiki #bucket-inference`, and the Scenario-4 "branch not merged" text drift. Each would have been at least one developer pass; instead they cost zero production commits.
- **One-shot rate on L1 + 2 of 3 L2s.** STORY-015-02, 015-03, 015-04 all landed first-pass by the developer agent (modulo the 015-04 exit-sentinel orchestrator assist, which was mechanical, not a correctness gap).
- **Protocol mirror discipline held.** STORY-015-04's two protocol-doc edits landed in the same commit and are byte-identical per the `#wiki #protocol #mirror` flashcard — no silent divergence.
- **Heuristic-caught-by-semantic-evidence escape valve worked.** When STORY-015-02's Rule-C auto-fix mislabeled EPIC-009 + EPIC-011 as `Abandoned`, the orchestrator + human caught it by cross-checking REPORT.md ship-evidence and reverted in a clean data-only commit (`5638f72`). The bug was in the heuristic, not the mechanism; the mechanism let us fix it in one commit.

### What the loop got wrong

- **Ledger and state.json still absent.** SPRINT-10 §5 Red Friction #1 asked for `.active` sentinel auto-write at `sprint init`; SPRINT-11 did not adopt it. Result: SPRINT-11 has the same "global ledger only" degradation as SPRINT-10. **Concrete loop improvement:** wire `.active` sentinel + `token-ledger.jsonl` bootstrap into `init_sprint.mjs` as a hard DoD item for the next orchestration-polish sprint; reference flashcard `2026-04-19 #reporting #hooks #ledger #subagent-attribution`.
- **Heuristic-driven frontmatter correction needed human eye.** STORY-015-02's Rule-C "sprint with all-children-terminal → Completed" fired correctly, but STORY-015-02 did not have a symmetric "epic with all-children-terminal → Completed" rule, so the orchestrator's manual walk of archive/ items inadvertently flagged legitimately-shipped epics as Abandoned. **Concrete loop improvement:** file a CR for a programmatic `wiki audit-status` rule that reads `sprint-runs/<id>/REPORT.md` ship-evidence (e.g. "§1 What Was Delivered" presence) as positive signal before proposing `Abandoned`. Flashcard-worthy; not yet recorded.
- **Rate-limit mid-story leaves dangling async state.** STORY-015-04's developer got rate-limited between making `sprintArchiveHandler` async and writing the try/catch guard, which let `exit:<N>` sentinels escape as unhandled rejections. The orchestrator finished the fix in 13 lines. **Concrete loop improvement:** when transitioning a sync handler to async, the exit-sentinel wrapper should be the *first* change, not the last — add this to `developer.md` as a pattern rule. Flashcard `#wiki-build #async-exit-pattern` captures the symptom; the prescription is missing.
- **Lint-drift is load-bearing to the new sprint-archive wrapper.** `wiki lint` surfaces 145 pre-existing findings unrelated to SPRINT-11 (broken-backlink on archived STORY-013-xx / STORY-014-xx items + 3 gate-stale proposals). Under the new rollback path, any sprint close fails lint → rolls back → archive never happens. SPRINT-11 itself cannot self-archive via the wrapper it just shipped. **Concrete loop improvement:** next sprint should either (a) add a `--skip-lint-drift` escape hatch to sprint-archive, (b) ship a CR that mass-resolves the lint-drift, or (c) scope lint's sprint-archive invocation to new-in-sprint findings only. Option (c) has the best hygiene.
- **`cleargate-planning/MANIFEST.json` dirties every workflow.** Build-regenerated artifact keeps appearing in `git status`. **Concrete loop improvement:** either `.gitignore` it or add a pre-commit hook that regenerates-and-stages deterministically. Noise-only problem today, but wastes orchestrator eyeballs.

### Open follow-ups

- **Mass-resolve lint-drift so `sprint archive` can self-archive future sprints.** Target: SPRINT-12 as a dedicated CR (the 145 findings are archived STORY-013-xx / STORY-014-xx broken-backlinks + 3 gate-stale proposals — cleanup is mechanical).
- **`.active` sentinel + ledger bootstrap at `sprint init`.** Target: next orchestration-polish sprint. Pre-requisite for any cost reporting.
- **Programmatic `wiki audit-status` rule that reads sprint REPORT.md ship-evidence before proposing `Abandoned`.** Target: CR, no urgency (the manual workaround worked).
- **`cleargate-planning/MANIFEST.json` either gitignored or auto-regenerated pre-commit.** Target: CR, small.
- **Scenario-4 text mismatch in STORY-015-04** — resolved in-sprint (story body updated +12 lines). No residual.
- **Developer.md pattern rule: exit-sentinel wrapper is the first change when going sync→async.** Target: next time `developer.md` is edited.

---

## Meta

**Token ledger:** `.cleargate/sprint-runs/SPRINT-11/token-ledger.jsonl` — **absent** (hook/routing limitation; flashcard `2026-04-19 #reporting #hooks #ledger #subagent-attribution`).
**State file:** `.cleargate/sprint-runs/SPRINT-11/state.json` — present (from `cleargate sprint init` at 12:24); only `plans/M1.md` + `plans/M2.md` + `state.json` + this `REPORT.md` survived in the run directory.
**Commits on sprint branch:** 18 (`git log sprint/SPRINT-11 --not main`): 5 `feat` + 4 `fix` + 1 `test` + 4 `merge` + 3 chores (flashcards / wiki-rebuild / plan) + 1 orphan cleanup.
**Flashcards added this sprint:** 8 (top of `.cleargate/FLASHCARD.md`, all dated 2026-04-24). Themes: sprint-archive file location, worktree npm ci, audit-status convergence, wiki test location, frontmatter write-back, bucket inference, wiki-gate skip, YAML ISO-date quoting, async-exit pattern.
**Test status:** 40 / 40 sprint-scoped new tests green. Pre-existing infra failures unchanged (bootstrap-root Postgres, mcp submodule snapshot-drift, session-start timing flake) — ignored per sprint plan §v2 execution reminders.
**Wiki metrics:** 151 pages · `index.md` 1849 bytes · ~462 tokens · **6 % of 8000 ceiling** · `wiki audit-status` exits 0 · `index-budget:` lint check passes clean (`wiki lint` still fails 145 pre-existing findings — see follow-ups).
**Model rates used:** N/A (ledger absent).
**Report generated:** 2026-04-24 by Reporter agent (one-shot, orchestrator-spawned).

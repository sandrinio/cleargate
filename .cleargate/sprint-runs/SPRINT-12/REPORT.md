# SPRINT-12 Report: Framework Universality — Public Ship

**Status:** Shipped (5 / 5 stories merged to `sprint/SPRINT-12`, HEAD `7d70128`)
**Window:** 2026-04-25 00:03 → 2026-04-25 01:49 (~1 h 46 min wall-clock, single calendar day)
**Stories:** 5 planned / 5 shipped / 0 carried over · 1 epic (EPIC-018)
**Execution mode:** v2

---

## For Product Management

### Sprint goal — did we hit it?

EPIC-018's goal was to remove the dogfood-specific assumptions leaking through the scaffold (`npm test` / `npm run typecheck` hard-codes, stack vocabulary, no LICENSE, dogfood-first README) and prove ClearGate installs into any target repo via an automated foreign-repo integration test.

**Yes.** All five user-visible deliverables shipped:

- **LICENSE (MIT)** lands at repo root + `cleargate-cli/LICENSE` + `package.json` `license` field + `files` array entry. `npm publish` preflight is unblocked.
- **README split.** New `README.md` is **79 lines** of stranger-onboarding (install → first proposal → first epic). Dogfood/architecture detail moved to **`docs/INTERNALS.md`** (178 lines). The vibe-coder PMF gate from §1.4 of the sprint plan is closed.
- **Config-driven gates.** `cleargate gate {precommit|test|typecheck|lint}` resolves shell commands from `.cleargate/config.yml` (key `gates`); friendly fallback when absent. Agent definitions in both the scaffold (`cleargate-planning/.claude/agents/{developer,qa}.md`) and the live dogfood (`.claude/agents/{developer,qa}.md`) now invoke `cleargate gate test` / `cleargate gate typecheck` instead of raw `npm` commands. This repo's `.cleargate/config.yml` is committed so the dogfood loop is byte-identical post-rewording.
- **Scaffold-lint.** New `cleargate scaffold-lint` greps `cleargate-planning/**` against a 169-line default blocklist (ORMs, frameworks, infra, DB, cache/queue, styling). Wired to a new `.github/workflows/scaffold-lint.yml` GitHub Actions job; `.cleargate/scaffold-allowlist.txt` (17 entries) covers legitimate dogfood collisions.
- **Foreign-repo integration test.** New `cleargate-cli/test/integration/foreign-repo.test.ts` (356 lines) ships a Node fixture and a Go fixture, runs `initHandler` programmatically, asserts scaffold shape + frontmatter parses + scaffold-lint clean + gate friendly-fallback + configured gate captured + wiki build round-trips PROPOSAL-999. Runs in ~8s, well inside the 30s budget. CI workflow extended with a parallel `foreign-repo-integration` job.

After this sprint: a stranger with no prior context can `npm i -D cleargate && npx cleargate init` in a blank Node or Go repo and drive the four-agent loop without forking the scaffold.

### Headline deliverables

- **Public-installable framework (STORY-018-01 + 018-02 + 018-03).** LICENSE, stranger-readable README, and config-driven gates land together. Downstream teams configure pre-commit / test / typecheck / lint once via `.cleargate/config.yml`; agents reference verbs, not language-specific commands.
- **Universality enforced by CI (STORY-018-04 + 018-05).** scaffold-lint blocks the leak source at PR time; foreign-repo integration test blocks the breakage at PR time. Both jobs run on every push to `main` and every pull request to `main`.
- **Dogfood loop unchanged.** This repo's own `.cleargate/config.yml` ports the existing `npm run typecheck --workspace=cleargate-cli && npm test` pre-commit verbatim. Pre-commit gate behavior is byte-identical to pre-EPIC-018 — DoD §3 "Meta-repo workflow unchanged" passes.

### Risks that materialized

From the sprint plan's risk table:

- **R-01 (018-03 dogfood loop break) — mitigated as designed.** This repo's `.cleargate/config.yml` was committed in the same commit as the agent rewording (`4d40066`). Loop parity preserved.
- **R-02 (scaffold-lint flags legitimate examples) — hit-and-handled.** The default blocklist's case-insensitive substring match flagged English words: `hono` ⊂ `honour`, `express` as verb, `bootstrap` as verb. Resolved via 17 file-glob-scoped allowlist entries with explanatory comments (see `.cleargate/scaffold-allowlist.txt`). Recorded as flashcard `2026-04-24 #scaffold-lint #blocklist #false-positive`.
- **R-03 (initHandler `cwd` seam absent) — did-not-fire.** Architect M2 pre-flight confirmed the seam exists at `cleargate-cli/src/commands/init.ts:46,136`. No seam-add story needed.
- **R-04 (README walkthrough cites unstable verbs) — mitigated as designed.** STORY-018-02 was scheduled to merge after 018-03's verb shape locked. One QA-driven docs nudge fired (the `config.example.yml` path was ambiguous in the walkthrough); orchestrator-applied fix in `9d2ff0e`.
- **R-05 / R-06 (CI permissions / Node 24 availability) — did-not-fire.** Pinned `node-version: 24` and `actions/setup-node@v4` worked first-try.

**New risks surfaced mid-sprint (not in the plan):**

- **Commander v12 routing surprise (018-03).** Initial draft of `cleargate gate <name>` used a single parameterized subcommand expecting catch-all behavior; QA caught that Commander v12 emits `unknown command` before the parameterized handler fires when sibling literal subcommands exist. Resolved by enumerating each gate verb explicitly. Recorded as flashcard `2026-04-25 #cli #commander #subcommand-routing`. One QA kickback, fix in `deb070c`.
- **Subagent permission denial on `.claude/` writes (018-03).** Developer subagent could not edit live agent-definition files mid-flight; orchestrator had to mediate the 4 agent-wording edits. Filed as a candidate scaffold CR (CR-003 — see Open follow-ups).
- **`import.meta.url` resolution under vitest source-mode (018-05).** `resolveDefaultPayloadDir` resolved to `src/` not `dist/` in test runs because vitest evaluates source TypeScript. Test now computes payload/template dirs from its own `__dirname`; the export on `resolveDefaultPayloadDir` is still added for dist-runtime consumers. Recorded as flashcard `2026-04-24 #tsup #bundle #import-meta #test-seam`.
- **Real scaffold YAML bug surfaced by 018-05 (out-of-scope, deferred).** `assertMdFilesParseClean` was scoped to `.cleargate/` only because `cleargate-planning/.claude/agents/cleargate-wiki-lint.md` has an unquoted backtick in `description:` that trips `js-yaml` CORE_SCHEMA. Real bug; not 018-05's scope to fix. Orchestrator will file BUG-004 post-Reporter.

### Cost envelope

**Ledger absent.** `.cleargate/sprint-runs/SPRINT-12/token-ledger.jsonl` does not exist. `.cleargate/sprint-runs/.active` is empty (the SPRINT-10 / SPRINT-11 §5 follow-up to bootstrap the sentinel + ledger at `sprint init` was again not adopted). `state.json` is also absent for SPRINT-12 (only SPRINT-10 and SPRINT-11 have one in the run-dir tree). This is the **third sprint** in a row affected by BUG-002.

Cost is reported as unavailable. Agent invocations can still be counted: **~9 subagent spawns** (Architect M1 + M2, Developer ×5, QA ×3 visible kickbacks/passes, Reporter ×1) plus **~2 orchestrator-direct interventions** (the 018-03 agent-file mediation and the 018-02 docs-completeness fix).

### What's unblocked for next sprint

- **Public adoption.** `0.3.0` publish (separate `chore(SPRINT-12): bump 0.2.1 → 0.3.0` commit per EPIC-018 §6 Q4) makes the framework npm-installable into any repo. ClearGate stops being a private dogfood repo.
- **Regression safety net.** scaffold-lint + foreign-repo CI guard against future dogfood leakage on every PR. SPRINT-13 hygiene work can land knowing this surface is enforced.
- **Universality unlocks downstream proof-of-concept.** Any subsequent "first foreign-repo install" demo can run end-to-end without prerequisite scaffold edits.

**Still blocked / residual:** SPRINT-12 itself archives via manual merge to main — `cleargate sprint archive`'s wrapper from STORY-015-04 still cannot self-close because the 145 pre-existing `wiki lint` findings (CR-002) trigger rollback. Both BUG-002 (ledger bootstrap) and BUG-003 (MANIFEST.json dirty) reappeared this sprint. EPIC-016 (Upgrade UX / CHANGELOG) remains a Draft stub.

---

## For Developers

### Per-story walkthrough

**STORY-018-01: LICENSE (MIT)** · L1 · cost unavailable · merged at 00:58 in batch with 018-03 (`e4bdd77`)
- Files: `LICENSE` (root, MIT text replaced existing wrong-copyright file), `cleargate-cli/LICENSE` (new), `cleargate-cli/package.json` (+`license` field, +`files` array entry).
- Tests added: 4 (`test/lib/license-contract.test.ts`, 49 lines) — root LICENSE present + MIT-text contract + CLI mirror byte-identical + package.json field + files-array inclusion.
- Kickbacks: **0** (one-shot).
- Deviations from plan: M1 architect noted LICENSE already existed with wrong copyright — *edit*, don't *create*. Recorded as flashcard `#license #pre-existing-file`.
- Flashcards recorded: `#license #pre-existing-file` (M1 architect blueprint surface).
- Commit: `ace3652` (feat). Merge `e4bdd77`.

**STORY-018-02: README split + stranger onboarding** · L2 · cost unavailable · ~7 min effective coding (01:04 → 01:11 merge, after 018-03 verb shape locked)
- Files: `README.md` (-154/+79 net — full rewrite as 79-line stranger onboarding), `docs/INTERNALS.md` (new, 178 lines — repo layout + four-agent loop + dogfood detail moved here).
- Tests added: 0 (docs-only story, no test DoD).
- Kickbacks: **1** (QA flagged: missing repo-layout tree + stack-versions section in INTERNALS; `config.example.yml` path ambiguity in README walkthrough). Orchestrator applied docs fixes in `9d2ff0e` (config-instruction + INTERNALS layout/stack sections).
- Deviations from plan: orchestrator-mediated fix-up rather than developer bounce — the gaps were docs-completeness, not implementation correctness.
- Flashcards recorded: none net-new (docs surface).
- Commits: `6d9d50e` (feat), `9d2ff0e` (fix). Merge `822f5b1`.

**STORY-018-03: Config-driven gates** · L2 · cost unavailable · ~58 min (00:19 first commit → ~00:58 merge, including bounce)
- Files: `cleargate-cli/src/commands/gate-run.ts` (new, 88 lines), `cleargate-cli/src/cli.ts` (+26 lines — initially one parameterized subcommand, refactored to four enumerated subcommands), `cleargate-cli/src/lib/wiki-config.ts` (+38, extended for `gates` map), `cleargate-planning/.cleargate/config.example.yml` (new, 37 lines), `.cleargate/config.yml` (new, 11 lines — dogfood parity), `cleargate-planning/.claude/agents/developer.md` + `qa.md` (mediated by orchestrator due to subagent `.claude/` permission denial).
- Tests added: 8 (`test/commands/gate-run.test.ts`, 246 lines) covering Gherkin scenarios 1–5, with Scenario 5 (rejection of unknown subcommand) updated to assert Commander's native `unknown command` rather than a custom branch.
- Kickbacks: **1** (QA caught the Commander v12 catch-all assumption — see flashcard `#cli #commander #subcommand-routing`). Fix in `deb070c` enumerated four explicit subcommands.
- Deviations from plan: (a) initial single-subcommand draft replaced with enumerated four-subcommand registration; (b) developer subagent could not write to live `.claude/agents/*.md` (permission denial), so orchestrator applied the 4 agent-wording edits manually.
- Flashcards recorded: `#cli #commander #subcommand-routing` (the real lesson); a partially-retracted M1-architect flashcard `#gate #commander #subcommand-precedence` predates and was superseded by it.
- Commits: `4d40066` (feat), `deb070c` (fix/enumerate). Merge `c4550a9`.

**STORY-018-04: scaffold-lint + CI workflow** · L2 · cost unavailable · ~17 min (01:11-ish staging → 01:23 commit → 01:28 merge)
- Files: `cleargate-cli/src/commands/scaffold-lint.ts` (new, 283 lines — `scaffoldLintHandler` with `cwd`/`stdout`/`stderr`/`exit`/`planningDir` seams), `cleargate-cli/src/lib/scaffold-blocklist.ts` (new, 169 lines — categorized default blocklist), `.github/workflows/scaffold-lint.yml` (new, 26 lines — single `scaffold-lint` job, scaffold for 018-05's extension), `.cleargate/scaffold-allowlist.txt` (new, 46 lines — 17 effective entries with comment headers), `cleargate-cli/src/cli.ts` (+ `scaffold-lint` subcommand registration after the gate block).
- Tests added: 8 unit tests (`test/commands/scaffold-lint.test.ts`, 317 lines) + 1 lib test (`test/lib/scaffold-blocklist.test.ts`, 39 lines) covering all 6 Gherkin scenarios + clean tree + flagged tree.
- Kickbacks: **0** (one-shot). Interesting edge: live-tree run failed first because of English-word substring collisions; resolved by extending `.cleargate/scaffold-allowlist.txt` per the M2 pre-flight blueprint, no plan deviation.
- Deviations from plan: scan root hard-coded to `path.join(cwd, 'cleargate-planning')` exactly per M2 §STORY-018-04 instructions. No widening to repo root.
- Flashcards recorded: `#scaffold-lint #blocklist #false-positive` (English-word substring matches; allowlist by file-glob).
- Commit: `a5d655c` (feat). Merge `58d2f50`.

**STORY-018-05: Foreign-repo integration test** · L2 · cost unavailable · ~21 min (01:28 → 01:49 merge)
- Files: `cleargate-cli/test/integration/foreign-repo.test.ts` (new, 356 lines — Node + Go fixtures, 7 scenarios per M2 plan), `.github/workflows/scaffold-lint.yml` (+18 lines — added second job `foreign-repo-integration` parallel to scaffold-lint job, no `setup-go` because Go fixtures are inert text), `cleargate-cli/src/commands/init.ts` (+1 — `export` added to `resolveDefaultPayloadDir` per M2 plan §Open decisions for orchestrator).
- Tests added: 6 effective assertion blocks (init Node + init Go + scaffold-lint clean + gate friendly-fallback + configured gate captures `PRECOMMIT_OK` + wiki build mirrors PROPOSAL-999). Runtime: ~8s — well under the 30s DoD ceiling.
- Kickbacks: **0** (one-shot, 2 accepted deviations).
- Deviations from plan: (a) test computes payload/template dirs from its own `__dirname` rather than calling `resolveDefaultPayloadDir` directly, because `import.meta.url` under vitest source-mode points to `src/`; the export is still added for dist-runtime consumers per M2 plan; (b) `assertMdFilesParseClean` scoped to `.cleargate/` only — `cleargate-planning/.claude/agents/cleargate-wiki-lint.md` has an unquoted backtick in `description:` that trips `js-yaml` CORE_SCHEMA. Real scaffold bug, will be filed as BUG-004 post-Reporter.
- Flashcards recorded: `#tsup #bundle #import-meta #test-seam` (vitest source-mode `import.meta.url` ≠ dist-mode; tests must compute paths from `__dirname`).
- Commit: `f6bce0e` (feat). Merge `7d70128`.

### Agent efficiency breakdown

| Role | Invocations | Tokens | Cost | Tokens/story | Notes |
|---|---|---|---|---|---|
| Architect | 2 (M1 inline, M2 file) | — | — | — | Ledger absent; M1.md was not preserved as a separate file in the run dir, only M2.md (19,418 bytes) survives |
| Developer | 5 + 1 bounce (018-03 enumerate) | — | — | — | Subagent permission denial blocked 018-03's `.claude/agents/` writes; orchestrator mediated 4 edits |
| QA | ~3 (018-02 kickback, 018-03 kickback, 018-04 + 018-05 passes) | — | — | — | Two QA kickbacks total (018-02 docs, 018-03 Commander routing) |
| Reporter | 1 | — | — | — | This report |

**Three-source token reconciliation: N/A.** No ledger rows, no `state.json`, empty `.active` sentinel. The SPRINT-10 §5 + SPRINT-11 §"What the loop got wrong" follow-up to bootstrap `.active` + `token-ledger.jsonl` at `cleargate sprint init` is now a **three-sprint-old** open item. Cost reporting is degraded to "agent invocations" only for the third sprint running.

### What the loop got right

- **One-shot rate held on 3 / 5 stories.** STORY-018-01, 018-04, 018-05 all landed first-pass by the developer agent. The two kickbacks were both legitimate: 018-02 was docs-completeness (caught by QA, fixed by orchestrator), 018-03 was a real Commander v12 routing assumption (caught by QA, fixed by developer in `deb070c`).
- **M2 architect plan was load-bearing.** The pre-flight check that confirmed `initHandler`'s `cwd` seam already exists prevented an 018-05 split into seam-add + test stories. The pre-flight enumeration of live-repo scaffold-lint collisions gave the 018-04 developer the allowlist starter set in advance — no live-tree-debugging round-trip needed.
- **Sequential M2 ordering held.** 018-04 → 018-05 with serialized `cli.ts` and `scaffold-lint.yml` edits produced trivial rebases. Zero merge conflicts on the shared workflow file.
- **Dogfood parity preserved.** The 018-03 commit landed `cleargate-planning/.claude/agents/{developer,qa}.md` rewording, `.cleargate/config.example.yml`, and this repo's own `.cleargate/config.yml` together — R-01 didn't fire because the commit was atomic.
- **Foreign-repo test caught a real scaffold bug while staying in scope.** 018-05's `assertMdFilesParseClean` discovered the `cleargate-wiki-lint.md` YAML backtick issue. Test scoped narrowly to `.cleargate/`, real bug filed for follow-up. Surface tested, scope respected.

### What the loop got wrong

- **Ledger + state.json + `.active` sentinel STILL absent — third sprint in a row.** Same root cause as SPRINT-10 and SPRINT-11. Cost reporting is degraded to invocation count only. **Concrete loop improvement:** make `.active` sentinel auto-write + `token-ledger.jsonl` bootstrap a **blocking** DoD item for `cleargate sprint init` in the next orchestration-polish sprint, not an aspirational one. Reference flashcards `2026-04-19 #reporting #hooks #ledger` and `2026-04-19 #reporting #hooks #ledger #subagent-attribution`. Three sprints of degraded reporting is enough.
- **Subagent `.claude/` permission denial breaks the developer-agent contract.** 018-03 needed live agent-definition edits and the developer subagent could not write to them; orchestrator had to apply the 4 edits manually. **Concrete loop improvement:** file as CR-003 — either (a) extend the subagent permission allowlist to include `.claude/agents/*.md` writes, or (b) route those edits through a dedicated tool/skill that wraps the write with provenance attribution. The current pattern silently shifts work to the orchestrator and breaks "one developer-agent owns the story end-to-end."
- **Architect M1 plan not preserved as a file.** Only `plans/M2.md` survived in `.cleargate/sprint-runs/SPRINT-12/`. M1 ran inline (the architect output was consumed by the developer spawns directly), but the artifact wasn't written to disk for retrospective analysis. **Concrete loop improvement:** the M1 architect spawn must always write to `plans/M1.md` even when the sprint is small — REPORT.md cross-references plan-vs-execution and the missing file made the 018-01 / 018-02 / 018-03 plan-adherence check anecdotal rather than evidentiary.
- **English-word substring collisions on scaffold-lint blocklist were predictable but not pre-empted.** `hono` ⊂ `honour`, `express` as verb, `bootstrap` as verb. The M2 pre-flight enumerated six categories of collisions but missed the three English-word cases. **Concrete loop improvement:** future blocklist designs should require word-boundary regex (`\b<term>\b`) by default and use bare substring only for known-no-collision strings. Tracked in flashcard `#scaffold-lint #blocklist #false-positive`; the prescription (word-boundary default) is missing from it.
- **Pre-existing failures still pre-existing.** `bootstrap-root.test.ts` (live Postgres), `snapshot-drift.test.ts` (mcp submodule), `session-start.test.ts` (timing flake) all unchanged. Each sprint's REPORT names them; none get fixed. **Concrete loop improvement:** add a CR (or grow EPIC-016) to either fix them or move them under a `xtest:` opt-in glob so `cleargate gate test` runs green by default in this repo too.
- **`cleargate-planning/MANIFEST.json` dirties every workflow — same as SPRINT-11.** BUG-003 from SPRINT-11 still open. Build-regenerated artifact keeps appearing in `git status`. **Concrete loop improvement:** unchanged from SPRINT-11 — `.gitignore` it or pre-commit-stage it deterministically. This is now a six-sprint-cumulative noise problem.

### Open follow-ups

- **BUG-002 (ledger + sentinel bootstrap at `sprint init`)** — third sprint open. Target: next orchestration-polish sprint as a blocking DoD item.
- **BUG-003 (`cleargate-planning/MANIFEST.json` dirty)** — second sprint open. Target: small CR.
- **BUG-004 (scaffold `cleargate-wiki-lint.md` YAML backtick)** — surfaced this sprint by 018-05; orchestrator will file post-Reporter. Narrow fix: quote the backtick or escape it in the description field.
- **CR-002 (wiki-lint drift, 145 pre-existing findings)** — still blocking sprint-archive wrapper self-closure. SPRINT-12 archives manually for the same reason SPRINT-11 did.
- **CR-003 candidate (`.claude/agents/*.md` subagent writes)** — orchestrator-intervention pattern in 018-03 should be removed by extending subagent permissions or routing via a dedicated tool. New this sprint.
- **EPIC-016 (Upgrade UX + CHANGELOG)** — Draft stub. Related to the `0.3.0` publish chore that lands separately at sprint close.
- **Architect M1 plan persistence** — small process fix: always write `plans/M1.md` even on small sprints.
- **Pre-existing test failures** (Postgres / mcp snapshot / session-start timing) — recommend grouping into a CR or EPIC-016 expansion.
- **`.architect.md.bak` leftover** in the 018-05 worktree — harmless, will be cleaned at sprint close.
- **Post-sprint chore: `chore(SPRINT-12): bump 0.2.1 → 0.3.0`** — orchestrator lands separately per EPIC-018 §6 Q4. Not a story artifact.

---

## Meta

**Token ledger:** `.cleargate/sprint-runs/SPRINT-12/token-ledger.jsonl` — **absent** (third-sprint-running BUG-002).
**State file:** `.cleargate/sprint-runs/SPRINT-12/state.json` — **absent** (`cleargate sprint init` did not write the file; `.active` sentinel exists but is empty).
**Plans surviving in run dir:** `plans/M2.md` only (19,418 bytes); `plans/M1.md` not preserved.
**Commits on sprint branch:** 11 (`git log sprint/SPRINT-12 --not main`): 5 `feat` + 2 `fix` + 4 `merge`.
**Flashcards added this sprint:** 5. Themes: Commander v12 subcommand routing; scaffold-lint blocklist false-positives; vitest source-mode `import.meta.url`; LICENSE pre-existing file; gate Commander subcommand precedence (partially retracted by the routing card).
**Test status:** 27 new sprint-scoped tests green (license-contract 4 + gate-run 8 + scaffold-blocklist 1 + scaffold-lint 8 + foreign-repo 6). Pre-existing infra failures unchanged (bootstrap-root Postgres, mcp snapshot-drift, session-start timing) — ignored per sprint plan §v2 execution reminders.
**Diff stat (sprint vs main):** 26 files changed, 2032 insertions, 121 deletions. Net +1911 LOC.
**Wiki metrics:** unchanged from SPRINT-11 (no wiki-shape work this sprint; `wiki lint` still surfaces 145 pre-existing findings — CR-002).
**Model rates used:** N/A (ledger absent).
**Report generated:** 2026-04-25 by Reporter agent (one-shot, orchestrator-spawned). Write to `.cleargate/sprint-runs/SPRINT-12/REPORT.md` was blocked by subagent file-write guardrail (same as SPRINT-11); body returned as text and landed by orchestrator.

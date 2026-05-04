# Changelog

All notable changes to this project are documented in this file.
Format: [Common Changelog](https://common-changelog.org/) — most-recent version first.

## [0.11.1] — 2026-05-05

Hotfix.

### Fixed
- **`cleargate doctor` no longer reports false-positive `cleargate misconfigured: cleargate-planning/MANIFEST.json not found`** — `cleargate-cli/src/commands/doctor.ts` `runHookHealth()` was checking `cleargate-planning/MANIFEST.json`, a path that `copy-payload.ts` (CR-053, v0.11.0) explicitly never creates in target repos. Doctor now checks `.cleargate/.install-manifest.json` (the actual install snapshot written by `init`). Every healthy v0.11.0 install previously printed the warning + exited 2 from `doctor`.

## [0.11.0] — 2026-05-04

SDLC Hardening Wrap-Up + Docs Aligned (SPRINT-25). Six CRs shipped (CR-053..CR-058); the SDLC Hardening arc closes here.

### Added
- **`run_script.sh` byte-correct UTF-8 truncation** (CR-054) — `_truncate_stream()` now uses `head -c $MAX_BYTES` with a separate `wc -c` source-file check gating the suffix append; `${var:0:N}` was char-index, not byte-count, and silently mis-truncated multi-byte input (cyrillic, CJK).
- **wrapScript helper adoption in 4 caller tests** (CR-055) — `cleargate-cli/test/commands/{sprint,state,gate,story}.node.test.ts` now consume the `wrapScript` helper end-to-end (one new `await wrapScript(...)` scenario per file). JSDoc canonical-pattern block added at top of `cleargate-cli/test/helpers/wrap-script.ts`. Suite runtime: 52s → 57s (1.09×).
- **Skill-candidate heuristic — session-shared filter + cross-sprint dedup + threshold raise** (CR-056) — `.cleargate/scripts/suggest_improvements.mjs` (live + canonical) tightens `scanSkillCandidates`: (1) `isSessionShared()` filters buckets where all entries share one session UUID (token-attribution artifact); (2) cross-sprint hash dedup scans prior `improvement-suggestions.md`; (3) threshold raised to "≥3× across ≥2 distinct sprints AND not session-shared". Eliminates the every-sprint "CR-045 × architect" false-positive.
- **`script-incident-corpus-analysis.md` knowledge doc** (CR-057) — `.cleargate/knowledge/script-incident-corpus-analysis.md` formally closes CR-046 §0.5 Q3 deferred self-repair question. DOCS-MODE shipped (no `run_script.sh` self-repair logic) — corpus = 3 incidents, no recurring failure pattern. Revisit-trigger documented.
- **Five-role agent team** in README (CR-058) — root `README.md` rebranded "Four-Agent Loop" → "Five-Role Agent Loop"; describes Architect (4 modes: SDR/M1/TPV/post-flight), Developer, QA (Red + Verify modes), DevOps (mechanical merge + state), Reporter (sprint close); 4 explicit gates documented (Gate 1 Initiative, Gate 2 Ambiguity, Gate 3 preflight, Gate 4 close); §What's New section recaps SPRINT-22..SPRINT-24 (CR-042..CR-052); MCP adapter claim softened to "in development" (only LinearAdapter currently shipped). New `.cleargate/sprint-runs/SPRINT-25/lifecycle-diagram-prompt.md` (164 lines, structured headings) ready for external image-generator.
- **`cleargate-cli/README.md` Commands section** (CR-058) — documents `sprint preflight/init/close`, `gate check`, `doctor`, `state update/validate`, `story start/done/bouncing`.

### Fixed
- **`cleargate init` no longer writes `MANIFEST.json` to user-repo root** (CR-053) — `cleargate-cli/src/init/copy-payload.ts` `SKIP_FILES` adds `'MANIFEST.json'`; the npm-payload-root MANIFEST.json (parity manifest for the meta-repo's payload-copy verification) was being copied into every user repo as a side-effect of `copyPayload` walking the payload root. Removes the SPRINT-24 `.gitignore` `/MANIFEST.json` stopgap (commit `5fd8b22`).

### Changed
- Package description rebranded "four-agent loop" → "five-role agent team".

---

## [0.10.0] — 2026-05-02

### Added
- **Sprint-execution skill** (EPIC-026) — `.claude/skills/sprint-execution/SKILL.md` is now the canonical orchestration playbook (auto-loaded on sprint-active sessions); SessionStart hook + `cleargate sprint preflight|init` emit `→ Load skill: sprint-execution` directive (STORY-026-01).
- **Composite preflight gate** (CR-027) — `cleargate sprint preflight` now runs five checks (was four); new check #5 verifies per-item `cached_gate_result.pass=true` for every in-scope work item; new `discovery-checked` + `risk-table-populated` readiness criteria.
- **Code-truth triage stack** (CR-028) — protocol unnumbered "Code-Truth Principle" preamble; new `## Existing Surfaces` + `## Why not simpler?` sections in epic/story/CR templates; new `reuse-audit-recorded` + `simplest-form-justified` predicates.
- **PreToolUse:Task hook** (CR-026) — `.claude/hooks/pre-tool-use-task.sh` auto-writes dispatch markers by parsing tool_input.prompt for work-item IDs; banner-immune; uniquified filename avoids parallel-spawn collision.
- **Inner-loop test runner guidance** (CR-029 Phase E partial) — `.claude/agents/developer.md` instructs Dev agents to write new test files in `node:test` + `node:assert/strict` for ~80MB RAM vs ~400MB vitest fork.
- `.cleargate/scripts/dedupe_frontmatter.mjs` — corpus dedupe pass for any duplicate frontmatter keys (BUG-025 follow-on).

### Changed
- **Token-ledger attribution** (CR-026) — `.claude/hooks/token-ledger.sh` now uses newest-file dispatch lookup (not session-id-keyed) + skips `^[0-9]+ items? blocked:` SessionStart-banner prefixes via `BANNER_SKIP_RE`; resolves three BUG-024 attribution defects.
- **CLAUDE.md (live + canonical)** (STORY-026-02) — pruned ~26 lines of orchestration prose now lives in the sprint-execution skill; preserved halt rules, Gate 1 / Gate 4 contracts, Sprint-mode v1/v2, Boundary-gates pointers; added always-on "Skill auto-load directive" rule.
- **`assert_story_files.mjs`** (CR-027) — exports `extractWorkItemIds` + `findWorkItemFile`; adds `--emit-json` flag for CLI shell-out.

### Fixed
- **`backfill_hierarchy.mjs::spliceKeys()`** (BUG-025) — was inserting NEW line for existing-null keys, producing duplicate frontmatter lines on each PostToolUse stamp; fix is two-phase: Phase 1 in-place replace, Phase 2 insert-absent-only.
- 4 corpus files de-duplicated of orphaned `parent_cleargate_id:` lines (BUG-024, SPRINT-17, CR-023, EPIC-024).

### Caveats (live wiring deferred)
- `.claude/settings.json` (live) is gitignored and not yet wired to the new `pre-tool-use-task.sh`; only the canonical mirror (`cleargate-planning/.claude/settings.json`) is updated. Effect: takes hold on next `cleargate init` or manual settings edit.
- Templates use numbered headings (`## 3.5 Existing Surfaces`) which don't match bare-substring predicates (`## Existing Surfaces`); SPRINT-20 anchors are backfilled with bare headings, but fresh template drafts will fail the new gates until follow-up CR ships.

---

## [0.9.0] — 2026-04-30

### Added
- `src/lib/ledger.ts` — `sumDeltas()` helper for per-turn token delta math; exported via `package.json` `exports["./lib/ledger"]` (CR-018, closes BUG-022).
- Reporter agent contract updated to sum `delta.*` fields instead of flat `input/output/cache_*` fields; `pre_v2_caveat` emitted for mixed/legacy ledgers.
- `cleargate wiki contradict` CLI command + `lib/wiki/contradict.ts` helper (STORY-020-03).
- `cleargate push` hierarchy keys in wiki-ingest Phase 4 + backfill script (STORY-015-06).

### Changed
- Token-ledger hook now maintains `.cleargate/sprint-runs/<sprint>/.session-totals.json` keyed by `session_id`; each SubagentStop computes `delta = current_session_total − prior_session_total`, replacing the former flat fields that caused N×cost inflation across multi-fire sessions.
- `src/lib/wiki/ingest.ts` — wiki-ingest Phase 4 prepare/commit split: advisory log + ledger role attribution (STORY-020-02).

### Fixed
- `fix(SPRINT-15)` CR-018 QA bounce — bundle `src/lib/ledger.ts` in tsup output + correct `package.json` export path.

---

## [0.8.2] — 2026-04-27

### Fixed
- Strip `cleargate`-internal cross-reference comments from scaffolded templates on `cleargate init` (BUG-020) — prevents canonical-repo comments from leaking into user repos.

---

## [0.8.1] — 2026-04-27

### Fixed
- `.mcp.json` now uses `npx -y cleargate@<pin>` so the MCP server spawn works without a global install (BUG-019 follow-up).

---

## [0.8.0] — 2026-04-27

### Added
- `cleargate mcp serve` — stdio↔HTTP MCP proxy with auto-refresh auth; required for Claude Desktop integration (BUG-019).

---

## [0.7.0] — 2026-04-27

### Added
- `cleargate init` now writes `.mcp.json` for Claude Desktop MCP configuration (BUG-017).

### Fixed
- `cleargate init` preserves `+x` executable bit on hook files; previously lost on content-identical overwrites (BUG-018).

---

## [0.6.2] — 2026-04-27

### Fixed
- Exclude `CLAUDE.md` from `copyPayload` during `cleargate init` — prevents the canonical meta-repo preamble from being written into user repos (BUG-016).

---

## [0.6.1] — 2026-04-27

### Fixed
- `cleargate init` resolver-probe failure is now warn-only, not a blocking error — fixes CI regression introduced in 0.6.0 (BUG-015).
- Resolver-probe and hook fallback use the correct package name `cleargate` instead of `@cleargate/cli` (BUG-013).

---

## [0.6.0] — 2026-04-27

### Added
- SPRINT-14 M3–M5 deliverables: `cleargate hotfix new` command + hotfix lane scaffold (STORY-022-06).
- State.json schema v1→v2 migration + lane CLI flags (`--fast` / `--standard`) for story dispatch (STORY-022-02).
- Developer agent lane-aware execution + demotion delegation (STORY-022-05).
- `pre_gate_runner.sh` lane-aware demotion logic + LD event emission (STORY-022-04).
- Architect Lane Classification rubric; fast-lane protocol §24 (STORY-022-01).
- Reporter sprint-report v2.1 + `close_sprint.mjs` validation (activation-gated) (STORY-022-07).

### Changed
- Doctor exit-code semantics: 0 = clean, 1 = blocked, 2 = config-error (STORY-014-01; closes CR-009 carry-over).
- `cleargate gate` planning-first enforcement: Phase A stdout routing + Phase B PreToolUse warn-only (CR-008).
- Hook resolver pin + loud preflight + pin-aware manifest; hook fallback uses versioned `npx` call (CR-009).

### Fixed
- Token-ledger detector scopes to dispatch marker, not transcript content (BUG-010).
- Token-ledger `PROP↔PROPOSAL` regex normalization + alternation fix (BUG-009).
- Gate criteria over-match on `proposal-approved` / `no-tbds` / `blast-radius-populated` fields (BUG-008).
- `cleargate init` participant prompt now visible inline (BUG-007).

---

## [0.5.0] — 2026-04-26

### Fixed
- Init scaffold hooks now resolve `cleargate` via PATH correctly; removes the broken `@cleargate/cli` fallback reference (BUG-006).

---

## [0.4.0] — 2026-04-25

### Added
- `cleargate join` two-step flow + admin-login refactored onto identity-flow helpers (CR-006, EPIC-019).
- Admin-login CLI snapshot regression test (CR-004).

---

## [0.3.0] — 2026-04-25

### Added
- MIT `LICENSE` file shipped with the npm tarball (STORY-018-01).
- `cleargate gate` config-driven gate subcommands with Commander v12 routing (STORY-018-03).
- `cleargate init` scaffold-lint + CI workflow (STORY-018-04).
- Foreign-repo integration test (`test/integration/foreign-repo.test.ts`) (STORY-018-05).
- `cleargate wiki` hierarchical index rendering + golden-file test (STORY-015-01, STORY-015-02).
- `cleargate wiki audit-status` command for lifecycle status drift reconciliation (STORY-015-02).
- Wiki index token-budget lint (STORY-015-03).
- `abandoned` work-item status + sprint-close stamp on `cleargate sprint close` (STORY-015-04).
- `cleargate sprint archive` wrapper command (STORY-014-08).
- `cleargate sprint story start` and `story complete` atomic commands (STORY-014-07).
- `cleargate sprint` CLI flag plumbing (STORY-014-06).
- `execution_mode` flag + CLI wrappers (STORY-013-08).
- Immediate flashcard hard-gate enforcement (STORY-013-06).

### Changed
- `cleargate` package published as public npm package under the unscoped name `cleargate` (replacing `@cleargate/cli`).

### Fixed
- Bootstrap-root FK teardown + PreToolUse pending-task sentinel hook.
- Swallow `exitFn` sentinel in async handler to prevent false exit-code propagation (STORY-015-04 fix).

---

## [0.2.1] — 2026-04-19

### Fixed
- Frontmatter YAML round-trip corruption (BUG-001) — keys with special characters were being mangled on stamp.
- Flashcard and story scaffold template updates (CR-001).

---

## [0.2.0] — 2026-04-19

### Added
- `cleargate doctor` base command + `--check-scaffold` mode (STORY-009-04).
- `cleargate doctor --session-start` + `--pricing` flags (STORY-008-06).
- `cleargate upgrade` three-way merge driver for scaffold updates (STORY-009-05).
- `cleargate init` snapshot + restore (STORY-009-03); scaffold manifest + uninstall protocol §13 (STORY-009-08).
- `cleargate uninstall` with preservation marker (STORY-009-07).
- `cleargate stamp` CLI command + `stamp-frontmatter` helper (STORY-001-05, STORY-001-04).
- `cleargate stamp-tokens` command (STORY-008-05).
- `cleargate gate check|explain` CLI (STORY-008-03).
- `cleargate wiki build`, `ingest`, `query`, `lint` commands (EPIC-002, STORY-002-05 through STORY-002-09).
- PostToolUse + SessionStart hooks scaffold (STORY-008-06).
- Hook-health log scan in doctor (STORY-008-06 QA kickback).
- Predicate evaluator + frontmatter-cache libraries (STORY-008-02).
- Build-manifest script + changelog diff tooling (STORY-009-02).
- SHA-256 + manifest libraries (STORY-009-01).
- `claude-md-surgery` + `settings-json-surgery` libraries (STORY-009-06).
- Ledger hook generalization + sprint-routing fix + ledger-reader (STORY-008-04).
- `cleargate init` writes scaffold, PostToolUse hook, and CLAUDE.md block (STORY-002-05).
- Root README + CLI README/description sync (STORY-007-02, STORY-007-03).
- Wiki synthesis templates (STORY-002-09).
- Codebase-version helper (STORY-001-03).
- Readiness-gates.md with 6 gate definitions (STORY-008-01).
- Template stubs + protocol §12 + wiki-lint gate checks (STORY-008-07).

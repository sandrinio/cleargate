---
sprint_id: "SPRINT-05"
remote_id: null
source_tool: "local"
status: "Completed"
start_date: "2026-04-19"
end_date: "2026-04-19"
activated_at: "2026-04-19T12:25:00Z"
completed_at: "2026-04-19T15:05:00Z"
synced_at: null
created_at: "2026-04-19T00:00:00Z"
updated_at: "2026-04-19T16:05:00Z"
created_at_version: "post-SPRINT-04"
updated_at_version: "post-SPRINT-05"
epics: ["EPIC-001", "EPIC-008", "EPIC-009"]
story_count: 21
---

# SPRINT-05: ClearGate Process Refinement (Dogfood Trifecta)

## Sprint Goal

Ship **EPIC-001 (Document Metadata Lifecycle) + EPIC-008 (Per-Work-Item Token Cost + Readiness Gates) + EPIC-009 (Scaffold Manifest + Drift Detection + Uninstall)** end-to-end in one push. After this sprint the framework becomes **self-observant** (every work item auto-stamps `created_at`/`updated_at`/`codebase_version` + `draft_tokens` cost), **self-validating** (machine-checkable readiness gates block Gate 1/3 on drift; advisory on Proposals, enforcing on Epic/Story/CR/Bug), and **cleanly reversible** (SHA-tracked scaffold manifest drives drift detection, three-way-merge upgrades, and a preservation-first uninstall). All three Epics share overlapping surface (`.claude/settings.json` hooks, `cleargate-protocol.md` §§11/12/13, `cleargate doctor` command, frontmatter stubs on all 7 templates) — they ship together because doing them in sequence would force three rounds of scaffold-mirror + template edits across three sprints instead of one coherent release. This is the largest sprint to date (21 stories vs. SPRINT-01's prior high of 12); the milestone plan below serializes the shared-file stories to keep merge conflicts bounded.

## Consolidated Deliverables

### EPIC-001 — Document Metadata Lifecycle (6 stories) — foundational; blocks EPIC-008 stamp layer

- [`STORY-001-01`](STORY-001-01_Template_Metadata_Fields.md): All 7 templates gain `created_at`/`updated_at`/`created_at_version`/`updated_at_version`/`server_pushed_at_version` in YAML frontmatter. Also mirrored to `cleargate-planning/.cleargate/templates/`. · L1
- [`STORY-001-02`](STORY-001-02_Protocol_Section_11.md): Protocol §11 "Document Metadata Lifecycle" added to `cleargate-protocol.md` (field semantics, idempotency, dirty-SHA convention, archive immutability, git-absent fallback). · L1
- [`STORY-001-03`](STORY-001-03_Codebase_Version_Helper.md): `cleargate-cli/src/utils/codebase-version.ts` — returns `{sha, dirty, tag, package_version}` from git; falls back to `package.json` when git absent; appends `-dirty` suffix on non-empty `git status --porcelain`. · L2
- [`STORY-001-04`](STORY-001-04_Stamp_Frontmatter_Helper.md): `cleargate-cli/src/utils/stamp-frontmatter.ts` — idempotent YAML frontmatter updater. Preserves key order; `created_at` immutable once set; `updated_at`/`updated_at_version` advance; archive paths freeze all fields. · L2
- [`STORY-001-05`](STORY-001-05_Stamp_CLI.md): `cleargate stamp <file>` CLI + `--dry-run`. Calls codebase-version + stamp-frontmatter helpers. Exit 0 on success. · L1
- [`STORY-001-06`](STORY-001-06_MCP_Pushed_At_Version.md): MCP `push_item` writes `server_pushed_at_version` into the pushed payload's frontmatter at push time (using codebase-version helper against MCP's container image). Cross-repo change in `mcp/`. · L1

### EPIC-008 — Token Cost + Readiness Gates (7 stories) — depends on EPIC-001's stamp-frontmatter + codebase-version helpers

- [`STORY-008-01`](STORY-008-01_Readiness_Gates_Doc.md): Author `.cleargate/knowledge/readiness-gates.md` — canonical YAML declaring all 6 transitions × criteria (proposal.ready-for-decomposition advisory; epic.ready-for-decomposition, epic.ready-for-coding, story.ready-for-execution, cr.ready-to-apply, bug.ready-for-fix — all enforcing). · L2
- [`STORY-008-02`](STORY-008-02_Predicate_Evaluator.md): `readiness-predicates.ts` + `frontmatter-cache.ts` libs — closed-set predicate evaluator (6 predicate shapes: frontmatter-ref, body-contains, section-count, file-exists, link-target-exists, status-of); idempotent `cached_gate_result` writer. Sandboxed; reuses EPIC-001's stamp-frontmatter for YAML preservation. · L3
- [`STORY-008-03`](STORY-008-03_Gate_CLI.md): `cleargate gate check <file> [-v] [--transition]` + `cleargate gate explain <file>`. Compact output default, `-v` for full expected-vs-actual; exit non-zero on enforcing failure, 0 on advisory. · L2
- [`STORY-008-04`](STORY-008-04_Ledger_Hook_Generalization.md): Token-ledger hook generalization (`STORY_ID` → `work_item_id` for all 5 types) + **sprint-routing fix** (FLASHCARD 2026-04-19 regression: SPRINT-04 rows landed in SPRINT-03) + `ledger-reader.ts` library. Touches `.claude/hooks/token-ledger.sh` + mirror at `cleargate-planning/`. · L2
- [`STORY-008-05`](STORY-008-05_Stamp_Tokens_CLI.md): `cleargate stamp-tokens <file>` CLI. Hook-invoked, never agent-invoked. Idempotent within a session, accumulative across sessions with `sessions:[...]` breakdown. Archive paths freeze. · L1
- [`STORY-008-06`](STORY-008-06_Hooks_And_Doctor.md): PostToolUse hook `stamp-and-gate.sh` (chains stamp-tokens → gate check → wiki ingest; **replaces** SPRINT-04's standalone wiki-ingest hook via surgical settings.json merge — not duplicate registration) + SessionStart hook `session-start.sh` + `cleargate doctor` base command extensions (`--session-start`, `--pricing`). Base command created by STORY-009-04 (M2); this story extends. · L2
- [`STORY-008-07`](STORY-008-07_Templates_Protocol_WikiLint.md): `draft_tokens` + `cached_gate_result` stubs in all 7 templates (+ mirror) + Protocol §12 "Token Cost Stamping & Readiness Gates" + `wiki lint` extension (refuses 🟢-candidate Epic/Story/CR/Bug with `cached_gate_result.pass == false`; flags staleness when `last_gate_check < updated_at` for all types). · L2

### EPIC-009 — Scaffold Manifest + Uninstall (8 stories) — parallel to EPIC-001/008; shares `cleargate doctor` + settings.json surgery with EPIC-008

- [`STORY-009-01`](STORY-009-01_SHA256_Manifest_Lib.md): `sha256.ts` normalized-content hasher (LF / UTF-8 no-BOM / trailing-newline enforced) + `manifest.ts` load/compare/classify (4 drift states + `untracked` for user-artifact tier). Atomic `.drift-state.json` write. · L2
- [`STORY-009-02`](STORY-009-02_Build_Manifest_And_Changelog.md): `cleargate-cli/scripts/build-manifest.ts` — walks `cleargate-planning/`, writes `cleargate-planning/MANIFEST.json` at `npm run build` (prebuild). `generate-changelog-diff.ts` — release-time manifest diff block prepended to CHANGELOG.md. `package.json` `files[]` + asset plumbing per FLASHCARD `#tsup #npm-publish #assets`. · L2
- [`STORY-009-03`](STORY-009-03_Init_Snapshot_And_Restore.md): `cleargate init` extension — write `.cleargate/.install-manifest.json` as final step (atomic); detect `.uninstalled` marker and prompt restore (blind-copy per PROP-006 Q6). · L2
- [`STORY-009-04`](STORY-009-04_Doctor_Check_Scaffold.md): `cleargate doctor` base command (subcommand dispatcher + hook-health report) **created here**; adds `--check-scaffold` mode producing `.drift-state.json` with daily-throttled refresh. Silently skips `user-artifact` tier (PROP-006 Q8). · L2
- [`STORY-009-05`](STORY-009-05_Upgrade_Command.md): `cleargate upgrade [--dry-run] [--yes] [--only <tier>]` — three-way merge driver (`[k]eep mine / [t]ake theirs / [e]dit in $EDITOR`). Incremental per-file execution (PROP-006 Q9); snapshot updated after each successful file; resumable. · L3
- [`STORY-009-06`](STORY-009-06_Surgery_Libs.md): `claude-md-surgery.ts` (GREEDY regex per FLASHCARD 2026-04-19 `#init #inject-claude-md #regex`) + `settings-json-surgery.ts` (removes only ClearGate-owned hook entries; preserves user config). Shared by STORY-009-03 + STORY-009-07 + STORY-008-06 (for wiki-ingest hook cleanup). · L2
- [`STORY-009-07`](STORY-009-07_Uninstall_Command.md): `cleargate uninstall [--dry-run] [--preserve] [--remove] [--yes] [--path]` — preservation-first flow, typed-confirmation (project name), single-target (no recursion into nested `.cleargate/`), refuse on uncommitted changes without `--force`, `.uninstalled` marker write. Most-destructive command in the CLI — extra QA mandatory. · L3
- [`STORY-009-08`](STORY-009-08_Protocol_Section_13.md): Protocol §13 "Scaffold Manifest & Uninstall" added to `cleargate-protocol.md` (+ mirror). 6 subsections per PROP-006 §1.2. · L1

### Aggregate non-story deliverables (rolled up from the stories above)

**New CLI surface** — 6 new top-level commands and extensions:
- `cleargate stamp` (001-05), `cleargate stamp-tokens` (008-05, hook-only), `cleargate gate check|explain` (008-03), `cleargate doctor {--session-start|--check-scaffold|--pricing}` (009-04 base + 008-06 extensions), `cleargate upgrade` (009-05), `cleargate uninstall` (009-07). `cleargate init` extended (009-03).

**New hooks** (shipped in both `.claude/` dogfood and `cleargate-planning/.claude/` scaffold — mirror-discipline per FLASHCARD `#wiki #protocol #mirror`):
- `stamp-and-gate.sh` (PostToolUse — replaces SPRINT-04's standalone wiki-ingest by chaining internally)
- `session-start.sh` (SessionStart)
- `token-ledger.sh` extended (work_item_id + routing fix)

**New libs (`cleargate-cli/src/lib/`)**: `codebase-version.ts`, `stamp-frontmatter.ts`, `readiness-predicates.ts`, `frontmatter-cache.ts`, `ledger-reader.ts`, `sha256.ts`, `manifest.ts`, `claude-md-surgery.ts`, `settings-json-surgery.ts`, `pricing.ts`.

**New config / data files**:
- `.cleargate/knowledge/readiness-gates.md` (authoritative gate specs)
- `cleargate-planning/MANIFEST.json` (build-time generated; shipped in npm package)
- `.cleargate/.install-manifest.json` (written by init)
- `.cleargate/.drift-state.json` (written by doctor)
- `.cleargate/.uninstalled` (marker written by uninstall; consumed by future init)
- `.cleargate/hook-log/gate-check.log` + `token-ledger.log`

**Protocol additions**: §11 (EPIC-001), §12 (EPIC-008), §13 (EPIC-009) — chronological by Epic number per resolved §6 collision.

**Template updates**: all 7 templates modified twice in this sprint — metadata fields (001-01) + token/gate stubs (008-07). Single commit per edit; scaffold-mirror diff checked after each.

**Bug closeouts**:
- FLASHCARD 2026-04-19 token-ledger sprint-routing regression (via STORY-008-04 — first-class scope, not a closeout).
- SPRINT-04 standalone `cleargate-wiki-ingest` PostToolUse hook replaced by `stamp-and-gate.sh` chain (via STORY-008-06's settings.json merge).

**Complexity profile**: 8× L1 · 10× L2 · 3× L3 (008-02 predicate evaluator, 009-05 upgrade merge, 009-07 uninstall) · 0× L4.

## Milestones

### M1 — Foundations (parallel-safe, 8 stories)

Stories with no cross-Epic code dependencies. Architect plans these as independent parallel tracks.

1. STORY-001-01 — template metadata fields (L1)
2. STORY-001-02 — protocol §11 (L1)
3. STORY-001-03 — codebase-version helper (L2)
4. STORY-001-04 — stamp-frontmatter helper (L2) *[depends on 001-03 within M1; serialize the pair]*
5. STORY-008-04 — ledger hook generalization + sprint-routing fix (L2) **[front-loaded: active regression]**
6. STORY-009-01 — sha256 + manifest lib (L2)
7. STORY-009-02 — build-manifest + CHANGELOG diff (L2)
8. STORY-009-06 — claude-md-surgery + settings-json-surgery libs (L2)

**M1 exit criteria**: stamp-frontmatter helper + codebase-version helper green; ledger-routing regression fixture freezes SPRINT-04→SPRINT-03 misrouting as a passing test; `cleargate-planning/MANIFEST.json` generated by `npm run build`; surgery libs + sha256 green with idempotency proof.

### M2 — CLI Layer (9 stories)

Stories that consume M1 libs; parallel within the milestone except where noted.

1. STORY-001-05 — `cleargate stamp` CLI (L1)
2. STORY-001-06 — MCP `push_item` server_pushed_at_version (L1) **[cross-repo: touches `mcp/`]**
3. STORY-008-01 — `readiness-gates.md` authoring (L2)
4. STORY-008-02 — predicate evaluator + frontmatter-cache libs (L3) *[depends on 008-01 gates doc + 001-04 stamp helper from M1]*
5. STORY-008-03 — `cleargate gate` CLI (L2)
6. STORY-008-05 — `cleargate stamp-tokens` CLI (L1) *[depends on 008-04 ledger-reader from M1]*
7. STORY-009-03 — `cleargate init` snapshot + restore (L2)
8. STORY-009-04 — `cleargate doctor --check-scaffold` + **base command** (L2) **[creates the shared `doctor` surface]**
9. STORY-009-05 — `cleargate upgrade` three-way merge (L3)

**M2 exit criteria**: all new CLIs dispatch via `cleargate --help`; `cleargate doctor` base command + subcommand dispatcher landed; `cleargate gate check` runs against this repo's existing pending-sync items (dogfood dry-run — expected result: many items fail `last_gate_check`-is-null initially, informs 008-07 initial-migration handling); MCP push writes the new frontmatter field and a cleargate-side integration test proves it roundtrips.

### M3 — Integration + Protocol (serialized on shared files, 4 stories)

Stories that edit `.claude/settings.json`, `cleargate-protocol.md`, and all 7 templates — must be serialized to avoid merge conflicts. Architect plans M3 as a strictly-ordered chain.

1. STORY-008-06 — PostToolUse + SessionStart hooks + doctor extensions (L2) *[merges settings.json with M2's 009-04 base; removes SPRINT-04's standalone wiki-ingest hook]*
2. STORY-008-07 — template stubs + protocol §12 + wiki-lint enforcement (L2) *[touches all 7 templates + protocol + wiki lint]*
3. STORY-009-07 — `cleargate uninstall` (L3) *[depends on 009-03 + 009-06 surgery]*
4. STORY-009-08 — protocol §13 (L1) *[sequenced last: §13 numbering assumes §12 already landed]*

**M3 exit criteria**: dogfood session boot → SessionStart hook emits blocked-gate summary in context; an intentional TBD in a pending-sync Epic → `wiki lint` fails; `cleargate uninstall --dry-run` on a throwaway tmpdir fixture produces the expected preservation preview; `diff .claude/settings.json cleargate-planning/.claude/settings.json` returns empty.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| **Merge-conflict concentration on shared files.** All 3 Epics edit `.claude/settings.json`, `.cleargate/knowledge/cleargate-protocol.md`, and the 7 templates. 21 commits converging on these files in one sprint is the largest conflict-surface we've ever run. | M3 is strictly serialized (4 stories in fixed order, single developer agent at a time). Templates edited twice (001-01 then 008-07) — second edit is additive; Developer must Read before Write to avoid clobbering M1's additions. Protocol edited three times (§11, §12, §13) with explicit "append at end, never insert into existing section" rule in Architect plan. Flashcard check: `#schema` + `#hooks` before M3 starts. |
| **Token-ledger regression fix masking deeper bug.** FLASHCARD 2026-04-19 identified two fixes bundled: (a) `story_id` regex too narrow, (b) `ls -td sprint-runs/*/` routes wrong. Fixing both in 008-04 is correct but opens scope creep risk if a third bug surfaces during the routing-fix work. | 008-04 regression fixture (freeze SPRINT-04 transcript) is the scope boundary. Any additional issue discovered → file as a new Bug, do NOT expand 008-04. Architect plan M1 explicitly calls this out. |
| **Three L3 stories in one sprint.** 008-02 (predicate evaluator), 009-05 (three-way merge), 009-07 (uninstall) are each 1-2 day scope. Past sprints had 1-2 L3s; three is new territory. | Each L3 gets a dedicated Architect plan section (not a single unified plan). Each L3 runs on its own Developer subagent, never parallelized with another L3 in the same milestone boundary. 008-02 goes early in M2 (unblocks 008-03); 009-05 mid-M2; 009-07 final M3 (depends on everything). |
| **`cleargate doctor` cross-Epic coordination.** 009-04 creates the base; 008-06 extends it. If 008-06 accidentally re-creates the base, we get a duplicate-command crash. | M2 ships 009-04 before 008-06. 008-06's Developer instruction reads "extend existing doctor.ts; do NOT re-create the command". QA step: `cleargate doctor --help` shows all modes (session-start + check-scaffold + pricing) after M3 closes. |
| **Standalone wiki-ingest hook removal regression.** SPRINT-04's `cleargate-wiki-ingest` hook currently fires on writes to `.cleargate/delivery/**`. 008-06 replaces it by chaining wiki-ingest inside `stamp-and-gate.sh`. If the surgical-merge gets it wrong, wiki falls stale silently. | STORY-008-06 DoD includes: after hook swap, manually edit a pending-sync file and verify the affected wiki page + gate-check.log both update within 5s. Plus: post-sprint dogfood grep `.cleargate/hook-log/` for "wiki ingest OK" entries — confirms chain works. |
| **MCP cross-repo coordination.** 001-06 edits `mcp/src/tools/push-item.ts` — separate nested git repo. Requires `@cleargate/cli`'s codebase-version helper to be installed as an mcp dep or ported. | Option A: mcp depends on `@cleargate/cli` (adds the helper). Option B: port the ~30-line helper into `mcp/src/utils/codebase-version.ts` (no runtime dep). Architect picks at M2 kickoff; flag as coord decision. QA runs MCP integration test post-001-06 to prove roundtrip. |
| **Publishing cycle.** EPIC-009 needs a `@cleargate/cli` npm publish at sprint end to ship MANIFEST.json + new CLI. Our scripts/build-manifest.ts must be stable enough that the published package's manifest is correct. | Ops DoD: `npm pack --dry-run` smoke-tests the bundle; `npm publish` runs from maintainer machine only (manual). Semver: this is a **minor** bump (`0.2.0`) — new CLI surface, no breaking changes. If 001-06 breaks MCP push-item shape in any user-facing way, it becomes a major bump. |
| **SessionStart hook auto-firing during sprint execution.** Once 008-06 lands M3, every Claude Code session (including ongoing Developer-agent sessions) gets the blocked-items summary injected. If the summary has a bug, it could poison later subagent contexts. | SessionStart hook registration is the LAST step of STORY-008-06 (after all CLIs stable). Post-landing, QA opens a fresh Claude Code session and visually inspects the first prompt's rendered context; rolls back via `git revert` if the summary is wrong. |
| **Uninstall blast radius.** 009-07 is the most-destructive command we've shipped. A bug could wipe user artifacts. | Mandatory: all uninstall tests run in `os.tmpdir()` fixtures; meta-repo CI runs `--dry-run` only; no wet uninstall in meta-repo CI (resolved EPIC-009 §6 Q3). 009-07 QA gate includes manual walkthrough on a scratch project before merge. |
| **21-story ops load on the four-agent loop.** Our loop has shipped at most 12 stories (SPRINT-01) and 11 (SPRINT-03). 21 is new territory; Reporter retrospective synthesis scales with story count. | Accept that this sprint runs longer than SPRINT-04's one-day pace; estimate 2-3 days wall time assuming no QA-kickback chains. Reporter gets extra token budget (document in REPORT.md template). |
| **Hook-schema drift.** Claude Code hooks spec has evolved (per FLASHCARD 2026-04-19 `#hooks #protocol`). Our new `stamp-and-gate.sh` and `session-start.sh` entries use nested `hooks[]` with `if:"Edit(<glob>)"`. A future Claude Code release could break this. | Architect's M1 plan WebFetches the current Claude Code hooks doc **at plan time** (same mitigation pattern as SPRINT-04 Risk row 1). Records the verified spec verbatim in STORY-008-06's plan section. |

**Dependencies:**

- **EPIC-000 shipped ✓** (SPRINT-03). `cleargate-cli/` with Commander, config, token store exists.
- **EPIC-002 shipped ✓** (SPRINT-04). Wiki layer exists; `wiki ingest` is the last step in `stamp-and-gate.sh`'s chain; `wiki lint` extends for gate enforcement.
- **EPIC-003 shipped ✓** (SPRINT-01 + SPRINT-03). MCP `push_item` exists; 001-06 extends its frontmatter handling.
- **§6 AI Interrogation resolutions** (recorded 2026-04-19 in both Epic files). All 12 open questions answered before sprint start. No human-answer waits mid-sprint.
- **FLASHCARD reads mandatory before M1 starts** — grep for `#hooks`, `#schema`, `#init`, `#tsup`, `#reporting`, `#cli #determinism`. Each Developer agent runs the check.
- **No new runtime deps** expected. May need `js-yaml` (if not already present, for readiness-gates.md parse), `diff` (for upgrade's three-way merge rendering). Audit via `npm ls` at M1 kickoff.
- **No new infra.** No DB, no Redis, no external service. Filesystem + git + Claude Code subagents.

## Metrics & Metadata

- **Expected Impact:** Closes three Epics (EPIC-001, EPIC-008, EPIC-009). The framework becomes self-observant (token cost per item visible), self-validating (Gate 2 machine-checked), and cleanly reversible (manifest-driven upgrade + uninstall). Downstream users running `cleargate init` after this sprint get the full dogfood loop out of the box. Fixes an active bug (token-ledger sprint-routing regression) that's been degrading Reporter accuracy since SPRINT-04.
- **Priority Alignment:** Platform priority = **Very High** (closes three foundational surfaces in one release; unblocks every subsequent sprint's cost reporting and readiness automation). Codebase priority = **High** (pain points this conversation has hit: no way to know if a draft is ready without re-reading; no per-item cost visibility; scaffold drift unknowable).

---

## Execution Guidelines (Local Annotation — Not Pushed)

### Starting Point

**M1 front-load: STORY-008-04 (ledger regression fix) + STORY-001-03 + STORY-001-04 (helpers).** These three unblock the widest downstream surface:
- 008-04 closes an active bug today (per-sprint cost routing is currently wrong).
- 001-03 + 001-04 are hard-dependencies for 008-02 (predicate evaluator reuses stamp-frontmatter's YAML semantics) and for 008-05 (stamp-tokens reuses stamp-frontmatter).

The eight M1 stories run in parallel Developer subagents with one synchronization point: 001-04 must wait for 001-03 (stamp-frontmatter uses codebase-version). Everything else is fully parallel in M1.

### Relevant Context

- **Canonical source tree:** `cleargate-planning/` (shipped payload). Every hook/settings/template/protocol change mirrors between the live `.claude/` + `.cleargate/` root and the canonical `cleargate-planning/.claude/` + `cleargate-planning/.cleargate/`. Architect plan enforces `diff` checks after each mirror edit.
- **Mirror-discipline flashcard:** `2026-04-19 #wiki #protocol #mirror` — post-edit `diff live canonical` MUST return empty, or they silently diverge.
- **Hook-schema flashcard:** `2026-04-19 #hooks #protocol` — nested `hooks[]` with `type:"command"` + `if:"Edit(<glob>)"`; file path on stdin at `.tool_input.file_path`; NO `pathPattern`, NO `$CLAUDE_TOOL_FILE_PATH` env.
- **CLAUDE.md regex flashcard:** `2026-04-19 #init #inject-claude-md #regex` — GREEDY regex (`[\s\S]*`, not `[\s\S]*?`) because the block body itself references both markers in prose. STORY-009-06's surgery lib MUST freeze a fixture covering this edge case.
- **tsup asset flashcards:** `2026-04-19 #tsup #npm-publish #assets` + `#tsup #bundle #import-meta` — MANIFEST.json must be in `package.json` `files[]` AND copied via prebuild; `import.meta.url` collapses to bundle path so thread a `packageRoot` seam.
- **Token-ledger regression flashcard:** `2026-04-19 #reporting #hooks #ledger` — the exact bug 008-04 fixes. Story's regression fixture freezes this transcript.
- **Scaffold-mirror flashcard** (see above) applies to every new `.claude/hooks/*.sh` file — `stamp-and-gate.sh` and `session-start.sh` both ship in BOTH `.claude/hooks/` (live dogfood) AND `cleargate-planning/.claude/hooks/` (shipped).
- **§6 resolutions** (EPIC-008 + EPIC-009): resolved 2026-04-19. Key answers encoded in Architect plans:
  - Protocol §§11/12/13 by chronological Epic number.
  - Shared `cleargate doctor` command: first-to-ship creates base → STORY-009-04.
  - Ledger sprint-routing fix stays in STORY-008-04 (not a separate Bug).
  - `readiness-gates.md` always-current (no versioning in v1).
  - Templates carry `cached_gate_result` stub.
  - Uninstall in meta-repo CI runs `--dry-run` only.
  - `--path` on uninstall requires `.install-manifest.json` to exist.
  - Restore-from-marker is blind-copy; mismatch warns, doesn't fail.
- **EPIC-001 / EPIC-008 / EPIC-009 file paths verified ✓** against current repo (§4 of each Epic file). No TBDs remain.

### Constraints

- **No new heavy deps.** Possible additions (only if not already transitively present): `js-yaml`, `diff`. Audit at M1 kickoff.
- **Idempotent everywhere.** Re-running any of `stamp`, `stamp-tokens`, `gate check`, `doctor --check-scaffold`, `wiki ingest`, `build-manifest` on unchanged inputs produces byte-identical output. Proof via test in each Story.
- **No network calls** in stamping, gate-check, or manifest operations. Filesystem + git only. Reporter's USD pricing table is local (`cleargate-cli/src/lib/pricing.ts`).
- **No lint in CI v1** (carryover from SPRINT-04). Lint runs locally + at gate time.
- **No auto-overwrite on upstream drift.** Agent advisory only; `cleargate upgrade` always human-initiated.
- **Uninstall never runs wet in meta-repo CI.** `--dry-run` smoke only. Wet tests use `os.tmpdir()` fixtures.
- **Scaffold mirror diff empty** after every hook/settings/protocol/template edit. Architect plan enforces via post-edit DoD step.
- **No changes to static protocol sections 1-10.** Only §§11/12/13 appended. Developer plans forbid inline edits to existing sections.
- **No rewrite of EPIC-002 wiki infrastructure.** `wiki lint` extends; `wiki ingest` is called from the new chain; wiki/ page shapes unchanged.
- **Front-load regression fix (008-04) in M1.** Do NOT defer the ledger-routing fix until M2/M3 — it's currently degrading Reporter accuracy.

### Sprint Definition of Done

**Engineering DoD**
- [ ] All 21 Stories merged (EPIC-001: 6, EPIC-008: 7, EPIC-009: 8).
- [ ] `npm run typecheck` clean in `cleargate-cli/` and `mcp/`.
- [ ] `npm test` in `cleargate-cli/` passes with new suites covering: `stamp`, `stamp-frontmatter`, `codebase-version`, `readiness-predicates`, `frontmatter-cache`, `ledger-reader`, `gate check/explain`, `stamp-tokens`, `doctor` (all modes), `upgrade`, `uninstall`, `manifest`, `sha256`, `claude-md-surgery`, `settings-json-surgery`. Real filesystem fixtures, no `fs` mocks.
- [ ] `npm test` in `mcp/` passes — existing `push-item` tests updated to assert `server_pushed_at_version` appears in payload roundtrip.
- [ ] Ledger-regression fixture (freeze SPRINT-04 transcript) lands in STORY-008-04 test suite and passes.
- [ ] Scaffold-mirror: `diff -r .claude/ cleargate-planning/.claude/` returns empty (sans gitignored files). `diff .cleargate/knowledge/ cleargate-planning/.cleargate/knowledge/` returns empty. `diff .cleargate/templates/ cleargate-planning/.cleargate/templates/` returns empty.
- [ ] Protocol §11, §12, §13 added to both live and canonical `cleargate-protocol.md`. `diff` between the two returns empty.
- [ ] CLAUDE.md (live + canonical) not modified in this sprint unless a Story explicitly needs it. If it changes, mirror-diff must be empty.
- [ ] All 7 templates (both live and canonical) contain metadata fields (from 001-01) AND `draft_tokens` + `cached_gate_result` stubs (from 008-07). `diff` between live and canonical returns empty.
- [ ] `.cleargate/knowledge/readiness-gates.md` exists (live + canonical) with all 6 transitions; `js-yaml` parse returns no errors.
- [ ] `cleargate-planning/MANIFEST.json` generated by `npm run build`; `npm pack --dry-run` listing includes it.
- [ ] Dogfood end-to-end on meta-repo:
  - [ ] Open a fresh Claude Code session → SessionStart hook injects a blocked-items summary into context within 100 tokens (verified by inspecting session start telemetry).
  - [ ] Edit any pending-sync Epic → PostToolUse hook chains stamp-tokens → gate check → wiki ingest; `.cleargate/hook-log/gate-check.log` shows OK for all three steps; affected wiki page refreshes within 5s; frontmatter shows populated `draft_tokens` and `cached_gate_result`.
  - [ ] Intentionally insert "TBD" into a pending-sync Epic → `cleargate wiki lint` exits non-zero, naming the failing criterion.
  - [ ] `cleargate doctor --check-scaffold` runs on meta-repo and produces a correct drift summary (human-verified against known scaffold state).
  - [ ] `cleargate upgrade --dry-run` runs without error; produces a plan consistent with `doctor --check-scaffold` output.
  - [ ] `cleargate uninstall --dry-run` in a throwaway tmpdir fixture produces the expected preservation preview.
- [ ] Token budget verified: full sprint's agent-turn cost recorded in `.cleargate/sprint-runs/SPRINT-05/token-ledger.jsonl`, rows correctly tagged with `work_item_id` for each story, all rows land in `sprint-runs/SPRINT-05/` (not SPRINT-04 or earlier). Reporter's per-story cost table lands in REPORT.md.
- [ ] FLASHCARD: append any new gotchas encountered during the sprint (expected: 2-5 new cards across the three Epics).

**Ops DoD**
- [ ] `@cleargate/cli@0.2.0` published to npm. Minor bump: 6 new top-level commands, no breaking changes. MANIFEST.json + new CLI + new hooks shipped in the tarball.
- [ ] CHANGELOG.md auto-generated "Scaffold files changed" block appears in the 0.2.0 entry (via `generate-changelog-diff.ts`).
- [ ] `mcp/package.json` updated — either pin `@cleargate/cli@^0.2.0` (Option A per 001-06 risk) OR port the helper locally (Option B). Decision recorded in REPORT.md.
- [ ] MCP re-deploy to Coolify at `https://cleargate-mcp.soula.ge/` after 001-06 lands. Verified via smoke test (push a dummy item, confirm `server_pushed_at_version` in the response).
- [ ] One-shot fresh-install smoke: run `npx cleargate@0.2.0 init` in a blank tmpdir; verify `.cleargate/.install-manifest.json` + `.claude/agents/` + `.claude/hooks/{token-ledger,stamp-and-gate,session-start}.sh` + `.claude/settings.json` hooks all present; `cleargate doctor --check-scaffold` returns clean. Recorded in REPORT.md.
- [ ] FLASHCARD.md content diff (pre-sprint vs. post-sprint) included in REPORT.md.

### Scope adjustments to watch for mid-sprint

- **If MANIFEST.json asset-copy fails under tsup** (FLASHCARD `#tsup #npm-publish #assets`): extend the `postbuild` script; treat as STORY-009-02 scope, not new work.
- **If predicate evaluator parser grows beyond the closed 6 shapes** (scope creep in 008-02): push back. Any predicate that can't be expressed in the 6 shapes becomes an Epic §6 question, not ad-hoc code.
- **If readiness-gates.md criteria turn out wrong** after running `gate check` on this repo's existing items: adjust the YAML in 008-01 (pure doc edit); do NOT patch the evaluator. Criteria are data, evaluator is code.
- **If surgery libs' GREEDY regex misses another CLAUDE.md edge case**: freeze the fixture; no Production Edit until test passes. FLASHCARD append mandatory.
- **If uninstall's typed-confirmation UX feels wrong on manual walkthrough** (009-07 QA): adjust UX within scope; do NOT ship with awkward prompt.
- **If SessionStart hook summary exceeds 100 tokens in real runs**: tighten the truncation logic in 008-06; log overflow to hook-log. Cap strictly to 100.
- **If Admin UI or OAuth work attempts to sneak in**: push back. SPRINT-06 territory.

### Commit cadence

One commit per Story = 21 commits. Plus up to 4 setup commits (dep additions, npm workspaces tweaks if cross-package helper consolidation lands, mirror-diff fixups). Budget: **25 commits max**. Tests must pass before each commit. `@cleargate/cli@0.2.0` publish happens after all 21 stories land and CI is green.

### Next Sprint Preview

**SPRINT-06** = [EPIC-006 Admin UI + OAuth closeouts](./SPRINT-06_Admin_UI.md) — 12 Stories (10 EPIC-006 + STORY-004-08 + STORY-005-06). Deferred one sprint from the original plan to ship the process-refinement trifecta first. All prereqs still hold (two GitHub OAuth apps, Coolify subdomain). Now also benefits from: auto-stamped frontmatter on any Admin UI work items, cost-per-story visibility, and machine-checked readiness gates — the trifecta pays off immediately for the larger subsequent sprint.

**SPRINT-07+** candidates: PROP-007 Multi-Participant MCP Sync (still in wait-and-observe per Q10 — earliest 2026-07); wiki federation (v1.1); PM adapters (v1.1).

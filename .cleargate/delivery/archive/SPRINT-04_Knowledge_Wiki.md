---
sprint_id: "SPRINT-04"
remote_id: null
source_tool: "local"
status: "Completed"
start_date: "2026-04-19"
end_date: "2026-04-19"
activated_at: "2026-04-19T02:37:00Z"
completed_at: "2026-04-19T05:30:00Z"
synced_at: null
created_at: "2026-04-19T00:00:00Z"
updated_at: "2026-04-19T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
approved: true

---

# SPRINT-04: Knowledge Wiki Layer (Karpathy pattern)

## Sprint Goal

Ship **EPIC-002 (Knowledge Wiki Layer)** end-to-end, adapted for our three-repo case (meta-planning · `cleargate-cli/` · `mcp/`). After this sprint, every new Claude Code session that opens against any of the three repos (or against a downstream user's repo that has run `cleargate init`) begins by reading `.cleargate/wiki/index.md` (~3k tokens) and has full situational awareness — what shipped, what's in flight, what's blocked, what's planned, what cross-invalidates — without scanning raw directories. Duplicate-proposal detection, blast-radius flagging, gate-enforcement on drift, and the Karpathy "file-back-to-topics" compounding loop all become automatic. The wiki bundles into the `cleargate` npm package so `cleargate init` scaffolds it alongside the existing `.claude/agents/` + `.cleargate/{knowledge,templates,delivery}/` payload from Phase 2a/b.

## Consolidated Deliverables

### EPIC-002 — Knowledge Wiki Layer (9 stories, all in `.cleargate/delivery/pending-sync/`-equivalent state today)

- [`STORY-002-01`](STORY-002-01_Protocol_Section_10.md): Protocol §10 — add "Knowledge Wiki Protocol" to `cleargate-protocol.md` (ingest/query/lint, backlink syntax `[[ID]]`, gate-blocking rules, page schema, `log.md` YAML event format). Edit `.cleargate/knowledge/cleargate-protocol.md`; mirror to `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`. · L1
- [`STORY-002-02`](STORY-002-02_Wiki_Ingest_Subagent.md): `cleargate-wiki-ingest` subagent definition (model: haiku). Triggered by PostToolUse hook on write to `.cleargate/delivery/**` or `.cleargate/plans/**`. Writes per-item wiki page + log.md entry + recompiles affected synthesis pages. Ships as canonical source at `cleargate-planning/.claude/agents/cleargate-wiki-ingest.md` (installed via `cleargate init`). · L2
- [`STORY-002-03`](STORY-002-03_Wiki_Query_Subagent.md): `cleargate-wiki-query` subagent definition (model: haiku). Auto-invoked at triage (read-only mode) and on `cleargate wiki query --persist` (file-back mode → `wiki/topics/<slug>.md` with `cites:` frontmatter). · L1
- [`STORY-002-04`](STORY-002-04_Wiki_Lint_Subagent.md): `cleargate-wiki-lint` subagent definition (model: sonnet). Enforcement mode: refuses Gate 1 (Proposal approval) + Gate 3 (Push) on drift. `--suggest` advisory mode: surfaces candidate cross-refs ingest missed, exit 0. · L2
- [`STORY-002-05`](STORY-002-05_Init_Writes_Hook.md): `cleargate init` writes PostToolUse hook config into `.claude/settings.json` + copies the three subagent defs from `cleargate-cli/templates/.claude/agents/cleargate-wiki-*.md` → target repo's `.claude/agents/`. Adds a bootstrap step: after init completes, if `.cleargate/delivery/**` has any items, auto-run `cleargate wiki build` once. · L2
- [`STORY-002-06`](STORY-002-06_Wiki_Build_CLI.md): `cleargate wiki build` — full rebuild from raw. Scans raw state, produces full `wiki/` tree (index.md + log.md + per-item pages + 4 synthesis pages + sprint pages). Idempotent (re-running produces byte-identical output modulo `last_ingest` timestamps). Uses git SHA (`git log -1 --format=%H <file>`) as the `codebase_version` substitute — no dependency on EPIC-001 stamp. · L2
- [`STORY-002-07`](STORY-002-07_Wiki_Ingest_CLI.md): `cleargate wiki ingest <file>` — single-file update (called by hook + subagent). Triggers recompile of the affected per-item page + every synthesis page that references it. · L2
- [`STORY-002-08`](STORY-002-08_Wiki_Lint_CLI.md): `cleargate wiki lint` + `cleargate wiki lint --suggest` + `cleargate wiki query <q> [--persist]`. Lint: exit non-zero on drift, names the offending page. Suggest: exit 0, prints candidate cross-refs. Query: reads wiki, synthesizes answer; with `--persist` files to `wiki/topics/<slug>.md`. · L2
- [`STORY-002-09`](STORY-002-09_Synthesis_Templates.md): four synthesis page templates (`active-sprint.md`, `open-gates.md`, `product-state.md`, `roadmap.md`) + compile recipes. Each recipe is a pure function `raw-state → markdown`, deterministic, rerun on every ingest. · L1

### Adaptations for our case (applied in-flight during existing stories — no new story IDs, called out here for Architect plan clarity)

- **A1 — `repo:` frontmatter tag.** Every wiki page gets a `repo: cli | mcp | planning` tag derived from `raw_path` prefix (`cleargate-cli/` → cli, `mcp/` → mcp, `.cleargate/` or `cleargate-planning/` → planning). wiki-query filters by tag on user request. No new directory planes; tag-based discrimination only. Story touch: STORY-002-02 (ingest) + STORY-002-03 (query) + STORY-002-08 (lint — adds a check that `raw_path` and `repo:` agree).
- **A2 — Git-SHA codebase version.** Every wiki page's `last_ingest_commit: <sha>` field captures `git log -1 --format=%H -- <raw_path>` at ingest time. Drift detection = compare stored sha to current. Replaces EPIC-001's content-hashing machinery entirely. Story touch: STORY-002-02 (ingest writes the field) + STORY-002-04 (lint compares).
- ~~**A3 — Dual-source ingest.**~~ **Dropped 2026-04-19.** Phase 2c migration completed — all raw work items now live canonically in `.cleargate/delivery/{pending-sync,archive}/`. wiki-ingest scans only `.cleargate/delivery/**`. Simplifies STORY-002-06 / STORY-002-07.

**Total: 9 stories, all L1/L2. No L3. Adaptations A1-A2 fit within existing stories; A3 dropped.**

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| **PostToolUse hook syntax drift.** The Claude Code hooks spec has evolved between versions (`matcher` vs `pathPattern`, env-var names for tool path). STORY-002-05's shipped config could be outdated by the time it lands in a user's `.claude/settings.json`. | Architect's M1 plan WebFetch-es the current Claude Code hook docs *at plan time* (not from training data) and records the verified spec verbatim in the plan. STORY-002-05 Developer copies that spec verbatim into the init-written config. Flashcard pre-read mandatory: `#hooks` tag. |
| **Subagent invocation cost inflation.** wiki-ingest fires on EVERY write to `delivery/**`. Haiku is cheap, but a 40-item sprint could trigger 40+ ingests. Cost per-sprint estimated ≤ $0.50 at Haiku rates, but a misconfigured retry loop could balloon it. | STORY-002-02 subagent def has an idempotency guard: no-op if the raw file's sha matches the wiki page's stored `last_ingest_commit`. Flashcard-worthy: `#cost` tag. QA runs the full sprint flow once and cross-checks token ledger matches budget ≤ $0.50. |
| **Lint performance on 68-item corpus.** We have 57 stories + 7 epics + 4 sprints + 3 proposals = 71 raw items today. wiki-lint scanning all pairwise relations is O(n²). At 71 items it's fine, but growth to 500+ would hurt. | STORY-002-04 subagent def keeps lint linear: per-page check against its own declared edges, plus a single `index.md` cross-check pass. No all-pairs. Pagination at 50 per bucket (PROP-002 §2.3) caps the size. |
| **Wiki/sprint-runs/ path collision.** `.cleargate/wiki/sprints/SPRINT-NN.md` is a compiled wiki page; `.cleargate/sprint-runs/SPRINT-NN/` is orchestration artifacts (plans, token ledger, REPORT.md). Different purposes, near-colliding paths. | Keep the distinction sharp in STORY-002-09: wiki sprint pages live ONLY at `.cleargate/wiki/sprints/SPRINT-NN.md` (single file, compiled from the raw sprint .md). sprint-runs/ is separate orchestration space. Lint enforces no files written under `wiki/sprints/<NN>/` (subdirectory forbidden). |
| **Multi-repo ingest: repo boundaries.** `mcp/` is a separate git repo; running `cleargate wiki build` at meta-root shouldn't reach into `mcp/`'s git history. But the meta-root wiki should STILL know mcp/ exists as a product. | A1 adaptation: the `repo: mcp` tag is inferred from raw_path prefix only when files exist locally. For mcp/ work items that live in `mcp/`'s own `.cleargate/delivery/` (future — when mcp adopts cleargate), each repo maintains its own wiki. Meta-root wiki ONLY covers planning artifacts at meta-root. Cross-repo awareness is a v1.1 story (wiki-federation). Flag: if user tries `cleargate wiki build` at meta-root today and expects to see mcp/ work items, the answer is "those live in mcp's own wiki when mcp runs init" — not this sprint's concern. |
| **Git SHA is not content hash.** A1+A2: using git SHA for drift detection means any whitespace-only commit to a raw file triggers a wiki recompile. Content-hashing (EPIC-001) would be more efficient. | Accepted tradeoff. Ingest is cheap (Haiku); over-triggering is fine. Cost of EPIC-001 dependency >> cost of occasional spurious recompile. Flashcard: `#wiki #drift` tag documenting the tradeoff. |
| **Wiki-ingest fails silently.** Hook runs detached; if the subagent errors, the user doesn't see it. Wiki drifts; next session starts with stale awareness. | Fallback chain: PostToolUse hook (primary, deterministic) → protocol §10 rule ("call wiki-ingest after every raw write" — AI obligation) → lint catch (gate-blocking). Three layers. STORY-002-04 lint specifically detects missing-ingest drift (raw file newer than wiki page's `last_ingest_commit`). |
| **Topic-page spam.** `wiki query --persist` (Karpathy file-back) could create dozens of low-value topic pages over a sprint. | v1 requires explicit `--persist` flag (PROP-002 Q9). Implicit auto-persist is v1.1. STORY-002-08 documents the gatekeeper pattern in help text. |
| **Markdown backlink rendering.** `[[WORK-ITEM-ID]]` works in Obsidian + most markdown viewers but not in stock GitHub. Our wiki lives in git and gets rendered on github.com. | Accept the degraded GitHub rendering (backlinks render as plain text, still human-readable). No transform step. Future v1.1: `wiki build --emit-github` mode that rewrites to relative links. Not this sprint. |
| **Init-time bootstrap on already-populated repo.** `cleargate init` in a repo that already has 50 stories would need to build the wiki from scratch at init time. That's 50 haiku calls = ~30s wall time + ~$0.15. | STORY-002-05 prints progress during the bootstrap pass + documents the one-time cost in init's output. Idempotent — safe to re-run after interrupt. |

**Dependencies:**
- **EPIC-000 shipped ✓** (SPRINT-03). `cleargate-cli/` exists with Commander, config loader, token store, mcp-client stub. New `wiki build/ingest/query/lint` commands plug into the existing Commander entry at `cleargate-cli/src/cli.ts`.
- **EPIC-001 NOT required** (adaptation A2). Git SHA substitutes for stamp-frontmatter + codebase-version helpers. EPIC-001 work slides to SPRINT-06 or later.
- **Phase 2a + 2b + 2c shipped ✓** (committed 2026-04-19). `.cleargate/{knowledge,templates,delivery}/` scaffold exists; `cleargate-planning/` canonical source exists; CLAUDE.md bounded block is in place; all 71 raw work items migrated to `.cleargate/delivery/{pending-sync,archive}/`; `strategy/` directory deleted.
- **New runtime deps** (cleargate-cli): none significant — `gray-matter` for YAML frontmatter parse (add if not already present), `fast-glob` for file scanning (add if not present). No DB, no network, no new heavy deps.
- **No new infra.** No database, no Redis, no external service. Everything is filesystem + git + Claude Code subagents.

## Metrics & Metadata

- **Expected Impact:** Closes EPIC-002 completely. Every new Claude Code session has situational awareness in ~3k tokens instead of grepping raw files. Duplicate-proposal detection works. Gate enforcement on drift works. The Karpathy compounding loop (query → persist → reused-as-canonical) becomes operational. Planning velocity measurably improves on the next sprint (fewer "wait, didn't we already do X?" loops). Bundles into `cleargate` npm so downstream users (including our own mcp/ repo when it adopts) get this by running `cleargate init`.
- **Priority Alignment:** Platform priority = **High** (closes a core product surface; the wiki IS the "awareness" pillar of the three-phase Plan→Execute→Deliver vision). Codebase priority = **High** (immediate pain relief: this conversation's 15 re-derivation turns wouldn't have happened with a wiki).

---

## Execution Guidelines (Local Annotation — Not Pushed)

### Starting Point

**M1 — STORY-002-01 (Protocol §10) lands first.** It's a docs-only edit to `.cleargate/knowledge/cleargate-protocol.md` + mirror to `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`. Blocks STORY-002-02..04 (they implement the rules §10 specifies — must match). Single-story milestone; unblocks all subagent work.

### Relevant Context

- **Canonical source tree:** `cleargate-planning/` — the 19-file payload `cleargate init` installs. STORY-002-02..05 subagent defs get added at `cleargate-planning/.claude/agents/cleargate-wiki-{ingest,query,lint}.md` AND mirrored into the live meta-root `.claude/agents/` for dogfooding.
- **CLI source:** `cleargate-cli/src/commands/wiki-*.ts` (new files per STORY-002-06/07/08). Reuse existing Commander entry at `cleargate-cli/src/cli.ts` — new subcommands register there. Config loader (`cleargate-cli/src/config.ts`) already loads `CLEARGATE_MCP_URL`; wiki doesn't need network config (filesystem only).
- **Protocol doc:** `.cleargate/knowledge/cleargate-protocol.md` (live) + `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` (canonical). BOTH need §10 added. Treat as a single logical edit; one story ships both.
- **Hook wiring:** current `.claude/settings.json` at meta-root wires only `SubagentStop` (token-ledger hook). STORY-002-05 adds PostToolUse to both root's local `.claude/settings.json` AND the canonical `cleargate-planning/.claude/settings.json`.
- **Test infra:** Vitest (already configured in `cleargate-cli/`). No database needed — wiki is pure filesystem ops. Fixtures: create a temporary `.cleargate/delivery/{pending-sync,archive}/` tree under `os.tmpdir()`, invoke `wiki build`, assert output shape.
- **Wiki page shape spec:** PROPOSAL-002 §2.4 + EPIC-002 §4 are the canonical references. Frontmatter fields per page type (epic/story/sprint/synthesis/topic) defined there verbatim. Add `repo:` and `last_ingest_commit:` per A1/A2.
- **Multi-repo boundary:** meta-root wiki covers `.cleargate/delivery/` at meta-root only. `mcp/` and `cleargate-cli/` are separate git scopes with their own (future) wikis when they adopt `cleargate init`. Architect plan calls this out explicitly to prevent scope bleed.

### Constraints

- **No new heavy deps.** Only `gray-matter` (YAML frontmatter) and `fast-glob` (file scan) if they're not already transitively present. Audit via `npm ls` before adding.
- **Idempotent ingest.** Re-running `wiki ingest <file>` on a file whose content and git SHA haven't changed produces a no-op (log line + exit 0, no file writes). Tested.
- **No network calls in wiki commands.** `wiki build/ingest/query/lint` are filesystem + git only. No MCP calls, no npm registry checks. Offline-safe.
- **Deterministic page output.** Re-ingesting the same raw file produces byte-identical wiki page (modulo `last_ingest:` ISO timestamp — isolated to frontmatter only, body deterministic).
- **No lint in CI v1.** Lint runs locally + at gate time only. Per PROP-002 Q5, CI-integration is deferred (friction concern).
- **No auto-persist on every query.** `--persist` flag required explicitly (PROP-002 Q9). Topic page creation is always intentional.
- **Subagent models: haiku for ingest/query, sonnet for lint.** Per PROP-002 §2.2. Cost budget ≤ $0.50/sprint at expected ingest rates.
- **No wiki ingest of `.cleargate/knowledge/` or `.cleargate/templates/`.** These are static per PROP-002 Q6. wiki-ingest skips these paths.
- **No wiki ingest of `.cleargate/sprint-runs/` or `.cleargate/hook-log/`.** These are orchestration artifacts, not planning artifacts.

### Milestones within sprint

1. **M1 — Protocol §10 (STORY-002-01):** solo prerequisite. Adds the rules that subagents + CLI implement. ≤ 1 day.
2. **M2 — Subagent definitions (STORY-002-02, 002-03, 002-04):** parallelizable across three Developer subagents. Each story ships one `.claude/agents/cleargate-wiki-{ingest,query,lint}.md` file in both canonical (`cleargate-planning/`) and dogfood (`.claude/`) locations. Sonnet subagent (lint) is the most complex — watch for scope creep.
3. **M3 — CLI commands (STORY-002-06, 002-07, 002-08):** parallelizable across three subagents. Each ships one `cleargate-cli/src/commands/wiki-*.ts` + unit tests. STORY-002-08 is slightly larger (covers lint + query + suggest — three commands in one story — accepted because they share helpers).
4. **M4 — Bootstrap plumbing (STORY-002-05, 002-09):** sequential. STORY-002-09 (synthesis templates) first — defines the compile-recipe contract. STORY-002-05 (init writes hook) second — consumes the subagent defs and the CLI commands, wires them into a fresh repo's `.claude/settings.json`. M4 closes with an end-to-end dogfood: run `cleargate wiki build` against the meta-root's current raw state and verify `wiki/index.md` + per-item pages + four synthesis pages exist and read sensibly.

**End-to-end exit criteria (after M4 closes):**
- Running `cleargate wiki build` at meta-root produces `.cleargate/wiki/{index.md, log.md, epics/, stories/, proposals/, sprints/, active-sprint.md, open-gates.md, product-state.md, roadmap.md}` with all 71 current raw items indexed.
- Opening a fresh Claude Code session at meta-root, the first tool call is a Read of `.cleargate/wiki/index.md` (verified by token-ledger inspection). Pre-sprint this conversation's first tool calls were greps across strategy/ — the delta is measurable.
- Editing any file under `.cleargate/delivery/**` triggers the PostToolUse hook; affected wiki pages refresh within 5s.
- `cleargate wiki lint` against the built wiki exits 0.
- Running `cleargate wiki query "invite storage" --persist` produces `.cleargate/wiki/topics/invite-storage.md` with frontmatter `cites:` listing STORY-004-03, STORY-004-07, STORY-003-13 (these are real items in our corpus).
- `cleargate init` against a fresh empty directory writes the full scaffold including subagent defs + PostToolUse hook config + runs an auto-build (which no-ops because the dir is empty).

### Sprint Definition of Done

**Engineering DoD**
- [ ] All 9 Stories merged (EPIC-002).
- [ ] `npm run typecheck` clean in `cleargate-cli/`.
- [ ] `npm test` in `cleargate-cli/` passes with new suites: `test/wiki/build.test.ts`, `test/wiki/ingest.test.ts`, `test/wiki/lint.test.ts`, `test/wiki/query.test.ts`, `test/wiki/synthesis.test.ts`. Real filesystem fixtures under `os.tmpdir()`, no mocks of `fs`.
- [ ] Subagent defs exist in `cleargate-planning/.claude/agents/cleargate-wiki-{ingest,query,lint}.md` AND mirrored live at `.claude/agents/` (dogfood instance).
- [ ] Protocol §10 added to `.cleargate/knowledge/cleargate-protocol.md` + mirrored to `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`.
- [ ] PostToolUse hook written by `cleargate init` works against a fresh test repo — verified via a temp-dir integration test.
- [ ] Meta-root dogfood: `cleargate wiki build` run at the meta-repo produces `.cleargate/wiki/` populated from our 71 raw items. Committed.
- [ ] Token budget verified: full dogfood build + 10 ingest invocations ≤ $0.50 at Haiku rates (date-stamped in REPORT.md).
- [ ] CLAUDE.md bounded block UPDATED to add `.cleargate/wiki/index.md` as session-start read #1 (before protocol doc). Canonical at `cleargate-planning/CLAUDE.md`; mirrored to root `CLAUDE.md`.
- [ ] Three-planning-doc smoke: grep `wiki/index.md` for "PROPOSAL-002", "STORY-003-13", "SPRINT-04" — all three appear with correct bucket placement.

**Ops DoD**
- [ ] `cleargate@0.1.0-alpha.2` published to npm with the new wiki CLI commands + bundled subagent defs in `templates/`. Published manually from maintainer machine.
- [ ] `mcp/package.json` updated to consume `cleargate@0.1.0-alpha.2` (post-publish). mcp re-deploy not required for wiki work (mcp itself doesn't use the wiki yet — that's a v1.1 "mcp adopts cleargate init" item).
- [ ] One-shot smoke: run `npx cleargate@latest init` in a blank tmpdir, verify `.claude/agents/cleargate-wiki-*.md` + `.claude/settings.json` PostToolUse hook + `.cleargate/templates/*.md` all present. Recorded in REPORT.md.

**SPRINT-03 carryover closed in prep for SPRINT-04** (already landed in commits `3aa4cc2`, `8557c58`, `f13464b` today):
- [x] SPRINT-03 REPORT.md + W2/W4 plans committed.
- [x] cleargate-cli post-release fixes committed.
- [x] PROPOSAL-002 + EPIC-002 planning edits committed.
- [x] CLAUDE.md bounded block added (Phase 2a + vibe-coder expansion).
- [x] Scaffold restructure: `cleargate-planning/` canonical + `.cleargate/{knowledge,templates,delivery}/` + `knowledge/` gitignored private docs.

### Scope adjustments to watch for mid-sprint

- **If gray-matter/fast-glob are heavy** (bundle size balloon) → inline minimal YAML parser (regex-based, good enough for our frontmatter shape) + native `fs.readdir` recursion. Cost: +50 LoC across STORY-002-06/07. Flag at M3 kickoff.
- **If subagent output is inconsistent** (haiku hallucinates wiki page fields) → tighten the subagent def with an exact page template embedded + an explicit "output ONLY this YAML+markdown, no prose commentary" instruction. Budget: one kickback round at QA.
- **If PostToolUse hook fires in a loop** (hook writes `wiki/*.md`, which matches the hook pattern, which fires again) → add a path-exclude on `**/wiki/**` to the hook's `pathPattern`. Verify during STORY-002-05 dogfood.
- **If lint takes > 5s on our 71-item corpus** → cache the parsed raw state between lint passes (single `.cleargate/wiki/.lint-cache.json`). Add in STORY-002-08 if perf miss.
- **If `cleargate-admin login` or admin UI work attempts to sneak in** → push back. Those are SPRINT-05 (Admin UI + OAuth closeouts) and SPRINT-06+ territory. This sprint is wiki-only.

### Commit cadence

One commit per Story = 9 commits. Plus up to 2 setup commits (adding gray-matter/fast-glob if needed, one npm workspaces tweak if cross-package helper consolidation lands). Budget: **11 commits max**. Tests must pass before each commit. `cleargate@0.1.0-alpha.2` publish happens after all 9 stories land.

### Next Sprint Preview

**SPRINT-05** = [EPIC-006 Admin UI + OAuth closeouts](./SPRINT-05_Admin_UI.md) — 12 Stories (10 EPIC-006 + STORY-004-08 + STORY-005-06). Deferred one sprint to ship the wiki first. All prereqs from the original SPRINT-04 plan still hold (two GitHub OAuth apps, Coolify subdomain).

**SPRINT-06** = EPIC-001 Document Metadata Lifecycle — 6 Stories. `cleargate stamp` CLI + frontmatter helpers + codebase-version helper + MCP push-time server_pushed_at_version + Protocol §11. Note: SPRINT-04's adaptation A2 (git SHA for wiki drift detection) means EPIC-001's value is now incremental rather than foundational — re-assess priority at SPRINT-05 close.

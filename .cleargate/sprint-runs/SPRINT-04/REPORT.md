# SPRINT-04 Report: Knowledge Wiki Layer (Karpathy pattern)

**Status:** ✅ Shipped (9/9 stories)
**Window:** 2026-04-19 02:37 → 2026-04-19 05:22 (UTC+4) — single calendar day, ~2h45m wall clock from sprint repoint commit (`1edcab6`) to orchestration commit (`81c52ef`).
**Stories:** 9 planned / 9 shipped / 0 carried over. One-shot rate **9/9 = 100%** (zero QA kickbacks).

---

## For Product Management

### Sprint goal — did we hit it?

**Goal (verbatim, sprint file lines 19-21):** ship EPIC-002 end-to-end so every new Claude Code session against any of the three repos (or a downstream user's repo that has run `cleargate init`) begins by reading `.cleargate/wiki/index.md` and has full situational awareness without scanning raw directories.

**Yes.** All nine EPIC-002 stories merged in one wave-day. The dogfood wiki at `.cleargate/wiki/` exists, indexes 80+ work items across seven buckets (epics/stories/sprints/proposals/crs/bugs/topics), and four synthesis pages compile cleanly against the real corpus. `cleargate init` writes the PostToolUse hook + scaffold into a fresh repo (committed in `f98b2b8`, seven test scenarios pass). The Karpathy file-back loop (`wiki query --persist`) ships.

The first measurable downstream signal is already here: dogfooding the wiki at meta-root surfaced **PROPOSAL-005** (agent-drafted, orchestrator-unaware). The wiki is already doing its job: catching unknown-to-orchestrator state at session start (visible in `wiki/open-gates.md` Gate 1).

### Headline deliverables

- **Wiki awareness layer at meta-root** (commit `d63af50`) — 80+ wiki pages compiled from `.cleargate/delivery/{pending-sync,archive}/`; four synthesis pages (`active-sprint.md`, `open-gates.md`, `product-state.md`, `roadmap.md`) materially populated.
- **`cleargate init` scaffolds the wiki for downstream users** (commit `f98b2b8`) — copies the `cleargate-planning/` payload, merges PostToolUse hook into `.claude/settings.json`, injects bounded block into `CLAUDE.md`, runs auto-build. Idempotent on re-run.
- **Three new subagents** (`cleargate-wiki-{ingest,query,lint}`, commit `8c82e30`) — Haiku for ingest/query, Sonnet for lint, all defs mirrored canonical/dogfood and verified `diff`-clean.
- **Four new CLI subcommands** (`cleargate wiki {build,ingest,lint,query}`) — full read-only/write paths, idempotency-guarded, atomic index writes.
- **Protocol §10 "Knowledge Wiki Protocol"** added to canonical + live (commit `aef73b1`) — gate-blocking rules, page schema, `log.md` event format, `[[ID]]` backlink syntax, three-level fallback chain.

### Risks that materialized

From the sprint file's nine-row risk table:

- **Hook syntax drift (row 1) — fired and was caught.** Architect's M1 plan WebFetched the live Claude Code hook spec and recorded that PROPOSAL-002 §3.2 + EPIC-002 §3.3 + the STORY-002-05 story body all carried the OUTDATED hook shape (`pathPattern`, `$CLAUDE_TOOL_FILE_PATH`). The verified config in `M1.md` lines 70-86 shipped verbatim into `f98b2b8`. Without this catch, STORY-002-05 would have shipped a broken hook config to every downstream user. Flashcard `2026-04-19 #hooks #protocol`.
- **Subagent cost inflation (row 2) — UNVERIFIED.** Mitigation requires a QA "cross-check token ledger matches budget ≤ $0.50". The token-ledger machinery for SPRINT-04 misfired (see Meta + What the loop got wrong); we cannot confirm the envelope from local data. Engineering DoD #11 carried over to follow-ups.
- **Wiki/sprint-runs path collision (row 4) — held.** Lint check 7 (`excluded-path-ingested`) refuses pages whose `raw_path` is under `.cleargate/sprint-runs/`. Dogfood has zero such pages.
- **Hook write-loop (scope-adjustments line 147) — three defenses ship.** (a) Hook `case` filter excludes `wiki/**`, (b) ingest CLI step 2 explicit exclusion, (c) `wiki build` invoked in-process by init bypasses hook. Verified during STORY-002-05 dogfood.
- **Synthesis filter against synthetic fixtures (not in the original risk table) — fired.** STORY-002-09 caught and fixed the M3-shipped `🔴` emoji filter on `open-gates.ts` that produced a permanently empty page on real data. Flashcard `2026-04-19 #wiki #synthesis #corpus-shape`. Real bug, would have shipped wrong output to vibe coders.

Two surprises **not** in the risk table that we paid for at QA time but caught before commit:
- **`exit(0)` swallowed inside try/catch** in `wiki ingest`'s idempotency no-op, causing file writes after the supposed early return. Caught and fixed during STORY-002-07.
- **CLAUDE.md inject regex greediness.** Block body's prose references the START/END markers, so non-greedy `[\s\S]*?` stopped at the inline END. Caught and fixed during STORY-002-05. Flashcard `2026-04-19 #init #inject-claude-md #regex`.

### Cost envelope

**Cannot quantify with confidence.** The token-ledger hook for this sprint did not produce a SPRINT-04 ledger file (see Meta). Best-effort proxy: the orchestrator session accumulated **~883k output / ~96M cache-read / ~1.5M cache-creation tokens** on Opus 4.7 across 22 hook firings between 2026-04-18T23:00Z → 2026-04-19T01:20Z (rows misrouted to `SPRINT-03/token-ledger.jsonl` and tagged `STORY-006-01`). Per-subagent (Architect/Developer/QA spawns for M1-M4) tokens were not recorded at all. Treat any USD figure derived from this sprint as unreliable; do not use as baseline.

### What's unblocked for next sprint

- **EPIC-002 closed** — no further wiki work blocks SPRINT-05 (Admin UI).
- **`cleargate init` is real** — `mcp/` and any other downstream repo can adopt the framework. Manual npm publish of `cleargate@0.1.0-alpha.2` is the only gate (Ops DoD).
- **PROPOSAL-005 + PROPOSAL-006 surfaced** — vibe-coder Gate 1 review can begin without rediscovery cost. Both autonomously drafted by agents; wiki caught both.
- **PROPOSAL-004 approved (`ed8a5a9`)** — EPIC-007 Public Discoverability ready for decomposition + sprint scheduling.
- **Wiki-driven triage available** — next sprint's planning conversation can start with `cleargate wiki query "<topic>"` instead of grepping `delivery/`.

---

## For Developers

### Per-story walkthrough

**STORY-002-01: Protocol §10 (Knowledge Wiki Protocol)** · L1 · cost: unmeasurable · ~26m (commit `aef73b1` at 03:03)
- Files: `.cleargate/knowledge/cleargate-protocol.md`, `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` (+154 lines each, byte-identical).
- Tests added: 0 (docs-only; manual verify `grep -n '## 10\.' <both>`).
- Kickbacks: 0. Deviations: none.
- Flashcards recorded mid-story: `#hooks #protocol` (M1 plan captured the hook spec correction here, away from STORY-002-05).

**STORY-002-02 + 03 + 04: Three wiki subagents** · 3×L1/L2 · ~56m (commit `8c82e30` at 03:59, batched)
- Files: `cleargate-planning/.claude/agents/cleargate-wiki-{ingest,query,lint}.md` + `.claude/agents/cleargate-wiki-{ingest,query,lint}.md` (6 files, three pairs byte-identical).
- Tests added: 0 (subagent defs verified by M3 CLI tests via shared format strings).
- Kickbacks: 0.
- **Deviation from plan: M2's three stories landed in ONE commit, not three.** Sprint cadence guidance (sprint file line 152) says "one commit per Story = 9 commits"; we shipped 7 + 2 meta. Commit message references only STORY-002-03 even though wiki-ingest (145 LoC) and wiki-lint (256 LoC) defs ship in the same diff. Reason: parallel-wave artifact — three Developer subagents return concurrently and the orchestrator batched. Audit-traceable but suboptimal for `git log --grep STORY-002-02`.
- Flashcards recorded: `#wiki #cost #subagent` (paste schema verbatim), `#wiki #protocol #mirror` (mandatory canonical/dogfood diff).

**STORY-002-06: `cleargate wiki build`** · L2 · ~26m (commit `bee297e` at 04:25)
- Files: 11 helpers under `cleargate-cli/src/wiki/` + `cleargate-cli/src/commands/wiki-build.ts` + `cleargate-cli/test/wiki/_fixture.ts` + `cleargate-cli/test/wiki/build.test.ts` (~1,426 LoC added).
- Tests added: build.test.ts (later expanded by 002-09 with synthesis scenarios).
- Kickbacks: 0. Deviations: none. Architect's dependency audit (`npm ls gray-matter fast-glob` empty) chose inline parsers over deps.
- Flashcards recorded: `#cli #determinism #test-seam` (mandatory `now` injection for byte-identical idempotency proofs).

**STORY-002-07: `cleargate wiki ingest <file>`** · L2 · ~11m (commit `c890bb0` at 04:36)
- Files: `cleargate-cli/src/commands/wiki-ingest.ts` (+479 LoC) + `cleargate-cli/test/wiki/ingest.test.ts` (+593 LoC, 18 scenarios).
- Tests added: 18 (happy path, idempotency NOOP, update, path rejection, atomic write).
- Kickbacks: 0.
- **Real bug caught:** the idempotency `exit(0)` was inside a try/catch and got swallowed, so file writes happened after the no-op early return. Caught + fixed before commit.

**STORY-002-08: `cleargate wiki lint` + `wiki query [--persist]`** · L2 (3 commands in 1 story) · ~62m (commit `7d5ebcb` at 04:37)
- Files: `cleargate-cli/src/commands/wiki-{lint,query}.ts` + `cleargate-cli/src/wiki/lint-checks.ts` + `cleargate-cli/test/wiki/{lint,query}.test.ts` (+1,797 LoC).
- Tests added: 35 lint + 23 query = 58 total. All eight check categories from `cleargate-wiki-lint.md` lines 220-227 covered.
- Kickbacks: 0.
- **Two orchestrator decisions resolved mid-story:** (a) `--rebuild` flag dropped — subagent contract is read-only (flashcard `#wiki #cli #subagent-contract`); (b) `wiki query --persist` ships as TS replication, not subagent shell-out — testable + offline; subagent path reserved for interactive sessions.
- Flashcards recorded: `#wiki #cli #subagent-contract`, `#wiki #schema #lint`.

**STORY-002-09: Synthesis templates + corpus-shape bug fix** · L1 · ~22m (commit `8448039` at 04:59)
- Files: 4 new templates under `cleargate-cli/templates/synthesis/` + refactor of 4 recipes + `cleargate-cli/src/wiki/synthesis/render.ts` (Mustache-lite ≤60 LoC) + `cleargate-cli/tsup.config.ts` updates (+851 / -109 LoC).
- Tests added: scenarios 12-15 in `build.test.ts` (open-gates corpus-shape, active-sprint partitions, roadmap three-bucket split, product-state counts).
- Kickbacks: 0.
- **Real bug caught:** M3 shipped `open-gates.ts` filtering on `🔴` emoji; corpus uses textual `Draft`/`Ready`/`Active`. Filter matched zero items — would have shipped permanently empty open-gates.md to vibe coders.
- Flashcards recorded: `#wiki #synthesis #corpus-shape`, `#tsup #npm-publish #assets`, `#tsup #bundle #import-meta`.

**STORY-002-05: `cleargate init` (PostToolUse hook + CLAUDE.md inject + scaffold)** · L2 · ~16m (commit `f98b2b8` at 05:15)
- Files: `cleargate-cli/src/commands/init.ts` (+205) + 3 init helpers + `cleargate-cli/scripts/copy-planning-payload.mjs` + `cleargate-cli/test/commands/init.test.ts` (+346 LoC, 7 scenarios) (+879 LoC total).
- Tests added: 7 scenarios (greenfield, idempotent re-run, existing CLAUDE.md without/with markers, existing settings.json with SubagentStop / different PostToolUse matcher, bootstrap with existing items).
- Kickbacks: 0.
- **Real bug caught:** inline-marker regex greediness — payload body's prose references the START/END markers, so non-greedy `[\s\S]*?` stopped at the inline END before the real one. Fix: greedy `[\s\S]*` per flashcard `2026-04-19 #init #inject-claude-md #regex`.
- Deviations: none. Hook config copied verbatim from M1 plan lines 70-86 (no re-WebFetch).

**Meta commits:**
- `d63af50` (05:21) — wiki dogfood at meta-root + CLAUDE.md wiki-pointer update (81 files, +2,283 / -4 LoC). All 80+ wiki pages first-write.
- `81c52ef` (05:22) — orchestration artifacts: M1-M4 plans + drafted PROPOSAL-005 (8 files, +964 / -2 LoC).

### Agent efficiency breakdown

| Role | Invocations | Tokens | Cost | Tokens/story | Notes |
|---|---|---|---|---|---|
| Architect | 4 (M1-M4) | unrecorded | n/a | n/a | M1 WebFetched live hook spec — high-leverage save |
| Developer | 9 (one per story) | unrecorded | n/a | n/a | One-shot rate 9/9 = 100% |
| QA | 9 (one per story) | unrecorded | n/a | n/a | Zero kickbacks |
| Reporter | 1 | this run | unmeasured | n/a | This report |
| Orchestrator | 22 hook firings | ~883k out / ~96M cache_read / ~1.5M cache_creation | unverified | n/a | Misrouted to SPRINT-03 ledger, tagged STORY-006-01 |

**Why the costs are blank:** the SubagentStop hook at `.claude/hooks/token-ledger.sh` selects the active sprint via `ls -td .cleargate/sprint-runs/*/ | head -1` and tags `story_id` from the FIRST `STORY-NNN-NN` it greps in the orchestrator transcript. For SPRINT-04 the per-story tagging picked up `STORY-006-01` (a SPRINT-05 mention from earlier orchestration), and the writes landed in `SPRINT-03/token-ledger.jsonl`. The per-spawn (Developer/QA/Architect-as-subagent) sessions are not in either log at all. Flashcard recorded: `2026-04-19 #reporting #hooks #ledger`.

Until the hook is fixed, **Reporter cannot produce a real cost table.**

### What the loop got right

1. **Architect's M1 WebFetch saved STORY-002-05.** Refusing to trust training-data knowledge of the Claude Code hook schema, M1 fetched the live spec and recorded the corrected hook config verbatim. Three downstream surfaces (PROPOSAL-002 §3.2, EPIC-002 §3.3, STORY-002-05 body) all had the outdated shape; M1's authority over them prevented a broken-hook ship to every downstream `cleargate init` consumer. **Lesson generalizes:** architect plans should WebFetch any external API/config spec they reference, not paraphrase memory.
2. **Validating synthesis filters against real data caught the `🔴` regression.** STORY-002-09's scenario 12 explicitly seeds the test fixture with the actual textual statuses our corpus uses (`Draft`/`Ready`/`Active`), not synthetic emoji-based statuses. Caught a M3-shipped bug that synthetic fixtures would have masked indefinitely.
3. **Mandatory canonical/dogfood `diff` after every subagent edit.** Three subagent files each ship in two locations; without the post-edit `diff` requirement they would have silently diverged and live agents would behave differently from what `cleargate init` ships.
4. **One-shot rate of 100% with zero QA kickbacks across nine stories.** This is the loop's first sprint at this rate. Attribution: tightly-scoped per-story Architect blueprints (M1-M4 plans average ~150 lines each, citing exact line numbers in the protocol/sprint file) — Developers had near-zero ambiguity to resolve at draft time.
5. **`wiki build` produced a non-empty `open-gates.md` listing PROPOSAL-005 within minutes of the first dogfood run** — proving the wiki immediately delivers on its promise of catching unknown-to-orchestrator state.

### What the loop got wrong

1. **Token-ledger hook is misrouting writes — Reporter cannot compute cost.** This sprint's #11 Engineering DoD ("token budget verified ≤ $0.50") is unverifiable from local data. Concrete loop improvement: replace `ls -td sprint-runs/*/ | head -1` with an explicit `.cleargate/sprint-runs/.active` sentinel file written by the orchestrator at sprint kickoff. Story_id detection should also prefer the FIRST line of the assistant prompt (the `STORY=NNN-NN` convention in `.claude/agents/developer.md`) over the first STORY token grep across the whole transcript. Flashcard recorded: `#reporting #hooks #ledger`. **Fix this before SPRINT-05 starts** or next REPORT.md will have the same gap.
2. **M2 batched three stories into one commit, breaking sprint cadence.** Sprint file line 152 specifies "one commit per Story = 9 commits"; we shipped 7. `git log --grep STORY-002-02` and `git log --grep STORY-002-04` return nothing. Loop improvement: when running parallel-wave Developers, the orchestrator must serialize their commits even when their work returned concurrently. Add to `.claude/agents/developer.md`: "Even in parallel waves, each Developer's diff lands in its own commit with its own STORY-NNN-NN message; orchestrator queues if needed."
3. **Stale spec-comment vs code drift.** `cleargate-cli/src/init/inject-claude-md.ts:5` carries a stale comment showing the non-greedy regex form even though the runtime code is the corrected greedy form. QA noted but did not kick back (cosmetic-only). Loop improvement: QA contract should treat doc-comments inside source files as part of the implementation surface — they ship with the package and confuse the next reader.
4. **Two more agent-drafted Proposals (005, 006) surfaced through the wiki without orchestrator awareness.** These are correctly sitting at `approved: false`, but the orchestrator should track autonomous proposal drafts at write time, not at next-session ingest. Loop improvement: drafting a proposal in `pending-sync/` should emit a structured event the orchestrator picks up.

### Open follow-ups

| Item | Owner | Target |
|---|---|---|
| **PROPOSAL-005 + PROPOSAL-006 Gate 1 review** (both `approved: false`, agent-drafted) | Vibe coder | Before SPRINT-05 kickoff |
| **`cleargate@0.1.0-alpha.2` npm publish** (Ops DoD) | Maintainer (manual) | Post-sprint |
| **`mcp/package.json` bump to consume new alpha** (Ops DoD) | Maintainer | Post-publish |
| **One-shot smoke `npx cleargate@latest init` in blank tmpdir** (Ops DoD) | Maintainer | Post-publish |
| **Token-budget verification (Engineering DoD #11, ≤ $0.50)** | Reporter (next run) | Requires hook fix first |
| **Fix `inject-claude-md.ts:5` stale comment** (cosmetic) | Any developer | SPRINT-05 cleanup wave |
| **Fix `token-ledger.sh` routing + story-id tagging** (loop blocker for cost reporting) | Architect+Dev | Before SPRINT-05 kickoff |
| **EPIC-007 Public Discoverability** (PROPOSAL-004 approved 2026-04-19 in `ed8a5a9`) | Architect | Awaits decomposition + sprint scheduling |
| **Commit cadence rule into `developer.md`** (one commit per story even in parallel waves) | Architect | Before SPRINT-05 kickoff |

---

## Meta

**Token ledger (intended):** `.cleargate/sprint-runs/SPRINT-04/token-ledger.jsonl` — **does not exist**. SPRINT-04 hook firings landed in `.cleargate/sprint-runs/SPRINT-03/token-ledger.jsonl` (last 22 rows, mistagged `story_id: "STORY-006-01"`). Per-subagent (Developer/QA/Architect) spawns not recorded in either ledger. Reporter could not produce real cost or per-agent breakdown.
**Flashcards added this sprint:** **11** (file diff at `.cleargate/FLASHCARD.md`). Mid-sprint Developers + this Reporter all recorded cards.
**Model rates used:** none applied. Cost table left blank rather than fabricated. (When the ledger fix lands, use Anthropic public pricing as of the next sprint's start; record date in REPORT.md.)
**Commits in scope:** 14 total in `git log f13464b..HEAD` — 1 sprint repoint (`1edcab6`), 2 migration (`b38f146`, `0679a23`), 2 PROPOSAL-004 (`dfd6744`, `ed8a5a9`), 7 EPIC-002 stories, 2 meta (`d63af50`, `81c52ef`). EPIC-002 commits: `aef73b1`, `8c82e30`, `bee297e`, `c890bb0`, `7d5ebcb`, `8448039`, `f98b2b8`.
**Tests:** `cleargate-cli/` end-of-sprint = **259 passed / 4 skipped** (16 test files; 1 file skipped). Sprint start = 97. Net +162 tests across 5 new test files (`test/wiki/{build,ingest,lint,query}.test.ts`, `test/commands/init.test.ts`).
**Report generated:** 2026-04-19 by Reporter agent (Opus 4.7), persisted by orchestrator.

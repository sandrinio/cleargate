---
epic_id: EPIC-063
parent_ref: null
proposal_gate_waiver: true
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: Direct owner request 2026-11-12 ('we got to wire this up… VERY high priority… off sprint, checked and published') after an in-session audit of the ingest path; scope widened the same day by owner direction ('fold it in') to include the orchestrator awareness layer, after a cross-check of a second agent's analysis. Proposal gate waived by direct request with sharp intent; approved_by/approved_at recorded at Gate 1. Grounded against cleargate-cli main + live /.claude + live .cleargate/wiki on 2026-11-12.
owner: sandrinio
target_date: 2026-11-13
area: wiki,hooks,cleargate-cli,orientation
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-12T05:24:29Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-11-11T23:33:30Z
  sessions:
    - session: 72e522d7-caa6-4837-81f5-8fa60f84f8b5
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-11T22:10:29Z
---

# EPIC-063: Wiki Pipeline Wired End to End and Orchestrator Awareness Layer

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>M1: make every wiki-ingest path the protocol promises actually run and tell the truth (contradiction check reaches the agent and stamps; shell/CLI writes reach ingest; `wiki build` keeps sprint reports; the active-sprint page reads the real sentinel). M2: turn the wiki into the orchestrator's awareness layer — a ≤1,500-token session brief injected at SessionStart, a ≤4,000-token index built for duplicate checks, section-extracted item pages with computed relations, and a decisions page.</objective>
  <architecture_rules>
    <rule>Keep EPIC-020's Mode A: the contradiction LLM call is the `cleargate-wiki-contradict` subagent dispatched by the in-session agent. The CLI never calls a model API and never spawns `claude`/`codex`. This supersedes EPIC-020's "no changes to stamp-and-gate.sh in v1".</rule>
    <rule>All wiki extraction is deterministic: frontmatter, fixed template headings, `.cleargate/sprint-runs/.active`, `state.json`, sprint reports. No LLM-written summaries.</rule>
    <rule>Anything a hook means the agent to read goes through the channel the host actually delivers to the model. Claude Code: PostToolUse → JSON `hookSpecificOutput.additionalContext` (plain PostToolUse stdout is transcript-only); SessionStart → stdout (proven by the existing banner). Codex: its own channel. Verify against the running host.</rule>
    <rule>Hooks never block: every hook keeps an unconditional `exit 0`.</rule>
    <rule>The session brief is precomputed at ingest/build time and only read at SessionStart; SessionStart never runs a full scan.</rule>
    <rule>Phase 4 stays advisory (calibration precondition in protocol §10.10 is unmet: 0 labelled findings).</rule>
    <rule>Ingest drift detection stays git-SHA (locked 2026-04-19). Only the Phase 4 idempotency key changes.</rule>
    <rule>Token counts use the repo heuristic `Math.round(bytes / 4)` (`cleargate-cli/src/wiki/lint-checks.ts:476`).</rule>
    <rule>Canonical edits only: `cleargate-cli/src/**` + `cleargate-cli/scaffold/**` on `story/<ID>` branches of the cleargate-cli repo. Live `/.claude/` re-synced after each release; `cleargate doctor` drift-clean.</rule>
    <rule>Tests: node:test only, `*.node.test.ts` via tsx. Live end-to-end runs reuse the clean-room harness (`cleargate-cli/scripts/clean-room/`).</rule>
    <rule>Claude host gets the full change; the Codex host gets parity edits to its `stamp-and-gate.sh` and `session-start.sh`, with no live Codex run.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/lib/wiki/contradict.ts" action="modify" />
    <file path="cleargate-cli/src/commands/wiki-contradict.ts" action="modify" />
    <file path="cleargate-cli/src/commands/wiki-ingest.ts" action="modify" />
    <file path="cleargate-cli/src/commands/wiki-build.ts" action="modify" />
    <file path="cleargate-cli/src/cli.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/page-schema.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/scan.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/lint-checks.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/synthesis/active-sprint.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/synthesis/product-state.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/synthesis/open-gates.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/synthesis/session-brief.ts" action="create" />
    <file path="cleargate-cli/src/wiki/synthesis/decisions.ts" action="create" />
    <file path="cleargate-cli/src/commands/doctor.ts" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/hooks/post-shell-ingest.sh" action="create" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/settings.json" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-ingest.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/CLAUDE.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/hooks/stamp-and-gate.sh" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/hooks/session-start.sh" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="cleargate-cli/scripts/clean-room/" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
The wiki is meant to be what the orchestrator (the agent the owner talks to) reads to know where things stand. Today it does not do that job, for two kinds of reason.

*The pipeline does not run as documented.* EPIC-020 shipped the Phase 4 contradiction check assuming the PostToolUse hook would start the `cleargate-wiki-ingest` agent. The hook calls the `cleargate wiki ingest` CLI instead, so the `phase4:` signal only reaches `.cleargate/hook-log/gate-check.log`: 604 signals, `wiki/contradictions.md` at `findings: []`, 0 of 338 pages stamped. The `cleargate wiki contradict-commit` command the agent is told to finish with was never built. Claude Code shows PostToolUse plain stdout only in the transcript, so the hook's `⚠️ gate failed` (CR-032) and `⚠️ wiki ingest failed` (CR-093) lines have never reached an agent either. Verified on this file at 2026-11-11T22:09:29Z: the hook logged `gate=1`, printed the warning, and the drafting agent received nothing. Ingest fires only on Edit/Write, so `git mv`, `sed -i` and CLI writes (`cleargate sprint add|remove`) never reach the wiki. `cleargate wiki build` has no sprint-report handling (`cleargate-cli/src/commands/wiki-build.ts:84-110`), so each rebuild strips the report blocks CR-063 merges in: 1 of 37 reports on disk is in the wiki. `active-sprint.md` decides "current" from `activated_at`/`completed_at` (`cleargate-cli/src/wiki/synthesis/active-sprint.ts:19-24`), so it names SPRINT-14, 15 and 28 as current and lists Completed and Abandoned sprints as planned.

*What it holds is not what the orchestrator needs.* Nothing loads the wiki into the session: the SessionStart hook prints only the doctor banner and the skill-load line, and reading `wiki/index.md` is an honour-system instruction in CLAUDE.md. Item pages are a blind 1,200-character cut of the raw file (`SUMMARY_BUDGET`, `cleargate-cli/src/wiki/page-schema.ts:161`); raw epics average 19.6 KB, so a page keeps about 6%, often only half of the `<agent_context>` block. 0 of 338 pages have a parent or children. `open-gates.md` lists only proposals at Gate 1, and stories at Gate 2, which the wiki excludes. The owner hand-maintains an "Active state" section in CLAUDE.md (~1,040 tokens) because the wiki cannot produce one. Both orchestrator sessions asked on 2026-11-12 described the documented design as working, because nothing they read said otherwise.

**Success Metrics (North Star):**
- **Contradiction check runs:** every unapproved Draft/In Review item an agent writes ends its session stamped or with findings. Baseline 0/338 stamped, 0 findings.
- **No silent drops:** every `phase4:` signal, gate warning and ingest warning reaches the agent's context. Baseline: none do.
- **Shell-path coverage:** a work item moved or rewritten by a shell or CLI write has a current wiki page by the time the tool call returns.
- **Reports kept:** after `wiki build`, 37 of 37 sprint reports are in the wiki. Baseline 1 of 37.
- **Orientation quality:** on the §5 orientation eval, a fresh session answers ≥ 11 of 12 questions correctly, and the 8 Layer-0 questions with zero tool calls. The baseline score with today's setup is recorded before work starts.
- **Budgets hold:** session brief ≤ 1,500 tokens, `index.md` ≤ 4,000 tokens, each item page 2,000–2,400 characters, on the real corpus and on a synthetic corpus twice its size.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

*Milestone 1 — the pipeline runs and tells the truth (release 0.29.0, ships with [[CR-126]])*
- [ ] **STORY-063-01 Contradiction commit command and recheck rules.** `cleargate wiki contradict-commit <raw-file>` (findings JSON on stdin or `--findings <file>`, validated, no partial write) wraps the existing `commitPhase4Findings`. Phase 4 idempotency is keyed on a hash of the raw file's content. Status filter: `status ∈ {Draft, In Review}` and `approved !== true`.
- [ ] **STORY-063-02 Hook output reaches the agent; docs match code.** `stamp-and-gate.sh` sends the `phase4:` directive plus the ⚠️ gate and ingest lines through the model-visible channel, on both hosts. CLAUDE.md block rule: dispatch `cleargate-wiki-contradict` once, before the Brief, then `contradict-commit`; the Brief carries a `Contradictions:` line. Protocol §10.8–§10.10 and the `cleargate-wiki-ingest` agent description rewritten to match the code (§10.8 states where lint really runs, per §6 Q1).
- [ ] **STORY-063-03 Shell-path ingest hook.** New `post-shell-ingest.sh` on the PostToolUse `Bash` matcher ingests `.cleargate/delivery/**/*.md` files added, modified or renamed since its last run: `git mv`, plain `mv` (keeps mtime), `sed -i`, CLI writes.
- [ ] **STORY-063-04 `wiki build` keeps sprint reports.** Build scans `sprint-runs/SPRINT-*/` reports and composes them like ingest does, so a rebuild restores all 37 report blocks.
- [ ] **STORY-063-05 Active-sprint page reads the real sentinel.** `active-sprint.md` reads `.cleargate/sprint-runs/.active`, `state.json` and `status`; "none" when no sprint is active.
- [ ] **STORY-063-06 Silent-drop alarm.** `cleargate doctor --session-start` adds a banner line when an unapproved Draft/In Review item was ingested over 24 hours ago with no contradiction stamp.
- [ ] **STORY-063-07 Clean-room proof of the ingest loop.** Live end-to-end scenarios (known-positive, known-negative, shell path) in the clean-room harness: the M1 release gate.

*Milestone 2 — orchestrator awareness layer (release 0.30.0)*
- [ ] **STORY-063-08 Item pages extracted by section.** Replaces the 1,200-character cut with per-type extraction within 2,000–2,400 characters:
  - **Every type:** identity, status, sprint, gate pass and failing checks.
  - **Epic:** objective, problem, in-scope and out-of-scope bullets, architecture rules, §6 answers, unresolved questions.
  - **Bug:** anomaly, reproduction, `## 3. Evidence & Context` labelled Evidence (no root-cause heading exists; a template heading is a follow-up CR), sandbox paths.
  - **CR:** motivation, change summary, blast radius.
  - **Sprint:** goal, deliverables, and from the report: status, carried items and a report pointer. A structured goal verdict is a follow-up CR.
- [ ] **STORY-063-13 Computed wiki relations** (split out of 063-08 by owner approval 2026-11-12). Parent from `parent_ref`/`parent_epic_ref`/`parent` (fixing `buildParentRef`, which ignores `parent_ref`), children computed from raw files (stories included, no story pages), cites and cited_by, neighbour pages kept current on single-file ingest, and lint accepting parents in excluded buckets.
- [ ] **STORY-063-09 Index and state pages built for open work.** One index line per open item (ID, status, sprint, title, ≤ 12-word digest), bugs and CRs nested under their parent epic (from 063-13) or `area:`, archive as counts, ≤ 4,000 tokens as a lint warning with tiered compaction that never drops an open ID (EPIC-015's 8,000-token failure ceiling unchanged). `product-state.md` counts open items; `open-gates.md` lists every type waiting at Gate 1 with its failing checks.
- [ ] **STORY-063-10 Decisions page.** `wiki/decisions.md`: every answered §6 / §0.5 / §1.4 question, plus architecture rules from open epics only, with date, source ID and what it supersedes. Long entries are cut with a link, with a lint `warn:` above 8,000 tokens.
- [ ] **STORY-063-11 Session brief injected at SessionStart.** `wiki/brief.md` (≤ 1,500 tokens), rebuilt on ingest and build, printed by `session-start.sh` on both hosts. It holds:
  - active sprint: ID, goal and phase, each item's state, blockers, or "none"
  - last closed sprint: goal verdict, what shipped, what carried over
  - carried items with no sprint yet
  - next planned sprints with how many items are 🟢
  - waiting on the human: failing gates, unanswered questions, unlabelled contradictions, unfinished Gate-4 checklists
  - open P0/P1 bugs by title
  - the latest locked decisions
  - release state

  The meta-repo CLAUDE.md Active-state section becomes a pointer to the brief (§6 Q3).
- [ ] **STORY-063-12 Truth oracle and orientation eval.** The independent oracle test (in `npm test`) and the 12-question orientation eval (manual M2 release gate), with the baseline measured on a 0.28.0 clean-room install.
- [ ] **Releases.**
  - 0.29.0 after M1 (with CR-126) and 0.30.0 after M2, each published to npm with a GitHub Release.
  - The live `/.claude/` is re-synced after each, and `doctor` must be drift-clean.
  - Off-sprint execution: each story runs Architect (one plan per milestone) → QA-Red → Developer → QA-Verify on a `story/` branch in cleargate-cli, then merges.
- [ ] **Follow-ups filed (not built here):** a CR for per-item `wiki lint` enforcement at push (§6 Q1).

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Making Phase 4 blocking, or a readiness predicate that requires it. The approval edit itself changes the content hash.
- The CLI calling an LLM, or spawning a headless agent to run Phase 4 or to write summaries.
- Enforcing `cleargate wiki lint` at Gate 1 or at push (see §6 Q1). Lint exits 1 today with 55 existing findings.
- Clearing those 55 lint findings, and removing orphan pages for deleted raw files.
- Mapping requirements to code (what each shipped item delivered, mapped to the code that does it). That is [[EPIC-052]]'s scope.
- BM25, vector or other retrieval.
- Per-story wiki pages. Stories feed computed relations and the brief as facts only.
- Changing EPIC-015's 8,000-token lint ceiling.
- A live Codex dogfood run (consistent with the SPRINT-41 carry, BUG-106).
- Moving the owner's working preferences (memory) or static repo layout (CLAUDE.md) into the wiki.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | (1) `post-shell-ingest.sh` adds p95 ≤ 150 ms to a Bash call that changes no delivery file. (2) `session-start.sh` adds p95 ≤ 100 ms over today. Both are measured by timing 20 runs of the hook on this repo, fed recorded payloads, with `/usr/bin/time`, before and after. |
| Context budget | Session brief ≤ 1,500 tokens, always loaded. It replaces CLAUDE.md's hand-written Active-state section (~1,040 tokens; see §6 Q3), so the net cost is about +500. Today's always-loaded baseline is CLAUDE.md ~7.6k plus MEMORY.md ~1.8k. `index.md` ≤ 4,000 tokens; item page 2,000–2,400 characters. Tokens = bytes/4. |
| Token cost | One `cleargate-wiki-contradict` dispatch per item per content version, ≤ 4k input + ≤ 1k output (EPIC-020's 12-page neighbourhood cap). Never one dispatch per intermediate edit. |
| Truthfulness | A wrong brief is worse than none; today's `active-sprint.md` proves it. Every brief fact is checked against an independent oracle in tests (§5 verification plan). |
| Hook contract | Every hook exits 0. Failures surface as visible warning lines and never block the tool call. |
| Multi-host | Claude Code and Codex use different model-visible channels. The CLI emits host-neutral output and each host's script adapts it. |
| Dogfood split | Canonical edits only; live re-sync after each release; `doctor` exit 0 (BUG-085). |
| Release | Temp-npmrc publish flow (token in `mcp/.env` NPM_PAT); `prepublishOnly` rebuilds and runs verify-pack. |

## Existing Surfaces

> L1 reuse audit. List source-tree implementations the epic could extend. Cite file:line.

- **Surface:** `cleargate-cli/src/lib/wiki/contradict.ts:84` `preparePhase4` and `:159` `commitPhase4Findings`. Prepare and commit logic exist; nothing outside tests calls the commit. `:28` `PHASE4_TRIGGER_STATUSES` is the status filter to extend.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:189` (`currentSha = getGitSha(...) ?? ''`, empty for uncommitted drafts) and `:361` (emits `phase4:`).
- **Surface:** `cleargate-cli/src/commands/wiki-contradict.ts` and `cleargate-cli/src/cli.ts:296`. The prepare-only `wiki contradict` CLI.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh:103` (ingest output captured to the log only) and `:113` (`exit 0`). The Codex copy has the same lines. `cleargate-cli/scaffold/hosts/claude/.claude/settings.json:48` holds the only ingest matcher (`Edit|Write`).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh`. Already prints model-visible lines (doctor banner, `Load skill:`), so the brief is one more output.
- **Surface:** `cleargate-cli/src/commands/wiki-build.ts:84-110`. Scans `delivery/` only and calls `buildPageBody` per item; there is no sprint-report path. The fix reuses `isSprintReportPath` (`cleargate-cli/src/wiki/derive-bucket.ts:30`) and CR-063's two-source composition in `wiki-ingest.ts`.
- **Surface:** `cleargate-cli/src/wiki/page-schema.ts:161` (`SUMMARY_BUDGET = 1200`), `:309` (`buildPageBody`), `:429` (`buildIndex`, shared by build and ingest since CR-103). The section extractor and the index redesign replace these bodies.
- **Surface:** `cleargate-cli/src/wiki/synthesis/{active-sprint,open-gates,product-state,roadmap}.ts`. Synthesis compilers recompiled on ingest; the brief and decisions pages follow the same pattern.
- **Surface:** `cleargate-cli/src/wiki/lint-checks.ts:487` `checkIndexBudget`. The budget check to extend with the 4,000-token warning and the brief and page budgets.
- **Surface:** `cleargate-cli/src/commands/doctor.ts` `--session-start` mode. Home for the regression alarm.
- **Surface:** `cleargate-cli/scripts/clean-room/` and `cleargate-cli/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts`. The SPRINT-41 clean-room harness reused for the live end-to-end runs.
- **Coverage of this epic's scope:** ≥ 80% extension. The new pieces are one CLI subcommand, one hook script, two synthesis compilers, one settings matcher and two harness scenarios.

## Prior work

- [[PROPOSAL-012]] — Wiki Contradiction Detection (approved). The design M1 finishes wiring.
- [[EPIC-020]] — Wiki Contradiction Detection (Completed). Shipped the subagent, Phase 4 in ingest and the prepare-only CLI. Its "no changes to stamp-and-gate.sh in v1" rule is the root cause; this epic supersedes it.
- [[EPIC-015]] — Wiki Index Hygiene & Scale (Completed). Set the 8,000-token index lint ceiling and a ≤ 2,000-token target for the active surface. M2 keeps the ceiling and builds the index for duplicate checks.
- [[EPIC-024]] — AI Orientation Surface Slim (Completed). Aspirational ≤ 8,000-token orientation budget (CLAUDE.md + slim protocol). CLAUDE.md alone is ~7.6k today, which is why the brief has a hard cap and replaces text instead of adding it.
- [[CR-063]] — Sprint-report ingest (archived). `wiki build` was never taught its two-source composition, which is 063-04's bug.
- [[CR-093]] — File Argument Owns Project Root (Completed; raw file in `pending-sync/`). It also added the `⚠️ wiki ingest failed` re-emit that 063-02 moves to the model-visible channel.
- [[CR-103]] — Wiki Page and Index Fidelity (archived). Introduced `SUMMARY_BUDGET` and the shared `buildIndex`; 063-05 and 063-06 replace both bodies.
- [[CR-112]] — Heading-anchored predicates replace positional `section(N)` (Draft). Section extraction needs the same heading locator; the Architect checks whether to share it.
- [[EPIC-052]] — Requirement-Level Grounding (Draft). Owns requirement → code mapping, kept out of scope here.
- [[BUG-085]] — Live instance never re-synced (archived). The reason each release includes a live re-sync and a clean doctor run.
- [[BUG-086]] — DevOps merges fail on the orchestrator's own wiki changes (open). More frequent wiki writes must not make it worse.
- Contradiction check, run by hand on 2026-11-12 against the first draft's 7-page neighbourhood: 1 finding, EPIC-063 vs [[EPIC-020]] (intentional supersession, recorded in §0). Not committed to `wiki/contradictions.md`, since `contradict-commit` does not exist yet.
- Second-agent cross-check (2026-11-12): its claims about the 1,200-character cut, `wiki build` dropping reports, the active-sprint keys and the index make-up were verified and folded in. Its "index is loaded every session" was false. Its proposals to drop Draft bugs from the index and to run `wiki build` on commit or SessionStart were rejected (§ Why not simpler?).
- FLASHCARD grep for `phase4|contradict`: no card covers this gap.

## Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this epic:** `stamp-and-gate.sh` + `commitPhase4Findings` for M1. For M2, the existing synthesis compilers plus `buildPageBody`/`buildIndex`, with `session-start.sh` printing one more file.
- **Why isn't extension / parameterization / config sufficient?** Almost all of it is extension.
  - **Model-visible output:** unavoidable, because the contradiction call must run in the session and the CLI has no other way to ask for it.
  - **Bash hook:** shell and CLI writes fire no Edit/Write event.
  - **`wiki build` on commit or SessionStart, rejected:** build is the code that strips reports, and a full rebuild over 338 pages misses both performance budgets by orders of magnitude.
  - **Raising `SUMMARY_BUDGET`, rejected:** a bigger blind cut still spends its budget on `<agent_context>` before reaching §1 and §2; extraction has to be by section.
  - **Dropping Draft bugs and CRs from the index, rejected:** the index's main job is the duplicate check and bugs are the largest open type (48 of 87 open rows). Nesting them under their parent epic or area shortens the index without hiding anything.
  - **Keeping the hand-written Active-state section, rejected:** it drifts, and it is the content the brief generates.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cleargate-cli/src/lib/wiki/contradict.ts`: content-hash idempotency; `approved !== true` filter; findings-JSON validator.
- `cleargate-cli/src/commands/wiki-contradict.ts`: `contradict-commit` handler.
- `cleargate-cli/src/commands/wiki-ingest.ts`: passes the content hash to Phase 4; recompiles the brief and decisions pages.
- `cleargate-cli/src/commands/wiki-build.ts`: scans the per-sprint report files under `.cleargate/sprint-runs/` and composes them into sprint pages; builds the brief and decisions pages.
- `cleargate-cli/src/cli.ts`: registers `wiki contradict-commit`; fixes `wiki contradict` help.
- `cleargate-cli/src/wiki/page-schema.ts`: per-type section extractor replaces the `SUMMARY_BUDGET` cut (STORY-063-08); relations block and `cites`/`cited_by` fields (STORY-063-13); `buildIndex` redesign (STORY-063-09).
- `cleargate-cli/src/wiki/scan.ts`: its unfiltered `scanRawItems` result feeds relations and decisions, so stories are read without becoming ingestable pages.
- `cleargate-cli/src/wiki/` (verified directory): new files `extract-sections.ts` (STORY-063-08) and `relations.ts` (STORY-063-13).
- `cleargate-cli/src/wiki/lint-checks.ts`: `checkBrokenBacklinks` accepts parents in excluded buckets (STORY-063-13); index and decisions size warnings (STORY-063-09, 063-10).
- `cleargate-cli/src/wiki/lint-checks.ts`: warnings for the index, brief and page budgets.
- `cleargate-cli/src/wiki/synthesis/active-sprint.ts`: reads `.active`, `state.json` and `status`.
- `cleargate-cli/src/wiki/synthesis/product-state.ts`, `open-gates.ts`: open-item counts; Gate 1 covers all types.
- `cleargate-cli/src/wiki/synthesis/` (verified directory): new files `session-brief.ts` and `decisions.ts`.
- `cleargate-cli/src/commands/doctor.ts`: the silent-drop alarm (STORY-063-06) in `--session-start` mode.
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh`: model-visible output.
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/` (verified directory): new file `post-shell-ingest.sh`.
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh`: prints the brief.
- `cleargate-cli/scaffold/hosts/claude/.claude/settings.json`: PostToolUse `Bash` matcher.
- `cleargate-cli/scaffold/hosts/codex/.codex/hooks/stamp-and-gate.sh` and `cleargate-cli/scaffold/hosts/codex/.codex/hooks/session-start.sh`: parity.
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-ingest.md`, `cleargate-cli/scaffold/hosts/claude/CLAUDE.md`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md`: docs match code.
- `cleargate-cli/scripts/clean-room/`: live end-to-end scenarios (STORY-063-07) and the orientation eval (STORY-063-12).
- `./CLAUDE.md` (meta-repo, outside the CLEARGATE block): the Active-state section becomes a pointer to the generated session brief (§6 Q3); lands as a separate meta-repo commit at the 0.30.0 release.

**Data Changes:**
- Wiki page frontmatter:
  - `last_contradict_sha` becomes a content hash (all 338 are null today, so nothing to migrate).
  - `parent` and `children` are computed.
  - New `cites` and `cited_by` lists.
- New generated files: `wiki/brief.md`, `wiki/decisions.md`.
- A last-run snapshot file for `post-shell-ingest.sh` under the gitignored `.cleargate/hook-log/`. The Architect confirms the location.

## 5. Acceptance Criteria

```gherkin
Feature: Wiki pipeline wired end to end and orchestrator awareness layer

  # ── M1: the pipeline runs and tells the truth ──
  Scenario: Editing an unapproved draft gets the contradiction check to the agent
    Given a Draft epic with approved: false whose wiki page has no last_contradict_sha
    When the agent Writes the epic file
    Then the agent's context receives one line naming the item ID, cleargate-wiki-contradict, and wiki contradict-commit
    And the line is not only in hook-log/gate-check.log

  Scenario: Committing findings records them and stamps the page
    Given the contradict subagent returned two findings for EPIC-X
    When the agent pipes them to `cleargate wiki contradict-commit <EPIC-X raw path>`
    Then wiki/contradictions.md gains two entries with label: null
    And EPIC-X's page last_contradict_sha equals the raw file's current content hash

  Scenario: An unchanged, already-checked uncommitted draft is not flagged again
    Given an uncommitted Draft whose contradiction check was committed
    When ingest re-runs on the unchanged file
    Then no contradiction directive is emitted

  Scenario: Approved and non-draft items are skipped
    Given an epic with approved: true, or with status Active
    When the agent edits it
    Then no contradiction directive is emitted

  Scenario: Error — malformed findings are rejected without side effects
    Given findings input that is not valid JSON, or entries missing neighbor or claim
    When the agent runs wiki contradict-commit
    Then it exits non-zero naming the problem
    And wiki/contradictions.md and last_contradict_sha are unchanged

  Scenario: Gate and ingest failures are visible to the agent
    Given a delivery file that fails its gate, or whose frontmatter cannot be parsed
    When the agent Writes it
    Then the agent's context receives the "gate failed" or "wiki ingest failed" line
    And the hook exits 0

  Scenario: Shell moves and CLI writes reach the wiki
    Given CR-X's page has raw_path under pending-sync/
    When the agent runs `git mv` (or plain `mv`) on CR-X into archive/ via the Bash tool
    Then by the time the Bash call returns, CR-X's page raw_path points into archive/
    And after `cleargate sprint add <id>` via the Bash tool, the sprint's page reflects the new membership

  Scenario: Bash calls that touch no work item stay cheap
    Given no file under .cleargate/delivery/ changed
    When the agent runs `ls` via the Bash tool
    Then post-shell-ingest.sh runs no ingest and stays within the §3 budget

  Scenario: wiki build keeps sprint reports
    Given 37 sprint reports under .cleargate/sprint-runs/
    When `cleargate wiki build` runs
    Then 37 sprint pages carry their report block
    And running `wiki ingest` on a report and then `wiki build` again keeps the block

  Scenario: The active-sprint page reads the real sentinel
    Given .cleargate/sprint-runs/.active is absent
    Then active-sprint.md says no sprint is active and lists only non-terminal sprints as planned
    And when .active names SPRINT-N, active-sprint.md shows SPRINT-N with each item's state from state.json

  # ── M2: orchestrator awareness layer ──
  Scenario: Item pages carry the sections that matter
    Given EPIC-058 (a 28 KB raw epic whose first 1,200 characters are all <agent_context>)
    When it is ingested
    Then its page holds the objective, Problem & Value, in-scope and out-of-scope bullets, and unresolved questions
    And no XML tag is cut mid-way
    And the body is 2,000–2,400 characters

  Scenario: Relations are computed, not declared
    Given stories and CRs whose parent is EPIC-X, and items citing [[EPIC-X]]
    When the wiki is built
    Then EPIC-X's page lists them as children and cited_by, without story pages being created

  Scenario: The index serves duplicate checks within budget
    Given the real corpus, and a synthetic corpus twice its size
    When the wiki is built
    Then index.md lists every open item on one line with a digest, bugs and CRs nested under their epic or area
    And index.md is ≤ 4,000 tokens on the real corpus, with lint warning (not failing) above that

  Scenario: The session brief is injected and true
    Given a built wiki
    When a new session starts
    Then the brief (≤ 1,500 tokens) is in the agent's context
    And every fact in it matches the independent oracle (active sprint, last verdict, carried items, waiting-on-human, P0/P1 bugs, release state)

  Scenario: Decisions are collected
    Given items with answered §6 questions and architecture rules
    When the wiki is built
    Then wiki/decisions.md lists each with its date, source ID, and anything it supersedes

  Scenario: A silent drop is caught within a day
    Given an unapproved Draft item last ingested more than 24 hours ago with no contradiction stamp
    When a session starts
    Then the doctor banner names the item

  # ── Live proof ──
  Scenario: End-to-end in a real Claude Code session
    Given a clean-room repo with the packed release installed and a seeded neighbour that contradicts the draft
    When a headless Claude Code session drafts the item and renders its Brief
    Then the transcript shows the directive delivered as hook context
    And a cleargate-wiki-contradict dispatch ran
    And wiki/contradictions.md gains a finding naming the seeded neighbour
    And the Brief carries a Contradictions: line
```

Verification plan: see ## Testing Strategy.

## Testing Strategy

> How do we test this? Every labelled line and every level row needs an answer. `n/a — <reason>` is a valid answer; an empty cell or a `{…}` placeholder is not. Real-host proof means the change observed in the real host (a live Claude Code or Codex session, a real install), not unit tests passing.

Unit tests can pass while the model never sees the output; the existing hook did exactly that for months. So the epic is checked on the levels below, and a release ships only when all of them pass.

- **What "working" means:** in a real Claude Code session:
  - the contradiction directive reaches the agent as hook context;
  - a `cleargate-wiki-contradict` dispatch runs;
  - `wiki/contradictions.md` gains a finding naming the seeded neighbour, and the item page is stamped;
  - shell and CLI writes reach ingest;
  - sprint reports survive `wiki build`;
  - a silent drop raises a banner alarm;
  - after M2, the session-start brief lets the agent answer the orientation questions without tool calls.
- **Oracle:** an independent script, written with shell, `grep` and `jq` and sharing no code with the compilers, computes ground truth from the raw files. It covers: active sprint, last verdict, carried items, failing gates, unanswered questions, P0/P1 bugs and release state. Its output is compared fact by fact with the wiki output (`wiki/brief.md` in M2).
- **Known-positive case:** a clean-room repo with a seeded neighbour that contradicts the draft. The session must deliver the directive as hook context, run a contradict dispatch, append a finding naming the neighbour, stamp the page, and put a `Contradictions:` line in the Brief.
- **Known-negative case:** a draft with no conflict. It must be stamped with 0 findings.
- **Baseline:** measured in this repo on 0.28.0 (§1):
  - 0 of 338 pages carry `last_contradict_sha`;
  - 1 of 37 sprint pages keeps a report block after `wiki build`;
  - the hook's failure lines never reach the model.

  The orientation eval runs once on the 0.28.0 setup before M2 work starts, to record its baseline.
- **Release gate:** all of the following must pass before each release:
  - unit, hook-contract and truth-oracle tests pass in `npm test`;
  - the clean-room ingest loop exits 0;
  - QA runs the live end-to-end and, for M2, the orientation eval by hand before each release (pass: ≥ 11 of 12 correct, with the 8 brief questions answered with zero tool calls);
  - the dogfood checks pass in this repo after each release.
- **Regression guard:** the truth-oracle and hook-contract tests stay in `npm test` permanently. The clean-room check is re-run on every release, and the session banner's silent-drop alarm flags a drop in daily use.

| Level | What it proves | Where the tests live | Who runs them, when |
|---|---|---|---|
| Unit | `contradict-commit` (valid input, bad input, the idempotency key, the status filter); the section extractor, with golden tests per type on fixtures copied from real items (EPIC-058, a bug, a CR, a sprint with a report); relation computation; the `wiki build` report merge; the active-sprint compiler with `.active` set and unset; the §3 budget checks | `cleargate-cli/test/wiki/**`, `cleargate-cli/test/lib/**` (node:test, `npm test`) | QA, for every story |
| Contract | `stamp-and-gate.sh` and `post-shell-ingest.sh` turn recorded PostToolUse payloads (Write, Edit, Bash with `git mv`, Bash with `mv`, Bash with `ls`) into valid JSON with the expected `additionalContext` line and exit 0; `session-start.sh` prints the brief under 1,500 tokens; the no-op paths are timed against the §3 budgets | `cleargate-cli/test/hooks/**` (node:test, recorded payloads, `npm test`) | QA, for every story |
| Integration | the truth oracle compares raw-file ground truth with `wiki/brief.md` fact by fact, on this repo's corpus and on a fixture corpus with an active sprint, and any mismatch fails (STORY-063-12 `brief-truth-oracle.node.test.ts`); `wiki build` plus ingest run over fixture corpora with and without an active sprint | `cleargate-cli/test/wiki/**` | `npm test` (oracle) for every story; `npm run test:integration` (build + ingest corpora) at release |
| Real-host end-to-end | the packed tarball is installed with `cleargate init` in a temporary repo (`cleargate-cli/scripts/clean-room/`), and `claude -p --output-format stream-json` runs the whole ingest loop. It covers the known-positive (all five outcomes of the last Gherkin scenario), the known-negative (stamped, 0 findings), the shell path (`git mv` into `archive/` updates `raw_path` before the session ends), the sprint report kept on its page, and the silent-drop banner alarm | `cleargate-cli/scripts/clean-room/ingest-loop.mjs` (STORY-063-07) | QA, by hand before each release (spends model tokens; not part of `npm test`) |
| Eval | 12 fixed questions, scored against the truth oracle. 8 are answerable from the brief: active sprint, last verdict, carried items, planned next, what is waiting on the owner, P0/P1 bugs, latest decisions, release state. 4 need the index or pages: a duplicate check for a given idea, an epic's children, a bug's root cause, what a decision superseded. Pass: ≥ 11 of 12, with the 8 brief questions answered with zero tool calls | the orientation eval harness (STORY-063-12) | QA, by hand: once on 0.28.0 as the baseline and once before the M2 (0.30.0) release; only an Opus run counts |
| Dogfood | after each release, in this repo: `cleargate doctor` exits 0; the SessionStart output shows the brief (M2); the next real item drafted gets a `Contradictions:` line in its Brief and a stamped page; the regression alarm stays quiet for one day of normal use | this repo (M1/M2 plan §R step 8) | the orchestrator, after each release |

Story Test-layers notes use these level names: unit = Unit; hook-contract = Contract; truth oracle = Integration; live end-to-end = Real-host end-to-end; orientation eval = Eval; dogfood = Dogfood.

### User journeys

| Journey | Actor | Path (trigger → steps → end) | Observable end state | Walked by |
|---|---|---|---|---|
| J1: draft edit to stamped page | agent drafting a work item | edit a draft → directive reaches the agent as hook context → contradict subagent runs → `cleargate wiki contradict-commit` → page stamped | `wiki/contradictions.md` names the seeded neighbour, the page carries `last_contradict_sha`, and the Brief has a `Contradictions:` line | STORY-063-07 `ingest-loop.mjs` check `claude.live.*` (directive, dispatch, finding, stamp, Brief line) |
| J2: shell write to ingest | agent moving an item with `git mv` | shell or CLI write → Bash PostToolUse hook → ingest | the page `raw_path` updates before the session ends | STORY-063-07 `ingest-loop.mjs` shell-path check |
| J3: sprint close to report on page | orchestrator closing a sprint | sprint report written → `cleargate wiki build` → report merged into the sprint page | the sprint page carries `<!-- BEGIN sprint-report -->` | STORY-063-07 `ingest-loop.mjs` check `claude.live.report-kept` |
| J4: silent drop to banner alarm | any session start | an unapproved draft edited 1–7 days ago is never contradiction-checked → next session starts → `doctor --session-start` banner | the banner names the dropped item | STORY-063-07 `ingest-loop.mjs` check `claude.live.silent-drop-alarm` |
| J5: session start to oriented agent | agent starting a session | session start → brief injected → agent answers orientation questions | the 8 brief questions are answered correctly with zero tool calls | STORY-063-12 orientation eval |

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question (Q1, lint enforcement):** Protocol §10.8 says `cleargate wiki lint` blocks Gate 1 and push, but nothing outside `cleargate sprint archive` calls lint (sprint close does not run it; corrected 2026-11-12 by the STORY-063-02 post-flight), and lint exits 1 today with 55 existing findings. Recommended: correct §10.8 to describe what really happens, and file a follow-up CR for per-item enforcement at push. Alternative: wire per-item enforcement in now (adds a story and a push-path change).
- **Human Answer:** Recommended option. §10.8 is corrected to say where lint actually runs (STORY-063-02); a follow-up CR for per-item lint enforcement at push is filed separately.

- **AI Question (Q2, delivery shape):** Recommended: run off-sprint as two milestones with two releases. M1 is 063-01..04, released as 0.29.0, which fixes the pipeline fast. M2 is 063-05..08, released as 0.30.0. Each story goes through Developer then QA agents on `story/` branches in cleargate-cli and must pass the §5 verification plan before its release. Alternative: one release at the end. "Published" is read as the npm release. Pushing the epic to ClearGate isn't possible from this session (pre-member, and the cleargate MCP server failed to connect).
- **Human Answer:** Recommended option. Two milestones, off-sprint, 0.29.0 (STORY-063-01..07 + CR-126) then 0.30.0 (STORY-063-08..13), each gated on the §5 verification plan.

- **AI Question (Q3, CLAUDE.md Active state):** Once the brief ships, should the hand-written "Active state" section of this repo's CLAUDE.md (outside the CLEARGATE block) be replaced by a one-line pointer to `wiki/brief.md`? Recommended: yes. That keeps one source of truth and saves ~1,040 always-loaded tokens. Alternative: keep both, and the brief adds ~1,500 tokens.
- **Human Answer:** Yes. Done in STORY-063-11 as a separate meta-repo commit at the 0.30.0 release.

All questions resolved 2026-11-12. Owner: "agree with recommendations." Answers are integrated into §2 and §4.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
- [x] Testing Strategy answers how we test this, including its user journeys and real-host proof or why it isn't needed.

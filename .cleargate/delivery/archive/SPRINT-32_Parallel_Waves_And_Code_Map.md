---
sprint_id: SPRINT-32
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-32
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: null
status: Completed
start_date: 2026-05-29
end_date: 2026-05-29
completed_at: 2026-05-29
synced_at: null
epics:
  - EPIC-033
  - EPIC-032
stories:
  - STORY-033-02
  - STORY-033-03
  - STORY-033-04
  - STORY-032-01
  - STORY-032-02
  - STORY-032-03
bugs: []
crs: []
area: sprint-execution,orchestration,workflows,wiki,perf,dx
execution_mode: v2
sprint_goal: |
  Ship EPIC-033 v1 (parallel-wave sprint execution on a fixed token-ledger) and
  EPIC-032 (code-map awareness layer), so the FOLLOWING planning sprint can run
  collision-free parallel waves with correct per-story token attribution and
  structure-aware Architect planning. STORY-033-01 (the capability spike) is
  already COMPLETE — its findings are baked into this sprint's scope.
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
context_source: |
  User direction 2026-05-29: "for the next sprint, we'll be taking EPIC-032 Code
  Map Awareness Layer and the one you'll create now [EPIC-033]." Then: "draft the
  sprint plan, once it's drafted, i'll start a new claude code session to continue."
  EPIC-033 designed across two background design workflows + adversarial verification;
  STORY-033-01 spike executed this session (artifact: sprint-runs/_off-sprint/
  STORY-033-01-spike-result.md). Scope corrected by user to PLANNING LAYER only.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-29T07:16:11Z
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: <synthetic>,claude-opus-4-8, claude-opus-4-8
  last_stamp: 2026-05-29T17:53:39Z
  sessions:
    - session: a5ac0087-64e0-48d2-8dc6-4e5d0e4115c9
      model: <synthetic>,claude-opus-4-8
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-29T08:41:57Z
    - session: 7fededeb-34d1-4a55-9c7a-63ed97361a54
      model: claude-opus-4-8
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-29T15:49:02Z
---

# SPRINT-32: Parallel Waves + Code Map

## 0. Stakeholder Brief

- **Sprint Goal:** Ship parallel-wave sprint execution (EPIC-033 v1) on a corrected token-ledger, plus the code-map awareness layer (EPIC-032), so future planning sprints run faster (concurrent stories) with accurate per-story cost and structure-aware planning.
- **Business Outcome:** Planning-layer sprints stop running strictly serially — file-disjoint stories execute concurrently as Dynamic-Workflow waves — and the Architect plans from a token-cheap code skeleton instead of re-grepping source each dispatch. A latent, already-shipping bug (per-story token attribution is silently wrong under any sub-agent fan-out) gets fixed as a hard prerequisite.
- **Risks (top 3):** (1) Dynamic Workflows are unproven in the production loop — mitigated by the completed STORY-033-01 spike + a kill-switch. (2) Both epics still have unanswered §6 questions — must be resolved before Gate 2. (3) SPRINT-30 (and SPRINT-31 if run first) must be Gate-4 closed before this sprint's Gate-3 preflight passes.
- **Metrics:** A ≥2-story file-disjoint wave completes in ≈max(per-story time); after a concurrent 2-story wave the ledger shows exactly one row per (storyId, agent_type) with non-overlapping deltas; `cleargate wiki build` emits per-package code-map pages (≤2k tokens each) including `db_writes`.

## Sprint Goal
Ship EPIC-033 v1 (parallel-wave sprint execution on a fixed token-ledger) and EPIC-032 (code-map awareness layer), enabling the next planning sprint to run collision-free parallel waves with correct per-story attribution and structure-aware Architect planning.

## 1. Consolidated Deliverables

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-033-02` | Parallel-Spawn Ledger Attribution (RUN_ID, barrier-writer) | standard | M1 | y | med |
| `STORY-032-01` | TS skeleton extractor (exports/signatures/import-edges + `db_writes`) | standard | M1 | y | med |
| `STORY-033-03` | Architect Planning Workflow (SDR fan-out) | standard | M2 | y | med |
| `STORY-032-02` | Code-map page schema + git-SHA drift + token budget | standard | M2 | y | low |
| `STORY-033-04` | Wave Execution + Barrier (`launch_wave.mjs`, kill-switch) | standard | M2 | n | high |
| `STORY-032-03` | wiki-build integration + synthesis/index linking + Architect consumption | standard | M2 | n | med |

> **STORY-033-01 (Workflow Capability Spike) is COMPLETE** (status: Completed) — not listed for execution. Its findings (barrier-writer ledger, ClearGate-managed worktrees, orchestrator-level `SKIP_FLASHCARD_GATE`, resume-caches) are inputs to STORY-033-02/03/04.
> **Story files DRAFTED 2026-05-29** — all 6 execution stories (STORY-033-02/03/04, STORY-032-01/02/03) now exist as files and pass `story.ready-for-execution` (9 criteria each); STORY-033-01 is Completed. Drafted via a 6-agent decompose workflow. The Architect may re-shape during SDR (splits/merges are free pre-remote-ID); EPIC-032's 3-way split followed its §2 IN-SCOPE.

## 2. Execution Strategy
_(Architect Sprint Design Review — written 2026-05-29 by the `architect` agent, code-verified. Replaces the pre-SDR placeholder.)_

### 2.1 Phase Plan

**Execution constraint (headline).** SPRINT-32 *builds* the parallel-wave execution capability (EPIC-033) — it therefore CANNOT use it. This sprint runs on the existing **serial five-dispatch loop**. The "Parallel?" / wave annotations below document logical **file-disjointness for the NEXT sprint** (the first sprint that can self-host parallel waves), not concurrent execution here.

Verified serial runtime order:

```
033-02 → 032-01 → 033-03 → 032-02 → 033-04 → 032-03
```

**M1 — Foundations (file-disjoint; logically a parallel wave, executed serially here):**
- **STORY-033-02** — hooks/ledger surfaces: `token-ledger.sh`, `write_dispatch.sh`, `pending-task-sentinel.sh` (all under `.claude/hooks/`).
- **STORY-032-01** — code-map extractor: `cleargate-cli/src/wiki/code-map/**` (new directory).
- Surfaces are fully disjoint → these two would be a single parallel wave in a self-hosting sprint. Executed serially here.

**M2 — Capability + integration (sequenced by real dependencies):**
- **STORY-033-03** — planning roles + collision surface: new `architect-reader.md` / `architect-synth.md`, `collision_surface.sh`, new `story.md` field. Lands the SDR/planning block.
- **STORY-033-04** — wave launcher + contract: `launch_wave.mjs`, `SKILL.md` Phase C rewrite, protocol §23. Depends on 033-02 (ledger) + 033-03 (planning) landing first. This is the **L3 / `high`-exposure capstone — sequence LAST.**
- **STORY-032-02** — code-map page: page schema + git-SHA drift detection + 2k token budget.
- **STORY-032-03** — wiki-build integration. Depends on 032-01 (extractor) + 032-02 (schema).

Dependency chains: `033-02 ⟶ 033-04`, `033-03 ⟶ {033-04, 032-03}`, `032-01 ⟶ 032-03`, `032-02 ⟶ 032-03`. The two epics are otherwise independent; the only cross-epic ordering edge is `033-03 ⟶ 032-03` (shared `architect.md`, see §2.2).

### 2.2 Merge Ordering (Shared-File Surface Analysis)

Exactly ONE multi-writer file exists across all six stories; every other surface is single-writer (verified exhaustively).

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.claude/agents/architect.md` (+ dogfood mirror `cleargate-planning/.claude/agents/architect.md`) | STORY-033-03, STORY-032-03 | 033-03 → 032-03 | Different sections, no overlap. 033-03 adds the SDR/planning-workflow block (live `architect.md:74` region). 032-03 adds the code-map "read structure first" instruction in the "Inspect existing code" Workflow step (live `architect.md:23` / canonical `cleargate-planning/.claude/agents/architect.md:31`). 033-03 must land first so 032-03's read-step layers on top of the established planning block; append-on-top hazard otherwise. Dogfood mirror follows the live edit. |

All other surfaces are single-writer:
- `.claude/skills/sprint-execution/SKILL.md` — sole-written by STORY-033-04 (Phase C rewrite).
- `.claude/hooks/{token-ledger.sh, write_dispatch.sh, pending-task-sentinel.sh}` — STORY-033-02 only.
- `cleargate-cli/src/wiki/code-map/**` — STORY-032-01 only.
- `launch_wave.mjs`, protocol §23 — STORY-033-04 only.
- `collision_surface.sh`, `architect-reader.md`, `architect-synth.md`, `story.md` field — STORY-033-03 only.
- code-map page schema / drift / budget — STORY-032-02 only.

### 2.3 Shared-Surface Warnings

- **`architect.md` cross-epic collision (033-03 ‖ 032-03).** The single genuine multi-writer surface. The two edits hit different sections (planning block vs. code-map read-step) but carry an append-on-top hazard. **Never co-schedule 033-03 and 032-03 in one wave; serialize 033-03 → 032-03** per §2.2.
- **Dogfood mirror obligation (BUG-024 guard).** Every `.claude/**` edit MUST be mirrored to `cleargate-planning/.claude/**` and followed by `npm run prebuild` (rewrites the CLI payload mirror). Applies to: 033-02 (`token-ledger.sh` + other hooks under `.claude/hooks/`), 033-03 + 033-04 + 032-03 (agent/skill edits). Live `/.claude/` re-sync via `cleargate init` is deferred to Gate-4 close.
- **Advisory cleanup (non-blocking, not in scope).** Phantom path `cleargate-cli/src/wiki/synthesis/index.ts` cited in EPIC-032 §0 + STORY-032-01 does NOT exist — the index is built by `buildIndex()` at `cleargate-cli/src/commands/wiki-build.ts:173` via `synthesis/render.ts:13`. STORY-032-03 already cites the correct surfaces. Correct the epic §0 + STORY-032-01 references before Gate 2; no story rework required.

### 2.4 Lane Audit

Empty — no fast-lane stories. All six stories are `lane: standard`.

Every story fails the fast-lane ≤2-file / ≤50-LOC size cap. STORY-033-04 additionally fails on multiple acceptance scenarios and `high` bounce exposure. No fast-lane rows emitted.

### 2.5 ADR-Conflict Flags

No conflicts. Each story's approach was cross-checked against locked ADRs, prior-sprint flashcards, and the protocol.

- **EPIC-031 `--test-concurrency=1` (within-process FK safety) — COMPOSES.** EPIC-033 adds only the cross-worktree collision axis. If SPRINT-31 ships first, EPIC-033 reads its `*.db.node.test.ts` tagging; otherwise path-based fallback applies. No hard dependency.
- **node:test-only runner rule — conforms.** No vitest introduced.
- **Zero-new-dependency rule — conforms.** EPIC-032 uses raw `ts.createProgram` (no `ts-morph` or other new package).
- **git-SHA drift detection (locked 2026-04-19) — conforms.** EPIC-032 code-map page schema uses git-SHA, not content hash.
- **EPIC-027 codebase/PM-tool boundary — conforms.** Code-map is a repo-local wiki page; no PM-SDK import.
- **Protocol numbering — conforms.** Max numbered section = §22 (`cleargate-protocol.md:786`). EPIC-033 / STORY-033-04 add §23 (Parallel-Wave Execution Contract) at the verified next-free number; inherits §22 (Sprint Execution Autonomy). No stale-§ rewrite needed.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Dynamic Workflows unproven in the live loop | STORY-033-01 spike already de-risked the runtime; STORY-033-04 ships a `CLEARGATE_PARALLEL_WAVES=off` kill-switch reverting to today's serial loop. |
| Ledger barrier-writer mis-attributes under genuine concurrency | STORY-033-02 DoD requires validation on a genuinely **concurrent** 2-agent dispatch (one row per (storyId, agent_type), non-overlapping deltas). |
| Both epics have unanswered §6 questions | Pre-Gate-2 checklist (§4) blocks kickoff until answered; this is the first thing the fresh session must do. |
| SPRINT-30 (and SPRINT-31 if run first) not closed → Gate-3 preflight fails | Close the prior sprint before SPRINT-32 kickoff (preflight check 1). |
| `architect.md` cross-epic collision | §2.2 merge order (033-03 → 032-03); never co-schedule the two in one wave. |
| Canonical/live dogfood drift (BUG-024 pattern) | Mirror every `.claude/**` edit + `npm run prebuild`; Gate-4 `cleargate init` re-sync reminder. |
| EPIC-032 raw-SQL `db_writes` heuristic misses dynamic table names | EPIC-033's fail-safe-serialize-on-unknown keeps wave planning correct (conservative) even with an incomplete map. |
| STORY-033-04 is L3/high-exposure (capstone) | Sequence last; it depends on 033-02 + 033-03 landing clean; consider Opus dispatch. |

## Metrics & Metadata
- **Expected Impact:** Future planning sprints run file-disjoint stories concurrently (wall-time ≈ max not sum); per-story token cost becomes accurate; Architect dispatch input tokens drop ≥30% on ≥3-file plans (EPIC-032 metric).
- **Priority Alignment:** EPIC-033 v1 first-class (the capability + the ledger fix it forced out); EPIC-032 composes (it feeds EPIC-033's DB-collision axis precisely in a later iteration). v2 stories (STORY-033-05 adversarial QA) carried to a later sprint.

---

## 3. Decomposition Status (Gate-2 readiness)

- [x] **EPIC-033 §6 answered** (2026-05-29 — kill-switch=frontmatter field; wave-launch=FULLY AUTONOMOUS after Gate 2 [user override], escalations-only halt; tiny-sprint floor N≤2; header dialect=heuristic+follow-up CR; spike-branch already RESOLVED).
- [x] **EPIC-032 §6 answered** (2026-05-29 — ALL packages via generic tsconfig/pgTable DISCOVERY [no hardcoded layout, general-purpose for any consuming repo]; `.ts`-only [skip `.svelte`]; hard 2k cap; raw Compiler API [no ts-morph]; opt-in `--code-map` this sprint→default-on at close; append-as-input dispatch; target-repo off-by-default; Module Graph included; raw-SQL `db_writes` heuristic accepted + fail-safe-serialize).
- [x] **STORY-033-02/03/04 drafted** as files (2026-05-29 — all 3 gate-green at `story.ready-for-execution`).
- [x] **EPIC-032 decomposed** into STORY-032-01/02/03 and drafted (2026-05-29 — all 3 gate-green).
- [x] All work items 🟢 (`cached_gate_result.pass: true`) or terminal (2 epics 🟢, 6 stories 🟢, STORY-033-01 Completed/terminal). SPRINT-30 close still pending below.
- [x] **SDR §2 written by Architect** (2026-05-29 — code-verified §§2.1–2.5: serial-execution order, single multi-writer `architect.md` [033-03→032-03], all-`standard` lane audit, zero ADR conflicts, protocol §23 confirmed next-free).
- [ ] **SPRINT-30 Gate-4 closed** (Gate-3 preflight check 1). Confirm SPRINT-31 sequencing (run-first or defer).

## 4. Gate Checklist
- [ ] **Gate 1** (sprint approved by human) — pending Brief approval.
- [ ] **Gate 2** (Sprint Ready) — pending §6 answers + decomposition + SDR + per-item gates.
- [ ] **Gate 3** (preflight) — pending SPRINT-30 close + clean main + no leftover worktrees.
- [ ] **Gate 4** (close) — after all stories merge + walkthrough.

## 5. Execution Log
_(populated during sprint execution)_

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** Draft STORY-033-02 first (it's foundational and unblocks 033-04; its scope is fully fixed by the spike → barrier-writer). In parallel, draft STORY-032-01 (the AST extractor + `db_writes`) — disjoint surface. Read `.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md` before touching any EPIC-033 story.
- **Relevant Context:** EPIC-033 §0/§4 (segment verdict schema, RUN_ID contract, the two spike refinements); EPIC-032 §0/§4 (wiki pipeline reuse, `db_writes` delta); the spike artifact; `.claude/hooks/token-ledger.sh` (barrier no-op + RUN_ID re-key), `.cleargate/scripts/file_surface_diff.sh` (the parser `collision_surface.sh` forks + fixes).
- **Constraints:** PLANNING LAYER ONLY — no `mcp/` or `admin/` source edits. This sprint executes SERIALLY (it builds the parallel capability; it can't use it). Mirror every `.claude/**` edit to `cleargate-planning/.claude/**` + `npm run prebuild`; re-sync live `/.claude/` at Gate-4. Never relax EPIC-031's `--test-concurrency=1`.

---
epic_id: EPIC-033
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
ambiguity: 🟡 Medium
context_source: |
  user-direct-epic-waiver — conversation 2026-05-29, "Dynamic Workflows" efficiency
  analysis. User asked to plan the epic directly ("make sure we have those 2 epics
  written now"). Designed across two background design workflows + adversarial
  verification this session. Scope corrected by user to PLANNING LAYER only
  (cleargate-cli/ + .claude/ + .cleargate/); mcp/ and admin/ are separate deploy
  products and explicitly out of scope.
  Prior work (cleargate-wiki-query): [[BUG-029]] (parallel dispatch-marker collision,
  Completed SPRINT-26 — adjacent, extend), [[STORY-071-01]]/[[CR-071]] (Sprint
  Execution Autonomy contract, protocol §22 — inherited), [[EPIC-031]] (test
  wall-time split — orthogonal, composes at the DB axis), [[EPIC-032]] (code-map —
  soft consumer for precision). None duplicate; all adjacent.
proposal_gate_waiver: true
proposal_gate_waiver_reason: |
  Direct user ask with sharp intent across this conversation ("make sure we have
  those 2 epics written now. plan and execute the spike"), with inline references to
  BUG-029, the token-ledger hooks, the worktree model, and EPIC-031/032. Recorded per
  memory feedback_proposal_gate_waiver.md.
area: sprint-execution,orchestration,workflows,perf,dx
owner: Sandro
target_date: TBD
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-29T07:50:00Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-033
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-29T07:50:00Z
  sessions: []
---

# EPIC-033: Parallel-Wave Sprint Execution via Dynamic Workflows

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Replace the orchestrator's per-dispatch babysitting (write marker → spawn agent → read prose → decide → spawn next) with Architect-planned, collision-free PARALLEL WAVES executed as Claude Code Dynamic Workflows: the Architect schedules stories into waves on a file-surface axis (+ a coarse DB axis); the Orchestrator launches each wave as one fire-and-forget Workflow of worktree-isolated per-story segments (QA-Red → TPV → Developer → QA-Verify → Architect post-flight) that return a schema-typed verdict; the Orchestrator consolidates at a barrier and advances. PLANNING LAYER ONLY.</objective>
  <architecture_rules>
    <rule>SPIKE GATES EVERYTHING. No execution story (STORY-033-02..04) is implemented until STORY-033-01 answers the Workflow↔hook contract. (Partial result already observed this session — see §1.)</rule>
    <rule>PLANNING-LAYER SCOPE. Every file this epic touches lives under cleargate-cli/, .claude/, .cleargate/, or the cleargate-planning/ canonical mirror. NO changes to mcp/ or admin/ source — those are separate deploy products with their own lifecycle.</rule>
    <rule>Gates stay in the Orchestrator. The workflow owns ONLY the autonomous between-gate per-story segment, terminating BEFORE DevOps merge. Every human-halt (Gate-3 preflight, SDR confirm, flashcard processing, merge, Walkthrough, Gate-4) and cross-wave decision stays in the main session.</rule>
    <rule>Workflows cannot halt for a human mid-run. A segment NEVER blocks; it RETURNS a typed verdict GREEN | ESCALATED | BLOCKED. resumeFromRunId reconciles halts via complete-then-resume.</rule>
    <rule>RUN_ID attribution invariant. Every dispatch marker, pending-task sentinel, and .session-totals.json entry under a parallel wave is keyed by a stable per-thunk RUN_ID — never by session_id or turn_index alone.</rule>
    <rule>Fail-safe-serialize on unknown: a story with missing/unknown collision metadata is serialized, never parallelized.</rule>
    <rule>Kill-switch: CLEARGATE_PARALLEL_WAVES=off reverts the Orchestrator to today's serial five-dispatch loop with no behavior change.</rule>
    <rule>Inherits protocol §22 Sprint Execution Autonomy. Adds §23 Parallel-Wave Execution Contract.</rule>
    <rule>Canonical/live dogfood split: all .claude/** edits land in cleargate-planning/.claude/**, run npm run prebuild, and close with a "cleargate init re-sync" reminder (BUG-024 guard). The mirror re-sync is a BARRIER/close-time step, never a per-story blocker.</rule>
  </architecture_rules>
  <target_files>
    <file path=".cleargate/scripts/launch_wave.mjs" action="create" />
    <file path=".cleargate/scripts/collision_surface.sh" action="create" />
    <file path=".claude/agents/architect-reader.md" action="create" />
    <file path=".claude/agents/architect-synth.md" action="create" />
    <file path=".claude/hooks/token-ledger.sh" action="modify" />
    <file path=".claude/hooks/pending-task-sentinel.sh" action="modify" />
    <file path=".cleargate/scripts/write_dispatch.sh" action="modify" />
    <file path=".claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path=".claude/agents/architect.md" action="modify" />
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path=".cleargate/knowledge/cleargate-enforcement.md" action="modify" />
    <file path="cleargate-planning/.claude/**" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

The five-dispatch sprint loop runs strictly serially. The Orchestrator babysits every step — write a dispatch marker, spawn an agent, read its prose result, decide, spawn the next — burning main-context tokens on glue and wall-time on stories that have no reason to wait for each other. ClearGate already *plans* for concurrency (each story's `parallel_eligible`; the Architect's SDR §2.1 "parallel waves vs sequential chains"; per-story worktrees) but the Orchestrator never executes it concurrently — `parallel_eligible` is documentation-only ([[BUG-029]]).

Claude Code's **Dynamic Workflows** make the planned concurrency executable: `parallel()` of worktree-isolated per-story pipelines with schema-typed handoffs. **Planning-layer sprints are the well-suited case** — all work lives in the outer git repo (worktrees isolate cleanly), only **1 of 204** `cleargate-cli` test files touches the DB, and there is zero `mcp/`-tree contention. So the headline win — real cross-story wall-time reduction — applies directly to the sprints this repo actually runs (EPIC-028, -031, -032, -033…).

**A latent bug this surfaced (must fix regardless):** per-story token attribution is *already broken* under any sub-agent fan-out. Live evidence captured this session — workflow-spawned agents fired `SubagentStop`, but with the auto dispatch-marker hook silent (`pre-tool-use-task.log` empty), every row mis-attributed to the prior ledger row (`STORY-071-01 | architect`) with `delta=0/0` (stale-baseline race). A real parallel wave today would tag every story's cost onto one wrong story. STORY-033-02 fixes this whether or not the rest of the epic ships.

**Spike result (STORY-033-01 — COMPLETED 2026-05-29; full artifact `.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md`):** Verdict **GO**. The runtime supports the design. Settled: (1) `SubagentStop` fires for workflow agents but reports the **orchestrator's** transcript/session_id even under `isolation:'worktree'`, and `PreToolUse:Task` never fires → **per-story attribution must be written at the barrier from `verdict.tokens`** (STORY-033-02). (2) Workflow `isolation:'worktree'` checks out **tracked files only** at `.claude/worktrees/wf_*` off the wrong base → segments must manage **ClearGate's own `.worktrees/STORY-X`** via bash (STORY-033-04). (3) Per-thunk env is not settable → the **orchestrator sets `SKIP_FLASHCARD_GATE=1`** before `launch_wave`. (4) `resumeFromRunId` caches completed agents (0 tokens / 16ms on replay) → complete-then-resume escalation is sound. (5) Planning sprints do have ≥2-way parallelizable waves (SPRINT-31 M1 is one).

**Success Metrics (North Star):**
- A milestone of N file-disjoint planning-layer stories completes in ≈ max(per-story time), not Σ(per-story time) — measured wall-time on a ≥2-story file-disjoint wave.
- Deterministic per-story token attribution under concurrency: after a 2-thunk wave, the ledger has exactly one row per (storyId, agent_type) with non-overlapping deltas.
- `CLEARGATE_PARALLEL_WAVES=off` reverts to the serial loop with zero behavior change (kill-switch verified).
- Main-session orchestration token burn per story drops (schema-typed verdicts replace prose-parsing glue).

## 2. Scope Boundaries

**✅ IN-SCOPE — v1 (spike-gated)**
- [ ] **STORY-033-01 — Workflow Capability Spike (BLOCKING).** Probe the Workflow↔hook contract; record a yes/no checklist that selects the ledger-writer and resume strategy. No other story starts until it lands.
- [ ] **STORY-033-02 — Parallel-Spawn Ledger Attribution.** *(Spike-resolved 2026-05-29: BARRIER-WRITER — see §1 Spike Result.)* The barrier writes one ledger row per segment from the segment's returned `verdict.tokens`, keyed by RUN_ID; re-key `.session-totals.json` by RUN_ID so concurrent barrier writes don't collide; make `token-ledger.sh` a no-op when a RUN_ID-keyed barrier row already exists for that segment. The `SubagentStop`/auto-marker path is abandoned under workflows (the spike proved both fail) — drop the `pre-tool-use-task.sh` resurrection. Validate on a genuinely **concurrent** 2-agent dispatch.
- [ ] **STORY-033-03 — Architect Planning Workflow.** Orchestrator-launched SDR fan-out (`architect-reader` ‖ → `architect-synth`) replacing the single §A.4 dispatch; new `collision_surface.sh` (forks the `file_surface_diff.sh` parser and FIXES its single-column bug); optional `db_write_set` story-frontmatter field; emits the §2.1–2.5 block + a Wave Assignment table. Scheduling-only, zero infra.
- [ ] **STORY-033-04 — Wave Execution + Barrier.** `launch_wave.mjs`; the schema-typed segment verdict (discriminated union); SKILL.md Phase C rewrite (wave launch, flashcard gate → between-wave, serial barrier merge, resumeFromRunId escalation, idempotent segments); the `CLEARGATE_PARALLEL_WAVES=off` kill-switch; protocol §23 + the §22 in-segment true-blocker re-map. **Spike refinements (2026-05-29):** segments must create ClearGate's own `.worktrees/STORY-X` via `git worktree add … sprint/S-NN` in bash — do NOT use the Workflow tool's `isolation:'worktree'` (it checks out tracked-files-only at `.claude/worktrees/wf_*` off the wrong base, stripping gitignored `/.claude/` + `/mcp/`). The orchestrator sets `SKIP_FLASHCARD_GATE=1` in its own env before `launch_wave` and restores at the barrier (per-thunk env is not settable via the Workflow API — spike Q5). This relocates only the WRITE-gate; flashcard *reading* is unaffected — `.cleargate/FLASHCARD.md` is tracked and present in worktrees, and the `Skill` tool resolves via the session registry (both confirmed by follow-up probe `wf_b45f8315-d0f`), so segments still learn from flashcards normally.

**✅ IN-SCOPE — v2 (carved out, fast-follow)**
- [ ] **STORY-033-05 — Adversarial QA-Verify Panel + handoff hardening.** 2–3 skeptics refute "all acceptance scenarios covered" before a story goes GREEN; additive in-segment dispatches feeding the existing QA verdict.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Any change to `mcp/` or `admin/` source. They are separate deploy products (Coolify / deploy-mirror) with their own lifecycle. EPIC-033 is planning-layer only.
- Relaxing EPIC-031's `--test-concurrency=1` (within-process FK safety — stays unchanged).
- Per-worktree ephemeral Postgres as a v1 requirement. Planning sprints have ~1 DB-touching `cleargate-cli` story at most; it serializes into a trailing lane. Ephemeral DB is only worth it if a planning sprint is ever DB-heavy — defer until observed.
- Mid-run human input ingestion. Workflows cannot accept new input mid-run; a CR queues and triages at the barrier.
- A "merge-adjacency" third collision axis. v1 accepts serial barrier merges as the correctness cost.
- Sprint Walkthrough (§D) and Gate-4 close (§E) automation — stay human-interactive, untouched.
- Nested `parallel()` inside a story segment (v1 keeps each segment a linear pipeline).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Runtime unknown | Whether `workflow()`'s `agent()` emits the `Task` tool event (so `PreToolUse:Task` + `SubagentStop` fire) is unverifiable from the codebase — there is no Workflow wiring in-repo. STORY-033-01 settles it. Partial live answer: `SubagentStop` fires; the auto-marker does NOT; attribution falls to the broken fallback. |
| Ledger numerator | `token-ledger.sh:74` computes usage from the `SubagentStop` payload's `transcript_path`. If that is the orchestrator's transcript, re-keying the baseline by RUN_ID does NOT fix the numerator — each parallel agent is attributed the whole orchestrator cumulative. The fix forks on the spike's transcript-isolation answer. |
| Human halts | Workflows are fire-and-forget; they cannot block for a human. Segments return GREEN/ESCALATED/BLOCKED; the Orchestrator adjudicates at the barrier; `resumeFromRunId` is complete-then-resume, never a mid-run pause. |
| Flashcard gate | `pending-task-sentinel.sh` is a `PreToolUse:Task` hook — inside a workflow it would block the workflow's OWN agent spawns. Segments must run with `SKIP_FLASHCARD_GATE=1`; the gate moves from between-story to between-wave. |
| File-surface contract | The pre-commit surface gate is per-worktree (each worktree has its own `.git` index), so parallel in-segment commits do not race. Serial barrier merge handles the shared sprint-branch axis. |
| Dogfood drift | `.claude/**` edits must be mirrored to `cleargate-planning/.claude/**` + `npm run prebuild`; live re-sync is a barrier/close-time step (BUG-024 guard). |
| Scope | PLANNING LAYER ONLY. No `mcp/`/`admin/` source touches. |
| Kill-switch | `CLEARGATE_PARALLEL_WAVES=off` must revert to the serial loop with zero behavior change. |

## Existing Surfaces

> L1 reuse audit. The epic extends existing orchestration surfaces; only `launch_wave.mjs`, the two new agent roles, and `collision_surface.sh` are net-new.

- **Surface:** `.claude/hooks/token-ledger.sh:74,122-184,417-494` — SubagentStop attribution + `.session-totals.json` delta model. Re-keyed by RUN_ID; numerator forked on spike result.
- **Surface:** `.cleargate/scripts/write_dispatch.sh:110-116` — dispatch-marker writer (BUG-029 uniquified the filename). Extended to embed RUN_ID.
- **Surface:** `.claude/hooks/pending-task-sentinel.sh:53,186` — flashcard PreToolUse gate; honors `SKIP_FLASHCARD_GATE=1` (line 53) but still keys the sentinel by `TURN_INDEX` alone (line 186 — BUG-029 item-2 unapplied).
- **Surface:** `.claude/hooks/pre-tool-use-task.sh` — auto dispatch-marker writer; currently NOT firing (log empty). STORY-033-02 resurrects it.
- **Surface:** `.claude/skills/sprint-execution/SKILL.md §A.4, §B, §C` — the dispatch loop the workflow wraps; flashcard gate (§C.9), DevOps merge (§C.7).
- **Surface:** `.claude/agents/architect.md:74-96` — Sprint Design Review §2.1–2.5; the planning workflow's `architect-synth` references these by pointer.
- **Surface:** `.cleargate/scripts/file_surface_diff.sh:158-189` — §3.1 file-surface parser. `collision_surface.sh` forks it and fixes the single-column (`cols[2]`) bug — current stories put the path in column 1.
- **Surface:** `.cleargate/delivery/archive/BUG-029_Parallel_Dispatches_Serialize_Silently.md` — root cause + the 3-item fix scope; item-2 (sentinel uniquify) never applied.
- **Coverage of this epic's scope:** ≈70% extension of existing orchestration/hook surfaces; ≈30% net-new (`launch_wave.mjs`, `architect-reader.md`, `architect-synth.md`, `collision_surface.sh`).

## Why not simpler?

- **Smallest existing surface that could carry this epic:** the existing serial §C per-story loop + the Architect SDR §2.1. They already model waves and worktrees — but only as *documentation*; nothing executes the concurrency ([[BUG-029]]).
- **Why isn't extension / parameterization / config sufficient?** Executing planned waves requires a fan-out primitive the Orchestrator does not have today — it spawns agents one at a time via `Agent()` and blocks on each. Dynamic Workflows are that primitive, but wiring them in safely needs (a) a new launcher to drive `parallel()`/barrier, (b) a re-keyed ledger because the current attribution silently breaks under any concurrent spawn (live-confirmed), and (c) the flashcard gate relocated off the per-Task hook. None of these is a config flag — they are structural. A pure "just run agents in parallel" attempt would mis-attribute every story's cost and deadlock on the flashcard gate. The spike-first, kill-switch-protected, fail-safe-serialize structure is the *minimum* safe way to add the primitive to the most load-bearing part of ClearGate.

## 4. Technical Grounding (The "Shadow Spec")

**The two-axis wave-compatibility predicate** (Architect `architect-synth`; two stories A,B may share a wave IFF all hold):
1. `A.parallel_eligible == "y" AND B.parallel_eligible == "y"`
2. `A.file_surface ∩ B.file_surface == ∅` (file-surface axis — from §3.1, the existing SDR §2.2 input)
3. `A.file_creates ∩ B.file_creates == ∅` (same-path-creation hard collision)
4. `A.db_write_set ∩ B.db_write_set == ∅` (DB axis; v1 coarse: any DB-touching story surfaces for human review / trailing serial lane)
5. `A ∉ B.dep_predecessors AND B ∉ A.dep_predecessors` (dependency guard)

**The schema-typed segment verdict** (discriminated union returned by each story segment):
```
{ verdict: "GREEN" | "ESCALATED" | "BLOCKED",
  storyId, runId, devSha, qaSha, archSha?,
  flashcards_flagged[], counters: { qa_bounces, arch_bounces, breaker_hits },
  tokens: { input, output, cache_creation, cache_read, model },   // carried from the outset → barrier can write the ledger if SubagentStop is dead under workflows
  blocker?: { type: one-of-5-§22-true-blockers, message } }       // required iff verdict != GREEN
```

**RUN_ID attribution contract:** `launch_wave.mjs` mints a stable per-thunk RUN_ID; it keys the dispatch marker `{work_item_id, agent_type, run_id, session_id}`, the pending-task sentinel, and the `.session-totals.json` entry. `token-ledger.sh` reads `work_item_id + run_id` from the marker instead of inferring from the orchestrator transcript.

**Affected Files:** see §0 `<target_files>`. All planning-layer. Canonical `.claude/**` + `.cleargate/scripts/**` edits mirror to `cleargate-planning/` per the dogfood split.

**Data Changes:**
- New optional story frontmatter field `db_write_set: string[]` (advisory in v1).
- `.session-totals.json` re-keyed by RUN_ID (migration: stale session_id keys age out).
- New `.cleargate/sprint-runs/<id>/plans/waves.json` artifact (the wave plan).
- New protocol §23 "Parallel-Wave Execution Contract".

## 5. Acceptance Criteria

```gherkin
Feature: Parallel-Wave Sprint Execution via Dynamic Workflows

  Scenario: Architect plans collision-free waves
    Given a milestone with three file-surface-disjoint planning-layer stories and one DB-touching story
    When the Orchestrator launches the Architect Planning Workflow at SDR
    Then waves.json emits wave1 = {3 stories, parallel} and wave2 = {1 DB story, serial}
    And no two stories in wave1 share any path in their §3.1 File rows
    And the §2.1-2.5 block is returned and the Orchestrator halts for human confirm (unchanged gate)

  Scenario: Schema-typed segment verdict
    Given the Orchestrator launches wave1 via launch_wave.mjs
    When the parallel() barrier returns
    Then every thunk verdict carries verdict ∈ {GREEN,ESCALATED,BLOCKED}, a storyId, a unique runId, and a tokens object
    And a schema validator accepts the verdict array

  Scenario: Deterministic attribution under concurrency
    Given a genuinely concurrent 2-story wave completes
    When token attribution is read
    Then .session-totals.json contains ≥2 distinct RUN_ID keys
    And token-ledger.jsonl has exactly one row per (storyId, agent_type)
    And no story's delta is computed against another story's baseline

  Scenario: Flashcard gate moves to between-wave
    Given a story segment flags a flashcard
    When the wave barrier is reached
    Then the segment ran with SKIP_FLASHCARD_GATE=1 (no mid-segment block)
    And the card appears in the segment's flashcards_flagged verdict
    And the Orchestrator writes a .processed-<hash> marker BEFORE launching the next wave

  Scenario: Escalation via complete-then-resume
    Given a wave returns 3 GREEN + 1 ESCALATED
    When the human chooses "re-approach" for the escalated story
    Then resumeFromRunId re-enters the same run and re-dispatches ONLY the escalated story's segment
    And the 3 GREEN stories produce zero new ledger rows (idempotent short-circuit)

  Scenario: Serial barrier merge
    Given all stories in a wave return GREEN
    When the Orchestrator runs the barrier merge loop
    Then DevOps merges each story to sprint/S-NN one at a time
    And no two worktrees merge concurrently

  Scenario: In-segment true-blocker returns, never asks
    Given a Developer in a workflow segment encounters a §22 destructive/secret condition
    When it must escalate
    Then it writes a blockers report and returns BLOCKED with blocker.type ∈ {destructive, secret}
    And it issues NO AskUserQuestion (the synchronous-Ask form is forbidden in-segment)

  Scenario: Kill-switch reverts to serial loop
    Given CLEARGATE_PARALLEL_WAVES=off
    When the Orchestrator runs a sprint
    Then no launch_wave.mjs invocation appears
    And every story executes via the existing serial §C per-story loop with no behavior change

  Scenario: Malformed segment verdict raises a validation Error
    Given a story segment returns a verdict missing the required tokens object
    When the schema validator runs at the barrier
    Then it raises a validation Error naming the offending storyId
    And the Orchestrator marks that segment ESCALATED and writes no ledger row for it
    And the other segments' GREEN verdicts are consolidated normally
```

## 5.5 Story Breakdown (phased)

| Story | Title | Lane | Depends on | Phase |
|---|---|---|---|---|
| STORY-033-01 | Workflow Capability Spike (BLOCKING) | fast | none | v1 / M1 |
| STORY-033-02 | Parallel-Spawn Ledger Attribution (RUN_ID) | standard | 033-01 | v1 / M2 |
| STORY-033-03 | Architect Planning Workflow (SDR fan-out) | standard | 033-01 | v1 / M2 |
| STORY-033-04 | Wave Execution + Barrier | standard | 033-02, 033-03 | v1 / M3 |
| STORY-033-05 | Adversarial QA-Verify Panel + handoff hardening | standard | 033-04 | v2 |

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** Kill-switch surface — env var (`CLEARGATE_PARALLEL_WAVES=off`) or a sprint-frontmatter field (`execution_mode: v2-parallel` vs `v2-serial`)?
  - **Recommended:** sprint-frontmatter field (per-sprint, auditable, visible in the plan) with the env var as a within-session override.
  - **Human Answer (2026-05-29):** Accept — sprint-frontmatter field (`execution_mode: v2-parallel` | `v2-serial`), with `CLEARGATE_PARALLEL_WAVES=off` as a within-session override.

- **AI Question:** Spike outcome branch — if STORY-033-01 shows `workflow()` does NOT emit the `Task` event (hooks dead under workflows), proceed with barrier-written ledger rows from `verdict.tokens`, or pause execution stories and ship only the planning workflow (STORY-033-03) until the runtime exposes a workflow-dispatch hook?
  - **Recommended:** proceed with barrier-written ledger rows (the verdict already carries `tokens`, so the fallback is cheap).
  - **RESOLVED by STORY-033-01 spike (2026-05-29):** confirmed — `SubagentStop` reports the orchestrator transcript and `PreToolUse:Task` never fires under workflows, so attribution IS the barrier-writer. No longer an open question; STORY-033-02 is scoped to the barrier-writer accordingly.

- **AI Question:** Wave-launch authority for the first parallel sprints — auto-launch each wave after SDR confirm, or surface the wave plan and wait for a per-wave "go" while the mechanic is proven?
  - **Recommended:** surface-and-confirm the first wave of the first parallel sprint, then auto-launch once trust is established (kill-switch remains).
  - **Human Answer (2026-05-29):** OVERRIDE → FULLY AUTONOMOUS after Gate 2. Once the human approves the sprint at the SDR/Gate-2 confirm, every wave auto-launches with no per-wave "go"; only `ESCALATED`/`BLOCKED` segment verdicts halt the loop. The `execution_mode` frontmatter field / `CLEARGATE_PARALLEL_WAVES=off` remains the sole manual override. Per Sprint Execution Autonomy contract (protocol §22).

- **AI Question:** Tiny-sprint fan-out floor — for N ≤ 2 stories, fall back to the single sequential `architect` SDR dispatch (the reader fan-out may cost more than it saves), or always run the planning workflow under v2?
  - **Recommended:** threshold fallback at N ≤ 2.
  - **Human Answer (2026-05-29):** Accept — for N ≤ 2 stories fall back to the single sequential `architect` SDR dispatch.

- **AI Question:** §3.1 header dialect — two coexist (`| Item | Value |` template vs `| Path | Operation |` in current stories). Standardize to one (a small template + back-tag CR) to kill the parser ambiguity at source, or accept the all-columns heuristic in `collision_surface.sh`?
  - **Recommended:** accept the heuristic in STORY-033-03; file a follow-up CR for standardization.
  - **Human Answer (2026-05-29):** Accept — all-columns heuristic in `collision_surface.sh`; file a follow-up CR to standardize the §3.1 header dialect at source.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** (§6 resolved 2026-05-29; remaining open items are kickoff-time: §4 path re-verification + 0-TBD sweep)

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [ ] Proposal document has `approved: true`.
  - *Substitution surfaced in Brief:* no proposal exists; epic was directly authorized by the user 2026-05-29 per `feedback_proposal_gate_waiver.md`. `proposal_gate_waiver: true` recorded in frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [ ] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop answered — all 4 open questions integrated 2026-05-29 (Q/A retained for audit; spike branch already resolved).
- [ ] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites verified source-tree paths (token-ledger.sh, write_dispatch.sh, pending-task-sentinel.sh, SKILL.md, architect.md, file_surface_diff.sh — all confirmed on disk).
- [x] Why not simpler? — both sub-bullets answered.
- [x] STORY-033-01 spike result recorded (selects the ledger-writer + resume strategy) before STORY-033-02..04 leave Draft. **DONE 2026-05-29** — barrier-writer selected; artifact at `.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md`.

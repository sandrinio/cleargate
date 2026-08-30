---
epic_id: EPIC-055
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-08-26T00:00:00Z
ambiguity: 🟢 Low
context_source: verified codebase grounding (launch_wave.mjs:264-303; SKILL.md:236-252,445; architect-synth.md five-clause predicate; SPRINT-38 waves.json milestone_barrier) + design conversation 2026-08-26
owner: sandrinio
target_date: 2026-10-07
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T21:01:24Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-25T21:01:24Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# EPIC-055: Parallel wave scheduling — waves become a DAG, not a chain

> **Not scheduled for SPRINT-39.** Gate-green, but sequenced behind [[CR-106]] and a mandatory SPIKE charter (decided 2026-08-26). The charter is blocked on `STORY-054-01` shipping `.cleargate/templates/spike.md`. See §6.

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Replace the serial wave loop with a dependency-DAG scheduler that admits any wave whose predecessors have merged, bounded by a global segment budget, with a single-consumer merge queue.</objective>
  <architecture_rules>
    <rule>Must use the existing five-clause wave-compatibility predicate (architect-synth.md) for intra-wave packing — do NOT redesign collision detection</rule>
    <rule>Must preserve the serial merge invariant: sprint/S-NN is a single-writer axis, one story merged at a time (SKILL.md:445)</rule>
    <rule>Must preserve the per-story segment body (SKILL.md C.1-C.9) unchanged — this is a scheduler above launchWave, not a rewrite of it</rule>
    <rule>No changes to the verdict schema, validateVerdicts, or mintRunId</rule>
    <rule>Blocked on CR-106 — do not start before the execution-state event log has landed</rule>
  </architecture_rules>
  <target_files>
    <file path=".cleargate/scripts/launch_wave.mjs" action="modify" />
    <file path=".cleargate/scripts/wave-scheduler.mjs" action="create" />
    <file path=".claude/agents/architect-synth.md" action="modify" />
    <file path=".claude/skills/sprint-execution/SKILL.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

Sprint plans already declare cross-milestone concurrency that the execution machine silently discards. SPRINT-39 §2.1 states *"M1 — Spike type (runs concurrently with M0)"* and *"M3 — CLAUDE.md write integrity (fully parallel with M0–M2)"*. `architect-synth` flattens that into a linear `wave1..waveN` list and the orchestrator runs it strictly serially — `launchWave()` (`launch_wave.mjs:264`) accepts a single wave and the loop at `SKILL.md:236-252` awaits a full barrier before the next. `waves.json` even carries a `milestone_barrier` field, but grep confirms it is **prose only**: no code reads it. Declared parallelism is planning fiction.

**Success Metrics (North Star):**

- Barrier cycles for a sprint with a detachable track drop measurably. Modelled on SPRINT-39's own dependency graph: **9 waves → 6 rounds** (−33%). This is the honest figure; the M0→M1.w2→M1.w3 chain on `readiness-gates.md` is a genuine data dependency no scheduler removes.
- `milestone_barrier` stops being dead vocabulary — either enforced or deleted. (Same defect class [[SPRINT-38]]/EPIC-051 closed for `execution_mode`.)
- Zero regression in merge serialization: concurrent merges to `sprint/S-NN` remain impossible.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `waves.json` v2: each wave gains `depends_on: [<wave-id>]`, derived by `architect-synth` from `dep_predecessors` ∪ the §2.2 Merge Ordering table it already produces.
- [ ] A ready-set scheduler admitting waves whose `depends_on` have all reached **merged**, under a global concurrent-segment budget.
- [ ] Refcounted `SKIP_FLASHCARD_GATE` ownership hoisted from `launchWave` to the scheduler.
- [ ] A global mutex around `git worktree add` (concurrent adds race the repo index).
- [ ] Single-consumer merge queue; a wave flips to **merged** only when all its stories have merged.
- [ ] Per-subtree halt: a BLOCKED verdict stops that wave's dependents; in-flight siblings run to their own barrier and merge.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Full per-story DAG scheduling (dropping waves entirely). Waves are what makes a run legible; keep them.
- Any change to the five-clause compatibility predicate or to `collision_surface.sh`.
- Any change to the per-story segment body, verdict schema, or DevOps merge mechanics.
- Concurrent merges. The single-writer axis is preserved, not optimized.
- A dedicated sprint worktree (`.worktrees/_sprint`). Related and discussed, but an orchestrator-ergonomics change, not a parallelism prerequisite — file separately.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Concurrency | Global in-flight segment count must not exceed the Workflow tool's cap of `min(16, cpus−2)`; exceeding it queues rather than parallelizes, paying scheduler complexity for no wall-clock gain. |
| Correctness | `sprint/S-NN` stays single-writer. Worktrees are cut from it at **admission** time, so a late-admitted wave sees earlier merges and an early one does not — safe **only** because the disjointness proof holds. The predicate is load-bearing, not advisory. |
| Ordering | Downstream waves unblock on **merged**, never on GREEN. A GREEN-but-unmerged predecessor must not release its dependents. |
| Security | None applicable. |

## Existing Surfaces

- **Surface:** `.cleargate/scripts/launch_wave.mjs:264-303` — `launchWave()`; drives `parallel()` over one wave, snapshots/sets/restores `SKIP_FLASHCARD_GATE` in `try/finally`. Reused as the per-wave executor; its env handling moves up to the scheduler.
- **Surface:** `.cleargate/scripts/launch_wave.mjs:205` — `validateVerdicts()`. Unchanged.
- **Surface:** `.claude/agents/architect-synth.md` — five-clause predicate + wave packing algorithm + `waves.json` emitter. Extended with `depends_on`; predicate untouched.
- **Surface:** `.cleargate/sprint-runs/SPRINT-38/plans/waves.json` — already carries `milestones` and `milestone_barrier` keys. The v2 schema formalizes what this artifact already gestures at.
- **Surface:** `.claude/skills/sprint-execution/SKILL.md:236-252` — the serial wave loop replaced by the scheduler; `:445` — the serial merge invariant preserved verbatim.
- **Coverage of this epic's scope:** ~70% extension. The executor, predicate, verdict schema, merge mechanics, and artifact format all exist. Net-new is the scheduler loop, the dependency edges, and the merge queue.

## Prior work

- `cleargate wiki query "parallel wave scheduling"` → **none found**.
- [[EPIC-033]] — built the wave machinery this epic schedules (`launch_wave.mjs`, `architect-synth`, the barrier). Direct predecessor.
- [[BUG-034]] — flashcard-gate restore not exception-safe; fixed by moving ownership into `launchWave`'s `try/finally`. **Parallel waves reintroduce this defect in a harder form** (non-reentrant env guard across concurrent calls); the refcount in §2 is the specific mitigation.
- [[BUG-033]] — collision-surface fail-open; established the "empty surface is unproven, never proven-disjoint" rule that the DAG's admission check inherits unchanged.
- [[CR-106]] — execution-state event log. **Hard blocker**: widening concurrency multiplies the `state.json` lost-update window.
- [[SPRINT-38]] / EPIC-051 — retired `execution_mode` dead vocabulary. `milestone_barrier` is the same defect and this epic resolves it.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `.cleargate/scripts/launch_wave.mjs` — but it accepts a single wave by signature (`:264`) and the loop that calls it is prose in `SKILL.md`, not code. There is no existing scheduler object to parameterize.
- **Why isn't extension / parameterization / config sufficient?** A config flag cannot express a dependency graph. The serial loop's correctness rests on an implicit invariant — every wave sees all prior merges — that stops holding the moment two waves overlap; what replaces it is an explicit admission check against `depends_on`. That is a new decision procedure, not a parameter. The three supporting changes (refcounted gate, worktree mutex, merge queue) are each mechanical, but none is reachable by configuring the current code: `launchWave` owns the env guard by design, and the merge loop is a prose instruction to the orchestrator rather than a queue.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `.cleargate/scripts/launch_wave.mjs` — env-guard ownership moves out; `launchWave` becomes re-entrant.
- `.cleargate/scripts/wave-scheduler.mjs` *(new)* — ready-set loop, admission budget, merge queue, per-subtree halt.
- `.claude/agents/architect-synth.md` — emit `depends_on`; `waves.json` schema v2.
- `.claude/skills/sprint-execution/SKILL.md` — §C.0 replaced; §C.7 serial-merge language preserved.
- `cleargate-planning/` mirrors of all four.
- `cleargate-cli/src/dashboard/collect.ts` — render concurrent waves rather than a linear list.

**Data Changes:**
- `waves.json`: `waves[].depends_on: string[]`, `schema_version: 2`.

## 5. Acceptance Criteria

```gherkin
Feature: Parallel wave scheduling
  Scenario: Independent waves run concurrently
    Given waves W1, W3 and W8 with empty depends_on
    When the scheduler starts
    Then all three are admitted in the same round

  Scenario: A dependent wave waits for merge, not for GREEN
    Given W2 depends_on W1
    And W1's segments have all returned GREEN but are not yet merged
    When the scheduler polls the ready set
    Then W2 is NOT admitted

  Scenario: Blocked subtree does not halt siblings
    Given W1 returns a BLOCKED verdict and W8 is in flight
    When the barrier consolidates
    Then W2 and W6 are withheld
    And W8 runs to its own barrier and merges

  Scenario: Merge stays serial under concurrent barriers
    Given two waves reach their barriers simultaneously with GREEN stories
    When the merge queue drains
    Then no two merges to sprint/S-NN overlap

  Scenario: Flashcard gate survives overlapping waves
    Given two waves are in flight
    When the first wave's barrier completes
    Then SKIP_FLASHCARD_GATE remains suppressed until the last wave's barrier completes
    And is then restored to its exact prior value

  Scenario: Admission budget is respected
    Given a ready set whose total segments exceed the global cap
    When the scheduler admits
    Then in-flight segments never exceed the cap
```

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** "Should this epic be preceded by a SPIKE charter? The open risks are concurrency-runtime facts, not design taste: (a) does the Workflow tool tolerate concurrent/nested `parallel()` calls; (b) does the RUN_ID-keyed ledger survive interleaved barriers; (c) does the per-worktree pre-commit surface gate race across concurrent worktrees. SPRINT-39's `STORY-054-01` ships the SPIKE charter template, which would make this epic its first real customer."
- **Human Answer:** **Spike first** — decided 2026-08-26. This epic does not decompose until a SPIKE charter has answered the three runtime questions below. The charter cannot be drafted until `STORY-054-01` (SPRINT-39 M1 wave 1) ships `.cleargate/templates/spike.md` — no spike template exists in the tree today. Drafting it then doubles as SPRINT-39's own DoD validation ("a `SPIKE-NNN` document can be drafted, gate-checked, and ingested into `wiki/spikes/`"), so the epic's charter replaces what would otherwise be a synthetic test fixture.

  **The charter's bounded questions, pre-specified so drafting is mechanical once the template lands:**

  1. **Does the Workflow tool tolerate concurrent or nested `parallel()` calls?** `launchWave()` (`launch_wave.mjs:264`) drives one `parallel()` per wave. The scheduler needs several in flight at once. If nested/concurrent `parallel()` is unsupported or silently serializes, the whole DAG design collapses to a single flat admission set and §2's scheduler must be redesigned around one `parallel()` over stories rather than over waves. **This is the load-bearing question — answer it first and stop if it fails.**
  2. **Does RUN_ID-keyed ledger attribution survive interleaved barriers?** Per-agent `SubagentStop` attribution is already dead under workflows (`launch_wave.mjs` header, STORY-033-01 spike); the barrier writes one row per segment from `verdict.tokens`. With two barriers consolidating concurrently, confirm rows stay correctly keyed and no sprint's ledger absorbs another wave's cost. FLASHCARD:22 (`HOOK_LOG` reaching across sprints) is the precedent for how this fails.
  3. **Does the per-worktree pre-commit surface gate race across concurrent worktrees?** `cleargate-enforcement.md:103` asserts each segment commits against an isolated `.git` index so `file_surface_diff.sh` cannot race. That claim was made for one wave. Verify it holds when worktrees from *different* waves commit simultaneously — and specifically whether the gate's read of `.active` + `state.json` from the main working tree (`cleargate-enforcement.md:295`) is safe under concurrent readers.

  **Bound:** timeboxed to the three questions above. The spike does not prototype the scheduler, does not touch `waves.json`, and produces findings only.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Decomposition**

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

> 🟢: every criterion is literally met. **Green is not the same as runnable** — this epic remains sequenced behind two hard dependencies that are scheduling facts, not ambiguity: [[CR-106]] must land (concurrency multiplies the `state.json` write window), and the SPIKE charter above must be drafted and answered. Do not decompose until both clear.

> **Gate 1 sign-off: approved 2026-08-26** by sandrinio. Status stays 🟡: approval authorizes the work, it does not answer the open design question above. The gate's sentinel token in that answer line is load-bearing and must stay until a real answer replaces it.

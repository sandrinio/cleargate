---
story_id: STORY-033-04
parent_epic_ref: EPIC-033
parent_cleargate_id: "EPIC-033"
sprint_cleargate_id: SPRINT-32
carry_over: false
status: Completed
approved: true
ambiguity: 🟡 Medium
context_source: |
  EPIC-033 decomposition at SPRINT-32 kickoff 2026-05-29; §6 answers (Q1 kill-switch
  = sprint-frontmatter execution_mode field + CLEARGATE_PARALLEL_WAVES=off override;
  Q3 fully-autonomous-after-Gate-2) + the STORY-033-01 spike result (barrier-writer
  attribution, ClearGate-managed .worktrees/STORY-X via bash not Workflow isolation,
  orchestrator-set SKIP_FLASHCARD_GATE=1, resumeFromRunId complete-then-resume) are
  the binding inputs. This is the HIGH-EXPOSURE L3 capstone — depends on 033-02 + 033-03.
actor: ClearGate Orchestrator
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: high
lane: standard
area: sprint-execution,orchestration,workflows
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-29T08:04:35Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-033-04-Wave-Execution-And-Barrier
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-29T08:04:35Z
  sessions: []
---

# STORY-033-04: Wave Execution + Barrier

**Complexity:** L3 — net-new `launch_wave.mjs` + schema-typed verdict + a Phase C rewrite of the orchestration loop, gated behind a kill-switch; cross-cutting across the launcher, the skill, the protocol, and the enforcement doc.

## 1. The Spec (The Contract)

> Prior work: [[EPIC-033]] + [[STORY-033-01]] (spike) — decomposition pre-authorized at epic level.

### 1.1 User Story
As a ClearGate Orchestrator, I want to launch each Architect-planned wave as one fire-and-forget Workflow of worktree-isolated per-story segments that return a schema-typed verdict, then consolidate at a serial barrier, so that file-disjoint planning-layer stories complete in ≈ max(per-story time) instead of Σ(per-story time) while per-story token attribution and the flashcard gate stay correct.

### 1.2 Detailed Requirements
- **New launcher `.cleargate/scripts/launch_wave.mjs`** that drives `parallel()` of one segment per story in the wave, mints a stable per-thunk `RUN_ID` for each segment, and returns the array of segment verdicts to the Orchestrator at the barrier.
- **Schema-typed segment verdict (discriminated union)** with fields: `verdict ∈ {GREEN, ESCALATED, BLOCKED}`, `storyId`, `runId`, `devSha`, `qaSha`, optional `archSha`, `flashcards_flagged[]`, `counters { qa_bounces, arch_bounces, breaker_hits }`, `tokens { input, output, cache_creation, cache_read, model }`, and `blocker { type, message }` which is **required iff `verdict != GREEN`** (`blocker.type` is one of the five §22 true-blocker kinds). A validator at the barrier accepts a well-formed verdict array and raises a validation Error naming the offending `storyId` on a malformed one.
- **Segments create ClearGate's OWN worktree** via `git worktree add .worktrees/STORY-X -b story/STORY-X sprint/S-NN` in bash — they MUST NOT use the Workflow tool's `isolation:'worktree'` (the spike found it checks out tracked-files-only at `.claude/worktrees/wf_*` off the wrong base, stripping gitignored `/.claude/` + `/mcp/`). Worktrees are pre-created at wave launch to avoid concurrent `git worktree add` racing on one repo.
- **Orchestrator sets `SKIP_FLASHCARD_GATE=1`** in its OWN env before invoking `launch_wave.mjs` and restores the prior value at the barrier (per-thunk child env is not settable via the Workflow API — spike Q5; one orchestrator-level var is inherited by all workflow children). This relocates only the flashcard WRITE-gate; flashcard reading is unaffected.
- **SKILL.md Phase C rewrite** so that: a wave launches via `launch_wave.mjs`; the flashcard gate moves from between-story (current §C.9) to **between-wave** (the Orchestrator writes the `.processed-<hash>` markers from each segment's `flashcards_flagged[]` before launching the next wave); the barrier merge is **serial** (DevOps merges one worktree to `sprint/S-NN` at a time, never two concurrently); escalation uses `resumeFromRunId` **complete-then-resume** (re-enters the same run, re-dispatches only the ESCALATED/BLOCKED story's segment, GREEN segments short-circuit with zero new ledger rows); segments are **idempotent** as a belt-and-suspenders safety net.
- **Kill-switch**: a sprint-frontmatter field `execution_mode: v2-parallel | v2-serial` (EPIC-033 §6 Q1) selects the loop, with `CLEARGATE_PARALLEL_WAVES=off` as a within-session override; either revert path runs today's serial five-dispatch Phase C loop with **zero behavior change** (no `launch_wave.mjs` invocation).
- **Fully autonomous after Gate 2** (EPIC-033 §6 Q3): once the human approves the sprint at the SDR/Gate-2 confirm, every wave auto-launches with no per-wave "go"; only `ESCALATED`/`BLOCKED` segment verdicts halt the loop.
- **In-segment true-blocker re-map** (protocol §22 inheritance, new §23): a segment that hits a §22 destructive/secret condition RETURNS `BLOCKED` with `blocker.type ∈ {destructive, secret}` and writes a blockers report — it issues NO `AskUserQuestion` (the synchronous-Ask form is forbidden in-segment because workflows cannot halt for a human mid-run).
- **Protocol §23 "Parallel-Wave Execution Contract"** added to `cleargate-protocol.md`, documenting the verdict schema, the RUN_ID attribution invariant, the barrier consolidation/merge rule, and the in-segment true-blocker re-map; it inherits §22.

### 1.3 Out of Scope
- The barrier ledger-writer mechanics and `.session-totals.json` RUN_ID re-keying — owned by STORY-033-02 (this story consumes the `verdict.tokens` it produces).
- The Architect Planning Workflow / wave-assignment scheduling (`collision_surface.sh`, `waves.json` production) — owned by STORY-033-03 (this story consumes the wave plan).
- Adversarial QA-Verify panel and handoff hardening — owned by STORY-033-05 (v2 fast-follow).
- Any change to `mcp/` or `admin/` source (separate deploy products — planning-layer only).
- Per-worktree ephemeral Postgres, a merge-adjacency third collision axis, mid-run human input ingestion, and nested `parallel()` inside a segment (all explicitly deferred at the epic level).
- Sprint Walkthrough (§D) and Gate-4 close (§E) automation — stay human-interactive.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** When a wave returns a mix of GREEN + ESCALATED, should GREEN stories be merged to `sprint/S-NN` immediately at the barrier, or held until the ESCALATED story is resolved via `resumeFromRunId`?
- **Recommended:** Merge GREEN stories at the barrier immediately (serial merge), then resume only the ESCALATED segment — GREEN segments short-circuit on resume, so re-merging is a no-op and no work is lost.
- **Human decision:** _populated during Brief review_

- **Question:** Should the verdict schema validator live inside `launch_wave.mjs` or as a separate importable module callable from both the launcher and a future Reporter?
- **Recommended:** Define it in `launch_wave.mjs` for v1 (single consumer) and export the validator function so 033-05 / the Reporter can reuse it without a second copy.
- **Human decision:** _populated during Brief review_

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** Concurrent `git worktree add` on a single repo races on the index/lock and corrupts a segment's checkout.
- **Mitigation:** Pre-create all wave worktrees serially at launch (spike decision 2) before any segment runs; each segment then operates on its own `.worktrees/STORY-X` path with an isolated `.git` index.
- **Risk:** The Orchestrator forgets to restore `SKIP_FLASHCARD_GATE` after the barrier, silently disabling the write-gate for the rest of the session.
- **Mitigation:** Save the prior value before `launch_wave`, restore in a `finally`-equivalent barrier step, and assert the gate is active again before the next non-wave dispatch.
- **Risk:** A malformed or partial verdict (e.g. missing `tokens`) silently drops a story's cost or its merge.
- **Mitigation:** The barrier validator hard-fails on any malformed verdict, names the offending `storyId`, marks that segment ESCALATED, and writes no ledger row — the other GREEN verdicts consolidate normally (covered by the error Scenario).
- **Risk:** Kill-switch path diverges from the serial loop over time (behavior drift), defeating the "zero behavior change" guarantee.
- **Mitigation:** `execution_mode: v2-serial` / `CLEARGATE_PARALLEL_WAVES=off` routes to the EXISTING §C loop unchanged — no parallel-only code runs on that path; a verification step asserts no `launch_wave.mjs` invocation appears.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Wave Execution and Barrier Consolidation

  Scenario: Launch a file-disjoint wave and consolidate at the barrier
    Given execution_mode is v2-parallel and a wave of two file-disjoint stories
    When the Orchestrator invokes launch_wave.mjs
    Then each segment runs in its own .worktrees/STORY-X created via git worktree add off sprint/S-NN
    And each segment is minted a stable distinct RUN_ID
    And the parallel() barrier returns an array of two verdicts

  Scenario: Schema-typed segment verdict validates at the barrier
    Given a wave of two stories completes
    When the barrier validator runs over the returned verdict array
    Then every verdict carries verdict in {GREEN, ESCALATED, BLOCKED}, a storyId, a unique runId, and a tokens object
    And every non-GREEN verdict carries a required blocker object with a type and a message
    And the validator accepts the array

  Scenario: Flashcard gate moves to between-wave
    Given the Orchestrator sets SKIP_FLASHCARD_GATE=1 before launch_wave
    And a story segment flags a flashcard during the wave
    When the wave barrier is reached
    Then no segment was blocked mid-run by the flashcard PreToolUse gate
    And the card appears in that segment's flashcards_flagged verdict field
    And the Orchestrator writes a .processed-<hash> marker before launching the next wave
    And the prior SKIP_FLASHCARD_GATE value is restored at the barrier

  Scenario: Serial barrier merge after an all-GREEN wave
    Given all stories in a wave return GREEN
    When the Orchestrator runs the barrier merge loop
    Then DevOps merges each story branch to sprint/S-NN one worktree at a time
    And no two worktrees merge concurrently

  Scenario: In-segment true-blocker returns BLOCKED and never asks
    Given a Developer in a workflow segment encounters a §22 destructive or secret condition
    When it must escalate
    Then it writes a blockers report and returns verdict BLOCKED with blocker.type in {destructive, secret}
    And it issues no AskUserQuestion prompt
    And the Orchestrator halts the wave loop on the BLOCKED verdict

  Scenario: Kill-switch reverts to the serial five-dispatch loop
    Given CLEARGATE_PARALLEL_WAVES=off or execution_mode is v2-serial
    When the Orchestrator runs the sprint
    Then no launch_wave.mjs invocation appears
    And every story executes via the existing serial Phase C per-story loop with no behavior change
```

### 2.2 Verification Steps (Manual)
- [ ] Run a 2-story file-disjoint wave under `execution_mode: v2-parallel` and confirm both `.worktrees/STORY-X` directories were created off `sprint/S-NN` (not at `.claude/worktrees/wf_*`).
- [ ] Inspect the barrier verdict array — confirm each verdict has a distinct `runId` and a populated `tokens` object.
- [ ] Force one segment to return a verdict missing `tokens`; confirm the validator raises an Error naming the `storyId` and the other GREEN verdict still consolidates.
- [ ] Confirm a flashcard flagged mid-wave appears in `flashcards_flagged[]` and the `.processed-<hash>` marker is written between waves (not between stories).
- [ ] Set `CLEARGATE_PARALLEL_WAVES=off` and confirm the run uses the serial §C loop with no `launch_wave.mjs` invocation.
- [ ] Confirm `SKIP_FLASHCARD_GATE` is restored to its prior value after the barrier.

## 3. The Implementation Guide

### 3.1 Context & Files

> Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`.

| Item | Value |
|---|---|
| Primary File (new) | `.cleargate/scripts/launch_wave.mjs` — drives `parallel()` of per-story segments, mints per-thunk RUN_ID, defines + exports the verdict discriminated-union validator, returns the verdict array at the barrier |
| Related File (modify) | `.claude/skills/sprint-execution/SKILL.md` — Phase C rewrite (lines 194–485): wave launch, flashcard gate between-wave (§C.9), serial barrier merge (§C.7), resumeFromRunId escalation, idempotent segments, kill-switch branch |
| Related File (modify) | `.cleargate/knowledge/cleargate-protocol.md` — add §23 "Parallel-Wave Execution Contract"; inherits §22 (line 786) |
| Related File (modify) | `.cleargate/knowledge/cleargate-enforcement.md` — note the worktree/file-surface contract under parallel segments (per-worktree `.git` index; serial barrier merge for the shared sprint-branch axis) |
| Reference File (read-only) | `.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md` — barrier-writer + ClearGate-managed-worktree + SKIP_FLASHCARD_GATE decisions |
| Mirror (close-time) | `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (+ `npm run prebuild`) — dogfood split re-sync, BUG-024 guard |
| New Files Needed | Yes — `.cleargate/scripts/launch_wave.mjs` |

### 3.2 Technical Logic
1. **Entry / kill-switch:** Phase C reads the sprint frontmatter `execution_mode`. If `v2-serial`, or if `CLEARGATE_PARALLEL_WAVES=off` is set in the session env, route to the existing serial §C per-story loop verbatim (no `launch_wave.mjs`). Otherwise (`v2-parallel`) proceed to wave launch.
2. **Pre-launch:** the Orchestrator saves the prior `SKIP_FLASHCARD_GATE` value, sets `SKIP_FLASHCARD_GATE=1` in its own env, and pre-creates each wave story's worktree serially via `git worktree add .worktrees/STORY-X -b story/STORY-X sprint/S-NN`.
3. **Launch:** `launch_wave.mjs` runs `parallel()` over one segment per story. Each segment mints a stable `RUN_ID`, runs the linear pipeline (QA-Red → TPV → Developer → QA-Verify → Architect post-flight) inside its own `.worktrees/STORY-X`, accumulates `tokens` from the outset, and RETURNS a verdict object — it never blocks. A §22 true-blocker becomes a `BLOCKED` verdict with `blocker.type`, never an `AskUserQuestion`.
4. **Barrier — validate:** the validator iterates the verdict array; a malformed verdict (missing required field, or non-GREEN without `blocker`) raises an Error naming the `storyId`, that segment is marked ESCALATED and gets no ledger row, and the remaining GREEN verdicts proceed.
5. **Barrier — flashcards:** the Orchestrator collects every segment's `flashcards_flagged[]`, processes them, and writes the `.processed-<hash>` markers before the next wave (the relocated gate).
6. **Barrier — merge:** for each GREEN story in turn (serial), DevOps merges `story/STORY-X` to `sprint/S-NN` — one worktree at a time.
7. **Barrier — restore + advance:** restore the saved `SKIP_FLASHCARD_GATE` value. If any verdict is ESCALATED/BLOCKED, halt the loop for the human (autonomous up to this point per §6 Q3); on "re-approach", `resumeFromRunId` re-enters the same run and re-dispatches only that segment while GREEN segments short-circuit (zero new ledger rows). Otherwise advance to the next wave.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | verdict-validator: accepts well-formed array; rejects missing `tokens`; rejects non-GREEN without `blocker`; names the offending `storyId` on failure |
| Integration / acceptance tests | 6 | 1 per Gherkin scenario in §2.1 (wave launch, verdict schema, between-wave flashcard gate, serial merge, in-segment true-blocker, kill-switch revert) |

### 4.2 Definition of Done (The Gate)
- [ ] `.cleargate/scripts/launch_wave.mjs` exists, drives `parallel()` of per-story segments, mints per-thunk RUN_IDs, and exports the verdict validator.
- [ ] Minimum test expectations (§4.1) met; all Gherkin scenarios from §2.1 covered.
- [ ] Kill-switch (`execution_mode: v2-serial` AND `CLEARGATE_PARALLEL_WAVES=off`) verified to revert to the serial §C loop with zero behavior change and no `launch_wave.mjs` invocation.
- [ ] SKILL.md Phase C rewrite landed (between-wave flashcard gate, serial barrier merge, resumeFromRunId escalation) and protocol §23 added.
- [ ] `.claude/**` edits mirrored to `cleargate-planning/.claude/**` + `npm run prebuild` at close (BUG-024 guard); live re-sync reminder surfaced.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L1 reuse audit. The action="modify" targets plus the spike reference — all confirmed on disk. The net-new `launch_wave.mjs` is in §3.1, not here.

- **Surface:** `.claude/skills/sprint-execution/SKILL.md:194` — Phase C "Per-Story Execution Loop" (Worktree → QA-Red → TPV → Developer → QA-Verify → Architect → Merge → Flashcard Gate); §C.7 Story Merge (line 353) and §C.9 Flashcard Gate (line 433) are the surfaces this story relocates to between-wave + serial-barrier.
- **Surface:** `.cleargate/knowledge/cleargate-protocol.md:786` — §22 Sprint Execution Autonomy (the five true-blocker cases); §23 is appended here and inherits §22's destructive/secret blocker taxonomy for the in-segment re-map.
- **Surface:** `.cleargate/knowledge/cleargate-enforcement.md:1` — hook-enforced worktree mechanics + file-surface contract; extended with a note that the pre-commit surface gate is per-worktree (isolated `.git` index) so parallel in-segment commits do not race, and the serial barrier merge handles the shared sprint-branch axis.
- **Surface:** `.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md:20` — spike decision 2 (ClearGate-managed `.worktrees/STORY-X` via bash, not Workflow `isolation:'worktree'`) + decision 3 (orchestrator-set `SKIP_FLASHCARD_GATE=1`); binding inputs for §3.2.
- **Coverage of this requirement:** partial — Phase C, §22, and the enforcement worktree contract already model the serial loop and worktrees, so the rewrite extends ≈60% of the behavior; the net-new launcher and the schema-typed verdict (≈40%) have no existing surface and live in §3.1.

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing serial SKILL.md Phase C loop (`.claude/skills/sprint-execution/SKILL.md:194`) plus protocol §22 — they already model the per-story pipeline, worktrees, the flashcard gate, and the blocker taxonomy. But they execute strictly one story at a time and have no fan-out primitive.
- **Why isn't extension / parameterization / config sufficient?** Executing planned waves needs a `parallel()` launcher the Orchestrator does not have today — it spawns agents one at a time and blocks on each. A pure "run agents in parallel" config flag would (a) deadlock on the per-Task flashcard `PreToolUse` gate (which fires inside the workflow on the segments' own spawns), (b) lose per-story token attribution because `SubagentStop` reports the orchestrator transcript under workflows (spike Q2), and (c) check out tracked-files-only worktrees off the wrong base if it used `isolation:'worktree'` (spike decision 2). Each requires structural work — a new launcher minting RUN_IDs, a schema-typed verdict the barrier consolidates, the flashcard gate relocated to between-wave via an orchestrator-level env var, and ClearGate-managed worktrees — none of which is a config toggle. The kill-switch is the config part; the rest must be built.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved epic.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (all confirmed on disk).
- [x] Why not simpler? has both sub-bullets answered.

---
story_id: STORY-033-01
parent_epic_ref: EPIC-033
parent_cleargate_id: "EPIC-033"
sprint_cleargate_id: "SPRINT-30"
carry_over: false
status: Completed
approved: true
ambiguity: 🟢 Low
context_source: |
  EPIC-033 §2 — the BLOCKING capability spike. Gates STORY-033-02..04.
  Designed + partially executed this session 2026-05-29 (Dynamic Workflows analysis).
actor: Orchestrator (ClearGate maintainer)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
lane: fast
area: sprint-execution,orchestration,workflows
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: reuse-audit-recorded
      detail: "'## Existing Surfaces' not found in body"
    - id: simplest-form-justified
      detail: "'## Why not simpler?' not found in body"
  last_gate_check: 2026-05-29T06:52:51Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-033-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-29T07:00:45Z
  sessions: []
---

# STORY-033-01: Workflow Capability Spike
**Complexity:** L2 — time-boxed runtime probe; throwaway instrumentation, no production code. Output is a knowledge artifact (a yes/no checklist), not a feature.

> **✅ COMPLETED 2026-05-29.** Verdict **GO**. All 6 questions answered with cited evidence — full result at `.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md`. Headlines: `SubagentStop` fires but reports the orchestrator transcript even under worktree isolation, and `PreToolUse:Task` never fires → **ledger-writer = barrier-from-`verdict.tokens`** (STORY-033-02). Workflow `isolation:'worktree'` checks out tracked-files-only off the wrong base → **segments use ClearGate's own `.worktrees/` via bash** (STORY-033-04). Per-thunk env not settable → **orchestrator sets `SKIP_FLASHCARD_GATE=1`** before launch. `resumeFromRunId` caches completed agents (0 tokens/16ms replay).

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator, I want to know exactly how Claude Code's Workflow tool interacts with ClearGate's hooks and isolation, so that EPIC-033's ledger fix (STORY-033-02) and wave execution (STORY-033-04) are designed for the real runtime instead of an assumption — and built once, correctly.

### 1.2 Detailed Requirements
Run minimal, instrumented Workflow invocations and record a 6-answer checklist. Each answer must cite observed evidence (a ledger row, a hook-log line, a transcript file, or a tool result), not reasoning.

- **Q1 — Task event / hook firing:** Does `workflow()`'s `agent()` cause `PreToolUse:Task` and `SubagentStop` to fire? (Partial answer already observed this session: `SubagentStop` fires; `pre-tool-use-task.log` stays empty → the auto-marker does NOT fire. Confirm + record.)
- **Q2 — transcript / session isolation (THE fork):** With `isolation:'worktree'`, does each subagent's `SubagentStop` carry a DISTINCT `session_id`/`transcript_path`, or the orchestrator's shared transcript? This single answer selects STORY-033-02's ledger-writer:
  - distinct per-agent transcript → the numerator is correct per agent; RUN_ID re-keying is a cheap safety net.
  - shared orchestrator transcript → the numerator cannot be derived from it; the **barrier writes the ledger from `verdict.tokens`**, keyed by RUN_ID.
- **Q3 — N vs aggregate:** For a `parallel()` of N thunks, do N separate `SubagentStop` events fire (one per thunk) or one aggregate event on workflow completion?
- **Q4 — resume semantics:** Does `resumeFromRunId` return cached results for completed `agent()` calls and re-run only changed/new ones (confirming the docs), so completed GREEN segments are not re-run on escalation resume?
- **Q5 — child env settability:** Can a workflow agent's environment carry `SKIP_FLASHCARD_GATE=1` (and, by extension, a per-segment `DATABASE_URL`)? If per-thunk env is not settable via the Workflow API, record the fallback (Orchestrator sets the env before `launch_wave`, restores after the barrier).
- **Q6 — parallelizable-wave census (decision data):** Over the last ~6 planning-layer sprints, what fraction of milestones contained ≥2 stories that are mutually file-disjoint AND DB-free? (Quantifies the real payoff for the sprints we run.)

### 1.3 Out of Scope
- Any production wiring (`launch_wave.mjs`, RUN_ID threading, SKILL.md edits) — those are STORY-033-02..04.
- Touching `mcp/` or `admin/`.
- Fixing the ledger — this story only *measures*; STORY-033-02 fixes.

### 1.4 Open Questions
- **Question:** Should the spike's worktree-isolated probe agents do real (different-sized) token work so Q2's per-agent deltas are measurably distinguishable, or is observing distinct `session_id`s sufficient?
- **Recommended:** do different-sized work AND observe `session_id`s — both signals; deltas are the load-bearing proof for STORY-033-02's numerator fork.
- **Human decision:** {populated during Brief review}

### 1.5 Risks
- **Risk:** Spike worktree-isolated agents leave stray worktrees / branches if they write files.
- **Mitigation:** probe agents emit markers only (no writes) so the Workflow runtime auto-removes unchanged worktrees; verify `git worktree list` clean afterward.
- **Risk:** Observations are confounded by the active SPRINT-30 sentinel routing ledger writes into SPRINT-30.
- **Mitigation:** snapshot ledger + logs immediately before/after each probe and diff; attribute only the new rows.

### 1.6 Existing Surfaces
- **Surface:** `.claude/hooks/token-ledger.sh:74` — reads `transcript_path` from the SubagentStop payload (the Q2 numerator source).
- **Surface:** `.cleargate/hook-log/token-ledger.log` + `.cleargate/sprint-runs/SPRINT-30/token-ledger.jsonl` — observation surfaces for Q1/Q2/Q3.
- **Surface:** `.cleargate/hook-log/pre-tool-use-task.log` — empty/absent (Q1 auto-marker evidence).
- **Coverage of this requirement:** none net-new code; the spike observes existing surfaces + the Workflow tool. ~100% measurement.

### 1.7 Why not simpler?
- **Smallest existing surface that could carry this:** none — the question is about a runtime (the Workflow tool) that has no representation in the codebase, so it can only be answered by running it and observing.
- **Why isn't extension / parameterization / config sufficient?** There is no config; the behavior is runtime-provided. The only way to know whether the hook contract and isolation hold is to execute a minimal workflow and read the resulting ledger rows, hook logs, and transcripts.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Workflow Capability Spike

  Scenario: Hook-firing recorded with evidence
    Given a snapshot of token-ledger.jsonl and the hook logs
    When a minimal workflow agent runs to completion
    Then the checklist records whether SubagentStop fired (new ledger row) and whether the auto-marker fired (pre-tool-use-task.log line) — each with the observed evidence

  Scenario: Transcript-isolation answer selects the ledger-writer
    Given a parallel() of 2 worktree-isolated agents doing different-sized work
    When the run completes
    Then the checklist states whether each agent's SubagentStop carried a distinct session_id/transcript
    And it names the resulting STORY-033-02 ledger-writer: per-agent-transcript OR barrier-from-verdict.tokens

  Scenario: Resume semantics confirmed
    Given a completed multi-agent workflow run
    When it is re-invoked with resumeFromRunId and an unchanged prefix
    Then the checklist records whether completed agents returned cached results (no re-run)

  Scenario: Census produced
    Given the last ~6 planning-layer sprint plans
    When milestones are classified
    Then the checklist reports the fraction with ≥2 mutually file-disjoint, DB-free stories
```

### 2.2 Verification Steps (Manual)
- [ ] Q1–Q5 each answered yes/no with cited evidence (ledger row / log line / transcript path / tool result).
- [ ] Q2 explicitly names the STORY-033-02 ledger-writer branch.
- [ ] Q6 reports a fraction with the per-sprint breakdown.
- [ ] `git worktree list` is clean after the probe (no stray worktrees).
- [ ] The checklist is recorded in EPIC-033 (resolving the relevant §6 questions) and this story flips to Completed.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md` (NEW — the checklist artifact) |
| Related Files | `.claude/hooks/token-ledger.sh`, `.cleargate/hook-log/token-ledger.log`, `.cleargate/hook-log/pre-tool-use-task.log` |
| New Files Needed | Yes — the spike-result checklist (throwaway/knowledge artifact) |

### 3.2 Technical Logic
Snapshot ledger + logs → run a minimal `parallel()` of 2 worktree-isolated probe agents (each emits a unique marker + does different-sized work) → diff ledger rows + hook logs + inspect the workflow transcript dir for per-agent `session_id`s → re-invoke with `resumeFromRunId` to confirm caching → grep the last ~6 sprint plans/stories for the census → write the checklist. No production code; instrumentation is throwaway.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Spike produces a knowledge artifact, not code under test |
| Evidence-cited answers | 6 | One per Q1–Q6, each with observed evidence |

### 4.2 Definition of Done (The Gate)
- [ ] All 6 questions answered with cited evidence.
- [ ] Q2 names the STORY-033-02 ledger-writer branch.
- [ ] EPIC-033 §6 updated with the resolved answers; this story → Completed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios cover all detailed requirements in §1.2 (Q1–Q6).
- [x] Implementation Guide (§3) maps to specific, verified file paths.
- [x] No "TBDs" exist anywhere in the specification.
- [x] §1.6 Existing Surfaces cites source-tree paths.
- [x] §1.7 Why not simpler? both sub-bullets answered.
- [ ] §1.4 Open Question resolved at Brief review.

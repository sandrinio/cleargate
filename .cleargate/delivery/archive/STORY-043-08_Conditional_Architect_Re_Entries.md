---
story_id: STORY-043-08
parent_epic_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-33
carry_over: false
area: sprint-execution,architect,loop
status: Completed
approved: true
ambiguity: 🟢 Low
context_source: |
  WS4 of EPIC-043 (Framework Hygiene & Efficiency Remediation). Owner resolved Q3
  2026-06-01: KEEP the two Architect re-entries conditional — they fire only when
  pre_gate_runner.sh flags something (demotion/bounce/surface drift); clean stories
  skip both (6->5 dispatches), flagged stories keep the full Architect re-read.
  Duplicate check: this is the only EPIC-043 story touching the sprint loop dispatch
  count; STORY-043-10 shares SKILL.md (merge-order dependency flagged). No prior
  shipped work makes Architect dispatch conditional — net-new narrowing of existing
  unconditional §C.3.5/§C.6 dispatches against the already-shipped pre_gate_runner.sh.
complexity_label: L3
parallel_eligible: n
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:39:16Z
source: local-authored
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-043-08
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:39:16Z
  sessions: []
---

# STORY-043-08: Conditional Architect Re-Entries (TPV + Post-Flight Fire on Signal)

## 1. The Spec (The Contract)

### 1.1 User Story

As the sprint orchestrator running the standard-lane five-dispatch loop, I want the two Architect re-entries (the §C.3.5 TPV gate and the §C.6 Architect post-flight) to fire only when the scripted `pre_gate_runner.sh` scan flags a problem — so that a clean green-path story drops from 6 LLM agent dispatches to 5 (no re-paid 16KB `architect.md` prompt), while any pre-gate flag still dispatches the live Architect so risky stories keep the same scrutiny they have today.

### 1.2 Detailed Requirements

- **Always run the scripted scan.** `bash .cleargate/scripts/pre_gate_runner.sh arch <worktree> <branch>` runs for every standard-lane story at both the §C.3.5 (TPV) and §C.6 (post-flight) decision points. The scan itself is unconditional — only the *live Architect agent dispatch* becomes conditional.
- **TPV (§C.3.5) becomes a scan-gated decision.** For a standard-lane story under v2: run the scan (or the existing wiring checks). If the scan is **clean** (exit 0, no flags), SKIP spawning the Architect `Mode: TPV` agent and proceed directly to §C.4 Spawn Developer. If the scan **flags** anything (demotion, bounce signal, or surface/wiring drift), spawn the live Architect `Mode: TPV` exactly as today.
- **Post-flight (§C.6) becomes a scan-gated decision.** Run `pre_gate_runner.sh arch` after QA-Verify. If it returns exit 0 with no flags, SKIP the live Architect post-flight dispatch and proceed to §C.7 Story Merge. If it returns a non-zero exit OR records any flag (new runtime deps, structural drift, stray env, demotion), spawn the live Architect post-flight agent exactly as today.
- **Safeguard (mandatory, non-removable).** ANY pre-gate flag — demotion, `arch_bounce` signal, surface drift, new-deps, structural issue — MUST still dispatch the live Architect. The optimization only removes the Architect on the proven-clean path; it never removes the Architect from a flagged path.
- **Dispatch-count target.** A standard-lane, no-bounce, clean-scan story drops from 6 dispatches to ≤5. A flagged story keeps 6.
- **Lane/mode preconditions unchanged.** `lane: fast` and `execution_mode: v1` paths are untouched — fast lane already skips both re-entries; v1 TPV stays informational.
- **Document the conditional contract in `architect.md`.** Update the `## Mode: TPV` and post-flight prose in `.claude/agents/architect.md` so the agent's own spec states it is spawned only on a pre-gate flag (not unconditionally).
- **Three-way mirror.** Edits to `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (canonical) must mirror byte-identically to the live `.claude/skills/sprint-execution/SKILL.md` and the npm payload via `prebuild`. `architect.md` is edited live and its canonical mirror kept in sync.
- **Merge-order dependency.** This story shares `SKILL.md` with STORY-043-10; flag the merge-order conflict so DevOps serializes the two merges and the second rebases onto the first.

### 1.3 Out of Scope

- Changing `pre_gate_runner.sh` scan logic, exit-code semantics, or the lane-aware routing tail (§C lane block). The scan is consumed as-is.
- The `lane: fast` skip path and `execution_mode: v1` advisory path — both already skip/inform and are not re-touched.
- Parallel-wave segment pipeline (`launch_wave.mjs`) and token-ledger attribution — owned by EPIC-033, untouched.
- WS7 Consolidation phase, WS3 wiki recompile, or any other EPIC-043 workstream — separate stories.
- Removing the Architect from any flagged path — explicitly forbidden by the safeguard.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Architect re-entries fire on a pre-gate signal, not unconditionally

  Scenario: Clean standard-lane story skips both Architect re-entries (happy path)
    Given a standard-lane story under execution_mode v2
    And pre_gate_runner.sh arch returns exit 0 with no flags at both decision points
    When the story runs through the §C.3.5 TPV and §C.6 post-flight decision points
    Then no live Architect TPV agent is dispatched
    And no live Architect post-flight agent is dispatched
    And total agent dispatches for the story are 5 or fewer

  Scenario: Flagged story still dispatches the live Architect (safeguard)
    Given a standard-lane story under execution_mode v2
    And pre_gate_runner.sh arch flags a demotion or surface drift at the post-flight point
    When the §C.6 decision is evaluated
    Then a live Architect post-flight agent IS dispatched for that flag
    And the dispatch is identical to today's unconditional post-flight dispatch

  Scenario: Pre-gate scan flag bypassed — Architect not dispatched on a flag (Error)
    Given the conditional dispatch logic in SKILL.md §C.6
    When a reviewer simulates a pre-gate exit of 1 (a real flag)
    And the conditional path fails to dispatch the live Architect
    Then the safeguard is violated and the change is rejected with a "safeguard breach: flagged path skipped Architect" Error
    And the story is returned to the Developer until ANY flag re-dispatches the Architect

  Scenario: Canonical and live SKILL.md drift after edit (Error)
    Given cleargate-planning/.claude/skills/sprint-execution/SKILL.md was edited
    When a diff compares it to the live .claude/skills/sprint-execution/SKILL.md
    Then if the two files differ the mirror check fails with a "canonical/live drift" Error
    And the change is blocked until prebuild re-mirrors the payload and the live instance is re-synced
```

### 2.2 Verification Steps (Manual)

- [ ] `grep -n "pre_gate_runner.sh arch"` in both SKILL.md copies shows the scan precedes the conditional Architect dispatch at §C.3.5 and §C.6.
- [ ] §C.3.5 prose states the live Architect `Mode: TPV` is spawned only when the scan flags wiring drift; a clean scan proceeds straight to §C.4.
- [ ] §C.6 prose states the live Architect post-flight is spawned only on a non-zero/flagged scan; a clean scan proceeds straight to §C.7.
- [ ] The safeguard sentence ("ANY pre-gate flag dispatches the live Architect") is present and explicit in both SKILL.md and architect.md.
- [ ] `diff cleargate-planning/.claude/skills/sprint-execution/SKILL.md .claude/skills/sprint-execution/SKILL.md` is empty after the edit + mirror.
- [ ] `architect.md` `## Mode: TPV` prose reflects the conditional dispatch (no longer "dispatched between QA-Red and Developer for standard-lane stories" without the scan-flag qualifier).
- [ ] A walkthrough of a hypothetical clean story confirms the dispatch count is 5; a flagged story confirms 6.

## 3. The Implementation Guide

### 3.1 Context & Files

- `.claude/skills/sprint-execution/SKILL.md` — live orchestration skill; edit §C.3.5 (TPV Gate, ~line 286) and §C.6 (Architect Pass, ~line 369) to gate the live Architect dispatch on a `pre_gate_runner.sh` flag.
- `.claude/agents/architect.md` — live Architect agent spec; edit the `## Mode: TPV` block (~line 108) and the post-flight prose so the agent's own contract states it is spawned only on a pre-gate flag.
- `.cleargate/scripts/pre_gate_runner.sh` — the scripted scan consumed (read-only reference): `arch` mode runs typecheck, new-deps, stray-env, file-count; exit 0 = clean, exit 1 = flagged, exit 2 = scan couldn't run.
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — canonical mirror of the live SKILL.md; receives the identical §C.3.5/§C.6 edit, then propagates to the npm payload via `prebuild` and to the live instance via `cleargate init`.

### 3.2 Technical Logic

1. At §C.3.5, wrap the existing `Mode: TPV` dispatch in a scan-result guard. The TPV decision point uses the wiring/Red-test scan; on a clean result, proceed to §C.4 Spawn Developer with no Architect agent; on a flagged result, spawn the live Architect `Mode: TPV` exactly as today and route per its `APPROVED`/`BLOCKED-WIRING-GAP` return.
2. At §C.6, the `pre_gate_runner.sh arch` invocation already runs first. Change the branch so a **clean** scan (exit 0, no recorded flags) proceeds directly to §C.7 Story Merge **without** spawning the Architect post-flight agent. A **non-zero** scan keeps today's behavior: mechanical failures route back to Developer; structural/surface flags spawn the live Architect post-flight.
3. Add an explicit, non-removable safeguard line at both points: any flag of any kind re-dispatches the live Architect. Treat exit 2 (scan couldn't run) as a flag — fail toward dispatching the Architect, never toward skipping it.
4. Update `architect.md` `## Mode: TPV` and post-flight prose to state the conditional-on-flag contract.
5. Mirror canonical → payload (`prebuild`) → live; verify `diff` is empty. Flag STORY-043-10 merge-order dependency to DevOps (shared SKILL.md).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test | Type | Asserts |
|---|---|---|
| Clean-path dispatch count | Walkthrough / doc-trace | A clean standard-lane story dispatches ≤5 agents (no TPV, no post-flight Architect). |
| Flagged-path safeguard | Walkthrough / doc-trace | A flagged story dispatches the live Architect at the flagged point (6 dispatches). |
| TPV gate prose | grep assertion | §C.3.5 conditions the live Architect TPV dispatch on a scan flag. |
| Post-flight gate prose | grep assertion | §C.6 conditions the live Architect post-flight dispatch on a non-zero/flagged scan. |
| Mirror parity | `diff` | canonical SKILL.md == live SKILL.md (byte-identical); payload re-mirrored by prebuild. |

### 4.2 Definition of Done

- [ ] §C.3.5 and §C.6 in both SKILL.md copies gate the live Architect dispatch on a `pre_gate_runner.sh` flag; clean scans skip the dispatch.
- [ ] The safeguard ("ANY pre-gate flag dispatches the live Architect"; exit 2 treated as a flag) is explicit in SKILL.md and architect.md.
- [ ] `architect.md` `## Mode: TPV` + post-flight prose reflect the conditional contract.
- [ ] Canonical, payload, and live mirrors are byte-identical (`diff` empty; `prebuild` ran).
- [ ] `lane: fast` and `execution_mode: v1` paths are unchanged (verified by diff).
- [ ] STORY-043-10 merge-order dependency on shared SKILL.md flagged to DevOps.
- [ ] Clean-story walkthrough confirms 5 dispatches; flagged-story walkthrough confirms 6.

## Existing Surfaces

> L1 reuse audit. Source-tree surfaces this story modifies. Verified by read/grep on 2026-06-01.

- **Surface:** `.claude/skills/sprint-execution/SKILL.md:286` — `### C.3.5 TPV Gate (Architect-only — standard lane, v2 only)` spawns the Architect `Mode: TPV` unconditionally for every standard-lane story. This story makes the live dispatch conditional on a pre-gate flag.
- **Surface:** `.claude/skills/sprint-execution/SKILL.md:369-383` — `### C.6 Architect Pass` runs `pre_gate_runner.sh arch` (line 378) then "If pre-gate passes, spawn Architect for post-flight review" (line 383) — today it spawns even on a clean pass. This story flips line 383 so a clean pass skips the spawn.
- **Surface:** `.claude/agents/architect.md:108-126` — `## Mode: TPV` block describes the TPV dispatch as occurring "between QA-Red and Developer for standard-lane stories under v2" with no scan-flag qualifier. This story adds the conditional-on-flag contract.
- **Surface:** `.cleargate/scripts/pre_gate_runner.sh:199-287` — `run_arch()` plus the exit-code contract (0 clean / 1 flagged / 2 scan-failed) consumed as the gating signal; read-only, not modified.
- **Coverage:** ~100% narrowing/reconciliation of existing prose — no net-new abstraction; the scan script already exists.

## Why not simpler?

- **Smallest existing surface:** the §C.3.5 / §C.6 prose in SKILL.md plus the `## Mode: TPV` block in architect.md — the `pre_gate_runner.sh` scan already runs and already returns a clean/flag exit code, so the entire change is gating an existing dispatch on an existing signal.
- **Why isn't extension/config sufficient?** It is — this is the opposite of adding complexity. We are not building a new gate, flag, or script; we are narrowing two unconditional dispatches into scan-gated ones, with a hard safeguard that any flag still dispatches the Architect. A config toggle would add a knob nobody needs; the pre-gate exit code is already the right signal. The only reason this is its own story (not a one-line CR) is the mandatory three-way canonical/payload/live mirror plus the shared-SKILL.md merge-order dependency with STORY-043-10, which warrant isolated merge and acceptance.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low**

*Each criterion evaluated against its literal text.*

- [x] Parent epic EPIC-043 is `approved: true` (verified in epic frontmatter).
- [x] §3.1 cites only this story's real, verified file paths.
- [x] §2.1 Gherkin has a Feature line, a happy-path scenario, and named Error/edge scenarios.
- [x] §Existing Surfaces cites at least one source path with file:line.
- [x] §Why not simpler? answers both the smallest-surface and the why-not-extension sub-bullets.
- [x] Q3 of EPIC-043 (WS4 risk acceptance) is RESOLVED — owner chose KEEP conditional; safeguard re-dispatches on any flag.
- [x] 0 TBDs remain in the document.

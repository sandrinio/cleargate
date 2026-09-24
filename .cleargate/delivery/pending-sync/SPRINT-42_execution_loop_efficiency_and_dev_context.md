---
sprint_id: SPRINT-42
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-42
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: null
status: Draft
start_date: 2026-09-08
end_date: 2026-09-12
synced_at: null
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-09-06T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-06T16:41:30Z
  transition: ready-for-execution
epics:
  - EPIC-031
proposals: []
stories:
  - STORY-031-03
  - STORY-031-04
  - STORY-031-05
bugs:
  - BUG-086
  - BUG-087
  - BUG-088
crs:
  - CR-120
  - CR-121
  - CR-122
area: sprint-execution,test-runner,instrumentation,agent-prompts,perf,dx
execution_mode: v2
sprint_goal: |
  Reclaim the measured waste inside sprint stages — not between them — and fix the
  instrument, so the next round of execution claims can be settled by an artifact
  instead of an argument.
context_source: |
  Decomposes EPIC-031 (Test Suite Wall-Time Reduction) with three new child stories,
  plus six standalone items from the 2026-09-06 execution-efficiency and Dev-context
  audit (two Workflow passes, 130 agents, 14.7M tokens, adversarially verified).

  The audit refuted its own two largest hypotheses, and this sprint is scoped by what
  survived. Wave parallelism is NOT in scope: SPRINT-39's realised dispatch union is
  1,339 min against a 1,668 min serial sum — the orchestrator was already hand-overlapping
  wave-mates (37 overlapping pairs), capturing 329 of the 375 min its own wave plan
  authorised. Residual scheduling headroom is ~46 min inside a 3,883 min span (1.2%), of
  which 2,079 min is overnight/human gap. Likewise the pre-gate typecheck FAIL does NOT
  drive dispatch count (SPRINT-39 never invoked the scan yet fired 13 TPVs); BUG-087 is
  filed for correctness with an explicitly declared zero-minute saving.
stamp_error: no ledger rows for work_item_id SPRINT-42
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:41:30Z
  sessions: []
---

# SPRINT-42: Execution-Loop Efficiency + Developer Context

## 0. Stakeholder Brief

Sprint execution is not slow because it is serial. It is slow because a 9.6-minute test suite runs where a 0.8-second alternative has shipped all along, and because nothing in the repo can measure a dispatch — so every tuning decision since SPRINT-33 has been made against a number that describes the orchestrator's Opus, not the Sonnet agent being tuned.

This sprint takes the measured wins and fixes the instrument. It deliberately does **not** take the two biggest-sounding ideas, both of which died on re-measurement.

## Sprint Goal

- **Sprint Goal:** Reclaim the measured waste inside sprint stages — not between them — and fix the instrument, so the next round of execution claims can be settled by an artifact instead of an argument.

- **Success measure:** (1) No agent dispatch runs the full cleargate-cli suite except the three deliberate carve-outs (runtime lane, Mode: CONSOLIDATION, Developer commit-time). (2) `subagent-ledger.jsonl` exists for SPRINT-42 with one row per dispatch carrying a Sonnet `model` value for Dev/QA rows. (3) `qa_bounces` stays at its historical floor.

## 1. Consolidated Deliverables

| ID | Type | Lane | Milestone | Parallel? | Bounce exposure |
|---|---|---|---|---|---|
| STORY-031-03 | Story | standard | M1 | n | low |
| STORY-031-04 | Story | standard | M1 | n | low |
| STORY-031-05 | Story | standard | M2 | y | med |
| BUG-086 | Bug | standard | M1 | y | low |
| BUG-088 | Bug | fast | M1 | y | low |
| CR-120 | CR | standard | M2 | y | med |
| BUG-087 | Bug | standard | M3 | y | med |
| CR-121 | CR | standard | M3 | y | low |
| CR-122 | CR | fast | M3 | y | low |

## 2. Execution Strategy

_(Architect Sprint Design Review writes §§2.1–2.5 at kickoff. Pre-SDR placeholder — the ordering below is the drafter's dependency analysis, not an SDR verdict.)_

### 2.1 Phase Plan

- **M1 — the measured wins.** STORY-031-03 → STORY-031-04 (strict order; 04's baseline source does not exist until 03's §Test Stack rows do). BUG-086 and BUG-088 run alongside on disjoint surfaces.
- **M2 — instrument, then inherit.** CR-120 and STORY-031-05 in parallel.
- **M3 — correctness and freedom.** BUG-087, CR-121, CR-122 in parallel.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

STORY-031-03 before STORY-031-04 — hard dependency (§Test Stack rows).

Both touch `.claude/agents/` files but different ones (031-03 → `devops.md`, 031-04 → `qa.md`), so no file collision. **CR-122 also touches `qa.md`** and must not co-wave with STORY-031-04 — this is the sprint's one real shared-surface constraint, and it is why CR-122 sits in M3.

`SKILL.md` is touched by STORY-031-03 (§C.7 template), STORY-031-04 (§C.3 template), CR-120 (`description` format) and CR-121 (`:560` cadence). Four items, one file. The SDR must either serialise them or assign disjoint line ranges with an explicit partition, as SPRINT-40's M1 did for `token-ledger.sh`.

`surface-whitelist.txt` is touched by BUG-086 and CR-120 — same file, different rows; serialise or partition.

### 2.3 Shared-Surface Warnings

| File | Items | Note |
|---|---|---|
| `.claude/skills/sprint-execution/SKILL.md` | STORY-031-03, STORY-031-04, CR-120, CR-121 | Four writers. Partition by section or serialise. |
| `.claude/agents/qa.md` | STORY-031-04, CR-122 | Must not co-wave. |
| `.cleargate/scripts/surface-whitelist.txt` | BUG-086, CR-120 | Different rows; partition. |
| `.cleargate/scripts/update_state.mjs` | CR-122 | Sole writer. |

### 2.4 Lane Audit

| Story-ID | Lane | Rationale |
|---|---|---|
| BUG-088 | fast | Markdown-only strike at 12 sites, no logic, no runtime surface. |
| CR-122 | fast | Two deletions and an append in two markdown files, plus one `update_state.mjs` flag mirroring an existing handler. |
| all others | standard | Carry executable logic, a bash harness, or a safety coupling. |

> Per the audit's lane finding, the §2.4 table must cite a **failing check number** from the seven-check rubric when routing an item to `standard`. Three SPRINT-39 items passed check 1 unamended and were routed standard on an invented "mirrored implies standard" rule that is not one of the seven checks. The SDR is asked to apply the rubric literally here.

### 2.5 ADR-Conflict Flags

None. No architectural decision is reversed. CR-120 explicitly preserves `token-ledger.jsonl` and all its consumers rather than migrating them.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| STORY-031-04 trades a real, if incidental, regression signal for time — the one item directly coupled to the near-zero rework record | `qa_bounces` is the tripwire. If it leaves its floor next sprint, revert first, diagnose second. Recorded in 031-04's DoD. |
| Prompt edits provably do not bind when the dispatch text says otherwise — `devops.md` forbade the full suite in three places since before SPRINT-39 and DevOps ran four anyway | STORY-031-03 and 031-04 each require the matching SKILL.md dispatch-template edit **in the same commit**. Called out in both DoDs. |
| [[BUG-085]] lands before CR-121 and the next sprint opens with a per-spawn hard block against a 20-card backlog, O(n²) across the sprint | CR-121 §1 records the coupling. Either land CR-121 with BUG-085, or add the sequencing note to BUG-085. Surfaced at Gate 1. |
| BUG-087 makes the pre-gate scan capable of returning 0, arming a dormant scanner-authored `"Architect Passed"` state write at `pre_gate_runner.sh:397` | BUG-087 ships the `STORY_ID` refusal in the same change. Non-negotiable; in its Task Breakdown. |
| Canonical-only edits are inert (BUG-085 class) | Every item's DoD requires the live mirror plus a parity diff. |
| Several targets are pinned by default-tier tests against a `knownFailures=0` ratchet | Run `npm --prefix cleargate-cli run test:file -- <pinned file>` before committing rather than discovering it at the hook. Named per item in each §3 sandbox. |

**Dependencies:** SPRINT-41 must reach `sprint_status: "Completed"` before SPRINT-42 preflight (Gate 3 check 1).

## Metrics & Metadata

- Items: 9 (3 stories, 3 bugs, 3 CRs) across 1 epic.
- Measured savings claimed: STORY-031-03 ~5–25 min/sprint; STORY-031-04 20–40 min/sprint; BUG-086 ~10–20 min plus two human escalation round-trips.
- Explicitly zero-saving items: BUG-087, CR-120. Both are approved for correctness and measurability, not speed.

## Execution Guidelines (Local Annotation — Not Pushed)

**Scope discipline.** Two items were excluded by explicit human decision at drafting and must not re-enter mid-sprint:
- Promoting `SPRINT-36/story-loop.mjs` to a scaffold wave runner + the blueprint slicer. L+M effort; belongs to [[EPIC-055]] (wave scheduling) and should follow CR-120 so its benefit is measurable.
- Wave parallelism / rewriting §C.0 / deleting `launch_wave.mjs`. Refuted — see frontmatter `context_source`.

**Immediate action, outside sprint scope.** SPRINT-41 is executing 12 items against four literal `_(e.g. … populate at init)_` placeholder rows in its `§Test Stack`. That is an operational fix for today, not a SPRINT-42 deliverable.

## 4. Decomposition Status

- [x] All work items have their type's required sections.
- [x] No epic without child stories — EPIC-031 gains STORY-031-03/04/05.
- [ ] All work items 🟢 — the three stories are 🟢; the three bugs and three CRs are 🟡 pending `approved: true`, which is the Gate-1 decision itself.
- [ ] Gate 2 SDR §2 Execution Strategy written by Architect (pending kickoff).

## 5. Gate Checklist

- [ ] **Gate 1** (this sprint approved by human) — pending Brief approval.
- [ ] **Gate 2** (Sprint Ready) — pending SDR + `cached_gate_result.pass` on all nine items.
- [ ] **Gate 3** (preflight) — pending SPRINT-41 close.
- [ ] **Gate 4** (close) — after all items merge + walkthrough.

## 6. Execution Log

_(populated during sprint execution)_

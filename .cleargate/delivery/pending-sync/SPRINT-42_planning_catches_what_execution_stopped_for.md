---
sprint_id: SPRINT-42
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-42
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: null
status: Draft
start_date: 2026-10-08
end_date: 2026-10-16
synced_at: null
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-10-08T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.27.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-08T13:22:34Z
  transition: ready-for-execution
epics:
  - EPIC-059
proposals: []
stories:
  - STORY-059-01
  - STORY-059-02
  - STORY-059-03
  - STORY-059-04
bugs:
  - BUG-052
crs: []
area: sprint-planning,sprint-execution,agent-prompts,templates,planning-layer
execution_mode: v2
sprint_goal: |
  Move to plan confirmation the owner decisions a downstream sprint paid for
  mid-execution: a target repo's own domain reviewers (a designer, for a UI repo) read
  every story draft before the plan is confirmed, and the surface gate checks each story
  commit against that story's own surface.
context_source: |
  RE-CUT 2026-10-08. Owner: "i actually want to deliver the designer we filed earlier",
  then chose "EPIC-059 alone" over running the full 15-item SPRINT-42. SPRINT-42 now
  carries EPIC-059 (four process rules from Kurnera's SPRINT-03, via Kurnera CR-002,
  filed 2026-10-04) with STORY-059-01..04, plus BUG-052 (the surface-gate defect Kurnera
  re-discovered as its BUG-006). The EPIC-031 execution-efficiency work, BUG-086/087/088,
  BUG-117 and CR-120/121/122 moved unchanged to SPRINT-43
  (SPRINT-43_execution_loop_efficiency_and_dev_context.md).

  Owner decisions 2026-10-08: accepted all three EPIC-059 §6 recommendations and the
  four item-level recommendations (STORY-059-02, STORY-059-04, BUG-052 x2); STORY-059-03
  lands first, ahead of STORY-031-03/04, which rebase onto it in SPRINT-43.

  "The designer" is delivered as a hook, not an agent: ClearGate ships the
  `sprint.draft_reviewers` key and the §A.4 fan-out; the target repo brings its own
  designer agent (EPIC-059 §2 out-of-scope).
stamp_error: no ledger rows for work_item_id SPRINT-42
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-08T13:22:40Z
  sessions: []
---

# SPRINT-42: Planning Catches What Execution Stopped For

## 0. Stakeholder Brief

A downstream ClearGate install (Kurnera) stopped four of six UI stories mid-sprint for an owner decision. Every one of those conflicts was already visible in the story drafts. Its designer agent only read them once each story was already running.

This sprint moves that review to the one place ClearGate already halts for the owner: plan confirmation. A repo lists its own reviewer agents (a designer, for a UI repo) under `sprint.draft_reviewers`. Each one reads every story draft at kickoff, and its findings arrive as a single batch of owner questions before anything executes. Three smaller rules close the other gaps that sprint exposed. The surface-gate fix stops story commits from being checked against the wrong story.

Three of the four rules land on files `cleargate upgrade` overwrites, so only an upstream fix reaches every install.

## Sprint Goal

- **Sprint Goal:** Move to plan confirmation the owner decisions a downstream sprint paid for mid-execution, and make the surface gate check each story commit against that story's own surface.

- **Success measure:** (1) EPIC-059's four rules are in the canonical scaffold and the live mirror, pinned by tests. §A.4 names `sprint.draft_reviewers` and §§2.1–2.6, `config.example.yml` documents the key, and the Sprint Plan template carries §2.6. (2) With `sprint.draft_reviewers` empty, §A.4 behaves exactly as today. (3) After BUG-052 merges, a commit on `story/<ID>` is checked against `<ID>`'s §3.1 with no `SKIP_SURFACE_GATE=1`, and orchestrator commits to `.cleargate/delivery/**` and `.cleargate/sprint-runs/**` on a branch with no story id pass. (4) `doctor` reports no scaffold drift for any touched file after the dist rebuild.

## 1. Consolidated Deliverables

| ID | Type | Lane | Milestone | Parallel? | Bounce exposure |
|---|---|---|---|---|---|
| BUG-052 | Bug | standard | M1 | y | med |
| STORY-059-01 | Story | standard | M1 | y | low |
| STORY-059-03 | Story | standard | M1 | y | med |
| STORY-059-04 | Story | fast | M1 | y | low |
| STORY-059-02 | Story | standard | M2 | n | med |

## 2. Execution Strategy

_(Architect Sprint Design Review writes §§2.1–2.5 at kickoff. Pre-SDR placeholder — the ordering below is the drafter's dependency analysis, not an SDR verdict.)_

### 2.1 Phase Plan

- **M1 — gate first, then the rules on disjoint sections.** BUG-052 goes first so that the rest of this sprint's commits run through the corrected gate. STORY-059-01 (SKILL.md §A.4 + `config.example.yml`), STORY-059-03 (`qa.md` Mode RED, `sprint_context.md` §Test Stack, SKILL.md §C.3/§C.8/§C.0.2) and STORY-059-04 (SKILL.md §C.10/§6/§11) run alongside on disjoint sections.
- **M2 — cross-cutting checks.** STORY-059-02 follows STORY-059-01, since both edit SKILL.md §A.4.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

STORY-059-01 before STORY-059-02. Both write SKILL.md §A.4: 01 adds the draft-reviewer fan-out to the reader batch, and 02 adds the §2.6 hand-off.

SKILL.md has four writers, one per EPIC-059 story, each in its own section (see §2.3). The SDR must assign disjoint line ranges or serialise them.

BUG-052 shares no file with any EPIC-059 story.

### 2.3 Shared-Surface Warnings

| File | Items | Note |
|---|---|---|
| `.claude/skills/sprint-execution/SKILL.md` | STORY-059-01, STORY-059-02, STORY-059-03, STORY-059-04 | Partition by section: 01 → 02 serialised (§A.4); 03 §C.3/§C.8/§C.0.2; 04 §C.10/§6/§11. |
| `.claude/agents/qa.md` | STORY-059-03 | Sole writer. |
| `.cleargate/templates/sprint_context.md` | STORY-059-03 | Sole writer; adds the `Red-commit check` row. |
| `.cleargate/templates/Sprint Plan Template.md` | STORY-059-02 | Sole writer. The filename has spaces, so it cannot be declared in §3.1; the SDR records it as a declared off-surface pair (STORY-059-02 §1.5). |
| `.cleargate/scripts/file_surface_diff.sh` | BUG-052 | Sole writer. Live script goes live on merge. |

### 2.4 Lane Audit

| Story-ID | Lane | Rationale |
|---|---|---|
| STORY-059-04 | fast | Three short markdown passages in one file; no logic, no runtime surface. |
| all others | standard | Carry a bash harness change (BUG-052) or multi-file prompt contracts pinned by tests (059-01/02/03). |

> The §2.4 table must cite a **failing check number** from the seven-check rubric when routing an item to `standard`. The SDR is asked to apply the rubric literally.

### 2.5 ADR-Conflict Flags

None. No architectural decision is reversed. EPIC-059 adds an optional config key and text; an empty reviewer list keeps today's behaviour.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| BUG-052 changes the gate this sprint's own commits pass through, mid-sprint | It is first in M1. Before it merges, commits run against today's gate. After it merges, the corrected gate covers every later commit, which is this sprint's live proof of success measure (3). |
| SPRINT-43's STORY-031-03/04 and CR-122 later rewrite the same SKILL.md, `qa.md` and §Test Stack text | STORY-059-03 lands first, by owner decision. SPRINT-43's risk table carries the rebase obligation: keep the `Red-commit check` row, the Mode RED step and `RED_COMMIT_CHECK`. |
| Sprint close hits the carried close-path bugs: [[BUG-119]] (Step 2.6c halts on unrelated incomplete parents) and possibly [[BUG-118]] (carried items get completed) | Neither is in scope. At close, reuse SPRINT-41's owner-approved workaround (`CLEARGATE_SKIP_PARENT_ROLLUP=1`; hand-restore any carried item), surfaced at Gate 4 rather than applied silently. |
| Canonical-only edits are inert (BUG-085 class) | Every item's DoD requires the live mirror plus a parity diff; `doctor` drift check is success measure (4). |
| Pinned SDR/digest text tests may break on the new `cross_cutting` field (STORY-059-02) | Add the field as optional; run the pinned files with the single-file runner before committing (STORY-059-02 §1.5). |
| Several targets are pinned by default-tier tests against a `knownFailures=0` ratchet | Run `npm --prefix cleargate-cli run test:file -- <pinned file>` before committing rather than discovering it at the hook. |

**Dependencies:** SPRINT-41 is `Completed` (closed 2026-10-04), so Gate 3 check 1 is satisfied.

## Metrics & Metadata

- Items: 5 (4 stories, 1 bug) across 1 epic (EPIC-059).
- EPIC-059 claims no time saving inside this sprint. Its payoff is in the *next* sprint's planning: Kurnera's numbers would have replaced four mid-sprint owner stops with one batch of questions at plan confirmation, for about 10 agent-minutes per sprint.
- BUG-052 removes the need for `SKIP_SURFACE_GATE=1` on story branches (Kurnera ran a whole sprint with it).

## Execution Guidelines (Local Annotation — Not Pushed)

**Scope discipline.**
- No designer agent, or any other reviewer agent, ships in the scaffold. ClearGate ships the hook; this repo's own `config.yml` keeps `sprint.draft_reviewers` empty (STORY-059-01 §2.2 manual check).
- The EPIC-031 efficiency work is SPRINT-43. It does not re-enter mid-sprint.

**This repo's §Test Stack.** At `cleargate sprint init`, set the `Red-commit check` row to `developer-commit` once STORY-059-03 merges, and record it in §6 (STORY-059-03 §2.2).

## 4. Decomposition Status

- [x] All work items have their type's required sections.
- [x] No epic without child stories — EPIC-059 has STORY-059-01/02/03/04.
- [x] All work items 🟢 — EPIC-059, STORY-059-01..04 and BUG-052 approved by the owner 2026-10-08, with their open questions answered.
- [ ] Gate 2 SDR §2 Execution Strategy written by Architect (pending kickoff).

## 5. Gate Checklist

- [ ] **Gate 1** (this sprint approved by human) — scope chosen by the owner 2026-10-08 ("EPIC-059 alone"); pending Brief approval of this plan.
- [ ] **Gate 2** (Sprint Ready) — pending SDR + `cached_gate_result.pass` on all five items.
- [ ] **Gate 3** (preflight) — check 1 satisfied (SPRINT-41 closed 2026-10-04); full preflight runs at kickoff.
- [ ] **Gate 4** (close) — after all items merge + walkthrough.

## 6. Execution Log

_(populated during sprint execution)_

---
sprint_id: SPRINT-40
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-40"
carry_over: false
lifecycle_init_mode: block
remote_id: ""
source_tool: ""
status: Active
start_date: 2026-08-31
end_date: 2026-09-04
synced_at: ""
area: framework-integrity
created_at: 2026-08-31T12:23:21Z
updated_at: 2026-09-01T19:24:47Z
created_at_version: 0.25.0
updated_at_version: fe9082b4-dirty
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
  last_gate_check: 2026-08-31T12:32:54Z
  transition: ready-for-execution
epics: []
proposals: []
context_source: "Field-defect sprint. Decomposes no epic: every item is a standalone Bug or CR. Four authored 2026-08-31 from a live-sprint field report out of the doc_processor consumer repo, two carried from pending-sync at human direction. Three further claims in the same field report were investigated and did not reproduce; they are recorded in Execution Guidelines rather than filed. Direct human approval recorded 2026-08-31 in the session that commissioned the triage."
---

# SPRINT-40: Field-Defect Remediation

## 0. Stakeholder Brief

- **Sprint Goal:** Restore the agent-dispatch telemetry that a host tool rename silently broke, so sprint accounting and the pre-dispatch flashcard gate work again.
- **Business Outcome:** Sprint reports stop publishing confidently wrong cost data, and the flashcard gate starts enforcing again instead of silently passing every dispatch through. Both are trust defects — the framework was not failing loudly, it was succeeding falsely.
- **Risks (top 3):** the fix depends on a host contract that can change again; the ledger fix cannot be verified in the field until the dispatch fix lands; canonical-only edits will appear to work and change nothing at runtime.
- **Metrics:** dispatch markers written on 100% of agent spawns; zero ledger rows carrying inherited attribution.

## Sprint Goal

Restore the agent-dispatch telemetry that a host tool rename silently broke, so sprint accounting and the pre-dispatch flashcard gate work again.

> **Goal narrowed at SDR (2026-09-01).** The original goal carried a second clause — *"and remove the
> ways ClearGate currently discards what an operator told it"* — which was carried by BUG-047,
> BUG-048, CR-115 and CR-117 together. With the first three descoped to a follow-up sprint, only
> CR-117 remains of that clause, which is not enough to measure a goal by. The goal is narrowed to
> the telemetry clause so the close verdict means something; `M2 / CR-117` is therefore
> `GOAL_RELATION: off critical path` — real and necessary work that is simply not what this sprint
> is measured by.

## 1. Consolidated Deliverables

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `BUG-068` | PreToolUse dispatch hooks gate on the tool name `Task` | standard | M1 | n | med |
| `BUG-069` | Token-ledger fallback inherits the previous row's attribution | standard | M1 | n | med |
| `CR-117` | A CLI script that ignores an argument says so | fast | M2 | n | low |

**Descoped at SDR (2026-09-01), human decision.** `BUG-047`, `BUG-048`, and `CR-115` were refused by
`architect-synth` under the BUG-046 reachability predicate: their surfaces lie in `cleargate-cli/**`,
an independent nested git repo that is gitignored here and materializes zero tracked files inside a
`git worktree add` checkout. `collision_surface.sh` prescribes the remedy itself — *"Edit it from the
main checkout."* They remain in `pending-sync/`, approved and gate-passing, for a follow-up sprint
scoped for cli-main-checkout execution, where BUG-048's two-substrate split can be decided
deliberately rather than under kickoff pressure.

## 2. Execution Strategy
*(Written by `architect-synth` during Sprint Design Review, 2026-09-01, from six `architect-reader` digests.)*

### 2.1 Phase Plan

Three waves, each of one story. **This sprint has no exploitable parallelism, and that is a finding, not an oversight.**

- **wave1 — `BUG-068`** (P0, standard). Alone.
- **wave2 — `BUG-069`** (standard). Alone, strictly after wave1.
- **wave3 — `CR-117`** (fast). Alone.

The M1 pair serializes on three independent grounds: clause 1 (§1 declares `Parallel? n` for both),
clause 2 (`cleargate-planning/.claude/hooks/token-ledger.sh` is in both surfaces), and clause 5
(BUG-068 restores the dispatch marker whose *absence* is the only path into BUG-069's rewritten
fallback — semantic, not merely textual).

`CR-117` is the case worth naming. It passes clauses 2–5 against both M1 stories: its surface
`.cleargate/scripts/validate_state.mjs` is disjoint, its `db_write_set` is empty, and it declares no
dependency edge. It is stranded purely by clause 1, which requires **both** candidates to be
`parallel_eligible`, and both M1 stories are declared `n`. If zero parallelism is unacceptable, the
lever is that declaration, not the predicate.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `cleargate-planning/.claude/hooks/token-ledger.sh` | `BUG-068`, `BUG-069` | 068 → 069 | 068 restores the marker the hook reads; 069 rewrites the fallback taken when it is absent. BUG-069 is unverifiable until BUG-068 lands. |

No other file is touched by more than one item.

### 2.3 Shared-Surface Warnings

- Both M1 items edit `token-ledger.sh` in adjacent but non-overlapping regions (marker read vs.
  fallback chain at lines 360-376). Serialized; do not parallelize even though the hunks look separable.
- Every M1 item requires the canonical → npm payload → live `/.claude/` re-sync. A canonical-only
  edit will appear to work and change nothing at runtime — the exact mechanism by which a prior
  sprint shipped a hook fix while still running the buggy hook.
- **BUG-033 empty-surface guard did not fire.** All three stories carry a non-empty
  `(file_surface ∪ file_creates)`. No story was fail-safe-serialized for unknown metadata.
- **Clause 4 (DB) is vacuous here.** `db_write_set` is empty for all three.
- **Digest/plan disagreement, resolved toward the plan.** The `architect-reader` digests reported
  `parallel_eligible: y` for BUG-068 and BUG-069 while §1 declares `n`, and reported
  `dep_predecessors: []` for BUG-069 despite the 068 → 069 dependency. The human-approved plan won
  in both cases. Worth checking whether `architect-reader` defaults `parallel_eligible` rather than
  reading the §1 column — if so, that defect would silently un-serialize future sprints.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `CR-117` | fast | Argument-boundary change in one script; four unit cases, no collaborators |

Consistent with `state.json` (`lane_assigned_by: sdr-lane-audit`). The other two are `standard`.
The fast lane does not license co-waving — CR-117's isolation is a clause-1 consequence, not a lane one.

### 2.5 ADR-Conflict Flags

- None outstanding. The one flag raised at SDR — a request to waive the BUG-046 reachability refusal
  for the three `cleargate-cli/**` stories — was resolved by descoping them rather than by waiver.
- BUG-069's refuse-to-attribute posture is consistent with the fail-safe-and-visible precedent
  already set for unknown collision metadata.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| The host renames the agent-spawn tool again, re-breaking `BUG-068`. | Do not fix by adding one name. Accept `Task` or `Agent` **or** the presence of `tool_input.subagent_type`, so the predicate survives a rename. |
| `BUG-069` cannot be verified end-to-end until `BUG-068` lands. | M1 is sequential by construction, and `BUG-069` carries a seeded-ledger unit fixture that does not depend on live dispatch. |
| M1 edits land in canonical but not in the live instance, so the sprint appears to fix a bug it is still running with. | Re-sync is an explicit Task Breakdown row on both M1 items, not a closing chore. |
| Field reports carry plausible root causes that do not survive verification — three of nine claims in the source report did not. | Every item in this sprint cites a file:line the orchestrator read directly. Verify before extending scope on any further field input. |

## Metrics & Metadata

- **Expected Impact:** dispatch markers on 100% of agent spawns (currently 0%); `pre-tool-use-task.log` exists and records one line per dispatch (currently the file has never been created); distinct `agent_type` values in the ledger > 1 where more than one role ran (currently 1 of 1 across 101 observed rows).
- **Priority Alignment:** `BUG-068` is P0 — it silently disables the pre-dispatch flashcard gate, which is a safety mechanism, not an accounting one. `BUG-069` is P1. `CR-117` is P3 and off the goal's critical path; it is in scope because it is a one-file fast-lane item with no collaborators.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** `BUG-068`. Nothing else in the sprint can be verified in the field while dispatch telemetry is dead, and it is the only P0.
- **Relevant Context:** `BUG-068`, `BUG-069`, `CR-115`, and `CR-117` were authored 2026-08-31 and carry verbatim field evidence in their own sections — 101-row ledger censuses, hook-log listings, and tool-name counts from a live consumer-repo sprint. Prefer that evidence over re-deriving it.
- **Three claims from the same field report did NOT reproduce and are deliberately out of scope.** (1) *"The shipped Sprint Plan Template's headers do not match the dashboard collector"* — canonical, npm payload, global install, and the consumer repo's own template all carry `| Story ID | Title | ... |` correctly at line 87. (2) *"`collision_surface.sh` only parses a STORY §3.1 table, so Bug/CR digests return empty surfaces"* — Bug/CR Execution Sandbox bullet support is present in every copy, including the reporting repo's. (3) *"Sprint scope is scraped from the whole sprint body, so a prose cross-reference blocks preflight"* — `assert_story_files.mjs:74-79` and `sprint preflight` both scope to the `## 1. Consolidated Deliverables` section only; this sprint's own preflight resolved exactly its six deliverables while carrying `[[BUG-041]]` in prose. The body-wide scrape in `active-criteria.ts:104` is real but belongs to `cleargate sync`, and no harm from it has been observed. Do not re-file any of these without a fresh reproduction.
- **Constraints:** do not change overwrite *policy* in `CR-115` — only what the user is told and when. Do not repair already-poisoned ledger rows in `BUG-069`; rewriting them would fabricate attribution that was never measured. Do not touch the marker-writing path from `BUG-069` — that is `BUG-068`'s scope.

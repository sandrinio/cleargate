---
sprint_id: SPRINT-40
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
remote_id: ""
source_tool: ""
status: Draft
start_date: 2026-08-31
end_date: 2026-09-04
synced_at: ""
area: framework-integrity
created_at: 2026-08-31T12:23:21Z
updated_at: 2026-08-31T12:23:21Z
created_at_version: 0.25.0
updated_at_version: 0.25.0
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

- **Sprint Goal:** Restore the agent-dispatch telemetry that a host tool rename silently broke, and remove the ways ClearGate currently discards what an operator told it.
- **Business Outcome:** Sprint reports stop publishing confidently wrong cost data; the pre-dispatch flashcard gate starts enforcing again; upgrades stop replacing local customizations without saying so; and two long-standing parser and cache defects stop wedging preflight. All are trust defects — the framework was not failing loudly, it was succeeding falsely.
- **Risks (top 3):** the dispatch fix depends on a host contract that can change again; the ledger fix cannot be verified in the field until the dispatch fix lands; canonical-only edits will appear to work and change nothing at runtime.
- **Metrics:** dispatch markers written on 100% of agent spawns; zero ledger rows carrying inherited attribution; `upgrade` names every user-modified file before writing.

## Sprint Goal

Close the six defects confirmed by the 2026-08-31 field report and its follow-up verification, restoring dispatch telemetry and eliminating the silent-discard failures in gate-cache staleness, id extraction, and upgrade.

## 1. Consolidated Deliverables

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `BUG-068` | PreToolUse dispatch hooks gate on the tool name `Task` | standard | M1 | n | med |
| `BUG-069` | Token-ledger fallback inherits the previous row's attribution | standard | M1 | n | med |
| `BUG-047` | `cleargate stamp` permanently wedges an item's preflight readiness | standard | M2 | y | med |
| `BUG-048` | An ID prefix written in prose mints a phantom work item | standard | M2 | y | med |
| `CR-115` | `cleargate upgrade` announces what it is about to overwrite | standard | M2 | y | low |
| `CR-117` | A CLI script that ignores an argument says so | fast | M2 | y | low |

## 2. Execution Strategy

### 2.1 Phase Plan

- **M1 — Dispatch integrity (sequential):** `BUG-068` → `BUG-069`. Strictly ordered. `BUG-069`'s field verification is impossible while `BUG-068` prevents any marker from being written, and both edit `token-ledger.sh`. Ship as a pair; neither is independently meaningful.
- **M2 — Operator-input integrity (parallel):** `BUG-047` ‖ `BUG-048` ‖ `CR-115` ‖ `CR-117`. Four disjoint surfaces — `frontmatter-cache.ts`, `work-item-id.ts`, `upgrade.ts`, and `validate_state.mjs`. No shared files, no ordering constraint. All four are the same defect class from different angles: the tool discards or ignores what the operator supplied, then reports a problem caused by the discard.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `cleargate-planning/.claude/hooks/token-ledger.sh` | `BUG-068`, `BUG-069` | 068 → 069 | 068 restores the marker the hook reads; 069 rewrites the fallback taken when it is absent |

No other file is touched by more than one item.

### 2.3 Shared-Surface Warnings

- `BUG-068` and `BUG-069` both edit `token-ledger.sh`, in adjacent but non-overlapping regions (marker read vs. fallback chain at lines 360-376). Serialized in M1; do not parallelize even though the hunks look separable.
- Every M1 item requires the canonical → npm payload → live `/.claude/` re-sync. A canonical-only edit will appear to work and change nothing at runtime — this is the exact mechanism by which a prior sprint shipped a hook fix while still running the buggy hook.
- `BUG-048` changes the shared id grammar in `work-item-id.ts`. Any other item tempted to parse an id must call that extractor rather than fork a regex — [[BUG-041]] records that divergent copies are how this codebase once produced five different answers to one question.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `CR-117` | fast | Argument-boundary change in one script; four unit cases, no collaborators |

### 2.5 ADR-Conflict Flags

- None identified. `BUG-069`'s refuse-to-attribute posture is consistent with the fail-safe-and-visible precedent already set for unknown collision metadata.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| The host renames the agent-spawn tool again, re-breaking `BUG-068`. | Do not fix by adding one name. Accept `Task` or `Agent` **or** the presence of `tool_input.subagent_type`, so the predicate survives a rename. |
| `BUG-069` cannot be verified end-to-end until `BUG-068` lands. | M1 is sequential by construction, and `BUG-069` carries a seeded-ledger unit fixture that does not depend on live dispatch. |
| M1 edits land in canonical but not in the live instance, so the sprint appears to fix a bug it is still running with. | Re-sync is an explicit Task Breakdown row on both M1 items, not a closing chore. |
| Field reports carry plausible root causes that do not survive verification — three of nine claims in the source report did not. | Every item in this sprint cites a file:line the orchestrator read directly. Verify before extending scope on any further field input. |

## Metrics & Metadata

- **Expected Impact:** dispatch markers on 100% of agent spawns (currently 0%); distinct `agent_type` values in the ledger > 1 where more than one role ran (currently 1 of 1 across 101 observed rows); `upgrade` emits a grouped pre-write warning naming every user-modified file (currently none).
- **Priority Alignment:** `BUG-068` is P0 — it silently disables the pre-dispatch flashcard gate, which is a safety mechanism, not an accounting one. `BUG-069`, `BUG-047`, and `CR-115` are P1. `BUG-048` is P2. `CR-117` is P3, included because it is a one-file fast-lane item that fits M2's parallel slot.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** `BUG-068`. Nothing else in the sprint can be verified in the field while dispatch telemetry is dead, and it is the only P0.
- **Relevant Context:** `BUG-068`, `BUG-069`, `CR-115`, and `CR-117` were authored 2026-08-31 and carry verbatim field evidence in their own sections — 101-row ledger censuses, hook-log listings, and tool-name counts from a live consumer-repo sprint. Prefer that evidence over re-deriving it.
- **Three claims from the same field report did NOT reproduce and are deliberately out of scope.** (1) *"The shipped Sprint Plan Template's headers do not match the dashboard collector"* — canonical, npm payload, global install, and the consumer repo's own template all carry `| Story ID | Title | ... |` correctly at line 87. (2) *"`collision_surface.sh` only parses a STORY §3.1 table, so Bug/CR digests return empty surfaces"* — Bug/CR Execution Sandbox bullet support is present in every copy, including the reporting repo's. (3) *"Sprint scope is scraped from the whole sprint body, so a prose cross-reference blocks preflight"* — `assert_story_files.mjs:74-79` and `sprint preflight` both scope to the `## 1. Consolidated Deliverables` section only; this sprint's own preflight resolved exactly its six deliverables while carrying `[[BUG-041]]` in prose. The body-wide scrape in `active-criteria.ts:104` is real but belongs to `cleargate sync`, and no harm from it has been observed. Do not re-file any of these without a fresh reproduction.
- **Constraints:** do not change overwrite *policy* in `CR-115` — only what the user is told and when. Do not repair already-poisoned ledger rows in `BUG-069`; rewriting them would fabricate attribution that was never measured. Do not touch the marker-writing path from `BUG-069` — that is `BUG-068`'s scope.

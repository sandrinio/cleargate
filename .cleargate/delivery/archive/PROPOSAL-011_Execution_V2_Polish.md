---
proposal_id: PROPOSAL-011
status: Completed
ambiguity: 🟢 Low
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
context_source: SPRINT-09 REPORT.md §5 Framework Self-Assessment + CG_TEST SPRINT-01 REPORT.md §5 Tooling + SPRINT-09 session retrospective (2026-04-21)
created_at: 2026-04-21T12:00:00Z
updated_at: 2026-04-21T12:00:00Z
stamp_error: no ledger rows for work_item_id PROPOSAL-011
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:23:14Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: architecture-populated
      detail: section 2 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-21T12:23:14Z
---

# PROPOSAL-011: Execution v2 Polish & Efficiency Fixes

## Context

SPRINT-09 shipped EPIC-013 (Execution Phase v2) in one calendar day — 9 stories, 78% first-pass, 22% Bug-Fix Tax. CG_TEST SPRINT-01 then dogfooded the full v2 loop end-to-end on a greenfield install (1/1 story, 0 bounces). Both runs exposed concrete friction points in the v2 scaffolding that weren't visible until it was actually in use.

## Problem

The v2 scaffold works but three classes of friction remain:

1. **CLI wrappers are thin.** `cleargate sprint close` doesn't pass `--assume-ack`; `cleargate state update` falls back to `v1-inert` without a `--sprint` context. Orchestrator has to invoke `run_script.sh` directly for several operations the CLI was supposed to cover.
2. **Safety gates that would have caught this sprint's bugs are missing.** 013-06's collateral stash-conflict damage (two unrelated files overwritten) and M2's Gate-2 story-file gap (drafted mid-sprint) are preventable with a file-surface-diff gate + a pre-init story-file assertion.
3. **Orchestration still has manual bash choreography.** Worktree creation, state transitions, merges, archive moves, and sentinel clearing are all hand-operated per story. ~6 manual commands per v2 story is the tax for missing automation.

## Proposal

One focused epic (EPIC-014) spanning 3 themes, sized for a single sprint:

- **A) CLI & automation** — wire `--assume-ack` / `--sprint` through the CLI; add `cleargate story start/complete` that does worktree + state + merge + cleanup atomically; `.active` sentinel fallback for `state update`.
- **B) Safety gates** — PreToolUse enforcement of the flashcard gate (reuse pending-task-sentinel hook); file-surface diff gate on commit; Gate-2 story-file existence assertion in `sprint init`; pre-existing test-failure ratchet in a commit hook.
- **C) Planning quality** — protocol-numbering auto-resolver in Architect; L3-with-high-bounce-exposure auto-split trigger; Reporter Write-seam fix; cross-project token ledger via `--project-dir` env override.

## Out of scope

- Full bounce-counter analytics dashboards (§3 metrics already ship inline in REPORT.md; a UI is deferred).
- DevOps / Scribe agent split (still deferred per EPIC-013 Q5).
- `cleargate doctor` stack-drift warning (filed for SPRINT-11 in SPRINT-09 D6; stays separate).

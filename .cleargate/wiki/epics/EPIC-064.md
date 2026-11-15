---
type: epic
id: "EPIC-064"
parent: "[[INITIATIVE-002]]"
children: 
  - "[[CR-120]]"
  - "[[STORY-064-01]]"
  - "[[STORY-064-02]]"
cites: 
  - "[[BUG-068]]"
  - "[[BUG-069]]"
  - "[[BUG-117]]"
  - "[[CR-106]]"
  - "[[CR-120]]"
  - "[[EPIC-013]]"
  - "[[EPIC-044]]"
  - "[[EPIC-058]]"
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-064_sprint_numbers_from_what_happened.md"
last_ingest: "2026-11-15T20:36:15.252Z"
last_ingest_commit: "d6a2009862610c558f6143c294fac643bf8cf7c8"
repo: "planning"
last_contradict_sha: "bec43140215186b4f361e25a5fdc354166333018d5cfe3957180f3acc3c9328c"
parent_cleargate_id: "INITIATIVE-002"
sprint_cleargate_id: "SPRINT-45"
---

# EPIC-064: Sprint Numbers From What Happened

**Status:** Completed · **Sprint:** SPRINT-45 · **Gate:** pass

## Objective
Derive per-item dispatches, rework rounds, wall time and tokens from the host's own subagent transcripts and from git, and make the sprint report read those numbers instead of hand-maintained counters.

## Problem & Value
**Why are we doing this?**
Nobody can tell whether a change to the loop helps, because the loop's own numbers are wrong. dispenser_adapter's STORY-003-01 shows it: git holds `qa-red(STORY-003-01): correct test defects (fix 1)` and a `(rework)` commit, while its event log and `state.json` record zero bounces. Per-agent cost is unusable for the same reason: `token-ledger.sh` slices the orchestrator's transcript, so every row is the orchestrator's window.

[+1,344 bytes not shown — read .cleargate/delivery/archive/EPIC-064_sprint_numbers_from_what_happened.md]

## Scope
**In:**
- [ ] Per-dispatch rows from top-level and workflow-run subagent transcripts, deduplicated by `message.id` (CR-120, amended).
**Out:**
- New event kinds or any write to `events.jsonl` or `state.json`. Mid-sprint admission events belong to INITIATIVE-002 WS-3 and need fold() support first.
- Transcripts of hosts other than Claude Code (Codex, Copilot).

[+925 bytes not shown — read .cleargate/delivery/archive/EPIC-064_sprint_numbers_from_what_happened.md]

## Architecture rules
- Read-only derivation. Never write events.jsonl, never add an event kind, never edit state-events.mjs: fold() moves updated_at before its kind switch, so an unknown kind breaks every later update_state.mjs call (CR-120 §3).
- state.json qa_bounces/arch_bounces are left as they are. The report shows derived numbers and names the counter only where the two disagree.
- Never fail a close.

[+821 bytes not shown — read .cleargate/delivery/archive/EPIC-064_sprint_numbers_from_what_happened.md]

## Decisions
- Should the derived rework replace the state.json counters in the report, or sit beside them? → Beside, with the derived number leading and the counter named only where it disagrees. Recommended by the agent and covered by the owner's acceptance of INITIATIVE-002 §6 on 2026-11-14; confirm at this Brief.
- Which sprints form the evidence set? → SPRINT-44 here and dispenser_adapter SPRINT-01 to SPRINT-03.

[+196 bytes not shown — read .cleargate/delivery/archive/EPIC-064_sprint_numbers_from_what_happened.md]

<!-- BEGIN relations -->
## Relations
- Parent: [[INITIATIVE-002]]
- Children (3): [[CR-120]], [[STORY-064-01]], [[STORY-064-02]]
- Cites (8): [[BUG-068]], [[BUG-069]], [[BUG-117]], [[CR-106]], [[CR-120]], [[EPIC-013]], [[EPIC-044]], [[EPIC-058]]
<!-- END relations -->

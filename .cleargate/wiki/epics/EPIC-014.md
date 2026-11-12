---
type: epic
id: "EPIC-014"
parent: ""
children: 
  - "[[STORY-014-02]]"
  - "[[STORY-014-03]]"
  - "[[STORY-014-04]]"
  - "[[STORY-014-05]]"
  - "[[STORY-014-06]]"
  - "[[STORY-014-07]]"
  - "[[STORY-014-08]]"
  - "[[STORY-014-09]]"
  - "[[STORY-014-10]]"
cites: []
cited_by: 
  - "[[BUG-040]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-014_Execution_V2_Polish.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "89539e8bfcdb817b90712e9e148c6e392145214e"
repo: "planning"
sprint_cleargate_id: "SPRINT-09"
---

# EPIC-014: Execution v2 Polish & Efficiency Fixes

**Status:** Completed · **Sprint:** SPRINT-09 · **Gate:** pass

## Objective
Close the CLI gaps, add the safety gates, and eliminate the manual bash choreography that SPRINT-09 and CG_TEST SPRINT-01 revealed in the v2 execution scaffold — without changing the protocol or four-agent contract.

## Problem & Value
SPRINT-09 built v2. This epic makes v2 actually ergonomic. Current per-sprint friction: ~6 manual bash commands per story (worktree + state + merge + archive + sentinel), 2 CLI calls that silently fall back to v1-inert, and at least one class of bug (stash-conflict collateral damage) with no gate to catch it. CG_TEST dogfood confirmed the gaps exist on a clean install, not just in the SPRINT-09 dev environment.

**Success metric:** a v2 sprint of comparable size to SPRINT-09 (9 stories, 2 milestones) shipped with zero direct `bash run_script.sh …` invocations by the orchestrator, zero manual `git worktree` / `git branch -d` / archive `mv` commands, and at least one circuit-breaker fire caught before reaching commit.

## Scope
**In:**
### A) CLI & Automation
- **A1. `cleargate sprint close --assume-ack`** — wire the flag through `commands/sprint.ts` handler to `run_script.sh close_sprint.mjs --assume-ack`. Currently the flag exists in the script but the CLI doesn't surface it.
- **A2.
**Out:**
- Cross-sprint trend dashboards (deferred — numbers live inline in REPORT.md).
- DevOps / Scribe agent split (still deferred per EPIC-013 Q5).
- `cleargate doctor` stack-drift warning (SPRINT-11 per D6).
- Automatic worktree parallelism orchestration (v2 supports parallel; this epic doesn't add automatic dispatch — orchestrator still triggers).
- Replacing the four-agent contract.

[+4,043 bytes not shown — read .cleargate/delivery/archive/EPIC-014_Execution_V2_Polish.md]

## Architecture rules
- No new runtime dependencies. Node built-ins + git + bash only (same as EPIC-013).
- Three-surface landing (R9) on every story: `.cleargate/`, `cleargate-planning/`, and `cleargate-cli/` where applicable.
- All behavioral changes gated behind `execution_mode: v2`. Under v1, behavior is unchanged.
- Reuse M1/M2 scripts from EPIC-013 — do NOT reimplement `run_script.sh`, `update_state.mjs`, `close_sprint.mjs`, `pending-task-sentinel.sh`, etc. Extend them.
- Do NOT touch the MCP adapter, wiki ingest/lint, or scaffold manifest surfaces.

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (9): [[STORY-014-02]], [[STORY-014-03]], [[STORY-014-04]], [[STORY-014-05]], [[STORY-014-06]], [[STORY-014-07]], [[STORY-014-08]], [[STORY-014-09]], [[STORY-014-10]]
- Cited by (1): [[BUG-040]]
<!-- END relations -->

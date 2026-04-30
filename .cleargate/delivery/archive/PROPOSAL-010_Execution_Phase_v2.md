---
proposal_id: PROPOSAL-010
status: Abandoned
author: Vibe Coder (sandro)
approved: true
approved_at: 2026-04-21T00:00:00Z
approved_by: sandro
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-21T00:00:01Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-04-20T22:25:42.439Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id PROPOSAL-010
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T22:22:49Z
  sessions: []
push_version: 1
sprint_cleargate_id: SPRINT-01
---

# PROPOSAL-010: Execution Phase v2 (Gate Waiver Record)

## 1. Initiative & Context

### 1.1 Objective

Port V-Bounce Engine's execution-loop primitives — git-worktree-per-story, pre-gate scanner, machine-readable `state.json` with independent bounce counters, circuit-breaker Blockers Report, immediate flashcard gate, user walkthrough on sprint branch, mid-sprint change-request triage, sprint-close self-improvement pipeline, Architect Sprint Design Review — into ClearGate's three-surface scaffold (`cleargate-planning/` · `cleargate-cli/` · `.cleargate/`), gated behind an opt-in `execution_mode: v2` flag.

### 1.2 The "Why"

- SPRINT-01 → SPRINT-08 surfaced real friction: Developer commits direct to main (no parallel safety), QA re-runs typecheck on every story (expensive mechanical filter), flashcards batched at sprint end (context decay), post-sprint feedback inflates hotfix load, zero cross-sprint quality metrics.
- V-Bounce — a sibling framework — has already solved each with concrete reusable primitives; references cited inline in EPIC-013 §4.2.
- Compounding value: every future sprint (product or process) rides on this loop, so porting first pays back across all downstream work.

## 2. Technical Architecture & Constraints

### 2.1 Dependencies

- V-Bounce Engine reference implementation: `github.com/sandrinio/V-Bounce-Engine@main` — HEAD SHA pinned at `2b8477ab65e39e594ee8b6d8cf13a210498eaded` in `.cleargate/sprint-runs/S-09/plans/M1.md`.
- No new runtime dependencies across any package. Node 24 built-ins + `git` + `bash` only.

### 2.2 System Constraints

| Constraint | Details |
|---|---|
| Four-agent contract preserved | Architect / Developer / QA / Reporter stay. DevOps + Scribe deferred (EPIC-013 §2 out-of-scope). |
| Three-surface landing mandatory | Every scaffold change lands in `.cleargate/` + `cleargate-planning/` + (where applicable) repo-root config. |
| Karpathy wiki untouched | Execution-loop only; wiki ingest/lint/query subagents and MCP adapter surfaces are off-limits. |
| Opt-in rollout | `execution_mode: v1` remains default until SPRINT-11 after two green v2 sprints. |
| No nested-`mcp/` worktrees | Single outer-repo worktree; edit `mcp/` inside it normally. |

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files

See EPIC-013 §0 `<target_files>` and §4.2 V-Bounce Reference Map for the full mapping. Summary: four `.claude/agents/*.md` specs patched; four `.cleargate/templates/*.md` new or patched; `.cleargate/knowledge/cleargate-protocol.md` gains §§10–13; ten new scripts under `.cleargate/scripts/`.

### 3.2 Expected New Entities

- `.worktrees/` (gitignored, new) — ephemeral per-story worktrees
- `.cleargate/sprint-runs/<id>/state.json` (new per sprint) — machine-readable state cache
- `.cleargate/sprint-runs/<id>/sprint-context.md` (new per sprint) — cross-cutting rules auto-injected into every agent brief
- `.cleargate/templates/sprint_report.md` + `.cleargate/templates/sprint_context.md` (new templates)

## 🔒 Approval Gate — Waiver Record

This proposal exists **as a record** of a Gate-1 waiver granted 2026-04-21.

**Why the waiver:** EPIC-013 was drafted directly with V-Bounce as a reference repo. Intent was sharp, files were cited inline in EPIC-013 §4.2 (12-row capability → reference → destination mapping). A retro-drafted proposal would restate the same content as prose without adding information. The Vibe Coder (sandro) explicitly authorized skipping the normal Proposal → Epic gate on 2026-04-21 (see EPIC-013 §6 Q1 "Human Answer").

**What this proposal does:** satisfies the ClearGate gate-check `proposal-approved` criterion so EPIC-013 can be pushed to the PM tool. Content is intentionally minimal — the authoritative scope lives in EPIC-013 and SPRINT-09 plan files.

**Memory recorded:** `memory/feedback_proposal_gate_waiver.md` captures the waiver pattern for future agents — when user asks for an Epic directly with sharp intent + inline references, skip retro-proposal and record waiver in `context_source`.

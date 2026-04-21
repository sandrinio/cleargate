> DRY-RUN ONLY — not the real SPRINT-10 plan. Reviewed by user, not integrated.

# Architect Sprint Design Review — SPRINT-10 (Dry-Run)

**Purpose:** This file demonstrates the Architect Sprint Design Review contract defined in `.claude/agents/architect.md § Sprint Design Review`. It uses a plausible synthetic SPRINT-10 scope to produce a complete §2 Execution Strategy with all four required subsections. The orchestrator does NOT auto-promote this file.

**Context source:** EPIC-013 R10 "first v2 validation run", PROPOSAL-010 (Execution Phase v2), PROPOSAL-009 (Planning Visibility UX). Scope inferred from backlog direction; not authoritative for real SPRINT-10.

---

## Synthetic SPRINT-10 Scope (3-story, execution_mode: v2)

Hypothetical sprint goal: **First v2 validation run** — activate `execution_mode: v2` in a real sprint, exercise worktree isolation + circuit-breaker + flashcard gate end-to-end.

| Story ID | Title | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|
| STORY-013-10 | Activate v2 on SPRINT-10 + smoke-test worktree isolation | M1 | n | med |
| STORY-013-11 | End-to-end circuit-breaker drill with synthetic failing story | M2 | n | high |
| STORY-013-12 | Planning-Visibility UX: wiki active-sprint synthesis v2 enrichment | M2 | y (after 013-10) | low |

---

## 2. Execution Strategy

*(All four subsections required for execution_mode: v2. Produced by Architect before sprint start.)*

### 2.1 Phase Plan

SPRINT-10 runs two milestones, fully sequential within M1; M2 has a constrained parallel pair.

**M1 — Sprint activation gate (sequential):**

- Wave 1 (sequential): **STORY-013-10 alone**
  - Must land first: it flips `execution_mode: "v1"` → `"v2"` in the SPRINT-10 plan frontmatter and validates worktree creation via `validate_bounce_readiness.mjs`. No M2 story may begin until this story's QA passes, because M2 relies on v2 enforcement being active.

**M2 — v2 behavioral validation (two waves):**

- Wave 2 (sequential): **STORY-013-11 alone**
  - Circuit-breaker drill requires a controlled failing Developer run; must complete (including state flip to `Escalated`) before STORY-013-12 starts so the incident log is available.
  
- Wave 3 (parallel-eligible after 013-11 merges): **STORY-013-12 standalone**
  - Wiki enrichment; no dependency on 013-11's output beyond sprint branch stability.

**Summary:** 013-10 → 013-11 → 013-12 (13-12 could run concurrently with post-013-11 cleanup, but treat as serial for safety in the first v2 run).

### 2.2 Merge Ordering (Shared-File Surface Analysis)

Files touched by more than one story in this synthetic scope:

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.cleargate/delivery/pending-sync/SPRINT-10_*.md` (sprint plan frontmatter) | STORY-013-10, STORY-013-11 | 013-10 → 013-11 | 013-10 writes `execution_mode: "v2"` and initializes state.json; 013-11 reads state.json to verify Escalated transition. Edit ordering is strict. |
| `.cleargate/sprint-runs/SPRINT-10/state.json` | STORY-013-10, STORY-013-11 | 013-10 → 013-11 | 013-10 calls `init_sprint.mjs` which creates state.json; 013-11 calls `update_state.mjs` to flip story state. 013-11 must not run before state.json exists. |
| `.cleargate/FLASHCARD.md` | STORY-013-11, STORY-013-12 | 013-11 → 013-12 | 013-11's circuit-breaker drill may surface new flashcard candidates (e.g. tool-call counting gotchas); orchestrator must process them via the §18 Immediate Flashcard Gate before 013-12 starts. Not a file-edit ordering issue — a protocol gate ordering issue. |
| `.cleargate/wiki/active-sprint.md` | STORY-013-12 only | n/a — single story | No shared-surface risk for this file. |

### 2.3 Shared-Surface Warnings

- **state.json init race:** STORY-013-11 must not be spawned until STORY-013-10's commit is merged into `sprint/SPRINT-10` AND `init_sprint.mjs` has run successfully. If 013-10's QA pass triggers an immediate 013-11 spawn before the merge, 013-11 will find `state.json` absent and `validate_bounce_readiness.mjs` will exit non-zero. Orchestrator: enforce merge-then-spawn ordering explicitly (do not rely on clock timing).

- **`execution_mode` flip timing:** STORY-013-10 writes the v2 flag into the sprint plan. If the sprint plan file is also being annotated by the orchestrator (e.g. adding execution log entries), there is a concurrent-edit risk on the sprint markdown file between orchestrator and STORY-013-10 Developer. Mitigation: orchestrator freezes the sprint plan file to Developer for the duration of 013-10's bounce.

- **Flashcard gate ordering:** Per §18 protocol rule, orchestrator MUST process all `flashcards_flagged` entries from STORY-013-11's dev + QA reports before STORY-013-12 worktree is created. In a real v2 sprint this is enforced by the gate; in SPRINT-10's first run, orchestrator must manually confirm the gate fires correctly and does not skip due to empty `flashcards_flagged`.

### 2.4 ADR-Conflict Flags

- **ADR: SPRINT-09 runs v1 (M2 plan, line 5 + R1 sprint line 84):** The decision to keep SPRINT-09 on v1 explicitly defers the v2 flag flip to SPRINT-10. STORY-013-10's scope is consistent with this decision — it flips SPRINT-10, not SPRINT-09. No conflict.

- **ADR: state.json lives at `.cleargate/sprint-runs/<id>/state.json` not `.vbounce/state.json` (flashcard 2026-04-21 #recipe #worktree #state-schema):** STORY-013-10 and 013-11 must reference the ClearGate-diverged path. V-Bounce examples in `skills/agent-team/SKILL.md` use `.vbounce/`; the ClearGate port uses `sprint-runs/`. Any Developer reading V-Bounce source directly will get the wrong path. This is an existing flashcard; confirm both stories' plans cite the flashcard path.

- **ADR: `parallel_eligible: "n"` for 013-10 and 013-11:** Both stories have `parallel_eligible: "n"` in this dry-run scope. The v2 flag + circuit-breaker drill are foundational for SPRINT-10 v2; running them in parallel would mean 013-11 could complete before v2 enforcement is actually active, invalidating the drill. The non-parallel designation matches the story's own frontmatter. No conflict with protocol, but worth flagging as intentional.

- **No open ADRs from `.cleargate/knowledge/` conflict with this synthetic scope.** The wiki enrichment in 013-12 is additive (new synthesis fields on active-sprint.md) and does not modify any locked schema or protocol section.

---

**Dry-run verdict:** All four subsections populated. Merge order is well-defined. No ADR conflicts beyond the known state.json path divergence (already flashcarded). Recommend real SPRINT-10 Architect run this same review against actual story files before sprint start confirmation.

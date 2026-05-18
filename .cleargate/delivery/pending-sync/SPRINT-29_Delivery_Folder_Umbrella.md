---
sprint_id: SPRINT-29
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: true
lifecycle_init_mode: block
area: delivery-structure,cli,migration,scaffold
remote_id: null
source_tool: linear
status: Abandoned
execution_mode: v2
start_date: 2026-05-22
end_date: 2026-06-05
synced_at: null
epics:
  - EPIC-029
bugs:
  - BUG-004
created_at: 2026-05-18T00:00:00Z
updated_at: 2026-05-18T00:00:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: false
  failing_criteria:
    - id: discovery-checked
      detail: expected context_source != "null", got undefined
  last_gate_check: 2026-05-18T16:54:29Z
stamp_error: no ledger rows for work_item_id SPRINT-29
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-18T16:54:29Z
  sessions: []
---

# SPRINT-29: Delivery Folder Umbrella Restructure

## 0. Stakeholder Brief

- **Sprint Goal:** Restructure `.cleargate/delivery/` into umbrella-grouped folders so related work items co-locate; co-locate sprint telemetry into the sprint folder; ship a migration runbook for target-repo upgrades.
- **Business Outcome:** Discovery time for an epic's children drops from "grep + read N files" to one `ls`. Eliminates ~329 flat-list scans per session for both humans and AI agents. Sprint plan + telemetry stop bifurcating across two trees.
- **Risks (top 3):** (1) Migration touches 329 files atomically — must be transactional. (2) ≥19 cleargate-cli files + 5 hooks + 3 scripts + 2 agents reference delivery paths — high consumer count. (3) Canonical-mirror discipline (cleargate-planning/ + npm payload + live /.claude/) means every edit lands in three places.
- **Metrics:** `Moved: 329, Skipped: 0, Conflicts: 0` from migration script; zero regressions in the four-agent loop during SPRINT-29 itself; M-001 runbook executes clean against test-fixture target repo.

## Sprint Goal

Ship EPIC-029 (umbrella folder restructure + sprint telemetry co-location + story Task Checklist + M-001 upgrade runbook) and BUG-004 (scaffold wiki lint YAML backtick fix). Set the foundation for SPRINT-30 (EPIC-012 + EPIC-021 — decomposed during this sprint's Prepare phase).

## 1. Consolidated Deliverables

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-029-01` | Layout Spec + Folder Surface Contract Update | standard | M1 | n | low |
| `STORY-029-02` | Umbrella Path Resolver Library + Tests | standard | M1 | n | low |
| `STORY-029-03` | Migration Script + Tests + `.migration-lock` + meta-repo flip | standard | M1 | n | med (transactional 329-file move) |
| `STORY-029-04` | `cleargate_push_item` + push.ts Use Resolver | standard | M2 | y | low |
| `STORY-029-05` | Wiki Ingest + Lint + Index Compilation Umbrella-Aware | standard | M2 | y | med (PostToolUse hook regression surface) |
| `STORY-029-06` | Lifecycle Reconciler + close_sprint Umbrella-Aware | standard | M2 | y | low |
| `STORY-029-07` | Sprint Telemetry Co-location (Option α) — hooks + agents + scripts | standard | M3 | n | high (touches 5 hooks + 3 scripts + 2 agents in one story) |
| `STORY-029-08` | Story Template Task Checklist + Architect Population | fast | M3 | y | low |
| `STORY-029-09` | Upgrade Migration Runbook (M-001) + `cleargate upgrade` Wiring | standard | M3 | y | low |
| `BUG-004` | Scaffold Wiki Lint Agent YAML Backtick Fix | fast | M3 | y | low |

**Decomposition status:** EPIC-029 → 9 stories drafted in §7 of the epic file; per-story files to be authored at SPRINT-29 SDR (Phase: Prepare). BUG-004 is a standalone fix.

**Out-of-band cleanup (free side-effect, not stories):**
- 4 epics with `status: Completed` currently stuck in `pending-sync/` (EPIC-010, EPIC-016, EPIC-023, EPIC-026) get swept into `archive/<umbrella>/` by the migration script in STORY-029-03.
- STORY-027-* carry-over orphans (SPRINT-27 assignment, still in pending-sync) get reconciled to their correct umbrella by the same script.

## 2. Execution Strategy

*(Architect Sprint Design Review writes 2.1–2.5 once per-story files exist. Stub below — Architect to fill at SDR.)*

### 2.1 Phase Plan

Three milestones, dependency-driven (the layout-flip at STORY-029-03 is the hinge).

- **M1 — Foundation (sequential):**
  - Wave 1: `STORY-029-01` (spec)
  - Wave 2: `STORY-029-02` (resolver lib) — depends on 01's spec
  - Wave 3: `STORY-029-03` (migration script + meta-repo flip) — depends on 02; this is the v1→v2 flip-point
- **M2 — Consumer Rewiring (parallel after M1):**
  - Wave 4: `STORY-029-04` ‖ `STORY-029-05` ‖ `STORY-029-06` (push / wiki / reconciler — disjoint file surfaces)
- **M3 — Telemetry + Polish (mixed):**
  - Wave 5: `STORY-029-07` (sprint co-location — sequential, high surface)
  - Wave 6: `STORY-029-08` ‖ `STORY-029-09` ‖ `BUG-004` (template / runbook / scaffold fix — disjoint)

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `cleargate-cli/src/lib/umbrella-path.ts` | 02 (creates), 04/05/06/07 (consume) | 02 → 04/05/06/07 | Resolver must exist before consumers import it |
| `cleargate-cli/src/commands/push.ts` | 04 (umbrella resolver), 07 (sprint-runs allow-list path update) | 04 → 07 | 04 adds the umbrella write target; 07 updates the sprint-report allow-list regex for the relocated REPORT.md path |
| `.cleargate/knowledge/cleargate-enforcement.md` | 01 (file-surface contract update), 07 (surface-whitelist for relocated artifacts) | 01 → 07 | 01 rewrites the file-surface contract; 07 amends the surface-whitelist section |
| `.cleargate/scripts/close_sprint.mjs` | 06 (umbrella-aware reconciler call), 07 (telemetry-path-aware checks) | 06 → 07 | 06 changes the umbrella-folder slide logic; 07 adds telemetry-path verification |
| `CLAUDE.md` | 01 (Repo layout diagram), 07 (Active state references), 09 (upgrade runbook pointer) | 01 → 07 → 09 | Three independent edits in three sections; sequential merge avoids conflicts |
| `cleargate-planning/.cleargate/templates/story.md` | 08 (Task Checklist section) | 08 alone | No conflict — single editor |

### 2.3 Shared-Surface Warnings

- **STORY-029-07 is the high-bounce story.** Touches 5 hooks (token-ledger, session-start, pre-edit-gate, pre-tool-use-task, pending-task-sentinel) + 3 scripts (close_sprint, prep_doc_refresh, surface-whitelist) + 2 agents (architect, reporter). Recommend assigning to the most senior Developer instance and front-loading QA cycles.
- **STORY-029-03 is the irreversible-but-revertable flip.** Once meta-repo migration applies, all subsequent stories run on v2 layout. Revert == `git revert` the migration commit; .migration-lock guarantees atomicity. Recommend running `--dry-run` and inspecting output before `--apply`.
- **Canonical-mirror trap (FLASHCARD precedent):** every edit to `cleargate-planning/.claude/**` or `cleargate-planning/.cleargate/**` requires `cleargate init` re-sync of the live `/.claude/` instance. STORY-029-07 will trip this — bake the re-sync step into the story's Acceptance.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `STORY-029-08` | fast | L1 template edit + architect dispatch instruction; <1hr work |
| `BUG-004` | fast | Single scaffold-lint regex fix; established hotfix pattern |

### 2.5 ADR-Conflict Flags

- **None.** EPIC-029 modifies the file-surface contract (defined in CR-017) but in a non-breaking extension direction: pending-sync/ + archive/ become `active/<umbrella>/` + `archive/<umbrella>/`. The pre-commit surface-enforcement mechanism remains intact; only the allowed paths change.
- **Adjacent precedent:** STORY-067-01 established the `.migration-lock` pattern this sprint reuses. No conflict, ≥80% pattern reuse.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Migration corrupts the 329-file corpus mid-flight | `.migration-lock` + tmpdir-stage + atomic-rename; `--dry-run` mandatory before `--apply`; commit happens only after script reports `Moved: N, Skipped: 0, Conflicts: 0` |
| Wiki PostToolUse hook breaks on first new-layout write | STORY-029-05 includes hook regression test before any other STORY-029-* story may merge to sprint branch (gate ordering) |
| SPRINT-28 has not closed when SPRINT-29 needs to start | Start date is 2026-05-22 (post estimated SPRINT-28 close); if SPRINT-28 slips, push SPRINT-29 start by the slip amount. v2 mode requires SPRINT-28 fully Completed before init. |
| Target-repo upgrade runbook (M-001) fails on a real repo | STORY-029-09 includes a test-fixture target repo verification; user-validates against the planning-canonical mirror as a smoke test before the runbook ships |
| Dogfood-split desync after canonical edits (FLASHCARD precedent: BUG-024-style "fix shipped with the bug still live") | Every story in the EPIC explicitly lists the `cleargate init` re-sync step in DoD; QA verifies live `/.claude/` matches canonical post-merge |

## Metrics & Metadata

- **Expected Impact:** Discovery time for epic-children drops to single `ls`. Layout-drift detector (CR-066 parent-rollup) operates on a coherent tree rather than a flat list. Future sprints get visible Task Checklist progress per story without PM-tool round-trip overhead.
- **Priority Alignment:** EPIC-029 was user-requested directly 2026-05-17/18; designed and ratified in conversation; no prior PROPOSAL (waived per `feedback_proposal_gate_waiver`). BUG-004 is a long-standing scaffold-lint fix that rides cheaply.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** STORY-029-01 (spec + file-surface contract). Locks the layout name (`active/` + `archive/<umbrella>/` + transient `pending-sync/` + `standalone/`) and the resolver's contract.
- **Relevant Context:** EPIC-029 §3.5 Existing Surfaces (file:line citations) is the L1 reuse audit for every story. CR-067 STORY-067-01 is the `.migration-lock` pattern reference. CLAUDE.md "Dogfood split" section governs canonical/payload/live three-way mirror discipline.
- **Constraints:**
  - No mocks in migration tests (real tmpdir fixtures per FLASHCARD #test-harness).
  - No `--no-verify` commits (CLAUDE.md guardrail).
  - One commit per story (CLAUDE.md guardrail).
  - Migration writes use raw-bytes regex-replace, NOT parse-and-re-serialize frontmatter (FLASHCARD 2026-04-24 #frontmatter #write-back).
  - During this sprint, no other epic execution. EPIC-012 and EPIC-021 may have decomposition drafts authored in pending-sync (out-of-sprint), but no story-execution work on them.

---

## Gate 2 Readiness (Prepare Phase Checklist)

- [ ] EPIC-029 ambiguity 🟢 — **YES** (flipped 2026-05-18)
- [ ] BUG-004 status `Approved` — **YES**
- [ ] All 9 STORY-029-NN files exist in pending-sync/ — **NO** (drafted at SPRINT-29 SDR per template guidance; §7 of EPIC-029 is the preview)
- [ ] Architect SDR §2 written — **NO** (this file is a stub; Architect dispatches at SDR)
- [ ] SPRINT-28 closed — **NO** (close pending; SPRINT-29 start is gated on SPRINT-28 Gate-4 ack)
- [ ] Lifecycle reconciler dry-run clean against current state — **NO** (run at sprint-init time)

**Current ambiguity:** 🟡 Medium — promotes to 🟢 once stories are drafted + SDR §2 lands.

## ClearGate Ambiguity Gate

**Current Status: 🟡 Medium Ambiguity — Stories pending decomposition at SDR**

Requirements to pass to Green:
- [x] Sprint goal stated in one sentence.
- [x] Selected work items listed with lane + milestone + parallel + bounce-exposure.
- [x] Priority changes (if any) justified.
- [ ] All epics in scope have decomposed stories existing in pending-sync/. — **9 STORY-029-NN files pending creation at SDR.**
- [ ] All scope items are ambiguity 🟢 or status: Approved. — **EPIC-029 🟢 ✓, BUG-004 Approved ✓; per-story 🟢 pending creation.**
- [ ] Architect SDR §2 Execution Strategy is non-stub. — **§2 is stub; full SDR pass required.**
- [x] §3 Risks table has mitigations for each top-3 risk.
- [x] DoD constraints in Execution Guidelines reference current FLASHCARD lessons + CLAUDE.md guardrails.

---
sprint_id: SPRINT-33
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: warn
remote_id: ""
source_tool: linear
context_source: Decomposes EPIC-043 (Framework Hygiene & Efficiency Remediation, pushed v2) + Approved CR-070, from the 2026-06-01 source-level framework self-review. Owner directed 'take them all' (full EPIC-043 scope) on 2026-06-01.
status: Draft
start_date: 2026-06-02
end_date: 2026-06-13
synced_at: ""
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
area: framework/hygiene
epics:
  - EPIC-043
crs:
  - CR-070
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:39:30Z
stamp_error: no ledger rows for work_item_id SPRINT-33
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:39:30Z
  sessions: []
---

# SPRINT-33: Framework Hygiene & Gate Correctness

## 0. Stakeholder Brief
*(Sponsor-readable summary. Pushed via `cleargate push`. Pair with §3 Risks below.)*

- **Sprint Goal:** Make every ClearGate gate fire correctly on the right signal, retire stale/duplicated scaffold debt, and add a sprint-end consolidation pass — strengthening delivery quality while cutting weak signals and token cost, without touching the adversarial core.
- **Business Outcome:** The framework stops blocking well-formed work for template bugs, stops loading ~45k of stale context per session, and gains a cross-story quality pass — so agents are more reliable, more token-efficient, and ship cleaner code.
- **Risks (top 3):** (1) CR-070 must land before the flashcard-sentinel fix; (2) `SKILL.md`/`qa.md` are touched by multiple stories — merge order matters; (3) every scaffold edit must mirror canonical→payload→live or it ships buggy (BUG-024 class).
- **Metrics:** 0 items blocked by template false-negatives; flashcard gate enforces again; ~45k session tax trends down; standard-lane stories drop 6→5 dispatches; per-edit wiki recompiles −≥75%.

## Sprint Goal
Repair the gates that don't gate, reconcile templates↔predicates, cut the session/loop token taxes, and add the `/simplify` consolidation pass — executing EPIC-043 (all 8 workstreams) plus the Approved CR-070.

## 1. Consolidated Deliverables

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `CR-070` | Collapse execution_mode to single always-enforced behavior | standard | M1 | n | med |
| `STORY-043-01` | Flashcard sentinel → fail-closed (after CR-070) | standard | M1 | n | med |
| `STORY-043-02` | Readiness predicate heading-TEXT anchoring | standard | M1 | y | med |
| `STORY-043-03` | Template gate-correctness (de-number + context_source + repro + proposal purge) | standard | M1 | n | high |
| `STORY-043-04` | Register `hotfix` WorkItemType + gate block | standard | M1 | y | low |
| `STORY-043-05` | Sprint-close hardening + reporter v2 + flashcard curation | standard | M1 | n | high |
| `STORY-043-06` | README/QUICKSTART + init banner + qa.md doc-truth | standard | M2 | y | low |
| `STORY-043-07` | Incremental wiki synthesis recompile | standard | M3 | y | med |
| `STORY-043-08` | Conditional Architect re-entries (fire on pre-gate signal) | standard | M3 | n | high |
| `STORY-043-09` | CLI surface hygiene (hide plumbing + stub label + orphan delete) | standard | M3 | y | low |
| `STORY-043-10` | Sprint consolidation `/simplify` pass | standard | M4 | n | med |

## 2. Execution Strategy
*(Pre-populated by the orchestrator; the Architect VALIDATES/AMENDS this in the Sprint Design Review before sprint start.)*

### 2.1 Phase Plan
- **M1 — Gate correctness (sequential where coupled):** `CR-070` → `STORY-043-01` (sentinel depends on execution_mode being gone). In parallel with that chain: `STORY-043-02` (predicate anchoring) and `STORY-043-04` (hotfix type) ‖. Then `STORY-043-03` (template de-number) **after** `STORY-043-02` (so heading-text anchoring lands first and de-numbering becomes cosmetic). `STORY-043-05` (close hardening) independent within M1.
- **M2 — Docs:** `STORY-043-06` (standalone).
- **M3 — Efficiency:** `STORY-043-07` ‖ `STORY-043-09` (disjoint files). `STORY-043-08` (conditional Architect) edits `SKILL.md` — serialize vs M4.
- **M4 — Quality:** `STORY-043-10` (consolidation) **last** — edits `SKILL.md` + `qa.md`, both touched earlier; merges after 043-06 and 043-08.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.claude/skills/sprint-execution/SKILL.md` | STORY-043-08, STORY-043-10 | 043-08 → 043-10 | 08 edits §C.3.5/§C.6 (per-story dispatch); 10 adds Phase D.5 (close-stage); 10 rebases on 08 |
| `.claude/agents/qa.md` | STORY-043-06, STORY-043-10 | 043-06 → 043-10 | 06 reconciles re-run prose; 10 adds the consolidation full-suite re-run; 10 lands after |
| `cleargate-cli/src/lib/readiness-predicates.ts` ↔ templates | STORY-043-02, STORY-043-03 | 043-02 → 043-03 | predicate heading-text anchoring lands first; template de-numbering then cosmetic |
| `state.json` / execution_mode surfaces | CR-070, STORY-043-01 | CR-070 → 043-01 | sentinel fail-closed depends on execution_mode being retired |

### 2.3 Shared-Surface Warnings
- `STORY-043-05` touches `close_sprint.mjs` + `reporter.md` + flashcard skill in one story by design (all close-stage) — keep it atomic to avoid a 3-way split collision.
- Every scaffold story (`-01,-03,-05,-06,-08,-10`) edits `.claude/**` or `.cleargate/templates/**` and MUST mirror canonical (`cleargate-planning/`) + payload (`cleargate-cli/templates/`) + live (`/.claude`) — DevOps runs `npm run prebuild` and a mirror-parity diff post-merge.

### 2.4 Lane Audit
*(All stories standard lane — none qualify for fast lane: each spans multiple files and/or carries non-trivial bounce exposure. Architect confirms at SDR.)*

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| — | — | no fast-lane stories; gate/loop changes warrant full adversarial loop |

### 2.5 ADR-Conflict Flags
- `STORY-043-08` (conditional Architect re-entries) is the only loop-behavior change; it must preserve the safeguard that ANY pre-gate flag still dispatches the live Architect. Architect to confirm no conflict with the adversarial-split ADR at SDR.
- `STORY-043-01`/`CR-070` must not weaken gate enforcement — `CLEARGATE_ADVISORY=1` remains the sole downgrade.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| CR-070 not merged before STORY-043-01 → sentinel still reads a live execution_mode | Hard-sequence CR-070 first in M1; 043-01 preflight asserts execution_mode is gone |
| Scaffold edit mirrored to canonical but not live (BUG-024 class) | DevOps `npm run prebuild` + mirror-parity diff on every scaffold-touching merge |
| Predicate change (043-02) regresses an existing gate | Regression-test all 7 gate blocks before merge; 043-02 ships before 043-03 |
| Sprint is large (10 stories + CR) | Milestone-gated; M1 (integrity) ships first and is independently valuable |
| Close hardening (043-05) changes the close flow mid-sprint | 043-05 verified against fixtures; does not alter THIS sprint's close path until merged to main |

## Metrics & Metadata
- **Expected Impact:** gate false-negatives → 0; flashcard gate enforces; session token tax trends down; −≥75% per-edit wiki recompiles; standard-lane dispatches 6→5; cross-story consolidation pass added.
- **Priority Alignment:** M1 (gate correctness / integrity) is highest priority and independently shippable; M3/M4 (efficiency/quality) follow.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** `CR-070` first (unblocks STORY-043-01), then the rest of M1. M1 is the integrity core — if the sprint must be cut, M1 alone is a complete, valuable release.
- **Relevant Context:** the source-level framework self-review (EPIC-043 context_source), `.cleargate/FLASHCARD.md:41/148` (the recurring heading bug), and the verified blocked items (BUG-033 discovery-checked, BUG-034 repro, EPIC-031 reuse-audit) that this sprint un-falses.
- **Constraints:** do NOT touch the adversarial 5-agent split, gate semantics beyond making them fire correctly, worktree isolation, or the MCP store. EPIC-044 (dispatch architecture) is explicitly NOT in this sprint. Every scaffold edit mirrors canonical→payload→live.

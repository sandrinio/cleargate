---
sprint_id: SPRINT-38
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
area: framework/enforcement
sprint_goal: Make every 'always enforced' ClearGate gate actually block again after the CR-070/CR-074 execution_mode retirement — no dead vocabulary, no silent no-ops, and a guard so canonical↔live drift cannot recur.
epics:
  - EPIC-051
proposals: []
context_source: EPIC-051 (approved Gate 1, 2026-07-17) + framework self-audit 2026-07-17 (artifact 47060f0b)
remote_id: null
source_tool: null
status: Draft
start_date: 2026-07-17
end_date: 2026-07-31
synced_at: null
created_at: 2026-07-17T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-17T18:58:50Z
stamp_error: no ledger rows for work_item_id SPRINT-38
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-17T18:58:50Z
  sessions: []
---

# SPRINT-38: Enforcement Integrity Restoration

## 0. Stakeholder Brief
*(Sponsor-readable summary. Pair with §3 Risks below.)*

- **Sprint Goal:** Make every "always enforced" ClearGate gate actually block again after the CR-070/CR-074 execution_mode retirement — no dead vocabulary, no silent no-ops, and a guard so canonical↔live drift cannot recur.
- **Business Outcome:** The framework's enforcement claims become trustworthy again; end users of the npm payload stop shipping broken pre-commit gates; the scaffold stops drifting out from under its own docs.
- **Risks (top 3):** dogfood canonical→live→payload sync errors; shared-doc-surface merge collisions (CLAUDE.md / protocol.md) across M1/M2 stories; the heaviest story (07) spanning ~20 files across three tiers.
- **Metrics:** all three "always enforced" gates block on violation (proven by test); zero live execution_mode/v1/v2 tokens in shipping surfaces; `cleargate doctor` fails on injected drift.

## Sprint Goal
Restore enforcement integrity across the ClearGate scaffold: every gate documented "always enforced" must block on violation, all dead `execution_mode`/v1/v2 vocabulary is purged from shipping surfaces, and a drift guard prevents the canonical↔live↔root divergence that CR-074 exposed.

## 1. Consolidated Deliverables
*(EPIC-051 — approved at Gate 1, 2026-07-17. All stories 🟢, gate-pass. Local IDs; not yet pushed.)*

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-051-01` | Restore file-surface pre-commit gate to blocking | standard | M0 | y | low |
| `STORY-051-02` | Retire the test-ratchet pre-commit gate from the payload | standard | M0 | y | low |
| `STORY-051-03` | Give the decomposition & sprint-readiness gates a work list | standard | M0 | y | med |
| `STORY-051-04` | Remove the `CLEARGATE_EXEC_MODE=v1` silent bypass | standard | M0 | y | low |
| `STORY-051-05` | Sweep dead execution_mode/v1/v2 vocabulary from shipping surfaces | standard | M1 | n | med |
| `STORY-051-06` | Add a canonical↔live↔root drift guard to `cleargate doctor` | standard | M1 | y | med |
| `STORY-051-07` | Give the duplicate check & Ambiguity Gate real enforcement | standard | M1 | y | med |
| `STORY-051-08` | Narrow break-glass semantics — scope CLEARGATE_ADVISORY & guard `--assume-ack` | standard | M2 | y | med |
| `STORY-051-09` | Fix doc contradictions, gate-numbering (four-gate) & phantom refs | standard | M2 | n | med |

**Milestone map:** **M0** (P0 gate restore) = 01·02·03·04 → *checkpoint* → **M1** (P1 integrity & drift) = 05·06·07 → **M2** (P2 coherence) = 08·09.

## 2. Execution Strategy
*(Placeholder — the Architect writes §§2.1–2.5 during the Sprint Design Review, A.4. Notes below are decomposition-time intent, not the SDR.)*

### 2.1 Phase Plan
To be produced by the Architect SDR. Decomposition-time intent: M0 stories 01/02/03/04 are file-disjoint (each owns its own script + test) and can run as one parallel wave. M1: 05 (vocab sweep) must land **before** 07/09 (shared CLAUDE.md/protocol.md); 06 is disjoint. M2: 08/09 sequence after 05.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `CLAUDE.md` / `cleargate-planning/CLAUDE.md` | 05, 07, 08 | 05 → 07 → 08 | 05 sweeps dead vocab first; 07/08 edit specific wording on top |
| `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` | 05, 09 | 05 → 09 | 05 sweeps vocab; 09 renumbers gates on the swept text |
| `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` | 02, 08 | 02 → 08 | 02 drops ratchet claim; 08 narrows §15 |

### 2.3 Shared-Surface Warnings
- STORY-05 (vocab sweep) MUST exclude `file_surface_diff.sh` (owned by 01) and `test_ratchet.mjs` (retired by 02) from its worklist — declared in both stories' §1.3.
- M1/M2 doc stories (05/07/08/09) touch overlapping doc surfaces; the Architect must serialize their merge per §2.2.

### 2.4 Lane Audit
*(No fast-lane stories — all 9 carry real behavior + tests. Architect confirms during SDR.)*

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| — | — | none — all standard |

### 2.5 ADR-Conflict Flags
- None identified. All stories implement decisions ratified at Gate 1 (§6 of EPIC-051); no conflict with CR-070/CR-074 (this epic completes them).

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Dogfood canonical→live→payload sync errors (blind cp destroyed live-only content once, FLASHCARD 2026-07-17) | Every story's DoD requires `diff` canonical↔live and `npm run prebuild` for payload; DevOps mirror-parity audit at merge |
| Shared-doc-surface merge collisions (CLAUDE.md / protocol.md) across M1/M2 | §2.2 merge ordering serializes 05 → 07/08/09; parallel_eligible=n on 05/09 |
| STORY-07 heaviest (L3, ~20 files across 3 tiers) — bounce risk | Split into 07a/07b at execution if it bounces ≥2× (flagged at Gate 1) |
| Bootstrapping: Sprint Plan Template lacks `epics:`/`context_source:` (STORY-03 fixes this) | This plan adds the fields manually so the decomposition gate has inputs |

## Metrics & Metadata
- **Expected Impact:** 3 restored blocking gates + 1 new drift guard + ~15 cleaned surfaces; enforcement docs match reality.
- **Priority Alignment:** M0 (P0) restores the silently-broken gates first; M1/M2 are integrity + coherence follow-through.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** M0 wave (01·02·03·04) — the P0 gate restores. Halt for human checkpoint before M1.
- **Relevant Context:** Framework self-audit (artifact 47060f0b); EPIC-051 §4 grounding; CR-070/CR-074 archive; FLASHCARD dogfood-sync lesson.
- **Constraints:** node:test only (no vitest); canonical is source of truth, sync all three dogfood tiers; `CLEARGATE_ADVISORY=1` is the only enforcement-strength lever; no MCP/admin/DB changes; do not reintroduce execution_mode/v1/v2.

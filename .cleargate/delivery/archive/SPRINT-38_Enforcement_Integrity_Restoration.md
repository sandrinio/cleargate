---
sprint_id: SPRINT-38
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-38"
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
status: Completed
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
  last_stamp: 2026-07-18T17:39:26Z
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
*(Written by Architect SDR, 2026-07-18. Authoritative wave data: `.cleargate/sprint-runs/SPRINT-38/plans/waves.json`.)*

Nine stories, all `lane: standard`, across three milestones — **M0** {01,02,03,04} (fail-closed gate restoration), **M1** {05,06,07} (vocab sweep + drift guard + gate teeth), **M2** {08,09} (break-glass reconciliation + doc coherence). Waves never cross a milestone boundary; each milestone fully merges before the next, which auto-satisfies every cross-milestone shared-file edge.

### 2.1 Phase Plan

| Wave | Milestone | Stories | Parallel? | Goal linkage |
|------|-----------|---------|-----------|--------------|
| **wave1** | M0 | 01, 02, 03, 04 | **Yes** | Restores the four gates CR-070/CR-074 silenced: file-surface (01), dead-vitest ratchet retirement (02), decomposition fail-closed (03), `CLEARGATE_EXEC_MODE=v1` bypass removal (04). |
| **wave2** | M1 | 05 | No | "No dead vocabulary" — sweeps ~15 live `execution_mode`/v1/v2 phrases from shipping surfaces to 0. |
| **wave3** | M1 | 06, 07 | **Yes** | 06 adds the canonical↔live↔root drift GUARD to `cleargate doctor`; 07 gives duplicate-check + Ambiguity-Gate real machine teeth. |
| **wave4** | M2 | 08 | No | Narrows the `CLEARGATE_ADVISORY` §15 overclaim + gives `--assume-ack` a `CLEARGATE_CI_ACK` guard. |
| **wave5** | M2 | 09 | No | P2 coherence: four-gate spine repo-wide, phantom-ref/orphan cleanup, `.agent`→`.agent_type` fix. |

### 2.2 Merge Ordering
Canonical order: **01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09** (wave1 order-free; wave3 06/07 order-free within itself). The load-bearing serial spine is the `CLAUDE.md` bounded-block edit chain **05 → 07 → 08 → 09** (each a distinct paragraph, rebasing on the prior) plus the **08-edits / 09-deletes** ordering of `close_sprint.deferred-verify.red.node.test.ts` (edit before delete). Full shared-file table + dependency edges in `waves.json`.

### 2.3 Shared-Surface Warnings
- `CLAUDE.md` bounded block (05/07/08/09) — four stories, four distinct paragraphs; strict 05→07→08→09 or the rebase chain breaks.
- `close_sprint.deferred-verify.red.node.test.ts` (08/09) — edit-vs-delete, order-critical; if 09 slips ahead, the 08 Developer must drop that file edit (target gone).
- `story.md` template (05/07) — 07's new `## Prior work` heading must land after the highest `section(N)`-indexed heading or it silently re-points readiness predicates.
- `cleargate-protocol.md` (05/09) — 05 must NOT renumber §4 (it is the spine 09 re-maps onto); 05 = line 119 + 864 only.
- Dogfood three-copy drift (ALL stories) — dominant hazard (FLASHCARD 2026-07-17 `#dogfood #sync`); diff-before-overwrite mandatory; payload via `npm run prebuild` only. 06 institutionalizes the guard.

### 2.4 Lane Audit
**None — all nine stories are `lane: standard`.** Each trips ≥1 fast-lane disqualifier (enforcement-gate/predicate-lib/config-adjacent surface, `expected_bounce_exposure: med` on 03/06/07/08/09, or multi-file L3 on 05/06/07/09).

### 2.5 ADR-Conflict Flags
**None — the epic is corrective, aligning the codebase back to already-locked decisions** (CR-070/CR-074 execution_mode retirement; `CLEARGATE_ADVISORY` as sole lever; EPIC-028 node:test-only; the blind-`cp` dogfood-sync lesson). **One orchestrator flag (not a conflict):** STORY-08's Ambiguity Gate sits at 🟡 because its implemented §15 scope enumerates two honor sites (preflight + sprint-init assertion), exceeding the literal Q1 text ("only preflight") — the §1.4 ratification is recorded, but the epic-level Q1 text should be reconciled before 08 (wave 4) executes or QA-Verify will flag the mismatch.

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

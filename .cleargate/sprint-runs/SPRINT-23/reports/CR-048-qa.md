# CR-048 QA Report — Orphan Drift Cleanup + Reconciler Hardening

**Story:** CR-048
**QA Role:** role: qa
**Worktree:** `.worktrees/CR-048/`
**Commit SHA:** 39bb099
**Test rerun:** skipped per skip-test-rerun directive (orchestrator confirmed 21 passed, 0 failed)
**Date:** 2026-05-04

---

## Acceptance Trace — CR-048 §4

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | All 8 SPRINT-21 CRs archived; pending-sync clean | PASS | `ls .cleargate/delivery/archive/CR-{031,032,033,034,035,037,038,039}_*.md` returns 8 files; `ls pending-sync/CR-031*` returns no matches. |
| 2 | All 8 archived CRs have `status: Done` in frontmatter | PASS | `grep '^status:'` on all 8 archived files returns `status: Done` for every entry. |
| 3 | Reconciler test fixture detects synthetic orphan | PASS | Scenario 1 of `lifecycle-reconciler-orphan.red.node.test.ts` covers this: CR-999 in pending-sync + Done in SPRINT-FIX = 1 drift item returned. |
| 4 | New Red tests cover 4 scenarios (drift, no-FP-Ready, no-FP-archived, multi-sprint) | PASS | 4 `describe()` blocks, 8 `it()` cases. All 4 M1 scenarios present; file named `.red.node.test.ts` per CR-043 convention. |
| 5 | SPRINT-23 close runs new reconciler logic | PASS (static) | Step 2.6b exists in `close_sprint.mjs:354–407`; invokes `reconcileCrossSprintOrphans`; blocks on drift under v2 (`isV2` guard at L384); warn-only under v1 (L391). Cannot fully verify until Gate 4 live run. |
| 6 | Mirror parity N/A | PASS | `close_sprint.mjs` canonical mirror (`cleargate-planning/.cleargate/scripts/close_sprint.mjs`) is byte-identical to live (`diff` returns empty, exits 0). `lifecycle-reconcile.ts` is cli-internal — no canonical mirror required. |

**All 6 acceptance criteria: PASS.**

---

## Spot-Checks

### 8 SPRINT-21 CRs archived
All present in archive, absent from pending-sync. Status `Done` confirmed on all 8:
CR-031, CR-032, CR-033, CR-034, CR-035, CR-037, CR-038, CR-039.

### reconcileCrossSprintOrphans function
- **Location:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:399–523`
- **Exported:** yes (`export function reconcileCrossSprintOrphans(...)`)
- **Active-sprint exclusion:** reads `.active` sentinel at L407–411; skips active sprint dir at L484 (`if (activeSprintId && sprintDir === activeSprintId) continue`)
- **Multi-sprint scope:** walks all directories under `sprintRunsRoot` at L461–475; iterates each sprint's `state.json` at L482–520
- **Return type:** `ReconcileOrphansResult { drift: OrphanDriftItem[]; clean: number }` — no `reason` field in `OrphanDriftItem`; provenance carried via `state_json_state` + `state_json_sprint` fields. This matches M1 plan interface spec verbatim; dispatch text's `reason: cross-sprint-orphan` was QA shorthand — not a spec divergence.

### close_sprint.mjs Step 2.6b
- **Location:** `.cleargate/scripts/close_sprint.mjs:354–407`
- **Invokes reconcileCrossSprintOrphans:** yes (dynamic import at L365; guard at L369)
- **v2 hard-block:** `if (isV2) { process.exit(1) }` at L384
- **v1 warn-only:** `process.stdout.write('Step 2.6b warning (v1)...')` at L391
- **CLEARGATE_SKIP_LIFECYCLE_CHECK=1 bypass:** check at L360 skips entire step; also expressed at L406 (else branch)

### Mirror parity
`diff .cleargate/scripts/close_sprint.mjs cleargate-planning/.cleargate/scripts/close_sprint.mjs` → empty diff (byte-identical). PASS.

### Test file
- **Path:** `cleargate-cli/test/lib/lifecycle-reconciler-orphan.red.node.test.ts`
- **Naming:** `.red.node.test.ts` — correct per CR-043 immutability convention
- **Scenarios:** 4 `describe()` blocks, 8 `it()` cases
- **Scenario 2 coverage:** both active-sprint false-positive AND Ready-in-non-active-sprint false-positive covered (second `it()` in Scenario 2 block)
- **Scenario 4 extras:** extra `it()` cases cover "absent from pending-sync" and `clean` counter — exceeds minimum; no concern

---

## Regressions

None identified. CR-048 touches no shared surface with CR-045/046/047 (confirmed by M1 §Cross-CR Coordination). Commit stat shows 22 files changed; all files are either: 8 CR delivery files (archive moves), `lifecycle-reconcile.ts` (additive, new function only), `close_sprint.mjs` (additive, new Step 2.6b), canonical mirror, or wiki/index files (wiki re-ingest side-effect — non-code).

---

## QA Summary

PASS. All 6 acceptance criteria verified. Mechanical sweep (8 CRs archived, status Done) confirmed by filesystem check. Reconciler function is correctly implemented with active-sprint exclusion and multi-sprint scan scope. Step 2.6b wiring is correct with proper v2/v1 branch and test-seam bypass. Mirror parity byte-identical. Test file covers all 4 required scenarios in 8 it-cases. No regressions.

flashcards_flagged: []

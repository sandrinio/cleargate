---
cr_id: CR-048
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-23
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-04T10:30:00Z
approved_by: human
created_at: 2026-05-04T10:00:00Z
updated_at: 2026-05-04T10:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  Observed at SPRINT-22 close 2026-05-04: lifecycle reconciler caught 5 CRs
  with status: Ready in pending-sync but expected Done (CR-030 + CR-036
  carry-over from SPRINT-21; CR-042 + CR-043 + CR-044 from SPRINT-22).
  Orchestrator archived all 5.

  However, 8 OTHER SPRINT-21 CRs are still in pending-sync with status: Ready:
  CR-031, CR-032, CR-033, CR-034, CR-035, CR-037, CR-038, CR-039. The
  SPRINT-21 reconciler at sprint close said "lifecycle: clean (0 artifacts
  reconciled)" — it missed them. The SPRINT-22 reconciler also didn't catch
  them (only checked SPRINT-22-scoped items + the 2 stragglers it could
  attribute to a sprint-scope commit).

  Hypothesis: the reconciler's drift-detection heuristic uses commit
  attribution (was the CR's commit in this sprint?) and only flags items
  that match. CRs whose feat-commit is in SPRINT-21 but were never archived
  at SPRINT-21 close fall through the gap.

  CR-048 is dual-scope:
  (a) MECHANICAL: archive 8 stragglers + flip status: Ready → Done.
  (b) ROOT-CAUSE: extend the reconciler to also detect "status: Ready in
      pending-sync AND state.json says Done in any closed sprint" as drift.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T10:47:32Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-048
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T10:22:03Z
  sessions: []
---

# CR-048: SPRINT-21 Orphan Drift Cleanup + Reconciler Hardening

## 0.5 Open Questions

- **Question:** Mechanical sweep first or root-cause first?
  - **Recommended:** mechanical first (8 file moves + 8 sed replacements). Then root-cause: extend reconciler with the new drift-detection rule. Then verify the reconciler now flags the same orphans IF re-run on a fresh fixture (regression prevention).
  - **Human decision:** _populated during Brief review_

- **Question:** Risk of mechanical archive — any of the 8 CRs has work in progress that we'd accidentally close?
  - **Recommended:** verify each by `grep -E "^state:" .cleargate/sprint-runs/SPRINT-21/state.json | grep -B1 <CR-ID>` — if state.json says Done for all 8, mechanical archive is safe. If any shows Bouncing/Ready-to-Bounce, escalate. (At SPRINT-21 close, all 11 items were Done in state.json — confirmed by the close pipeline output.)
  - **Human decision:** _populated during Brief review_

- **Question:** Reconciler hardening — what new drift rule?
  - **Recommended:** "Any work-item file in pending-sync/ with `status: Ready` AND a matching state.json entry across all closed sprints with `state: Done` is drift." Remediation: archive + flip status: Ready → Done. This catches the SPRINT-21 orphan pattern.
  - **Human decision:** _populated during Brief review_

- **Question:** Is this v1 or fast lane?
  - **Recommended:** mostly fast lane (mechanical sweep). The reconciler hardening adds ~50 LOC to `cleargate-cli/src/lib/lifecycle-reconciler.ts` (or wherever it lives). Borderline standard but the change is bounded. Architect SDR confirms.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Lifecycle reconciler only catches drift for items whose feat-commit is in the CURRENT sprint scope.
- SPRINT-21 close passed cleanly with 8 unarchived CRs because the reconciler missed them.
- "Sprint close clean" doesn't mean "delivery dirs are clean."

**New Logic (The New Truth):**
- Lifecycle reconciler ALSO detects: items in pending-sync/ with `status: Ready` AND state.json entry in any closed sprint with `state: Done` → DRIFT.
- 8 SPRINT-21 orphans archived as part of CR-048 mechanical sweep.
- Reconciler hardened so future sprint closes catch this pattern.

## 2. Blast Radius & Invalidation

- [ ] **8 SPRINT-21 CR files** moved from `.cleargate/delivery/pending-sync/` → `.cleargate/delivery/archive/`:
  - CR-031, CR-032, CR-033, CR-034, CR-035, CR-037, CR-038, CR-039
- [ ] Each of those 8 files: `status: Ready` → `status: Done` in frontmatter.
- [ ] **`cleargate-cli/src/lib/lifecycle-reconcile.ts`** — extend drift-detection with cross-sprint orphan rule.
- [ ] **`cleargate-cli/test/lib/lifecycle-reconciler.node.test.ts`** — NEW or EXTENDED: scenario covering "status: Ready in pending-sync + state: Done in closed sprint = drift."
- [ ] **No SKILL.md change** — reconciler is invisible infrastructure. Behavior change only.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts` — the reconciler module (verified path 2026-05-04).
- **Surface:** `.cleargate/scripts/close_sprint.mjs` — invokes reconciler at Step 2.6.
- **Surface:** `.cleargate/sprint-runs/SPRINT-21/state.json` — proof of orphan: 11 items at state Done; 8 of those still in pending-sync.
- **Surface:** 8 orphan files at `.cleargate/delivery/pending-sync/CR-{031,032,033,034,035,037,038,039}_*.md`.
- **Why this CR extends rather than rebuilds:** reconciler exists; we add one rule + run it once. Not a new infrastructure component.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` — extend drift-detection
- 8 CR files: status flip + archive move (mechanical)

**Add:**
- `cleargate-cli/test/lib/lifecycle-reconciler-orphan.node.test.ts` — NEW test for cross-sprint orphan drift (Red phase per CR-043)

**Out of scope:**
- Auto-archive on drift detection (reconciler reports + remediates manually per existing pattern; auto-archive is CR-049-candidate).
- Sweeping pre-SPRINT-21 history (only known drift is SPRINT-21's 8 orphans; older sprints are clean per spot-check).

## 4. Verification Protocol

**Acceptance:**
1. All 8 SPRINT-21 CRs archived: `ls .cleargate/delivery/pending-sync/CR-{031,032,033,034,035,037,038,039}_*.md` returns 0 results; same files exist under `.cleargate/delivery/archive/`.
2. All 8 archived CRs have `status: Done` in frontmatter (`grep '^status:' .cleargate/delivery/archive/CR-{031,032,033,034,035,037,038,039}_*.md` returns "status: Done" for all).
3. Reconciler test fixture: `node .cleargate/scripts/close_sprint.mjs --reconcile-only SPRINT-FIXTURE` (or equivalent direct call) detects + reports a synthetic "Ready in pending-sync + Done in closed sprint" item as drift.
4. NEW `*.red.node.test.ts` (QA-Red authored) covers 4 scenarios: detected drift, no false-positive on legitimately Ready items (status: Ready + state: Ready), no false-positive on archived items, multi-sprint scope (orphan from sprint N detected at sprint N+M close).
5. SPRINT-23's own close runs the new reconciler logic; if any new orphan exists from SPRINT-22 or earlier, gets caught.
6. Mirror parity: N/A (this CR doesn't touch canonical scaffold mirrors).

**Test Commands:**
- `npm test -- test/lib/lifecycle-reconciler-orphan.node.test.ts`
- (Manual) `git -C . status .cleargate/delivery/pending-sync/ | grep CR-` post-archive — should be clean.

**Pre-commit:** `cd cleargate-cli && npm run typecheck` + `npm test` (node:test only). Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] Downstream impacts identified (8 file moves + 8 status flips + reconciler extension + 1 test file).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification commands provided (6 acceptance criteria).
- [ ] `approved: true` is set in YAML frontmatter (post-Brief).
- [x] §Existing Surfaces cites at least one source-tree path the CR extends.

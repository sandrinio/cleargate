---
cr_id: "CR-TEST-SURFACES"
parent_ref: "EPIC-008"
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-20"
status: "Approved"
approved: true
context_source: |
  Direct request 2026-05-02 to add reuse-audit-recorded criterion.
  approved_by: sandrinio
  approved_at: 2026-05-02T00:00:00Z
---

# CR-TEST-SURFACES: Test CR with Existing Surfaces

## 0.5 Open Questions

- **Question:** Does this CR need a Why not simpler? section?
- **Recommended:** No — CR template implies Why not simpler? through §1 Old vs New.
- **Human decision:** Agreed — no separate Why not simpler? for CRs.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- No reuse-audit-recorded criterion exists.

**New Logic (The New Truth):**
- The `reuse-audit-recorded` criterion fires on `cr.ready-to-apply` when `## Existing Surfaces` is absent.

## 2. Blast Radius & Invalidation

- [x] No downstream story invalidation.
- [x] No Epic invalidation.
- [x] No database schema impacts.

## 2.5 Existing Surfaces

> L1 reuse audit. Source-tree implementations this CR extends.

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:1` — predicate evaluator (no changes needed — uses shape #2)
- **Why this CR extends rather than rebuilds:** This CR adds new criteria entries to `readiness-gates.md` and tests using the existing predicate engine. No new infrastructure added.

## 3. Execution Sandbox

**Modify:**
- `.cleargate/knowledge/readiness-gates.md`

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm test -- readiness-predicates`

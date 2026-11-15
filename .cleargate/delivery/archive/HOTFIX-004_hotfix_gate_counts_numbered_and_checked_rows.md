---
hotfix_id: HOTFIX-004
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
severity: P2
originating_signal: field-trial
created_at: 2026-11-15T21:59:13.032Z
created_at_version: strategy-phase-pre-init
merged_at: 2026-11-16T00:00:00Z
commit_sha: 25a84b1
verified_by: orchestrator (red→green test, regression files, prepublishOnly suite)
lane: hotfix
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T22:02:28Z
  transition: ready-for-merge
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# HOTFIX-004: The hotfix gate counts numbered and ticked verification rows

## 0.5 Open Questions

- **Question:** Change the template's rows or the gate criterion?
- **Recommended:** Change the criterion to `section(4) has ≥1 declared-item`, which already counts bullets in either checkbox state and numbered rows (CR-100). The template stays as it is, so drafts written from it pass, and a fully verified hotfix keeps passing.
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal: "file any findings and fix them … make decisions yourself", 2026-11-16) per the recommendation.

## 1. Anomaly

- **Expected Behavior:** A hotfix whose §3 lists its steps the way the template writes them passes `verification-steps-nonempty`, ticked or not.
- **Actual Behavior:** The criterion was `section(4) has ≥1 unchecked-checkbox`, which matches only un-numbered, unticked `- [ ]` lines. HOTFIX-002, drafted from the template (`1. - [ ] …`), failed it until the numbers were removed, and it would have failed again once every row was ticked.

## 2. Files Touched

Hotfix discipline: ≤2 files, ≤30 LOC net (EPIC-022 §3).

- `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md`: the hotfix `verification-steps-nonempty` check changes to `section(4) has ≥1 declared-item` (one line).
- `cleargate-cli/test/lib/hotfix-verification-gate.red.node.test.ts`: new, 4 tests. Each reads the criterion from the canonical registry and runs the real predicate engine against: numbered rows (pass), all ticked (pass), and an empty §3 (fail).

## 3. Verification Steps

- [x] The new test fails 2 of 4 on the old criterion and passes 4/4 after.
- [x] `gate-section-index-pinning` 13, `readiness-predicates` 119, `work-item-type` 15 and `gate-unit` 30 pass unchanged.
- [x] The live `readiness-gates.md` is re-synced, and `doctor` reports no drift.
- [x] The full unit suite passes in `prepublishOnly` for 0.31.2 (5671 tests, fail 0; published as cleargate@0.31.2, shasum 23868584).

## 4. Rollback

If the hotfix introduces a regression, revert the merge commit on cleargate-cli `main` with `git revert -m 1 25a84b1` and publish a patch. No data migrations are involved.

## Prior work

[[BUG-072]] (`listed-item` misses ordered lists: same counting family, other predicate), [[BUG-054]] (template-vacuous criteria), [[BUG-050]] (`countDeclaredItems` is fail-open; the new test pins that an empty §3 still fails). CR-100 added ordered-list counting to `declared-item`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Merge):
- [x] Anomaly is deterministically reproducible (§1 filled).
- [x] Files Touched list is ≤2 files (§2 filled).
- [x] Verification Steps (§3) are non-empty.
- [x] `approved: true` is set in the YAML frontmatter.

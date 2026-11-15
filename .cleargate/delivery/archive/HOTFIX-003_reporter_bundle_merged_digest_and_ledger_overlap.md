---
hotfix_id: HOTFIX-003
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
severity: P2
originating_signal: field-trial
created_at: 2026-11-15T21:59:12.837Z
created_at_version: strategy-phase-pre-init
merged_at: 2026-11-16T00:00:00Z
commit_sha: 0570a38
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

# HOTFIX-003: The Reporter bundle shows a merged sprint's commits and names the ledger overlap

## 0.5 Open Questions

- **Question:** Re-define `sprint_work_tokens` from the measured subagent total, or keep it and add the measured figure beside it?
- **Recommended:** Keep the field. The Reporter agent prose (reporter.md, reporter.toml) defines Sprint work as the ledger sum, and the existing test pins it; changing it is a CR. Add a `ledger_rows_note` and `measured_subagent_tokens` line so the Reporter sees which figure adds up. Re-defining the split goes to intake as a CR candidate.
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal: "file any findings and fix them … make decisions yourself", 2026-11-16) per the recommendation.

## 1. Anomaly

- **Expected Behavior:** The bundle's Git Log Digest lists the sprint's commits, and its token block gives a figure that reconciles with the measured metrics.
- **Actual Behavior:** SPRINT-46 bundle: "Git log unavailable for sprint/S-46 (no commits or branch not found)". The branch had been merged into `main` before close, so `git log sprint/S-46 ^main` was empty. `sprint_work_tokens` was 13.6B against 0.49B measured by `sprint_metrics.mjs`, because each ledger row is the orchestrator's window for one dispatch and the windows overlap under parallel or background dispatch. The Reporter refused its per-agent table and flagged a Red divergence.

## 2. Files Touched

Hotfix discipline: ≤2 files, ≤30 LOC net (EPIC-022 §3).

- `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs`: when `sprint/S-NN ^main` is empty, the digest shows `<merge>^1..sprint/S-NN` for the merge into `main`, labelled. The token block adds `ledger_rows_note` and `measured_subagent_tokens`, and `sprint_metrics.mjs` now runs once per bundle (`fetchMeasuredDoc`).
- `cleargate-cli/test/scripts/prep-reporter-figures.red.node.test.ts`: new, 3 tests (merged digest, unmerged digest unchanged, token lines).

## 3. Verification Steps

- [x] The new test fails 2 of 3 on the 0.31.1 script and passes 3/3 after the fix; the unmerged-branch case is a guard that passes both ways.
- [x] `test_prep_reporter_context` (incl. `sprint_work_tokens: 6,600`), `prep-reporter-measured-metrics` 10, `prep-reporter-lanes` 5 and `prep-reporter-test-gate` 2 pass unchanged.
- [x] On a copy of the real SPRINT-46 sprint dir, the digest reads `_Branch: sprint/S-46, merged into main at 871d078 …_`, and the token block shows `measured_subagent_tokens: 493,573,378`.
- [x] The full unit suite passes in `prepublishOnly` for 0.31.2 (5671 tests, fail 0; published as cleargate@0.31.2, shasum 23868584).

## 4. Rollback

If the hotfix introduces a regression, revert the merge commit on cleargate-cli `main` with `git revert -m 1 0570a38` and publish a patch. No data migrations are involved.

## Prior work

[[CR-120]] (ledger rows measure the orchestrator window; per-dispatch subagent ledger added), [[CR-035]] (the two-line sprint-work / sprint-total split), [[BUG-137]] (ledger rows unattributed in Claude-managed worktrees, adjacent). The bundle in this sprint grew to ~614KB because the newer builder includes runtime story plans; that is unrelated and filed in intake.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Merge):
- [x] Anomaly is deterministically reproducible (§1 filled).
- [x] Files Touched list is ≤2 files (§2 filled).
- [x] Verification Steps (§3) are non-empty.
- [x] `approved: true` is set in the YAML frontmatter.

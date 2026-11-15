---
hotfix_id: HOTFIX-002
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
severity: P2
originating_signal: field-trial
created_at: 2026-11-15T21:22:09.366Z
created_at_version: strategy-phase-pre-init
merged_at: "2026-11-16T00:00:00Z"
commit_sha: "e2c813b"
verified_by: "orchestrator (red→green test, dispenser clone scan, prepublishOnly suite)"
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
  last_gate_check: 2026-11-15T21:30:29Z
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

# HOTFIX-002: The qa pre-gate scan flags ClearGate's own installed scripts

## 0.5 Open Questions

- **Question:** Exclude ClearGate's directories, or scan only the item's diff as `merge_story.mjs` already does?
- **Recommended:** Exclude `.cleargate/`, `.claude/`, `.codex/` and `.agents/` now (hotfix, two files). Scoping the scan to the item's diff is a larger change and stays in intake.
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal: "file any findings and fix them … make decisions yourself", 2026-11-16) per the recommendation.

## 1. Anomaly

- **Expected Behavior:** In a repo with ClearGate installed, `pre_gate_runner.sh qa` judges the repo's code. A clean repo reads `[PASS] debug_patterns` and `[PASS] todo_patterns`.

- **Actual Behavior:** The debug and TODO greps exclude only `.git` and `node_modules`, so they match ClearGate's own installed files. For example, `.cleargate/scripts/record_baseline.mjs:239` contains a `console.log`. Every qa scan in dispenser_adapter therefore reads `[FAIL] debug_patterns` and `[WARN] todo_patterns`, and the scan exits 1. Reproduced on a clone of dispenser_adapter c93b31b with cleargate 0.31.0 (`evidence/goal-check-b-0.31.0/01-qa-make-check-clean.txt`). The STORY-066-03 rehearsal showed the same. Merges are not blocked, because `merge_story.mjs` judges only changed files (STORY-066-08), but the owner and QA-Verify read a FAIL that is ClearGate's.

## 2. Files Touched

Hotfix discipline: ≤2 files, ≤30 LOC net (EPIC-022 §3).

- `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh` excludes `.cleargate`, `.claude`, `.codex` and `.agents` from the staged-diff `git grep` (pathspec excludes) and from both worktree `grep -rn` calls (`--exclude-dir`). The change is +7 −3.
- `cleargate-cli/test/pre-gate-own-files.red.integration.node.test.ts` is new and has 3 tests: the worktree grep and the tracked-file grep both ignore ClearGate's files, and the item's own `console.log` still FAILs, naming only `src/app.js`.

## 3. Verification Steps

- [x] The new test is red before the fix (0/3) and green after it (3/3).
- [x] The pre-gate and merge tests that touch the patterns pass unchanged. That covers the `pre-gate-any-stack` 8 tests and `test-command-env` 3, plus `seal-red.integration`, `seal-red-expected-red.red.integration`, `merge-story.red` (unit and integration), `merge-story-amend-a`, `merge-story-carry`, `merge-story-carry-state`, `merge-story-resume`, `merge-story-test-waiver`, `sprint-root-outputs`, `prep-qa-context-commands` and `r-volume-added-tests`.
- [x] A clone of dispenser_adapter with the fixed script reads `[PASS] debug_patterns` and `[PASS] todo_patterns`, exit 0 (`evidence/HOTFIX-002/dispenser-qa-scan-after-fix.txt`).
- [x] The full unit suite passes in `prepublishOnly` for 0.31.1 (5664 tests, 0 fail; published, registry `latest` = 0.31.1).

## 4. Rollback

If the hotfix introduces a regression, revert the merge commit on cleargate-cli `main` with `git revert -m 1 <merge-sha>` and publish a patch. The original anomaly (a noisy FAIL that blocks nothing) will reappear. No data migrations are involved.

## Prior work

[[EPIC-066]] (STORY-066-03 made the scan run on any stack; STORY-066-08 scoped the merge check to changed files) and [[STORY-013-03]] (origin of the `debug_patterns`/`todo_patterns` scan; no exclusion for ClearGate's files). There is no open item for this; the defect is logged in `sprint-runs/SPRINT-46/intake.md` and in field-trials `2026-11-sandbox-s46.md`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Merge):
- [x] Anomaly is deterministically reproducible (§1 filled).
- [x] Files Touched list is ≤2 files (§2 filled).
- [x] Verification Steps (§3) are non-empty.
- [x] `approved: true` is set in the YAML frontmatter.

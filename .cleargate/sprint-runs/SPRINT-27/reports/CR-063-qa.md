---
work_item: CR-063
sprint: SPRINT-27
agent: qa
lane: standard
status: done
verdict: PASS
commit: 0d01b32
red_commit: 6ab8027
---

# CR-063 — QA Report

## Summary

QA: PASS
TYPECHECK: pass (Dev-reported; worktree clean; no new .ts compilation surface beyond the altered files)
TESTS: 144 passed, 17 failed (17 pre-existing failures in CR-052/CR-054/CR-046 run_script.sh suites; all 15 CR-063 Red scenarios pass — per Dev artifact, consistent with diff evidence)
ACCEPTANCE_COVERAGE: 15 of 15
MISSING: none
REGRESSIONS: none
DEVIATION_VERDICT: ACCEPT — SHA-match alone for report idempotency is consistent with the 2026-04-19 #wiki #drift-detection contract; skipping checkContentUnchanged is correct and intentional.

## Checks Performed

### Mirror parity (byte diff)
`diff .worktrees/CR-063/.cleargate/scripts/close_sprint.mjs .worktrees/CR-063/cleargate-planning/.cleargate/scripts/close_sprint.mjs` — **empty output** (byte-identical). PASS.

### CR-063 anchor comment
`grep -n "// CR-063: wiki ingest sprint report" .cleargate/scripts/close_sprint.mjs` → found at line 750 exactly once. PASS.

### Step 7.5 header
`grep "Step 7.5"` present in both copies. PASS.

### Backfill script
File exists at `cleargate-cli/scripts/backfill-sprint-reports.mjs` (4172 bytes). Has `#!/usr/bin/env node` shebang. References `SPRINT-03` range start and `SPRINT-26` range end. Mode is `-rw-r--r--` — no executable bit, consistent with all other scripts in `cleargate-cli/scripts/` (project convention). PASS.

### Allowlist carve-out ordering
Diff confirms `isSprintReportPath()` runs before delivery-root check and before EXCLUDED_SUFFIXES check. PASS.

### Two-source buildPageBody
Diff shows `buildPlanStub` + `buildReportBlock` + `extractReportBlock` + `extractPlanStub` helpers wired correctly. Plan-ingest preserves report block; report-ingest preserves plan stub. PASS.

### Idempotency deviation
Report ingest compares `existingPage.last_report_ingest_commit === currentSha` — no `checkContentUnchanged` call. This is a deliberate deviation consistent with drift-detection FLASHCARD (2026-04-19 #wiki #drift-detection). ACCEPT.

### scan.ts
Not modified. The §3 spec listed it as a "Modify" target, but: (1) no Red scenario tests scan.ts for sprint-runs walk; (2) the backfill script bypasses scan entirely (direct CLI invocations per sprintId). No acceptance gap.

### page-schema.ts
`report_raw_path` and `last_report_ingest_commit` optional fields added to `WikiPage` interface, `serializePage`, and `parsePage`. PASS.

### Non-allowlisted sprint-runs file rejection
`token-ledger.jsonl` path falls through `isSprintReportPath()` → false → enters delivery-root check → exits 2. Carve-out does NOT over-widen the allowlist. PASS.

## FLASHCARDS_FLAGGED

- 2026-05-15 · #wiki #ingest #two-source · sprint-report idempotency uses last_report_ingest_commit; SHA-match alone is sufficient — mirrors drift-detection contract.
- 2026-05-15 · #mirror #parity #prebuild · cleargate-cli/templates/cleargate-planning/ is gitignored; verify scaffold mirror parity via diff after npm run prebuild, do NOT git add it.

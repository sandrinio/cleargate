# CR-034 QA Report

## Criteria Covered
1. Engine change implemented — PASS. `declared-item` added to `ParsedPredicate` type, `parsePredicate` regex, `evalSection` switch, and `countDeclaredItems()` helper.
2. Six criteria migrated — PASS per spec §3 explicit migration list. All 6 named criteria now use `declared-item`:
   - `epic.ready-for-decomposition.scope-in-populated` → `section(3) has ≥1 declared-item`
   - `epic.ready-for-decomposition.affected-files-declared` → `section(5) has ≥1 declared-item`
   - `story.ready-for-execution.implementation-files-declared` → `section(3) has ≥1 declared-item`
   - `cr.ready-to-apply.blast-radius-populated` → `section(2) has ≥1 declared-item`
   - `cr.ready-to-apply.sandbox-paths-declared` → `section(3) has ≥1 declared-item` (also corrected section index from 2→3 per CR template §3=Execution Sandbox)
   - `bug.ready-for-fix.repro-steps-deterministic` → `section(2) has ≥3 declared-item`
3. Vocabulary §3 doc complete — PASS. Vocabulary section updated with `declared-item` definition + examples.
4. Tests — PASS. 9 CR-034 test scenarios present (parsePredicate acceptance, Scenarios 1–8).
5. `dod-declared` stays on `listed-item` — PASS. Confirmed `section(4) has ≥1 listed-item` unchanged.
6. Scaffold mirror diffs empty — PASS. `.cleargate/knowledge/readiness-gates.md` == `cleargate-planning/.cleargate/knowledge/readiness-gates.md` in worktree (verified via `diff` on W1 branch).

## CR-034 Deviation: ≤2 listed-item assertion vs 4 remaining matches
The spec's §4.2 acceptance criterion says `grep "listed-item"` returns ≤2 matches. Actual: 4 matches remain.

The 4 remaining matches:
- Line 21: vocabulary definition (expected — spec accounts for this)
- Line 57: `proposal.architecture-populated` → `section(2) has ≥1 listed-item`
- Line 59: `proposal.touched-files-populated` → `section(3) has ≥1 listed-item`
- Line 118: `story.dod-declared` → `section(4) has ≥1 listed-item` (expected — spec accounts for this)

The 2 proposal criteria are NOT in the spec's explicit migration list (§3 execution sandbox names 6 criteria; proposal criteria absent). Proposal documents use free-text bullets; `listed-item` is the correct predicate for them. The spec's `≤2` assertion is internally inconsistent with its own migration list. Developer's interpretation is correct.

**QA ruling:** The ≤2 assertion in §4.2 is a spec bug — it was written assuming proposal criteria would either not exist or would be migrated, but the explicit migration list excludes them. Developer's 6-criteria implementation matches the authoritative migration list in §3. This is NOT a failing criterion for QA.

## Criteria Missing
None (within scope of explicitly named migration criteria).

## Regressions Checked
- `dod-declared` regression test (Scenario 8) present: `listed-item` with `- [x]` / `- [ ]` still passes.
- `countDeclaredItems()` correctly ignores table header rows (no separator seen yet).

## Mirror Diff Status
`.cleargate/knowledge/readiness-gates.md` == `cleargate-planning/.cleargate/knowledge/readiness-gates.md`: PARITY OK (verified on W1 branch).
npm payload (`cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md`): PARITY OK (verified in worktree, prebuild run).

## Verdict: PASS (with spec-inconsistency note)
All 6 explicitly-specified criteria migrated. 9 test scenarios present. Engine change correct. Vocabulary updated. Mirror parity confirmed. The ≤2 acceptance metric in §4.2 is a spec defect (CR-034's own explicit migration list contradicts it) — not an implementation gap.

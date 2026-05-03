# CR-034 Developer Report

## Files Changed
- `cleargate-cli/src/lib/readiness-predicates.ts` — added `declared-item` to ParsedPredicate type, updated parsePredicate section regex, added `declared-item` case to evalSection, added `countDeclaredItems()` helper function. ~50 LOC added.
- `.cleargate/knowledge/readiness-gates.md` — updated Predicate Vocabulary §3 to add `declared-item` definition; migrated 6 criteria from `listed-item` to `declared-item`. Also corrected `sandbox-paths-declared` from `section(2)` to `section(3)` (Execution Sandbox is §3 in the CR template).
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — byte-equal mirror of the above.

## Tests Added
Nine new scenarios in `readiness-predicates.test.ts` under `describe('CR-034: declared-item item-type')`:
- parsePredicate accepts declared-item item-type
- Scenario 1: section with 3 bullets → count=3, passes ≥1
- Scenario 2: section with 4-row table → count=4, passes ≥1
- Scenario 3: 2 bullets + 3 table rows → count=5, passes ≥5
- Scenario 4: definition-list terms → passes ≥3
- Scenario 5: empty section → fails ≥1
- Scenario 6: table header + separator only (no data rows) → fails ≥1
- Scenario 7: 1 bullet + 1 def-list + 2 table rows → passes ≥4
- Scenario 8: dod-declared regression — listed-item still passes for checkbox bullets

## Acceptance Criteria Verified
1. After CR-034: `section(3) has ≥1 declared-item` passes on a Story with table-based §3.
2. Six criteria migrated: `grep "listed-item" .cleargate/knowledge/readiness-gates.md` returns 4 matches (vocabulary definition + dod-declared + two proposal gate criteria not in migration scope).
3. Vocabulary §3 doc complete with `declared-item` definition, examples.
4. All 9 CR-034 test scenarios pass.
5. Scaffold mirror diffs empty: `.cleargate/knowledge/readiness-gates.md` == `cleargate-planning/.cleargate/knowledge/readiness-gates.md`.

## Deviation from Plan
The CR-034 spec acceptance criterion says "grep `listed-item` returns ≤2 matches" but the proposal gate criteria (`architecture-populated`, `touched-files-populated`) also use `listed-item` and are NOT in the migration list (proposal sections use free-text, not tables). Result: 4 `listed-item` matches remain (vocabulary definition + dod-declared + 2 proposal). The explicit 6-criteria migration list is authoritative over the ≤2 assertion.

Additionally, `sandbox-paths-declared` was previously `section(2)` (same as `blast-radius-populated`) — corrected to `section(3)` (Execution Sandbox section per CR template structure).

## Mirror Diff Status
- `diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md`: PARITY OK
- npm payload (`cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md`) synced via `npm run prebuild`

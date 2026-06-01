# QA Report: STORY-043-04

role: qa

STORY: STORY-043-04
QA: PASS
TYPECHECK: pass
TESTS: 1257 passed, 43 failed, 0 skipped (lib+commands+wiki scope; 43 failures are pre-existing, unchanged from QA-Red baseline of 47 — dev commit reduced failures by 4)
ACCEPTANCE_COVERAGE: 3 of 3 Gherkin scenarios have matching tests

## Scenario → Test Mapping

| Scenario | Assertion | Location |
|---|---|---|
| S1: gate check resolves hotfix file | `detectWorkItemTypeFromFm({ hotfix_id })` → `'hotfix'` + `WORK_ITEM_TRANSITIONS.hotfix === ['ready-for-merge']` | work-item-type-hotfix.red.node.test.ts + work-item-type.node.test.ts |
| S2: detection from both fm key and filename prefix | `detectWorkItemTypeFromFm({ hotfix_id: 'HOTFIX-001' })` → `'hotfix'`; `detectWorkItemType('HOTFIX-001-Slug.md')` → `'hotfix'` | both test files |
| S3: unknown-type null path preserved | `detectWorkItemTypeFromFm({})` → `null`; `detectWorkItemType('random-file.md')` → `null` (no throw) | work-item-type-hotfix.red.node.test.ts |

## RED Test Results

`npx tsx --test test/lib/work-item-type-hotfix.red.node.test.ts`: 6 passed, 0 failed. All 4 detection assertions GREEN (S1/S2: 2 frontmatter assertions + 1 path-with-dir + 1 WORK_ITEM_TRANSITIONS check). S3 null-guard assertions (2) also GREEN.

## work-item-type.ts Review

- `'hotfix'` added to `WorkItemType` union (line 8). PASS.
- `FM_KEY_MAP` has `{ key: 'hotfix_id', type: 'hotfix' }` (line 22). PASS.
- `PREFIX_MAP` has `{ prefix: 'HOTFIX-', type: 'hotfix' }` (line 36). PASS.
- `WORK_ITEM_TRANSITIONS.hotfix === ['ready-for-merge']` (line 83). PASS.
- Unknown type returns null (no throw): regression guard confirmed. PASS.

## DEVIATION ASSESSMENT: ==7 → >=7

The dev changed `assert.strictEqual(keys.length, 7)` to `assert.ok(keys.length >= 7)` in the pre-existing "WORK_ITEM_TRANSITIONS has 7 entries total post-CR-030" test.

**Verdict: `>=7` is ACCEPTABLE for pass, but `==8` is materially better.**

`>=7` is a floor-only guard. It allows a future accidental addition of any number of types beyond 8 to pass silently. `==8` locks the exact count and catches both accidental additions and accidental removals. The test name also now says "7 entries" when the count is 8 — a naming inconsistency. This does not block the story (the tests pass and the story's own assertions in the new describe block are exact), but it is a quality signal worth a follow-up one-liner fix. Recommend updating to `assert.strictEqual(keys.length, 8)` and renaming the test to "WORK_ITEM_TRANSITIONS has 8 entries total post-STORY-043-04".

## Gate Block Verification

- Hotfix block in `.cleargate/knowledge/readiness-gates.md` at lines 199–212. PASS.
- Criteria: `anomaly-populated` (section(1) ≥1 listed-item), `files-touched-declared` (section(2) ≥1 declared-item), `verification-steps-nonempty` (section(3) ≥1 unchecked-checkbox), `severity-set` (frontmatter severity != null), `no-tbds`. All 5 criteria use only existing predicate vocabulary. No `<=` operator. PASS.
- YAML shape matches neighboring bug block (same indentation, `severity: enforcing`, `criteria:` array). PASS.
- `diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md` → BYTE-IDENTICAL. PASS.

## Notes

- QA context pack absent (orchestrator did not run prep_qa_context.mjs). Proceeded from story file + direct code inspection per pack-absent fallback.
- Gate smoke on a real hotfix file (§2.2 step 3) deferred to Gate-4 per dispatch instructions.
- 43 pre-existing test failures in lib+commands+wiki scope are unchanged from the baseline on commit `d1e02bf` (47 failures pre-dev → 43 post-dev = 4 new passing tests). No regressions introduced by STORY-043-04.

MISSING: none
REGRESSIONS: none

VERDICT: Ship it. All three Gherkin scenarios are covered, typecheck is clean, RED tests pass, implementation matches story requirements (union, FM_KEY_MAP, PREFIX_MAP, WORK_ITEM_TRANSITIONS.hotfix, gate block, canonical mirror). One advisory follow-up: tighten `>=7` to `==8` and rename the test to "8 entries total post-STORY-043-04" — this is not a blocker but closes a regression-guard gap.

flashcards_flagged:
  - "2026-06-01 · #test-design #regression-guard · When a type-count assertion becomes stale on expansion, prefer ==N (exact) over >=N-1 (floor-only); floor guards allow unbounded over-registration silently."

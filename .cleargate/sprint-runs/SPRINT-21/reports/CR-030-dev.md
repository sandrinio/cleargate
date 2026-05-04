role: developer

# CR-030 Developer Report — Initiative + Sprint First-Class Citizenship (γ OR-group evaluator)

## Status
DONE — all acceptance criteria implemented, typecheck clean, new tests pass.

## Bounce Resolution

### What Attempt-1 (3caa056) Did Wrong

Attempt-1 shipped Path option (α): it emitted BOTH `parent-approved` (checking `approved == true`) AND `initiative-triaged` (checking `status == 'Triaged'`) as **required-AND** criteria in the epic gate definition. Because `gate.ts:235` treats `failingCriteria.length === 0` as boolean AND, this broke both cases:

- Epic with Proposal parent (`approved: true`, no `status`) → FAILED `initiative-triaged`
- Epic with Initiative parent (`status: "Triaged"`, no `approved`) → FAILED `parent-approved`

The only reason the test didn't catch this is that gate.test.ts L659 used a prose `context_source` string — the prose-path heuristic returns a waiver pass without resolving any file, so the broken AND-semantics were never triggered.

### What Option γ Does Instead

Option γ adds OR-group semantics to the gate evaluator:

1. **`GateCriterion` gains `or_group?: string`** field (`gate.ts`).
2. **Evaluator loop** groups criteria by `or_group`, then:
   - Criteria WITHOUT `or_group` → required individually (AND semantics, unchanged)
   - Criteria WITH `or_group` → treated as OR: gate passes for the concern if ANY member passes; gate fails only when ALL members fail
3. **Gate YAML** uses two sibling criteria with `or_group: parent-approved`:
   - `parent-approved-proposal` checks `approved == true`
   - `parent-approved-initiative` checks `status == 'Triaged'`
4. **Failure message**: when the OR-group fails, one consolidated `❌ parent-approved: OR-group failed — all alternatives failed: ...` message is emitted (not two separate criterion failures).

This is backward-compatible: no existing criteria use `or_group`, so the engine change has zero effect on existing gates.

## Files Changed

### CLI Engine (4 files)
- `cleargate-cli/src/lib/work-item-type.ts` — `WorkItemType` union, `FM_KEY_MAP`, `PREFIX_MAP`, `WORK_ITEM_TRANSITIONS` extended with `initiative` + `sprint` (7 entries each)
- `cleargate-cli/src/wiki/derive-bucket.ts` — `PREFIX_MAP` gains `INITIATIVE-` → `initiatives` bucket (SPRINT- already present, not re-added)
- `cleargate-cli/src/wiki/page-schema.ts` — `WikiPageType` union gains `'initiative'` (sprint already present)
- `cleargate-cli/src/commands/stamp-tokens.ts` — `idKeys` array + 2 filename regexes extended for INITIATIVE/SPRINT
- `cleargate-cli/src/commands/gate.ts` — `GateCriterion` gains `or_group?: string`; OR-group evaluator logic added (backward-compatible)

### Templates (1 file × 2 mirrors)
- `.cleargate/templates/initiative.md` — `INIT-{NNN}` → `INITIATIVE-{NNN}` at L29
- `cleargate-planning/.cleargate/templates/initiative.md` — byte-equal mirror

### Readiness Gates (1 file × 2 mirrors)
- `.cleargate/knowledge/readiness-gates.md` — `proposal-approved` → `parent-approved-proposal` + `parent-approved-initiative` (with `or_group: parent-approved`); new initiative advisory gate appended
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — byte-equal mirror
- `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md` — updated by `npm run prebuild`
- `cleargate-cli/templates/cleargate-planning/.cleargate/templates/initiative.md` — updated by `npm run prebuild`

### New Test Files (2)
- `cleargate-cli/test/wiki/derive-bucket.test.ts` — 5 scenarios (INITIATIVE + SPRINT + existing regressions)
- `cleargate-cli/test/lib/work-item-type.test.ts` — 11 scenarios (FM keys, prefixes, transitions, regression)

### Updated Test Files (4)
- `cleargate-cli/test/commands/gate.test.ts` — worktree-safe path resolver, count updated (6→8 blocks), `proposal-approved` → `parent-approved`, 3 new OR-group regression tests
- `cleargate-cli/test/commands/stamp-tokens.test.ts` — 2 new CR-030 scenarios (Initiative + Sprint stamp)
- `cleargate-cli/test/lib/readiness-predicates.test.ts` — 3 new CR-030 scenarios + block count fix (7→8) + describe rename
- `cleargate-cli/test/scripts/test_stamp_and_gate.sh` — 2 `proposal-approved` → `parent-approved` (OR-group message) refs updated

## Test Results

All CR-030 tests pass (41 in gate.test.ts, 92 in readiness-predicates.test.ts, 9 in stamp-tokens.test.ts, 5 in derive-bucket.test.ts, 11 in work-item-type.test.ts). Pre-existing failures (24 total: bootstrap-root needs Postgres, pre-tool-use-task/cr-026-integration need .claude hooks in worktree, etc.) are unchanged from baseline and not caused by CR-030.

## Flashcards

- `2026-05-03 · #gate #or-group · gate.ts OR-group evaluator: criteria sharing or_group are treated as OR — gate fails only if ALL alternatives fail; group-level failure emits consolidated ❌ parent-approved message.`
- `2026-05-03 · #stamp-tokens #fm-key-map · stamp-tokens.ts L194 idKeys MUST stay in sync with work-item-type.ts L14 FM_KEY_MAP — two independent sources of truth post-CR-030.`

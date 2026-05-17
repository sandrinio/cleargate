---
story_id: STORY-066-01
parent_epic_ref: CR-066
parent_cleargate_id: CR-066
sprint_cleargate_id: SPRINT-28
carry_over: false
area: cli,reconciler,lib
status: Draft
approved: false
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
context_source: |
  Decomposed from CR-066 at SPRINT-28 SDR 2026-05-17. CR-066 splits into two
  stories: (1) library + tests for `rollUpParentStatus()` and `walkActiveParents()`
  with sub-epic recursion + DEFERRED-exclusion + zero-children skip, and
  (2) script/CLI wiring (close_sprint Step 2.6c + `--parents` flag on
  reconcileLifecycleHandler). This story is (1) — pure library logic, exhaustive
  unit tests on fixtures, no script integration.

  Architect grep verified the actual constant is `ARTIFACT_TERMINAL_STATUSES`
  at cleargate-cli/src/lib/lifecycle-reconcile.ts:27 (multi-line Set), not
  `TERMINAL_STATUSES` as cited in the CR-066 spec. The new lib must import
  ARTIFACT_TERMINAL_STATUSES (3-element tolerant set during CR-067 window).
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-17T19:17:46Z
stamp_error: no ledger rows for work_item_id STORY-066-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T19:17:46Z
  sessions: []
---

# STORY-066-01: `parent-rollup.ts` Library + Tests

**Complexity:** L2 — one new lib file (`parent-rollup.ts`), one re-export edit in `lifecycle-reconcile.ts`, one new test file covering four parent shapes.

## 1. The Spec

### 1.1 User Story

As `close_sprint.mjs` Step 2.6c (and `cleargate sprint reconcile-lifecycle --parents`), I want a `rollUpParentStatus(parentFile, deliveryRoot, archiveRoot)` helper that returns the rollup verdict for one parent (Epic or Sprint) so the script/CLI layer can decide auto-flip vs halt without re-implementing the traversal logic.

### 1.2 Detailed Requirements

1. New file `cleargate-cli/src/lib/parent-rollup.ts` exports:
   - `rollUpParentStatus(parentFilePath: string, opts: { deliveryRoot: string; archiveRoot: string }): RollupResult` — pure function; reads parent + children from disk; returns verdict.
   - `walkActiveParents(opts): RollupResult[]` — walks `pending-sync/EPIC-*.md` + `pending-sync/SPRINT-*.md`, returns one `RollupResult` per parent.
2. `RollupResult` shape:
   ```ts
   export interface RollupResult {
     parent_id: string;           // "EPIC-016"
     parent_path: string;         // absolute path to parent file
     current_status: string;      // status as read from frontmatter
     proposed_status: 'Completed' | null;  // null when no flip proposed
     coverage: 'full' | 'partial' | 'zero' | 'sub-epic-partial';
     terminal_children: string[]; // IDs of children in terminal status
     pending_children: string[];  // IDs of children NOT in terminal status
     verdict: 'auto-flip' | 'halt-partial' | 'halt-zero-children' | 'skip-deferred' | 'no-op';
     halt_reason?: string;        // populated when verdict starts with 'halt'
   }
   ```
3. Terminal-status set: import `ARTIFACT_TERMINAL_STATUSES` from `lifecycle-reconcile.ts:27` (tolerant `{Done, Completed, Verified}` during CR-067 migration window; tightens to `{Completed}` only after STORY-067-03 lands).
4. Zero-children case: parent with no children ever drafted in `archive/` AND no children referenced under `pending-sync/` → `verdict: 'halt-zero-children'`, `halt_reason: "<PARENT-ID>: 0 children drafted; not reconcilable — decompose or abandon"`.
5. Sub-epic recursion: if parent frontmatter has `sub_epics: [SUB-EPIC-ID, ...]`, walk each sub-epic recursively. Sub-epics with `status: DEFERRED` are excluded from the denominator. Parent flips only when every non-DEFERRED sub-epic has `verdict: 'auto-flip'` or already reads `status: Completed`.
6. Full coverage: 100% of children (and non-DEFERRED sub-epics, if any) in terminal status → `verdict: 'auto-flip'`, `proposed_status: 'Completed'`.
7. Partial coverage: at least one but not all children in terminal status → `verdict: 'halt-partial'`, `halt_reason: "<PARENT-ID>: <T>/<N> children terminal — pending: <ID1>, <ID2>"`.
8. Already-terminal parent: parent already reads `status: Completed` → `verdict: 'no-op'`, `proposed_status: null`.
9. Re-export `rollUpParentStatus` + `walkActiveParents` from `lifecycle-reconcile.ts` (additive — does not change existing exports).
10. **No I/O side-effects.** This library reads frontmatter via `frontmatter-yaml.ts`; writing the flip happens in the script layer (STORY-066-02). Pure-function contract for unit-test ergonomics.

### 1.3 Out of Scope

- `close_sprint.mjs` Step 2.6c insertion (STORY-066-02).
- `--parents` flag on `reconcileLifecycleHandler` (STORY-066-02).
- Tightening `ARTIFACT_TERMINAL_STATUSES` to `['Completed']` only (STORY-067-03).
- Wiki rebuild after flips (STORY-028-01 dogfood).

### 1.4 Open Questions

None. All design choices inherited from CR-066 Open Questions Q1-Q4 (all resolved at parent's Gate-1 ack).

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| Sub-epic recursion infinite-loops on a malformed `sub_epics:` cycle | Cycle-detection set in `walkActiveParents`; throw a typed error if a parent appears twice on the walk stack |
| Reading archived child frontmatter is slow for parents with 50+ children | Cache parsed frontmatter by absolute path within one `walkActiveParents` invocation (`Map<string, ParsedFrontmatter>`) |
| `sub_epics:` field absent on most epics → null vs `[]` handling | Treat `undefined`, `null`, `[]` all as "no sub-epics; fall through to child rollup" |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:27` — `ARTIFACT_TERMINAL_STATUSES` Set; new lib imports this constant.
- **Surface:** `cleargate-cli/src/lib/frontmatter-yaml.ts` — parse/serialize frontmatter; new lib reuses `parseFrontmatter()`.
- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:436-437` — existing pattern for "skip already-terminal items"; new lib follows the same predicate.
- **Coverage of this story's scope:** ~30% — new lib is a sibling traversal (parents → children), distinct from existing reconciler (closed-sprint state → pending-sync leaves). Reuses two helpers; logic itself is net-new.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** add `parentRollup: true` mode flag to `reconcileCrossSprintOrphans`.
- **Why isn't extension sufficient?** Parent traversal scans `pending-sync/EPIC-*.md` and pulls children from `archive/`. Existing function scans closed sprint `state.json` files and pulls leaves from `pending-sync/`. Different traversal direction → cleaner as a sibling helper than as a flag forking the existing function's body.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: parent-rollup library returns correct verdict per parent shape

  Scenario: Full coverage — all children terminal
    Given a fixture EPIC-FX1 with 6 child stories archived as status:Completed
    When rollUpParentStatus(EPIC-FX1) runs
    Then verdict is "auto-flip"
    And proposed_status is "Completed"
    And coverage is "full"
    And terminal_children.length === 6

  Scenario: Partial coverage halts
    Given a fixture EPIC-FX2 with 7 archived Done + 1 still in pending-sync as Approved
    When rollUpParentStatus(EPIC-FX2) runs
    Then verdict is "halt-partial"
    And halt_reason starts with "EPIC-FX2: 7/8 children terminal"
    And pending_children includes the one Approved child

  Scenario: Zero children halts
    Given a fixture EPIC-FX3 with no children in archive or pending-sync
    When rollUpParentStatus(EPIC-FX3) runs
    Then verdict is "halt-zero-children"
    And halt_reason ends with "0 children drafted; not reconcilable — decompose or abandon"

  Scenario: Sub-epic recursion with DEFERRED exclusion
    Given a fixture EPIC-FX4 with sub_epics: [SUB-A, SUB-B, SUB-C]
    And SUB-A is fully covered (verdict auto-flip)
    And SUB-B is already status:Completed
    And SUB-C is status:DEFERRED
    When rollUpParentStatus(EPIC-FX4) runs
    Then verdict is "auto-flip"
    And coverage is "full"
    And SUB-C is excluded from the denominator

  Scenario: Already-terminal parent is a no-op
    Given EPIC-FX5 already reads status:Completed in its frontmatter
    When rollUpParentStatus(EPIC-FX5) runs
    Then verdict is "no-op"
    And proposed_status is null
```

### 2.2 Verification Steps (Manual)

- [ ] `npm test -- parent-rollup` green in cleargate-cli/.
- [ ] `tsc --noEmit` clean — types compile without `any`.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/parent-rollup.ts` (NEW) |
| Related Files | `cleargate-cli/src/lib/lifecycle-reconcile.ts` (add re-export of `rollUpParentStatus` + `walkActiveParents` alongside existing exports; do NOT edit ARTIFACT_TERMINAL_STATUSES yet) |
| Test File | `cleargate-cli/test/lifecycle/parent-rollup.node.test.ts` (NEW) |
| Fixtures | `cleargate-cli/test/fixtures/parent-rollup/` (NEW dir; 5 sub-dirs each containing pending-sync/ + archive/ skeletons for one scenario) |
| New Files Needed | Yes — parent-rollup.ts + its test file + 5 fixture trees |

### 3.2 Technical Logic

1. `walkActiveParents` globs `${deliveryRoot}/pending-sync/EPIC-*.md` and `${deliveryRoot}/pending-sync/SPRINT-*.md`. For each, parse frontmatter; if `status === 'Completed'` already, emit `verdict: 'no-op'`. Otherwise call `rollUpParentStatus`.
2. `rollUpParentStatus` algorithm:
   - Parse parent frontmatter.
   - If frontmatter has `sub_epics: [...]` (non-empty), recurse: for each sub-epic-id, locate `pending-sync/<SUB-EPIC-ID>.md` and call `rollUpParentStatus` on it. Collect verdicts. Exclude sub-epics whose own status is `DEFERRED`. If every non-DEFERRED sub-epic is `auto-flip` or already-`Completed`, parent verdict = `auto-flip`.
   - Else (leaf epic / sprint): enumerate children. Children come from two pools:
     a. `archive/<child-id>-*.md` — pattern match by parent-id prefix (e.g., `EPIC-016` → match `archive/STORY-016-*.md`, `archive/BUG-*.md` and `archive/CR-*.md` whose frontmatter `parent_cleargate_id` or `parent_epic_ref` equals parent-id).
     b. `pending-sync/<child-id>-*.md` — same pattern.
   - For each child, read `status:`; classify as terminal (in `ARTIFACT_TERMINAL_STATUSES`) or pending.
   - Total = terminal + pending counts. If total === 0 → `halt-zero-children`. If terminal === total → `auto-flip`. Else → `halt-partial`.
3. Children lookup: scan via `fs.readdirSync` once per traversal; cache the resulting `{parent_id → child_paths[]}` map for the duration of the call.
4. Cycle detection in sub-epic recursion: pass a `visited: Set<string>` down the call; throw `Error('parent-rollup: sub_epics cycle detected at <parent>')` on collision.

### 3.3 API Contract

N/A — library only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit — verdict shapes | 5 | One per scenario above |
| Unit — error path | 1 | Sub-epic cycle throws typed Error |
| Type-level | 1 | `tsc --noEmit` clean |

### 4.2 Definition of Done

- [ ] `parent-rollup.ts` exports `rollUpParentStatus` + `walkActiveParents` + `RollupResult` type.
- [ ] `lifecycle-reconcile.ts` re-exports both functions (additive; existing exports unchanged).
- [ ] All 5 Gherkin scenarios covered by `parent-rollup.node.test.ts`.
- [ ] Cycle-detection test in place.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:27` — `ARTIFACT_TERMINAL_STATUSES` Set; new lib imports this constant.
- **Surface:** `cleargate-cli/src/lib/frontmatter-yaml.ts` — parse/serialize frontmatter; new lib reuses `parseFrontmatter()`.
- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:436` — existing pattern for "skip already-terminal items"; new lib follows the same predicate.
- **Coverage of this story's scope:** ~30% — new lib is a sibling traversal (parents → children), distinct from existing reconciler (closed-sprint state → pending-sync leaves). Reuses two helpers; logic itself is net-new.

## Why not simpler?

> See §1.7 above.

## Ambiguity Gate
🟢 Low — all design choices inherited from CR-066 parent.

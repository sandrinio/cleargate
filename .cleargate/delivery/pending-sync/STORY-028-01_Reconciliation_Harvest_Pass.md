---
story_id: STORY-028-01
parent_epic_ref: CR-066
parent_cleargate_id: CR-066
sprint_cleargate_id: SPRINT-28
carry_over: false
area: cli,reconciler,hygiene
status: Approved
approved: true
approved_by: sandrinio
approved_at: 2026-05-17T00:00:00Z
ambiguity: 🟢 Low
complexity_label: L1
parallel_eligible: n
expected_bounce_exposure: low
lane: fast
context_source: |
  Spawned 2026-05-17 from SPRINT-28 §1 (Wave 3 dogfood). One-shot pass that
  invokes CR-066's new `cleargate sprint reconcile-lifecycle --parents` flag
  against the current repo, commits the auto-flips (EPIC-016 at minimum;
  EPIC-026 likely), and captures the halt-list (EPIC-010 partial / EPIC-021
  zero-children / EPIC-023 sub-epic placeholders) for manual ack.

  Depends on CR-066 Wave 1+2 complete. Cannot run until `rollUpParentStatus()`
  + Step 2.6c are merged into main.

  Audit baseline (2026-05-16 grep over pending-sync/):
    EPIC-010: 7/8 archived; STORY-010-02 ships this sprint, then 8/8 → auto-flip
    EPIC-012: 0/5 → harvest skips (status stays Ready; SPRINT-29 harvest)
    EPIC-016: 6/6 → auto-flip Completed
    EPIC-021: 0/0 ever drafted → halt (manual ack: decompose or abandon)
    EPIC-023: 4/4 sub-epic-1 archived; sub-epics 2/3/4 placeholders → halt or
              recursive-walk with DEFERRED-excluded denominator (per CR-066 Q4)
    EPIC-026: 2/N archived → likely auto-flip; verify children list at exec
created_at: 2026-05-17T00:00:00Z
updated_at: 2026-05-16T20:00:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-16T23:36:48Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-028-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-16T23:39:15Z
  sessions: []
---

# STORY-028-01: Reconciliation Harvest Pass — Dogfood CR-066 on 6 Stale Epics

## 1. The Spec

### 1.1 User Story

As the SPRINT-28 orchestrator, I want a one-shot reconciliation harvest pass that runs CR-066's new `--parents` mode against the current repo, so that the six stale Epics surfaced 2026-05-16 (EPIC-010, -012, -016, -021, -023, -026) are either auto-flipped to `Completed` or formally surfaced for manual ack — closing the books before SPRINT-29.

### 1.2 Detailed Requirements

1. Run `cleargate sprint reconcile-lifecycle SPRINT-27 --parents --dry-run` against the repo. Capture the proposed-flip + halt-list output.
2. Review the output with the human. Any unexpected proposed flip blocks until investigated.
3. Run `cleargate sprint reconcile-lifecycle SPRINT-27 --parents --apply`. Commit the auto-flipped frontmatter rewrites in one dedicated commit: `chore(SPRINT-28): STORY-028-01 — CR-066 harvest auto-flips (N epics)`.
4. For each halt-list entry, append a one-line note to the commit message (or a sibling commit) explaining the partial-coverage state and the next-sprint owner.
5. Run `cleargate wiki build` after the commit. Verify the wiki Active section shrinks.

### 1.3 Out of Scope

- Drafting any missing child stories (e.g., STORY-021-* for EPIC-021's zero-children case). Halt-list ack only; decomposition happens in SPRINT-29.
- Modifying CR-066's logic if a halt fires unexpectedly. File a follow-up CR for SPRINT-29 if needed.
- Touching the migration window for CR-067 (vocab unification). CR-067 Phase C runs before this story so that the reconciler is using the tightened `['Completed']` terminal set.

### 1.4 Open Questions

None. The behavior is entirely defined by CR-066's `--parents` flag; this story is execution, not design.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| CR-066's harvest flips an Epic the human didn't expect | Dry-run first; human reviews proposed-flip list before `--apply` |
| Halt-list includes an Epic with a renamed child the reconciler can't find | Existing Step 2.6a/b orphan-check catches renamed-but-pending children before Step 2.6c — surfaces the rename for manual resolution |
| EPIC-023 sub-epic recursion produces unexpected halt | Architect SDR for CR-066 verifies the sub-epic walker handles the `sub_epics:` list shape; STORY-028-01 is downstream of that verification |

## 2. The Truth

### 2.1 Gherkin

```gherkin
Feature: Reconciliation Harvest Pass

  Scenario: Dry-run produces expected proposed-flip list
    Given CR-066's --parents flag is implemented and merged
    When I run `cleargate sprint reconcile-lifecycle SPRINT-27 --parents --dry-run`
    Then stdout enumerates EPIC-016 as a proposed flip (6/6 → Completed)
    And stdout enumerates EPIC-010 as halt (7/8 partial — STORY-010-02 pending)
    And stdout enumerates EPIC-021 as halt (0/0 zero-children — decompose or abandon)
    And stdout enumerates EPIC-023 as halt or recursive-walk per sub-epic logic
    And no frontmatter is mutated

  Scenario: Apply commits the auto-flips
    Given the dry-run output was reviewed and confirmed
    When I run `cleargate sprint reconcile-lifecycle SPRINT-27 --parents --apply`
    Then EPIC-016 frontmatter status flips Draft → Completed atomically
    And the commit shows exactly the proposed-flip diff
    And re-running --apply produces zero diffs (idempotent)

  Scenario: Wiki rebuild reflects the harvest
    Given the auto-flip commit has landed
    When I run `cleargate wiki build`
    Then the Active section of .cleargate/wiki/index.md no longer lists EPIC-016
    And the Shipped/Completed section includes EPIC-016

  Scenario: Error — unexpected halt fires on EPIC the human didn't preview
    Given dry-run output listed exactly 4 halts (EPIC-010, -021, -023, plus any from sub-epic walk)
    When --apply runs and a 5th halt surfaces mid-execution
    Then the script exits non-zero with an Error message naming the unexpected halt
    And no partial mutations are committed
```

### 2.2 Manual Verification

- Compare wiki/index.md Active section line count before and after the harvest commit; expect at least -1 (EPIC-016).
- Read the commit's diff: should contain only frontmatter `status:` field rewrites; no body changes.

## 3. Implementation Guide

### 3.1 Files to Modify

- `.cleargate/delivery/pending-sync/EPIC-*.md` — frontmatter `status:` field rewrites for any Epic that the harvest auto-flips (expected: EPIC-016, possibly EPIC-026). Atomic write via the reconciler's existing frontmatter writer; no manual edits.
- `.cleargate/wiki/index.md` — regenerated by `cleargate wiki build` after the harvest commit; Active section shrinks.
- `.cleargate/sprint-runs/SPRINT-28/REPORT.md` (eventually) — halt-list summary lands in §5 Process when SPRINT-28 closes.

No source code is modified. The reconciler logic itself ships in CR-066.

### 3.2 Steps

1. Wait for CR-066 + CR-067 to merge (Wave 1+2 complete).
2. Run dry-run. Surface output as a brief.
3. Human acks; run apply.
4. Commit per §1.2 step 3 format.
5. Run wiki build. Commit wiki changes if any.
6. Surface halt-list summary in SPRINT-28 REPORT §5 Process.

### 3.3 API Contract

N/A — pure execution story.

## 4. Quality Gates

### 4.1 Test Expectations

CR-066's tests cover the reconciler logic. This story has no new test code.

### 4.2 Definition of Done

- [ ] Dry-run executed; output captured.
- [ ] Human acked the proposed-flip list before apply.
- [ ] Apply commit landed with the expected frontmatter diff.
- [ ] Idempotency verified (re-run apply produces zero diffs).
- [ ] Wiki rebuilt; Active section shrunk.
- [ ] Halt-list summarized in REPORT §5 Process with next-sprint owners.

## Existing Surfaces

> L1 reuse audit. This story is pure execution of CR-066's tooling.

- **Surface:** `cleargate-cli/src/commands/sprint.ts` `reconcileLifecycleHandler` — entry point gaining the `--parents` flag in CR-066.
- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts` — re-exports `rollUpParentStatus` from CR-066's new parent-rollup module (sibling file landing in CR-066 Wave 1).
- **Surface:** `cleargate-cli/src/lib/frontmatter-yaml.ts` — atomic frontmatter write for the flip mutations.
- **Coverage of this story's scope:** ~100% — execution-only; no new code.

## Why not simpler?

- **Smallest existing surface that could carry this story:** manual `cleargate gate refresh` on each of the 6 epics + human-edited status flips. Cost: ~30 min of mechanical edits + risk of skipping the sub-epic recursion edge case for EPIC-023.
- **Why isn't manual sufficient?** Manual misses the test of CR-066 itself. The harvest pass is the dogfood — without it, CR-066's first real run is at SPRINT-29 close with no prior validation. Story enforces "run CR-066 against real state during the sprint that shipped it" as a quality gate.

## Ambiguity Gate
🟢 Low — design is fully inherited from CR-066; this story is execution only.

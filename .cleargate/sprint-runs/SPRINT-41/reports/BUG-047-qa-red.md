role: qa

# BUG-047 QA-Red report — gate-cache-staleness reds

**Commit:** `cbb72481d1a3150bfbdab5c043bf9f5dd3166abb` on `story/BUG-047` in
`/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-047/cleargate-cli`
(cli main base `f0c33f7`).

QA-RED: WRITTEN

## Per-file table

| File | Tests | Baseline result |
|---|---|---|
| `test/lib/gate-cache-staleness.red.node.test.ts` (new) | 5 | 2 pass, **3 fail** |

## Per-test detail

| # | Test | Mechanism under test | Baseline | Reason |
|---|---|---|---|---|
| T1 | `gate check -> stamp -> gate check advances a stale cache` | `writeCachedGate`'s idempotency early-return (frontmatter-cache.ts ~93-106) | **RED** | `last_gate_check` stays at the first check's value (`2026-01-01T01:00:00Z`) after the second check, even though `updated_at` has moved to `2026-01-01T02:00:00Z` — the exact deadlock in BUG-047 §1/§2. |
| T2 | `sprint preflight Check 5 passes for a stamped-then-re-gated item` | `checkPerItemReadinessGates` (sprint.ts:1598) reading the cache T1 produces | **RED** | `Per-item readiness gates: 1/2 items not ready — EPIC-047-02 (stale)`; preflight exits 1 instead of 0. |
| T3 | `two gate checks with no edit leave a fresh item byte-identical` | `writeCachedGate` early-return, unedited/fresh item | green (regression witness) | Already holds today: an unchanged verdict on an item whose cache is already fresh short-circuits before any write, regardless of the freshness gating this bug adds. |
| T4 | `a verdict flip on a fresh item writes both the verdict and a new stamp` | `writeCachedGate` write path on a genuine verdict change | green (regression witness) | Already holds today: `existing.pass !== newResult.pass` breaks the early-return's equality check independently of freshness, so the write already happens. |
| T5 | `Step 0 restore guard — keep a stale advance, restore a fresh one` | `restoreIfOnlyTimestampMoved` (sprint.ts:1786-1796) via `refreshScopedGateCaches` | **RED** (Case A) | Case A (stale item, last_gate_check `2026-01-01` < updated_at `2026-05-01`): a same-verdict Step-0 stamp to `2026-12-31T23:59:59Z` is reverted byte-for-byte back to the original — `restoreIfOnlyTimestampMoved` is unconditional today and re-creates the deadlock at the Step-0 level. Case B (already-fresh item, last_gate_check `2026-06-01` > updated_at `2026-01-01`) is not reached in this run because Case A's assertion throws first; it is a CR-038 anti-thrash regression witness already covered green by the existing suite's Scenario 20 (see below) and will execute as the test's second half once Case A passes post-fix. |

**BASELINE_FAIL: 3** (T1, T2, T5) of 5 tests. 2 tests (T3, T4) are CR-038 regression witnesses that pass both before and after the fix by construction — this matches BUG-047's own §5 Verification Protocol, which marks only step 1 "must fail against the current tree" and leaves steps 2-5 as protocol/regression checks. No test imports the not-yet-existing `isGateCacheFresh` export; all five drive the fix's externally observable behaviour through the unchanged `gateCheckHandler` / `stampHandler` / `sprintPreflightHandler` entry points, so nothing in the file can crash at module-load before the fix lands (flashcard 2026-09-26 · #qa-red #esm).

## Anchor runs (existing suites — unmodified, confirming no re-scope needed)

| Suite | Result |
|---|---|
| `test/commands/sprint-preflight.node.test.ts` | 27/27 pass, 0 fail (Scenario 20's "fresh item restored" sub-case independently confirms T5 Case B's mechanism is green today) |
| `test/lib/frontmatter-cache.node.test.ts` | 11/11 pass, 0 fail |
| `npm run typecheck` | clean |

**Re-scope watch (M7 §3 BUG-047 blueprint):** checked both cited fixtures — no re-scope was needed, count unchanged.
- `sprint-preflight.node.test.ts` Scenario 20's `'stamp'`-behaviour fixture (`:1073`) uses `updatedAt: '2026-01-01T00:00:00Z'` / `lastGateCheck: '2026-06-01T00:00:00Z'` — already fresh (`last_gate_check >= updated_at`), so `isGateCacheFresh` will not change its expectation.
- Scenario 16's stale fixture (`lastGateCheck < updatedAt`) defaults to `gateCheckBehavior: 'success'`, which never touches the file, so `restoreIfOnlyTimestampMoved`'s `after === original` short-circuit fires regardless of the fix — unaffected.
- `frontmatter-cache.node.test.ts:216`'s byte-identical-rerun fixture carries no `updated_at` key at all, so `updatedAt === ''` and the blueprint's `isGateCacheFresh` definition (`updatedAt === '' || cached.last_gate_check >= updatedAt`) treats it as fresh either way — unaffected.

## D4 delta

Sprint plan `plans/M7.md` §2.3 projects BUG-047 at **+5** default-tier tests (row 3: `3671 / 3669` cumulative after BUG-047, following BUG-101's `3659/3657` and BUG-100's `3666/3664`). This file adds exactly 5 `test()` cases — delta matches, no discrepancy.

## Discrepancies

None. The file's test count (5), naming (`*.red.node.test.ts` per sprint-context.md §Test Stack), and D4 delta (+5) all match the M7 plan's BUG-047 blueprint. The one nuance worth flagging explicitly: 3 of the 5 tests are genuinely red at baseline (T1, T2, T5) while 2 are pre-existing-behaviour regression witnesses that pass at baseline and must stay green post-fix (T3, T4) — this follows BUG-047 §5's own wording ("Must fail against the current tree" is stated only for verification step 1) rather than a blanket "all 5 fail today," and is reported here rather than silently assumed.

## Scope note (Task Breakdown binding)

Per the Task Breakdown row and M7 §8.2 OD-M7-11, Step 0 refreshing the sprint plan's own cache (as opposed to its §1 child items) is explicitly out of scope for BUG-047 (deferred to FU-5); no test in this file exercises that path, and none should until FU-5.

flashcards_flagged:
  - "2026-09-27 · #qa-red #gate #test-harness · BUG-047's own 5-step verification protocol marks only step 1 'must fail today' — steps 2-5 include CR-038 regression witnesses that pass at both baseline and post-fix."
  - "2026-09-27 · #qa-red #gate · restoreIfOnlyTimestampMoved is unconditional today: a Step-0 stamp on a STALE item (not just a fresh one) gets reverted, re-deadlocking BUG-047 at the Step-0 level too."

---
cr_id: CR-038
parent_ref: EPIC-008
parent_cleargate_id: EPIC-008
sprint_cleargate_id: "SPRINT-21"
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-03T20:00:00Z
approved_by: sandrinio
created_at: 2026-05-03T00:00:00Z
updated_at: 2026-05-03T00:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
context_source: |
  Surfaced 2026-05-03 in markdown_file_renderer end-to-end install test.
  Test agent's sprint-close walkthrough self-report named this as one of
  five critical signals:

    "4. The 12 stale cached_gate_result.pass: false on items pre-sprint-start.
        The session-start banner reported 12 blocked items — all stale cache,
        content was actually fine. We ignored it under v1, but in v2 this
        would've hard-blocked sprint preflight. Fix: run cleargate gate check
        <file> on every pending-sync item right before sprint preflight to
        refresh caches; or add it as a preflight Step 0."

  Mechanics: cached_gate_result lives in each work item's frontmatter. It's
  written by the PostToolUse stamp-and-gate hook on every edit. Between sessions,
  the cache becomes stale relative to (a) the file's current updated_at, (b)
  any predicate definition changes (new criteria added to readiness-gates.md),
  (c) cross-doc references that resolved differently when the cache was written
  (e.g., a parent Initiative since moved from pending-sync to archive).

  In the test, the agent saw 12 items reported as blocked at session start.
  All 12 had passed when last edited; the cache went stale during the
  intervening session gap. Under v1 (warn-only), this is noise. Under v2
  (post-CR-027 composite preflight check), this is a hard-block — the sprint
  cannot start because items in scope have stale-failing cached gates.

  The fix is a single preflight Step 0: run gate check on every item in
  pending-sync to refresh the cache before evaluating the per-item composite
  check. Cheap (CLI is fast), eliminates the false-positive class entirely.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T19:04:51Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-038
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T17:46:48Z
  sessions: []
---

# CR-038: Stale `cached_gate_result` Refresh as Preflight Step 0

## 0.5 Open Questions

- **Question:** Refresh scope — every item in `pending-sync/` (broad), or only items in the sprint's Consolidated Deliverables (narrow)?
  - **Recommended:** **narrow** (sprint scope only). Broad refresh would re-evaluate items unrelated to the sprint, slowing preflight without benefit. CR-027's composite check already iterates the sprint's `## 1. Consolidated Deliverables` table — Step 0 reuses that same iteration to refresh, then Step 5 (CR-027) reads the refreshed cache.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Refresh failure handling — if `cleargate gate check` errors on one item, abort preflight or continue?
  - **Recommended:** **continue + report**. A single item's gate check error (e.g., parse failure, missing context_source target) shouldn't block the entire preflight. Step 0 collects all errors, surfaces them in stdout, and lets Step 5's composite check then decide pass/fail per item.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Sprint inclusion?
  - **Recommended:** SPRINT-21 (Tier 1). Pair with CR-027 if it hasn't shipped — Step 0 is meaningless without Step 5 reading the refreshed cache.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). W3 Developer dispatch 5. CR-027 already shipped in SPRINT-20 (commit `618fadc`), so Step 0 + Step 5 form the pair on first SPRINT-21 close.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- `cleargate sprint preflight <id>` (`cleargate-cli/src/commands/sprint.ts:812+`) jumps straight to the four CR-021 environment checks (prev sprint Completed, no leftover worktrees, sprint ref free, main clean). It assumes `cached_gate_result` in each work item's frontmatter is fresh. It isn't, between sessions.
- The implicit assumption that staleness is rare. In practice, the test surfaced 12 stale items at session start — all from edits made in prior sessions, with `last_gate_check < updated_at` either silently true or made true by predicate-definition changes between versions.

**New Logic (The New Truth):**

`cleargate sprint preflight <id>` gains a **Step 0: refresh per-item gate cache for all items in scope** that runs before the four CR-021 checks.

Implementation:
1. Parse the sprint plan file. Extract work-item IDs from `## 1. Consolidated Deliverables` (using existing `extractWorkItemIds` from `assert_story_files.mjs`, post-CR-014).
2. For each ID, resolve the file path via `findWorkItemFile` (existing helper). Skip items already in `archive/` with terminal status (Done/Completed/Abandoned) — their cache is frozen by archive immutability.
3. For each non-archived item: run `cleargate gate check <file>` (which writes fresh `cached_gate_result` to frontmatter). Suppress per-item stdout; collect errors.
4. Print summary line: `Step 0: refreshed N items, M errors. Errors: <list>` (matches CR-021 PreflightCheckResult shape).
5. Step 0 itself never fails preflight. Errors surfaced for visibility but don't block. The actual block decision is made by Step 5 (CR-027 composite check) reading the now-fresh cache.

This makes the per-item composite check deterministic: it reads the freshly-stamped cache, not whatever was sitting in frontmatter from the last session.

## 2. Blast Radius & Invalidation

- [x] **Pre-existing items with stale `pass: false`** — refresh corrects them on next preflight invocation. Items that genuinely fail stay failing (Step 5 then surfaces).
- [x] **Update Epic:** EPIC-008 (gate engine + preflight family).
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** No. Local CLI work.
- [ ] **Audit log:** No new fields. Step 0 stdout adds one summary line per preflight invocation.
- [ ] **Coupling with CR-027** (composite check at preflight): tightly coupled. CR-027 adds Step 5; CR-038 adds Step 0. Step 0 + Step 5 together = correct preflight semantics. Either alone leaves a gap (Step 5 alone reads stale cache; Step 0 alone refreshes but doesn't enforce). Ship paired.
- [ ] **Coupling with CR-038** (this CR): n/a.
- [ ] **Performance:** N gate checks per preflight where N = sprint scope size. Test sprint had 13 items → ~13 gate checks. Each gate check parses one frontmatter + evaluates ~5 predicates. Fast (≤1s per item, ≤15s total for a typical sprint). Acceptable.
- [ ] **FLASHCARD impact:** add card on completion — *"`cleargate sprint preflight` Step 0 refreshes per-item `cached_gate_result` for every item in the sprint's Consolidated Deliverables before Step 5 (CR-027) reads the cache. Eliminates the stale-cache-blocks-preflight false-positive class."*
- [ ] **Scaffold mirror:** `cleargate-cli/src/commands/sprint.ts` is engine-side, not mirrored to scaffold (no `.cleargate/scripts/` change needed unless a parallel script wraps it).

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `cleargate-cli/src/commands/sprint.ts` — `sprintPreflightHandler` (~L1070); this CR adds Step 0 before the existing CR-021 four-check sequence.
- **Surface:** `cleargate-cli/src/lib/preflight.ts` — Step 5 composite check landed by CR-027 reads `cached_gate_result`; Step 0 refreshes that cache so Step 5 reads non-stale data.
- **Surface:** `cleargate-cli/src/scripts/assert_story_files.mjs` — `extractWorkItemIds` helper; reused for sprint-scoped iteration.
- **Surface:** `cleargate-cli/src/lib/find-work-item.ts` — `findWorkItemFile` helper; reused for ID → path resolution.
- **Why this CR extends rather than rebuilds:** all helpers exist; this CR composes them into a new Step 0 callsite.

## 3. Execution Sandbox

**Modify (CLI — 1 file):**

- `cleargate-cli/src/commands/sprint.ts` — `sprintPreflightHandler` (~L1070 entry):
  - Before the existing four checks, add `Step 0` block:
    ```ts
    // Step 0: refresh per-item gate cache (CR-038)
    const refreshResult = await refreshScopedGateCaches(sprintId, cwd);
    if (refreshResult.errors.length > 0) {
      stdoutFn(`Step 0: refreshed ${refreshResult.refreshed.length} items, ${refreshResult.errors.length} errors:\n`);
      for (const e of refreshResult.errors) stdoutFn(`  - ${e.id}: ${e.message}\n`);
    } else {
      stdoutFn(`Step 0: refreshed ${refreshResult.refreshed.length} items, 0 errors.\n`);
    }
    ```
  - Add helper `refreshScopedGateCaches(sprintId, cwd)`:
    1. Read sprint file via `findWorkItemFile`.
    2. Extract work-item IDs from §1 (reuse `extractWorkItemIds` via shell-out to `assert_story_files.mjs` or via shared lib).
    3. For each ID: resolve file (skip archive-terminal), exec `cleargate gate check <file>` (suppress stdout, capture stderr).
    4. Return `{ refreshed: [...ids], errors: [...{id, message}] }`.
  - Step 0 never fails preflight on its own — errors surface, count is reported, decision lives with Step 5.

**Tests (1 file):**

- `cleargate-cli/test/commands/sprint-preflight.test.ts` — add scenarios:
  1. Sprint with all-fresh caches → Step 0 reports `refreshed 5 items, 0 errors`. No frontmatter changes.
  2. Sprint with 2 stale items (mock by aging `last_gate_check` to before `updated_at`) → Step 0 refreshes them, frontmatter `last_gate_check` advances to current ts.
  3. Sprint with 1 item whose gate check throws (mock corrupt frontmatter) → Step 0 reports 1 error, doesn't abort, other items still refreshed.
  4. Sprint with 1 item in `archive/` with status=Done → Step 0 skips (frozen item), no refresh attempt.
  5. Step 0 never fails preflight on its own (zero exit even with all-error case; Step 5 then handles).

**Out of scope:**

- Refreshing items NOT in sprint scope (broader `cleargate doctor --refresh-all` is a separate CR if needed).
- Parallel gate-check execution (sequential is fast enough at sprint-scope sizes).
- Caching the cache-refresh result (defeats the purpose).

## 4. Verification Protocol

**Acceptance:**

1. **Bug reproduces pre-CR.** In the markdown_file_renderer test folder (or a fixture with stale caches), run `cleargate sprint preflight SPRINT-01`. Observe: stale-cached items still report `pass: false` from frontmatter; CR-027 composite check (if shipped) hard-blocks the sprint.
2. **Fix unblocks.** Same command post-CR. Step 0 fires; all 12 stale items get fresh gate checks; items that genuinely pass now do; items that genuinely fail still do (visible to Step 5).
3. **Test scenarios all pass.** Five vitest scenarios above.
4. **No regression.** Existing 4-check preflight tests still pass.
5. **End-to-end re-test.** Re-run the markdown_file_renderer test scenario after CR-031/033/034 + CR-038 land. Stale-cache class of false-positives eliminated.

**Test commands:**

- `cd cleargate-cli && npm test -- sprint-preflight` — focused.
- Manual smoke: stale-cache fixture sprint, observe Step 0 stdout summary.

**Pre-commit:** typecheck + tests green; one commit `feat(CR-038): sprint preflight Step 0 refreshes cached_gate_result for in-scope items`; never `--no-verify`.

**Post-commit:** archive CR file; append flashcard.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

- [x] Obsolete logic explicitly declared (preflight assumes fresh cache; staleness is common between sessions).
- [x] All impacted downstream items identified (paired with CR-027; both ship together).
- [x] Execution Sandbox names exact files + handler entry + helper signature.
- [x] Verification with 5 acceptance scenarios + 5 unit-test cases.
- [ ] **Open question:** Refresh scope — sprint scope vs all pending-sync (§0.5 Q1).
- [ ] **Open question:** Failure handling — continue vs abort (§0.5 Q2).
- [x] ~~**Open question:** Sprint inclusion (§0.5 Q3).~~ Resolved 2026-05-03: SPRINT-21 (W3).
- [ ] `approved: true` is set in the YAML frontmatter.

---
story_id: STORY-067-03
parent_epic_ref: CR-067
parent_cleargate_id: CR-067
sprint_cleargate_id: SPRINT-28
carry_over: false
area: cli,reconciler,mcp,adapters,docs
status: Completed
approved: false
ambiguity: 🟢 Low
complexity_label: L1
parallel_eligible: n
expected_bounce_exposure: low
lane: fast
context_source: |
  Phase C of CR-067. Tightens ARTIFACT_TERMINAL_STATUSES from {Done, Completed,
  Verified} to {Completed}, collapses per-artifact gate-check expectations at
  lifecycle-reconcile.ts:47/51/309, updates close_sprint.mjs literal refs if
  any, documents adapter ingest mapping in mcp/src/adapters/README.md.

  Depends on:
    a) STORY-067-02 Phase B archive migration complete (no Done/Verified
       in delivery/), AND
    b) STORY-066-02 merged (parent-rollup walker imports
       ARTIFACT_TERMINAL_STATUSES from this file).

  Architect grep verified: actual constant is `ARTIFACT_TERMINAL_STATUSES`
  at line 27 (NOT `TERMINAL_STATUSES` as CR-067 spec text says); gate-check
  expectations live at lines 47/51/309 (literal string arrays, not a function);
  state.json sets `TERMINAL_STATE_JSON = new Set(['Done', 'Escalated',
  'Parking Lot'])` at line 403 — that one stays as-is per CR-067 Q3.
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-17T19:21:13Z
stamp_error: no ledger rows for work_item_id STORY-067-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T19:21:13Z
  sessions: []
---

# STORY-067-03: Tighten `ARTIFACT_TERMINAL_STATUSES` + Adapter Mapping Docs

**Complexity:** L1 — 5-line edit to `lifecycle-reconcile.ts` + 1 new section in `mcp/src/adapters/README.md` + update existing tests.

## 1. The Spec

### 1.1 User Story

As `lifecycle-reconcile.ts`, I want my `ARTIFACT_TERMINAL_STATUSES` and per-artifact gate-check expectations to read `{Completed}` only — and as the MCP adapter layer, I want a documented mapping from remote-tool terminal vocab to local `Completed` — so the post-CR-067 codebase contains a single source of truth for what "done" means.

### 1.2 Detailed Requirements

1. **`cleargate-cli/src/lib/lifecycle-reconcile.ts`** edits (only AFTER STORY-067-02 ships):
   - Line 27-30: `ARTIFACT_TERMINAL_STATUSES = new Set(['Done', 'Completed', 'Verified'])` → `new Set(['Completed'])`.
   - Line 47: `expected: ['Done', 'Completed']` → `expected: ['Completed']`.
   - Line 51: `expected: ['Verified', 'Done', 'Completed']` → `expected: ['Completed']`.
   - Line 309-310: `expectedStatuses = ['Verified', 'Done', 'Completed']` → `expectedStatuses = ['Completed']`.
   - Line 329: `expectedStatuses[0] ?? 'Done'` → `expectedStatuses[0] ?? 'Completed'` (fallback string update).
   - **Leave line 403 alone** — `TERMINAL_STATE_JSON = new Set(['Done', 'Escalated', 'Parking Lot'])` is state.json `story_state` vocab, NOT artifact status. Per CR-067 Q3, orthogonal scope.
2. **`mcp/src/adapters/README.md`** — add a new section:
   ```markdown
   ## Status Vocabulary Mapping (CR-067)

   ClearGate-local frontmatter terminal status is exclusively `Completed`. Adapter
   `pullItem` / `listUpdates` implementations MUST normalize remote terminal labels
   to `Completed` at ingest:

   | Remote tool   | Remote terminal label(s)         | Local value  |
   |---------------|----------------------------------|--------------|
   | Linear        | Done                              | Completed    |
   | Jira          | Done, Resolved, Closed            | Completed    |
   | GitHub Projects | Done                            | Completed    |

   Non-terminal remote labels (Triage, In Progress, In Review, etc.) pass through
   unchanged. The local frontmatter MUST never carry "Done" or "Verified" — those
   labels were retired by CR-067.
   ```
   - If `mcp/src/adapters/README.md` does not exist yet (STORY-010-02 creates it), this story coordinates with STORY-010-02 so both edits land cleanly. Architect's order: STORY-010-02 ships first OR this story adds the file from scratch with the section above as its only content; orchestrator picks at dispatch.
3. **Update tests** that previously asserted the tolerant 3-element set:
   - `cleargate-cli/test/lib/lifecycle-reconcile*.test.ts` (or `*.node.test.ts`) — any assertion against `ARTIFACT_TERMINAL_STATUSES` membership for `Done` or `Verified` flips to `Completed`-only.
   - Grep first: `rg "ARTIFACT_TERMINAL_STATUSES|TERMINAL_STATUSES" cleargate-cli/test/`.
4. **Sanity check post-edit**: `npm test` in cleargate-cli/ green; STORY-066-01's `parent-rollup` tests still pass (they import ARTIFACT_TERMINAL_STATUSES — the tighter set must classify all CR-067-migrated fixtures correctly).

### 1.3 Out of Scope

- Editing `close_sprint.mjs` if grep finds no `'Done'` / `'Verified'` literals there (most likely the case — close_sprint reads frontmatter via reconciler).
- Wiki ingest normalization (deferred; the migrated archive no longer carries non-Completed terminal labels so this is a no-op).
- Real Linear adapter implementation of the mapping (STORY-010-02 wraps `Issue → RemoteItem`; this story only documents the mapping table).

### 1.4 Open Questions

- **Question:** Should `expectedStatuses` per-verb config (line 47/51/309) collapse into one constant since all three now equal `['Completed']`?
- **Recommended:** Yes — extract `const ARTIFACT_GATE_EXPECTED = ['Completed']` and reference it at all three sites. Cuts ~4 LOC.
- **Human decision:** Developer's call at implementation; either way is acceptable.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| A test fixture under cleargate-cli/test/fixtures/ still has `status: Done` in frontmatter for a stale reason | grep first: `rg "status:\\s*Done|status:\\s*Verified" cleargate-cli/test/fixtures/` — fix any hits before tightening |
| STORY-066-01's parent-rollup tests use `Done` in fixtures (because they were written against the tolerant set) | This story is sequenced AFTER STORY-066-01 + STORY-067-02; the parent-rollup fixtures should already use `Completed` post-migration. If any `Done` lingers in fixtures, update inline. |
| README addition collides with STORY-010-02's adapter README content | Coordinate at orchestrator dispatch — STORY-010-02 lands first (defines the file shape), this story appends the mapping section |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:27-30,47,51,309,329` — exact lines to edit.
- **Surface:** `mcp/src/adapters/README.md` — created in STORY-010-02.
- **Surface:** `cleargate-cli/test/lib/lifecycle-reconcile*.test.ts` — existing tests on the constant; update assertion values.
- **Coverage of this story's scope:** ~99% — pure tighten + doc-section; no new module.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** leave `ARTIFACT_TERMINAL_STATUSES` as a 3-element tolerant set forever.
- **Why isn't extension sufficient?** Tolerance permanently means cross-artifact audit code must check three labels; CR-067 goal is one label everywhere. Tighten = one line removed; tolerance = forever-overhead. Cheaper to tighten.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Tighten terminal vocab + document adapter mapping

  Scenario: ARTIFACT_TERMINAL_STATUSES is a single-element set
    Given STORY-067-02 has merged (archive migration complete)
    When STORY-067-03 commit lands
    Then grep "ARTIFACT_TERMINAL_STATUSES" in cleargate-cli/src/lib/lifecycle-reconcile.ts shows new Set(['Completed'])
    And no 'Done' or 'Verified' literal appears in expected/expectedStatuses arrays at lines 47, 51, 309

  Scenario: state.json TERMINAL_STATE_JSON left untouched
    Given STORY-067-03 commit
    When grep "TERMINAL_STATE_JSON" runs
    Then the constant still reads new Set(['Done', 'Escalated', 'Parking Lot'])

  Scenario: Adapter README documents the mapping
    Given the commit has landed
    When I open mcp/src/adapters/README.md
    Then a "Status Vocabulary Mapping (CR-067)" section is present
    And the table includes Linear, Jira, GitHub Projects rows mapping to Completed

  Scenario: Existing lifecycle-reconcile tests pass with tightened set
    Given STORY-067-03 commit
    When `cd cleargate-cli && npm test` runs
    Then exit code is 0
    And no test assertion expects 'Done' or 'Verified' from ARTIFACT_TERMINAL_STATUSES

  Scenario: Reconciler runs clean against the migrated repo
    Given STORY-067-02 archive migration complete + STORY-067-03 tighten merged
    When `cleargate sprint reconcile-lifecycle SPRINT-27` runs
    Then exit code is 0 (no drift)
```

### 2.2 Verification Steps (Manual)

- [ ] `rg "'Done'|'Verified'" cleargate-cli/src/lib/lifecycle-reconcile.ts` returns zero matches (state.json constant at line 403 is exempt; it uses double-quotes is no — it uses single quotes; manually inspect the line to confirm only `TERMINAL_STATE_JSON` references survive).
- [ ] `cleargate sprint reconcile-lifecycle SPRINT-27 --parents` runs clean.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/lifecycle-reconcile.ts` (5-site edit) |
| Related Files | `mcp/src/adapters/README.md` (append/create section) |
| Test Files | `cleargate-cli/test/lib/lifecycle-reconcile*.test.ts` (assertion updates) |
| New Files Needed | No (unless STORY-010-02 has not yet shipped the adapter README — then create it) |

### 3.2 Technical Logic

1. Optional refactor: extract `const ARTIFACT_GATE_EXPECTED = ['Completed'] as const;` at top of `lifecycle-reconcile.ts`; reference it at lines 47, 51, 309. Cuts ~4 LOC.
2. Update test fixtures and assertions: grep all `cleargate-cli/test/**/*.test.ts` for `'Done'`/`'Verified'` as terminal-status; flip to `'Completed'`. Use careful grep to avoid touching state.json fixtures (those keep `Done` per CR-067 Q3).
3. Add adapter mapping section to README.

### 3.3 API Contract

N/A — internal constant change.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Reconciler — terminal-set membership | 1 | Existing test updated to assert single-element set |
| Doc presence | 1 | README section exists with all 3 remote-tool rows |

### 4.2 Definition of Done

- [ ] `ARTIFACT_TERMINAL_STATUSES` is a single-element Set.
- [ ] Three `expected` literals at lines 47/51/309 read `['Completed']`.
- [ ] Line 329 fallback string is `'Completed'`.
- [ ] `mcp/src/adapters/README.md` has the Status Vocabulary Mapping section.
- [ ] All existing tests pass (assertions updated for tighter set).
- [ ] `cleargate sprint reconcile-lifecycle SPRINT-27` exits 0.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts` — exact lines to edit: 27-30 (constant), 47, 51, 309, 329 (expected[] literals).
- **Surface:** `mcp/src/adapters/README.md` — created in STORY-010-02; this story appends a Status Vocabulary Mapping section.
- **Surface:** `cleargate-cli/test/lib/lifecycle-reconcile.test.ts` — existing tests on the constant; update assertion values (EPIC-028 renames to node:test naming before this story dispatches).
- **Coverage of this story's scope:** ~99% — pure tighten + doc-section; no new module.

## Why not simpler?

> See §1.7.

## Ambiguity Gate
🟢 Low — one open question on `ARTIFACT_GATE_EXPECTED` refactor; either resolution acceptable.

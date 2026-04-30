---
story_id: STORY-015-06
parent_epic_ref: SPRINT-15
status: Approved
approved: true
approved_at: 2026-04-29T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: PROPOSAL-009_Planning_Visibility_UX.md §2.1 (schema), §3.3 (migration/backfill plan). SPRINT-15 §1 row STORY-015-06. Depends on STORY-015-01 templates.
actor: Wiki / Reporter consumer of hierarchy
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-29T11:16:51Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-015-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-29T11:16:51Z
  sessions: []
---

# STORY-015-06: Push + Wiki-Ingest Hierarchy Extraction & One-Shot Backfill
**Complexity:** L2 — push command + ingest agent + backfill script; ~3 files; one-time migration over pending-sync.

## 1. The Spec (The Contract)

### 1.1 User Story
As a downstream wiki / Reporter / future admin-UI consumer, I want every pushed work item to carry its `parent_cleargate_id` and `sprint_cleargate_id` to the MCP server and into the compiled wiki page, so that hierarchy traversal is a single field lookup instead of prose-text grep.

### 1.2 Detailed Requirements
- `cleargate push <file>` reads the two new frontmatter keys (added by STORY-015-01) and includes them in the `cleargate_push_item` MCP call payload. If absent or null, push proceeds as before — no rejection.
- The wiki-ingest subagent (`.claude/agents/cleargate-wiki-ingest.md`) propagates both keys verbatim into the generated wiki page's frontmatter at `.cleargate/wiki/{type}/<id>.md`.
- A one-shot backfill script (`.cleargate/scripts/backfill_hierarchy.mjs`) scans every file in `.cleargate/delivery/pending-sync/` and `.cleargate/delivery/archive/` and, for each file missing the new keys, sniffs:
  1. an existing `parent_ref:` line for `parent_cleargate_id`, or
  2. a body cross-reference matching `(EPIC|SPRINT|PROPOSAL)-NNN` for `sprint_cleargate_id` (sprint membership: search for `sprint:` frontmatter or `SPRINT-NNN` in the body's first 50 lines).
- The backfill script is **idempotent** — running twice on the same file is a no-op when keys are already populated.
- Backfill writes the new keys but does NOT touch `parent_ref:` or any other existing field.
- Push payload schema is **additive** — older MCP servers that don't recognize the new fields continue to accept the call (the keys flow into `current_payload->>'parent_cleargate_id'` even on unmigrated servers; explicit MCP-side schema work is deferred to EPIC-023).

### 1.3 Out of Scope
- Removing or renaming the existing `parent_ref:` prose key.
- MCP-side schema migration (Postgres column add) — deferred to EPIC-023 §1 (work-item sync v2).
- Any wiki-page UI rendering changes (wiki pages gain the keys; how they're displayed is unchanged).
- Validating that `parent_cleargate_id` resolves to an existing item — orphan parents are allowed in v1.
- Conflict-detector changes — the new keys do not participate in conflict resolution yet.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Push and ingest hierarchy keys

  Scenario: Push extracts populated keys
    Given a story file with parent_cleargate_id: "EPIC-022" and sprint_cleargate_id: "SPRINT-14"
    When `cleargate push <file>` runs
    Then the MCP call payload includes both fields verbatim
    And on success the file's frontmatter is unchanged

  Scenario: Push tolerates null keys
    Given a CR file with parent_cleargate_id: null and sprint_cleargate_id: null
    When `cleargate push <file>` runs
    Then the call succeeds
    And the payload carries explicit null for both fields

  Scenario: Wiki-ingest propagates keys
    Given a pushed story with parent_cleargate_id: "EPIC-020"
    When wiki-ingest runs on that file
    Then the generated wiki/stories/STORY-020-01.md frontmatter contains parent_cleargate_id: "EPIC-020"

  Scenario: Backfill sniffs parent_ref
    Given an existing BUG file in pending-sync with parent_ref: "BUG-021" and no parent_cleargate_id key
    When `node .cleargate/scripts/backfill_hierarchy.mjs` runs
    Then the file's frontmatter gains parent_cleargate_id: "BUG-021"
    And parent_ref: "BUG-021" remains intact

  Scenario: Backfill sniffs sprint membership
    Given an existing story file with `sprint: SPRINT-14` in frontmatter
    When backfill runs
    Then the file's frontmatter gains sprint_cleargate_id: "SPRINT-14"

  Scenario: Backfill is idempotent
    Given a file already populated by a prior backfill run
    When backfill runs again
    Then the file is byte-identical to the prior state
    And the run logs "skipped (already populated)"

  Scenario: Backfill leaves unsniffable files alone
    Given a proposal file with no parent_ref and no sprint reference
    When backfill runs
    Then both keys remain null
    And a one-line stderr note is emitted naming the file
```

### 2.2 Verification Steps (Manual)
- [ ] `cleargate push .cleargate/delivery/pending-sync/STORY-022-01_*.md` — observe payload via MCP request log; both keys present.
- [ ] Run backfill against a checkout of pending-sync; spot-check 3 files for correct sniff results.
- [ ] Run backfill twice; `git diff` shows zero changes on second run.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/push.ts` |
| Related Files | `cleargate-cli/src/lib/frontmatter.ts` (key extraction helper), `.claude/agents/cleargate-wiki-ingest.md` (propagation rule), `.cleargate/scripts/backfill_hierarchy.mjs` (new) |
| New Files Needed | Yes — `.cleargate/scripts/backfill_hierarchy.mjs`; `cleargate-cli/test/commands/push-hierarchy.test.ts` |

### 3.2 Technical Logic
1. **Push extraction.** Extend the YAML parse step in `push.ts` to read both keys; default to `null` when absent. Add to the `cleargate_push_item` request payload as top-level fields (not nested in `current_payload`).
2. **Wiki-ingest propagation.** Update the ingest subagent's body to include the two keys in the generated wiki-page frontmatter section. Existing pages without the keys continue to render — new ingests stamp them.
3. **Backfill script.** Node script using `js-yaml` and the existing `frontmatter.ts` helper. For each `.md` under `delivery/`:
   - parse frontmatter
   - if `parent_cleargate_id` absent and `parent_ref` present → set `parent_cleargate_id` = `parent_ref` value
   - if `sprint_cleargate_id` absent → look for `sprint:` frontmatter key; fall back to first `SPRINT-\d+` regex match in body lines 1–50
   - write back if any change; otherwise log "skipped"
4. **Idempotency.** Re-running backfill on an already-populated file produces zero diff because the absent-key check short-circuits.

### 3.3 API Contract (MCP push payload — additive)

| Endpoint | Method | Auth | Request Shape (delta) | Response Shape |
|---|---|---|---|---|
| `cleargate_push_item` | tool call | Bearer | adds `parent_cleargate_id?: string \| null`, `sprint_cleargate_id?: string \| null` at request root | unchanged |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | (1) push extracts populated keys; (2) push tolerates null/absent; (3) backfill sniffs parent_ref; (4) backfill sniffs sprint frontmatter; (5) backfill idempotent. |
| E2E / acceptance tests | 1 | End-to-end push → MCP capture → assert payload (mocked MCP transport per existing push.ts test pattern). |

### 4.2 Definition of Done (The Gate)
- [ ] Push payload carries both keys (populated or null).
- [ ] Wiki-ingest agent contract names the propagation rule explicitly.
- [ ] Backfill script idempotent across two consecutive runs.
- [ ] All §2.1 Gherkin scenarios covered by unit tests.
- [ ] `npm run typecheck && npm test -- push-hierarchy` clean.
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenarios cover all detailed requirements in §1.2.
- [x] Implementation Guide maps to specific verified file paths from PROPOSAL-009 §3 + STORY-015-01 outputs.
- [x] No TBDs.
- [x] Lane = standard. Multi-file surface (CLI + agent + script), schema-shape change (push payload), bounce risk medium — fails the fast-lane rubric on multi-subsystem.

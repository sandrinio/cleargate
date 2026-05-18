---
story_id: STORY-027-04
parent_epic_ref: EPIC-027
parent_cleargate_id: EPIC-027
sprint_cleargate_id: SPRINT-27
carry_over: false
status: Completed
ambiguity: 🟢 Low
approved: true
approved_by: sandrinio
approved_at: 2026-05-14T20:00:00Z
context_source: |
  EPIC-027 §2 Scope (L2 warnings array + audit_log integration) + §5 Scenarios
  2 (unknown_type warning), 8 (missing_recommended_fields), implicit
  unknown_id_format from §6 Q8 (two valid cleargate_id formats: TYPE-NNN or
  5-digit numeric; anything else triggers L2 unknown_id_format advisory).
  SPRINT-27 §1 row STORY-027-04 (low bounce exposure) + §2.3 Shared-Surface
  Warning: "QA-Verify on CR-064 asserts warnings: [] on the smoke responses"
  — depends on -01 seeding KNOWN_TYPES with sprint + sprint_report so
  unknown_type doesn't fire for those.
actor: MCP push-item caller (cleargate-cli or adapter); audit-log consumer (admin UI / telemetry)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
lane: standard
area: mcp,validator,observability
created_at: 2026-05-15T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
created_at_version: cleargate@0.11.5
updated_at_version: cleargate@0.11.5
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-14T21:05:33Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-027-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-14T21:41:49Z
  sessions: []
---

# STORY-027-04: L2 Warnings Array + cleargate_id Format Check + audit_log Telemetry
**Complexity:** L2 — adds `warnings: Array<{code, message, field?}>` to `PushItemResult` + three warning codes + audit_log row writes. Parallel-eligible NO (Wave 2 #4; rebases on -01/-02/-03).

## 1. The Spec (The Contract)

### 1.1 User Story
As an AI agent or developer pushing items, I want non-fatal advisory warnings (unknown type, unknown ID format, missing recommended fields) returned alongside successful pushes, so that I can self-correct minor drift without round-tripping into a hard reject loop. As an admin UI / telemetry consumer, I want every L1 reject + L2 warning to write one audit_log row with `errorCode` populated, so that the observability pipeline can show real-time push hygiene per project.

### 1.2 Detailed Requirements
- R1: Extend `PushItemResult` with `warnings: Array<{code: string, message: string, field?: string}>` field (defaults to empty array on clean pushes).
- R2: Emit `unknown_type` warning when `payload.type` (post-normalize) is not in `KNOWN_TYPES`. Message: `"type '<type>' is not in KNOWN_TYPES (advisory)"`. Push still succeeds. Suppressed when origin is non-cleargate (adapters get clean responses).
- R3: Emit `missing_recommended_fields` warning when `payload.title` OR `payload.status` is missing. Message: `"recommended fields missing: <comma-list>"`. `field` property holds the comma-list. Push still succeeds.
- R4: Emit `unknown_id_format` warning when `cleargate_id` doesn't match either of the two valid formats per EPIC-027 §6 Q8:
  - TYPE-NNN convention: `^[A-Z][A-Z0-9_]*-\d+(-\d+)*$` (e.g. `EPIC-027`, `STORY-027-01`)
  - 5-digit numeric: `^\d{5}$` (e.g. `00027`, `12345`)
  - Anything else (length 1-128) triggers the warning; outside 1-128 hits the existing length check (L1 reject — verify currently exists).
  - Message: `"cleargate_id '<id>' does not match TYPE-NNN or 5-digit conventions (advisory)"`.
- R5: All warnings carry the structured shape `{code, message, field?}` consistently with the L1 error shape `{code, message, hint}` from -02. Warnings live in the success response (200); errors live in the failure response (400/404).
- R6: `audit_log` integration: every L1 reject (`invalid_type_format` from -01, `reserved_key` / `type_change_forbidden` / `payload_too_large` / `approved_not_boolean` from -02, `not_approved` existing, `item_not_found` from -03) writes one audit_log row with `errorCode = <code>`. Every L2 warning writes one row with `warningCode = <code>` (separate column or shared `code` column — verify schema in §3). Same telemetry value, no string parsing required for queries.
- R7: Audit_log rows include `origin` field (the `payload.origin` string from -03) so the future Admin UI can split adapter-vs-CLI push hygiene by source.
- R8: `audit_log` shape preserved; new columns are additive nullable. Migration if needed; verify existing schema during dev.
- R9: KNOWN_TYPES list confirmed to include `'sprint'` and `'sprint_report'` (seeded in -01) so CR-064 smoke pushes do NOT emit `unknown_type` warnings on those types. This is a precondition test in §2.1.

### 1.3 Out of Scope
- Schema-drift detection across projects (e.g., `status: "Done"` vs `status: "completed"`) — explicitly parking lot per EPIC-027.
- Admin UI rendering of warnings — separate Admin UI work.
- L3 `cleargate lint` warnings (frontmatter typos) — deferred to STORY-027-06 / SPRINT-28.
- Rate-limiting audit_log writes — separate concern (BUG-027 already addressed token-ledger fallback; audit_log volume not yet flagged).

### 1.4 Open Questions

> All resolved at Gate 1 ack via EPIC-027 §6 Q8.

- **Question:** Should cleargate_id have a format regex, or stay fully freeform within length bounds?
- **Recommended:** Two valid forms (TYPE-NNN OR 5-digit numeric); anything else triggers L2 `unknown_id_format` advisory.
- **Human decision (2026-05-14):** As recommended per EPIC-027 §6 Q8.

### 1.5 Risks
- **Risk:** Adapter pushes get noisy L2 warnings that adapter authors will treat as bugs and file tickets.
- **Mitigation:** R2 explicitly suppresses `unknown_type` for non-cleargate origins. `missing_recommended_fields` and `unknown_id_format` still fire — adapters should set title/status and use ID conventions if they want clean responses, but they're not blocked.

- **Risk:** audit_log volume balloons when a misconfigured caller hammers the API and trips three warnings per push.
- **Mitigation:** Existing audit_log already retained for L1 rejects; this story extends, doesn't introduce, the volume risk. Parking-lot rate-limiting if observed.

- **Risk:** Tests asserting `warnings: []` on smoke pushes (CR-064 dependency) fail because `KNOWN_TYPES` typo doesn't include `'sprint_report'` exactly.
- **Mitigation:** §3.1 file table reads `payload-contract.ts` literally during Architect M-plan review. QA-Verify on -01 already asserted KNOWN_TYPES contents (this story's R9 is the cross-check).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: L2 warnings array + cleargate_id format check + audit_log telemetry

  Scenario: Unknown type accepted with advisory warning (CLI origin)
    Given a member calls cleargate_push_item with type "risk-log" and origin "cleargate-cli" and approved: true
    When the request reaches the validator
    Then the item is stored with type "risk-log"
    And the response warnings array contains {code: "unknown_type", message: "type 'risk-log' is not in KNOWN_TYPES (advisory)"}
    And one audit_log row is written with warningCode "unknown_type" and origin "cleargate-cli"

  Scenario: Unknown type suppressed for adapter origin
    Given the Linear adapter pushes with type "epic-equivalent" and origin "adapter:linear"
    When the push runs
    Then the response warnings array is empty
    And no "unknown_type" audit_log row is written

  Scenario: KNOWN_TYPES includes sprint and sprint_report (CR-064 precondition)
    Given a member calls cleargate_push_item with type "sprint" and origin "cleargate-cli" and approved: true
    When the request reaches the validator
    Then the response warnings array contains no "unknown_type" entry
    And the same holds for type "sprint_report"

  Scenario: Missing title and status produce warnings
    Given a member calls cleargate_push_item with approved: true and payload omitting both title and status
    When the request reaches the validator
    Then the item is stored
    And the response warnings array contains {code: "missing_recommended_fields", message: "recommended fields missing: title, status", field: "title, status"}
    And one audit_log row is written with warningCode "missing_recommended_fields"

  Scenario: Missing only title produces single-field warning
    Given payload has status: "Done" but no title
    When the validator runs
    Then warnings contains {code: "missing_recommended_fields", field: "title"}

  Scenario: cleargate_id matching TYPE-NNN passes without unknown_id_format
    Given a member pushes cleargate_id "STORY-027-01"
    When the validator runs
    Then no "unknown_id_format" warning is emitted

  Scenario: cleargate_id matching 5-digit numeric passes without unknown_id_format
    Given a member pushes cleargate_id "00027"
    When the validator runs
    Then no "unknown_id_format" warning is emitted

  Scenario: cleargate_id outside both conventions triggers warning
    Given a member pushes cleargate_id "weird-id-format"
    When the validator runs
    Then the response warnings array contains {code: "unknown_id_format", message: "cleargate_id 'weird-id-format' does not match TYPE-NNN or 5-digit conventions (advisory)"}
    And the push succeeds

  Scenario: All L1 rejects emit audit_log row with errorCode
    Given each of the L1 errors fires (invalid_type_format, reserved_key, type_change_forbidden, payload_too_large, approved_not_boolean, not_approved, item_not_found)
    When the audit_log table is queried
    Then exactly one row per event has errorCode set to the matching code
    And origin column is populated from payload.origin (or "cleargate-cli" default)

  Scenario: Clean push returns empty warnings array
    Given a member pushes a known type with title + status + valid cleargate_id and origin cleargate-cli
    When the validator runs
    Then the response warnings is []
    And no L2 audit_log rows are written for this push
```

### 2.2 Verification Steps (Manual)
- [ ] `tsx --test mcp/src/tools/push-item.node.test.ts --grep "warnings"` passes all scenarios.
- [ ] Manual smoke: push a `sprint_report` type; assert `warnings: []` in response (CR-064 precondition gate).
- [ ] Query `SELECT errorCode, warningCode, origin FROM audit_log ORDER BY id DESC LIMIT 20` — both columns populated where expected.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `mcp/src/tools/push-item.ts` |
| Related Files | `mcp/src/lib/payload-contract.ts`, `mcp/src/lib/audit-log.ts` (verify path), `mcp/src/db/schema.ts` |
| Test Files | `mcp/src/tools/push-item.node.test.ts`, `mcp/src/lib/payload-contract.node.test.ts`, `mcp/src/lib/audit-log.node.test.ts` |
| Migration File | `mcp/migrations/<next>_add_warningcode_and_origin_to_audit_log.sql` — **REQUIRED** per SDR grep of schema.ts:134-152: errorCode exists, warningCode + origin ABSENT. |
| New Files Needed | Yes — one migration file (warningCode + origin columns) + extension of existing modules |

### 3.2 Technical Logic

1. Add `CLEARGATE_ID_TYPE_REGEX = /^[A-Z][A-Z0-9_]*-\d+(-\d+)*$/` + `CLEARGATE_ID_NUMERIC_REGEX = /^\d{5}$/` + `isKnownIdFormat(id)` helper to `payload-contract.ts`.
2. Extend `PushItemResult` type: add `warnings: Warning[]` where `Warning = {code: string, message: string, field?: string}`.
3. In `push-item.ts`, AFTER all L1 checks pass and BEFORE the DB write, build the warnings array:
   - `unknown_type`: if origin = cleargate-cli AND not in KNOWN_TYPES → push warning.
   - `missing_recommended_fields`: gather missing fields from `["title", "status"]`; if any missing → push warning with `field: missing.join(", ")`.
   - `unknown_id_format`: if `!isKnownIdFormat(cleargate_id)` → push warning.
4. After DB write success, write one audit_log row per warning with `warningCode` populated + `origin` field copied from `payload.origin`. Same pattern for L1 rejects (already in -01/-02; this story adds `origin` column).
5. Migration (if needed): `ALTER TABLE audit_log ADD COLUMN warningCode TEXT, ADD COLUMN origin TEXT;`. Both nullable. Verify the current `audit_log` schema in `mcp/src/db/schema.ts` first — columns may already exist.
6. Return path: `{cleargate_id, currentVersion, stored_type, warnings}` from pushItem.

### 3.3 API Contract

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `cleargate_push_item` | RPC | session token | unchanged from -01/-02/-03 | `{cleargate_id, currentVersion, stored_type, warnings: Array<{code, message, field?}>}` — `warnings` is new field |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 10 | One per Gherkin scenario in §2.1 |
| Integration tests | 2 | Round-trip: push triggers two warnings → audit_log shows two rows with correct codes; CR-064-precondition test (sprint + sprint_report → empty warnings) |
| Migration test | 1 | If migration runs, verify audit_log has warningCode + origin columns post-migrate |

### 4.2 Definition of Done
- [ ] All 10 §2.1 Gherkin scenarios green.
- [ ] `PushItemResult.warnings` exposed on success responses.
- [ ] Three warning codes (`unknown_type`, `missing_recommended_fields`, `unknown_id_format`) emit correctly.
- [ ] `audit_log` rows include `warningCode` (or shared `code`) and `origin` columns.
- [ ] KNOWN_TYPES verified to include sprint + sprint_report (CR-064 precondition).
- [ ] `npm run typecheck` clean; migration applied if added.
- [ ] Pre-commit hook clean.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story extends. The payload-contract module is created by STORY-027-01 and documented in §3.

- **Surface:** `mcp/src/tools/push-item.ts` line ~18 — PushItemResult type extended with warnings array. Coverage: additive.
- **Surface:** `mcp/src/middleware/audit.ts` — existing audit-log writer; pattern of one row per event preserved; columns extended.
- **Surface:** `mcp/src/admin-api/audit.ts` — audit-log query surface; affected if new columns added (additive nullable).
- **Surface:** `mcp/src/db/schema.ts` — audit_log table definition; possibly extended with two new nullable columns via migration.

## Why not simpler?

> L2 right-size + justify-complexity.

- **Smallest existing surface that could carry this:** Skip the warnings array entirely; return success silently. Adapters and CLI both get clean 200s.
- **Why isn't extension / parameterization / config sufficient?** EPIC-027's headline metric (§1 Success Metrics) is "Frontmatter typo class caught locally by `cleargate lint` before push round-trip in ≥90% of cases." That metric needs a baseline — without server-side L2 warnings, we cannot measure post-push warning-rate decline once L3 lint ships. The warnings array is the observability primitive that makes the metric measurable. Without it, every typo silently lands in the DB and the only telemetry signal is "user re-pushed N times." With the warnings + audit_log integration, the future Admin UI has a single query that surfaces push-hygiene per project per origin.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution**

Requirements satisfied:
- [x] Gherkin scenarios cover all §1.2 requirements R1-R9 (10 scenarios).
- [x] §3 Implementation Guide cites verified file paths.
- [x] No "TBD" markers (the one "verify path" note for audit-log.ts is a confirmation grep task, not unresolved spec).
- [x] `## Existing Surfaces` cites 4 source-tree paths.
- [x] `## Why not simpler?` answers both sub-bullets.
- [x] EPIC-027 §6 Q8 resolved (id format conventions).

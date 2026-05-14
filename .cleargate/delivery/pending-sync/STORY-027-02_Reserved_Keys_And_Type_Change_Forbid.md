---
story_id: STORY-027-02
parent_epic_ref: EPIC-027
parent_cleargate_id: EPIC-027
sprint_cleargate_id: SPRINT-27
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: |
  EPIC-027 §2 Scope (RESERVED_PAYLOAD_KEYS, type-change-forbid, payload size cap,
  approved_not_boolean) + §5 Scenarios 4-7 + §6 Q3 Answer (hard reject with
  guiding {code, message, hint} shape for all L1 rejects) + Q7 Answer
  (grandfathered items pass first re-push unchanged; lazy enforcement).
  SPRINT-27 §1 row STORY-027-02 (med bounce exposure) + §2.2 merge ordering
  (rebases on -01's payload-contract.ts module). EPIC-027 §3 audit_log
  errorCode contract: invalid_type_format / reserved_key / type_change_forbidden /
  payload_too_large / approved_not_boolean — this story implements 4 of them
  (-01 covers invalid_type_format already).
actor: MCP push-item caller (cleargate-cli or server-side adapter)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: mcp,validator
created_at: 2026-05-15T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
created_at_version: cleargate@0.11.5
updated_at_version: cleargate@0.11.5
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-14T21:05:29Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-027-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-14T21:22:33Z
  sessions: []
---

# STORY-027-02: Reserved Keys + Type-Change Forbid + Payload Size Cap + approved_not_boolean
**Complexity:** L2 — three new reject paths in push-item.ts + ValidationError class formalized + tests. Parallel-eligible NO (Wave 2 #2; rebases on -01's payload-contract.ts module).

## 1. The Spec (The Contract)

### 1.1 User Story
As an MCP push-item caller, I want clear guiding error messages when I send malformed payloads (reserved server-stamped keys, changed type for an existing ID, oversized payload, string-quoted booleans), so that AI agents can self-correct without spelunking the source.

### 1.2 Detailed Requirements
- R1: Add `RESERVED_PAYLOAD_KEYS = ['cleargate_id', 'type', 'server_pushed_at_version', 'pushed_by', 'pushed_at']` constant in `mcp/src/lib/payload-contract.ts`. Reject any push whose `payload.<reservedKey>` is set with `{code: "reserved_key", message: "payload contains reserved key '<key>'; this field is stamped by the server", hint: "remove '<key>' from your payload — the server populates it."}`.
- R2: Type-change forbid: if `cleargate_id` already exists with `type === X`, reject a push with `type !== X` with `{code: "type_change_forbidden", message: "cleargate_id '<id>' is type '<existing>'; cannot change to '<requested>'.", hint: "To reclassify, push under a new cleargate_id (e.g., '<NEW-PREFIX>-NNN'). The current item stays as '<existing>'."}`. Type comparison happens AFTER normalize (so `"Epic"` matches stored `"epic"`).
- R3: Grandfather clause per EPIC-027 §6 Q7: items whose first version pre-dates this Epic ship pass first re-push (lazy enforcement). Implementation: type-change check only fires when the stored row's `created_at_version` is `>= cleargate@0.12.0` (the SPRINT-27 release) OR a `currentVersion >= 2` indicates the item has been re-pushed under the new validator. Items at version 1 with pre-0.12.0 created_at_version skip the check on this push but lock-in the type for next push.
- R4: Payload size cap: env-configurable via `MCP_MAX_PAYLOAD_BYTES` (default 1048576 = 1 MB per EPIC-027 §6 Q1). Compute `Buffer.byteLength(JSON.stringify(payload), 'utf8')`. Reject oversize with `{code: "payload_too_large", message: "payload size <N> bytes exceeds limit <M>", hint: "set MCP_MAX_PAYLOAD_BYTES higher, or remove embedded artifacts from the payload"}`.
- R5: `approved_not_boolean` guard: when `payload.approved` exists but is not a boolean, reject with `{code: "approved_not_boolean", message: "approved must be boolean true, got <typeof>: <value>", hint: "use unquoted YAML: 'approved: true' (not 'approved: \"true\"')"}`. Triggers BEFORE the approved-gate check itself (so type errors surface before policy errors).
- R6: Formalize `ValidationError` class in `payload-contract.ts`: `class ValidationError extends Error { code: string; hint: string; constructor({code, message, hint}) }`. Exported for reuse by -03 (origin-gate split) and -04 (warnings array). HTTP layer maps it to 400 response shape.
- R7: All four new L1 rejects write one `audit_log` row per reject with `errorCode` populated. Existing audit_log convention extended; row shape preserved.
- R8: All four errors return the literal `{code, message, hint}` JSON shape on the wire — not wrapped, not stringified, not nested under `error.details`. Top-level keys.

### 1.3 Out of Scope
- Origin-based gate policy split — STORY-027-03.
- L2 warnings array (`unknown_type`, `missing_recommended_fields`, `unknown_id_format`) — STORY-027-04.
- L1 `invalid_type_format` errorCode — already shipped in STORY-027-01.
- Pull-tool 404 structured response — STORY-027-03.
- Server-side payload schema enforcement (KNOWN_TYPES gating) — explicitly advisory; no enforcement layer.

### 1.4 Open Questions

> All resolved at Gate 1 ack via EPIC-027 §6.

- **Question:** Should `MCP_MAX_PAYLOAD_BYTES` default to 1 MB or 4 MB?
- **Recommended:** 1 MB; raise based on observed distribution.
- **Human decision (2026-05-12):** 1 MB default per EPIC-027 §6 Q1.

- **Question:** Hard reject type-change or allow `force_type_migration: true`?
- **Recommended:** Hard reject always.
- **Human decision (2026-05-14):** Hard reject with guiding hint pointing to "push under new cleargate_id" per EPIC-027 §6 Q3.

- **Question:** Grandfather existing items or run one-time migration snapshot?
- **Recommended:** Grandfather.
- **Human decision (2026-05-14):** Grandfather; zero migration code per EPIC-027 §6 Q7.

### 1.5 Risks
- **Risk:** Grandfather clause check (R3) accidentally bypasses type-change forbid for legitimately newer items if `created_at_version` parsing is loose.
- **Mitigation:** Use strict semver comparison via existing `mcp/src/lib/version.ts` helper (verify path during dev; alt: parse with `node-semver` if helper absent). QA-Red writes a test for both edges (legacy item lazy-pass, new item hard-reject).

- **Risk:** Payload-size measurement skews under deep nested objects (JSON.stringify circular-reference behavior).
- **Mitigation:** Use Buffer.byteLength on JSON.stringify with a defensive try/catch; on stringify failure, reject with `payload_too_large` and message "payload not JSON-serializable" (degenerate-input protection).

- **Risk:** `audit_log` writes on rejected pushes amplify table growth if a misconfigured caller hammers the API.
- **Mitigation:** Existing audit_log already retained; this story preserves the pattern. Future rate-limit work is a separate concern (parking lot).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Reserved keys, type-change forbid, payload size cap, approved_not_boolean

  Scenario: Reserved key 'server_pushed_at_version' in payload rejected
    Given a member calls cleargate_push_item with payload.server_pushed_at_version set to "spoofed"
    When the request reaches the validator
    Then the response is a 400 with errorCode "reserved_key"
    And the response body has top-level keys {code, message, hint}
    And the message says "payload contains reserved key 'server_pushed_at_version'; this field is stamped by the server"
    And the hint says "remove 'server_pushed_at_version' from your payload — the server populates it."
    And no DB row is written
    And one audit_log row is written with errorCode "reserved_key"

  Scenario: Reserved key 'cleargate_id' in payload rejected
    Given a member calls cleargate_push_item with payload.cleargate_id set to "FAKE-001"
    When the request reaches the validator
    Then the response is a 400 with errorCode "reserved_key"
    And the message names the key "cleargate_id"

  Scenario: Type change between versions rejected (new item path)
    Given an item with cleargate_id "STORY-027-99" exists with type "story" at currentVersion 2
    When a member calls cleargate_push_item with cleargate_id "STORY-027-99" and type "bug"
    Then the response is a 400 with errorCode "type_change_forbidden"
    And the message says "cleargate_id 'STORY-027-99' is type 'story'; cannot change to 'bug'."
    And the hint mentions pushing under a new cleargate_id
    And the existing item's currentVersion is unchanged

  Scenario: Type change between versions allowed for grandfathered legacy item
    Given an item with cleargate_id "LEGACY-001" exists with type "story" and created_at_version "cleargate@0.11.4" and currentVersion 1
    When a member calls cleargate_push_item with cleargate_id "LEGACY-001" and type "bug"
    Then the push succeeds (lazy enforcement — type locks after this re-push)
    And the stored item now has type "bug" and currentVersion 2

  Scenario: Type change between versions rejected for grandfathered item on second re-push
    Given the previous scenario completed (LEGACY-001 now type "bug" at currentVersion 2)
    When a member calls cleargate_push_item with cleargate_id "LEGACY-001" and type "story"
    Then the response is a 400 with errorCode "type_change_forbidden"

  Scenario: Type comparison uses normalized form
    Given an item with cleargate_id "STORY-027-98" exists with type "story" at currentVersion 2
    When a member calls cleargate_push_item with cleargate_id "STORY-027-98" and type "Story"
    Then the push succeeds (normalize matches)

  Scenario: Payload size cap enforced at default 1 MB
    Given MCP_MAX_PAYLOAD_BYTES is unset (defaults to 1048576)
    And a member calls cleargate_push_item with a payload of 1100000 bytes
    When the request reaches the validator
    Then the response is a 400 with errorCode "payload_too_large"
    And the message says "payload size 1100000 bytes exceeds limit 1048576"

  Scenario: Payload size cap respects env override
    Given MCP_MAX_PAYLOAD_BYTES is set to 4194304
    And a member calls cleargate_push_item with a payload of 2000000 bytes
    When the request reaches the validator
    Then the push succeeds

  Scenario: Approved as string rejected with guiding message
    Given a member calls cleargate_push_item with payload.approved set to the string "true"
    When the request reaches the validator
    Then the response is a 400 with errorCode "approved_not_boolean"
    And the message says "approved must be boolean true, got string: \"true\""
    And the hint says "use unquoted YAML: 'approved: true' (not 'approved: \"true\"')"
    And no DB row is written

  Scenario: All four L1 rejects share the {code, message, hint} shape
    Given any of the four L1 errors fires (reserved_key, type_change_forbidden, payload_too_large, approved_not_boolean)
    When the response body is parsed
    Then the top-level keys are exactly {code, message, hint}
    And no key is nested under "error" or "details"
```

### 2.2 Verification Steps (Manual)
- [ ] `tsx --test mcp/src/tools/push-item.node.test.ts --grep "reserved_key|type_change|payload_too_large|approved_not_boolean"` passes.
- [ ] `grep -rn "ValidationError" mcp/src/` shows the class imported by push-item.ts + payload-contract.ts.
- [ ] Push a payload with `server_pushed_at_version: "spoofed"` via dev mcp server; observe 400 with the exact JSON shape.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `mcp/src/tools/push-item.ts` |
| Related Files | `mcp/src/lib/payload-contract.ts`, `mcp/src/db/schema.ts` |
| Test Files | `mcp/src/tools/push-item.node.test.ts`, `mcp/src/lib/payload-contract.node.test.ts` |
| New Files Needed | No — extends -01's payload-contract.ts and the existing push-item.ts |

### 3.2 Technical Logic

1. Extend `payload-contract.ts` with `RESERVED_PAYLOAD_KEYS` constant, `ValidationError` class, and `MAX_PAYLOAD_BYTES_DEFAULT = 1048576`.
2. In `push-item.ts`, BEFORE the existing validator chain, add a sequence of checks (each throws `ValidationError`):
   - **Reserved-key check:** `Object.keys(payload).find(k => RESERVED_PAYLOAD_KEYS.includes(k))` — if hit, throw with `code: "reserved_key"`.
   - **Type-change check:** query existing row by `cleargate_id`; if exists AND `(currentVersion >= 2 OR created_at_version >= "cleargate@0.12.0")` AND `normalizeType(payload.type) !== existing.type` → throw `type_change_forbidden`.
   - **Payload-size check:** `Buffer.byteLength(JSON.stringify(payload), 'utf8') > (parseInt(process.env.MCP_MAX_PAYLOAD_BYTES) || 1048576)` → throw `payload_too_large`.
   - **approved_not_boolean check:** `payload.approved !== undefined && typeof payload.approved !== "boolean"` → throw `approved_not_boolean`.
3. HTTP layer (verify path during dev — likely `mcp/src/server.ts` or middleware) catches `ValidationError` and writes `400` with body `{code, message, hint}`.
4. `audit_log` write per reject: use existing helper (verify name — likely `writeAuditLogRow` in `mcp/src/lib/audit-log.ts`). Each catch branch writes one row with `errorCode = e.code`.

### 3.3 API Contract

| Endpoint | Method | Auth | Request Shape | Response Shape (error) |
|---|---|---|---|---|
| `cleargate_push_item` | RPC | session token | `{cleargate_id, type, payload, approved?}` | `{code: string, message: string, hint: string}` on 400 |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 10 | One per Gherkin scenario in §2.1 |
| Integration tests | 2 | Round-trip: ValidationError → 400 response shape; audit_log row write verification |

### 4.2 Definition of Done
- [ ] All 10 §2.1 Gherkin scenarios green under `tsx --test`.
- [ ] `RESERVED_PAYLOAD_KEYS`, `ValidationError`, `MAX_PAYLOAD_BYTES_DEFAULT` exported from `payload-contract.ts`.
- [ ] Four new errorCodes (`reserved_key`, `type_change_forbidden`, `payload_too_large`, `approved_not_boolean`) emit `audit_log` rows.
- [ ] Grandfather clause verified by two-pair test (legacy lazy-pass + post-lock hard-reject).
- [ ] `npm run typecheck` clean.
- [ ] Pre-commit hook clean.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story extends. The new payload-contract module is created by STORY-027-01 and documented in §3.

- **Surface:** `mcp/src/tools/push-item.ts` lines ~110-114 (approved gate check) — type-change-forbid check is inserted ABOVE this block (before policy gates fire).
- **Surface:** `mcp/src/db/schema.ts` items-table columns for created_at_version and currentVersion — used by R3 grandfather clause; no schema change.
- **Surface:** `mcp/src/middleware/audit.ts` — existing audit-log writer; pattern preserved; new errorCode strings added to its registry of accepted codes if such a registry exists.
- **Surface:** `mcp/src/admin-api/audit.ts` — audit-log query surface; verified for shape compatibility.

## Why not simpler?

> L2 right-size + justify-complexity.

- **Smallest existing surface that could carry this:** Inline the four checks directly in `push-item.ts` (no shared `ValidationError` class). ~40 LOC of inline throws.
- **Why isn't extension / parameterization / config sufficient?** The four checks all produce the same wire-shape `{code, message, hint}` and all write `audit_log` rows. A shared `ValidationError` class is the only way to keep the HTTP layer's catch-block ergonomic (one `instanceof` check vs. four inline string-prefix matches). The class also becomes the contract `-03` (origin-gate split) and `-04` (warnings array) both reuse, avoiding a same-sprint refactor.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution**

Requirements satisfied:
- [x] Gherkin scenarios cover all §1.2 requirements R1-R8 (10 scenarios).
- [x] §3 Implementation Guide cites verified file paths (`push-item.ts:110-114`, `db/schema.ts`, `payload-contract.ts`).
- [x] No "TBD" markers. Two "verify path during dev" notes appear in §3.2 for `mcp/src/server.ts` HTTP layer and `mcp/src/lib/audit-log.ts` — these are confirmation grep tasks for the Developer, not unresolved spec ambiguity.
- [x] `## Existing Surfaces` cites 5 source-tree paths.
- [x] `## Why not simpler?` answers both sub-bullets.
- [x] All relevant EPIC-027 §6 questions resolved (Q1, Q3, Q7).

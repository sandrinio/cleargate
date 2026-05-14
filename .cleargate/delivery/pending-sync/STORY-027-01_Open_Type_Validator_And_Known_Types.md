---
story_id: STORY-027-01
parent_epic_ref: EPIC-027
parent_cleargate_id: EPIC-027
sprint_cleargate_id: SPRINT-27
carry_over: false
status: Approved
ambiguity: 🟢 Low
approved: true
approved_by: sandrinio
approved_at: 2026-05-14T20:00:00Z
context_source: |
  EPIC-027 §2 Scope (open type validator + KNOWN_TYPES) + §5 Scenarios 1-3 +
  §6 Q2 Answer (KNOWN_TYPES location: mcp/src/lib/payload-contract.ts for SPRINT-27;
  npm-package extraction deferred to SPRINT-28 STORY-027-07). SPRINT-27 plan §1
  row STORY-027-01 + §2.2 merge ordering anchor (this story creates
  payload-contract.ts; -02/-03/-04 rebase). Architect M-plan must seed
  KNOWN_TYPES with 'sprint' + 'sprint_report' so CR-064 smoke pushes emit no
  unknown_type warning (SPRINT-27 §2.3 mitigation).
actor: MCP push-item caller (cleargate-cli or server-side adapter)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
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
  last_gate_check: 2026-05-14T20:57:39Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-027-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-14T21:41:53Z
  sessions: []
---

# STORY-027-01: Open Type Validator + Normalize + KNOWN_TYPES Registry
**Complexity:** L2 — one new module + one validator swap in push-item.ts + tests. Parallel-eligible NO (Wave 2 head; -02/-03/-04 rebase on the new module).

## 1. The Spec (The Contract)

### 1.1 User Story
As an MCP push-item caller (cleargate-cli today, server-side adapters tomorrow), I want to push any lowercase-kebab type string without coordinating a Zod-enum bump, so that new artifact classes (sprints, sprint reports, future Jira/Linear/Azure imports) sync without an MCP code change.

### 1.2 Detailed Requirements
- R1: Replace the closed `ITEM_TYPES` Zod enum at `mcp/src/tools/push-item.ts:7-14` with an open string validator: `z.string().min(1).max(64).regex(/^[a-z][a-z0-9_-]*$/)`.
- R2: Apply server-side normalize BEFORE validation: `trim().toLowerCase().replace(/\s+/g, '-')`. Mixed-case inputs like `"Epic"` store as `"epic"` without warning.
- R3: Return the normalized form on `PushItemResult.stored_type` so callers can detect drift between request and stored value.
- R4: Create new module `mcp/src/lib/payload-contract.ts` exporting:
  - `KNOWN_TYPES: readonly string[]` — advisory list seeded with `['initiative', 'epic', 'story', 'bug', 'cr', 'proposal', 'sprint', 'sprint_report']`. Used by STORY-027-04 to emit L2 `unknown_type` warning; does NOT gate in this story.
  - `normalizeType(input: string): string` — pure normalize function used by validator + tests.
  - `TYPE_REGEX: RegExp` — exported for reuse by lint (STORY-027-06, deferred).
- R5: Invalid formats (special chars, leading digit, empty, >64 chars) reject with errorCode `invalid_type_format`. Error shape: `{code, message, hint}` per EPIC-027 §6 Q3 — `hint` says "type must match /^[a-z][a-z0-9_-]*$/ after normalize (1-64 chars)".
- R6: Existing six type strings (`initiative`, `epic`, `story`, `bug`, `cr`, `proposal`) continue to push identically — no backward-incompat.
- R7: `// TODO(SPRINT-28): extract to @cleargate/types` comment on the KNOWN_TYPES constant per SPRINT-27 §3 risk mitigation (deferred npm-package extraction).

### 1.3 Out of Scope
- L2 `unknown_type` warning emission — that's STORY-027-04's warnings-array work.
- `RESERVED_PAYLOAD_KEYS` constant + reject logic — STORY-027-02.
- Type-change-forbid logic — STORY-027-02.
- Origin-based gate policy split — STORY-027-03.
- `cleargate lint` CLI command — deferred to STORY-027-06 / SPRINT-28.
- `@cleargate/types` npm package extraction — deferred to STORY-027-07 / SPRINT-28.

### 1.4 Open Questions

> All resolved at Gate 1 ack 2026-05-14 (EPIC-027 §6 Q2 + Q8 cover this story's open items).

- **Question:** Should `KNOWN_TYPES` live in MCP server module or shared npm package?
- **Recommended:** MCP server module for now; extract to `@cleargate/types` in SPRINT-28.
- **Human decision (2026-05-14):** MCP server module per EPIC-027 §6 Q2.

### 1.5 Risks
- **Risk:** Existing items pushed with mixed-case types (none in current data, but theoretically possible) would store under the normalized form on next re-push, possibly breaking cleargate_id lookups if a caller assumed exact-string match.
- **Mitigation:** Existing six types are already canonical lowercase per `.cleargate/templates/*.md`. No data migration needed. CR-064 smoke push will hit `'sprint'` + `'sprint_report'` first; both are net-new types so collision is impossible.

- **Risk:** KNOWN_TYPES becoming a soft-enforced "schema-by-convention" rather than truly advisory — devs may treat `unknown_type` warning as a blocker.
- **Mitigation:** Warning-only contract documented in §3 + protocol §"Type & Payload Contract" (added by STORY-027-05). Adapter-origin pushes still succeed even for unknown types.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Open type validator + normalize + KNOWN_TYPES registry

  Scenario: Mixed-case type normalizes to lowercase
    Given a member calls cleargate_push_item with type "Epic" and approved: true and origin "cleargate-cli"
    When the request reaches the validator
    Then the item is stored with type "epic"
    And the response contains stored_type: "epic"
    And no warning is emitted for type case

  Scenario: Whitespace in type normalizes to kebab
    Given a member calls cleargate_push_item with type "  Sprint Report  "
    When the request reaches the validator
    Then the item is stored with type "sprint-report"
    And stored_type is "sprint-report"

  Scenario: Unknown but valid type accepted (warning deferred to STORY-027-04)
    Given a member calls cleargate_push_item with type "risk-log" and approved: true and origin "cleargate-cli"
    When the request reaches the validator
    Then the item is stored with type "risk-log"
    And the push succeeds with version 1
    And the response is a 200

  Scenario: Invalid type format rejected
    Given a member calls cleargate_push_item with type "!!bad type!!"
    When the request reaches the validator
    Then the response is a 400 with errorCode "invalid_type_format"
    And the error has shape {code, message, hint}
    And the hint says "type must match /^[a-z][a-z0-9_-]*$/ after normalize (1-64 chars)"
    And no DB row is written

  Scenario: Leading digit in type rejected
    Given a member calls cleargate_push_item with type "1story"
    When the request reaches the validator
    Then the response is a 400 with errorCode "invalid_type_format"

  Scenario: Empty type rejected
    Given a member calls cleargate_push_item with type ""
    When the request reaches the validator
    Then the response is a 400 with errorCode "invalid_type_format"

  Scenario: Over-length type rejected
    Given a member calls cleargate_push_item with type "a" repeated 65 times
    When the request reaches the validator
    Then the response is a 400 with errorCode "invalid_type_format"

  Scenario: All six legacy types push unchanged
    Given a member calls cleargate_push_item with each of [initiative, epic, story, bug, cr, proposal]
    When each request reaches the validator
    Then each item is stored with its input type
    And stored_type equals the input

  Scenario: KNOWN_TYPES includes sprint and sprint_report
    Given the payload-contract module is imported
    When KNOWN_TYPES is read
    Then it contains both "sprint" and "sprint_report"
```

### 2.2 Verification Steps (Manual)
- [ ] `tsx --test mcp/src/tools/push-item.node.test.ts` passes all new scenarios.
- [ ] `grep -n "ITEM_TYPES" mcp/src/tools/push-item.ts` returns zero hits after the swap.
- [ ] `node -e "console.log(require('./mcp/dist/lib/payload-contract').KNOWN_TYPES)"` lists 8 entries including sprint + sprint_report.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `mcp/src/tools/push-item.ts` |
| Related Files | `mcp/src/lib/payload-contract.ts`, `mcp/src/mcp/register-tools.ts` (SDR amendment: line 5 imports ITEM_TYPES — drop with the validator swap) |
| Test Files | `mcp/src/tools/push-item.node.test.ts`, `mcp/src/lib/payload-contract.node.test.ts` |
| New Files Needed | Yes — `mcp/src/lib/payload-contract.ts`, `mcp/src/lib/payload-contract.node.test.ts` |

### 3.2 Technical Logic

1. Create `mcp/src/lib/payload-contract.ts` with `KNOWN_TYPES`, `TYPE_REGEX`, `normalizeType()`.
2. In `push-item.ts`, replace the `ITEM_TYPES` enum import + Zod usage. The new Zod schema: `type: z.string().min(1).max(64).regex(TYPE_REGEX).transform(normalizeType)` — though regex+transform ordering matters; preferred pattern is to call `normalizeType` in a `preprocess` step BEFORE the regex check so mixed-case inputs aren't rejected as invalid format.
3. Returned `PushItemResult` gains `stored_type: string` (the post-normalize form). Existing callers that destructure `{ cleargate_id, currentVersion }` are unaffected; new field is additive.
4. Error throw on regex failure: `throw new ValidationError({ code: 'invalid_type_format', message: '...', hint: 'type must match ...' })`. The `ValidationError` class itself is created in STORY-027-02; this story imports the placeholder from `payload-contract.ts` (forward-declared interface, full class added by -02).

### 3.3 API Contract

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `cleargate_push_item` (MCP tool) | RPC | session token | `{cleargate_id, type, payload, approved?, ...}` | `{cleargate_id, currentVersion, stored_type}` (stored_type is new field) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 9 | One per Gherkin scenario in §2.1 |
| Integration tests | 1 | Round-trip: push `"Epic"` → pull → assert `type === "epic"` |

### 4.2 Definition of Done
- [ ] All 9 §2.1 Gherkin scenarios green under `tsx --test`.
- [ ] `mcp/src/tools/push-item.ts:7-14` ITEM_TYPES enum removed.
- [ ] `mcp/src/lib/payload-contract.ts` exports KNOWN_TYPES (incl. sprint + sprint_report), TYPE_REGEX, normalizeType.
- [ ] `mcp/dist/` rebuilt; `npm run typecheck` clean in mcp/.
- [ ] No CR-064-smoke `unknown_type` warning when pushing `type: "sprint"` (asserted in -04 + CR-064; this story sets up the precondition).
- [ ] Pre-commit hook clean.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story extends.

- **Surface:** `mcp/src/tools/push-item.ts:7-14` (`ITEM_TYPES` Zod enum) — the closed-enum validator to swap. Coverage of this story: 100% — direct replacement.
- **Surface:** `mcp/src/db/schema.ts:92` (`type: text().notNull()` with vocabulary comment) — DB column is already type-agnostic. Coverage: zero schema change required; comment update is STORY-027-05's docs work.
- **Surface:** `mcp/src/tools/push-item.ts:18` (`PushItemResult` type) — extended with `stored_type` field. Coverage: additive.
- **Surface:** `.cleargate/templates/*.md` — frontmatter convention uses the six canonical lowercase types today. Coverage: zero change; KNOWN_TYPES echoes them.

## Why not simpler?

> L2 right-size + justify-complexity.

- **Smallest existing surface that could carry this:** Inline the open-string regex directly in `push-item.ts` (no new module). ~10 LOC.
- **Why isn't extension / parameterization / config sufficient?** Three subsequent stories (-02 reserved keys + type-change forbid, -03 origin-gate split, -04 warnings array) all need to import the same constants (`KNOWN_TYPES`, `TYPE_REGEX`, normalize function, plus `RESERVED_PAYLOAD_KEYS` from -02). Extracting them into a single `payload-contract.ts` module up front avoids three rounds of import-restructuring as later stories land. The module also becomes the natural seed for the deferred `@cleargate/types` npm package (STORY-027-07).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution**

Requirements satisfied:
- [x] Gherkin scenarios cover all §1.2 requirements (R1-R7 → 9 scenarios).
- [x] §3 Implementation Guide cites verified file paths (`push-item.ts:7-14`, `schema.ts:92`, `push-item.ts:18`).
- [x] No "TBD" markers anywhere in document.
- [x] `## Existing Surfaces` cites 4 source-tree paths.
- [x] `## Why not simpler?` answers both sub-bullets.
- [x] All 8 EPIC-027 §6 questions resolved (relevant: Q2 + Q8). Q2 locks KNOWN_TYPES to mcp/src/lib/payload-contract.ts.

---
story_id: STORY-027-03
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
  EPIC-027 §2 Scope (origin-based gate policy split + idempotent advisory prefix +
  pull 404 clarification) + §5 Scenarios 8-11 + §6 Q4 Answer (payload.origin
  string convention: cleargate-cli, adapter:<vendor>, system:<service>; CLI
  stamps automatically). SPRINT-27 §1 row STORY-027-03 (high bounce exposure)
  + §2.3 Shared-Surface Warning: "M-plan must begin with grep -rn
  'pushItem|cleargate_push_item|skipApprovedGate' mcp/src/ audit, cited
  verbatim in §3". skipApprovedGate kept as deprecated alias one minor.
actor: MCP push-item caller (cleargate-cli stamps origin; adapter callers set explicit origin)
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: high
lane: standard
area: mcp,validator,policy
created_at: 2026-05-15T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
created_at_version: cleargate@0.11.5
updated_at_version: cleargate@0.11.5
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-14T21:05:31Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-027-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-14T21:26:40Z
  sessions: []
---

# STORY-027-03: Origin-Based Gate Policy Split + Idempotent Advisory Prefix + Structured Pull 404
**Complexity:** L3 — gate-policy refactor touches every `pushItem()` caller; high bounce exposure. Parallel-eligible NO (Wave 2 #3; rebases on -01/-02).

## 1. The Spec (The Contract)

### 1.1 User Story
As a server-side adapter pulling issues from Jira/Linear/Azure, I want my pushes to bypass ClearGate-process gates (approved-flag, cached_gate_result.pass) automatically by signaling `payload.origin = "adapter:<vendor>"`, so that the brittle `skipApprovedGate: true` hand-flag goes away and the gates fire only on ClearGate-CLI-originated pushes.

### 1.2 Detailed Requirements
- R1: Wrap the existing approved-gate check at `mcp/src/tools/push-item.ts:110-114` in `if (payload.origin === "cleargate-cli") { ... }`. Same for the cached_gate_result check at `:122-138`.
- R2: Document the `payload.origin` convention in `cleargate-protocol.md` (the actual doc edit lands in STORY-027-05; this story's job is to USE the convention and define the recognized values in `payload-contract.ts`):
  - `"cleargate-cli"` — gates fire (approved required + cached_gate advisory prefix)
  - `"adapter:linear"` / `"adapter:jira"` / `"adapter:azure"` — gates bypassed
  - `"system:sync-status"` — gates bypassed (internal caller)
  - any other string — gates bypassed (default-open for forward-compat with future adapters)
  - missing / `undefined` — treated as `"cleargate-cli"` for backward-compat (the existing six caller types are all CLI-originated today)
- R3: Export `ORIGIN_CLEARGATE_CLI = "cleargate-cli"` + `originRequiresGates(origin): boolean` helper from `payload-contract.ts`. The helper is the single decision point — both gate checks call it.
- R4: Backward-compat: `PushItemContext.skipApprovedGate` boolean kept as deprecated alias. If `skipApprovedGate === true` is set, treat as `origin = "system:legacy-skip"` (gates bypass). Emit a `console.warn` (server-side log only, not in response) on first observation per process: "skipApprovedGate is deprecated; set payload.origin = 'system:<service>' instead". Remove in SPRINT-28+.
- R5: Migrate the one known caller (`mcp/src/tools/sync-status.ts`) from `skipApprovedGate: true` to setting `payload.origin = "system:sync-status"`. Audit: `grep -rn "skipApprovedGate" mcp/src/` must return zero hits in calling-code AFTER this story; the field itself remains in the type definition with `/** @deprecated use payload.origin */`.
- R6: Idempotent body advisory prefix: the existing logic at `mcp/src/tools/push-item.ts:160-175` re-prepends `[advisory: gate_failed — <criteria>]` on every re-push, stacking lines on the second-and-later push. Add a regex check: if the body already starts with `[advisory: gate_failed —`, REPLACE that line in place (keeping the rest of the body intact). Detection regex: `/^\[advisory: gate_failed — [^\]]+\]\n/`.
- R7: Structured pull 404: `mcp/src/tools/pull-item.ts` currently returns a generic 404 when no row matches the requested `cleargate_id`. Change to `{code: "item_not_found", message: "no item with cleargate_id '<id>'", hint: "push it first, or check the cleargate_id"}`.
- R8: `payload.origin` is OPTIONAL in the request schema; defaults to `"cleargate-cli"` when missing. CLI side: `cleargate-cli/src/commands/push.ts` stamps `payload.origin = "cleargate-cli"` automatically on every push (small CLI edit included in this story's surface).

### 1.3 Out of Scope
- L2 warnings array (`unknown_type`, `missing_recommended_fields`) — STORY-027-04.
- `audit_log` errorCode integration for the new behaviors — already covered by -02's pattern; this story emits its own audit rows for `not_approved` (existing code, no new code here).
- Removing `skipApprovedGate` from `PushItemContext` type — deferred one minor (next sprint cycle); this story marks deprecated.
- Building actual Jira/Linear/Azure adapters — separate epic.

### 1.4 Open Questions

> All resolved at Gate 1 ack via EPIC-027 §6 Q4.

- **Question:** Is `payload.origin` the right signal, or should it be a server-side flag set when the call originates from an MCP-tool invocation?
- **Recommended:** payload.origin string set by caller; document the convention.
- **Human decision (2026-05-12):** payload.origin string convention; CLI stamps automatically per EPIC-027 §6 Q4.

### 1.5 Risks
- **Risk:** Hidden caller of `pushItem()` somewhere in `mcp/src/` that doesn't set `skipApprovedGate` but also doesn't pass `payload.origin = "cleargate-cli"` — after R2 (missing origin defaults to cleargate-cli), gates would fire on a server-internal path that previously bypassed them.
- **Mitigation:** §3 begins with exhaustive grep (`grep -rn "pushItem\|cleargate_push_item\|skipApprovedGate" mcp/src/`); each hit gets a `payload.origin = "system:<name>"` explicit set. QA-Verify re-runs the grep and checks every result.

- **Risk:** Idempotent prefix regex (R6) misses a variant (e.g., trailing whitespace, slightly different bracket style) and stacks anyway.
- **Mitigation:** QA-Red writes a test scenario: push twice with `pass: false`, assert exactly one `[advisory: gate_failed —` line in stored body. Architect M-plan locks regex to the exact format the writer emits.

- **Risk:** CLI default-stamp (R8) breaks adapter callers who don't use the CLI but also rely on the legacy `skipApprovedGate` mechanism.
- **Mitigation:** R4 keeps the deprecation alias one minor. The CLI default-stamp is additive; non-CLI callers are unaffected (they set their own origin).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Origin-based gate policy split + idempotent advisory prefix + structured pull 404

  Scenario: Adapter-origin push bypasses approved gate
    Given the Linear adapter constructs a push with payload.origin = "adapter:linear" and no approved field
    When pushItem is called server-side
    Then the push succeeds (no PushNotApprovedError)
    And the stored item is at currentVersion 1
    And the audit_log has no "not_approved" row for this push

  Scenario: Adapter-origin push bypasses cached_gate_result check
    Given the Jira adapter constructs a push with payload.origin = "adapter:jira" and cached_gate_result.pass = false
    When pushItem is called server-side
    Then the push succeeds
    And the stored body has NO "[advisory: gate_failed —" prefix line

  Scenario: ClearGate CLI push without approved still rejected
    Given a member calls cleargate_push_item with payload.origin = "cleargate-cli" and approved omitted
    When the request reaches the validator
    Then the response is a 400 with errorCode "not_approved"

  Scenario: Missing origin defaults to cleargate-cli (backward-compat)
    Given a member calls cleargate_push_item with no payload.origin field and approved omitted
    When the request reaches the validator
    Then the response is a 400 with errorCode "not_approved"

  Scenario: Legacy skipApprovedGate flag still bypasses (deprecation alias)
    Given a server-internal caller invokes pushItem with skipApprovedGate: true and approved omitted
    When pushItem runs
    Then the push succeeds
    And one console.warn line "skipApprovedGate is deprecated; set payload.origin" is logged

  Scenario: system:sync-status origin bypasses gates
    Given mcp/src/tools/sync-status.ts invokes pushItem with payload.origin = "system:sync-status" and approved omitted
    When pushItem runs
    Then the push succeeds without firing gates

  Scenario: Advisory body prefix is idempotent on re-push
    Given an item was pushed with cached_gate_result.pass: false (advisory line "[advisory: gate_failed — discovery-checked]\n" injected once at body top)
    When a member re-pushes the same item with the same body (advisory line still present) AND cached_gate_result.pass still false
    Then the stored body has exactly one "[advisory: gate_failed —" line at top
    And the failing-criteria portion of the line reflects the latest gate check

  Scenario: Advisory prefix replaced when failing criteria change
    Given an item's stored body starts with "[advisory: gate_failed — discovery-checked]\n"
    When a re-push arrives with cached_gate_result.failing_criteria = ["dod-declared"]
    Then the stored body starts with "[advisory: gate_failed — dod-declared]\n" (single line, criterion updated)

  Scenario: Pull of unknown id returns structured 404
    Given no item exists with cleargate_id "NONESUCH-999"
    When a member calls cleargate_pull_item with cleargate_id "NONESUCH-999"
    Then the response is a 404 with body {code: "item_not_found", message: "no item with cleargate_id 'NONESUCH-999'", hint: "push it first, or check the cleargate_id"}

  Scenario: Audit grep returns zero callers using skipApprovedGate after migration
    Given STORY-027-03 has merged
    When running `grep -rn "skipApprovedGate: true" mcp/src/`
    Then zero call sites remain
    And the type definition still has the `skipApprovedGate?: boolean /** @deprecated */` field
```

### 2.2 Verification Steps (Manual)
- [ ] `grep -rn "pushItem\|cleargate_push_item\|skipApprovedGate" mcp/src/` audit cited in PR description; every hit verified to set origin explicitly or use cleargate-cli default.
- [ ] Push the same item twice with `cached_gate_result.pass: false`; assert exactly one advisory line in DB row.
- [ ] Call `cleargate_pull_item` with a fake ID; observe `{code, message, hint}` 404 shape.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `mcp/src/tools/push-item.ts` |
| Related Files | `mcp/src/tools/pull-item.ts`, `mcp/src/tools/sync-status.ts`, `mcp/src/lib/payload-contract.ts`, `cleargate-cli/src/commands/push.ts` |
| Test Files | `mcp/src/tools/push-item.node.test.ts`, `mcp/src/tools/pull-item.node.test.ts`, `mcp/src/tools/sync-status.node.test.ts` |
| New Files Needed | No — extends existing modules |

### 3.2 Technical Logic

1. Add to `payload-contract.ts`: `ORIGIN_CLEARGATE_CLI = "cleargate-cli"`, `originRequiresGates(origin?: string): boolean { return (origin ?? ORIGIN_CLEARGATE_CLI) === ORIGIN_CLEARGATE_CLI; }`.
2. In `push-item.ts`, wrap the approved gate (line ~110-114) and cached_gate check (line ~122-138) in `if (originRequiresGates(payload.origin) && !ctx.skipApprovedGate) { ... }`.
3. Idempotent prefix at line ~160-175: read existing body, strip leading `/^\[advisory: gate_failed — [^\]]+\]\n/` if present, then prepend the new line. Result: exactly one advisory line at body top per push.
4. In `pull-item.ts`, replace the generic 404 throw with `throw new NotFoundError({code: "item_not_found", message: ..., hint: ...})`; HTTP layer catches and returns 404 with body shape.
5. In `sync-status.ts`, replace `skipApprovedGate: true` with `payload.origin = "system:sync-status"` on every pushItem call.
6. In `cleargate-cli/src/commands/push.ts`, before invoking `cleargate_push_item`, ensure `payload.origin = "cleargate-cli"` (stamp idempotently — if user has set it for some reason, respect their value).
7. Deprecation warning: maintain a module-level `Set<string>` of warning-emitted call sites; warn once per `skipApprovedGate: true` observation, not on every call (avoid log spam).

### 3.3 API Contract

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `cleargate_push_item` | RPC | session token | `{cleargate_id, type, payload: {..., origin?: string}}` | unchanged on success; new error path for `not_approved` covers missing-origin default |
| `cleargate_pull_item` | RPC | session token | `{cleargate_id}` | 200: `{...item}`; 404: `{code: "item_not_found", message, hint}` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 10 | One per Gherkin scenario in §2.1 |
| Integration tests | 2 | Round-trip: adapter push without approved → 200 + stored row; CLI push without approved → 400 |
| Migration audit | 1 | grep test asserting zero `skipApprovedGate: true` in mcp/src/ |

### 4.2 Definition of Done
- [ ] All 10 §2.1 Gherkin scenarios green.
- [ ] `grep -rn "skipApprovedGate: true" mcp/src/` returns zero (excluding type definition + deprecation comment).
- [ ] sync-status.ts migrated to `payload.origin = "system:sync-status"`.
- [ ] cleargate-cli push.ts stamps `payload.origin = "cleargate-cli"` automatically.
- [ ] Re-push test confirms exactly one advisory prefix line.
- [ ] `cleargate_pull_item` of unknown ID returns `{code, message, hint}` body.
- [ ] `npm run typecheck` clean both in `mcp/` and `cleargate-cli/`.
- [ ] Pre-commit hook clean.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story extends. The payload-contract module is created by STORY-027-01 and documented in §3.

- **Surface:** `mcp/src/tools/push-item.ts` line ~39 — PushItemContext skipApprovedGate boolean field kept as deprecated alias one minor; no removal.
- **Surface:** `mcp/src/tools/push-item.ts` lines ~110-114 — approved gate check wrapped in originRequiresGates() guard. No logic change inside the block.
- **Surface:** `mcp/src/tools/push-item.ts` lines ~122-138 — cached-gate check same wrap pattern.
- **Surface:** `mcp/src/tools/push-item.ts` lines ~160-175 — advisory body prefix injection augmented with leading-match strip-and-replace.
- **Surface:** `mcp/src/tools/pull-item.ts` — generic 404 throw replaced with structured NotFoundError. Coverage: 100% surface swap.
- **Surface:** `mcp/src/tools/sync-status.ts` — current skipApprovedGate caller; migrated to use payload origin system:sync-status.
- **Surface:** `cleargate-cli/src/commands/push.ts` — additive stamp of payload origin cleargate-cli before MCP invocation.

## Why not simpler?

> L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this:** Keep `skipApprovedGate` as the policy signal and just rename it to `bypassGates`. Two-line change.
- **Why isn't extension / parameterization / config sufficient?** The `payload.origin` string is consumed by THREE distinct concerns: (a) policy decision (gates fire or not), (b) audit_log telemetry (`origin` field for adapter-vs-CLI dashboards in the future Admin UI), (c) protocol documentation (a stable contract that Jira/Linear/Azure adapters must follow when they're built in a separate epic). A boolean flag doesn't carry the same semantic load — adapter authors would not know to set it, and audit telemetry would be type-erased. The origin string is the minimum viable contract that survives the year-out view of "what runs on this MCP server."

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution**

Requirements satisfied:
- [x] Gherkin scenarios cover all §1.2 requirements R1-R8 (10 scenarios).
- [x] §3 Implementation Guide cites verified file paths (`push-item.ts:39/110-114/122-138/160-175`, `pull-item.ts`, `sync-status.ts`, `cleargate-cli/src/commands/push.ts`).
- [x] No "TBD" markers.
- [x] `## Existing Surfaces` cites 8 source-tree paths.
- [x] `## Why not simpler?` answers both sub-bullets.
- [x] EPIC-027 §6 Q4 resolved.

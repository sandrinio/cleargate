---
story_id: STORY-010-07
parent_epic_ref: EPIC-010
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-007_Multi_Participant_MCP_Sync.md
actor: Vibe Coder / MCP server
created_at: 2026-04-19T19:30:00Z
updated_at: 2026-04-19T19:30:00Z
created_at_version: post-SPRINT-05
updated_at_version: post-SPRINT-05
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-19T20:06:32Z
stamp_error: no ledger rows for work_item_id STORY-010-07
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:06:09Z
  sessions: []
---

# STORY-010-07: Push-Time Gate Enforcement + Attribution + `push --revert`

**Complexity:** L2 — MCP endpoint hardening + CLI flag; closes PROP-005 Q10 deferral.

## 1. The Spec

### 1.1 User Story
As the platform operator, I want MCP to refuse unapproved pushes and record every push with attribution, so that the sync audit trail is trustworthy and nothing half-baked leaks to the PM tool; and as a Vibe Coder, I want a soft-revert path for a mistaken push.

### 1.2 Detailed Requirements

**`mcp/src/endpoints/push-item.ts` extension**:
- **Gate check**: before applying push, read the incoming frontmatter; if `approved !== true`, respond `400` with `{ error: "not_approved", message: "cleargate_push_item requires approved: true in frontmatter" }`. Do NOT touch the remote PM tool. Do NOT append sync-log.
- **Attribution stamp**: on successful push, record `pushed_by` (from JWT claims — `sub` field is the participant email since EPIC-003) and `pushed_at` (server time) in the MCP response. The CLI (from 010-04) then writes these back to the local frontmatter.
- **Sync-log entry**: on success, write one line server-side to the MCP's own audit store (existing from EPIC-004); additionally return the entry shape in the response so the CLI can mirror it locally.
- **Readiness-gate hook point** (stub): if `cached_gate_result.pass` is present in frontmatter, require it to be `true`. If missing, skip (EPIC-008 readiness gates are the authoritative check pre-push client-side).

**`cleargate-cli/src/commands/push.ts` modification**:
- Before calling `cleargate_push_item`, read local frontmatter; if `approved !== true`, abort with clear message + exit 1. Do not make the network call.
- After successful push, write `pushed_by` + `pushed_at` from the response back into the local frontmatter (atomic write). Append sync-log entry via lib from 010-01.
- New flag: `--revert <ID-or-remote_id>`:
  - Soft-revert via `cleargate_sync_status` (existing tool) pushing `status: "archived-without-shipping"`.
  - Does NOT delete the remote item.
  - Does NOT remove local frontmatter `remote_id` — the item stays traceable.
  - Appends sync-log entry with `op="push-revert"`.
  - Refuses if the local item has `status: "done"` AND the user has not passed `--force` — guards against reverting a completed shipment.

### 1.3 Out of Scope
Hard-delete of remote items (PM-tool-native action only). Enforcement of downstream gates (EPIC-008's readiness gates are their own story). UI for reverts.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Push-time gate + attribution + soft revert

  Scenario: MCP rejects unapproved push
    Given STORY-042-01 has approved: false in frontmatter
    When cleargate_push_item is called with that file's contents
    Then response is 400 { error: "not_approved" }
    And no remote Linear issue is created
    And no server-side sync-log entry is written

  Scenario: MCP records attribution on successful push
    Given STORY-042-01 has approved: true
    And the caller's JWT sub is "sandro.suladze@gmail.com"
    When cleargate_push_item succeeds
    Then the response contains pushed_by="sandro.suladze@gmail.com" and pushed_at=<server ISO-8601>

  Scenario: CLI writes attribution back to local file
    Given the server returned pushed_by + pushed_at
    When the CLI completes the push
    Then STORY-042-01 local frontmatter has pushed_by and pushed_at set

  Scenario: CLI refuses unapproved push client-side
    Given STORY-042-01 has approved: false
    When cleargate push STORY-042-01.md
    Then CLI exits 1 with "not approved"
    And no network call to MCP is made

  Scenario: Soft revert pushes archived-without-shipping
    Given STORY-042-01 has remote_id LIN-1042 and status "in-progress"
    When cleargate push --revert STORY-042-01
    Then cleargate_sync_status is called with status="archived-without-shipping"
    And the remote Linear issue is NOT deleted
    And sync-log gains one entry op="push-revert"

  Scenario: Revert refuses when status is done (without --force)
    Given STORY-042-01 has status "done"
    When cleargate push --revert STORY-042-01
    Then CLI exits 1 with "refusing to revert shipped item; pass --force to override"

  Scenario: Revert with --force works on done items
    Given STORY-042-01 has status "done"
    When cleargate push --revert STORY-042-01 --force
    Then the revert proceeds normally

  Scenario: Tokens never appear in sync-log
    When any push or revert completes
    Then the sync-log entry and server audit contain no JWT, no API token, no secret
```

### 2.2 Verification Steps
- [ ] Pre-flight lint: `rg "token" .cleargate/sprint-runs/*/sync-log.jsonl` returns zero matches after a push.

## 3. Implementation

**Files touched:**

- `mcp/src/endpoints/push-item.ts` — **modified** — `approved: true` gate; stamps `pushed_by` (from JWT `sub`) + `pushed_at`; appends server-side audit entry.
- `cleargate-cli/src/commands/push.ts` — **modified** — client-side approved-check, writes attribution back to local frontmatter, adds `--revert <ID>` / `--force` flags.

**Consumes:** existing `cleargate_sync_status` MCP tool, `sync-log.ts` lib (010-01).

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit — MCP gate | 2 | approved=false → 400; approved=true → 200 + attribution in response |
| Unit — CLI pre-push check | 1 | approved=false aborts before network call (mock spy: no MCP call made) |
| Unit — attribution write-back | 1 | local file gains pushed_by/pushed_at |
| Unit — revert happy path | 1 | sync-status call shape + sync-log entry |
| Unit — revert refuses done | 2 | without --force → refuse; with --force → proceed |
| Security — no-token-in-log | 1 | grep assertion |

### 4.2 Definition of Done
- [ ] `npm run typecheck` + `npm test` green in both `mcp/` and `cleargate-cli/`.
- [ ] Manual E2E: push approved item; attempt to push unapproved item (expect refusal); revert a pushed item (verify Linear status).

## Ambiguity Gate
🟢.

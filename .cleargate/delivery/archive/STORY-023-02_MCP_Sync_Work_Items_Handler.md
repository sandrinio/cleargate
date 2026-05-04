---
story_id: STORY-023-02
cleargate_id: STORY-023-02
parent_epic_ref: EPIC-023
parent_cleargate_id: EPIC-023
sprint_cleargate_id: SPRINT-16
carry_over: false
status: Done
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: EPIC-023_MCP_Native_Source_Of_Truth.md §2 (wire-format contract). PROPOSAL-013 §2.1, §2.2. mcp/src/tools/push-item.ts (DB write pattern, transaction, versioning). mcp/src/mcp/register-tools.ts (tool registration pattern, ToolRegistrationContext). mcp/src/db/schema.ts (items table shape).
actor: MCP server receiving a batch sync request from the CLI
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
source_tool: local
created_at: 2026-04-30T00:00:00Z
updated_at: 2026-04-30T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T16:35:17Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-023-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-30T16:31:18Z
  sessions: []
---

# STORY-023-02: MCP Server-Side `cleargate_sync_work_items` Handler
**Complexity:** L3 — new tool file, Drizzle batch upsert, auth/validation, audit wiring, registration in register-tools.ts. Cross-cutting: DB + middleware + transport.

## 1. The Spec (The Contract)

### 1.1 User Story
As the MCP server, I want to accept a batch of work-item payloads from `cleargate sync`, upsert each into the `items` table (no `approved:` gate), and return per-item accepted/conflict/error results, so that the CLI can keep the MCP DB in sync with the local file tree regardless of item lifecycle status.

### 1.2 Detailed Requirements

- New file `mcp/src/tools/cleargate-sync-work-items.ts` exports `cleargateeSyncWorkItems(ctx, args)`.
- Tool name registered in `mcp/src/mcp/register-tools.ts`: `cleargate_sync_work_items`.
- **No `approved:` gate.** Unlike `push_item`, this handler does NOT check `payload.approved`. Status-blind per PROPOSAL-013 §2.1 / EPIC-023 §2.1. Do not call `PushNotApprovedError`. Do not reach for `PmAdapter`.
- **Batch input**: accepts `items: SyncItemPayload[]` — up to 100 items per call (validate max with Zod `.max(100)`).
- **Per-item upsert logic** (mirrors `push_item` transaction, adapted):
  - SELECT the existing row from `items` WHERE `project_id = ctx.project_id AND cleargate_id = args.cleargate_id` FOR UPDATE.
  - Compute server-side `body_sha = sha256(item.body + YAML-serialized item.frontmatter)`. Compare with `item.file_sha` sent by client — if they differ (client file changed since SHA was computed, race), the server uses the body and frontmatter as authoritative (client is sending latest).
  - If no existing row: INSERT with `current_version = 1`.
  - If existing row: check `remote_sha` (stored in `items.currentPayload.last_synced_body_sha`) vs `item.last_synced_body_sha`. If the item's `last_synced_body_sha` doesn't match the server's stored `last_synced_body_sha` AND the server's version was updated more recently than the client's last sync — emit a `ConflictItem` instead of updating. Conflict detection is basic in this story; full conflict-detector wiring is STORY-023-03.
  - On successful upsert: INSERT into `item_versions` (same trigger as `push_item`).
- **Audit**: each item's outcome (accepted / conflict / error) is written to `audit_log` via the existing `runTool` / `writeAudit` pattern in `register-tools.ts`.
- **Response**: return `SyncWorkItemsResponse` as defined in EPIC-023 §2.4.
- **Idempotency**: the tool does NOT require an `idempotency_key` (batch sync is inherently idempotent by sha comparison). Do not wire idempotency middleware for this tool.
- **Zod schema** for the tool input:
  ```typescript
  {
    items: z.array(z.object({
      cleargate_id: z.string().min(1).max(128),
      type: z.enum(ITEM_TYPES),
      status: z.string().min(1).max(64),
      frontmatter: z.record(z.string(), z.unknown()),
      body: z.string(),
      file_sha: z.string().length(64),           // sha256 hex
      last_synced_body_sha: z.string().length(64).nullable(),
    })).min(1).max(100),
  }
  ```

### 1.3 Out of Scope

- Full conflict-detector wiring (returned `conflicts` array is populated with basic sha-mismatch detection only; the dedicated STORY-023-03 adds the `divergence_path` resolver).
- `PmAdapter` — never touched in this story.
- Pull direction (returning server-newer items to the CLI) — later story.
- Schema migration: no new tables. Work items land in the existing `items` + `item_versions` tables.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: cleargate_sync_work_items MCP tool

  Scenario: New item inserted and returned as accepted
    Given the items table has no row for cleargate_id "STORY-023-01"
    When cleargate_sync_work_items is called with that item (any status)
    Then the items table gains a row with current_version = 1
    And the response accepted array contains { cleargate_id: "STORY-023-01", version: 1, body_sha: <sha>, pushed_at: <iso> }
    And an audit_log row is written with result = "ok"

  Scenario: Existing item updated — accepted
    Given the items table has a row for cleargate_id "STORY-023-02" at version 3
    And the client's last_synced_body_sha matches the server's stored last_synced_body_sha
    When cleargate_sync_work_items is called with an updated body for that item
    Then current_version increments to 4
    And the response accepted array contains the item at version 4

  Scenario: Draft item syncs without error
    Given an item with status "Draft" and approved = false
    When cleargate_sync_work_items is called with that item
    Then the item is accepted (no approved gate applies)
    And exit code of the outer MCP call is success

  Scenario: Conflicting item returned in conflicts array
    Given the items table has a row whose stored last_synced_body_sha differs from the client's last_synced_body_sha
    And the server version was updated more recently than the client's last sync
    When cleargate_sync_work_items is called
    Then the response conflicts array contains { cleargate_id, local_sha, remote_sha }
    And the items table row is NOT updated

  Scenario: Batch exceeding 100 items rejected
    When cleargate_sync_work_items is called with 101 items
    Then the MCP response is a Zod validation error
    And no DB writes occur

  Scenario: Individual item error does not abort the batch
    Given one item has a malformed cleargate_id (empty string — caught by Zod per-item)
    And the remaining items are valid
    When cleargate_sync_work_items is called
    Then valid items are accepted
    And the malformed item appears in the errors array with code "validation_error"
```

### 2.2 Verification Steps (Manual)

- [ ] Run `cleargate sync` from the CLI against a local project; confirm items appear in the MCP DB (`SELECT cleargate_id, current_version FROM items WHERE project_id = '<pid>'`).
- [ ] Confirm `audit_log` has one row per accepted item with `tool = 'cleargate_sync_work_items'` and `result = 'ok'`.
- [ ] Push a Draft story; confirm no "not approved" error is returned.
- [ ] Manually force a sha mismatch (edit item on server side directly, then sync) — confirm conflict appears in CLI output.

## 3. The Implementation Guide

- Primary file: see §3.1 table.
- Reuse: see §3.1 table.
- Tests: see §3.1 table.

### 3.1 Context and Files

| Item | Value |
|---|---|
| Primary File | `mcp/src/tools/cleargate-sync-work-items.ts` (new) |
| Related Files | `mcp/src/mcp/register-tools.ts` (add import + `registerTool` call), `mcp/src/tools/push-item.ts` (reference for DB upsert pattern — reuse logic, do NOT copy `PushNotApprovedError` check) |
| Reuse | `ITEM_TYPES` from `mcp/src/tools/push-item.ts`; `DB` type from `mcp/src/db/client.ts`; `items`, `itemVersions`, `members` from `mcp/src/db/schema.ts`; `writeAudit` + `AuditInput` from `mcp/src/middleware/audit.ts`; `getCodebaseVersion` from `mcp/src/utils/codebase-version.ts` |
| New Files Needed | Yes — `mcp/src/tools/cleargate-sync-work-items.ts`, `mcp/src/tools/cleargate-sync-work-items.test.ts` |

### 3.2 Technical Logic

**Handler function signature:**
```typescript
export interface SyncWorkItemsContext {
  db: DB;
  project_id: string;
  member_id: string;
  client_id?: string;
}

export async function cleargateeSyncWorkItems(
  ctx: SyncWorkItemsContext,
  args: CleargateeSyncWorkItemsInput,
): Promise<SyncWorkItemsResponse>
```

**Per-item processing loop** (outside a single mega-transaction — each item is its own transaction to limit lock scope and allow partial success):
1. Try `ctx.db.transaction(async (tx) => { ... upsert logic ... })`.
2. On success: push to `accepted[]`.
3. On conflict detection (sha mismatch with server-newer version): push to `conflicts[]`.
4. On any other thrown error: push to `errors[]` with `code` and `message`; do not rethrow.

**Server-side sha computation:**
```typescript
import { createHash } from 'node:crypto';
import yaml from 'js-yaml'; // already a dep in mcp/ — verify in package.json

function serverSha(body: string, frontmatter: Record<string, unknown>): string {
  return createHash('sha256')
    .update(body + yaml.dump(frontmatter, { sortKeys: true }))
    .digest('hex');
}
```

Note: the CLI uses `serializeFrontmatter` from `cleargate-cli/src/lib/frontmatter-yaml.ts`. Verify that `serializeFrontmatter` produces YAML equivalent to `yaml.dump(fm, { sortKeys: true })` — if not, pin a note in `EPIC-023 §2.3` and standardize. This is R-1 from EPIC-023 §5; validate in the integration test.

**Registration in `register-tools.ts`:** add after the `cleargate_detect_new_items` block (line ~283). Pattern matches existing tools: import at top, call `mcp.registerTool(...)` inside `registerMcpTools`, pass `ctx` fields through `SyncWorkItemsContext`.

### 3.3 API Contract

Wire-format defined in **EPIC-023 §2** (single source of truth). This story implements the server side of that contract.

| Tool | Input schema | Output shape |
|---|---|---|
| `cleargate_sync_work_items` | `{ items: SyncItemPayload[] }` (max 100) — see EPIC-023 §2.3 | `SyncWorkItemsResponse` — see EPIC-023 §2.4 |

The `ConflictItem.divergence_path` field is set to `"body_sha"` in this story (basic). STORY-023-03 replaces it with fine-grained path detection.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | One per Gherkin scenario. Use real Postgres via `buildDb` with a test project fixture (no mocks — see FLASHCARD #real-infra). |
| Integration tests | 1 | `cleargate sync` CLI → actual `cleargate_sync_work_items` tool round-trip against docker-compose Postgres. |

### 4.2 Definition of Done (The Gate)

- [ ] All 6 Gherkin scenarios pass.
- [ ] `npm run typecheck && npm test -- cleargate-sync-work-items` green in `mcp/`.
- [ ] No `approved:` check anywhere in the handler — verified by test (Draft item scenario passes).
- [ ] `PmAdapter` not imported in the new file.
- [ ] `register-tools.ts` updated: `cleargate_sync_work_items` appears in the registered tool list.
- [ ] Audit log row written for each item outcome (accepted and conflict each produce a row).
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] `parallel_eligible: y` — server handler can be authored and tested independently of the CLI command. Integration requires both; unit tests do not.
- [x] `expected_bounce_exposure: med` — L3 complexity, cross-cutting (DB + middleware + registration), but patterns are well-established in push-item.ts.
- [x] sha serialization risk flagged (R-1, EPIC-023 §5) and actionable (verify in integration test).
- [x] No TBDs.

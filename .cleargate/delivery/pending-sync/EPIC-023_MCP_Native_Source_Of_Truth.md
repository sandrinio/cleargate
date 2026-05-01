---
epic_id: EPIC-023
cleargate_id: EPIC-023
parent_proposal: PROPOSAL-013
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-16
carry_over: false
status: Approved
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: PROPOSAL-013_Cleargate_MCP_Native_Source_Of_Truth.md (Approved 2026-04-28). §2.1 locked decisions, §2.2 per-artifact sync semantics, §2.5 EPIC decomposition, §2.3 CLI↔MCP boundary.
owner: sandrinio
target_date: 2026-06-30
created_at: 2026-04-30T00:00:00Z
updated_at: 2026-04-30T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
source_tool: local
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T17:36:22Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
sub_epics:
  - id: EPIC-023-02
    title: Sprint plan + report sync
    sprint: SPRINT-17
    status: placeholder
  - id: EPIC-023-03
    title: Wiki recompute on the server
    sprint: SPRINT-17
    status: placeholder
  - id: EPIC-023-04
    title: Unified cleargate sync (all artifact types, --scope flag)
    sprint: SPRINT-18
    status: placeholder
children:
  - "[[STORY-023-01]]"
  - "[[STORY-023-02]]"
  - "[[STORY-023-03]]"
  - "[[STORY-023-04]]"
stamp_error: no ledger rows for work_item_id EPIC-023
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-30T17:36:22Z
  sessions: []
---

# EPIC-023: MCP as Native Source of Truth — Work-Item Sync v2

## 0. AI Coding Agent Handoff

> ⚠️ **Framing note (2026-04-30):** This EPIC uses an "umbrella + sub-epics" structure. PROPOSAL-013 §2.5 frames the same scope as **4 sibling EPICs** (023/024/025/026). Reconcile at SPRINT-17 prep before drafting EPIC-024 — pick one framing and propagate.

```xml
<agent_context>
  <objective>Replace PmAdapter indirection in cleargate-cli sync paths with direct MCP DB queries; ship cleargate sync command that pushes work items (all statuses) to the MCP items table without requiring a PM adapter to be wired.</objective>
  <architecture_rules>
    <rule>PmAdapter interface stays in mcp/src/adapters/ — it is NOT removed; CLI stops reaching for it in sync flows. Admin-panel code may still use it later.</rule>
    <rule>Sync is status-blind: Draft, In-Review, Triaged, Approved, Done, Verified, Abandoned all sync. No pre-flight approved gate on cleargate sync (that gate lives on cleargate push and is admin-panel's filtering concern).</rule>
    <rule>Wire format is defined in EPIC-023 §2 (below). STORY-023-01 (CLI) and STORY-023-02 (server handler) MUST reference §2 — never duplicate or diverge.</rule>
    <rule>Full body ships on every sync of a changed item (no prose-patch). Idempotent — sha256 of body determines skip vs push.</rule>
    <rule>Sub-epic 1 scope: work items only. Sprint plans, sprint reports, wiki recompute are sub-epics 2–4 (SPRINT-17+).</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/commands/sync.ts" action="create" />
    <file path="cleargate-cli/src/lib/sync/work-items.ts" action="create" />
    <file path="cleargate-cli/src/lib/admin-url.ts" action="create" />
    <file path="cleargate-cli/src/cli.ts" action="modify" />
    <file path="mcp/src/tools/cleargate-sync-work-items.ts" action="create" />
    <file path="mcp/src/mcp/register-tools.ts" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem and Value

**Why are we doing this?**

The current CLI sync surface routes through `PmAdapter`, which requires an external PM tool (Linear, Jira) to be wired. Clean-folder users who rely on the MCP server as their backlog cannot read remote state, pull updated items, or detect new items — every read path errors with "no adapter configured." The MCP server's Postgres `items` table already contains the data; the adapter indirection is a false gate.

This epic removes the false gate for work-item sync. `cleargate sync` will push all local work items (every status) directly to the MCP items table, pulling back any server-side updates.

**Success Metrics (North Star):**
- `cleargate sync` completes without error on a clean-folder project with no PM adapter configured.
- All local work items (including Drafts) appear in the MCP `items` table after a successful sync.
- Conflicts detected by the server-side conflict-detector are reported to the user per-item.
- `cleargate sync` prints `→ View synced items: <url>` on success, URL sourced from `lib/admin-url.ts`.

## 2. Architecture Notes and Wire-Format Contract

**Pinned here. Every sub-epic 1 story's §3.3 API Contract table references this section.**

### 2.1 Locked Architectural Decisions (from PROPOSAL-013 §2.1)

1. **Status-blind sync.** `cleargate sync` never checks `approved:` or `status:` on local files before syncing. Every item syncs regardless of lifecycle state.
2. **Full body on change.** Per-item delta is computed by comparing `sha256(body + frontmatter)` against the local `last_synced_body_sha` frontmatter field. A match means skip; a mismatch means push the full markdown body. No prose-patch.
3. **Server is source of truth for remote state.** On pull direction, server's `updated_at` beats local `last_synced_at`. Conflict-detector arbitrates when both local and remote are dirty.

### 2.2 MCP Tool Name

`cleargate_sync_work_items` — registered in `mcp/src/mcp/register-tools.ts`. Naming follows the `cleargate_` prefix convention used by existing non-adapter tools (`cleargate_pull_item`, `cleargate_detect_new_items`, etc.).

### 2.3 Request Payload

```typescript
// POST body sent by CLI → MCP tool cleargate_sync_work_items
//
// project_id is NOT in the wire payload — server resolves it from JWT claims
// in mcp/src/mcp/transport.ts:48 (ctx.project_id). CLI must NOT include it.
interface SyncWorkItemsRequest {
  items: SyncItemPayload[];
}

interface SyncItemPayload {
  cleargate_id: string;              // e.g. "STORY-023-01"
  type: string;                      // "story" | "epic" | "proposal" | "cr" | "bug" | "initiative"
  status: string;                    // frontmatter status — included even if Draft
  frontmatter: Record<string, unknown>; // full parsed frontmatter (all keys)
  body: string;                      // full markdown body after frontmatter block
  file_sha: string;                  // sha256 hex of (body + YAML-serialized frontmatter)
  last_synced_body_sha: string | null; // from local frontmatter; null if never synced
}
```

Source: PROPOSAL-013 §2.2 ("full body shipped on mismatch"). Field names lifted verbatim where §2.2 names them; `file_sha` and `last_synced_body_sha` are the delta-detection pair.

### 2.4 Response Payload

```typescript
interface SyncWorkItemsResponse {
  accepted: AcceptedItem[];
  conflicts: ConflictItem[];
  errors: ErrorItem[];
}

interface AcceptedItem {
  cleargate_id: string;
  version: number;
  pushed_at: string;                 // ISO-8601 server timestamp
  body_sha: string;                  // sha256 of body as stored server-side
}

interface ConflictItem {
  cleargate_id: string;
  local_sha: string;
  remote_sha: string;
  divergence_path: string;           // e.g. "frontmatter.status" or "body"
}

interface ErrorItem {
  cleargate_id: string;
  code: string;
  message: string;
}
```

Conflict shape drives STORY-023-03 (conflict-detector wiring). `divergence_path` is surfaced to the user as a per-item warning.

### 2.5 Attribution Write-Back (CLI Side)

After a successful `cleargate_sync_work_items` call, the CLI updates each accepted item's frontmatter:
- `last_synced_body_sha`: set to `body_sha` from the accepted item response.
- `server_pushed_at_version`: set from MCP response (mirrors existing `push_item` pattern).
- Write is atomic: `.tmp` file rename (same pattern as `push.ts` `writeAtomic`).

## 3. Sub-Epic Breakdown

### Sub-Epic 1: Work-Item Sync v2 (SPRINT-16, M2)

**Goal:** Replace PmAdapter with direct items-table reads/writes for work-item sync. Ship `cleargate sync` CLI command.

| Story | Title | Lane | Complexity |
|---|---|---|---|
| STORY-023-01 | CLI `cleargate sync` work-items command | standard | L2 |
| STORY-023-02 | MCP server-side `cleargate_sync_work_items` handler | standard | L3 |
| STORY-023-03 | Conflict-detector wiring into sync response | standard | L2 |
| STORY-023-04 | Admin-URL helper + sync success link print | fast | L1 |

Stories 01-01 and 01-02 are **sequential**: CLI can be authored in parallel with server handler development, but integration tests require both to exist. 01-03 is the conflict-detector hook; it extends the server handler output — merge after 01-02. 01-04 is independent (new file + one-line edit) and can merge after 01-01.

### Sub-Epic 2: Sprint Plan + Report Sync (SPRINT-17 — placeholder)

New `sprint_plans` and `sprint_reports` tables; new MCP tools; CLI wiring; `close_sprint` push hook. See PROPOSAL-013 §2.3 for tool list. Decomposed before SPRINT-17 activates (CR-017 decomposition gate).

### Sub-Epic 3: Wiki Recompute on Server — DEFERRED (design not approved, 2026-04-30)

> ⚠️ **Status: DEFERRED — design not approved.** User reviewed 2026-04-30 and rejected the server-side wiki recompute idea pending further design. Do NOT decompose, schedule, or approve this sub-epic until the user revisits. Original sketch retained for reference only:
>
> Port `cleargate-cli/src/lib/wiki/*` to `mcp/src/wiki/`; Redis queue worker; `wiki_pages` table; remove "must run wiki build locally" instruction from CLAUDE.md.

### Sub-Epic 4: Unified cleargate sync (SPRINT-18 — placeholder)

One command, `--scope work-items|sprints|reports|all`, wrapping the per-scope drivers from sub-epics 1–3. Depends on sub-epics 1, 2, and 3. Decomposed before SPRINT-18 activates.

## 4. Out of Scope (this EPIC)

- External PM forwarding (Linear / Jira / GitHub-Projects) — admin-panel concern.
- Real-time push (web-socket / SSE).
- Wiki search / full-text indexing.
- Removing the `PmAdapter` interface from `mcp/src/adapters/` — it stays for admin-panel future use.
- Per-user RBAC on sync operations — project-wide access assumed.
- Tombstone push for locally deleted files — deferred to EPIC-024 spec.

## 5. Acceptance Scenarios (Sub-Epic 1)

Pinned here so the EPIC's Gherkin gate is satisfied at the umbrella level; child stories carry their own scenario sets that elaborate these.

```gherkin
Feature: cleargate sync — work items (sub-epic 1)

  Scenario: Status-blind sync pushes Draft and Approved items together
    Given a project with a Draft STORY and an Approved EPIC in pending-sync
    And no PmAdapter is configured
    When I run cleargate sync
    Then both items POST to cleargate_sync_work_items in one batch
    And the response accepted[] contains both cleargate_ids
    And the items appear in the MCP items table regardless of status

  Scenario: Idempotent sync skips unchanged items
    Given a STORY whose last_synced_body_sha matches sha256(body + serialized frontmatter)
    When I run cleargate sync
    Then the request payload omits that STORY (no network round-trip for it)
    And stdout reports "skipped (unchanged)" for the item

  Scenario: Mismatched body_sha pushes the full body
    Given a STORY whose local file_sha differs from last_synced_body_sha
    When I run cleargate sync
    Then the SyncItemPayload includes the full markdown body and full frontmatter
    And on accepted response, last_synced_body_sha is rewritten to the server-returned body_sha

  Scenario: Conflict detected when local and remote both diverged
    Given a STORY whose remote updated_at is newer than local last_synced_at
    And the local body_sha also differs from last_synced_body_sha
    When I run cleargate sync
    Then the response conflicts[] contains the cleargate_id with divergence_path
    And the CLI prints a per-item conflict warning naming the divergence_path
    And no frontmatter write-back occurs for the conflicted item

  Scenario: Successful sync prints admin URL link
    Given at least one item was accepted (no conflicts, no errors)
    When cleargate sync completes
    Then the last stdout line reads "→ View synced items: <url>"
    And <url> is sourced from lib/admin-url.ts (env override CLEARGATE_ADMIN_URL respected)

  Scenario: Error path — server rejects payload schema
    Given the server returns a non-zero errors[] entry for an item
    When the CLI processes the response
    Then the CLI exits 1 with the per-item error code and message printed
    And no frontmatter is rewritten for the errored item
```

## 6. Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | CLI and server handler diverge on `file_sha` computation (different serialization order) | EPIC-023 §2.3 pins the sha computation: `sha256(body + YAML-serialized frontmatter)` with `serializeFrontmatter` from `cleargate-cli/src/lib/frontmatter-yaml.ts`. Server must implement identical ordering. Tested via integration test fixture. |
| R-2 | `cleargate_sync_work_items` name conflicts with an existing tool | Verified: no such tool exists in `mcp/src/mcp/register-tools.ts` (lines 89–289 inspected 2026-04-30). Safe to register. |
| R-3 | Large projects (500+ items) time out on single batch sync | Batch size cap: 100 items per request. CLI splits larger item sets and makes N requests. First version: no progress bar; just per-batch stdout line. |
| R-4 | Status-blind sync surfaces Draft items to admin-panel stakeholders unexpectedly | Admin panel must filter by status at read time. Document the contract: "saving a Draft = visible to admin-panel; gate is at read surface, not write surface." Add to protocol §12 (next free section after §11 per audit 2026-04-30). |

---

## ClearGate Ambiguity Gate
**Current Status: 🟢 Low Ambiguity**

- [x] Parent proposal `PROPOSAL-013` has `approved: true`.
- [x] Wire-format contract pinned in §2 (one definition, referenced by child stories).
- [x] Sub-epic decomposition follows PROPOSAL-013 §2.5 ordering.
- [x] Sub-epics 2–4 are explicit placeholders; no scope inflation into SPRINT-16.
- [x] No TBDs.

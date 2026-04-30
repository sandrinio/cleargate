---
story_id: STORY-010-02
parent_epic_ref: EPIC-010
parent_cleargate_id: "EPIC-010"
status: Draft
ambiguity: 🟢 Low
complexity_label: L3
context_source: PROPOSAL-007_Multi_Participant_MCP_Sync.md
actor: MCP server
created_at: 2026-04-19T19:30:00Z
updated_at: 2026-04-19T19:30:00Z
created_at_version: post-SPRINT-05
updated_at_version: post-SPRINT-05
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-19T21:39:28Z
stamp_error: no ledger rows for work_item_id STORY-010-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:05:06Z
  sessions: []
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:58.158Z
push_version: 2
---

# STORY-010-02: Four New MCP Endpoints + Generic `PmAdapter` Interface

**Complexity:** L3 — 4 endpoints + 1 adapter interface + 1 Linear concrete impl. Architect may split the adapter interface into its own M1 story if this lands heavy (>1.5 days).

## 1. The Spec

### 1.1 User Story
As the `cleargate sync` CLI, I want MCP endpoints to pull a single item, list remote changes since a timestamp, pull read-only comments, and detect new stakeholder-authored items, so that the CLI can compute drift and surface remote work without bespoke per-PM-tool logic.

### 1.2 Detailed Requirements

**`mcp/src/adapters/pm-adapter.ts`** (new — the generic interface):
```ts
export interface PmAdapter {
  name: "linear" | "jira" | "github-projects";
  pullItem(remoteId: string): Promise<RemoteItem>;
  listUpdates(since: string): Promise<RemoteUpdateRef[]>;
  pullComments(remoteId: string): Promise<RemoteComment[]>;
  detectNewItems(filter: { label?: string; since?: string }): Promise<RemoteItem[]>;
}
export interface RemoteItem { remote_id; title; body; status; assignees; labels; updated_at; source_tool; raw; }
export interface RemoteUpdateRef { remote_id; updated_at; }
export interface RemoteComment { id; author_email; author_name; body; created_at; remote_id; }
```

**`mcp/src/adapters/linear-adapter.ts`** (new — v1 concrete impl):
- Wraps Linear GraphQL/REST SDK (reuse whatever MCP core already uses).
- Maps Linear `Issue` → `RemoteItem`, `Comment` → `RemoteComment`.
- Label filter for `detectNewItems` uses Linear's `issue.labels` relation.

**Four new endpoints** (registered via MCP tool registration in `mcp/src/server.ts`):
- `cleargate_pull_item` → `mcp/src/endpoints/pull-item.ts` — `{ remote_id }` in, `RemoteItem` out.
- `cleargate_list_remote_updates` → `mcp/src/endpoints/list-remote-updates.ts` — `{ since: ISO-8601 }` in, `RemoteUpdateRef[]` out.
- `cleargate_pull_comments` → `mcp/src/endpoints/pull-comments.ts` — `{ remote_id }` in, `RemoteComment[]` out (read-only; no write side).
- `cleargate_detect_new_items` → `mcp/src/endpoints/detect-new-items.ts` — `{ label?, since? }` in, `RemoteItem[]` out (filtered to items with no local counterpart — MCP queries `items` table for known `remote_id`s and excludes them).

**Auth:** all 4 endpoints require project-scoped JWT from EPIC-003. Responses NEVER include raw API tokens or PII beyond author email.

**Rate limit bucketing:** reuse existing rate-limit middleware from EPIC-003; all 4 endpoints fall under the project's read bucket.

### 1.3 Out of Scope
CLI consumption of these endpoints (STORY-010-04, -05, -06). Jira / GitHub Projects concrete adapters (deferred beyond v1). Push-side MCP changes (STORY-010-07).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: MCP pull + list + comments + detect endpoints

  Scenario: pull_item returns full item shape
    Given remote_id LIN-1042 exists
    When cleargate_pull_item is called
    Then response contains remote_id, title, body, status, assignees, labels, updated_at, source_tool

  Scenario: pull_item 404 on unknown remote_id
    Given remote_id LIN-9999 does not exist remotely
    When cleargate_pull_item is called
    Then response is 404 with { error: "not_found" }

  Scenario: list_remote_updates is lightweight
    Given 5 remote items updated since 2026-04-18T00:00:00Z
    When cleargate_list_remote_updates({ since: "2026-04-18T00:00:00Z" })
    Then response contains exactly 5 { remote_id, updated_at } pairs
    And no body / status / assignees fields are present

  Scenario: pull_comments is read-only
    Given 3 comments exist on LIN-1042
    When cleargate_pull_comments({ remote_id: "LIN-1042" })
    Then response contains 3 comments with id, author_email, body, created_at
    And no write side effect occurred on the remote

  Scenario: detect_new_items filters by label
    Given remote items tagged "cleargate:proposal" with 2 new, 1 already-local
    When cleargate_detect_new_items({ label: "cleargate:proposal" })
    Then response contains only the 2 new items (no remote_id present in local items table)

  Scenario: detect_new_items without label returns all new items
    Given 5 remote items with no local counterpart
    When cleargate_detect_new_items({})
    Then response contains all 5

  Scenario: Generic adapter interface is implemented by linear-adapter
    Given MCP boots with Linear configured
    Then server.adapters["linear"] satisfies PmAdapter interface
    And calling adapter.pullItem delegates correctly

  Scenario: Unauthenticated request rejected
    Given no JWT provided
    When any of the 4 endpoints is called
    Then response is 401
```

### 2.2 Verification Steps
- [ ] Integration test against a Linear sandbox (or recorded fixtures): each endpoint returns expected shape.
- [ ] Hit `cleargate_pull_comments` for a known issue; assert remote comment count unchanged afterwards (no write).

## 3. Implementation

**Files touched:**

- `mcp/src/adapters/pm-adapter.ts` — **new** — generic `PmAdapter` interface (4 verbs + shared data shapes).
- `mcp/src/adapters/linear-adapter.ts` — **new** — v1 Linear concrete `PmAdapter` impl.
- `mcp/src/adapters/index.ts` — **new** — barrel export; publishes `PmAdapter` to downstream consumers.
- `mcp/src/adapters/README.md` — **new** — interface review notes (Jira / GH Projects shape diff per R1).
- `mcp/src/endpoints/pull-item.ts` — **new** — `cleargate_pull_item` handler.
- `mcp/src/endpoints/list-remote-updates.ts` — **new** — `cleargate_list_remote_updates` handler.
- `mcp/src/endpoints/pull-comments.ts` — **new** — `cleargate_pull_comments` handler.
- `mcp/src/endpoints/detect-new-items.ts` — **new** — `cleargate_detect_new_items` handler.
- `mcp/src/server.ts` — **modified** — register 4 new MCP tools.
- `mcp/test/fixtures/linear/` — **new** — recorded responses for integration tests.

| Item | Value |
|---|---|
| Deps | Existing Linear SDK pin in `mcp/package.json`; no new deps |

### 3.2 API Contract

| Endpoint | In | Out |
|---|---|---|
| `cleargate_pull_item` | `{ remote_id: string }` | `RemoteItem` |
| `cleargate_list_remote_updates` | `{ since: string }` | `RemoteUpdateRef[]` |
| `cleargate_pull_comments` | `{ remote_id: string }` | `RemoteComment[]` |
| `cleargate_detect_new_items` | `{ label?: string; since?: string }` | `RemoteItem[]` |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit — adapter interface | 1 | Type-level compile check that linear-adapter implements PmAdapter |
| Unit — endpoints | 8 | 2 per endpoint (happy + error) |
| Integration — Linear fixtures | 4 | One per endpoint against recorded response |
| Auth | 1 | 401 on missing JWT (generic middleware test) |

### 4.2 Definition of Done
- [ ] `npm run typecheck` + `npm test` green in `mcp/`.
- [ ] All 4 tools appear in MCP server's `list_tools` output.
- [ ] Linear sandbox smoke: pull a known issue + its comments end-to-end.
- [ ] PmAdapter interface exported from `mcp/src/adapters/index.ts` for downstream consumers.

## Ambiguity Gate
🟢.

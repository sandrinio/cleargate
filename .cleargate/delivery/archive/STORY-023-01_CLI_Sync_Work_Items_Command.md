---
story_id: STORY-023-01
cleargate_id: STORY-023-01
parent_epic_ref: EPIC-023
parent_cleargate_id: EPIC-023
sprint_cleargate_id: SPRINT-16
carry_over: false
status: Done
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: EPIC-023_MCP_Native_Source_Of_Truth.md §2 (wire-format contract). PROPOSAL-013 §2.1 (status-blind sync), §2.2 (full-body-on-change semantics). cleargate-cli/src/commands/push.ts (MCP client pattern, atomic write-back). cleargate-cli/src/lib/mcp-client.ts (McpClient shape).
actor: ClearGate developer with local work items and an MCP server configured
complexity_label: L2
parallel_eligible: n
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
  last_gate_check: 2026-04-30T17:36:48Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-023-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-30T17:36:48Z
  sessions: []
---

# STORY-023-01: CLI `cleargate sync` Work-Items Command
**Complexity:** L2 — new command file, new lib driver, MCP client call, atomic frontmatter write-back, 3–4 test scenarios.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate developer, I want to run `cleargate sync` and have all local work items (every status, including Drafts) pushed to the MCP items table, so that I do not need a PM adapter configured and the MCP server has a full mirror of my project's planning state.

### 1.2 Detailed Requirements

- New command `cleargate sync [--scope work-items]` (default scope `work-items` for this story; broader `--scope all` is EPIC-023-04).
- Command entry point: `cleargate-cli/src/commands/sync-work-items.ts` exports `syncHandler(opts: SyncOptions)`.
- Sync driver: `cleargate-cli/src/lib/sync/work-items.ts` exports `syncWorkItems(opts)`. The command delegates to the driver; command file is thin.
- **Delta detection**: for each `.md` file under `.cleargate/delivery/{pending-sync,archive}/`, compute `sha256(body + YAML-serialized frontmatter)` using `serializeFrontmatter` from `cleargate-cli/src/lib/frontmatter-yaml.ts`. Compare against `last_synced_body_sha` in the file's own frontmatter. Skip if equal. Push full body if not equal or absent.
- **Status-blind**: no check on `approved:` or `status:` — every item syncs. This is a deliberate architectural decision (PROPOSAL-013 §2.1 / EPIC-023 §2.1). Do NOT add an approved gate here.
- **Batch capped at 100 items per request**. Driver splits larger item sets and makes multiple sequential calls to `cleargate_sync_work_items`.
- **MCP client pattern**: follow `push.ts` — resolve base URL from `CLEARGATE_MCP_URL` or `loadConfig`, acquire JWT via `acquireAccessToken`, create `McpClient`, call `mcp.call('cleargate_sync_work_items', payload)`.
- **Attribution write-back** (atomic): after each accepted item in the response, update the local file's `last_synced_body_sha` and `server_pushed_at_version` via the `.tmp`+rename atomic write pattern (same as `writeAtomic` in `push.ts`).
- **Output on success**: print one line per batch:
  ```
  sync: <N> accepted, <M> conflicts, <K> errors
  ```
  Then print the admin-URL line (supplied by `adminUrl()` from `cleargate-cli/src/lib/admin-url.ts`, which STORY-023-04 creates — import it and call it; the function must exist before this story merges):
  ```
  → View synced items: <url>
  ```
- **Conflicts and errors**: print each conflict and error to stderr after the summary line. Do not exit 1 on conflicts (informational); exit 1 only if all batches errored or the MCP call itself threw.
- **No network traffic when there are zero changed items**: exit 0 with `sync: 0 items changed (nothing to push)`.
- Wire `cleargate sync` into `cleargate-cli/src/cli.ts` (the Commander root).

### 1.3 Out of Scope

- `--scope sprints|reports|all` — those are EPIC-023-02 and EPIC-023-04.
- Pull direction (server has newer items not on disk) — that is a later story; this story is push-only.
- Progress bars or streaming output for large item sets.
- The `adminUrl()` implementation — that is STORY-023-04; this story only imports and calls it.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: cleargate sync work-items command

  Scenario: All items new — pushed successfully
    Given a project with 3 work items in pending-sync, none previously synced
    And the MCP server responds with all 3 accepted
    When `cleargate sync` runs
    Then stdout contains "sync: 3 accepted, 0 conflicts, 0 errors"
    And stdout contains "→ View synced items:"
    And each item's local frontmatter has last_synced_body_sha set to the server-returned body_sha
    And exit code is 0

  Scenario: Unchanged items are skipped
    Given a project with 2 items, both with last_synced_body_sha matching current sha256
    When `cleargate sync` runs
    Then stdout contains "sync: 0 items changed (nothing to push)"
    And no MCP call is made
    And exit code is 0

  Scenario: Conflict returned by server is reported to stderr
    Given one item is accepted and one item has a conflict (local_sha != remote_sha)
    When `cleargate sync` runs
    Then stdout contains "sync: 1 accepted, 1 conflicts, 0 errors"
    And stderr contains the conflict item's cleargate_id and divergence_path
    And exit code is 0

  Scenario: MCP server unreachable exits 1
    Given CLEARGATE_MCP_URL points to an unavailable host
    When `cleargate sync` runs
    Then stderr contains "Error:"
    And exit code is 1

  Scenario: No MCP URL configured exits 2
    Given CLEARGATE_MCP_URL is unset and no config file exists
    When `cleargate sync` runs
    Then stderr contains "MCP URL not configured"
    And exit code is 2
```

### 2.2 Verification Steps (Manual)

- [ ] Run `cleargate sync` against a local project with 3 draft stories; confirm all 3 appear in the MCP items table (check via `cleargate list` or direct DB query).
- [ ] Re-run immediately; confirm output is "0 items changed (nothing to push)" — `last_synced_body_sha` match short-circuits.
- [ ] Edit one story's body; re-run; confirm only that one item is pushed.
- [ ] Confirm `→ View synced items: https://admin.cleargate.soula.ge/` appears in stdout on success.

## 3. The Implementation Guide

- Primary file: see §3.1 table.
- Reuse: see §3.1 table.
- Tests: see §3.1 table.

### 3.1 Context and Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/sync-work-items.ts` (new) |
| Related Files | `cleargate-cli/src/lib/sync/work-items.ts` (new), `cleargate-cli/src/cli.ts` (add `.command('sync')` entry), `cleargate-cli/src/lib/admin-url.ts` (import only — created by STORY-023-04) |
| Reuse | `resolveIdentity` from `cleargate-cli/src/lib/identity.ts`; `acquireAccessToken` + `AcquireError` from `cleargate-cli/src/auth/acquire.ts`; `createMcpClient` + `McpClient` from `cleargate-cli/src/lib/mcp-client.ts`; `loadConfig` from `cleargate-cli/src/config.ts`; `parseFrontmatter` from `cleargate-cli/src/wiki/parse-frontmatter.ts`; `serializeFrontmatter` from `cleargate-cli/src/lib/frontmatter-yaml.ts`; `appendSyncLog` from `cleargate-cli/src/lib/sync-log.ts` |
| New Files Needed | Yes — `cleargate-cli/src/commands/sync-work-items.ts`, `cleargate-cli/src/lib/sync/work-items.ts`, `cleargate-cli/test/commands/sync.test.ts` |

### 3.2 Technical Logic

**Delta computation:**
```typescript
import { createHash } from 'node:crypto';
import { serializeFrontmatter } from '../lib/frontmatter-yaml.js';

function computeFileSha(fm: Record<string, unknown>, body: string): string {
  return createHash('sha256')
    .update(body + serializeFrontmatter(fm))
    .digest('hex');
}
```

**Work-items driver outline (`lib/sync/work-items.ts`):**
1. Walk `delivery/pending-sync/` and `delivery/archive/` for `*.md` files.
2. For each file: `parseFrontmatter` → compute `file_sha` → compare with `fm.last_synced_body_sha`. Skip if equal.
3. Collect changed items into batches of 100.
4. For each batch: call `mcp.call<SyncWorkItemsResponse>('cleargate_sync_work_items', { items: batch })`.
5. For each `accepted` item in response: write back `last_synced_body_sha` + `server_pushed_at_version` atomically.
6. Return aggregated `{ accepted, conflicts, errors }` counts.

**Command file (`commands/sync-work-items.ts`):** thin — resolves MCP client (same `resolveMcp()` pattern as `push.ts`), calls `syncWorkItems`, prints output, calls `adminUrl()` from `lib/admin-url.ts`, exits.

**cli.ts wiring:** convert the existing top-level `cleargate sync` (STORY-010-04 pull/merge/push driver, `commands/sync.ts`) into a Commander parent with subcommands. Register the new handler as `cleargate sync work-items` (subcommand of `sync`). The legacy adapter-based pull/merge/push action stays as the default `sync` action OR migrates to `sync legacy` (developer's call — preserve current invocation `cleargate sync` for now to avoid breakage).

### 3.3 API Contract

Wire-format is defined in **EPIC-023 §2** (the single source of truth). Summary:

| Tool | Direction | Request shape | Response shape |
|---|---|---|---|
| `cleargate_sync_work_items` | CLI → MCP | `{ items: SyncItemPayload[] }` (project_id is server-resolved from JWT — NOT in wire body) | `{ accepted, conflicts, errors }` |

Full field definitions: `EPIC-023_MCP_Native_Source_Of_Truth.md §2.3` (request) and `§2.4` (response). Do not redefine fields here — reference the epic.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | One per Gherkin scenario. Inject `mcp` seam + `stdout`/`stderr` + `exit` seam (same pattern as push.ts). Use `tmpdir` for delivery/ fixture. |
| Integration tests | 0 | Integration tested implicitly by STORY-023-02's server handler test + manual verification. |

### 4.2 Definition of Done (The Gate)

- [ ] All 5 Gherkin scenarios pass.
- [ ] `npm run typecheck && npm test -- sync` green in `cleargate-cli`.
- [ ] `last_synced_body_sha` is written back to each accepted item's local file.
- [ ] No `approved:` gate in the sync path — verified by test: a Draft item must sync successfully.
- [ ] `cli.ts` wires the new command; `cleargate sync --help` outputs the description.
- [ ] Import of `adminUrl` from `lib/admin-url.ts` compiles (STORY-023-04 must merge first or be in the same branch).
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Wire-format contract deferred to EPIC-023 §2 — no duplication risk.
- [x] `parallel_eligible: n` — depends on STORY-023-02 (server handler) existing for integration. CLI can be authored concurrently but must not merge before the tool is registered on the server.
- [x] `expected_bounce_exposure: med` — new command surface, MCP client wiring, file-walk + sha computation. Not high; patterns are established in push.ts.
- [x] No TBDs.

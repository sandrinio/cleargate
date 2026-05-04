---
story_id: STORY-023-03
cleargate_id: STORY-023-03
parent_epic_ref: EPIC-023
parent_cleargate_id: EPIC-023
sprint_cleargate_id: SPRINT-16
carry_over: false
status: Done
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: EPIC-023_MCP_Native_Source_Of_Truth.md §2.4 (ConflictItem shape, divergence_path field). PROPOSAL-013 §2.2 (conflict row shape). mcp/src/tools/cleargate-sync-work-items.ts (created by STORY-023-02 — extends its conflict detection).
actor: MCP server resolving a sync conflict between a local file and the remote item version
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
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
stamp_error: no ledger rows for work_item_id STORY-023-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-30T16:31:26Z
  sessions: []
---

# STORY-023-03: Conflict-Detector Wiring into Sync Response
**Complexity:** L2 — extends STORY-023-02's handler; adds a `divergence_path` resolver function and a dedicated test suite. No new files beyond the resolver module and its test.

## 1. The Spec (The Contract)

### 1.1 User Story
As a developer running `cleargate sync`, when a local item and the server version have both been edited since the last sync, I want the sync response to tell me exactly which field diverged (e.g. `"frontmatter.status"` or `"body"`), so that I can resolve the conflict manually without diffing the whole file.

### 1.2 Detailed Requirements

- New module `mcp/src/tools/conflict-detector.ts` exports:
  ```typescript
  function detectDivergence(
    localFrontmatter: Record<string, unknown>,
    localBody: string,
    serverPayload: Record<string, unknown>,  // currentPayload from items table
  ): string   // returns divergence_path string
  ```
- `divergence_path` resolution logic (in priority order):
  1. Compare `localBody` vs `serverPayload.body` (string field in payload). If they differ: `"body"`.
  2. Compare each top-level frontmatter key. First differing key returns `"frontmatter.<key>"`.
  3. If both body and all frontmatter keys match (sha mismatch was spurious — e.g. serialization difference): return `"unknown"`.
- The handler in `cleargate-sync-work-items.ts` (STORY-023-02) currently sets `divergence_path: "body_sha"` as a stub. This story replaces that stub: import `detectDivergence` and call it when emitting a `ConflictItem`.
- The `ConflictItem` returned to the CLI must be fully populated per EPIC-023 §2.4:
  ```typescript
  { cleargate_id, local_sha, remote_sha, divergence_path }
  ```
- `remote_sha` is computed server-side as `sha256(serverPayload.body + yaml.dump(serverPayload.frontmatter, {sortKeys: true}))`. Use the same `serverSha()` helper introduced by STORY-023-02.
- No change to the `SyncWorkItemsResponse` shape — `divergence_path` was already present in the type from STORY-023-02; this story makes it meaningful.
- The CLI (`cleargate sync`) already prints conflict items to stderr (STORY-023-01). No CLI changes needed in this story.

### 1.3 Out of Scope

- Auto-merge or interactive conflict resolution — this story reports only; the developer resolves manually.
- Frontmatter deep-diff (nested objects within frontmatter keys) — top-level key comparison only in v1.
- A separate conflicts table in the DB — conflicts are stateless, returned per-sync-call only.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Conflict detector — divergence_path resolution

  Scenario: Body differs — divergence_path is "body"
    Given localBody = "# foo\nchanged content"
    And serverPayload.body = "# foo\noriginal content"
    And all frontmatter keys are identical
    When detectDivergence is called
    Then it returns "body"

  Scenario: Frontmatter status differs — divergence_path is "frontmatter.status"
    Given localBody and serverPayload.body are identical
    And localFrontmatter.status = "Approved"
    And serverPayload frontmatter status = "In-Review"
    When detectDivergence is called
    Then it returns "frontmatter.status"

  Scenario: Body differs AND frontmatter differs — body takes priority
    Given localBody differs from serverPayload.body
    And localFrontmatter.status also differs from server
    When detectDivergence is called
    Then it returns "body"

  Scenario: No meaningful difference — divergence_path is "unknown"
    Given localBody equals serverPayload.body
    And all top-level frontmatter keys match
    When detectDivergence is called
    Then it returns "unknown"

  Scenario: ConflictItem in sync response has populated divergence_path
    Given the items table has a row with a different stored body from the client's body
    And the sha mismatch triggers conflict detection
    When cleargate_sync_work_items is called
    Then the ConflictItem in the response has divergence_path = "body"
    And local_sha and remote_sha are both non-empty hex strings
```

### 2.2 Verification Steps (Manual)

- [ ] Edit a story's body locally; separately edit its `status` field in the MCP DB directly. Run `cleargate sync`; confirm stderr shows `conflict: STORY-NNN body` (divergence_path = "body", body takes priority over status).
- [ ] Edit only a frontmatter field locally; leave body identical in DB. Run `cleargate sync`; confirm stderr shows `conflict: STORY-NNN frontmatter.status` (or whichever key).

## 3. The Implementation Guide

- Primary file: see §3.1 table.
- Reuse: see §3.1 table.
- Tests: see §3.1 table.

### 3.1 Context and Files

| Item | Value |
|---|---|
| Primary File | `mcp/src/tools/conflict-detector.ts` (new) |
| Related Files | `mcp/src/tools/cleargate-sync-work-items.ts` (modify: replace `divergence_path: "body_sha"` stub with `detectDivergence(...)` call) |
| Reuse | `serverSha()` helper introduced in `cleargate-sync-work-items.ts` by STORY-023-02 — export it from that file and import here, or extract to a shared `mcp/src/utils/sha.ts` |
| New Files Needed | Yes — `mcp/src/tools/conflict-detector.ts`, `mcp/src/tools/conflict-detector.test.ts` |

### 3.2 Technical Logic

```typescript
// mcp/src/tools/conflict-detector.ts
export function detectDivergence(
  localFrontmatter: Record<string, unknown>,
  localBody: string,
  serverPayload: Record<string, unknown>,
): string {
  const serverBody = typeof serverPayload['body'] === 'string' ? serverPayload['body'] : '';
  if (localBody !== serverBody) return 'body';

  // Top-level frontmatter key comparison (server payload stores frontmatter fields at top level)
  const serverFm = serverPayload; // currentPayload contains frontmatter fields + body
  for (const key of Object.keys(localFrontmatter)) {
    if (key === 'body') continue; // body already checked
    const localVal = JSON.stringify(localFrontmatter[key] ?? null);
    const serverVal = JSON.stringify(serverFm[key] ?? null);
    if (localVal !== serverVal) return `frontmatter.${key}`;
  }
  return 'unknown';
}
```

**Integration into `cleargate-sync-work-items.ts`:** in the conflict branch (sha mismatch + server newer), replace:
```typescript
divergence_path: 'body_sha'
```
with:
```typescript
divergence_path: detectDivergence(item.frontmatter, item.body, serverCurrentPayload)
```
where `serverCurrentPayload` is the `currentPayload` jsonb value from the existing `items` row.

### 3.3 API Contract

No new MCP tool. This story modifies the response shape of `cleargate_sync_work_items` (already defined in EPIC-023 §2.4) by making `ConflictItem.divergence_path` meaningful. The contract is unchanged; the implementation is completed.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | First four Gherkin scenarios — pure function, no DB. |
| Integration tests | 1 | Fifth scenario — requires DB fixture with a conflicting row. Reuse the DB setup from STORY-023-02's test harness. |

### 4.2 Definition of Done (The Gate)

- [ ] All 5 Gherkin scenarios pass.
- [ ] `npm run typecheck && npm test -- conflict-detector` green in `mcp/`.
- [ ] `cleargate-sync-work-items.ts` no longer contains `divergence_path: 'body_sha'` stub.
- [ ] `ConflictItem.divergence_path` is a non-empty string in all conflict responses.
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] `parallel_eligible: n` — depends on STORY-023-02 existing (`cleargate-sync-work-items.ts` must be present to modify the stub).
- [x] `expected_bounce_exposure: low` — pure function for the core logic; integration point is a one-line swap in an existing file.
- [x] No TBDs.

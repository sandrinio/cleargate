---
story_id: STORY-011-01
parent_epic_ref: EPIC-011
status: Ready
ambiguity: 🟢 Low
complexity_label: L1
context_source: ./EPIC-011_End_To_End_Production_Readiness.md
actor: Vibe Coder (running CLI commands in their repo)
created_at: 2026-04-20T13:45:00Z
updated_at: 2026-04-20T13:45:00Z
created_at_version: post-SPRINT-06
updated_at_version: post-SPRINT-06
stamp_error: no ledger rows for work_item_id STORY-011-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T13:23:27Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T13:31:51Z
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:08.850Z
push_version: 5
---

# STORY-011-01: Wire `acquireAccessToken` into all CLI commands

**Complexity:** L1 — mechanical wire-up of an already-shipped helper. No new architecture, no schema changes, no new dependencies.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder who just ran `cleargate join <invite-url>` successfully, I want every subsequent CLI command (`sync`, `pull`, `push`, `sync-log`, `conflicts`) to use my stored refresh token automatically, so that I don't have to paste a JWT into `CLEARGATE_MCP_TOKEN` for each session.

### 1.2 Detailed Requirements

- Replace every occurrence of "read `CLEARGATE_MCP_TOKEN` from env, fail if absent" with a call to `acquireAccessToken({ mcpUrl, profile })` from `cleargate-cli/src/auth/acquire.ts`.
- `acquireAccessToken` already resolves in this order: env → keychain/file-store refresh token → throw. Preserve that order.
- Each command that currently throws "CLEARGATE_MCP_TOKEN is not set" must instead surface the `AcquireError.code` → user-readable message (`'no_stored_token'` → "Run `cleargate join <invite-url>` first, or export CLEARGATE_MCP_TOKEN").
- Add a single-flight in-memory cache inside `acquireAccessToken` so that within one CLI invocation, multiple `mcp-client` calls share a single `/auth/refresh` round-trip. Expire the cache entry 60 seconds before the access token's `exp` claim to avoid race-expiry.
- `mcp-client.ts` accepts a pre-resolved `accessToken` string as an option; it does NOT call `acquireAccessToken` itself. Composition stays at the command-handler layer.
- Commands that only touch local files (e.g., `sync-log --limit 10`, `conflicts` with no `--refresh` flag) skip the acquire step entirely. Only calls that actually hit MCP trigger a refresh.

### 1.3 Out of Scope

Service-token support (STORY-011-02). Bootstrap command (STORY-011-03). Coolify deploy (STORY-011-04). No changes to the `join` or `whoami` handlers (both already correct).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: CLI commands use keychain refresh token automatically

  Scenario: sync uses keychain when env is empty
    Given `cleargate join <invite-url>` has stored a refresh token
    And CLEARGATE_MCP_TOKEN is NOT set
    When I run `cleargate sync --check`
    Then the command exits 0
    And MCP logs show one POST /auth/refresh
    And the keychain entry has been rotated

  Scenario: sync prefers env over keychain
    Given CLEARGATE_MCP_TOKEN is set to a valid JWT
    And the keychain also has a refresh token
    When I run `cleargate sync --check`
    Then the command exits 0
    And MCP logs show NO POST /auth/refresh (env short-circuit)

  Scenario: sync with no credentials errors clearly
    Given CLEARGATE_MCP_TOKEN is NOT set
    And the keychain is empty
    When I run `cleargate sync`
    Then the command exits non-zero
    And stderr contains "Run `cleargate join <invite-url>` first, or export CLEARGATE_MCP_TOKEN"

  Scenario: push uses keychain
    Given `cleargate join` succeeded and the keychain holds a refresh token
    When I run `cleargate push .cleargate/delivery/pending-sync/STORY-999-01.md`
    Then the MCP receives a cleargate_push_item call with a valid JWT in Authorization
    And the keychain entry has been rotated exactly once

  Scenario: Multiple MCP calls in one invocation share one refresh
    Given `cleargate sync` needs to call list_remote_updates, pull_item (x3), and push_item
    When the command runs
    Then exactly ONE POST /auth/refresh is observed server-side
    And all five MCP calls use the same access token

  Scenario: conflicts --refresh re-exchanges
    Given a stored refresh token
    When I run `cleargate conflicts --refresh` (force-fresh mode)
    Then a POST /auth/refresh is observed even if the cached token is still valid

  Scenario: Revoked refresh token surfaces cleanly
    Given the keychain holds a refresh token whose jti was revoked server-side
    When I run `cleargate sync`
    Then the command exits non-zero
    And stderr contains "refresh token was revoked. Run `cleargate join <invite-url>` to re-authenticate."
```

### 2.2 Verification Steps

- [ ] From a clean Keychain: `cleargate join <invite-url>` → `cleargate whoami` → `cleargate sync --check` → all exit 0; Keychain rotated between whoami and sync.
- [ ] Manual MCP log inspection during a multi-call `sync` confirms exactly one `/auth/refresh`.
- [ ] `unset CLEARGATE_MCP_TOKEN && security delete-generic-password -s cleargate && cleargate sync` exits non-zero with the exact error string above.

## 3. Implementation

**Files touched:**

- `cleargate-cli/src/lib/mcp-client.ts` — **modified** — accept `accessToken: string` option; stop reading `CLEARGATE_MCP_TOKEN` env directly.
- `cleargate-cli/src/commands/sync.ts` — **modified** — call `acquireAccessToken()` once at handler start; pass `accessToken` into `mcp-client` and onwards to the driver loop.
- `cleargate-cli/src/commands/pull.ts` — **modified** — same pattern.
- `cleargate-cli/src/commands/push.ts` — **modified** — same pattern.
- `cleargate-cli/src/commands/sync-log.ts` — **modified** — only call `acquireAccessToken` when the command actually needs MCP (e.g., if a future flag pulls remote log context); today this command is local-only, so likely no code change beyond adjusting the import path if it currently imports the env helper.
- `cleargate-cli/src/commands/conflicts.ts` — **modified** — add `--refresh` flag; if set, bypass single-flight cache and force a new `/auth/refresh`.
- `cleargate-cli/src/auth/acquire.ts` — **modified** — add in-memory single-flight cache keyed by profile; expire 60s before `exp`.
- `cleargate-cli/test/auth/acquire.test.ts` — **new** — unit tests for env-first, keychain-fallback, rotation, cache-hit, cache-expiry-before-60s, revoked/expired error paths.
- `cleargate-cli/test/commands/sync-acquire.test.ts` — **new** — integration-style test that spies on `acquireAccessToken` and confirms exactly one call per `sync` invocation even when the driver makes N MCP calls.

**Consumes:** `acquireAccessToken` + `AcquireError` from `cleargate-cli/src/auth/acquire.ts` (shipped as post-SPRINT-06 hotfix `98507d2`). FileTokenStore / KeychainTokenStore from `cleargate-cli/src/auth/factory.ts` (shipped in SPRINT-03).

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit — acquire cache | 4 | env-first / keychain-fallback / cache-hit / cache-expiry-before-60s |
| Unit — acquire errors | 3 | no_stored_token / invalid_token / token_revoked |
| Unit — commands | 5 | sync / pull / push / conflicts / sync-log all use acquire |
| Integration — single-flight | 1 | sync with N MCP calls → exactly one /auth/refresh |

### 4.2 Definition of Done

- [ ] `npm run typecheck` + `npm test` green in `cleargate-cli/`.
- [ ] `cleargate sync --check` works end-to-end against local MCP from a repo with only a Keychain entry (no env vars).
- [ ] Grep assertion: `rg "CLEARGATE_MCP_TOKEN" cleargate-cli/src/commands/` returns results ONLY inside helpful error messages, not as a required env lookup.
- [ ] No new npm dependencies.

## Ambiguity Gate

🟢 — scope is mechanical wire-up. Helper already shipped + tested via `whoami`. All five commands share the same pattern.

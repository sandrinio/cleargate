---
bug_id: BUG-019
parent_ref: EPIC-019
status: Triaged
severity: P0-Critical
reporter: sandrinio
sprint: SPRINT-15
milestone: TBD
approved: false
approved_at: null
approved_by: null
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.6.2
updated_at_version: cleargate@0.6.2
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-27T08:32:56Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Surfaced 2026-04-27 by user during clean-folder onboarding test in /Users/ssuladze/Documents/Dev/Hakathon.
  After workaround `claude mcp add --transport http cleargate https://cleargate-mcp.soula.ge/mcp`
  + Claude Code restart, the MCP panel shows:
    Cleargate MCP Server
    Status: x failed
    Auth:   x not authenticated
    URL:    https://cleargate-mcp.soula.ge/mcp
    SDK auth failed.
  Server returns 401 to /mcp without a Bearer token, but does not advertise an OAuth 2.0
  metadata document for Claude Code to drive the auth flow. `cleargate join` saves a
  refresh_token to the OS keychain — Claude Code never reads it. Bridging this gap is the
  scope of BUG-019.
stamp_error: no ledger rows for work_item_id BUG-019
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-27T08:32:56Z
  sessions: []
---

# BUG-019: MCP HTTP transport has no auth flow Claude Code can drive

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** After `cleargate init` + `cleargate join` + `.mcp.json` registered,
Claude Code authenticates against the cleargate MCP server transparently. `cleargate_*`
tools become callable in the agent session without any further user action.

**Actual Behavior:** The HTTP MCP server at `https://cleargate-mcp.soula.ge/mcp` requires
`Authorization: Bearer <access_token>` (verified in
`mcp/src/auth/middleware.ts:46-50`). Claude Code's HTTP MCP transport has no way to obtain
that token: there is no published OAuth 2.0 authorization-server metadata, no
device-flow, and no documented header-injection seam that would let `.mcp.json` carry a
short-lived access token. The refresh_token saved by `cleargate join` lives in the OS
keychain and is never seen by Claude Code. Net effect: tools never load.

## 2. Reproduction Protocol

1. Complete BUG-017 workaround (or post-fix `.mcp.json`) so that the server is registered.
2. Complete `cleargate join <invite>` so a valid refresh_token is in the keychain.
3. Restart Claude Code in the project.
4. Open MCP panel (e.g. `/mcp` in Claude Code).
5. **Observe**: `Cleargate MCP Server / Status: ✗ failed / Auth: ✗ not authenticated / SDK auth failed`.
6. `curl -i -X POST https://cleargate-mcp.soula.ge/mcp` → `401 missing_token` (server does not return a `WWW-Authenticate: Bearer realm=..., authorization_uri=...` header that Claude Code could use to bootstrap).

## 3. Evidence & Context

- **Server middleware (`mcp/src/auth/middleware.ts:16-50`):** strict `Authorization: Bearer ...` requirement. No fallback flow.
- **Server health endpoint:** `GET /health` returns `{"status":"ok","version":"0.1.0"}` (200, no auth) — proves the server is reachable; auth is the only gate.
- **OAuth 2.0 metadata probe:**
  - `GET /.well-known/oauth-authorization-server` → 404
  - `GET /.well-known/openid-configuration` → 404
  - No metadata = Claude Code's auto-discovery flow can't bootstrap.
- **Existing token store:** `cleargate-cli/src/auth/{factory,token-store}.ts` reads/writes refresh_token in `@napi-rs/keyring` (OS-native). Useful for a stdio shim, opaque to HTTP MCP transport.

## 4. Two viable fix paths (decision required at sprint planning)

**Path A — `cleargate mcp serve` stdio shim (recommended):**
- New CLI subcommand. `.mcp.json` uses stdio transport: `{"command":"cleargate","args":["mcp","serve"]}`.
- Shim reads refresh_token from keychain, exchanges for access_token via `POST /auth/refresh`, refreshes proactively, proxies stdio MCP frames to HTTPS `/mcp`.
- Claude Code never sees Bearer tokens. User flow stays `cleargate join` once → tools work indefinitely.
- Cost: 1-2 stories (shim + MCP frame proxy + keychain read seam). No server changes.
- Trade: extra process per session; requires `cleargate` on PATH (CR-009 resolver already covers this).

**Path B — server-side OAuth 2.1 metadata + device flow:**
- Add `/.well-known/oauth-authorization-server` document.
- Add `/oauth/device/authorize` + `/oauth/token` endpoints implementing OAuth 2.1 device authorization (RFC 8628).
- Claude Code drives the flow on first 401.
- Cost: 3-4 stories on the MCP server side + state migration for existing refresh_tokens.
- Trade: standards-clean but duplicates the auth surface that `cleargate join` already covers.

## 5. Out of scope

- BUG-017 (init writes `.mcp.json`) — separate, ships as a 0.7.0 patch.
- BUG-018 (init preserves +x on hooks) — separate, ships as a 0.7.0 patch.
- Any change to the four-agent loop or sprint protocol — auth gap is purely the MCP edge.

## 6. Recommendation

Pick **Path A** in SPRINT-15 planning. Reuses existing keychain infrastructure, no
server-side changes, minimal user-facing surface. Decompose into:
- STORY: implement `cleargate mcp serve` stdio→HTTP proxy with token refresh.
- STORY: have `cleargate init` write `.mcp.json` with stdio entry (replaces the http
  entry written by BUG-017's quick-fix patch — yes, this means the 0.7.0 fix is
  knowingly transitional).
- STORY: end-to-end test in a clean folder (Hakathon-style harness).

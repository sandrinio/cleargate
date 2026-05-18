---
cr_id: CR-065
parent_ref: CR-061
parent_cleargate_id: CR-061
sprint_cleargate_id: null
carry_over: false
area: cli,auth
status: Completed
approved: true
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
created_at_version: cleargate@0.11.5
updated_at_version: cleargate@0.11.5
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-14T21:23:33Z
context_source: |
  Spawned 2026-05-14 from CR-061 Q1 resolution: the user wants Claude Desktop
  + other stdio MCP clients (Cline, Claude Code in target repos) to be able
  to connect using a service token pasted into mcpServers config, without
  running `cleargate join <invite-url>` first. CR-061's modal must render a
  stdio config snippet that actually works — today `cleargate mcp serve` only
  handles refresh-token + keychain auth (mcp-serve.ts:2-15, 79).

  This CR adds service-token auth to the stdio bridge. The server-side
  service-token verification path already exists (mcp/src/auth/service-token.ts)
  and is used by HTTP-MCP requests today; CR-065 lets the CLI bridge consume
  the same path from the stdio side.

  Trigger: CR-061's Q1 final answer locks the modal to a 3-tab snippet
  (HTTP JSON config, curl, stdio config). The stdio tab references
  CLEARGATE_SERVICE_TOKEN env var, which only works if CR-065 ships first.
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-14T19:57:40.559Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-065
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-14T19:47:56Z
  sessions: []
push_version: 1
---

# CR-065: `cleargate mcp serve` Service-Token Auth (Stdio Bridge for Claude Desktop)

## 0.5 Open Questions

> All resolved at Gate 1 ack 2026-05-14.

- **Question:** Env var (`CLEARGATE_SERVICE_TOKEN`) or CLI flag (`--service-token <token>`) or both?
- **Recommended:** Env var only. Matches Claude Desktop's `mcpServers.<name>.env` shape; keeps token out of process argv (won't show in `ps`); cleaner config; no flag-parsing changes to `cleargate mcp serve` argv.
- **Human decision (2026-05-14):** Env var only. Accepted.

- **Question:** When `CLEARGATE_SERVICE_TOKEN` is set, should we still attempt keychain refresh as a fallback, or fail fast if the service token is invalid?
- **Recommended:** Fail fast. Service-token mode is opt-in (via env). If the env var is set but the token is bad, the user wants to know immediately — silently falling back to keychain would mask the misconfiguration. Print actionable boot-time error: `cleargate mcp serve: CLEARGATE_SERVICE_TOKEN rejected by /mcp (401). Issue a new token in the admin console: Tokens → Issue → copy snippet.`
- **Human decision (2026-05-14):** Fail fast. Accepted.

- **Question:** Does the service-token path need the same lazy-refresh-60s-before-expiry logic as the refresh-token path?
- **Recommended:** No. Service tokens are long-lived bearer tokens (TTL set at issuance in admin console, typically days/weeks). No rotation to manage. The bridge sends the same token verbatim on every request. If a request returns 401, print the actionable error and exit non-zero (don't loop).
- **Human decision (2026-05-14):** No rotation logic. Accepted.

- **Question:** Should `cleargate mcp serve` emit a one-line boot log indicating which auth mode is active (keychain vs service-token)?
- **Recommended:** Yes. One stderr line: `cleargate mcp serve: auth mode = service-token` or `cleargate mcp serve: auth mode = keychain-refresh`. Helps debugging when a user wires the snippet wrong.
- **Human decision (2026-05-14):** Yes. Accepted.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "`cleargate mcp serve` requires `cleargate join <invite-url>` to be run first so a refresh_token lands in the OS keychain" — was the only auth path. After this CR, a service token in `CLEARGATE_SERVICE_TOKEN` is an alternative that bypasses the keychain entirely.
- "Service tokens are HTTP-MCP-only; stdio clients (Claude Desktop, Claude Code) cannot use them" — was true through CR-061's original Q1 recommendation. CR-061 Q1's final answer reverses this; CR-065 implements the reversal.
- "Modal's stdio snippet redirects users to `cleargate join`" — was the original CR-061 Q1 recommendation. After CR-065, the modal renders a working stdio snippet using the env var.

**New Logic (The New Truth):**
- `cleargate mcp serve` boot logic checks `process.env.CLEARGATE_SERVICE_TOKEN` BEFORE touching the keychain.
- If `CLEARGATE_SERVICE_TOKEN` is set and non-empty: use it as the `Authorization: Bearer <token>` value for every `/mcp` POST. Skip keychain entirely. Skip refresh logic entirely. Skip lazy-refresh-before-expiry logic.
- If `CLEARGATE_SERVICE_TOKEN` is unset or empty: existing keychain + refresh-token path runs unchanged. Pure addition; zero risk to existing flow.
- On boot, print one stderr line stating the active auth mode.
- On any 401 from `/mcp` in service-token mode: print actionable error citing admin-console path; exit non-zero (no retry, no fallback).
- CR-061 modal's 3rd tab (stdio config) renders:
  ```json
  {
    "mcpServers": {
      "cleargate": {
        "command": "cleargate",
        "args": ["mcp", "serve"],
        "env": { "CLEARGATE_SERVICE_TOKEN": "<token-from-modal>" }
      }
    }
  }
  ```

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: STORY-006-05 (Tokens Page) — already shipped; this CR adds a third consumer of service tokens (alongside HTTP-MCP + admin-api). No re-test of existing token-issuance scenarios; new consumer is additive.
- [ ] Invalidate/Update CR: CR-061 — pairs with this CR. CR-061's Q1 resolution depends on CR-065 shipping first. Merge order in SPRINT-27 W1 → W3 enforces this.
- [ ] Invalidate/Update Epic: EPIC-006 — Completed. CR scope is post-ship auth-path addition; doesn't reopen the epic.
- [ ] Database schema impacts? **No.** Service-token verification already runs on the server (`mcp/src/auth/service-token.ts`). This CR adds a client consumer; no new server endpoint, no schema change.
- [ ] Auth surface change: stdio bridge now has two auth modes (keychain-refresh, service-token). Branching point is one env-var check at boot.
- [ ] Security implication: service tokens in env vars persist for the lifetime of the parent process (Claude Desktop). User should treat the `mcpServers.env` block as token-sensitive — same discipline as the plaintext-once rule for token issuance. Document in CR-061 modal footer (already covered by the routing-reminder line per CR-061 Q4).

**Downstream:**
- `cleargate-cli/src/commands/mcp-serve.test.ts` (or `.node.test.ts`) — new cases: env-var honored, keychain skipped when env set, boot-log line emitted, 401 fail-fast path.
- `cleargate-cli/src/auth/service-token-fetcher.test.ts` (NEW) — static fetcher unit test.
- No mcp/ server change.
- No admin/ UI change beyond CR-061's modal stdio tab content.

## 2.5 Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/mcp-serve.ts:2-15` — module docstring describing the refresh-token boot logic. Extend to document the service-token branch.
- **Surface:** `cleargate-cli/src/commands/mcp-serve.ts:79-95` (approx — re-verify by reading during execution) — boot section that calls `AuthFetcher.refresh()` and exits on failure. Insert a service-token branch BEFORE this section: `if (process.env.CLEARGATE_SERVICE_TOKEN) { /* construct ServiceTokenFetcher, skip refresh */ } else { /* existing code */ }`.
- **Surface:** `cleargate-cli/src/commands/mcp-serve.ts:178` — `Authorization: Bearer ${accessToken}` header construction in the request loop. After the boot branch, `accessToken` is either the refreshed access token OR the service token verbatim; the loop is unchanged.
- **Surface:** `cleargate-cli/src/auth/refresh.ts` — `AuthFetcher` class. Define a sibling interface `TokenFetcher` (likely already implicit) with one method: `getAccessToken(): Promise<string>`. Both `AuthFetcher` and the new `ServiceTokenFetcher` implement it. The bridge holds a `TokenFetcher` reference, not an `AuthFetcher` specifically.
- **Surface:** `cleargate-cli/src/auth/service-token-fetcher.ts` (NEW) — `class ServiceTokenFetcher implements TokenFetcher` with constructor accepting the raw token string. `getAccessToken()` returns the token verbatim. No refresh, no caching, no expiry.
- **Surface:** `mcp/src/auth/service-token.ts` — server-side verification path. Unchanged. CR-065 just consumes the same Bearer header the HTTP-MCP path uses today.
- **Why this CR extends rather than rebuilds:** The bridge is one file. Service-token verification on the server is already implemented. The change is a single boot-time branch + a 20-line static fetcher class. No abstraction needed beyond a shared `TokenFetcher` interface.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/mcp-serve.ts` — (1) read `process.env.CLEARGATE_SERVICE_TOKEN` early in `runServeCommand` (before keychain interaction); (2) when present + non-empty: construct `ServiceTokenFetcher`, log auth-mode line to stderr, skip refresh; (3) when absent: log auth-mode line as `keychain-refresh`, run existing code path unchanged; (4) generalize the request loop to use `TokenFetcher.getAccessToken()`.
- `cleargate-cli/src/auth/refresh.ts` — extract `TokenFetcher` interface if not present; `AuthFetcher` declares `implements TokenFetcher`.
- `cleargate-cli/src/commands/mcp-serve.test.ts` (or `.node.test.ts`) — new cases per §4.

**Add:**
- `cleargate-cli/src/auth/service-token-fetcher.ts` — `class ServiceTokenFetcher implements TokenFetcher`. Constructor: `(token: string)`. Method: `async getAccessToken(): Promise<string> { return this.token; }`. No-op `dispose()` if `AuthFetcher` exposes one.
- `cleargate-cli/src/auth/service-token-fetcher.node.test.ts` — pure-function unit test.

**Do NOT modify:**
- `cleargate-cli/src/auth/refresh.ts` boot/refresh logic itself — leave AuthFetcher's lazy refresh + keychain rotation completely intact for the keychain-mode path.
- `mcp/src/auth/service-token.ts` — server-side already supports the path.
- The token-issuance flow (admin-api `POST /projects/:projectId/tokens`) — unchanged.
- CR-061's modal scope — that CR renders the stdio snippet using this CR's env var; the snippet text is CR-061's responsibility, not CR-065's.

## 4. Verification Protocol

**Unit + type (cleargate-cli):**
```sh
cd cleargate-cli && npm run typecheck && npm test -- mcp-serve service-token-fetcher
```

New cases:
- Boot with `CLEARGATE_SERVICE_TOKEN` set → keychain mock NOT called; stderr contains `auth mode = service-token`; first `/mcp` POST sends `Authorization: Bearer <env-value>`.
- Boot with `CLEARGATE_SERVICE_TOKEN` unset → existing refresh path runs; stderr contains `auth mode = keychain-refresh`; behavior identical to pre-CR baseline.
- Boot with `CLEARGATE_SERVICE_TOKEN` set but bad token → first `/mcp` POST returns 401 → stderr contains actionable error citing admin-console path → process exits non-zero. No retry, no keychain fallback.
- ServiceTokenFetcher.getAccessToken() returns the constructor-passed token verbatim.

**End-to-end manual (after build):**
```sh
# Build CLI from local source
cd cleargate-cli && npm run build

# 1. Issue a service token via admin console (CR-061 modal shows it)
# 2. Copy the stdio config snippet from the modal's 3rd tab
# 3. Paste into ~/Library/Application Support/Claude/claude_desktop_config.json
# 4. Restart Claude Desktop
# 5. Confirm: Claude Desktop's MCP sidebar shows "cleargate" connected
# 6. Issue a tool call (e.g., "list my cleargate items") — round-trips through stdio → HTTP → MCP

# Alternate manual without Claude Desktop:
CLEARGATE_SERVICE_TOKEN=<token> cleargate mcp serve <<<'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
# Expect: JSON response listing the 10 cleargate tools
```

**Failure-mode verification:**
```sh
# Bad token
CLEARGATE_SERVICE_TOKEN=not-a-real-token cleargate mcp serve <<<'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
# Expect: stderr contains "CLEARGATE_SERVICE_TOKEN rejected by /mcp (401). Issue a new token..."
# Expect: exit code != 0

# Empty token (should treat as unset and fall to keychain)
CLEARGATE_SERVICE_TOKEN= cleargate mcp serve
# Expect: stderr says "auth mode = keychain-refresh"; behaves like pre-CR baseline
```

**Pass criteria:**
- All new unit tests green.
- Manual round-trip succeeds from Claude Desktop using the modal-issued snippet.
- Bad-token failure path prints actionable error and exits non-zero.
- Pre-CR keychain-mode path is byte-identical in behavior (regression-protected by existing keychain tests + the new "env unset" case).

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this CR extends.

- **Surface:** `cleargate-cli/src/commands/mcp-serve.ts` — existing MCP-serve entry; extended with CLEARGATE_SERVICE_TOKEN env branch added before the keychain refresh path.
- **Surface:** `cleargate-cli/src/auth/factory.ts` — existing token-acquisition factory; the new service-token fetcher slots in alongside the keychain and identity-flow fetchers.
- **Surface:** `cleargate-cli/src/auth/keychain-store.ts` — existing keychain path; the env-unset code path stays byte-identical to current behavior.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution.** All four §0.5 questions resolved at Gate 1 ack 2026-05-14.

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
- [x] All §0.5 Open Questions resolved.

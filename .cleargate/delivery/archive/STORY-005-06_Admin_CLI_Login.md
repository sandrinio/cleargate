---
story_id: STORY-005-06
parent_epic_ref: EPIC-005
parent_cleargate_id: "EPIC-005"
sprint_cleargate_id: "SPRINT-04"
status: Completed
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-005 §6.2, SPRINT-03 deferral
sprint_id: SPRINT-04
created_at: 2026-04-18T18:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-000-04
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T10:41:20Z
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:46:02.059Z
push_version: 2
---

# STORY-005-06: `cleargate-admin login` (GitHub OAuth Device Flow)

**Complexity:** L2 — CLI command + one MCP-side device-flow exchange endpoint; no browser required on the admin's machine.

## 1. The Spec

`cleargate-admin login` runs the GitHub OAuth **device flow** so a root admin can acquire an admin JWT from a terminal (SSH sessions, CI, no-browser hosts) without pasting `CLEARGATE_ADMIN_TOKEN` manually. On success, the resulting admin JWT is written to `~/.cleargate/admin-auth.json` (chmod 600) using the single-token file shape established in SPRINT-03 — overwriting any existing token.

This was deferred from SPRINT-03 (see sprint file Risks row 3). After this story, both UI and CLI admin paths exist; env-var sourcing (`CLEARGATE_ADMIN_TOKEN`) remains for CI/headless-automation.

### Detailed Requirements — CLI side
- Subcommand: `cleargate-admin login [--mcp-url=<url>]` (flag > env `CLEARGATE_MCP_URL` > config file).
- Flow:
  1. `POST <mcp-url>/admin-api/v1/auth/device/start` — MCP kicks off GitHub's device-flow request and returns `{ device_code, user_code, verification_uri, expires_in, interval }`.
  2. CLI prints: `Visit <verification_uri> and enter code: <user_code>` — also prints `expires_in` countdown hint.
  3. CLI polls `POST <mcp-url>/admin-api/v1/auth/device/poll` every `interval` seconds with `{ device_code }`. Backoff per GitHub's `slow_down` response code.
  4. On `authorization_pending` → keep polling. On `access_denied` or `expired_token` → print error + exit 6. On success → MCP returns `{ admin_token, expires_at, admin_user_id }`.
  5. CLI writes `~/.cleargate/admin-auth.json` with `{ version: 1, token: <admin_token> }` at chmod 600 (FileTokenStore's existing `admin-auth.json` shape). Prints: `Logged in as <github_handle>. Token expires <expires_at>.`
- Secrets never print to stdout/stderr — neither the GitHub OAuth access token nor the admin JWT.
- Exit codes: 0 success · 3 network · 4 auth-rejected (non-admin GH user) · 5 device-flow timeout / user denied · 6 other device-flow error · 99 unhandled.

### Detailed Requirements — MCP side
- Two new routes under `/admin-api/v1/auth/device/*`. Both public (no admin JWT); rate-limited via the anonymous bucket.
  - `POST /admin-api/v1/auth/device/start` — proxies to GitHub's `/login/device/code` with `CLEARGATE_GITHUB_CLI_CLIENT_ID` and `scope=read:user`. Returns the GitHub response verbatim.
  - `POST /admin-api/v1/auth/device/poll` — proxies to GitHub's `/login/oauth/access_token`. On success, GET `https://api.github.com/user` with the returned access token to read `login` (github handle). Verify handle in `admin_users` (active). If authorized: mint admin JWT via `issueAdminToken()` and return `{ admin_token, expires_at, admin_user_id }`. If not in admin_users: 403 `not_authorized`. The GitHub access token is discarded server-side — not stored.
- Device-flow secrets: env var `CLEARGATE_GITHUB_CLI_CLIENT_ID`. A **second** GitHub OAuth app is registered for the CLI (separate from the UI's web app) because GitHub requires device-flow apps to opt in; re-using the UI app is not supported.
- Audit: success path writes `audit_log` with `tool_name="auth.device_login"`, `admin_user_id`. GitHub access token is never logged.

## 2. Acceptance

```gherkin
Scenario: Admin logs in via device flow
  Given admin_users has my github_handle
  And CLEARGATE_GITHUB_CLI_CLIENT_ID is set on the MCP
  When I run `cleargate-admin login`
  Then the CLI prints a GitHub verification URL and user code
  And after I authorize in the browser, the CLI exits 0
  And ~/.cleargate/admin-auth.json exists at chmod 600 with { version: 1, token: <jwt> }
  And the next `cleargate-admin create-project ... --name smoke` succeeds WITHOUT CLEARGATE_ADMIN_TOKEN set

Scenario: Non-admin GitHub user rejected
  Given my github_handle is NOT in admin_users
  When I run `cleargate-admin login` and authorize
  Then the CLI prints "not authorized" and exits 4
  And ~/.cleargate/admin-auth.json is NOT written (or not overwritten if it exists)

Scenario: User denies in browser
  When I run `cleargate-admin login` and click Deny
  Then the CLI prints "access denied" and exits 5

Scenario: Device code expires
  When I run `cleargate-admin login` and wait out expires_in without authorizing
  Then the CLI prints "device code expired" and exits 5

Scenario: Secrets never leak to stdout/stderr
  When I run `cleargate-admin login` under a captured-output test harness
  Then neither the GitHub access token nor the admin JWT appears in captured stdout/stderr
  And the user_code DOES appear in stdout

Scenario: Audit row on success
  After a successful login
  Then audit_log has tool_name="auth.device_login", admin_user_id=<me>
```

## 3. Implementation

- `mcp/scripts/commands/login.ts` + `mcp/scripts/commands/login.test.ts` — CLI subcommand registered on `bin/cleargate-admin`. Uses `fetch` + setInterval-based polling.
- `mcp/src/admin-api/auth-device.ts` + `.test.ts` — two Fastify handlers (`/start`, `/poll`) + integration tests mocking GitHub's endpoints (nock-style or a fetch mock; match the existing test harness from SPRINT-02).
- Register routes in `mcp/src/admin-api/index.ts`; mark public in the admin-JWT middleware allowlist.
- CLI token write reuses the single-token file helper from SPRINT-03 M3 (`cleargate-cli/src/admin-api/admin-auth.ts` writer) — factor out if writer is currently read-only.

## 4. Quality Gates

- CLI unit matrix: happy path · non-admin GH user · user denial · timeout · network error · stdout/stderr secret-redaction · exit-99 unhandled (carries forward the SPRINT-03 STORY-005-05 regression gate).
- MCP integration tests mock GitHub's device-flow + user-info endpoints deterministically.
- Device-flow polling honors `interval` from GitHub's response and bumps on `slow_down` (regression test).
- `docker build ./mcp` + `cleargate-cli` typecheck both green.

## 5. Open questions

1. **Separate GitHub OAuth app for device flow?** GitHub requires device-flow-enabled OAuth apps to opt in; web OAuth apps don't automatically support the device grant. Confirm at implementation time and register a second app (`ClearGate Admin CLI`) if needed. New env var: `CLEARGATE_GITHUB_CLI_CLIENT_ID`.
2. **Admin-auth file write vs. config-loader precedence.** SPRINT-03 established env-var > file precedence in the `AdminAuthLoader`. `login` writes the file; env var still wins if present. Document this in `cleargate-cli/README.md` close-out (SPRINT-03 carryover #9).

## Ambiguity Gate

🟢 — EPIC-005 §6.2 resolved the device-flow architecture; STORY-000-04 + SPRINT-03 M3 own the file shape; admin-JWT minting already exists.

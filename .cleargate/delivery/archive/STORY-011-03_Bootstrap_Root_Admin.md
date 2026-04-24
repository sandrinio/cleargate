---
story_id: STORY-011-03
parent_epic_ref: EPIC-011
status: "Completed"
ambiguity: 🟢 Low
complexity_label: L2
context_source: ./EPIC-011_End_To_End_Production_Readiness.md
actor: Ops operator deploying ClearGate MCP for the first time
created_at: 2026-04-20T13:55:00Z
updated_at: 2026-04-20T13:55:00Z
created_at_version: post-SPRINT-06
updated_at_version: post-SPRINT-06
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T13:53:03Z
stamp_error: no ledger rows for work_item_id STORY-011-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T13:53:02Z
  sessions: []
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:54.298Z
push_version: 3
---

# STORY-011-03: `cleargate admin bootstrap-root <handle>` — first-root seeding CLI

**Complexity:** L2 — one new CLI command + one new test file + CLI registration. Direct SQL via `pg` (authorized as a new cleargate-cli dep per EPIC-011 agent_context).

## 1. The Spec

### 1.1 User Story
As an Ops operator deploying ClearGate MCP for the first time on a fresh VPS, I want to run a single idempotent CLI line — `cleargate admin bootstrap-root <github-handle>` — to seed the first root admin into `admin_users`, so that I never have to copy-paste a raw `docker exec psql "INSERT …"` command with hand-generated UUIDs and I can re-run the line safely during re-deploys.

### 1.2 Detailed Requirements

- New handler `bootstrapRootHandler({ handle, force, databaseUrl, env })` in `cleargate-cli/src/commands/bootstrap-root.ts`.
- Registered as `cleargate admin bootstrap-root <handle>` under the existing `admin` subcommand group in `cleargate-cli/src/cli.ts` (same group as `admin login`). Accepts flags `--database-url <url>` and `--force`.
- DATABASE_URL resolution order: `--database-url` flag → `DATABASE_URL` env. If neither present, exit non-zero with `"cleargate: error: DATABASE_URL is required (set env or pass --database-url)"`.
- Uses the `pg` npm package (added as a cleargate-cli runtime dep — authorized by EPIC-011 §0 agent_context target_files list). Opens `new Client({ connectionString })`, connects, runs the SQL below, closes.
- SQL (one round-trip, transactional):
  1. `SELECT id, is_root FROM admin_users WHERE github_handle = $1` — does this handle already exist?
  2. If a row exists with `is_root = true`: emit `"Root admin '<handle>' already exists; no change."` to stdout, exit 0.
  3. If a row exists with `is_root = false` and `--force` is passed: `UPDATE admin_users SET is_root = true WHERE github_handle = $1` → emit `"Promoted '<handle>' to root admin."` exit 0.
  4. If no row exists and `SELECT COUNT(*) FROM admin_users WHERE is_root = true` ≥ 1 and `--force` is NOT passed: exit non-zero with `"cleargate: error: refusing to create a second root admin; pass --force to override"`.
  5. Otherwise: `INSERT INTO admin_users (id, github_handle, is_root, created_at) VALUES (gen_random_uuid(), $1, true, now()) ON CONFLICT (github_handle) DO UPDATE SET is_root = EXCLUDED.is_root`. Emit `"Bootstrapped root admin '<handle>'."` exit 0.
- Handle validation: must match `/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/` (GitHub's own handle grammar). Otherwise exit non-zero with `"cleargate: error: '<handle>' is not a valid GitHub handle"`.
- Connection errors surface as `"cleargate: error: cannot reach database (<reason>)"` with exit code 3 (same convention as `admin login`).
- All operations wrapped in `try { client.end() } finally { … }` — never leak connections.
- Never logs the DATABASE_URL connection string (may contain password). If the error message from `pg` contains the URL, scrub it before printing.
- No secrets in output beyond what the operator already has (the handle string).

### 1.3 Out of Scope

Deleting or demoting root admins (revocation is an Admin UI concern post-STORY-006-03). Bootstrapping a regular (non-root) admin user. Creating projects or tokens (those are separate admin commands). Changing the `admin_users` schema. Migration / schema bootstrap itself — this story assumes the `admin_users` table already exists via the existing MCP drizzle migrations.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate admin bootstrap-root

  Scenario: Empty table — first root created
    Given admin_users is empty
    When I run `cleargate admin bootstrap-root sandrinio`
    Then admin_users has exactly one row
    And that row has github_handle='sandrinio' and is_root=true
    And stdout contains "Bootstrapped root admin 'sandrinio'."
    And the command exits 0

  Scenario: Same handle re-run is a no-op
    Given admin_users has a row {github_handle='sandrinio', is_root=true}
    When I run `cleargate admin bootstrap-root sandrinio` again
    Then admin_users still has exactly one sandrinio row
    And stdout contains "Root admin 'sandrinio' already exists; no change."
    And the command exits 0

  Scenario: Refuse second root without --force
    Given admin_users has {sandrinio, is_root=true}
    When I run `cleargate admin bootstrap-root another-user`
    Then admin_users has no row for another-user
    And stderr contains "refusing to create a second root admin; pass --force to override"
    And the command exits non-zero

  Scenario: --force promotes existing non-root admin
    Given admin_users has {another-user, is_root=false}
    When I run `cleargate admin bootstrap-root another-user --force`
    Then admin_users row for another-user has is_root=true
    And stdout contains "Promoted 'another-user' to root admin."
    And the command exits 0

  Scenario: Missing DATABASE_URL errors clearly
    Given DATABASE_URL is NOT set and no --database-url flag passed
    When I run `cleargate admin bootstrap-root sandrinio`
    Then stderr contains "DATABASE_URL is required"
    And the command exits non-zero

  Scenario: --database-url flag overrides env
    Given DATABASE_URL=postgres://wrong-host/db in env
    And a valid --database-url=postgres://localhost:5432/cleargate flag
    When I run `cleargate admin bootstrap-root sandrinio --database-url postgres://localhost:5432/cleargate`
    Then the flag value is used (not the env value)
    And the command exits 0

  Scenario: Unreachable database errors cleanly
    Given DATABASE_URL points to an unreachable host
    When I run `cleargate admin bootstrap-root sandrinio`
    Then stderr contains "cannot reach database"
    And the stderr does NOT contain the DATABASE_URL password
    And the command exits 3

  Scenario: Invalid handle rejected before DB round-trip
    Given DATABASE_URL is set
    When I run `cleargate admin bootstrap-root 'not a handle'`
    Then stderr contains "is not a valid GitHub handle"
    And the command exits non-zero
    And no SQL is executed

  Scenario: DATABASE_URL with password is scrubbed from error output
    Given DATABASE_URL=postgres://user:s3cr3t@bad-host/db
    When the connection fails
    Then stderr does NOT contain "s3cr3t"
```

### 2.2 Verification Steps

- [ ] Local: `docker compose up postgres -d && DATABASE_URL=postgres://cleargate:cleargate@localhost:5432/cleargate node cleargate-cli/dist/cli.js admin bootstrap-root sandrinio` → exit 0, stdout prints "Bootstrapped root admin 'sandrinio'.".
- [ ] Re-run the same line → exit 0, stdout prints "already exists; no change."
- [ ] `psql $DATABASE_URL -c "SELECT github_handle, is_root FROM admin_users"` shows the row.
- [ ] Run with a bogus URL: `DATABASE_URL=postgres://nobody:pw123@nowhere:5432/x cleargate admin bootstrap-root sandrinio` → stderr does NOT contain `pw123`.

## 3. Implementation

**Files touched:**

- `cleargate-cli/src/commands/bootstrap-root.ts` — **new** — exports `bootstrapRootHandler(opts)`. Uses `pg.Client`. Full flow per §1.2. Seams for tests: `{ fetch: never — not needed }`, `env`, `stdout`, `stderr`, `exit`, `pgClientFactory` (default `(url) => new pg.Client({ connectionString: url })`).
- `cleargate-cli/src/commands/bootstrap-root.test.ts` — **new** — 9 tests mapping to the 9 Gherkin scenarios + handle-regex unit tests (accepts `a`, `a-b`, `A1`, rejects empty, rejects `-leading`, rejects `trailing-`, rejects whitespace). Uses a real Postgres via docker-compose `postgres` service (same pattern as admin-api/tokens.test.ts).
- `cleargate-cli/src/cli.ts` — **modified** — register new subcommand under the existing `admin` group (line 156-172). Positional arg `<handle>`, options `--database-url <url>`, `--force`. Dynamic-import the handler like `admin login` does. Remove the `stubHandler('admin')` default action if present (or keep it for other unimplemented subcommands; confirm non-regression).
- `cleargate-cli/package.json` — **modified** — add `"pg": "^8.12.0"` (matches `mcp/package.json:36` pin — already vendored at root node_modules). Add `"@types/pg": "^8.11.10"` to devDependencies.
- `admin/coolify/DEPLOYMENT.md` — **modified (light)** — replace §7 "Bootstrap admin account" bullet's current `docker exec` hint with: "Run `cleargate admin bootstrap-root <github-handle> --database-url <DATABASE_URL>` from any host that can reach the MCP Postgres. Idempotent — safe to re-run on redeploy."
- `mcp/coolify/DEPLOYMENT.md` — **modified (light)** — same substitution wherever `docker exec … psql … INSERT INTO admin_users` currently appears.

**Consumes:** `admin_users` table (existing schema from EPIC-005). `pg` driver. Existing `admin` subcommand group. `commander` arg parsing already wired for `admin login`.

**Does NOT consume:** MCP server (offline — writes to DB directly). Admin JWT. Redis. This is a provisioning-time command; MCP may not even be running yet.

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Integration — empty table | 1 | First root created |
| Integration — idempotent | 1 | Re-run no-op |
| Integration — second-root guard | 2 | Refuse without --force / promote with --force |
| Integration — env / flag resolution | 2 | Missing DATABASE_URL / --database-url overrides env |
| Integration — error paths | 2 | Unreachable DB / password scrubbed |
| Unit — handle regex | 6 | Accepts valid / rejects invalid (empty, leading-hyphen, trailing-hyphen, space, too-long, all-hyphens) |

### 4.2 Definition of Done

- [ ] `npm run typecheck` + `npm test` green in `cleargate-cli/`.
- [ ] Manual verification: bootstrap-root runs twice against a local Postgres with the same handle; second run is idempotent.
- [ ] Manual verification: password in DATABASE_URL never appears in stderr/stdout under any error condition (grep against test-captured output).
- [ ] Both `admin/coolify/DEPLOYMENT.md` and `mcp/coolify/DEPLOYMENT.md` updated so their bootstrap instructions reference the new command, not the raw psql line.
- [ ] `cleargate admin bootstrap-root --help` prints a usage line with both flags documented.
- [ ] No runtime deps added beyond `pg` + `@types/pg`.

## Ambiguity Gate

🟢 — scope is one new command file + one test file + two runbook substitutions. `admin_users` schema exists. `admin` subcommand group already registered. SQL flow is spelled out line-by-line. Only controlled new dep (`pg`) is explicitly authorized by the Epic.

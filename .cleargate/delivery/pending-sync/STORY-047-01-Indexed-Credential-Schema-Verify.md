---
story_id: STORY-047-01
parent_epic_ref: EPIC-047
parent_cleargate_id: "EPIC-047"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-047 (INITIATIVE-001 direct-approval) + EPIC-047 §6 resolved decisions + verified codebase grounding
actor: Connection-identity platform (mcp)
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set:
  - connections
  - pairings
  - app_tokens
dep_predecessors: []
deferred_verification: []
area: connector
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-04T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: mcp/src/db/schema.ts, mcp/src/auth/service-token.ts, mcp/src/db/client.ts"
  last_gate_check: 2026-06-04T14:13:39Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-047-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T14:13:38Z
  sessions: []
---

# STORY-047-01: mcp — dedicated credential schema + indexed token verify
**Complexity:** L3 — net-new Postgres schema (3 tables) + a load-bearing verify primitive that replaces the whole-table bcrypt scan with an indexed single-row lookup; foundation for every other M1 story.

## 1. The Spec (The Contract)

### 1.1 User Story
As the mcp identity authority, I want dedicated `connections` / `pairings` / `app_tokens` tables plus an indexed credential-verify primitive that does a single-row lookup and one bcrypt compare, so that verifying a credential is O(1) in total token population and the reconnect-storm amplifier (the legacy whole-table scan) is gone before any verify endpoint, mint, or revoke is built on top.

### 1.2 Detailed Requirements
- **New `connections` table** (Drizzle, `schema.ts`): `id` (uuid pk), `project_id` (uuid → projects, cascade), `member_id` (uuid → members, cascade, **nullable** — app-token connections have no member), `label` (text), `created_at` (timestamptz default now), `last_seen` (timestamptz, nullable — stamped at register/heartbeat by later stories).
- **New `pairings` table** (clone the `invites` one-time-consume pattern): `id` (uuid pk), `code_hash` (text — bcrypt of the pairing code; never store plaintext), `project_id` (uuid → projects, cascade), `expires_at` (timestamptz), `consumed_at` (timestamptz nullable — NULL = pending, set exactly once at consume). Carry a partial index on `project_id WHERE consumed_at IS NULL` mirroring `idx_invites_project_active`.
- **New `app_tokens` table** (clone the `tokens` bcrypt pattern): `id` (uuid pk), **`token_id` (text, non-secret prefix/lookup id, `NOT NULL`, with a UNIQUE INDEX — load-bearing)**, `bcrypt_hash` (text — bcrypt cost 12 of the secret), `project_id` (uuid → projects, cascade), `scopes` (text/json — stored opaque; scoping enforcement is a later epic per EPIC-047 out-of-scope), `created_at` (timestamptz default now), `revoked_at` (timestamptz nullable).
- **Indexed verify primitive** (`credential-verify.ts`, the whole reason this story is first): a function that takes `{ token_id, secret }`, runs `SELECT ... FROM app_tokens WHERE token_id = $1` (hits the unique index → at most ONE row), then runs a **single** `bcrypt.compare(secret, row.bcrypt_hash)` against that one row. Returns the matched row's identity fields `{ token_id, project_id, scopes }` on success, null on failure. It MUST NOT select more than the one indexed row — no `for (const row of rows)` loop over the table.
- **Timing flatten on the single row, not the table:** when `token_id` matches no row, still run exactly one `bcrypt.compare(secret, FIXTURE_HASH)` against the public fixture hash (clone `service-token.ts:16-20`/`:86-88`) so the no-row path is timing-indistinguishable from the one-row path. Fail closed (return null).
- **Respect `revoked_at`:** a row whose `revoked_at IS NOT NULL` verifies as a failure (the primitive treats it as no usable row; Redis `rev:` double-check and pub/sub belong to 047-04, out of scope here).
- **A Drizzle migration** that creates the 3 tables and their indexes (the UNIQUE INDEX on `app_tokens.token_id` and the partial index on `pairings`), following the repo's existing migration convention (`mcp/src/db/migrations/`).

### 1.3 Out of Scope
- The verify HTTP endpoint `POST /admin-api/v1/connections/verify` (→ STORY-047-03).
- Credential mint + pairing-code consume (→ STORY-047-02).
- Revocation publish on Redis pub/sub and the `rev:` double-check (→ STORY-047-04).
- The broker's short-TTL verify cache and any `connector/` code (→ STORY-047-05; this story touches **only** `mcp/`).
- Scoped app-token authorization (tool/dir limits) — `scopes` is stored opaque, not enforced.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Migration tooling — Drizzle `generate` producing checked-in SQL, or a programmatic/hand-authored migration?
- **Recommended (default-accept):** Follow the existing mcp Drizzle migration convention already in the repo — `mcp/src/db/migrations/*.sql` checked-in artifacts produced via the same flow that generated `0000_neat_clea.sql` … `0009_*.sql`. Match the established `kebab_name.sql` + `meta/` snapshot pattern; do not introduce a new tooling path.
- **Human decision:** {default-accept}

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** Developer clones `service-token.ts` faithfully, including its whole-table `for (const row of rows)` scan — re-importing the exact anti-pattern this story exists to kill.
- **Mitigation:** §2.1 has an explicit Gherkin scenario asserting the verify does a single indexed lookup and does NOT scan all tokens; §4.2 DoD requires a `grep` confirming no table-wide candidate query in `credential-verify.ts`. The epic forbids the scan at `service-token.ts:65-97`.
- **Risk:** `member_id` declared `NOT NULL` would break app-token connections (which have no member), forcing a later migration.
- **Mitigation:** `connections.member_id` is explicitly nullable in §1.2; covered by the schema-shape Gherkin scenario.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Dedicated credential schema + indexed token verify

  Scenario: Indexed verify does a single-row lookup and one bcrypt compare
    Given an app_tokens row exists with a known token_id and a bcrypt hash
    When credential-verify is asked to verify that token_id with the correct secret
    Then it issues a single SELECT keyed by token_id (it does NOT select all tokens)
    And it runs exactly one bcrypt compare against that one row
    And it returns the row's project_id and scopes

  Scenario: Wrong secret on a known token_id is rejected
    Given an app_tokens row exists with a known token_id
    When credential-verify is asked to verify that token_id with the wrong secret
    Then it returns a failure (null) and binds no identity

  Scenario: Unknown token_id fails closed and still runs one fixture compare
    Given no app_tokens row matches the supplied token_id
    When credential-verify is asked to verify that token_id
    Then the lookup returns zero rows
    And exactly one bcrypt compare runs against the public FIXTURE_HASH (timing flatten)
    And the result is a failure (null)

  Scenario: A revoked app token verifies as a failure
    Given an app_tokens row exists whose revoked_at is set
    When credential-verify is asked to verify it with the correct secret
    Then it returns a failure (null)

  Scenario: The three tables exist with the indexed token_id column
    Given the migration has been applied to Postgres
    Then connections, pairings, and app_tokens tables exist
    And app_tokens.token_id carries a UNIQUE INDEX
    And pairings has a partial index on project_id where consumed_at IS NULL
    And connections.member_id is nullable
```

### 2.2 Verification Steps (Manual)
- [ ] Apply the migration against docker-compose Postgres 18; `\d app_tokens` shows the UNIQUE INDEX on `token_id`.
- [ ] `EXPLAIN` (or query-log inspection) confirms the verify path issues a `WHERE token_id = $1` index lookup, not a sequential scan over `app_tokens`.
- [ ] Insert one known token, verify correct/wrong secret, and verify an unknown token_id — confirm exactly one bcrypt compare runs on each path (instrument or assert via spy on the single compare site).
- [ ] `\d connections` shows `member_id` nullable; `\d pairings` shows the partial index.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** under v2 execution mode, this table is a pre-commit gate input. Every file staged in this story's commit must appear in the Value column. All paths carry their repo prefix; this story touches **only** the `mcp/` repo.

| Item | Value |
|---|---|
| Schema (modify — add 3 tables + indexes) | `mcp/src/db/schema.ts` |
| Indexed verify primitive (create) | `mcp/src/auth/credential-verify.ts` |
| Drizzle migration (create) | `mcp/src/db/migrations/<new>.sql` |
| Verify primitive tests — real Postgres (create) | `mcp/test/credential-verify.node.test.ts` |
| New Files Needed | Yes — `mcp/src/auth/credential-verify.ts`, `mcp/src/db/migrations/<new>.sql`, `mcp/test/credential-verify.node.test.ts` |

### 3.2 Technical Logic
Add the three `pgTable` definitions to `mcp/src/db/schema.ts` alongside the existing `tokens` (`schema.ts:67`) and `invites` (`schema.ts:162`) tables — clone their column conventions (`uuid().primaryKey().defaultRandom()`, `timestamp({ withTimezone: true })`, `casing: 'snake_case'` is set in `client.ts:18`). Give `app_tokens.token_id` a `.notNull()` text column with a `uniqueIndex(...)`, and `pairings` a partial `index(...).where(sql\`...consumed_at IS NULL\`)` mirroring `idx_invites_project_active` (`schema.ts:184`).

`credential-verify.ts` clones the timing-flatten machinery from `service-token.ts` (the public `FIXTURE_HASH` at `service-token.ts:16-20` and the `bcrypt.compare` discipline) but replaces the whole-table candidate query (`service-token.ts:65-80`) and the serial `for (const row of rows)` loop (`service-token.ts:90-97`) with a **single** `db.select(...).from(appTokens).where(eq(appTokens.tokenId, token_id)).limit(1)`. If a row exists and `revoked_at IS NULL`, compare the secret against that one `bcrypt_hash`; otherwise compare against `FIXTURE_HASH` and return null. On match, return `{ token_id, project_id, scopes }`. The function takes the `DB` handle (`mcp/src/db/client.ts`) as a parameter — no module-level pool, matching the `buildServiceTokenAuth(db, ...)` factory style. Tests run against the docker-compose Postgres pool from `client.ts`.

### 3.3 API Contract (if applicable)

> No HTTP surface in this story — the endpoint is STORY-047-03. Internal primitive contract:

| Function | Input | Output | Notes |
|---|---|---|---|
| `verifyAppToken(db, { token_id, secret })` | `{ token_id: string, secret: string }` | `{ token_id, project_id, scopes } \| null` | single indexed lookup + one bcrypt compare; timing-flattened; fail-closed null |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit / integration tests | 5 | one per §2.1 Gherkin scenario — single-lookup, wrong-secret, unknown-id-fixture-compare, revoked-fails, schema-shape. Run against **real** docker-compose Postgres 18 (no mocks) via `tsx --test`, file `*.node.test.ts`. |
| E2E / acceptance tests | 0 | E2E auth flow is later in M1 (endpoint + broker) |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met — 5 scenarios against real Postgres 18, no mocks.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `grep` confirms `credential-verify.ts` issues NO table-wide candidate query and NO `for (const row of rows)` loop (the `service-token.ts:65-97` anti-pattern is not reintroduced).
- [ ] Migration applies cleanly to a fresh docker-compose Postgres 18 and `\d` shows the UNIQUE INDEX on `app_tokens.token_id`.
- [ ] `npm run typecheck` clean + `npm test` green for `mcp/`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `mcp/src/db/schema.ts:67-85` (`tokens` table) — `randomBytes→bcrypt` credential shape (`tokenHash`, `revokedAt`, `lastUsedAt`). **Clone the column conventions for `app_tokens`** (adding the non-secret indexed `token_id`).
- **Surface:** `mcp/src/db/schema.ts:162-185` (`invites` table) + its `idx_invites_project_active` partial index (`schema.ts:184`) — one-time-consume pattern with `consumedAt` NULL = pending. **Clone for `pairings`.**
- **Surface:** `mcp/src/auth/service-token.ts:16-20` (`FIXTURE_HASH`) + `:82-97` (timing-flattened compare) — the timing-flatten discipline to **keep**, but the whole-table candidate query (`:65-80`) and the serial `for (const row of rows)` loop (`:90-97`) are **forbidden** by the epic; replace with a single indexed lookup.
- **Surface:** `mcp/src/db/client.ts:8-19` — the `pg.Pool` (`max:20`) + Drizzle handle the tests run against and the verify primitive accepts as a parameter.
- **Coverage of this requirement:** **partial** — the credential/one-time-consume patterns and the timing-flatten machinery are ~80% clone-able, but the dedicated 3-table schema and the indexed single-row verify primitive are **net-new** (no `connections`/`pairings`/`app_tokens` tables exist today; verified absent in `schema.ts`).

## Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this:** `mcp/src/auth/service-token.ts` carries the bcrypt + timing-flatten half by cloning; the indexed schema and the single-row primitive are net-new — there is no `token_id`-keyed lookup or dedicated connection-credential table to extend.
- **Why isn't extension / parameterization / config sufficient?** Reusing `tokens` + the existing `service-token` verifier would carry forward exactly the whole-table bcrypt scan the epic forbids (`service-token.ts:65-97`), whose per-connect cost grows with the total token population across all projects — the documented reconnect-storm amplifier. Defusing it requires a non-secret indexed lookup column, which is a schema change, not a config flag. The 3 dedicated tables are mandated by EPIC-047 §6 (resolved: "dedicated probably") over a `tokens.kind` discriminator. This is right-sized cloning of proven patterns plus the one structural change (the index) that the storm fix demands; no generic credential engine is invented.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

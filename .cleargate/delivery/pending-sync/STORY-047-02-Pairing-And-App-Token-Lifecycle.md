---
story_id: STORY-047-02
parent_epic_ref: EPIC-047
parent_cleargate_id: "EPIC-047"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-047 (INITIATIVE-001 direct-approval) §1.2/§3.1/§6 RESOLVED + verified codebase grounding
actor: Project operator / Connector owner
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set:
  - pairings
  - app_tokens
dep_predecessors:
  - STORY-047-01
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
      detail: "cited paths do not exist on disk: mcp/src/admin-api/members.ts, mcp/src/db/schema.ts, mcp/src/admin-api/tokens.ts, mcp/src/auth/service-token.ts"
  last_gate_check: 2026-06-04T14:13:53Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-047-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T14:13:53Z
  sessions: []
---

# STORY-047-02: mcp — pairing-code + app-token lifecycle (mint / one-time consume / revoke by operator + owner)
**Complexity:** L2 — two new credential tables plus their mint/list/revoke admin routes, cloned from the proven `invites` (one-time consume) and `tokens`/service-token (bcrypt + revoke) patterns; no net-new abstraction.

## 1. The Spec (The Contract)

### 1.1 User Story
As a project operator and as a Connector owner, I want `mcp` to mint, list, and revoke pairing codes and app tokens against dedicated tables, so that I can hand a one-time pairing code to a Connector and a durable scoped token to an app — and instantly revoke either — before any broker ever verifies them.

### 1.2 Detailed Requirements
- **Pairing code (standalone lane):** mint a **one-time, short-TTL** credential into a new `pairings` table. Clone the `invites` shape and the **atomic `consumedAt`** semantics — a conditional `UPDATE ... WHERE consumed_at IS NULL RETURNING` so a second consume on the same row affects zero rows and is rejected. The plaintext credential is returned exactly once at mint; the row stores only the non-secret `id`/`token_id` (no plaintext at rest).
- **App token (app→connection):** mint a **durable, scoped, revocable** credential into a new `app_tokens` table. Clone `tokens`/service-token: `randomBytes` plaintext → `bcrypt.hash(plaintext, BCRYPT_COST=12)`, store `tokenHash` + the non-secret `token_id`/prefix produced by STORY-047-01 (so 047-03's indexed verify can `SELECT WHERE id=$1` instead of scanning), plus `scopes`, `revokedAt`. Plaintext returned exactly once at mint.
- **Mint + list + revoke admin operations** on both tables, exposed as routes on `mcp/src/admin-api/connections.ts` — this is the surface the later admin-UI epic will call. List returns metadata only (never plaintext, never the bcrypt hash).
- **Revoke authority = operator + connector-owner** (EPIC-047 §6 RESOLVED): BOTH a project operator AND the connector-owner who minted a pairing/app-token may revoke it. Enforce **both** authorization paths in the revoke route — accept the revoke if the caller is the project operator OR the minting owner; reject (404/403) otherwise. Mirror the existing dual check at `tokens.ts:168` (`row.owner !== adminId`) plus the operator/owner resolution via `assertMemberOwned`.
- Revoke writes `revoked_at` on `app_tokens` (or `consumed_at`/a `revoked_at` on `pairings`) **and** the existing Redis `rev:` key (clone `tokens.ts:181-186` → `rev:apptoken:<id>` / `rev:pairing:<id>`). Revoke is **idempotent** — a second revoke of an already-revoked credential still returns success (clone `tokens.ts:171-174`).

### 1.3 Out of Scope
- The **verify endpoint** `POST /admin-api/v1/connections/verify` and indexed token verify — STORY-047-03.
- The **revoke PUBLISH** on the Redis pub/sub channel — STORY-047-04. THIS story writes `revoked_at`/`consumed_at` and sets the existing `rev:` key (the plumbing that exists today, cloned from `tokens.ts`); it does NOT add a `PUBLISH` (no pub/sub exists today and adding it is 047-04).
- Any **broker** code (`connector/broker/**`) — verify-client / revoke-subscriber are 047-03/047-04.
- **Scoped tool/dir authorization** for app tokens — v1 app token = arbitrary prompts; scope enforcement is a later epic. THIS story persists a `scopes` column but does not enforce it.
- The **`connections` table** and native-lane (`member` kind) wiring — 047-03/047-07.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Does the connector-owner-scoped revoke path resolve "owner" the same way `tokens.ts` does (project `createdBy`), or via a new owner column on the credential row?
- **Recommended:** Store a `created_by` (minting admin/member) column on both new tables and authorize the owner path against it; keep the operator path resolving through the project as `tokens.ts:159` does. This makes "connector-owner who minted it" literal and avoids overloading `projects.createdBy`.
- **Human decision:** {default-accept}

- **Question:** Pairing codes are one-time and short-TTL — do they also carry a `created_by`/owner for the owner-revoke path, given they may be consumed before anyone revokes them?
- **Recommended:** Yes — both tables carry `created_by`; an operator or the minting owner can revoke a still-pending (unconsumed) pairing code. A consumed code is terminal and a revoke of it is an idempotent no-op success.
- **Human decision:** {default-accept}

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** A non-atomic "read consumed_at then update" consume opens a TOCTOU double-redeem window for pairing codes.
- **Mitigation:** Single conditional `UPDATE ... WHERE consumed_at IS NULL RETURNING id` — zero rows returned ⇒ already consumed ⇒ reject. Cover with a concurrent-consume test (two consumes race; exactly one wins). Mirrors the `invites.consumedAt` "set exactly once at redemption" rule (`schema.ts:179`).
- **Risk:** App-token plaintext could leak into list/read responses or logs.
- **Mitigation:** Plaintext is returned exactly once at mint (clone `tokens.ts:144-148`); list/get DTOs are metadata-only and never include `tokenHash` or plaintext — asserted by test.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Pairing-code and app-token lifecycle

  Scenario: Pairing code is one-time and consumed atomically
    Given an operator mints a pairing code for project P
    When the code is consumed while valid and unconsumed
    Then the consume succeeds and consumed_at is set exactly once
    And a second consume of the same code is rejected

  Scenario: Concurrent consume of one pairing code yields exactly one winner
    Given a valid, unconsumed pairing code
    When two consumes race on the same code
    Then exactly one succeeds and the other is rejected (atomic UPDATE ... WHERE consumed_at IS NULL)

  Scenario: App token is minted with a bcrypt hash and non-secret token_id
    Given an operator mints an app token for a member of project P
    Then the row stores a bcrypt-hashed secret plus the non-secret token_id
    And the plaintext is returned exactly once and never appears in a list response

  Scenario: Revoke an app token sets revoked_at and the rev: key
    Given a minted, non-revoked app token
    When it is revoked
    Then revoked_at is set, the rev:apptoken:<id> Redis key is written, and a second revoke is an idempotent success

  Scenario: Operator can revoke any credential in the project
    Given a pairing code and an app token in project P minted by some owner
    When the project operator revokes either
    Then the revoke succeeds

  Scenario: Minting connector-owner can revoke their own credential
    Given a credential minted by connector-owner O
    When owner O revokes that credential
    Then the revoke succeeds

  Scenario: A non-owner non-operator cannot revoke
    Given a credential minted by owner O in project P
    When a member who is neither the operator nor O attempts to revoke it
    Then the revoke is rejected (not_found / forbidden) and the credential stays active
```

### 2.2 Verification Steps (Manual)
- [ ] Mint a pairing code via the new route → plaintext returned once; consume it → success; consume again → rejected.
- [ ] Mint an app token → `SELECT` the row, confirm `tokenHash` is bcrypt (`$2`-prefixed) and a non-secret `token_id`/prefix is stored; confirm list response omits hash + plaintext.
- [ ] Revoke an app token as operator → `revoked_at` set + `rev:apptoken:<id>` present in Redis; revoke again → still success (idempotent).
- [ ] Revoke as the minting owner → success; revoke as an unrelated member → rejected.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** under v2 execution mode, this table is a pre-commit gate input (cleargate-enforcement.md §6). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows are ignored by the parser.

| Item | Value |
|---|---|
| Mint/list/revoke routes (new) | `mcp/src/admin-api/connections.ts` |
| New tables `pairings` + `app_tokens` (modify) | `mcp/src/db/schema.ts` |
| Lifecycle tests — real Postgres + Redis (new) | `mcp/test/connections-lifecycle.node.test.ts` |
| New Files Needed | Yes — `mcp/src/admin-api/connections.ts`, `mcp/test/connections-lifecycle.node.test.ts` |

> Cross-repo note: STORY-047-02 lives **entirely in the `mcp/` repo** (the identity authority). It writes the `pairings` + `app_tokens` schema and their admin routes. No `connector/` (broker-edge) files are touched here — those are 047-03/047-04. The `connector/` and `mcp/` repos are separate git repos; this story commits only to `mcp/`.

### 3.2 Technical Logic
`connections.ts` registers admin-API routes under the project scope, cloning the structure of `tokens.ts` / `members.ts` route modules. **Pairing mint** inserts into `pairings` (clone the `invites` insert at `members.ts:246-259`: `projectId`, `createdBy`, `expiresAt` short TTL, `consumedAt` NULL). **Pairing consume** is the load-bearing atomic op: `UPDATE pairings SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL RETURNING id` — empty result ⇒ reject (this enforces the "exactly once" rule from `schema.ts:179`). **App-token mint** clones `tokens.ts:130-148`: `generatePlaintext()` → `bcrypt.hash(plaintext, BCRYPT_COST)` (cost 12), store `tokenHash` + the non-secret `token_id`/prefix from STORY-047-01 + `scopes`, return plaintext once with HTTP 201. **Revoke** clones `tokens.ts:152-188`: load the row joined to its project, authorize via the **dual path** (operator OR minting owner — `row.owner === adminId` per `tokens.ts:168` OR `row.createdBy === callerId`), idempotent-skip if already revoked (`tokens.ts:171-174`), then `UPDATE ... SET revoked_at = NOW()` and `redis.set('rev:apptoken:<id>'|'rev:pairing:<id>', '1', 'EX', ttl)` (clone `tokens.ts:181-186`). No `PUBLISH` is added (deferred to 047-04). New `schema.ts` tables `pairings` and `app_tokens` mirror the `invites` / `tokens` column sets with the added `createdBy` owner column and (for `app_tokens`) `tokenId`/prefix + `scopes`.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `/admin-api/v1/projects/:pid/pairings` | POST | operator (admin) | `{ label?, ttl_sec? }` | `201 { id, code, expires_at }` (code = plaintext, once) |
| `/admin-api/v1/projects/:pid/pairings` | GET | operator | — | `{ pairings: [{ id, label, created_at, expires_at, consumed_at, revoked_at }] }` |
| `/admin-api/v1/pairings/:id` | DELETE | operator OR minting owner | — | `204` (idempotent) |
| `/admin-api/v1/projects/:pid/app-tokens` | POST | operator | `{ member_id, name, scopes?, expires_at? }` | `201 { id, token_id, token, scopes, expires_at }` (token = plaintext, once) |
| `/admin-api/v1/projects/:pid/app-tokens` | GET | operator | — | `{ app_tokens: [{ id, token_id, name, scopes, created_at, expires_at, revoked_at }] }` (no hash) |
| `/admin-api/v1/app-tokens/:id` | DELETE | operator OR minting owner | — | `204` (sets revoked_at + rev:apptoken:<id>; idempotent) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> node:test via `tsx --test`, file `mcp/test/connections-lifecycle.node.test.ts`. **Real infra, NO mocks** — run against docker-compose Postgres 18 + Redis 8 (ClearGate rule; OrbStack available locally). This story sets `db_write_set: ["pairings","app_tokens"]`.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit / integration tests | 7 | pairing-one-time-consume, concurrent-consume-one-winner, apptoken-bcrypt+token_id, apptoken-revoke-sets-revoked_at+rev:key, idempotent-revoke, operator-can-revoke-any, owner-can-revoke-own + non-owner-rejected |
| E2E / acceptance tests | 0 | verify-endpoint E2E is STORY-047-03; pub/sub kill-in-flight is 047-04 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Tests run against real Postgres 18 + Redis 8 (no mocks); list responses asserted to omit `tokenHash` + plaintext.
- [ ] `grep` confirms no `PUBLISH` / pub/sub call added (revoke scope = `rev:` set only; pub/sub is 047-04).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `mcp/src/admin-api/members.ts:246-260` + `mcp/src/db/schema.ts:162-186` (`invites`) — one-time invite create + the atomic `consumedAt` ("set exactly once at redemption", `schema.ts:179`). **Clone for the pairing code** (mint + atomic consume).
- **Surface:** `mcp/src/admin-api/tokens.ts:113-189` (mint `bcrypt.hash(plaintext, BCRYPT_COST)` at `:131`, plaintext-once at `:144-148`, dual-authorization at `:168`, idempotent revoke at `:171-174`, `revokedAt` + `rev:token:<id>` at `:177-186`) + `mcp/src/db/schema.ts:67-78` (`tokens`) + `mcp/src/auth/service-token.ts` — **clone for the app token** mint + revoke. Note: `service-token.ts:64-97` is the legacy whole-table bcrypt scan this lane deliberately avoids — 047-03 introduces the indexed `token_id` lookup; THIS story only persists the `token_id`/prefix that lookup will use.
- **Coverage of this requirement:** **partial (~80% clone-able)** — the one-time-consume and bcrypt-mint-and-revoke patterns exist and are directly clone-able, but the two new tables (`pairings`, `app_tokens`), their routes, and the widened operator-OR-owner revoke authorization are net-new.

## Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this:** the `invites` machinery (`members.ts` + `schema.ts:162-186`) carries the pairing half; the `tokens`/service-token machinery (`tokens.ts` + `schema.ts:67-78`) carries the app-token half. Both are cloned, not extended.
- **Why isn't extension / parameterization / config sufficient?** EPIC-047 §6 resolved the schema as **dedicated** `pairings`/`app_tokens` tables (not a `tokens` `kind` discriminator), because the broker-verify lane needs a distinct indexed `token_id` surface and pairing codes carry one-time/short-TTL semantics that don't belong on the long-lived `tokens` row. Overloading `tokens` would also entangle this RCE-surface credential with the existing service-token auth path. A dedicated, cloned module is the right size; the revoke authorization is genuinely wider (operator OR minting owner) than `tokens.ts`'s single owner check, so it can't be a pure config flag.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2 (one-time consume + atomicity, bcrypt+token_id mint, revoke writes revoked_at+rev: key, operator-OR-owner authorization — each has a scenario).
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding (`mcp/src/admin-api/connections.ts`, `mcp/src/db/schema.ts`, `mcp/test/connections-lifecycle.node.test.ts`; reuse cites verified at members.ts:246-260, tokens.ts:113-189, schema.ts:67-78/162-186, service-token.ts).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

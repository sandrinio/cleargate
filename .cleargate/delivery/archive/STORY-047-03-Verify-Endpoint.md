---
story_id: STORY-047-03
parent_epic_ref: EPIC-047
parent_cleargate_id: "EPIC-047"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-047 (INITIATIVE-001 direct-approval) §6 resolved decisions + verified codebase grounding (mcp/src/**)
actor: Broker (service principal calling mcp on behalf of a connecting Connector/app)
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set:
  - pairings
dep_predecessors:
  - STORY-047-01
  - STORY-047-02
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
      detail: "cited paths do not exist on disk: mcp/src/auth/credential-verify.ts, mcp/src/admin-api/connections.ts, mcp/src/auth/jwt.ts, mcp/src/auth/revocation.ts, mcp/src/middleware/rate-limit.ts, mcp/src/auth/service-token.ts, mcp/src/db/client.ts"
  last_gate_check: 2026-06-04T14:14:11Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-047-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T14:14:10Z
  sessions: []
---

# STORY-047-03: mcp — POST /admin-api/v1/connections/verify (per-kind, rate-limited, fail-closed, always returns project_id)
**Complexity:** L3 — the single identity-authority chokepoint: three credential kinds behind one route, anon-path admission control, pool headroom, and a hard fail-closed contract. Cross-cutting (admin-api + db pool) and on the connect hot path.

## 1. The Spec (The Contract)

### 1.1 User Story
As the broker, I want to call one mcp endpoint at connect time that tells me whether a presented credential is valid and — if so — which project (and member/connection) it binds to, so that I can admit or deny a Connector/app without ever holding a signing secret or a DB credential, and trust that a revoked or unknown credential is always rejected.

### 1.2 Detailed Requirements
- **Route:** `POST /admin-api/v1/connections/verify`. Request body `{ credential: string, kind: "pairing" | "member" | "app_token", connector_meta?: object }`. The route is authed by the **broker's own scoped service token** (the existing service-token auth, not the credential being verified). Response `{ valid: boolean, project_id?: string, member_id?: string, connection_id?: string, scopes?: string[], protocol_version?: number, reason?: string }`.
- **Per-kind logic (one handler per kind, dispatched on `kind`):**
  - **`pairing`** → atomic consume via the 047-02 pairing-consume primitive (single-use, `consumed_at` set transactionally) **and** bind the connection → project: create/return a `connections` row carrying `project_id`. A code that is expired, already-consumed, or unknown → `{ valid: false, reason }`. This is the only kind that **writes** (the `pairings` consume + connection bind).
  - **`member`** → **verify the `cleargate join` access token DIRECTLY** (resolved §6 — reuse mcp's member access-token verify path: JWT signature + `exp` via `JwtService.verifyAccess`, then the Redis revocation check `RevocationStore.isRevoked(jti)` against the `revoked:<jti>` key). On success bind connection → `project_id` + `member_id` (from the verified claims). **No derived connection credential is minted at M1.**
  - **`app_token`** → the 047-01 **indexed** verify (`SELECT WHERE token_id=$1` → a single bcrypt compare; never the legacy whole-table scan) + a Redis `rev:` revocation check + return the addressable `connection_id`(s) and `scopes` bound to that app token.
- **Always carry `project_id` on a valid response.** A valid result that cannot resolve a `project_id` is a bug → return `{ valid: false, reason: "no_project_binding" }` (the broker stamps `project_id` into the bound triple and fails closed if it is absent — defense-in-depth for the EPIC-046 per-frame project re-assertion).
- **Fail CLOSED.** Any invalid / expired / revoked credential, unknown `kind`, malformed body, **or** an internal error (Postgres unreachable, Redis unreachable, bcrypt throw) → `{ valid: false, reason }` with a non-2xx-or-200-false contract that the broker treats as deny. **Never** emit `valid: true` on an error path; never let an exception escape as a 5xx the broker could misread as transient-retry-into-open.
- **Anon-path admission control + dedicated rate-limit.** Because verify is called **pre-identity** at register, attach its **own** limiter (reuse `buildAnonymousRateLimit`, fixed-window Redis counter) keyed independently of the rest of mcp's anon surface, so a connect storm against verify cannot DoS auth-exchange / device-flow / other anon routes.
- **Postgres pool headroom.** Confirm/raise the shared mcp pool (`client.ts:11`, today `max: 20`) **or** give verify a dedicated pool, so a connect burst does not starve normal mcp request traffic. The chosen approach is config-driven (a `VERIFY_POOL_MAX` / shared-`max` bump), documented in the test, and verified by a concurrency test that asserts verify under burst does not exhaust the shared pool used by other routes.

### 1.3 Out of Scope
- Broker-side verify-client + short-TTL positive cache (→ STORY-047-05).
- Revoke publish/subscribe (Redis pub/sub `rev:*` channels, in-flight-turn kill) (→ STORY-047-04).
- Admin UI for minting/listing/revoking credentials (later epic).
- Native-lane *wiring* on the connector/broker side (→ STORY-047-07); this story only adds the `member` kind to the mcp endpoint.
- Scoped app-token authorization (tool/dir limits) — v1 app token = arbitrary prompts; scoping is a later epic.
- The `pairings` / `app_tokens` / `connections` schema and the indexed `credential-verify.ts` primitive themselves (→ STORY-047-01, 047-02; consumed here).

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Should the `connections` row be created on every successful verify, or reused if one already exists for the same (project, member/app-token) tuple?
- **Recommended:** Create a fresh `connections` row per successful verify (one row per live connection, matching the broker's per-socket `connection_id` model in EPIC-046); de-dup is a later concern. The endpoint returns the new `connection_id`.
- **Human decision:** {default-accept}

- **Question:** Dedicated verify pool vs. raising the shared `max`?
- **Recommended:** Raise the shared pool `max` (configurable, default bumped) for M1 simplicity; carve a dedicated pool only if the burst test shows starvation. Either satisfies §1.2 — the test is the gate.
- **Human decision:** {default-accept}

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** An internal error (Redis/PG blip) is mishandled as a transient 5xx and the broker retries into an *open* admission.
- **Mitigation:** The endpoint's error contract is explicit: catch-all → `{ valid: false, reason }`; a fail-closed Gherkin scenario asserts `valid:false` (never `valid:true`) under simulated DB/Redis error. Broker fail-closed-on-non-valid is enforced on the 047-05 side.

- **Risk:** Verify is anon and bcrypt-bearing → a connect storm becomes a CPU/pool DoS amplifier on mcp.
- **Mitigation:** Indexed single-compare (047-01) caps per-verify cost; a dedicated anon limiter caps rate; pool headroom prevents starvation of normal traffic. All three are required §1.2 items, each with a test.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: mcp connections verify endpoint (per-kind, fail-closed, project_id always present)

  Scenario: Native-lane member token verifies directly
    Given a member ran cleargate join for project P and holds a valid access token
    When the broker POSTs /connections/verify with kind member and that token
    Then mcp returns valid true with project_id P and the member_id from the token claims
    And no pairing code was required and no derived credential was minted

  Scenario: Revoked member token is denied
    Given a member access token whose jti is present in the Redis revoked set
    When the broker POSTs /connections/verify with kind member and that token
    Then mcp returns valid false with a reason and no project binding

  Scenario: Pairing code is valid and consumed atomically
    Given a valid, unconsumed pairing code for project P
    When the broker POSTs /connections/verify with kind pairing and that code
    Then mcp returns valid true with project_id P and a connection_id
    And the pairing row is marked consumed
    And a second verify of the same code returns valid false

  Scenario: App token verifies via indexed lookup and returns its connection(s)
    Given a valid app_token for project P bound to one or more connection_ids
    When the broker POSTs /connections/verify with kind app_token and that token
    Then mcp returns valid true with project_id P, the allowed connection_id(s), and scopes
    And exactly one indexed row lookup and one bcrypt compare were performed (no whole-table scan)

  Scenario: Revoked app token is denied
    Given an app_token whose id is present under a Redis rev: key
    When the broker POSTs /connections/verify with kind app_token and that token
    Then mcp returns valid false with a reason

  Scenario: Unknown credential is denied
    Given a credential that matches no pairing, member token, or app_token
    When the broker POSTs /connections/verify
    Then mcp returns valid false (never valid true)

  Scenario: Fail closed on backend error
    Given Postgres or Redis is unreachable
    When the broker POSTs /connections/verify with any kind
    Then mcp returns valid false (it never returns valid true on an error path)

  Scenario: Valid response always carries project_id
    Given any kind that verifies successfully
    When mcp returns valid true
    Then project_id is present and non-empty

  Scenario: Verify is rate-limited on its own anon limiter
    Given a burst of verify requests exceeding the verify limiter window
    When the limit is hit
    Then those requests are rejected by the verify limiter
    And mcp's other anon routes (auth-exchange, device flow) remain serviceable

  Scenario: Endpoint requires the broker service token
    Given a request to /connections/verify without a valid broker service token
    When it is received
    Then mcp rejects it as unauthorized before any credential logic runs
```

### 2.2 Verification Steps (Manual)
- [ ] With docker-compose Postgres 18 + Redis 8 up: seed a member access token (cleargate-join shape), POST `kind: member` → 200 `{ valid:true, project_id, member_id }`.
- [ ] Seed an unconsumed pairing → `kind: pairing` returns `valid:true` + `connection_id`; re-POST the same code → `valid:false`; confirm `pairings.consumed_at` is set.
- [ ] Seed an app token, POST `kind: app_token` → `valid:true` + `connection_id`(s) + `scopes`; set the `rev:` key → `valid:false`.
- [ ] Kill Redis (or PG) mid-test → verify returns `valid:false`, never `valid:true`.
- [ ] Confirm a valid response always includes a non-empty `project_id`.
- [ ] Confirm the route 401/403s without the broker service token.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** every file staged in this story's commit must appear in the Value column or be covered by the surface whitelist. Non-path rows are ignored by the parser. Paths are repo-prefixed (mcp/ and connector/ are separate git repos).

| Item | Value |
|---|---|
| Verify route + per-kind handlers (modify — `connections.ts` is created by STORY-047-02; re-read the merged file before editing and add the `/verify` route + dispatch) | `mcp/src/admin-api/connections.ts` |
| Pool headroom / dedicated verify pool (modify — `max: 20` at line 11) | `mcp/src/db/client.ts` |
| Verify endpoint integration test (create — real Postgres 18 + Redis 8, no mocks) | `mcp/test/connections-verify-endpoint.node.test.ts` |
| Indexed app_token verify primitive (reuse, created by 047-01) | `mcp/src/auth/credential-verify.ts` |
| Anon admission limiter (reuse `buildAnonymousRateLimit`) | `mcp/src/middleware/rate-limit.ts` |
| Member access-token verify path (reuse) | `mcp/src/auth/jwt.ts`, `mcp/src/auth/revocation.ts` |
| New Files Needed | Yes — `mcp/test/connections-verify-endpoint.node.test.ts` only (route lives in the 047-02 `connections.ts`) |

### 3.2 Technical Logic
The verify route mounts under `admin-api` and is wrapped by (1) the existing **broker service-token auth** so only the broker can call it, and (2) a **dedicated anon-style limiter** built from `buildAnonymousRateLimit` (rate-limit.ts:57), keyed on a verify-specific bucket so its budget is independent of auth-exchange/device-flow. The handler validates the body (Zod: `credential` non-empty, `kind` in the enum) — a malformed body short-circuits to `{ valid:false }`. It then dispatches on `kind`:

- `member` → `JwtService.verifyAccess(credential)` (jwt.ts:66) for signature + `exp`; on success check `RevocationStore.isRevoked(claims.jti)` (revocation.ts, `revoked:<jti>` key). Map `claims` → `{ project_id, member_id }`, create the `connections` bind row, return.
- `pairing` → call the 047-02 atomic-consume primitive inside a transaction (sets `consumed_at`, errors if already consumed/expired), create the `connections` bind row, return `connection_id` + `project_id`.
- `app_token` → call the 047-01 `credential-verify.ts` indexed verify (`SELECT WHERE token_id=$1` → one `bcrypt.compare`; **not** the legacy `service-token.ts:73` whole-table scan) + the `rev:` check, return the bound `connection_id`(s) + `scopes`.

Every path is wrapped in a single try/catch whose catch returns `{ valid:false, reason }` — the fail-closed contract. A valid result with no resolvable `project_id` is coerced to `{ valid:false, reason:"no_project_binding" }`. Pool headroom is handled in `client.ts` (bump the shared `max` or expose a dedicated verify pool), exercised by a burst-concurrency assertion in the test.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `/admin-api/v1/connections/verify` | POST | Broker service token | `{ credential: string, kind: "pairing"\|"member"\|"app_token", connector_meta?: object }` | `{ valid: boolean, project_id?: string, member_id?: string, connection_id?: string, scopes?: string[], protocol_version?: number, reason?: string }` (valid response always carries `project_id`) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> All DB/Redis tests run against **real** docker-compose Postgres 18 + Redis 8 — **no mocks** (ClearGate rule; OrbStack available locally). node:test via `tsx --test`; file named `*.node.test.ts`.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Integration tests | 10 | 1 per §2.1 Gherkin scenario (member-direct, member-revoked, pairing-consume, app-token-indexed, app-token-revoked, unknown-denied, fail-closed-on-error, project_id-always, verify-rate-limit, service-token-required) — all against real PG18 + Redis8 |
| Assertion (within app_token test) | 1 | Assert single indexed lookup + single bcrypt compare (no whole-table scan) — defends the 047-01 invariant at the endpoint boundary |
| Assertion (within rate-limit / pool test) | 1 | Burst concurrency does not starve the shared mcp pool used by other routes |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met — 10 integration scenarios green against real PG18 + Redis8.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Fail-closed verified: a simulated PG/Redis error yields `valid:false`, never `valid:true`.
- [ ] `grep` confirms verify uses the indexed `credential-verify.ts` path for `app_token`, not the `service-token.ts` whole-table scan.
- [ ] `db_write_set: ["pairings"]` reflects the only write (pairing consume + connection bind); typecheck clean + suite green for `mcp/`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L1 reuse audit. Cite file:line.

- **Surface:** `mcp/src/auth/credential-verify.ts` (created by STORY-047-01) — indexed `token_id` lookup + single bcrypt compare. **Reuse for the `app_token` kind** (the load-bearing anti-scan path).
- **Surface:** `mcp/src/admin-api/connections.ts` (created by STORY-047-02 — pairing create + atomic consume) — **extend** with the `/verify` route and per-kind dispatch; re-read the merged file first.
- **Surface:** `mcp/src/auth/jwt.ts:66` (`JwtService.verifyAccess`) + `mcp/src/auth/revocation.ts` (`RevocationStore.isRevoked`, `revoked:<jti>`) — the existing **member access-token verify path** for `cleargate join` tokens. **Reuse directly for the `member` kind** (resolved §6 — no derived credential).
- **Surface:** `mcp/src/middleware/rate-limit.ts:57` (`buildAnonymousRateLimit`) — fixed-window Redis-counter limiter. **Reuse for the verify anon admission control.**
- **Surface:** `mcp/src/auth/service-token.ts:41` (`buildServiceTokenAuth`) — broker-service-token auth wrapping the route; `service-token.ts:73` is the **legacy whole-table scan this story must NOT use** for credential verify.
- **Surface:** `mcp/src/db/client.ts:11` (`max: 20`) — the shared pool to bump or supplement with a dedicated verify pool.
- **Coverage of this requirement:** **partial** — every primitive (indexed verify, member verify, pairing consume, limiter, service-token auth) exists or is delivered by 047-01/02; the **composition** into one fail-closed, project_id-guaranteed, anon-rate-limited verify route with pool headroom is net-new.

## Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this:** none single-handedly — the route composes 047-01 indexed verify + 047-02 pairing consume + the existing member-token verify + the existing limiter and service-token auth. No one of these is the verify endpoint.
- **Why isn't extension / parameterization / config sufficient?** Three credential kinds with different verification mechanics (atomic-consume vs. JWT+rev vs. indexed-bcrypt+rev), all behind a single hard fail-closed contract that must *always* surface `project_id` and survive a connect storm without DoSing mcp's anon surface, is irreducibly a new route with branching logic, its own limiter, and pool headroom. Parameterizing one of the existing single-kind paths would entangle the broker-facing introspection contract into a route that isn't shaped for it. A dedicated `/verify` endpoint is the right-sized seam — and the EPIC-047 architecture rule (mcp is the single identity authority; the broker only introspects) requires exactly this one entry point.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2 (per-kind: member/pairing/app_token; project_id-always; fail-closed; anon rate-limit; service-token auth; pool headroom exercised in the rate-limit/burst test).
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding (client.ts:11, jwt.ts:66, revocation.ts, rate-limit.ts:57, service-token.ts:41/:73 verified on disk; connections.ts + credential-verify.ts delivered by 047-02/047-01 predecessors).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").

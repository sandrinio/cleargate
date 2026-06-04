---
epic_id: EPIC-047
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🔴 High
context_source: INITIATIVE-001 triage + connector/PRD.md v0.3.1 + connector/docs/auth-seam.md + verified codebase grounding + recorded direct approval
owner: Sandro
target_date: 2026-07-31
area: connector
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-04T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: parent-approved
      detail: "OR-group failed — all alternatives failed: parent-approved-proposal: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter; parent-approved-initiative: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter"
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: mcp/src/db/schema.ts, mcp/src/admin-api/members.ts, mcp/src/admin-api/tokens.ts, mcp/src/auth/service-token.ts, mcp/src/auth/revocation.ts, cleargate-cli/src/commands/join.ts, cleargate-cli/src/auth/acquire.ts, auth/token-store.ts"
  last_gate_check: 2026-06-04T14:08:16Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-047
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T14:08:15Z
  sessions: []
---

# EPIC-047: Connection Identity & Credentials

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Give the broker a way to verify who's at the door — without becoming an identity provider. mcp mints + verifies all credentials; the broker calls a verify endpoint at connect and reacts to revocation via subscription.</objective>
  <architecture_rules>
    <rule>mcp is the SINGLE identity authority. The broker verifies, never mints, holds no signing secret or DB credentials.</rule>
    <rule>Clone existing primitives: pairing-code ≈ invites (one-time consume); app-token ≈ tokens service-token (bcrypt + Redis rev:).</rule>
    <rule>Revocation must be INSTANT and kill in-flight turns → connect-time introspection + a runtime revoke subscription (Redis pub/sub — first plane use).</rule>
    <rule>Fail CLOSED: deny connect if verify fails or mcp is unreachable. Cache only successful bindings, for the connection's life.</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/admin-api/connections.ts" action="create" />
    <file path="mcp/src/db/schema.ts" action="modify" />
    <file path="connector/broker/src/auth/verify-client.ts" action="create" />
    <file path="connector/broker/src/auth/revoke-subscriber.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
A relayed turn executes `claude` with tools on the user's machine — the highest-value secret in the system. Credentials must be minted, scoped, attributable, and revocable *instantly*, reusing the plane's existing identity instead of standing up a parallel system. Without this, the broker can't safely let anyone in.

**Success Metrics (North Star):**
- A revoked pairing/app token **cannot** reach a Connector or start a turn — and a revoke **kills an in-flight turn** (measured latency to drop).
- Every relayed turn is attributable to who/which app started it (audit row exists).
- The broker holds no signing secret: compromising it cannot mint or forge any credential.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `mcp` verify endpoint `POST /admin-api/v1/connections/verify` — validates `{credential, kind: pairing|member|app_token}`, returns `{valid, project_id, member_id?, connection_id?, scopes, protocol_version?}`. Anon-path rate-limited (called pre-identity at register) with its own admission control so a connect storm can't DoS the rest of `mcp`'s anon surface.
- [ ] **🔑 Indexed token verify (load-bearing — build first).** Do **NOT** inherit the legacy whole-table bcrypt scan (`service-token.ts:65-97` selects ALL tokens and compares serially → per-connect cost grows with *total* token population across all projects). Store a non-secret `token_id`/prefix in the credential; verify = `SELECT WHERE id=$1` → a **single** bcrypt compare. Turns connect-cost O(1) in token count and **single-handedly defuses the reconnect storm** + closes the connect-DoS surface.
- [ ] **Short-TTL verify cache** keyed by credential hash → `{project_id, scopes, token_id}`, invalidated by the revoke subscription. A reconnect within the window skips `mcp` (and bcrypt) entirely. Never outlives a missed revoke (tie invalidation to the subscriber).
- [ ] **Pairing code** (standalone lane): one-time, short-TTL, atomic consume on verify (clone `invites`).
- [ ] **App token** (app→connection): durable, scoped, bcrypt-hashed, revocable (clone `tokens`/service-token) — via the indexed lookup above, not the scan.
- [ ] **Member-identity lane** (ClearGate-native): `cleargate join` token verifies + binds connection → project+member (no separate pairing code).
- [ ] Revocation: write existing `rev:` key + **publish** on a revoke channel (Redis pub/sub — net-new; no publish/subscribe exists today, only `set`/`get`); broker **subscribes**, drops the subject, kills in-flight turns. Per-subject `rev:connection:<id>` / `rev:apptoken:<id>` **plus** a `rev:project:<id>` channel for whole-tenant kill (broker drops all of a project's connections + refuses re-register until cleared). One dedicated broker subscriber connection (`PSUBSCRIBE rev:*`).
- [ ] Verify response **always carries `project_id`**; the broker stamps it into the bound triple and fails closed if it's missing (defense-in-depth for the EPIC-046 per-frame project re-assertion).
- [ ] Broker verify-client + fail-closed behavior; broker's own scoped service token to call `mcp`.
- [ ] **Postgres pool headroom for the verify burst**: confirm/raise the `mcp` pool (today `max:20`, `client.ts:11`) or give verify a dedicated pool so a connect burst doesn't starve normal `mcp` traffic; pairs with connector-side reconnect jitter (EPIC-048).

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- The WS gateway / registry / relay (→ EPIC-046).
- Connector daemon (→ EPIC-048).
- Admin UI for minting/revoking (later epic — this epic exposes the API it will call).
- Scoped app-token authorization (tool/dir limits) — v1 app token = arbitrary prompts (owner's own machine); scoping is a later epic.
- Operator-blind end-to-end encryption (later).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Authority | One authority (`mcp`); broker holds no signing secret / no DB creds |
| Revocation | Instant; kills in-flight turns; connect-check alone is insufficient |
| Availability | `mcp` unreachable at connect → **fail closed** (never fail open on auth) |
| Reuse | Clone invites + service-token patterns; do NOT invent a generic credential engine |
| Blast radius | App token = RCE surface → treat as a production credential |

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `mcp/src/db/schema.ts:162-186` (`invites`) + `mcp/src/admin-api/members.ts:246-260` — one-time invite create + atomic `consumedAt`. **Clone for pairing code.**
- **Surface:** `mcp/src/db/schema.ts:67-78` (`tokens`) + `mcp/src/admin-api/tokens.ts:113-189` + `mcp/src/auth/service-token.ts` — randomBytes→bcrypt(cost 12), `revokedAt` + Redis `rev:token:{id}`, timing-flattened compare. **Clone for app token.**
- **Surface:** `mcp/src/auth/revocation.ts` + Redis `rev:` keys — existing revocation plumbing. **Extend with a publish.**
- **Surface:** `cleargate-cli/src/commands/join.ts`, `cleargate-cli/src/auth/acquire.ts`, `auth/token-store.ts` — existing member identity (keychain refresh token) for the native lane.
- **Coverage of this epic's scope:** **partial** — the *patterns* and revocation plumbing exist and are ~80% clone-able, but there is **no generic mint/verify primitive** and **no introspection endpoint or pub/sub** today; those are net-new.

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this epic:** the `tokens` + `invites` machinery carries the *credential* half by cloning; the verify endpoint + revoke pub/sub are net-new.
- **Why isn't extension / parameterization / config sufficient?** There is no single credential abstraction to parameterize — each of the 5 existing credential types is bespoke. And nothing today lets a *different service* (the broker) verify a credential or learn of a revocation in real time; that seam (introspection + pub/sub) doesn't exist and must be added. Cloning the proven patterns is the right-sized move; inventing a generic credential engine would be over-engineering.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `mcp/src/admin-api/connections.ts` — new verify endpoint (+ mint/list/revoke, consumed by the later admin epic). Create.
- `mcp/src/db/schema.ts` — new `connections`, `pairings`, `app_tokens` tables (or `tokens` with a `kind` discriminator — **open Q §6**). Modify.
- `mcp/src/auth/revocation.ts` — add publish-on-revoke. Modify.
- `connector/broker/src/auth/{verify-client,revoke-subscriber}.ts` — broker side. Create.

**Data Changes:**
- `connections` (id, project_id, member_id?, label, created_at, last_seen) · `pairings` (one-time, consumed_at, expires_at) · `app_tokens` (bcrypt hash, scopes, revoked_at) — final shape pending §6.
- Redis: revoke pub/sub channel(s) `rev:connection:<id>` / `rev:apptoken:<id>`.

## 5. Acceptance Criteria

```gherkin
Feature: Connection Identity & Credentials
  Scenario: Native-lane register
    Given a member has joined project P (cleargate join)
    When their Connector registers with the member token
    Then mcp verifies it and the broker binds the connection to P, no pairing code needed

  Scenario: Pairing code is one-time
    Given a valid, unconsumed pairing code
    When a Connector registers with it
    Then it succeeds and the code is consumed atomically
    And a second use of the same code is rejected

  Scenario: Instant revoke kills in-flight
    Given an app token is driving an in-flight turn
    When an operator revokes that app token
    Then the broker drops the app and terminates the in-flight turn
    And no new turn can be started with that token

  Scenario: Fail closed
    Given mcp is unreachable
    When a Connector or app attempts to connect
    Then the broker denies the connection (never fails open)
```

## 6. AI Interrogation Loop (Human Input Required)

*Resolved (2026-06-04 design dialogue + load analysis):*
- ✅ **Credential schema:** dedicated `connections` / `pairings` / `app_tokens` tables (not a `tokens` `kind` discriminator). — *Human: "dedicated probably."*
- ✅ **Revoke propagation:** Redis pub/sub. — *Human: "yes."* Per-subject channels + a `rev:project:<id>` whole-tenant channel.
- ✅ **App-token verify mechanism:** indexed `token_id` lookup + single bcrypt compare — **NOT** the legacy whole-table scan (load analysis: scan makes connect-cost grow with total tenant count and is the reconnect-storm amplifier).

*Resolved (2026-06-04, SPRINT-36 decomposition — Sandro):*
- ✅ **Pairing-code revocation authority:** **operator + connector-owner** — both a project operator and the connector-owner who minted the code may revoke it. (Widens the revoke API to accept owner-scoped revoke; STORY-047-02/03.)
- ✅ **Native-lane register credential:** **reuse the `cleargate join` access token directly** — the broker verifies the existing join access token as-is at each register (no derived connection credential minted at M1). (STORY-047-03 `member` kind + STORY-047-07 lane wiring.)
- ✅ **Verify-result cache:** **short positive-TTL cache on the broker**, keyed by credential hash, invalidated by the revoke subscription (fail-closed; a reconnect within the window skips `mcp`+bcrypt). Accepted — the cache is tied to the subscriber so it never outlives a revoke. (STORY-047-05.)

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

Requirements to pass to Green (Ready for Coding Agent):
- [ ] `approved: true` is set in the YAML frontmatter.
- [ ] The `<agent_context>` block is complete and validated.
- [ ] §4 Technical Grounding contains 100% real, verified file paths.
- [ ] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [ ] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

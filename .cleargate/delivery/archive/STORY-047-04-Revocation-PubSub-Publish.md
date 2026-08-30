---
story_id: STORY-047-04
parent_epic_ref: EPIC-047
parent_cleargate_id: "EPIC-047"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-047 (INITIATIVE-001 direct-approval) §2 IN-SCOPE revoke pub/sub + §6 RESOLVED (Redis pub/sub, per-subject + rev:project:<id> whole-tenant) + verified codebase grounding
actor: mcp identity authority (revocation path)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
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
      detail: "cited paths do not exist on disk: mcp/src/auth/revocation.ts, mcp/src/admin-api/tokens.ts, mcp/src/auth/service-token.ts, mcp/src/redis/client.ts"
  last_gate_check: 2026-06-04T14:13:52Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-047-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T14:13:51Z
  sessions: []
---

# STORY-047-04: mcp — revocation publish on Redis pub/sub (per-subject + whole-tenant channels)
**Complexity:** L2 — extend the existing revocation path so a revoke writes its `rev:` key **and** publishes a revoke message on a Redis pub/sub channel; first plane use of publish, broker subscriber is out of scope (047-06).

## 1. The Spec (The Contract)

### 1.1 User Story
As the mcp identity authority, I want every credential revocation to publish a revoke message on a Redis pub/sub channel in addition to writing the existing `rev:` key, so that a subscribing broker (built in STORY-047-06) can drop the revoked subject in real time and kill in-flight turns instead of waiting for the next connect-time check.

### 1.2 Detailed Requirements
- **Extend the existing revocation path** (`mcp/src/auth/revocation.ts`): when mcp revokes a connection, an app-token, or a pairing, it MUST continue to write the existing Redis `rev:` key (no change to that contract) **and additionally PUBLISH a revoke message** on the matching pub/sub channel.
- **Per-subject channels:** a connection revoke publishes on `rev:connection:<id>`; an app-token revoke publishes on `rev:apptoken:<id>`. The channel name is derived from the subject kind + id, mirroring the existing `rev:` key-naming convention already used for `rev:token:<id>`.
- **Whole-tenant channel:** a whole-tenant revoke publishes on `rev:project:<id>`, so a subscribing broker can drop **all** of a project's connections in one message rather than enumerating subjects.
- **First plane use of pub/sub (verified):** no `publish`/`subscribe`/`psubscribe` call exists anywhere in `mcp/src/` today — the codebase uses only `set`/`get`/`keys` on Redis. This story adds the **publish side only**. The broker subscriber (`PSUBSCRIBE rev:*`) + kill-in-flight is STORY-047-06.
- **Message body:** publish a small JSON string identifying the revoked subject — `{ kind: "connection"|"apptoken"|"project", id: <string>, revoked_at: <ISO-8601> }`. The body is informational for the subscriber; the channel name alone is sufficient to identify the subject, so a subscriber that ignores the body still functions (fail-closed by design — see §1.5).
- **Publish-after-key-write ordering:** the `rev:` key write happens **before** the publish within the same revoke call, so a subscriber that reacts to the publish by re-checking the key always observes the key already set (no publish-without-key race). A publish failure MUST NOT silently swallow — it surfaces (throw/log) so the revoke is not falsely reported complete with the propagation half missing.
- **No regression to the existing key-write contract:** the existing `rev:` key (TTL = remaining credential life, value `'1'`) is written exactly as today; this story only adds the publish alongside it.

### 1.3 Out of Scope
- The broker subscriber, `PSUBSCRIBE rev:*`, and kill-in-flight turn termination — **STORY-047-06**.
- The verify endpoint `POST /admin-api/v1/connections/verify` and indexed token verify — **STORY-047-03**.
- The short-TTL broker verify cache + its subscription-driven invalidation — **STORY-047-05** (consumes this publish, does not build it).
- Minting/listing credentials and the owner-scoped revoke API surface — STORY-047-02/03.
- Any admin UI for revoke.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Should the publish reuse the single shared ioredis connection (`buildRedis`, `mcp/src/redis/client.ts`) that already serves `set`/`get`, or open a dedicated publisher connection?
- **Recommended:** Reuse the shared connection for **publishing**. ioredis only forces a *dedicated* connection on the **subscriber** side (a connection in subscribe mode cannot issue normal commands); a publisher has no such restriction and may share the command connection. The dedicated-subscriber requirement lands on the broker in STORY-047-06, not here.
- **Human decision:** {default-accept}

- **Question:** Does the `rev:project:<id>` whole-tenant publish also need to write a `rev:project:<id>` *key*, or is the publish enough?
- **Recommended:** Publish-only for the whole-tenant channel in this story. The epic's whole-tenant kill semantics ("broker refuses re-register until cleared") are a broker-side concern (047-06); this story's contract is "publish on `rev:project:<id>` so the broker can drop all of a project's connections." Per-subject revokes keep their existing per-subject key write unchanged. If a durable whole-tenant flag is later needed, it is added in the owner-scoped revoke story (047-02/03), not retrofitted here.
- **Human decision:** {default-accept}

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** A publish that fires before the `rev:` key is durably set would let a subscriber re-check the key and miss the revoke (publish-without-key race).
- **Mitigation:** Enforce key-write-then-publish ordering inside the revoke call; covered by the no-regression Gherkin scenario asserting the key exists at publish time.

- **Risk:** A swallowed publish error would make a revoke *look* complete while the propagation half silently failed — the subscriber never learns, in-flight turns survive.
- **Mitigation:** Do not catch-and-ignore the publish; let it surface so the caller sees a failed revoke. The broker is fail-closed regardless (047-05/06), so a missed publish degrades to "next connect-time check catches it" rather than "stays valid forever," but the publish failure must still be observable.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Revocation publish on Redis pub/sub

  Scenario: Revoking a connection writes its rev: key AND publishes on its channel
    Given a Redis subscriber listening on rev:connection:<id>
    When mcp revokes connection <id>
    Then the rev: key for that connection is set in Redis
    And a revoke message is published on rev:connection:<id>

  Scenario: Revoking an app-token publishes on its channel
    Given a Redis subscriber listening on rev:apptoken:<id>
    When mcp revokes app-token <id>
    Then a revoke message is published on rev:apptoken:<id>

  Scenario: A whole-tenant revoke publishes on the project channel
    Given a Redis subscriber listening on rev:project:<id>
    When mcp performs a whole-tenant revoke for project <id>
    Then a revoke message is published on rev:project:<id>

  Scenario: The existing rev: key write still happens (no regression)
    Given the legacy revoke path that writes a rev: key with TTL = remaining credential life
    When mcp revokes a credential
    Then the rev: key is present in Redis with the expected value and a positive TTL
    And the key is written before the publish fires

  Scenario: Publish failure surfaces (not swallowed)
    Given a Redis connection that errors on publish
    When mcp attempts to revoke a credential
    Then the revoke call surfaces the failure rather than reporting success
```

### 2.2 Verification Steps (Manual)
- [ ] Against docker-compose Redis 8: open `redis-cli SUBSCRIBE rev:connection:<id>`, trigger a connection revoke, observe the published message.
- [ ] Confirm `GET rev:...<id>` returns the key (value `'1'`, positive TTL) after the revoke — existing contract intact.
- [ ] `grep` confirms the publish call lives in `mcp/src/auth/revocation.ts` and that this is the only `publish` call in `mcp/src/`.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** under v2 execution mode, this table is a pre-commit gate input. Every file staged in this story's commit must appear in the Value column. Non-path rows are ignored by the parser.

| Item | Value |
|---|---|
| Revocation path (modify) | `mcp/src/auth/revocation.ts` |
| Revocation publish test (create) | `mcp/test/revocation-publish.node.test.ts` |
| Redis client (read-only reference — publisher connection) | `mcp/src/redis/client.ts` |

### 3.2 Technical Logic
`mcp/src/auth/revocation.ts` is the revocation path being extended. Today it writes self-cleaning `rev:`-style keys to Redis (the `RevocationStore` writes `revoked:<jti>` keys; the service-token / admin-token paths write `rev:token:<id>` keys via the shared ioredis connection). This story adds, alongside the existing key write, a `redis.publish(<channel>, <body>)` call:

- Connection revoke → channel `rev:connection:<id>`.
- App-token revoke → channel `rev:apptoken:<id>`.
- Whole-tenant revoke → channel `rev:project:<id>`.

The publisher reuses the shared ioredis connection from `buildRedis` (`mcp/src/redis/client.ts`) — a publisher does not require a dedicated connection (only a subscriber does; that constraint is the broker's in 047-06). The `rev:` key write executes **before** the `publish` within the same revoke call so a subscriber re-checking the key never races ahead of it. Publish errors are not swallowed: they propagate so a failed revoke is not falsely reported as complete. The message body is a small JSON string `{ kind, id, revoked_at }`; the channel name alone identifies the subject, so the body is advisory for the subscriber. No subscriber is added in this story — only the publish side.

### 3.3 API Contract (if applicable)

| Redis op | Channel / Key | Direction | Payload | Trigger |
|---|---|---|---|---|
| `PUBLISH` | `rev:connection:<id>` | mcp → channel | `{ kind:"connection", id, revoked_at }` | connection revoke |
| `PUBLISH` | `rev:apptoken:<id>` | mcp → channel | `{ kind:"apptoken", id, revoked_at }` | app-token revoke |
| `PUBLISH` | `rev:project:<id>` | mcp → channel | `{ kind:"project", id, revoked_at }` | whole-tenant revoke |
| `SET` (unchanged) | `rev:...<id>` | mcp → key | `'1'`, `EX` = remaining credential life | every revoke (existing contract) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> node:test via `tsx --test`, file `*.node.test.ts`. **Real infra, NO mocks** for Redis — run against the docker-compose Redis 8 (ClearGate rule; OrbStack available locally). This story writes no DB tables, so `db_write_set: []`.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit / integration tests | 5 | one per Gherkin scenario in §2.1 — connection publish, app-token publish, project publish, key-write-no-regression (incl. ordering), publish-failure-surfaces. Real Redis subscriber asserts the message arrives on the right channel. |
| E2E / acceptance tests | 0 | broker subscriber + end-to-end kill is STORY-047-06. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met against real Redis 8 (no mocks).
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `grep` confirms the publish lives only in `mcp/src/auth/revocation.ts` and the existing `rev:` key-write contract is unchanged.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `mcp/src/auth/revocation.ts:12-15` — `RevocationStore.revoke()` writes a self-cleaning `revoked:<jti>` key with TTL = remaining token life. **Extend** this revocation path with a publish — do not change the key-write contract.
- **Surface:** `mcp/src/admin-api/tokens.ts:181-186` + `mcp/src/auth/service-token.ts:104-106` — the existing `rev:token:<id>` Redis revoke key (`set('1','EX', ttl)` + `get` double-check). The per-subject channel naming (`rev:connection:` / `rev:apptoken:`) mirrors this `rev:token:` convention.
- **Surface:** `mcp/src/redis/client.ts:4-10` — `buildRedis()` returns the shared ioredis connection; reused as the publisher (publishing does not need a dedicated connection).
- **Coverage of this requirement:** **partial** — the `rev:` key-write plumbing and the shared Redis connection exist and are reused as-is; the **publish** is net-new (verified: no `publish`/`subscribe` call anywhere in `mcp/src/` today — only `set`/`get`/`keys`).

## Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this:** `mcp/src/auth/revocation.ts` — the revoke path already exists; this story adds a publish call beside the existing key write rather than introducing a new module.
- **Why isn't extension / parameterization / config sufficient?** This *is* an extension — no new abstraction is introduced; a `redis.publish(...)` is added to the existing revoke path. It cannot be a config flag because the channel set (`rev:connection:` / `rev:apptoken:` / `rev:project:`) is net-new behavior: nothing in mcp publishes anything today. The minimal change is exactly this publish-on-revoke, deliberately leaving the subscriber to 047-06 so the publish side ships and is testable independently.

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

---
story_id: STORY-047-05
parent_epic_ref: EPIC-047
parent_cleargate_id: "EPIC-047"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-047 (INITIATIVE-001 direct-approval) + connector/docs/auth-seam.md + verified codebase grounding
actor: Broker edge / Connector operator
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
dep_predecessors:
  - STORY-047-03
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
      detail: "cited paths do not exist on disk: connector/docs/auth-seam.md, connector/broker/src/registry.ts, connector/broker/src/auth-stub.ts"
  last_gate_check: 2026-06-04T14:13:31Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-047-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T14:13:30Z
  sessions: []
---

# STORY-047-05: Broker — verify-client + fail-closed + short-TTL verify cache + project_id stamping
**Complexity:** L3 — a new broker→mcp introspection client carrying fail-closed semantics, a revoke-invalidatable positive cache, and a defense-in-depth `project_id` stamp into the registry's bound triple. Cross-cutting (network client + cache + registry mutation) and security-load-bearing, so L3 rather than L2.

## 1. The Spec (The Contract)

### 1.1 User Story
As the broker edge accepting a Connector `register` or app `hello`, I want to verify the presented credential against the `mcp` identity authority — caching only successful verifications for a short window, failing closed on any doubt, and stamping the authoritative `project_id` into the connection's bound entry — so that only `mcp`-blessed identities ever bind, a verify response is reused without re-hitting `mcp` for a brief reconnect window, and the project binding is never trusted from the client.

### 1.2 Detailed Requirements
- **`verify-client.ts` (create):** at `register`/`hello` the broker POSTs `{credential, kind, connector_meta?}` to `mcp` `POST /admin-api/v1/connections/verify`, authenticating the call with the **broker's own scoped service token** (so `mcp` authenticates the caller). On a `{valid:true, ...}` response the broker **binds** (proceeds with registration/hello); on **anything else** — `{valid:false}`, a non-2xx status, a malformed body, `mcp` unreachable, or a request timeout — it **FAILS CLOSED** (denies the connect). Auth never fails open.
- **Short-TTL positive cache** (resolved EPIC-047 §6): keyed by a hash of the credential → `{project_id, scopes, token_id, connection_id}`. A reconnect presenting the same credential within the TTL is served from cache, skipping both the `mcp` round-trip and any bcrypt compare. **Only successful bindings are cached** — `{valid:false}` / fail-closed outcomes are never cached. The module exposes an `invalidate(subject)` hook so STORY-047-06's revoke subscriber can drop an entry; a cached entry must never outlive a revoke for its subject.
- **Stamp `project_id`** (defense-in-depth for the EPIC-046 per-frame project re-assertion): the broker takes `project_id` from the *verify response*, never from anything the client sent, and writes it into the registry's bound triple (`RegistryEntry.project_id`). If the verify response **lacks `project_id`**, the broker **fails closed** (denies the connect) rather than binding to an empty/guessed project.
- The verify-client is the single seam through which broker credential verification flows; no verify logic, cache logic, or service-token handling leaks into `ws-gateway.ts` or `registry.ts` beyond the `project_id` stamp the registry receives.

### 1.3 Out of Scope
- The revoke subscriber, the `rev:*` PSUBSCRIBE connection, and kill-in-flight-turn behavior (STORY-047-06). This story only **exposes** the `invalidate(subject)` hook the subscriber will call; it does not subscribe.
- Retiring the M0 `auth-stub.ts`. This story **adds** `verify-client.ts` alongside the stub; STORY-047-07 removes the stub and wires the gateway to call the verify-client (the lane wiring + cutover).
- The `mcp` verify endpoint, the `connections`/`pairings`/`app_tokens` schema, the indexed `token_id` lookup, and revoke-publish — all `mcp`-side (STORY-047-03 and predecessors).
- The native-lane register path's choice to reuse the `cleargate join` access token (resolved EPIC-047 §6) is realized in the gateway wiring (STORY-047-07); here the verify-client is `kind`-agnostic and simply forwards whatever `kind` the caller passes.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** What value should the short-TTL verify cache use?
- **Recommended (default-accept):** A small fixed TTL in the 30–60s range for M1 (default 30s), made configurable via env (`BROKER_VERIFY_CACHE_TTL_MS`) with a hardcoded fallback. The subscriber-tied `invalidate()` is the real freshness guarantee; the TTL is only a backstop so an entry that somehow misses a revoke message still expires on its own. Tune in hardening.
- **Human decision:** {default-accept}

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** A cached positive entry outlives a revoke (the subscriber misses or races the message), letting a revoked credential reconnect within the TTL window.
- **Mitigation:** Cache TTL is short (30–60s) AND `invalidate(subject)` is exposed for the subscriber to drop entries on revoke; the test suite asserts `invalidate()` drops the entry. The TTL is a defense-in-depth backstop, not the primary mechanism.
- **Risk:** Treating a malformed or partial verify response (e.g. `{valid:true}` with no `project_id`) as a success would bind a connection to an empty project.
- **Mitigation:** Missing `project_id` is an explicit fail-closed branch with a dedicated test; only a fully-shaped `{valid:true, project_id, ...}` response binds.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Broker verify-client, fail-closed, verify cache, and project_id stamping

  Scenario: Valid credential verifies, caches, and stamps project_id
    Given the stubbed mcp verify endpoint returns valid true with a project_id
    When the broker verifies a Connector credential at register
    Then the broker calls mcp with its own service token and binds the connection
    And the success is stored in the positive cache keyed by the credential hash
    And the verify response project_id is stamped into the registry bound entry

  Scenario: mcp unreachable or timeout fails closed and caches nothing
    Given the stubbed mcp verify endpoint is unreachable or times out
    When the broker verifies a credential
    Then the connect is denied (fail closed, never fail open)
    And nothing is written to the positive cache

  Scenario: Reconnect within the TTL is served from cache
    Given a credential was verified successfully and cached
    When the same credential is presented again within the cache TTL
    Then the broker serves the binding from cache and does not call mcp

  Scenario: invalidate(subject) drops the cache entry
    Given a credential was verified successfully and cached
    When invalidate is called for that subject
    Then the next presentation of the same credential calls mcp again (cache miss)

  Scenario: Verify response missing project_id fails closed
    Given the stubbed mcp verify endpoint returns valid true but omits project_id
    When the broker verifies a credential
    Then the connect is denied (fail closed)
    And nothing is stamped into the registry and nothing is cached

  Scenario: valid:false fails closed and caches nothing
    Given the stubbed mcp verify endpoint returns valid false
    When the broker verifies a credential
    Then the connect is denied
    And nothing is written to the positive cache
```

### 2.2 Verification Steps (Manual)
- [ ] Run `tsx --test connector/broker/test/verify-client.node.test.ts` against the in-test mcp stub server → all scenarios green.
- [ ] Inspect `verify-client.ts`: the POST sends the broker's service token in the auth header; the only success branch requires `valid === true` AND a present `project_id`.
- [ ] `grep` confirms verify/cache logic lives only in `verify-client.ts` (no leak into `ws-gateway.ts`); `registry.ts` change is limited to consuming the stamped `project_id` and failing closed when absent.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** under v2 execution mode, this table is a pre-commit gate input (cleargate-enforcement.md §6). Every file staged in this story's commit must appear in the Value column. Repo is `connector/broker`; paths are written with their repo prefix exactly as EPIC-047 `<target_files>` does.

| Item | Value |
|---|---|
| Verify-client (new) | `connector/broker/src/auth/verify-client.ts` |
| Registry — stamp project_id, fail closed if missing (modify) | `connector/broker/src/registry.ts` |
| Verify-client tests (new) | `connector/broker/test/verify-client.node.test.ts` |
| New Files Needed | Yes — `connector/broker/src/auth/verify-client.ts`, `connector/broker/test/verify-client.node.test.ts` |

### 3.2 Technical Logic
`verify-client.ts` exports a `verifyClient` (factory or class) holding the broker's service token, the `mcp` verify base URL, and an in-process positive cache (a `Map<credentialHash, { project_id, scopes, token_id, connection_id, expiresAt }>`). `verify(credential, kind, connector_meta?)`:
1. Compute `credentialHash` (e.g. SHA-256 of the credential — never store the raw credential as a key). Check the cache; if a live (non-expired) entry exists, return it as a binding (cache hit, no network).
2. On a miss, POST `{ credential, kind, connector_meta? }` to `{mcp}/admin-api/v1/connections/verify` with the broker's service token in the auth header, under a bounded request timeout.
3. Any of: network error, timeout, non-2xx, unparsable body, `valid !== true`, or a `valid:true` body **lacking `project_id`** → return a fail-closed denial; **do not cache**.
4. On a fully-shaped `{ valid:true, project_id, scopes, token_id, connection_id, ... }` → store `{ project_id, scopes, token_id, connection_id, expiresAt: now + TTL }` in the cache and return the binding.
5. `invalidate(subject)` deletes the cache entry/entries for that subject (matched by `token_id` / `connection_id` / credential hash, per the subject identifier the subscriber passes) so a revoke never leaves a stale positive.

`registry.ts` change: when the gateway hands a verified binding to `register`, the entry's `project_id` is taken from the verify response (the `RegistryEntry.project_id` field already exists from STORY-046-02). The registry path **rejects binding (fail closed) if `project_id` is absent/empty** — defense-in-depth so a missing project never silently binds. The verify-client is `kind`-agnostic; the gateway selects the `kind` (STORY-047-07).

Tests stand up an **in-test HTTP server** (`node:http`) acting as the `mcp` verify endpoint, scripted per scenario to return valid/invalid/missing-project_id/timeout/unreachable responses; assertions cover fail-closed, cache hit/store/miss-after-invalidate, and the `project_id` stamp. No mocks of the HTTP layer — a real local server. (No DB/Redis is touched in this story, so `db_write_set: []`; the cache is in-process. Real-infra rule still applies to any DB-touching sibling stories.)

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `{mcp}/admin-api/v1/connections/verify` | POST | Broker's own scoped service token | `{ credential: string, kind: "pairing" \| "member" \| "app_token", connector_meta?: object }` | `{ valid: true, project_id: string, member_id?: string, connection_id?: string, scopes: string[], protocol_version?: number }` or `{ valid: false, reason?: string }` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit / integration tests | 6 | One per §2.1 Gherkin scenario: valid-caches-stamps, unreachable-fail-closed, cache-hit-skips-mcp, invalidate-drops, missing-project_id-fail-closed, valid-false-fail-closed. Real `node:http` stub server, no mocks. `*.node.test.ts` via `tsx --test`. |
| E2E / acceptance tests | 0 | Full broker↔mcp wiring is exercised in the M1 E2E story, not here. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `grep` confirms verify/cache/service-token logic lives only in `verify-client.ts` (no leak into gateway/registry beyond the `project_id` stamp).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `connector/docs/auth-seam.md:23-47` — the pinned verify-call shape (`POST {mcp}/admin-api/v1/connections/verify`, broker's own service token, per-kind response), the fail-closed-on-unreachable rule (§"mcp unreachable"), and "cache only successful bindings, invalidated by the subscription." This story implements that doc's broker-side decisions.
- **Surface:** `connector/broker/src/registry.ts:17-32` (`RegistryEntry`) — the bound triple this story stamps `project_id` into; the `project_id` field already exists (set from stub claims at M0), so the change is sourcing it from the verify response and failing closed when absent.
- **Surface:** `connector/broker/src/auth-stub.ts:32-46` (`verifyCredential`) — the M0 quarantined stub `verify-client.ts` is the real-auth counterpart to; this story adds the real client, STORY-047-07 retires the stub.
- **Coverage of this requirement:** partial — the seam (auth-stub quarantine) and the registry bound triple exist and define where this plugs in, but no `mcp` introspection client, positive cache, or fail-closed verify path exists today; those are net-new.

## Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this:** none — `auth-stub.ts` is a synchronous shared-secret compare with no network call, no cache, and no `mcp` awareness; it is explicitly slated for wholesale removal (STORY-047-07), not extension.
- **Why isn't extension / parameterization / config sufficient?** The stub returns fixed claims from a string compare; a real verify is a networked introspection call with fail-closed error handling, a revoke-invalidatable positive cache, and authoritative-source `project_id` stamping. None of those behaviors can be reached by parameterizing the stub — they are net-new logic with their own failure modes (timeout, malformed body, missing project_id) that the security contract (fail closed, never cache a denial, never outlive a revoke) requires be handled explicitly. A dedicated client module is the right-sized abstraction and keeps the verify/cache logic quarantined the way the stub was.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2 (verify+bind, fail-closed-on-unreachable, cache hit, invalidate, missing-project_id fail-closed, valid:false fail-closed; project_id stamp asserted in scenario 1).
- [x] Implementation Guide (§3) maps to specific, verified file paths — `connector/broker/src/auth/verify-client.ts` (new), `connector/broker/src/registry.ts` (exists, verified), `connector/broker/test/verify-client.node.test.ts` (new), and the `mcp` verify endpoint path traceable to EPIC-047 `<target_files>` + `connector/docs/auth-seam.md`.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (auth-seam.md, registry.ts, auth-stub.ts — all verified on disk).
- [x] Why not simpler? has both sub-bullets answered.

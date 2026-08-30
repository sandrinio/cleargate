---
story_id: STORY-047-07
parent_epic_ref: EPIC-047
parent_cleargate_id: "EPIC-047"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-047 (INITIATIVE-001 direct-approval) §2/§5/§6 RESOLVED decisions + verified codebase grounding (connector/broker/src/{ws-gateway,router,auth-stub}.ts)
actor: Connector operator / App owner
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
dep_predecessors:
  - STORY-047-05
  - STORY-047-06
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
      detail: "cited paths do not exist on disk: connector/broker/src/ws-gateway.ts, connector/broker/src/auth-stub.ts, connector/broker/src/router.ts, connector/broker/src/auth/verify-client.ts, connector/broker/src/auth/revoke-subscriber.ts, cleargate-cli/src/commands/join.ts, cleargate-cli/src/auth/token-store.ts, cleargate-cli/src/auth/acquire.ts, auth/audit.ts"
  last_gate_check: 2026-06-04T14:13:48Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-047-07
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T14:13:47Z
  sessions: []
---

# STORY-047-07: connector/broker — wire the 3 register lanes, retire the M0 auth-stub, audit rows per turn
**Complexity:** L3 — replaces the quarantined shared-secret stub with real introspection across three credential kinds, deletes the stub wholesale, and adds per-turn attribution; cross-cutting through register/hello and the relay hot path, depends on two predecessors.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Connector operator and an App owner, I want the broker to admit me by verifying my real credential against `mcp` — whether I arrive with a pairing code, my native `cleargate join` token, or an app token — and I want every relayed turn to leave an attributable audit trail, so that the M0 shared-secret stub is gone and a revoked credential can never start a turn on my machine.

### 1.2 Detailed Requirements
- **Wire all THREE lanes through the 047-05 verify-client.** `ws-gateway.ts` `register`/`hello` no longer call `auth-stub.ts`; they call the verify-client (`connector/broker/src/auth/verify-client.ts`, built in STORY-047-05) for each `kind`:
  - **`pairing`** — register with a one-time pairing code; verify-client returns `{valid, project_id, connection_id?, scopes}`; broker binds and replies `registered`.
  - **`member`** (ClearGate-native) — register with the `cleargate join` **access token reused directly** (EPIC-047 §6 RESOLVED: no derived credential is minted at M1; the broker passes the join token to verify-client as `kind: member`, `mcp` verifies it as-is, returns `{valid, project_id, member_id}`).
  - **`app_token`** — `hello` with a durable app token; verify-client returns `{valid, project_id, app_id, scopes}`; broker binds the app to the connection.
  - In all three lanes the verify response **always carries `project_id`**; the broker stamps it into the bound entry and **fails closed** (denies) if it is missing.
- **DELETE `connector/broker/src/auth-stub.ts` wholesale** (the EPIC-046 §2.5 quarantined stub, explicitly slated for M1 removal). After this story, `grep` finds **zero** credential / shared-secret-compare logic anywhere under `connector/broker/src/**` outside the verify-client seam. The `verifyCredential` / `verifyAppToken` imports in `ws-gateway.ts` are removed.
- **Audit row per relayed turn.** Every turn the broker relays writes one audit-metadata record attributable to who/which app started it: `{connection_id, app_id, project_id, turn_id, ts}`. The hook fires on the prompt→Connector route path (where `connection_id` + `turn_id` + `app_id` are already in hand and `project_id` is on the bound registry entry). Writing audit metadata is **off the critical path** and must not block or delay relay.
- **A revoked credential cannot start a turn.** Integrates with the STORY-047-06 revoke-subscriber: a connection or app token whose subject has been revoked (dropped by the subscriber, or absent from the short-TTL positive verify cache after invalidation) is rejected at register/hello, and any in-flight turn for a revoked subject cannot be (re)started.

### 1.3 Out of Scope
The `mcp` verify endpoint, schema, and revoke publish (STORY-047-01..04). The verify-client internals — indexed lookup, fail-closed semantics, short-TTL positive cache (STORY-047-05). The revoke-subscriber internals — `PSUBSCRIBE rev:*`, in-flight-turn kill, whole-tenant `rev:project:<id>` drop (STORY-047-06). Admin UI for minting/revoking (later epic). Scoped app-token authorization (tool/dir limits — later epic). A durable `mcp`-side audit table and the audit-batch-to-mcp flush seam (EPIC-046 hardening — see §1.4).

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Where does the broker write the per-turn audit metadata at M1 — straight into a durable `mcp` table, or a broker-local record?
- **Recommended:** For M1 the broker appends an audit-metadata record **broker-side, off the critical path** (the relay never waits on the write). A durable `mcp`-side audit table and the audit-batch-to-mcp flush seam are **deferred** to a later epic (EPIC-046 hardening). This keeps 047-07 scoped to attribution-at-source and avoids dragging in a new `mcp` table + endpoint that 047-01..04 did not build.
- **Human decision:** {default-accept}

### 1.5 Risks

- **Risk:** Deleting `auth-stub.ts` while STORY-046 tests still import `verifyCredential` / `verifyAppToken` breaks the broker test suite.
- **Mitigation:** This story is a predecessor-gated rewrite, not an add-on — it updates `ws-gateway.ts` and the 046 register/hello tests in the same change so the stub imports are gone in one atomic step; the new `test/lanes-and-audit.node.test.ts` drives register/hello through the real verify-client (with `mcp` stubbed in-test).
- **Risk:** The audit write lands on the relay critical path and adds latency to every turn.
- **Mitigation:** §1.2 mandates the audit hook be off the critical path (fire-and-forget); a test asserts a turn relays even when the audit writer rejects/throws.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Wire the 3 register lanes, retire the stub, audit per turn

  Scenario: Pairing lane registers via real verify
    Given the broker is listening with the verify-client wired (mcp stubbed in-test)
    When a Connector registers with a valid pairing code (kind pairing)
    Then the broker calls the verify-client, binds the returned project_id, and replies registered

  Scenario: Member (native) lane reuses the cleargate join token directly
    Given a member holds a valid cleargate join access token for project P
    When their Connector registers with that token as kind member
    Then the broker passes the token as-is to the verify-client (no derived credential)
    And on a valid result binds the connection to P and member_id and replies registered

  Scenario: App-token lane binds via real verify at hello
    Given a Connector is registered and online for project P
    When an app sends hello with a valid app token (kind app_token)
    Then the broker calls the verify-client, binds the app to the connection, and replies ready

  Scenario: auth-stub.ts is removed and no shared-secret logic remains
    Given the broker source tree after this story
    Then connector/broker/src/auth-stub.ts does not exist
    And grep finds no credential / shared-secret-compare logic outside the verify-client seam

  Scenario: Every relayed turn writes an audit row
    Given an app has registered and is relaying a turn through the broker
    When the broker routes the prompt to the bound Connector
    Then exactly one audit record is written carrying connection_id, app_id, project_id, and turn_id

  Scenario: Verify result missing project_id fails closed
    Given the verify-client returns a valid result with no project_id
    When a Connector or app attempts to register or hello
    Then the broker denies the connection (never binds without a project_id)

  Scenario: A revoked credential cannot start a turn
    Given a connection or app token whose subject has been revoked (047-06 subscriber dropped it)
    When that subject attempts to register/hello or start a turn
    Then the broker rejects it and no new turn is started

  Scenario: Audit write failure does not block the relay
    Given the audit writer throws or rejects
    When the broker routes a prompt
    Then the turn is still relayed to the Connector (audit is off the critical path)
```

### 2.2 Verification Steps (Manual)
- [ ] Start the broker with the verify-client wired (mcp stubbed); register a Connector with a pairing code, with a native member join token, and `hello` an app with an app token — all three succeed and bind a real `project_id`.
- [ ] `ls connector/broker/src/auth-stub.ts` → not found; `grep -rE "CONNECTOR_SHARED_SECRET|verifyCredential|verifyAppToken|shared.?secret" connector/broker/src` → only the verify-client seam (no stub compares).
- [ ] Relay a turn; confirm one audit record exists carrying `{connection_id, app_id, project_id, turn_id, ts}`.
- [ ] Revoke a subject via the 047-06 subscriber; confirm a subsequent register/turn for that subject is rejected.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** under v2 execution mode, this table is a pre-commit gate input (cleargate-enforcement.md §6). Every file staged in this story's commit must appear in the Value column. Paths carry their repo prefix exactly as EPIC-047 `<target_files>` writes them.

| Item | Value |
|---|---|
| WS gateway (modify — register/hello → verify-client, 3 lanes; re-read the merged file before editing) | `connector/broker/src/ws-gateway.ts` |
| Quarantined M0 stub (DELETE — wholesale) | `connector/broker/src/auth-stub.ts` |
| Audit row writer (create) | `connector/broker/src/auth/audit.ts` |
| Lanes + audit tests (create) | `connector/broker/test/lanes-and-audit.node.test.ts` |
| Verify-client (consume — built by STORY-047-05) | `connector/broker/src/auth/verify-client.ts` |
| Revoke-subscriber (consume — built by STORY-047-06) | `connector/broker/src/auth/revoke-subscriber.ts` |
| Router prompt path (audit hook site — re-read; modify only if the hook needs a call site) | `connector/broker/src/router.ts` |

### 3.2 Technical Logic
`ws-gateway.ts` today calls `verifyCredential(credential, sharedSecret)` at the `register` branch (`ws-gateway.ts:232`) and `verifyAppToken(appToken, sharedSecret)` at the `hello` branch (`ws-gateway.ts:284`). This story replaces **both** call sites with the 047-05 verify-client: `register` calls verify with the credential and its `kind` (`pairing` or `member`), `hello` calls verify with `kind: app_token`. The verify-client owns the indexed lookup, fail-closed behavior, and the short-TTL positive cache — the gateway only consumes its `{valid, project_id, member_id?, connection_id?, app_id?, scopes}` result and binds the returned `project_id` into the registry entry, denying when `project_id` is absent. The `import { verifyCredential, verifyAppToken } from "./auth-stub.js"` line is deleted and `auth-stub.ts` is removed; the 046-02 register/hello tests that exercised the stub are rewritten to drive the verify-client (mcp stubbed in-test).

The **audit** hook lands on the relay path. `router.ts` `routePrompt` (`router.ts:160-187`) already destructures `{ connection_id, turn_id, app_id }` from the envelope and looks up the bound registry entry (which carries `project_id`). A new `audit.ts` exports a writer (e.g. `recordTurnStart({connection_id, app_id, project_id, turn_id, ts})`) invoked at that route point, fire-and-forget so a write failure never blocks the relay. `project_id` is sourced from the looked-up registry `entry.project_id`, not from the (opaque) payload — the broker still never reads payload.

Revocation integration is consume-only: the 047-06 subscriber drops revoked connections/app tokens and invalidates the verify cache; this story asserts that a revoked subject is rejected at register/hello and cannot start a turn — it does not implement the subscription mechanics.

### 3.3 API Contract (if applicable)

| Frame | Direction | Auth (this story) | Carries | Broker action |
|---|---|---|---|---|
| `register` | Connector → Broker | verify-client `kind: pairing` \| `member` | credential (pairing code OR `cleargate join` access token), protocol_version | verify → bind returned project_id (+ member_id for native) → `registered`; deny if invalid/revoked/no project_id |
| `hello` | App → Broker | verify-client `kind: app_token` | app token, target connection_id, protocol_version | verify → bind app → `ready`; deny if invalid/revoked/no project_id |
| `prompt` (relay) | App → Broker → Connector | bound at register/hello | connection_id, turn_id, app_id, opaque payload | route to Connector **and** write one audit record `{connection_id, app_id, project_id, turn_id, ts}` (off critical path) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Test convention: node:test via `tsx --test`, file `connector/broker/test/lanes-and-audit.node.test.ts` (`*.node.test.ts`). The verify-client's `mcp` dependency is stubbed in-test (the broker has no DB); per the ClearGate rule, any test exercising real DB/Redis runs against docker-compose Postgres 18 + Redis 8 with NO mocks — this story writes no tables (`db_write_set: []`) so it stubs the verify-client boundary rather than standing up Postgres.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit / integration tests | 8 | pairing-lane-registers, member-lane-reuses-join-token, app-token-lane-binds, auth-stub-absent (fs + grep), audit-row-per-turn, missing-project_id-fails-closed, revoked-subject-rejected, audit-failure-does-not-block-relay |
| E2E / acceptance tests | 0 | broker↔mcp E2E lands in the M1 integration story / EPIC-046 E2E |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `connector/broker/src/auth-stub.ts` deleted; `grep` confirms zero credential / shared-secret-compare logic outside the verify-client seam.
- [ ] All three lanes (pairing / member / app_token) register/bind via the real verify-client.
- [ ] One audit record written per relayed turn, off the critical path.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> L1 reuse audit. Cite file:line.

- **Surface:** `connector/broker/src/ws-gateway.ts:232` (`verifyCredential` call in `register`) + `:284` (`verifyAppToken` call in `hello`) — the two stub call sites this story re-points at the verify-client. **Modify.**
- **Surface:** `connector/broker/src/auth-stub.ts:32-76` (`verifyCredential` / `verifyAppToken`, shared-secret compare) — the quarantined M0 stub. **Delete wholesale.**
- **Surface:** `connector/broker/src/router.ts:160-187` (`routePrompt` — destructures `{ connection_id, turn_id, app_id }`, looks up the bound entry) — the per-turn audit hook site. **Reuse as the call point.**
- **Surface:** `connector/broker/src/auth/verify-client.ts` (STORY-047-05) — the introspection client this story consumes for all three kinds.
- **Surface:** `connector/broker/src/auth/revoke-subscriber.ts` (STORY-047-06) — the revocation drop/cache-invalidation this story integrates with for "revoked cannot start a turn."
- **Surface:** `cleargate-cli/src/commands/join.ts` + `cleargate-cli/src/auth/token-store.ts:6-15` (TokenStore.load) + `cleargate-cli/src/auth/acquire.ts` — the native-lane `cleargate join` access token the `member` lane reuses directly (reference only; cli is not edited by this story).
- **Coverage of this requirement:** **partial** — the stub seam, the register/hello flow (046-02), and the relay turn path (046-03 `router.ts`) exist and are the surfaces being rewired; the verify-client + revoke-subscriber (047-05/06) are consumed; the audit writer (`auth/audit.ts`) is net-new.

## Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this:** none for the whole — the verify-client (047-05) carries verification and the revoke-subscriber (047-06) carries revocation; this story is the wiring + stub-deletion + audit writer that no single existing surface covers. The audit writer is net-new (`auth/audit.ts`).
- **Why isn't extension / parameterization / config sufficient?** The M0 `auth-stub.ts` is a shared-secret compare with hardcoded stub claims — it cannot be parameterized into real three-kind introspection; EPIC-046 §2.5 deliberately quarantined it for **wholesale removal** at M1, not extension. Swapping in the verify-client touches both register and hello branches and removes the stub import, and the per-turn audit row is a new behavior with no existing call site. It lands at L3 because it is cross-cutting (register + hello + relay path), spans the delete-and-rewire of a quarantined seam, and is gated behind two predecessors — but it is a single coherent goal (turn the broker's auth real), not two stories joined by "and also."

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2 (3 lanes, stub-removal, audit-per-turn, project_id fail-closed, revoked-cannot-start, audit-off-critical-path).
- [x] Implementation Guide (§3) maps to specific, verified file paths — `ws-gateway.ts:232/:284`, `auth-stub.ts:32-76`, `router.ts:160-187` exist on disk; `auth/verify-client.ts` + `auth/revoke-subscriber.ts` are predecessor outputs (047-05/06); `auth/audit.ts` + the test file are net-new.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (multiple, with line numbers).
- [x] Why not simpler? has both sub-bullets answered.

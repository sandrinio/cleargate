---
story_id: STORY-048-03
parent_epic_ref: EPIC-048
parent_cleargate_id: "EPIC-048"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-048 (INITIATIVE-001 direct-approval + §6 decisions acked 2026-06-06) + connector/docs/{event-contract,spike-findings-claude-2.1.161,envelope-protocol,auth-seam}.md + verified codebase grounding (M0 daemon on disk)
actor: Connector daemon (on the user's machine)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: medium
lane: standard
db_write_set: []
dep_predecessors: []
deferred_verification: []
area: connector
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-05T20:14:33Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: connector/daemon/src/dial.ts, cleargate-cli/src/auth/acquire.ts, connector/shared/src/types.ts, connector/broker/src/ws-gateway.ts, connector/docs/auth-seam.md"
  last_gate_check: 2026-06-05T20:14:33Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-048-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-05T20:14:33Z
  sessions: []
---

# STORY-048-03: Connector M2 — real-credential register against the post-047 broker (pairing | member + kind) + fail-closed
**Complexity:** L2 — a focused hardening edit to one already-shipped module (`dial.ts`): swap the stub-string credential for a real `{ credential, kind }` payload sourced from `cleargate-cli/src/auth`, and add fail-closed handling of the broker's `unauthorized` error frame at register — no new subsystem, no process-lifecycle work.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Connector daemon on the user's machine, I want to register against the post-047 broker with a **real** credential that carries a `kind` discriminator (`pairing` | `member`) — the member lane reusing my `cleargate join` access token as-is — and to **fail closed** when the broker rejects me (`unauthorized`), so that only verified connectors ever reach the turn path and a revoked or unreachable identity never silently spawns a turn.

### 1.2 Detailed Requirements
- **`dial.ts` — real credential + `kind` in the register payload:** the M0 `DialOpts.credential: string` is a shared-secret *stub* (the module header still says "Shared-secret stub credential (real credential is EPIC-047)"). Replace it: `DialOpts` gains a `credentialKind: "pairing" | "member"` field, and the `register` envelope's `payload` adds `kind: opts.credentialKind` alongside the existing `credential`. The broker (047-07, `ws-gateway.ts:256`) already reads `payload.kind` and forwards it to the verify-client; the daemon's job is to *send* it. The stub-string-only credential and the "shared-secret stub" header comment are removed (grep-clean of the M0 stub literal).
- **Member lane = `cleargate join` access token verbatim:** when `credentialKind === "member"`, the credential is the access-token JWT returned by `acquireAccessToken({ mcpUrl, profile })` (`cleargate-cli/src/auth/acquire.ts`) — the same bearer the CLI uses against `/mcp`. **No derived/minted token** (EPIC-047 sub-Q2 RESOLVED; broker comment `ws-gateway.ts:273` confirms "member lane passes the cleargate join access token AS-IS"). `acquire.ts` already resolves env → in-memory cache → disk cache → stored refresh-token rotation; the daemon calls it and passes the result through unchanged.
- **Pairing lane = one-time code (standalone fallback):** when `credentialKind === "pairing"`, the credential is a one-time pairing code supplied by the daemon's boot opts (no `cleargate join` membership required). Both lanes are wired this sprint; **lead with member.**
- **Credential acquisition seam:** a thin daemon-side helper resolves the credential per kind — `member` → direct import of `acquireAccessToken` from `cleargate-cli/src/auth/acquire.ts` (EPIC-048 §6 Q1 RESOLVED: direct import, not a re-export shim); `pairing` → pass-through of the supplied code. The helper is the only place that imports from `cleargate-cli/src/auth`, keeping the seam auditable.
- **Fail-closed at register:** the post-047 broker, on an invalid / revoked / unverifiable credential, replies with an `error` frame `payload.code === "unauthorized"` (`ErrorCode.unauthorized` in `connector/shared/src/types.ts`; emitted by `ws-gateway.ts` `sendError(ws, "unauthorized", …)`). M0 `dial()` ignores non-`registered` frames before settling and relies solely on the register timeout. M2 must inspect pre-`registered` frames: an `error` frame whose `payload.code === "unauthorized"` (or `version_mismatch` / `no_capacity`) **rejects the dial immediately** with a descriptive error — it does **not** wait out the timeout, and the caller (`index.ts startDaemon`) propagates the rejection so **no `Backend.spawn` ever runs** (the turn path is unreachable when the dial promise rejects).
- **`index.ts` plumbing:** `DaemonOpts extends DialOpts`, so `credentialKind` flows through; `startDaemon` resolves the credential via the seam before constructing `dialOpts`, and `await dial(...)` rejecting on `unauthorized` aborts boot before any turn handler is wired. No change to the turn/teardown path.

### 1.3 Out of Scope
Reconnect / re-attach + backoff (STORY-048-04). Resume-from-seq (STORY-048-05). Sandboxing / `--allowedTools` policy enforcement (STORY-048-08). The **broker-side** verify + revoke-subscriber (shipped EPIC-047: 047-05 verify-client, 047-06 revoke subscriber, 047-07 wire-lanes). **Minting** credentials and the `/admin-api/v1/connections/verify` endpoint (mcp / EPIC-047). The `app_token` (app-connect) lane — that is the broker's `hello` path, not connector register.

### 1.4 Open Questions
The forks are **RESOLVED at the EPIC-048 §6 level**:
- **§6 Q1 (credential source wiring):** RESOLVED — the daemon imports `acquireAccessToken` **directly** from `cleargate-cli/src/auth/acquire.ts` (in-repo cross-package import under `connector/**`), not via a copied shim or a new re-export package. The Architect's SDR confirms the `cleargate-cli/src/auth` subtree is PM-tool-SDK-clean before the import lands (EPIC-027 boundary — see §1.5).
- **EPIC-047 sub-Q2 (member token shape):** RESOLVED — the member lane sends the `cleargate join` access token **as-is**; no derived/connection-scoped token is minted client-side. Confirmed by the shipped broker comment at `ws-gateway.ts:273`.
- **auth-seam §3 (mcp unreachable at connect):** RESOLVED — **fail closed.** The broker returns `unauthorized` when verify times out; the daemon must surface a register failure (see §1.5), never fail open.

### 1.5 Risks
- **Risk:** Fail-closed coupling — if `mcp` is unreachable the broker returns `unauthorized`; the daemon must detect the timeout/error frame and surface a **register failure**, NEVER hang waiting for `registered`.
- **Mitigation:** `dial()` rejects on the first pre-`registered` `error` frame (code `unauthorized` / `version_mismatch` / `no_capacity`) *and* retains the existing register timeout as the backstop. A red test (`verify-timeout-fail-closed`) drives a broker stub that returns `unauthorized` and asserts the dial promise rejects (no hang, no spawn). Backoff/retry policy is STORY-048-04 — this story rejects cleanly and stops; it does not retry.
- **Risk:** The credential import drags a PM-tool SDK into the `connector/**` tree (EPIC-027 boundary violation).
- **Mitigation:** Architect SDR (static dependency review) of the `cleargate-cli/src/auth/acquire.ts` transitive subtree before wiring; `acquire.ts` imports only `node:fs`/`os`/`path` + `./factory.js` + `./token-store.js` (type-only) — no `@linear/sdk` etc. `npm run check:no-pm-sdk` stays green.
- **Risk:** A stub-string credential survives somewhere in the dial/register path and silently bypasses verify.
- **Mitigation:** Grep-verifiable DoD — the M0 "shared-secret stub" literal is removed; a unit test asserts no plain-string-only credential path remains.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Connector real-credential register with kind discriminator and fail-closed

  Scenario: Member lane registers with the cleargate join access token
    Given a valid member token resolved from cleargate-cli auth
    When the daemon dials and sends register with credential + kind=member
    Then the broker verifies it via mcp and replies registered with a connection_id
    And the daemon stores the assigned connection_id

  Scenario: Pairing lane registers with a one-time code
    Given a valid one-time pairing code
    When the daemon dials and sends register with credential + kind=pairing
    Then the broker verifies and binds the connection to the resolved project_id
    And the daemon receives registered

  Scenario: Revoked or invalid credential fails closed
    Given a revoked or invalid credential
    When the daemon registers
    Then the broker returns an error frame with code=unauthorized
    And the dial promise rejects
    And the daemon never spawns a turn

  Scenario: mcp unreachable so verify times out
    Given mcp is unreachable and the broker's verify times out
    When the daemon registers
    Then the broker returns unauthorized
    And the daemon surfaces a register failure rather than hanging waiting for registered

  Scenario: No shared-secret stub remains in the dial path
    Given the daemon source
    Then no shared-secret stub string remains in the dial/register path
```

### 2.2 Verification Steps (Manual)
- [ ] Boot the daemon with `credentialKind: "member"` against a broker wired to a verify-client stub → `registered` with a `connection_id`; inspect the sent `register` frame and confirm `payload.kind === "member"` and `payload.credential` is the access-token JWT (not the M0 stub).
- [ ] Boot with `credentialKind: "pairing"` + a one-time code → `registered`; confirm `payload.kind === "pairing"`.
- [ ] Point the daemon at a broker that returns `error{code:unauthorized}` → the dial rejects promptly (well under the register timeout) and `startDaemon` throws; `pgrep claude` shows no spawn.
- [ ] `grep -rn` the M0 stub literal across `connector/daemon/src/` → zero hits.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| WS dial-out client (edit) | `connector/daemon/src/dial.ts` |
| Daemon entry (edit — plumb `credentialKind`) | `connector/daemon/src/index.ts` |
| Credential-resolution seam (new) | `connector/daemon/src/credential.ts` |
| Register fail-closed tests (new) | `connector/daemon/test/register-auth.node.test.ts` |
| Red tests (new) | `connector/daemon/test/register-auth.red.node.test.ts` |
| Shared error-code + frame types (read-only) | `connector/shared/src/types.ts` |
| CLI auth credential source (direct import) | `cleargate-cli/src/auth/acquire.ts` |

### 3.2 Technical Logic
`dial.ts` today builds the `register` envelope at the `open` handler (`dial.ts:113`) with `payload: { credential, protocol_version, label, cwd, allowed_tools }`. M2 adds `kind: opts.credentialKind` to that payload object and extends `DialOpts` with `credentialKind: "pairing" | "member"`, deleting the "Shared-secret stub credential" doc and the `string`-only assumption. The broker's `ws-gateway.ts` already does `const kind = (payload?.["kind"] as string | undefined) ?? "pairing"` (`:256`) and `await verifyClient.verify(credential, kind)` (`:274`) — so this is a send-side change only; the broker contract is unchanged (do not edit `ws-gateway.ts`).

The fail-closed edit lives in `dial.ts`'s `message` handler. Today the only settling path is `env.type === "registered"` (`dial.ts:141`); non-`registered` pre-settle frames fan out to (not-yet-registered) handlers and the dial only fails via the 5 s timeout. M2 adds, before the fan-out and while `!settled`: if `env.type === "error"` and `payload.code` is one of `ErrorCode.unauthorized` / `version_mismatch` / `no_capacity` (`connector/shared/src/types.ts:26`), `clearTimeout(timeout)`, set `settled`, `ws.close()`, and `rejectDial(new Error("register rejected: " + code + " — " + detail))`. This converts the broker's `sendError(ws, "unauthorized", …)` reply into an immediate dial rejection instead of a 5 s hang.

`credential.ts` is the single seam that imports from `cleargate-cli/src/auth`: `resolveCredential(kind, opts)` returns the pairing code unchanged for `kind === "pairing"`, or `await acquireAccessToken({ mcpUrl, profile })` (`acquire.ts:147`) for `kind === "member"` — propagating `acquire.ts`'s own resolution order (env `CLEARGATE_MCP_TOKEN` → in-memory cache → disk cache → refresh-token rotation) and its `AcquireError` codes up to the caller. `index.ts startDaemon` (`index.ts:72`) calls `resolveCredential` before assembling `dialOpts` (`index.ts:88`), then `await dial(...)`; because the rejected dial promise throws out of `startDaemon`, the `conn.onFrame` prompt wiring (`index.ts:193`) and `backend.spawn` (`index.ts:110`) are never reached — fail-closed is structural, not a guard flag.

### 3.3 API Contract (if applicable)

| Surface | Shape |
|---|---|
| `register` payload (send) | `{ credential: string, kind: "pairing" \| "member", protocol_version, label, cwd, allowed_tools }` |
| Broker reject frame (recv) | `{ v:1, type:"error", connection_id:"", payload:{ code:"unauthorized", detail?:string } }` → dial rejects |
| `resolveCredential(kind, opts)` | `member` → `acquireAccessToken({mcpUrl,profile})`; `pairing` → supplied one-time code |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | member-register-ok, pairing-register-ok, revoked-unauthorized-fail-closed, verify-timeout-fail-closed, stub-string-grep-clean |
| E2E / acceptance tests | 0 | broker↔mcp verify E2E is EPIC-047 (047-05/06/07); this story stubs the broker reply |

### 4.2 Definition of Done (The Gate)
- [ ] `dial.ts` register payload carries `credential` + `kind` (`pairing` | `member`); the M0 plain-string-only / "shared-secret stub" credential is removed (grep-clean).
- [ ] Member lane uses the `cleargate join` access token directly (no derived token) per EPIC-047 sub-Q2.
- [ ] Broker `unauthorized` error frame at register is handled: the dial rejects and the daemon does not spawn.
- [ ] Credential acquisition reuses `cleargate-cli/src/auth` via direct import (EPIC-048 §6 Q1 resolved); zero PM-tool SDK imports transitively (EPIC-027 — Architect SDR confirms the auth subtree is SDK-clean; `check:no-pm-sdk` green).
- [ ] Unit tests ≥5 (the five named in §4.1) pass under `node:test`.
- [ ] Minimum test expectations (§4.1) met and all §2.1 Gherkin scenarios covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `connector/daemon/src/dial.ts` — the M0 dial-out + register client (35 tests passing). `DialOpts.credential` and the `register` payload assembly (`dial.ts:113`) are extended here; the `message`-handler settle logic (`dial.ts:128`) gains the fail-closed branch.
- **Surface:** `cleargate-cli/src/auth/acquire.ts` (+ `token-store.ts` types, `keychain-store.ts` / `factory.ts` backends) — the credential source for the member lane via `acquireAccessToken`; already implements env/cache/refresh resolution, imported directly by the new `credential.ts` seam.
- **Surface:** `connector/shared/src/types.ts` — `ErrorCode` enum (`unauthorized`, `version_mismatch`, `no_capacity`) + the `register`/`registered`/`error` frame types, consumed read-only.
- **Surface:** `connector/broker/src/ws-gateway.ts` (register + verify flow, EPIC-047/047-07) and `connector/docs/auth-seam.md` (credential kinds + verify endpoint) — contract reference; **not edited**.
- **Coverage:** partial — extends the existing `dial.ts` send/settle paths and reuses `cleargate-cli` auth wholesale; net-new is the `kind` field, the fail-closed `error`-frame branch, and the `credential.ts` per-kind resolver.

## Why not simpler?

- **Smallest existing surface that could carry this:** `dial.ts` already sends `register` and settles on `registered`, so this is a true extension of that module — not a new subsystem. We add one payload field and one settle branch.
- **Why isn't extension / parameterization / config insufficient?** A config flag cannot satisfy the contract: the member credential must be *acquired* at boot from `cleargate-cli` auth (env/cache/refresh resolution), and fail-closed requires *inspecting an inbound frame type* (`error`/`code`) that M0 deliberately ignores before settling. Both are code paths, not values — there is no parameter that flips a stub string into a verified, fail-closed handshake.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Readied 2026-06-06: the credential-source fork (§6 Q1 = direct import), the member-token shape (EPIC-047 sub-Q2 = access token as-is), and the unreachable-mcp behaviour (auth-seam §3 = fail closed) are all resolved at the epic §6 level; the M0 daemon modules (`dial.ts`, `index.ts`) and the post-047 broker (`ws-gateway.ts` reading `payload.kind`) are on disk and verified. Nothing open → 🟢.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2 (member-ok, pairing-ok, revoked-fail-closed, verify-timeout-fail-closed, stub-grep-clean).
- [x] Implementation Guide (§3) maps to specific file paths under `connector/daemon/src/` traceable to real M0 modules + EPIC-048 `<target_files>`.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites source-tree paths (`dial.ts`, `acquire.ts`, `types.ts`, `ws-gateway.ts`).
- [x] Why not simpler? has both sub-bullets answered.
- [x] §1.4 granularity decision recorded — L2 single-module hardening, kept whole (no split); all forks resolved at epic §6, acked 2026-06-06.

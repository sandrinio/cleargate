---
sprint_id: SPRINT-36
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: warn
execution_mode: v1
remote_id: null
source_tool: null
status: Active
start_date: 2026-06-20
end_date: 2026-07-04
synced_at: null
area: connector
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-04T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: pending
cached_gate_result:
  pass: false
  failing_criteria:
    - id: discovery-checked
      detail: expected context_source != "null", got undefined
  last_gate_check: 2026-06-04T14:17:15Z
stamp_error: no ledger rows for work_item_id SPRINT-36
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T15:07:21Z
  sessions: []
---

# SPRINT-36: Connector M1 — Connection Identity & Credentials (Real Auth)

## 0. Stakeholder Brief
*(Second sprint of the Connector program. Local/pre-member — not pushed. Decomposes EPIC-047; spans the `mcp` and `connector` repos.)*

- **Sprint Goal:** Replace the M0 shared-secret stub with real, revocable, attributable identity — `mcp` mints + verifies all credentials, the broker **verifies (never mints)** and reacts to revocation **instantly** (kills in-flight turns) — across the pairing / member / app-token register lanes, so the relay loop is safe to expose beyond a single trusted machine.
- **Business Outcome:** The walking skeleton becomes a *trustable* loop: a revoked pairing/app-token cannot reach a Connector or start a turn, a revoke kills an in-flight turn, and every relayed turn is attributable. This is the gate before any remote exposure (EPIC-050 tunnel / a real chat-app client) can be considered.
- **Risks (top 3):** app-token = an RCE surface (treat as a production credential) · instant-revoke-must-kill-in-flight (connect-check alone is insufficient) · first Redis pub/sub use on the plane + a live `mcp` DB migration.
- **Metrics:** revoked credential → 0 reach (deny at connect) **and** in-flight turn dropped (measured latency); every turn has an audit row; broker holds no signing secret; indexed verify is O(1) in total token count (no whole-table scan); fail-closed when `mcp` is unreachable.

## Sprint Goal
Stand up real connection identity + credentials for the M0 loop: one authority (`mcp`) mints/verifies pairing codes, member tokens, and app tokens via an indexed (O(1)) verify; the broker verifies at connect, caches successful bindings, subscribes to a Redis revoke channel, and kills in-flight turns on revoke — retiring the shared-secret stub across all three register lanes.

## 1. Consolidated Deliverables
*(Decomposed 2026-06-04 from EPIC-047 — **all 7 stories at 🟢 Low** after the 4 §6 decisions were resolved: scope=one sprint, pairing-revoke=operator+owner, native-lane=reuse `cleargate join` token directly, verify-cache=short-TTL positive. Local/pre-member — not pushed. **Spans two code repos**: `mcp/` (identity authority) + `connector/broker/` (verifying edge).)*

| Story ID | Title | Repo | Lane | Wave | Parallel? | Depends on |
|---|---|---|---|---|---|---|
| `STORY-047-01` | Dedicated credential schema (`connections`/`pairings`/`app_tokens`) + **indexed token verify** (kills the whole-table bcrypt scan) | mcp | standard | M1 | n | — |
| `STORY-047-02` | Pairing-code + app-token lifecycle (mint / one-time consume / revoke by **operator + owner**) | mcp | standard | M1 | y | 047-01 |
| `STORY-047-04` | Revocation **publish** on Redis pub/sub (`rev:connection`/`rev:apptoken`/`rev:project`) — first plane pub/sub | mcp | standard | M1 | y | 047-01 |
| `STORY-047-03` | `POST /admin-api/v1/connections/verify` — per-kind, rate-limited, **fail-closed**, always returns `project_id` (+ pool headroom) | mcp | standard | M2 | n | 047-01, 047-02 |
| `STORY-047-05` | Broker **verify-client** + fail-closed + short-TTL verify cache + `project_id` stamping | connector/broker | standard | M3 | n | 047-03 |
| `STORY-047-06` | Broker **revoke-subscriber** (`PSUBSCRIBE rev:*`) + **kill-in-flight** + whole-tenant kill | connector/broker | standard | M3 | n | 047-04, 047-05 |
| `STORY-047-07` | Wire the **3 register lanes**, **retire the M0 `auth-stub.ts`**, **audit rows** per turn | connector/broker | standard | M4 | n | 047-05, 047-06 |

**Deliberately OUT** (per EPIC-047 §2 / deferred): admin UI for minting/revoking (later epic — this sprint exposes the API it calls) · scoped app-token authorization (tool/dir limits) · operator-blind E2E encryption · the WS gateway/registry/relay (shipped M0) · connector reconnect jitter (EPIC-048 hardening) · a durable `mcp`-side audit table + audit-batch-to-`mcp` (M1 audit is broker-side metadata, off the critical path).

## 2. Execution Strategy *(PROVISIONAL — the Architect SDR finalizes `waves.json` at `sprint init`)*

### 2.1 Phase Plan
Two dependency chains fan out from the `mcp` foundation and the broker chain is gated on the `mcp` verify endpoint. Edges: `047-01 → {047-02, 047-04}`; `{047-01,047-02} → 047-03`; `047-03 → 047-05`; `{047-04,047-05} → 047-06`; `{047-05,047-06} → 047-07`.

| Wave | Stories | Parallel? | Compatibility basis |
|------|---------|-----------|---------------------|
| wave1 | `047-01` | No | mcp foundation (schema + indexed verify); every other story depends on it. |
| wave2 | `047-02`, `047-04` | **Yes** | Both mcp, depend only on 047-01; disjoint files (`admin-api/connections.ts` vs `auth/revocation.ts`); disjoint write sets (Postgres tables vs Redis pub/sub). |
| wave3 | `047-03` | No | mcp verify endpoint; edits `connections.ts` (047-02) + uses the 047-01 primitive. |
| wave4 | `047-05` | No | Broker verify-client; depends on the live mcp verify endpoint (047-03). |
| wave5 | `047-06` | No | Broker revoke-subscriber; depends on the publish (047-04) + the cache invalidation hook (047-05). |
| wave6 | `047-07` | No | Broker wire/retire/audit; depends on verify-client (047-05) + subscriber (047-06). |

Only wave2 parallelizes; the rest is a serial dependency spine (mcp chain → broker chain). The adversarial parallel-wave model used in SPRINT-35 still applies per-story (the verify/post-flight rigor), with worktrees cut in the relevant repo.

### 2.2 Shared-File Surface
- `mcp/src/admin-api/connections.ts` — 047-02 creates, 047-03 edits (adds `/verify`). Serial via wave2→wave3.
- `connector/broker/src/ws-gateway.ts` — 047-07 edits the merged M0 gateway to call the verify-client across 3 lanes. No co-wave collision.
- `connector/broker/src/registry.ts` — 047-05 (project_id stamp) and 047-06 (kill-in-flight hook) both touch it; serial via wave4→wave5.

### 2.3 ADR / boundary flags
- **EPIC-027 boundary:** all code lands under `mcp/**` or `connector/**`; no PM-tool SDK; nothing enters the shipped `cleargate-cli/src`/`.claude/` planning payload. ✅
- **mcp = single identity authority:** the broker holds no signing secret / no DB creds — only its own scoped service token + a Redis subscriber. ✅
- **Auth-stub retirement:** the M0 `auth-stub.ts` (EPIC-046 §2.5 quarantine) is removed wholesale in 047-07 — grep-verifiable. ✅

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| App token = RCE surface | Treat as a production credential: bcrypt cost-12, fail-closed everywhere, indexed verify, adversarial QA on the verify + revoke paths |
| Instant revoke must kill an in-flight turn | Connect-check alone is insufficient → Redis revoke pub/sub (047-04) + a dedicated broker subscriber that kills in-flight turns (047-06); measured drop latency in the test |
| First Redis pub/sub use on the plane | Isolated to a publish in `revocation.ts` (047-04) + one dedicated `PSUBSCRIBE rev:*` connection (047-06); real-Redis tests; note: live store currently writes `revoked:<jti>` keys — match the real key shape, don't assume `rev:` |
| Live `mcp` Postgres migration | Additive tables only (Drizzle migration, existing convention); real Postgres-18 tests; no destructive change |
| Cross-repo coordination (mcp + connector) | mcp chain (incl. the verify endpoint 047-03) lands before the broker chain starts; both repos local-only (unpushed; owner releases) |
| Connect/reconnect storm DoS | Indexed verify O(1) + dedicated anon admission limiter on `/verify` + short-TTL broker cache + Postgres pool headroom |

## Metrics & Metadata
- **Definition of Done:** a revoked credential cannot reach a Connector or start a turn **and** a revoke kills an in-flight turn (measured); every relayed turn writes an audit row (attributable); the broker holds no signing secret; indexed verify is O(1) in token count; connect fails closed when `mcp` is unreachable; the M0 `auth-stub.ts` is removed and all 3 lanes register via real verify; real-infra tests green (docker-compose Postgres 18 + Redis 8); both repos build + typecheck clean; local-only (not exposed).
- **Priority Alignment:** M1 of INITIATIVE-001. Unblocks remote-exposure considerations (EPIC-050 tunnel / a chat-app client) which remain out of scope here.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** `STORY-047-01` first — the indexed-verify primitive + dedicated tables are the foundation every other story builds on. **Do not inherit** the whole-table bcrypt scan (`mcp/src/auth/service-token.ts:65-97`).
- **Cross-repo:** `mcp/` is a SEPARATE git repo at `/Users/ssuladze/Documents/Dev/ClearGate/mcp/` (own `main`/origin `sandrinio/cleargate-mcp`); `connector/` is the separate repo from M0. Planning/state live in the meta-repo `.cleargate/`. Run mcp stories on branches in the mcp repo, connector stories in the connector repo — same branch-per-story + local-only-merge pattern as SPRINT-35 (owner releases; no push).
- **Real infra, NO mocks:** mcp + broker tests run against docker-compose Postgres 18 + Redis 8 (OrbStack available). This is heavier than M0 — confirm the stack is up before dispatching.
- **Close mechanics (cross-repo):** at Gate-4, the close needs `CLEARGATE_SKIP_PARENT_ROLLUP=1` (unapproved connector EPICs) + `CLEARGATE_SKIP_BUNDLE_CHECK=1` (sparse cross-repo Reporter bundle); export `ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate` so the token ledger buckets correctly. See [[project_sprint35_connector_execution]].
- **Highest-stakes surface in the program.** Auth correctness (fail-closed, indexed verify, instant-revoke-kills-in-flight) deserves the adversarial multi-lens verify treatment; do not fast-lane any of these stories.

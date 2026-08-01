---
epic_id: EPIC-046
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🔴 High
context_source: INITIATIVE-001 triage + connector/PRD.md v0.3.1 + connector/docs/{envelope-protocol,auth-seam}.md + verified codebase grounding + recorded direct approval
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
      detail: "OR-group failed — all alternatives failed: parent-approved-proposal / parent-approved-initiative: context_source is prose, not a path, and no proposal_gate_waiver is recorded. Either point context_source at the parent document as a relative path (e.g. \"INITIATIVE-002_Name.md\" — resolved against this file, then the delivery tree), or record the waiver as proposal_gate_waiver with approved_by + approved_at, or set top-level approved_by + approved_at"
  last_gate_check: 2026-08-01T07:59:32Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-046
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T07:43:35Z
  sessions: []
---

# EPIC-046: Broker Rendezvous Data Plane

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Stand up the public broker: a stateful WS service that holds Connector connections, keeps a live project-scoped registry, and routes/relays opaque envelope frames between apps and Connectors with cancel — running and understanding nothing itself.</objective>
  <architecture_rules>
    <rule>Separate plane service in `connector/broker/` (sub-folder of the one `/connector` repo), NOT embedded in mcp — mcp is deliberately stateless (requestTimeout 30s); embedding WS fights its design.</rule>
    <rule>Payload is OPAQUE — separable framing [u32 header_len][header][payload]; route on the header ONLY; forward payload bytes untouched; ZERO JSON.parse/re-encode of payload (keystone for 30k-fps GC + CPU budget).</rule>
    <rule>Bounded per-connection send buffers + drain-aware relay; slow consumer past the cap → stall/disconnect + resume-from-seq. Memory under backpressure is THE failure mode, not CPU.</rule>
    <rule>Disable permessage-deflate; batch writes per tick (cork/uncork); single heartbeat sweep timer, not per-socket timers.</rule>
    <rule>Address connections by stable connection_id behind a Registry interface; stamp instance_id; route() has a local|remote(instance_id) call site (remote stubbed at N=1) — multi-instance is a stub-fill, not a rewrite.</rule>
    <rule>Single active instance for v1; deploy blue-green with connection draining + client resume — never a correlated 100-user reconnect storm.</rule>
    <rule>Transit-only: persist no prompt/output payloads — audit metadata only, off the critical path.</rule>
    <rule>Credential verification is delegated to EPIC-047 (broker calls verify; fails closed). Re-assert bound project_id on every routed frame (O(1)) — a bad verify response must not cross tenants.</rule>
  </architecture_rules>
  <target_files>
    <file path="connector/broker/src/server.ts" action="create" />
    <file path="connector/broker/src/ws-gateway.ts" action="create" />
    <file path="connector/broker/src/registry.ts" action="create" />
    <file path="connector/broker/src/router.ts" action="create" />
    <file path="connector/broker/src/framing.ts" action="create" />
    <file path="connector/broker/src/backpressure.ts" action="create" />
    <file path="connector/broker/src/resume.ts" action="create" />
    <file path="connector/broker/src/fairness.ts" action="create" />
    <file path="connector/broker/src/bus.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
A user's local Claude Code sits behind NAT with no inbound port — no app can reach it. The broker is the one public, reachable component that both sides dial, so a turn can be relayed without the user setting up tunnels. Nothing else in the product works until this exists.

**Success Metrics (North Star):**
- The M0 relay loop passes: one app → one prompt → live streamed reply → cancel, with **zero orphaned processes**.
- Concurrent turns and multiple apps on one Connector never cross streams (verified by `turn_id`/`app_id` tagging).
- **Carries the v1 target workload on a single instance: 100 concurrent users · ~2 channels/user (~200 concurrent live streams) · up to 2 concurrent turns/connector · ~300 WS sockets · sustained 10,000–30,000 frames/sec aggregate, at p99 relay latency < 100 ms and flat RSS.** (Sizing: ~2 µs/frame ⇒ target is ~30–40 % of one core; relay cliff ≈ ~100k fps / ~600 streams ⇒ 3–4× headroom. The constraint is backpressure + framing discipline, **not** CPU.)
- A routine deploy causes **no correlated 100-user outage**: blue-green drain + client resume turn a restart into a per-user hiccup, not a dropped turn.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

*Core relay*
- [ ] WS gateway on both edges (Connector dial-out; app dial-in).
- [ ] In-memory, project-scoped registry + presence (online/offline), keyed by `connection_id`, **behind a `Registry` interface** (`register`/`lookup`/`drop` → `{instance_id, socket?}`) so the in-memory `Map` can be swapped for a Redis-backed impl without touching the hot path.
- [ ] Envelope routing by `connection_id` + `turn_id` + `app_id`; opaque, ordered relay of `event` frames via a `route(envelope) → local | remote(instance_id)` call site (v1 always `local`; the `remote` branch is a stub).
- [ ] `cancel` pass-through; `turn_end`/EOF in-flight tracking (a turn closes on `turn_end`, never on a `result`).
- [ ] Heartbeat as a **single sweep timer** over a `lastSeen` table (NOT one timer per socket) → presence; offline → immediate clean `error`, never hang.
- [ ] Audit metadata per turn (who/which app/connection/turn_id/result/bytes/timestamps) — **off the relay's critical path**, buffered + **batch-flushed to an `mcp` ingest endpoint** via the broker's service token (broker holds no DB creds; §6).

*Frame-handling discipline (the load-bearing build — see §3a)*
- [ ] **Separable opaque framing** `[u32 header_len][header][opaque payload]`: parse the header **only**; forward payload bytes untouched (`subarray` views, no copy). **Zero `JSON.parse` / re-encode of payload, ever** (lint/test-enforced). This is the keystone that keeps per-frame cost ~2 µs and kills GC pressure at 30k fps.
- [ ] **Bounded per-connection send buffers + drain-aware relay**: watch `bufferedAmount`; over the cap (~1 MB) → mark stream stalled, stop forwarding, signal producer / disconnect with a resumable close code. (The only thing between us and OOM.)
- [ ] **Large-frame chunking** (>~128 KB) so a multi-MB `tool_result` can't head-of-line-block the loop or atomically blow the buffer cap.
- [ ] **Disable `permessage-deflate`** (`perMessageDeflate: false`) — per-frame compression at 30k fps would be the #1 CPU cost.
- [ ] **Per-tick write batching** (`cork`/`uncork`): coalesce same-socket frames within an event-loop tick → one `write` syscall per socket per tick.
- [ ] **Resume-from-session**: per-`(connection_id, app_id)` monotonic `seq` (already in the envelope) + bounded replay window (~256 frames / 1 MB) + `resume(last_seq)` handshake. Makes a drop a hiccup, not a lost turn — and is required by the slow-consumer disconnect path above.

*Fairness, security, ops*
- [ ] **Concurrent-turn caps** (global ceiling + per-project ceiling) firing the existing `error:no_capacity` enum — the **only** project-level admission control in the system (`mcp` rate-limiting keys on member/IP, never project).
- [ ] **Project re-assertion on route** (security): store `project_id` in the registry entry at bind; assert every routed frame's bound `(app_id → connection_id → project_id)` was bind-authorized before forwarding (O(1)). Closes the cross-tenant leak; fail closed on a verify response missing `project_id`.
- [ ] **Blue-green deploy with connection draining**: at any instant one instance owns all connections; on deploy, stop new connects to old, drain in-flight turns, new connects → new. No cross-instance frame routing. Combined with resume, a deploy is a drain, not a 100-user storm.
- [ ] **Observability counters**: event-loop lag (`monitorEventLoopDelay`), per-stream `bufferedAmount` high-water, frames/sec, stalled/dropped counts, GC pause histogram. Alert on loop lag > 10 ms or any stream pinned at the buffer cap.
- [ ] **Load-test gate**: synthetic 200 streams × 150 fps + injected slow consumer + injected 5 MB `tool_result`, sustained 30 min → p99 < 100 ms, flat RSS, loop lag < 10 ms.
- [ ] **Broker-edge abuse controls** (the public-surface threat the connector-local sandboxing can't cover): hard **envelope-size cap** (reject oversized frames pre-route), **registry-exhaustion guard** (max connections per project + global; reject past ceiling, don't OOM), **WS-handshake/slowloris timeout** (drop half-open upgrades), and a **per-IP connect rate-limit** at the edge (reuse the `mcp` fixed-window Redis-counter pattern, broker-scoped key). Distinct from the per-turn fairness caps above — this is connection/frame admission, not turn admission.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Credential minting/verification logic (→ EPIC-047; broker only *calls* verify). The **indexed-token-verify fix** that defuses the reconnect storm lives in EPIC-047.
- Connector internals / `claude` spawning (→ EPIC-048). Connector-side **reconnect jitter** (spreads the deploy storm) lives in EPIC-048.
- Admin Connections UI (later epic).
- **Wiring** multi-instance: the cross-instance `route()` remote branch, Redis-backed registry impl, and inter-instance frame forwarding (deferred — but the **seams** above are built now: registry interface, `instance_id` on every connection/audit row, `route()` call site, and the pub/sub bus). Pull forward only past the §3 threshold.
- Any persistence of prompt/output payloads (transit-only).
- Event-contract parsing or reshaping (payload stays opaque).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Statefulness | Stateful long-lived WS — must NOT live in mcp's stateless request/response core |
| Data | Transit-only: no payload persistence; audit metadata only |
| Scale (v1) | **Single active instance** sized for 100 users / ~200 streams / 10–30k fps (~30–40 % of one core; 3–4× headroom). Multi-instance deferred behind designed-in seams |
| Deploy | **Blue-green + drain + client resume** — never a correlated 100-user reconnect storm |
| Security | Fail **closed** on auth (deny if verify fails/unreachable); wss/TLS terminates at the **reverse proxy** (broker speaks plaintext WS behind it); project re-asserted on every routed frame |
| Schema | The envelope is the ONLY schema the broker enforces (`connector/docs/envelope-protocol.md`); payload bytes are never parsed or re-encoded |

### 3a. Why this carries the load (sizing rationale)

Per frame: read header (~30 B, fixed-offset, not `JSON.parse`) + map lookup + forward payload bytes ≈ **~2 µs** ⇒ 30k fps ≈ **25–40 % of one core**. The single-core relay cliff is ~**100k fps / ~600 streams**, so the v1 target sits at **3–4× headroom**. The box does **not** fall over on CPU — it falls over on (1) **memory under backpressure** (unbounded send buffer → OOM; fixed by bounded buffers + resume), (2) **GC from re-serialization** (re-parsing payload 30k×/s knees p99 *below* target; fixed by separable framing + zero payload parse), (3) **head-of-line blocking** from large frames (fixed by chunking). Get framing + backpressure right and the workload is overprovisioned; get either wrong and it fails *below* target for reasons unrelated to horsepower. **Multi-instance is the wrong lever** — it addresses throughput (not the constraint) and only partially mitigates the deploy storm while importing split-brain + hot-path Redis; blue-green drain + resume fixes the deploy case more cheaply and completely.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations the epic could extend. Cite file:line.

- **Surface:** `mcp/src/server.ts`, `mcp/src/mcp/transport.ts:62-73` — Fastify in **stateless** mode (`StreamableHTTPServerTransport`, `sessionIdGenerator: undefined`); `server.ts:61` `requestTimeout: 30_000` hardened against long connections.
- **Surface:** `mcp/src/db/schema.ts:57-65` — `clients` table is **audit-only** (`firstSeenAt`/`lastSeenAt`), never queried for routing.
- **Surface:** `mcp/src/redis/client.ts` — ioredis client; used for revocation/rate-limit/idempotency cache only, **no pub/sub**.
- **Coverage of this epic's scope:** **none — net-new.** No persistent-connection, presence, or directed-routing seam exists anywhere on the plane.

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this epic:** none — net-new service required.
- **Why isn't extension / parameterization / config sufficient?** The MCP server is deliberately stateless and horizontally scalable with no session affinity (the 30s `requestTimeout` is an explicit design statement). A broker is the opposite: long-lived, sticky, in-memory connection state. Bolting WS onto mcp would fight that design, drag a code-relay's runtime profile into the planning plane's auth/data service, and break mcp's stateless scaling. A separate plane sibling is the right size.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `connector/broker/src/{server,ws-gateway,registry,router}.ts` — new service. Create. Add `framing.ts` (separable header/payload codec), `backpressure.ts` (bounded buffers + drain), `resume.ts` (seq/replay), `fairness.ts` (turn caps), `bus.ts` (pub/sub abstraction — used for revocation now, cross-instance routing later).
- Reuses the plane's existing **Redis** instance for the pub/sub bus (revocation subscribe in v1; presence write-through + cross-instance later).
- Audit: broker buffers turn-metadata rows and **flushes batches to a small `mcp` ingest endpoint** (`POST /admin-api/v1/audit/batch`, authed by the broker's existing service token) — broker holds **no DB credentials**. Off the per-turn critical path; bounded buffer (drop-oldest + counter on overflow); ~seconds loss-on-crash accepted. (Synchronous-per-turn and broker-owned-DB-credential rejected — §6.)

**Data Changes:**
- In-memory registry behind interface: `Map<connection_id, { socket, project_id, protocol_version, presence, instance_id, boundApps: Set<app_id> }>` + write-through `presence:{connection_id} → instance_id` (TTL, heartbeat-refreshed; ignored on read at N=1).
- Resume state: per-`(connection_id, app_id)` `seq` cursor + bounded replay ring.
- Redis: pub/sub bus channels (revocation now; cross-instance frame forwarding later).

## 5. Acceptance Criteria

```gherkin
Feature: Broker Rendezvous Data Plane
  Scenario: Relay one turn end to end
    Given a Connector is registered and online for project P
    And an app is connected and bound to that connection
    When the app sends a prompt frame with turn_id T
    Then the broker routes it down the Connector's line
    And relays every event frame for T back to that app, in order, until turn_end(T)

  Scenario: Offline fast-fail
    Given no Connector is online for the target connection
    When an app sends a prompt
    Then the broker returns error "offline" immediately and the app does not hang

  Scenario: Cancel tears down cleanly
    Given a turn T is streaming
    When the app sends cancel(T)
    Then the broker delivers cancel down the Connector line
    And stops relaying T after turn_end(T)

  Scenario: Concurrent turns do not cross
    Given two apps each run a turn against one Connector
    When both stream concurrently
    Then each app receives only its own turn_id's events

  Scenario: Slow consumer is bounded, not buffered to OOM
    Given a turn T streaming to an app whose socket is not draining
    When that app's send buffer exceeds the per-connection cap
    Then the broker marks the stream stalled and stops forwarding to it
    And process RSS does not grow unbounded
    And on reconnect the app resumes from its last seq

  Scenario: Payload bytes are never parsed
    Given any event frame
    When the broker routes it
    Then it reads only the header and forwards the payload bytes unchanged
    And it never JSON-parses or re-encodes the payload

  Scenario: Bad verify response cannot cross tenants
    Given an app bound to a connection in project P
    When a frame would route to a connection in project Q
    Then the broker refuses to route it (bound project mismatch)

  Scenario: Deploy drains without a reconnect storm
    Given 100 connectors online on the active instance
    When a blue-green deploy drains the instance
    Then in-flight turns complete or resume on the new instance
    And connectors reconnect spread across the drain window, not all at once

  Scenario: Sustains target load
    Given 200 concurrent streams at ~150 frames/sec each for 30 minutes
    And an injected slow consumer and an injected 5 MB tool_result
    Then p99 relay latency stays under 100 ms
    And event-loop lag stays under 10 ms
    And RSS stays flat
```

## 6. AI Interrogation Loop (Human Input Required)

*Resolved (2026-06-04 design dialogue + capacity panel):*
- ✅ **Repo layout:** one `/connector` repo; broker lives in `connector/broker/` subfolder (with `connector/daemon/`). — *Human: "let them be under 1 folder as subfolder."*
- ✅ **TLS termination:** reverse proxy (Coolify/nginx) in front; broker speaks plaintext WS behind it. — *capacity panel #7; removes TLS cost from the loop.*
- ✅ **Instance count:** single active instance for v1 (3–4× headroom at target), **multi-instance deferred behind designed-in seams**; deploy safety via blue-green drain + resume, not via N instances. — *architecture-skeptic recommendation.*
- ✅ **Revoke channel:** Redis pub/sub. — *Human: "yes."*
- ✅ **Audit write path:** **batched-async to `mcp`** — broker buffers rows and flushes batches to a small `mcp` ingest endpoint via its **existing service token**; broker holds **no DB credentials**. ~seconds of loss-on-crash accepted (audit is forensic metadata, not billing/routing). Synchronous-per-turn and broker-owned-DB-credential both rejected. — *Human, 2026-06-04.*

*Still open:*
- **AI Question:** "Tuning constants to fix at the load-test gate, or pin now? per-connection send-buffer cap (~1 MB), large-frame chunk threshold (~128 KB), replay-ring size (~256 frames / 1 MB), heartbeat sweep interval (~15–30 s)." — **Human Answer:** {Waiting}

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

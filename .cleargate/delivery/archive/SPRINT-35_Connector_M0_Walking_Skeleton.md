---
sprint_id: SPRINT-35
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: warn
execution_mode: v1
remote_id: null
source_tool: null
status: Completed
start_date: 2026-06-05
end_date: 2026-06-19
synced_at: null
area: connector
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-04T09:15:55Z
created_at_version: strategy-phase-pre-init
updated_at_version: 855614c0-dirty
cached_gate_result:
  pass: false
  failing_criteria:
    - id: discovery-checked
      detail: expected context_source != "null", got undefined
  last_gate_check: 2026-06-04T06:48:39Z
stamp_error: no ledger rows for work_item_id SPRINT-35
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T13:17:00Z
  sessions: []
---

# SPRINT-35: Connector M0 — Walking Skeleton (Relay Loop E2E)

## 0. Stakeholder Brief
*(First sprint of the Connector program. Local/pre-member — not pushed.)*

- **Sprint Goal:** Prove the relay loop works end-to-end — one app → one prompt → live streamed reply → cancel, with zero orphaned processes — by building a thin vertical slice across the broker and the connector daemon, with auth stubbed.
- **Business Outcome:** A runnable demo that de-risks the entire INITIATIVE-001 architecture before investing in production hardening. You can watch Claude Code, driven from a test app, stream a reply through the public broker and cancel it.
- **Risks (top 3):** `claude` stream-json drift · process-tree teardown leaving orphans · stub auth leaking into later code.
- **Metrics:** E2E test green; stream arrives in order; **a background task's second `result` is delivered (relay holds open past the first)**; cancel terminates the turn and **reaps detached descendants**; **0 orphaned `claude`/child processes** after cancel/disconnect.

## Sprint Goal
Stand up the minimum broker + connector daemon needed to relay a single live Claude Code turn end-to-end and cancel it cleanly — the walking skeleton that proves the architecture, not a production system.

## 1. Consolidated Deliverables
*(Decomposed 2026-06-04 into six story files under `pending-sync/` — **5 at 🟢, STORY-048-01 at 🟡** pending one human granularity decision (keep-whole+Opus vs split, §1.4 of that story). Critic pass + Architect SDR applied. Everything non-essential to "does the loop work" is deliberately deferred to M1/hardening sprints. Local/pre-member — not pushed.)*

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-046-01` | Scaffold `/connector` workspace: `broker/` + `daemon/` TS packages, node:test runner, build/typecheck, **shared envelope codec + types** (JSON framing for M0) | fast | M1 | n | low |
| `STORY-046-02` | Broker M0: WS gateway (both edges) + in-memory `Map` registry + register (**shared-secret stub**) + lightweight presence | standard | M2 | y | med |
| `STORY-046-03` | Broker M0: prompt routing down + ordered `event` relay up + `cancel` pass-through + `turn_end`/EOF tracking + offline fast-fail | standard | M2 | y | med |
| `STORY-048-01` | Connector M0: WS dial-out + register (shared-secret) + **`Backend` seam** (zero direct claude-CLI refs in the turn path) + spawn-per-turn (verified `claude -p … --output-format stream-json --verbose --include-partial-messages < /dev/null`, realpath-pinned cwd) + **staged process-tree teardown** that **reaps the descendant tree** (a background child sits in its own PGID, so `kill(-pgid)` misses it; macOS/OrbStack now, Linux deferred) | standard | M3 | y | **high** |
| `STORY-048-02` | Connector M0: normalize core records (`text_delta`/`tool_use`/`tool_result`/`turn_result`/`error`, **skip `signature_delta`**) + multi-result EOF lifecycle (**hold open past the first `result` until stdout EOF**; same-session `system/init` = continuation, not a new turn; in-band vs out-of-band error classes) + wire `turn-runner` into the daemon entry. Fixtures re-captured on 2.1.162 | standard | M3 | y | med |
| `STORY-046-04` | E2E walking-skeleton harness (throwaway CLI app) + green-path automated test: app→prompt→ordered stream→cancel, asserts **zero orphans**. **Two hard scenarios:** (a) two-`result` background task — assert the relay does NOT close on the first and a second `turn_result` arrives (**replays** the `02-background` fixture from 048-02); (b) cancel mid-background-task — assert the **detached descendant** is reaped, not just the process group (**driven LIVE** — no-orphans can't be proven by replay; `04-teardown2` is the reference shape) | standard | M4 | n | high |

**Deliberately OUT of this sprint** (deferred to M1 / hardening): real identity & revocation (all of EPIC-047), separable-framing codec / bounded buffers / backpressure / chunking / fairness caps / blue-green / observability / resume (EPIC-046 hardening), `--resume` sessions / metrics / sandboxing config / CI fixtures / reconnect jitter (EPIC-048 hardening), companion packaging & `cleargate connector` (EPIC-050), admin console (EPIC-049).

## 2. Execution Strategy
*(Finalized by the **Architect Sprint Design Review** — `architect-synth` over 6 `architect-reader` digests, EPIC-033 fan-out, 2026-06-04. Five-clause wave-compatibility predicate. Artifact: `.cleargate/sprint-runs/SPRINT-35/plans/waves.json`. N=6 — tiny-sprint floor not applicable.)*

### 2.1 Phase Plan
Four waves in execution order. Dependency edges (A→B = A lands before B) drive the topo sort: `046-01→{046-02,048-01}`; `046-02→046-03`; `048-01→048-02`; `{046-03,048-02}→046-04`.

| Wave | Stories | Parallel? | Compatibility basis |
|------|---------|-----------|---------------------|
| wave1 | `STORY-046-01` | No | Scaffold root, `parallel_eligible=n` (clause 1). All five other stories depend on it transitively. |
| wave2 | `STORY-046-02`, `STORY-048-01` | Yes | Both `parallel_eligible=y`; broker-src vs daemon-src surfaces disjoint (clause 2); no shared `db_write_set` (clause 4); no edge between them (clause 5); both predecessors satisfied by wave1. |
| wave3 | `STORY-046-03`, `STORY-048-02` | Yes | Both `parallel_eligible=y`; broker vs daemon surfaces disjoint (clause 2); no shared `db_write_set` (clause 4); no edge between them (clause 5); predecessors (046-02, 048-01) land in wave2. |
| wave4 | `STORY-046-04` | No | E2E harness, `parallel_eligible=n` (clause 1); depends on both 046-03 and 048-02 (clause 5), which land in wave3. |

**Two parallel chains** run through wave2→wave3: the broker chain (046-02→046-03) and the daemon chain (048-01→048-02). They fan out from 046-01 (wave1) and reconverge at 046-04 (wave4).

> **v1 note:** this sprint is `execution_mode: v1` — it runs the **serial five-dispatch loop** (one story at a time, in wave order). `waves.json` is informational here; it pre-stages the parallel-wave plan for when the program adopts `v2-parallel`.

### 2.2 Merge Ordering (Shared-File Surface Analysis)
No file is touched by two stories in the **same wave** (every co-waved pair has fully disjoint `file_surface ∪ file_creates`). The only multi-story files are **intra-chain serial edges**, already ordered by the dependency graph.

| Shared File | Stories | Order | Rationale |
|---|---|---|---|
| `connector/shared/envelope.ts` (+ `types.ts`) | 046-01 creates · all others import | 046-01 first | Frozen in wave1; consumers import **read-only** → not a merge hazard (not in any consumer's §3.1 write surface). |
| `connector/broker/src/ws-gateway.ts` | 046-02 creates, 046-03 edits | 046-02 → 046-03 | 046-02 creates the gateway; 046-03 amends it to mount router/relay. Serial via dep edge (wave2 before wave3), not a co-wave collision. |
| `connector/daemon/src/index.ts` | 048-01 creates, 048-02 edits | 048-01 → 048-02 | 048-01 creates the daemon entry; 048-02 amends it to wire normalize/turn-runner. Serial via dep edge (wave2 before wave3), not a co-wave collision. |

No cross-chain file overlap: broker and daemon surfaces are wholly partitioned under `connector/broker/**` and `connector/daemon/**`.

### 2.3 Shared-Surface Warnings
- **`ws-gateway.ts` append-vs-insert (046-02 → 046-03):** 046-03 edits a file 046-02 created. Mitigated by the wave2→wave3 barrier; the 046-03 Developer must re-read the merged `ws-gateway.ts`, not the story-time snapshot.
- **`index.ts` append-vs-insert (048-01 → 048-02):** same shape on the daemon chain; 048-02 re-reads the merged `index.ts`.
- **No co-wave collisions:** wave2 (046-02 ∥ 048-01) and wave3 (046-03 ∥ 048-02) each have provably disjoint surfaces — no section-collision or rename hazard between concurrently-running stories.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `STORY-046-01` | fast | Scaffold-only: package.json + tsconfig + envelope/types; bounce=low, L2 |

All others are `standard` (046-02/03 + 048-02: bounce=med, L2; 048-01 + 046-04: bounce=high, L3) — no row required.

**Model dispatch:** `STORY-048-01` is dispatched on **Opus** (human decision 2026-06-04). It is L3/high (WS dial + Backend seam + spawn + tree-teardown); the Granularity Rubric's L3+high signal was resolved by the keep-whole + Opus escape hatch rather than a split — the concerns share `index.ts` + the Backend seam and match EPIC-048's `milestone_sequence` (spawn+teardown together, M-a).

### 2.5 ADR-Conflict Flags
- **EPIC-027 boundary (plane-sibling quarantine) — PASS:** all six stories land exclusively under `connector/**`; no `file_surface`/`file_creates` token touches `cleargate-cli/src/**` or `.claude/**`. The shipped npm planning payload stays clean.
- **Auth-stub quarantine — PASS (carried to M1):** the shared-secret register stub is confined to `connector/broker/src/auth-stub.ts`, a single seam slated for wholesale removal by EPIC-047. No other story imports or extends an auth surface.
- **No locked-decision divergence:** no PM-tool SDK import, no DB write (`db_write_set` empty across all six), no runtime-config schema change.

### 2.6 Wave Assignment (canonical — mirrors `waves.json`)

| Wave | Stories | Parallel? | Rationale |
|------|---------|-----------|-----------|
| wave1 | STORY-046-01 | No | scaffold root; parallel_eligible=n (clause 1), foundation for all stories |
| wave2 | STORY-046-02, STORY-048-01 | Yes | disjoint surfaces (broker-src vs daemon-src), both parallel_eligible=y, no shared db_write_set, no dep edge |
| wave3 | STORY-046-03, STORY-048-02 | Yes | disjoint surfaces (broker vs daemon), both parallel_eligible=y, no shared db_write_set, no dep edge |
| wave4 | STORY-046-04 | No | e2e harness; parallel_eligible=n (clause 1); depends on both wave3 stories (clause 5) |

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| `claude` stream-json shapes drift / undocumented | Forward pin **2.1.162** (baseline re-verified 2026-06-04 — unchanged, additive fields only); STORY-046-01 re-snapshots the M0 records on the box; normalize a minimal record set; full fixtures deferred to hardening |
| Process-tree teardown orphans detached children (GH #19045, Linux) | M0 verifies teardown on macOS/OrbStack; Linux verification deferred to EPIC-048 hardening story |
| Stub auth leaks into permanent code | Single isolated register seam; ADR flag (§2.5); removed wholesale at M1 |
| Greenfield toolchain overhead (new packages) | Wave-1 scaffold story is `fast`-lane and blocks nothing else until done |
| E2E needs `claude` installed + logged in on the dev box | Environmental prerequisite; documented in the E2E harness README; test skips with clear message if absent |

## Metrics & Metadata
- **Expected Impact:** Architecture de-risked — the relay loop is proven runnable before any hardening spend.
- **Definition of Done:** typecheck clean + `node:test` green per package (broker, daemon); the E2E test passes (ordered stream + clean cancel + **0 orphans**); auth is a documented, quarantined stub; runs locally only (not exposed).
- **Priority Alignment:** This is M0 of INITIATIVE-001; M1 (EPIC-047 real auth) and hardening (EPIC-046 load engineering) follow in subsequent sprints.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** `STORY-046-01` first — it scaffolds both packages and freezes the envelope contract; nothing else can start until the shared types exist.
- **Relevant Context:** `connector/PRD.md`, `connector/docs/envelope-protocol.md`, `connector/docs/event-contract.md`, `connector/docs/spike-findings-claude-2.1.161.md`; EPIC-046 §0/§2 and EPIC-048 §0/§2 for the M0-relevant rules. **Reuse the real `claude` captures at `/Users/ssuladze/Documents/Dev/connector/harness/spike/captures/*.ndjson`** (esp. `02-background`, `04-teardown2`, `10-tooluse`, `11-thinking`) as normalizer/E2E fixtures — captured on 2.1.161, a reference starting point. **Re-snapshot the M0 records against the installed 2.1.162** in STORY-046-01 (baseline already confirmed unchanged on this box; `connector/harness/spike/captures-2.1.162/00-baseline.ndjson`).
- **Constraints:** Thin slice only — if a story reaches for backpressure, framing optimization, sessions, metrics, fairness, or real auth, it's out of scope (those are M1/hardening). All code lands under `/connector`, never in the planning payload. The goal is a *proof*, not a product: run it locally, do not expose it.
- **Dogfood note (early phone→Claude):** to drive the M0 loop from your phone, run the broker on your laptop and reach it over **Tailscale** (phone + laptop on the same private mesh) using the shared-secret stub — no public deploy, no daemon listener, no extra code. This is the agreed substitute for a "tunnel Phase-0" (EPIC-050 §6); do **not** expose the broker publicly at M0.

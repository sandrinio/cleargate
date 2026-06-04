---
sprint_id: SPRINT-35
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: warn
execution_mode: v1
remote_id: null
source_tool: null
status: Draft
start_date: 2026-06-05
end_date: 2026-06-19
synced_at: null
area: connector
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-04T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
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
  last_stamp: 2026-06-04T06:48:39Z
  sessions: []
---

# SPRINT-35: Connector M0 — Walking Skeleton (Relay Loop E2E)

## 0. Stakeholder Brief
*(First sprint of the Connector program. Local/pre-member — not pushed.)*

- **Sprint Goal:** Prove the relay loop works end-to-end — one app → one prompt → live streamed reply → cancel, with zero orphaned processes — by building a thin vertical slice across the broker and the connector daemon, with auth stubbed.
- **Business Outcome:** A runnable demo that de-risks the entire INITIATIVE-001 architecture before investing in production hardening. You can watch Claude Code, driven from a test app, stream a reply through the public broker and cancel it.
- **Risks (top 3):** `claude` stream-json drift · process-tree teardown leaving orphans · stub auth leaking into later code.
- **Metrics:** E2E test green; stream arrives in order; cancel terminates the turn; **0 orphaned `claude`/child processes** after cancel/disconnect.

## Sprint Goal
Stand up the minimum broker + connector daemon needed to relay a single live Claude Code turn end-to-end and cancel it cleanly — the walking skeleton that proves the architecture, not a production system.

## 1. Consolidated Deliverables
*(PROPOSED story lineup — to be decomposed into 🟢 story files from EPIC-046 / EPIC-048 after this lineup is approved. IDs are provisional local IDs. Everything non-essential to "does the loop work" is deliberately deferred to M1/hardening sprints.)*

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-046-01` | Scaffold `/connector` workspace: `broker/` + `daemon/` TS packages, node:test runner, build/typecheck, **shared envelope codec + types** (JSON framing for M0) | fast | M1 | n | low |
| `STORY-046-02` | Broker M0: WS gateway (both edges) + in-memory `Map` registry + register (**shared-secret stub**) + lightweight presence | standard | M2 | y | med |
| `STORY-046-03` | Broker M0: prompt routing down + ordered `event` relay up + `cancel` pass-through + `turn_end`/EOF tracking + offline fast-fail | standard | M2 | y | med |
| `STORY-048-01` | Connector M0: WS dial-out + register (shared-secret) + spawn-per-turn (verified `claude -p … --output-format stream-json --verbose --include-partial-messages < /dev/null`, pinned cwd) | standard | M3 | y | med |
| `STORY-048-02` | Connector M0: normalize core records (`text_delta`/`tool_use`/`turn_result`/`error`) + multi-result EOF lifecycle + staged process-tree teardown on cancel | standard | M3 | y | **high** |
| `STORY-046-04` | E2E walking-skeleton harness (throwaway CLI app) + green-path automated test: app→prompt→ordered stream→cancel, asserts **zero orphans** | standard | M4 | n | high |

**Deliberately OUT of this sprint** (deferred to M1 / hardening): real identity & revocation (all of EPIC-047), separable-framing codec / bounded buffers / backpressure / chunking / fairness caps / blue-green / observability / resume (EPIC-046 hardening), `--resume` sessions / metrics / sandboxing config / CI fixtures / reconnect jitter (EPIC-048 hardening), companion packaging & `cleargate connector` (EPIC-050), admin console (EPIC-049).

## 2. Execution Strategy
*(Proposed by orchestrator — **Architect Sprint Design Review still required** to finalize §2.1–2.5 and confirm waves once stories are decomposed.)*

### 2.1 Phase Plan (proposed)
- **Wave 1 (sequential foundation):** `STORY-046-01` — scaffolds both packages and freezes the M0 envelope contract everything else imports.
- **Wave 2 (two parallel chains against the frozen contract):**
  - Broker chain: `STORY-046-02` → `STORY-046-03`
  - Connector chain: `STORY-048-01` → `STORY-048-02`
- **Wave 3 (integration):** `STORY-046-04` — E2E proof, after both chains land.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `connector/shared/envelope.ts` (M0 codec + types) | 046-01 (creates) · 046-02/03 · 048-01/02 · 046-04 (consume) | 046-01 first | Contract is frozen in Wave 1; all consumers import read-only → no concurrent edits |

### 2.3 Shared-Surface Warnings
- Broker and connector live in **separate packages** under `/connector` — the only shared surface is the envelope module, landed first. Cross-chain conflict risk: **low**.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `STORY-046-01` | fast | Mechanical scaffold + type module; no behavioral logic |

### 2.5 ADR-Conflict Flags
- **Charter:** all work lands in `/connector` (plane-sibling), **never** in the npm planning payload (`cleargate-cli/src`, `.claude/`). Confirms EPIC-027 boundary.
- **Stub auth quarantine:** the shared-secret register stub MUST be isolated behind a single seam and removed wholesale by EPIC-047 (M1). Flag any leakage into routing logic.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| `claude` 2.1.161 stream-json shapes drift / undocumented | Pin to 2.1.161; normalize a minimal record set only; snapshot one fixture; full fixtures deferred to hardening |
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
- **Relevant Context:** `connector/PRD.md`, `connector/docs/envelope-protocol.md`, `connector/docs/event-contract.md`, `connector/docs/spike-findings-claude-2.1.161.md`; EPIC-046 §0/§2 and EPIC-048 §0/§2 for the M0-relevant rules.
- **Constraints:** Thin slice only — if a story reaches for backpressure, framing optimization, sessions, metrics, fairness, or real auth, it's out of scope (those are M1/hardening). All code lands under `/connector`, never in the planning payload. The goal is a *proof*, not a product: run it locally, do not expose it.

---
sprint_id: SPRINT-37
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-37"
carry_over: false
lifecycle_init_mode: warn
execution_mode: v1
remote_id: null
source_tool: null
status: Draft
start_date: 2026-07-07
end_date: 2026-07-21
synced_at: null
area: connector
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-05T20:14:31Z
created_at_version: strategy-phase-pre-init
updated_at_version: pending
approved: false
cached_gate_result:
  pass: false
  failing_criteria:
    - id: discovery-checked
      detail: expected context_source != "null", got undefined
  last_gate_check: 2026-06-05T20:14:31Z
stamp_error: no ledger rows for work_item_id SPRINT-37
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-05T20:14:31Z
  sessions: []
---

# SPRINT-37: Connector M2 — Daemon Hardening (Production Posture)

## 0. Stakeholder Brief
*(Third sprint of the Connector program. Local/pre-member — not pushed. Decomposes the remaining EPIC-048 scope; single code repo this time — all 7 stories land under `connector/daemon/**`.)*

- **Sprint Goal:** Turn the M0 walking-skeleton daemon into a **production-posture local Connector**: dial the post-047 broker with a **real, verifiable credential** (pairing or member) instead of the shared-secret stub; survive network drops and broker redeploys via **reconnect + re-attach by stable `connection_id` + full-jitter backoff + resume-from-`seq`** (a drop becomes a hiccup, not a lost turn or a double-run); turn the `claude` 2.1.162 pin into a **runtime drift guard** that degrades-not-crashes; delegate session continuity to `claude`; derive correct metrics from `result.modelUsage`; **enforce** the sandbox; and prove the descendant-tree teardown leaves **zero orphans on Linux/Docker**.
- **Business Outcome:** The M0/M1 loop becomes safe to run unattended and behind a real broker: a revoked credential fails closed at register, an in-flight drop transparently resumes with no double-run and no lost events, a `claude` version bump degrades instead of silently corrupting the contract, and no orphaned `claude` processes survive a cancel/disconnect/crash on the actual deploy target (Linux/Docker). This is the gate before any remote-exposure work (EPIC-050 tunnel / onboarding) can start.
- **Risks (top 3):** Linux/Docker teardown is **unverified** (GH#19045) — the daemon's North-Star "zero orphans" metric is platform-dependent · the resume-from-seq + `turn_id` idempotency state machine is the easiest thing in M2 to get subtly wrong (off-by-one `seq`, lost EOF, double-run) · fail-closed register coupling — a daemon that hangs or busy-reconnects when `mcp` is unreachable either stalls or amplifies the reconnect storm.
- **Metrics:** real credential verified at register (stub string grep-clean) · revoked/invalid → fail closed (no turn spawned) · a mid-turn drop resumes from last-`seq` with no double-run and no lost events · version drift → `degraded` not crash · metrics match the CLI's own figures · **zero orphaned processes on Linux/Docker** after cancel/disconnect/crash.

## Sprint Goal
Harden the M0 daemon to production posture across seven axes — real-credential register (fail-closed), reconnect + re-attach + full-jitter backoff + heartbeat, resume-from-`seq` + `turn_id` idempotency, runtime version-drift guard + CI fixtures, sessions-via-`--resume` + metrics derivation, sandbox enforcement, and a **gating** Linux/Docker no-orphan teardown verification — extending the on-disk `connector/daemon/**` modules (M0 turn-path shipped in SPRINT-35), retiring the shared-secret stub, with all code under `connector/**` (EPIC-027 plane-sibling boundary) and local-only (not pushed).

## 1. Consolidated Deliverables
*(Decomposed 2026-06-06 from EPIC-048 — the M0 turn-path (STORY-048-01/02) **already shipped in SPRINT-35**, so M2 is the hardening + real-auth layer: 7 new stories 048-03…048-09. The 4 EPIC-048 §6 questions are resolved (recommended defaults acked by Sandro 2026-06-06). Local/pre-member — not pushed. **Single code repo:** `connector/daemon/` — except 048-03, which imports the credential plumbing from `cleargate-cli/src/auth` (see §2.3 boundary note).)*

| Story ID | Title | Repo | Lane | Wave | Parallel? | Depends on |
|---|---|---|---|---|---|---|
| `STORY-048-09` | **Linux/Docker process-tree teardown verification (GATING)** — close the macOS-only no-orphan gap | connector/daemon | standard | M1 | y | — |
| `STORY-048-03` | **Real-credential register** (pairing \| member + `kind`) + fail-closed; retire the shared-secret stub | connector/daemon | standard | M1 | y | — |
| `STORY-048-06` | **Runtime version-drift guard** (2.1.162 → degrade-not-crash) + CI fixtures | connector/daemon | standard | M1 | y | — |
| `STORY-048-07` | **Sessions** via `--resume` + **metrics** from `result.modelUsage` | connector/daemon | standard | M1 | y | — |
| `STORY-048-08` | **Sandboxing** — allowlist enforcement + tool-IO cap/redaction + concurrency cap | connector/daemon | standard | M1 | y | — |
| `STORY-048-04` | **Reconnect** + re-attach by `connection_id` + full-jitter backoff + heartbeat ping/pong | connector/daemon | standard | M2 | n | 048-03 |
| `STORY-048-05` | **Resume-from-`seq`** + `turn_id` idempotency (drop = hiccup, not lost turn / double-run) | connector/daemon | standard | M3 | n | 048-04 |

**Deliberately OUT** (per EPIC-048 §2 / deferred): Windows teardown (`taskkill /T /F`) · persistent stdin-stream spawn mode + mid-turn steering / permission prompts (v0.2) · multi-backend (Gemini/Codex) adapters (the `Backend` seam exists; adapters are a later drop-in) · the `cleargate connector` onboarding command + companion packaging + daemon package-promotion (→ EPIC-050) · a shared `@cleargate/auth` lib refactor (import directly this sprint; the lib is a later clean-up CR) · operator-blind E2E encryption · `text`/`full` verbosity knob (keep `tools` default unless it falls out of 048-08) · the broker/registry/relay (shipped M0) and credential minting/verify (shipped M1).

## 2. Execution Strategy *(PROVISIONAL — the Architect SDR finalizes `waves.json` at `sprint init`)*

### 2.1 Phase Plan
One **resilience dependency spine** plus four largely-independent hardening stories. Edges: `048-03 → 048-04 → 048-05`. `048-06`, `048-07`, `048-08`, `048-09` depend on no other M2 story. **048-09 is a gating verification story — run it FIRST** (a teardown escape would invalidate every downstream story that relies on `teardown.ts`).

| Wave | Stories | Parallel? | Compatibility basis |
|------|---------|-----------|---------------------|
| wave1 (gate) | `048-09` | — | Gating: verifies/fixes `teardown.ts` on Linux/Docker before anything relies on it. Isolated to `teardown.ts` + its tests. |
| wave2 | `048-03`, `048-06`, `048-07` | **partial** | `048-03`→`dial.ts`; `048-06`→`normalize.ts`+`index.ts`; `048-07`→`spawn.ts`+`backend.ts`+`normalize.ts`+`sessions.ts`. **`048-06` and `048-07` collide on `normalize.ts`** → SDR serializes those two; `048-03` (dial only) runs alongside. |
| wave3 | `048-08` | No | `048-08`→`spawn.ts`+`dial.ts`+`normalize.ts`+`index.ts` — touches four files several earlier stories also touch; land it after them to absorb their merges. |
| wave4 | `048-04` | No | Reconnect supervisor; depends on real register (`048-03`); reworks the `index.ts` close-handler. |
| wave5 | `048-05` | No | Resume-from-seq; depends on the reconnect (`048-04`); makes the `turn-runner.ts`/`index.ts` seq cursor durable. |

> **Heavy shared-file contention** (see §2.2) means M2 parallelizes far less than M1 did — `index.ts` and `normalize.ts` are each touched by 3–4 stories. Treat the waves above as a starting point; the Architect SDR owns the final serialization. The adversarial multi-lens verify + post-flight rigor from SPRINT-35/36 applies per-story.

### 2.2 Shared-File Surface
- `connector/daemon/src/index.ts` — touched by `048-04` (close-handler rework), `048-05` (durable seq cursor), `048-06` (startup version check), `048-08` (concurrency cap). **Highest-contention file** — serialize.
- `connector/daemon/src/normalize.ts` — touched by `048-06` (named drift channel), `048-07` (metrics extraction), `048-08` (tool-IO cap + redaction). Serialize the three.
- `connector/daemon/src/spawn.ts` — touched by `048-07` (`--resume` wiring), `048-08` (allowlist enforcement + cwd-jail parent-traversal hardening). Serialize.
- `connector/daemon/src/dial.ts` — touched by `048-03` (credential + `kind`), `048-04` (reconnect supervisor), `048-08` (allowed_tools → enforcement input). `048-03` lands first (the chain head).
- `connector/daemon/src/teardown.ts` — `048-09` only (isolated). Safe to run first as the gate.

### 2.3 ADR / boundary flags
- **EPIC-027 plane-sibling boundary:** all code lands under `connector/**`; no PM-tool SDK; nothing enters the shipped `cleargate-cli/src`/`.claude/` planning payload. ✅ **Caveat (048-03):** the daemon imports `cleargate-cli/src/auth/*` directly (EPIC-048 §6-Q1 = import, not a shared lib). The Architect SDR **must confirm that auth subtree is PM-SDK-clean** (it must not transitively pull `@linear/sdk` et al.) and that the cross-package import resolves under `connector/`'s build — **else factor the minimal auth surface into a shared lib for this sprint.** This is the one real architectural fork left.
- **`Backend` seam stays honest:** all `claude` invocation remains behind the `Backend` interface (grep-verifiable); no direct CLI ref leaks into the new turn-path code. ✅
- **Stub retirement:** the M0 shared-secret credential string is removed from the dial/register path in `048-03` — grep-verifiable. ✅
- **Zero-orphan North Star:** `048-09` is gating because the daemon's core safety property (no orphaned `claude`) is currently proven only on macOS/OrbStack. ✅

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Linux/Docker teardown unverified (GH#19045) — detached children in their own PGID may escape | `STORY-048-09` is a **gating** story run first: run the no-orphan suite on Linux/Docker (OrbStack + Docker local), fix any escape, harden the Linux `ps`-output parse, add Linux integration tests before downstream stories rely on `teardown.ts` |
| Resume-from-seq + `turn_id` idempotency is easy to get subtly wrong (off-by-one `seq`, stale state, lost EOF → double-run or silent truncation) | `STORY-048-05` ships exhaustive state-machine tests (resume-mid-turn, dedupe-no-double-run, multi-result-survives-drop) + a reconnect-mid-stream integration test; seq made durable per `connection_id`+`turn_id`; dedupe keyed on last-completed `turn_id` |
| Fail-closed register coupling — `mcp` unreachable → broker `unauthorized`; a daemon that hangs or busy-reconnects stalls or amplifies the storm | `048-03` handles the `unauthorized` frame explicitly (surface a register failure, never hang); `048-04` applies full-jitter backoff (cap 0–60s) and distinguishes revoke-close (no reconnect) from a network drop |
| Payload opaque round-trip fidelity — re-parsing a relay payload corrupts large ints (>MAX_SAFE_INTEGER) | `048-05` guards the resume path against any payload re-parse (byte-identical replay); a large-int-fidelity test asserts the opaque round-trip (broker has a re-encode sentinel too) |
| CLI version drift = silent contract break (unmapped record types dropped) | `048-06` turns the pin into a runtime guard (degrade-not-crash + named drift channel with the FULL record) + CI fixtures seeded from the existing `captures-2.1.162` ndjson, re-verify-on-upgrade in release notes |
| Heavy shared-file contention (`index.ts`, `normalize.ts`, `spawn.ts` each touched by 3–4 stories) | Architect SDR serializes co-file stories (§2.2); M2 parallelizes less than M1 — accept a more serial spine over merge-conflict risk |
| EPIC-027 boundary on the auth import (048-03) | Architect SDR confirms `cleargate-cli/src/auth` is PM-SDK-clean + resolvable from `connector/`; else factor a minimal shared auth surface this sprint |

## Metrics & Metadata
- **Definition of Done:** typecheck clean + `node:test` green for `connector/daemon` (and `connector/e2e` where touched); daemon registers against the post-047 broker with a **real** credential (pairing or member + `kind`), shared-secret stub grep-clean; revoked/invalid fails closed at register (no turn spawned) and a revoke-close does **not** trigger reconnect; reconnect re-attaches by stable `connection_id` with full-jitter backoff + ping/pong; resume-from-`seq` across a mid-turn drop streams from last-`seq` with **no double-run and no lost events** (multi-result EOF lifecycle preserved); version drift reports `degraded` (not crash) + CI fixtures snapshot the record shapes; sessions delegated to `claude` (`--resume`; delete never unlinks the transcript); metrics from `result.modelUsage` (not summed `result.usage`); sandbox **enforced** (allowlist, tool-IO cap + redaction in the daemon, concurrency cap, hardened cwd-jail); **zero orphaned `claude`/child processes on Linux/Docker** after cancel/disconnect/crash; all code under `connector/**` (no PM-SDK, nothing in the npm planning payload); local-only (not pushed).
- **Priority Alignment:** M2 of INITIATIVE-001 / EPIC-048. Unblocks the remote-exposure + onboarding work (EPIC-050) which remains out of scope here.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** `STORY-048-09` first (gating — verify/fix teardown on Linux/Docker), then `STORY-048-03` (real credential, the head of the resilience chain). The 048-03→04→05 spine is strictly serial.
- **Single repo (mostly):** all 7 stories land in the `connector/` repo at `/Users/ssuladze/Documents/Dev/ClearGate/connector/` (own `main`/origin `sandrinio/cleargate-connector`). Branch-per-story + **local-only merge** (owner releases; no push), same pattern as SPRINT-35/36. **Exception:** `048-03` imports `cleargate-cli/src/auth` — resolve the cross-package import per §2.3 before dispatch.
- **Extend, don't rebuild:** the M0 turn-path (`dial.ts`/`index.ts`/`spawn.ts`/`backend.ts`/`teardown.ts`/`turn-runner.ts`/`normalize.ts`) is **real, on disk, 35 tests passing** (shipped SPRINT-35). Every M2 story extends a specific existing module — duplication/rebuild is a kick-back criterion.
- **Real infra:** the daemon is process + WS (no Postgres/Redis needed for most stories); `048-09` needs OrbStack/Docker (available locally) for the Linux teardown proof; the `Backend` seam allows replay-fixture tests without a live `claude`.
- **Version pin:** `claude` 2.1.162 (baseline re-verified 2026-06-04). `048-06` turns this into a runtime assertion + CI fixtures; seed from `connector/harness/spike/captures-2.1.162/*.ndjson`, do not re-capture.
- **Close mechanics (cross-repo):** at Gate-4 the close needs `CLEARGATE_SKIP_PARENT_ROLLUP=1` + `CLEARGATE_SKIP_BUNDLE_CHECK=1` + `ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate`. See [[project_sprint35_connector_execution]].
- **Highest-stakes surface:** process hygiene (zero orphans) + the resume/idempotency state machine are the load-bearing correctness properties — do not fast-lane `048-04`, `048-05`, or `048-09`; give them the adversarial multi-lens verify treatment.

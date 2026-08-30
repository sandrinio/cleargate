---
story_id: STORY-046-04
parent_epic_ref: EPIC-046
parent_cleargate_id: "EPIC-046"
sprint_cleargate_id: null
carry_over: false
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-046 + EPIC-048 (INITIATIVE-001 direct-approval) + connector/docs/{envelope-protocol,event-contract,spike-findings-claude-2.1.161}.md + connector/harness/spike captures
actor: Sandro (dogfooding operator)
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: high
lane: standard
db_write_set: []
dep_predecessors:
  - STORY-046-03
  - STORY-048-02
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
      detail: "cited paths do not exist on disk: connector/harness/spike/captures-2.1.162/02-background.ndjso, connector/docs/envelope-protocol.md"
  last_gate_check: 2026-06-04T08:36:26Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-046-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T08:36:25Z
  sessions: []
---

# STORY-046-04: E2E walking-skeleton harness + green-path relay test
**Complexity:** L3 — integration story standing up broker + daemon + a throwaway app and asserting the full loop, including the two hardest captured scenarios.

## 1. The Spec (The Contract)

### 1.1 User Story
As the operator dogfooding the Connector, I want a runnable end-to-end harness and an automated green-path test — app → prompt → ordered streamed reply → cancel, with zero orphaned processes — so that the entire INITIATIVE-001 architecture is proven before any hardening spend.

### 1.2 Detailed Requirements
- **`test-app.ts` — throwaway CLI app:** connects to the broker (`hello`), sends a `prompt`, renders the ordered event stream, and can send `cancel`.
- **`harness.ts`:** boots the broker (STORY-046-02/03) + the connector daemon (STORY-048-01/02) + the test app locally; wires the shared-secret stub on both edges; tears everything down at the end.
- **`relay-e2e.node.test.ts` — green path:** app → `prompt` → ordered streamed reply → `turn_end`; asserts events arrive in `seq` order **and** that **zero orphaned `claude`/child processes** survive after normal completion **and** after `cancel`.
- **Two hard scenarios** (the two the prior effort proved hardest):
  - **(a) two-result background task** — a prompt that emits **two `result`s**; assert the relay does **not** close on the first and a second `turn_result` arrives before `turn_end`. **Deterministic:** replays the `connector/harness/spike/captures-2.1.162/02-background.ndjson` fixture produced by STORY-048-02 (prior-effort `02-background` at the external `/Users/ssuladze/Documents/Dev/connector/harness/spike/captures/` is the reference).
  - **(b) cancel mid-background** — assert the **detached descendant is reaped**, not just the process group. **Driven LIVE** (not a capture replay — "zero orphans" is a live-process property an ndjson cannot prove): spawn a real background task with a detached child via STORY-048-01's backend, send `cancel`, and assert the full descendant tree is reaped. The prior-effort `04-teardown2` capture is the reference shape; **no captured fixture is required.** Skips with `claude` absent.
- **`README.md`:** environmental prereq — `claude` installed + logged in on the dev box; the test **skips with a clear message** if `claude` is absent. Includes the **Tailscale dogfood note**: drive the M0 loop from a phone by reaching the laptop broker over a private Tailscale mesh with the shared-secret stub — **no public deploy, no daemon listener** (the agreed substitute for a tunnel Phase-0; do not expose the broker publicly at M0).

### 1.3 Out of Scope
The load-test gate (200 streams × 150 fps + slow consumer + 5 MB tool_result — EPIC-046 hardening). Real auth/revocation (EPIC-047). Multi-project / multi-tenant. Admin Connections UI. Any public exposure.

### 1.4 Open Questions

- **Question:** Use the real `claude` binary for the green path, or replay captures?
- **Recommended:** Green path uses the **real `claude`** (true E2E proof, skip-if-absent); the two borrowed hard scenarios (a)/(b) drive from the **captured fixtures** for determinism, with an optional real-claude background-task variant when the box has `claude`.
- **Human decision:** {default-accept}

### 1.5 Risks

- **Risk:** E2E flakiness from real-process timing makes the test unreliable in CI.
- **Mitigation:** Deterministic fixture replay for the hard scenarios; the real-`claude` green path is local-only and skips cleanly when `claude` is absent.
- **Risk:** An orphan-check that only inspects the process group passes while detached children leak.
- **Mitigation:** Assert against the full descendant set (reuse STORY-048-01's descendant tracking) on a **live** spawned background task; the prior-effort `04-teardown2` capture is the reference shape, not a test input.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: End-to-end walking skeleton

  Scenario: Green path relays a turn and leaves no orphans
    Given the harness boots the broker, the daemon, and the test app
    When the app sends a prompt and reads the stream to turn_end
    Then events arrive in seq order
    And after completion zero claude/child processes survive

  Scenario: Background task holds the relay open past the first result
    Given the 02-background fixture (captures-2.1.162, produced by STORY-048-02) is replayed
    When the loop runs
    Then the relay does not close on the first result
    And a second turn_result arrives before turn_end

  Scenario: Cancel mid-background reaps the detached descendant (live)
    Given a live background task spawned with a detached child
    When the app sends cancel
    Then the turn is torn down and the full descendant tree is reaped
    And zero claude/child processes survive

  Scenario: Claude absent is a clean skip
    Given claude is not installed on the box
    When the E2E test runs
    Then it skips with a clear message rather than failing
```

### 2.2 Verification Steps (Manual)
- [ ] `npm --workspace e2e test` green on a box with `claude` logged in.
- [ ] Drive the loop from a phone over Tailscale per the README → live stream renders.
- [ ] After a cancelled background task, `pgrep claude` → nothing.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Local boot + teardown harness (new) | `connector/e2e/harness.ts` |
| Throwaway CLI test app (new) | `connector/e2e/test-app.ts` |
| Green-path + hard-scenario test (new) | `connector/e2e/relay-e2e.node.test.ts` |
| E2E README + dogfood Tailscale note (new) | `connector/e2e/README.md` |

### 3.2 Technical Logic
`harness.ts` imports the broker and daemon entrypoints (or spawns them as child processes) and the `test-app`, wiring `CONNECTOR_SHARED_SECRET` on both edges and choosing a free port. The green-path test exercises the real loop end-to-end; scenario (a) replays the deterministic `captures-2.1.162/02-background.ndjson` fixture (produced by STORY-048-02); scenario (b) drives a **live** background task (the only way to prove no-orphans). The orphan assertion reuses STORY-048-01's descendant tracking to check the full tree, not just the process group. The README documents the `claude`-logged-in prereq, the skip behaviour, and the Tailscale phone-dogfood path (private mesh + shared-secret stub; no public exposure).

### 3.3 API Contract (if applicable)
N/A — exercises the envelope + event contracts established by the upstream stories; defines no new wire surface.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | this story is the integration test |
| E2E / acceptance tests | 4 | green-path+no-orphans, two-result-background, cancel-reaps-descendant, claude-absent-skip |

### 4.2 Definition of Done (The Gate)
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Green path passes on a `claude`-logged-in box; skips cleanly when absent.
- [ ] Zero orphaned processes asserted after completion and after cancel.
- [ ] README documents the env prereq + the Tailscale dogfood path.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `connector/harness/spike/captures-2.1.162/02-background.ndjson` — the deterministic fixture scenario (a) replays (produced by STORY-048-02; only `00-baseline.ndjson` ships in the repo today). Scenario (b) is driven live, not from a capture. The prior-effort 2.1.161 set at the external `/Users/ssuladze/Documents/Dev/connector/harness/spike/captures/` (incl. `04-teardown2.ndjson`) is the reference shape.
- **Surface:** `connector/docs/envelope-protocol.md` §Turn lifecycle — the end-to-end frame sequence the harness exercises.
- **Coverage of this requirement:** none — net-new. No E2E harness spanning broker + daemon exists.

## Why not simpler?

- **Smallest existing surface that could carry this:** none — the loop spans two net-new packages that only exist after the upstream M0 stories land.
- **Why isn't extension / parameterization / config sufficient?** Proving the architecture requires actually running the broker, the daemon, and an app together against real `claude` output; no config substitutes for the integration.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-046/048 scope + the connector repo layout.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

---
story_id: STORY-048-09
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
updated_at: 2026-06-05T20:14:21Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: connector/daemon/src/teardown.ts, connector/daemon/src/teardown.red.node.test.ts, connector/docs/event-contract.md"
  last_gate_check: 2026-06-05T20:14:21Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-048-09
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-05T20:14:21Z
  sessions: []
---

# STORY-048-09: Connector M2 — Linux/Docker process-tree teardown verification (GATING) + cross-platform no-orphan proof
**Complexity:** L2 — the walker + staged-kill primitive already exists (`teardown.ts`, 35 tests green); this is a single-subsystem verification-plus-targeted-fix on one platform axis, not a new build, so it is one notch above trivial.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Connector daemon on the user's machine, I want the no-orphan staged tree teardown to be **proven on Linux/Docker** — not just macOS/OrbStack — with any platform-specific escape fixed and the Linux `ps`-output parse hardened, so that the daemon's North-Star "zero orphaned `claude` or child processes" contract holds wherever the daemon actually runs before it sits behind the real broker.

### 1.2 Detailed Requirements
- **`teardown.ts` header + verdict update:** the module header (lines 1–16) and the `listDescendants` doc currently say "*Verified on macOS/OrbStack at M0; Linux/Docker (GH#19045) is EPIC-048 hardening*." This story **closes that gap** — VERIFY + fix on Linux, then update the header to record the Linux/Docker verdict (GH#19045 closed for our use). Do **not** rebuild the module.
- **`readProcessTable()` Linux-format hardening:** the walker shells `ps -eo pid=,ppid=` (`teardown.ts:43`). The current split (`trimmed.split(/\s+/)`, take `parts[0]`/`parts[1]`) is BSD/macOS-verified; confirm or fix it against the **Linux/procps `ps` output format** (column widths, leading whitespace, the header-suppression `=` behavior). The `Number.parseInt` + `NaN`-guard + "degrade-never-throw on `status !== 0`" semantics must survive on a box where `ps` may differ.
- **`listDescendants()` PGID-independence proof on Linux:** the walker builds a `ppid → children` adjacency and DFS-walks from `rootPid` (`teardown.ts:67–87`), deliberately **independent of the process group** so a detached child in its own PGID is still reached via its `ppid` link. Prove this holds under **Linux PGID semantics** — a `kill(-pgid)` alone would miss the detached child; the independent walk must still reap it.
- **`teardownTree()` staged sequence on Linux:** the snapshot-before-signal → SIGTERM → grace-poll → SIGKILL → re-walk → reap-descendants sequence (`teardown.ts:121–166`) depends on `process.kill(pid, 0)` liveness probes and ppid reparenting-to-PID-1. Verify the **reparent-to-PID-1 + snapshot-before-link-breaks** invariant holds on Linux (it is the load-bearing assumption in the up-front snapshot comment at `teardown.ts:124`).
- **`createExitHandler()` on Linux:** prove the connector-exit path (`teardown.ts:174–188`, used by `index.ts:202`) reaps **every** live turn's tree concurrently when the daemon process is killed mid-teardown on Linux — no orphan subtree survives.
- **Linux integration tests (extend, do not replace):** add Linux-targeted cases to the existing no-orphan suite (`teardown.red.node.test.ts` + `teardown.impl.node.test.ts`, both in `connector/daemon/src/`). At minimum: detached-child-reaped, exit-handler-reaps-all, ps-parse-correct. Run the suite inside a Linux container (OrbStack / Docker, locally available per `reference_docker_orbstack`).

### 1.3 Out of Scope
- **Windows teardown** (`taskkill /T /F`) — deferred, not this story.
- **A new teardown architecture** — the walker + staged-kill are built; this story VERIFIES and applies *targeted* platform fixes only.
- **Reconnect / re-attach** (STORY-048-04).
- Stream normalization, metrics, sessions, credentials — owned elsewhere in EPIC-048 / EPIC-047.

### 1.4 Open Questions
The forks are **RESOLVED at the epic §6 level.** EPIC-048 §6-Q3 flags Linux/Docker teardown (GH#19045) as the digest CRITICAL risk and directs that the verification story run **early / GATING** so a teardown escape cannot invalidate downstream stories that build on `teardown.ts`. The resolved decision that applies here: **run this story early in M2, on real Linux (OrbStack/Docker), as a hard gate** — extend the existing suite rather than rebuild. No split is warranted: it is one module, one platform axis, single-subsystem (L2). (Splits are free pre-execution; none taken.)

### 1.5 Risks
- **Risk:** the macOS "graceful reap" verdict does **not** generalize to Linux (the explicit warning in `event-contract.md` §Teardown and the `teardown.ts` header) — a detached child may escape under Linux PGID semantics.
- **Mitigation:** run the no-orphan suite in a Linux container and assert zero survivors with `pgrep`/signal-0 probes; fix any escape with a targeted change to the exact invocation (independent descendant walk vs `kill(-pgid)` vs pgrep+kill loop is platform-specific).
- **Risk:** the `ps -eo pid=,ppid=` output parse silently mis-reads on Linux/procps (different column padding), producing an empty/partial table that the "degrade-never-throw" path masks — a parse miss looks like "no descendants," so orphans slip through unnoticed.
- **Mitigation:** add a `ps-parse-correct` test that feeds real Linux `ps` output and asserts the pid/ppid map is complete; do not rely on the macOS-shaped fixture.
- **Risk (GATING):** downstream M2 stories assume `teardown.ts` is sound on the deploy platform.
- **Mitigation:** sequence this story EARLY (epic §6-Q3) so the gate clears before dependents run.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Cross-platform no-orphan teardown — Linux/Docker verification

  Scenario: Detached child reaped on Linux/Docker
    Given a Linux/Docker container running the daemon
    And a turn whose process spawned a detached background child in its own PGID
    When the turn is cancelled
    Then the daemon SIGTERMs, grace-waits, SIGKILLs, and reaps the FULL descendant tree
    And no claude or child process survives

  Scenario: Independent descendant walk beats Linux PGID escape
    Given a detached child sitting in its own process group on Linux
    When teardown runs
    Then the independent descendant walk still reaches and reaps it
    And a kill of the negative pgid alone would have missed it

  Scenario: Exit handler reaps all live trees when the daemon is killed mid-teardown
    Given two live turns with running children on Linux
    When the daemon process exits mid-teardown
    Then the exit handler reaps both turns' process trees
    And no orphan subtree remains

  Scenario: Linux ps-output parse is correct
    Given the ps descendant walker reads the process table on Linux
    When ps -eo pid=,ppid= output is parsed
    Then pid and ppid are parsed correctly for the Linux ps format
    And the resulting pid to ppid map is complete (no silent empty-table degrade)

  Scenario: No-orphan suite passes on Linux
    Given the no-orphan teardown suite
    When it is run inside a Linux container
    Then it passes and the macOS-only verification gap is closed
```

### 2.2 Verification Steps (Manual)
- [ ] Boot a Linux container (OrbStack / `docker run`), spawn a sleeper-with-detached-grandchild turn, cancel it, then `pgrep` inside the container → no survivors.
- [ ] Kill the daemon process mid-teardown with two live turns; `pgrep` → both trees reaped, no orphan subtree.
- [ ] Capture raw Linux `ps -eo pid=,ppid=` output and confirm `readProcessTable` parses it into a complete pid→ppid map.
- [ ] Confirm the `teardown.ts` header records the Linux/Docker verdict (GH#19045 closed for our use).

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Staged tree teardown (verify + targeted fix) | `connector/daemon/src/teardown.ts` |
| No-orphan red suite (extend for Linux) | `connector/daemon/src/teardown.red.node.test.ts` |
| Teardown impl/harness suite (extend for Linux) | `connector/daemon/src/teardown.impl.node.test.ts` |
| Exit-handler caller (no change expected; verify) | `connector/daemon/src/index.ts` |
| Spawn descendant accessor (no change expected; verify) | `connector/daemon/src/spawn.ts` |

### 3.2 Technical Logic
`teardown.ts` reads the process table via `readProcessTable()` (`spawnSync("ps", ["-eo", "pid=,ppid="])`), splitting each header-less line on `/\s+/` and `Number.parseInt`-ing the first two columns into a `pid → ppid` map, degrading to an empty map (never throwing) on `status !== 0`. `listDescendants(rootPid)` inverts that into a `ppid → children` adjacency and DFS-walks (explicit `stack` + `seen` set) from `rootPid` — **process-group-independent** by design, which is exactly the property that must hold on Linux for a detached child in its own PGID to be reached. `teardownTree(pid)` snapshots `listDescendants(pid)` into a `tracked` Set **before** signalling (the comment at `teardown.ts:124` notes the ppid chain breaks once the parent dies and the child reparents to PID 1 — verify this reparent invariant on Linux), then runs SIGTERM → `isAlive`-poll over the grace window → SIGKILL → re-walk (to fold in grace-window forks) → SIGTERM-then-SIGKILL every tracked descendant → final quiesce poll. `createExitHandler(getTurns)` (called from `index.ts:202` on `ws` `close` and from `shutdown()`) snapshots the live targets and `Promise.all`-tears-down every tree concurrently. This story does not change the algorithm; it **proves each step on Linux** and fixes only what the Linux suite shows broken — most likely the `ps`-output parse (procps column padding) and/or the exact signal invocation. `spawn.ts`'s `ChildHandle.descendants()` simply re-calls `listDescendants(child.pid)`, so a parse fix in `teardown.ts` propagates to the live handle automatically.

### 3.3 API Contract (if applicable)

| Surface | Shape (unchanged — verified, not redesigned) |
|---|---|
| `listDescendants(rootPid)` | `→ number[]` — full descendant subtree, PGID-independent |
| `teardownTree(pid, { graceWindowMs })` | `→ Promise<void>` — resolves once the tree is reaped |
| `createExitHandler(getTurns)` | `→ () => Promise<void>` — reaps every live turn's tree |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit / integration tests | 3 | `linux-detached-child-reaped`, `linux-exit-handler-reaps-all`, `linux-ps-parse-correct` (extend the existing no-orphan suite) |
| E2E / acceptance tests | 1 | run the no-orphan suite inside a Linux container (OrbStack / Docker) — the GATING proof |

### 4.2 Definition of Done (The Gate)
- [ ] Teardown no-orphan suite passes on Linux + Docker (run locally via OrbStack / Docker).
- [ ] Any platform-specific escape found is fixed; the `ps`-output parse handles the Linux/procps format.
- [ ] Linux-specific integration test added (or documented runner) for the detached-child reap scenario.
- [ ] `teardown.ts` header updated: Linux/Docker verified (GH#19045 closed for our use).
- [ ] Unit/integration tests ≥3: `linux-detached-child-reaped`, `linux-exit-handler-reaps-all`, `linux-ps-parse-correct`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `connector/daemon/src/teardown.ts` — `teardownTree` / `listDescendants` / `readProcessTable` / `createExitHandler`: the staged-kill + descendant-walk primitive built in STORY-048-01. This story VERIFIES and applies targeted fixes; it does not rebuild.
- **Surface:** `connector/daemon/src/teardown.red.node.test.ts` + `teardown.impl.node.test.ts` — the existing no-orphan suite (Scenario: *Staged teardown leaves no orphans* / *Connector exit tears down all live turns*); extend with Linux-targeted cases.
- **Surface:** `connector/docs/event-contract.md` §Teardown + Watch-list — the GH#19045 context and the explicit "macOS-only verdict, Linux unverified" warning this story closes.
- **Surface:** `reference_docker_orbstack` (auto-memory) — OrbStack provides a local Linux Docker runtime, so the Linux suite is runnable on the dev box.
- **Coverage of this requirement:** partial — extends the existing teardown module + suite (~80% of the surface already exists, macOS-verified); net-new is the Linux/procps `ps`-parse hardening, the Linux integration cases, and the cross-platform verdict.

## Why not simpler?

- **Smallest existing surface that could carry this:** `teardown.ts` already carries the whole algorithm — but it is verified on **one** platform (macOS/OrbStack) and its own header flags Linux/Docker as unverified. The gap is platform coverage, not missing code, so the smallest surface is "the same module, proven on Linux."
- **Why isn't extension / parameterization / config sufficient?** A config flag cannot prove a process-tree contract on a platform the suite has never run on; the failure mode (a Linux PGID escape or a procps parse miss) is only observable by actually running the no-orphan suite in a Linux container and asserting zero survivors. The fix, if any, is a targeted code change to the `ps`-parse or signal invocation — not a parameter.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Readied 2026-06-06: forks resolved at EPIC-048 §6 (Q3 directs this as the early/GATING Linux-teardown verification of the digest CRITICAL risk); the M0 teardown module + no-orphan suite are on disk (35 tests green) and this story extends them.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-048 `<target_files>` (`connector/daemon/src/teardown.ts` and its suite).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (`connector/daemon/src/teardown.ts`).
- [x] Why not simpler? has both sub-bullets answered.
- [x] §1.4 granularity decision recorded — keep whole (L2, single module, single platform axis), no split; gating sequence per epic §6-Q3.

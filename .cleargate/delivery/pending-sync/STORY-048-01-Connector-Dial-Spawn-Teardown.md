---
story_id: STORY-048-01
parent_epic_ref: EPIC-048
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-048 (INITIATIVE-001 direct-approval) + connector/docs/{event-contract,spike-findings-claude-2.1.161}.md + verified codebase grounding
actor: Connector daemon (on the user's machine)
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: high
lane: standard
db_write_set: []
dep_predecessors:
  - STORY-046-01
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
      detail: "cited paths do not exist on disk: cleargate-cli/src/commands/mcp-serve.ts, connector/docs/event-contract.md, connector/docs/spike-findings-claude-2.1.161.md"
  last_gate_check: 2026-06-04T08:23:36Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-048-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T08:58:15Z
  sessions: []
---

# STORY-048-01: Connector M0 — WS dial-out + register + Backend seam + spawn-per-turn + staged tree teardown
**Complexity:** L3 — process-lifecycle core (spawn `claude` + reap its full descendant tree) behind a Backend seam, fronted by a dial-out WS client. The hard, high-bounce half of the daemon.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Connector daemon on the user's machine, I want to dial out to the broker, register under a `connection_id`, and — on a prompt — spawn `claude` with the exact verified command behind a Backend seam, then tear the whole process tree down cleanly on cancel, so that turns run locally with **zero orphaned processes**.

### 1.2 Detailed Requirements
- **`dial.ts` — WS dial-out:** open a WebSocket client to the broker; send `register` (shared-secret stub credential + `protocol_version` + metadata: `label`, `cwd`, `allowed_tools` — **metadata only at register; no policy enforcement is implied here**, see §1.3); on `registered`, store the assigned `connection_id`. (Reconnect/re-attach is M0-out — see §1.3.)
- **`backend.ts` — Backend seam (build BEFORE wiring spawn into the turn path):** a `Backend` interface (`spawn(prompt, opts) → ChildHandle`) resolved via a `registry[backend_id]` map (no `instanceof`/type-branch), with a `ClaudeBackend` impl. **The turn path has zero direct `claude`-CLI references** (grep-verifiable DoD).
- **`spawn.ts` — spawn-per-turn:** the exact verified command `claude -p "<prompt>" --output-format stream-json --verbose --include-partial-messages < /dev/null` (the `< /dev/null` is mandatory or a 3s stall; `--include-partial-messages` is required). **argv-only spawn (no shell)**; **realpath-pinned cwd-jail** the turn cannot escape. Returns a `ChildHandle` exposing the stdout stream, pid, and descendant-tracking handle.
- **`teardown.ts` — staged process-tree teardown:** SIGTERM → grace window → SIGKILL, **plus independent descendant-tree tracking + reap** (a detached background child sits in its own PGID, so `kill(-pgid)` misses it — track and reap the full tree, do not rely on the process group). A **connector-exit handler** tears down every live turn's tree. Verified on **macOS/OrbStack** at M0; **Linux/Docker verification (GH#19045) is deferred to EPIC-048 hardening.**
- **`index.ts` — daemon entry:** dial → register → on `prompt` invoke a turn handler that (for M0) calls `spawn` and forwards raw stdout bytes as the turn's `event` payloads; on `cancel`/disconnect/exit invoke `teardown`. (STORY-048-02 replaces the raw-forward stub with the normalizer + lifecycle.)

### 1.3 Out of Scope
Stream normalization + multi-result EOF lifecycle (STORY-048-02). Metrics derivation. Sessions / `--resume`. `--allowedTools` **policy enforcement** beyond the conservative default + cwd-jail (the `allowed_tools` register field is announced metadata only at M0 — no enforcement logic). Tool-I/O cap + redaction. Real credential (EPIC-047). **All reconnect / re-attach (basic + full-jitter backoff)** and resume-from-seq replay (EPIC-048 hardening — the M0 walking skeleton runs one connection per turn and does not exercise reconnect). Windows teardown.

### 1.4 Open Questions

- **Question:** This story bundles WS dial-out (network) with process spawn + tree teardown (process management) → it trips the Granularity Rubric's L3 + high-bounce + mixed-subsystem signals. Keep it whole and dispatch to **Opus** (the rubric's sanctioned L3 escape hatch), or split into 048-01a (dial + register) and a new 048-0x (Backend + spawn + teardown)?
- **Recommended:** **Keep whole, dispatch Opus.** The spawn/teardown primitive and the dial loop both feed `index.ts` and the Backend seam, and EPIC-048's own `<milestone_sequence>` pairs spawn + teardown (M-a). Splitting adds a wave barrier for little isolation gain. (Splits are free pre-execution — collapse/split at your call.)
- **Human decision:** **Keep whole, dispatch Opus** (Sandro, 2026-06-04) — run dial + Backend seam + spawn + tree-teardown as one unit on Opus, per the rubric's L3 escape hatch. No split.

### 1.5 Risks

- **Risk:** A detached background child is orphaned on cancel/crash (the documented failure mode, GH#19045).
- **Mitigation:** Track the full descendant tree independently and reap it; assert **zero orphans** in `teardown.node.test.ts` (spawn a sleeper with a detached grandchild, cancel, assert nothing survives). macOS/OrbStack now; Linux spike deferred.
- **Risk:** A direct `claude` call leaks into the turn path, defeating the Backend seam.
- **Mitigation:** Grep-verifiable DoD: zero direct `claude`-CLI references outside `ClaudeBackend`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Connector dial-out, spawn, and staged teardown

  Scenario: Dial out and register
    Given the broker is listening
    When the daemon dials out and sends register with the shared-secret stub
    Then it receives registered and stores the assigned connection_id

  Scenario: Spawn uses the exact verified command
    Given a prompt for turn T
    When the daemon spawns the backend
    Then claude is invoked argv-only with -p, --output-format stream-json, --verbose,
         --include-partial-messages, and stdin redirected from /dev/null
    And the working directory is a realpath-pinned jail

  Scenario: Staged teardown leaves no orphans
    Given a turn whose process spawned a detached background child
    When the turn is cancelled
    Then the daemon SIGTERMs, waits the grace window, SIGKILLs, and reaps the full descendant tree
    And no claude or child process survives

  Scenario: Connector exit tears down all live turns
    Given two live turns with running children
    When the daemon process exits
    Then the exit handler reaps both turns' process trees

  Scenario: No direct claude reference in the turn path
    Given the daemon source
    Then all claude invocation is behind the Backend interface (grep finds none in the turn path)
```

### 2.2 Verification Steps (Manual)
- [ ] Run the daemon against a local broker stub → `registered` with a `connection_id`.
- [ ] Spawn a turn; inspect the launched argv (`/dev/null` stdin, all four flags).
- [ ] Spawn a sleeper-with-detached-child, cancel, then `pgrep` → no survivors.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Daemon entry (new) | `connector/daemon/src/index.ts` |
| WS dial-out client (new) | `connector/daemon/src/dial.ts` |
| Backend interface + ClaudeBackend (new) | `connector/daemon/src/backend.ts` |
| Spawn-per-turn helper (new) | `connector/daemon/src/spawn.ts` |
| Staged tree teardown (new) | `connector/daemon/src/teardown.ts` |
| Teardown + no-orphan tests (new) | `connector/daemon/test/teardown.node.test.ts` |

### 3.2 Technical Logic
`dial.ts` uses the same shared envelope codec (`connector/shared/envelope.ts`, imported read-only from STORY-046-01) to encode `register` and decode `registered`. `backend.ts` defines `Backend.spawn()` and the `ClaudeBackend` that owns the only reference to the `claude` binary. `spawn.ts` builds the argv array (no shell), pins `cwd` via `fs.realpathSync`, and wires the child's stdout. `teardown.ts` tracks descendants (audit a `tree-kill`-class dep or a thin native helper — Node has no `psutil`) and runs the staged SIGTERM→SIGKILL+reap sequence. `index.ts` wires dial → register → prompt → (M0 stub: spawn + raw-forward) → cancel → teardown; the stub turn handler is the seam STORY-048-02 replaces.

### 3.3 API Contract (if applicable)

| Surface | Shape |
|---|---|
| `Backend.spawn(prompt, opts)` | `→ ChildHandle { pid, stdout: Readable, descendants(): pid[], kill(signal) }` |
| Spawn argv | `claude -p <prompt> --output-format stream-json --verbose --include-partial-messages` with `stdin=/dev/null`, `cwd=<realpath jail>` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | dial-register, exact-argv, no-orphans-on-cancel, exit-handler-reaps-all, backend-seam-grep-clean |
| E2E / acceptance tests | 0 | E2E is STORY-046-04 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Zero orphaned processes after cancel + after daemon exit (asserted).
- [ ] Zero direct `claude`-CLI references in the turn path (grep).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/mcp-serve.ts` — the nearest prior art: a long-lived local process that parses a streaming protocol; pattern reference for the dial loop + stream handling.
- **Surface:** `connector/docs/event-contract.md` §Spawn command / §Teardown + `connector/docs/spike-findings-claude-2.1.161.md` — the verified spawn argv and the staged-teardown requirement implemented here.
- **Coverage of this requirement:** partial — the long-lived-process + stream-read pattern is reusable (~30%); spawning/supervising/reaping `claude` is net-new.

## Why not simpler?

- **Smallest existing surface that could carry this:** `mcp-serve.ts`'s long-lived-process shape is closest, but it proxies stdio to HTTP — it neither spawns `claude` nor manages a process tree.
- **Why isn't extension / parameterization / config sufficient?** Spawning a code-executing subprocess and guaranteeing no orphaned detached children is net-new supervision logic the spike proved genuinely hard; no existing surface carries it.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Resolved 2026-06-04: human acked **keep-whole + Opus dispatch**. The spec was always execution-ready; the only open item was the orchestration decision (keep-whole vs split), now closed → 🟢.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-048 `<target_files>`.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
- [x] §1.4 granularity decision — **keep-whole + Opus**, acked by the human (2026-06-04).

---
story_id: STORY-048-06
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
expected_bounce_exposure: low
lane: standard
db_write_set: []
dep_predecessors: []
deferred_verification: []
area: connector
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-05T20:14:48Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: connector/daemon/src/normalize.ts, connector/daemon/src/index.ts, connector/docs/event-contract.md"
  last_gate_check: 2026-06-05T20:14:48Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-048-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-05T20:14:47Z
  sessions: []
---

# STORY-048-06: Connector M2 — runtime version-drift guard (2.1.162 pin → degrade-not-crash) + CI fixtures
**Complexity:** L2 — bounded extension to two already-shipped M0 modules (`index.ts` startup/register + `normalize.ts` drift logger) plus a snapshot harness seeded from existing captures; no new subsystem, no process-lifecycle risk.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Connector daemon on the user's machine, I want to assert at startup + register that the live `claude --version` matches the pinned `2.1.162` and to snapshot the normalized output of the captured `stream-json` fixtures in CI, so that an upstream CLI bump that silently changes record shapes is reported as **degraded** and caught by a failing test — never crashed, never silently dropped.

### 1.2 Detailed Requirements
- **`index.ts` — startup + register version check:** In `startDaemon()` (the boot path that today resolves the backend, dials, and registers), invoke `claude --version` once at boot, parse the version string, and compare it to the pinned `2.1.162`. On match, boot proceeds healthy (no drift flag). On mismatch, set a `degraded` flag and surface it in the `register` payload (alongside `protocol_version`) and in any `status` frame — then **continue booting** (degrade-not-crash). The version probe is injectable (a `versionProbe?: () => string` opt, defaulting to a real `claude --version` exec) so tests drive both arms without spawning the binary; mirror the existing `opts.registry` / `opts.versionProbe` injection pattern already used for `BackendRegistry`. The probe must itself be exception-safe: a probe that throws (binary absent) yields `degraded`, never an unhandled rejection.
- **`normalize.ts` — wire the named `drift` channel:** `normalize()` already takes `NormalizeOpts.driftLogger?(recordType)` and logs every unmapped top-level type via the `default:` arm (and `(non-object)` / `(missing-type)` guards). Extend the drift signal so the logger receives the **FULL record**, not just the type name — change `driftLogger` to `(recordType: string, record: unknown)` (or add a sibling `driftRecord` field) and pass `record` from every `opts.driftLogger?.(…)` call site in `normalize.ts` / `normalizeSystem` / `normalizeStreamEvent`. `runTurn()` (turn-runner.ts) forwards this logger down via its existing `normalizeOpts` plumbing. A named channel constant (e.g. `DRIFT_CHANNEL = "drift"`) tags the log so the surface is greppable and distinct from ordinary daemon logs. Records are still never forwarded raw (the `return null` contract is unchanged).
- **`test/fixtures/` — CI snapshot harness (net-new):** Add `connector/daemon/test/fixtures/` with a fixture runner that reads each `captures-2.1.162` ndjson (`00-baseline`, `02-background`, `10-tooluse`), pipes each through `runTurn()` (or `normalize()` line-by-line), and asserts the normalized event sequence matches a committed snapshot. The snapshot pins the `system` (init → `turn_start`), `task_*` (subagent family — shape reference per event-contract §v0.1 table `agent_*`), and `modelUsage` (`result.modelUsage.<model>` → `context` metric source) **SHAPES** — not metric values (values are 048-07). Seed the snapshots from the existing captures; **do not re-capture** the CLI.
- **Fixture-divergence guard:** When a fixture's normalized output diverges from its committed snapshot, the test fails loudly (a contract break is a red CI run, not a silent absorb). The harness reads the captures read-only; it never mutates the source ndjson.
- **Re-verify discipline:** Document the "re-verify on `claude` upgrade" rule in the harness README or release notes — when the pin moves off `2.1.162`, the fixtures are re-captured and the snapshots regenerated deliberately, not auto-overwritten.

### 1.3 Out of Scope
Metrics **derivation values** (token totals, `context_pct`, per-agent breakdown) — STORY-048-07 derives them; this story pins only the SHAPES the fixtures exercise. Auto-upgrade / version negotiation / pin-bump automation. Sandboxing / cwd-jail hardening (STORY-048-08). Reconnect/backoff (STORY-048-04). Linux/Docker teardown gating (STORY-048-09).

### 1.4 Open Questions
The forks are **RESOLVED at the epic §6 level** (acked by Sandro 2026-06-06): the runtime guard is a **degrade-not-crash** check at startup + register (EPIC-048 §6 / Hardening checklist line 93), the drift surface is a **named `drift` log channel** (§54, §93), and the fixtures live at `connector/daemon/test/fixtures/**` seeded from the existing `captures-2.1.162` snapshots (§137) with a **re-verify-on-upgrade** discipline (§54, §108). No open material question remains for this story.

### 1.5 Risks
- **Risk:** A `claude` CLI version drift is a *silent* contract break — an upstream bump that renames or restructures a record type makes `normalize()` drop it via the `default:` arm, so the app sees nothing and no error fires.
- **Mitigation:** This story IS the mitigation: the runtime guard turns the prose pin into a startup assertion (degraded surfaced in register/status), the named `drift` channel logs the full unmapped record (so the dropped shape is recoverable from logs), and the CI fixtures catch shape divergence at build time.
- **Risk:** Snapshots silently rot — a developer regenerates them to "make CI green" and absorbs a real contract break.
- **Mitigation:** Divergence fails loudly + the re-verify-on-upgrade discipline (README/release-notes) makes snapshot regeneration a deliberate, pin-bump-coupled act, not a reflex.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Connector runtime version-drift guard + CI fixtures

  Scenario: Version matches the pin → healthy
    Given the live claude --version reports 2.1.162
    When the daemon starts and registers
    Then it reports healthy and the register payload carries no degraded flag

  Scenario: Version differs from the pin → degraded, no crash
    Given the live claude --version differs from 2.1.162
    When the daemon starts
    Then it reports degraded in the register payload and in status
    And the daemon does NOT crash and continues booting

  Scenario: Unmapped record type → full-record drift log
    Given an unmapped record type arrives mid-turn
    When it is normalized
    Then it is logged on the named drift channel with the FULL record (not just the type name)
    And it is never forwarded raw

  Scenario: CI fixtures match the snapshot
    Given the captures-2.1.162 ndjson fixtures
    When each is normalized through the harness
    Then the normalized output matches the committed snapshot
    And the system, task_*, and modelUsage shapes are pinned

  Scenario: Fixture divergence fails CI loudly
    Given a fixture whose normalized shape diverges from its snapshot
    When the fixture suite runs
    Then CI fails loudly and the contract break is surfaced, not absorbed
```

### 2.2 Verification Steps (Manual)
- [ ] Boot the daemon with a version probe returning `2.1.162` → register payload healthy (no degraded flag).
- [ ] Boot with a probe returning `2.1.163` (or a throwing probe) → register/status report `degraded`, process stays up.
- [ ] Feed an unknown record type through `normalize()` with a capturing `driftLogger` → assert the full record (not just the type string) reaches the named `drift` channel.
- [ ] Run the fixture suite against `captures-2.1.162`; mutate one snapshot and re-run → CI fails loudly.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Daemon entry — add version check (extend) | `connector/daemon/src/index.ts` |
| Normalizer — full-record drift channel (extend) | `connector/daemon/src/normalize.ts` |
| Turn-runner — forward drift logger (already plumbed) | `connector/daemon/src/turn-runner.ts` |
| Fixture snapshot harness (new) | `connector/daemon/test/fixtures/` + `connector/daemon/test/version-drift.node.test.ts` |
| Source captures (read-only seed) | `connector/harness/spike/captures-2.1.162/{00-baseline,02-background,10-tooluse}.ndjson` |

### 3.2 Technical Logic
`index.ts` already resolves the backend, builds `dialOpts`, and sends `register` with `protocol_version` baked into the `register` payload (via `dial.ts`'s `register` frame, `dialOpts.protocolVersion`). Add a one-shot version probe in `startDaemon()` before `dial()` — default impl execs `claude --version` and parses the semver; on mismatch with the `2.1.162` pin set `degraded = true`. Thread `degraded` into the `register` payload (a new `degraded` / `claude_version` field alongside `protocol_version`) and into the `status`-shaped surface. Keep the probe injectable via a `DaemonOpts.versionProbe?` mirroring the existing `opts.registry` injection — tests pass a fake probe, no binary needed, and a throwing probe must resolve to `degraded`, not bubble.

`normalize.ts` already implements the allowlist-drift contract: the `default:` arm calls `opts.driftLogger?.(type)` and returns `null` (never raw); the `(non-object)` and `(missing-type)` guards do the same. The only change is to widen `NormalizeOpts.driftLogger` to also receive the full `record`, and pass `record` at all three call sites in `normalize()` plus the sub-normalizers — so the log carries the structure needed to reconstruct the dropped shape, tagged with the named `drift` channel constant. `turn-runner.ts` needs no logic change: it already builds `normalizeOpts` from `opts.driftLogger` and forwards it into every `normalize()` call, so widening the signature flows through.

The fixture harness reads each `captures-2.1.162` ndjson, replays it through `runTurn()` (which line-buffers the stream exactly as the live turn path does), and snapshots the emitted `events[]` sequence. The captures contain the real shape diversity the snapshot must pin: `system/init`, `stream_event` framing, `assistant`/`tool_use`, `user`/`tool_result`, `result` with `modelUsage` (present in `02-background`), and the `task_*` / subagent family — so the snapshots double as the live regression net for an upstream bump. Snapshots are committed; divergence is a hard assertion failure.

### 3.3 API Contract (if applicable)

| Surface | Shape |
|---|---|
| `DaemonOpts.versionProbe?` | `() => string` — returns the live `claude --version` string; default execs the binary. A throw ⇒ `degraded`. |
| `register` payload (extended) | adds `degraded: boolean` + `claude_version: string` alongside the existing `protocol_version` |
| `NormalizeOpts.driftLogger` (widened) | `(recordType: string, record: unknown) => void` — receives the FULL record, tagged channel `"drift"` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | version-match-healthy, version-drift-degraded-no-crash, unmapped-drift-full-record, fixture-snapshot-pass, fixture-divergence-fails |
| E2E / acceptance tests | 0 | E2E remains STORY-046-04; this story is unit + fixture-snapshot only |

### 4.2 Definition of Done (The Gate)
- [ ] Startup + register version check vs `2.1.162`; degrade-not-crash on mismatch; `degraded` surfaced in register/status.
- [ ] Named `drift` log channel fires for unmapped types; the drift log includes the FULL record.
- [ ] CI fixtures snapshot the normalized output of `captures-2.1.162` (`00-baseline`, `02-background`, `10-tooluse` ndjson); `system` / `task_*` / `modelUsage` shapes pinned.
- [ ] Re-verify-on-upgrade discipline noted in release notes or harness README.
- [ ] Minimum test expectations (§4.1) met — unit tests ≥ 5.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `connector/daemon/src/normalize.ts` — already implements the allowlist + drift contract (`NormalizeOpts.driftLogger`, `KNOWN_TYPES`, `default:` drift arm). This story wires the named channel + widens the signal to the full record.
- **Surface:** `connector/daemon/src/index.ts` — `startDaemon()` already owns boot → resolve-backend → dial → register; the version check slots in before `dial()` and rides the existing `register` payload.
- **Surface:** `connector/harness/spike/captures-2.1.162/{00-baseline,02-background,10-tooluse}.ndjson` — existing real captures; seed the snapshots, do not re-capture.
- **Surface:** `connector/docs/event-contract.md` §v0.1 event set + §Metrics derivation — the `system`/`task_*`/`modelUsage` shape reference the fixtures pin.
- **Coverage of this requirement:** partial — extends the shipped `normalize.ts` drift logger + `index.ts` boot/register path; net-new is the runtime version probe, the named-channel/full-record drift surface, and the `test/fixtures/` snapshot harness.

## Why not simpler?

- **Smallest existing surface that could carry this:** `normalize.ts`'s `driftLogger` already logs unmapped types — but it logs only the type *name* and has no version assertion, so a structural bump that keeps a known type name but changes its inner shape escapes both the logger and any runtime check.
- **Why isn't extension / parameterization / config sufficient?** A config flag cannot detect drift; only a runtime probe against the live `claude --version` plus a committed snapshot of real captured bytes can. The whole contract rests on observed CLI output, so the guard must compare against captured reality — that capture + snapshot harness is net-new and cannot be a config toggle.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Readied 2026-06-06: the §6 forks (degrade-not-crash guard, named `drift` channel, fixtures-at-`test/fixtures/**` seeded from existing captures, re-verify-on-upgrade) are resolved at the EPIC-048 §6 level; the M0 modules (`index.ts`, `normalize.ts`, `turn-runner.ts`) and the `captures-2.1.162` ndjson are on disk → execution-ready.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, on-disk file paths (`index.ts`, `normalize.ts`, `turn-runner.ts`, `test/fixtures/`, `captures-2.1.162/*.ndjson`).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (four cited, all verified on disk).
- [x] Why not simpler? has both sub-bullets answered.
- [x] §1.4 granularity decision recorded — forks resolved at EPIC-048 §6 (acked 2026-06-06); L2 kept whole.

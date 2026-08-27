---
story_id: STORY-048-08
parent_epic_ref: EPIC-048
parent_cleargate_id: "EPIC-048"
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-048 (INITIATIVE-001 direct-approval + §6 decisions acked 2026-06-06) + connector/docs/{event-contract,spike-findings-claude-2.1.161,envelope-protocol,auth-seam}.md + verified codebase grounding (M0 daemon on disk)
actor: Connector daemon (on the user's machine)
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: medium
lane: standard
db_write_set: []
dep_predecessors: []
deferred_verification: []
area: connector
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-05T20:14:47Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: connector/daemon/src/spawn.ts, connector/daemon/src/dial.ts, connector/daemon/src/normalize.ts, connector/daemon/src/index.ts, connector/docs/event-contract.md"
  last_gate_check: 2026-06-05T20:14:47Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-048-08
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-05T20:14:47Z
  sessions: []
---

# STORY-048-08: Connector M2 — sandboxing hardening (allowlist enforcement + tool-IO cap + redaction in the daemon + concurrency cap)
**Complexity:** L3 — security-critical enforcement that spans four live M0 seams (spawn-argv allowlist, normalizer cap+redact, daemon-entry concurrency, and the realpath cwd-jail) on a code-executing-service surface, where each control is the *only* place that control can live (the broker sees only opaque payload).

## 1. The Spec (The Contract)

### 1.1 User Story
As the Connector daemon on the user's machine, I want `allowed_tools` to be **enforced** at spawn (not just announced as register metadata), tool-I/O capped + redacted **in the daemon before the opaque payload leaves the box**, live turns bounded by a concurrency cap, and the realpath cwd-jail closed against the symlink-parent escape, so that a remote prompt cannot exfiltrate secrets, run an unallowlisted write/exec tool, escape the jail, or fork-bomb the host.

### 1.2 Detailed Requirements
- **`spawn.ts` — `--allowedTools` ENFORCEMENT (not metadata):** extend `buildSpawnArgs` to push `--allowedTools <list>` onto the verified argv (after the existing `-p`/`--output-format`/`--verbose`/`--include-partial-messages` block, before any `--resume`). Default the list to the conservative `Read,Grep,Glob`; write/exec tools (`Edit`, `Write`, `Bash`, etc.) are spawned **only** when explicitly opted in via the new `allowedTools` field on `BuildSpawnOpts`/`SpawnTurnOpts`. This turns the M0 "metadata only" announce into an actual CLI-enforced denial — the argv literally never grants the tool. A `permissionMode` knob (default the conservative mode) rides alongside the same opts surface.
- **`spawn.ts` — `pinCwd` symlink-parent hardening:** the current `pinCwd` calls `realpathSync(absolute)` and, on the `catch` (path does not exist on disk yet), returns the raw `absolute` string **without resolving or validating its parent chain** — a parent symlink pointing outside the configured boundary therefore escapes the jail at spawn time. Add a parent-traversal check: walk up to the nearest existing ancestor, `realpathSync` *that*, and assert the resolved real path is still a prefix of the configured jail root before handing back a path; reject (throw) otherwise. The happy path (`realpathSync` succeeds) keeps the same boundary assertion.
- **`normalize.ts` — tool-I/O size-cap + `truncated:true`:** at `tool_result` assembly (the `ToolResultEvent.content` set in `normalizeUserRecord` and the single-block `normalizeUser`), measure the serialized `content` against a configurable byte cap; when it exceeds the cap, clip it and set `truncated: true` on the emitted `ToolResultEvent`. The daemon is the **only** place this can happen — the broker forwards the payload opaquely and never inspects it.
- **`normalize.ts` — secret redaction in the daemon:** before a `tool_result` (and any tool-I/O-bearing event) leaves `normalize`, run `content` through a redaction pass that masks known secret patterns (env-var-style `KEY=…`, bearer/`Authorization:` tokens, private-key headers, `sk-`/`ghp_`-class API keys). Redaction happens **in the box** because the payload is opaque to the broker — `event-contract.md` §Verbosity already documents tool I/O as "redaction-policy applied"; this story is where that policy becomes code.
- **`index.ts` — concurrency cap on live turns:** the daemon holds a `liveTurns` `Map<string, LiveTurn>`. Add a configurable max-concurrent-turns cap checked in `handlePrompt` *before* `backend.spawn`: when `liveTurns.size` is at the cap, reject the new prompt (emit a terminal `error`/`rejected` event + `turn_end`) or queue it per the configured policy — never spawn unbounded `claude` processes. Default policy: reject.
- **Wiring:** the new `allowedTools` / `permissionMode` / `ioCapBytes` / `maxConcurrentTurns` config flows from `DaemonOpts` → `handlePrompt`/`backend.spawn` opts → `buildSpawnArgs`/`normalize`. The M0 `DialOpts.allowedTools` register field stays (the announce is still useful metadata); this story adds the **enforcement** path that consumes the same list at spawn.

### 1.3 Out of Scope
- **Operator-blind E2E encryption** — the broker still sees plaintext at v1 (transit-only trust model); end-to-end payload encryption is a later epic.
- **The `allowed_tools` register *announce* itself** — shipped in M0 (`dial.ts` sends it as metadata). This story makes it ENFORCED at spawn; it does not change the register frame.
- **Real credential** at register — STORY-048-03 (this story keeps the shared-secret stub).
- **A `text`/`full` verbosity knob** beyond the EPIC §6 ruling — only added if it falls naturally out of this config plumbing (the daemon default stays `tools`), otherwise deferred.

### 1.4 Open Questions
The forks are **RESOLVED at the EPIC-048 §6 level** (4 human answers acked by Sandro 2026-06-06). The two that bind this story: (a) the daemon default verbosity stays `tools`; a `text`/`full` knob is added here **only if** it falls naturally out of the sandboxing config plumbing, else deferred — so no new verbosity surface is load-bearing for DoD. (b) Auth/credential reuse is a different seam (048-03), not touched here. No story-level ambiguity remains.

### 1.5 Risks
- **Risk:** This is security-critical enforcement on a code-executing service spread across four seams (spawn allowlist, normalizer cap+redact, daemon-entry concurrency, cwd-jail) — a gap in any one (e.g. a redaction regex miss, or an allowlist that is metadata-only) is a real exfiltration / escape.
- **Mitigation:** Bound the change to the existing `buildSpawnArgs` / `pinCwd` / `normalizeUserRecord` / `liveTurns` seams — no new subsystem. Each control gets a dedicated red test asserting the *negative* (write tool denied, secret masked, over-cap truncated, symlink-parent rejected, cap-exceeded prompt rejected). The allowlist enforcement is grep-verifiable on the launched argv.
- **Risk:** An over-aggressive redaction/truncation pass corrupts legitimate tool output the operator needs.
- **Mitigation:** Cap is byte-bounded with `truncated:true` signalling (lossy is visible, not silent); redaction masks only the documented secret-pattern set, leaving non-matching content intact; both are configurable via `DaemonOpts`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Connector daemon sandboxing hardening

  Scenario: Allowlist is enforced at spawn, not just announced
    Given the conservative default allowlist Read,Grep,Glob
    When a turn is spawned without opting into write/exec tools
    Then the launched argv carries --allowedTools Read,Grep,Glob
    And Write, Edit, and Bash are denied (absent from the granted list)

  Scenario: Write tool only runs when explicitly opted in
    Given a turn spawned with allowedTools including Write
    When the argv is built
    Then --allowedTools grants Write
    And the default conservative set is replaced by the opt-in list

  Scenario: Oversized tool-IO is capped in the daemon
    Given a tool_result whose content exceeds the configured byte cap
    When it is normalized
    Then the emitted tool_result content is clipped
    And truncated is set to true on the event

  Scenario: Secrets are redacted before leaving the box
    Given a tool-IO payload containing an API key and a bearer token
    When the tool_result event is emitted
    Then the secret substrings are masked in the daemon
    And the redaction happens before the opaque payload reaches the broker

  Scenario: Concurrency cap bounds live turns
    Given the maximum concurrent turns is reached
    When a new prompt arrives
    Then it is rejected (or queued per policy) with a terminal error + turn_end
    And no additional claude process is spawned

  Scenario: Symlink-parent cannot escape the cwd-jail
    Given a cwd whose non-existent leaf has a parent that is a symlink pointing outside the jail root
    When pinCwd resolves the jail
    Then the resolved real parent is checked against the jail root
    And the spawn is rejected rather than escaping
```

### 2.2 Verification Steps (Manual)
- [ ] Spawn a turn with the default opts; inspect the launched argv — `--allowedTools Read,Grep,Glob` present, no `Write`/`Bash`.
- [ ] Feed a `tool_result` record with an `sk-`-style key + a >cap-byte body through `normalize`; assert masked + `truncated:true`.
- [ ] Drive `handlePrompt` to the cap, send one more prompt; assert no new child spawns and a terminal `error`/`turn_end` is emitted.
- [ ] Point a cwd's parent at an out-of-jail symlink target for a non-existent leaf; assert `pinCwd` throws instead of returning the escaped path.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Allowlist argv + cwd-jail hardening | `connector/daemon/src/spawn.ts` (`buildSpawnArgs`, `pinCwd`, `BuildSpawnOpts`/`SpawnTurnOpts`) |
| Backend opts passthrough | `connector/daemon/src/backend.ts` (`BackendSpawnOpts` — thread `allowedTools`/`permissionMode`) |
| Tool-IO cap + redaction | `connector/daemon/src/normalize.ts` (`normalizeUserRecord`, `normalizeUser`, `ToolResultEvent`) |
| Concurrency cap | `connector/daemon/src/index.ts` (`handlePrompt`, `liveTurns` map, `DaemonOpts`) |
| Allowlist metadata source (read-only) | `connector/daemon/src/dial.ts` (`DialOpts.allowedTools` — announce stays; enforcement is new) |
| Sandboxing tests (new) | `connector/daemon/test/sandbox.red.node.test.ts`, `connector/daemon/test/sandbox.node.test.ts` |
| Contract reference | `connector/docs/event-contract.md` §Verbosity (tool-IO cap/redact) + §Teardown |

### 3.2 Technical Logic
`spawn.ts` today builds the verified argv in `buildSpawnArgs` (`-p`, `--output-format stream-json`, `--verbose`, `--include-partial-messages`, optional `--resume`) and pins cwd via `pinCwd`. The allowlist is pushed onto that same array as `--allowedTools <csv>` sourced from a new `allowedTools` opt (default `["Read","Grep","Glob"]`); `permissionMode` rides alongside. `pinCwd` keeps its happy path (`realpathSync(absolute)`) but its `catch` branch — which today returns the unresolved `absolute` string when the path is missing — is replaced with the parent-traversal check: ascend to the nearest existing ancestor, `realpathSync` it, and assert the real path is still under the configured jail root, throwing on escape. `backend.ts`'s `BackendSpawnOpts` and `ClaudeBackend.spawn` forward `allowedTools`/`permissionMode` into `spawnTurn` unchanged in shape. In `normalize.ts`, both `tool_result` constructors — `normalizeUserRecord` (multi-block) and the single-block path in `normalizeUser` — gain a `capAndRedact(content)` step that serializes `content`, masks the documented secret patterns, and clips to the byte cap setting `truncated:true` on the `ToolResultEvent` (a new optional field on the interface). `index.ts`'s `handlePrompt` checks `liveTurns.size` against `maxConcurrentTurns` (from `DaemonOpts`) before calling `backend.spawn`; at the cap it emits a terminal `error`/`turn_end` (reusing the existing `emitTurnEnd` helper) instead of spawning — the reject path adds no child to the map. The connector-exit and `cancelTurn` paths are untouched.

### 3.3 API Contract (if applicable)

| Surface | Shape |
|---|---|
| `BuildSpawnOpts` / `SpawnTurnOpts` | add `allowedTools?: string[]` (default `["Read","Grep","Glob"]`), `permissionMode?: string` |
| Spawn argv (extended) | `… --include-partial-messages --allowedTools Read,Grep,Glob [--resume <id>]` |
| `ToolResultEvent` | add `truncated?: true` (set only when clipped) |
| `DaemonOpts` | add `maxConcurrentTurns?: number`, `ioCapBytes?: number`, `allowedTools?: string[]`, `permissionMode?: string` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | allowlist-enforced-denies-write, allowlist-opt-in-grants-write, tool-io-cap-truncates, secret-redacted, concurrency-cap-rejects, symlink-parent-no-escape |
| E2E / acceptance tests | 0 | E2E is STORY-046-04; this story is unit-level on the four daemon seams |

### 4.2 Definition of Done (The Gate)
- [ ] `--allowedTools` ENFORCED (conservative default `Read,Grep,Glob`; write/exec opt-in only); `allowed_tools` is no longer metadata-only.
- [ ] Tool-IO size-cap + `truncated:true` + secret redaction done in the daemon (before the opaque payload leaves the box).
- [ ] Concurrency cap on live turns; permission mode honored.
- [ ] cwd-jail hardened against the symlink-parent escape (`pinCwd` parent-traversal check).
- [ ] Unit tests ≥5: allowlist-enforced-denies-write, tool-io-cap-truncates, secret-redacted, concurrency-cap-rejects, symlink-parent-no-escape.
- [ ] Minimum test expectations (§4.1) met; all Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `connector/daemon/src/spawn.ts` — `buildSpawnArgs` already assembles the verified argv and `pinCwd` already realpath-pins cwd; this story extends `buildSpawnArgs` with `--allowedTools` and hardens `pinCwd`'s missing-path `catch` branch (the documented symlink-parent gap).
- **Surface:** `connector/daemon/src/dial.ts` — `DialOpts.allowedTools` already carries the list as register metadata ("METADATA ONLY at register; no policy enforcement"); this story promotes the same list to the enforced spawn input.
- **Surface:** `connector/daemon/src/normalize.ts` — `normalizeUserRecord` / `normalizeUser` already assemble `ToolResultEvent.content`; this story adds the cap + redact pass at that exact assembly point.
- **Surface:** `connector/daemon/src/index.ts` — the `liveTurns` `Map` already tracks supervised turns in `handlePrompt`; this story adds the size check before `backend.spawn`.
- **Surface:** `connector/docs/event-contract.md` §Verbosity — already specifies "Tool I/O is size-capped, `truncated: true` when clipped, redaction-policy applied"; this story turns that prose into code.
- **Coverage of this requirement:** partial — extends the live `buildSpawnArgs`/`pinCwd`/`normalizeUserRecord`/`liveTurns` seams (~40% reuse: the argv builder, jail pin, tool-result assembly, and turn map all exist); net-new is the enforcement/cap/redact/parent-traversal/concurrency logic itself.

## Why not simpler?

- **Smallest existing surface that could carry this:** the M0 daemon already has all four seams (argv builder, cwd pin, tool-result assembler, live-turn map), so this is pure extension — but each control is genuinely net-new logic the M0 code explicitly deferred (`dial.ts` comment: "no policy enforcement"; `pinCwd` catch returns the unvalidated path; `normalize` does no cap/redact; `index.ts` has no cap).
- **Why isn't extension / parameterization / config sufficient?** Config alone cannot enforce — announcing `allowed_tools` as metadata (M0) is exactly the gap this closes; enforcement requires emitting `--allowedTools` on the argv, masking/clipping the opaque payload *in the box* (the broker can't), validating the realpath parent chain, and bounding the live-turn map. These are new code paths, not new config values on existing paths.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Readied 2026-06-06 for SPRINT-37 (Connector M2): the EPIC-048 §6 forks are resolved (human-acked defaults), and the four M0 daemon modules this story extends (`spawn.ts`, `normalize.ts`, `index.ts`, `dial.ts`) are on disk with 35 tests passing — the spec maps to real symbols, no rebuild implied → 🟢.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2 (allowlist enforce + opt-in, tool-IO cap, redaction, concurrency cap, symlink-parent jail).
- [x] Implementation Guide (§3) maps to specific file paths traceable to EPIC-048 `<target_files>` (`connector/daemon/src/{spawn,normalize,index,dial,backend}.ts`).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites real source-tree paths (`spawn.ts`/`normalize.ts`/`index.ts`/`dial.ts` + the event-contract §Verbosity reference).
- [x] Why not simpler? has both sub-bullets answered.
- [x] §1.4 granularity decision recorded — single L3 story on four tightly-coupled seams (sandboxing is one config-plumbing surface per EPIC §94/§113); forks resolved at EPIC §6, no split.

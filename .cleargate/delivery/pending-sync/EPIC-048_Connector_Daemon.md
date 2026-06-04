---
epic_id: EPIC-048
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🔴 High
context_source: INITIATIVE-001 triage + connector/PRD.md v0.3.1 + connector/docs/{event-contract,spike-findings-claude-2.1.161,envelope-protocol}.md + verified codebase grounding + recorded direct approval
owner: Sandro
target_date: 2026-08-15
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
      detail: "OR-group failed — all alternatives failed: parent-approved-proposal: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter; parent-approved-initiative: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter"
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: cleargate-cli/src/commands/mcp-serve.ts, cleargate-cli/src/auth/acquire.ts, cleargate-cli/src/auth/token-store.ts, cleargate-cli/src/auth/factory.ts, connector/docs/event-contract.md, connector/docs/spike-findings-claude-2.1.161.md"
  last_gate_check: 2026-06-03T22:18:34Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-048
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T06:05:59Z
  sessions: []
---

# EPIC-048: Connector Daemon

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Build the local Node/TS daemon that dials out to the broker, spawns `claude` per turn, normalizes its stream into the event contract, and tears turns down cleanly — co-located with Claude Code on the user's machine.</objective>
  <architecture_rules>
    <rule>Node/TS, shipped as an optional ClearGate companion (default off); reuse cleargate-cli auth plumbing (acquire.ts, token-store keychain). No runtime code enters the shipped npm planning payload.</rule>
    <rule>Spawn-per-turn: claude -p "<prompt>" --output-format stream-json --verbose --include-partial-messages < /dev/null. The /dev/null is mandatory; --include-partial-messages is required for token deltas.</rule>
    <rule>Allowlist-map known record types → event contract; LOG unmapped types (drift); never forward raw stream-json. Pinned to claude 2.1.161 — snapshot shapes as CI fixtures, re-verify on upgrade.</rule>
    <rule>EOF is the terminus, not `result` (multiple results per turn). Detect errors via is_error, never subtype. Render text from text_delta only.</rule>
    <rule>Cancel = staged process-tree teardown (SIGTERM→grace→SIGKILL + independent descendant reap). A bare process.kill(pid) orphans detached children on Linux.</rule>
  </architecture_rules>
  <target_files>
    <file path="connector/daemon/src/dial.ts" action="create" />
    <file path="connector/daemon/src/turn-runner.ts" action="create" />
    <file path="connector/daemon/src/normalize.ts" action="create" />
    <file path="connector/daemon/src/teardown.ts" action="create" />
    <file path="connector/daemon/src/sessions.ts" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
The Connector is the half that actually runs Claude Code where the user's workspace, login, and local MCP servers live. It's the only component that touches `claude`, so it owns the fragile, version-sensitive job of turning raw `stream-json` into a stable, app-renderable event contract — and of never leaving an orphaned process behind.

**Success Metrics (North Star):**
- A turn streams normalized events end-to-end matching the v0.1 contract; raw `stream-json` is never forwarded.
- **Zero orphaned `claude` or child processes** after cancel/disconnect/crash (incl. background tasks).
- Session resume works via `--resume`; metrics match the CLI's own figures within a small margin.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] WS dial-out to the broker + register (announce `protocol_version`) + reconnect/re-attach by `connection_id`, with **full-jitter backoff** (spreads the post-deploy reconnect storm across the drain window so 100 connectors don't re-verify simultaneously) and **resume-from-`seq`** (re-attach a turn from the last delivered `seq`, pairing with the broker's bounded replay ring so a drop is a hiccup, not a lost turn).
- [ ] Spawn-per-turn with the exact verified command; map content blocks → `turn_start`/`thinking_delta`/`text_delta`/`tool_use`/`tool_result`/`turn_result`/`error`/`stream_end`.
- [ ] Multi-result/EOF lifecycle: read to stdout EOF, emit `stream_end` + `turn_end`; never treat first `result` as terminal.
- [ ] Staged process-tree teardown on cancel/disconnect/exit; independent descendant tracking + reap.
- [ ] Sessions delegated to `claude`: new (no `--resume`), continue (`--resume <id>`), list (top-level `<id>.jsonl` only, exclude `subagents/` + memory artifacts).
- [ ] Metrics from `result.modelUsage.<model>` + `total_cost_usd`; `context_pct` from in-stream `contextWindow`. Per-agent via `task_*`/`parent_tool_use_id`.
- [ ] Config-driven sandboxing: `--allowedTools` (default Read/Grep/Glob), pinned working dir, permission mode, concurrency cap.
- [ ] CI fixtures snapshotting `system/task_*` + `modelUsage` shapes; unmapped-type logging.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- The broker / registry / routing (→ EPIC-046) and credential minting (→ EPIC-047).
- The `cleargate connector` onboarding command + companion packaging (→ later onboarding epic).
- Persistent stdin-stream spawn mode, mid-turn steering / permission prompts (v0.2).
- Connector-owned session or history store (delegated to `claude`).
- Multi-backend (Gemini/Codex) probing.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Version | Pinned to `claude` 2.1.161; shapes are undocumented + version-sensitive → CI fixtures + re-verify on upgrade |
| Process hygiene | No orphans — staged tree teardown mandatory; macOS "graceful reap" does NOT generalize to Linux (GH #19045 unverified) |
| Stream | EOF is terminus; errors via `is_error` not `subtype`; render text from `text_delta` only (double-emit) |
| Stdin | `< /dev/null` mandatory or 3s stall |
| Boundary | Optional companion; never in the shipped npm planning payload |

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `cleargate-cli/src/commands/mcp-serve.ts` — existing long-lived **stdio↔HTTP proxy that already parses SSE `data:` frames**; the nearest prior art for a long-lived local bridge + stream parsing.
- **Surface:** `cleargate-cli/src/auth/acquire.ts`, `cleargate-cli/src/auth/token-store.ts`, `cleargate-cli/src/auth/factory.ts` — token acquisition + OS-keychain storage; reused for the native-lane credential the daemon presents at register.
- **Surface:** `connector/docs/event-contract.md` + `connector/docs/spike-findings-claude-2.1.161.md` — the verified mapping rules + gotchas seed `normalize.ts`/`turn-runner.ts`.
- **Coverage of this epic's scope:** **partial** — auth + stream-parse plumbing is reusable (~40%), but the `claude` spawn/normalize/teardown core is net-new.

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this epic:** `mcp-serve.ts`'s long-lived-process + stream-parse pattern is the closest, but it proxies stdio to HTTP — it neither spawns `claude` nor normalizes its records nor manages process trees.
- **Why isn't extension / parameterization / config sufficient?** None of the existing surfaces spawn or supervise `claude`, and the spike proved the work is genuinely hard where it counts (multi-result EOF lifecycle, detached-child teardown, undocumented `task_*`/`modelUsage` shapes). This is net-new supervision + normalization logic; cloning won't carry it.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `connector/daemon/**` — dial-out, turn runner, normalizer, teardown, sessions. Create.
- Reuses `cleargate-cli/src/auth/*` plumbing (imported or factored to a shared lib — **open Q §6**).
- `connector/daemon/test/fixtures/**` — captured `stream-json` snapshots for the normalizer (drift detection).

**Data Changes:**
- None server-side (transit-only). Session/history delegated to `claude`'s `~/.claude/projects/**`.

## 5. Acceptance Criteria

```gherkin
Feature: Connector Daemon
  Scenario: Normalize a turn to EOF
    Given the daemon receives a prompt for turn T
    When it spawns claude and reads the stream-json to stdout EOF
    Then it emits normalized events for T and a final stream_end + turn_end(T)
    And it never forwards raw stream-json

  Scenario: Multiple results in one turn
    Given a prompt that triggers a background task (two result events)
    When the daemon processes the stream
    Then it does not close the turn on the first result
    And it closes only at stdout EOF

  Scenario: Staged teardown leaves no orphans
    Given a turn with a detached background child process
    When the turn is cancelled
    Then the daemon SIGTERMs, waits grace, SIGKILLs, and reaps the full descendant tree
    And no claude or child process survives

  Scenario: Resume recalls context
    Given a prior session_id
    When the daemon runs a turn with --resume <session_id>
    Then context is preserved
```

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** "Reuse `cleargate-cli/src/auth/*` by importing it, or factor it into a shared `@cleargate/auth` lib both the CLI and daemon depend on?" — **Human Answer:** {Waiting}
- **AI Question:** "Daemon repo layout: `connector/daemon` sub-package now, or its own `@cleargate/connector` package from the start?" — **Human Answer:** {Waiting}
- **AI Question:** "Linux/Docker teardown is unverified (GH #19045) — should this epic include a teardown verification spike on Linux as a gating story?" — **Human Answer:** {Waiting}
- **AI Question:** "Default verbosity `tools` (text + tool I/O), with `full`/`text` configurable — confirm?" — **Human Answer:** {Waiting}

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

---
story_id: STORY-058-10
parent_epic_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-09-04T00:00:00Z
ambiguity: 🟢 Low
context_source: Decomposition of [[EPIC-058]] on direct owner instruction 2026-09-04. Grounded in verified cleargate-cli source paths and Codex CLI v0.153.2 documented contracts; no path in this story is inferred.
actor: Codex user
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-11T22:25:54Z
created_at_version: cleargate@0.26.1
updated_at_version: 11c29fd3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-11T22:29:13Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-058-10
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-24T22:38:30Z
  sessions: []
---

# STORY-058-10: Codex payload surfaces: hooks.json, config.toml MCP, and AGENTS.md injection

**Milestone:** M5 — Codex adapter

## 1. The Spec (The Contract)

### 1.1 User Story
As a developer who uses OpenAI Codex, I want `cleargate init --host codex` to install a working ClearGate scaffold for Codex, so that I get the same planning discipline Claude Code users get.

### 1.2 Detailed Requirements
- Install `.codex/hooks.json` registering the ClearGate hooks against Codex's documented events: `SessionStart`, `PreToolUse` (matchers `Edit|Write|apply_patch`), `PostToolUse`, and `SubagentStop`.
- Register the ClearGate MCP server as `[mcp_servers.cleargate]` in `.codex/config.toml`, preserving every unrelated key and refusing to overwrite a malformed TOML file.
- Inject a Codex-correct ClearGate bounded block into `AGENTS.md` using the same block markers and generalized injection mechanics as `CLAUDE.md`; do not copy Claude-specific content verbatim.
- Emit `[features] hooks = true` explicitly as the ClearGate install contract and verify it after install. Current Codex builds enable hooks by default; this explicit setting is a reproducibility choice, not a claim that current defaults disable hooks.
- Explain workspace trust for project `.codex/**` configuration and hash-based trust for the exact hook commands/content. Do not claim that AGENTS.md discovery is disabled by workspace distrust: instruction discovery is a separate contract.
- Hook scripts are shared, not duplicated: `.codex/hooks.json` points at the same scripts the Claude adapter installs.
- Each shared hook script's block/allow decision is resolved through one normalized `cleargate hook signal <block|allow>` CLI handler that maps a single internal outcome to whatever signal the invoking host actually requires — not a hardcoded exit code assumed to work for both hosts unverified. See §3.2.
- `pending-task-sentinel.sh`'s flashcard write-gate and `pre-tool-use-task.sh`'s CR-026 dispatch attribution key off Claude's `Task|Agent` PreToolUse matcher (`cleargate-planning/.claude/settings.json`). This story's `.codex/hooks.json` registration list above names no Codex matcher for a subagent-dispatch tool call. Verify against the installed Codex binary whether one exists; test the documented `Agent` matcher for `spawn_agent` against the pinned binary. Preserve deny-before-dispatch and exactly-once attribution, without relying on ordering between concurrently executed hooks. If this cannot be proven, record a blocker for STORY-058-13 rather than quietly waiving enforcement (§1.4 OQ3).

### 1.3 Out of Scope
- Agent TOML codegen and skills translation — [[STORY-058-11]].
- Token-ledger metering for Codex — deferred from SPRINT-41 pending verification of `SubagentStop` availability and the Codex transcript schema.
- Windows validation — deferred from this sprint; do not infer unsupported runtime behavior from that scope choice.
- Verified token usage is distinct from dispatch identity. Unavailable usage may be disclosed; required flashcard gating and dispatch identity may not be silently dropped. Missing host support must block the final enforcement-parity claim.
- `.codex/rules/**` — explicitly deferred from SPRINT-41; the epic retains command-policy work for later decomposition before epic close. Do not emit speculative rules or represent command rules as per-role tool allowlists.

### 1.4 Resolved Decisions

Owner continuation on 2026-09-11T22:19:09Z approves these choices:

1. Pin live verification to standalone Codex `0.154.0-alpha.6.2`. Current documentation lists `SubagentStart`/`SubagentStop`; prove actual firing against that binary before using them for dispatch identity. Per-subagent token usage remains deferred and must be labelled unavailable when not verifiable.
2. Use `AGENTS.md`, not a `CLAUDE.md` fallback. Share injection mechanics, with host-correct bounded-block content.
3. Exercise the documented `Agent` alias for `spawn_agent` in a real session. Register the shared gate and attribution path only with tests proving a denial prevents dispatch and an allowed dispatch has correct identity. Matching command hooks can execute concurrently: use explicit ordering in one normalized path where needed, not separate-hook registration order. Missing mandatory enforcement blocks STORY-058-13 and the sprint's Codex-port goal.
4. Defer `.codex/rules/**` from SPRINT-41 explicitly; retain epic-level ownership for subsequent decomposition. No guessed command-policy rules or tool-boundary parity claim.

Contract references (checked 2026-09-11): [Codex hooks](https://learn.chatgpt.com/docs/hooks), [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), and [command rules](https://learn.chatgpt.com/docs/agent-configuration/rules). Runtime proof remains required.

### 1.5 Risks
- **No `CLAUDE_PROJECT_DIR` equivalent.** Codex passes context only on stdin; `cwd` is the nearest thing. The shared hooks reference `CLAUDE_PROJECT_DIR` 11 times. [[STORY-058-11]] carries the shim; this story must not silently install hooks that cannot resolve their repo root.
- The 32 KiB `project_doc_max_bytes` cap covers the whole merged AGENTS.md chain. The ClearGate block is ~11 KB, so it consumes about a third of the user's budget before their own content.
- TOML surgery is a new file format for this codebase. `.mcp.json` merging is well-trodden; `.codex/config.toml` is not, and a naive rewrite loses comments and key order.
- **Block-signal mismatch is real, not hypothetical — verified by reading the scripts.** `pre-edit-gate.sh` blocks by `exit 1` in enforce mode (line 166); `pending-task-sentinel.sh` blocks by `exit 1` for the flashcard gate (line 160). Neither is `exit 2`. The official Claude Code hooks reference was checked on 2026-09-11 and is unambiguous: for PreToolUse, `exit 2` (or a JSON `permissionDecision: "deny"`) is the only signal that blocks, and a bare `exit 1` with no JSON on stdout is treated as a **non-blocking** error — the tool call proceeds. Neither script emits any JSON decision. So both gates are fail-open **on the Claude host today**, before Codex enters the picture; that half is filed as [[BUG-089]] and this story consumes its normalized handler rather than duplicating the fix. `stamp-and-gate.sh` never blocks at all (always `exit 0` by explicit design — line 60: "ALWAYS 0 — severity enforcement is at wiki lint, not hook") and must not be read as evidence the shared scripts already gate correctly under either host. Porting `pre-edit-gate.sh`/`pending-task-sentinel.sh` unchanged risks every gate failing open under Codex regardless of which signal Codex actually requires, because neither script's block signal was confirmed against a real host contract in the first place. `pre-commit-surface-gate.sh`'s three `exit 1`s are a **git** pre-commit hook (`.git/hooks/pre-commit`), not a Claude/Codex host hook — out of this reconciliation's scope on either host.
- **`AGENTS.md` block content is not host-neutral.** The bounded-block text injected today (`cleargate-planning/CLAUDE.md`) hardcodes `.claude/` paths (e.g. `.claude/skills/sprint-execution/SKILL.md`) and Claude-specific tool names (e.g. "the Skill tool"). Generalizing the injector (§3.1) makes the block land in `AGENTS.md`, but does not make its content correct for a Codex repo. The resolved contract shares injection mechanics, not Claude-specific content; test the rendered block for stale paths and tool names.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Codex payload surfaces

  Scenario: Codex install produces the documented surfaces
    Given a fresh target repository
    When `cleargate init --host codex` runs
    Then .codex/hooks.json is created registering the ClearGate hooks
    And .codex/config.toml contains an mcp_servers.cleargate entry
    And AGENTS.md contains the ClearGate bounded block

  Scenario: Existing Codex config is preserved
    Given a .codex/config.toml containing unrelated user keys and MCP servers
    When the Codex adapter registers the ClearGate server
    Then every unrelated key and server is preserved
    And only the cleargate entry is added or replaced

  Scenario: Malformed config is refused, not overwritten
    Given a .codex/config.toml containing invalid TOML
    When the Codex adapter attempts to register
    Then it exits non-zero naming the file
    And the malformed file is unmodified

  Scenario: Hook scripts are shared, not duplicated
    Given an install with both claude and codex
    When the two hook configurations are compared
    Then both reference the same hook script files
    And no hook script is duplicated per host

  Scenario: Feature flag and trust requirements are surfaced
    Given a Codex install completes
    When the install output is read
    Then it states that [features] hooks = true is required
    And it explains workspace configuration trust and exact-hook trust separately from AGENTS.md discovery

  Scenario: A gate actually blocks under Codex, not just under Claude Code
    Given a Codex install with pre-edit-gate.sh registered against PreToolUse for Edit|Write|apply_patch
    And the planning-first gate is in enforce mode with no approved story covering the edited file
    And the fixture has no active-sprint bypass
    When a real Codex session attempts to edit that file
    Then Codex refuses the edit
    And the refusal reason from pre-edit-gate.sh is visible to the Codex session
    And the same scenario re-run against Claude Code also blocks, proving the block signal is host-correct on both sides, not merely non-erroring

  Scenario: Codex feature-flag state is machine-verified, not only announced
    Given a Codex install has completed
    When cleargate doctor (or the clean-room verify-install driver) runs against that install
    Then it reads .codex/config.toml and reports whether [features] hooks = true is actually set
    And it warns rather than silently passing if the flag is absent or false
```

### 2.2 Verification Steps (Manual)
- [ ] Install `--host codex` into a clean room; start a real Codex session and confirm the hooks fire.
- [ ] Pre-seed `.codex/config.toml` with user MCP servers and comments; re-run and diff.
- [ ] Corrupt the TOML deliberately and confirm the refusal.
- [ ] Deliberately trigger a blocking gate (e.g. edit a file with no approved story covering it) in the real Codex session from the first step and confirm the edit is refused, not merely logged.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File (new) | `cleargate-cli/src/hosts/codex.ts` |
| Related Files | `cleargate-cli/src/init/inject-claude-md.ts`, `cleargate-cli/src/hooks/hook-signal.ts` |
| New Files Needed | `cleargate-cli/scaffold/hosts/codex/**`, `cleargate-cli/src/init/inject-codex-config.ts`, `cleargate-cli/scaffold/hosts/codex/agents-md-block.md` |

- `cleargate-cli/scaffold/hosts/codex/**` — **create**. `.codex/hooks.json` template and the `AGENTS.md` block source.
- `cleargate-cli/src/hosts/codex.ts` — **create**. The Codex adapter.
- `cleargate-cli/src/init/inject-claude-md.ts` — **modify**. Generalize the bounded-block injector to serve both `CLAUDE.md` and `AGENTS.md`.
- `cleargate-cli/src/init/inject-codex-config.ts` — **create**. TOML-preserving `[mcp_servers.cleargate]` registration.
- `cleargate-cli/src/hooks/hook-signal.ts` — **extend the BUG-089 M0 implementation**, not create a second handler. `resolveHookSignal({ host, decision })` (the name BUG-089 ships; clarified 2026-09-25): maps one internal `block`/`allow` outcome to the host-correct signal (exit code, and any JSON decision field the host contract needs). `pre-edit-gate.sh` and `pending-task-sentinel.sh` call it via a new `cleargate hook signal <block|allow>` CLI verb instead of hardcoding `exit 1`.
- `cleargate-cli/scaffold/hosts/codex/agents-md-block.md` — **create**. Host-parameterized source for the AGENTS.md bounded block: the same content as `cleargate-planning/CLAUDE.md`'s injected block with `.claude/` paths and Claude-specific tool names (e.g. "the Skill tool") replaced by their Codex-correct equivalents.

### 3.2 Technical Logic
Codex's hook contract shares event names and stdin JSON keys with Claude Code's (`session_id`, `transcript_path`, `cwd`, `hook_event_name`, `tool_name`, `tool_input`), but **the block signal is not what the shared scripts emit today, on either host.** Reading the actual scripts (not their doc comments) shows: `pre-edit-gate.sh` blocks by `exit 1` in enforce mode (line 166); `pending-task-sentinel.sh` blocks by `exit 1` for the flashcard gate (line 160); `pre-commit-surface-gate.sh` blocks by `exit 1` (lines 18, 41, 59) but is a **git** pre-commit hook invoked by `.git/hooks/pre-commit`, not a Claude/Codex host hook at all, so it sits outside this reconciliation on either host; `stamp-and-gate.sh` never blocks — it always exits 0 by explicit design (line 60: "ALWAYS 0 — severity enforcement is at wiki lint, not hook") and is not evidence that the shared scripts already gate correctly under Claude Code, let alone Codex.

The adapter still registers the *same* two blocking scripts (`pre-edit-gate.sh`, `pending-task-sentinel.sh`) against Codex rather than shipping forks — per-host forks are exactly what EPIC-058's "Normalize Claude, Copilot, and Codex lifecycle payloads into shared CLI hook handlers" scope item rules out. What changes is *how* a script signals block: each script's blocking branch calls the BUG-089 `cleargate hook signal block --host <host>` (allow path: `cleargate hook signal allow --host <host>`) CLI verb — implemented once in `cleargate-cli/src/hooks/hook-signal.ts` — that resolves the invoking host and exits with, or emits, whatever that host's real contract requires. For Claude Code that resolution is `exit 2` (or `hookSpecificOutput.permissionDecision: "deny"`), per the hooks reference; today's bare `exit 1` blocks nothing there either, which is [[BUG-089]]. Codex's resolution must be confirmed against the installed binary, not inferred from Claude's. This story may not assert the host-correct signal from documentation alone: §4.2's real-Codex-session requirement must specifically exercise the blocked path (a PreToolUse gate actually refusing an edit), not merely confirm the hooks are wired and silent.

TOML surgery must be format-preserving. Parse, modify the single `[mcp_servers.cleargate]` table, and re-emit with unrelated keys, comments, and ordering intact; on a parse failure, refuse and exit non-zero rather than rewriting. This mirrors `inject-mcp-json.ts`'s existing non-destructive contract for `.mcp.json`.

### 3.3 API Contract (if applicable)
```toml
[mcp_servers.cleargate]
command = "npx"
args = ["-y", "cleargate@<pinned>", "mcp", "serve"]
```
Mirrors the `.mcp.json` entry the Claude adapter writes today.

## Task Breakdown

- [ ] Generalize the bounded-block injector to take a target filename.
- [ ] Create the Codex payload root with `.codex/hooks.json` referencing the shared hook scripts.
- [ ] Implement format-preserving TOML registration with malformed-file refusal.
- [ ] Implement `hosts/codex.ts` against the [[STORY-058-03]] contract.
- [ ] Surface the `[features] hooks = true` and workspace-trust requirements at install time.
- [ ] Verify in a real Codex session that the hooks fire.
- [ ] Extend BUG-089's shared signal handler and explicit host wiring for Codex; preserve fail-closed wrapper propagation and verify both hosts' real denials.
- [ ] Verify in a real Codex session that a PreToolUse gate actually **blocks** an edit (not just that the hooks fire silently on an allowed edit).
- [ ] Live-test the Agent matcher for spawn_agent; prove denied dispatch has no side effect and allowed dispatch has exactly-once identity. Do not depend on concurrent command-hook order; record missing mandatory support as an enforcement blocker.
- [ ] Add a post-install check (doctor or the clean-room driver) that reads `.codex/config.toml` and asserts `[features] hooks = true`, rather than only announcing the requirement as install-time text.
- [ ] Author the AGENTS.md bounded-block content host-parameterized so it does not hardcode `.claude/` paths or Claude-specific tool names into a Codex install.
- [x] Record `.codex/rules/**` as explicitly deferred from SPRINT-41, retained under EPIC-058 for later decomposition.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | AGENTS.md injection; TOML preserve; TOML malformed refusal; hooks.json event/matcher shape; shared-script referencing; `cleargate hook signal` host-outcome mapping |
| Integration tests | 2 | `--host codex` full install shape; pre-seeded user config preserved |
| E2E / acceptance tests | 3 | Real clean-room hook firing; edit denial with positive control; dispatch denial and allowed-dispatch attribution |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] Verified against a real Codex CLI session, not only against fixtures.
- [ ] Subagent lifecycle firing is verified on the pinned runtime; token metering limits are disclosed separately from mandatory dispatch identity.
- [ ] Actual dispatch denial and allowed-dispatch attribution are proved without a concurrent-hook ordering assumption.
- [ ] A PreToolUse gate (`pre-edit-gate.sh`) is verified to actually **block** an edit in a real Codex session, using the host-correct signal — not merely installed and silent.
- [ ] `[features] hooks = true` is asserted by an automated check (doctor or the clean-room driver), not only announced as install-time text.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/init/inject-claude-md.ts:25` — bounded-block extraction/injection, to be generalized.
- **Surface:** `cleargate-cli/src/init/inject-mcp-json.ts:37` — the non-destructive merge contract the TOML writer mirrors.
- **Surface:** `cleargate-planning/.claude/settings.json` — the event/matcher shape being translated to `hooks.json`.
- **Surface:** `cleargate-planning/.claude/hooks/pre-edit-gate.sh:166` and `cleargate-planning/.claude/hooks/pending-task-sentinel.sh:160` — the two shared scripts that intend to block (currently via non-blocking `exit 1`); §3.2's reconciliation requirement targets these two, not `stamp-and-gate.sh`, which never blocks (always `exit 0`, line 60).
- **Codex contract (external, v0.153.2 — documented, not on disk):** hooks are read from a hooks.json file under the Codex config directory, or from an inline hooks table in Codex's config TOML; MCP servers are declared as an mcp_servers table; hooks require the hooks feature flag; AGENTS.md discovery is capped by project_doc_max_bytes, default 32 KiB.

## Why not simpler?

- **Smallest existing surface:** copy `.claude/**` to `.codex/**` and rename `CLAUDE.md` to `AGENTS.md`.
- **Why isn't that sufficient?** Codex reads hooks from `hooks.json`, not `settings.json`; registers MCP servers in TOML, not `.mcp.json`; and has workspace plus exact-hook trust requirements. A copy-rename produces a directory Codex ignores entirely, and duplicating the hook scripts guarantees the two hosts drift. The adapter is what translates the three formats while keeping one script set.

## Prior work

- [[EPIC-058]] — parent epic; this story is one of its decompositions.
- [[PROPOSAL-074]] — Antigravity single-host port; the `HostAdapter` precedent EPIC-058 generalizes.
- [[SPRINT-34]] — `Polyglot Portability Hardening`; language/test-stack portability, adjacent but distinct from harness portability.
- Decomposition-time re-check 2026-09-04: `cleargate-wiki-query` returned [[EPIC-058]] and [[PROPOSAL-074]] as the only multi-host prior work; no story-level prior art exists for this scope.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
- [x] `approved: true` is set in the YAML frontmatter. (Direct owner approval 2026-09-04.)

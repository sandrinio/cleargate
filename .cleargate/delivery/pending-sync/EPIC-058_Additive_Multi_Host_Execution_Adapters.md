---
epic_id: EPIC-058
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
ambiguity: 🟡 Medium
context_source: "Direct owner request 2026-08-27: preserve the existing Claude install path, add a dedicated Copilot/Codex path, and allow all coding-agent adapters to coexist in one target repository; verified against cleargate-cli source and [[PROPOSAL-074]]."
owner: sandrinio
target_date: 2026-11-30
created_at: 2026-08-27T17:10:12Z
updated_at: 2026-08-27T17:10:12Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: parent-approved
      detail: "OR-group failed — all alternatives failed: parent-approved-proposal / parent-approved-initiative: parent_ref is unset and no parent-approval waiver is recorded. Either set parent_ref to the parent work-item id (e.g. \"INITIATIVE-002\") or to a path relative to this file, or record the waiver as proposal_gate_waiver with approved_by + approved_at (top-level approved_by + approved_at also count)"
  last_gate_check: 2026-08-27T17:13:06Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# EPIC-058: Additive Multi-Host Execution Adapters

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Make the npm-installed ClearGate scaffold natively support Claude Code, GitHub Copilot, and OpenAI Codex through additive host adapters that share one `.cleargate/**` core and can coexist in the same target repository.</objective>
  <architecture_rules>
    <rule>All production implementation and canonical npm payload sources MUST live inside the standalone `cleargate-cli` repository; the outer meta-repo and sibling `cleargate-planning/` directory MUST NOT be build-time dependencies.</rule>
    <rule>Preserve `cleargate init` as byte-compatible Claude installation behavior unless the user supplies a host flag.</rule>
    <rule>Use `--host claude`, `--host copilot`, and `--host codex` as explicit additive selectors; `--host portable` expands to Copilot plus Codex, and `--host all` expands to all three.</rule>
    <rule>Repeated host flags and comma-separated host values MUST normalize to a de-duplicated set; installing a new host MUST NOT remove or rewrite another installed host's owned files.</rule>
    <rule>One shared `.cleargate/**` planning, wiki, sprint-state, worktree, and gate surface serves every installed host; only instructions, agents, skills, hooks, permissions, and host-specific MCP configuration vary.</rule>
    <rule>Use `AGENTS.md` as the portable Copilot/Codex bootstrap, `.agents/skills/**` for shared portable skills, `.github/**` for Copilot-native assets, `.codex/**` for Codex-native assets, and retain `CLAUDE.md` plus `.claude/**` for Claude Code.</rule>
    <rule>Host hook files MUST be thin adapters into normalized `cleargate hook` CLI handlers; planning gates, wiki ingest, dispatch attribution, and ledger policy MUST NOT be reimplemented separately per host.</rule>
    <rule>Token usage is recorded only when the host supplies verifiable telemetry; unavailable usage MUST be represented explicitly and MUST NOT be synthesized as zero tokens.</rule>
    <rule>Upgrade, doctor, and uninstall MUST operate per installed-host ownership recorded in the install manifest while preserving user-authored instructions, hooks, agents, skills, and MCP servers.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/scaffold/core/**" action="create" />
    <file path="cleargate-cli/scaffold/hosts/claude/**" action="create" />
    <file path="cleargate-cli/scaffold/hosts/copilot/**" action="create" />
    <file path="cleargate-cli/scaffold/hosts/codex/**" action="create" />
    <file path="cleargate-cli/src/hosts/types.ts" action="create" />
    <file path="cleargate-cli/src/hosts/registry.ts" action="create" />
    <file path="cleargate-cli/src/hosts/claude.ts" action="create" />
    <file path="cleargate-cli/src/hosts/copilot.ts" action="create" />
    <file path="cleargate-cli/src/hosts/codex.ts" action="create" />
    <file path="cleargate-cli/src/hooks/normalized-event.ts" action="create" />
    <file path="cleargate-cli/src/hooks/handlers.ts" action="create" />
    <file path="cleargate-cli/src/commands/hook.ts" action="create" />
    <file path="cleargate-cli/src/commands/host.ts" action="create" />
    <file path="cleargate-cli/src/commands/init.ts" action="modify" />
    <file path="cleargate-cli/src/commands/upgrade.ts" action="modify" />
    <file path="cleargate-cli/src/commands/doctor.ts" action="modify" />
    <file path="cleargate-cli/src/commands/uninstall.ts" action="modify" />
    <file path="cleargate-cli/src/lib/manifest.ts" action="modify" />
    <file path="cleargate-cli/scripts/build-manifest.ts" action="modify" />
    <file path="cleargate-cli/scripts/copy-planning-payload.mjs" action="modify" />
    <file path="cleargate-cli/test/commands/init.node.test.ts" action="modify" />
    <file path="cleargate-cli/test/commands/upgrade.node.test.ts" action="modify" />
    <file path="cleargate-cli/test/commands/uninstall.node.test.ts" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
ClearGate's planning and enforcement model is broadly host-independent, but the npm package installs only Claude Code primitives: `CLAUDE.md`, `.claude/agents/**`, `.claude/skills/**`, `.claude/settings.json`, Claude hook payload assumptions, and Claude-specific lifecycle surgery. Copilot and Codex users cannot run the full ClearGate execution loop natively, and teams that alternate between coding agents cannot safely keep multiple adapters installed against the same project state.

**What are we building?**
Introduce a host-adapter architecture inside the standalone `cleargate-cli` npm repository. The existing no-flag installation remains Claude-compatible; explicit additive host flags install Copilot, Codex, a `portable` Copilot-plus-Codex profile, or all adapters. Every adapter shares one `.cleargate/**` core while owning only its native instruction, role, skill, hook, permission, and MCP surfaces.

**Success Metrics (North Star):**
- A packed `cleargate` npm artifact installs successfully with `init`, `--host claude`, `--host copilot`, `--host codex`, `--host portable`, and `--host all`, with fixture assertions covering every emitted file.
- An `--host all` target passes `cleargate doctor --host all` with Claude, Copilot, and Codex assets present simultaneously and one shared `.cleargate/**` tree.
- Adding, upgrading, or removing one host leaves byte-identical user-owned and other-host-owned files, verified by integration tests.
- One real story completes the ClearGate Architect → QA-Red → Developer → QA-Verify → DevOps loop in Copilot and one in Codex without manually copying scaffold files.
- Existing Claude-only packed-install tests and downstream behavior remain green with `cleargate init` invoked without a host flag.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Move the canonical distributable scaffold into tracked paths inside `cleargate-cli`; remove the sibling `../cleargate-planning` prebuild dependency.
- [ ] Add a typed `HostAdapter` contract and registry for `claude`, `copilot`, and `codex`.
- [ ] Add additive `cleargate init --host <value>` parsing with `portable` and `all` profile expansion, repeated flags, comma-separated values, normalization, validation, and backward-compatible no-flag behavior.
- [ ] Add `cleargate host list|add|remove` lifecycle commands for adapters after initial installation.
- [ ] Install and surgically maintain Claude assets under `CLAUDE.md` and `.claude/**`.
- [ ] Install and surgically maintain Copilot assets under `AGENTS.md`, `.agents/skills/**`, `.github/agents/**`, `.github/hooks/**`, `.mcp.json`, and `.vscode/mcp.json` where required by the supported VS Code runtime.
- [ ] Install and surgically maintain Codex assets under `AGENTS.md`, `.agents/skills/**`, `.codex/agents/**`, `.codex/hooks.json`, `.codex/config.toml`, and `.codex/rules/**` where command policy requires them.
- [ ] Convert the current ClearGate roles to native Copilot and Codex definitions while preserving role boundaries and structured handoff schemas.
- [ ] Split shared skills from host-specific sprint dispatch instructions; keep flashcard and other portable skills single-source.
- [ ] Normalize Claude, Copilot, and Codex lifecycle payloads into shared CLI hook handlers.
- [ ] Extend install-manifest ownership, drift detection, upgrade, restart warnings, doctor, pruning, and uninstall to operate on a set of installed hosts.
- [ ] Add packed-tarball integration tests and documented real-runtime smoke runs for Copilot CLI, VS Code Copilot, and Codex CLI.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Supporting Antigravity, Cursor, Windsurf, Cline, Aider, or hosts other than Claude Code, GitHub Copilot, and OpenAI Codex.
- Replacing the target repository's build system, test runner, CI provider, or deployment tooling.
- Giving different hosts separate work-item stores, wikis, sprint state, or `.cleargate/**` directories.
- Allowing two hosts to concurrently own or mutate the same active story/worktree; adapters may coexist, but existing worktree/story ownership remains exclusive.
- Guaranteeing per-subagent token cost when a host does not expose verifiable usage telemetry.
- Depending on Copilot's Claude-compatibility importer or Codex `/import` as the permanent installation mechanism.
- Writing user-global configuration under home-directory host folders; installation remains repository-local.
- Importing Claude, Copilot, Codex, or editor SDKs into the CLI; adapters use documented file and process contracts.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Backward compatibility | `cleargate init` with no `--host` must preserve the current Claude-only result and existing install snapshots without requiring migration flags. |
| Packaging | `npm run prebuild`, `npm pack`, and published installation must succeed from the standalone `cleargate-cli` checkout without the outer meta-repo or sibling `cleargate-planning/`. |
| Coexistence | Shared `AGENTS.md` and `.agents/skills/**` files have multiple host consumers; they need one owner (`core`) in the manifest, not duplicate Copilot/Codex ownership. |
| Hook compatibility | Hook event names, payload keys, decision output, matcher behavior, and session timing differ by host and client; fixture-tested normalization is mandatory. |
| Configuration safety | JSON, JSONC, and TOML updates must preserve unrelated user configuration and refuse destructive replacement of malformed files. |
| Token accounting | Claude transcript parsing cannot be reused as proof of Copilot or Codex usage; ledger rows must distinguish measured, partial, and unavailable metering. |
| Security | Repository hook commands use pinned `cleargate` versions and must not interpolate untrusted hook payload fields into shell commands. |
| Runtime support | Copilot CLI and VS Code Copilot are separate clients with overlapping but non-identical instruction, hook, and MCP discovery rules; both require smoke coverage. |

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/init.ts:188` — current scaffold installer, hook merge, `CLAUDE.md` injection, and `.mcp.json` registration; this is the primary extension point for host selection.
- **Surface:** `cleargate-cli/src/init/copy-payload.ts:120` — recursive payload copier with pin substitution and first-install-only policy; reusable for shared core and host payload roots after ownership-aware filtering.
- **Surface:** `cleargate-cli/src/init/inject-claude-md.ts:25` — bounded ClearGate block extraction/injection; generalize it for both `CLAUDE.md` and `AGENTS.md`.
- **Surface:** `cleargate-cli/src/init/merge-settings.ts:48` — non-destructive Claude hook merge; preserve as the Claude adapter implementation while adding native Copilot/Codex mergers.
- **Surface:** `cleargate-cli/src/init/inject-mcp-json.ts:37` — stable `.mcp.json` merge for the ClearGate server; reuse for the portable/Copilot surface.
- **Surface:** `cleargate-cli/src/lib/manifest.ts:36` — manifest entry model and drift engine; extend entries with host ownership and snapshots with installed-host sets.
- **Surface:** `cleargate-cli/scripts/build-manifest.ts:36` — payload tier classifier currently hard-coded to `.claude/**`; generalize for core and all adapter paths.
- **Surface:** `cleargate-cli/src/commands/upgrade.ts:208` — Claude-specific instruction/settings surgery and session-loaded path handling; route these behaviors through adapters.
- **Surface:** `cleargate-cli/src/commands/uninstall.ts:325` — Claude-specific marker validation and hook cleanup; replace with selected-host cleanup plus shared-core preservation policy.
- **Surface:** `cleargate-cli/src/lib/scaffold-source.ts:27` — local scaffold validation currently requires `.claude`, `.cleargate`, and `CLAUDE.md`; validate the new tracked core/host source layout instead.
- **Coverage of this epic's scope:** Partial. The CLI already has safe copying, bounded-block injection, JSON merging, manifests, drift, upgrade, doctor, and uninstall, but each lifecycle path assumes one Claude-shaped payload and no host ownership.

## Prior work

- [[PROPOSAL-074]] defines the closest `HostAdapter` precedent and host-neutral `.cleargate/**` boundary, but targets Antigravity, assumes a single host per repository, and keeps canonical payloads outside the standalone npm repository.
- [[BUG-043]] and [[CR-105]] cover safe bounded-block placement and preservation of user prose during instruction-file updates.
- No indexed prior work fully covers additive Claude + Copilot + Codex installation, simultaneous adapters, normalized hooks, MCP variants, and per-host doctor/upgrade/uninstall.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `cleargate-cli/src/commands/init.ts:188` plus the existing payload copier, bounded-block injector, manifest, upgrade, and uninstall machinery.
- **Why isn't extension / parameterization / config sufficient?** A single `--host` branch in `init.ts` would install files once but leave upgrade, doctor, drift classification, restart warnings, pruning, uninstall, hook payload parsing, MCP formats, agent formats, and simultaneous ownership incorrect. The existing lifecycle assumes one `.claude/**` namespace and one `CLAUDE.md` surgery target. A small adapter abstraction is the minimum coherent change that prevents host conditionals from spreading across every lifecycle command while allowing multiple installed adapters to coexist.

## 4. Technical Grounding (The "Shadow Spec")
*(AI Planning Engine: Populated from verified source paths and authoritative host contracts.)*

**Affected Files:**
- `cleargate-cli/package.json` — describe multi-host support and run self-contained payload generation and host-contract tests.
- `cleargate-cli/scripts/copy-planning-payload.mjs` — copy tracked `scaffold/core` and `scaffold/hosts/*` sources instead of `../cleargate-planning`.
- `cleargate-cli/scripts/build-manifest.ts` — classify shared and host-owned files and emit ownership metadata.
- `cleargate-cli/src/cli.ts` — expose repeatable `--host` options and `host`/`hook` command groups.
- `cleargate-cli/src/commands/init.ts` — normalize requested hosts, install core once, and invoke each adapter additively.
- `cleargate-cli/src/init/copy-payload.ts` — support source subsets and manifest ownership without changing content safety behavior.
- `cleargate-cli/src/init/inject-claude-md.ts` — generalize bounded-block surgery into a host-neutral instruction helper.
- `cleargate-cli/src/init/merge-settings.ts` — remain the Claude merger behind the Claude adapter.
- `cleargate-cli/src/init/inject-mcp-json.ts` — remain the portable `.mcp.json` merger and feed the Copilot adapter.
- `cleargate-cli/src/lib/scaffold-source.ts` — validate the self-contained core/host scaffold layout.
- `cleargate-cli/src/lib/manifest.ts` — add installed hosts, entry ownership, and metering-safe backwards compatibility.
- `cleargate-cli/src/commands/upgrade.ts` — update only installed core/adapters and perform adapter-owned surgery.
- `cleargate-cli/src/commands/doctor.ts` — report core health and each installed adapter independently.
- `cleargate-cli/src/commands/uninstall.ts` — support selected adapter removal and full uninstall without cross-host deletion.
- `cleargate-cli/src/lib/session-load-delta.ts` — compare adapter-declared session-loaded configuration rather than Claude-only paths.
- `cleargate-cli/scaffold/core/AGENTS.md` — portable bounded bootstrap pointing agents to the canonical ClearGate protocol.
- `cleargate-cli/scaffold/core/.agents/skills/**` — portable skill definitions shared by Copilot and Codex.
- `cleargate-cli/scaffold/hosts/claude/**` — current Claude assets relocated into the npm repository without behavioral change.
- `cleargate-cli/scaffold/hosts/copilot/**` — Copilot agents, coordinator, hooks, and host-specific sprint skill.
- `cleargate-cli/scaffold/hosts/codex/**` — Codex TOML roles, hooks, rules, and host-specific sprint skill.

**Data Changes:**
- `.cleargate/.install-manifest.json`: add `hosts: ("claude" | "copilot" | "codex")[]`; snapshots without the field migrate logically to `["claude"]`.
- Manifest entry: add `owner: "core" | "claude" | "copilot" | "codex"` so upgrade, prune, doctor, and uninstall can scope safely.
- Dispatch and ledger records: add optional `host` and `metering: "measured" | "partial" | "unavailable"` fields; old records remain valid and imply `host: "claude"` only where the existing record format proves Claude provenance.
- Hook contract: normalize native payloads into `{ host, event, projectRoot, sessionId?, tool?, agent?, usage? }` before executing shared behavior.

## 5. Acceptance Criteria

```gherkin
Feature: Additive multi-host ClearGate installation

  Scenario: Existing no-flag install remains Claude-only
    Given a fresh target repository
    When the user runs `cleargate init`
    Then the installed core and Claude adapter match the approved Claude baseline
    And Copilot- and Codex-owned files are not created

  Scenario: Portable profile installs Copilot and Codex together
    Given a fresh target repository
    When the user runs `cleargate init --host portable`
    Then one shared `.cleargate` core is installed
    And native Copilot assets are installed
    And native Codex assets are installed
    And Claude-owned assets are not installed

  Scenario: All profile installs every adapter
    Given a fresh target repository
    When the user runs `cleargate init --host all`
    Then Claude, Copilot, and Codex adapters are all registered
    And `AGENTS.md`, `CLAUDE.md`, shared skills, and host-specific roles coexist
    And `cleargate doctor --host all` reports every adapter healthy

  Scenario: Host selectors are additive and idempotent
    Given a repository installed with the Claude adapter
    When the user runs `cleargate host add copilot` twice
    Then Copilot is recorded once in the installed-host set
    And Claude-owned files remain byte-identical
    And no duplicate ClearGate hook or instruction entries are created

  Scenario: Repeated and comma-separated flags normalize to one set
    Given a fresh target repository
    When the user runs `cleargate init --host claude --host copilot,codex --host copilot`
    Then the installed-host set is exactly Claude, Copilot, and Codex
    And each adapter is installed once

  Scenario: Removing one adapter preserves the rest
    Given a repository with all adapters installed
    When the user runs `cleargate host remove copilot`
    Then only ClearGate-owned Copilot entries and files are removed
    And Claude, Codex, shared core, user instructions, user hooks, and user MCP servers remain unchanged

  Scenario: Malformed host configuration is not overwritten
    Given an existing host configuration file containing invalid JSON, JSONC, or TOML
    When ClearGate attempts to add that host
    Then the command exits non-zero with the exact file named
    And the malformed file is not modified
    And previously installed hosts remain usable

  Scenario: Upgrade understands legacy Claude snapshots
    Given a valid install snapshot created before the `hosts` field existed
    When the user runs `cleargate upgrade`
    Then the snapshot is interpreted as a Claude installation
    And the Claude adapter and shared core upgrade safely
    And Copilot or Codex assets are not added implicitly

  Scenario: Hooks produce the same planning behavior across hosts
    Given equivalent native file-edit hook fixtures for Claude, Copilot, and Codex
    When each fixture passes through its adapter normalizer
    Then the shared pre-edit and post-edit handlers receive equivalent normalized events
    And the same planning gate and stamp-gate-ingest decisions result

  Scenario: Unavailable token telemetry is explicit
    Given a Copilot or Codex subagent stop event without verifiable token usage
    When ClearGate writes a ledger record
    Then the record uses `metering: "unavailable"` with nullable usage fields
    And no zero-token measured total is fabricated

  Scenario: Published package is self-contained
    Given a clean standalone checkout of `cleargate-cli`
    When `npm run prebuild`, `npm run build`, and `npm pack` run
    Then no file outside the checkout is read
    And the packed tarball contains the core plus all three host payloads
    And installing from that tarball passes the Claude, portable, and all-host fixtures
```

## 6. AI Interrogation Loop (Human Input Required)

No unresolved questions. The following decisions are integrated throughout this Epic:

- `--host portable` installs Copilot + Codex; `--host all` installs Claude + Copilot + Codex; explicit individual selectors remain available.
- `cleargate host remove <host>` ships in v1 so additive adapters can be surgically removed.
- Claude-only installs do not receive `AGENTS.md`; the no-flag Claude result remains backward-compatible.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified existing file paths; proposed files are explicitly marked as creates in §0.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 placeholder decisions exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? identifies the smallest existing surface and justifies the abstraction.

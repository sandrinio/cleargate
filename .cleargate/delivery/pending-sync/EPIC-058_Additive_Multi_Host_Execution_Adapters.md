---
epic_id: EPIC-058
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-09-04T00:00:00Z
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-09-04T00:00:00Z
  reason: Direct owner approval 2026-09-04. This epic was requested directly by the owner with sharp intent and inline references; no upstream proposal or initiative exists to point parent_ref at. Recorded per the documented direct-approval waiver path rather than authoring a retrospective proposal.
ambiguity: 🟢 Low
context_source: "Direct owner request 2026-08-27: preserve the existing Claude install path, add a dedicated Copilot/Codex path, and allow all coding-agent adapters to coexist in one target repository; verified against cleargate-cli source and [[PROPOSAL-074]]. AMENDED 2026-09-04 on direct owner request: add clean-room install verification as a first-class requirement — a newly created empty directory under ~/Documents/Dev/ is installed from the packed artifact and Claude Code is re-verified there as the regression baseline. Codex surface re-verified 2026-09-04 against Codex CLI v0.153.2 docs (hooks.json event/payload parity with Claude Code, .codex/agents/*.toml, .agents/skills/**, [mcp_servers] TOML, AGENTS.md 32 KiB project_doc_max_bytes cap, no CLAUDE_PROJECT_DIR equivalent)."
owner: sandrinio
target_date: 2026-11-30
created_at: 2026-08-27T17:10:12Z
updated_at: 2026-09-11T22:25:54Z
created_at_version: cleargate@0.24.2
updated_at_version: 11c29fd3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-11T22:29:15Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-058
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-04T08:19:13Z
  sessions: []
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
    <rule>No change to install, upgrade, doctor, or uninstall is DONE until it has been validated by a CLEAN-ROOM install: a newly created empty directory outside this repository, installed from the packed artifact, exercised by a real host session. Green unit and fixture tests are necessary but NOT sufficient evidence.</rule>
    <rule>Claude Code is the REGRESSION BASELINE, not merely one adapter among three. Every clean-room run MUST re-verify the Claude path — no-flag install and `--host all` — and any Claude-observable behavior change is a release blocker regardless of whether Copilot or Codex work.</rule>
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
    <file path="cleargate-cli/src/commands/verify-install.ts" action="create" />
    <file path="cleargate-cli/test/e2e/clean-room-claude-baseline.integration.node.test.ts" action="create" />
    <file path=".cleargate/knowledge/clean-room-verification.md" action="create" />
    <file path="cleargate-cli/test/integration/foreign-repo.integration.node.test.ts" action="modify" />
    <file path="cleargate-cli/test/e2e/dogfood-install.integration.node.test.ts" action="modify" />
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
- One real story completes the ClearGate Architect → QA-Red → Developer → QA-Verify → DevOps loop in Copilot and one in Codex without manually copying scaffold files. SPRINT-41's Codex witness requires both loop transport and enforcement parity: mandatory hooks must fire and deny negative controls; disclosed missing enforcement is not a passing port. Unverifiable token usage is explicitly unavailable, never synthesized.
- Existing Claude-only packed-install tests and downstream behavior remain green with `cleargate init` invoked without a host flag.
- A clean-room install into a newly created empty directory outside this repository succeeds for `cleargate init` with no host flag and reproduces the approved Claude baseline in a real Claude Code session: SessionStart banner, PreToolUse/PostToolUse hooks firing, agents and skills discoverable by name, and `cleargate doctor` clean.
- The same clean-room procedure re-run with `--host all` reproduces that Claude baseline unchanged, proving the Codex and Copilot surfaces are inert from Claude's perspective.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Move the canonical distributable scaffold into tracked paths inside `cleargate-cli`; remove the sibling `../cleargate-planning` prebuild dependency.
- [ ] Add a typed `HostAdapter` contract and registry for `claude`, `copilot`, and `codex`.
- [ ] Add additive `cleargate init --host <value>` parsing with `portable` and `all` profile expansion, repeated flags, comma-separated values, normalization, validation, and backward-compatible no-flag behavior.
- [ ] Add `cleargate host list|add|remove` lifecycle commands for adapters after initial installation.
- [ ] Install and surgically maintain Claude assets under `CLAUDE.md` and `.claude/**`.
- [ ] Install and surgically maintain Copilot assets under `AGENTS.md`, `.agents/skills/**`, `.github/agents/**`, `.github/hooks/**`, `.mcp.json`, and `.vscode/mcp.json` where required by the supported VS Code runtime.
- [ ] Install and surgically maintain Codex assets under `AGENTS.md`, `.agents/skills/**`, `.codex/agents/**`, `.codex/hooks.json`, and `.codex/config.toml`. `.codex/rules/**` command-policy work remains epic scope but is explicitly deferred from SPRINT-41 for later decomposition before epic close (owner continuation 2026-09-11 UTC); do not imply it shipped with STORY-058-10.
- [ ] Convert the current ClearGate roles to native Copilot and Codex definitions while preserving role boundaries and structured handoff schemas.
- [ ] Split shared skills from host-specific sprint dispatch instructions; keep flashcard and other portable skills single-source (owned by [[STORY-058-12]]).
- [ ] Normalize Claude, Copilot, and Codex lifecycle payloads into shared CLI hook handlers.
- [ ] Extend install-manifest ownership, drift detection, upgrade, restart warnings, doctor, pruning, and uninstall to operate on a set of installed hosts.
- [ ] Add packed-tarball integration tests and documented real-runtime smoke runs for Copilot CLI, VS Code Copilot, and Codex CLI.
- [ ] Author a repeatable **clean-room verification procedure** committed at `.cleargate/knowledge/clean-room-verification.md`: create a new empty directory outside this repository, `git init` it, install the packed `cleargate` artifact, run `cleargate init` for each host selector, and record pass/fail per checked behavior.
- [ ] Build `cleargate verify-install` (or an equivalent scripted driver) that executes the machine-checkable portion of that procedure — file presence, manifest host set, `doctor` exit code, hook wiring — so the only manual step left is starting a real host session.
- [ ] Execute the clean-room procedure against **Claude Code specifically** as the regression baseline, for both the no-flag install and `--host all`, and record the resulting evidence artifact as a gating input to sprint close.
- [ ] Verify in the clean room that the Claude path is unchanged: SessionStart banner text, PreToolUse and PostToolUse hooks firing on a work-item edit, `.claude/agents/**` and `.claude/skills/**` discovery, MCP registration, sprint state init, and `cleargate doctor` exit 0.

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
| Clean-room evidence | Claude regression MUST be proven by a real install into a newly created empty directory outside this repository, exercised by a real Claude Code session. The in-repo dogfood instance cannot serve as the witness: `/.claude/**` is gitignored, hand-synced, and fully untracked (CR-099), so it reflects this machine's history rather than what the payload actually installs — the exact blind spot that let BUG-024 ship its own fix while still running the buggy hook. |
| Clean-room location | The verification directory is created under `~/Documents/Dev/` as a sibling of this repository, NOT inside it and NOT under `/tmp`, so the run exercises real filesystem, git, and npm resolution rather than a fixture harness. It is disposable and recreated per verification run. |

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
- **Surface:** `cleargate-cli/test/integration/foreign-repo.integration.node.test.ts:1` — existing `cleargate init` coverage into blank Node and bare Go fixtures, then scaffold-lint / gate-run / wiki-build against the installed scaffold. This is the nearest existing surface to the clean-room requirement, but it runs in an OS tmpdir against `initHandler()` in-process — it never installs the packed artifact and never starts a real host session, so it cannot witness packaging or hook-wiring defects.
- **Surface:** `cleargate-cli/test/e2e/dogfood-install.integration.node.test.ts` — existing end-to-end install check; extend for per-host assertions.
- **Surface:** `cleargate-cli/scripts/verify-pack.mjs` — existing packed-tarball verification invoked from `prepublishOnly`; the natural place to hang the machine-checkable half of clean-room verification.
- **Coverage of this epic's scope:** Partial. The CLI already has safe copying, bounded-block injection, JSON merging, manifests, drift, upgrade, doctor, and uninstall, but each lifecycle path assumes one Claude-shaped payload and no host ownership.

## Prior work

- [[PROPOSAL-074]] defines the closest `HostAdapter` precedent and host-neutral `.cleargate/**` boundary, but targets Antigravity, assumes a single host per repository, and keeps canonical payloads outside the standalone npm repository.
- [[BUG-043]] and [[CR-105]] cover safe bounded-block placement and preservation of user prose during instruction-file updates.
- No indexed prior work fully covers additive Claude + Copilot + Codex installation, simultaneous adapters, normalized hooks, MCP variants, and per-host doctor/upgrade/uninstall.
- Re-checked 2026-09-04 via `cleargate-wiki-query` before the clean-room amendment. Confirms this epic as the canonical multi-host reference; [[PROPOSAL-074]] remains the Antigravity-specific single-host instance; [[SPRINT-34]] "Polyglot Portability Hardening" is adjacent (language/test-stack portability, not harness portability) and shares the "remove hardcoded assumptions" principle but does not overlap. **Clean-room install verification returned no prior work at all** — it is net-new to this epic, which is why it is specified here rather than inherited.

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

  Scenario: Clean-room install reproduces the Claude baseline
    Given a newly created empty directory under `~/Documents/Dev/` outside this repository
    And that directory is a fresh `git init` repository with no prior ClearGate state
    And the packed `cleargate` artifact installed into it
    When the user runs `cleargate init` with no host flag
    Then installation completes with exit code 0
    And a real Claude Code session started in that directory emits the ClearGate SessionStart banner
    And a PreToolUse hook fires on an edit to a `.cleargate/delivery/**` work item
    And the matching PostToolUse stamp-and-gate hook fires and reports its ingest result
    And the ClearGate agents and skills are discoverable by name in that session
    And `cleargate doctor` exits 0

  Scenario: Claude keeps working when other hosts are installed alongside it
    Given a clean-room directory installed with `cleargate init --host all`
    When a real Claude Code session runs every check from the no-flag baseline scenario
    Then each Claude-observable behavior from that baseline is reproduced unchanged
    And the presence of `.codex/**`, `.github/**`, and `AGENTS.md` alters no Claude-observable behavior
    And `.claude/settings.json` contains no Codex- or Copilot-owned hook entries

  Scenario: Clean-room evidence gates the release
    Given a change to install, upgrade, doctor, or uninstall
    When the clean-room procedure has not been executed and its evidence artifact recorded for that change
    Then the epic's Definition of Done is not met
    And the change is not eligible for release
```

## 6. AI Interrogation Loop (Human Input Required)

No unresolved questions. The following decisions are integrated throughout this Epic:

- `--host portable` installs Copilot + Codex; `--host all` installs Claude + Copilot + Codex; explicit individual selectors remain available.
- `cleargate host remove <host>` ships in v1 so additive adapters can be surgically removed.
- Claude-only installs do not receive `AGENTS.md`; the no-flag Claude result remains backward-compatible.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter. (Direct owner approval 2026-09-04; parent-approved satisfied via proposal_gate_waiver.)
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified existing file paths; proposed files are explicitly marked as creates in §0.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 placeholder decisions exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? identifies the smallest existing surface and justifies the abstraction.

---
epic_id: EPIC-074
proposal_id: PROPOSAL-074
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: antigravity,host-port,scaffold,agent-loop,cli,init,hooks,dogfood-split,agents-md,skills
status: Draft
ambiguity: 🟡 Medium
context_source: "Conversation 2026-05-22 — user asks how to enable ClearGate for Google Antigravity 2.0. AskUserQuestion x3 ratified: (a) port the full Claude Code surface, (b) full-parity port, (c) discovery proposal first. Wiki query result: no prior antigravity work; closest precedents [[EPIC-018]] (framework universality) and [[EPIC-027]] (codebase/PM-tool boundary). [[EPIC-013]] explicitly deferred cross-tool support and is now being revisited. Web research 2026-05-22 (Antigravity docs are JS-rendered and not WebFetch-able; corroborated via developers.googleblog.com, antigravityide.org, agentpedia.codes, Google Codelabs, and gemini-cli GitHub issues) resolved 4 of 6 primitive-surface questions and narrowed the remaining 2 to schema-level unknowns documented in §6."
owner: sandrinio
target_date: 2026-07-31
created_at: 2026-05-22T00:00:00Z
updated_at: 2026-05-22T00:00:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: parent-approved
      detail: "OR-group failed — all alternatives failed: parent-approved-proposal: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter; parent-approved-initiative: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter"
    - id: reuse-audit-recorded
      detail: "'## Existing Surfaces' not found in body"
    - id: simplest-form-justified
      detail: "'## Why not simpler?' not found in body"
  last_gate_check: 2026-05-22T16:36:21Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-074
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-22T16:36:21Z
  sessions: []
---

# EPIC-074: Antigravity 2.0 Host Port — Full-Parity Scaffold

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Port the ClearGate execution scaffold (four-agent loop + lifecycle hooks + skills + settings + context-injection contract) from Claude Code to Google Antigravity 2.0 such that a target repo running `cleargate init --host antigravity` receives a payload functionally equivalent to today's `.claude/` payload, with no regression to existing Claude Code targets.</objective>
  <architecture_rules>
    <rule>Planning surface (`.cleargate/**` — templates, protocol, wiki, delivery folders, FLASHCARD, knowledge) is host-agnostic and MUST NOT change shape for Antigravity. Only the execution scaffold is host-specific.</rule>
    <rule>Antigravity payload lives in `.agents/` at the target repo root (workspace scope). Global user-level config (`~/.gemini/antigravity/`) is read-only context — `cleargate init` never writes there. The historical `.antigravity/` name in one community repo is not the official convention and we do not use it.</rule>
    <rule>Context injection targets `AGENTS.md` at repo root (cross-vendor convention, also read by Cursor and Claude Code per the AGENTS.md standard). `GEMINI.md` is NOT used — keeping a single cross-vendor file is preferable to Antigravity-only overrides. Bounded-block contract preserved: `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->`. The block content is identical to the CLAUDE.md block on Claude Code targets.</rule>
    <rule>Host-specific payloads live in parallel canonical mirrors: `cleargate-planning/.claude/**` (Claude Code, existing) and `cleargate-planning-antigravity/.agents/**` (Antigravity, new). The npm prebuild copies BOTH into `cleargate-cli/templates/**`. Dogfood-split discipline (CLAUDE.md §"Dogfood split") applies unchanged to the new mirror.</rule>
    <rule>Host selection happens at `cleargate init` time via `--host {claude|antigravity}` flag. Default: file-marker auto-detect (presence of `~/.gemini/antigravity/` dir or `antigravity` binary on `$PATH` → propose antigravity; otherwise propose claude); fallback prompt on ambiguity. Single-host-per-target-repo in v1.</rule>
    <rule>The CLI codebase/PM-tool boundary (EPIC-027) extends to a CLI/host boundary: `cleargate-cli/src/**` MUST NOT import any Antigravity SDK or Claude Code SDK. Host-specific logic lives behind a `HostAdapter` interface in `cleargate-cli/src/hosts/{claude,antigravity}/`. CI guard `npm run check:no-host-sdk` parallels `check:no-pm-sdk`.</rule>
    <rule>Subagent model is fundamentally different between hosts and MUST NOT be papered over. Claude Code pre-declares subagents as `.claude/agents/<name>.md` files invoked by `Agent({subagent_type: "developer"})`. Antigravity dispatches subagents DYNAMICALLY — the orchestrator defines and invokes them inline; there is no pre-declared subagent file format. The ClearGate four-agent loop is re-expressed on Antigravity as four SKILLS in `.agents/skills/` (architect, developer, qa, reporter) whose `description:` frontmatter triggers semantic auto-load. The orchestrator reads the loaded skill as the role spec and dispatches a dynamic subagent with that spec as its prompt.</rule>
    <rule>Token ledger has no documented Antigravity SubagentStop+telemetry equivalent. The Antigravity port ledgers at session level (one row per session, totals from a post-session hook payload or CLI exit JSON) instead of per-subagent. The Reporter agent's sprint-report template tolerates both granularities; the JSONL schema gains an optional `granularity: "session" | "subagent"` field defaulting to `"subagent"` for Claude Code rows.</rule>
    <rule>Hook configuration on Antigravity lives in a JSON file at the path documented by `antigravity.google/docs/hooks` (exact path schema-pending — see §6 Q1). The five Claude Code events map by semantic intent, not by event-name equality. Mapping table is canonized in `.cleargate/knowledge/host-adapter-contract.md`; events with no Antigravity equivalent (notably SubagentStop+tokens) are marked `unsupported` with the substitute behavior documented inline.</rule>
    <rule>EPIC-013's explicit "Claude Code-native, no cross-tool fallback" stance is intentionally superseded by this epic. Update `.cleargate/delivery/archive/EPIC-013_Execution_Phase_v2.md`'s out-of-scope note with a forward-reference to EPIC-074.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/hosts/types.ts" action="create" />
    <file path="cleargate-cli/src/hosts/claude/index.ts" action="create" />
    <file path="cleargate-cli/src/hosts/antigravity/index.ts" action="create" />
    <file path="cleargate-cli/src/hosts/detect.ts" action="create" />
    <file path="cleargate-cli/src/init/copy-payload.ts" action="modify" />
    <file path="cleargate-cli/src/init/inject-context.ts" action="create" />
    <file path="cleargate-cli/src/commands/init.ts" action="modify" />
    <file path="cleargate-cli/src/commands/doctor.ts" action="modify" />
    <file path="cleargate-cli/src/commands/upgrade.ts" action="modify" />
    <file path="cleargate-cli/src/lib/check-no-host-sdk.ts" action="create" />
    <file path="cleargate-cli/scripts/copy-planning-payload.mjs" action="modify" />
    <file path="cleargate-planning-antigravity/.agents/skills/architect/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/developer/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/qa/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/reporter/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/devops/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/sprint-execution/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/flashcard/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/cleargate-wiki-ingest/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/cleargate-wiki-query/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/cleargate-wiki-lint/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/skills/cleargate-wiki-contradict/SKILL.md" action="create" />
    <file path="cleargate-planning-antigravity/.agents/hooks/session-start.sh" action="create" />
    <file path="cleargate-planning-antigravity/.agents/hooks/pre-tool-use.sh" action="create" />
    <file path="cleargate-planning-antigravity/.agents/hooks/post-tool-use.sh" action="create" />
    <file path="cleargate-planning-antigravity/.agents/hooks/token-ledger.sh" action="create" />
    <file path="cleargate-planning-antigravity/.agents/hooks.json" action="create" />
    <file path="cleargate-planning-antigravity/AGENTS.md" action="create" />
    <file path=".cleargate/knowledge/host-adapter-contract.md" action="create" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="CLAUDE.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
ClearGate's planning surface is host-agnostic, but its *execution* surface is Claude Code-native — `.claude/agents/`, `.claude/skills/`, `.claude/settings.json` hooks, and the Task-tool dispatch are all Claude Code primitives. Teams adopting Google Antigravity 2.0 (an agentic IDE with its own dynamic subagent dispatcher, skills directory, hook system, and the cross-vendor `AGENTS.md` context convention) cannot install ClearGate today. Enabling them unlocks a second host and — via the `AGENTS.md` cross-vendor standard — opens a downstream path to Cursor and other AGENTS.md-aware hosts at marginal cost.

**Success Metrics (North Star):**
- Metric 1: A target repo running `cleargate init --host antigravity` in a fresh directory yields a runnable four-agent loop with the same gate-3 / gate-4 enforcement as Claude Code, verified by running one STORY end-to-end inside Antigravity 2.0.
- Metric 2: Zero regression in existing Claude Code targets — `cleargate init` with no flag preserves today's behavior byte-for-byte after EPIC-074 ships.
- Metric 3: Both hosts reach feature parity on the four hook semantics we depend on (session-start banner, pre-edit-gate, post-edit-ingest, dispatch-time gate). The fifth (per-subagent token accounting) ships at degraded session-level granularity on Antigravity — measured by ledger row count + a one-line `granularity: session` field, not by parity.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `HostAdapter` interface + two concrete implementations (`hosts/claude/`, `hosts/antigravity/`) in `cleargate-cli/src/hosts/`.
- [ ] Host auto-detection at `cleargate init` time via file markers (`~/.gemini/antigravity/` dir or `antigravity` binary on `$PATH`) with explicit `--host {claude|antigravity}` override.
- [ ] New canonical payload mirror `cleargate-planning-antigravity/` containing the `.agents/` payload.
- [ ] Re-express the four execution agents (Architect, Developer, QA, Reporter) plus DevOps and the four `cleargate-wiki-*` agents as **skills** under `.agents/skills/<name>/SKILL.md`. Skills' `description:` frontmatter encodes the role's auto-load trigger. Skill body is the role spec.
- [ ] Port `flashcard/SKILL.md` and `sprint-execution/SKILL.md` byte-for-byte (skill format is identical between hosts).
- [ ] Translated hook payloads for SessionStart, PreToolUse, PostToolUse via `.agents/hooks.json` (schema TBD per §6 Q1) + shell scripts under `.agents/hooks/`.
- [ ] Token-ledger substitute: a session-level row written by a post-session hook (or CLI exit handler) with `granularity: "session"`. The Reporter template renders both granularities.
- [ ] `AGENTS.md` at repo root as the context-injection target, with the existing bounded `<!-- CLEARGATE:START --> ... <!-- CLEARGATE:END -->` block (content identical to the CLAUDE.md block on Claude Code targets).
- [ ] `cleargate doctor --session-start` host-aware banner: `ClearGate state: <state> — host: <host>`.
- [ ] `cleargate-cli` test suite covers init flow + doctor + upgrade under both hosts; HostAdapter contract test in CI; manual Antigravity smoke documented in a runbook.
- [ ] Update `.cleargate/knowledge/cleargate-protocol.md` §"Dogfood split" to document the two-mirror discipline.
- [ ] Create `.cleargate/knowledge/host-adapter-contract.md` codifying the HostAdapter interface + the five-event semantic mapping table + the SubagentStop-substitute decision.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Cross-host concurrency in a single target repo (running both Claude Code and Antigravity against the same `.cleargate/` tree at once). Single-host-per-repo in v1.
- Automated migration from Claude Code → Antigravity in an existing target repo. Manual switch via `cleargate init --host antigravity --force` in v1.
- `GEMINI.md` Antigravity-specific overrides on top of `AGENTS.md`. We target `AGENTS.md` only and rely on the cross-vendor standard. Reasoning: keeping one file is preferable to per-host divergence; if Antigravity-only behavior is ever required, add `GEMINI.md` in a future epic — not this one.
- Static subagent files under `.agents/agents/<name>.md`. Antigravity has no such convention; skills carry the role spec.
- Per-subagent token accounting on Antigravity. Session-level only. Per-subagent granularity returns if and when Antigravity exposes a SubagentStop+telemetry equivalent.
- Cursor, Codex, Cline, Aider, or any other agentic IDE. AGENTS.md targeting makes them mechanically easier downstream, but each gets its own epic that reuses the HostAdapter interface.
- Antigravity-specific UI/UX polish (custom command panels, branded splash, AG-side telemetry).
- Single-source-of-truth agent definitions with build-time transpilation. Two parallel canonical mirrors for v1.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| **Schema gaps remain** | Two Antigravity surfaces are still schema-pending: (a) the exact `hooks.json` location + JSON schema, (b) hook stdin payload shapes. Both are documented in `antigravity.google/docs/hooks` (JS-rendered, not WebFetch-able). §6 Q1–Q2 must close before STORY-074-04 (hooks port) goes 🟢. |
| **Subagent model divergence** | Claude Code: pre-declared markdown files dispatched by `Agent` tool. Antigravity: dynamic inline dispatch by the orchestrator. The four-agent loop is re-expressed on Antigravity as skills. This is the principal architectural shift in EPIC-074 and is enshrined in §0 architecture_rules. |
| **No SubagentStop+tokens equivalent** | Antigravity 2.0 documentation does not describe a per-subagent finish event carrying token usage. The token ledger ships at session-level granularity on Antigravity. Reporter tolerates both granularities via an optional `granularity:` field. |
| **Dogfood discipline** | Canonical-mirror rule extends to the new mirror. Hand-edits to `cleargate-cli/templates/cleargate-planning-antigravity/` are forbidden — the prebuild script owns it. |
| **Boundary discipline** | `cleargate-cli/src/**` may not import any host SDK. CI guard `npm run check:no-host-sdk` parallels the existing `check:no-pm-sdk`. |
| **Backwards compat** | Existing Claude Code targets must `cleargate upgrade` cleanly with no breaking change. The install-manifest gains a `host:` field defaulting to `claude` on missing. |
| **CI test coverage** | Antigravity integration tests cannot run in CI without an Antigravity runtime/license. STORY-074-09 ships a contract-level HostAdapter conformance test that runs in CI; a manual integration smoke runbook covers the end-to-end. |
| **Member-state surface** | Pre-member commands list unchanged. `--host` flag is available in pre-member; sync still requires join. |
| **AGENTS.md cross-vendor benefit** | Targeting `AGENTS.md` (not `GEMINI.md`-only) means the same bounded-block injection works for any future AGENTS.md-aware host (Cursor, Sourcegraph Cody, etc.) without a third payload mirror. Downstream Cursor/Codex epics inherit context injection essentially free. |

## 3.5 Existing Surfaces

> L1 reuse audit. List source-tree implementations the epic could extend. Cite file:line.

- **Surface:** `cleargate-cli/src/init/copy-payload.ts:54` — `SKIP_FILES` set + bounded-block CLAUDE.md injection. **Coverage of this epic's scope:** ~50% extension. The payload-copy machinery is host-agnostic in shape but hardcodes `cleargate-planning` as the source dir and `CLAUDE.md` as the injection target. Refactor to take both from the resolved `HostAdapter`.
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — prebuild copies canonical mirror into npm payload. **Coverage:** Direct extension. Loop over both mirrors; no algorithmic change.
- **Surface:** `cleargate-planning/.claude/{agents,skills,hooks,settings.json}` — the canonical Claude Code payload, source of truth for what the Antigravity mirror must functionally match. **Coverage:** Reference only — used as the spec for what to translate, not extended in place. Notable: `.claude/skills/{flashcard,sprint-execution}/SKILL.md` ports verbatim (skill format is identical between hosts per Antigravity codelabs).
- **Surface:** `mcp/src/adapters/` + the CLAUDE.md §"Codebase / PM-Tool Boundary" rule — established adapter-layer pattern: SDK imports live exclusively inside the adapter dir, never in the CLI core. **Coverage:** Pattern reuse — `cleargate-cli/src/hosts/{claude,antigravity}/` is the analog; `check:no-host-sdk` is modeled byte-for-byte on `check:no-pm-sdk`.
- **Surface:** `[[EPIC-018]]` Framework Universality (archived) — established config-driven gate portability (`.cleargate/config.yml` parameterizing `npm test` / `npm run typecheck`). **Coverage:** Conceptual precedent for "make the scaffold portable without breaking dogfooding." This epic extends the same principle from gates to the agent runtime.
- **Surface:** `[[EPIC-027]]` MCP Type-Agnostic Sync (archived) — the codebase/PM-tool boundary + `check:no-pm-sdk` CI guard. **Coverage:** Pattern reuse for the CLI/host boundary.
- **Surface:** `[[EPIC-013]]` Execution Phase v2 (archived) — explicitly out-of-scoped "Cursor/Gemini/Codex cross-tool support" with rationale "ClearGate is Claude Code-native; no cross-tool task-file fallback in v2." **Coverage:** Intentionally superseded; STORY-074-01 amends EPIC-013's out-of-scope note with a forward-reference to EPIC-074.
- **Surface (external):** The cross-vendor `AGENTS.md` convention — published by the agent-tooling community, natively supported by Antigravity v1.20.3+ (March 2026) and by Cursor / Claude Code via the same standard. **Coverage:** Free downstream extension — once `AGENTS.md` is the injection target, the same bounded block is read by any AGENTS.md-aware host.

## 3.6 Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this epic:** None — net-new abstraction required. EPIC-018's config-driven gates parameterize *what commands run*, not *which runtime dispatches subagents*. The Task tool, hook lifecycle, and subagent-dispatch contract have no config-knob equivalent today. A `HostAdapter` interface is the minimum new abstraction.
- **Why isn't extension / parameterization / config sufficient?** Because the most consequential difference between Claude Code and Antigravity 2.0 is not a parameter value — it's the **subagent dispatch model**. Claude Code reads `Agent({subagent_type: "developer"})` and loads `.claude/agents/developer.md` as a pre-declared role. Antigravity has no pre-declared subagent file format; the orchestrator defines and invokes subagents dynamically inline. Re-expressing the four-agent loop on Antigravity therefore requires **moving role specs from `.claude/agents/*.md` into `.agents/skills/*/SKILL.md`** (semantic auto-load) and adding orchestrator logic that reads the loaded skill and spawns a dynamic subagent with its body as the prompt. That's not parameterization — that's a different control-flow shape. A config-only port would still need an adapter layer that knows both shapes, which is exactly what `HostAdapter` is. The same logic applies to the lifecycle hooks (event names, payload shapes), the context-injection file (`CLAUDE.md` vs `AGENTS.md`), and the settings file (`.claude/settings.json` JSON-with-hooks vs `.agents/mcp_config.json` + a separate `hooks.json`). Each by itself is small; together they are a host abstraction.

## 4. Technical Grounding (The "Shadow Spec")

*(Provisional. Items keyed to §6 unknowns are marked schema-pending and will be definitized when those questions close.)*

**Affected Files:**
- `cleargate-cli/src/hosts/types.ts` — `HostAdapter` interface: `id`, `payloadDir`, `targetScaffoldDir`, `contextInjectionFile`, `settingsFiles` (array — MCP + hooks may be separate), `hookEventMap`, `subagentDispatchMode` (`"static-files" | "dynamic-inline"`), `detect(cwd): boolean`, `injectContext(repoRoot, block)`, `tokenLedgerGranularity` (`"subagent" | "session"`).
- `cleargate-cli/src/hosts/claude/index.ts` — `id: "claude"`, `payloadDir: "cleargate-planning"`, `targetScaffoldDir: ".claude"`, `contextInjectionFile: "CLAUDE.md"`, `subagentDispatchMode: "static-files"`, `tokenLedgerGranularity: "subagent"`.
- `cleargate-cli/src/hosts/antigravity/index.ts` — `id: "antigravity"`, `payloadDir: "cleargate-planning-antigravity"`, `targetScaffoldDir: ".agents"`, `contextInjectionFile: "AGENTS.md"`, `subagentDispatchMode: "dynamic-inline"`, `tokenLedgerGranularity: "session"`.
- `cleargate-cli/src/hosts/detect.ts` — auto-detect: presence of `~/.gemini/antigravity/` dir OR `antigravity` binary on `$PATH` → propose `antigravity`. Otherwise propose `claude`. `--host` flag overrides; on ambiguous tie, prompt.
- `cleargate-cli/src/init/copy-payload.ts` — accept `HostAdapter`; resolve payload dir + skip list + injection target + scaffold target from it.
- `cleargate-cli/src/init/inject-context.ts` — new file: extract `CLAUDE.md`/`AGENTS.md` bounded-block injection into a host-parameterized helper.
- `cleargate-cli/src/commands/{init,doctor,upgrade}.ts` — host-aware.
- `cleargate-cli/scripts/copy-planning-payload.mjs` — copy both mirrors.
- `cleargate-cli/src/lib/check-no-host-sdk.ts` — CI guard.
- `cleargate-planning-antigravity/.agents/skills/{architect,developer,qa,reporter,devops}/SKILL.md` — five execution-role skills. Each `description:` field describes the auto-load trigger (e.g., for `developer/SKILL.md`: "Activate when implementing a Story end-to-end…"). Body is the role spec, lifted from the corresponding `.claude/agents/<name>.md` minus Claude Code-specific tool references; tool references retranslate to Antigravity's tool surface (verbatim where names align; substituted where they don't).
- `cleargate-planning-antigravity/.agents/skills/{flashcard,sprint-execution}/SKILL.md` — direct ports.
- `cleargate-planning-antigravity/.agents/skills/cleargate-wiki-{ingest,query,lint,contradict}/SKILL.md` — four wiki skills.
- `cleargate-planning-antigravity/.agents/hooks/{session-start,pre-tool-use,post-tool-use,token-ledger}.sh` — four shell scripts. Names follow Antigravity event semantics, not Claude Code event names.
- `cleargate-planning-antigravity/.agents/hooks.json` — hook registration manifest (schema TBD per §6 Q1).
- `cleargate-planning-antigravity/AGENTS.md` — bounded-block context injection target. Block content identical to the CLAUDE.md block on Claude Code targets.
- `.cleargate/knowledge/host-adapter-contract.md` — new doc; HostAdapter interface, hook-event semantic mapping, settings-format conventions, detection-marker registry, SubagentStop-substitute decision.
- `.cleargate/knowledge/cleargate-protocol.md` — extend §"Dogfood split" + §"State-aware surface" + the bottom subagent guidance to be host-aware.
- `CLAUDE.md` — add §"Host targets" subsection under "Dogfood split"; cite EPIC-074.

**Data Changes:**
- `.cleargate/.install-manifest.json` (per-target-repo) — add `host: "claude" | "antigravity"` field; default `"claude"` on absence for backwards compat.
- Token ledger JSONL schema (`.cleargate/sprint-runs/<id>/token-ledger.jsonl`) — add optional `granularity: "session" | "subagent"` field; default `"subagent"` on absence (preserves existing Claude rows).
- `cleargate-cli/package.json` — bump minor; add prebuild step to copy second mirror.
- No DB schema changes. No MCP server changes. No admin console changes.

## 5. Acceptance Criteria

```gherkin
Feature: Antigravity 2.0 Host Port

  Scenario: Fresh target repo, explicit host flag (Antigravity)
    Given a fresh empty directory with git initialized
    When the user runs `cleargate init --host antigravity`
    Then the directory contains `.agents/skills/`, `.agents/hooks/`, and `.agents/hooks.json`
    And the bounded ClearGate block is injected into `AGENTS.md` at repo root
    And `.cleargate/.install-manifest.json` records `host: "antigravity"`
    And no `.claude/` directory or `CLAUDE.md` file is created by ClearGate
    And `cleargate doctor --session-start` emits `host: antigravity`

  Scenario: Fresh target repo, explicit host flag (Claude Code) — regression check
    Given a fresh empty directory with git initialized
    When the user runs `cleargate init --host claude`
    Then the directory contains `.claude/` with the exact same payload as today
    And `.cleargate/.install-manifest.json` records `host: "claude"`
    And `CLAUDE.md` contains the ClearGate bounded block
    And no `.agents/` or `AGENTS.md` artifacts are added by ClearGate

  Scenario: Fresh target repo, no host flag — auto-detect (antigravity marker present)
    Given a fresh empty directory with git initialized
    And `~/.gemini/antigravity/` exists OR an `antigravity` binary is on `$PATH`
    When the user runs `cleargate init` with no `--host` flag
    Then the CLI detects Antigravity and prompts: "Detected Antigravity — install Antigravity payload? [Y/n]"
    And on Y, installs the Antigravity payload
    And on n, falls back to the Claude Code payload

  Scenario: Existing Claude Code target, upgrade
    Given a target repo previously installed with Claude Code (pre-EPIC-074)
    When the user runs `cleargate upgrade`
    Then `.cleargate/.install-manifest.json` is backfilled with `host: "claude"`
    And no `.claude/` files are modified beyond the normal upgrade diff
    And no Antigravity artifacts are added

  Scenario: HostAdapter conformance contract
    Given two HostAdapter implementations (claude, antigravity)
    When the contract test suite runs
    Then both expose `id`, `payloadDir`, `targetScaffoldDir`, `contextInjectionFile`, `settingsFiles`, `hookEventMap`, `subagentDispatchMode`, `detect`, `injectContext`, `tokenLedgerGranularity`
    And both `detect` functions are pure (no I/O beyond fs reads in the target cwd and known marker paths)
    And the hookEventMap covers all four required semantic events (session-start, pre-tool-use, post-tool-use, subagent-finish-or-session-finish)
    And events with no native equivalent on a host declare an explicit substitute or "unsupported" status

  Scenario: Boundary CI guard
    Given the cleargate-cli source tree after EPIC-074 ships
    When `npm run check:no-host-sdk` runs
    Then no file outside `cleargate-cli/src/hosts/**` imports any Antigravity SDK or Claude Code SDK
    And the check exits non-zero if any forbidden import is found

  Scenario: Token ledger granularity field
    Given a sprint run on a Claude Code target
    Then each token-ledger row has `granularity: "subagent"` (or no field, treated as subagent)
    Given a sprint run on an Antigravity target
    Then each token-ledger row has `granularity: "session"`
    And the Reporter sprint-report template renders both granularities correctly

  Scenario: Four-agent loop runs end-to-end on Antigravity (manual smoke)
    Given a target repo installed with `--host antigravity`
    And a single STORY-NNN-NN file in `pending-sync/` with a Gherkin acceptance criterion
    When the user kicks off sprint execution within Antigravity 2.0
    Then the sprint-execution skill auto-loads on the matching trigger phrase
    Then architect, developer, qa, reporter skills each auto-load in sequence on their semantic triggers
    And the orchestrator dispatches a dynamic subagent per role using the loaded skill as the role spec
    And the wiki-ingest skill fires after each Write to `.cleargate/delivery/**`
    And the story closes with the same gate-3 / gate-4 outcome as the Claude Code path
    And the token ledger contains a session-granularity row for the run
```

## 6. AI Interrogation Loop (Human Input Required)

*Web research 2026-05-22 resolved Q1–Q6 from the prior revision. Findings folded into §0/§2/§3.5/§4. Remaining unknowns below.*

### Research findings (resolved)

- **R1 — Payload directory:** `.agents/` at repo root (workspace) + `~/.gemini/antigravity/` (global, read-only context). **NOT** `.antigravity/`. Sources: agentpedia.codes "Antigravity CLI Deep Dive"; Google Codelabs "Getting started with Antigravity skills".
- **R2 — Auto-detection markers:** No documented `ANTIGRAVITY_*` env var. Use file markers: `~/.gemini/antigravity/` dir or `antigravity` binary on `$PATH`. Sources: agentpedia.codes; antigravity.google/docs/cli-getting-started (relayed).
- **R3 — Context injection:** `AGENTS.md` at repo root (cross-vendor standard) + `GEMINI.md` (AG-specific overrides, conflict-winner). We target `AGENTS.md` only; `GEMINI.md` out of scope. Sources: agentpedia.codes "User Rules"; gemini-cli GitHub issue #16058.
- **R4 — Settings file:** MCP config lives at `.agents/mcp_config.json` (workspace) + `~/.gemini/antigravity-cli/mcp_config.json` (global). Hooks live in a separate JSON file ("simple JSON format" per AG 2.0 launch post). Exact hook-file path + schema schema-pending (see Q1 below). Sources: antigravityide.org "Introducing Antigravity 2.0"; agentpedia.codes CLI deep-dive.
- **R5 — Lifecycle events:** SessionStart, before-tool-call, after-file-edit are all confirmed by the AG 2.0 launch post (event names not quoted publicly). Subagent dispatch is **dynamic inline** — no pre-declared `.agents/agents/<name>.md` files; orchestrator defines and invokes subagents in-conversation. **No SubagentStop+tokens equivalent documented anywhere in public sources.** Sources: developers.googleblog.com "Build with Google Antigravity"; antigravityide.org launch post.
- **R6 — Skills:** Direct analog to Claude Code skills. `<workspace>/.agents/skills/<name>/SKILL.md` with `name`+`description` frontmatter. Auto-loaded by semantic match against `description:`, NOT slash-command. Sources: Google Codelabs "Getting started with Antigravity skills"; medium.com/google-cloud Antigravity skills tutorial.

### Remaining open questions

- **AI Question 1 (was Q4, narrowed):** "What is the exact on-disk path and JSON schema of the Antigravity hooks-registration file? `.agents/hooks.json`? `~/.gemini/antigravity/hooks.json`? Both? What are the event-name strings and the stdin payload shape Antigravity passes to hook scripts?"
  - **How to close:** view `antigravity.google/docs/hooks` in a real browser (the page is JS-rendered and could not be retrieved via WebFetch), OR install Antigravity locally and inspect `~/.gemini/antigravity/` after enabling hooks.
  - **Human Answer:** {Waiting for user.}

- **AI Question 2 (was Q5e, sharpened):** "Confirmed: no public source describes a per-subagent finish event with token telemetry on Antigravity. The proposal currently ships session-level granularity. Two sub-questions: (a) Is there a non-public Antigravity surface (CLI exit JSON? SDK callback? trace export?) that does carry per-subagent tokens, which we should investigate before committing to session-level? (b) If session-level is genuinely the only option, do we want a one-time best-effort polling reader for partial mid-session updates, or strictly one row at session end?"
  - **Human Answer:** {Waiting for user.}

- **AI Question 3 (new):** "Sizing question. The port now decomposes into roughly: (1) HostAdapter scaffolding + Claude refactor to use it [3 stories], (2) `cleargate-planning-antigravity/` mirror with skills+hooks [4 stories], (3) AGENTS.md injection helper + dual-host init/doctor/upgrade [3 stories], (4) token-ledger granularity + Reporter changes [1 story], (5) CI guard + contract test + manual-smoke runbook [2 stories]. That's ~13 stories. Recommendation: split into TWO sprints — SPRINT-A ships (1)+(3)+(5) and gives Claude Code a host-adapter refactor with zero user-visible change; SPRINT-B ships (2)+(4) and adds Antigravity. Sprint A is mergeable even if Antigravity discovery (Q1/Q2) stalls. Confirm or override the split."
  - **Human Answer:** {Waiting for user.}

- **AI Question 4 (was Q8, sharpened):** "Confirm the mirror-naming convention: `cleargate-planning-antigravity/` at repo root (verbose, parallel to existing `cleargate-planning/`). Alternative: `cleargate-planning/.hosts/antigravity/` (nested). Recommendation: verbose top-level — matches existing convention and avoids the dogfood-split rule applying to a `.hosts/` subdirectory."
  - **Human Answer:** {Waiting for user.}

- **AI Question 5 (new):** "AGENTS.md is the cross-vendor standard. After EPIC-074 ships, adding Cursor / Sourcegraph Cody / other AGENTS.md-aware hosts becomes mechanically cheaper. Do you want to (a) add a brief 'downstream hosts' subsection to this epic listing the candidates and their likely incremental cost, (b) defer that to a follow-up roadmap note, or (c) leave it out entirely and let it surface organically when a user asks?"
  - **Human Answer:** {Waiting for user.}

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [ ] Proposal document has `approved: true` (Gate 1 — requires explicit human ack).
- [x] The `<agent_context>` block is complete and validated.
- [ ] §4 Technical Grounding contains 100% real, verified file paths. *Partial — paths inside `cleargate-cli/` and `.cleargate/` are verified; the `.agents/hooks.json` schema is schema-pending per §6 Q1.*
- [ ] §6 AI Interrogation Loop is empty (all human answers integrated into the spec). *Five questions remain; three are sizing/naming/scope prefs, two are schema-pending pending live Antigravity inspection.*
- [ ] 0 "TBDs" exist in the document. *Two TBDs remain in §0 and §4 keyed to §6 Q1.*
- [x] §3.5 Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] §3.6 Why not simpler? has both sub-bullets answered.

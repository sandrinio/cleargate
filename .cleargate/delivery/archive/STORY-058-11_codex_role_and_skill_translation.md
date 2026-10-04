---
story_id: STORY-058-11
parent_epic_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: "Completed"
approved: true
approved_by: sandrinio
approved_at: 2026-09-04T00:00:00Z
ambiguity: 🟢 Low
context_source: Decomposition of [[EPIC-058]] on direct owner instruction 2026-09-04. Grounded in verified cleargate-cli source paths and Codex CLI v0.153.2 documented contracts; no path in this story is inferred.
actor: Codex user
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-25T22:38:05Z
created_at_version: cleargate@0.26.1
updated_at_version: e432871f-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-04T10:25:03Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-09-26T13:52:50Z
  sessions:
    - session: 75d958ba-2473-408d-b4db-e15b774ad28f
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-09-26T13:48:29Z
---

# STORY-058-11: Codex role and skill translation with a harness-neutral repo-root shim

**Milestone:** M5 — Codex adapter

## 1. The Spec (The Contract)

### 1.1 User Story
As a developer using Codex, I want the five ClearGate execution roles and the shared skills available in my Codex session, so that the sprint loop runs the same way it does under Claude Code.

### 1.2 Detailed Requirements
- Generate `.codex/agents/<name>.toml` for all 11 canonical agents with `scripts/build-codex-payload.mjs --write` (`npm run gen:codex`): frontmatter `name` → `name`, `description` → `description`, body → `developer_instructions`. `model` is **not** emitted: Codex forwards it verbatim to the provider and Claude's aliases (`haiku`/`sonnet`/`opus`) are not provider models (measured); roles inherit the session model.
- The canonical `.md` agent definitions remain the single source of truth; the TOML files are committed generated artifacts with a `# GENERATED …` header, and prebuild's `--check` fails the build on any hand edit or staleness.
- Install the portable shared skills — `flashcard` and `sprint-dashboard` — to `.agents/skills/<name>/SKILL.md`. The format is identical to Claude Code's, so these two copy verbatim. `sprint-execution` is excluded from this story: its SKILL.md hard-mandates Claude's Workflow tool (`/workflows`, the `launch_wave` contract, `parallel()`, `resumeFromRunId`) and is not portable as-is; the host-dispatch split that gives Codex its own sprint-execution instructions is [[STORY-058-12]].
- Add a harness-neutral repo-root shim, `.claude/hooks/lib/harness.sh` (generated Codex copy under `.codex/hooks/lib/`), sourced from the hook's own directory. Each hook keeps today's precedence: the three that honour `ORCHESTRATOR_PROJECT_DIR` (`token-ledger`, `pending-task-sentinel`, `pre-tool-use-task`) resolve `ORCHESTRATOR_PROJECT_DIR`, then `CLAUDE_PROJECT_DIR`, then the git top level of the stdin `cwd`; the rest resolve `CLAUDE_PROJECT_DIR`, then the stdin-cwd git top level; `pre-commit-surface-gate.sh` keeps git top level. `pre-commit.sh` has no repo-root resolution and is unchanged.
- **The shim must not change behavior under Claude Code** — where `CLAUDE_PROJECT_DIR` is set, resolution is unchanged.
- Record the enforcement delta: Codex has no per-agent `tools:` allowlist, so role tool restrictions degrade from harness-enforced to prompt-enforced.

### 1.3 Out of Scope
- Codex payload surfaces — [[STORY-058-10]].
- Token-ledger metering — deferred from SPRINT-41.
- Recovering a `tools:` equivalent for Codex; the delta is recorded, not solved.
- `sprint-execution` skill translation — its SKILL.md hard-mandates Claude's Workflow tool (`/workflows`, the `launch_wave` contract, `parallel()`, `resumeFromRunId`) and halts if `/workflows` is unavailable, so it is not verbatim-portable to Codex. The host-dispatch split that gives Codex its own sprint-execution instructions is [[STORY-058-12]].

### 1.4 Open Questions
- **Question:** can `sandbox_mode` plus per-agent `mcp_servers` approximate the `tools:` allowlist closely enough for the QA role's "never edits code" boundary?
- **Recommended:** treat it as an approximation and record the delta rather than claiming parity. QA's boundary becomes prompt-enforced under Codex; overstating it would be worse than documenting it.
- **Resolved 2026-09-25 (Architect, under the owner's autonomy directive):** record the delta; QA's boundary is prompt-enforced under Codex; no approximation is presented as enforcement (cleargate-enforcement.md §16).

### 1.5 Risks
- **The shim touches 8 of the 9 shared hooks (`pre-commit.sh` has no repo-root resolution), which Claude Code runs today.** A regression here breaks the working host to serve the new one. This is exactly the case [[STORY-058-09]]'s baseline exists to catch, and this story should land after it.
- Losing the `tools:` allowlist is a real enforcement regression under Codex, not a cosmetic one: 11 agent definitions pin a tool set, and `qa` deliberately omits `Write`.
- Generated TOML that is hand-edited becomes a second source of truth. Mark the files generated and assert regeneration is byte-stable.
- "The `cleargate-enforcement.md` M2 parity row is shared with CR-124 and STORY-058-12 (one row per rel); this story's QA-Red writes the byte-identical block pinned in `plans/replan-contract-first.md` §7.5, and the second of this story and CR-124 to merge deletes its identical copy."

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Codex role and skill translation

  Scenario: Agent TOML is generated from canonical markdown
    Given the canonical agent markdown definitions
    When the payload is generated
    Then one .codex/agents/<name>.toml exists per agent
    And each carries name, description, and developer_instructions from its source

  Scenario: Regeneration is byte-stable
    Given generated agent TOML files
    When generation runs again with unchanged sources
    Then the output is byte-identical

  Scenario: Portable skills copy verbatim
    Given the portable shared skills (flashcard, sprint-dashboard)
    When the Codex adapter installs them
    Then each .agents/skills/<name>/SKILL.md is byte-identical to its source
    And sprint-execution is not installed by this story

  Scenario: Repo-root shim resolves under Codex
    Given a hook invoked with no CLAUDE_PROJECT_DIR and a cwd field on stdin
    When the shim resolves the repository root
    Then it returns the git top level for that cwd

  Scenario: Repo-root shim is a no-op under Claude Code
    Given a hook invoked with CLAUDE_PROJECT_DIR set
    When the shim resolves the repository root
    Then it returns exactly what it returned before the shim existed

  Scenario: The tools-allowlist delta is recorded
    Given the Codex adapter documentation
    When the enforcement deltas are read
    Then the absent per-agent tools allowlist is listed as a known delta
```

### 2.2 Verification Steps (Manual)
- [ ] Start a real Codex session and confirm the roles are listed and delegable.
- [ ] Run the Claude hook suite with the shim in place and diff behavior against pre-shim.

## 3. The Implementation Guide

*Re-declared 2026-09-25 after STORY-058-01 (M1.md §D4 + STORY-058-01-arch.md §5): canonical paths → `cleargate-cli/scaffold/{core,hosts/claude}/**`. Starts only after STORY-058-02 merges, since it reads canonical through `cleargate-cli/test/helpers/scaffold-roots.ts` (created by -02). The 9 hook edits now land on the cli-repo story branch; the `cleargate-enforcement.md` edit keeps its D1 outer live-mirror twin.*

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scripts/build-codex-payload.mjs` |
| Related Files | `cleargate-cli/src/lib/manifest-builder.ts`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-commit-surface-gate.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-edit-gate.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-tool-use-autonomy.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-tool-use-task.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/token-ledger.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/hooks/session-start.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/hooks/pre-edit-gate.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/hooks/stamp-and-gate.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/hooks/token-ledger.sh`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`, `.cleargate/knowledge/cleargate-enforcement.md`, `cleargate-cli/scripts/clean-room/codex-hooks.mjs`, `cleargate-cli/scripts/clean-room/evidence.mjs`, `cleargate-cli/test/helpers/init-fixture.ts`, `cleargate-cli/test/snapshots/hooks-snapshots.node.test.ts`, `cleargate-cli/test/scripts/codex-hooks-harness.red.node.test.ts`, `cleargate-cli/test/commands/init.node.test.ts`, `cleargate-cli/test/commands/lifecycle-codex.red.node.test.ts`, `cleargate-cli/test/commands/init-host-snapshot.red.node.test.ts`, `cleargate-cli/test/scaffold/codex-payload.red.node.test.ts`, `cleargate-cli/test/hooks/pre-tool-use-task.node.test.ts`, `cleargate-cli/test/hooks/stamp-and-gate.node.test.ts`, `cleargate-cli/test/hooks/session-start.node.test.ts`, `cleargate-cli/test/hooks/cr-026-integration.node.test.ts`, `cleargate-cli/test/scaffold/file-surface-gate-e2e.node.test.ts`, `cleargate-cli/test/scaffold/pre-commit-downstream-safe.node.test.ts`, `cleargate-cli/CHANGELOG.md`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-commit.sh` — reference, unchanged, `cleargate-cli/package.json` — reference, unchanged |
| New Files Needed | `cleargate-cli/scaffold/hosts/claude/.claude/hooks/lib/harness.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/hooks/lib/harness.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect-reader.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect-synth.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/cleargate-wiki-contradict.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/cleargate-wiki-ingest.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/cleargate-wiki-lint.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/cleargate-wiki-query.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/developer.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/devops.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/reporter.toml`, `cleargate-cli/scaffold/core/.agents/skills/flashcard/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-dashboard/SKILL.md`, `cleargate-cli/test/scripts/codex-agents-codegen.red.node.test.ts`, `cleargate-cli/test/scaffold/portable-skills.red.node.test.ts`, `cleargate-cli/test/hooks/harness-shim.red.node.test.ts`, `cleargate-cli/test/hooks/hooks-claude-parity.red.integration.node.test.ts`, `cleargate-cli/test/docs/codex-enforcement-delta.red.node.test.ts`, `cleargate-cli/test/fixtures/hooks-pre-058-11/`, `cleargate-cli/test/snapshots/hooks/session-start.story-058-11.sh`, `cleargate-cli/test/snapshots/hooks/stamp-and-gate.story-058-11.sh`, `cleargate-cli/test/snapshots/hooks/pre-edit-gate.story-058-11.sh`, `cleargate-cli/test/snapshots/hooks/token-ledger.story-058-11.sh` |
| Orchestration Files | `.cleargate/delivery/pending-sync/STORY-058-11_codex_role_and_skill_translation.md`, `.cleargate/wiki/log.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-qa-red.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-tpv.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-dev.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-qa.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-arch.md`, `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-devops.md` |

- `cleargate-cli/scripts/build-codex-payload.mjs` — **modify** (created by STORY-058-10). Agent TOML codegen, the portable-skill copies and the shim copy, all under `--write`/`--check`.
- `cleargate-cli/scaffold/hosts/codex/.codex/agents/*.toml` and `cleargate-cli/scaffold/core/.agents/skills/{flashcard,sprint-dashboard}/SKILL.md` — **generated**, committed, never hand-edited.
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/lib/harness.sh` — **create**. The repo-root shim (the Codex copy is generated).
- 8 canonical hooks — **modify**. Adopt the shim with each script's current precedence. `pre-commit.sh` — **reference, unchanged**.
- `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` + `.cleargate/knowledge/cleargate-enforcement.md` — **modify**. Append §16 "Host Enforcement Deltas — Codex" (D1 twin).
- The ten test files above — **modify** (QA-Red / TPV re-seal only). The Developer writes no test file except the four `test/snapshots/hooks/*.story-058-11.sh` locks.

### 3.2 Technical Logic
The shim is deliberately ordered so the existing host wins: `ORCHESTRATOR_PROJECT_DIR` (already honored by `pending-task-sentinel.sh` and `pre-tool-use-task.sh`), then `CLAUDE_PROJECT_DIR`, then the stdin-derived fallback. Under Claude Code the third branch is never reached, which is what makes the change a no-op there — and that no-op must be asserted, not assumed.

TOML codegen is mechanical except for `tools:`, which has no Codex counterpart. Drop it and record the delta rather than inventing an approximation that reads like enforcement but is not.

Codex's `.codex/hooks.json` commands already export `CLAUDE_PROJECT_DIR` from `git rev-parse --show-toplevel` (STORY-058-10, AD-2), overriding a leaked value; the shim's stdin-cwd branch serves direct and future-host invocations. The codegen omits `model` (measured: forwarded verbatim to the provider) as well as `tools`.

"Contract-first execution (CR-124; SPRINT-41 re-plan `plans/replan-contract-first.md`): built in `OUTER/.worktrees/STORY-058-11/cleargate-cli` on `story/STORY-058-11`, cut from `contract/S-41-codex` (STORY-058-10 Developer commit `d0f0d95`); integrates after STORY-058-10 merges. CR-124 edits `architect.md`, `architect-synth.md` and `architect-reader.md`; whichever of this story and CR-124 merges second runs `npm run gen:codex` after merging cli `main` and commits the regenerated `.codex/agents/architect*.toml`. The frozen pre-shim hooks (`test/fixtures/hooks-pre-058-11/`) are the canonical hooks at `contract/S-41-codex`; if STORY-058-10 later changes a hook, QA-Red re-freezes them at integration."

### 3.3 API Contract (if applicable)
Generated agent file shape:
```toml
# GENERATED by cleargate-cli/scripts/build-codex-payload.mjs from scaffold/hosts/claude/.claude/agents/developer.md — do not edit; run `npm run gen:codex`.
name = "developer"
description = "..."
developer_instructions = """
<body of the canonical .md>"""
```

## Task Breakdown

- [x] QA-Red: codegen, portable skills, shim, 9-hook Claude parity and enforcement-doc reds; roles/skills harness verdicts; snapshots; M2 parity rows and the harness.sh sanctioned addition
- [x] Extend build-codex-payload.mjs: 11 .codex/agents/*.toml (name, description, developer_instructions; no model, no tools; GENERATED header) and flashcard + sprint-dashboard copied byte-identical to scaffold/core/.agents/skills/
- [x] Classify .codex/agents/** (agent) and .agents/skills/** (skill) in TIER_RULES
- [x] Add .claude/hooks/lib/harness.sh and adopt it in 8 hooks with each script's current precedence; pre-commit.sh unchanged; regenerate the Codex copies
- [x] Prove the shim is a no-op under Claude across all 9 hooks (frozen pre-shim copies vs current, identical Claude payloads)
- [x] Record the Codex enforcement deltas in cleargate-enforcement.md §16 (canonical and outer twin)
- [ ] Real Codex session: roles listed and delegable, portable skills discovered (harness scripted on the branch; RS-4 scripted + live)
- [x] Integrate: merge cli main after STORY-058-10 merges; regenerate codex copies; re-verify; QA-Verify (scripted harness, --container) and post-flight on the integrated tree

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | Codegen field mapping; codegen byte-stability; shim resolution order; shim no-op with CLAUDE_PROJECT_DIR set |
| Integration tests | 2 | All 9 hooks behave identically under Claude pre/post shim; portable skills (flashcard, sprint-dashboard) copied byte-identical |
| E2E / acceptance tests | 1 | Real Codex session: roles listed and delegable |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] The shim is proven a no-op under Claude Code across all 9 hooks before merge.
- [ ] The `tools:` delta is recorded as a known limitation, not presented as parity.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md` — representative of the 11 definitions carrying `name`, `description`, `tools`, `model` frontmatter; the codegen source (also the source for `qa.md`, unchanged, per the post-CR-123 scaffold copy).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/flashcard/SKILL.md` — one of 3 skills (flashcard, sprint-dashboard, sprint-execution); flashcard and sprint-dashboard are format-identical to Codex's and copy verbatim to `.agents/skills/<name>/SKILL.md`. `sprint-execution` is excluded from this story — its SKILL.md hard-mandates Claude's Workflow tool (`/workflows`, the `launch_wave` contract, `parallel()`, `resumeFromRunId`) and halts if `/workflows` is unavailable; the host-dispatch split for Codex is [[STORY-058-12]].
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh:34` and `pre-tool-use-task.sh:37` — `REPO_ROOT="${ORCHESTRATOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR}}"`, the existing two-branch precedent the shim generalizes.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-edit-gate.sh:13` — `REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"`, a third existing variant to unify.
- **Codex contract (external, v0.153.2 — documented, not on disk):** custom agents are TOML files under the Codex agents directory carrying `name`, `description`, `developer_instructions`, plus optional `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`; skills are SKILL.md directories under the Codex skills directory; there is no per-agent tools allowlist.

## Why not simpler?

- **Smallest existing surface:** hand-write 11 TOML files once and copy the skills.
- **Why isn't that sufficient?** Hand-written TOML becomes a second source of truth for role definitions that already change every few sprints; the two would drift within one sprint, and the drift would be silent because nothing compares them. Codegen plus a byte-stability assertion is the smallest thing that keeps one source.

## Prior work

- [[EPIC-058]] — parent epic; this story is one of its decompositions.
- [[PROPOSAL-074]] — Antigravity single-host port; the `HostAdapter` precedent EPIC-058 generalizes.
- [[SPRINT-34]] — `Polyglot Portability Hardening`; language/test-stack portability, adjacent but distinct from harness portability.
- Decomposition-time re-check 2026-09-04: `cleargate-wiki-query` returned [[EPIC-058]] and [[PROPOSAL-074]] as the only multi-host prior work; no story-level prior art exists for this scope.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low** — restored 2026-09-26 by the SPRINT-41 contract-first re-plan (RP-A15): CR-124's agent-text change is handled by the regenerate-on-second-merge rule; sprint-execution stays out of this story's scope.

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
- [x] `approved: true` is set in the YAML frontmatter. (Direct owner approval 2026-09-04.)


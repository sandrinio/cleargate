---
story_id: STORY-058-11
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
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-04T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
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
stamp_error: no ledger rows for work_item_id STORY-058-11
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-25T09:53:02Z
  sessions: []
---

# STORY-058-11: Codex role and skill translation with a harness-neutral repo-root shim

**Milestone:** M5 — Codex adapter

## 1. The Spec (The Contract)

### 1.1 User Story
As a developer using Codex, I want the five ClearGate execution roles and the shared skills available in my Codex session, so that the sprint loop runs the same way it does under Claude Code.

### 1.2 Detailed Requirements
- Generate `.codex/agents/*.toml` from the canonical agent markdown at build time: frontmatter `name` → `name`, `description` → `description`, body → `developer_instructions`, `model` → `model`.
- The canonical `.md` agent definitions remain the single source of truth; the TOML is a generated artifact, never hand-edited.
- Install the portable shared skills — `flashcard` and `sprint-dashboard` — to `.agents/skills/<name>/SKILL.md`. The format is identical to Claude Code's, so these two copy verbatim. `sprint-execution` is excluded from this story: its SKILL.md hard-mandates Claude's Workflow tool (`/workflows`, the `launch_wave` contract, `parallel()`, `resumeFromRunId`) and is not portable as-is; the host-dispatch split that gives Codex its own sprint-execution instructions is [[STORY-058-12]].
- Add a harness-neutral repo-root shim to the shared hook scripts: prefer `ORCHESTRATOR_PROJECT_DIR`, then `CLAUDE_PROJECT_DIR`, then derive from the stdin `cwd` field via `git rev-parse --show-toplevel`.
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
- **Human decision:** {pending Gate 1}

### 1.5 Risks
- **The shim touches all 9 shared hooks, which Claude Code runs today.** A regression here breaks the working host to serve the new one. This is exactly the case [[STORY-058-09]]'s baseline exists to catch, and this story should land after it.
- Losing the `tools:` allowlist is a real enforcement regression under Codex, not a cosmetic one: 11 agent definitions pin a tool set, and `qa` deliberately omits `Write`.
- Generated TOML that is hand-edited becomes a second source of truth. Mark the files generated and assert regeneration is byte-stable.

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
| Primary File | `cleargate-cli/scripts/build-codex-agents.mjs` |
| Related Files | `cleargate-cli/package.json` (the `prebuild` script, :42, gains the codegen step), `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` (canonical; D1 twin), `.cleargate/knowledge/cleargate-enforcement.md` (outer live twin), `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-commit-surface-gate.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-commit.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-edit-gate.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-tool-use-autonomy.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-tool-use-task.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/token-ledger.sh` |
| New Files Needed | `cleargate-cli/scaffold/core/.cleargate/hooks/lib/harness.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/**` |

- `cleargate-cli/scripts/build-codex-agents.mjs` — **create**. Markdown → TOML codegen at prebuild.
- `cleargate-cli/scaffold/hosts/codex/.codex/agents/**` — **generated**. Not hand-edited.
- `cleargate-cli/scaffold/core/.cleargate/hooks/lib/harness.sh` — **create**. The repo-root shim.
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/*.sh` (all 9: `pending-task-sentinel.sh`, `pre-commit-surface-gate.sh`, `pre-commit.sh`, `pre-edit-gate.sh`, `pre-tool-use-autonomy.sh`, `pre-tool-use-task.sh`, `session-start.sh`, `stamp-and-gate.sh`, `token-ledger.sh`) — **modify**, on the cli-repo story branch. Nine scripts adopt the shim; `CLAUDE_PROJECT_DIR` behavior preserved.
- `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` — **modify**. Record the Codex enforcement delta (D1 canonical).
- `.cleargate/knowledge/cleargate-enforcement.md` — **modify**. Outer live-mirror twin of the same edit (D1 twin rule).

### 3.2 Technical Logic
The shim is deliberately ordered so the existing host wins: `ORCHESTRATOR_PROJECT_DIR` (already honored by `pending-task-sentinel.sh` and `pre-tool-use-task.sh`), then `CLAUDE_PROJECT_DIR`, then the stdin-derived fallback. Under Claude Code the third branch is never reached, which is what makes the change a no-op there — and that no-op must be asserted, not assumed.

TOML codegen is mechanical except for `tools:`, which has no Codex counterpart. Drop it and record the delta rather than inventing an approximation that reads like enforcement but is not.

### 3.3 API Contract (if applicable)
Generated agent file shape:
```toml
name = "developer"
description = "..."
model = "..."
developer_instructions = """<body of the canonical .md>"""
```

## Task Breakdown

- [ ] Implement markdown → TOML codegen and wire it into prebuild.
- [ ] Assert regeneration is byte-stable and mark outputs as generated.
- [ ] Install the portable shared skills (`flashcard`, `sprint-dashboard`) verbatim to `.agents/skills/`; `sprint-execution` is excluded (host-dispatch split owned by [[STORY-058-12]]).
- [ ] Implement `harness.sh` with the three-branch resolution order.
- [ ] Adopt the shim across all 9 shared hooks.
- [ ] Prove the shim is a no-op under `CLAUDE_PROJECT_DIR`.
- [ ] Record the `tools:` enforcement delta in `cleargate-enforcement.md`.

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
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
- [x] `approved: true` is set in the YAML frontmatter. (Direct owner approval 2026-09-04.)


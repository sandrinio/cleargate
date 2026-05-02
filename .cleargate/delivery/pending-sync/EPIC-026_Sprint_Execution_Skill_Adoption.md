---
epic_id: EPIC-026
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-20
carry_over: false
status: Ready
ambiguity: 🟢 Low
context_source: Direct user ask 2026-05-02 — adopt V-Bounce-style agent-team SKILL pattern; skill drafted at .claude/skills/sprint-execution/SKILL.md during the same conversation; gate-1 waiver per memory feedback_proposal_gate_waiver.md
proposal_gate_waiver: true
approved: true
approved_by: sandrinio
approved_at: 2026-05-02T07:00:00Z
owner: sandrinio
target_date: 2026-05-31
created_at: 2026-05-02T00:00:00Z
updated_at: 2026-05-02T00:00:00Z
created_at_version: 174a479
updated_at_version: 174a479
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-02T17:52:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-026
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-02T17:52:46Z
  sessions: []
---

# EPIC-026: Sprint Execution Skill Adoption

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Promote .claude/skills/sprint-execution/SKILL.md to the canonical orchestration playbook — auto-loaded on sprint-active sessions, mirrored to the cleargate-init scaffold, and authoritative over CLAUDE.md's duplicated four-agent-loop content.</objective>
  <architecture_rules>
    <rule>Must use the existing three-tuple skill location pattern (live dogfood + cleargate-planning canonical + cleargate-cli/templates derived).</rule>
    <rule>Must use existing PostToolUse / SessionStart hook surfaces; do NOT add new hook event types.</rule>
    <rule>Must preserve all halt-at-gates rules in CLAUDE.md as one-liner pointers — pruning content is allowed, but Gate 1/Gate 4/triage/halt rules MUST remain visible without loading any skill.</rule>
    <rule>No changes to .claude/agents/{architect,developer,qa,reporter}.md role contracts — the skill consumes their existing outputs, it does not redefine them.</rule>
    <rule>No changes to existing scripts (close_sprint.mjs, init_sprint.mjs, validate_bounce_readiness.mjs, write_dispatch.sh).</rule>
    <rule>Mirror parity: edits to the canonical skill at cleargate-planning/.claude/skills/sprint-execution/ MUST be followed by `npm run prebuild` in cleargate-cli to regenerate the bundled scaffold + MANIFEST.json (per FLASHCARD #scaffold #mirror #prebuild 2026-05-01).</rule>
  </architecture_rules>
  <target_files>
    <file path=".claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path="cleargate-planning/.claude/skills/sprint-execution/SKILL.md" action="create" />
    <file path="cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md" action="create" />
    <file path=".claude/hooks/session-start.sh" action="modify" />
    <file path="cleargate-planning/.claude/hooks/session-start.sh" action="modify" />
    <file path="cleargate-cli/src/commands/sprint.ts" action="modify" />
    <file path="CLAUDE.md" action="modify" />
    <file path="cleargate-planning/CLAUDE.md" action="modify" />
    <file path="cleargate-planning/MANIFEST.json" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

Sprint orchestration content is duplicated across four always-loaded surfaces (CLAUDE.md, cleargate-protocol.md, cleargate-enforcement.md, per-agent contracts). Adding a new pattern means editing four files and hoping they stay aligned. The orchestrator reconstructs the loop from fragments at every dispatch — which has measurably failed at least once (BUG-005, FLASHCARDs #cli #sprint-close #assume-ack and #cli #state-update #execution-mode show the orchestrator missing CLI flags it should know about). Downstream cleargate users (post-`cleargate init`) get the same scattered surface with no single playbook entry point.

The V-Bounce-Engine project ships a single `agent-team/SKILL.md` (~813 lines) that codifies the entire bounce sequence as a numbered playbook. We've drafted ClearGate's equivalent at `.claude/skills/sprint-execution/SKILL.md` (~430 lines). What's missing: making it canonical (mirrored into the scaffold), forcing it to load on sprint-active sessions, and pruning the now-redundant content from CLAUDE.md.

**What:**

Three deliverables:
1. **Auto-load infrastructure (M1)** — SessionStart hook + sprint CLI commands print `→ Load skill: sprint-execution` when a sprint is active, so the orchestrator picks it up reliably without depending solely on natural-language triggers.
2. **Content migration (M2)** — CLAUDE.md (live + canonical) prunes duplicated four-agent-loop content down to one-line pointers; the skill becomes the single source of truth.
3. **Scaffold parity** — canonical skill lives in `cleargate-planning/.claude/skills/sprint-execution/`; downstream users get it via `cleargate init`.

**Success Metrics (North Star):**
- **1 source of truth.** A grep for "four-agent loop" / "dispatch marker" / "Sprint Execution Gate" content returns the skill plus pointers, not duplicated prose. Measured: line count of orchestration-specific content in CLAUDE.md drops by ≥ 60 lines (~40% of file).
- **Skill auto-loads in 100% of sprint-active sessions.** Verified by: SessionStart banner contains `Load skill: sprint-execution` line in any session opened against a repo with non-empty `.cleargate/sprint-runs/.active`. Smoke test in M1 acceptance.
- **One full sprint executed with skill loaded end-to-end.** Defined as: a sprint kicked off after EPIC-026 ships completes through close (Phase A → E) without the orchestrator needing to re-read CLAUDE.md's four-agent-loop section. Verified post-hoc via the next sprint's REPORT §5 Process subsection.
- **Downstream parity.** A fresh `cleargate init` into an empty repo installs `.claude/skills/sprint-execution/SKILL.md` byte-identical to the canonical source. Verified by `cleargate doctor --check-scaffold` returning clean.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] **M1.1 — SessionStart auto-load directive.** Extend `.claude/hooks/session-start.sh` to read `.cleargate/sprint-runs/.active`. If non-empty, append exactly one line to stdout after the doctor banner: `→ Active sprint detected. Load skill: sprint-execution`. Mirror to `cleargate-planning/.claude/hooks/session-start.sh`.
- [ ] **M1.2 — Sprint CLI directives.** `cleargate sprint preflight <id>` (after "all four checks pass") and `cleargate sprint init <id>` (after successful state.json write) emit one stdout line: `→ Load skill: sprint-execution`. Touch `cleargate-cli/src/commands/sprint.ts` only.
- [ ] **M1.3 — Canonical mirror + scaffold rebuild.** Copy live `.claude/skills/sprint-execution/SKILL.md` to `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`. Run `npm run prebuild` in `cleargate-cli/` to regenerate `cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md` and update `cleargate-planning/MANIFEST.json` SHA entries.
- [ ] **M2.1 — CLAUDE.md prune (live + canonical).** Remove the four-agent-loop block, dispatch convention paragraph, Sprint Execution Gate description, sprint-close ack rules, and Architect-runs-twice paragraph. Replace with a single bullet: `**Sprint execution.** When a sprint is active, the orchestration playbook lives at .claude/skills/sprint-execution/SKILL.md — load it before dispatching any execution agent.` Apply identically to `CLAUDE.md` and `cleargate-planning/CLAUDE.md`. Net delete ≥ 60 lines per file.
- [ ] **M2.2 — Wall-clock budget visibility.** No code change required — budgets table lives in skill §1. Acceptance is purely "skill contains the table" (already done in pre-Epic skill polish).
- [ ] **Smoke validation.** Open a fresh session against this repo with `.active=SPRINT-19` (current state); verify SessionStart banner emits the load directive. Run `cleargate sprint preflight SPRINT-19` and verify the directive appears on stdout.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- **Background watcher / heartbeat infra** for stall detection (Option 2/3 from the design conversation). Defer until Option 1 (wall-clock budgets) has been observed across ≥ 2 sprints to know whether ambient monitoring is actually needed.
- **Bounce counter automation** (`update_state.mjs --qa-bounce` / `--arch-bounce` flag implementation). The skill currently documents the *intended* contract; whether the script supports those flags is a separate ticket.
- **Renaming `--assume-ack`** to a non-"ack" flag. Touches `close_sprint.mjs` + protocol + enforcement docs across multiple repos. Separate CR.
- **Removing legacy "bounce" terminology** from state.json fields, script names, or `Bouncing` state value. Code-bound; rewriting requires a schema migration and is not justified by clarity gains alone.
- **Reorganizing cleargate-protocol.md or cleargate-enforcement.md.** Both remain authoritative for non-execution rules (triage, gates, lifecycle, lane rubric). Only CLAUDE.md prunes; the deeper protocol docs stay intact.
- **Adding new agents to the roster.** No new subagent_types introduced.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| **Mirror parity** | Edits to canonical (`cleargate-planning/`) MUST trigger `npm run prebuild` in `cleargate-cli/` in the same commit. Skipping it leaves stale `cleargate-cli/templates/cleargate-planning/...` and a drifted `MANIFEST.json` — `cleargate doctor --check-scaffold` will fail. (FLASHCARD `#scaffold #mirror #prebuild` 2026-05-01.) |
| **CLAUDE.md edit-parity invariant** | Edits to live `CLAUDE.md` MUST mirror to `cleargate-planning/CLAUDE.md` per-edit. Pre-existing divergence is NOT reconciled as a side effect (FLASHCARD `#mirror #parity` 2026-05-01). M2.1 only touches the orchestration block. |
| **Halt rules must remain always-on** | Triage, Gate 1, Gate 4, halt-at-gates, Brief contract — these MUST remain in the post-prune CLAUDE.md. They fire on every conversational turn, not only during execution. Pruning them would degrade non-execution behavior. |
| **No regression in v1 mode** | The skill describes both v1 and v2 mechanics. Sprints under `execution_mode: v1` MUST continue to work as advisory after the skill loads — the skill does not impose v2 enforcement on v1 sprints. |
| **Token-cost budget** | The skill is ~430 lines / ~17KB. Loading it costs ~4.3K tokens. Pruning CLAUDE.md by ~60 lines saves ~1.5K tokens always-on. Net token cost during a sprint-active session: ~+2.8K tokens (skill loads) once. Net savings during planning/triage sessions (skill does not load): ~1.5K per turn. |
| **Mid-conversation skill load** | Claude Code skills auto-load on description match. CLI directives (`→ Load skill: ...`) and SessionStart banner output are advisory — the harness doesn't have a documented contract that those exact strings force-load. We rely on the orchestrator (the conversational agent) to read those lines and invoke the Skill tool explicitly. Not a hard guarantee. |
| **No cross-repo MCP / scaffold protocol changes** | EPIC-026 ships entirely within the meta-repo. No MCP server changes; no new `cleargate doctor` checks; no protocol §-numbering shuffle (FLASHCARD `#protocol #section-numbering` 2026-04-21). |

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**

- `.claude/skills/sprint-execution/SKILL.md` — already exists; minor polish in pre-Epic work added wall-clock budget table to §1.
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — **new file**, byte-identical copy of live skill at copy time. Future edits use the live→canonical `cp` pattern from `.claude/settings.local.json` (entries lines 99–104).
- `cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — **new file**, generated by `cleargate-cli/scripts/copy-planning-payload.mjs` on prebuild (no manual edits).
- `cleargate-planning/MANIFEST.json` — auto-regenerated by `npm run build` prebuild; gains one entry for the new skill file with sha256, tier, overwrite_policy, preserve_on_uninstall fields per protocol §13.2.
- `.claude/hooks/session-start.sh` — append ~10 lines after the doctor invocation (line 16): read `.cleargate/sprint-runs/.active`; if non-empty after stripping whitespace, `printf '→ Active sprint detected. Load skill: sprint-execution\n'`. Exit 0 unconditionally (existing semantics).
- `cleargate-planning/.claude/hooks/session-start.sh` — identical edit; mirror parity.
- `cleargate-cli/src/commands/sprint.ts` —
  - `preflightHandler` (around line 1051 after `stdoutFn(\`cleargate sprint preflight: all four checks pass for ${sprintId}\`)`): emit `stdoutFn('→ Load skill: sprint-execution')`.
  - `sprintInitHandler` (after successful `init_sprint.mjs` invocation): same one-line emit.
- `CLAUDE.md` (lines roughly 73–119, the four-agent-loop block): collapse to single bullet pointer. Keep all triage / halt / Gate 1 / Gate 4 rules untouched.
- `cleargate-planning/CLAUDE.md` (the bounded `<!-- CLEARGATE:START -->` block, lines mirroring live): identical prune.

**Data Changes:**

- `cleargate-planning/MANIFEST.json` — one new file entry (auto-generated):
  ```json
  {"path": ".claude/skills/sprint-execution/SKILL.md", "sha256": "<computed>", "tier": "skill", "overwrite_policy": "merge-3way", "preserve_on_uninstall": "default-remove"}
  ```
- No DB migrations; no schema changes; no new env vars.
- No state.json schema delta.

## 5. Acceptance Criteria

```gherkin
Feature: Sprint Execution Skill Adoption

  Scenario: SessionStart banner emits load directive when sprint is active
    Given a repo at the meta-repo with .cleargate/sprint-runs/.active containing "SPRINT-19"
    And the sprint-execution skill exists at .claude/skills/sprint-execution/SKILL.md
    When a new Claude Code session starts and the SessionStart hook runs
    Then the hook stdout contains the line "→ Active sprint detected. Load skill: sprint-execution"
    And the hook exits 0

  Scenario: SessionStart banner stays quiet when no sprint is active
    Given a repo with .cleargate/sprint-runs/.active empty or missing
    When a new Claude Code session starts and the SessionStart hook runs
    Then the hook stdout does NOT contain "Load skill: sprint-execution"
    And the hook exits 0

  Scenario: cleargate sprint preflight emits load directive on success
    Given a sprint passing all four preflight checks
    When the user runs "cleargate sprint preflight SPRINT-19"
    Then the command exits 0
    And the stdout's last line is "→ Load skill: sprint-execution"

  Scenario: cleargate sprint init emits load directive on success
    Given a sprint plan in pending-sync/SPRINT-NN_*.md with confirmed status
    When the user runs "cleargate sprint init SPRINT-NN"
    Then the command writes state.json successfully
    And the stdout contains "→ Load skill: sprint-execution"

  Scenario: Canonical skill matches live skill byte-for-byte after M1.3
    Given the live skill at .claude/skills/sprint-execution/SKILL.md
    When M1.3 ships
    Then cleargate-planning/.claude/skills/sprint-execution/SKILL.md exists
    And `diff` against the live file produces zero output

  Scenario: Scaffold rebuild produces a clean MANIFEST.json
    Given M1.3 has run "npm run prebuild" in cleargate-cli/
    When the user runs "cleargate doctor --check-scaffold" in the meta-repo
    Then the command exits 0
    And no drift entries reference the new skill path

  Scenario: cleargate init installs the skill into a fresh repo
    Given an empty target directory
    When the user runs "cleargate init <empty-dir>"
    Then <empty-dir>/.claude/skills/sprint-execution/SKILL.md exists
    And its sha256 matches the cleargate-planning/.claude/skills/sprint-execution/SKILL.md sha256

  Scenario: CLAUDE.md prune preserves all halt rules
    Given M2.1 has shipped
    When grepping CLAUDE.md and cleargate-planning/CLAUDE.md
    Then both files contain the line about Gate 4 close ack
    And both contain the triage-first-draft-second rule
    And both contain the halt-at-gates rule
    And both contain a one-line pointer to .claude/skills/sprint-execution/SKILL.md
    And both files have been reduced by ≥ 60 lines vs the pre-prune SHA

  Scenario: Pruned CLAUDE.md no longer duplicates the skill content
    Given M2.1 has shipped
    When grepping CLAUDE.md for "Orchestrator Dispatch Convention" and "Architect runs twice" and "Sprint Execution Gate"
    Then no matches are found in either CLAUDE.md or cleargate-planning/CLAUDE.md
    But matches ARE found in .claude/skills/sprint-execution/SKILL.md

  Scenario: First post-Epic sprint executes successfully with skill loaded
    Given EPIC-026 has shipped
    And the orchestrator opens a session with sprint SPRINT-NN active
    When the orchestrator dispatches a Developer agent for STORY-NN-NN
    Then the orchestrator's pre-dispatch text references the skill (not CLAUDE.md) for dispatch-marker syntax
    And the dispatch marker file is written correctly per the skill's §1 contract
```

## 6. AI Interrogation Loop (Human Input Required)

All human answers received 2026-05-02; integrated into the spec above. Listed here for audit:

1. **Emit load directive on partial preflight failures?** — **NO, only on success.** Preflight failures halt the orchestrator at the punch list; auto-loading the skill mid-failure is meaningless.
2. **Prune the "Sprint mode v1/v2" and "Boundary gates (CR-017)" bullets from CLAUDE.md?** — **KEEP both.** They affect triage decisions outside sprint-active state; pruning would degrade non-execution behavior.
3. **Add explicit "when banner says Load skill X, invoke Skill tool" instruction to post-prune CLAUDE.md?** — **YES.** Description-match auto-load is unreliable as the sole forced-load path; the explicit rule is the contract.
4. **Target sprint?** — **SPRINT-20.** SPRINT-19 is mid-flight.
5. **Build `cleargate sprint check-stalls` (Option 2 stall watcher) inside this Epic?** — **DEFER.** Ship Option 1 (skill wall-clock budget table) only. File Option 2 as a follow-up CR after one sprint of observation if budgets prove insufficient.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this epic extends.

- **Surface:** `.claude/skills/sprint-execution/SKILL.md` (live) — the V-Bounce-style sprint-execution skill drafted during the same conversation
- **Surface:** `CLAUDE.md` "Architect runs twice" + "Sprint Execution Gate" paragraphs — the prune surface for STORY-026-02
- **Surface:** `cleargate-cli/src/commands/sprint.ts` — `cleargate sprint init/preflight/close` handlers
- **Coverage of this epic's scope:** ≥80% — this epic extends + prunes existing surfaces, does not introduce a new orchestration layer

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this epic:** The SessionStart hook + a CLAUDE.md docs-only edit.
- **Why isn't extension / parameterization / config sufficient?** CLAUDE.md prose is unbounded; the skill-load directive needs a deterministic banner emit on sprint-active sessions, requiring a CLI sprint-context-emit handler in addition to the docs. A docs-only edit does not load the skill reliably.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Decomposition**

Requirements to pass to Green (Ready for Coding Agent):
- [x] Proposal step waived per memory `feedback_proposal_gate_waiver.md` — direct user ask with sharp intent + inline reference to the V-Bounce SKILL pattern. Recorded in `context_source` and frontmatter `proposal_gate_waiver: true` + `approved_by`/`approved_at`.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.

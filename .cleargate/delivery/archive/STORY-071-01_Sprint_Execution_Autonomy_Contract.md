---
story_id: STORY-071-01
parent_epic_ref: CR-071
parent_cleargate_id: CR-071
sprint_cleargate_id: SPRINT-30
carry_over: false
area: protocol/sprint-execution,agent-contracts,hooks
status: "Completed"
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
context_source: |
  Decomposed from CR-071 at SPRINT-30 SDR 2026-05-19. CR-071 anchors the
  Sprint Execution Autonomy rule in the protocol doc (currently only in
  the orchestrator skill), propagates it to five agent definitions, and
  adds one soft PreToolUse hook for visibility.

  Open Question resolutions adopted from CR-071 §0.5:
  - Q1 (hard vs soft hook): soft for v1 of this CR. Hard enforcement
    risks blocking the legitimate-blocker case. Promote to hard in a
    follow-up after soft data confirms agents aren't crying wolf.
  - Q2 (SDR scope): contract does NOT apply during Architect Sprint
    Design Review (pre-Active). Kicks in at sprint_status: "Active".
  - Q3 (wiki-contradict): advisory subagents that warn without halting
    are fine — they're informational, not blocking.
  - Q4 (contradictory Gherkin): hard blocker. Developer writes
    blockers report and returns BLOCKED. Spec contradictions are
    Gate-1/Gate-2 escapes.

  Three-site dogfood-mirror discipline applies to agent .md files:
  canonical at cleargate-planning/.claude/agents/, npm payload at
  cleargate-cli/templates/cleargate-planning/.claude/agents/ (auto-synced
  via prebuild), and live /.claude/agents/ (manual sync). Same for the
  new PreToolUse hook and settings.json registration.
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T16:11:13Z
stamp_error: no ledger rows for work_item_id STORY-071-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T16:11:13Z
  sessions: []
---

# STORY-071-01: Anchor Sprint Execution Autonomy contract in protocol doc + propagate to all loop agents + soft PreToolUse hook

**Complexity:** L2 — one new protocol-doc section, five agent-definition edits, one new shell hook, one settings.json wire-up, and tests. ~250 LOC delta plus doc churn.

## 1. The Spec

### 1.1 User Story

As the orchestrator (and as any of the four execution agents — Architect, Developer, QA, DevOps), I want the autonomy contract — "do not ask the user during sprint execution; write a blockers report or decide" — written in ONE canonical place (the protocol doc), referenced from every agent definition, AND visible mechanically through a soft hook that warns when `AskUserQuestion` fires during an active sprint. Today the rule lives only in `.claude/skills/sprint-execution/SKILL.md:640`; sub-agents don't read the skill, so the rule effectively only applies to me.

### 1.2 Detailed Requirements

1. **New protocol-doc section.** Append to `.cleargate/knowledge/cleargate-protocol.md` a new section titled **§ Sprint Execution Autonomy** containing:
   - The rule: once `sprint_status: "Active"`, no agent (Orchestrator, Architect, Developer, QA, DevOps, Reporter) MAY issue a user-facing prompt (`AskUserQuestion`, `ExitPlanMode`, interactive stdin read) EXCEPT under the five enumerated true-blocker cases below.
   - The rationale: all ambiguity is supposed to clear at Gate 2; mid-execution questions are evidence Gate 2 was incomplete.
   - The five true-blocker cases enumerated verbatim per CR-071 §1.2: (1) Destructive action approval, (2) Secret/credential handling, (3) User-intent decision, (4) True technical impossibility, (5) Spec-internal contradiction.
   - The "Not blockers — agent decides" list per CR-071 §1.2.
   - Scope note: SDR (Architect's Sprint Design Review, pre-Active) is EXEMPT.
2. **Skill cross-reference.** Edit `.claude/skills/sprint-execution/SKILL.md` (current single-sentence rule near line 640). Replace with a cross-reference: `See .cleargate/knowledge/cleargate-protocol.md § Sprint Execution Autonomy for the canonical rule and blocker enumeration.` Mirror in `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (canonical).
3. **Propagate to five agent definitions** under `cleargate-planning/.claude/agents/`:
   - `architect.md` — add **Autonomy Contract** subsection near top.
   - `developer.md` — add same.
   - `qa.md` — add same (plus inline blockers-protocol if currently thin).
   - `devops.md` — add same.
   - `reporter.md` — add same plus a subsection on reading `.cleargate/hook-log/autonomy-warnings.log` at sprint close.
   Each subsection asserts: "You MUST NOT call `AskUserQuestion` or any other user-facing prompt during sprint execution." Lists the 5 true-blocker cases (cross-reference to protocol doc; not copy-pasted to avoid drift). Closes with: "When in doubt, write a blockers report and return `BLOCKED`. Do not interpret silence as permission to proceed on ambiguous scope."
4. **Run mirror prebuild** — `cd cleargate-cli && npm run prebuild` to sync canonical agents to `cleargate-cli/templates/cleargate-planning/.claude/agents/`.
5. **Live re-sync** — manual hand-port OR re-run `cleargate init` against this meta-repo. DoD item; orchestrator visually confirms `/.claude/agents/*.md` carry the new section.
6. **New PreToolUse hook**: `cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh`. Reads stdin (Claude Code's PreToolUse hook JSON payload), inspects `tool_name`. If `AskUserQuestion`:
   - Check active-sprint sentinel `.cleargate/sprint-runs/.active`. If empty/absent → exit 0 (silent).
   - Read corresponding `state.json` `sprint_status`. If not `"Active"` → exit 0.
   - Append a line to `.cleargate/hook-log/autonomy-warnings.log`: `<ISO-timestamp>\t<dispatch-marker-agent>\t<question-summary>`. Use the dispatch marker `.cleargate/sprint-runs/<sprint>/.dispatch-*.json` to identify the active agent.
   - Exit 0 (soft mode — does NOT block the call).
7. **Wire hook into settings**. Edit `cleargate-planning/.claude/settings.json` to add `pre-tool-use-autonomy.sh` under `hooks.PreToolUse`. Mirror to npm payload via prebuild. Mirror to live `/.claude/settings.json` (manual).
8. **Reporter sprint-close reads log.** Reporter agent (per `cleargate-planning/.claude/agents/reporter.md`) reads `.cleargate/hook-log/autonomy-warnings.log` at sprint close and produces an `## Autonomy Warnings` section in the sprint report (empty if no warnings).
9. **Tests**:
   - Protocol doc carries `§ Sprint Execution Autonomy` heading + 5 enumerated blocker cases.
   - Each of the five agent definitions carries an `Autonomy Contract` heading + `MUST NOT...AskUserQuestion` assertion.
   - Soft hook appends to log when `tool_name=AskUserQuestion` AND active sprint exists.
   - Soft hook is silent when no active sprint.
   - Soft hook exits 0 in both cases (never blocks).
   - Test fixture for active-sprint state: `.cleargate/sprint-runs/.active` containing `SPRINT-FX1`, with `state.json` `sprint_status: "Active"`.

### 1.3 Out of Scope

- Hard enforcement of the AskUserQuestion ban (PreToolUse hook blocking the call). Deferred to follow-up CR after soft data shows agents aren't crying wolf.
- Changes to the existing blockers-report mechanism (`STORY-NNN-NN-dev-blockers.md` etc.). Already correct; this story just makes blockers-reporting the default-mandatory escalation path.
- Rewriting Architect SDR docs to ALSO restrict AskUserQuestion. SDR is exempt by design (Open Question #2).
- Cross-cutting changes to advisory subagents (`cleargate-wiki-contradict`, `cleargate-wiki-query`). They don't issue user prompts; they emit advisory findings.

### 1.4 Open Questions

None. All four CR-071 Open Questions resolved during decomposition (see context_source).

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| Three-site dogfood mirror skipped — live `/.claude/agents/*.md` retain old text | DoD item: `cleargate init` re-run against meta-repo + orchestrator visual confirm of live agent file headers. |
| Soft hook fires on legitimate-blocker calls and clutters log | Expected — that's the data we want. Reporter's sprint-close section surfaces it. If a real signal emerges (e.g. agent crying wolf in 80% of cases) we tighten in a follow-up. |
| Hook's dispatch-marker lookup fails when no marker exists (rare race) | Hook falls back to writing `"unknown"` for agent column; never errors. Logged for follow-up. |
| Reporter cannot find log file at sprint close (no warnings fired) | Reporter writes "No autonomy warnings recorded." in the report section. Empty file is not an error. |
| Agent .md file edits drift between canonical and live due to manual re-sync gap | The grep-test in §4 covers BOTH canonical and live paths so the gap surfaces at test time. |

### 1.6 Existing Surfaces

- **Surface:** `.cleargate/knowledge/cleargate-protocol.md` — protocol doc; story appends new section.
- **Surface:** `.claude/skills/sprint-execution/SKILL.md` — currently carries the single-sentence rule; story replaces with cross-reference.
- **Surface:** `cleargate-planning/.claude/agents/architect.md` — canonical agent def; story adds Autonomy Contract subsection.
- **Surface:** `cleargate-planning/.claude/agents/developer.md` — canonical agent def; same.
- **Surface:** `cleargate-planning/.claude/agents/qa.md` — canonical agent def; same plus blockers protocol fill-in.
- **Surface:** `cleargate-planning/.claude/agents/devops.md` — canonical agent def; same.
- **Surface:** `cleargate-planning/.claude/agents/reporter.md` — canonical agent def; same plus autonomy-warnings log read.
- **Surface:** `cleargate-planning/.claude/settings.json` — canonical settings; story wires new hook into PreToolUse array.
- **Surface:** `cleargate-cli/templates/cleargate-planning/.claude/agents/architect.md` — npm payload mirror; auto-synced via prebuild.
- **Coverage of this story's scope:** ~50% — promotion + clarification + one new hook + one settings.json wire-up. No new mechanism.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** add a one-line note "see SKILL.md:640" to each agent definition.
- **Why isn't extension sufficient?** That keeps the rule in the orchestrator skill where sub-agents don't read it. Sub-agents read their OWN .md file, not the skill. The propagation IS the fix — the rule needs to be in every agent definition's prompt-injection surface. The hook is the optional visibility layer; the doc propagation is the load-bearing part.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Sprint Execution Autonomy contract is canonical and visible

  Scenario: protocol doc carries the section and 5 enumerated cases
    Given the file ".cleargate/knowledge/cleargate-protocol.md"
    When I read its contents
    Then it contains a heading matching "Sprint Execution Autonomy"
    And it mentions "Destructive action"
    And it mentions "Secret" and "credential"
    And it mentions "User-intent decision"
    And it mentions "technical impossibility"
    And it mentions "Spec-internal contradiction"

  Scenario: each loop agent carries the contract
    Given the canonical agent files under "cleargate-planning/.claude/agents/"
    When I read architect.md / developer.md / qa.md / devops.md / reporter.md
    Then each file contains a heading "Autonomy Contract"
    And each asserts "MUST NOT" and "AskUserQuestion"
    And reporter.md additionally mentions "autonomy-warnings"

  Scenario: SKILL.md is cross-referenced
    Given the file ".claude/skills/sprint-execution/SKILL.md"
    When I read it
    Then the autonomy rule near line 640 cross-references the protocol doc

  Scenario: soft hook logs when AskUserQuestion fires during active sprint
    Given fixture .cleargate/sprint-runs/.active contains "SPRINT-FX1"
    And fixture state.json sprint_status is "Active"
    When I invoke the hook with stdin {"tool_name":"AskUserQuestion","tool_input":{"question":"foo?"}}
    Then the hook exits 0
    And .cleargate/hook-log/autonomy-warnings.log gains one new line containing timestamp and "AskUserQuestion"

  Scenario: hook is silent without active sprint
    Given .cleargate/sprint-runs/.active is empty or absent
    When I invoke the hook with the same payload
    Then the hook exits 0
    And the log file is unchanged

  Scenario: settings.json wires the hook into PreToolUse
    Given canonical cleargate-planning/.claude/settings.json
    When I parse the JSON
    Then hooks.PreToolUse contains an entry referencing pre-tool-use-autonomy.sh
```

### 2.2 Verification Steps (Manual)

- [ ] Read `.cleargate/knowledge/cleargate-protocol.md` — visually confirm the new section reads cleanly and the 5 cases are unambiguous.
- [ ] Run `cleargate init` against this meta-repo. Read `/.claude/agents/developer.md` — confirm Autonomy Contract subsection is present in the live copy.
- [ ] Manually trigger an `AskUserQuestion` from a test prompt during a (fixture) active sprint — confirm `.cleargate/hook-log/autonomy-warnings.log` gains a line and the question still proceeds (soft mode).
- [ ] `cd cleargate-cli && npm test` green.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Protocol Doc | `.cleargate/knowledge/cleargate-protocol.md` |
| Skill File | `.claude/skills/sprint-execution/SKILL.md` (live) + canonical mirror at `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` |
| Agent Defs | `cleargate-planning/.claude/agents/architect.md`, `cleargate-planning/.claude/agents/developer.md`, `cleargate-planning/.claude/agents/qa.md`, `cleargate-planning/.claude/agents/devops.md`, `cleargate-planning/.claude/agents/reporter.md` |
| New Hook | `cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh` (NEW) |
| Settings | `cleargate-planning/.claude/settings.json` |
| Test File | `cleargate-cli/test/hooks/pre-tool-use-autonomy.node.test.ts` (NEW) + `cleargate-cli/test/docs/autonomy-contract.node.test.ts` (NEW — grep assertions over protocol doc + agent files) |
| Mirrors | npm payload at `cleargate-cli/templates/cleargate-planning/.claude/agents/*` + live `/.claude/agents/*` |
| New Files Needed | Yes — hook + two test files |

### 3.2 Technical Logic

1. **Protocol-doc section.** Open `.cleargate/knowledge/cleargate-protocol.md`. Append at end (or in a logical location near existing sprint-execution docs):
   ```markdown
   ## § Sprint Execution Autonomy

   Once a sprint's frontmatter / state.json carries `sprint_status: "Active"`, no agent
   — Orchestrator, Architect, Developer, QA, DevOps, or Reporter — MAY issue a user-facing
   prompt (AskUserQuestion, ExitPlanMode, interactive stdin read) EXCEPT under one of the
   five true-blocker cases below.

   **Rationale:** all ambiguity is supposed to clear at Gate 2 (pre-sprint). Mid-execution
   questions are evidence that Gate 2 was incomplete; the right answer is to surface those
   gaps to the next sprint's Gate-2 checklist, not to interrupt current execution.

   **Scope:** the contract activates at sprint Active. Architect's Sprint Design Review
   (SDR) — which runs after initial Gate 2 but before sprint goes Active — is EXEMPT.

   ### True blockers (escalation REQUIRED)

   1. **Destructive action approval.** force-push, `git reset --hard`, dropping a DB table,
      deleting an untracked file the user might own, killing a process. Ask before performing.
   2. **Secret / credential handling.** Anything that would require reading from .env files,
      fetching a secret, or persisting credential material. Ask before reading or writing.
   3. **User-intent decision.** A question whose answer is genuinely "what does the user
      want?" and cannot be inferred from sprint goal, story Gherkin, or prior decisions.
   4. **True technical impossibility.** Required infrastructure unavailable (e.g. test DB
      unreachable, MCP down). Write blockers report AND surface to user.
   5. **Spec-internal contradiction.** Story Gherkin contradicts itself, or two stories
      in the same wave specify incompatible behavior on a shared surface. Write blockers
      report — Gate-1/Gate-2 escape that human must triage.

   ### Not blockers — agent decides

   - Choice between two reasonable implementations that both meet the acceptance Gherkin.
   - Test-pattern selection within established repo precedent.
   - Minor wording / UX copy choices. Default to conservative; document in dev report.
   - Refactor-or-not within the touched surface. Default NO refactor.
   - Library version selection within the Architect's pre-validated table.
   - Error-message phrasing.
   - Log-line format.

   **When in doubt: write a blockers report (`STORY-NNN-NN-<agent>-blockers.md`) and
   return BLOCKED. Do not interpret silence as permission to proceed on ambiguous scope.**
   ```
2. **Skill cross-reference.** Edit `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` near the existing single-sentence autonomy rule. Replace with the cross-reference text. Mirror to live `/.claude/skills/sprint-execution/SKILL.md`.
3. **Agent definitions.** For each of the five files under `cleargate-planning/.claude/agents/`, insert near the top (after the frontmatter and the agent's role summary):
   ```markdown
   ## Autonomy Contract

   During sprint execution (sprint_status: "Active"), you MUST NOT call `AskUserQuestion`
   or any other user-facing prompt EXCEPT under the five true-blocker cases enumerated in
   `.cleargate/knowledge/cleargate-protocol.md` § Sprint Execution Autonomy. When in doubt,
   write a blockers report (`STORY-NNN-NN-<your-agent>-blockers.md`) and return BLOCKED.
   Do not interpret silence as permission to proceed on ambiguous scope.
   ```
   `reporter.md` gets an additional paragraph: `At sprint close, read .cleargate/hook-log/autonomy-warnings.log and produce an "## Autonomy Warnings" section in the sprint report (one line per warning, or "None recorded" if empty).`
4. **Prebuild + live sync.** Run `cd cleargate-cli && npm run prebuild` to mirror canonical → payload. Live agents resync via `cleargate init` re-run.
5. **Hook script.** Create `cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   PAYLOAD="$(cat)"
   TOOL=$(printf '%s' "$PAYLOAD" | jq -r '.tool_name // empty')
   [ "$TOOL" = "AskUserQuestion" ] || exit 0
   ACTIVE_FILE="${CLAUDE_PROJECT_DIR:-.}/.cleargate/sprint-runs/.active"
   [ -s "$ACTIVE_FILE" ] || exit 0
   SPRINT_ID="$(cat "$ACTIVE_FILE")"
   STATE_FILE="${CLAUDE_PROJECT_DIR:-.}/.cleargate/sprint-runs/$SPRINT_ID/state.json"
   [ -f "$STATE_FILE" ] || exit 0
   STATUS=$(jq -r '.sprint_status // empty' "$STATE_FILE" 2>/dev/null || true)
   [ "$STATUS" = "Active" ] || exit 0
   LOG="${CLAUDE_PROJECT_DIR:-.}/.cleargate/hook-log/autonomy-warnings.log"
   mkdir -p "$(dirname "$LOG")"
   QUESTION_SUMMARY=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.question // ""' | head -c 200)
   AGENT=$(ls -t "${CLAUDE_PROJECT_DIR:-.}/.cleargate/sprint-runs/$SPRINT_ID/".dispatch-*.json 2>/dev/null | head -1 | xargs -I {} jq -r '.agent // "unknown"' {} 2>/dev/null || echo "unknown")
   printf '%s\tAskUserQuestion\t%s\t%s\n' "$(date -u +%FT%TZ)" "$AGENT" "$QUESTION_SUMMARY" >> "$LOG"
   exit 0
   ```
   Mark executable.
6. **Settings registration.** Edit `cleargate-planning/.claude/settings.json` to add the hook into `hooks.PreToolUse` array. Mirror via prebuild + manual live sync.
7. **Tests.** Hook test invokes the shell script with crafted stdin under both fixture states. Doc test greps the protocol doc and agent files for required markers.

### 3.3 API Contract

- New log file: `.cleargate/hook-log/autonomy-warnings.log` — tab-separated columns `<iso-timestamp>\tAskUserQuestion\t<agent>\t<question-summary>`.
- New hook: `cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh` — reads PreToolUse JSON payload from stdin; exit 0 always (soft mode).
- Protocol section name: `§ Sprint Execution Autonomy` (heading literal).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Doc-grep — protocol section + 5 cases | 1 | One test covers all 6 substring assertions |
| Doc-grep — five agent files | 5 | One assertion per agent .md |
| Hook — active-sprint logs | 1 | Tab-separated line appended |
| Hook — no-sprint silent | 1 | Log untouched |
| Hook — exit code | 2 | Both fixtures exit 0 |

### 4.2 Definition of Done

- [ ] `.cleargate/knowledge/cleargate-protocol.md` carries `§ Sprint Execution Autonomy` section with rule + 5 cases + "not blockers" list + scope note.
- [ ] Canonical SKILL.md mirror at `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` cross-references the protocol section.
- [ ] All five files under `cleargate-planning/.claude/agents/` carry `Autonomy Contract` subsections.
- [ ] `cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh` exists, executable, soft-mode behavior.
- [ ] `cleargate-planning/.claude/settings.json` wires the hook into `hooks.PreToolUse`.
- [ ] `npm run prebuild` mirrored agents + hook + settings to npm payload.
- [ ] Live `/.claude/agents/*.md` + `/.claude/hooks/pre-tool-use-autonomy.sh` + `/.claude/settings.json` re-synced via `cleargate init` re-run; orchestrator visually confirms.
- [ ] All Gherkin scenarios from §2.1 covered by tests in `cleargate-cli/test/hooks/` + `cleargate-cli/test/docs/`.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.

## Existing Surfaces

- **Surface:** `.cleargate/knowledge/cleargate-protocol.md` — protocol doc; story appends new section.
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — canonical skill; story replaces single-sentence rule with cross-reference.
- **Surface:** `cleargate-planning/.claude/agents/architect.md` — canonical agent def; story adds Autonomy Contract subsection.
- **Surface:** `cleargate-planning/.claude/agents/developer.md` — canonical agent def; same.
- **Surface:** `cleargate-planning/.claude/agents/qa.md` — canonical agent def; same + blockers protocol fill-in.
- **Surface:** `cleargate-planning/.claude/agents/devops.md` — canonical agent def; same.
- **Surface:** `cleargate-planning/.claude/agents/reporter.md` — canonical agent def; same + autonomy-warnings log read.
- **Surface:** `cleargate-planning/.claude/settings.json` — canonical settings; story wires new hook into PreToolUse array.
- **Surface:** `cleargate-cli/templates/cleargate-planning/.claude/agents/architect.md` — npm payload mirror auto-synced via prebuild.
- **Coverage of this story's scope:** ~50% — promotion + clarification of an existing principle + one new hook + one settings-file wire-up entry.

## Why not simpler?

> See §1.7 above.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — all four CR-071 open questions resolved; soft hook chosen, propagation cross-references protocol doc (not copy-paste).

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] §1.6 Existing Surfaces cites at least one source-tree path.
- [x] §1.7 Why not simpler? has both sub-bullets answered.

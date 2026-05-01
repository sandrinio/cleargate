---
epic_id: EPIC-025
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-18
carry_over: false
status: Done
ambiguity: 🟢 Low
context_source: "Decomposition wrapper for CR-021 (Prepare/Close/Observe-Phase Mechanics). CR-021 is the design spec; EPIC-025 lists the 6 child stories that execute it. Charter: .cleargate/scratch/SDLC_brainstorm.md §2.4 — three-sprint sequential roadmap (Sprint 2 of 3). Direct approval of Option A by user 2026-05-01 (verbatim: 'go for option a'); decomposition into stories approved by user 2026-05-01 (verbatim: 'decompose please' + 'go with epic and break it down to crs or stories'). Gate 1 (Brief) waived for the umbrella — sharp intent + inline references in CR-021."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-01T00:00:00Z
  reason: EPIC-025 is a thin decomposition wrapper around the already-drafted CR-021 design spec. CR-021 itself was approved via direct-approval pattern (proposal_gate_waiver in CR-021 frontmatter). EPIC-025 introduces no new scope — it only restructures CR-021's six milestones (M1..M6) as six child stories for the four-agent loop. No new design decisions. No new files beyond what CR-021 §3.1 already enumerates.
owner: sandrinio
target_date: SPRINT-18
created_at: 2026-05-01T20:30:00Z
updated_at: 2026-05-01T20:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: gherkin-error-path
      detail: "'Error' not found in body"
  last_gate_check: 2026-05-01T11:15:41Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-025
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T11:15:40Z
  sessions: []
---

# EPIC-025: Prepare / Close / Observe-Phase Mechanics

> **Decomposition wrapper.** The full design spec lives in [`CR-021_Prepare_Close_Observe_Phase_Mechanics.md`](CR-021_Prepare_Close_Observe_Phase_Mechanics.md) — read that for the why, the blast-radius analysis, the per-surface edit blueprint, and the verification protocol. This epic exists to give the six child stories a proper `parent_epic_ref` and to enumerate the wave structure for sprint execution.

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Land CR-021 Prepare/Close/Observe-phase mechanics across 6 disjoint stories: Reporter context-bundle scripts, sprint-preflight CLI, close_sprint integration, Sprint Plan + Sprint Report templates, Reporter agent capability surface, CLAUDE.md + enforcement.md §13.</objective>
  <architecture_rules>
    <rule>Mirror parity invariant — every live edit replicated in cleargate-planning/ canonical mirror in the same commit (per FLASHCARD 2026-04-19 #wiki #protocol #mirror).</rule>
    <rule>v2 file-surface contract — every staged file must appear in the story's §3.1 file table or in surface-whitelist.txt.</rule>
    <rule>Real infra, no mocks — preflight tests exec real `git worktree list` / `git show-ref` / `git status` against fixture sandboxes.</rule>
    <rule>Backwards-compat carve-outs — SPRINT-01..17 archived REPORT.md files keep old name; new SPRINT-NN_REPORT.md naming applies SPRINT-18+.</rule>
  </architecture_rules>
  <target_files>
    <file path=".cleargate/scripts/prep_reporter_context.mjs" action="create" />
    <file path=".cleargate/scripts/count_tokens.mjs" action="create" />
    <file path="cleargate-cli/src/commands/sprint.ts" action="modify" />
    <file path="cleargate-cli/src/cli.ts" action="modify" />
    <file path="cleargate-cli/test/commands/sprint-preflight.test.ts" action="create" />
    <file path=".cleargate/scripts/close_sprint.mjs" action="modify" />
    <file path=".cleargate/scripts/prefill_report.mjs" action="modify" />
    <file path=".cleargate/templates/Sprint Plan Template.md" action="modify" />
    <file path=".cleargate/templates/sprint_report.md" action="modify" />
    <file path="cleargate-planning/.cleargate/templates/Sprint Plan Template.md" action="modify" />
    <file path="cleargate-planning/.cleargate/templates/sprint_report.md" action="modify" />
    <file path=".claude/agents/reporter.md" action="modify" />
    <file path="cleargate-planning/.claude/agents/reporter.md" action="modify" />
    <file path="CLAUDE.md" action="modify" />
    <file path="cleargate-planning/CLAUDE.md" action="modify" />
    <file path=".cleargate/knowledge/cleargate-enforcement.md" action="modify" />
    <file path="cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

After SPRINT-17 shipped CR-020 (Plan-phase Brief-driven SDLC), the Prepare / Close / Observe phases remain stuck in pre-Brief mechanics: Sprint Plan template still says "READ artifact, do NOT draft manually"; the Reporter loads ~200KB of broad-fetch context per close; REPORT.md filenames lose their sprint identity outside the sprint directory; Observe-phase findings (UR:bug / UR:review-feedback) never roll up into the sprint report; no environment-health gate runs at the Prepare → Execute boundary; close pipeline does not auto-push per-artifact status updates to MCP. CR-021 closes all eight gaps in one coherent pass.

**Success Metrics (North Star):**
- Sprint Plan template `<instructions>` block declares "actively authored during the Prepare phase" (not "READ artifact"); contains the universal `POST-WRITE BRIEF` section.
- Reporter context bundle `.reporter-context.md` ≤80KB (target: 30-50KB) vs today's ~200KB broad-fetch.
- `cleargate sprint preflight <id>` exits 0 in clean state, exits 1 with a punch list on any of the four failure modes.
- `close_sprint.mjs` Step 3.5 fires before manual Reporter spawn; Step 7 fires after Gate 4 ack and pushes per-artifact status to MCP (non-fatal on failure).
- New §4 Observe Phase Findings populated in SPRINT-18+_REPORT.md when Observe entries exist; collapsed to "Observe phase: no findings." otherwise.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] STORY-025-01 — `prep_reporter_context.mjs` (~150 LOC) + `count_tokens.mjs` (~100 LOC) scripts.
- [ ] STORY-025-02 — `cleargate sprint preflight <id>` subcommand + 5 fixture-driven tests.
- [ ] STORY-025-03 — `close_sprint.mjs` Step 3.5 (Reporter context build) + Step 7 (auto-push) + REPORT naming change (4 hits).
- [ ] STORY-025-04 — Sprint Plan template reframe (actively-authored, dual-audience) + Sprint Report §4 Observe + skip-if-empty + renumber §5/§6 + canonical mirrors.
- [ ] STORY-025-05 — Reporter agent capability surface table + Post-Output Brief section + canonical mirror.
- [ ] STORY-025-06 — CLAUDE.md sprint-preflight bullet update + new `cleargate-enforcement.md` §13 Sprint Execution Gate spec + canonical mirrors.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Token-ledger SubagentStop attribution fix — known Red item from SPRINT-17, deferred (user 2026-05-01: "leave it be for now"). Surfaced in SPRINT-18 plan §6 Risks as carry-over.
- Pre-close worktree-closed + main-merged checks (CR-022 scope, SPRINT-19).
- `sprint_trends.mjs` cross-sprint metrics (CR-022 scope, SPRINT-19).
- Skill-candidate detection + FLASHCARD cleanup pass (CR-022 scope, SPRINT-19).
- "Initiative" rename from "Proposal" — parking-lot per SDLC_brainstorm §2.5.
- Retroactive REPORT.md → SPRINT-NN_REPORT.md rename of archived sprints.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| **Wave dependency** | EPIC-025 ships AFTER CR-020 (SPRINT-17, already shipped). Hard sequence: STORY-025-03 + STORY-025-05 cannot land before STORY-025-01 (script dependency). STORY-025-06 cannot land before STORY-025-02 (CLAUDE.md bullet must reference live subcommand). |
| **Mirror parity** | Every live edit replicated to `cleargate-planning/` canonical mirror in the same commit. 8 mirror pairs total across the 6 stories. |
| **File-surface contract** | Each story's commit must stage only files in its §3.1 table; `.cleargate/scripts/surface-whitelist.txt` may extend. |
| **Backwards-compat** | SPRINT-01..17 archived `REPORT.md` files keep old name. New `SPRINT-<#>_REPORT.md` convention applies SPRINT-18+ only. No rename pass on archives. |
| **Real-infra tests** | `sprint preflight` tests exec real `git worktree list` / `git show-ref` / `git status` in a fixture sandbox — no mocks for git state. |

## 4. Technical Grounding

**Affected Files (full enumeration in CR-021 §3.1):**

- `.cleargate/scripts/prep_reporter_context.mjs` (NEW, STORY-025-01)
- `.cleargate/scripts/count_tokens.mjs` (NEW, STORY-025-01)
- `cleargate-cli/src/commands/sprint.ts` (modify, STORY-025-02 — add `preflight` subcommand)
- `cleargate-cli/src/cli.ts` (modify, STORY-025-02 — router wire-up)
- `cleargate-cli/test/commands/sprint-preflight.test.ts` (NEW, STORY-025-02)
- `.cleargate/scripts/close_sprint.mjs` (modify, STORY-025-03)
- `.cleargate/scripts/prefill_report.mjs` (modify, STORY-025-03)
- `.cleargate/scripts/test/test_close_pipeline.sh` (modify, STORY-025-03)
- `.cleargate/scripts/test/test_report_body_stdin.sh` (modify, STORY-025-03)
- `.cleargate/templates/Sprint Plan Template.md` + canonical (modify, STORY-025-04)
- `.cleargate/templates/sprint_report.md` + canonical (modify, STORY-025-04)
- `.claude/agents/reporter.md` + canonical (modify, STORY-025-05)
- `CLAUDE.md` + canonical (modify, STORY-025-06 — CLEARGATE-tag-block region only)
- `.cleargate/knowledge/cleargate-enforcement.md` + canonical (modify, STORY-025-06 — append §13)

**Data Changes:** None. No DB migrations; no config-schema changes.

## 5. Acceptance Criteria

```gherkin
Feature: EPIC-025 Prepare / Close / Observe-Phase Mechanics

  Scenario: All six child stories ship Done in SPRINT-18
    Given EPIC-025 is the SPRINT-18 anchor epic
    When SPRINT-18 closes
    Then state.json shows STORY-025-01..06 all in TERMINAL_STATES (Done)
    And the lifecycle reconciler reports zero drift
    And mirror parity diff returns empty for all 8 file pairs

  Scenario: Reporter context bundle is built at close pipeline Step 3.5
    Given STORY-025-01 + STORY-025-03 have shipped
    When close_sprint.mjs runs against SPRINT-18
    Then .cleargate/sprint-runs/SPRINT-18/.reporter-context.md exists
    And the file contains slices of: sprint plan §1/§2/§5, state.json one-liners, milestone plans, git log digest, token-ledger digest, FLASHCARD date-window slice
    And the file is ≤80KB

  Scenario: cleargate sprint preflight passes in clean state
    Given STORY-025-02 has shipped
    When `cleargate sprint preflight SPRINT-19` runs in a clean repo (prev sprint Completed, no leftover worktrees, sprint/S-19 ref absent, main clean)
    Then the command exits 0

  Scenario: cleargate sprint preflight catches each of the four failure modes
    Given STORY-025-02 has shipped
    When the four failure-mode fixtures run
    Then preflight exits 1 with the specific punch-list message for each mode

  Scenario: SPRINT-18 report uses new naming convention
    Given STORY-025-03 has shipped
    When SPRINT-18 closes
    Then .cleargate/sprint-runs/SPRINT-18/SPRINT-18_REPORT.md exists
    And no file named REPORT.md is created in that directory

  Scenario: SPRINT-18 plan is actively-authored under the new template
    Given STORY-025-04 has shipped
    When SPRINT-19 is drafted
    Then the Sprint Plan template's <instructions> block declares "actively authored during the Prepare phase"
    And the rendered plan contains both a Stakeholder Brief section and an AI-execution section

  Scenario: Sprint Report has §4 Observe Findings under the new template
    Given STORY-025-04 has shipped
    And SPRINT-18 has UR:bug and UR:review-feedback events
    When SPRINT-18 closes and the Reporter writes SPRINT-18_REPORT.md
    Then §4 Observe Phase Findings is populated with rows for each event
    And §5 Lessons (formerly §4) and §6 Retrospective (formerly §5) are correctly renumbered

  Scenario: Reporter agent definition has explicit capability surface
    Given STORY-025-05 has shipped
    When .claude/agents/reporter.md is read
    Then it contains a "Capability Surface" section with scripts/skills/hooks/inputs/output table
    And it contains a "Post-Output Brief" section with the Gate 4 trigger language

  Scenario: cleargate-enforcement.md §13 enforces the Sprint Execution Gate
    Given STORY-025-06 has shipped
    When .cleargate/knowledge/cleargate-enforcement.md is read
    Then it contains a "## 13. Sprint Execution Gate (Gate 3)" section
    And §13 specifies the four checks and declares "enforcing under v2; advisory under v1"
    And CLAUDE.md's Sprint Execution Gate bullet references the live `cleargate sprint preflight` subcommand
```

## 6. AI Interrogation Loop

> All resolved during CR-021 drafting + 2026-05-01 user direct-approval session. EPIC-025 inherits CR-021's resolved interrogation loop verbatim. No new questions for the human.

- **AI Question:** Decompose into stories or keep monolithic?
  **Human Answer:** "decompose please" + "go with epic and break it down to crs or stories" (2026-05-01).

- **AI Question:** Wave structure for the 6 stories?
  **Recommended:** Wave 1 (parallel, disjoint surfaces) = STORY-025-01 ‖ STORY-025-02 ‖ STORY-025-04. Wave 2 (after Wave 1) = STORY-025-03 (depends on -01) + STORY-025-05 (depends on -04) + STORY-025-06 (depends on -02). Architect SDR confirms in SPRINT-18 plan §2.

- **AI Question:** Token-ledger SubagentStop Red — promote to SPRINT-18 scope or carry forward?
  **Human Answer:** "leave it be for now. make sure it's flagged and we remember it" (2026-05-01) — carried forward, surfaced in SPRINT-18 §6 Risks.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green:
- [x] Approved Proposal exists (CR-021 frontmatter `proposal_gate_waiver` covers EPIC-025 by transitive inheritance — direct-approval pattern, user 2026-05-01).
- [x] §0 `<agent_context>` block complete; all 17 target files enumerated.
- [x] §4 Technical Grounding contains 100% real, verified file paths (cross-checked against CR-021 §3.1).
- [x] §6 AI Interrogation Loop contains zero unresolved questions.
- [x] Zero "TBDs".

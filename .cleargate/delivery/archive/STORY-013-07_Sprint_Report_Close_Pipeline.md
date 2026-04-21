---
story_id: STORY-013-07_Sprint_Report_Close_Pipeline
parent_epic_ref: EPIC-013
status: Done
ambiguity: 🟢 Low
context_source: EPIC-013_Execution_Phase_v2.md §4.2 rows 'Sprint-close pipeline' + 'Sprint Report v2' + 'run_script.sh wrapper' + §4.5; V-Bounce Engine scripts/close_sprint.mjs + complete_story.mjs + prefill_report.mjs + suggest_improvements.mjs + templates/sprint_report.md at HEAD 2b8477ab
actor: Developer Agent
complexity_label: L3
approved: true
approved_at: 2026-04-21T00:00:00Z
completed_at: "2026-04-21T08:30:00Z"
approved_by: sandro
milestone: M2
parallel_eligible: n
expected_bounce_exposure: high
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
stamp_error: no ledger rows for work_item_id STORY-013-07_Sprint_Report_Close_Pipeline
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T05:53:12Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: implementation-files-declared
      detail: section 3 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-21T05:53:12Z
---

# STORY-013-07: Sprint Report v2 Template + Close Pipeline
**Complexity:** L3 — new template + 4 new scripts + reporter.md rewrite with fallback plan; owns three-source token reconciliation and sprint-close gate logic.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate orchestrator closing a v2 sprint, I want a deterministic pipeline — pre-close state-validation gate, report prefill, new Sprint Report v2 template, auto-run improvement suggestions, three-source token reconciliation — so the sprint cannot reach `Completed` until the report is written and presented, and every close produces actionable feedback for the next sprint without manual bookkeeping.

### 1.2 Detailed Requirements
- **New template** `.cleargate/templates/sprint_report.md`: §1 What Was Delivered (user-facing vs internal split), §2 Story Results + CR Change Log (consumes `CR:*` tokens from STORY-013-05), §3 Execution Metrics (bounce ratio, Bug-Fix Tax, Enhancement Tax, first-pass success rate, token-divergence flag), §4 Lessons (flashcards summary by tag — preserve stale-detection pass from current reporter.md §5b), §5 Framework Self-Assessment split across Templates/Handoffs/Skills/Process/Tooling, §6 Change Log. Frontmatter: `sprint_id`, `status`, `generated_at`, `generated_by`, `template_version: 1`.
- **`prefill_report.mjs`**: reads `state.json` (M1 schema), `token-ledger.jsonl`, all `STORY-*-dev.md` and `STORY-*-qa.md` in sprint-runs dir; backfills missing deterministic YAML fields (story_id, sprint_id, commit_sha, bounce counts) in agent reports. Atomic write (reuse M1 tmp+rename). Idempotent.
- **`close_sprint.mjs <sprint-id>`**: (1) invokes `validate_state.mjs`; (2) refuses if any story ∉ `TERMINAL_STATES` (exit non-zero with stderr listing offenders); (3) invokes `prefill_report.mjs`; (4) orchestrator spawns Reporter separately (script only validates preconditions); (5) on Reporter success + user ack, flips `sprint_status` → `Completed` in state.json; (6) invokes `suggest_improvements.mjs` unconditionally.
- **`suggest_improvements.mjs`**: reads REPORT.md §5 Framework Self-Assessment tables + prior sprint's suggestions file if present; emits `.cleargate/sprint-runs/<id>/improvement-suggestions.md` with stable `SUG-<sprint>-<n>` IDs. Append-only: re-run produces zero new entries if all suggestions captured (R5).
- **Reporter rewrite** (`.claude/agents/reporter.md`): emit new template shape; three-source token reconciliation (ledger primary, story-doc secondary, task-notification tertiary) — flag any source diverging >20% in §5 Tooling.
- **Fallback plan (R8)**: before final merge, capture SPRINT-08-shaped fixture at `.cleargate/sprint-runs/S-09/fixtures/sprint-08-shaped/` (state.json + token-ledger.jsonl + 2 mock agent reports). Reporter rewrite verified against fixture BEFORE atomic swap of `reporter.md` + mirror. If SPRINT-09 Reporter regresses post-swap, `git revert` the swap commit and run old Reporter.
- **Three-surface landing (R9)** on every file: `.cleargate/` + `cleargate-planning/` + MANIFEST.json regen.

### 1.3 Out of Scope
- Sprint-file archive (pending-sync/ → archive/) stays a human step per EPIC-013 §4.5 step 7.
- Cross-sprint trend dashboards — the numbers live in §3 but a UI is deferred to future admin-UI work.
- `complete_story.mjs` full implementation — orchestrator-invoked stub only (EPIC-013 §0 target_files lists it but body is future work; 013-08 may ship the CLI wrapper that calls it).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Sprint close pipeline + Sprint Report v2

  Scenario: close_sprint refuses non-terminal state
    Given state.json has STORY-014-07 in state "Bouncing"
    When run_script.sh close_sprint.mjs S-XX is invoked
    Then the script exits non-zero
    And stderr lists "STORY-014-07: Bouncing — not terminal"
    And REPORT.md is NOT generated

  Scenario: Sprint report written before state = Completed
    Given all stories in state.json are terminal
    When close_sprint.mjs S-XX runs with --assume-ack
    Then REPORT.md is written first using templates/sprint_report.md
    And the report presents §3 metrics and §5 self-assessment
    And only after user ack does state.sprint_status flip to "Completed"
    And suggest_improvements.mjs runs unconditionally and writes improvement-suggestions.md

  Scenario: Token reconciliation flags divergent source
    Given token-ledger.jsonl reports 820,000 tokens for sprint S-XX
    And task-notification totals report 1,120,000 tokens
    When Reporter computes §3 Execution Metrics
    Then §3 reports ledger primary (820k) + task-notification secondary (1.12M) + divergence = 36% > 20% threshold
    And the divergence appears in §5 Framework Self-Assessment > Tooling as a Friction finding

  Scenario: run_script.sh self-repair on missing state.json
    Given .cleargate/sprint-runs/S-XX/state.json is deleted
    When orchestrator calls run_script.sh update_state.mjs STORY-014-01 "Bouncing"
    Then wrapper prints structured diagnostic naming the missing file
    And orchestrator runs run_script.sh init_sprint.mjs S-XX --stories {IDS} exactly once as self-repair
    And retry of update_state succeeds
    And incident is logged in agent report under `## Script Incidents`

  Scenario: suggest_improvements idempotency
    Given improvement-suggestions.md already contains SUG-S-XX-01 through SUG-S-XX-03
    When suggest_improvements.mjs is invoked a second time on the same sprint
    Then zero new entries are appended
    And the script exits 0

  Scenario: Reporter rewrite fallback on fixture
    Given the SPRINT-08-shaped fixture at .cleargate/sprint-runs/S-09/fixtures/sprint-08-shaped/ exists
    When the new reporter.md spec is run against the fixture
    Then the generated REPORT.md contains all six §§ of sprint_report.md template
    And no section is empty or missing the required header
```

### 2.2 Verification Steps (Manual)
- [ ] Bash driver `.cleargate/scripts/test/test_close_pipeline.sh` runs all 6 Gherkin scenarios.
- [ ] `npm run typecheck` in `cleargate-cli/` green.
- [ ] `diff` all live→mirror pairs empty.
- [ ] MANIFEST.json regenerated; reporter.md SHA bumped.
- [ ] Fixture exists at `.cleargate/sprint-runs/S-09/fixtures/sprint-08-shaped/`.

## 3. The Implementation Guide

See **M2 plan §STORY-013-07** at `.cleargate/sprint-runs/S-09/plans/M2.md` (lines 58–94). Plan specifies: Reporter rewrite fallback (lines 89, 205–207), three-surface landing for scripts, reuse of `validateState` + `VALID_STATES` + atomic-write helper from M1, token-ledger path, and the non-archiving scope (script ends at `Completed` flip + improvement-suggestions; pending-sync → archive is human).

### 3.1 Context & Files

| Item | Value |
|---|---|
| New template | `.cleargate/templates/sprint_report.md` + mirror |
| New scripts | `.cleargate/scripts/{prefill_report,close_sprint,suggest_improvements}.mjs` + mirrors |
| Rewritten agent spec | `.claude/agents/reporter.md` + `cleargate-planning/.claude/agents/reporter.md` |
| New fixture | `.cleargate/sprint-runs/S-09/fixtures/sprint-08-shaped/` (committed) |
| New test | `.cleargate/scripts/test/test_close_pipeline.sh` |

### 3.2 Technical Logic
`close_sprint.mjs` imports `validateState` from M1 `validate_state.mjs` — do NOT re-parse state.json independently. All `.mjs` scripts invoked via `run_script.sh` wrapper (EPIC-013 §0 rule 5). Reconciliation tolerates ledger rows lacking `story_id` per FLASHCARD 2026-04-19 `#reporting #hooks #ledger` (attributes to `unassigned` bucket). Atomic writes use M1 tmp+rename pattern.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin scenarios (bash) | 6 | All §2.1 scenarios via `test_close_pipeline.sh` |
| Fixture-based reporter sanity run | 1 | New reporter spec against SPRINT-08 fixture (R8 fallback) |
| Three-surface diff | 4 | template + 3 scripts all live→mirror empty |

### 4.2 Definition of Done
- [ ] All six §2.1 scenarios pass.
- [ ] SPRINT-08 fixture captured + committed.
- [ ] Reporter rewrite atomic swap (live + mirror in same commit).
- [ ] `npm run typecheck` green; MANIFEST regenerated.
- [ ] v2-adoption note appended to the sprint report §5 (per sprint DoD line 119 dogfood check).
- [ ] Commit: `feat(EPIC-013): STORY-013-07 sprint report v2 + close pipeline`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenarios cover §1.2 requirements (6 scenarios — last scenario is the fallback-fixture check not in EPIC §5 but mandated by R8).
- [x] M2 plan grounds all paths, reuse targets, and fallback strategy.
- [x] Event-type vocabulary inherited from STORY-013-05 (consumed in §2 Story Results + §3 Execution Metrics).
- [x] Idempotency requirement on `suggest_improvements.mjs` explicit.

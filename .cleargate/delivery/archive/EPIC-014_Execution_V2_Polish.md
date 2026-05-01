---
epic_id: EPIC-014
status: Completed
ambiguity: 🟢 Low
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
context_source: PROPOSAL-011_Execution_V2_Polish.md + SPRINT-09 REPORT.md §5 + CG_TEST SPRINT-01 REPORT.md §5 + session retrospective 2026-04-21
owner: sandro
target_date: 2026-05-05
created_at: 2026-04-21T12:00:00Z
updated_at: 2026-04-21T12:00:00Z
stamp_error: no ledger rows for work_item_id EPIC-014
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:24:58Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-21T12:00:01Z
sprint_cleargate_id: SPRINT-09
children:
  - "[[STORY-014-01]]"
  - "[[STORY-014-02]]"
  - "[[STORY-014-03]]"
  - "[[STORY-014-04]]"
  - "[[STORY-014-05]]"
  - "[[STORY-014-06]]"
  - "[[STORY-014-07]]"
  - "[[STORY-014-08]]"
  - "[[STORY-014-09]]"
  - "[[STORY-014-10]]"
---

# EPIC-014: Execution v2 Polish & Efficiency Fixes

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Close the CLI gaps, add the safety gates, and eliminate the manual bash choreography that SPRINT-09 and CG_TEST SPRINT-01 revealed in the v2 execution scaffold — without changing the protocol or four-agent contract.</objective>
  <architecture_rules>
    <rule>No new runtime dependencies. Node built-ins + git + bash only (same as EPIC-013).</rule>
    <rule>Three-surface landing (R9) on every story: `.cleargate/`, `cleargate-planning/`, and `cleargate-cli/` where applicable.</rule>
    <rule>All behavioral changes gated behind `execution_mode: v2`. Under v1, behavior is unchanged.</rule>
    <rule>Reuse M1/M2 scripts from EPIC-013 — do NOT reimplement `run_script.sh`, `update_state.mjs`, `close_sprint.mjs`, `pending-task-sentinel.sh`, etc. Extend them.</rule>
    <rule>Do NOT touch the MCP adapter, wiki ingest/lint, or scaffold manifest surfaces.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/commands/sprint.ts" action="modify" />
    <file path="cleargate-cli/src/commands/state.ts" action="modify" />
    <file path="cleargate-cli/src/commands/story.ts" action="modify" />
    <file path="cleargate-cli/src/commands/execution-mode.ts" action="modify" />
    <file path=".cleargate/scripts/assert_story_files.mjs" action="create" />
    <file path=".cleargate/scripts/file_surface_diff.sh" action="create" />
    <file path=".cleargate/scripts/init_sprint.mjs" action="modify" />
    <file path=".cleargate/scripts/close_sprint.mjs" action="modify" />
    <file path=".claude/hooks/pending-task-sentinel.sh" action="modify" />
    <file path=".claude/hooks/token-ledger.sh" action="modify" />
    <file path=".claude/agents/architect.md" action="modify" />
    <file path=".claude/agents/reporter.md" action="modify" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path=".cleargate/templates/story.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

SPRINT-09 built v2. This epic makes v2 actually ergonomic. Current per-sprint friction: ~6 manual bash commands per story (worktree + state + merge + archive + sentinel), 2 CLI calls that silently fall back to v1-inert, and at least one class of bug (stash-conflict collateral damage) with no gate to catch it. CG_TEST dogfood confirmed the gaps exist on a clean install, not just in the SPRINT-09 dev environment.

**Success metric:** a v2 sprint of comparable size to SPRINT-09 (9 stories, 2 milestones) shipped with zero direct `bash run_script.sh …` invocations by the orchestrator, zero manual `git worktree` / `git branch -d` / archive `mv` commands, and at least one circuit-breaker fire caught before reaching commit.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

### A) CLI & Automation
- **A1. `cleargate sprint close --assume-ack`** — wire the flag through `commands/sprint.ts` handler to `run_script.sh close_sprint.mjs --assume-ack`. Currently the flag exists in the script but the CLI doesn't surface it.
- **A2. `cleargate state update` `.active` sentinel fallback** — `commands/state.ts` handler reads `.cleargate/sprint-runs/.active` when no `--sprint` flag is given, instead of defaulting to the `SPRINT-UNKNOWN` inert fallback. Add `--sprint` flag too.
- **A3. `cleargate story start <STORY-ID>`** — creates `.worktrees/STORY-ID/` on `story/STORY-ID` branch cut from the active sprint branch, updates `state.json` story.worktree + state=Bouncing, all in one call. Replaces the 3-line manual `git worktree add … && update_state.mjs`.
- **A4. `cleargate story complete <STORY-ID>`** — merges `story/STORY-ID` → active sprint branch (`--no-ff`), removes worktree, deletes story branch, updates state=Done. Replaces 4-line manual sequence.
- **A5. `cleargate sprint archive <SPRINT-ID>`** — moves sprint/epic/story/proposal files `pending-sync/` → `archive/`, stamps `status: Completed` + `completed_at`, clears `.active` sentinel, merges sprint branch → main (`--no-ff`), deletes sprint branch. Replaces the 10+ line bash block we ran twice this week.

### B) Safety Gates
- **B1. File-surface diff gate (pre-commit)** — new script `.cleargate/scripts/file_surface_diff.sh` diffs `git diff --cached --name-only` against the story's declared §3.1 "Files to modify / create" table. Exits non-zero with offending-file list if a file outside the declared surface is staged. Wired via the Husky-style pre-commit hook (reused from existing `.claude/hooks/` infra). Would have caught SPRINT-09's 013-06 stash-conflict collateral damage.
- **B2. Gate-2 story-file existence assertion** — `init_sprint.mjs` refuses to stamp `execution_mode: v2` when any story in the Sprint Plan's §Consolidated Deliverables lacks a corresponding `pending-sync/STORY-*.md` file. Emits the missing IDs as a checklist. Extract the sprint-file parsing into `assert_story_files.mjs` so CLI can call it independently.
- **B3. PreToolUse flashcard gate enforcement** — extend `pending-task-sentinel.sh` (from SPRINT-09) to read the most recent dev + qa reports in the active sprint dir, parse `flashcards_flagged`, and refuse the next `Task` spawn (exit non-zero, emit diagnostic) if any flagged card is unprocessed. Reuses the sentinel-file dir for "processed" marker.
- **B4. Pre-existing test-failure ratchet** — new script `.cleargate/scripts/test_ratchet.mjs` writes `test-baseline.json` on green runs (count of passing tests); on every `pre-commit`, re-runs the suite and refuses commit if pass-count regressed. The 24 failures rode 3 sprints before getting fixed — this catches it at the source.

### C) Planning Quality
- **C1. Protocol-numbering auto-resolver** — `architect.md` amendment: before producing per-story blueprint, Architect greps `cleargate-protocol.md` for highest `^## <N>\. ` section, computes next free number, and rewrites any stale `§10/§11/§12` references in the story text to the correct number in the plan file. Kills the "§ renumbering drift" flashcard from SPRINT-09.
- **C2. L3-high-exposure auto-split trigger** — `templates/story.md` §0 Granularity Rubric extension: if `complexity_label: L3` AND `expected_bounce_exposure: high`, emit a split recommendation at decomposition time ("consider splitting into two L2s"). Not auto-applied — surfaces as a human decision. The 3 dev stream-timeouts in SPRINT-09 all landed on L3 stories.
- **C3. Cross-project ledger routing (`CLAUDE_PROJECT_DIR` override)** — both `pending-task-sentinel.sh` and `token-ledger.sh` accept an `ORCHESTRATOR_PROJECT_DIR` env override that, when set, routes ledger writes to that project's sprint-runs tree instead of the orchestrator's own project. Eliminates the CG_TEST §5 Yellow finding.
- **C4. Reporter Write-seam fix** — `reporter.md` contract clarified: Reporter MUST Write REPORT.md directly (not return as inline text). Add allowed-tools explicitly. When Write is not in the agent's allowed tools for any reason, orchestrator pipes returned content into `close_sprint.mjs --report-body-stdin` which writes it atomically.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- Cross-sprint trend dashboards (deferred — numbers live inline in REPORT.md).
- DevOps / Scribe agent split (still deferred per EPIC-013 Q5).
- `cleargate doctor` stack-drift warning (SPRINT-11 per D6).
- Automatic worktree parallelism orchestration (v2 supports parallel; this epic doesn't add automatic dispatch — orchestrator still triggers).
- Replacing the four-agent contract.

## 3. The Reality Check

- SPRINT-09 ran 9 stories in ~9 hours wall-clock with 3 dev stream-timeouts requiring orchestrator rescue. EPIC-014 targets making a similar sprint shippable without rescues.
- Every change is gated behind `execution_mode: v2` — v1 users see no behavior change.
- `file_surface_diff.sh` reads each story's §3.1 table; stories that don't fill §3.1 correctly won't be protected (same failure mode as flashcard gate under-reporting).
- Every new script mirrors to `cleargate-planning/`; every agent-spec edit mirrors to scaffold. MANIFEST regenerates per story (continuing D3 pattern from SPRINT-09).

## 4. Technical Grounding

**Affected files:**

- `cleargate-cli/src/commands/sprint.ts` — add `--assume-ack` option + `story archive` subcommand. Extend close handler.
- `cleargate-cli/src/commands/story.ts` — rewrite `start`/`complete` handlers to orchestrate worktree + state + merge (currently stubs).
- `cleargate-cli/src/commands/state.ts` — `.active` sentinel fallback + `--sprint` flag on update/validate.
- `cleargate-cli/src/commands/execution-mode.ts` — extend `readSprintExecutionMode` with sentinel fallback.
- `.cleargate/scripts/init_sprint.mjs` — call `assert_story_files.mjs` before stamping v2.
- `.cleargate/scripts/assert_story_files.mjs` (new) — shared parser for sprint file + story-file existence check.
- `.cleargate/scripts/file_surface_diff.sh` (new) — pre-commit gate.
- `.cleargate/scripts/test_ratchet.mjs` (new) — pass-count baseline + commit refusal.
- `.cleargate/scripts/close_sprint.mjs` — add `--report-body-stdin` flag for Reporter Write-seam fallback (C4).
- `.claude/hooks/pending-task-sentinel.sh` — extend with flashcard-gate check (B3).
- `.claude/hooks/token-ledger.sh` — honor `ORCHESTRATOR_PROJECT_DIR` env override (C3).
- `.claude/agents/architect.md` — append `## Protocol Numbering Resolver` subsection (C1).
- `.claude/agents/reporter.md` — clarify Write requirement + allowed-tools (C4).
- `.cleargate/templates/story.md` — §0 Granularity Rubric extension for L3/high-exposure split signal (C2).
- `.cleargate/knowledge/cleargate-enforcement.md` — §2 Gate 2 amended to cite the v2 story-file assertion; §6 "File-Surface Contract" appended (B1).
- `cleargate-planning/` mirrors for every file above.

**Data changes:** None to state.json schema (v1 remains locked). New files: `test-baseline.json` at repo root (gitignored snapshot).

## 5. Acceptance Criteria

```gherkin
Feature: CLI wrappers are complete

  Scenario: cleargate sprint close --assume-ack flips state
    Given a v2 sprint in state.json with all stories terminal
    When I run `cleargate sprint close SPRINT-XX --assume-ack`
    Then sprint_status flips to Completed
    And improvement-suggestions.md is written
    And exit code is 0

  Scenario: cleargate state update reads .active sentinel
    Given .cleargate/sprint-runs/.active contains "SPRINT-XX"
    And the sprint's frontmatter has execution_mode: v2
    When I run `cleargate state update STORY-XX-01 Done` (no --sprint flag)
    Then the handler reads the sentinel, confirms v2, and invokes update_state.mjs
    And the story state transitions to Done

  Scenario: cleargate story start creates worktree + state transition
    Given an active v2 sprint with STORY-XX-01 in Ready to Bounce
    When I run `cleargate story start STORY-XX-01`
    Then .worktrees/STORY-XX-01/ exists on story/STORY-XX-01 branch
    And state.json story.worktree is populated, state is Bouncing

Feature: Safety gates catch the bugs we hit

  Scenario: File-surface diff gate catches off-surface edit
    Given story.md §3.1 declares only `hello.mjs` and `README.md` as files-to-modify
    And the developer agent staged an edit to `unrelated.txt` as well
    When the pre-commit hook fires
    Then it refuses the commit with exit code non-zero
    And stderr lists `unrelated.txt` as an off-surface file
    And prompts the developer to either update §3.1 or unstage

  Scenario: Gate 2 story-file assertion refuses v2 init without all stories
    Given a Sprint Plan §Consolidated Deliverables lists STORY-XX-01..05
    And only STORY-XX-01 and 02 exist in pending-sync/
    When I run `cleargate sprint init SPRINT-XX --stories STORY-XX-01,...,05`
    Then init refuses with exit non-zero
    And stderr lists the 3 missing STORY-XX-* files

  Scenario: Flashcard gate refuses next story dispatch on unprocessed flag
    Given STORY-XX-01-dev.md has flashcards_flagged: ["<card>"]
    And no "processed" marker exists for that card
    When orchestrator invokes the Task tool for STORY-XX-02
    Then pending-task-sentinel.sh exits non-zero
    And the diagnostic names the unprocessed flashcard

  Scenario: Test ratchet blocks commit on regression
    Given test-baseline.json records 100 passing tests
    And the current suite has 99 passing
    When the pre-commit hook runs the suite
    Then the hook exits non-zero with "regression: -1 test"

Feature: Planning quality improvements

  Scenario: Architect rewrites stale protocol §§ references
    Given story text cites "protocol §10"
    And cleargate-enforcement.md's highest shipped section is §1
    When Architect produces the milestone plan
    Then the plan cites §2 (next free)
    And flags the story-text drift as a fixup note

  Scenario: L3 + high exposure triggers split recommendation
    Given a story with complexity_label: L3 and expected_bounce_exposure: high
    When decomposition reviews the story
    Then the rubric emits "consider splitting into two L2 stories"

  Scenario: Cross-project ledger routing
    Given ORCHESTRATOR_PROJECT_DIR is set to /some/other/repo
    When a subagent dispatch fires from that other repo's Task call
    Then pending-task-sentinel.sh writes the sentinel to /some/other/repo/.cleargate/sprint-runs/...
    And token-ledger.sh writes the row to the same tree

  Scenario: Reporter Write-seam fallback
    Given Reporter is run in an env where Write is not allowed
    When Reporter completes and returns REPORT.md content inline
    Then close_sprint.mjs --report-body-stdin accepts it via stdin
    And writes it atomically to .cleargate/sprint-runs/<id>/REPORT.md
```

## 6. AI Interrogation Loop (Human Input Required)

- **AI Q1:** Story count — this epic maps to ~10-12 stories. Do we want them as one sprint (likely L3-weighted) or split across two sprints (themes A+B then C)?
  - **Human Answer (pending):** TBD — default to single sprint unless decomposition surfaces L4.

- **AI Q2:** `file_surface_diff.sh` parsing — do we require stories to use the exact §3.1 table format, or a more forgiving match (heuristic grep for file extensions + paths)?
  - **Human Answer (pending):** TBD — strict table format is safer but requires template-migration pass on legacy stories.

- **AI Q3:** Story template change for C2 (L3+high split) — do we apply retroactively to in-flight or new-only?
  - **Human Answer (pending):** TBD — default new-only (avoids re-scoring existing stories).

- **AI Q4:** Test-ratchet scope — CLI only, or all three repos (cleargate-cli, mcp, admin)?
  - **Human Answer (pending):** TBD — start with cleargate-cli (largest test surface) + extend if cheap.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low (Ready for Decomposition)**

Pass to 🟢 requirements:
- [x] Scope bulleted with concrete file paths.
- [x] Acceptance Gherkin covers each theme.
- [x] Constraints enumerated.
- [x] Reuse-over-reimplementation explicit (EPIC-013 scripts + hooks extended, not rewritten).
- [ ] §6 Q1-Q4 answered before sprint planning.

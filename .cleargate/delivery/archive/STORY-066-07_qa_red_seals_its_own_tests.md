---
story_id: STORY-066-07
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: "Completed"
approved: true
approved_by: "sandrinio"
approved_at: "2026-11-15T09:00:00Z"
ambiguity: 🟢 Low
context_source: "EPIC-066 (approved 2026-11-14, owner decisions in section 6: QA-Red stays a separate agent, one test per scenario, flagged above twice the scenario count); dispenser_adapter SPRINT-45 field trial findings W010-1 (commit-red and TPV scan run as LLM agents), W010-2 (zsh did not word-split the file list), W010-4 (QA-Red wrote 1,347 lines for one story), W010-6 (scan report lands in the worktree)"
actor: Orchestrator and QA-Red agent
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
area: sprint-execution,scripts,agent-prompts
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:48.167Z
updated_at: 2026-11-14T19:47:48.167Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-14T19:54:07Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-066-07: QA-Red seals its own tests
**Complexity:** L2 — one new script, one lint rule, one prompt section; scripts are small but the git and scan edges need real-repo tests.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator running a sprint wave, I want QA-Red to commit its own failing tests and run the wiring scan as its last step, and to write no more than one test per scenario, so that no separate agent is spent on a commit or a scan and an oversized red set is caught before the Developer starts.

### 1.2 Detailed Requirements
- **`seal_red.mjs` (new).** `node seal_red.mjs <ID> --worktree <path> --sprint-branch <branch> -- <file>...`. Paths come after `--` as separate argv entries, so a path with a space or a zsh-expanded list reaches git unchanged (W010-2). Steps: (1) check the worktree exists and every file exists inside it; (2) `git add -- <files>` then `git commit -m "qa-red(<ID>): write failing tests" -- <files>`, so only the listed files are committed and nothing else in the tree; (3) count scenarios in the item file and tests in the listed files; (4) run `pre_gate_runner.sh arch <worktree> <sprint-branch>` with `CLEARGATE_RED_FILES` (newline-separated, worktree-relative) and `CLEARGATE_RED_SCENARIOS` set in its environment; (5) print one JSON object `{ id, sealed_sha, scan_exit, flags: [...], tests, scenarios }`. Exit 0 when the scan is clean, 1 when the scan flags, 2 when the script could not run (bad args, missing file, commit failed, scan exit 2).
- **Scenario count.** The item file is found at `.cleargate/delivery/{pending-sync,archive}/<ID>_*.md` under the repository root derived from the script's own location. `scenarios` is the number of `Scenario:` and `Scenario Outline:` lines inside fenced ```gherkin blocks (a Scenario Outline counts once, its Examples rows do not). An item with no Gherkin block (written before CR-123) gives `scenarios: 0`, and the volume check is skipped for it.
- **Test count** (exported `countTests(fileName, text)` in `qa_red_lint.mjs`): `.ts .tsx .js .mjs` count lines opening `test(` or `it(` (with an optional `.only`, `.skip`, `.todo`, `.each(...)` form), `.py` counts `def test_`, `.go` counts `func Test`. A file of any other type contributes 0 and is named in the lint's stderr as uncounted, so a repository in an unsupported language is not falsely flagged.
- **Volume rule `R-volume` in `qa_red_lint.mjs`.** When `CLEARGATE_RED_SCENARIOS` is a positive integer and `CLEARGATE_RED_FILES` is set, the lint also scans those files (whether or not their names match the `*.red.*` globs, because Go and Python reds do not) and flags `R-volume: <T> tests for <S> scenarios (limit <2S>)` when `T > 2 * S`. When the variables are absent the lint behaves as today. `pre_gate_runner.sh` already runs the lint in the scan's own environment (`pre_gate_runner.sh:325-330`), so no edit to that file is needed here; it is owned by STORY-066-03.
- **Re-seal after a flag.** A flagged red set returns to QA-Red, which edits the files and calls `seal_red.mjs` again. The red-immutability hook rejects a modified `*.red*.test.ts` once a `qa-red(` commit exists (`pre-commit-surface-gate.sh:11-26`). `seal_red.mjs` therefore sets `SKIP_RED_GATE=1` for its own commit, and only when no commit other than `qa-red(` commits exists on the branch after the base, that is, before the Developer has started. The JSON gains `resealed: true` in that case. A re-seal after a Developer commit exits 2.
- **Scan report out of the worktree (W010-6).** After the scan, `seal_red.mjs` moves `<worktree>/.cleargate/reports/pre-arch-scan.txt` to `<sprintDir>/reports/<ID>-pre-arch-scan.txt` (sprint from `.cleargate/sprint-runs/.active`; deleted when no sprint is active) so the worktree stays clean for the Developer. `flags` lists the check names from the report's `[FAIL]` and `[WARN]` lines.
- **`qa.md` Mode: RED** (and the Codex `qa.toml`, regenerated by `npm run gen:codex`): add the volume rule (one test per acceptance scenario, plus an edge case only where the item names it; the lint flags more than twice the scenario count); make the last step "run `seal_red.mjs` through `run_script.sh` with the files as separate arguments and return its JSON"; extend the RED output shape with `SEALED_SHA`, `SCAN_EXIT` and `FLAGS`; state that on exit 1 QA-Red trims or fixes the set and seals again, and does not return `QA-RED: WRITTEN`.

### 1.3 Out of Scope
- `SKILL.md` §C.3 and §C.3.5 (the orchestrator's red commit and scan text) and both `dispatch-serial.md`: STORY-066-12 rewrites them. Until it lands the skill text still describes the orchestrator committing; the script is correct on its own.
- `pre_gate_runner.sh` and `pre_gate_common.sh` (STORY-066-03).
- Any rule about what a red assertion may pin, and holdout scenarios (EPIC-065).
- The Architect TPV dispatch on a flagged scan (unchanged, STORY-043-08), the `arch_bounces` counter, and CR-122 (Developer may read reds).
- The Mode: VERIFY section of `qa.md` and the `commands` pack section (STORY-066-09).

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** The brief's contract says the scan reports the volume check, but the scan cannot know the item's scenario count on its own.
- **Recommended:** Pass it through the environment (`CLEARGATE_RED_SCENARIOS`, `CLEARGATE_RED_FILES`) set by `seal_red.mjs`. The lint reads them only when present, so a scan started by hand behaves as today and `pre_gate_runner.sh` needs no change. Resolved in §1.2.
- **Human decision:** Accepted as recommended (contract-conformant; no contradiction with the epic).

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** The Mode: RED text in `qa.md` is edited by this story and the Mode: VERIFY text by STORY-066-09, and both regenerate `qa.toml`.
- **Mitigation:** 066-09 has this story as upstream, so they build in sequence. The toml is generated, so a conflict is resolved by re-running `npm run gen:codex`, never by hand.
- **Risk:** `SKIP_RED_GATE=1` on a re-seal could be used to rewrite reds after the Developer started.
- **Mitigation:** the script refuses a re-seal when any non-`qa-red(` commit follows the base (exit 2); a test covers it.
- **Risk:** the test counter undercounts frameworks it does not know, and a lax count hides an oversized set.
- **Mitigation:** unknown file types are listed as uncounted rather than counted as zero silently; the three languages the pilots use (TypeScript, Python, Go) are covered.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One successful path: a clean seal. The flagged and re-seal flows are rule outcomes, not a second way to succeed. |
| Interfaces | T | The volume flag is reachable from `seal_red.mjs` and from a bare `pre_gate_runner.sh arch` run. |
| Data | T | Test counting differs by language: TypeScript, Python, Go. |
| Rules | T | The 2x limit, both breaking it and sitting on it, and the re-seal-before-Developer rule. |

```gherkin
Feature: QA-Red seals its own tests

  Scenario: A clean red set is committed and scanned in one call
    Given a story worktree with a base commit and four acceptance scenarios in the item file
    And QA-Red wrote four tests in two files, one named "closes keys red_test.go" with a space
    When seal_red.mjs runs with the files after "--"
    Then one commit with subject "qa-red(STORY-X): write failing tests" holds exactly those two files
    And it prints JSON with sealed_sha, scan_exit 0, flags [], tests 4, scenarios 4
    And it exits 0
    And the scan report is not left in the worktree

  @rules
  Scenario: An oversized red set is flagged, and QA-Red can seal again before the Developer starts
    Given an item with four acceptance scenarios and eleven red tests
    When seal_red.mjs runs
    Then the JSON flags contain "qa_red_lint" and the lint output reads "11 tests for 4 scenarios"
    And it exits 1 with the sealed_sha of the commit it made
    And after QA-Red trims the set to eight tests a second call commits again, prints resealed true, and exits 0

  @data
  Scenario Outline: Tests are counted by language
    Given a red file "<file>" containing <n> test declarations in <language> style
    When countTests runs on it
    Then it returns <n>

    Examples:
      | file              | language   | n |
      | a.red.node.test.ts | TypeScript | 3 |
      | test_a_red.py     | Python     | 2 |
      | a_red_test.go     | Go         | 4 |

  @interfaces
  Scenario: The scan reports the same flag when run on its own
    Given the environment variables CLEARGATE_RED_FILES and CLEARGATE_RED_SCENARIOS name an eleven-test set and four scenarios
    When pre_gate_runner.sh arch runs on the worktree
    Then its report has a FAIL line for qa_red_lint containing "11 tests for 4 scenarios"
    And a run without those variables does not apply the volume rule

  Scenario: A script that cannot run exits 2 and commits nothing
    Given a listed file that does not exist
    When seal_red.mjs runs
    Then it exits 2 naming the missing file
    And the branch has no new commit
    And a re-seal attempted after a Developer commit also exits 2
```

### 2.2 Verification Steps (Manual)
- [ ] In a scratch git repo with a story file, run `node seal_red.mjs STORY-X --worktree . --sprint-branch main -- "a b.test.ts"` and confirm one commit, the JSON line and exit 0.
- [ ] Run it again with the set grown past twice the scenario count and confirm exit 1 and the `11 tests for 4 scenarios` style message.
- [ ] Run `npm run gen:codex` and confirm `qa.toml` carries the RED text and no VERIFY edit from this story.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `cleargate-cli/test/scripts/seal-red.integration.node.test.ts`, `cleargate-cli/test/scripts/qa-red-lint-volume.node.test.ts`, `cleargate-cli/test/agents/qa-red-seal-content.node.test.ts` |
| New Files Needed | Yes — `seal_red.mjs` and the three test files above |

### 3.2 Technical Logic
- `seal_red.mjs`: parse argv (`<ID>`, `--worktree`, `--sprint-branch`, everything after `--` is a file). Run git through `spawnSync('git', [...args])` with an argv array, never a shell string, which is the whole of the W010-2 fix. Derive the repository root from `import.meta.url` (`.cleargate/scripts/` lives two levels below it, as `pre_gate_runner.sh:195` does). Reuse `countTests` and a new exported `countScenarios(markdown)` from `qa_red_lint.mjs`.
- `qa_red_lint.mjs` currently runs its `main` at import (`qa_red_lint.mjs:338-380`). Wrap that block in an `import.meta.url` entry-point guard and export `countTests`, `countScenarios` and `rVolume`, so `seal_red.mjs` and the tests import them without running the CLI. `RULES` (`:292`) gains the volume check, which is not a per-file rule: run it once after the per-file loop, over the explicit file list, and count it in `totalFlags`. Exit codes stay 0/1/2.
- Re-seal check: `git log --format=%s <base>..HEAD` (base is `--sprint-branch`); if the first non-`qa-red(` subject exists, a re-seal is refused. If only `qa-red(` commits exist and a file is modified, set `SKIP_RED_GATE=1` on the commit.
- Scan: `spawnSync('bash', [pre_gate_runner.sh, 'arch', worktree, branch], { env: {...process.env, CLEARGATE_RED_FILES, CLEARGATE_RED_SCENARIOS} })`. Scan exit 0 gives script exit 0, 1 gives 1, 2 gives 2. Parse flags with the same pattern `pre_gate_runner.sh:289` uses (`^\[(FAIL|WARN)\] ([^:]+):`).
- `qa.md` RED section (`qa.md:37-58`): add requirement 8 (volume), requirement 9 (last step), and the extended output shape. Keep the CR-111 naming clause and the wiring clause. Run `npm run gen:codex` and commit the regenerated `qa.toml` with it.

### 3.3 API Contract (if applicable)

| Surface | Contract |
|---|---|
| `node seal_red.mjs <ID> --worktree <path> --sprint-branch <branch> -- <file>...` | exit 0 clean, 1 flagged, 2 could not run; stdout one JSON line `{ id, sealed_sha, scan_exit, flags, tests, scenarios, resealed? }` |
| env `CLEARGATE_RED_FILES`, `CLEARGATE_RED_SCENARIOS` | read by `qa_red_lint.mjs`; absent means no volume rule |

## Task Breakdown

- [x] Refactor `qa_red_lint.mjs`: entry-point guard, export `countTests` and `countScenarios`, add the volume check driven by the two environment variables -> Scenarios 2-4
- [x] Write `test/scripts/qa-red-lint-volume.node.test.ts` first (counting outline, 2x boundary at 8 of 4, absent variables) -> Scenario 3
- [x] Write `seal_red.mjs`: argv parse, file checks, commit with explicit pathspec, counts, scan with environment, report move, JSON and exit codes -> Scenarios 1, 5
- [x] Add the re-seal rule with `SKIP_RED_GATE=1` and its refusal after a Developer commit -> Scenarios 2, 5
- [x] Write `test/scripts/seal-red.integration.node.test.ts` against a temp git repository (npm layout and a Go layout with no `package.json`) -> Scenarios 1, 2, 4, 5
- [x] Edit `qa.md` Mode: RED, run `npm run gen:codex`, write `test/agents/qa-red-seal-content.node.test.ts` -> Scenario 1
- [x] Run `npm run typecheck` and the three new test files; confirm the existing `qa-content` and `cr081_qa_red_lint.red.sh` checks still pass

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers the epic's Unit, Contract and Integration levels; journey step "Ordinary story: QA-Red seals its own tests".

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | `countTests` per language (3), `countScenarios` with an Outline, the 2x boundary (8 of 4 clean, 9 flagged) |
| Integration tests | 4 | `seal_red.mjs` on a real temp git repository: clean seal with a spaced path; oversized then re-seal; refusal after a Developer commit; missing file exits 2 with no commit. Real git, no mocks |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1 (the Outline counts as one); the `@interfaces` scenario runs a real `pre_gate_runner.sh arch` |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `qa.toml` regenerated from `qa.md`, not hand-edited.
- [ ] Canonical edits only; live `.claude/` and `.cleargate/scripts` re-synced at sprint close.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:37-58` — Mode: RED, its numbered rules and output shape.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs:292-380` — rule registry, red-file globs, main loop and exit codes; checks fixtures only, no volume.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:317-342` — runs the lint on the worktree in the scan's own environment, so environment variables reach it.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:70` — report written to `<worktree>/.cleargate/reports/pre-arch-scan.txt`.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:347-415` — today's orchestrator-side red commit and scan (read only; STORY-066-12 owns the edit).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-commit-surface-gate.sh:11-26` — red-immutability gate that the re-seal must pass.
- **Surface:** `cleargate-cli/scripts/build-codex-payload.mjs` — generates `qa.toml` from `qa.md`.
- **Coverage of this requirement:** partial, about 30%. The lint, the scan and the commit text exist; the script that joins them, the volume rule and the agent's last step are new.

## Prior work

- [[EPIC-066]] — parent; owner decisions on QA-Red volume and sealing.
- [[CR-081]] — the red-test lint this story extends with a volume rule.
- [[CR-043]] — red-test immutability hook that the re-seal rule works around.
- [[CR-111]] — red test file naming, kept.
- [[STORY-043-08]] — Architect TPV dispatches only on a flagged scan; kept.
- [[BUG-113]], [[STORY-059-03]] — checks on sealed reds before the Developer starts; they run inside the scan `seal_red.mjs` calls.
- [[CR-120]] — dispatch descriptions and attribution; the QA-Red dispatch keeps its `qa-red <ID>` form.
- [[CR-122]] — Developer may read its reds; compatible.
- [[EPIC-065]] — owns what red assertions may pin; out of scope here.
- No prior work found for: a script that commits reds, passing the file list as separate arguments, or a test-count to scenario-count limit.

## Why not simpler?

- **Smallest existing surface that could carry this:** `qa_red_lint.mjs` plus the existing orchestrator instructions in `SKILL.md:347-415`.
- **Why isn't extension / parameterization / config sufficient?** The lint can only count, and the commit and the scan were already instructions that each orchestrator runs by hand through general-purpose agents (W010-1: six agents and about 0.75M cache-read tokens per wave for two fixed command sequences; W010-2: a shell-specific failure). Only a script that takes paths as separate arguments and prints one result removes the dispatches, and the script is the place where the scenario count meets the test count.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").

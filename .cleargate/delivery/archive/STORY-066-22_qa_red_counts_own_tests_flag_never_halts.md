---
story_id: STORY-066-22
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts
status: "Completed"
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T19:08:57Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox run 6 (RC 0.31.0-rc.6 = cli main 71b57d9, plain layout), finding S41: STORY-001-04's QA-Red re-sealed STORY-001-03's sealed usage test, qa_red_lint.mjs R-volume counted its 5 inherited tests (8 for 3 scenarios, limit 6), QA-Red returned BLOCKED and wave_runner.js mapped it to spec-contradiction, so the run halted outside the three gates (.cleargate/field-trials/2026-11-sandbox-s46.md 'Run 6'; sprint-runs/SPRINT-46/intake.md S41). Design source .cleargate/sprint-runs/SPRINT-46/plans/iteration-5-scoping.md §1-§6 (OD-1..OD-5). Owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; ratified in sprint-context Mid-Sprint Amendments, 'STORY-066-22 (iteration 5, /goal)')"
actor: QA-Red agent and the wave runner during a sprint, and the Orchestrator that reads their verdicts
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: runtime
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T19:06:38.618Z
updated_at: 2026-11-15T19:08:57Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T19:10:13Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-066-22
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-15T19:10:13Z
  sessions: []
---

# STORY-066-22: QA-Red counts only the tests it adds, and a flagged seal never halts the wave
**Complexity:** L2 — edits to three existing scripts (about 40 LOC) and prose in two prompts plus one playbook paragraph. Known patterns; no new dependency.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator running a sprint, I want QA-Red's volume check to count only the tests the item adds, and a flagged seal to go to Architect TPV instead of to the owner, so that an item that has to update another item's sealed test runs through the wave with no halt outside the three gates.

### 1.2 Detailed Requirements
- **Requirement 1 (S41a): R-volume counts the tests the item adds.**
  - In `qa_red_lint.mjs`, `rVolume({ files, scenarios })` accepts an optional `baseText` per file. Each file counts `max(0, countTests(name, text) - countTests(name, baseText ?? ''))`. The function stays pure.
  - When `CLEARGATE_RED_BASE` is set, `main()` reads each listed file's base text from git at that commit. A file absent at the base counts in full, and the flag text ends `; counted: tests added since <first 7 chars of the base>`.
  - When `CLEARGATE_RED_BASE` is unset, the count and the flag text are exactly today's.
- **Requirement 2 (S41a): the seal supplies the base.**
  - `seal_red.mjs` passes `CLEARGATE_RED_BASE` = `git merge-base <--sprint-branch> HEAD` to the scan, beside `CLEARGATE_RED_FILES` and `CLEARGATE_RED_SCENARIOS`.
  - Its JSON `tests` uses the same per-file count, so it matches the number in the lint.
- **Requirement 3 (S41b): a lint flag is never a block, in every prompt QA-Red and the Orchestrator read.**
  - `qa.md` Mode: RED (and the generated `qa.toml`):
    - When FLAGS contains `qa_red_lint`, QA-Red fixes the set and seals again if it can do so without deleting or merging tests another item sealed. It then returns `QA-RED: WRITTEN` with the seal's FLAGS, clean or not.
    - `QA-RED: BLOCKED` is only for an acceptance scenario that cannot be expressed as a test, or for exit 2.
    - When the item changes behaviour another item's sealed test pins, QA-Red edits that test and lists its file in the seal. That file counts only the tests QA-Red adds.
  - The `wave_runner.js` QA-Red prompt says the same: return WRITTEN when the seal is flagged, and BLOCKED only for a scenario that cannot be expressed as a test or a seal that could not run.
  - SKILL §C.3 says a flagged seal is not BLOCKED; the Codex SKILL is regenerated.
- **Requirement 4 (S41b): the runner backstop.**
  - `wave_runner.js` handles a QA-Red `BLOCKED` return as a flagged `WRITTEN` seal when all of these hold: it carries a non-empty `sealed_sha`, `scan_exit` 1, and non-empty `flags` that are all `qa_red_lint`. The segment then continues to the next stage, which is `architect-tpv` on the standard lane.
  - Every other QA-Red `BLOCKED` still ends the segment with blocker type `spec-contradiction`.

### 1.3 Out of Scope
- The surface gate protecting another item's sealed tests from the Developer (intake S36).
- The story-plan path wording at `wave_runner.js:62` and background-session guidance (intake S38; OD-3, next sprint).
- R-enum/R-query linting every red-named file in the worktree, not only the listed ones (scoping §7).
- A re-seal with no staged change (run-4a intake).
- The `tests` type mismatch between the seal JSON (a number) and the runner's red schema (an array of strings).
- Live `.claude/` and `.cleargate/` copies: re-synced at SPRINT-46 Gate 4.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** How should the count separate this item's tests from tests another item sealed in a file it edits?
- **Recommended:** Per listed file, take tests at HEAD minus tests in the same file at `merge-base(--sprint-branch, HEAD)`, floored at 0. Deleting one inherited test and adding one nets 0. That is accepted, because the cap is a volume heuristic (scoping OD-1).
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation (OD-1).
- **Question:** Should the runner also treat a QA-Red BLOCKED that cites only lint flags as a flagged seal, or rely on the prompt fix alone?
- **Recommended:** Add the runner backstop as well. The same prompt returned WRITTEN in run 5a and BLOCKED in run 6. The runner cannot read free text, so the test is structural: a `sealed_sha`, `scan_exit` 1, and flags that are all `qa_red_lint` (scoping OD-2).
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation (OD-2).
- **Question:** Does this story also fix the story-plan path wording (`wave_runner.js:62`, S38)?
- **Recommended:** No. A wording change does not get past the background-session guard, and run 6, started with `--settings`, did not hit S38 (scoping OD-3).
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation (OD-3).
- **Question:** STORY-066-07 says QA-Red "does not return `QA-RED: WRITTEN`" on exit 1. Does this story override that?
- **Recommended:** Yes, for routing only. The R-volume flag and the EPIC-066 §6 owner decision ("flagged above twice the scenario count") stay as they are (scoping OD-4).
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation (OD-4).

### 1.5 Risks

- **Risk:** QA-Red removes a test from an inherited file while adding one of its own, so the count undercounts.
- **Mitigation:** Accepted (OD-1). The cap limits volume, not correctness; EPIC-065 owns what assertions may pin.
- **Risk:** QA-Red really finds a spec gap after sealing some tests, but returns BLOCKED with a lint-only flagged seal, and the backstop routes it to TPV.
- **Mitigation:** The gap still surfaces at the Developer (`Spec-Gap` → `spec-contradiction`) or at QA-Verify (`defect_in spec`), at the cost of up to two dispatches. The R3 prose makes such a return unlikely.
- **Risk:** `git merge-base` fails, for example on unrelated histories or a ref that does not resolve.
- **Mitigation:** The seal leaves `CLEARGATE_RED_BASE` unset and the count is today's (§3.2).
- **Risk:** The new runner prompt text trips the sealed `wave-runner.red` rule that no prompt may say approved, confirmed or authorized.
- **Mitigation:** The plan gives the prompt text verbatim, and Scenario 4 asserts it.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | A QA-Red BLOCKED either continues to TPV (lint-only flagged seal) or still ends the segment (every other BLOCKED). |
| Interfaces | T | The QA-Red prompt (qa.md, qa.toml), the runner's QA-Red prompt and the playbook (SKILL, Codex SKILL) each change. |
| Data | T | A listed file another item sealed and a file new to the item produce different counts. |
| Rules | T | The twice-the-scenarios cap still applies to the tests the item adds, including tests added to an inherited file. |

```gherkin
Feature: QA-Red volume counts its own tests and a lint flag never halts the wave

  @data
  Scenario: A sealed file of another item counts only the tests this item adds
    Given a sprint branch where "cmd/tally/main_red_test.go" holds 5 Go tests sealed by an earlier item
    And an item with 3 scenarios whose story branch edits one line in that file and adds "cmd/tally/main_top_red_test.go" with 3 tests
    When QA-Red seals both files with seal_red.mjs
    Then the seal exits 0 and its JSON has scan_exit 0, flags [] and tests 3
    And the scan report in the sprint reports dir has "[PASS] qa_red_lint"
    And the last pre-gate.jsonl line has mode "seal", exit 0 and flagged_checks []

  @rules
  Scenario: Tests the item adds are still capped, inherited file included
    Given the same sprint branch
    And the story branch adds 1 test to "cmd/tally/main_red_test.go" and 6 tests in a new red file
    When QA-Red seals both files with seal_red.mjs
    Then the seal exits 1 and its JSON has flags containing "qa_red_lint" and tests 7
    And the scan report contains "R-volume: 7 tests for 3 scenarios (limit 6); counted: tests added since " followed by 7 hex characters
    And qa_red_lint.mjs run on the same worktree with the same files and scenarios but without CLEARGATE_RED_BASE reports "R-volume: 12 tests for 3 scenarios (limit 6)" with no "counted:" suffix

  @paths
  Scenario: A QA-Red BLOCKED on a lint-only flagged seal goes to TPV, not to the owner
    Given a standard item whose QA-Red returns BLOCKED with sealed_sha "b842a61", scan_exit 1, flags ["qa_red_lint"] and a spec_gap
    When the wave runner runs the item with stub agents
    Then the dispatch after QA-Red is in phase Wiring, the segment reaches QA-Verify, and the verdict is GREEN with qaSha "b842a61"
    And a QA-Red BLOCKED with no sealed_sha, with flags ["typecheck"], with flags ["qa_red_lint", "typecheck"] or with scan_exit 2 still ends the segment BLOCKED with blocker type "spec-contradiction" after one dispatch

  @interfaces
  Scenario: The prompts and the playbook say a flag is never a block
    Given the canonical qa.md and its generated qa.toml, the wave runner, and the canonical and Codex sprint-execution SKILL.md
    Then qa.md and qa.toml Mode: RED say "a flag is never a reason to return `QA-RED: BLOCKED`", "counts only the tests this item adds" and "only when an acceptance scenario cannot be expressed as a test"
    And neither says "until the seal is clean"
    And the runner's QA-Red prompt says "also when the seal is flagged" and "only when a scenario cannot be expressed as a test"
    And no runner prompt matches approved, confirmed or authorized
    And SKILL §C.3 and the Codex SKILL §C.3 say "**A flagged seal is not BLOCKED.**"
```

### 2.2 Verification Steps (Manual)
- [x] Replays (story plan, Proof; scoping §6), with no model calls:
  - A: the 5a case in a scratch copy of the worktree-layout sandbox.
  - B: the run-6 case in a scratch copy of the plain sandbox.
  - C: the runner fed run 6's three journal results verbatim.
  - Pass conditions are listed in the story plan. Evidence goes to `evidence/STORY-066-22/`.
- [x] Goal check (d) run 7 on RC 0.31.0-rc.7, plain layout:
  - run 3's criteria 1–10 and the section C bar;
  - no `spec-contradiction` in the transcript;
  - 001-04's seal lines carry no `qa_red_lint` unless 001-04 added more than twice its scenario count.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/test/scripts/r-volume-added-tests.red.integration.node.test.ts`, `cleargate-cli/test/scripts/wave-runner-flagged-seal.red.node.test.ts`, `cleargate-cli/test/docs/flag-is-not-a-block.red.node.test.ts` |
| New Files Needed | Yes — three red test files. `qa.toml` and the Codex SKILL are regenerated by `npm run gen:codex`, never hand-edited |

### 3.2 Technical Logic
The story plan (`.cleargate/sprint-runs/SPRINT-46/plans/STORY-066-22.md`) governs. In short:
1. **`qa_red_lint.mjs`.**
   - `rVolume` takes `baseText` per file.
   - A new export, `readBaseText(dir, base, rel)`, runs `git -C <dir> show <base>:./<rel>` with `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` stripped, and returns `''` on any failure.
   - `main()` passes `baseText` when `CLEARGATE_RED_BASE` is set and appends the `; counted: tests added since <base:7>` suffix to the flag.
2. **`seal_red.mjs`.**
   - After the re-seal check, run `git merge-base <branch> HEAD`. On success, set `CLEARGATE_RED_BASE` beside the two existing variables when `scenarios > 0`; otherwise delete it from the scan env.
   - The JSON `tests` uses `readBaseText` and the same floor-at-0 delta.
3. **`wave_runner.js`.**
   - The QA-Red prompt (`:65`) gains the WRITTEN-when-flagged sentence.
   - The red branch (`:138`) checks the backstop condition before the existing BLOCKED return. When it holds, it logs one line and continues as WRITTEN.
4. **Prose.** qa.md steps 8 and 9 and the BLOCKED line, and the SKILL §C.3 paragraph. Then `npm run gen:codex` and `npm run prebuild`.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `node .cleargate/scripts/qa_red_lint.mjs <dir>` | CLI + env | None | `CLEARGATE_RED_FILES`, `CLEARGATE_RED_SCENARIOS`, new optional `CLEARGATE_RED_BASE` (commit) | stderr flag `R-volume: <T> tests for <S> scenarios (limit <2S>)`, plus `; counted: tests added since <base:7>` when the base is set; exit 1 on a flag |
| `seal_red.mjs` stdout JSON | CLI | None | unchanged | `tests` = tests the item added since `merge-base(--sprint-branch, HEAD)` |
| `wave_runner.js` verdict | Workflow return | None | unchanged | a QA-Red BLOCKED with `sealed_sha`, `scan_exit` 1 and only `qa_red_lint` flags no longer yields `BLOCKED`/`spec-contradiction` |

## Task Breakdown

- [x] QA-Red: three new red files, 4 tests (T-V1, T-V2, T-R1, T-D1); seal -> Scenarios 1-4
- [x] `qa_red_lint.mjs`: `rVolume` `baseText`, `readBaseText`, `CLEARGATE_RED_BASE` in `main()` and the flag suffix -> Requirement 1; Scenarios 1, 2
- [x] `seal_red.mjs`: merge-base into `CLEARGATE_RED_BASE`; JSON `tests` as the per-file delta -> Requirement 2; Scenarios 1, 2
- [x] `wave_runner.js`: QA-Red prompt sentence (`:65`) and the lint-only BLOCKED backstop (`:138`) -> Requirements 3, 4; Scenarios 3, 4
- [x] qa.md steps 8, 9 and the BLOCKED line; SKILL §C.3 paragraph -> Requirement 3; Scenario 4
- [x] `npm run gen:codex`; `npm run prebuild` -> Requirement 3; Scenario 4
- [x] `npm run typecheck`, the new reds and the plan's regression list -> all
- [x] QA-Verify on the story tree, then replays A–C into `evidence/STORY-066-22/` -> all

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Integration (seal and lint on real git repos with an inherited sealed file), Unit (runner routing under stub agents; prompt and playbook text), Release gate (Goal check (d) run 7).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | Runner backstop and non-backstop BLOCKEDs under stub agents (T-R1); qa.md/qa.toml RED slices, runner prompt, SKILL/Codex SKILL §C.3 (T-D1). |
| Integration tests | 2 | Real git, no mocks: inherited file counts only added tests (T-V1); the cap still applies, with the suffix, and without the base the count is today's (T-V2). |
| E2E / acceptance tests | 4 | One per Gherkin scenario; the release-gate proof is Goal check (d) run 7. |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] These existing tests stay green with no edit: `seal-red.integration`, `qa-red-lint-volume`, `qa-red-seal-content`, `seal-red-expected-red.red` (unit and integration), `sprint-root-outputs.red.integration`, `expected-red-not-a-flag.red`, `wave-runner.red` (unit and integration), `wave-runner-sandbox-fixes.red`, `wave-runner-item-rerun.red.integration`, `codex-sprint-execution-render.red` and `codex-agents-codegen.red`. `build-codex-payload.mjs --check` passes.
- [x] Replay evidence in `evidence/STORY-066-22/` meets every pass condition in the story plan's Proof section.
- [x] Goal check (d) run 7 passes on rc.7 (plain).
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs:405-421`, `:470-488` — `rVolume` sums `countTests` over whole files; `main()` reads the listed files at HEAD only.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs:177-193` — the JSON `tests` count and the scan env (`CLEARGATE_RED_FILES`, `CLEARGATE_RED_SCENARIOS`).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:48`, `:65`, `:112`, `:137-143` — `scanFlagged`, the QA-Red prompt, the `scan-flagged` stage skip and the red branch that maps every BLOCKED to `spec-contradiction`.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:49-50`, `:64` — the volume rule, step 9's "do not return `QA-RED: WRITTEN` until the seal is clean", and the BLOCKED line.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:370-372` — §C.3's BLOCKED and WRITTEN lines.
- **Coverage of this requirement:** partial. Every surface exists. The fixes are a base-aware count, one environment variable, one routing condition and four prose edits.

## Prior work

- [[EPIC-066]] — parent; Goal check (d) is its release gate.
- [[STORY-066-07]] — R-volume, the seal, and the qa.md rule "does not return `QA-RED: WRITTEN`" on exit 1, which this story supersedes for routing (OD-4). The flag stays.
- [[STORY-066-13]] — the Developer `Red-Test` → QA-Red route, which worked in run 6 and leads into this case.
- [[STORY-066-19]] — the expected-red classifier in `seal_red.mjs`; unchanged here.
- [[STORY-066-21]] — seal records in the sprint root and the `"mode":"seal"` line, which run 7 reads; unchanged here.
- [[EPIC-065]] — owns what red assertions may pin; untouched.
- cleargate-wiki-query 2026-11-15 (scoping): no item covers counting inherited tests or routing a flagged seal returned as BLOCKED. Intake S36, S40 and S41 are the same family.

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing volume rule (`qa_red_lint.mjs:405-421`), the scan env in `seal_red.mjs:186-193`, the red branch at `wave_runner.js:138`, and qa.md step 9.
- **Why isn't extension / parameterization / config sufficient?**
  - Raising the cap or turning R-volume off (`arch.qa_red_lint`) would also drop the volume check on the item's own tests, which the owner decided to keep (EPIC-066 §6).
  - A prompt-only fix is not deterministic: the same qa.md text returned WRITTEN in run 5a and BLOCKED in run 6.
  - Leaving the inherited file out of the seal list is not possible: the seal commits exactly the listed files, and the edited assertion has to be sealed.

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

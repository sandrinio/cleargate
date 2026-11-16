---
story_id: STORY-065-05
parent_epic_ref: EPIC-065
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Ready
approved: true
approved_by: sandrinio
approved_at: 2026-11-16T09:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-065 (approved 2026-11-16) §2 scope and §6 answers; surfaces re-mapped at cleargate-cli 99cbfd7 on 2026-11-16 after SPRINT-46; SPRINT-46 intake items folded in are named in Prior work
actor: QA-Red, the Developer and QA-Verify on container and live items
complexity_label: L3
area: agent-prompts,scripts
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-16T07:39:06.375Z
updated_at: 2026-11-16T07:39:06.375Z
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
  last_gate_check: 2026-11-16T07:48:09Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "2b6df82d0ce5c5882ab228e39fbf00f00cab63ba86fd1b50dd8fbf236595a528"
---

# STORY-065-05: Holdout Scenarios and Property Tests
**Complexity:** L3 — a holdout-free item view for the agents that build, a tag-aware scenario count, a seal mode for tests added after the Developer's commit, and two QA rules, in both hosts.

## 1. The Spec (The Contract)

### 1.1 User Story
As the owner, I want some acceptance scenarios on container and live items kept from the agents that write the tests and the code, and checked only by QA-Verify, so that passing the item's own tests does not mean the code was shaped to those tests alone.

### 1.2 Detailed Requirements
- **R1 — Item view.** When an item's Gherkin has `@holdout` scenarios, `wave_runner_args.mjs` writes `<sprintDir>/.item-view-<ID>.md`: the item file with each `@holdout` scenario (its tag line through the line before the next tag line, `Scenario`/`Scenario Outline`, or the fence end) replaced by one line `# holdout scenario withheld (1)`. The item's args carry `view_file` (the view, or the item file when there are no holdouts).
- **R2 — Who sees what.** `wave_runner.js` passes `Item file: <view_file>` to the `story-plan`, `qa-red`, `architect-tpv` and `developer` stages, and the full item file to `qa-verify` and `architect-review`. `developer.md`/`developer.toml` and `qa.md`/`qa.toml` RED say: read the item only through the given `Item file`, never the raw file under `.cleargate/delivery/`.
- **R3 — Tag-aware count.** `qa_red_lint.mjs` `countScenarios` takes an option to leave out `@holdout` scenarios; `seal_red.mjs` (`:192`) uses it, so the R-volume limit is twice the visible scenarios.
- **R4 — Amendment seal.** `seal_red.mjs <ID> --amendment … -- <files>` seals after the Developer has committed when every staged file is new (`git diff --cached --diff-filter=A`) and no file a `qa-red(<ID>)` commit already sealed is staged. It commits with subject `qa-red(<ID>): amendment`, skips R-volume, and adds `amendment: true` to its JSON line and its `pre-gate.jsonl` seal line. A staged change to a sealed file, or a modified (not new) file, exits 2 with the file named. Architect amendments that add new red files after the Developer's commit use the same mode.
- **R5 — QA-Verify writes the holdout tests.** `qa.md` VERIFY (and `qa.toml`): for an item with `@holdout` scenarios, write one test per holdout scenario (named per `sprint_context.md` §Test Stack, not `*.red.*`), run them, and commit them with `seal_red.mjs <ID> --amendment`. Report `HOLDOUTS: <written>/<passing>`. A failing holdout is a defect against that scenario (`DEFECT_IN: code` unless the scenario itself is wrong).
- **R6 — Properties, not shapes.** `qa.md` RED (and `qa.toml`): sealed tests assert the properties a scenario states (behaviour, invariants, the presence of named facts) and not incidental shape (whole-message equality, key order, whole-file snapshots), unless the scenario quotes the exact text or shape.

### 1.3 Out of Scope
- Declaring holdouts and requiring one on container and live items (STORY-065-01's predicate).
- The prove stage (065-04); holdout tests are part of QA-Verify, before it.
- Hiding the raw item file on disk; R2 is a prompt rule, as the epic's "never see it" is for the agents' context.

### 1.4 Open Questions

- **Question:** [[CR-122]] (Draft) proposes letting the Developer read the red tests. Does that conflict with hiding holdouts?
- **Recommended:** No. Holdout scenarios have no red tests (QA-Red never sees them), so the Developer reading red tests reveals nothing withheld. CR-122 stays a separate decision.
- **Human decision:** As recommended (owner, 2026-11-16: "approve as recommended").

### 1.5 Risks

- **Risk:** A Developer reads the raw item file anyway and codes to the holdout.
- **Mitigation:** R2's prompt rule, and the view's withheld line tells the reader that something is hidden on purpose. The sandbox run's Developer transcript is checked for reads of the raw item path (one grep, recorded in the field-trial log).
- **Risk:** A failing holdout gives the Developer the hidden scenario in the rework issue, so a second attempt is no longer blind.
- **Mitigation:** Accepted: the holdout's job is to catch the first miss; after that it is an ordinary failing test.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Item with holdouts gets a view; amendment seal commits new holdout tests. |
| Interfaces | T | The runner's role prompts and the seal script both carry the rule. |
| Data | T | Items with and without holdouts. |
| Rules | T | Visible-only R-volume count; amendment refuses changes to sealed or existing files; prompt rules. |

```gherkin
Feature: Holdout scenarios and property tests

  @paths @interfaces
  Scenario: The building agents get a view without the holdout
    Given STORY-F has three scenarios, one tagged @holdout
    When wave_runner_args.mjs builds STORY-F's args and the runner writes its role prompts
    Then .item-view-STORY-F.md has the two other scenarios and the line "# holdout scenario withheld (1)"
    And the story-plan, qa-red, architect-tpv and developer prompts name the view as the Item file
    And the qa-verify and architect-review prompts name the full item file

  @data
  Scenario: An item without holdouts gets no view
    Given STORY-G has no @holdout scenario
    When wave_runner_args.mjs builds STORY-G's args
    Then view_file is STORY-G's item file and no view file is written

  @rules
  Scenario: R-volume counts visible scenarios only
    Given STORY-F has three scenarios, one tagged @holdout
    When seal_red.mjs seals five new red tests for STORY-F
    Then the R-volume flag reads "5 tests for 2 scenarios (limit 4)"

  @paths @rules
  Scenario: The amendment seal accepts new files only
    Given STORY-F's Developer has committed after the qa-red seal
    When seal_red.mjs STORY-F --amendment seals a new holdout test file
    Then a "qa-red(STORY-F): amendment" commit holds it and the JSON line has amendment true
    When seal_red.mjs STORY-F --amendment is given a change to a sealed red test
    Then it exits 2 naming that file and commits nothing

  @rules @interfaces
  Scenario: The QA roles state the holdout and property rules in both hosts
    When qa.md, qa.toml, developer.md and developer.toml are read
    Then RED says sealed tests assert the scenario's properties, not incidental shape, unless the scenario quotes it
    And VERIFY says to write, run and amendment-seal one test per holdout scenario and report HOLDOUTS
    And RED and the Developer read the item only through the given Item file
```

### 2.2 Verification Steps (Manual)
- [ ] On the release sandbox run, a container item's holdout test lands in a `qa-red(<ID>): amendment` commit and the Developer's transcript shows no read of the raw item file.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/developer.toml` |
| New Files Needed | Yes — `cleargate-cli/test/scripts/holdout-view.red.node.test.ts`, `cleargate-cli/test/scripts/seal-red-amendment.red.node.test.ts` |

### 3.2 Technical Logic
- Holdout parse: inside fenced `gherkin` blocks only; a tag line is a line of `@tags` directly above a `Scenario`/`Scenario Outline` line; `@holdout` may sit among other tags. Share the parser between `qa_red_lint.mjs` (count) and `wave_runner_args.mjs` (view) by exporting it from `qa_red_lint.mjs` beside `countScenarios`.
- View path: the runner prompt (`wave_runner.js:56-58`) reads `item.file`; add `item.view_file` and choose by role (`ADAPTERS[stage].role`).
- Amendment seal: today `seal_red.mjs:78-88` refuses any seal once a non-`qa-red(` commit follows the first seal. `--amendment` bypasses that check only after the new-files and no-sealed-file checks pass.

### 3.3 API Contract (if applicable)
N/A — `seal_red.mjs` keeps its JSON line; `amendment` is additive.

## Task Breakdown
- [x] Red tests for the five scenarios.
- [x] Holdout parser and tag-aware `countScenarios` in `qa_red_lint.mjs`; `seal_red.mjs` uses the visible count.
- [x] `seal_red.mjs --amendment`.
- [x] View file in `wave_runner_args.mjs`; per-role Item file in `wave_runner.js`.
- [x] `qa.md`/`qa.toml` RED and VERIFY rules; `developer.md`/`developer.toml` read rule.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | View with and without holdouts, per-role Item file, visible R-volume, amendment accept and refuse. Epic level: Unit. |
| Integration tests | 1 | `--amendment` on a real temp repo after a Developer commit. |
| E2E / acceptance tests | 1 | Role-text pins for both hosts. Journey: "Build to Done". |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:55-70` — role prompts pass the raw `Item file:` to every role.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs:78-88,192` — refuses a seal after a Developer commit; counts scenarios with no tag awareness.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs:381,491` — `countScenarios` and R-volume.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:37-95` — RED and VERIFY modes.
- **Coverage of this requirement:** partial — the seal, the lint and the role prompts exist; the view, the tag-aware count, the amendment mode and the two rules are new.

## Prior work

- [[EPIC-065]] — parent; holdouts and the property rule were decided by the owner on 2026-11-14 (INITIATIVE-002).
- [[STORY-066-07]] (Completed) — QA-Red seals its own tests; [[STORY-066-22]] (Completed) — the seal counts only the item's own tests.
- [[CR-122]] (Draft) — the Developer reads red tests; see §1.4.
- [[BUG-113]] (Triaged) — nothing checks sealed tests against declared layers; related, not fixed here.
- SPRINT-46 intake: `seal_red.mjs` refused amendments that add new red files after the Developer's commit and the orchestrator waived the seal by hand (STORY-066-17, -18); R4 is that fix.

## Why not simpler?

- **Smallest existing surface that could carry this:** a prompt line telling QA-Red and the Developer to skip `@holdout` scenarios.
- **Why isn't extension / parameterization / config sufficient?** An agent asked to skip text it is shown has still read it. Giving the building roles a view without the scenario is the smallest change that keeps it out of their context; the seal, the lint and the runner are extended, not replaced, and the amendment mode also removes a hand step the last sprint needed.

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

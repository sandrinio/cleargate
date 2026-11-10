---
story_id: STORY-031-03
parent_epic_ref: EPIC-031
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-43
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: SPRINT-39/40 transcript measurement (2026-09-06 execution-efficiency audit); verified against cleargate-cli/package.json:48 and .claude/agents/devops.md:56,146,237
actor: Sprint Orchestrator
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-09-06T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-06T16:32:55Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-031-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:32:55Z
  sessions: []
---

# STORY-031-03: §Test Stack Declares the Targeted Runner and the Known-Failure List
**Complexity:** L2 — two rows added to a template, one prescribed command corrected in three places, mirrored across canonical + live.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Sprint Orchestrator, I want `sprint-context.md` §Test Stack to name the repo's single-file test runner and its known pre-existing failures, so that every agent runs one file in ~1 second instead of discovering by trial that the obvious command silently runs all 272.

### 1.2 Detailed Requirements

1. **Add two rows to the §Test Stack table** in `.cleargate/templates/sprint_context.md` (currently four rows at :39-42) and its canonical mirror:

   | Field | Value |
   |-------|-------|
   | Single-file runner | _(command that runs ONE test file; state path-resolution base. e.g. `npm --prefix cleargate-cli run test:file -- <path-relative-to-cleargate-cli>`)_ |
   | Known pre-existing failures | _(files/tests failing on `main` before this sprint, with error signature; or `none verified at init`)_ |

2. **Correct the prescribed command** at `devops.md:56` and `devops.md:146` in BOTH `cleargate-planning/.claude/agents/devops.md` and `.claude/agents/devops.md`. Both currently prescribe `npm test -- <test-file-path>`, which `cleargate-cli/scripts/run-default-tests.mjs:23-30` silently discards before globbing all 272 files. Replace with a pointer to §Test Stack's `Single-file runner` row — not a hardcoded command, since `devops.md` is generic payload shipped to every target repo.

3. **The `Single-file runner` row must state its path-resolution base.** Under `npm --prefix cleargate-cli`, paths resolve relative to `cleargate-cli/`, so `test/config.node.test.ts` is correct and `cleargate-cli/test/config.node.test.ts` matches zero tests and **exits 0** — which reads as a pass. The row carries this warning inline.

4. **Do not remove `devops.md:237`** (`No full test suite`). It is correct and stays.

### 1.3 Out of Scope
- `init_sprint.mjs` carry-forward of §Test Stack across sprints — that is STORY-031-05.
- QA-Red's full-suite runs — that is STORY-031-04.
- `developer.md:95`'s commit-time full-suite obligation. BUG-053 is open (`cleargate-cli/.git/hooks/` holds only samples), so that hand-run is currently the only verification standing over CLI source. Changing it is coupled to BUG-053 and is not this story.
- Patching `run-default-tests.mjs` to honour argv. Fourteen archived work items use `npm test -- <substring>` as a surviving vitest-era name filter; making argv meaningful would flip those from silently-green to `exit 1`. `test:file` already gives correct behaviour with zero code change.
- Populating SPRINT-41's live `sprint-context.md`. That is an immediate operational fix, not sprint scope.

### 1.4 Open Questions

- **Question:** `devops.md` ships to every target repo, where no `test:file` script may exist. Should the story hardcode the cleargate-cli command or point at §Test Stack?
- **Recommended:** Point at §Test Stack. The table's own preamble already declares it OVERRIDES agents' built-in defaults, making it the correct single source; hardcoding would be wrong in every non-ClearGate install.
- **Human decision:** {populated during Brief review}

### 1.5 Risks

- **Risk:** A prompt edit alone does not bind. `devops.md:237` has forbidden the full suite since before SPRINT-39 and DevOps ran four anyway, because the orchestrator's §C.7 dispatch pinned an expected `tests 2590 · pass 2588 · fail 1` tuple the agent had to reproduce.
- **Mitigation:** SKILL.md §C.7's dispatch template must stop demanding a full-suite count signature in the same commit. Listed in §3.1 and in the DoD.

- **Risk:** Canonical-only edit is inert (BUG-085 class) — the live `/.claude/` instance is what actually executes.
- **Mitigation:** Both trees are in §3.1; DoD requires a parity diff.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Test Stack declares the targeted runner and known failures

  Scenario: Template carries both new rows
    Given the sprint_context.md template
    When a sprint is initialised from it
    Then the rendered §Test Stack table contains a "Single-file runner" row
    And it contains a "Known pre-existing failures" row

  Scenario: The Single-file runner row warns about path resolution
    Given the rendered §Test Stack table
    When the "Single-file runner" row is read
    Then it states the base directory that file paths resolve against

  Scenario: DevOps no longer prescribes the arg-dropping command
    Given cleargate-planning/.claude/agents/devops.md
    When lines 56 and 146 are read
    Then neither contains the literal string "npm test -- "
    And each refers to the §Test Stack Single-file runner row

  Scenario: The full-suite prohibition survives
    Given cleargate-planning/.claude/agents/devops.md
    When the Guardrails section is read
    Then "No full test suite." is still present

  Scenario: Canonical and live agree
    Given both agent trees
    When devops.md is diffed between cleargate-planning/.claude/ and .claude/
    Then the files are byte-identical
```

### 2.2 Verification Steps (Manual)
- [ ] Run the §Test Stack `Single-file runner` value against one real test file; confirm it completes in under 5 seconds and reports a non-zero test count.
- [ ] Run it with a wrongly-based path; confirm it reports zero tests and exits 0 (the trap the row warns about).
- [ ] Confirm SKILL.md §C.7's dispatch template no longer requests a full-suite count tuple.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/templates/sprint_context.md` |
| Related Files | `cleargate-planning/.cleargate/templates/sprint_context.md`, `cleargate-planning/.claude/agents/devops.md`, `.claude/agents/devops.md`, `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` |
| New Files Needed | No |

### 3.2 Technical Logic

The §Test Stack table already exists (template :36-43) and its preamble already asserts that agents read it as OVERRIDING their built-in defaults. This story adds two rows to that existing table and redirects `devops.md` at it. No new mechanism.

`devops.md:56` currently reads:
`6. Post-merge test verification: run only the test files touched by this commit (npm test -- {test-file-paths}). Full suite NOT required (cost discipline).`

The parenthetical is replaced with a reference to the §Test Stack row. `devops.md:146`'s fenced `cd cleargate-cli && npm test -- <test-file-path>` is replaced the same way.

### 3.3 API Contract (if applicable)
Not applicable — markdown surfaces only.

## Task Breakdown

- [ ] Add the two rows to `.cleargate/templates/sprint_context.md` §Test Stack
- [ ] Mirror the template change to `cleargate-planning/.cleargate/templates/sprint_context.md`
- [ ] Replace the command at `devops.md:56` in canonical and live
- [ ] Replace the fenced command at `devops.md:146` in canonical and live
- [ ] Remove the full-suite count-tuple demand from SKILL.md §C.7's dispatch template
- [ ] Run the pinned agent-prompt tests before committing
- [ ] Parity-diff canonical vs live for devops.md

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | No code paths change |
| Integration tests | 0 | — |
| E2E / acceptance tests | 5 | 1 per Gherkin scenario in §2.1; the rendered-template scenarios extend the existing `init-sprint-context.red.node.test.ts` |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Canonical and live `devops.md` byte-identical (parity diff attached to the DevOps report).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/package.json:48` — `test:file` script; runs one file with `--experimental-test-module-mocks` and `CLEARGATE_CI_ACK=1`. Measured at 0.8–1.9 s against a 5.5–9.6 min full suite.
- **Coverage of this requirement:** ~60% — the runner already exists and needs no code change. What is missing is that no agent prompt, no sprint-context.md and no flashcard names it.
- **Surface:** `.cleargate/templates/sprint_context.md:36-43` — the §Test Stack table, four rows, with a preamble declaring it overrides agents' built-in defaults.
- **Coverage of this requirement:** partial — correct location and correct authority, missing the two rows.
- **Surface:** `.claude/agents/devops.md:56,146,237` — prescribes `npm test -- <path>` twice while forbidding the full suite once.
- **Coverage of this requirement:** none — this is the defect being corrected.

## Prior work

- [[EPIC-031]] — parent. "Test Suite Wall-Time Reduction — Split Runner + Scoped QA"; this story is a new child extending it.
- [[STORY-031-02]] — closest sibling. Already prescribes `npm run test:file -- <paths>` for QA-Verify, but scopes only QA-Verify, leaves `devops.md` untouched, and derives touched files from the QA Context Pack, which has never been generated. This story supplies the §Test Stack rows that STORY-031-02 should read instead.
- [[CR-110]] — Completed. Established `sprint_context.md` §Test Stack as a carried, agent-read section.
- [[CR-111]] — Completed. Declares test layers at planning time; the naming conventions this story's rows sit beside.

## Why not simpler?

- **Smallest existing surface that could carry this:** `.cleargate/templates/sprint_context.md:36-43` — the existing §Test Stack table.
- **Why isn't extension / parameterization / config sufficient?** It is — this story is pure extension of an existing table plus a string correction, with no new abstraction, no new script and no new config key. The only reason it is a Story rather than a CR is that it spans six files across the canonical/live split and carries an enforcement coupling (SKILL.md §C.7's dispatch template must change in the same commit, or the prompt edit provably does not bind).

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

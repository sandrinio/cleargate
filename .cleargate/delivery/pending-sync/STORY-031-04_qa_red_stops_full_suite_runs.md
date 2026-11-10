---
story_id: STORY-031-04
parent_epic_ref: EPIC-031
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-43
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: "SPRINT-39 transcript duration_ms census (2026-09-06 execution-efficiency audit): QA-Red 5 runs / 2,230,554 ms + TPV 1 run / 420,068 ms = 44.2 min, 45% of all transcribed full-suite time"
actor: QA-Red agent
complexity_label: L1
parallel_eligible: n
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
  last_gate_check: 2026-09-06T16:33:57Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-031-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:33:57Z
  sessions: []
---

# STORY-031-04: QA-Red Runs Only the Files It Authored
**Complexity:** L1 — two prompt lines in `qa.md` plus one dispatch-template line in SKILL.md §C.3.

## 1. The Spec (The Contract)

### 1.1 User Story
As the QA-Red agent, I want to run only the red test files I just wrote, so that authoring a failing spec stops costing a 2,650-case regression sweep against an implementation that does not exist yet.

### 1.2 Detailed Requirements

1. **Add a scope line to `qa.md` Mode: RED.** QA-Red confirms its own red files fail at baseline using the §Test Stack `Single-file runner` (STORY-031-03). It does not run the full suite.

2. **The known-failure baseline comes from §Test Stack, not from a suite run.** The only thing QA-Red's full-suite pass supplied was the pre-existing-failure list; STORY-031-03's `Known pre-existing failures` row now carries it.

3. **Strike the suite-numbers request from SKILL.md §C.3's dispatch text.** As with STORY-031-03, the dispatch is the causal layer — a prompt edit alone does not bind.

4. **Report-key compatibility.** Keep the `TESTS:` key exactly as-is and disambiguate with a parenthetical (`TESTS: X passed (scoped: <files>)`). `prep_qa_context.mjs:509` matches `/TESTS:\s*([^\n]+)/i`, and the parenthetical form is the established shape at `devops.md:180` and `qa.md:151`. Renaming the key would break a parser for no gain.

### 1.3 Out of Scope
- `qa.md:114` (runtime lane) and `qa.md:72-79` (Mode: CONSOLIDATION / SKILL.md §D.5.2). Both are deliberate full-suite passes and stay exactly as written.
- QA-Verify's scoping — that is [[STORY-031-02]], which needs its dead QA-Context-Pack reference repaired first.
- `developer.md:95`'s commit-time obligation — coupled to BUG-053.

### 1.4 Open Questions

- **Question:** If a red file imports a module that does not exist yet, does a single-file run report a usable failure, or does it error before the test framework reports counts?
- **Recommended:** It reports a usable failure — this is precisely the "not-yet-implemented"-class error (`missing export/module/route/table`) that `qa.md` Mode: RED already requires and that TPV §C.3.5 validates the wiring of. Confirm during implementation against one real red file.
- **Human decision:** {populated during Brief review}

### 1.5 Risks

- **Risk:** QA-Red loses its incidental regression signal. Today's full-suite run occasionally catches a pre-existing break before Dev starts.
- **Mitigation:** That signal moves to §Test Stack's `Known pre-existing failures` row (STORY-031-03), which SPRINT-39 already proved agents read and cite by name — its sprint-context.md:57-60 named the failing file and its error string, and BUG-043's dev, qa and devops reports each cited it.

- **Risk:** This is the one change in SPRINT-42 directly coupled to the near-zero rework record.
- **Mitigation:** `qa_bounces` is the tripwire. If it moves off its floor in the sprint after this lands, revert first and diagnose second. Recorded in the DoD.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: QA-Red runs only the files it authored

  Scenario: Mode RED scopes to authored files
    Given cleargate-planning/.claude/agents/qa.md Mode: RED
    When the test-execution instruction is read
    Then it directs QA-Red to the §Test Stack Single-file runner
    And it does not instruct a full-suite run

  Scenario: Baseline comes from Test Stack
    Given a sprint whose §Test Stack declares known pre-existing failures
    When QA-Red reports BASELINE_FAIL
    Then the count excludes those declared failures
    And QA-Red did not run the full suite to derive them

  Scenario: Deliberate full-suite passes are untouched
    Given qa.md
    When the runtime-lane and CONSOLIDATION sections are read
    Then both still require a full-suite run

  Scenario: The TESTS parser still matches
    Given a QA-Red report emitting "TESTS: 0 passed, 9 failed (scoped: a.red.sh)"
    When prep_qa_context.mjs's /TESTS:\s*([^\n]+)/i is applied
    Then the line matches and the captured value is non-empty
```

### 2.2 Verification Steps (Manual)
- [ ] Dispatch one real QA-Red against a story and confirm no full-suite invocation appears in its report.
- [ ] Confirm `qa_bounces` for that sprint stays at its floor.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-planning/.claude/agents/qa.md` |
| Related Files | `.claude/agents/qa.md`, `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` |
| New Files Needed | No |

### 3.2 Technical Logic

QA-Red's contract (`qa.md` Mode: RED, step 3) is "Confirm each test FAILS against the clean baseline (no implementation yet)." Confirming *these* tests fail requires running *these* tests. The full-suite run is not required by the contract; it accumulated around it. This story makes the existing step explicit about scope and points it at the §Test Stack row STORY-031-03 adds.

Dependency: **STORY-031-03 must merge first** — this story's baseline source does not exist until the `Known pre-existing failures` row does.

## 3.3 API Contract (if applicable)
Not applicable — markdown surfaces only.

## Task Breakdown

- [ ] Add the scope line to `qa.md` Mode: RED in canonical
- [ ] Point the baseline source at §Test Stack `Known pre-existing failures`
- [ ] Add the `(scoped: …)` parenthetical convention to the RED output shape
- [ ] Strike the suite-numbers request from SKILL.md §C.3 dispatch text
- [ ] Mirror canonical → live `.claude/agents/qa.md`
- [ ] Run the pinned qa.md content tests before committing

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | No code paths change |
| Integration tests | 0 | — |
| E2E / acceptance tests | 4 | 1 per Gherkin scenario in §2.1 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `qa-content.integration.node.test.ts` still green (it pins qa.md strings).
- [ ] Canonical and live `qa.md` byte-identical.
- [ ] Revert-tripwire recorded in the sprint log: if `qa_bounces` leaves its floor next sprint, revert first.

## Existing Surfaces

- **Surface:** `.claude/agents/qa.md` Mode: RED, step 3 — "Confirm each test FAILS against the clean baseline (no implementation yet)."
- **Coverage of this requirement:** partial — the correct instruction already exists; it is silent on scope, and the silence is what grew into a full-suite run.
- **Surface:** `.claude/agents/qa.md:114` (runtime lane) and `:72-79` (Mode: CONSOLIDATION) — the two deliberate full-suite passes.
- **Coverage of this requirement:** none — these are the carve-outs this story must not touch.
- **Surface:** `.cleargate/scripts/prep_qa_context.mjs:509` — `/TESTS:\s*([^\n]+)/i`, the parser constraining the output-key change.
- **Coverage of this requirement:** none — this is a compatibility constraint, not a candidate surface.

## Prior work

- [[EPIC-031]] — parent. Its stated goal already includes "make QA-Verify default to scoped tests"; this story extends the same intent to QA-Red, which the epic did not cover.
- [[STORY-031-02]] — sibling, covers QA-Verify. Explicitly does not mention QA-Red.
- [[STORY-031-03]] — hard dependency; supplies the §Test Stack rows this story reads.
- [[CR-081]] — established the red-now-green clause QA-Verify uses; unchanged by this story.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-planning/.claude/agents/qa.md` Mode: RED — the instruction already exists and needs one clause about scope.
- **Why isn't extension / parameterization / config sufficient?** It is pure extension; no new surface is created. It is filed as a Story rather than folded into STORY-031-03 because it carries a distinct safety coupling — it is the only item in SPRINT-42 that trades a real (if incidental) verification signal for time, and it therefore needs its own Gherkin, its own revert tripwire, and its own merge ordering behind STORY-031-03.

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

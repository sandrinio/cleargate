---
story_id: STORY-066-06
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: "sandrinio"
approved_at: "2026-11-15T09:00:00Z"
ambiguity: "🟢 Low"
context_source: "EPIC-066 (approved 2026-11-14; decomposition table and shared contract for stagesFor and the verdict fields) / verified against canonical cleargate-cli main: launch_wave.mjs, dispatch_serial.mjs, protocol §23 verdict table"
actor: Orchestrator
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
area: sprint-execution,scripts
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:47.966Z
updated_at: 2026-11-14T19:47:47.966Z
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
  last_gate_check: 2026-11-14T19:56:48Z
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

# STORY-066-06: Stage table
**Complexity:** L2 — one new data module, two scripts that read it, a stricter verdict validator, and the existing verdict fixtures updated.

## 1. The Spec (The Contract)

### 1.1 User Story
As the sprint Orchestrator, I want the list of stages each lane runs to live in one piece of code that the wave launcher and the serial dispatcher both read, so that a lane means the same thing on every host and no hand-written runner can drift from the plan.

### 1.2 Detailed Requirements
- **Requirement 1: `segment_stages.mjs`.** New `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs`. `export function stagesFor(lane)` returns a fresh, frozen, ordered array of `{ name, kind: 'agent' | 'barrier-script', agent?, mode?, when: 'always' | 'scan-flagged', script? }`. `export const STAGE_NAMES` is the frozen list of every stage name, in this order: `story-plan`, `qa-red`, `architect-tpv`, `developer`, `qa-verify`, `architect-review`, `merge`.
- **Requirement 2: the table** (shared contract):
  - `fast`: `developer`, `merge`.
  - `standard`: `qa-red`, `architect-tpv` (`scan-flagged`), `developer`, `qa-verify`, `architect-review` (`scan-flagged`), `merge`.
  - `runtime`: `story-plan`, `qa-red`, `architect-tpv` (`scan-flagged`), `developer`, `qa-verify`, `architect-review` (`always`), `merge`.
  - An unknown, missing or non-string lane returns the `standard` list (compatibility with state written before `runtime` existed).
  - Stage definitions: `story-plan` is agent `architect`, mode `STORY-PLAN`; `qa-red` is agent `qa`, mode `RED`; `architect-tpv` is agent `architect`, mode `TPV`; `developer` is agent `developer`; `qa-verify` is agent `qa`, mode `VERIFY`; `architect-review` is agent `architect`, mode `POST-FLIGHT`; `merge` is `barrier-script` with `script: 'merge_story.mjs'`. Every stage other than the two `scan-flagged` ones is `when: 'always'`.
- **Requirement 3: room for a new stage.** Each stage is defined once, by name, in one definitions object; each lane lists names and its `when` in one place. Adding a stage (EPIC-065's `prove`) is one definition, one entry in `STAGE_NAMES` and one line per lane. Neither `launch_wave.mjs` nor `dispatch_serial.mjs` contains a stage name as a string literal; they only pass through what `stagesFor` returns.
- **Requirement 4: `laneOf`.** The module also exports `laneOf(storyId, { state, plan })`: `state.stories[storyId].lane` when it is a string, else `plan.lane_assignments[storyId]`, else `'standard'`. State wins because it carries a demotion. It does not validate the name; `stagesFor` normalises.
- **Requirement 5: the launcher reads the table.** `launch_wave.mjs` `launchWave()` takes a new optional `lanes` map (story id to lane, the way `bases` works). Each planned segment carries `lane` (normalised: the lane name when it is one of `fast`, `standard`, `runtime`, else `standard`) and `stages` (`stagesFor(lane)`). The plan-only return includes both. `segmentRunner` is called as `segmentRunner(story, runId, { lane, stages })`; a runner that ignores the third argument keeps working.
- **Requirement 6: the serial dispatcher reads the table.** `dispatch_serial.mjs` `dispatchSerial()` takes the same optional `lanes` map; its plan-only `steps` and the `dispatchStory(storyId, { lane, stages })` call carry the lane and stages. `node dispatch_serial.mjs next` prints `lane` and `stages` in its `dispatch` line, taking the lane from `laneOf` over `<sprintDir>/state.json` and `plans/waves.json` (a missing or unreadable state file falls back to the plan, then to `standard`, with no error).
- **Requirement 7: the verdict carries what ran.** `validateVerdicts` (both `wave` and `serial` mode) requires `lane` (non-empty string) and `stages_run` (array of strings). Every entry of `stages_run` must be a name in the lane's own stage list (the lane normalised as above); a name may repeat (a bounce reruns the Developer). A GREEN verdict's `stages_run` must contain every `kind: 'agent'` stage whose `when` is `always` for its lane. A non-GREEN verdict is checked for shape and membership only. Errors keep the existing form `Malformed segment verdict for <storyId>: <reason>.`
- **Requirement 8: no QA commit on the fast lane.** Today a GREEN verdict needs a non-empty `qaSha` (`launch_wave.mjs:182-193`). The fast lane has no QA dispatch, so when the lane's stage list has no `qa` agent stage `qaSha` may be `null`; for any other lane it stays required. (This closes a gap the shared contract leaves; see §1.4.)
- **Requirement 9: documentation of the field.** The verdict table in `cleargate-protocol.md` (§23, lines 882-894) gains the `lane` and `stages_run` rows and the `qaSha` note. The `launch_wave.mjs` header verdict schema block gains the same.

### 1.3 Out of Scope
- `wave_runner.js` and any use of `stagesFor` beyond the two scripts ([[STORY-066-11]]).
- Any edit to either `SKILL.md` or either `dispatch-serial.md` ([[STORY-066-12]]); `dispatch-serial.md` describes the `next` output and is updated there.
- Which model runs a stage (`loop.models`, [[STORY-066-11]]) and the `prove` stage ([[EPIC-065]]).
- Computing the lane ([[STORY-066-05]]) and merging by script ([[STORY-066-08]]).
- Moving a verdict into `state.json` ([[BUG-102]]).

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** The shared contract makes `lane` and `stages_run` required, and `qaSha` is required on every GREEN verdict today. A fast-lane item never runs QA, so it has no QA commit. Does that contradict the contract?
- **Recommended:** It is a gap, not a contradiction. Resolve it as Requirement 8: derive "does this lane run QA" from `stagesFor`, so no lane name is hard-coded, and let `qaSha` be `null` when it does not.
- **Human decision:** Resolved in drafting per the recommendation; confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.

- **Question:** Seven test files build verdicts by hand and will fail once `lane` and `stages_run` are required: `wave-execution-barrier.red`, `dispatch-verdict-modes.red`, `dispatch-serial-cli.red`, `dispatch-serial.red`, `bug-034-flashcard-gate-restore`, `codex-loop-evidence.red` and `flashcard-gate-parity.red`. Several carry a "sealed" header from their own earlier sprint. Edit them?
- **Recommended:** Yes, minimally: add the two fields to each fixture's verdict builder and change nothing else. The seal protects a sprint's red set from the Developer of that sprint, and the contract change is made here on purpose. List the files in §3.1 so the file-surface gate passes. The frozen copy `test/fixtures/launch-wave-pre-058-12/launch_wave.mjs` is left alone.
- **Human decision:** Resolved in drafting per the recommendation; confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.

### 1.5 Risks
- **A stricter validator rejects verdicts from a wave runner an orchestrator wrote before this release.** Intended (that is the point of the field) and the only writer after [[STORY-066-11]] is the shipped runner. Until then the existing hand-written runners must add the fields; the protocol table says so.
- **`stages_run` is only as honest as its writer.** The validator proves membership and that the always-stages appear, not that they ran in order or with real work. Ordering and evidence are checked where the dispatches are recorded, not here.
- **Stage names change meaning if EPIC-065 reuses `architect-review` for a different mode.** Mitigation: Requirement 3 keeps the definition in one place.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Three lanes, each a successful path through the table; the unknown lane falls back to one of them. |
| Interfaces | T | Two surfaces read the table: `launchWave` (wave hosts) and `dispatch_serial.mjs` (serial hosts). |
| Data | T | `stagesFor` output differs by lane: one Scenario Outline. |
| Rules | T | The verdict rule (always-stages present; stage in the lane) is accepted in one scenario and broken in another. |

```gherkin
Feature: Stage table

  @paths @data
  Scenario Outline: stagesFor returns the stages of the lane
    When stagesFor("<lane>") is called
    Then the stage names are "<names>"
    And "architect-tpv" has when "<tpv>" where it is present
    And the last stage is "merge" with kind "barrier-script"

    Examples:
      | lane     | names                                                                              | tpv          |
      | fast     | developer, merge                                                                   | n/a          |
      | standard | qa-red, architect-tpv, developer, qa-verify, architect-review, merge               | scan-flagged |
      | runtime  | story-plan, qa-red, architect-tpv, developer, qa-verify, architect-review, merge   | scan-flagged |
      | bogus    | qa-red, architect-tpv, developer, qa-verify, architect-review, merge               | scan-flagged |

  @interfaces
  Scenario: The wave launcher plans each segment from the table
    Given a wave of STORY-A on lane "fast" and STORY-B on lane "runtime"
    When launchWave runs with those lanes and a segmentRunner
    Then the runner is called for STORY-A with the stages of "fast" and for STORY-B with the stages of "runtime"
    And the plan-only result lists the same lane and stages per story
    And launch_wave.mjs and dispatch_serial.mjs contain no stage name as a string literal

  @interfaces
  Scenario: The serial dispatcher names the lane and stages
    Given a sprint whose state.json holds lane "standard" for STORY-A and whose waves.json lists STORY-A in wave W1
    When node dispatch_serial.mjs next --sprint SPRINT-99 --wave W1 runs
    Then the dispatch line carries lane "standard" and the stages of "standard"
    And when state.json is missing the lane comes from waves.json lane_assignments, else "standard"

  @rules
  Scenario: A verdict that names what ran is accepted
    Given a fast-lane GREEN verdict with stages_run ["developer"] and qaSha null
    And a standard-lane GREEN verdict with stages_run ["qa-red", "developer", "qa-verify", "developer", "qa-verify"]
    When validateVerdicts runs on each, in wave mode and in serial mode
    Then both are accepted

  Scenario: A verdict that skipped a required stage or names a foreign stage is rejected
    Given a standard-lane GREEN verdict whose stages_run is ["qa-red", "developer"]
    And a fast-lane verdict whose stages_run is ["developer", "qa-verify"]
    And a verdict with no lane
    When validateVerdicts runs on each
    Then each throws "Malformed segment verdict for <storyId>" naming the missing stage, the foreign stage or the missing field
```

### 2.2 Verification Steps (Manual)
- [ ] Call `stagesFor` for each lane from a Node REPL and compare with the §1.2 table.
- [ ] Run `node dispatch_serial.mjs next` against a fixture sprint and read the `lane` and `stages` fields in the printed line.
- [ ] Add a throwaway `prove` stage to the table and confirm both scripts return it with no other edit; revert it.
- [ ] Confirm the protocol §23 verdict table lists `lane` and `stages_run`.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md` |
| Existing tests updated (verdict fixtures only) | `cleargate-cli/test/scripts/wave-execution-barrier.red.node.test.ts`, `cleargate-cli/test/scripts/dispatch-verdict-modes.red.node.test.ts`, `cleargate-cli/test/scripts/dispatch-serial-cli.red.node.test.ts`, `cleargate-cli/test/scripts/dispatch-serial.red.node.test.ts`, `cleargate-cli/test/scripts/bug-034-flashcard-gate-restore.node.test.ts`, `cleargate-cli/test/scripts/codex-loop-evidence.red.node.test.ts`, `cleargate-cli/test/scripts/flashcard-gate-parity.red.node.test.ts` |
| New tests | `cleargate-cli/test/scripts/segment-stages.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs`, `cleargate-cli/test/scripts/segment-stages.node.test.ts` |

### 3.2 Technical Logic
- `segment_stages.mjs`: a `STAGE_DEFS` object keyed by stage name (agent, mode, kind, script), a `LANE_STAGES` object keyed by lane (`[name, when]` pairs), and `stagesFor(lane)` that maps names to `Object.freeze({ name, ...def, when })` copies in a frozen array. `STAGE_NAMES = Object.freeze(Object.keys(STAGE_DEFS))` in the contract order. Look the lane up with `Object.hasOwn(LANE_STAGES, lane)` so a lane such as `constructor` falls back to `standard`.
- `launch_wave.mjs`: import `stagesFor` and `STAGE_NAMES`. In `launchWave` (line 332) build `laneOf = (story) => normalise(lanes[story])` next to `baseFor` (lines 337-340); extend `segmentPlan` (line 348), the plan-only return (lines 354-359) and the thunk (line 369). In `verdictMalformationReason` (lines 169-249) add the `lane`/`stages_run` checks after the scalar loop; adjust the `qaSha` rule per Requirement 8 (the lane check must run first so the qa-less test can use it). `validateVerdicts` signature and the `mode` handling stay as they are.
- `dispatch_serial.mjs`: `dispatchSerial` (line 255) takes `lanes`; plan-only steps (line 274) and the `dispatchStory` call (line 318) carry lane and stages. `runNext` (line 427) reads `state.json` and `plans/waves.json` through a small `readJsonOrNull` and prints the two fields at lines 452-459. `loadWave` already parses waves.json (lines 394-401); return `plan` from it instead of re-reading.
- Keep the module free of host or filesystem access; it is pure data plus two functions. `laneOf` takes already-parsed objects.
- The standalone copy in the clean-room install must carry `segment_stages.mjs`: both scripts import it by relative path, so `cleargate verify-install` has to list it. Confirm the scripts directory is copied wholesale; if a manifest lists files by name, add it.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `stagesFor(lane)` | function | none | lane string | frozen array of `{ name, kind, agent?, mode?, when, script? }` |
| `launchWave({ ..., lanes })` | function | none | map story id to lane | segments carry `lane`, `stages`; `segmentRunner(story, runId, { lane, stages })` |
| `dispatch_serial.mjs next` | CLI | none | `--sprint --wave` | dispatch line gains `lane`, `stages` |
| verdict | JSON | none | segment verdict | gains `lane: string`, `stages_run: string[]` |

## Task Breakdown

- [ ] Write `segment-stages.node.test.ts`: the Outline table, unknown and hostile lane names, frozen output, `laneOf` precedence, and a source scan proving neither script holds a stage-name literal.
- [ ] Create `segment_stages.mjs` with the definitions, the lane lists, `stagesFor`, `STAGE_NAMES` and `laneOf`.
- [ ] Extend `launchWave` and `validateVerdicts` in `launch_wave.mjs` (lanes, stages, `lane`/`stages_run`, the qa-less `qaSha` rule, header comment).
- [ ] Extend `dispatchSerial` and `runNext` in `dispatch_serial.mjs`.
- [ ] Add `lane` and `stages_run` to the seven fixture builders listed in §3.1 and add accept and reject cases to `dispatch-verdict-modes`.
- [ ] Add the two rows and the `qaSha` note to the protocol §23 table; run `npm run typecheck` and the scripts test suite.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers EPIC-066 Testing Strategy levels Unit and Contract; journeys "Ordinary story" and "Launch without authoring" (the table the runner reads).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 9 | `stagesFor` four lanes plus a hostile name (5); frozen and fresh output (1); `laneOf` precedence (1); verdict accept and reject (2). |
| Integration tests | 2 | `dispatch_serial.mjs next` over a real fixture sprint directory (state present, state missing); `launchWave` with a stub `parallel` and `segmentRunner`. No mocks of git or the filesystem. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] No stage-name literal in `launch_wave.mjs` or `dispatch_serial.mjs` (source-scan test passes).
- [ ] The seven existing fixtures pass with the two new fields and nothing else changed.
- [ ] Canonical edits only; the live `.cleargate/scripts` copy is re-synced at sprint close.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs:332` — `launchWave({..., segmentRunner})` takes the segment body as a parameter; nothing supplies the stage list. `launch_wave.mjs:169-249` is the verdict validator extended here.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs:128-148` — `storyBases` and `integrationReady`, the pattern the `lanes` argument follows.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs:255` — `dispatchSerial`; `dispatch_serial.mjs:427-461` — `runNext` prints the dispatch line.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md:882-894` — the verdict field table.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:112-132` — the TPV and Post-Flight modes the stage definitions name.
- **Surface:** `cleargate-cli/test/scripts/dispatch-verdict-modes.red.node.test.ts` — existing verdict accept and reject cases to extend.
- **Coverage of this requirement:** partial, about 20%. The launcher and serial driver, the verdict validator and the `segmentRunner` seam exist; the stage table, the lane argument and the two verdict fields do not, and the stage order today is prose in `SKILL.md` and `dispatch-serial.md`.

## Prior work

- [[EPIC-066]] — parent; shared contract names `stagesFor`, `STAGE_NAMES` and the verdict fields.
- [[EPIC-033]], [[CR-124]] (Completed) — wave launch, `waves.json` `schema_version: 2`, `storyBases` and `integrationReady`; kept.
- [[EPIC-055]] (Draft, paused) — scheduling above the launcher; not touched.
- [[STORY-022-04]] (Completed) — fast lane skips QA-Red and the QA spawn on a clean scan; the table expresses it.
- [[STORY-043-08]] (Completed) — Architect TPV and post-flight only on a flagged scan; the `scan-flagged` entries.
- [[CR-120]] (Completed) — dispatch descriptions `<stage> <ID>`; stage names here match that form.
- [[BUG-102]] (Triaged) — serial verdicts do not move `state.json`; touched by this change, not fixed.
- [[STORY-066-05]] — writes the lanes this table is read with.
- No prior work found for: a stage table as code, a `stages_run` verdict field.

## Why not simpler?

- **Smallest existing surface that could carry this:** the stage order already written in `SKILL.md` §C and `dispatch-serial.md`, read by each orchestrator.
- **Why isn't extension / parameterization / config sufficient?** Prose cannot be read by a script, which is why each sprint's orchestrator wrote its own runner and the plan in `waves.json` was not what ran (EPIC-066 §1, W009-1). A small data module is the least that lets the launcher, the serial dispatcher and the later runner agree, and it is where EPIC-065's `prove` stage is added without touching a caller. Config would still need code to read it, and there are only three lanes.

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

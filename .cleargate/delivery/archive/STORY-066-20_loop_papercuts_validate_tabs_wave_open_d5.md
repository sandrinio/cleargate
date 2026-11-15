---
story_id: STORY-066-20
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts,hooks
status: "Completed"
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T11:33:35Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox runs 1 and 2, findings S21, B4, B6, B7 (ORCHESTRATOR_FINDINGS.md; .cleargate/field-trials/2026-11-sandbox-s46.md); design source .cleargate/sprint-runs/SPRINT-46/plans/iteration-3-scoping.md §5, §8 (the scoping's STORY-066-22 and -23 built as one story); owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; OD-1..OD-12 ratified in sprint-context Mid-Sprint Amendments, 'Iteration 3')"
actor: Orchestrator running a wave and the consolidation from a Claude Code session
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T11:33:35Z
updated_at: 2026-11-15T11:33:35Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T11:33:36Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  sessions: []
---

# STORY-066-20: Loop papercuts: --validate takes the Workflow return, incident JSON stays valid with tabs, a marker file opens the flashcard-gate window, D.5 checks the qa-red commits' files
**Complexity:** L2 — four small fixes in four scripts and one playbook, each with a known cause; one shared file set only through the SKILL and its Codex render.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator running a wave and the consolidation from a Claude Code session, I want the barrier scripts and checks to accept what the loop produces, so that I do not extract JSON by hand, the incident log stays valid for Go output, the flashcard gate can be opened without setting an environment variable, and the red-file immutability check covers every language.

### 1.2 Detailed Requirements
- Requirement 1 (finding S21): `wave_runner_args.mjs --validate` accepts `{result:{verdicts, …}}` as well as the bare array and `{verdicts}`: `parsed?.verdicts ?? parsed?.result?.verdicts` at `:305-306`. The usage text at `:35` names the three shapes. The Workflow returns the runner's `{verdicts, waiting}` (`wave_runner.js:209`) wrapped as `{result: …}`.
- Requirement 2 (finding B4): `run_script.sh` `_json_str` (`:214-221`) escapes `\t`, `\f`, `\b` and ESC (as `\u001b`) as well as `\`, `"`, `\n`, `\r`, and deletes the remaining C0 controls (`tr -d '\000-\010\013\016-\037'` before escaping). The args (`:186-189`) and the two ID fields use `_json_str` too. Go output carries raw TAB (`FAIL\tpkg`, `--- FAIL:\t`), which made the incident file invalid JSON.
- Requirement 3 (finding B6): `pending-task-sentinel.sh` skips the flashcard gate when `${SPRINT_DIR}/.wave-open` exists, in addition to `SKIP_FLASHCARD_GATE=1` in its own process env (`:105`). SKILL §C.0.1 step 2 says `touch .cleargate/sprint-runs/<SPRINT-ID>/.wave-open` before the launch; step 4 says `rm -f` it as the first barrier step, before any merge. §C.0.1 keeps one mention of `SKIP_FLASHCARD_GATE` ("the hook treats the marker like `SKIP_FLASHCARD_GATE=1`"). The Codex render strips §C.0.1, so the Codex SKILL changes only by regeneration; the Codex hook copy is regenerated.
- Requirement 4 (finding B7): SKILL D.5.1: the forbidden set is the files of the sprint's `qa-red(` commits: `git log --format= --name-only --grep '^qa-red(' main..sprint/S-NN | sort -u > <sprintDir>/.red-files`, then `git show --name-only --format= <consolidation-sha> | grep -Fxf <sprintDir>/.red-files` must be empty. It replaces the grep for `\.red\.node\.test\.ts` at `:627`, which missed Go reds (`*_test.go`). The words the sealed D.5 regexes match (`red.*test.*immutab`, `verify.*commit.*red`) stay.

### 1.3 Out of Scope
- Tracked run files and the permanently dirty tree (BUG-074, BUG-086); incidents written inside story worktrees and expected reds recorded as incidents (BUG-109); `update_state.mjs` needing `CLEARGATE_STATE_FILE` (BUG-110). Later.
- The `sprint-context.md` Test Stack stub for non-Node repos (S22): intake.
- Live `.claude/` and `.cleargate/` copies: re-synced at SPRINT-46 Gate 4.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** How does an orchestrator in a Claude Code session open the flashcard-gate window, given the hook reads only its own process env?
- **Recommended:** A marker file in the sprint dir that the hook checks; the orchestrator creates and removes it with `touch` and `rm -f` (scoping §5, B6).
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation.
- **Question:** Does the sealed `loop-spec-three-paths.red` test pin the env-var wording?
- **Recommended:** Yes (`test/docs/loop-spec-three-paths.red.node.test.ts:203-210` pins `SKIP_FLASHCARD_GATE=1` then `unset SKIP_FLASHCARD_GATE` before `merge_story.mjs`). QA-Red re-scopes those assertions to the marker tokens in its own commit (rule 16); the Developer does not edit the sealed file.
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.

### 1.5 Risks

- **Risk:** a `.wave-open` marker left behind keeps the gate open for later dispatches.
- **Mitigation:** step 4 removes it as the first barrier step; the hook test checks the gate closes when the file is absent.
- **Risk:** the escape change alters the bytes of existing incident files.
- **Mitigation:** only characters that were invalid JSON change; the existing wrapper tests stay green.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | The marker opens the gate window; the old env var still works. |
| Interfaces | T | A script, a hook and a playbook each change; `--validate` takes three shapes. |
| Data | T | Tab and ESC in incident text; Go and TypeScript red-file names. |
| Rules | F | No new business rule; the gate and immutability rules already exist. |

```gherkin
Feature: Loop papercuts

  @interfaces
  Scenario: --validate takes the Workflow return
    Given a verdicts file that holds {"result":{"verdicts":[...],"waiting":[]}} for SPRINT-99
    When wave_runner_args.mjs --validate runs on it
    Then it exits 0 as it does for the bare array and for {"verdicts":[...]}
    And its usage text names all three shapes

  @data
  Scenario: Incident JSON stays valid with tabs and ESC
    Given a script run through run_script.sh whose output has "FAIL\tpkg", "--- FAIL:\tTestTop" and an ESC color code
    When the run is recorded as an incident
    Then the incident file parses as JSON
    And a stray control character such as \x01 is deleted, not written raw

  @paths
  Scenario: A .wave-open marker opens the flashcard-gate window
    Given STORY-910-01's dev report flags a card with no .processed marker, so the dispatch hook blocks the next spawn
    When .cleargate/sprint-runs/SPRINT-99/.wave-open exists
    Then the hook allows the spawn
    And after the file is removed the hook blocks again, and SKIP_FLASHCARD_GATE=1 still allows it
    And SKILL §C.0.1 step 2 says touch the marker, step 4 says rm -f it before any merge

  @data
  Scenario: D.5 checks the files of the qa-red commits
    Given sprint/S-99 has qa-red(STORY-910-02) touching internal/tally/top_test.go and a consolidation commit that edits that file
    When the SKILL D.5.1 commands run
    Then <sprintDir>/.red-files lists internal/tally/top_test.go and the grep of the consolidation commit's files against it is not empty
    And the same commands with a consolidation commit that touches no red file give an empty result
```

### 2.2 Verification Steps (Manual)
- [x] Goal check (d) run 3: `--validate` on the raw Workflow return passes; no hand `export SKIP_FLASHCARD_GATE`; D.5 on the Go repo lists the `_test.go` reds.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/run_script.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/test/scripts/wave-runner-args-validate-result.red.node.test.ts`, `cleargate-cli/test/scripts/run-script-tab-json.red.node.test.ts`, `cleargate-cli/test/hooks/pending-task-sentinel-wave-open.red.node.test.ts`, `cleargate-cli/test/scaffold/skill-md-d5-qa-red-files.red.node.test.ts`, `cleargate-cli/test/docs/loop-spec-three-paths.red.node.test.ts` |
| New Files Needed | Yes — four red test files; `loop-spec-three-paths.red.node.test.ts` is an existing sealed file QA-Red re-scopes |

### 3.2 Technical Logic
1. **`--validate` (`wave_runner_args.mjs:305-306`, `:35`).** `parsed?.verdicts ?? parsed?.result?.verdicts`; usage text lists the bare array, `{verdicts}` and `{result:{verdicts}}`.
2. **Incident JSON (`run_script.sh:214-221`, `:186-189`).** Extend `_json_str`; route the args and the two ID fields through it; `tr -d '\000-\010\013\016-\037'` before escaping.
3. **Hook (`pending-task-sentinel.sh:105`).** The condition `IS_AGENT_SPAWN == 1 && SKIP_FLASHCARD_GATE != 1 && SPRINT_ID != _off-sprint` also requires `! -e "${SPRINT_DIR}/.wave-open"` (`SPRINT_DIR` is set at `:81`). The Codex copy is the same file, regenerated by `gen:codex`.
4. **SKILL (§C.0.1 steps 2 and 4; D.5.1 near `:627`).** The marker text; the `qa-red(` commit-files check. The playbook at `:271` and `:273` told the orchestrator to set and unset an env var, which the hook never saw from a Claude Code session (it recurred in run 2).
5. **Sealed test re-scope (rule 16).** `loop-spec-three-paths.red.node.test.ts:203-210` pins `SKIP_FLASHCARD_GATE=1` then `unset SKIP_FLASHCARD_GATE` before `merge_story.mjs`; QA-Red re-scopes these §C.0.1 tokens to the marker (`touch …/.wave-open`, `rm -f …/.wave-open`) in its own commit. `wave-execution-barrier.red.node.test.ts:391` needs only the string `SKIP_FLASHCARD_GATE`, so §C.0.1 keeps one mention. `skill-md-consolidation-d5.red.node.test.ts:244-292` regexes are loose; keep those words.
6. **Base and merge.** Base cli `main` bf21e96. This story edits SKILL.md like STORY-066-16, -17 and -18; it merges last of the five and integrates `main` first (rule 15: owner region wins, `npm run gen:codex`, `npm run prebuild`).

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `wave_runner_args.mjs --validate <file>` | CLI | None | bare array, `{verdicts}` or `{result:{verdicts}}` | unchanged |
| `.cleargate/sprint-runs/<SPRINT-ID>/.wave-open` | marker file | None | any content; existence only | the dispatch hook skips the flashcard gate while it exists |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Unit (script and hook cases, SKILL text), Integration (the wrapper and the hook on real files), Release gate (Goal check (d) run 3).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | `--validate` three shapes; SKILL §C.0.1 marker text; SKILL D.5.1 command; Codex render parity. |
| Integration tests | 4 | `*.red.node.test.ts` on real files: tab and ESC incident parses; control char deleted; hook allows with the marker, blocks without; D.5 commands on a git fixture. |
| E2E / acceptance tests | 4 | One per Gherkin scenario. |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] `loop-spec-three-paths.red` re-scoped by QA-Red; `wave-execution-barrier.red`, `pending-task-sentinel-cards.red`, `wave-runner.red.integration`, `run-script-wrapper.red`, `run-script-utf8-truncation.red`, `cr080_wrapper.test.sh` and `skill-md-consolidation-d5.red` stay green; `build-codex-payload.mjs --check` passes.
- [x] Goal check (d) run 3 passes on an RC that includes this story.
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs:35`, `:305-306` — usage text and the verdicts extraction.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:209` — the Workflow's return value.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/run_script.sh:186-189`, `:214-221` — argument JSON and `_json_str`.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh:81`, `:105` — `SPRINT_DIR` and the gate condition.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:271-273`, `:627` — the env-var instructions (§C.0.1) and the D.5 grep.
- **Surface:** `cleargate-cli/test/docs/loop-spec-three-paths.red.node.test.ts:203-210`, `cleargate-cli/test/scripts/wave-execution-barrier.red.node.test.ts:391`, `cleargate-cli/test/hooks/pending-task-sentinel-cards.red.node.test.ts`, `cleargate-cli/test/scaffold/skill-md-consolidation-d5.red.node.test.ts:244-292`, `cleargate-cli/test/integration/wave-runner.red.integration.node.test.ts`, `cleargate-cli/test/scripts/run-script-wrapper.red.node.test.ts`, `cleargate-cli/test/scripts/run-script-utf8-truncation.red.node.test.ts`, `cleargate-cli/scaffold/core/.cleargate/scripts/test/cr080_wrapper.test.sh` — tests that pin today's wording and behaviour.
- **Coverage of this requirement:** partial. Each script and the hook exist; each fix is a line or a branch in them, plus two playbook edits.

## Prior work

- [[EPIC-066]] — parent; Goal check (d) is its release gate.
- [[STORY-066-11]] — the shipped wave runner whose return shape `--validate` must take.
- [[STORY-033-04]] — wave-runner arguments and validation; adjacent.
- [[BUG-034]] — flashcard gate and its skip variable; adjacent to the marker.
- [[CR-121]] — the run-script wrapper that writes the incident JSON.
- [[BUG-109]] — expected reds recorded as incidents; adjacent, not changed here.
- Sandbox findings S21 (runs 1 and 2), B4 and B7 (run 1), B6 (runs 1 and 2).
- cleargate-wiki-query 2026-11-15: no prior item adds a marker-file path to the flashcard gate.

## Why not simpler?

- **Smallest existing surface that could carry this:** a line in each of `wave_runner_args.mjs`, `run_script.sh`, the dispatch hook and the playbook.
- **Why isn't extension / parameterization / config sufficient?** An environment variable cannot be set in the hook's process from a Claude Code session, so the gate needs a file the orchestrator can create. The other three are defects in an extraction, an escape list and a grep pattern; no flag changes them.

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

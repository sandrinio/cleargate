---
story_id: STORY-066-18
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts,agents
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T11:32:06Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox run 1, finding A5 (ORCHESTRATOR_FINDINGS.md: an unrunnable test gate accepted silently; four merges and a sprint-to-main merge with no test run); design source .cleargate/sprint-runs/SPRINT-46/plans/iteration-3-scoping.md §4, §8 (the scoping's STORY-066-19 and -20 built as one story); owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; OD-1..OD-12 ratified in sprint-context Mid-Sprint Amendments, 'Iteration 3')"
actor: Orchestrator running preflight, merges and the sprint report on a repo whose configured test command cannot run
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T11:32:06Z
updated_at: 2026-11-15T11:32:06Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T11:32:06Z
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

# STORY-066-18: Preflight stops a sprint whose test gate cannot run unless a named waiver is recorded; merges and the report name the waiver
**Complexity:** L3 — a preflight probe with a cache shared by the kickoff baseline, a merge judgement change, a report line and the text that describes them, across two script surfaces and one agent prompt.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator running a sprint, I want preflight to stop when the configured test command cannot run any test, unless the repo records a named waiver, and I want merges and the sprint report to name that waiver, so that no merge is excused as "tested" when the gate never ran a test, and the human sees why.

### 1.2 Detailed Requirements
- Requirement 1 (finding A5, the waiver): the waiver is `qa.test_waiver` in `.cleargate/scripts/gate-checks.json`: a string, non-empty after trim = a waiver (pinned interface P8). It sits beside the command it waives, is set once and tracked, and `cleargate upgrade` / `init --force` never overwrite `gate-checks.json`. Preflight, merges and the Reporter all read it live; `baseline.json` gains no key for it.
- Requirement 2 (the probe): `record_baseline.mjs --probe` runs the command `qa.baseline_command` else `qa.test` (same pick, same 20-minute timeout, same `extractFailing` as the baseline) and prints one JSON line `{ command, exit_code, failing: number, ran: boolean, last_line, cached: boolean }` or `{ skipped: "<reason>" }` (P11). `ran` is true on exit 0, or on exit other than 0 with at least one failing test named. It is false on exit other than 0 with no test named, on timeout (124) and on not found (127). The probe writes `<git-common-dir>/cleargate/test-probe.json` = `{ head_sha, command, exit_code, failing, tail, recorded_at }` (inside `.git`, so it never dirties the tree and is shared by all worktrees).
- Requirement 3 (preflight check): `cleargate sprint preflight` gains a "Test gate" check, run only after checks 1–5 pass (a slow test never runs to report a dirty `main`). It calls the probe; a re-run on the same HEAD and command reuses the cache (`"cached": true`). Output: ran → `test gate: "<cmd>" ran (exit 0)` or `test gate: "<cmd>" ran (exit 1, 3 failing tests named; they become the sprint baseline)`, pass. Not ran with a waiver → `test gate: WAIVED — "<cmd>" stopped before running any test (exit 2: "<last line>"); waiver: "<reason>"`, pass. Not ran with no waiver → punch-list line `✗ Test gate: "<cmd>" stopped before running any test (exit 2: "<last line>")` and the hint `Make it run here, or record why it cannot: add "test_waiver": "<reason>" under "qa" in .cleargate/scripts/gate-checks.json and commit it.`, exit 1 (`CLEARGATE_ADVISORY=1` softens as today). The line prints before the summary line, so `all five checks pass` and the last line `→ Load skill: sprint-execution` stay. `CLEARGATE_NO_BASELINE=1` skips the probe with `test gate: skipped (CLEARGATE_NO_BASELINE=1) — not a waiver`.
- Requirement 4 (kickoff reuse): `record_baseline.mjs <sprint-id>` reuses the probe cache when HEAD and command match and writes `baseline.json` with the additive key `source: "preflight"`. The suite then runs once per kickoff.
- Requirement 5 (merges): in `merge_story.mjs`, at both call sites, `judgeTestFailure` is unchanged (so the sealed A1–A6 stay green); a `baseline-unnamed` verdict is excused only when `qa.test_waiver` is set: `NOT TESTED (pre-merge): "<cmd>" stopped before running any test (exit 2; exit code and last line match baseline.json); excused under waiver "<reason>"` (same prefix the sealed I3 regex reads; post-merge uses its own prefix as today). With no waiver it is refused, tail `not excused: "<cmd>" stopped before running any test and no qa.test_waiver is recorded in gate-checks.json` (pre-merge exit 3, post-merge exit 5). STORY-066-08 amendment A stays: the dispenser DB guard is still excusable, now only under a named waiver.
- Requirement 6 (Reporter): `prep_reporter_context.mjs` adds `## Test Gate` after `## State.json Summary`, one line from `baseline.json` and the live waiver: passed / ran with N named failures / `WAIVED — "<cmd>" stopped before running any test at kickoff (exit N: "<last line>"). Waiver: "<reason>". Merges whose test stopped the same way were recorded NOT TESTED.` / no baseline. `reporter.md` copies that line into §3 as a "Test gate" row, and when it says WAIVED the Brief's second line names the waiver. The report template is unchanged. The Codex `reporter.toml` is regenerated.
- Requirement 7 (docs): SKILL A.1 gains check 7 "Test gate" (code-enforced; `devops` stays check 6). The A.5 paragraph keeps its pinned phrases (`baseline.json`, `not a blocker`, `never propose changing the configured test command`) and adds that preflight already required the test to run or a named waiver, which Gate 2 quotes. `cleargate-enforcement.md` §13 documents the check and the key. The Codex SKILL is regenerated.

### 1.3 Out of Scope
- `judgeTestFailure` itself and the sealed `merge-story-amend-a.red.node.test.ts` A1–A6: unchanged.
- A parser for runners whose failures `extractFailing` cannot name (pytest, jest summaries): such a runner reads as "not ran" and needs a waiver; the waiver text says why. Later.
- A per-sprint waiver in the sprint plan: the bar says once, so the key lives in `gate-checks.json`.
- Live `.claude/` and `.cleargate/` copies: re-synced at SPRINT-46 Gate 4. The delete of the sandbox's hand-made `node_modules/cleargate` link belongs to BUG-114.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Where does the waiver live?
- **Recommended:** `gate-checks.json` `qa.test_waiver` (scoping OD-6): set once, survives upgrade, one source for preflight, merges and the Reporter.
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation.
- **Question:** Does preflight run the configured test, and for how long?
- **Recommended:** Yes, up to 20 minutes, cached in the git common dir and reused by the kickoff baseline (OD-7). The meta-repo's own SPRINT-47 preflight will run the cli unit suite once.
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.
- **Question:** A merge whose test stopped before any test and no waiver: refuse or excuse?
- **Recommended:** Refuse (OD-8). Preflight makes this reachable only when the environment changes mid-sprint or `CLEARGATE_ADVISORY=1` was used.
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.
- **Question:** How does sandbox run 3 get past its own preflight?
- **Recommended:** The fixture commits `qa.test_waiver` during setup (OD-9); the no-waiver stop is proven in a scratch repo, not in run 3.
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.

### 1.5 Risks

- **Risk:** a runner whose failures `extractFailing` cannot name reads as "not ran".
- **Mitigation:** the punch-list line and the hint name the fix (a waiver with a reason); the probe claims only "no failing test could be named".
- **Risk:** a test command that writes tracked files dirties the tree before the next preflight's check 4.
- **Mitigation:** the same exposure as today's kickoff baseline; unchanged.
- **Risk:** a fast item refused for a missing waiver is demoted (`merge_story.mjs:418-425`) as for any refusal.
- **Mitigation:** expected; the refusal tail names the key.
- **Risk:** releasing the merge refusal without the preflight check makes a waiver-less run stop at the first merge instead of preflight.
- **Mitigation:** one story carries both halves.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Tests ran; waived; and the kickoff reuse of the probe are different ways through. |
| Interfaces | T | Preflight, the merge script and the Reporter bundle each expose the waiver. |
| Data | T | Waiver set or unset, and tests ran or stopped, change the outcome (Scenario Outlines). |
| Rules | T | No waiver and no test run stops preflight and refuses the merge. |

```gherkin
Feature: A test gate that cannot run stops the sprint unless a named waiver is recorded

  @rules
  Scenario: Preflight stops when the configured test stops before any test and there is no waiver
    Given a fixture repo whose qa.test is "make check", which exits 2 before running any test
    And gate-checks.json has no qa.test_waiver
    When cleargate sprint preflight SPRINT-99 runs
    Then it exits 1 before running any further test
    And the output names qa.test_waiver and the one-line fix "add "test_waiver": "<reason>" under "qa" in .cleargate/scripts/gate-checks.json and commit it."

  @data
  Scenario Outline: Preflight prints the test gate line
    Given qa.test is "<command>" which "<behaviour>" and qa.test_waiver is "<waiver>"
    When cleargate sprint preflight SPRINT-99 runs
    Then the test gate line starts with "<line>"
    And preflight passes

    Examples:
      | command    | behaviour                                | waiver                          | line                    |
      | make check | exits 2 before running any test          | no PostgreSQL on this machine   | test gate: WAIVED       |
      | npm test   | exits 1 with 3 failing tests named       |                                 | test gate: "npm test" ran |

  @paths
  Scenario: The kickoff baseline reuses the preflight probe for the same HEAD and command
    Given preflight has probed "npm test" at HEAD abc1234 and written the probe cache in the git common dir
    When record_baseline.mjs SPRINT-99 runs at the same HEAD with the same command
    Then the command is not run again
    And baseline.json carries source "preflight"

  @interfaces
  Scenario Outline: A merge whose test stops before any test needs the waiver
    Given baseline.json records "make check" stopping before any test (exit 2) and story STORY-908-01's merge test stops the same way
    And qa.test_waiver is "<waiver>"
    When merge_story.mjs STORY-908-01 --sprint SPRINT-99 runs
    Then it exits <exit> with a tail containing "<tail>"

    Examples:
      | waiver                        | exit | tail                                                                      |
      | no PostgreSQL on this machine | 0    | excused under waiver "no PostgreSQL on this machine"                      |
      |                               | 3    | not excused: "make check" stopped before running any test and no qa.test_waiver is recorded in gate-checks.json |

  @interfaces
  Scenario: The Reporter bundle names the waiver and the report has the row
    Given baseline.json records "make check" stopping before any test and qa.test_waiver is "no PostgreSQL on this machine"
    When prep_reporter_context.mjs SPRINT-99 builds the bundle
    Then the bundle has a "## Test Gate" section after "## State.json Summary" with a line starting "WAIVED" that names the waiver
    And reporter.md tells the Reporter to copy it into §3 as a "Test gate" row and into the Brief's second line
```

### 2.2 Verification Steps (Manual)
- [x] Goal check (d) run 3: the preflight prints the WAIVED line from the fixture waiver, the merges' tails name it, and the report has the row. The no-waiver stop is proven in a scratch copy, not in run 3.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/record_baseline.mjs` |
| Related Files | `cleargate-cli/src/commands/sprint.ts`, `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/reporter.toml`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`, `cleargate-cli/test/scripts/merge-story-amend-a.red.integration.node.test.ts`, `cleargate-cli/test/scripts/record-baseline-probe.red.integration.node.test.ts`, `cleargate-cli/test/commands/sprint-preflight-test-gate.red.node.test.ts`, `cleargate-cli/test/scripts/merge-story-test-waiver.red.integration.node.test.ts`, `cleargate-cli/test/scripts/prep-reporter-test-gate.red.node.test.ts`, `cleargate-cli/src/init/detect-test-stack.ts`, `cleargate-cli/src/commands/upgrade.ts`, `cleargate-cli/test/commands/upgrade-keeps-test-waiver.red.node.test.ts`, `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh`, `cleargate-cli/test/scripts/test-command-env.red.integration.node.test.ts`, `cleargate-cli/test/scripts/record-baseline-cache-guard.red.integration.node.test.ts`, `cleargate-cli/test/docs/test-gate-amend-b.red.node.test.ts` |
| New Files Needed | Yes — four red test files; `merge-story-amend-a.red.integration.node.test.ts` is an existing sealed file QA-Red re-scopes |

### 3.2 Technical Logic
1. **Today.** `record_baseline.mjs:98-146` records a command that stops before any test (exit 2, `failing: []`) as an ordinary baseline. `merge_story.mjs:122-133` `judgeTestFailure` returns `baseline-unnamed` and the two call sites (`:405-414` pre-merge, `:470-475` post-merge) excuse it as `NOT TESTED … excused as baseline-unnamed` whatever the repo says. Preflight (`sprint.ts:1983-2037`) has five checks and never runs a test; the kickoff baseline (`sprint.ts:111-131`) is best-effort and can never change init's exit. Net: four merges and a sprint→main merge with the configured gate never running a test (run 1 A5).
2. **Probe (`record_baseline.mjs`).** Add `--probe` (same command pick, timeout and `extractFailing`); write and read the cache at `<git-common-dir>/cleargate/test-probe.json`; reuse it for the kickoff baseline when `head_sha` and `command` match (the sprint branch is cut from that same `main` commit at A.2).
3. **Preflight (`sprint.ts:1983-2037`).** Add the Test gate check after checks 1–5 pass; the summary line and `Load skill` last line stay (`test/commands/sprint-preflight.node.test.ts:291-300,474`; `2/5 checks failed` at `:405` keeps its count).
4. **Merges (`merge_story.mjs:405-414`, `:470-475`).** Read `qa.test_waiver` from `gate-checks.json`; excuse `baseline-unnamed` only with it; otherwise return the refusal tail (exit 3 pre-merge, 5 post-merge).
5. **Reporter (`prep_reporter_context.mjs`, `reporter.md`).** Add the `## Test Gate` section after `## State.json Summary`; one line from `baseline.json` and the waiver.
6. **Docs.** SKILL A.1 check 7 and A.5; enforcement §13. `npm run gen:codex`, `npm run prebuild`.
7. **Re-scope of a sealed fixture (rule 16).** `merge-story-amend-a.red.integration.node.test.ts` I3 A9 (`:179-230`) has a fixture with no waiver, so A9 must gain `test_waiver` in the fixture's `gate-checks.json` (`buildFixture`, `:67`) and a no-waiver refusal case. QA-Red does this in its own commit; the Developer does not edit the sealed file. `merge-story-amend-a.red.node.test.ts` A1–A6 stay unchanged.
8. **Merge and base.** Base cli `main` bf21e96. SKILL.md and enforcement.md editors integrate `main` first: this story integrates after STORY-066-17 (rule 15: owner region wins, regenerate the Codex SKILL).

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `record_baseline.mjs --probe` (stdout) | CLI | None | no arguments beyond `--probe` | one JSON line `{ command, exit_code, failing, ran, last_line, cached }` or `{ skipped }` (P11) |
| `gate-checks.json` `qa.test_waiver` | config key | None | string; non-empty after trim = waiver (P8) | read live by preflight, `merge_story.mjs`, `prep_reporter_context.mjs` |

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-46/plans/STORY-066-18.md` (D-1..D-16, OD-1 ratified 2026-11-15; the plan governs).

- [x] QA-Red commit 1: five new red files, 10 tests (P1–P2, T1–T3, W1–W2, R1–R2, U1); seal 1 -> Scenarios 1-5
- [x] QA-Red commit 2: rule-16 re-scope of sealed `merge-story-amend-a.red.integration` I3 (fixture records `qa.test_waiver`); seal 2 -> Scenario 4
- [x] `record_baseline.mjs`: `--probe` (P11 line), cache in the git common dir (toplevel guard, D-3 reuse), kickoff reuse with `source: "preflight"`, exports `testsRan`/`lastLine`, `NODE_TEST_CONTEXT` stripped -> Requirements 2, 4; Scenario 3
- [x] `sprint.ts`: test gate after checks 1–5 (probing line, ran/WAIVED/stop outputs, two-line hint, skip and skew lines, `CLEARGATE_NO_BASELINE`) -> Requirement 3; Scenarios 1, 2
- [x] `merge_story.mjs`: `baseline-unnamed` excused only under `qa.test_waiver` at both call sites; `not excused` refusal tail -> Requirement 5; Scenario 4
- [x] `prep_reporter_context.mjs` `## Test Gate` (five line forms); `reporter.md` step 6 row and Brief line -> Requirement 6; Scenario 5
- [x] SKILL §A.1 check 7 and its resolution bullet, §A.5, §C.7 rows 3 and 5; enforcement §13 -> Requirement 7
- [x] `detect-test-stack.ts` + `upgrade.ts`: upgrade keeps `qa.test_waiver` (after OD-1) -> Requirement 1
- [x] `npm run gen:codex`; `npm run prebuild` -> Requirements 6, 7
- [x] `npm run typecheck`, the new reds, the regression list -> all
- [x] After 066-17 merges: integrate `main`, regenerate the Codex SKILL (never hand-merge), re-run, QA-Verify on the integrated tree, scratch-repo proof into `evidence/STORY-066-18/` -> all
- [x] **[Amendment B]** QA-Red commit 3 (1d64e2d, by hand under waiver; scan clean): three new red files, 6 tests (E1–E3, G1, D1–D2); seal 3 -> Amendment B (F1, F2, F3, F5, F6)
- [x] **[Amendment B]** `record_baseline.mjs`: `COMMAND_ENV_DROP` + `commandEnv()` used by `runCommand` (probe and kickoff); cache-path guard -> Amendment B B-1, B-2
- [x] **[Amendment B]** `merge_story.mjs` `shell()` uses `commandEnv()`; the `pre_gate_runner.sh` test step unsets the same three variables -> Amendment B B-1
- [x] **[Amendment B]** SKILL §C.7 rows 3/5 "a tail line starts `not excused:`"; §A.1 background sentence; `npm run gen:codex`; `npm run prebuild` -> Amendment B B-3, B-4
- [x] **[Amendment B]** `npm run typecheck`, the seal-3 reds, the plan's commands 2–4 -> Amendment B

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Integration (probe, preflight and merge on real git fixtures that are their own repos), Unit (reporter bundle, text checks), Release gate (Goal check (d) run 3 plus a scratch no-waiver preflight).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | `prep_reporter_context.mjs` Test Gate line for each case; SKILL A.1/A.5 text and `reporter.md` row. |
| Integration tests | 6 | `*.red.integration.node.test.ts`: no-waiver preflight stop; the two preflight outputs; the probe reuse (command runs once); merge excused under waiver and refused without. |
| E2E / acceptance tests | 5 | One per Gherkin scenario. |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] I3 A9 re-scoped by QA-Red; `merge-story-amend-a.red.node` A1–A6, `record-baseline.red`, `sprint-kickoff-baseline.red.integration`, `sprint-preflight`, `prep-reporter-measured-metrics.red`, `prep-reporter-lanes.red` and `reporter-measured-metrics.red` stay green (fixtures are their own git repos, so no stale probe cache leaks in).
- [x] `build-codex-payload.mjs --check` passes; new live-parity reds logged in sprint §6 (rule 18).
- [x] Goal check (d) run 3 passes on an RC that includes this story.
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/record_baseline.mjs:98-146` — records the baseline; a stop before any test is stored as a normal baseline.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs:122-133`, `:405-414`, `:470-475` — `judgeTestFailure` and the two `baseline-unnamed` call sites; `:418-425` the fast-item demotion on refusal.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:1983-2037` — preflight's five checks; `:111-131` the best-effort kickoff baseline.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs` — the Reporter bundle (`## State.json Summary` and neighbours).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/reporter.toml` — the Reporter prompt and its Codex render.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json` — the `qa` block that holds `test` and `baseline_command`; `FIRST_INSTALL_ONLY`.
- **Surface:** `cleargate-cli/test/scripts/merge-story-amend-a.red.integration.node.test.ts:67,179-230`, `cleargate-cli/test/scripts/merge-story-amend-a.red.node.test.ts`, `cleargate-cli/test/scripts/record-baseline.red.node.test.ts`, `cleargate-cli/test/sprint-kickoff-baseline.red.integration.node.test.ts`, `cleargate-cli/test/commands/sprint-preflight.node.test.ts`, `cleargate-cli/test/scripts/prep-reporter-measured-metrics.red.node.test.ts`, `cleargate-cli/test/scripts/prep-reporter-lanes.red.node.test.ts`, `cleargate-cli/test/scripts/wave-runner-sandbox-fixes.red.node.test.ts:181` — tests that pin today's behaviour (U6 pins the A.5 phrases).
- **Coverage of this requirement:** partial. The baseline, the merge judgement and the preflight exist; none reads a waiver or runs a test before the sprint starts.

## Prior work

- [[EPIC-066]] — parent; Goal check (d) is its release gate.
- [[STORY-066-08]] — `merge_story.mjs`; amendment A (the dispenser DB guard excused as baseline-unnamed) is the behaviour this story puts behind a named waiver.
- [[BUG-066]], [[BUG-087]] — earlier baseline and test-gate fixes; adjacent.
- [[EPIC-065]] — the baseline and test-gate model the waiver extends.
- Sandbox finding A5 (run 1): four merges and the sprint merge with no test run.
- cleargate-wiki-query 2026-11-15: no prior item records a named waiver or makes preflight run the test.

## Why not simpler?

- **Smallest existing surface that could carry this:** `record_baseline.mjs` (one new mode), the two merge call sites, and the Reporter bundle; one config key.
- **Why isn't extension / parameterization / config sufficient?** Today no layer asks whether any test ran; the gate accepts "stopped before any test" as a baseline. A config key alone cannot make preflight or the merge refuse it. Each of the three readers has to check the key, and the probe is what lets preflight know a test cannot run.

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

---
story_id: STORY-066-08
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T09:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-066 (approved 2026-11-14; §2 merge_story.mjs bullet, §6 owner answers on merge by script and fast-lane demotion); BUG-086, BUG-107 and BUG-116 read in full; devops.md nine steps and SKILL.md §C.7 read at canonical main
actor: Orchestrator running the sprint barrier
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: sprint-execution,scripts,agent-prompts
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:48.414Z
updated_at: 2026-11-14T19:47:48.414Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-14T19:53:46Z
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
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-11-14T22:40:30Z
  sessions:
    - session: 5ceeac69-149c-4c13-bbec-09ab2d997749
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-14T19:55:53Z
---

# STORY-066-08: Merge by Script
**Complexity:** L3 — one new script with five exit paths, a git-state-sensitive integration test matrix, and a narrowed DevOps prompt in two hosts.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator running a sprint barrier, I want one script that checks, merges, tests and tears down a story, so that no DevOps agent is dispatched for a clean merge and a fast-lane item is gated by a command I can trust rather than by the Developer's own report.

### 1.2 Detailed Requirements
- Requirement 1: `node .cleargate/scripts/merge_story.mjs <ID> --sprint <SPRINT-NN> [--worktree <path>]` performs the nine steps of `devops.md` as fixed commands, in this order: pre-merge check, checkout `sprint/S-NN`, no-ff merge of `story/<ID>`, prebuild when configured, post-merge test, worktree remove, branch delete, state transition to `Done`. The worktree defaults to `.worktrees/<ID>`. The sprint directory is `.cleargate/sprint-runs/<SPRINT-NN>/`.
- Requirement 2: Pre-merge check. Run `CLEARGATE_SCAN_NO_LANE_ROUTING=1 pre_gate_runner.sh qa <worktree> story/<ID>` (the configured `gate-checks.json` checks; the switch is STORY-066-03 Requirement 9, so the scan writes no state and no LD line and this script is the only writer of demotion and state), then judge a failing `test` check against `<sprintDir>/baseline.json` ([[STORY-066-04]]): a failing test identifier that is listed in `baseline.failing` is not counted; any other failure refuses the merge. If `baseline.json` is absent, every failure counts. The scan's N/A and INFO lines ([[STORY-066-03]]) never refuse a merge; a `[FAIL]` line does.
- Requirement 3: Exit codes and output. 0 merged. 2 usage or precondition. 3 pre-merge check failed. 4 merge conflict. 5 post-merge test failed. stdout is one JSON object `{ id, step, exit, tail, conflict_files? }`: `step` names the step that ended the run (`pre-merge`, `merge`, `post-merge-test`, `teardown`, `state`, `done`), `tail` is the last 40 lines of the output that explains the exit. On exit 4 the script runs `git merge --abort` so the sprint branch is left clean, and `conflict_files` lists the conflicting paths.
- Requirement 4: Fast-lane demotion. On exit 3 for an item whose `state.json` lane is `fast`, the script runs the existing `update_state.mjs <ID> --lane-demote "<reason>"` (reason names the failing check). The rule is STORY-022-04's, moved here; `--lane-demote` already resets both bounce counters. Exit 3 on a `standard` or `runtime` item changes no state.
- Requirement 5: Orchestrator dirt does not block the merge ([[BUG-086]]). Before the merge, the script classifies each dirty path in the main checkout. Derived, hook-written paths are tolerated: `.cleargate/wiki/**`, `.cleargate/hook-log/**`, and under `.cleargate/sprint-runs/**` the files `token-ledger.jsonl`, `subagent-ledger.jsonl`, `state.json`, `events.jsonl`, `metrics.json`, `pre-gate.jsonl`, `.session-totals.json`. **The script never runs `git stash`** (Gate 2 spec clarification (SPRINT-46 SDR, owner approved 2026-11-15), decision 4; flashcard 2026-09-26 `#worktree #git #danger`: the stash stack is shared by every worktree). Instead it copies each tolerated dirty path into a fresh temp directory, then returns the tracked ones to `HEAD` (`git checkout -- <paths>`) and moves the untracked ones into the temp directory. After the merge, in a `finally` that runs on every exit after this point, it writes every saved file back, except a `.cleargate/wiki/**` path the merge itself changed, where the merged side wins (the wiki is a derived cache). On a crash path the temp directory is named in the JSON `tail`. Any other dirty tracked path (for example an authored `pending-sync/*.md`) is authored content: the script exits 2 and lists the paths, never touching them.
- Requirement 6: Worktree teardown tolerates ClearGate residue ([[BUG-107]]). `git worktree remove` runs without `--force` first. If it refuses, the script reads `git -C <worktree> status --porcelain`; when every entry is ClearGate residue (`.cleargate/reports/**`, `.cleargate/sprint-runs/**/.script-incidents/**`, a modified file under `.cleargate/delivery/**`) it copies any `.script-incidents/*.json` into the main checkout's sprint directory and retries with `--force`. Any other entry (real uncommitted work) exits 2 and names it. This story does not change where those files are written.
- Requirement 7: No report requirement ([[BUG-116]]). The script reads no `*-dev.md`, `*-qa.md` or `*-arch.md`. Whether the reports exist is the orchestrator's check before it calls the script. The script's only precondition on the story is that `story/<ID>` exists and is ahead of `sprint/S-NN`.
- Requirement 8: Prebuild and post-merge test come from config, not from a stack guess. `gate-checks.json` gains two optional keys, `merge.prebuild` and `merge.post_test`. A non-empty `merge.prebuild` runs after the merge. The post-merge test runs `merge.post_test` when set, else `qa.test`; when both are empty the step records `skipped` in the JSON and the merge still lands. A failing post-merge test exits 5 and leaves the merge in place (DevOps decides whether to revert).
- Requirement 9: `devops.md` and `devops.toml` are rewritten for the narrowed role: the agent is dispatched only on exit 4 (resolve nothing; diagnose and report the conflict files, as today) or exit 5 (diagnose the post-merge failure). Its inventory and Step 1 stop requiring `STORY-NNN-NN-arch.md` for every standard-lane story: the report is required only when the pre-gate scan flagged ([[BUG-116]], matching SKILL.md:508). Steps 2 to 9 are replaced by "the script already ran these; read its JSON".
- Requirement 10 (mid-sprint amendment, owner approved 2026-11-15: "Amend 08 before merge"): the pre-merge check judges only what the item changed. A debug-pattern or TODO hit in a file the item did not change (relative to `sprint/S-NN`) never refuses a merge. Cause: with nothing staged, `pre_gate_runner.sh qa` greps the whole worktree, including ClearGate's own installed `.cleargate/scripts/*.mjs`, so every merge in a repo with ClearGate installed is refused (evidence: `sprint-runs/SPRINT-46/evidence/STORY-066-03/dispenser-qa-asconfigured-make-check.txt`). A hit in a file the item changed still refuses, as Requirement 2 says.
- Requirement 11 (same amendment): a test failure with no test names that matches the baseline is baseline. When `baseline.json` has `failing: []` and a non-zero `exit_code`, a run that fails with the same exit code and the same last non-empty output line is excused, both pre-merge and post-merge, with its own `reason`. The JSON `tail` says the configured test stopped before running any test, so nobody reads the merge as tested. A run that fails differently still refuses. Cause: dispenser's `make check` exits 2 at a database guard with no test names (QA-Verify 08, UNNAMED_BASELINE_FAILURE). Exit 3 returns the item to a Developer who cannot fix a missing database, so the item bounces until it escalates.

### 1.3 Out of Scope
- `SKILL.md` §C.7 and both `dispatch-serial.md` files (STORY-066-12 owns them; until it lands the skill still tells the orchestrator to dispatch DevOps, and this story must not edit it).
- The mirror parity audit (devops.md step 5). It reads the frozen `cleargate-planning/` snapshot; `cleargate doctor` already reports scaffold drift (BUG-085). The script drops the step.
- Moving where ClearGate writes residue (the `run_script.sh` root and the stamp hook, BUG-107 options a and c) and the `surface-whitelist.txt` row for the wiki (BUG-086's other half); this story makes the merge tolerate them.
- [[BUG-074]] (state transitions dirtying the tree) and [[BUG-075]] (unenforced transitions): the script calls `update_state.mjs` as DevOps did and adds no transition rules.
- Scheduling merges. They stay serial at the barrier ([[EPIC-055]], [[CR-124]]); the script merges one item per call.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** How does the script tell a baseline failure from a new one? `pre_gate_runner.sh` reports only the test command's exit code and last 40 lines, while `baseline.json` lists test identifiers.
- **Recommended:** Import the failing-identifier parser that STORY-066-04 writes for the kickoff baseline (same command, same parser, so both sides are comparable) and run it over the failing output. A failure is excused only when every parsed identifier is in `baseline.failing`; output the parser recognises no identifier in counts as a new failure. STORY-066-04's draft must export that parser from a shared module; if it does not, the Architect adds it there before this story starts.
- **Human decision:** Resolved in drafting per the recommendation; confirmed by the owner with the SPRINT-46 Brief, 2026-11-15. STORY-066-04 exports the parser as `extractFailing` from `scaffold/core/.cleargate/scripts/record_baseline.mjs`.

- **Question:** The brief says the script handles "the cases that block DevOps today" but is silent on the story-file dirt BUG-086's own open question raised.
- **Recommended:** Treat an authored dirty file as a hard stop (exit 2), per that bug's recommendation: authored content is committed by its author, never stashed.
- **Human decision:** Resolved in drafting per the recommendation (BUG-086's own recommended answer); confirmed by the owner with the SPRINT-46 Brief, 2026-11-15.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** Setting the orchestrator's derived files aside around the merge loses or scrambles them, or a crash before the write-back leaves them only in the temp directory.
- **Mitigation:** Set aside only the allowlisted derived paths; write back in a `finally`; on a crash path print the temp directory in the JSON `tail`. Integration test asserts the write-back on success and conflict paths, and that `git stash list` is unchanged after every run.
- **Risk:** `--force` removal hides real work.
- **Mitigation:** `--force` only after every porcelain entry matches the residue allowlist; the integration test plants a real uncommitted source file and expects exit 2 with the worktree intact.
- **Risk:** The fast lane is unsafe until [[STORY-066-03]] lands: the scan skips every command in a Go repo and always fails the typecheck in a worktree.
- **Mitigation:** `parallel_eligible: "n"`; the story is sequenced after 066-03 and 066-04, and its Go-fixture integration test fails if the scan skips the configured command.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Clean merge, conflict and post-merge failure are three ends of one run. |
| Interfaces | F | One CLI surface; the DevOps prompt change is a consumer, not a second interface. |
| Data | T | A failing identifier on the baseline list is treated differently from a new one. |
| Rules | T | A failing check refuses the merge and demotes a fast item; authored dirt blocks it. |

```gherkin
Feature: Merge by script

  @paths
  Scenario: A clean story merges with no agent and tolerates orchestrator dirt
    Given story/STORY-X is ahead of sprint/S-46 and its checks pass
    And the main checkout has uncommitted changes under .cleargate/wiki and in token-ledger.jsonl
    And .worktrees/STORY-X holds only .cleargate/reports/ output
    And no STORY-X-arch.md exists
    When merge_story.mjs STORY-X --sprint SPRINT-46 runs
    Then it exits 0 with step "done"
    And story/STORY-X is merged with one no-ff commit, the worktree and branch are gone, and state.json shows STORY-X "Done"
    And the orchestrator's wiki and ledger changes are still in the working tree

  @rules
  Scenario: A fast-lane item whose check fails is refused and demoted
    Given BUG-B is on the fast lane and its configured test command fails
    When merge_story.mjs BUG-B --sprint SPRINT-46 runs
    Then it exits 3 with step "pre-merge" and the last 40 lines of the failing output in tail
    And sprint/S-46 is unchanged
    And BUG-B's lane is "standard" with a recorded demotion reason, and its bounce counters are 0

  @paths
  Scenario: A merge conflict stops the script and hands the files to DevOps
    Given story/STORY-C and sprint/S-46 change the same lines of one file
    When merge_story.mjs STORY-C --sprint SPRINT-46 runs
    Then it exits 4 with conflict_files naming that file
    And the merge is aborted, the sprint branch is clean, and the worktree and branch still exist

  @paths
  Scenario: A post-merge test failure exits 5 and leaves the merge in place
    Given STORY-D merges cleanly but the post-merge test command fails
    When merge_story.mjs STORY-D --sprint SPRINT-46 runs
    Then it exits 5 with step "post-merge-test" and the failing output in tail
    And the worktree is not removed and the state is not advanced

  @data @rules
  Scenario: A failure that is already on the sprint base does not refuse the merge
    Given baseline.json lists "internal/seccheck TestA" as failing
    And STORY-E's branch fails only "internal/seccheck TestA" and passes everything else
    When merge_story.mjs STORY-E --sprint SPRINT-46 runs
    Then the pre-merge check passes and the story merges
    And when STORY-E also fails "pkg/new TestB" it exits 3 instead
```

### 2.2 Verification Steps (Manual)
- [ ] In a scratch repo with no `package.json` and `qa.test` set to `make check`, run the script for a clean story and read the JSON.
- [ ] Edit a wiki file in the main checkout, run the script, and confirm `git status` still shows that edit afterwards.
- [ ] Put a real uncommitted `.go` file in the worktree and confirm exit 2 with the worktree left in place.
- [ ] Read the rewritten `devops.md` and `devops.toml` and confirm neither requires an arch report for a clean scan.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs` |
| Related Files | `cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/devops.toml`, `cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json` |
| Tests | `cleargate-cli/test/scripts/merge-story.node.test.ts`, `cleargate-cli/test/scripts/merge-story.integration.node.test.ts` |
| New Files Needed | Yes — `merge_story.mjs` and the two test files |

### 3.2 Technical Logic
Node ES module, no dependencies, `child_process.spawnSync` for git and the scan. Resolve the project root from `git rev-parse --show-toplevel` of the main checkout (honour `ORCHESTRATOR_PROJECT_DIR`), the sprint dir from `--sprint`, and the state file as `<sprintDir>/state.json` (export `CLEARGATE_STATE_FILE` for the `update_state.mjs` calls, as `devops.md:134` does).

Flow:
1. Precondition: `story/<ID>` and `sprint/S-NN` exist, the story is ahead, the main checkout is on a clean-or-allowlisted tree. Otherwise exit 2.
2. Pre-merge: `CLEARGATE_SCAN_NO_LANE_ROUTING=1 pre_gate_runner.sh qa <worktree> story/<ID>`; exit 1 means read `pre-qa-scan.txt` from the worktree's reports directory, take its `[FAIL]` lines, judge the test failure against `baseline.json`, exit 3 if any failure remains (calling `--lane-demote` first when `state.json` lane is `fast`); exit 2 from the scan is exit 2 here.
3. Set allowlisted dirt aside (Requirement 5; never `git stash`), `git checkout sprint/S-NN`, `git merge story/<ID> --no-ff -m "merge(story/<ID>): <ID>"`. A non-zero merge: collect `git diff --name-only --diff-filter=U`, `git merge --abort`, write the set-aside files back, exit 4.
4. Prebuild when `merge.prebuild` is set (cwd = repo root), post-merge test per Requirement 8, exit 5 on failure.
5. Teardown per Requirement 6, `git branch -d story/<ID>`, then `update_state.mjs <ID> Done`. Write the set-aside files back last, except `state.json`, whose fresh write by the transition wins over the saved copy.
6. Print the JSON and exit.

`update_state.mjs` enforces no transition table today (`STATE_TRANSITIONS` in `constants.mjs:53` is not read by it), so the single `Done` call matches what DevOps ran at step 9.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `merge_story.mjs <ID> --sprint <SPRINT-NN> [--worktree <path>]` | CLI | none | argv | stdout `{ id, step, exit, tail: string[40], conflict_files?: string[] }`; exit 0, 2, 3, 4, 5 |

## Task Breakdown

- [ ] Add the optional `merge.prebuild` and `merge.post_test` keys to `gate-checks.json` (empty defaults) and read them in the script -> Requirement 8
- [ ] Scaffold `merge_story.mjs`: argv parsing, root and sprint-dir resolution, JSON result writer, exit codes -> Requirement 3
- [ ] Preconditions and the dirty-tree classifier with the allowlist and set-aside/write-back (no `git stash`) -> Requirement 5
- [ ] Pre-merge step: run `pre_gate_runner.sh qa`, parse the report, judge against `baseline.json` using 066-04's parser -> Requirement 2
- [ ] Fast-lane demotion on exit 3 via `update_state.mjs --lane-demote` -> Requirement 4
- [ ] Merge step, conflict detection, `git merge --abort`, `conflict_files` -> Requirement 3
- [ ] Prebuild and post-merge test steps with exit 5 -> Requirement 8
- [ ] Teardown with residue-aware `--force`, incident copy, branch delete, state transition -> Requirement 6
- [ ] Write `merge-story.node.test.ts` (pure helpers: classifier, baseline judge, exit mapping) and `merge-story.integration.node.test.ts` (fixture git repos, npm and Go, no `package.json` in the Go one): clean, failing check, conflict, post-merge failure, baseline failure, authored dirt, real dirt in worktree
- [ ] Rewrite `devops.md` and `devops.toml` for exit 4 and 5 only, with the scan-gated arch report -> Requirement 9
- [ ] Typecheck, run both test files, and run `cleargate-cli` `npm run prebuild` to confirm the payload composes
- [ ] Count a debug-pattern hit only in files the item changed vs `sprint/S-NN`; drop the scan's untouched-file entry; demote only on a real refusal -> Requirement 10
- [ ] Excuse an unnamed test failure matching the baseline exit code and last line, pre-merge and post-merge, with reason `baseline-unnamed` and a `NOT TESTED` tail line -> Requirement 11
- [ ] Run the two Amendment A red files and the sealed 08, 03 and 04 reds on the integrated tree -> Requirement 10, Requirement 11

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Name the parent epic's Testing Strategy level(s) this story covers, and the journey step(s) it implements, in the Notes column.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | Epic level Unit and Contract: dirty-path classifier (allowed, authored), baseline judge (excused, new, no file), exit-code mapping, JSON shape. A source scan asserts the script contains no `git stash`. |
| Integration tests | 7 | Epic level Integration: fixture git repo, one per scenario plus authored dirt and real dirt in the worktree; one Go fixture with no `package.json`. Journey steps "Small fix" (script merge) and "Ordinary story" (script merge). |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1 (the integration tests above are these). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Codex `devops.toml` changed in the same commit as `devops.md`.
- [ ] Neither `SKILL.md` nor either `dispatch-serial.md` is touched.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md:86-172` — the nine steps as fixed commands; becomes the script's flow.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md:48` and `:100` — the arch report required for every standard-lane story (BUG-116).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:498-566` — §C.7 DevOps-owned merge (read only here; STORY-066-12 rewrites it).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs:373-385` — `--lane-demote <reason>`; reused unchanged.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:60-70` — the scan the pre-merge check calls; it writes `pre-qa-scan.txt` under the worktree's reports directory.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json` — `qa.test`, `qa.typecheck`; gains `merge.*`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/surface-whitelist.txt` — has no wiki row, the cause of BUG-086.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/constants.mjs:33` — `BOUNCE_CAP`, and `:53` the transition table `update_state.mjs` does not enforce.
- **Coverage of this requirement:** partial, about 20%. Every step exists as agent prose; none exists as a script, and the baseline judgement, residue handling and dirt tolerance are new.

## Prior work

- [[EPIC-066]] — parent; the merge-by-script bullet and §6 owner answer.
- [[EPIC-013]] — recorded the decision to split DevOps out as an agent; this story narrows it to conflicts.
- [[STORY-022-04]] — the fast-lane scan-gated skip and the demotion rule, moved into the script.
- [[STORY-066-03]] — scan on any stack and `[N/A]` lines; upstream.
- [[STORY-066-04]] — `baseline.json`; upstream.
- [[BUG-086]] — orchestrator wiki dirt blocking the merge; absorbed (tolerance; the whitelist row stays out of scope).
- [[BUG-107]] — teardown needs `--force` because of ClearGate residue; absorbed (residue-aware removal).
- [[BUG-116]] — DevOps halts on an arch report a clean scan never has; absorbed.
- [[BUG-074]], [[BUG-075]] — transitions dirty the tree and are unenforced; carried, not fixed here.
- [[CR-124]], [[EPIC-055]] — merges stay serial at the barrier.

## Why not simpler?

- **Smallest existing surface that could carry this:** the DevOps agent prompt (`devops.md:86-172`) with the three bugs fixed in its text.
- **Why isn't extension / parameterization / config sufficient?** Fixing the three bugs in prose would keep a six-agent-per-wave cost on a fixed command sequence (dispenser finding W010-1) and would leave the fast lane's gate as the Developer's own report, which the epic's Trust row rules out. The script is the only form that both removes the dispatch and runs the check itself; the prompt change is the smaller half.

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

---
story_id: STORY-066-14
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts,agents
status: "Completed"
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T08:55:00Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox run 1, findings S11, S12, S9 (.cleargate/field-trials/2026-11-sandbox-s46.md; sandbox session b6209151, 08:31–08:34 UTC); owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; recorded in sprint-context Mid-Sprint Amendments)"
actor: Orchestrator merging a story with merge_story.mjs
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T08:47:55.678Z
updated_at: 2026-11-15T08:47:55.678Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T08:49:57Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-066-14
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-15T08:49:57Z
  sessions: []
---

# STORY-066-14: Merge teardown survives incident files and can resume; agents never invent environment values
**Complexity:** L2 — the teardown and re-run paths of one script, plus one rule in the QA, Developer and skill text; no new script.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator merging stories with `merge_story.mjs`, I want teardown to finish when a story worktree's incident files were moved or deleted, a re-run to finish a merge that already landed, and the agents to run configured commands without invented environment values, so that no merge needs hand teardown and no QA pass cites a test run that did not test.

### 1.2 Detailed Requirements
- Requirement 1 (finding S11, the crash): teardown copies only the `.script-incidents/*.json` entries whose file still exists in the worktree. A tracked incident file that is deleted or moved in the worktree is residue (`isWorktreeResidue` already says so) and is skipped by the copy, so `git worktree remove --force`, the branch delete and the state update run.
- Requirement 2 (finding S11, the report): an unexpected error after the merge commit has landed reports the step it happened in (`teardown` or `state`), not `precondition`, exit 2, with a tail line `merge commit <sha> has landed on sprint/S-NN; re-run merge_story.mjs <ID> --sprint <SPRINT-ID> to finish teardown and state`. An unexpected error before the merge keeps `precondition`.
- Requirement 3 (finding S11, the re-run): `merge_story.mjs <ID> --sprint <SPRINT-ID>`, when `story/<ID>` has no commit that `sprint/S-NN` lacks and the sprint branch holds a merge commit whose second parent is the tip of `story/<ID>`, runs only teardown (worktree removal when `.worktrees/<ID>` exists, branch delete) and the state update to `Done`, and exits 0 with `step: done`, `post_merge_test: 'skipped'` and a tail line `resumed: story/<ID> was already merged into sprint/S-NN; teardown and state only`. A story branch that is not ahead and has no such merge commit (no work on it) still exits 2 with `story/<ID> is not ahead of sprint/S-NN`.
- Requirement 4 (findings S12, S9, the agent rule): `qa.md` and `developer.md` say: never set or invent an environment value (a placeholder URL, token or path) to get a configured command past a guard; run the command as configured, and when it stops at a guard that `baseline.json` records, report that as the environment, not the item. `qa.md` also says `.script-incidents/*.json` files in the worktree are run records that `merge_story.mjs` collects at teardown: never ask for them to be moved or deleted. `SKILL.md` says an owner's instruction that binds the agents (an environment rule, a command not to run, a file not to touch) is recorded in `sprint-context.md` `## Mid-Sprint Amendments` before the next dispatch, because wave agents read that file, not the conversation or the Execution Log. The Codex copies are regenerated.

### 1.3 Out of Scope
- Ignoring `.script-incidents/` in the target's generated root `.gitignore` (`src/init/root-gitignore.ts`; finding S13): changes `init` output for every user; recorded in `intake.md`.
- `cleargate story complete` refusing a merged branch ("no commits on story branch"): the re-run of `merge_story.mjs` (Requirement 3) is the recovery path the skill names; `story complete` belongs to the retired DevOps path.
- The pre-merge scan, the baseline judgement and the post-merge test: no change.
- Live `.claude/` and `.cleargate/` copies: re-synced at SPRINT-46 Gate 4.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** How does the re-run tell "already merged" from "a branch with no work", since both are "not ahead"?
- **Recommended:** Look for a merge commit on the sprint branch whose second parent is the tip of `story/<ID>` (`git rev-list --merges --parents sprint/S-NN` or the `merge(story/<ID>)` subject the script writes). A branch with no work has no such commit, so it keeps today's refusal.
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation.
- **Question:** Should the re-run also run the post-merge test?
- **Recommended:** No. The first run already merged; if its post-merge test had failed it would have exited 5 before teardown. The re-run finishes only what the crash skipped and says so (`post_merge_test: 'skipped'`).
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the Sprint Design Review).

- **Risk:** the re-run marks a story `Done` that never merged.
- **Mitigation:** it requires the sprint branch's merge commit to have the story tip as its second parent; a test covers the no-work branch refusal.
- **Risk:** the prompt rule (Requirement 4) is not proven by unit tests; an agent may still set a placeholder.
- **Mitigation:** the rule is in both agent prompts and the skill puts the owner's instruction in the file every agent reads; Goal check (d) re-runs the sandbox, whose `make check` guard is exactly this trap.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | The normal merge, the resumed teardown, and the error report after the merge. |
| Interfaces | F | One interface: the `merge_story.mjs` CLI and its JSON result; the prompt rule is text, not an interface. |
| Data | F | No behaviour differs by data shape; incident files are one kind of residue. |
| Rules | T | The no-work refusal and the no-invented-environment rule. |

```gherkin
Feature: Merge teardown survives incident files and can resume

  @paths
  Scenario: Teardown finishes when a tracked incident file was moved out of the worktree
    Given a fixture sprint whose sprint branch tracks .cleargate/sprint-runs/SPRINT-99/.script-incidents/a.json
    And story STORY-905-01's worktree was cut from it, has one commit, and a.json has been deleted from the worktree
    When merge_story.mjs STORY-905-01 --sprint SPRINT-99 runs
    Then it exits 0 with step "done"
    And .worktrees/STORY-905-01 no longer exists, story/STORY-905-01 is deleted, and state.json shows STORY-905-01 Done

  @paths
  Scenario: A re-run after the merge landed finishes teardown and state
    Given story STORY-905-02 is merged into the sprint branch by a "merge(story/STORY-905-02)" commit whose second parent is the story tip
    And .worktrees/STORY-905-02 and story/STORY-905-02 still exist and state.json does not show STORY-905-02 Done
    When merge_story.mjs STORY-905-02 --sprint SPRINT-99 runs
    Then it exits 0 with step "done", post_merge_test "skipped" and a tail line starting "resumed: story/STORY-905-02 was already merged"
    And the worktree and the branch are gone and state.json shows STORY-905-02 Done
    And no new commit is added to the sprint branch

  @rules
  Scenario: A story branch with no work is still refused
    Given story/STORY-905-03 points at a commit already on the sprint branch and no merge commit has it as second parent
    When merge_story.mjs STORY-905-03 --sprint SPRINT-99 runs
    Then it exits 2 with step "precondition" and the tail "story/STORY-905-03 is not ahead of sprint/S-99"

  @paths
  Scenario: An error after the merge names its step and the way to finish
    Given story STORY-905-04 merges cleanly but teardown cannot copy its incident files because the sprint's .script-incidents path is a file
    When merge_story.mjs STORY-905-04 --sprint SPRINT-99 runs
    Then it exits 2 with step "teardown", not "precondition"
    And a tail line says the merge commit has landed and to re-run merge_story.mjs STORY-905-04 --sprint SPRINT-99

  @rules
  Scenario: Agents never invent environment values and the owner's rules reach them
    Given the canonical qa.md, developer.md and sprint-execution SKILL.md
    Then qa.md and developer.md each say never to set or invent an environment value to get a configured command past a guard
    And qa.md says .script-incidents files are collected by merge_story.mjs and never to ask for them to be moved or deleted
    And SKILL.md says an owner's instruction that binds the agents is recorded in sprint-context.md "## Mid-Sprint Amendments" before the next dispatch
    And the generated Codex qa.toml, developer.toml and core .agents SKILL.md carry the same text
```

### 2.2 Verification Steps (Manual)
- [x] Goal check (d): re-run the sandbox end to end on an RC built after this merge; every merge reaches `Done` through `merge_story.mjs` with no hand teardown, and no agent runs `make check` with a placeholder `TALLY_DB_URL`.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs` |
| Related Files | `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/developer.toml`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/test/scripts/merge-story-resume.red.integration.node.test.ts`, `cleargate-cli/test/docs/agent-environment-rule.red.node.test.ts` |
| New Files Needed | Yes — the two red test files |

### 3.2 Technical Logic
1. **Teardown copy (`merge_story.mjs:416-433`).** The `.script-incidents` copy loop skips an entry when `fs.existsSync(path.join(worktree, e.path))` is false.
2. **Step on error (`mergeStory` and `main`, `:245`, `:460-476`).** `mergeStory` keeps the current step and the merge SHA once the merge lands; an exception after that point becomes `buildResult({ step: <current step>, exit: 2, tail: [error, 'merge commit <sha> has landed on <sprint branch>; re-run …'] })`. Before the merge, `main`'s catch keeps `precondition`.
3. **Re-run (`:268-269`).** Before refusing "not ahead", look for a merge commit on the sprint branch whose second parent equals `git rev-parse story/<ID>`. Found: skip the dirt checks that concern the merge, the scan, the merge and the tests; run teardown (step 6) and state (step 7), and return `done` with `post_merge_test: 'skipped'` and the `resumed:` tail line. Not found: today's refusal.
4. **Prompts and skill.** `qa.md` and `developer.md`: one rule each (Requirement 4), placed where each prompt already talks about running the configured commands; `qa.md` also the incident-files line. `SKILL.md`: the owner-instruction line where the skill describes `sprint-context.md` as the agents' preflight read. `npm run gen:codex`, then `npm run prebuild` (`build-codex-payload.mjs --check`).
5. **Upstream.** STORY-066-13 edits `qa.md`, `developer.md` and `SKILL.md` too. Build from cli `main` ad5110c; after 066-13 merges, integrate `main` (rule 15) and regenerate the Codex copies; never hand-merge a generated file.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `merge_story.mjs <ID> --sprint <SPRINT-ID> [--worktree <path>]` (stdout JSON) | CLI | None | unchanged | unchanged keys; a resumed run returns `step: done`, `exit: 0`, `post_merge_test: 'skipped'` and a `resumed:` tail line; an error after the merge returns its own `step` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Integration (`merge_story.mjs` on a real git fixture, as `merge-story.red.integration.node.test.ts` does), Unit (text checks on the canonical prompts and their Codex renders), Release gate (Goal check (d) sandbox re-run).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | The agent rule in qa.md, developer.md, SKILL.md and the Codex copies. |
| Integration tests | 4 | `*.red.integration.node.test.ts` on a real git fixture: deleted tracked incident file; resumed teardown; no-work refusal; error after merge names its step. |
| E2E / acceptance tests | 5 | One per Gherkin scenario. |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] `build-codex-payload.mjs --check` passes; the existing `merge-story` tests stay green.
- [x] Goal check (d) re-run passes on an RC that includes this story.
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs:416-433` — teardown: `git worktree remove`, the residue filter, the `.script-incidents` copy loop that throws on a deleted entry, `--force` removal, branch delete.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs:268-269` — the "not ahead" precondition that refuses a re-run after the merge landed.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs:460-476` — `main`'s catch, which labels every unexpected error `precondition`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs:73-79` — `isWorktreeResidue` (already treats any `.script-incidents/` entry as residue).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` — the configured-command and `sprint-context.md` preflight text the rule joins.
- **Coverage of this requirement:** partial. Teardown, residue and the result JSON exist; each requirement is a guard or a branch in them, plus one rule in three prompts.

## Prior work

- [[EPIC-066]] — parent; Goal check (d) is its release gate.
- [[STORY-066-08]] — `merge_story.mjs` (merge by script); this story fixes its teardown and adds the re-run.
- [[STORY-066-13]] — upstream: edits the same three prompt files.
- [[BUG-107]] (Triaged) — teardown needs `--force` because ClearGate writes `.cleargate/reports/` and `.script-incidents` into linked worktrees; `merge_story.mjs` handles that residue, and this story fixes its copy of a deleted entry.
- [[BUG-109]] (Triaged) — `run_script.sh` records intended-red runs as incidents; adjacent (why incident files exist in worktrees), not changed here.
- [[BUG-086]], [[BUG-074]] — merge blocked by the orchestrator's own bookkeeping dirt; adjacent, handled by 066-08's set-aside.
- [[BUG-110]] — an environment value the operators pasted into every prompt; adjacent to Requirement 4 (instructions not reaching agents).
- cleargate-wiki-query 2026-11-15: nothing on re-running an already-merged story or on agents inventing placeholder values to pass a guard.

## Why not simpler?

- **Smallest existing surface that could carry this:** `merge_story.mjs`'s teardown loop, its "not ahead" precondition and `main`'s catch, plus one rule in three prompt files; no new file except tests.
- **Why isn't extension / parameterization / config sufficient?** The crash is a missing existence check and the refusal is a missing branch in the script; no flag or config reaches them. The prompt rule needs words in the prompts the agents read; the skill line is what puts the owner's instruction into the file they read.

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

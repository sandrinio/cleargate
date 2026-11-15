---
story_id: STORY-066-21
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T17:30:00Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox run 4 (RC 0.31.0-rc.4 = cli main 5198aaa), findings S34 (QA-Red's seal, run as the story worktree's copy, wrote the scan report and the pre-gate.jsonl line into the worktree; merge_story refused; files moved by hand) and S35 (an Architect post-flight hand-dispatched on an expected red) (.cleargate/field-trials/2026-11-sandbox-s46.md 'Run 4'); design source .cleargate/sprint-runs/SPRINT-46/plans/iteration-4-scoping.md §1-§8 (OD-1..OD-5); owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; ratified in sprint-context Mid-Sprint Amendments, 'STORY-066-21')"
actor: Orchestrator and wave agents running a sprint from a plain checkout or a Claude-managed worktree session
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: runtime
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T17:04:23.647Z
updated_at: 2026-11-15T17:30:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T17:18:44Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-066-21
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-15T17:12:29Z
  sessions: []
---

# STORY-066-21: Scan outputs reach the sprint root and runtime state is not dirt
**Complexity:** L2 — one new 30-line helper and edits to four existing scripts, plus prose in two prompts. Known patterns; no new dependency.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator running a sprint from a plain checkout or a Claude-managed worktree session, I want the scan records to land in the sprint root whichever script copy an agent runs, the merge to carry ClearGate's own runtime files out of a story worktree, the clean-tree checks to ignore ClearGate's runtime state, and an expected red to read as clean everywhere, so that a sprint needs no hand file moves and no hand-dispatched Architect pass.

### 1.2 Detailed Requirements
- **Requirement 1 (S34): scan outputs land in the sprint root, whichever copy runs.**
  - New `scaffold/core/.cleargate/scripts/lib/sprint-root.mjs` exports `sprintRoot(dir)`. When `dir` sits at `<root>/.worktrees/<ID>`, `<root>` is the top of its own git checkout, and both resolve to the same `--git-common-dir`, it returns `<root>`. Otherwise it returns `path.resolve(dir)`. It never throws.
  - Run as `node lib/sprint-root.mjs <dir>`, it prints that path.
  - `seal_red.mjs` takes `ROOT` from it (`:20-21`). `pre_gate_runner.sh` takes `REPO_ROOT_FOR_LANE` from it (`:349`) and falls back to today's `SCRIPT_DIR/../..`.
  - A seal run from a story worktree's own `.cleargate/scripts` then writes its report and its `pre-gate.jsonl` line into the sprint root. This holds when the worktree tracks `.active`, holds it empty, or does not have it, and it holds in a worktree session, where the `--git-common-dir` parent is the wrong checkout.
- **Requirement 2 (S34): `merge_story.mjs` carries ClearGate runtime files out of a story worktree.**
  - `isWorktreeResidue` (`:82-88`) also accepts these paths under `.cleargate/sprint-runs/<seg>/`, in any status: `reports/**`, `.qa-context-*.md`, and the files named in `DERIVED_SPRINT_RUN_FILES`. `plans/**` stays not residue.
  - Teardown copies each untracked such file to the same relative path in the sprint root:
    - `*.jsonl` lines are appended.
    - Any other file is copied when the root has none there.
    - When the root already has one, its file stays and the tail says `not carried (the sprint dir has its own): <rel>`.
  - When N > 0 files were carried, the tail says `carried from the worktree: <N> file(s)`.
  - The precondition (`:355`) uses the same rule.
- **Requirement 3 (S34; absorbs BUG-074 and the code half of BUG-103): ClearGate runtime state is not dirt.**
  - Check (d) of `validate_bounce_readiness.mjs` (`:86-103`) ignores every entry under `.cleargate/sprint-runs/`, `.cleargate/wiki/` and `.cleargate/hook-log/`. Every other change, untracked user files included, is still dirt.
  - In `merge_story.mjs`, `classifyDirtyPath` treats a tracked `.cleargate/sprint-runs/.active` as `derived`. A target repo's second sprint finds the `.active` that close Step 7.8 committed empty now modified by `init`. Today the root precondition refuses every merge on it.
- **Requirement 4 (S35): an expected red reads as clean on disk and in the playbook.**
  - Every `seal_red.mjs` seal appends one line to the sprint root's `pre-gate.jsonl`: `{"ts","mode":"seal","item","exit","raw_exit","flagged_checks","sealed_sha"}`, plus `expected_red` when classified.
  - A classified seal also appends a line starting `[INFO] expected_red:` to its report, followed by the diagnostics.
  - `qa.md` Mode: RED returns `EXPECTED_RED:`.
  - SKILL.md:
    - §C.3.5 says an expected red is not a flag and the Safeguard does not cover it.
    - §C.0.1 step 5 says a GREEN verdict's `stages_run` is final.
    - §C.7 says `merge_story.mjs` carries the runtime files and nobody moves them by hand.
    - §C.1 says ClearGate's runtime files do not count as dirt.
  - Codex copies are regenerated.

### 1.3 Out of Scope
- `run_script.sh` incident location (BUG-107 (a), BUG-109); `prep_qa_context.mjs` output location (moving it would turn carried residue into a missing pack); hook root resolution in a worktree session (BUG-137, CR-086).
- An `expected_red` field in `wave_runner.js`'s red schema or verdict.
- Treating untracked `plans/**` as residue (a sealed 066-08 assertion pins it as not residue).
- Protecting another item's sealed tests in the surface gate (sandbox run 4b; intake, same class as run-1 S10).
- Live `.claude/` and `.cleargate/` copies: re-synced at SPRINT-46 Gate 4.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Which checkout is the sprint root for a script copy inside a story worktree? The parent of `--git-common-dir`, or the checkout that owns `.worktrees/`?
- **Recommended:** The checkout that owns `.worktrees/`, when it is the same repository. In a Claude-managed worktree session the `--git-common-dir` parent is the parent checkout on `main`, which has no `.active` (scoping §1, OD-1).
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation (OD-1).
- **Question:** Should check (d) use `merge_story`'s `classifyDirtyPath` or a path-prefix rule?
- **Recommended:** A path-prefix rule. `classifyDirtyPath` ignores all untracked files, so user work that a worktree would strand would pass (BUG-074: "dirty `src/` still fails"). The merge side gains only the `.active` rule (OD-2).
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation (OD-2).
- **Question:** How should the orchestrator learn that a seal was an expected red, when the runner's red schema drops `expected_red`?
- **Recommended:** Through the records it reads and the playbook text, not a runner schema change: the report's trailer, the seal's line in `pre-gate.jsonl`, `EXPECTED_RED` in qa.md, and the SKILL sentences (OD-3).
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation (OD-3).

### 1.5 Risks

- **Risk:** a story worktree created outside `<root>/.worktrees/` keeps today's output location.
- **Mitigation:** Requirement 2 carries its residue at the merge. Every ClearGate path that creates worktrees uses `.worktrees/<ID>`.
- **Risk:** a scan run from a worktree copy now does lane routing on the root's real `state.json`, not on the worktree's stale tracked copy.
- **Mitigation:** this is the intended behaviour. The seal's arch scan has no item id, so it never routes.
- **Risk:** carried `.jsonl` lines can duplicate a line someone already copied by hand.
- **Mitigation:** the duplicate is harmless. No script dedupes or counts these lines for gating.
- **Risk:** `--path-format=absolute` needs git 2.31 or later.
- **Mitigation:** on older git the call fails and the root stays as today.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two checkout layouts (plain, Claude-managed session); the merge carries a file or leaves the root's in place. |
| Interfaces | T | Scripts' on-disk records, the agent prompt and the playbook each change. |
| Data | T | An expected red and any other typecheck failure produce different records. |
| Rules | T | Runtime state is not dirt, but user work still is. |

```gherkin
Feature: Scan outputs reach the sprint root and runtime state is not dirt

  @paths
  Scenario Outline: A seal run from inside the story worktree writes its records to the sprint root
    Given a <layout> whose sprint branch sprint/S-99 tracks .cleargate/sprint-runs/.active as <committed>
    And the sprint root's .active reads SPRINT-99
    And the story worktree .worktrees/STORY-909-01 was cut from sprint/S-99
    When QA-Red runs "bash .cleargate/scripts/run_script.sh node .cleargate/scripts/seal_red.mjs STORY-909-01 --worktree . --sprint-branch sprint/S-99 -- internal/tally/top_red_test.go" from inside the story worktree
    Then the sprint root's .cleargate/sprint-runs/SPRINT-99 holds reports/STORY-909-01-pre-arch-scan.txt and a pre-gate.jsonl line with mode "seal" and item "STORY-909-01"
    And git status in the story worktree is empty
    And a parent checkout, when there is one, gets no SPRINT-99 or _off-sprint pre-gate file

    Examples:
      | layout | committed |
      | plain checkout | an empty file, as the last close commits it |
      | Claude-managed session worktree .claude/worktrees/s of a parent checkout on main | SPRINT-99 |

  @data
  Scenario: Every seal records its verdict, and an expected red reads as clean
    Given arch.typecheck fails only with "internal/tally/top_red_test.go:9:9: undefined: TopN" for the sealed red file
    When seal_red.mjs seals STORY-909-01
    Then it exits 0 and the report keeps "[FAIL] typecheck" and ends with the "[INFO] expected_red:" line and the diagnostic
    And the last pre-gate.jsonl line has mode "seal", item "STORY-909-01", exit 0, raw_exit 1, the sealed_sha and the expected_red entries
    And when typecheck fails with any other error, the seal exits 1, the report has no "[INFO] expected_red:" line, and the seal line has exit 1 and flagged_checks containing "typecheck"

  @paths
  Scenario: The merge carries ClearGate runtime files out of the story worktree and never overwrites the sprint root's
    Given the story worktree holds an untracked scan report, .qa-context-STORY-900-01.md and a one-line pre-gate.jsonl under .cleargate/sprint-runs/SPRINT-99
    And the sprint root has its own one-line pre-gate.jsonl
    When merge_story.mjs STORY-900-01 --sprint SPRINT-99 runs
    Then it exits 0 at step "done" and its tail says "carried from the worktree: 3 file(s)"
    And the sprint root holds the report and the .qa-context file, its pre-gate.jsonl starts with its own line and ends with the worktree's line, and the worktree is removed
    And when the sprint root already holds a different report for the item, that report is unchanged and the tail says "not carried (the sprint dir has its own): .cleargate/sprint-runs/SPRINT-99/reports/STORY-900-01-pre-arch-scan.txt"

  @rules
  Scenario: ClearGate runtime state is not dirt; user work still is
    Given STORY-909-01 is "Ready to Bounce"
    And the only changes are untracked .cleargate/sprint-runs files, a modified tracked .active, a modified tracked .cleargate/wiki/index.md and an untracked .cleargate/hook-log file
    When validate_bounce_readiness.mjs STORY-909-01 runs
    Then it exits 0
    And after an untracked cmd/new.go and a modified src/a.txt appear it exits 1 and lists those two paths and no .cleargate/ path
    And merge_story.mjs merges a story while the committed empty .active reads SPRINT-99 uncommitted in the sprint root, and .active still reads SPRINT-99 afterwards

  @interfaces
  Scenario: The playbook and QA-Red say what the scripts now do
    Given the canonical qa.md and sprint-execution SKILL.md and their generated Codex copies
    Then qa.md and qa.toml Mode: RED return "EXPECTED_RED:" from the seal's expected_red
    And SKILL §C.3.5 says "**An expected red is not a flag.**", and so does the Codex SKILL
    And SKILL §C.0.1 step 5 says a GREEN verdict's stages_run is final and never to dispatch a stage the runner skipped
    And SKILL §C.7 says merge_story.mjs carries the runtime files and to never move them by hand
    And SKILL §C.1 says ClearGate's runtime files do not count as dirt
    And the Codex SKILL carries both of those §C.7 and §C.1 sentences
```

### 2.2 Verification Steps (Manual)
- [x] Scratch replay (story plan, Proof): with the canonical scripts, the 4a sequence in both layouts (runtime state committed at kickoff, seal from inside the story worktree, merge). The records are in the sprint root, the worktree is clean, and the merge exits 0. A hand-placed 4a residue is carried, and the sprint-2 `.active` merge passes. Evidence goes to `evidence/STORY-066-21/`.
- [x] Goal check (d) run 5 on RC 0.31.0-rc.5, both layouts (met in two runs: run 5a met it in the worktree layout on rc.5; in the plain layout, run 5b's three hand steps came from the driver dropping `--settings` (S38), and run 7 on rc.7 met it — rc.7 includes this story; field-trials "Run 5 result", "Run 7 result"):
  - run 3's criteria 1–10 and the section C bar;
  - every seal's report and `mode:"seal"` line are in the sprint root;
  - no merge exit 2 at precondition, and no hand move of worktree files;
  - Architect dispatches per item equal `stages_run`.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/lib/sprint-root.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh`, `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/validate_bounce_readiness.mjs`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/test/scripts/sprint-root-outputs.red.integration.node.test.ts`, `cleargate-cli/test/scripts/merge-story-carry.red.integration.node.test.ts`, `cleargate-cli/test/scripts/merge-story-carry-state.red.integration.node.test.ts` (Amendment A seal 2), `cleargate-cli/test/scripts/bounce-readiness-runtime-state.red.integration.node.test.ts`, `cleargate-cli/test/docs/expected-red-not-a-flag.red.node.test.ts` |
| New Files Needed | Yes — `lib/sprint-root.mjs` and four red test files; `qa.toml` and the Codex SKILL are regenerated by `npm run gen:codex`, never hand-edited |

### 3.2 Technical Logic
The story plan (`.cleargate/sprint-runs/SPRINT-46/plans/STORY-066-21.md`) governs. In short:
1. **`sprintRoot(dir)`.** It inspects `dir` only, with no `.active` lookup. It returns early when `basename(dirname(dir)) !== '.worktrees'`, so existing fixtures spawn no git. Otherwise it requires two checks to pass: `git -C <owner> rev-parse --show-toplevel` must equal `<owner>` (flashcard 2026-11-14 `#scripts #git`: `git -C` on a subdir reads the parent repo), and the realpath'd `--git-common-dir` must be equal for both.
2. **`seal_red.mjs`.** `ROOT = sprintRoot(SCRIPT_DIR/../..)`. Reading `.active` moves ahead of the report block. On a classified seal the trailer is appended before the move. One seal line goes to `pre-gate.jsonl` after the move; the write is wrapped in try/catch and never changes the exit.
3. **`pre_gate_runner.sh:349`.** Calls the helper's CLI; on failure or empty output it falls back to `cd "${SCRIPT_DIR}/../.." && pwd`. `CONFIG_FILE` and `REPORT_DIR` are unchanged.
4. **`merge_story.mjs`.** Widened residue rule; a carry step in teardown beside the incident copy (`:298-305`); and the `.active` line in `classifyDirtyPath` (`:71-76`). `DERIVED_SPRINT_RUN_FILES`, `MERGE_EXIT`, `buildResult` and `judgeTestFailure` are not edited.
5. **`validate_bounce_readiness.mjs`.** Check (d) uses `git status --porcelain=v1 -z --untracked-files=all` through `execFileSync`, drops the three prefixes, and lists the rest as `<XY> <path>`.
6. **Prose.** qa.md step 9 and the RED output shape; SKILL §C.0.1 step 5, §C.1, §C.3.5 and §C.7. Then `npm run gen:codex` and `npm run prebuild`.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `node .cleargate/scripts/lib/sprint-root.mjs <dir>` | CLI | None | one directory | stdout one path line, exit 0; no argument → exit 2 |
| `<sprint root>/.cleargate/sprint-runs/<sprint or _off-sprint>/pre-gate.jsonl` | append, one line per seal | None | — | `{"ts","mode":"seal","item","exit","raw_exit","flagged_checks","sealed_sha"[,"expected_red"]}` |
| `merge_story.mjs` result `tail` | stdout JSON | None | — | adds `carried from the worktree: <N> file(s)` and `not carried (the sprint dir has its own): <rel>` lines |

## Task Breakdown

- [x] QA-Red: four new red files, 8 tests (R1-T1, R1-T2, R4-T1, R2-T1, R2-T2, R3-T2, R3-T1, R4-T2); seal -> Scenarios 1-5
- [x] `lib/sprint-root.mjs`: `sprintRoot(dir)` and its CLI -> Requirement 1; Scenario 1
- [x] `seal_red.mjs`: `ROOT` from `sprintRoot`; the seal line on every seal; the `[INFO] expected_red:` trailer on a classified seal -> Requirements 1, 4; Scenarios 1, 2
- [x] `pre_gate_runner.sh:349`: `REPO_ROOT_FOR_LANE` from the helper's CLI with fallback -> Requirement 1; Scenario 1
- [x] `merge_story.mjs`: widened `isWorktreeResidue`, teardown carry, `.active` as derived -> Requirements 2, 3; Scenarios 3, 4
- [x] `validate_bounce_readiness.mjs`: check (d) ignores the three runtime prefixes -> Requirement 3; Scenario 4
- [x] `qa.md` step 9 and the `EXPECTED_RED:` line; SKILL §C.0.1 step 5, §C.1, §C.3.5, §C.7 -> Requirement 4; Scenario 5
- [x] `npm run gen:codex`; `npm run prebuild` -> Requirement 4; Scenario 5
- [x] `npm run typecheck`, the new reds, the plan's regression list and the three shell tests -> all
- [x] QA-Verify on the story tree, then the scratch replay into `evidence/STORY-066-21/` -> all

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Integration (scripts on real git repos with story worktrees cut from a branch that tracks `.active`), Unit (prompt and playbook text), Release gate (Goal check (d) run 5).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | qa.md/qa.toml RED slice and SKILL/Codex SKILL sentences (R4-T2). |
| Integration tests | 7 | Real git, no mocks: seal from the worktree copy in both layouts (R1-T1, R1-T2); seal records for an expected red and a flagged red (R4-T1); merge carry and no-overwrite (R2-T1, R2-T2); merge with a modified committed `.active` (R3-T2); readiness with runtime-only versus user dirt (R3-T1). |
| E2E / acceptance tests | 5 | One per Gherkin scenario; the release-gate proof is Goal check (d) run 5. |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] These existing tests stay green with no edit: `seal-red.integration`, `seal-red-expected-red.red` (unit and integration), `merge-story.red` (unit and integration), `merge-story-resume.red.integration`, `merge-story-amend-a.red` (unit and integration), `merge-story-test-waiver.red.integration`, `subagent-ledger.red` (CR-120), `pre-gate-any-stack.red.integration`, `wave-runner.red.integration`, `qa-red-seal-content`, `skill-md-conditional-architect.red` and `codex-sprint-execution-render.red`. `build-codex-payload.mjs --check` passes.
- [x] Scratch replay evidence in `evidence/STORY-066-21/` meets every pass condition in the story plan's Proof section.
- [x] Goal check (d) run 5 passes on an RC that includes this story (0.31.0-rc.5), in both layouts. Worktree layout: run 5a on rc.5. Plain layout: run 7 on rc.7, which includes this story (run 5b's misses were the driver's, S38).
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs:20-21`, `:191-227` — `ROOT` from the script's own location; the report move and the delete when `.active` is empty.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs:204-214`, `:229-230` — expected-red classification (STORY-066-19), recorded only in the seal JSON.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:349-378` — `REPO_ROOT_FOR_LANE`, lane routing and the CR-120 `pre-gate.jsonl` line.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs:71-88`, `:292-308`, `:352-356` — `classifyDirtyPath`, `isWorktreeResidue`, teardown with the incident copy, and the two preconditions.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/validate_bounce_readiness.mjs:86-103` — check (d), a bare `git status --porcelain`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:17-23`, `:48`, `:65`, `:74` — the red schema without `expected_red`, the scan-flagged rule, the red prompt, and the TPV prompt reading the report from the sprint root.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:50-61` — RED step 9 and the output shape.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:280`, `:301-310`, `:376-387`, `:473-485`, `:488-490` — barrier step 5, §C.1, §C.3.5 and its Safeguard, §C.6, §C.7.
- **Coverage of this requirement:** partial. Every surface exists. The fixes are a resolver, one widened rule, two path filters and four playbook sentences.

## Prior work

- [[EPIC-066]] — parent; Goal check (d) is its release gate.
- [[STORY-066-08]] — `merge_story.mjs`, `classifyDirtyPath` and `isWorktreeResidue`, which this story widens.
- [[STORY-066-19]] — the expected-red classifier whose result this story records on disk.
- [[BUG-107]] — runtime output in story worktrees. Its (a), a `--git-common-dir` root for `run_script.sh`, is wrong in a worktree session; unchanged here.
- [[BUG-074]] — check (d) counts sprint-run bookkeeping as dirt; absorbed by Requirement 3.
- [[BUG-103]] — its code half (ignore `.cleargate/wiki/**` in check (d)) is done by Requirement 3. Its decision that bookkeeping commits are legitimate stands; Requirements 1 and 2 make those commits harmless.
- [[BUG-137]] — hooks resolve the main checkout in a worktree session; should reuse `lib/sprint-root.mjs`; unchanged here.
- [[CR-086]] — `.active` resolves from the main checkout, single writer. `sprintRoot` resolves to the checkout that owns `.worktrees/`, which is that checkout in the plain layout and the only `.active` writer in a session.
- [[BUG-109]] — expected reds recorded as incidents; adjacent, unchanged.
- cleargate-wiki-query 2026-11-15 (coordinator): no item covers the seal report or `pre-gate.jsonl` location, or the expected-red record.

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing root lines (`seal_red.mjs:20-21`, `pre_gate_runner.sh:349`), the residue rule (`merge_story.mjs:82-88`) and check (d) (`validate_bounce_readiness.mjs:86-103`).
- **Why isn't extension / parameterization / config sufficient?**
  - An environment variable or flag would depend on how each agent types the command. Run 4a's three QA-Reds typed it three ways, so the root has to come from where the copy sits.
  - Not committing `.active` cannot avoid the problem, because close Step 7.8 commits it empty, so every later sprint's worktrees carry it.
  - A runner schema field would not reach the orchestrator, whose verdict never carries red fields. The records it actually reads must say "expected red".

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

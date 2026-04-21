---
story_id: STORY-013-08_Execution_Mode_Flag
parent_epic_ref: EPIC-013
status: Done
ambiguity: 🟢 Low
context_source: EPIC-013_Execution_Phase_v2.md §6 Q2 Opt-in rollout (execution_mode flag) + §4.2 row 'Sprint Planning v2' (frontmatter)
actor: Developer Agent
complexity_label: L2
approved: true
approved_at: 2026-04-21T00:00:00Z
completed_at: "2026-04-21T08:30:00Z"
approved_by: sandro
milestone: M2
parallel_eligible: n
expected_bounce_exposure: med
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
stamp_error: no ledger rows for work_item_id STORY-013-08_Execution_Mode_Flag
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T06:14:06Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: implementation-files-declared
      detail: section 3 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-21T06:14:07Z
---

# STORY-013-08: execution_mode Flag + CLI Wrappers (flips v2 routing — last M2 story)
**Complexity:** L2 — one protocol section + four CLI command groups + one Sprint Plan Template enum constraint. Risk: CLI collision audit (R6) + R1 "do not invoke v2 commands mid-SPRINT-09".

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate user running `cleargate-cli`, I want opt-in v2 routing via `execution_mode: v1 | v2` on the Sprint Plan frontmatter, plus four new CLI command groups (`sprint init|close`, `story start|complete`, `gate qa|arch`, `state update|validate`) that shell out through `run_script.sh` to the M1/013-07 scripts, so that existing v1 workflows are unchanged (under v1 the new commands print an inert-mode message) and v2 behavior is a single-line frontmatter flip per sprint.

### 1.2 Detailed Requirements
- **Protocol §19 "Execution Mode Routing (v2)"**: orchestrator reads Sprint Plan frontmatter `execution_mode`; if `v2`, all §§15–18 rules are enforcing; if `v1`, advisory. Flag is sprint-scoped, not global.
- **Sprint Plan Template frontmatter**: enum constraint on `execution_mode` ∈ {`v1`, `v2`} — STORY-013-09 may add the field; STORY-013-08 owns the enum + routing documentation.
- **`cleargate sprint <init|close>`** in `cleargate-cli/src/commands/sprint.ts`:
  - `sprint init <sprint-id> --stories <csv>` — shells out via `run_script.sh init_sprint.mjs`.
  - `sprint close <sprint-id>` — shells out via `run_script.sh close_sprint.mjs`.
- **`cleargate story <start|complete>`** in `cleargate-cli/src/commands/story.ts`:
  - `story start <story-id>` — creates worktree (reads sprint branch from state.json; runs `git worktree add`).
  - `story complete <story-id>` — shells out to `run_script.sh complete_story.mjs` (script stub; full impl out of scope — orchestrator-invoked only).
- **`cleargate gate <qa|arch>`** in `cleargate-cli/src/commands/gate.ts` (EXTEND existing file; do not collide with existing `check`/`explain`): shells out via `run_script.sh pre_gate_runner.sh qa|arch <worktree> <branch>`.
- **`cleargate state <update|validate>`** in `cleargate-cli/src/commands/state.ts`:
  - `state update <story-id> <new-state>` — shells out via `run_script.sh update_state.mjs`.
  - `state validate <sprint-id>` — shells out via `run_script.sh validate_state.mjs`.
- **All handlers v1-inert**: when the active sprint's `execution_mode` is `v1`, print `v1 mode active — command inert. Set execution_mode: v2 in sprint frontmatter to enable.` and exit 0.
- **No direct `node .cleargate/scripts/*.mjs` calls** — every handler routes through `run_script.sh` (EPIC-013 §0 rule 5).
- **Unit tests** for each of the four new command files — mock `child_process.spawn` / `execSync`; assert v1-inert AND v2-active paths.
- **Three-surface landing (R9)**: Sprint Plan Template + protocol.md on live + mirror; CLI wrappers in `cleargate-cli/` only (that's the one CLI surface in M2 — R9 satisfied by `cleargate-cli/dist/` regen + MANIFEST.json SHA update).

### 1.3 Out of Scope
- **Flipping SPRINT-09's own `execution_mode` to `v2`.** Stays `v1` per R1 — R1 forbids invoking v2 commands against SPRINT-09 mid-execution. Flag flip happens at SPRINT-10 planning time, outside this sprint.
- Full `complete_story.mjs` implementation — stub only; body is future work.
- Removing the flag (that's SPRINT-11 per EPIC-013 §6 Q2 answer: "remove it after two green sprints on v2").
- `cleargate doctor` warning when `gate-checks.json` drifts from `package.json` deps — filed for SPRINT-11 (M1 decision D6).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: execution_mode flag + CLI wrappers

  Scenario: v1 mode inert
    Given a synthetic SPRINT-99.md with execution_mode: "v1"
    When I run `cleargate sprint init SPRINT-99 --stories STORY-99-01`
    Then exit code is 0
    And stdout contains "v1 mode active — command inert"
    And no node subprocess is spawned

  Scenario: v2 mode routes to script
    Given a synthetic SPRINT-99.md with execution_mode: "v2"
    When I run `cleargate sprint init SPRINT-99 --stories STORY-99-01`
    Then run_script.sh init_sprint.mjs is invoked via child_process.spawn
    And exit code reflects the script's exit code

  Scenario: No CLI collision
    When I run `cleargate --help`
    Then no duplicate subcommand names exist across sprint|story|gate|state plus existing groups (join, init, wiki, push, pull, sync, conflicts, etc.)
    And `gate qa` + `gate arch` do not collide with existing `gate check` + `gate explain`

  Scenario: All four wrappers route through run_script.sh
    Given cleargate-cli is built
    When I grep dist/ for `node .cleargate/scripts/*.mjs` direct invocations
    Then zero matches are found

  Scenario: Flag-flip roundtrip
    Given synthetic SPRINT-99.md starts with execution_mode: "v1"
    When I edit the frontmatter to "v2" and re-run `cleargate sprint init SPRINT-99 --stories STORY-99-01`
    Then behavior changes from "v1 mode inert" (Scenario 1) to routed-to-script (Scenario 2) without CLI rebuild
```

### 2.2 Verification Steps (Manual)
- [ ] `npm run build` in `cleargate-cli/` clean + MANIFEST.json SHA updates.
- [ ] `npm run typecheck` + `npm test` in `cleargate-cli/` both green.
- [ ] `diff` protocol.md + Sprint Plan Template live vs mirror — empty.
- [ ] `grep "execution_mode" .cleargate/knowledge/cleargate-protocol.md` — finds §19.

## 3. The Implementation Guide

See **M2 plan §STORY-013-08** at `.cleargate/sprint-runs/S-09/plans/M2.md` (lines 158–197). Plan covers: exact file paths under `cleargate-cli/src/commands/`, extension of existing `gate.ts` with new subcommands (no collision — `qa`/`arch` differ from `check`/`explain`), `.ts` → `.js` build step, and R1 enforcement (tests use synthetic `SPRINT-99.md` fixture, never live SPRINT-09 state).

### 3.1 Context & Files

| Item | Value |
|---|---|
| Protocol | `.cleargate/knowledge/cleargate-protocol.md` — append `## 19. Execution Mode Routing (v2)` |
| Template | `.cleargate/templates/Sprint Plan Template.md` — enum constraint on execution_mode (013-09 adds the field; 013-08 documents v1\|v2) |
| CLI | `cleargate-cli/src/commands/sprint.ts` (new) |
| CLI | `cleargate-cli/src/commands/story.ts` (new) |
| CLI | `cleargate-cli/src/commands/gate.ts` (EXTEND existing) |
| CLI | `cleargate-cli/src/commands/state.ts` (new) |
| CLI wiring | `cleargate-cli/src/cli.ts` — register 4 new command groups / extend `gate` |
| Tests | `cleargate-cli/src/commands/{sprint,story,gate,state}.test.ts` |
| Mirrors | `cleargate-planning/` copies of protocol + Sprint Plan Template |
| Fixture | `cleargate-cli/src/commands/fixtures/SPRINT-99.md` (two variants for v1 + v2 tests) |

### 3.2 Technical Logic
Every handler calls `readSprintFrontmatter(sprintId)` to resolve `execution_mode`, then gates behavior. v1-inert path prints + exits 0. v2-active path calls `spawnSync('bash', ['.cleargate/scripts/run_script.sh', scriptName, ...args])` with `stdio: 'inherit'`. Return code propagates. Do NOT invoke `node` directly — always through `run_script.sh` per EPIC-013 §0 rule 5.

### 3.3 API Contract (CLI)

| Command | Subcommand | Args | v1 behavior | v2 behavior |
|---|---|---|---|---|
| `sprint` | `init` | `<sprint-id> --stories <csv>` | Print + exit 0 | run_script.sh init_sprint.mjs |
| `sprint` | `close` | `<sprint-id>` | Print + exit 0 | run_script.sh close_sprint.mjs |
| `story` | `start` | `<story-id>` | Print + exit 0 | git worktree add |
| `story` | `complete` | `<story-id>` | Print + exit 0 | run_script.sh complete_story.mjs |
| `gate` | `qa` | `<worktree> <branch>` | Print + exit 0 | run_script.sh pre_gate_runner.sh qa |
| `gate` | `arch` | `<worktree> <branch>` | Print + exit 0 | run_script.sh pre_gate_runner.sh arch |
| `state` | `update` | `<story-id> <new-state>` | Print + exit 0 | run_script.sh update_state.mjs |
| `state` | `validate` | `<sprint-id>` | Print + exit 0 | run_script.sh validate_state.mjs |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | 1 per subcommand × v1-inert + v2-active = 16 minimum; minimum 8 covering both paths per file |
| Gherkin scenarios | 5 | All §2.1 scenarios |
| Three-surface diff | 2 | protocol.md + Sprint Plan Template |
| CLI collision audit | 1 | `cleargate --help` tree inspection |

### 4.2 Definition of Done
- [ ] All §2.1 scenarios pass.
- [ ] Unit tests mock child_process correctly; no actual scripts invoked in tests.
- [ ] CLI collision audit shows no duplicate subcommand names.
- [ ] `npm run build` + `npm run typecheck` + `npm test` in `cleargate-cli/` all green.
- [ ] MANIFEST.json regenerated.
- [ ] SPRINT-09 frontmatter `execution_mode` remains `"v1"` — DO NOT flip mid-sprint (R1).
- [ ] `flashcards_flagged` field populated on dev + qa reports for this story (dogfood check — STORY-013-06 already merged).
- [ ] Commit: `feat(EPIC-013): STORY-013-08 execution_mode flag + CLI wrappers (M2 complete)`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenarios cover §1.2 requirements.
- [x] CLI collision audit scoped to existing commander tree.
- [x] R1 compliance explicit (SPRINT-99 fixture, not SPRINT-09 state).
- [x] run_script.sh routing is the single invocation contract (no direct `node`).
- [x] Flag-flip is sprint-scoped; removal deferred to SPRINT-11 per Q2.

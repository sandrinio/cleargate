---
story_id: STORY-066-16
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts,skills
status: "Completed"
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T11:30:03Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox runs 1 and 2, findings B2 (ORCHESTRATOR_FINDINGS.md), S18, S19, B11 (.cleargate/field-trials/2026-11-sandbox-s46.md); design source .cleargate/sprint-runs/SPRINT-46/plans/iteration-3-scoping.md §1, §8; owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; OD-1..OD-12 ratified in sprint-context Mid-Sprint Amendments, 'Iteration 3')"
actor: Orchestrator starting a sprint with sprint init
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T11:30:03Z
updated_at: 2026-11-15T11:30:03Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T11:30:03Z
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

# STORY-066-16: Kickoff assigns lanes without a re-init
**Complexity:** L2 — one script computes lanes from the item files when no `waves.json` exists, one export, one back-sync line in the reconciler, two SKILL paragraphs.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Orchestrator starting a sprint, I want `sprint init` to give each item the lane its own signals compute, and the playbook to record a design-review raise without a re-init, so that a sprint never runs every item as `standard` and nobody re-runs `init_sprint.mjs --force`.

### 1.2 Detailed Requirements
- Requirement 1 (findings B2, S18): when `plans/waves.json` is absent, `init_sprint.mjs` computes each id's lane with `assign_lane.mjs` from its item file in `.cleargate/delivery/{pending-sync,archive}` (found with `matchesId` from `lib/work-item-id.mjs`) and stamps `lane_assigned_by: 'assign-lane-script'`. A §2.4 table lane for the same id is judged against that computed floor by the existing raise-never-lower block, with the same WARN text. No item file found: today's behaviour (table lane, else `standard` with `migration-default`). `waves.json` present: unchanged, it is still preferred. A `--preserve-bounces` carry still wins.
- Requirement 2: `assign_lane.mjs` exports `assignLaneForFile(file) -> { id, lane, signals, reason } | null`. It never calls `process.exit`. `assign()` delegates to it. `computeSignals` and `laneFor` do not change.
- Requirement 3 (finding S19, the playbook): SKILL A.3 shows `cleargate sprint init SPRINT-NN --stories <the §1 work-item ids, comma-separated>` (the CLI path also runs the decomposition gate and the kickoff baseline) and says init computes lanes when no `waves.json` exists. The tail of A.4, after "Verify before leaving A.4", says: if §2.4 raises a lane above its `lane_signals` floor, record it with `CLEARGATE_STATE_FILE=<sprintDir>/state.json node .cleargate/scripts/update_state.mjs <ID> --lane <lane>`, and never re-run init with `--force`. A.3 and A.4 keep their order (the SDR agents read `sprint-context.md` and the ledger hook needs `.active`, both written by init). The Codex copy is regenerated.
- Requirement 4 (finding B11): when `reconcileCurrentSprintStories` flips a story to Completed and the story file's frontmatter already has a `lane:` key and `state.json` holds a valid lane, it sets `lane: "<state lane>"`. It never adds the key. The archived record then shows the lane that ran, including a demotion.

### 1.3 Out of Scope
- `segment_stages.mjs` `laneOf` precedence (state before plan): pinned by the sealed `test/scripts/segment-stages.red.node.test.ts:81` ("state wins"). Not touched.
- `collision_surface.sh` prose parsing that inflates subsystem counts (some items compute `runtime` too eagerly): unchanged.
- Reordering A.3 and A.4, and the `.active` sentence in A.3 (STORY-066-17 edits that adjacent paragraph and integrates after this story).
- Live `.claude/` and `.cleargate/` copies: re-synced at SPRINT-46 Gate 4.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Move `sprint init` after the design review so `waves.json` exists, or compute lanes at init?
- **Recommended:** Compute at init and keep the order. The SDR agents read `sprint-context.md` first and the ledger hook needs `.active`; both come from init (scoping §1, step 3).
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation.
- **Question:** A raise recorded with `update_state --lane` is stamped `human-override`. Acceptable?
- **Recommended:** Yes. It is cosmetic; the lane value is what the runner reads (scoping §1, risk).
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.

### 1.5 Risks

- **Risk:** a raise the orchestrator forgets runs at the computed floor, never lower. Today's failure is every item `standard`.
- **Mitigation:** the A.4 tail names the command; Goal check (d) shows lanes `fast/standard/runtime/standard` with no `--force`.
- **Risk:** `collision_surface.sh` prose parsing makes some items compute `runtime` too eagerly.
- **Mitigation:** unchanged by this story; the Architect may raise, never lower, and the cost is one extra stage, not a wrong merge.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Lanes computed from item files; the archived story shows the lane that ran. |
| Interfaces | T | The playbook command and the Codex render, besides the script. |
| Data | T | The §2.4 lane below, equal to, or above the computed floor. |
| Rules | T | `waves.json` stays preferred; a raise is never lowered. |

```gherkin
Feature: Kickoff assigns lanes without a re-init

  @paths
  Scenario: Init computes lanes from the item files when there is no waves.json
    Given a fixture repo with items STORY-906-01 (one small file) and STORY-906-02 (several subsystems) in .cleargate/delivery/pending-sync
    And no .cleargate/sprint-runs/SPRINT-99/plans/waves.json
    When init_sprint.mjs SPRINT-99 --stories STORY-906-01,STORY-906-02 runs
    Then state.json holds the lane assign_lane.mjs computes for each item
    And each item has lane_assigned_by "assign-lane-script"

  @rules
  Scenario: A waves.json still wins
    Given the same fixture and a plans/waves.json that assigns STORY-906-01 the lane "runtime"
    When init_sprint.mjs SPRINT-99 --stories STORY-906-01,STORY-906-02 runs
    Then STORY-906-01 has lane "runtime" from waves.json
    And no lane is computed from the item files

  @data
  Scenario Outline: A §2.4 table lane is judged against the computed floor
    Given no waves.json, an item whose computed lane is "<floor>" and a §2.4 table row that gives it "<table>"
    When init_sprint.mjs runs
    Then the item has lane "<result>"
    And a WARN line is printed only when the table lane is below the floor

    Examples:
      | floor    | table    | result   |
      | standard | fast     | standard |
      | standard | runtime  | runtime  |
      | fast     | standard | standard |

  @paths
  Scenario: The archived story records the lane that ran
    Given STORY-906-03 has frontmatter lane "standard" and state.json holds lane "runtime" and state "Done"
    When the close reconciler flips and archives it
    Then the archived file has lane "runtime"
    And a story file without a lane key does not gain one

  @interfaces
  Scenario: The playbook gives the command and the raise without a re-init
    Given the canonical sprint-execution SKILL.md
    Then A.3 shows "cleargate sprint init SPRINT-NN --stories" with the work-item ids
    And A.4 ends with the update_state.mjs --lane command and says never to re-run init with --force
    And the generated core .agents SKILL.md carries the same text
```

### 2.2 Verification Steps (Manual)
- [x] Goal check (d) run 3 (both layouts): kickoff shows lanes fast, standard, runtime, standard with no `init_sprint.mjs --force` in the log.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/assign_lane.mjs`, `cleargate-cli/src/lib/lifecycle-reconcile.ts`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/test/scripts/init-sprint-lanes-from-items.red.integration.node.test.ts`, `cleargate-cli/test/lib/lifecycle-reconcile-lane.red.node.test.ts`, `cleargate-cli/test/docs/sprint-skill-a3-a4-lanes.red.node.test.ts` |
| New Files Needed | Yes — the three red test files |

### 3.2 Technical Logic
1. **Why the stamp sticks.** SKILL A.3 (`SKILL.md:157-163`) runs before A.4 (`:175-219`, the SDR that writes `plans/waves.json`). `init_sprint.mjs:196-243` reads lanes only from `waves.json` or the §2.4 table; neither exists at A.3, so `:239-243` warns and `:273` stamps `standard` (`migration-default`). `segment_stages.mjs:95-101` `laneOf` returns the state lane before the plan lane, so a later `waves.json` never reaches the runner.
2. **Compute at init (`init_sprint.mjs`).** Only when `waves.json` is absent: for each id, find the item file in `pending-sync` or `archive` with `matchesId` (as `seal_red.mjs:56-65` does), call `assignLaneForFile`, stamp `assign-lane-script`. Feed the result as the floor into the raise-never-lower block (`:256-272`) so a §2.4 lane is raised, never lowered, with the same WARN text. No file found: today's path.
3. **Export (`assign_lane.mjs:155-168`).** `assignLaneForFile(file)` returns `{ id, lane, signals, reason }` or `null`; `assign()` calls it.
4. **Back-sync (`lifecycle-reconcile.ts:921-925`).** In `reconcileCurrentSprintStories`, where it sets `status`/`approved` and archives, also rewrite an existing `lane:` key from `state.json` when the state lane is one of the valid lanes. `templates/story.md:82` ships `lane: "standard"`; nothing reads a story's frontmatter lane, so the archived record had kept it (run 1 STORY-001-03 ran `runtime`).
5. **SKILL.** A.3 command at `:160` (it shows `node .cleargate/scripts/init_sprint.mjs SPRINT-NN`, which exits 2 without `--stories`, `init_sprint.mjs:132-133`; `cli.ts:398` makes `--stories` required for `cleargate sprint init`) and the lane paragraph; A.4 tail. Then `npm run gen:codex` and `npm run prebuild`.
6. **Upstream and merge.** Base cli `main` bf21e96. STORY-066-17 edits the adjacent A.3 `.active` paragraph and integrates `main` after this merge (rule 15: owner region wins, `npm run gen:codex`).

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `init_sprint.mjs <SPRINT-ID> --stories <ids>` (state.json) | CLI | None | unchanged | `state.json` stories carry `lane` and `lane_assigned_by: 'assign-lane-script'` when computed; `assignLaneForFile(file)` is an additive export |

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-46/plans/STORY-066-16.md` (D-1..D-11 ratified 2026-11-15, plus orchestrator amendment D-12; the plan governs).

- [x] QA-Red (e88d31b, scan clean): I1–I4, L1–L2 and U1–U2 in the three §3.1 red files; one seal -> Scenarios 1-5
- [x] `assign_lane.mjs`: `assignLaneForFile` export (null, never exits); `assign()` delegates and keeps its CLI messages; header -> Requirement 2
- [x] `init_sprint.mjs`: imports, `findItemFile`, compute block when `waves.json` does not exist (feeds `laneSignals`), `Lanes:` stdout line, header/comment -> Requirement 1
- [x] `lifecycle-reconcile.ts`: `LANE_NAMES`, `readFrontmatterLane`, the lane step before the archive move (existing key, lane-name value, differs), widened cast at `:881`, JSDoc line -> Requirement 4
- [x] SKILL A.3 (`:160`, `:163`, `:165`), the A.4 tail after `:219` and the D-12 note clause; `npm run gen:codex`; `npm run prebuild` -> Requirement 3
- [x] Commands 1–6 (typecheck, the reds, a worktree `dist` build, the existing init/assign-lane/reconciler/SKILL/Codex tests, `cr078_init.test.sh`, `test_assert_story_files.sh`) -> all
- [x] Proof P1–P4 into `evidence/STORY-066-16/kickoff-lanes.txt`; dist probe of B11 -> Scenarios 1, 2, 4
- [x] After 20 and 19 merge: integrate `main`, regenerate the Codex SKILL (never hand-merge), re-run, QA-Verify on the integrated tree (rule 15) -> all

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Integration (`init_sprint.mjs` on a fixture repo), Unit (`assignLaneForFile`, reconciler lane line, SKILL text), Release gate (Goal check (d)).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | `assignLaneForFile` returns the lane and never exits; the SKILL A.3/A.4 text and its Codex render. |
| Integration tests | 4 | `*.red.integration.node.test.ts`: lanes computed; waves.json wins; the three table/floor rows; the reconciler writes the state lane and adds no key. |
| E2E / acceptance tests | 5 | One per Gherkin scenario. |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] `cr078_init.test.sh` assertions 3c/3d/4c, `assign-lane-init-sprint.red.integration`, `init-sprint-waves-v2.red.integration`, `assign-lane.red` and `close-sprint-backsync` stay green; `build-codex-payload.mjs --check` passes.
- [x] Goal check (d) run 3 passes on an RC that includes this story.
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs:196-243` — lane ingest from `waves.json` or the §2.4 table; `:239-243` the warning, `:256-272` raise-never-lower, `:273` the `standard` / `migration-default` stamp.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/assign_lane.mjs:155-168` — `assign()`, the place for `assignLaneForFile`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/lib/work-item-id.mjs` — `matchesId`, as `seal_red.mjs:56-65` uses it.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs:95-101` — `laneOf` (state before plan); not changed.
- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:921-925` — close 2.6d sets `status`/`approved` and archives.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:157-219` — A.3 init and A.4 SDR.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/test/cr078_init.test.sh`, `cleargate-cli/test/scripts/assign-lane-init-sprint.red.integration.node.test.ts`, `cleargate-cli/test/scripts/init-sprint-waves-v2.red.integration.node.test.ts`, `cleargate-cli/test/scripts/assign-lane.red.node.test.ts`, `cleargate-cli/test/scripts/segment-stages.red.node.test.ts`, `cleargate-cli/test/lib/close-sprint-backsync.node.test.ts` — tests that pin today's behaviour; QA-Red confirms each stays green (the first four have no item files or have `waves.json`; check whether the backsync fixtures carry `lane:`).
- **Coverage of this requirement:** partial. `assign_lane.mjs` computes lanes and `init_sprint.mjs` reads them from other sources; the work joins them and adds the back-sync.

## Prior work

- [[EPIC-066]] — parent; Goal check (d) is its release gate.
- [[CR-078]] — lane assignment by script and the init ingest this story extends.
- [[BUG-102]], [[BUG-090]] — earlier lane-assignment fixes; adjacent.
- Sandbox findings B2 (run 1), S18 and S19 (run 2), B11 (run 1): the init-before-SDR order, the missing `--stories`, the archived lane.
- cleargate-wiki-query 2026-11-15: nothing on computing lanes at init without `waves.json`.

## Why not simpler?

- **Smallest existing surface that could carry this:** `init_sprint.mjs`'s lane block, an additive export of `assign_lane.mjs`, and one line in the reconciler; no new script.
- **Why isn't extension / parameterization / config sufficient?** The orchestrators' workaround, `init_sprint.mjs --force` after the SDR, is the thing the bar forbids, and moving init after the SDR breaks what the SDR needs (`sprint-context.md`, `.active`). No flag reaches the computation; it has to run in init.

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

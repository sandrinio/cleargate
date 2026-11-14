---
story_id: STORY-066-05
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: "sandrinio"
approved_at: "2026-11-15T09:00:00Z"
ambiguity: 🟢 Low
context_source: "EPIC-066 (approved 2026-11-14, §6 Q3 lane signals and raise-not-lower) / verified against canonical cleargate-cli main: architect.md Lane Classification, state.schema.json, update_state.mjs, init_sprint.mjs, collision_surface.sh"
actor: Orchestrator
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
area: sprint-execution,scripts
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:47.768Z
updated_at: 2026-11-14T19:47:47.768Z
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
  last_gate_check: 2026-11-14T19:55:13Z
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

# STORY-066-05: Computed lanes
**Complexity:** L3 — one new script (`assign_lane.mjs`), `runtime` added as a real lane value in three scripts and the schema, a raise-not-lower rule in `init_sprint.mjs`, and the Architect rubric, enforcement §9 and the plan template rewritten around the computed lane.

## 1. The Spec (The Contract)

### 1.1 User Story
As the sprint Orchestrator, I want a script to compute each item's lane from its own risk signals, so that the lane is decided the same way every time, is explained, and the Architect can only make an item safer, never riskier.

### 1.2 Detailed Requirements
- **Requirement 1: `assign_lane.mjs`.** New `cleargate-cli/scaffold/core/.cleargate/scripts/assign_lane.mjs`. Usage: `node assign_lane.mjs <item-file>... [--write <waves.json>]`. Prints one JSON array on stdout, one object per item: `{ id, lane, signals: { scenarios, subsystems, ui_surface, forbidden_surface, new_dependency, proof_tier }, reason }`. `reason` is one sentence naming the signal that decided the lane (for example `ui_surface: admin/src/routes/+page.svelte`).
- **Requirement 2: the rules** (epic §6 Q3, applied in this order, first match wins):
  1. `runtime` when `ui_surface` is true, or `subsystems >= 2`, or `proof_tier` is `container` or `live`.
  2. `fast` when `scenarios <= 2` AND `subsystems == 1` AND `ui_surface` false AND `forbidden_surface` false AND `new_dependency` false AND `proof_tier` is absent or `unit`.
  3. Otherwise `standard`. This includes `subsystems == 0`: an item with no parsable file surface cannot be proven small, so it is never `fast` (the over-serialize direction of `collision_surface.sh`'s fail-safe contract).
- **Requirement 3: how each signal is computed from the item file** (the decision this story owns; the code uses no judgement, only the file):
  - `scenarios`: the number of lines matching `^\s*Scenario( Outline)?:` inside fenced code blocks tagged `gherkin`. A Scenario Outline counts once. A bug or CR with no Gherkin block gives 0.
  - **surface**: the file paths `collision_surface.sh <item-file>` prints on stdout (spawned with `bash`, located next to `assign_lane.mjs`). Reusing it keeps one parser for "what files does this item touch" (the §3.1 table, the Bug/CR sandbox bullets, multi-column cells). Its stderr annotations are ignored. Test files are dropped from the surface before the signals below (a path with a `test`, `tests`, `__tests__` or `fixtures` directory segment, or a `.test.`, `.spec.` or `_test.` file name), because a test always accompanies its code and must not count as a second subsystem.
  - `subsystems`: the number of distinct keys, where a path's key is its first two directory segments (`cleargate-cli/scaffold/core/x.mjs` is `cleargate-cli/scaffold`; `src/api/a.ts` is `src/api`; `src/a.ts` is `src`; a root file is `.`). The key is deliberately path-shaped so it works on any repository layout (Go `internal/<pkg>`, `cmd/<name>`; a monorepo's `<package>/src`); no directory name is hard-coded.
  - `ui_surface`: true when any surface path has the extension `.svelte`, `.vue`, `.tsx`, `.jsx`, `.html`, `.htm`, `.css`, `.scss`, `.sass` or `.less`, or has a directory segment named `ui`, `components`, `pages`, `views`, `frontend`, `static` or `public`. Documentation `.md` files never count.
  - `forbidden_surface`: true when any surface path matches the forbidden-surface patterns held as one exported constant `FORBIDDEN_SURFACE_PATTERNS` in `assign_lane.mjs`, seeded from the rubric table in `architect.md` (schema/migration, auth, runtime config, adapter surface, scaffold manifest, security code): `(^|/)(migrations?|db|auth|security)/`, `(^|/)[^/]*(schema|migration)[^/]*\.(sql|prisma)$`, `(^|/)auth-[^/]*$`, `(^|/)(cleargate\.config\.json|config\.ts)$`, `(^|/)adapters/`, `(^|/)MANIFEST\.json$`, `(^|/)(token|invite)[^/]*\.(ts|js|mjs)$`.
  - `new_dependency`: true when any surface path is a dependency manifest (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `requirements.txt`, `pom.xml`, `Gemfile`, `build.gradle`). Lock files do not count. The signal over-reports on a pin-only edit; the failure direction is a higher lane, which is the safe one.
  - `proof_tier`: the item's frontmatter `proof_tier:` value (`unit`, `container` or `live`), else `null`. Any other value is read as "not `unit`", which blocks `fast`. [[EPIC-065]] introduces the field; this story reads it when present and works without it.
- **Requirement 4: `--write <waves.json>`.** For each item, set `lane_assignments[id]` and `lane_signals[id] = { lane, signals, reason }` (`lane` here is the computed lane, the floor). If `lane_assignments[id]` already holds a lane higher than the computed one (an Architect raise), keep the higher value in `lane_assignments` and still record the computed lane in `lane_signals`. The file's other keys are preserved byte for byte in structure; a missing file is created with just these two maps.
- **Requirement 5: `runtime` is a real lane value.** `state.schema.json` `lane` enum becomes `["standard", "fast", "runtime"]`; `lane_assigned_by` enum gains `assign-lane-script` and `sdr-lane-audit` (the latter is already written by `init_sprint.mjs:245` but missing from the enum today). `update_state.mjs --lane` accepts `runtime`. The `init_sprint.mjs` §2.4 fallback regex accepts `runtime`. `constants.mjs` header comment lists the new values.
- **Requirement 6: raise, never lower, in `init_sprint.mjs`.** When `waves.json` carries `lane_signals[id].lane` (the computed floor), the lane written to `state.json` is `lane_assignments[id]` if its rank is equal to or above the floor, else the floor, with a `WARN: <id> lane lowered to <x> refused; computed <y>` line on stderr. Rank is `fast` < `standard` < `runtime`. `lane_assigned_by` is `assign-lane-script` when the result equals the floor, `architect` when it is above it. A lane carried over by `--force --preserve-bounces` still wins as today (`init_sprint.mjs:244`), so a recorded demotion and a `human-override` are kept. A `lane_assignments` entry that is not one of the three lane names is treated as `standard` with a WARN. With no `lane_signals` in `waves.json` (a plan written before this release) behaviour is unchanged. The owner lowers or raises a lane at any time with `update_state.mjs <ID> --lane <x>`, which records `human-override`.
- **Requirement 7: the rubric is replaced.** In `architect.md` the "Lane Classification" section (lines 173-196) is replaced by a short section: lanes are computed by `assign_lane.mjs`, the Architect may raise a lane with a one-line reason (≤80 chars) and never lowers one, and the Sprint Plan §2.4 Lane Audit lists every item with its computed lane and signals. Item 4 of the Sprint Design Review list (`architect.md:99`) is reworded to match. The same edits go into `scaffold/hosts/codex/.codex/agents/architect.toml` (lines 99 and 171-193). `cleargate-enforcement.md` §9 is rewritten around the computed lane (signals, rules, raise-not-lower, human override, demotion mechanics kept). `Sprint Plan Template.md` §2.4 becomes `| Story | Lane | Signals | Raised by Architect (reason ≤80 chars) |` with the first two columns unchanged so the `init_sprint.mjs` fallback still reads it. The `lane` line in `templates/story.md` (line 47) says the lane is computed.

### 1.3 Out of Scope
- Any change to `SKILL.md`, both `dispatch-serial.md` files, `architect-synth.md` or `architect-reader.md`. The call that runs `assign_lane.mjs --write` at the Sprint Design Review step is wired by [[STORY-066-12]]; until then the Architect or Orchestrator may run it by hand.
- What a lane does at run time (`stagesFor`, [[STORY-066-06]]) and the lane-demotion trigger in `merge_story.mjs` ([[STORY-066-08]]).
- The `--defect-in` flag and rework routing ([[STORY-066-10]]). `--lane-demote` is unchanged.
- Defining `proof_tier` and its allowed values ([[EPIC-065]]).
- Using `expected_bounce_exposure`, `complexity_label` or diff size as signals. The epic names six signals; the old size cap and bounce checks are dropped, not carried.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** `architect-synth.md:167` still shows the synth writing `lane_assignments` into `waves.json`, and this story does not edit it. Which write wins?
- **Recommended:** Order decides. The Orchestrator runs `assign_lane.mjs --write` after the synth writes `waves.json`; `--write` keeps a synth-written lane only if it is higher than the computed one (Requirement 4). So a synth value can raise a lane and never lower it. [[STORY-066-12]] puts the call in the Sprint Design Review step. No conflict with the contract.
- **Human decision:** Accepted per EPIC-066 §6 (owner, 2026-11-14): lane signals as listed, Architect raises only.

- **Question:** A Scenario Outline counts once, so an item with one Outline and many Examples rows can be `fast`. Is that intended?
- **Recommended:** Yes. The epic counts acceptance scenarios, and an Outline is one scenario with data rows. A risky data set shows up in the other signals.
- **Human decision:** Accepted.

### 1.5 Risks
- **A two-segment path key calls two directories of one package two subsystems** (for example `cleargate-cli/scaffold` and `cleargate-cli/src`). That raises a lane to `runtime`, the safe direction. If it proves too eager in practice the key depth is one constant. Mitigation: the signals are printed, so a wrong lane is visible and the owner overrides with `--lane`.
- **`collision_surface.sh` returns nothing for an item without a file table.** Handled: `subsystems == 0` is `standard`, never `fast`.
- **State written before this release has no `runtime` and no `lane_signals`.** Handled by Requirement 6: no signals means today's behaviour; an unknown lane value reads as `standard`.
- **Existing tests that pin the enum** (`test_dogfood_lane_fast.node.test.ts`, `cr078_init.test.sh`) may assert `standard | fast`; update them in this story.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Fast, runtime and standard are three successful outcomes; the happy path is `fast`, the data table covers the rest. |
| Interfaces | T | Two surfaces expose the behaviour: the `assign_lane.mjs` CLI with `--write`, and `init_sprint.mjs` reading the result. |
| Data | T | The lane depends on the shape of the item: scenario count, surface paths, `proof_tier`. One Scenario Outline. |
| Rules | T | Raise-not-lower is a rule; one scenario breaks it, one obeys it. |

```gherkin
Feature: Computed lanes

  @paths
  Scenario: A small item is assigned the fast lane with its reasons
    Given BUG-A has one acceptance scenario and a surface of one source file and its test in one directory
    And BUG-A touches no forbidden path, no dependency manifest and no UI file
    When node assign_lane.mjs runs on BUG-A
    Then it prints lane "fast"
    And the signals object shows scenarios 1, subsystems 1, ui_surface false, forbidden_surface false, new_dependency false, proof_tier null
    And the reason names the rule that decided it

  @data
  Scenario Outline: The signals decide the lane
    Given an item with <scenarios> scenarios, a surface of <surface> and proof_tier <tier>
    When node assign_lane.mjs runs on it
    Then it prints lane "<lane>"

    Examples:
      | scenarios | surface                                              | tier      | lane     |
      | 2         | one file in internal/seccheck                        | unit      | fast     |
      | 3         | one file in internal/seccheck                        | none      | standard |
      | 1         | mcp/src/db/schema.sql                                | none      | standard |
      | 1         | package.json                                         | none      | standard |
      | 1         | no parsable file table                               | none      | standard |
      | 1         | admin/src/routes/+page.svelte                        | none      | runtime  |
      | 1         | files in src/api and in internal/store               | none      | runtime  |
      | 1         | one file in internal/seccheck                        | live      | runtime  |

  @interfaces
  Scenario: --write records the computed lane and keeps a higher existing one
    Given a waves.json whose lane_assignments already hold "runtime" for STORY-B
    And assign_lane.mjs computes "standard" for STORY-B and "fast" for BUG-A
    When node assign_lane.mjs BUG-A.md STORY-B.md --write waves.json runs
    Then lane_assignments is "fast" for BUG-A and "runtime" for STORY-B
    And lane_signals holds the computed lane, the signals and the reason for both
    And no other key of waves.json is changed

  @rules
  Scenario: init_sprint refuses to lower a computed lane and accepts a raise
    Given waves.json lane_signals compute "standard" for STORY-E and for STORY-F
    And lane_assignments set STORY-E to "fast" and STORY-F to "runtime"
    When init_sprint.mjs initialises the sprint
    Then state.json holds lane "standard" with lane_assigned_by "assign-lane-script" for STORY-E
    And stderr carries a WARN that the lowering was refused
    And state.json holds lane "runtime" with lane_assigned_by "architect" for STORY-F
    And update_state.mjs STORY-E --lane fast afterwards records lane "fast" with lane_assigned_by "human-override"

  Scenario: Bad input is rejected without writing anything
    Given an item path that does not exist
    When node assign_lane.mjs runs on it
    Then it exits 2 with a usage message on stderr and nothing on stdout
    And update_state.mjs STORY-E --lane bogus exits 2 and names "standard", "fast" and "runtime" as the allowed values
```

### 2.2 Verification Steps (Manual)
- [ ] Run `assign_lane.mjs` on this story's own file and on [[STORY-066-06]]; read the printed signals and confirm each matches the §3.1 table of that file.
- [ ] Run it on a Go-layout fixture item (no `package.json`) and confirm `internal/<pkg>` paths give distinct subsystems.
- [ ] Open `architect.md` and `architect.toml` and confirm the seven-check rubric is gone and the raise-only rule reads the same in both.
- [ ] Initialise a sprint from a pre-release `waves.json` (no `lane_signals`) and confirm lanes come out as before.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/assign_lane.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/state.schema.json`, `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/constants.mjs` |
| Prompts and docs | `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect.toml`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md`, `cleargate-cli/scaffold/core/.cleargate/templates/Sprint Plan Template.md`, `cleargate-cli/scaffold/core/.cleargate/templates/story.md` |
| Tests | `cleargate-cli/test/scripts/assign-lane.node.test.ts`, `cleargate-cli/test/scripts/assign-lane-init-sprint.integration.node.test.ts`, `cleargate-cli/test/scripts/test_dogfood_lane_fast.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/scaffold/core/.cleargate/scripts/assign_lane.mjs`, `cleargate-cli/test/scripts/assign-lane.node.test.ts`, `cleargate-cli/test/scripts/assign-lane-init-sprint.integration.node.test.ts` |

### 3.2 Technical Logic
- `assign_lane.mjs` exports `FORBIDDEN_SURFACE_PATTERNS`, `computeSignals(itemText, surfacePaths)` and `laneFor(signals)` (pure, unit-tested) and a CLI wrapper. Resolve its own directory with `fileURLToPath(import.meta.url)`, run `spawnSync('bash', [collision_surface.sh, file], { env: { ...process.env, CLEARGATE_REPO_ROOT } })` and read stdout lines. Take the id with `extractWorkItemIds` from `lib/work-item-id.mjs` applied to the file's base name (never a new inline id regex; `no-inline-id-regex.node.test.ts` enforces this).
- Frontmatter `proof_tier` is read with a plain `^proof_tier:\s*"?(\w+)"?` match inside the leading `---` block; do not add a YAML dependency.
- `--write` reads waves.json (create `{}` if absent), updates only `lane_assignments` and `lane_signals`, and writes with two-space indent and a trailing newline.
- `init_sprint.mjs` change sits at lines 191-256 (CR-078 block). Add a `RANK = { fast: 0, standard: 1, runtime: 2 }` and a small `resolveLane({ requested, floor })`. Read `wavesData.lane_signals` beside `lane_assignments` (line 204). Unknown requested value: `standard` plus WARN. Keep `carry.lane ?? ...` precedence.
- `update_state.mjs:360-363` accepts the three values and the error text names them. `state-events.mjs:250` already writes `human-override` for any lane value; no change.
- Prompts: keep the two Claude and Codex edits textually identical apart from format. Do not touch `architect-synth.md`.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `assign_lane.mjs <item-file>... [--write <waves.json>]` | CLI | none | item markdown files | stdout JSON array of `{ id, lane, signals, reason }`; exit 0 ok, 2 usage or unreadable file |
| `waves.json` `lane_signals` | file | none | `{ "<ID>": { lane, signals, reason } }` | read by `init_sprint.mjs` as the lane floor |

## Task Breakdown

- [ ] Write `assign-lane.node.test.ts` for `computeSignals` and `laneFor` over the Outline table in §2.1, including a Go-layout fixture and the no-surface case.
- [ ] Create `assign_lane.mjs` with the signals, the three rules, the CLI and `--write` (keeps a higher existing lane).
- [ ] Add `runtime` to `state.schema.json`, `update_state.mjs --lane`, the `init_sprint.mjs` fallback regex and the `constants.mjs` comment; add the two `lane_assigned_by` values.
- [ ] Add the floor and raise-only logic to `init_sprint.mjs`; write the integration test over a fixture sprint.
- [ ] Rewrite the Lane Classification section and SDR item 4 in `architect.md` and `architect.toml`.
- [ ] Rewrite `cleargate-enforcement.md` §9, the `Sprint Plan Template.md` §2.4 table and the `story.md` lane line.
- [ ] Fix existing tests that pin the two-value enum; run `npm run typecheck` and the scripts test suite.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers EPIC-066 Testing Strategy levels Unit and Contract; journeys "Small fix" and "Risky story" (lane assignment step).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 10 | `computeSignals` per signal (6), `laneFor` per Outline row group (3), `--write` merge keeping a higher lane (1). |
| Integration tests | 2 | `init_sprint.mjs` over a fixture waves.json: refuse-lowering plus accept-raise plus pre-release plan unchanged; CLI exit 2 on a missing file. Real files in a temp dir, no mocks. |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1 (the Outline counts as one; its rows are the unit tests). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Claude and Codex architect prompts carry the same rule; `architect-synth` untouched.
- [ ] Canonical edits only; no live `.claude/` or `.cleargate/scripts` copy edited (re-sync is a sprint-close step).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:173-196` — the seven-check rubric this story replaces; its forbidden-surface table seeds `FORBIDDEN_SURFACE_PATTERNS`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md:397-410` — §9 Lane Routing, rewritten here; demotion mechanics are kept.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/collision_surface.sh:1-60` — the item-file surface parser reused for the surface signal.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/state.schema.json:104-114` — `lane` enum `standard | fast` and `lane_assigned_by` enum, both extended.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs:358-384` — `--lane` and `--lane-demote`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs:191-256` — reads `lane_assignments`, falls back to the §2.4 table; no floor today.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/state-events.mjs:249-253` — `lane` event writes `human-override`.
- **Surface:** the Sprint Plan template's §2.4 Lane Audit table (lines 112-118 of the template file) — one row per fast-lane story today.
- **Coverage of this requirement:** partial, about 25%. The lane field, its override and its demotion exist; a computed lane, `runtime`, the floor and the signal set are new.

## Prior work

- [[EPIC-066]] — parent; §6 Q3 fixes the signals and the raise-only rule.
- [[CR-024]], [[EPIC-022]] (Completed) — the lanes and the seven-check rubric replaced here.
- [[CR-078]] (Completed) — `init_sprint` reads lanes from `waves.json`; `assign_lane.mjs` becomes the writer.
- [[STORY-022-04]] (Completed) — fast-lane demotion rule, kept and unchanged here.
- [[CR-124]] (Completed) — `waves.json` `schema_version: 2`; this story adds two keys beside `lane_assignments` and leaves the schema version alone.
- [[EPIC-065]] (Draft) — owns `proof_tier`; read here when present.
- [[INITIATIVE-002]] — WS-2 decision: keep the three lane names, make `runtime` real.
- No prior work found for: computing a lane by script, a lane floor, `lane_signals`.

## Why not simpler?

- **Smallest existing surface that could carry this:** the `lane_assignments` map in `waves.json` plus the Architect's rubric in `architect.md:173-196`; loosening the rubric text would carry it.
- **Why isn't extension / parameterization / config sufficient?** The rubric is prose that a model applies by reading, which is why one item in 77 reached the fast lane (EPIC-066 §1), and it cannot make `runtime` a state value or stop a later edit from lowering a lane. A script applies the same rules to the same file every time, prints why, and gives `init_sprint.mjs` a floor to enforce. The surface parser already exists and is reused, so the new code is the signal rules and the floor.

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

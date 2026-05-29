---
story_id: STORY-070-01
parent_epic_ref: CR-070
parent_cleargate_id: CR-070
sprint_cleargate_id: SPRINT-30
carry_over: false
area: protocol/sprint-execution,schema,docs
status: "Completed"
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
context_source: |
  Decomposed from CR-070 at SPRINT-30 SDR 2026-05-19. CR-070 is wide-blast
  but mechanically simple: purge `execution_mode` vocabulary from every
  surface, bump state.json schema_version 2 → 3 with a strip-on-read
  migrator, add one global env-var escape hatch `CLEARGATE_ADVISORY=1`.

  Open Question resolutions adopted from CR-070 §0.5:
  - Q1 (escape-hatch shape): boolean `CLEARGATE_ADVISORY=1`. Granular
    per-gate disable is over-engineering.
  - Q2 (archived files): leave them alone for archaeological accuracy.
  - Q3 (state.json schema): drop the property.
  - Q4 (schema bump): yes, schema_version 2 → 3 with strip-on-read
    migrator on existing state.json.

  Mechanically this is purge + one new env-var-reading util + one schema
  migrator. Three-site dogfood-mirror discipline applies to the
  cleargate-planning/CLAUDE.md edit (canonical → payload via
  `npm run prebuild` → live via manual port).

  Test SPRINT-28's archived state.json against the migrator BEFORE main
  merge — fixture-form first per Sprint Plan §2.3 Shared-Surface Warning.
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T16:07:08Z
stamp_error: no ledger rows for work_item_id STORY-070-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T16:07:08Z
  sessions: []
---

# STORY-070-01: Collapse `execution_mode` to single always-enforced behavior + schema v3 migrator + advisory env hatch

**Complexity:** L2 — multi-file purge (~12 surfaces) + one new util + one schema migrator + grep-gate npm script. Mechanically simple; coordination cost from the three-site dogfood mirror.

## 1. The Spec

### 1.1 User Story

As a ClearGate operator (and as the framework itself), I want exactly one sprint-execution behavior — always enforce the gates — so that the framework's vocabulary stops carrying a confusing dual-mode concept (`v1` / `v2`) that leaks implementation history into user-facing surface. The framework's value proposition IS the gates; an "advisory" mode that lets the team ignore them is "running without ClearGate while pretending to use it."

### 1.2 Detailed Requirements

1. **Drop the `execution_mode` frontmatter field** from the Sprint Plan template at `.cleargate/templates/Sprint Plan Template.md`. Remove the field line AND the multi-sentence comment block explaining when to flip modes.
2. **Bump state.json schema** from 2 → 3:
   - Edit `.cleargate/scripts/state.schema.json` — drop the `execution_mode` property; bump `schema_version.const` to 3.
   - Add a **strip-on-read migrator**: every `.mjs` script that opens a state.json (`.cleargate/scripts/close_sprint.mjs`, `.cleargate/scripts/init_sprint.mjs`, `.cleargate/scripts/update_state.mjs`, `.cleargate/scripts/validate_state.mjs`) calls one shared helper that detects `execution_mode` on read, deletes the key, bumps `schema_version` to 3, writes back atomically, and logs one line: `[migrator] STORY-070-01: stripped execution_mode from <state.json path>`.
   - Implement migrator at `.cleargate/scripts/_migrate-schema-v3.mjs` (new file) exporting `migrateStateToV3(stateObj, statePath)`.
3. **Collapse mode-branches** in `close_sprint.mjs` / `init_sprint.mjs` / `update_state.mjs` / `validate_state.mjs`:
   - Every `if (state.execution_mode === 'v2')` becomes unconditional execution of the v2 branch.
   - Every `else` (v1 advisory) branch is deleted.
   - `init_sprint.mjs` stops writing `execution_mode: "v1"` to new state.json.
4. **New util** at `cleargate-cli/src/util/gate-mode.ts` (new file):
   ```ts
   export function isAdvisory(): boolean {
     return process.env.CLEARGATE_ADVISORY === '1';
   }
   ```
5. **Wire `isAdvisory()`** into the gate-failure paths in `cleargate-cli/src/commands/sprint.ts` and `cleargate-cli/src/cli.ts`. Every existing `process.exit(<nonzero>)` on gate failure becomes:
   ```ts
   if (isAdvisory()) {
     process.stderr.write(`[advisory] ${message}\n`);
   } else {
     process.exit(<nonzero>);
   }
   ```
6. **Purge vocabulary from docs**:
   - `.cleargate/knowledge/cleargate-enforcement.md` — strip every "v1 advisory / v2 enforcing" caveat; rewrite as "always enforces"; ADD a new final subsection **"Operator Emergency Levers"** documenting `CLEARGATE_ADVISORY=1` for internal break-glass use (one paragraph).
   - `cleargate-planning/CLAUDE.md` — remove the `**Sprint mode.**` paragraph from the bounded block.
   - Run `cd cleargate-cli && npm run prebuild` to mirror canonical CLAUDE.md → npm payload.
   - Document live `/.claude/CLAUDE.md` re-sync as DoD item (manual hand-port or `cleargate init` re-run).
7. **Doctor advisory**: add a one-liner advisory in `cleargate-cli/src/commands/doctor.ts` (or the equivalent doctor entrypoint) that, when scanning pending-sync/archive sprint files, surfaces "X sprint files carry a retired `execution_mode:` field; consider removing." Does NOT auto-strip.
8. **Tests**:
   - Schema-v3 round-trip: fixture state.json with `schema_version: 2` + `execution_mode: "v1"` → after migrator → `schema_version: 3` + no `execution_mode` key.
   - Schema-v3 round-trip preserves all other fields byte-identical.
   - `CLEARGATE_ADVISORY=1` env: a gate-failing fixture produces exit 0 + stderr contains `[advisory]`.
   - Without env: same fixture produces exit nonzero.
   - Grep-gate npm script `check:no-execution-mode-vocabulary` excludes `.cleargate/delivery/archive/**` and tolerates the new "Operator Emergency Levers" subsection mentioning `CLEARGATE_ADVISORY`.
9. **Verify** the migrator does NOT corrupt SPRINT-28's archived state.json. Fixture-test against a real copy first; only THEN run against the live `.cleargate/sprint-runs/SPRINT-28/state.json` (if it carries the field).

### 1.3 Out of Scope

- Rewriting historical sprint files in `.cleargate/delivery/archive/` to drop the `execution_mode` field. They're archived; touching them creates re-ingest churn.
- Wiki re-ingest after the field is dropped from renderers. The wiki ingest hook fires on file edits; SPRINT-30's own edits will trigger re-compile of affected pages.
- Granular per-gate disable (e.g. `CLEARGATE_DISABLE_GATES=worktree,surface`). Deferred to a follow-up CR if real need surfaces.
- Updating remote PM-tool adapters. Sprint-frontmatter is local-only; remote adapters don't see `execution_mode`.

### 1.4 Open Questions

None. All four CR-070 Open Questions resolved during decomposition (see context_source).

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| Migrator corrupts SPRINT-28's archived state.json on first read | Test fixture-form against a copy of SPRINT-28's state.json BEFORE running against the live file. Migrator is read-only-then-atomic-write; rollback is `git checkout`. |
| Three-site dogfood-mirror skipped — live `/.claude/CLAUDE.md` retains `**Sprint mode.**` paragraph | DoD item explicitly requires re-running `cleargate init` against this meta-repo OR manual hand-port; verified by orchestrator visual inspection at story merge. |
| Grep-gate npm script false-positives on the new "Operator Emergency Levers" subsection mentioning `CLEARGATE_ADVISORY` | The grep targets `execution_mode` / `"v1"` / `"v2"` strings in execution-mode context — those are absent from the new env-var docs. Verify regex doesn't match the env var name. |
| Schema-v3 migrator runs simultaneously from two scripts and races on the state.json write | Shared migrator helper uses tmp+rename atomic-write idiom (same pattern as CR-067 `migrate-status-to-completed.mjs`). |
| Deleting the v1 advisory branch breaks a CI flow somewhere that relied on the silent-pass behavior | Surfaced as a real strictening — that's the intended behavior. Document in CR-070 release notes; verified absent from this repo's CI by grep audit. |

### 1.6 Existing Surfaces

- **Surface:** `.cleargate/scripts/state.schema.json` — declares the property this story drops; story bumps `schema_version` to 3.
- **Surface:** `.cleargate/scripts/close_sprint.mjs` — every mode-branch site; story collapses to unconditional.
- **Surface:** `.cleargate/scripts/init_sprint.mjs` — same; stops writing the field to new state.json.
- **Surface:** `.cleargate/scripts/update_state.mjs` — same.
- **Surface:** `.cleargate/scripts/validate_state.mjs` — same.
- **Surface:** `.cleargate/knowledge/cleargate-enforcement.md` — every advisory-vs-enforcing caveat rewritten; new "Operator Emergency Levers" subsection added.
- **Surface:** `cleargate-planning/CLAUDE.md` — Sprint-mode paragraph removed from bounded block.
- **Surface:** `cleargate-cli/templates/cleargate-planning/CLAUDE.md` — npm payload mirror auto-synced via `npm run prebuild`.
- **Surface:** `cleargate-cli/src/commands/sprint.ts` — gate-failure exit paths; story wires `isAdvisory()` check.
- **Surface:** `cleargate-cli/src/cli.ts` — top-level dispatcher; same wiring.
- **Coverage of this story's scope:** ~60% — touches many files but every change is mechanical (purge / branch-collapse / one new helper).

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** add `execution_mode: 'v2'` as a hard-coded default to `init_sprint.mjs` and leave all docs alone.
- **Why isn't extension sufficient?** That fixes the dual-mode field but leaves the vocabulary in every doc, template, and CLI message. Users still see "v1 advisory" / "v2 enforcing" caveats in `cleargate-enforcement.md` and CLAUDE.md. The whole point of the CR is the vocabulary purge, not a default-value change. Halfway purge keeps the cognitive overhead.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: collapse execution_mode vocabulary + schema v3 + advisory env hatch

  Scenario: Sprint Plan template no longer declares execution_mode
    Given the file ".cleargate/templates/Sprint Plan Template.md"
    When I grep for "^execution_mode:" in it
    Then no matches are produced

  Scenario: state.schema.json v3 omits execution_mode
    Given the file ".cleargate/scripts/state.schema.json"
    When I parse the JSON
    Then properties.execution_mode is undefined
    And properties.schema_version.const equals 3

  Scenario: migrator strips field from legacy state.json
    Given a fixture state.json with schema_version 2 and execution_mode "v1"
    When close_sprint.mjs reads it
    Then the written-back state.json has schema_version 3
    And no execution_mode key remains
    And all other fields are byte-identical
    And stderr contains "[migrator] STORY-070-01: stripped execution_mode"

  Scenario: CLEARGATE_ADVISORY=1 turns gate failure into warning
    Given a fixture sprint with a known-failing gate
    And CLEARGATE_ADVISORY=1 is set in the environment
    When I run `cleargate sprint preflight <sprint>`
    Then the command exits 0
    And stderr contains "[advisory]"

  Scenario: gate failure remains fatal without the env var
    Given the same fixture sprint
    And CLEARGATE_ADVISORY is unset
    When I run `cleargate sprint preflight <sprint>`
    Then the command exits non-zero

  Scenario: doctor surfaces retired-field advisory
    Given a pending-sync sprint file with execution_mode in frontmatter
    When I run `cleargate doctor`
    Then doctor output contains the retired-field advisory

  Scenario: grep-gate npm script catches regression
    Given the codebase post-purge
    When I run `npm run check:no-execution-mode-vocabulary`
    Then it exits 0

  Scenario: SPRINT-28 archived state.json round-trips safely
    Given a copy of `.cleargate/sprint-runs/SPRINT-28/state.json`
    When the migrator runs against it
    Then no fields other than execution_mode and schema_version change
    And the file remains valid against state.schema.json v3
```

### 2.2 Verification Steps (Manual)

- [ ] `grep -rn "execution_mode\|\"v1\"\|\"v2\"" .cleargate/scripts/ .cleargate/templates/ .cleargate/knowledge/ cleargate-planning/CLAUDE.md cleargate-cli/src/` — only matches in `.cleargate/delivery/archive/` and the new "Operator Emergency Levers" subsection.
- [ ] After merge, re-run `cleargate init` against this meta-repo. Read live `/.claude/CLAUDE.md` — confirm `**Sprint mode.**` paragraph is gone.
- [ ] Set `CLEARGATE_ADVISORY=1` and trip a gate — observe `[advisory]` stderr line + exit 0.
- [ ] Unset and re-trip — observe nonzero exit.
- [ ] `cd cleargate-cli && npm test && npm run check:no-execution-mode-vocabulary` green.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/scripts/_migrate-schema-v3.mjs` (NEW) |
| Schema File | `.cleargate/scripts/state.schema.json` |
| Script Files | `.cleargate/scripts/close_sprint.mjs`, `.cleargate/scripts/init_sprint.mjs`, `.cleargate/scripts/update_state.mjs`, `.cleargate/scripts/validate_state.mjs` |
| New Util | `cleargate-cli/src/util/gate-mode.ts` (NEW) |
| CLI Wiring | `cleargate-cli/src/commands/sprint.ts`, `cleargate-cli/src/cli.ts`, `cleargate-cli/src/commands/doctor.ts` |
| Doc Files | `.cleargate/knowledge/cleargate-enforcement.md`, `cleargate-planning/CLAUDE.md` |
| Template File | The sprint plan template under `.cleargate/templates/` (path contains a space — file is `Sprint Plan Template.md`) |
| Test Files | `cleargate-cli/test/util/gate-mode.node.test.ts` (NEW), `cleargate-cli/test/scripts/migrate-schema-v3.node.test.ts` (NEW) |
| Fixtures | inline in test files (tmpdir-built per case) |
| New Files Needed | Yes — `_migrate-schema-v3.mjs`, `gate-mode.ts`, and the two test files |

### 3.2 Technical Logic

1. **Schema bump.** Open `.cleargate/scripts/state.schema.json`. Remove `properties.execution_mode`. Bump `properties.schema_version.const` to `3`. Remove from `required` array if present.
2. **Migrator helper.** Create `.cleargate/scripts/_migrate-schema-v3.mjs`:
   ```js
   export function migrateStateToV3(state, statePath) {
     let changed = false;
     if ('execution_mode' in state) {
       delete state.execution_mode;
       changed = true;
     }
     if (state.schema_version !== 3) {
       state.schema_version = 3;
       changed = true;
     }
     if (changed) {
       process.stderr.write(`[migrator] STORY-070-01: stripped execution_mode from ${statePath}\n`);
     }
     return { state, changed };
   }
   ```
   Add atomic write via tmp+rename when callers persist.
3. **Wire migrator** into the four scripts. Each script that does `JSON.parse(readFileSync(statePath))` now calls `migrateStateToV3(state, statePath)` right after the parse. If `changed`, write back atomically via tmp+rename before proceeding.
4. **Collapse branches.** In each of the four scripts, search for `execution_mode === 'v2'` and `execution_mode === 'v1'`. Replace with unconditional execution of the v2 path. Delete the v1 (advisory) branches entirely.
5. **`init_sprint.mjs`**: remove the line that writes `execution_mode: "v1"` to new state.json.
6. **Env-hatch util.** Create `cleargate-cli/src/util/gate-mode.ts` per §1.2.4.
7. **Wire into CLI gate-failure exits.** In `cleargate-cli/src/commands/sprint.ts` + `cleargate-cli/src/cli.ts`, wrap every `process.exit(<nonzero>)` that fires on gate failure with the `isAdvisory()` check.
8. **Doctor advisory.** In `cleargate-cli/src/commands/doctor.ts`, add a check that scans pending-sync sprint frontmatter for the retired field and prints the advisory.
9. **Doc purge.** Edit `.cleargate/knowledge/cleargate-enforcement.md` — rewrite every "v1 advisory / v2 enforcing" caveat as "always enforces"; add the new "Operator Emergency Levers" subsection at the file end.
10. **CLAUDE.md edit.** Edit `cleargate-planning/CLAUDE.md` — locate the bounded block's `**Sprint mode.**` paragraph and delete it. Run `cd cleargate-cli && npm run prebuild` to mirror to the npm payload.
11. **Sprint Plan template.** Edit the sprint plan template in `.cleargate/templates/` — drop the field line and the explanatory comment block. (File path contains a space; cite in prose.)
12. **Grep-gate.** Add to `cleargate-cli/package.json`: `"check:no-execution-mode-vocabulary": "! grep -rn 'execution_mode\\|\"v1\"\\|\"v2\"' --exclude-dir=archive --exclude-dir=node_modules ../.cleargate/ ../cleargate-planning/ src/"`. Tune the exact path list to match the repo layout.

### 3.3 API Contract

- New env var: `CLEARGATE_ADVISORY=1` — internal break-glass lever; downgrades all gate failures from hard exit to stderr warning. Documented only in the new "Operator Emergency Levers" subsection.
- New util export: `isAdvisory(): boolean` from `cleargate-cli/src/util/gate-mode.ts`.
- Migrator export: `migrateStateToV3(state, statePath)` from `.cleargate/scripts/_migrate-schema-v3.mjs`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit — migrator round-trip | 3 | (a) field stripped, (b) other fields byte-identical, (c) no-op when field absent |
| Unit — `isAdvisory()` | 2 | with and without env var |
| Integration — gate failure with advisory env | 1 | Exit 0 + `[advisory]` stderr |
| Integration — gate failure without env | 1 | Exit non-zero |
| Integration — SPRINT-28 state.json round-trip | 1 | Real fixture copy; no corruption |
| Script gate | 1 | `npm run check:no-execution-mode-vocabulary` exits 0 |

### 4.2 Definition of Done

- [ ] `.cleargate/scripts/state.schema.json` carries `schema_version: 3` and no `execution_mode` property.
- [ ] `.cleargate/scripts/_migrate-schema-v3.mjs` exists and is consumed by the four state-reading scripts.
- [ ] All four scripts have v1/v2 branches collapsed.
- [ ] `cleargate-cli/src/util/gate-mode.ts` exists; `isAdvisory()` wired into gate-failure exits in sprint.ts + cli.ts.
- [ ] `.cleargate/knowledge/cleargate-enforcement.md` rewritten; "Operator Emergency Levers" subsection present.
- [ ] `cleargate-planning/CLAUDE.md` `**Sprint mode.**` paragraph removed.
- [ ] `npm run prebuild` re-mirrored CLAUDE.md to the npm payload.
- [ ] Live `/.claude/CLAUDE.md` re-synced (manual hand-port OR `cleargate init` re-run); orchestrator visually confirms.
- [ ] Sprint plan template (path with space, under `.cleargate/templates/`) no longer declares the field or its explanatory comment block.
- [ ] All eight Gherkin scenarios from §2.1 covered by tests.
- [ ] `npm run typecheck` + `npm test` + `npm run check:no-execution-mode-vocabulary` green in cleargate-cli/.
- [ ] SPRINT-28 archived state.json migrator-test passes against a real fixture copy.

## Existing Surfaces

- **Surface:** `.cleargate/scripts/state.schema.json` — declares the property this story drops.
- **Surface:** `.cleargate/scripts/close_sprint.mjs` — mode-branch sites collapsed.
- **Surface:** `.cleargate/scripts/init_sprint.mjs` — mode-branches collapsed; stops writing the field.
- **Surface:** `.cleargate/scripts/update_state.mjs` — mode-branches collapsed.
- **Surface:** `.cleargate/scripts/validate_state.mjs` — mode-branches collapsed.
- **Surface:** `.cleargate/knowledge/cleargate-enforcement.md` — advisory caveats rewritten; new lever subsection.
- **Surface:** `cleargate-planning/CLAUDE.md` — Sprint-mode paragraph removed.
- **Surface:** `cleargate-cli/src/commands/sprint.ts` — gate-failure exits wired to advisory env check.
- **Surface:** `cleargate-cli/src/cli.ts` — same.
- **Surface:** `cleargate-cli/src/commands/doctor.ts` — retired-field advisory surfaced.
- **Surface:** `cleargate-cli/templates/cleargate-planning/CLAUDE.md` — npm payload mirror, auto-synced via `npm run prebuild`.
- **Coverage of this story's scope:** ~60% — wide-blast but mechanical purge plus one new util plus one schema migrator.

## Why not simpler?

> See §1.7 above.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — all four CR-070 open questions resolved; mechanical purge + one new util + one schema migrator.

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] §1.6 Existing Surfaces cites at least one source-tree path.
- [x] §1.7 Why not simpler? has both sub-bullets answered.

---
story_id: STORY-063-05
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 story 063-05; grounded against cleargate-cli main 2026-11-12
actor: ClearGate orchestrator (the conversational agent)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
area: wiki,synthesis
db_write_set: []
deferred_verification: []
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T22:53:37Z
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
  last_stamp: 2026-11-11T23:11:58Z
  sessions:
    - session: 72e522d7-caa6-4837-81f5-8fa60f84f8b5
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-11T23:02:27Z
---

# STORY-063-05: Active-Sprint Page Reads the Real Sentinel
**Complexity:** L2 — one synthesis compiler and its two callers, reusing the existing sentinel reader.

## 1. The Spec (The Contract)

### 1.1 User Story
As the ClearGate orchestrator, I want `wiki/active-sprint.md` to name the sprint that is actually running (or say none is), so that I never plan or report against a sprint that closed months ago.

### 1.2 Detailed Requirements
- R1: "Current Sprint" comes from `.cleargate/sprint-runs/.active`, read through the existing `resolveActiveSprint` (`cleargate-cli/src/commands/sprint-file-locate.ts:101`). An absent or empty sentinel means no sprint is active. It must not fall back to `activated_at`/`completed_at` frontmatter.
- R2: when a sprint is active, the page lists each item the sprint plan names, with its `state` from `.cleargate/sprint-runs/<id>/state.json` (`stories` map). An item missing from state.json is shown as `Queued`, matching the dashboard's `deriveStoryStatus` (`cleargate-cli/src/dashboard/collect.ts:117`).
- R3: a stale sentinel (`resolveActiveSprint(...).stale === true`, i.e. it names a sprint with no plan file) renders "No active sprint" plus one warning line naming the sentinel's value, mirroring `cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh:30-44` and doctor's BUG-036 line.
- R4: "Planned Sprints" are sprint items whose raw `status` is not in `TERMINAL_STATUSES` (`cleargate-cli/src/wiki/page-schema.ts:164`) and that are not the active sprint.
- R5: "Recently Completed" lists the three most recent sprints whose status is terminal and not `Abandoned`. They are ordered by the report's `generated_at` when a report exists, else by `updated_at`, else by sprint number.
- R6: `wiki build` and `wiki ingest` produce byte-identical `active-sprint.md` for the same repo state; the existing parity test must keep passing.

### 1.3 Out of Scope
- The session brief (STORY-063-11) and any change to the dashboard (`src/dashboard/**`).
- Changing how `.active` is written (`cleargate sprint init` / close).
- Wave or milestone grouping on this page; the dashboard already shows that.

### 1.4 Open Questions

- **Question:** none open. Decisions taken from EPIC-063 §2 and the sentinel contract already shipped by BUG-036.
- **Recommended:** n/a
- **Human decision:** n/a

### 1.5 Risks

- **Risk:** the compiler becomes I/O-bound or throws when `state.json` is malformed.
- **Mitigation:** degrade the way `collect.ts` does: a missing or unparsable `state.json` shows the sprint with "state unknown" and never throws.
- **Risk:** `compile()` gains a `repoRoot` parameter, and a caller forgets to pass it.
- **Mitigation:** make the parameter required in the type signature, and keep the ingest/build parity test as the guard.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Three successful routes: no sentinel, valid sentinel, sentinel naming a completed sprint that is still running. |
| Interfaces | T | The page is written by both `wiki build` and `wiki ingest`. |
| Data | F | Sprint data shape is fixed (frontmatter + state.json); no data-type variation. |
| Rules | T | Stale-sentinel rule; terminal-status rule for planned sprints. |

```gherkin
Feature: Active-sprint page reads the real sentinel

  @paths
  Scenario: No sentinel means no active sprint
    Given .cleargate/sprint-runs/.active is absent or empty
    And sprint files SPRINT-14 and SPRINT-15 carry activated_at but status Completed
    When `cleargate wiki build` runs
    Then active-sprint.md says no sprint is active
    And SPRINT-14 and SPRINT-15 are not listed under Current or Planned

  @paths
  Scenario: A valid sentinel shows the sprint with item states
    Given .active names SPRINT-N, SPRINT-N has a plan file, and state.json lists STORY-A as Done and STORY-B as Developer
    And the SPRINT-N plan also names STORY-C, which is absent from state.json
    When `cleargate wiki build` runs
    Then Current Sprint shows SPRINT-N with STORY-A Done, STORY-B Developer and STORY-C Queued

  @rules
  Scenario: Planned sprints exclude terminal statuses
    Given sprint files with status Draft, Approved, Completed and Abandoned and no active sentinel
    When the page is compiled
    Then Planned lists only the Draft and Approved sprints

  @rules
  Scenario: Recently completed shows the last three finished sprints
    Given five Completed sprints with reports generated on different dates, and one Abandoned sprint
    When the page is compiled
    Then Recently Completed lists the three Completed sprints with the latest report generated_at, newest first
    And the Abandoned sprint is not listed

  @interfaces
  Scenario: Ingest and build agree
    Given the same repo state
    When the page is compiled once via `wiki build` and once via `wiki ingest` of a sprint file
    Then both active-sprint.md outputs are byte-identical

  @rules
  Scenario: Error — a stale sentinel is reported, not trusted
    Given .active names SPRINT-99 and no SPRINT-99 plan file exists
    When `cleargate wiki build` runs
    Then active-sprint.md says no sprint is active
    And it carries one warning line naming SPRINT-99 as a stale sentinel

  Scenario: Error — malformed state.json degrades instead of throwing
    Given .active names SPRINT-N with a plan file and state.json contains invalid JSON
    When `cleargate wiki build` runs
    Then the build exits 0 and Current Sprint shows SPRINT-N with "state unknown"
```

### 2.2 Verification Steps (Manual)
- [ ] In this repo (`.active` is a 0-byte file today), run `node cleargate-cli/dist/cli.js wiki build` and confirm `.cleargate/wiki/active-sprint.md` no longer lists SPRINT-14/15/28 as current, and Planned shows only non-terminal sprints (SPRINT-31/37/42/43 and any other Draft/Approved sprint).

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/wiki/synthesis/active-sprint.ts` |
| Related Files | `cleargate-cli/templates/synthesis/active-sprint.md`, `cleargate-cli/src/commands/wiki-build.ts`, `cleargate-cli/src/commands/wiki-ingest.ts`, `cleargate-cli/src/commands/sprint-file-locate.ts`, `cleargate-cli/src/dashboard/collect.ts` |
| New Files Needed | Yes — `cleargate-cli/test/wiki/active-sprint-sentinel.node.test.ts` |

### 3.2 Technical Logic
1. Change `compile(state, templateDir)` (`active-sprint.ts:12`) to `compile(state, repoRoot, templateDir?)`. Update both call sites: `wiki-build.ts:205` and `wiki-ingest.ts:631`.
2. Replace the partition at `active-sprint.ts:18-24`. Active comes from `resolveActiveSprint(repoRoot)`: `null` → none; `stale` → none plus a warning; otherwise the sprint ID.
3. Read `<repoRoot>/.cleargate/sprint-runs/<id>/state.json`. `collect.ts` keeps its reader private (`readStateJson`, `collect.ts:146`). Either export it, or move it into a small shared helper both modules import. Do not copy it. Map states with the exported `deriveStoryStatus` only if its labels fit; otherwise print the raw `state` string.
4. Planned: `sprints.filter(s => !TERMINAL_STATUSES.has(status) && s.id !== activeId)`. Completed: as in R5.
5. Template (`templates/synthesis/active-sprint.md`): add a `{{#stale}}` warning line and a nested item list under the current sprint. Keep the existing section headings.
6. Keep the synthesis rule: no network, no git calls, file reads only.

### 3.3 API Contract (if applicable)
n/a — internal compiler signature only (`compile(state: RawItem[], repoRoot: string, templateDir?: string): string`).

## Task Breakdown

- [ ] Write red tests for the seven §2.1 scenarios in `test/wiki/active-sprint-sentinel.node.test.ts`, using temp-dir fixtures with `.active`, plan files and `state.json`.
- [ ] Share the `state.json` reader between `collect.ts` and `active-sprint.ts` (export or extract), with no behaviour change to the dashboard.
- [ ] Rewrite `compile()` partitioning and the template; add the `repoRoot` parameter.
- [ ] Update the two callers; run `test/wiki/wiki-ingest-synthesis-parity.red.node.test.ts` and `test/wiki/build.node.test.ts`.
- [ ] Rebuild and run the §2.2 manual check on this repo.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | One per §2.1 scenario, on temp-dir fixtures. EPIC-063 verification level: **unit**. |
| Integration tests | 1 | The existing ingest/build parity test (`test/wiki/wiki-ingest-synthesis-parity.red.node.test.ts`) stays green with the new signature. Level: **unit** (parity). |
| E2E / acceptance tests | 0 | No live host behaviour changes; the page's truth on this repo is covered by STORY-063-12's truth oracle and the §2.2 dogfood check. Levels: **truth oracle** (063-12), **dogfood**. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] Dashboard tests (`test/dashboard/**`) unchanged and green after the shared-reader change.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/wiki/synthesis/active-sprint.ts:18-24` — partitions sprints by `activated_at`/`completed_at`; the cause of SPRINT-14/15/28 showing as current.
- **Surface:** `cleargate-cli/src/commands/sprint-file-locate.ts:101` `resolveActiveSprint` — sentinel reader with plan-file validation (BUG-036); returns `{ sprintId, planPath, stale }`.
- **Surface:** `cleargate-cli/src/dashboard/collect.ts:117` `deriveStoryStatus` and its private `state.json` reader — the dashboard already reads live sprint state correctly.
- **Surface:** `cleargate-cli/src/wiki/page-schema.ts:164` `TERMINAL_STATUSES` — the shared terminal set.
- **Coverage of this requirement:** ≥80% extension. Every source the page needs already has a reader; the story re-points the compiler at them.

## Prior work

- [[EPIC-063]] — parent; 063-05 fixes the wrong "current sprint" on the page every session should trust.
- [[BUG-036]] — made the sentinel self-validating (`resolveActiveSprint`, stale warning). This story reuses that contract instead of inventing a new one.
- [[CR-084]] / [[CR-097]] — sprint dashboard data collector and its stale-sentinel handling; source of the `state.json` reader reused here.
- Grep of `.cleargate/FLASHCARD.md` for `active-sprint`: no card.

## Why not simpler?

- **Smallest existing surface that could carry this:** `active-sprint.ts` `compile()`, plus `resolveActiveSprint` and the dashboard's `state.json` reader.
- **Why isn't extension / parameterization / config sufficient?** It is extension only. Adding `activated_at`/`completed_at` to old sprint files would be a data migration that still trusts frontmatter over the runtime sentinel, and the next sprint that forgets a timestamp would repeat the bug. Reading the sentinel removes the dependency.

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

---
story_id: STORY-031-05
parent_epic_ref: EPIC-031
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-42
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: "Placeholder census across 17 runtime sprint-context.md files (2026-09-06 audit): §Test Stack stubbed in SPRINT-41 while 12 items execute against it; SPRINT-39's hand-written version already lost"
actor: Sprint Orchestrator
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-09-06T00:00:00Z
updated_at: 2026-09-06T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-06T16:42:37Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-031-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-06T16:34:50Z
  sessions: []
---

# STORY-031-05: §Test Stack Carries Forward at Sprint Init
**Complexity:** L2 — ~15 lines in a function that already does conditional template splicing, plus a bash harness test.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Sprint Orchestrator, I want `init_sprint.mjs` to splice the most recent populated §Test Stack into a new sprint's `sprint-context.md`, so that the runner knowledge a human wrote by hand in one sprint is not thrown away at the start of the next.

### 1.2 Detailed Requirements

1. **Scan prior sprints for the most recent populated §Test Stack.** `init_sprint.mjs` writes `sprint-context.md` from the template unconditionally at :282-296. Before writing, scan `.cleargate/sprint-runs/*/sprint-context.md` in descending sprint order for the first §Test Stack containing no `_(e.g.` placeholder marker.

2. **Splice it under an explicit inheritance marker**, verbatim:
   `> Inherited from SPRINT-NN — verify against this sprint's surfaces before the first dispatch.`

3. **Inherit §Test Stack ONLY.** Never §Cross-Cutting Rules, §Goal Acceptance Check, §Sprint Goal, or §Frozen Versions. Those are sprint-specific and inheriting them would be actively wrong.

4. **No prior populated §Test Stack → leave the template stub.** Unpopulated is the correct state at init; this story does not invent content.

### 1.3 Out of Scope
- Auto-filling §Cross-Cutting Rules or §Active FLASHCARD Tags. Both mechanisms were evaluated and rejected in the 2026-09-06 audit: `<agent_context>` (the declared source for the tag grep) exists in 2 of 242 story files and is absent from `story.md`, `bug.md` and `cr.md`; `<architecture_rules>` yields nothing for standalone Bug/CR sprints. Filling a section also silences the loud placeholder that is currently the only pressure producing the good hand-written version.
- Making an unpopulated §Test Stack blocking at init. If a blocking check is wanted it belongs at wave launch, not at init.
- Removing any §Test Stack heading. `init-sprint-context.red.node.test.ts:145-147` asserts the headings are present, it is green, and it is a sealed post-Red file.

### 1.4 Open Questions

- **Question:** "Descending sprint order" — numeric or by directory mtime?
- **Recommended:** Numeric on the `SPRINT-NN` id, descending, skipping the sprint being initialised. Directory mtime is unstable because close-path writes touch old sprint dirs.
- **Human decision:** {populated during Brief review}

### 1.5 Risks

- **Risk:** A stale-but-plausible inherited runner is worse than a blank one. SPRINT-40's surfaces were `.sh` and `.mjs`; inheriting SPRINT-39's npm command would have been actively wrong.
- **Mitigation:** The `Inherited from SPRINT-NN — verify` marker is load-bearing, not decorative. It is asserted by a Gherkin scenario, not left to prose.

- **Risk:** `init_sprint.mjs` is on the sprint-kickoff critical path; a throw there blocks every sprint.
- **Mitigation:** The scan is wrapped so any read/parse failure degrades to "write the template stub" and never throws. Asserted in §2.1.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Test Stack carries forward at sprint init

  Scenario: Most recent populated Test Stack is inherited
    Given SPRINT-40's sprint-context.md has a populated §Test Stack
    And SPRINT-41's is stubbed
    When init_sprint.mjs initialises SPRINT-42
    Then SPRINT-42's §Test Stack carries SPRINT-40's values
    And it is preceded by "Inherited from SPRINT-40 — verify against this sprint's surfaces before the first dispatch."

  Scenario: Only Test Stack is inherited
    Given a prior sprint with populated §Test Stack and §Cross-Cutting Rules
    When a new sprint is initialised
    Then §Test Stack is spliced
    And §Cross-Cutting Rules still carries the template placeholder

  Scenario: No populated prior leaves the stub
    Given no prior sprint-context.md has a populated §Test Stack
    When a new sprint is initialised
    Then §Test Stack renders the template placeholder text unchanged

  Scenario: A broken prior file never blocks kickoff
    Given a prior sprint-context.md that is unreadable or malformed
    When a new sprint is initialised
    Then init_sprint.mjs exits 0
    And §Test Stack renders the template placeholder text unchanged

  Scenario: Existing headings survive
    Given a newly initialised sprint-context.md
    When the rendered file is read
    Then "## Cross-Cutting Rules", "## Active FLASHCARD Tags" and "## Adjacent Implementations" are all present
```

### 2.2 Verification Steps (Manual)
- [ ] Initialise a throwaway sprint in a `mktemp -d` fixture with SPRINT-40 present; confirm inheritance and the marker.
- [ ] Corrupt the prior file; confirm exit 0 and stub output.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/scripts/init_sprint.mjs` |
| Related Files | `cleargate-planning/.cleargate/scripts/init_sprint.mjs`, `.cleargate/scripts/test/test_init_sprint_carry_forward.sh` |
| New Files Needed | Yes — `.cleargate/scripts/test/test_init_sprint_carry_forward.sh` |

### 3.2 Technical Logic

`init_sprint.mjs` already performs conditional template splicing (it extracts the sprint goal from the sprint plan §0 bullet and the active CR list). This adds one more splice of the same kind, reading §Test Stack out of the most recent prior `sprint-context.md` whose §Test Stack body contains no `_(e.g.` marker.

Section extraction is a heading-to-next-heading slice on `## Test Stack`. Note the audit finding that `extractSectionFirstNonEmptyLine` does **not** generalise — for five of six sections the first non-empty line is the section's own guidance prose, so a first-line check would be green by construction. Use a body scan for the `_(e.g.` marker across the whole section, not a first-line check.

## 3.3 API Contract (if applicable)
Not applicable.

## Task Breakdown

- [ ] Add a `findMostRecentPopulatedTestStack(sprintRunsDir, excludeId)` helper to `init_sprint.mjs`
- [ ] Body-scan for the `_(e.g.` marker across the whole §Test Stack section, not the first line
- [ ] Splice with the verbatim inheritance marker
- [ ] Wrap the scan so any failure degrades to the template stub and never throws
- [ ] Write `test_init_sprint_carry_forward.sh` with `mktemp -d` fixtures and trap cleanup
- [ ] Mirror to `cleargate-planning/.cleargate/scripts/init_sprint.mjs`
- [ ] Confirm `init-sprint-context.red.node.test.ts` still green

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | The section-extract helper: populated and placeholder cases |
| Integration tests | 0 | — |
| E2E / acceptance tests | 5 | 1 per Gherkin scenario in §2.1, via the bash harness |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `init-sprint-context.red.node.test.ts` still green (sealed post-Red; must not be amended).
- [ ] Canonical and live `init_sprint.mjs` byte-identical.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `.cleargate/scripts/init_sprint.mjs:282-296` — writes `sprint-context.md` from the template, already performing conditional splices (sprint goal from plan §0, active CR list).
- **Coverage of this requirement:** partial — the splice mechanism exists and is the right host; it has no notion of prior-sprint inheritance.
- **Surface:** `.cleargate/templates/sprint_context.md:36-43` — the §Test Stack table being inherited.
- **Coverage of this requirement:** none — this is the payload, not the mechanism.
- **Surface:** `cleargate-cli/test/scripts/init-sprint-context.red.node.test.ts:145-147` — asserts the three section headings render.
- **Coverage of this requirement:** none — a sealed constraint this story must not break.

## Prior work

- [[EPIC-031]] — parent.
- [[STORY-031-03]] — supplies the two §Test Stack rows this story carries forward; merge ordering is 03 before 05.
- [[CR-110]] — Completed. Introduced the placeholder check this story's body-scan extends, and established §Test Stack as a carried section.
- [[CR-078]] — Completed. Established `init_sprint.mjs`'s conditional-ingest pattern (lane assignments from waves.json with a §2.4 table fallback) — the same shape this story follows.

## Why not simpler?

- **Smallest existing surface that could carry this:** `.cleargate/scripts/init_sprint.mjs` — it already splices template sections conditionally at init.
- **Why isn't extension / parameterization / config sufficient?** Extension is exactly what this is; the story adds one helper to an existing function rather than any new script, config key or artifact. It is separated from STORY-031-03 only because the rubric prefers two focused L1/L2 stories over one L3: 031-03 is six markdown files with no logic, this is executable logic with a failure mode (a throw on the kickoff critical path) that needs its own Gherkin and its own bash harness.

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

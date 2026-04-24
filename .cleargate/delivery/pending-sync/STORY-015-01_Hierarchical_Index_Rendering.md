---
story_id: STORY-015-01
parent_epic_ref: EPIC-015
status: Ready
ambiguity: 🟢 Low
context_source: EPIC-015_Wiki_Index_Hygiene_And_Scale.md
actor: Orchestrator agent (session-start reader)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-24T08:12:34Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-015-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T08:12:34Z
  sessions: []
---

# STORY-015-01: Hierarchical Index Rendering
**Complexity:** L2 — single-file render refactor with clear acceptance cut.

## 1. The Spec (The Contract)

### 1.1 User Story
As an orchestrator agent reading `.cleargate/wiki/index.md` at session start, I want to see an **Active** surface first (in-flight epics with nested story rollups) and a collapsed **Archive** section second, so that I spend my token budget on what matters now, not on 104 rows of shipped or abandoned work.

### 1.2 Detailed Requirements
- `buildIndex()` in `cleargate-cli/src/commands/wiki-build.ts` (currently L158–192) rewritten to emit two top-level sections: `## Active` and `## Archive`.
- **Active section** contains: epics whose status ∉ {Completed, Abandoned}, sprints whose status ∉ {Completed, Abandoned}, proposals whose status ∈ {Draft, Approved-but-unshipped}, CRs/Bugs with status ≠ Closed/Resolved.
- **Archive section** contains everything else, collapsed into a single summary per bucket: `- Epics: 7 Completed · 2 Abandoned · [expand](archive/epics.md)`. The expand link is informational — do NOT generate the expanded files in this story (deferred).
- Under each Active epic: its in-flight stories are rolled up as `STORY-{EPIC}-xx (N stories) — {status breakdown}`. Example: `STORY-014-xx (10 stories) — 10 Ready`. No individual story rows for stories belonging to an epic with ≥3 active stories.
- **Orphan stories** (no parent epic, or parent epic is Completed/Abandoned) keep individual rows in the Active section.
- Output order within Active: Epics → Sprints → Proposals → CRs → Bugs. Within a bucket: sort by ID ascending.
- Build must remain **idempotent**: running `cleargate wiki build` twice on unchanged inputs produces byte-identical `index.md`.

### 1.3 Out of Scope
- Creating `wiki/archive/epics.md` expanded pages (the Archive section only *links* to them).
- Changing per-item wiki pages under `wiki/{epics,stories,…}/<id>.md`.
- Token-budget lint enforcement — that's STORY-015-03.
- Fixing stale frontmatter — that's STORY-015-02.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Hierarchical Index Rendering

  Scenario: Active/Archive split
    Given a delivery/ with 15 epics (7 Completed, 1 Approved, 7 Draft/Ready)
    When I run `cleargate wiki build`
    Then wiki/index.md contains "## Active" before "## Archive"
    And the Active section lists only the 8 non-completed epics

  Scenario: Story rollup under epic
    Given EPIC-014 has 10 stories all status=Ready
    When I run `cleargate wiki build`
    Then under EPIC-014 in Active, the line "STORY-014-xx (10 stories) — 10 Ready" appears
    And no individual STORY-014-xx row appears in Active

  Scenario: Orphan story keeps individual row
    Given STORY-999-00 exists with no parent_epic_ref set and status=Ready
    When I run `cleargate wiki build`
    Then `[[STORY-999-00]]` appears as its own row in Active

  Scenario: Archive collapsed to summary
    Given 7 epics are Completed and 2 are Abandoned
    When I run `cleargate wiki build`
    Then the Archive section contains "Epics: 7 Completed · 2 Abandoned"
    And no individual Completed/Abandoned epic row appears

  Scenario: Idempotent rebuild
    Given index.md has been built once
    When I run `cleargate wiki build` again with no raw-item changes
    Then the resulting index.md is byte-identical to the first build
```

### 2.2 Verification Steps (Manual)
- [ ] Run `cleargate wiki build` in the repo; confirm the new `index.md` is ≤ 4k tokens despite current 151 pages.
- [ ] Confirm SPRINT-10 still appears in Active until STORY-015-04 fixes its frontmatter (this story does not touch data).
- [ ] Confirm all links `[[<ID>]]` still resolve to `wiki/{bucket}/<ID>.md`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/wiki-build.ts` |
| Related Files | `cleargate-cli/src/wiki/scan.ts`, `cleargate-cli/test/commands/wiki-build.test.ts` |
| New Files Needed | No |

### 3.2 Technical Logic
- Partition items into `active` and `archived` sets by the status predicate above (constant table at top of `wiki-build.ts`).
- For Active epics: compute `{epicId → stories[]}` map from items by reading each story's `parent_epic_ref`. Emit rollup line if `stories.length ≥ 3`; else emit individual rows.
- For Active sprints/proposals/CRs/Bugs: emit individual rows as today.
- For Archive: produce per-bucket summary line `{Bucket}: N Completed · M Abandoned`. No per-item rows.
- Keep the existing per-item page writing loop (L65–L95) untouched; only `buildIndex()` changes.

### 3.3 API Contract
N/A (CLI-only).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | One per Gherkin scenario in §2.1; extend `cleargate-cli/test/commands/wiki-build.test.ts` |
| E2E / acceptance tests | 1 | Golden-file test: build against a fixture delivery/ dir, diff against committed `expected-index.md` |

### 4.2 Definition of Done
- [ ] Minimum test expectations met.
- [ ] All Gherkin scenarios from §2.1 covered by tests.
- [ ] `cleargate wiki build` against the current repo produces a ≤ 4k token `index.md`.
- [ ] No changes to per-item wiki pages (verify with `git diff wiki/{epics,stories,sprints,proposals,crs,bugs}`).
- [ ] Typecheck + tests pass; commit message `feat(EPIC-015): STORY-015-01 hierarchical index rendering`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] Status-predicate table confirmed against protocol vocabulary (Completed vs Done — are they aliases or distinct?).
- [ ] Rollup threshold fixed (current draft: ≥3 stories collapses; confirm or change).

---
story_id: STORY-014-02
parent_epic_ref: EPIC-014
status: Ready
ambiguity: 🟢 Low
context_source: EPIC-014 §2 IN-SCOPE B2 + SPRINT-09 REPORT.md §5 Templates 🟡 (M2 Gate-2 story-file gap)
actor: Developer Agent
complexity_label: L2
milestone: M1
parallel_eligible: y
expected_bounce_exposure: low
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
stamp_error: no ledger rows for work_item_id STORY-014-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:41:45Z
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: implementation-files-declared
      detail: section 3 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-21T12:41:45Z
---

# STORY-014-02: Gate-2 story-file existence assertion
**Complexity:** L2 — one new .mjs validator + init_sprint.mjs integration + protocol §2 amendment.

## 1. The Spec

### 1.1 User Story
As a Sprint Planner, I want `cleargate sprint init` (under v2) to refuse stamping the sprint as Active when any story in §Consolidated Deliverables lacks a `pending-sync/STORY-*.md` file, so Gate 2 cannot be silently bypassed (the gap SPRINT-09 M2 hit when 5 story files were drafted mid-sprint).

### 1.2 Detailed Requirements
- New script `.cleargate/scripts/assert_story_files.mjs` — args `<sprint-file-path>`. Parses §Consolidated Deliverables section for STORY-IDs (regex `STORY-\d+-\d+`). For each ID, checks `pending-sync/STORY-<id>_*.md` exists. Returns exit 0 if all exist, non-zero with missing-list on stderr otherwise.
- Modify `.cleargate/scripts/init_sprint.mjs`: under v2 (frontmatter check), call assert_story_files.mjs before writing state.json. If it fails, bubble up the error and do NOT create state.json.
- Amend `cleargate-protocol.md` §2 Gate 2: add bullet — "for v2 sprints, sprint init asserts every story in §Consolidated Deliverables has a `pending-sync/STORY-*.md` file; missing files block init with an enumerated list."
- Under v1, assertion runs but only warns (exit 0).
- Three-surface landing: script + mirror + protocol + mirror.

### 1.3 Out of Scope
- Validating that story files are themselves well-formed (frontmatter, §3.1 presence, etc.) — that's a future lint.
- Auto-generating missing story files from the template.

## 2. The Truth

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Gate-2 story-file assertion

  Scenario: v2 init refuses when stories are missing
    Given SPRINT-XX §Consolidated Deliverables lists STORY-XX-01..03
    And only STORY-XX-01.md exists in pending-sync/
    When I run `cleargate sprint init SPRINT-XX --stories STORY-XX-01,STORY-XX-02,STORY-XX-03`
    Then exit code is non-zero
    And stderr lists STORY-XX-02 and STORY-XX-03 as missing
    And state.json is NOT created

  Scenario: v2 init succeeds when all stories exist
    Given all three STORY-XX-01..03 files exist in pending-sync/
    When I run the same init command
    Then exit code is 0
    And state.json is created

  Scenario: v1 init warns but does not block
    Given the sprint frontmatter is execution_mode: v1
    And one story file is missing
    When I run init
    Then state.json is created
    And stderr contains "WARN: missing story files: STORY-XX-02"

  Scenario: assert_story_files standalone CLI
    When I run `node .cleargate/scripts/assert_story_files.mjs <sprint-file>` directly
    Then it returns the same enumerated list exit code
    And is invokable by the CLI wrappers or in CI without init_sprint
```

### 2.2 Verification Steps (Manual)
- [ ] Bash test drives all 4 scenarios against tmpdir fixtures.
- [ ] `diff` all pairs.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| New script | `.cleargate/scripts/assert_story_files.mjs` |
| Modified | `.cleargate/scripts/init_sprint.mjs` |
| Modified | `.cleargate/knowledge/cleargate-protocol.md` §2 Gate 2 |
| Mirrors | `cleargate-planning/` copies |
| Test | `.cleargate/scripts/test/test_assert_story_files.sh` |

### 3.2 Technical Logic
Parse sprint markdown with regex; for each STORY-ID, `fs.access()` against `pending-sync/STORY-<id>_*.md` glob (actually `fs.readdir()` + prefix match since glob needs extra dep). Return structured result `{ missing: string[], present: string[] }`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin bash test | 4 | All §2.1 scenarios |
| Three-surface diff | 2 | script + protocol |

### 4.2 Definition of Done
- [ ] All scenarios pass.
- [ ] Three-surface landing.
- [ ] Reuse: imports `readSprintFrontmatter` from shared module (don't duplicate).
- [ ] Commit: `feat(EPIC-014): STORY-014-02 gate-2 story-file assertion`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

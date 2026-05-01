---
story_id: STORY-025-06
parent_epic_ref: EPIC-025
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-18
carry_over: false
status: Approved
ambiguity: 🟢 Low
context_source: EPIC-025 + CR-021 §3.2.8 (CLAUDE.md sprint-preflight bullet update) + CR-021 §3.2.9 (cleargate-enforcement.md §13 spec). M6 of CR-021's milestone plan — depends on STORY-025-02 (the CLAUDE.md bullet must reference a live subcommand).
actor: Conversational orchestrator + AI session-start reader
complexity_label: L1
parallel_eligible: n
expected_bounce_exposure: low
lane: standard
created_at: 2026-05-01T20:30:00Z
updated_at: 2026-05-01T20:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T11:16:37Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-025-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T11:16:36Z
  sessions: []
---

# STORY-025-06: CLAUDE.md Sprint-Preflight Bullet + `cleargate-enforcement.md` §13
**Complexity:** L1 — two surfaces × two mirrors = 4 file edits. Doc-only; no code.

## 1. The Spec (The Contract)

### 1.1 User Story
As the **AI session-start reader**, I want **CLAUDE.md's "Sprint Execution Gate" bullet to reference the live `cleargate sprint preflight <id>` subcommand** and **`cleargate-enforcement.md` §13 to spell out the four checks + v2/v1 enforcement clause**, so that the forward-reference CR-020 left dangling now points at extant tooling and the v2-mode behavior is unambiguous.

### 1.2 Detailed Requirements

- **R1 — Update CLAUDE.md "Sprint Execution Gate" bullet** (CLEARGATE-tag-block region only). Replace the CR-020-shipped bullet text with the post-CR-021 version per CR-021 §3.2.8:
  - **Before:** `**Sprint Execution Gate (CR-021).** Before transitioning Ready → Active, the environment must pass: previous sprint Completed, no leftover worktrees, sprint/S-NN ref free, main clean. See cleargate sprint preflight.`
  - **After:** `**Sprint Execution Gate.** Before transitioning Ready → Active, run cleargate sprint preflight <id>. The four checks (previous sprint Completed, no leftover worktrees, sprint/S-NN ref free, main clean) must all pass. Halt and ask the human for resolution on any failure.`
  - Edit the live `CLAUDE.md` AND the canonical mirror `cleargate-planning/CLAUDE.md` — CLEARGATE-tag-block region only, no edits outside that region.
- **R2 — Append new §13 Sprint Execution Gate to `cleargate-enforcement.md`.** Verbatim shape from CR-021 §3.2.9:
  ```markdown
  ## 13. Sprint Execution Gate (Gate 3) (source: new in CR-021)

  Before sprint state transitions Ready → Active, the orchestrator MUST invoke
  `cleargate sprint preflight <sprint-id>` and verify all four checks pass:

  1. **Previous sprint Completed.** ... (full text per CR-021 §3.2.9 R1)
  2. **No leftover worktrees.** ...
  3. **Sprint branch ref free.** ...
  4. **`main` is clean.** ...

  On any failure, the script exits 1 with a punch list. ...

  This gate is **enforcing under `execution_mode: v2`** and **advisory under v1**.
  ```
  Append to live `.cleargate/knowledge/cleargate-enforcement.md` AND the canonical mirror `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md`. The §-number is "13" — currently the next free number after EPIC-024's §1..12 numbering.
- **R3 — Mirror parity.** Both surface pairs (CLAUDE.md, enforcement.md) edited in the same commit; mirror diff returns empty post-edit (scoped to the new content; pre-existing drift untouched per CR-023 cleanup separation).

### 1.3 Out of Scope
- Implementing the `cleargate sprint preflight` subcommand — STORY-025-02's job.
- Pre-existing CLAUDE.md mirror divergence (4 canonical-only bullets noted in SPRINT-17 REPORT) — CR-023's job.
- Touching CLAUDE.md content outside the CLEARGATE-tag-block region.
- Adding more than the §13 section to `cleargate-enforcement.md`.

### 1.4 Open Questions

- **Question:** §13 numbering — confirm "13" is the next free number?
  **Recommended:** **Yes.** SPRINT-17 STORY-024-02 created `cleargate-enforcement.md` with §§1-12. CR-021 §3.2.9 specifies "next free §N after EPIC-024's §1..12 numbering, so §13". Verified.
  **Human decision:** _accept recommended_

- **Question:** Which CLAUDE.md region — live only, canonical only, or both?
  **Recommended:** **Both.** Per FLASHCARD `2026-04-19 #wiki #protocol #mirror`, edit-parity invariant applies. Pre-existing 4-bullet canonical-only divergence is OUT of scope for this story (CR-023 owns reconciliation); this story's edit-parity is scoped to the bullet text replacement only.
  **Human decision:** _accept recommended_

### 1.5 Risks

- **Risk:** CLAUDE.md bullet text update may collide with text-region another in-flight commit modifies. SPRINT-17 already did one CLAUDE.md edit (STORY-024-04 Gate-4 close bullet); CR-020 did another (6-bullet replacement). This story's edit may meet stale text.
  **Mitigation:** Pre-implementation read of live CLAUDE.md to confirm exact bullet wording. If wording diverges from the §3.2.8 "before" text, surface as M6 Architect plan input and update old_string accordingly.

- **Risk:** Wave dependency — STORY-025-02 must merge first so the CLAUDE.md bullet references a real subcommand. If merge ordering inverts, CLAUDE.md cites tooling that doesn't exist yet.
  **Mitigation:** Sprint plan §2 SDR explicitly lists this story in Wave 2 after STORY-025-02. Architect M6 plan repeats the gate.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: CLAUDE.md sprint-preflight bullet + cleargate-enforcement.md §13

  Scenario: CLAUDE.md Sprint Execution Gate bullet updated
    Given STORY-025-06 has shipped
    When CLAUDE.md is read inside the CLEARGATE-tag-block
    Then it contains the bullet "**Sprint Execution Gate.** Before transitioning Ready → Active, run cleargate sprint preflight <id>."
    And it does NOT contain the old bullet text "**Sprint Execution Gate (CR-021).**"

  Scenario: cleargate-enforcement.md has §13 Sprint Execution Gate
    Given STORY-025-06 has shipped
    When .cleargate/knowledge/cleargate-enforcement.md is read
    Then it contains a "## 13. Sprint Execution Gate (Gate 3)" heading
    And §13 enumerates the four checks
    And §13 declares "enforcing under execution_mode: v2" and "advisory under v1"

  Scenario: Mirror parity for CLAUDE.md (new bullet only)
    When the new "Sprint Execution Gate." bullet is compared between live and canonical
    Then the bullet text is byte-identical
    (pre-existing canonical-only bullets out of scope per §1.5 mitigation)

  Scenario: Mirror parity for cleargate-enforcement.md
    When `diff .cleargate/knowledge/cleargate-enforcement.md cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` runs
    Then the diff is empty (or scoped to pre-existing CR-023-territory drift)

  Scenario: Wave dependency — preflight subcommand exists
    Given STORY-025-02 has shipped
    When `cleargate sprint preflight --help` runs
    Then exit code is 0
    And the help text references the four Gate 3 checks
```

### 2.2 Verification Steps (Manual)
- [ ] Read updated CLAUDE.md (live + canonical) — confirm bullet text matches R1 "After".
- [ ] Read updated `cleargate-enforcement.md` (live + canonical) — confirm §13 present, four checks enumerated, v2/v1 clause present.
- [ ] Run `diff` on both pairs — confirm empty (or pre-existing drift only, flagged for CR-023).

## 3. The Implementation Guide

### 3.1 Context & Files

**Files affected:**
- `CLAUDE.md` — modify; CLEARGATE-tag-block region only; replace Sprint Execution Gate bullet text
- `cleargate-planning/CLAUDE.md` — modify; identical mirror edit
- `.cleargate/knowledge/cleargate-enforcement.md` — modify; append new §13 Sprint Execution Gate
- `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — modify; identical mirror edit

| Item | Value |
|---|---|
| Primary File 1 | `CLAUDE.md` (modify — CLEARGATE-tag-block region only) |
| Primary File 2 | `.cleargate/knowledge/cleargate-enforcement.md` (modify — append §13) |
| Mirror Files | `cleargate-planning/CLAUDE.md`, `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` (identical edits) |
| New Files Needed | No |

### 3.2 Technical Logic

1. Read live `CLAUDE.md`; locate the existing "Sprint Execution Gate (CR-021)" bullet.
2. Apply Edit replacing old_string with new_string per R1.
3. Replicate to canonical mirror.
4. Read live `cleargate-enforcement.md`; confirm last existing section is §12; append §13 per R2 verbatim.
5. Replicate to canonical mirror.
6. `diff` both pairs to confirm parity.

### 3.3 API Contract — none.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Doc lint tests | 5 | One per Gherkin scenario in §2.1. Existing `protocol-section-N.test.ts` infra (post-CR-023 cleanup) is the natural home; or extend an existing knowledge-content test. |
| Manual verification | 3 | Per §2.2. |

### 4.2 Definition of Done
- [ ] All 5 Gherkin scenarios pass.
- [ ] Mirror diff scoped to new content returns empty.
- [ ] STORY-025-02 has merged before this commit lands (Wave dependency).
- [ ] No regression: `cleargate doctor` exits 0; `cleargate wiki lint` does not flag the new §13 reference.
- [ ] Commit message: `feat(EPIC-025): STORY-025-06 CLAUDE.md sprint-preflight bullet + enforcement §13`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green:
- [x] Gherkin scenarios cover both surfaces, both mirrors, wave dependency, and bullet text replacement.
- [x] Implementation §3 cites verbatim CR-021 source.
- [x] §1.5 acknowledges merge-ordering risk with STORY-025-02.
- [x] No "TBDs" remain.

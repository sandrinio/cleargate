---
story_id: STORY-024-03-CLAUDE_md_Gap_Fill
parent_epic_ref: EPIC-024
parent_cleargate_id: EPIC-024
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
approved_at: 2026-05-01T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: EPIC-024_AI_Orientation_Surface_Slim.md (Workstream C — §0 XML target_files for CLAUDE.md + cleargate-planning/CLAUDE.md, §2 IN-SCOPE Workstream C, §5 Acceptance scenario 'CLAUDE.md surfaces the four implicit rules'). Parent epic Gate 1 waived per its proposal_gate_waiver frontmatter; this story inherits the waiver.
actor: AI agent reading CLAUDE.md cold at session start
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: fast
created_at: 2026-04-30T18:30:00Z
updated_at: 2026-04-30T18:30:00Z
created_at_version: cleargate@0.9.0
updated_at_version: cleargate@0.9.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T06:05:26Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-024-03-CLAUDE_md_Gap_Fill
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T06:05:03Z
  sessions: []
---

# STORY-024-03: CLAUDE.md Gap-Fill — Surface 4 Implicit Rules
**Complexity:** L1 — doc-only edit, ≤2 files, known mirror pattern.

**Lane:** `fast` — passes all 7 lane checks (≤2 files, no forbidden surfaces, no new dep, doc-only / no runtime change, exposure low, no epic-spanning subsystem touches).

**Wave:** 1 (parallel with STORY-024-01). Disjoint surface from 024-01 (`architect.md`) and from 024-02 (`cleargate-protocol.md` + `cleargate-enforcement.md`). Bullets cite by name (e.g. "the lifecycle reconciler"), not by specific § number, so this story is fully decoupled from 024-02's renumbering.

## 1. The Spec (The Contract)

### 1.1 User Story

As an **AI agent landing in this repo for the first time** (new chat session, fresh orchestrator spawn, or a Developer agent reading the brain file before its first edit), I want CLAUDE.md to explicitly name the four currently-implicit rules — `execution_mode` read-rule, Architect's two spawn modes, CR-017 boundary gates, CR-019 close-ack — in the canonical CLEARGATE-tag-block region, so that I do not discover those rules by tripping a hook at run-time (the failure mode that originally produced CR-019).

### 1.2 Detailed Requirements

**Insert a 4-bullet block** into the CLEARGATE-tag-block region of `CLAUDE.md`, between the current "Halt at gates" bullet and the "Drafting work items" bullet (i.e. after the gate enumeration, before the templates section). Use a leading blank line for readability.

**Bullet 1 — Sprint mode read-rule:**

> **Sprint mode.** Read `execution_mode:` in the active sprint's frontmatter before spawning Developer/QA. `v1` = advisory; `v2` = enforce the worktree, pre-gate scan, flashcard gate, and file-surface contract rules in `cleargate-enforcement.md`. Default `v1`.

**Bullet 2 — Architect's two spawn modes:**

> **Architect runs twice per sprint.** (1) **Sprint Design Review** — writes §2 of the sprint plan (Phase Plan, Merge Ordering, Shared-Surface Warnings, Lane Audit, ADR-Conflict Flags) before human confirm. (2) **Per-milestone plan** — writes `.cleargate/sprint-runs/<id>/plans/M<N>.md` before Developer agents start that milestone (cross-story coupling, gotchas, test scenarios, reuse map; plan length is scope-driven, no cap).

**Bullet 3 — CR-017 boundary gates:**

> **Boundary gates (CR-017).** `cleargate sprint init` runs the **decomposition gate** — every `epics:` ref in the sprint plan must have child story files with `parent_epic_ref:` pointing at it. `close_sprint.mjs` runs the **lifecycle reconciler** — commit verbs (`feat(STORY-…)`, `fix(BUG-…)`, etc.) must match each artifact's `status:` field per the verb-to-status map. Both block in v2.

**Bullet 4 — CR-019 close-ack:**

> **Sprint close is Gate-3-class (CR-019).** Run `node .cleargate/scripts/close_sprint.mjs <sprint-id>` with no flags first; surface the "re-run with --assume-ack" prompt verbatim; halt. Never pass `--assume-ack` autonomously — that flag is reserved for automated test environments only.

**Update the session-start read order** from 3-tier to 4-tier. Currently:

```
1. .cleargate/wiki/index.md — compiled awareness layer (~3k tokens). ...
2. .cleargate/knowledge/cleargate-protocol.md — delivery protocol (non-negotiable rules).
3. .cleargate/FLASHCARD.md — lessons tagged by topic ...
```

Add tier 4:

```
4. .cleargate/knowledge/cleargate-enforcement.md — hook-enforced rules (worktree mechanics, file-surface contract, lifecycle reconciler, lane rubric, doctor exit codes, etc.). Read only when a CLI hook surfaces an error or when triaging a v2-mode question.
```

**Mirror to canonical.** Apply the byte-identical edit to `cleargate-planning/CLAUDE.md` within its CLEARGATE-tag-block region. Outside-block content of `CLAUDE.md` (the dogfood-specific upper sections) and outside-block content of `cleargate-planning/CLAUDE.md` (the canonical injection scaffold) MUST NOT be touched in this commit — they diverge intentionally.

**Citation discipline.** Bullets cite by name only (e.g. "the lifecycle reconciler", "the close-ack rule"). Bullet text MUST NOT contain a `§<N>` reference, so this story does not couple to STORY-024-02's renumbering. The session-start read-order line for tier 4 cites `cleargate-enforcement.md` by filename — that filename is locked by EPIC-024 §6 Q2 and is independent of 024-02's merge order.

### 1.3 Out of Scope

- Touching content OUTSIDE the CLEARGATE-tag-block region in `CLAUDE.md` (the dogfood-specific upper sections — Repo layout, How work gets done, Flashcard protocol, Agent orchestration, Test+commit conventions, Active state, Stack versions, Guardrails for the conversational agent).
- Modifying the canonical-only sections of `cleargate-planning/CLAUDE.md` (anything outside its CLEARGATE-tag-block region).
- Modifying any agent definition, template, or protocol section.
- Adding any CLI / hook check that enforces these rules — surfacing only.
- Changing the existing "Halt at gates" or "Drafting work items" bullets.
- Citing specific § numbers in the new bullets — discouraged to avoid coupling to 024-02.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: CLAUDE.md surfaces the four implicit rules

  Scenario: Bullet 1 — execution_mode read-rule surfaced
    Given STORY-024-03 has merged
    When the CLEARGATE-tag-block region of CLAUDE.md is read
    Then it contains a bullet beginning "**Sprint mode.**"
    And the same bullet contains "execution_mode" near the words "v1" and "v2"

  Scenario: Bullet 2 — Architect's two spawn modes surfaced
    Given STORY-024-03 has merged
    When the CLEARGATE-tag-block region of CLAUDE.md is read
    Then it contains a bullet beginning "**Architect runs twice per sprint.**"
    And the same bullet contains "Sprint Design Review" and "per-milestone" (or "Per-milestone plan")
    And the same bullet contains the literal "plans/M<N>.md"

  Scenario: Bullet 3 — CR-017 boundary gates surfaced
    Given STORY-024-03 has merged
    When the CLEARGATE-tag-block region of CLAUDE.md is read
    Then it contains a bullet referencing "CR-017"
    And the same bullet contains "decomposition gate" AND "lifecycle reconciler"

  Scenario: Bullet 4 — CR-019 close-ack surfaced
    Given STORY-024-03 has merged
    When the CLEARGATE-tag-block region of CLAUDE.md is read
    Then it contains a bullet referencing "CR-019"
    And the same bullet contains "Gate-3-class" or "Gate 3"
    And the same bullet contains the literal "--assume-ack"

  Scenario: Session-start read order is now 4-tier
    Given STORY-024-03 has merged
    When the session-start orientation block of CLAUDE.md is read
    Then the numbered list contains a tier-4 entry referencing `.cleargate/knowledge/cleargate-enforcement.md`
    And the tier-4 entry contains the qualifier "read only when" (or equivalent — not "read first")

  Scenario: Mirror parity within CLEARGATE-tag-block
    Given STORY-024-03 has merged
    When the CLEARGATE-tag-block region of CLAUDE.md is extracted (between <!-- CLEARGATE:START --> and <!-- CLEARGATE:END -->)
    And the same region of cleargate-planning/CLAUDE.md is extracted
    Then the two regions are byte-identical

  Scenario: Outside-block content unchanged
    Given STORY-024-03 has merged
    When `git diff <pre-merge-sha> HEAD -- CLAUDE.md` is examined
    Then every changed line falls within the <!-- CLEARGATE:START --> ... <!-- CLEARGATE:END --> region
    And the same property holds for cleargate-planning/CLAUDE.md

  Scenario: No specific §-number citations in new bullets
    Given STORY-024-03 has merged
    When the four new bullets in the CLEARGATE-tag-block region of CLAUDE.md are read
    Then none of the four bullets contains a "§N" pattern (where N is a number)
```

### 2.2 Verification Steps (Manual)

- [ ] Read CLAUDE.md CLEARGATE-tag-block region — confirm 4 new bullets in the right place (between "Halt at gates" and "Drafting work items").
- [ ] Read the session-start orientation block — confirm tier-4 entry referencing `cleargate-enforcement.md` with the "read only when" qualifier.
- [ ] Extract CLEARGATE-tag-block region from both CLAUDE.md files via `awk '/<!-- CLEARGATE:START -->/,/<!-- CLEARGATE:END -->/'`; diff the two outputs — empty.
- [ ] Run `git diff <pre-merge-sha> HEAD -- CLAUDE.md cleargate-planning/CLAUDE.md` — confirm all hunks fall within the CLEARGATE-tag-block region of each file.
- [ ] Confirm the four new bullets contain zero `§<N>` references.
- [ ] Read `cleargate-planning/CLAUDE.md` standalone (no project context) — confirm bullets render correctly without depending on dogfood-specific context.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** every file staged in this story's commit must appear below.

| Item | Value |
|---|---|
| Primary File | `CLAUDE.md` |
| Mirror File | `cleargate-planning/CLAUDE.md` |
| New Files Needed | No |
| Mirrors | Yes — CLEARGATE-tag-block region must be byte-identical post-edit; outside-block content diverges intentionally and is unchanged |

### 3.2 Technical Logic

1. **Locate the edit region in `CLAUDE.md`.** The CLEARGATE-tag-block is currently lines 98–135 (delimited by `<!-- CLEARGATE:START -->` and `<!-- CLEARGATE:END -->`).

2. **Identify insertion points within the block:**
   - The "Halt at gates." bullet is currently at line 112.
   - The "Drafting work items:" bullet is currently at line 114.
   - The 4-bullet block is inserted between them, after a blank-line separator.

3. **Identify the session-start read-order list:** currently lines 103–106, the numbered list "1. ... 2. ... 3. ...". Add a fourth item at the end:

   ```
   4. `.cleargate/knowledge/cleargate-enforcement.md` — hook-enforced rules (worktree mechanics, file-surface contract, lifecycle reconciler, lane rubric, doctor exit codes, etc.). Read only when a CLI hook surfaces an error or when triaging a v2-mode question.
   ```

4. **Apply the identical edit** to `cleargate-planning/CLAUDE.md` within its own CLEARGATE-tag-block region. The surrounding content of that file differs from `CLAUDE.md` (it's the canonical injection scaffold, not the dogfood instance) — this story MUST NOT touch any line outside the tag-block region.

5. **Verify mirror parity within the block:**

   ```bash
   awk '/<!-- CLEARGATE:START -->/,/<!-- CLEARGATE:END -->/' CLAUDE.md > /tmp/cleargate-live.md
   awk '/<!-- CLEARGATE:START -->/,/<!-- CLEARGATE:END -->/' cleargate-planning/CLAUDE.md > /tmp/cleargate-canon.md
   diff /tmp/cleargate-live.md /tmp/cleargate-canon.md  # must be empty
   ```

6. **Verify outside-block invariance** with `git diff` scoped to each file: every diff hunk must fall within the tag-block region.

### 3.3 API Contract

N/A — pure documentation edit, no runtime surface change.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Acceptance grep checks | 6 | One per Gherkin scenario covering bullets 1–4 + read-order tier 4 + no-§-citations |
| Mirror-parity check (block-scoped) | 1 | `diff` of extracted CLEARGATE-tag-block regions returns empty |
| Outside-block invariance check | 2 | `git diff` scoped to CLAUDE.md and cleargate-planning/CLAUDE.md — all hunks within tag-block region |

### 4.2 Definition of Done (The Gate)

- [ ] All §2.1 Gherkin scenarios pass.
- [ ] CLEARGATE-tag-block region byte-identical between `CLAUDE.md` and `cleargate-planning/CLAUDE.md`.
- [ ] Outside-block content of both files unchanged (verified via `git diff` line-range scoping).
- [ ] Four new bullets contain zero `§<N>` references.
- [ ] Tier-4 read-order entry references `cleargate-enforcement.md` with a "read only when" qualifier.
- [ ] Commit message: `feat(EPIC-024): STORY-024-03 CLAUDE.md gap-fill — surface 4 implicit rules`.
- [ ] Architect (gate review) approves.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths (CLAUDE.md exists at `/Users/ssuladze/Documents/Dev/ClearGate/CLAUDE.md`; canonical mirror at `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-planning/CLAUDE.md`; both contain the `<!-- CLEARGATE:START -->` ... `<!-- CLEARGATE:END -->` markers as of 2026-04-30).
- [x] No "TBDs" exist anywhere in the specification or technical logic.

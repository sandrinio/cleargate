---
story_id: STORY-025-05
parent_epic_ref: EPIC-025
parent_cleargate_id: "EPIC-025"
sprint_cleargate_id: SPRINT-18
carry_over: false
status: Done
ambiguity: 🟢 Low
context_source: EPIC-025 + CR-021 §3.2.6 (reporter.md capability surface spec). M5 of CR-021's milestone plan — depends on M2 (preflight CLI) only for the Brief's Gate-4-trigger language; depends on M4 only for the new SPRINT-<#>_REPORT.md output path reference.
actor: Reporter agent (self-orienting)
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: fast
created_at: 2026-05-01T20:30:00Z
updated_at: 2026-05-01T20:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T11:16:30Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-025-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T11:16:29Z
  sessions: []
---

# STORY-025-05: Reporter Agent — Capability Surface + Post-Output Brief
**Complexity:** L1 — single agent definition file × 2 mirrors. Doc-only edits, no code.

**Lane: `fast`** — passes all 7 lane-rubric checks (single agent file + canonical mirror; no test surface; no schema/migration risk; no shared file with other in-flight stories; doc-only insertion; no behavior change at runtime; mirror parity scoped to the inserted sections).

## 1. The Spec (The Contract)

### 1.1 User Story
As the **Reporter agent**, I want my agent definition to **explicitly enumerate my capability surface (scripts, skills, hooks, inputs, output)** and to **carry a Post-Output Brief instruction that doubles as the Gate 4 trigger**, so that I stop discovering my tooling by trial-and-error and so the orchestrator gets a clean handoff at sprint close instead of the legacy "re-run with --assume-ack" prompt.

### 1.2 Detailed Requirements

- **R1 — Insert "Capability Surface" section** in `.claude/agents/reporter.md` immediately after the role-prefix paragraph. Verbatim shape from CR-021 §3.2.6:
  ```markdown
  ## Capability Surface

  | Capability type | Items |
  |---|---|
  | **Scripts** | `prep_reporter_context.mjs` (read curated bundle), `count_tokens.mjs` (token totals + anomalies), git log per sprint commit, FLASHCARD date-window slicer |
  | **Skills** | `flashcard` (Skill tool — read past lessons) |
  | **Hooks observing** | `SubagentStop` → `token-ledger.sh` (attributes Reporter tokens via dispatch marker; pre-sprint) |
  | **Default input** | `.cleargate/sprint-runs/<id>/.reporter-context.md` (built by `prep_reporter_context.mjs` at close pipeline Step 3.5). Fall back to source files only when the bundle is incomplete or missing. |
  | **Output** | `.cleargate/sprint-runs/<id>/SPRINT-<#>_REPORT.md` |
  ```
- **R2 — Insert "Post-Output Brief" section** after Capability Surface:
  ```markdown
  ## Post-Output Brief

  After Writing the report, render a Brief in chat:

  > Delivered N stories, M epics. Observe: X bugs, Y review-feedback. Carry-over: Z. Token cost: T.
  > See `SPRINT-<#>_REPORT.md` for full report.
  > Ready to authorize close (Gate 4)?

  This Brief replaces today's "re-run with --assume-ack" prompt as the Gate 4 trigger. The orchestrator surfaces this Brief verbatim to the human and halts.
  ```
- **R3 — Update Default Input behavior in agent prose.** Reporter reads `.reporter-context.md` first; falls back to source-file-grep only when the bundle is incomplete or missing. The agent's existing "loads broad-fetch context" prose (if any) flips to "reads curated bundle".
- **R4 — Update Output path reference** wherever the existing `reporter.md` mentions `REPORT.md` — replace with `SPRINT-<#>_REPORT.md` per the new naming (depends on STORY-025-03 + STORY-025-04 for the actual filename change to ship; this story carries the agent-prompt reference into the new convention).
- **R5 — Mirror.** Identical edits to `cleargate-planning/.claude/agents/reporter.md` in the same commit.

### 1.3 Out of Scope
- Implementing `prep_reporter_context.mjs` / `count_tokens.mjs` — STORY-025-01.
- Wiring those scripts into close_sprint.mjs Step 3.5 — STORY-025-03.
- Renaming the actual REPORT.md output file — STORY-025-03 (this story only updates the agent's reference to the new name).
- Token-ledger SubagentStop attribution fix — out of SPRINT-18 scope (carried-forward Red).

### 1.4 Open Questions

- **Question:** Should "Post-Output Brief" replace today's existing close-pipeline prompt verbiage in `reporter.md`, or co-exist?
  **Recommended:** **Replace.** CR-021 §3.2.6 explicitly says the new Brief "replaces today's 're-run with --assume-ack' prompt as the Gate 4 trigger." Co-existence creates confusion. If the existing reporter.md has any "--assume-ack" reference in its Output / Handoff / Conclusion section, swap it for the new Brief shape.
  **Human decision:** _accept recommended_

- **Question:** Capability Surface "Skills" row lists only `flashcard` — should it also list `vibe-code-review` (mentioned in CR-021 §2.3b's V-Bounce-port plans for cross-sprint metrics)?
  **Recommended:** **Omit `vibe-code-review`.** That capability lands in CR-022 / SPRINT-19 (out of scope for SPRINT-18). Listing it now would be a forward-reference to undelivered tooling.
  **Human decision:** _accept recommended_

### 1.5 Risks

- **Risk:** Existing `reporter.md` may already have a "Capabilities" or "Tooling" section with overlapping content, causing duplication post-edit.
  **Mitigation:** Pre-implementation read of the live `reporter.md` to identify any existing sections; merge/replace as appropriate rather than blindly inserting. Surface in the M5 Architect plan.

- **Risk:** Pre-existing live↔canonical drift in `reporter.md` (FLASHCARD `2026-04-19 #wiki #protocol #mirror` warns this is common).
  **Mitigation:** Apply edit-parity (same edits to both files), not state-parity. If pre-existing drift exists, leave it untouched; flag in CR-023 cleanup if the drift is significant. Scope this story's parity to the new sections only.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Reporter agent capability surface + Post-Output Brief

  Scenario: reporter.md has Capability Surface section
    Given STORY-025-05 has shipped
    When .claude/agents/reporter.md is read
    Then it contains a "## Capability Surface" heading
    And the table under it lists rows for: Scripts, Skills, Hooks observing, Default input, Output

  Scenario: Capability Surface table cites prep_reporter_context.mjs and count_tokens.mjs
    When the Capability Surface section is read
    Then the Scripts row mentions "prep_reporter_context.mjs"
    And the Scripts row mentions "count_tokens.mjs"
    And the Default input row mentions ".reporter-context.md"

  Scenario: reporter.md has Post-Output Brief section
    When the file is read
    Then it contains a "## Post-Output Brief" heading
    And the Brief blockquote contains "Ready to authorize close (Gate 4)?"

  Scenario: Brief replaces legacy --assume-ack prompt
    When grep is run for "--assume-ack" against reporter.md
    Then there are zero hits in the Output / Handoff / Conclusion sections
    (or the only hits are in escaped-context or comment-only references)

  Scenario: Output path uses new naming
    When the Capability Surface "Output" row is read
    Then it cites "SPRINT-<#>_REPORT.md" not "REPORT.md"

  Scenario: Mirror parity
    When `diff .claude/agents/reporter.md cleargate-planning/.claude/agents/reporter.md` runs over the inserted sections
    Then the diff is empty for the new Capability Surface + Post-Output Brief sections
```

### 2.2 Verification Steps (Manual)
- [ ] Read updated `reporter.md` — confirm both new sections render correctly under markdown.
- [ ] Confirm the Brief blockquote uses the verbatim phrasing from CR-021 §3.2.6.
- [ ] `diff` live/canonical reporter.md — confirm new sections are byte-identical.

## 3. The Implementation Guide

### 3.1 Context & Files

**Files affected:**
- `.claude/agents/reporter.md` — modify; insert Capability Surface table + Post-Output Brief section + update Output path reference
- `cleargate-planning/.claude/agents/reporter.md` — modify; identical mirror edits

| Item | Value |
|---|---|
| Primary File | `.claude/agents/reporter.md` (modify — insert two sections + update Output path references) |
| Mirror File | `cleargate-planning/.claude/agents/reporter.md` (identical edits) |
| New Files Needed | No |

### 3.2 Technical Logic

Doc-only edits:
1. Read live `reporter.md`.
2. Identify insertion point (immediately after the role-prefix paragraph; if a "Capabilities" or "Tooling" section already exists, replace it).
3. Insert Capability Surface table verbatim from CR-021 §3.2.6.
4. Insert Post-Output Brief section.
5. Search-replace any standalone `REPORT.md` references with `SPRINT-<#>_REPORT.md`.
6. Apply identical edits to canonical mirror.

### 3.3 API Contract — none.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Doc lint tests | 6 | One per Gherkin scenario in §2.1. Implement as `cleargate-cli/test/agents/reporter-content.test.ts` (NEW) or extend an existing agent-content test. |
| Manual verification | 3 | Per §2.2. |

### 4.2 Definition of Done
- [ ] All 6 Gherkin scenarios pass.
- [ ] Mirror diff for the inserted sections returns empty.
- [ ] No `--assume-ack` reference remains in reporter.md's handoff section.
- [ ] No regression: `cleargate doctor` exits 0; agent prompts load cleanly.
- [ ] Commit message: `feat(EPIC-025): STORY-025-05 Reporter capability surface + Post-Output Brief`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green:
- [x] Gherkin scenarios cover both new sections, naming change, mirror parity, and legacy prompt replacement.
- [x] Implementation §3 cites verbatim CR-021 source.
- [x] Lane=fast rubric application documented.
- [x] No "TBDs" remain.

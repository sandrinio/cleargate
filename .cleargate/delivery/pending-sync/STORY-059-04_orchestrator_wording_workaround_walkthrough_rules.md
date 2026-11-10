---
story_id: STORY-059-04
parent_epic_ref: EPIC-059
parent_cleargate_id: EPIC-059
sprint_cleargate_id: SPRINT-42
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-08T00:00:00Z
ambiguity: 🟢 Low
context_source: "EPIC-059 Rule 4, from Kurnera CR-002 Rule 4 (owner-approved 2026-10-04). Evidence in the source: an owner wording decision recorded unchecked (Kurnera BUG-002), a gate defect worked around all sprint and never filed (Kurnera BUG-006, upstream [[BUG-052]]), a walkthrough on the dev server in the test checkout (Kurnera BUG-005). Grounded 2026-10-04 against SKILL.md §C.10 (:601-616), §6 Phase D (:654-671), §11 (:843-849)."
actor: Sprint Orchestrator
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: fast
area: sprint-execution,agent-prompts
db_write_set: []
deferred_verification: []
created_at: 2026-10-04T00:00:00Z
updated_at: 2026-10-08T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-08T13:22:50Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-059-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-03T23:23:49Z
  sessions: []
---

# STORY-059-04: Three Orchestrator Habits — Check the Wording, File the Defect, Walk Through the Tested Build
**Complexity:** L1 — three short passages in one skill file; canonical + live.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Sprint Orchestrator, I want three habits written into the playbook, so that an owner's wording decision is checked before it is recorded, a workaround always has a filed defect behind it, and the owner judges the build the tests actually verified.

### 1.2 Detailed Requirements
1. **Wording check (§C.10, clarification row).** Before recording an owner decision that changes text a user sees, the Orchestrator checks that text against every state, input and role that displays it. Any case where it reads wrong goes back to the owner as one follow-up question before the text is recorded.
2. **File the defect (§11).** When a tool, script or gate needs a workaround, including any `SKIP_*` bypass, the Orchestrator files a BUG in `pending-sync/` the same day. It cites the BUG ID wherever the workaround is written: the §4 Execution Log, and the dispatch text that tells agents to use it.
3. **Walk through the tested build (§6 Phase D).** The walkthrough invitation names three things:
   - the build the tests verify (the production build or packed artifact, not a dev server)
   - the origin or port it is served on, which the app must allow
   - the data set

   The build must not be served from a checkout or worktree where tests are running. If the sprint plan has a §2.6 Walkthrough row (STORY-059-02), the invitation uses it.

### 1.3 Out of Scope
- Any script or hook that enforces these habits.
- Kurnera's app-specific details (Medplum origins, ports).

### 1.4 Open Questions

- **Question:** Should habit 2 also cover workarounds found by agents, not only by the Orchestrator?
- **Recommended:** The Orchestrator files it either way. Agents already report blockers to the Orchestrator, which owns filing. No agent prompt change.
- **Human decision:** Accepted 2026-10-08 (owner): the Orchestrator files it either way; no agent prompt change.

### 1.5 Risks

- **Risk:** SKILL.md has many writers in SPRINT-42.
- **Mitigation:** This story touches only §C.10, §6 and §11, which no other SPRINT-42 item edits. The SDR assigns it a disjoint line range.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | Each habit is one unconditional instruction; there is no alternate successful path. |
| Interfaces | F | One surface, the orchestrator playbook. |
| Data | F | No data input varies the behaviour. |
| Rules | T | One scenario per habit. |

```gherkin
Feature: Three orchestrator habits

  @rules
  Scenario: Owner wording is checked before it is recorded
    Given the canonical SKILL.md §C.10
    When the clarification guidance is read
    Then it requires checking user-visible wording against every state, input and role before recording it

  @rules
  Scenario: A workaround has a filed defect behind it
    Given the canonical SKILL.md §11
    When the conversational discipline list is read
    Then it requires filing a BUG the same day a tool, script or gate needs a workaround, including any SKIP_ bypass
    And it requires citing that BUG ID wherever the workaround is written

  @rules
  Scenario: The walkthrough runs the tested build
    Given the canonical SKILL.md §6 Phase D
    When the walkthrough invitation guidance is read
    Then it names the tested build, an allowed origin and the data set
    And it forbids the dev server and a checkout where tests are running

  Scenario: Canonical and live agree
    Given the canonical and live SKILL.md
    When §C.10, §6 and §11 are compared
    Then they match byte-for-byte
```

### 2.2 Verification Steps (Manual)
- [ ] At the next sprint's Phase D, confirm the invitation names build, origin and data.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` |
| Related Files | `.claude/skills/sprint-execution/SKILL.md` |
| New Files Needed | Yes — `cleargate-cli/test/scaffold/skill-md-orchestrator-habits.node.test.ts` |

### 3.2 Technical Logic
- §C.10: add a `**Wording check.**` paragraph directly under the class table (`:610`).
- §11: append two bullets: file-the-defect, and a pointer to the wording check.
- §6: add a `**Walk through the tested build.**` paragraph before the 🎯 goal-check block (`:667`). Keep each passage to 2–4 lines.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | One per §2.1 scenario, text assertions. |
| Integration tests | 0 | Prompt text only. |
| E2E / acceptance tests | 0 | Observed at the next sprint's walkthrough. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:601` — §C.10 mid-sprint triage, clarification row.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:654` — §6 Phase D walkthrough invitation.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:843` — §11 conversational discipline.
- **Coverage of this requirement:** ≥80% — three passages in sections that already own those moments.

## Prior work

- [[BUG-052]] — the gate defect Kurnera worked around unfiled; the case habit 2 exists for.
- [[BUG-103]] — SPRINT-41 SKILL.md correctness fixes; land first.
- Habits themselves: none found.

## Why not simpler?

- **Smallest existing surface that could carry this:** the three SKILL.md sections named above.
- **Why isn't extension / parameterization / config sufficient?** It is extension only. These are judgement habits with nothing to parameterize, and enforcing them with a hook would contradict the source CR's "no new tools" constraint.

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

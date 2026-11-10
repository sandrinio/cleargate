---
story_id: STORY-060-05
parent_epic_ref: EPIC-060
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-28T00:00:00Z
ambiguity: 🟢 Low
context_source: "EPIC-060 §2 (findings in the execution loop). Applies the protocol §24 dispositions from STORY-060-02 to QA findings. Current loop read from cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:471 (On QA: FAIL), agents/qa.md:155,174 (VERDICT, max kickback round), agents/developer.md:75 (report casing contract) and .cleargate/scripts/prep_qa_context.mjs:70 (dev_handoff.notes passes the Developer's NOTES to QA)."
actor: Developer, QA and Sprint Orchestrator
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: sprint-execution,agent-prompts
db_write_set: []
deferred_verification: []
created_at: 2026-10-28T00:00:00Z
updated_at: 2026-10-28T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-28T07:01:12Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-060-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-28T10:56:50Z
  sessions: []
---

# STORY-060-05: Finding Resolution in the Execution Loop
**Complexity:** L2 — rules added to two agent prompts and one skill paragraph, plus regenerated Codex files and one text test.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Sprint Orchestrator, I want a Developer to fix or contest each QA finding with evidence QA can check, and QA to rule on every contest, so that a wrong QA finding costs one round instead of a forced change, and a right one is never argued away.

### 1.2 Detailed Requirements
**Prerequisite:** STORY-060-02 is merged (protocol §24 exists), and SPRINT-43's edits to `developer.md`, `qa.md` and SKILL.md (STORY-031-04, CR-120, CR-121, CR-122) are merged. If `cleargate-protocol.md` has no `## 24. Finding Resolution` when this story starts, halt and report.

1. **Developer.** `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`: when re-dispatched after `QA: FAIL`, the Developer fixes each QA finding or contests it under protocol §24.
   - A contest is a NOTES line `CONTEST <finding>: <evidence>`. The evidence is a file and symbol, a story section, or a milestone plan line that QA can read. "I meant to do this" is not evidence.
   - A finding the Developer believes is wrong, with evidence in no readable file, is a NOTES line `ESCALATE <finding>: <fact>`.
   - The Developer still fixes every finding it does not contest or escalate, and reports `STATUS=done`.
2. **QA.** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`: on re-verify, QA reads every `CONTEST` line in `dev_handoff.notes` and checks the cited evidence. For each one, its `VERDICT` states `withdrawn — <reason>` or `upheld — <reason>`. A contest that cites nothing QA can read counts as unaddressed, so QA fails the story.
3. **Orchestrator.** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` §C.5 "On `QA: FAIL`": the Developer re-spawn tells it to fix or contest each finding per §24. Before re-spawning QA, the orchestrator answers every `ESCALATE` line, from its own knowledge or by asking the owner, and puts the answer in the QA dispatch. A round with contests counts as a normal `qa_bounces` increment; there is no new counter.
4. **Codex.** Run `npm run gen:codex`. The Developer and QA roles and the rendered sprint-execution skill regenerate; keep new text free of `CODEX_SKILL_BANNED` tokens.

### 1.3 Out of Scope
- New fields in the Developer report or in `prep_qa_context.mjs`. Contests travel in NOTES, which `dev_handoff.notes` already carries.
- Contesting Architect post-flight or TPV findings.
- Changing the bounce caps (`qa_bounces ≥ 3` escalates) or QA's round-2 rule.

### 1.4 Open Questions

- **Question:** Structured field or NOTES lines for contests?
- **Recommended:** NOTES lines with a fixed `CONTEST` / `ESCALATE` prefix. A new structured field would change the parser-bound report format and `prep_qa_context.mjs`, for a list that is usually empty.
- **Human decision:** Accepted 2026-10-28 (owner) at the EPIC-060 Brief.

### 1.5 Risks

- **Risk:** SPRINT-43 (STORY-031-04, CR-120, CR-121, CR-122) edits `developer.md`, `qa.md` and SKILL.md.
- **Mitigation:** Schedule after SPRINT-43 and rebase onto merged text; this story adds rules and replaces none.
- **Risk:** Developers contest instead of fixing.
- **Mitigation:** Every contest is ruled on by QA against evidence it can read, and the round still counts toward the existing bounce cap.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Fix, contest and escalate are three ways through a failed QA round. |
| Interfaces | F | One surface per rule: the agent prompts and the skill. |
| Data | F | Behaviour does not vary by input shape. |
| Rules | T | The evidence rule and the no-new-counter rule. |

```gherkin
Feature: Finding resolution in the execution loop

  @paths
  Scenario: The Developer fixes or contests each QA finding
    Given the canonical developer.md
    When the re-dispatch-after-QA-FAIL rule is read
    Then each finding is fixed, contested with a CONTEST NOTES line citing readable evidence, or escalated with an ESCALATE NOTES line

  @rules
  Scenario: QA rules on every contested finding
    Given the canonical qa.md
    When the re-verify rule is read
    Then QA states withdrawn or upheld, with a reason, for every CONTEST line in dev_handoff.notes

  @paths
  Scenario: Escalations are answered before QA runs again
    Given the canonical SKILL.md §C.5
    When the On QA FAIL rule is read
    Then the orchestrator answers every ESCALATE line before re-spawning QA and passes the answer in the QA dispatch
    And a round with contests increments qa_bounces like any other round

  @rules
  Scenario: Error — a contest without readable evidence fails the story
    Given the canonical qa.md
    When the re-verify rule is read
    Then a CONTEST line that cites nothing QA can read is treated as an unaddressed finding and the verdict is QA: FAIL
```

### 2.2 Verification Steps (Manual)
- [ ] At the first QA FAIL after this lands, confirm the Developer's NOTES and QA's VERDICT follow requirements 1 and 2.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` |
| Related Files | `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/developer.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `cleargate-cli/test/agents/finding-resolution-loop-text.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/test/agents/finding-resolution-loop-text.node.test.ts` |

### 3.2 Technical Logic
Text changes only. In `developer.md`, add a short "After a QA FAIL" rule next to the report format, keeping the casing contract: `CONTEST` and `ESCALATE` are prefixes inside NOTES, not new keys. In `qa.md`, add the contest rule next to the `VERDICT` description and the round-2 rule. In SKILL.md, extend the "On `QA: FAIL`" paragraph. Run `npm run gen:codex` and stage every regenerated file it reports, including the rendered sprint-execution skill. The test asserts the phrases in the four scenarios against the canonical files.

### 3.3 API Contract (if applicable)
Not applicable.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | One per §2.1 scenario, in `test/agents/finding-resolution-loop-text.node.test.ts`. |
| Integration tests | 0 | Text-only change; no infrastructure. |
| E2E / acceptance tests | 0 | Observed at the next real QA FAIL (§2.2). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] `npm run gen:codex` re-run; `prebuild`'s `--check` passes.
- [ ] Live mirrors re-synced per the framework-sprint routine; `doctor` reports no drift.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:471` — "On `QA: FAIL`", the paragraph this story extends.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:174` — the round-2 kickback rule; the contest rule sits next to it.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md:75` — the parser-bound report casing contract that NOTES lines must respect.
- **Surface:** `.cleargate/scripts/prep_qa_context.mjs:516` — structured handoff detection; NOTES already reaches QA as `dev_handoff.notes`.
- **Coverage of this requirement:** ≥80% extension. No new field, script or counter.

## Prior work

- [[CR-122]] — Developer context and retry caps; same file, different rule.
- [[EPIC-059]] — STORY-059-03 changes QA-Red, not QA-Verify; no overlap.
- Developer disputing QA findings: none found.

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing "On `QA: FAIL`" paragraph alone.
- **Why isn't extension / parameterization / config sufficient?** It is an extension. The orchestrator paragraph alone can't make QA rule on a contest or make the Developer cite evidence, because each of those rules lives in the prompt of the agent that has to follow it. So the change is one rule in each of three existing files, with NOTES as the carrier instead of a new field.

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

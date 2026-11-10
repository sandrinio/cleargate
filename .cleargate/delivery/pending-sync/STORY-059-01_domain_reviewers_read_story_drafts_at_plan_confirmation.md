---
story_id: STORY-059-01
parent_epic_ref: EPIC-059
parent_cleargate_id: EPIC-059
sprint_cleargate_id: SPRINT-42
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-08T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-059 Rule 1, from Kurnera CR-002 Rule 1 (owner-approved 2026-10-04). Grounded 2026-10-04 against cleargate-cli/scaffold SKILL.md §A.4 (:171-213) and config.example.yml.
actor: Sprint Orchestrator
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
area: sprint-planning,sprint-execution,config
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
stamp_error: no ledger rows for work_item_id STORY-059-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-03T23:21:49Z
  sessions: []
---

# STORY-059-01: Domain Reviewers Read the Story Drafts at Plan Confirmation
**Complexity:** L2 — one optional config key, one §A.4 paragraph, canonical + live mirror.

## 1. The Spec (The Contract)

### 1.1 User Story
As a Sprint Orchestrator, I want each configured domain reviewer to read all candidate story drafts once at plan confirmation, so that the owner answers every domain conflict in one batch before kickoff and the reviewers stop halting individual stories mid-sprint.

### 1.2 Detailed Requirements
1. **Config key.** `.cleargate/config.yml` accepts an optional `sprint.draft_reviewers` list of agent names (files in the target's `.claude/agents/`). If the key is absent or the list is empty, nothing changes. Document it as a commented example in `config.example.yml`, stating that ClearGate ships no reviewers and the target supplies them.
2. **Dispatch at §A.4.** When the list is non-empty, the Orchestrator dispatches each listed agent once, in the same parallel batch as the `architect-reader` fan-out. On the N ≤ 2 path, the dispatch goes alongside the single Architect SDR dispatch. Each reviewer receives every candidate story file in the one dispatch and this instruction: *"DRAFT REVIEW — read these story drafts together. Report only conflicts with your domain's rules, and conflicts between stories. Do not edit any file. Return numbered findings: story ID, the conflicting text, the rule it breaks, a proposed fix."*
3. **One batch of owner questions.** Fold every reviewer's findings into the existing §A.4 plan-confirmation halt as a single numbered list, after the SDR block. The owner answers in the same halt that confirms the plan. The Orchestrator amends the affected stories before §A.5, and records each answer in the story's `### 1.4 Open Questions` as a `Human decision:` line.
4. **Advisory, never blocking.** A reviewer with no findings adds the line `<agent>: no findings`. If an agent name doesn't resolve (`Agent type '<name>' not found`), the halt names it and the SDR proceeds.

### 1.3 Out of Scope
- Shipping any reviewer agent (designer or otherwise) in the scaffold.
- Replacing a target's own per-story domain review at execution. Kurnera keeps its designer's PLAN review, which should now rarely block.
- A readiness predicate on reviewer output.

### 1.4 Open Questions

- **Question:** Run draft review at §A.4 (kickoff), or earlier at sprint drafting?
- **Recommended:** §A.4. It is the one existing halt where the owner confirms the plan before any story executes, so no new gate is needed (EPIC-059 §6 Q2).
- **Human decision:** Accepted 2026-10-08 (owner): §A.4, folded into the existing plan-confirmation halt.

- **Question:** Key name and location?
- **Recommended:** `sprint.draft_reviewers` in `.cleargate/config.yml` (EPIC-059 §6 Q3).
- **Human decision:** Accepted 2026-10-08 (owner): `sprint.draft_reviewers` in `.cleargate/config.yml`, with a commented example in `config.example.yml`.

### 1.5 Risks

- **Risk:** STORY-059-02 also edits SKILL.md §A.4.
- **Mitigation:** Serialize the two stories: 059-01 merges first, then 059-02 rebases its §A.4 edit onto it. Declare the order in the SDR.
- **Risk:** Large sprints give a reviewer a long context.
- **Mitigation:** Reviewers receive story files only, not code. One dispatch per reviewer per sprint (~10 agent-minutes by Kurnera's estimate).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Configured, absent and unresolvable-agent paths. |
| Interfaces | T | Both SDR dispatch paths, N > 2 readers and N ≤ 2 single Architect. |
| Data | F | The input is a list of names; shape does not vary behaviour. |
| Rules | T | Advisory rule: findings never block the SDR. |

```gherkin
Feature: Domain reviewers read story drafts at plan confirmation

  @paths
  Scenario: Configured reviewers are dispatched once over all drafts
    Given the canonical SKILL.md §A.4
    When the draft-reviewer paragraph is read
    Then it names the config key sprint.draft_reviewers
    And it dispatches each listed agent once with every candidate story file
    And the dispatch runs in the same parallel batch as the architect-reader fan-out

  @interfaces
  Scenario: The tiny-sprint path also runs draft review
    Given the canonical SKILL.md §A.4 N ≤ 2 path
    When the draft-reviewer paragraph is read
    Then it dispatches reviewers alongside the single Architect SDR dispatch

  @paths
  Scenario: No key means no dispatch
    Given the canonical SKILL.md §A.4
    When the draft-reviewer paragraph is read
    Then it states that an absent or empty list dispatches nothing

  @rules
  Scenario: Findings fold into the existing halt and never block
    Given the canonical SKILL.md §A.4
    When the plan-confirmation halt instruction is read
    Then reviewer findings appear as one numbered list after the SDR block
    And each owner answer is recorded as a Human decision line in the affected story before §A.5
    And a reviewer with no findings is listed as "<agent>: no findings"
    And an unresolvable agent name is reported in the halt while the SDR proceeds

  Scenario: The key is documented and mirrored
    Given cleargate-cli/scaffold/core/.cleargate/config.example.yml
    When it is read
    Then it carries a commented sprint.draft_reviewers example
    And the live .claude/skills/sprint-execution/SKILL.md §A.4 paragraph matches canonical byte-for-byte
```

### 2.2 Verification Steps (Manual)
- [ ] With `sprint.draft_reviewers: []` in this repo's config, run §A.4 for SPRINT-42's successor and confirm no reviewer dispatch happens.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/config.example.yml`, `.claude/skills/sprint-execution/SKILL.md`, `.cleargate/config.example.yml` |
| New Files Needed | Yes — `cleargate-cli/test/scaffold/skill-md-draft-reviewers.node.test.ts` |

### 3.2 Technical Logic
Insert a `**Draft reviewers (optional).**` paragraph in §A.4, directly before "In both paths: insert the returned markdown block…" (currently `SKILL.md:211`). Extend that sentence so the halt also presents the reviewer findings list. In `config.example.yml`, add a commented `# sprint:` / `#   draft_reviewers: []` block after the `wiki:` block, with a two-line explanation. Nothing in `cleargate-cli/src` parses this key, and none needs to: the Orchestrator reads `config.yml` directly. `src/lib/wiki-config.ts` reads only `wiki.*` and ignores other keys.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | One per §2.1 scenario, text assertions against canonical + live files. |
| Integration tests | 0 | Prompt text only; there is no runtime surface to integrate. |
| E2E / acceptance tests | 0 | The real check is the next sprint's §A.4 run, recorded in its §4 log. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Canonical and live SKILL.md + config.example.yml in parity (`node cleargate-cli/dist/cli.js doctor` reports no drift for them after dist rebuild).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:171` — §A.4 SDR dispatch and plan-confirmation halt; the fan-out this story joins.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/config.example.yml:4` — commented-key documentation pattern (`wiki:` block).
- **Coverage of this requirement:** ≥80% — extends an existing dispatch batch and an existing halt.

## Prior work

- [[CR-090]] — wired the reader/synth fan-out into §A.4 that this story joins.
- [[EPIC-030]] — AI-driven sprint planning (Draft); no reviewer concept.

## Why not simpler?

- **Smallest existing surface that could carry this:** §A.4's existing parallel batch and plan-confirmation halt.
- **Why isn't extension / parameterization / config sufficient?** It is exactly that: one config key plus one paragraph extending an existing batch. No smaller form exists, because ClearGate cannot know a target's reviewer names without config.

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

---
story_id: STORY-060-04
parent_epic_ref: EPIC-060
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-28T00:00:00Z
ambiguity: 🟢 Low
context_source: "EPIC-060 §2 (Zero-Decision Rule). Rule adapted from EGM resources/document_standards/implementation-readiness-standard.md ('The plan must leave zero design or architectural choices to the implementer'), rewritten for ClearGate. Revised 2026-10-28 after a fresh-context review of the draft: the check rides the existing Sprint Design Review readers (architect-reader digest + architect-synth), following STORY-059-02's optional cross_cutting field and §2.6 table, instead of a separate readiness reviewer agent. No code validates the digest shape (grep of .cleargate/scripts, cleargate-cli/src and cleargate-cli/scripts for digest fields returns nothing); only the agent prompts read it."
actor: Sprint Orchestrator, Architect and architect readers
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: templates,agent-prompts,sprint-planning
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
  last_gate_check: 2026-10-28T07:05:55Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-060-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-28T07:05:55Z
  sessions: []
---

# STORY-060-04: Zero-Decision Rule for Stories and Milestone Plans
**Complexity:** L2 — one template box, one optional digest field, one SDR table, two Architect rules, two orchestrator sentences, one text test.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Sprint Orchestrator, I want every design choice in a story or milestone plan made before a Developer starts, so that Developers implement decisions instead of making them, and the owner sees every open choice at plan confirmation.

### 1.2 Detailed Requirements
**Prerequisite:** STORY-059-02 (SPRINT-42) is merged; it adds the digest's `cross_cutting` field and SDR §2.6, and this story adds §2.7 after them. If `architect.md` has no §2.6 when this story starts, halt and report.

1. **Story template box.** `cleargate-cli/scaffold/core/.cleargate/templates/story.md`'s Ambiguity Gate gains, as its last box:
   `- [ ] §3 leaves no design choice to the Developer: data shape, API or CLI shape, dependencies, where new code goes and edge-case behaviour are all decided (Zero-Decision Rule).`
2. **Reader digest field.** `architect-reader.md`'s pinned digest shape gains an optional `decisions_left_open` list of `{ "decision": "<what is undecided>", "where": "<story section>" }`. There is one entry per design choice the story leaves to the Developer: data shape, API or CLI shape, a dependency, where new code goes, edge-case behaviour, or picking between listed options. An empty list means none were found. A digest without the field counts as `not reported by <story>`, not as none (the STORY-059-02 rule for `cross_cutting`). `architect-synth.md`'s "Reader digest shape (validated on input)" gains the same field.
3. **SDR §2.7.** `architect.md` `## Sprint Design Review` gains **§2.7 Decisions Left Open**: a table `Story | Decision | Where | Proposed answer`, one row per entry, or the single line `none`. On the N > 2 path `architect-synth.md` fills it from the digests; on the N ≤ 2 path the single Architect fills it while reading each story's §3.
4. **Owner questions at §A.4.** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` §A.4: every §2.7 row is an owner question in the plan-confirmation halt, in the same numbered batch as STORY-059-01's reviewer findings. The orchestrator amends the stories before §A.5 and records each answer as a `Human decision:` line in the story's §1.4.
5. **Milestone plan rule.** `architect.md`'s milestone plan structure: each per-story blueprint names one approach per decision; where it weighs options, it names the chosen one and the Developer implements that one. Each `## Open decisions for orchestrator` entry names the stories it blocks.
6. **No dispatch against an open decision.** SKILL.md §4 Phase B: before a story's Developer dispatch, every `## Open decisions for orchestrator` entry that blocks the story is resolved (from the orchestrator's own knowledge or by asking the owner) and the Architect is re-dispatched to amend the plan.

### 1.3 Out of Scope
- A separate readiness reviewer agent. The readers already read every story, so the check rides their digest.
- Changing the Developer's `plan_deviations` / `orchestrator_confirmed` fields; they stay the evidence for EPIC-060's metric.
- A readiness predicate for the new box: `ambiguity-gate-resolved` already fails a 🟢 claim with an unchecked box.
- Applying the rule to stories already written.

### 1.4 Open Questions

- **Question:** A separate `cleargate-review-readiness` agent at §A.4, or a field on the existing reader digest?
- **Recommended:** The digest field. The readers already run on every story, with no drafting context, and STORY-059-02 sets the pattern; a separate agent would add a dispatch and an on/off switch for the same check.
- **Human decision:** Accepted 2026-10-28 (owner) at the EPIC-060 Brief.

### 1.5 Risks

- **Risk:** STORY-059-01, STORY-059-02 and SPRINT-43's stories edit SKILL.md §A.4/§4, `architect.md` and `architect-reader.md`.
- **Mitigation:** The prerequisite above, plus rebase onto merged text. This story adds text and replaces none.
- **Risk:** SKILL.md is rendered for Codex through text anchors (`build-codex-payload.mjs`, STORY-058-12) that reject banned tokens.
- **Mitigation:** Keep new sentences free of `CODEX_SKILL_BANNED` tokens (e.g. `parallel()`, `Workflow tool`), leave anchors intact, run `npm run gen:codex`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | §2.7 is filled on both SDR paths (synth for N > 2, single Architect for N ≤ 2). |
| Interfaces | F | One surface per rule: template, agent prompts, skill. |
| Data | F | Behaviour does not vary by input shape. |
| Rules | T | The Zero-Decision Rule in template and plan, and the no-dispatch rule. |

```gherkin
Feature: Zero-Decision Rule for stories and milestone plans

  @rules
  Scenario: The story template asks for zero open design choices
    Given the canonical story.md template
    When its Ambiguity Gate is read
    Then its last box is the Zero-Decision Rule box

  @rules
  Scenario: Readers report decisions left open
    Given the canonical architect-reader.md and architect-synth.md
    When their digest shapes are read
    Then both declare an optional decisions_left_open list of decision and where
    And a digest without the field yields "not reported by <story>"

  @paths
  Scenario: §2.7 is filled on both SDR paths and becomes owner questions
    Given the canonical architect.md, architect-synth.md and SKILL.md §A.4
    When the Sprint Design Review rules are read
    Then §2.7 Decisions Left Open is filled by architect-synth for N > 2 and by the single Architect for N ≤ 2
    And every §2.7 row is an owner question in the plan-confirmation halt, answered before §A.5

  @rules
  Scenario: Milestone plans name one approach and tie open decisions to stories
    Given the canonical architect.md
    When the milestone plan structure is read
    Then it requires one chosen approach per decision
    And it requires each open decision to name the stories it blocks

  @rules
  Scenario: Error — a Developer is not dispatched against an open decision
    Given the canonical SKILL.md §4 Phase B
    When the Developer dispatch rule is read
    Then an open decision that blocks a story must be resolved and the plan amended before that story's Developer dispatch
```

### 2.2 Verification Steps (Manual)
- [ ] At the first §A.4 after this lands, confirm the SDR carries §2.7 and its rows appear in the plan-confirmation halt.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md` |
| Related Files | `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.cleargate/templates/story.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect-reader.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect-synth.toml`, `cleargate-cli/test/docs/zero-decision-rule-text.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/test/docs/zero-decision-rule-text.node.test.ts` |

### 3.2 Technical Logic
Text changes only. Put the digest field directly after STORY-059-02's `cross_cutting` in both pinned shapes, with the same optional-field wording. Put §2.7 after §2.6 in `architect.md` `## Sprint Design Review`, and the matching fill rule in `architect-synth.md` next to its §2.6 rule. Put the §A.4 sentence next to STORY-059-01's reviewer-findings paragraph. The milestone plan rules go in the plan structure under `## Per-story blueprint` and `## Open decisions for orchestrator`. The Phase B rule goes in §4. Run `npm run gen:codex` and stage every regenerated file it reports, including the rendered sprint-execution skill. The test asserts the phrases in the five scenarios against the canonical files.

### 3.3 API Contract (if applicable)
Not applicable.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | One per §2.1 scenario, in `test/docs/zero-decision-rule-text.node.test.ts`. |
| Integration tests | 0 | Text-only change; no infrastructure. |
| E2E / acceptance tests | 0 | The live SDR is checked manually at the next sprint (§2.2). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] `npm run gen:codex` re-run; `prebuild`'s `--check` passes.
- [ ] Live mirrors re-synced per the framework-sprint routine; `doctor` reports no drift.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md:16` — the pinned digest shape.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md:19` — "Reader digest shape (validated on input)".
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:96` — the §2.1–2.5 Sprint Design Review list that §2.6 (STORY-059-02) and §2.7 extend.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:56` — `## Open decisions for orchestrator` in the milestone plan structure.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:171` — §A.4; `:233` — §4 Phase B.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/story.md:247` — the story Ambiguity Gate.
- **Coverage of this requirement:** ≥80% extension. Every change adds a field, a table or a sentence to an existing section; no new agent or dispatch.

## Prior work

- [[EPIC-059]] — STORY-059-02 adds the digest's `cross_cutting` field and SDR §2.6; this story follows the same pattern for §2.7. STORY-059-01's reviewer batch supplies the owner-question halt §2.7 joins.
- [[CR-124]] — contract-first SDR; §2.7 sits beside its output, not inside the DAG.
- Zero-decision plans or open plan options: none found.

## Why not simpler?

- **Smallest existing surface that could carry this:** the Architect plan's existing `## Open decisions for orchestrator` list.
- **Why isn't extension / parameterization / config sufficient?** That list covers milestone plans, which are written after §A.4, so a story's open choices would still surface mid-sprint. Nothing stops a Developer dispatch while the list has entries, and nothing asks the story author for zero open choices. The fix is one field on a digest the readers already produce, one table beside §2.6, and three sentences. No new agent or dispatch.

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

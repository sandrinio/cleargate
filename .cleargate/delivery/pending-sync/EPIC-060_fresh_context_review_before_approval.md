---
epic_id: EPIC-060
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-28T00:00:00Z
ambiguity: 🟢 Low
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-10-28T00:00:00Z
  reason: "Direct owner request 2026-10-28, after reviewing a comparison of Google's Elephant-Goldfish Model with ClearGate: 'create epics/stories accordingly. i agree with your suggestions'. The comparison in chat is the proposal; no ClearGate proposal or initiative exists to point parent_ref at."
context_source: "Owner, 2026-10-28: asked what ClearGate could adopt from https://github.com/google/elephant-goldfish-model (EGM, Apache-2.0), then 'create epics/stories accordingly. i agree with your suggestions'. The five agreed suggestions: (1) fresh-context reviewers on work items before 🟢, (2) reviewer isolation via omitClaudeMd + read-only tools, (3) EGM's finding-resolution rules (contest/escalate/fix/decline), (4) the Zero-Decision Rule for implementation plans, (5) a scoped-down drift check on cited surfaces. Items 1-4 are this epic; item 5 is CR-125. EGM sources read 2026-10-28 from a shallow clone: README, docs/designs/architecture.md, agents/{zoom_out,comprehension,synthesizer}.md, resources/document_standards/*.md, skills/{egm-review,egm-resolve,egm-review-loop,egm-drift-report}/SKILL.md, docs/claude.md. omitClaudeMd presence verified in the installed Claude Code 2.1.312 binary."
owner: sandrinio
target_date: null
area: agent-prompts,templates,readiness-gates,sprint-planning,sprint-execution
created_at: 2026-10-28T00:00:00Z
updated_at: 2026-10-28T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-28T14:06:17Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-10-28T10:54:11Z
  sessions:
    - session: 17f0e3c5-3007-4b4b-8560-b0cf628958a4
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-10-28T07:03:44Z
---

# EPIC-060: Fresh-Context Review Before Approval

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Before the owner approves an epic or CR, and before a sprint's stories execute, have read-only reviewer agents that never saw the drafting conversation check the draft, and record how each of their findings was handled.</objective>
  <architecture_rules>
    <rule>A reviewer receives the target file path and nothing from the drafting conversation. On Claude Code it runs with omitClaudeMd: true and tools Read, Grep, Glob.</rule>
    <rule>Reviewer prompt text is written for ClearGate. The approach comes from Google's Elephant-Goldfish Model (Apache-2.0); do not copy its prompt text into the MIT-licensed cleargate-cli. Each reviewer file credits EGM with a link.</rule>
    <rule>No new gate. The Gate-1 review runs before the existing Brief; the story review rides EPIC-059's §A.4 plan-confirmation halt.</rule>
    <rule>Canonical edits land in cleargate-cli/scaffold/** on a story branch in the cleargate-cli repo. Live mirrors follow the framework-sprint routine (.cleargate/** on merge, /.claude/** and the root CLAUDE.md block at Gate 4); cleargate doctor reports no drift afterwards. Run npm run gen:codex after any agent edit.</rule>
    <rule>New body sections go directly above the Ambiguity Gate. Readiness predicates address sections by index (epic section(8), CR section(3) and section(6)); a section inserted earlier shifts those indices.</rule>
    <rule>Do not edit cleargate-planning/** (frozen since STORY-058-01).</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-review-simplicity.md" action="create" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-review-clarity.md" action="create" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-contradict.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/CLAUDE.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/AGENTS.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/epic.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/CR.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/story.md" action="modify" />
    <file path="cleargate-cli/src/lib/readiness-predicates.ts" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
The agent that drafts a work item also ticks its own Ambiguity Gate and writes the Brief. The readiness predicates check that sections exist, not that what they say holds up: `simplest-form-justified` passes when the `## Why not simpler?` heading is present. So the owner is the only reader who did not write the draft. Google's Elephant-Goldfish Model (EGM) is built on the same observation: a reviewer that shares the author's context tends to confirm the author's assumptions. EGM splits the roles. An agent with full context drafts, and agents with no conversation history review against fixed criteria. The cost shows up at execution too: ClearGate has had Developers choose between options a milestone plan left open, which is a design decision made by the wrong agent.

**What we build:** two read-only reviewer agents, a review step before the Gate-1 Brief for epics and CRs, one set of rules for handling any reviewer's or QA's findings, and the Zero-Decision Rule for stories and milestone plans. At sprint planning, the existing Sprint Design Review readers check the Zero-Decision Rule; they already read every story without the drafting context.

**Success Metrics (North Star):**
- **Every new epic and CR records an independent review.** All epics and CRs created after this lands carry a filled `## Independent review` section or an owner waiver. Measured by listing epics and CRs whose `created_at` follows the release and checking two things: the section heading is present, and `independent-review-recorded` passes. The predicate alone is not enough, because it passes when the section is absent.
- **Developers stop making design choices.** In the first sprint planned after this lands, zero Developer reports carry a `plan_deviations` entry with `orchestrator_confirmed: false` that names a choice the plan or story left open. Measured from the sprint's dev reports.
- **The review stays cheap.** At most 2 reviewer dispatches per epic or CR, and no new dispatch at sprint planning. Measured from the token ledger.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] **Reviewer agents** ([[STORY-060-01]]): `cleargate-review-simplicity` (unneeded features, reuse checked by code search, symptom-vs-cause, epic prose sliding into code detail) and `cleargate-review-clarity` (a reader who knows nothing about the project: undefined terms, assumed setup, vague mechanisms). Both are read-only and isolated. `cleargate-wiki-contradict` also gains `omitClaudeMd: true`.
- [ ] **Gate-1 review and finding resolution** ([[STORY-060-02]]): after writing an epic or CR, the conversational agent runs the simplicity and clarity reviewers in parallel, resolves each finding with the new protocol §24 rules (fixes are applied to the draft before the Brief, not listed for approval), records the outcome in a new `## Independent review` section, and only then writes the Brief. Escalated findings become owner questions, listed first. Contested findings are listed in the Brief with their evidence, so the owner, not the author, rules on them.
- [ ] **Machine check** ([[STORY-060-03]]): an `independent-review-recorded` readiness predicate on epic `ready-for-decomposition` and CR `ready-to-apply`, modelled on `prior-work-recorded`.
- [ ] **Zero-Decision Rule** ([[STORY-060-04]]): a story Ambiguity Gate box. An optional `decisions_left_open` field on the architect-reader digest, filled into a new SDR §2.7 whose rows become owner questions at §A.4. A milestone-plan rule in `architect.md`. And an orchestrator rule that no Developer is dispatched against an open decision for its story.
- [ ] **Findings in the execution loop** ([[STORY-060-05]]): after a `QA: FAIL`, the Developer fixes or contests each finding with readable evidence. QA withdraws or upholds every contested finding. Escalations go to the orchestrator before QA is re-dispatched.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- EGM's five-stage review pipeline with a checkpoint after each stage. One parallel pass, one record.
- EGM's brainstorm and bootstrap skills (directory-README generation overlaps the code-map and wiki).
- EGM's "one question at a time" rule. It conflicts with the Brief's batched Open Questions and with EPIC-059's single batch of owner questions.
- Running each reviewer twice for recall, and EGM's other lenses (design critic, structural, style, codebase details).
- A separate readiness reviewer agent at §A.4. The architect readers already read every story, so the Zero-Decision check rides their digest.
- Gate-1 review of stories, bugs, hotfixes, spikes and initiatives. Stories are reviewed in one batch at §A.4.
- Tool restriction and CLAUDE.md/AGENTS.md omission on the Codex host. Codex has no per-agent tool allowlist and no equivalent of `omitClaudeMd`.
- `omitClaudeMd` for Developer, DevOps, QA, Architect or the architect readers. They need the project's conventions.
- Spec-vs-code drift on cited surfaces (CR-125).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Dependency | STORY-060-04 adds digest field and SDR §2.7 after STORY-059-02's `cross_cutting` and §2.6, and its owner questions join STORY-059-01's §A.4 halt. Schedule this epic after SPRINT-42. Story order inside the epic: 060-01 → 060-02 → 060-03; 060-04 after SPRINT-42; 060-05 after 060-02 and SPRINT-43. Each story states its prerequisite. |
| Shared surface | SPRINT-42 (EPIC-059) and SPRINT-43 (STORY-031-03/04, CR-120/121/122) edit `SKILL.md`, `qa.md`, `developer.md` and the architect agents. STORY-060-04 and STORY-060-05 rebase onto their merged text. |
| Host parity | Codex roles are generated from the Claude agent markdown (`build-codex-payload.mjs`), which never emits `tools` or `model`. On Codex a reviewer keeps conversation isolation (`spawn_agent` with `fork_turns: "none"`) but loads AGENTS.md and has the full tool set. The reviewer body states the read-only rule, so it applies on both hosts as an instruction. |
| Claude Code version | `omitClaudeMd` is present in the installed Claude Code 2.1.312; EGM documents 2.1.271 as the minimum. An older client ignores the key, so the reviewer then loads CLAUDE.md: weaker isolation, no failure. |
| License | cleargate-cli is MIT and EGM is Apache-2.0. ClearGate writes its own prompt text and credits EGM. |
| Cost | Reviewers run on `sonnet`. The review is once per draft: re-run only when the owner asks. |
| Section indices | Readiness predicates address sections by index. `## Independent review` sits directly above the Ambiguity Gate so no existing index shifts. |

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-contradict.md` — the existing read-only (Read, Grep, Glob), advisory reviewer agent. It is the pattern the three new reviewers follow.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/CLAUDE.md:32` — the "Brief is the universal pre-push handshake" paragraph. The Gate-1 review step goes next to it.
- **Surface:** `cleargate-cli/scaffold/hosts/codex/AGENTS.md:24` — the same paragraph for the Codex host.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:1075` — `evalPriorWorkRecorded`, the model for `independent-review-recorded`.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:171` — §A.4 Architect Sprint Design Review, where STORY-059-01's reviewer batch runs.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:56` — the milestone plan's `## Open decisions for orchestrator` block.
- **Surface:** `cleargate-cli/scripts/build-codex-payload.mjs:243` — `renderAgentToml`, which generates the Codex roles.
- **Coverage of this epic's scope:** ≥80% extension. The new pieces are three agent files and one predicate; everything else extends a paragraph, template section or rule that already owns that moment of the process.

## Prior work

- [[EPIC-059]] — STORY-059-02 adds the reader digest's `cross_cutting` field and SDR §2.6; STORY-060-04 follows the same pattern for §2.7. STORY-059-01's §A.4 halt carries the resulting owner questions. This epic adds no reviewer to `sprint.draft_reviewers`, which stays for domain reviewers each target brings.
- [[CR-033]] — the Reuse Audit that made `## Existing Surfaces` checkable for path existence. The simplicity reviewer checks whether the reuse claim itself holds.
- [[CR-122]] — Developer prompt context (red tests, granted permissions). It edits `developer.md`, as STORY-060-05 does.
- [[EPIC-058]] — clean-room harnesses. They isolate an install environment, not a reviewer's context; no overlap beyond the word.
- Finding-resolution taxonomy, Zero-Decision Rule, `omitClaudeMd`: none found.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** the owner reading the Brief, which is today's process, or EPIC-059's `sprint.draft_reviewers` hook with reviewers each target writes for itself.
- **Why isn't extension / parameterization / config sufficient?** The Brief leaves the owner as the only independent reader. EPIC-059's hook runs for stories only and ships no reviewers, so epics and CRs, where the design decisions are made, get no independent read. One CLAUDE.md paragraph saying "review your draft in a subagent" would be the smallest change, but each run would improvise its own criteria, the dispatching agent would pass along its own framing, a general-purpose subagent loads CLAUDE.md and can edit files, and nothing would show the review happened. The five stories land on separate surfaces (agent files, CLAUDE.md and templates, the CLI predicate, planning rules, the execution loop). Each can ship and be reverted on its own. The author can contest a finding, because a reviewer without context is sometimes wrong, and forcing the edit would add text no human reader needs. But every contest is shown to the owner with its evidence, so the owner rules on it, not the author. At sprint planning the check rides the existing readers instead of a new agent.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-review-{simplicity,clarity}.md` (new) — the two reviewers (STORY-060-01).
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-contradict.md` — gains `omitClaudeMd: true` (STORY-060-01).
- `cleargate-cli/scaffold/hosts/codex/.codex/agents/cleargate-review-*.toml` (generated by `npm run gen:codex`) — Codex roles (STORY-060-01).
- `cleargate-cli/scaffold/hosts/claude/CLAUDE.md` and `cleargate-cli/scaffold/hosts/codex/AGENTS.md` — the Gate-1 review paragraph (STORY-060-02).
- `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md` — new `## 24. Finding Resolution` (STORY-060-02).
- `cleargate-cli/scaffold/core/.cleargate/templates/epic.md` and `CR.md` — `## Independent review` section and Brief line (STORY-060-02).
- `cleargate-cli/src/lib/readiness-predicates.ts` and `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md` — the new predicate and its registration (STORY-060-03).
- `cleargate-cli/scaffold/core/.cleargate/templates/story.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md`, `architect-reader.md`, `architect-synth.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` (§4 Phase B, §A.4) — the Zero-Decision Rule (STORY-060-04).
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` (§C.5) — findings in the execution loop (STORY-060-05).

**Data Changes:**
- New body section `## Independent review` in epics and CRs.
- New readiness predicate id `independent-review-recorded`.
- No frontmatter, state.json or database change.

## 5. Acceptance Criteria

```gherkin
Feature: Fresh-context review before approval

  Scenario: An epic draft is reviewed before its Brief
    Given the conversational agent has just written an epic
    When it prepares the Gate-1 Brief
    Then it has first dispatched cleargate-review-simplicity and cleargate-review-clarity in parallel with only the file path
    And the epic's ## Independent review section records each reviewer's result
    And every escalated finding appears as an owner question at the top of the Brief
    And every contested finding appears in the Brief with its evidence

  Scenario: A sprint's stories are checked for open design choices
    Given a sprint plan reaches §A.4
    When the Sprint Design Review runs
    Then each reader digest lists the design choices its story leaves open
    And the SDR's §2.7 Decisions Left Open turns them into owner questions at plan confirmation

  Scenario: A Developer contests a QA finding with evidence
    Given QA failed a story with three findings
    When the Developer is re-dispatched
    Then each finding is either fixed or contested with a file, story section or plan line QA can read
    And QA withdraws or upholds every contested finding in its next verdict

  Scenario: Error — an epic with an unfilled review record does not pass its gate
    Given an epic whose ## Independent review section still holds the template placeholder
    When cleargate gate check runs on it
    Then independent-review-recorded fails and names the missing reviewer result

  Scenario: Error — a reviewer that cannot read its target gives no verdict
    Given a reviewer is dispatched with a path that does not exist
    When it runs
    Then it returns INCOMPLETE REVIEW naming the path, and no findings
```

## 6. AI Interrogation Loop (Human Input Required)

_(empty — two questions resolved by the owner 2026-10-28: epics and CRs get the Gate-1 review, and the drafting agent applies fixes before the Brief. Answers integrated into §2, the STORY-060-02 bullet and Out-of-scope.)_

## Independent review

- general-purpose: 10 findings on this epic and STORY-060-01..05 — 10 fixed, 0 contested, 0 escalated, 0 declined
  - Run 2026-10-28 with a fresh-context sonnet subagent (no drafting conversation), using this epic's simplicity, clarity and readiness lenses, before the reviewer agents exist.
  - Largest fix: the separate readiness reviewer agent was dropped. The Zero-Decision check now rides the architect-reader digest (STORY-060-04), which also removed an owner question.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths. *(Accepted by the owner 2026-10-28: every existing path is verified; §4 also lists the two new reviewer files and their generated Codex roles, which STORY-060-01 creates.)*
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

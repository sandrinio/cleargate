---
epic_id: EPIC-059
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-42
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-08T00:00:00Z
ambiguity: 🟢 Low
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-10-04T00:00:00Z
  reason: Direct owner request 2026-10-04 to file Kurnera CR-002 (owner-approved in the Kurnera repo the same day) as a ClearGate epic for the next sprint. The CR is itself the proposal; no ClearGate proposal or initiative exists to point parent_ref at. Recorded per the direct-approval waiver path rather than authoring a retrospective proposal.
context_source: "Owner, 2026-10-04: 'check this out. we need to file this as an epic for next sprint. so draft next sprint too' — pointing at Kurnera CR-002 (Kurnera-s03 repo, .cleargate/delivery/pending-sync/CR-002_planning_process_from_sprint_03.md, status Approved). Owner chose 'Fold into SPRINT-42' over a separate SPRINT-43. Kurnera CR-002 derives from Kurnera's SPRINT-03 review; its owner instruction was 'we shouldn't make it complicated too much'. Upstream file locations verified 2026-10-04 against cleargate-cli/scaffold (canonical since STORY-058-01) and the live .claude/ and .cleargate/ mirrors. AMENDED 2026-10-08: owner asked to deliver this epic next and chose 'EPIC-059 alone' — SPRINT-42 re-cut to EPIC-059's four stories plus BUG-052; the EPIC-031 efficiency work and BUG-117 moved to SPRINT-43. Owner accepted all three §6 recommendations (integrated into §2 and §4) and chose to land STORY-059-03 before STORY-031-03/04."
owner: sandrinio
target_date: 2026-10-31
area: sprint-planning,sprint-execution,agent-prompts,templates
created_at: 2026-10-04T00:00:00Z
updated_at: 2026-10-08T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-08T13:22:50Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-059
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-03T23:20:10Z
  sessions: []
---

# EPIC-059: Planning Catches What Execution Stopped For

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Add four short process rules to the canonical scaffold, learned from a downstream sprint, so that conflicts already present in story drafts surface once at plan confirmation instead of as mid-sprint halts.</objective>
  <architecture_rules>
    <rule>Text and template changes only. No new script, agent, CLI command or readiness predicate.</rule>
    <rule>Canonical edits land in cleargate-cli/scaffold/** on a story branch in the cleargate-cli repo; the live .claude/ and .cleargate/ mirrors are updated in the same story and diffed for parity.</rule>
    <rule>Every new behaviour is optional or defaults to today's behaviour: an empty draft-reviewer list changes nothing.</rule>
    <rule>Do not edit cleargate-planning/** (frozen since STORY-058-01).</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/Sprint Plan Template.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/config.example.yml" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Kurnera, a downstream install on cleargate 0.26.1, ran a sprint in which four of six UI stories stopped mid-sprint for an owner decision. Every one of those conflicts was already in the story text when it was written. The same sprint showed four more gaps no ClearGate rule covers. Test data piled up because no story owned its cleanup. A merged guard's failure stayed hidden until the Developer hit it. A tool defect was worked around for the whole sprint and never filed. And the owner's walkthrough ran on the dev server, not on the build the tests verify. Kurnera fixed what lives in its own files. Three of the four rules land on files whose install policy is `always` (`qa.md`, the sprint-execution skill) or `merge-3way` (the Sprint Plan template). A local fix there is erased or conflicted by `cleargate upgrade`, so the rules have to land upstream.

**Success Metrics (North Star):**
- **Domain review moves to plan confirmation.** The first sprint planned on a release carrying this epic has zero mid-sprint halts by a domain reviewer for text that was already in a story draft at planning. Measured from the sprint's §4 Execution Log and halt reasons.
- **Cross-cutting checks are filled at the SDR.** Every SDR produced after this lands includes a §2.6 Cross-cutting checks table with all five rows answered. A row no story owns is shown as `UNOWNED`. Measured by reading the sprint plan.
- **Red tests break nothing that's merged.** Zero cases where the orchestrator or Developer edits a frozen red test because it broke a merged test. Measured from the sprint §4 log and the git history of `*.red.*` files.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] **Rule 1, draft reviewers** ([[STORY-059-01]]): an optional `sprint.draft_reviewers` list of agent names in `.cleargate/config.yml`, documented as a commented example in `config.example.yml`. Reviewers are agent names in the target's `.claude/agents/`; ClearGate ships none. At §A.4, each listed reviewer runs once over all candidate story files, in the same parallel batch as the architect readers. Its findings fold into the plan-confirmation halt as one numbered batch of owner questions, and the stories are amended before §A.5. §A.4 is the one place ClearGate already halts for the owner to confirm the plan before any story executes, so no new gate is added.
- [ ] **Rule 2, cross-cutting checks** ([[STORY-059-02]]): add a §2.6 Cross-cutting checks table (test data, walkthrough, app-level behaviour, surfaces, limits) to the Sprint Plan template. Readers report the per-story facts, the synth fills the table, and rows with no owner are marked `UNOWNED`.
- [ ] **Rule 3, the QA-Red merged-rule check** ([[STORY-059-03]]): QA-Red proves its red tests break no merged test before they are frozen. The check is declared once, in a §Test Stack `Red-commit check` row, which holds either a command (default: the repo's unit suite — Kurnera's rule as written) or `developer-commit` (the Developer's existing commit-time full run is the check, for repos with a slow suite). ClearGate's own sprint-context sets `developer-commit`, so [[STORY-031-04]]'s saving stands. A failure that surfaces later and is caused by a frozen red test routes back to QA-Red, never to the Developer or orchestrator.
- [ ] **Rule 4, three orchestrator habits** ([[STORY-059-04]]): check owner wording against every state, input and role before recording it; file a BUG the same day a tool or gate needs a workaround; run the walkthrough on the tested build at an allowed origin.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- A designer agent, or any domain reviewer shipped in the scaffold. ClearGate ships the hook point; the target repo brings its own reviewer agents.
- A readiness predicate that blocks a sprint plan missing §2.6. The table is advisory in this epic.
- The surface-gate story resolution defect behind Kurnera's BUG-006. It is already filed as [[BUG-052]] and rides in the same sprint as its own item.
- Kurnera's own files (its sprint-planning skill, designer agent and CLAUDE.md). Kurnera already changed them.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Install policy | `qa.md` and `skills/sprint-execution/SKILL.md` install `always` (a downstream local edit is overwritten on upgrade), and the templates install `merge-3way`. Only an upstream change reaches every target. |
| Shared surface | This epic has four SKILL.md writers (one per story) and one `qa.md` writer. The SDR must partition SKILL.md by section. SPRINT-43's STORY-031-03, STORY-031-04, CR-120, CR-121 and CR-122 edit the same two files and rebase onto this epic's merged text. |
| Test-cost budget | SPRINT-43's goal (STORY-031-04) forbids agent full-suite runs outside declared carve-outs. Rule 3 must not reintroduce a per-story full run in a repo that has opted out (`developer-commit`, see §2 Rule 3). |
| Simplicity | Owner instruction carried from the source CR: "we shouldn't make it complicated too much." Each rule is a few lines in a file that already owns that moment of the process. |

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:211` — the §A.4 plan-confirmation halt. Rules 1 and 2 surface their findings here.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:88` — canonical §2.1–2.5 SDR definition; gains §2.6.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md:16` — the pinned digest shape; gains one `cross_cutting` field.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:41` — Mode RED numbered steps; Rule 3 adds one step.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md:37` — §Test Stack table; Rule 3 adds one row.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:654` — Phase D walkthrough; Rule 4 adds the tested-build rule.
- **Coverage of this epic's scope:** ≥80% extension. Each rule extends a section that already owns that moment of the process. Only `sprint.draft_reviewers` is a new key.

## Prior work

- [[CR-090]] — wired `architect-reader` / `architect-synth` into SKILL.md §A.4; Rules 1 and 2 extend that fan-out.
- [[CR-124]] — contract-first SDR (`schema_version: 2` waves.json); Rule 2 adds a §2.6 beside its output, not inside the DAG.
- [[EPIC-030]] — AI-driven sprint planning (Draft); no domain-reviewer concept, no overlap in scope.
- [[STORY-031-04]] — QA-Red runs only its own files. Rule 3 conflicts with it directly; reconciled by the `Red-commit check` row (§2 Rule 3). STORY-031-04 moved to SPRINT-43 and rebases onto STORY-059-03.
- [[BUG-113]], [[BUG-109]] — `qa.md` Mode RED fixes (layer counts, expected-red incidents) carried from SPRINT-41, not yet landed; whichever lands second rebases.
- [[BUG-052]] — the surface-gate defect Kurnera filed as its BUG-006. Already filed upstream, so it isn't re-filed here.
- Rule 4's three habits: none found.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** Kurnera's own files, which is where Kurnera already put the rules. That does not work for three of the four rules, because `cleargate upgrade` overwrites `qa.md` and SKILL.md (`always`).
- **Why isn't extension / parameterization / config sufficient?** It mostly is, and that is the design. Three rules are text extensions to existing sections. The one config key (`sprint.draft_reviewers`) exists because ClearGate ships no domain reviewers, and a hard-coded designer step would be wrong for every non-UI repo. This could be a single CR. It is an epic because the owner asked for one, and because four independent rules touching seven files across two SDR phases split cleanly into four reviewable stories.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` — §A.4 (Rules 1, 2), §C.3 + §C.0.2 step 6 (Rule 3), §C.10, §6 Phase D and §11 (Rule 4).
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md` — §Sprint Design Review gains §2.6 (Rule 2).
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-reader.md` — digest gains `cross_cutting` (Rule 2).
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect-synth.md` — fills §2.6 from digests (Rule 2).
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md` — Mode RED merged-rule step (Rule 3).
- `cleargate-cli/scaffold/core/.cleargate/templates/Sprint Plan Template.md` — §2.6 table (Rule 2).
- `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md` — §Test Stack `Red-commit check` row (Rule 3).
- `cleargate-cli/scaffold/core/.cleargate/config.example.yml` — commented `sprint.draft_reviewers` example (Rule 1).
- Live mirrors of each file under `.claude/` and `.cleargate/`.

**Data Changes:**
- `.cleargate/config.yml`: new optional key `sprint.draft_reviewers: [<agent-name>, ...]`. Absent or empty means no change.

## 5. Acceptance Criteria

```gherkin
Feature: Planning catches what execution stopped for

  Scenario: Draft reviewers report before the plan is confirmed
    Given config.yml lists sprint.draft_reviewers: [designer]
    And a sprint with three candidate stories
    When the orchestrator runs SKILL.md §A.4
    Then the designer agent is dispatched once over all three story files
    And its findings appear as one numbered batch in the plan-confirmation halt

  Scenario: No reviewers configured changes nothing
    Given config.yml has no sprint.draft_reviewers key
    When the orchestrator runs SKILL.md §A.4
    Then no draft-reviewer dispatch occurs

  Scenario: An unowned cross-cutting concern is flagged
    Given a sprint whose stories create test data and none declares its cleanup
    When the SDR emits §2.6
    Then the Test data row reads UNOWNED with the creating story IDs

  Scenario: A red test that breaks a merged test is caught by QA-Red
    Given §Test Stack declares a Red-commit check command
    When QA-Red's new red file makes a previously passing test fail
    Then QA-Red fixes its own tests before reporting QA-RED: WRITTEN

  Scenario: The walkthrough runs the tested build
    Given the orchestrator reaches Phase D
    When it invites the owner to walk through
    Then the invitation names the build, origin and data the tests verified, not the dev server
```

## 6. AI Interrogation Loop (Human Input Required)

_(empty — three questions resolved by the owner 2026-10-08; answers integrated into §2 Rules 1 and 3, §3 and §4.)_

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

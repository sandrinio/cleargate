---
epic_id: EPIC-054
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
approved: true
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-08-25T00:00:00Z
ambiguity: 🟢 Low
context_source: "direct-human-ask 2026-08-25 (\"maybe we should add tasks template\" → \"agree with B\" → \"what about the spike?\" → \"pre-sprint, agreed\" → \"go ahead and draft. include the tasks part in the epic too\"). Proposal gate waived: sharp intent across a five-turn option-evaluation conversation in which scope was narrowed live — the task surface was reduced from a new work-item type to a template section after the closed-set execution unit was verified in state.json, and the spike surface was reduced from an in-sprint lane to a pre-sprint charter after the human chose pre-sprint explicitly. Inline references: cleargate-cli/src/lib/work-item-id.ts:41-53 (SPIKE already in TYPE_PREFIXES), cleargate-cli/src/lib/work-item-type.ts:8 (closed WorkItemType union without spike), cleargate-cli/src/lib/readiness-predicates.ts:632-657 (evalSection index semantics), .cleargate/knowledge/readiness-gates.md:84-206, .cleargate/templates/story.md:27. Waiver per ~/.claude memory feedback_proposal_gate_waiver.md. Originating evidence: two orphaned spike citations in permanent docs (.cleargate/knowledge/cleargate-enforcement.md:101 \"spike decision 2\", .cleargate/knowledge/cleargate-protocol.md:882 \"the STORY-033-01 spike\") whose source documents do not exist — spike findings survive today only when an author hand-copies them into a knowledge file."
owner: sandrinio
target_date: 2026-09-30
created_at: 2026-08-25T00:00:00Z
updated_at: 2026-08-25T09:46:21Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-25T09:46:21Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# EPIC-054: Spike & Task Decomposition Surfaces — Discovery Before, Execution Within

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Add the two missing decomposition surfaces — a pre-sprint SPIKE charter type for bounded discovery, and a Task Breakdown section inside Story/CR/Bug for L3 execution sequencing — without adding a second granularity to the sprint execution machine.</objective>
  <architecture_rules>
    <rule>The atomic execution unit stays the Story. Nothing in this epic may add a second unit to state.json, worktree cutting, dispatch markers, or token-ledger attribution.</rule>
    <rule>Tasks are a template section, never a pushed work item. They get no id, no remote id, no lifecycle state.</rule>
    <rule>Spikes run pre-sprint. A spike never enters the five-agent loop and its prototype code never merges to a sprint branch.</rule>
    <rule>Every template edit lands in BOTH the live tree (.cleargate/templates/, .claude/) and the canonical mirror (cleargate-planning/**). Canonical does not auto-propagate — see CLAUDE.md "Dogfood split".</rule>
    <rule>Type prefixes come from cleargate-cli/src/lib/work-item-id.ts TYPE_PREFIXES and nowhere else. Do not add a fourteenth private id parser.</rule>
    <rule>No new ## heading may be added to a gated template without updating the matching section(N) index in readiness-gates.md in the same commit.</rule>
    <rule>Template &lt;instructions&gt; blocks are stripped from every authored instance — a real story file carries zero. A rule placed there reaches ONLY the agent drafting from the template. Any rule an executing agent needs (Architect, Developer, QA) must ALSO be written into that agent's own .md. Rules needed at both times are written twice, deliberately.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/lib/work-item-type.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/page-schema.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/load-wiki.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/synthesis/product-state.ts" action="modify" />
    <file path=".cleargate/templates/spike.md" action="create" />
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".cleargate/templates/CR.md" action="modify" />
    <file path=".cleargate/templates/Bug.md" action="modify" />
    <file path=".cleargate/knowledge/readiness-gates.md" action="modify" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path=".cleargate/config.yml" action="modify" />
    <file path=".claude/agents/architect.md" action="modify" />
    <file path=".claude/agents/developer.md" action="modify" />
    <file path=".claude/agents/qa.md" action="modify" />
    <file path=".claude/skills/sprint-execution/SKILL.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

ClearGate has exactly one granularity between "epic" and "commit": the Story. That single rung is asked to carry two jobs it cannot do, at opposite ends of the lifecycle.

**Before a spec exists**, there is no artifact for bounded discovery. Current doctrine says to make the spike a Story (`.cleargate/templates/story.md:27` — "carve out a spike as its own story"), but a Story's entire contract is §2 Gherkin, §3 files-to-touch, and §4 DoD, and a spike by definition cannot populate any of them at draft time. That inability *is* the spike. Worse, the ambiguity gate inverts: every template halts until ambiguity is 🟢, but a spike starts 🔴 and cannot reach 🟢 until the work is done — resolving the ambiguity is the deliverable. A spike drafted as a Story is therefore either permanently blocked or moved on a dishonest 🟢. The observable cost is already in the repo: `cleargate-enforcement.md:101` and `cleargate-protocol.md:882` both cite spike decisions whose source documents do not exist. Those findings survived only because an author hand-copied them into a knowledge file.

**After a spec exists**, an L3 story has real internal sequence, and today it lives only in the Architect's per-story blueprint under `.cleargate/sprint-runs/<id>/plans/M<N>.md` — a sprint-run artifact that is never pushed, never ingested into the wiki, never reconciled at close, and discarded with the run. CRs and Bugs have no decomposition surface at all, and off-sprint they do not even get a milestone plan.

**Success Metrics (North Star):**
- Metric 1: Spike findings reach a durable, addressable document. Measured by: every `SPIKE-NNN` cited in `.cleargate/knowledge/**` resolves to a file under `.cleargate/delivery/**`. Baseline today: 0 of 2 cited spikes resolve.
- Metric 2: An L3 story's execution sequence survives its sprint. Measured by: for stories with `complexity_label: L3`, the `## Task Breakdown` section is non-empty at merge and fully checked at QA-Verify.
- Metric 3: No growth in the execution machine's unit count. Measured by: `state.json` schema keys unchanged; `stories` remains the only per-unit map.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] **WS1 — Spike charter template.** New `.cleargate/templates/spike.md` + the `cleargate-planning/.cleargate/templates/` mirror. Sections: §1 The Question (what we do not know, stated falsifiably), §2 Timebox & Kill Criteria, §3 Decision Unblocked (which downstream choice this answer gates), §4 Decision Log (append-only, one entry per discovery round, grows *during* the spike), §5 Outcome & Spawned Items. Frontmatter carries `spike_id`, `timebox`, `kill_criteria`, `spawned_items: []`, `concluded_at`. **The ambiguity gate is re-anchored for this type only:** 🟢 means the *question* is sharp, the timebox is set, and the kill criteria are falsifiable — it does not mean the answer is known. This inversion is stated in the template's own gate block so no author has to infer it.

- [ ] **WS2 — Spike as a first-class type in the CLI and the gates.** `cleargate-cli/src/lib/work-item-type.ts:8` — extend the closed `WorkItemType` union with `'spike'`, register `spike_id` in the frontmatter-key table (:15) and `SPIKE-` in the prefix table (:29), and add `spike: ['ready-to-investigate', 'ready-to-conclude']` to `WORK_ITEM_TRANSITIONS` (:75). Add two `work_item_type: spike` gate blocks to `.cleargate/knowledge/readiness-gates.md`, `severity: advisory`, modelled on the `initiative` block at :220. Add a `spike` row to the KNOWN_TYPES table in `.cleargate/knowledge/cleargate-protocol.md:684` (8 entries → 9) so a spike push does not raise an L2 `TYPE_UNKNOWN`. `TYPE_PREFIXES` already contains `SPIKE` (`work-item-id.ts:49`) and needs no change — this workstream closes the divergence between the id grammar, which knows the type, and the type registry, which does not.

- [ ] **WS3 — Spike doctrine: pre-sprint, never merges.** Fix `.cleargate/templates/story.md:27` to route L4 splits to a SPIKE rather than "its own story". Add a Spike clause to `.claude/skills/sprint-execution/SKILL.md` + mirror stating that spikes run *before* sprint kickoff, take no `state.json` slot, get no worktree from the sprint loop, and that prototype code lives on a throwaway `spike/SPIKE-NNN` branch that is **discarded, never merged**. Add Spike to the triage classification list in `CLAUDE.md` + the `cleargate-planning/CLAUDE.md` canonical — this list is load-bearing, not decorative: triage happens *before* any template is opened, so a type absent from `CLAUDE.md:140` is unreachable no matter how good its template is. Also add a short **Guidance Surface Reach** subsection to `.cleargate/knowledge/cleargate-protocol.md` + mirror, stating which surface reaches which agent at which moment (template `<instructions>` → drafting agent only, stripped from instances; agent `.md` → executing agent; always-on `CLAUDE.md` → pre-template decisions). This is the durable home for the rule that governs WS3, WS6, and WS7; without it, each future scaffold change rediscovers it.

- [ ] **WS4 — Spikes in the awareness layer.** Add `spikes` to `wiki.ingest_buckets` in `.cleargate/config.yml:12` + the `cleargate-planning/` mirror, and to the four hardcoded bucket lists: `cleargate-cli/src/wiki/page-schema.ts:176`, `:181`, `:184`, `cleargate-cli/src/wiki/load-wiki.ts:13`, and `cleargate-cli/src/wiki/synthesis/product-state.ts:36`. Spikes are ingested for the same reason initiatives are: the document *is* the deliverable, and an un-ingested spike is exactly the orphaned-citation failure this epic exists to close.

- [ ] **WS5 — Section-index contract (prerequisite for WS6).** `section(N)` in `readiness-gates.md` is a **positional index over `## ` headings**, not the ordinal printed in the heading text (`cleargate-cli/src/lib/readiness-predicates.ts:640-650`). Those two numbers have already drifted apart in two shipped gates — see §3. Correct the drifted indices, then add a test that pins, for every gated template, the resolved heading text behind each `section(N)` criterion. The test is the actual deliverable: it converts a silent class of failure into a build break, and it is what makes WS6 safe to land.

- [ ] **WS6 — Task Breakdown section in Story / CR / Bug.** Add `## Task Breakdown` to `.cleargate/templates/{story,CR,Bug}.md` and the three `cleargate-planning/` mirrors, placed semantically (Story: directly after §3 The Implementation Guide) with the matching `readiness-gates.md` index updated in the same commit per WS5. Row shape: `- [ ] <action>` with an optional trailing `→ <requirement-id>` reference. **Required at L3 and above, optional at L2, omitted at L1** — this preserves the Granularity Rubric's bias toward splitting rather than legitimising fat stories. The requirement reference is deliberately reserved-but-empty for [[EPIC-052]]'s `R`-ids: the column ships now so that landing EPIC-052 WS1 does not force a second pass over six template files.

- [ ] **WS7 — Architect writes it, QA verifies it.** `.claude/agents/architect.md:44` ("Per-story blueprint") + mirror: the Architect additionally writes its task rows into the story file's `## Task Breakdown`, so the breakdown becomes part of the durable work item rather than a sprint-run artifact. `.claude/agents/developer.md` + mirror: the Developer ticks its Task Breakdown rows as it goes — **this is the box-ticking actor and omitting it is the failure mode**, because QA would otherwise bounce stories for unchecked boxes no agent was ever told to check. `.claude/agents/qa.md` + mirror: QA-Verify asserts every `- [ ]` in `## Task Breakdown` is checked, or that the story states why an item was dropped. Advisory in v1 — it flags, it does not bounce.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- A `task` work-item type, id, or remote push. Tasks are a template section and nothing more.
- Any `state.json` schema change, spike lane, spike worktree, or spike token-ledger attribution. Spikes are pre-sprint and produce a document, not merged code.
- A spike execution agent or new agent role. The conversational agent runs spikes.
- Auto-generating the Epic from the spike's Decision Log. The spike concludes by naming `spawned_items`; a human drafts the Epic.
- **Fixing the `affected-files-declared` and CR gate misalignments described in §3 beyond the minimum WS5 needs.** They are pre-existing defects with their own blast radius across ~100 archived CRs; file them as a Bug. WS5 corrects the indices and pins them; it does not audit historical items for gate results that were computed against the wrong section.
- Retrofitting `## Task Breakdown` into already-archived stories.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Correctness (blocking) | `section(N)` is positional over `## ` headings, not the printed ordinal (`readiness-predicates.ts:640-650`; preamble before the first `##` is handled, so section 1 is the first `## `). Two shipped gates already rely on the wrong reading: for `cr`, `blast-radius-populated`/`section(2)` resolves to `## 1. The Context Override` and `sandbox-paths-declared`/`section(3)` resolves to `## 2. Blast Radius`, because `## 0.5 Open Questions` occupies index 1 — so `## 3. Execution Sandbox`, the authoritative file-path list, is gated by nothing. For `epic`, `affected-files-declared`/`section(5)` resolves to `## Existing Surfaces`, not §4's Affected Files. `story` and `bug` are correctly aligned today. Any new `##` heading shifts these further; WS5 must land before WS6. |
| Dogfood split | Every surface here has a `cleargate-planning/` mirror and a gitignored live copy. Canonical edits do not propagate — CLAUDE.md records that skipping the re-sync is how BUG-024 shipped its own fix while still running the buggy hook. Template, agent, and skill changes are two-tree edits minimum; the npm payload is regenerated by `npm run prebuild`. |
| Sequencing | WS6's reserved requirement column is forward-compatible with [[EPIC-052]] WS1 but does not depend on it. EPIC-052 adds `## Grounding` to the same six template files; whichever lands second must re-run WS5's index-pinning test. |
| Guidance surface reach | A rule reaches a *drafting* agent through the template's `<instructions>` block, but that block is stripped from every authored instance — archived stories carry zero `<instructions>` hits, verified 2026-08-25. It therefore reaches no *executing* agent. WS6's L3+ authoring rule is correctly template-only; WS7's task-ticking rule must be written into `architect.md`, `developer.md`, and `qa.md` separately. Spike routing must be in always-on `CLAUDE.md` because triage precedes template selection entirely. |
| Backward compatibility | `## Task Breakdown` is absent from every existing Story/CR/Bug. Its predicate must treat absent as pass, matching how `existing-surfaces-verified` treats a missing section (`readiness-gates.md` Predicate Vocabulary entry 8). |
| Security | No new credential, network, or PM-tool surface. Spike documents are local markdown and follow the existing push path. |

## Existing Surfaces

> L1 reuse audit. List source-tree implementations the epic could extend. Cite file:line.

- **Surface:** `cleargate-cli/src/lib/work-item-id.ts:41` — `TYPE_PREFIXES` already contains `SPIKE` (:49). The id grammar parses spike ids today; only the type registry is missing. Extend, do not rebuild.
- **Surface:** `cleargate-cli/src/lib/work-item-type.ts:8` — closed `WorkItemType` union (8 members, no spike) plus the frontmatter-key table (:15), prefix table (:29), and `WORK_ITEM_TRANSITIONS` (:75). This is the single registration point for a new type.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:632` — `evalSection` and the whole closed-set predicate evaluator. The spike gate and the Task Breakdown check are new *criteria*, not a new *mechanism*.
- **Surface:** `.cleargate/knowledge/readiness-gates.md:220` — the `initiative` gate block, `severity: advisory`. The spike gate copies this shape verbatim: advisory severity, presence checks, no Gherkin demand.
- **Surface:** `.cleargate/templates/initiative.md` — already implements the exact lifecycle a spike needs: an item with an unknown endpoint that concludes by stamping `spawned_items: []` and moving to `archive/`. Reused directly rather than reinvented.
- **Surface:** `.cleargate/templates/story.md:195` — the `## Existing Surfaces` convention for unnumbered trailing sections. `## Task Breakdown` follows the same convention.
- **Surface:** `.claude/agents/architect.md:44` — the "Per-story blueprint" section that already produces exactly the task rows WS7 promotes into the story file.
- **Surface:** `cleargate-cli/src/wiki/page-schema.ts:181` — `ACTIVE_BUCKET_ORDER` / `ARCHIVE_BUCKET_ORDER`, plus the parallel lists at `cleargate-cli/src/wiki/load-wiki.ts:13` and `cleargate-cli/src/wiki/synthesis/product-state.ts:36`. Adding a bucket means four hardcoded lists, which is itself the same divergence class BUG-041 fixed for id parsing.
- **Coverage of this epic's scope:** **partial — roughly 60%.** Every enforcement mechanism already exists and is extended, not rebuilt: the predicate evaluator, the gate registry, the type registry, the id grammar, the template-section convention, and the Architect's blueprint output. What is genuinely net-new is the spike template itself (WS1), the index-pinning test (WS5), and the Task Breakdown section (WS6). Everything else is registration into surfaces that were built to be registered into.

## Prior work

- [[EPIC-052]] — Requirement-Level Grounding. **Closest overlap and the main sequencing dependency.** Its WS1 adds `## Grounding` to `{epic,story,CR,Bug,initiative}.md` + mirrors, with stable `R1…Rn` ids and a `next_requirement_id` counter. Same files, same section convention, orthogonal axis: Grounding rows are requirements plus evidence and read backward ("did this ship?"); Task Breakdown rows are actions plus order and read forward ("what do I do next?"). WS6 reserves a requirement-reference column so the two compose instead of colliding.
- [[BUG-041]] — Work-Item Id Grammar Divergence. Established `TYPE_PREFIXES` as the single id grammar and put `SPIKE` in it. WS2 consumes that directly; WS4 flags the same divergence pattern recurring in the wiki bucket lists.
- [[EPIC-033]] — Parallel Wave Sprint Execution. Owns the Architect planning workflow and the per-story blueprint that WS7 promotes into the story file. WS7 changes where that output lands, not how it is produced.
- [[CR-039]] — Spike Per Story Session Reset. Prior art in name only: a spike that was *performed*, recorded as a CR. Illustrative of the gap, not overlapping with it.
- No prior item defines a spike work-item type, a spike charter template, or any task/subtask decomposition surface. Archive grep for "task breakdown" and "subtask" returned zero; `cleargate wiki query` returned no matches.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** partial — `cleargate-cli/src/lib/work-item-type.ts` carries the spike type registration and `.cleargate/templates/` carries both new sections; nothing net-new is required for the *machinery*. But no existing template can carry a spike charter, because every one of them is a spec-before-execution contract and a spike is the inverse.
- **Why isn't extension / parameterization / config sufficient?** For the task half, it is — which is exactly why WS6 is a template section and not a work-item type, and why this epic explicitly refuses to add a second execution unit. For the spike half it is not, and the reason is mechanical rather than aesthetic: a Story's gate demands §3 files-to-touch and §4 DoD, and its ambiguity gate demands 🟢 before execution. A spike can satisfy neither before it runs, so reusing `story.md` does not produce a stricter spike — it produces an author who checks boxes dishonestly to get past a gate, which is strictly worse than having no gate. The spike needs an *inverted* gate (sharp question, not known answer) and that inversion cannot be expressed as a parameter on a template whose whole shape assumes the answer already exists.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**

- `.cleargate/templates/spike.md` — new charter template (WS1). Mirror: `cleargate-planning/.cleargate/templates/spike.md`.
- `cleargate-cli/src/lib/work-item-type.ts` — `WorkItemType` union :8, frontmatter-key table :15, prefix table :29, `WORK_ITEM_TRANSITIONS` :75 (WS2).
- `.cleargate/knowledge/readiness-gates.md` — two new `work_item_type: spike` blocks; corrected `section(N)` indices for `cr` and `epic`; new Task Breakdown criterion (WS2, WS5, WS6). Mirror under `cleargate-planning/.cleargate/knowledge/`.
- `.cleargate/knowledge/cleargate-protocol.md:684` — KNOWN_TYPES table gains a `spike` row (WS2). Mirror likewise.
- `.cleargate/templates/story.md` — rubric line :27 routes to SPIKE; `## Task Breakdown` added after §3 (WS3, WS6). Mirror likewise.
- `.cleargate/templates/CR.md`, `.cleargate/templates/Bug.md` — `## Task Breakdown` added (WS6). Mirrors likewise.
- `.cleargate/config.yml:12` — `ingest_buckets` gains `spikes` (WS4). Mirror: `cleargate-planning/.cleargate/config.yml:12`.
- `cleargate-cli/src/wiki/page-schema.ts:176,181,184`, `cleargate-cli/src/wiki/load-wiki.ts:13`, `cleargate-cli/src/wiki/synthesis/product-state.ts:36` — bucket lists (WS4).
- `.claude/agents/architect.md:44` — blueprint also written into the story file (WS7). Mirror: `cleargate-planning/.claude/agents/architect.md`.
- `.claude/agents/developer.md` — Developer ticks Task Breakdown rows during execution (WS7). Mirror likewise.
- `.claude/agents/qa.md` — QA-Verify asserts task completion (WS7). Mirror likewise.
- `.cleargate/knowledge/cleargate-protocol.md` — new Guidance Surface Reach subsection (WS3). Mirror likewise.
- `.claude/skills/sprint-execution/SKILL.md` — spike clause (WS3). Mirror likewise.
- `CLAUDE.md` + `cleargate-planning/CLAUDE.md` — triage list gains Spike (WS3).
- New test file under `cleargate-cli/test/` pinning template section indices, named `*.node.test.ts` per the single-runner rule (WS5).

**Data Changes:**

- No database change. No migration. `state.json` schema is untouched by design.
- Frontmatter (documents only): spike items gain `spike_id`, `timebox`, `kill_criteria`, `spawned_items`, `concluded_at`.

## 5. Acceptance Criteria

```gherkin
Feature: Spike & Task Decomposition Surfaces

  Scenario: A spike charter passes its gate without a known answer
    Given a SPIKE-001 document with a falsifiable question, a timebox, and kill criteria
    And its Outcome section is empty because the spike has not run
    When "cleargate gate check" evaluates it for the ready-to-investigate transition
    Then the gate passes
    And the ambiguity gate reads green on the sharpness of the question, not the presence of an answer

  Scenario: A concluded spike spawns downstream work
    Given SPIKE-001 has reached its timebox with a populated Decision Log
    When the spike is concluded
    Then spawned_items names at least one EPIC id
    And the document moves to .cleargate/delivery/archive/
    And a spikes page appears in the wiki index

  Scenario: An L3 story carries its execution sequence
    Given a story with complexity_label L3
    When the Architect writes its milestone blueprint
    Then the story file's Task Breakdown section is non-empty
    And QA-Verify reports every task checked before approving the story

  Scenario: Task Breakdown is absent from a legacy story
    Given an archived story written before this epic
    When its readiness gate is evaluated
    Then the Task Breakdown criterion passes on absence
    And no historical gate result changes

  Scenario: The executing agent knows to tick its own boxes
    Given a story whose Task Breakdown was written by the Architect
    When the Developer agent executes that story
    Then it ticks each task row as it completes it
    And QA-Verify finds no unchecked row to flag

  Scenario: Error — a new template heading silently shifts a gate index
    Given a gated template gains a new "##" heading above a section(N) criterion
    When the template section-index test runs
    Then the test fails and names the criterion, the expected heading, and the heading actually resolved
    And the build does not pass until readiness-gates.md is corrected

  Scenario: Error — a spike is dispatched into the sprint loop
    Given an active sprint
    When a spike item is offered to the sprint execution loop
    Then it is refused as pre-sprint work
    And no worktree, state.json slot, or sprint branch is created for it
```

## 6. AI Interrogation Loop (Human Input Required)

*Questions raised while drafting, each resolved in the conversation of 2026-08-25 and integrated above. Recorded for audit.*

- **AI Question:** "Should tasks be a work-item type with ids that push to the PM tool, or a template section?"
  **Human Answer:** Template section. Confirmed after the closed-set execution unit was verified in `state.json` — `stories` is the only per-unit map, and a second unit would have to grow through worktrees, dispatch markers, ledger attribution, the lane rubric, and the wave planner. Recorded as the WS6 scope boundary and as an explicit OUT-OF-SCOPE line.
- **AI Question:** "Does a spike run inside the five-agent loop, or pre-sprint?"
  **Human Answer:** Pre-sprint. Chosen explicitly on 2026-08-25. Consequence encoded in WS3: no `state.json` slot, no sprint worktree, prototype code discarded on a throwaway branch.
- **AI Question:** "The spike output is described as a final spec that decomposes into epics and stories — does that need its own template?"
  **Human Answer:** No. The final spec *is* an Epic; a separate findings template would be a document whose only job is to be transcribed. The spike concludes by stamping `spawned_items`, reusing the Initiative lifecycle verbatim.
- **AI Question:** "Should the Task Breakdown section ship as a plain checklist now, or wait for EPIC-052's requirement ids?"
  **Human Answer:** Ship now, with the requirement column reserved but empty, so EPIC-052 WS1 does not force a second pass over six template files.
- **AI Decision (flagged, not asked):** the `spikes` wiki bucket costs four hardcoded list edits. Included in scope (WS4) rather than deferred, on the grounds that an un-ingested spike reproduces the exact orphaned-citation failure the epic exists to close, and that initiatives — the closest analogue — are already ingested. Drop WS4 first if the epic is trimmed.
- **AI Decision (flagged, not asked):** the `cr` and `epic` gate `section(N)` misalignments were discovered during drafting, are live today, and are pre-existing. WS5 corrects and pins the indices because WS6 cannot land safely otherwise; the historical audit of gate results computed against the wrong section is left out of scope and should be filed as a Bug.

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

**Note on the Proposal gate:** `parent_ref` is null. Waived per the recorded `proposal_gate_waiver`
frontmatter and `~/.claude` memory `feedback_proposal_gate_waiver.md` — direct human ask with sharp
intent, inline source references, and live scope narrowing across the preceding five turns.

**Decomposition note (COMPLETE 2026-08-25):** all seven stories are cut in `pending-sync/`, each gate-green at `story.ready-for-execution` (11 criteria) and carrying `parent_epic_ref: EPIC-054`. The Granularity Rubric was run per item and split nothing; `STORY-054-06` was re-rated L3/med rather than split (reasoning in its §1.5). Scheduled by SPRINT-39. The mapping is
STORY-054-01 (WS1 spike template + mirror), STORY-054-02 (WS2 type registration + gate blocks +
KNOWN_TYPES), STORY-054-03 (WS3 doctrine text across story.md, sprint-execution skill, CLAUDE.md triage
list, and the cleargate-protocol.md Guidance Surface Reach subsection),
STORY-054-04 (WS4 wiki bucket across config + four lists), STORY-054-05 (WS5 index corrections +
pinning test), STORY-054-06 (WS6 Task Breakdown section + gate criterion), STORY-054-07 (WS7
architect + developer + qa wiring). **WS5 must merge before WS6** — the ordering is load-bearing, not stylistic.

**Value ordering if the epic is trimmed:** WS1 + WS2 + WS3 are the minimum viable spike and deliver
standalone value — a chartered, gateable, pre-sprint discovery artifact. WS5 + WS6 are the minimum
viable task surface and are independently shippable. WS4 and WS7 are the optional tails: WS4 is
awareness-layer reach, WS7 is the automation that makes WS6 happen without author diligence. Drop
WS4 first.

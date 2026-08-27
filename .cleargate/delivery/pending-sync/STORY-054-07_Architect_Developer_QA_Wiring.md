---
story_id: STORY-054-07
parent_epic_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
ambiguity: 🟢 Low
context_source: EPIC-054 (approved Gate 1 2026-08-25, ambiguity 🟢, gate epic.ready-for-decomposition ✅ 12 criteria), workstream WS7. Decomposed 2026-08-25 for SPRINT-39. Granularity Rubric run at decomposition time — see §1.5.
actor: ClearGate maintainer
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-08-25T12:00:00Z
updated_at: 2026-08-25T19:12:59Z
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
  last_gate_check: 2026-08-25T19:12:59Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-054-07: Architect writes the tasks, Developer ticks them, QA verifies
**Complexity:** L2 — three agent files plus mirrors; prose contracts, no code

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want the three execution agents wired to the Task Breakdown, so that the section is filled and checked by the loop rather than by author diligence.

### 1.2 Detailed Requirements
- Requirement 1: `.claude/agents/architect.md` — at the "Per-story blueprint" section, the Architect additionally writes its task rows into the story file's `## Task Breakdown`, so the breakdown becomes part of the durable work item rather than a sprint-run artifact.
- Requirement 2: `.claude/agents/developer.md` — the Developer ticks its Task Breakdown rows as it completes them. **This is the box-ticking actor; omitting it is the failure mode**, because QA would otherwise flag stories for unchecked boxes no agent was told to check.
- Requirement 3: `.claude/agents/qa.md` — QA-Verify asserts every `- [ ]` in `## Task Breakdown` is checked, or that the story states why an item was dropped. **Advisory in v1 — it flags, it does not bounce.**
- Requirement 4: All three canonical mirrors updated.
- Requirement 5: Each rule is written into the agent's own `.md`, not into a template `<instructions>` block, because instructions are stripped from authored instances and would never reach an executing agent.

### 1.3 Out of Scope
The section itself (STORY-054-06, a hard predecessor). Promoting QA's check from advisory to blocking — deferred until the section has been in use for a sprint.

### 1.4 Open Questions

- **Question:** Should QA bounce a story with unchecked task rows?
- **Recommended:** No, not in v1. The section is new and its authoring conventions are unproven; a blocking check would generate bounces about the rule rather than about the work.
- **Human decision:** Accepted 2026-08-25 as part of EPIC-054 Gate 1.

### 1.5 Risks

- **Risk:** The Architect writes rows into the story file while the Developer holds it in a worktree, causing a conflict.
- **Mitigation:** The Architect runs before worktree cut, per the sprint loop ordering in the sprint-execution skill. Called out explicitly in the agent text.
- **Risk:** Granularity Rubric — three files plus mirrors, one goal (wire the loop to the section), four scenarios, L2. No split signal trips.
- **Mitigation:** None needed; recorded for audit.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Task Breakdown agent wiring

  Scenario: The Architect populates the section
    Given an L3 story in a milestone the Architect is planning
    When the Architect writes its per-story blueprint
    Then the story file's Task Breakdown section carries the task rows

  Scenario: The Developer ticks its own rows
    Given a story whose Task Breakdown was populated by the Architect
    When the Developer executes that story
    Then it ticks each row as it completes it

  Scenario: QA flags an unchecked row
    Given a story with one unchecked Task Breakdown row and no stated reason
    When QA-Verify runs
    Then it reports the unchecked row
    And it does not bounce the story

  Scenario: Error - a rule placed only in the template
    Given the task-ticking rule is written only into the template instructions block
    When the Developer agent reads the story instance
    Then the rule is absent, because instructions are stripped from instances
```

### 2.2 Verification Steps (Manual)
- [ ] `grep -n "Task Breakdown" .claude/agents/architect.md .claude/agents/developer.md .claude/agents/qa.md` returns a hit in each.
- [ ] All three canonical mirrors parity-diff clean.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-planning/.claude/agents/developer.md` |
| Related Files | `cleargate-planning/.claude/agents/architect.md`, `cleargate-planning/.claude/agents/qa.md` |
| Payload (added 2026-08-28) | `cleargate-cli/templates/cleargate-planning/.claude/agents/qa.md` |
| Live (untracked — Gate-4 re-sync, NOT this commit) | `.claude/agents/developer.md`, `.claude/agents/architect.md`, `.claude/agents/qa.md` |
| New Files Needed | No |

**§3.1 AMENDMENT (orchestrator, 2026-08-28 — M2 plan finding). The original table was INVERTED.**
It listed the live `.claude/agents/*.md` as Primary and the `cleargate-planning/` copies as
Mirrors. That is backwards: **the live `.claude/` tree is fully untracked** (`git ls-files .claude/`
returns 0, per CR-099), so editing it produces nothing committable, while the `cleargate-planning/`
copies are the tracked source. §3.2 already says this correctly in prose — the table contradicted
its own story. Labels corrected above.

**One path was missing, and omitting it lands two red:**
`cleargate-cli/templates/cleargate-planning/.claude/agents/qa.md`.
`cleargate-cli/test/docs/readme-qa-doc-truth-043-06.red.node.test.ts:283-315` pins canonical↔payload
byte-parity for **`qa.md` alone** — not `architect.md`, not `developer.md` — via a `strictEqual`
plus an S6 `diff -q` guard. It is a **default-tier** test, so it runs.

**Refresh it with `node cleargate-cli/scripts/copy-planning-payload.mjs`, NOT `npm run prebuild`**
— prebuild also rewrites the tracked `cleargate-planning/MANIFEST.json`, which is DevOps's
post-merge artifact, not this story's. *(Orchestrator ruling, M2 Open Decision 2.)*

`copy-planning-payload.mjs:21` resolves its source to the **main checkout** always — run from a
worktree it copies unmodified content and the parity failure persists. That is the second
independent reason this story runs on the main checkout.

**Not in §3.1 by design:** `cleargate-planning/MANIFEST.json` rows `:20`, `:55`, `:69` — DevOps post-merge.

**Execution route:** MAIN CHECKOUT on `sprint/S-39`. `cleargate-cli` is involved but takes **zero
cli commits** — the payload copier writes a gitignored path. One outer commit.

### 3.2 Technical Logic
The Architect already produces exactly these rows in its per-story blueprint; this story changes where that output lands, not how it is produced. QA already reads DoD items, so the new assertion is one more item in an existing pass. Because the live `.claude/` tree is gitignored and fully untracked, the canonical mirror is the tracked source and the live copy is re-synced separately — a story that edits only the live tree leaves nothing in the commit.

### 3.3 API Contract (if applicable)
Not applicable — agent prompt surface only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Agent prose has no runtime surface |
| Grep assertions | 3 | One per agent file, asserting the Task Breakdown contract is present |
| Parity assertions | 3 | Canonical mirror matches live for each agent |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] All three agents name the Task Breakdown contract.
- [ ] Canonical mirrors updated — the tracked half of the change.
- [ ] Peer/Architect Review passed.


## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `.claude/agents/architect.md` — the "Per-story blueprint" section already emits the task rows this story relocates into the story file.
- **Surface:** `.claude/agents/developer.md` — the executing agent that ticks rows; currently has no Task Breakdown contract.
- **Surface:** `.claude/agents/qa.md` — already cross-checks DoD items, so the new assertion joins an existing pass.
- **Surface:** `cleargate-planning/.claude/agents/architect.md` — the tracked canonical mirror; the live tree is gitignored.
- **Coverage of this story's scope:** high — roughly 85% extension. All three agents exist and already perform adjacent work; this story adds one contract line to each.

## Prior work

- [[EPIC-054]] — parent epic, WS7. The developer half was added to WS7 by amendment on 2026-08-25 after the gap was found.
- [[STORY-054-06]] — hard predecessor; supplies the section these agents act on.
- [[EPIC-033]] — owns the Architect planning workflow and the per-story blueprint whose output this story relocates.
- [[STORY-054-03]] — documents the guidance-surface-reach rule that explains why these contracts must live in the agent files rather than the template.

## Why not simpler?

- **Smallest existing surface that could carry this story:** `.claude/agents/architect.md` — the blueprint it already writes is the task breakdown; only its destination changes.
- **Why isn't extension / parameterization / config sufficient?** Putting the rule in the template `<instructions>` block is the simpler-looking option and it does not work: instructions are stripped from authored instances, verified against archived stories which carry zero. An executing agent reads the story *file*, never the template, so the contract must be written into each agent's own definition. That is duplication, but it is deliberate and is documented as such by STORY-054-03.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (all confirmed on disk 2026-08-25).
- [x] Why not simpler? has both sub-bullets answered.

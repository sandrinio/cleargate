---
story_id: STORY-060-02
parent_epic_ref: EPIC-060
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-28T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-060 §2 (Gate-1 review and finding resolution). Dispositions adapted from EGM skills/egm-resolve/SKILL.md Step 2 (CONTEST / ESCALATE / PROPOSE FIX / DECLINE and its five rules), rewritten for ClearGate. Section placement constrained by readiness-gates.md section-index predicates (epic section(8); CR section(3), section(6)). EPIC-060 §6 Q1 (which types) and Q2 (apply fixes before the Brief) answered by the owner 2026-10-28. Revised 2026-10-28 after a fresh-context review (prerequisite stated, contested findings shown to the owner, sub-line shape pinned, section-index pin fixture added).
actor: Conversational agent drafting an epic or CR
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: agent-prompts,templates,protocol
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
  last_gate_check: 2026-10-28T06:58:32Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-060-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-28T10:57:49Z
  sessions: []
---

# STORY-060-02: Gate-1 Review and Finding Resolution
**Complexity:** L2 — one paragraph in two host instruction files, one protocol section, one section and one Brief line in two templates.

## 1. The Spec (The Contract)

### 1.1 User Story
As the conversational agent drafting an epic or CR, I want to run the simplicity and clarity reviewers on my draft and resolve their findings before I write the Brief, so that the owner reviews a draft someone else has already read and only sees the disagreements that need them.

### 1.2 Detailed Requirements
**Prerequisite:** STORY-060-01 is merged (the two reviewer agents exist). The owner accepted the answers to EPIC-060 §6 Q1 (epics and CRs) and Q2 (apply FIX edits before the Brief) on 2026-10-28; the spec below follows them.

1. **Gate-1 review paragraph.** The canonical CLAUDE.md block (`cleargate-cli/scaffold/hosts/claude/CLAUDE.md`) gains a paragraph directly after "Brief is the universal pre-push handshake":
   > **Fresh-context review before the Brief.** After writing an epic or CR, dispatch `cleargate-review-simplicity` and `cleargate-review-clarity` in parallel. Give each only the file path and the line "Review this draft. Report findings only." Pass nothing from this conversation. Resolve every finding by `cleargate-protocol.md` §24, apply the FIX edits, record the outcome in the draft's `## Independent review` section, then write the Brief. Review once per draft; re-run only when the owner asks. Stories, bugs, hotfixes, spikes and initiatives get no Gate-1 review; stories are reviewed together at sprint planning (§A.4). If the owner says to skip the review for an item, record `waived by owner: <reason>`.
2. **Codex parity.** `cleargate-cli/scaffold/hosts/codex/AGENTS.md` gains the same paragraph directly after its "Brief is the universal pre-push handshake" paragraph, saying to dispatch with `spawn_agent`, `fork_turns: "none"`.
3. **Protocol §24.** `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md` gains `## 24. Finding Resolution`, placed after `## 23. Execution Contract`. Every reviewer or QA finding gets exactly one disposition:
   - **FIX** — the finding is valid. Edit the draft.
   - **CONTEST** — the finding is wrong, and the author cites evidence the reviewer could have read: a file and symbol, or a statement in the draft.
   - **ESCALATE** — the finding is wrong, but the evidence is in no file the reviewer could read (an owner decision in chat, a team convention). It becomes an owner question.
   - **DECLINE** — a Nit. Record it; do not fix it.

   And five rules: a contest must be checkable, and "this was intentional" is not evidence. Do not add text only to satisfy a reviewer; if only a reader without context needs it, ESCALATE. Never contest a clarity finding: if a fresh reader cannot follow the draft, the draft lacks context. Do not change a severity; contest it instead. The author wanting to contest is not evidence the reviewer is wrong. §24 states that it applies to Gate-1 reviewers, §A.4 draft reviewers and QA findings.
4. **Template section.** `epic.md` and `CR.md` gain `## Independent review` directly above `## ClearGate Ambiguity Gate`, with exactly this placeholder line (STORY-060-03's predicate is written against it):
   `- <one line per reviewer: "<agent>: N findings — n fixed, n contested, n escalated, n declined" or "<agent>: no findings"; or "waived by owner: <reason>">`
   Each contested finding is an indented sub-bullet under its reviewer line, in this shape: `  - contested: <finding> — evidence: <path:symbol, or a quote from the draft>`.
5. **Brief line.** Each template's `POST-WRITE BRIEF` list gains `Independent review ← ## Independent review`. The instructions also say three things. Escalated findings are added to the item's open questions (§6 in an epic, §0.5 in a CR) and listed first in the Brief's Open Questions. Every contested finding is listed in the Brief with its evidence, so the owner can overrule the author. Fixed and declined findings are counted, not listed.
6. **Section-index pin.** Update `cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts` in the same commit, as `readiness-gates.md` requires for any template heading change. `test/docs/gate-section-index-pinning.node.test.ts` must stay green.

### 1.3 Out of Scope
- The reviewer agents themselves (STORY-060-01).
- The machine check on `## Independent review` (STORY-060-03).
- Gate-1 review for stories, bugs, hotfixes, spikes, initiatives or sprints.
- A second review round after fixes, and any reviewer-to-author back-and-forth.

### 1.4 Open Questions

- **Question:** Which work items get the review? (EPIC-060 §6 Q1)
- **Recommended:** Epics and CRs. §1.2 is written to this answer.
- **Human decision:** Accepted 2026-10-28 (owner) at the EPIC-060 Brief.

- **Question:** Apply FIX edits before the Brief, or list them for the owner's approval? (EPIC-060 §6 Q2)
- **Recommended:** Apply them before the Brief; `## Independent review` counts what changed. §1.2 is written to this answer.
- **Human decision:** Accepted 2026-10-28 (owner) at the EPIC-060 Brief.

### 1.5 Risks

- **Risk:** Inserting the section anywhere above §4 in an epic, or above §3 Execution Sandbox in a CR, shifts the section indices that `affected-files-declared` (`section(8)`) and `sandbox-paths-declared` (`section(6)`) read, and those gates start failing.
- **Mitigation:** Requirement 4 fixes the placement directly above the Ambiguity Gate; requirement 6 updates the pin fixture, and the pin test fails if an index moves.
- **Risk:** SPRINT-42 and SPRINT-43 edit nearby text in the CLAUDE.md block.
- **Mitigation:** Rebase onto their merged text; this story adds a paragraph and replaces nothing.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Reviewed path (epic, CR), and the waived path. |
| Interfaces | T | Claude instructions (CLAUDE.md block) and Codex instructions (AGENTS.md). |
| Data | F | Behaviour does not vary by input shape. |
| Rules | T | The §24 dispositions and their rules. |

```gherkin
Feature: Gate-1 review and finding resolution

  @paths
  Scenario: Epics and CRs are reviewed before the Brief
    Given the canonical CLAUDE.md block
    When the fresh-context review paragraph is read
    Then it dispatches cleargate-review-simplicity and cleargate-review-clarity in parallel after an epic or CR is written
    And it passes only the file path
    And it places the review before the Brief and records the outcome in ## Independent review

  @interfaces
  Scenario: Codex instructions carry the same step
    Given the canonical Codex AGENTS.md
    When the fresh-context review paragraph is read
    Then it dispatches the same two reviewers with spawn_agent and fork_turns "none"

  @rules
  Scenario: Findings are resolved by the protocol §24 rules
    Given cleargate-protocol.md §24
    When it is read
    Then it defines FIX, CONTEST, ESCALATE and DECLINE
    And it requires a CONTEST to cite evidence the reviewer could read
    And it states that a clarity finding is never contested

  @paths
  Scenario: Templates carry the review record and the Brief line
    Given the canonical epic.md and CR.md templates
    When a fresh item is scaffolded with cleargate new and gate-checked
    Then ## Independent review sits directly above the Ambiguity Gate with the exact placeholder line
    And the POST-WRITE BRIEF list includes the Independent review line, escalated findings first and every contested finding with its evidence
    And the section-index pin fixture is updated and the pin test passes

  @paths
  Scenario: Error — a story, bug or waived item is not reviewed at Gate 1
    Given the canonical CLAUDE.md block
    When the fresh-context review paragraph is read
    Then it excludes stories, bugs, hotfixes, spikes and initiatives
    And it records "waived by owner: <reason>" when the owner skips the review
```

### 2.2 Verification Steps (Manual)
- [ ] In a scratch repo with the built payload, draft a small epic and follow the paragraph. Confirm both reviewers ran with only the file path (dispatch prompt in the transcript), and that `## Independent review` and the Brief match requirements 4 and 5.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/CLAUDE.md` |
| Related Files | `cleargate-cli/scaffold/hosts/codex/AGENTS.md`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md`, `cleargate-cli/scaffold/core/.cleargate/templates/epic.md`, `cleargate-cli/scaffold/core/.cleargate/templates/CR.md`, `cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts`, `cleargate-cli/test/docs/gate-one-review-text.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/test/docs/gate-one-review-text.node.test.ts` |

### 3.2 Technical Logic
Text changes only, plus the pin fixture. The test reads the five canonical files and asserts the phrases in scenarios 1–3 and 5. For scenario 4 it checks three things: `## Independent review` is the heading immediately before `## ClearGate Ambiguity Gate` in both templates, the exact placeholder line from requirement 4 is present, and the Brief instructions carry the escalated-first and contested-with-evidence text. The existing `test/docs/gate-section-index-pinning.node.test.ts` covers the index pinning once `expected-headings.ts` is updated. The live mirrors (root CLAUDE.md block, `.cleargate/templates/{epic,CR}.md`, `.cleargate/knowledge/cleargate-protocol.md`) follow the framework-sprint routine.

### 3.3 API Contract (if applicable)
Not applicable.

## Task Breakdown

- [ ] Add the paragraph to `scaffold/hosts/claude/CLAUDE.md` after "Brief is the universal pre-push handshake".
- [ ] Add the Codex version to `scaffold/hosts/codex/AGENTS.md`.
- [ ] Add `## 24. Finding Resolution` to `cleargate-protocol.md`.
- [ ] Add `## Independent review` and the Brief line to `epic.md` and `CR.md`.
- [ ] Update `test/fixtures/gate-section-index/expected-headings.ts` for the new heading.
- [ ] Write `test/docs/gate-one-review-text.node.test.ts` for scenarios 1–5.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | One per §2.1 scenario, in `test/docs/gate-one-review-text.node.test.ts`. |
| Integration tests | 0 | No external infrastructure; index pinning is covered by the existing `gate-section-index-pinning.node.test.ts`. |
| E2E / acceptance tests | 0 | The end-to-end draft run needs a live model; it is the manual step in §2.2. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] `test/docs/gate-section-index-pinning.node.test.ts` green with the updated fixture.
- [ ] Live mirrors re-synced per the framework-sprint routine; `doctor` reports no drift.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/CLAUDE.md:32` — "Brief is the universal pre-push handshake"; the new paragraph follows it.
- **Surface:** `cleargate-cli/scaffold/hosts/codex/AGENTS.md:24` — the Codex version of the same paragraph.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md:846` — `## 23. Execution Contract`; §24 follows it.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/epic.md:186` — the epic Ambiguity Gate; the new section goes directly above it.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/CR.md:172` — the CR Ambiguity Gate; the new section goes directly above it.
- **Coverage of this requirement:** ≥80% extension. Every change adds to an existing paragraph, template or protocol file.

## Prior work

- [[EPIC-059]] — STORY-059-01 asks reviewers for numbered findings with a proposed fix but defines no disposition rules; §24 supplies them, and STORY-059-01's §A.4 batch uses them.
- [[CR-122]] — resolves the Developer's contradictory retry caps; adjacent only.
- Disposition taxonomy for reviewer findings: none found.

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing "Brief is the universal pre-push handshake" paragraph alone.
- **Why isn't extension / parameterization / config sufficient?** It is an extension: one added paragraph. The template section is needed so the outcome lives in the document, where STORY-060-03 can check it and the owner can see it after the chat is gone. §24 is needed because the same rules serve three callers (Gate 1, §A.4, QA), and writing them three times would let them diverge.

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

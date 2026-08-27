---
story_id: STORY-054-02
parent_epic_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
ambiguity: 🟢 Low
context_source: EPIC-054 (approved Gate 1 2026-08-25, ambiguity 🟢, gate epic.ready-for-decomposition ✅ 12 criteria), workstream WS2. Decomposed 2026-08-25 for SPRINT-39. Granularity Rubric run at decomposition time — see §1.5.
actor: ClearGate maintainer
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-08-25T12:00:00Z
updated_at: 2026-08-25T19:12:57Z
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
  last_gate_check: 2026-08-25T19:12:57Z
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

# STORY-054-02: Spike as a first-class type — registry, gates, KNOWN_TYPES
**Complexity:** L3 — one closed union plus three lookup tables, two knowledge docs and their mirrors

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want `spike` registered as a work-item type, so that a spike charter can be gate-checked and pushed instead of being an unrecognised document.

### 1.2 Detailed Requirements
- Requirement 1: Extend the closed `WorkItemType` union in `cleargate-cli/src/lib/work-item-type.ts:8` with `'spike'`.
- Requirement 2: Register `spike_id` in the frontmatter-key table (:15) and `SPIKE-` in the prefix table (:29), preserving longest-first ordering.
- Requirement 3: Add `spike: ['ready-to-investigate', 'ready-to-conclude']` to `WORK_ITEM_TRANSITIONS` (:75). The map is typed `Record<WorkItemType, string[]>`, so omitting it fails typecheck — that is the intended forcing function.
- Requirement 4: Add two `work_item_type: spike` gate blocks to `.cleargate/knowledge/readiness-gates.md`, `severity: advisory`, modelled on the `initiative` block at :220. Criteria assert presence only — question stated, timebox set, kill criteria set, no TBD marker. No Gherkin criterion, no files-to-touch criterion.
- Requirement 5: Add a `spike` row to the KNOWN_TYPES table in `.cleargate/knowledge/cleargate-protocol.md:684`, taking it from 8 entries to 9, so a spike push does not raise an L2 `TYPE_UNKNOWN`.
- Requirement 6: `TYPE_PREFIXES` in `cleargate-cli/src/lib/work-item-id.ts:49` already contains `SPIKE` and must not be edited.
- Requirement 7: Mirrors updated for both knowledge docs.

### 1.3 Out of Scope
The template itself (STORY-054-01), the wiki bucket (STORY-054-04), and any change to `evalSection` or existing gate indices (BUG-042 and STORY-054-05 own those).

### 1.4 Open Questions

- **Question:** Which transition names should the spike lifecycle use?
- **Recommended:** `ready-to-investigate` (charter approved, work may begin) and `ready-to-conclude` (decision log populated, outcome nameable).
- **Human decision:** Accepted 2026-08-25 as part of EPIC-054 Gate 1.

### 1.5 Risks

- **Risk:** This story appends blocks to `readiness-gates.md`, which BUG-042 and STORY-054-05 also touch.
- **Mitigation:** Sprint merge order is `BUG-042 → 054-05 → 054-02 → 054-06`. Appending new blocks does not shift existing `section(N)` indices, so this story cannot disturb the corrections.
- **Risk:** Granularity Rubric — one goal (register a type), files span one module plus two knowledge docs, four Gherkin scenarios, L3 with medium exposure. No split signal trips.
- **Mitigation:** None needed; recorded for audit.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Spike type registration

  Scenario: A spike charter resolves to the spike type
    Given a file whose frontmatter carries spike_id SPIKE-001
    When detectWorkItemTypeFromFm reads it
    Then it returns spike

  Scenario: A spike id resolves by prefix
    Given the identifier SPIKE-001
    When detectWorkItemType parses it
    Then it returns spike

  Scenario: The advisory gate passes without an answer
    Given a charter with a question, a timebox and kill criteria, and an empty Outcome
    When cleargate gate check evaluates it for ready-to-investigate
    Then the gate passes

  Scenario: Error - a charter missing its kill criteria
    Given a charter whose Timebox and Kill Criteria section is empty
    When cleargate gate check evaluates it
    Then the gate reports the failing criterion by id
```

### 2.2 Verification Steps (Manual)
- [ ] `npm --prefix cleargate-cli run typecheck` is clean — proves `WORK_ITEM_TRANSITIONS` gained its required key.
- [ ] KNOWN_TYPES table has 9 rows.
- [ ] `git diff cleargate-cli/src/lib/work-item-id.ts` is empty.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/work-item-type.ts` |
| Related Files | `.cleargate/knowledge/readiness-gates.md`, `.cleargate/knowledge/cleargate-protocol.md` |
| Mirrors | `cleargate-planning/.cleargate/knowledge/readiness-gates.md`, `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` |
| Reference (read-only, do not edit) | `cleargate-cli/src/lib/work-item-id.ts` |
| New Files Needed | Yes — one `*.node.test.ts` under `cleargate-cli/test/` |

### 3.2 Technical Logic
`WorkItemType` is a closed union and `WORK_ITEM_TRANSITIONS` is a `Record<WorkItemType, string[]>`, so adding the union member makes the compiler demand the transition entry — no separate registration step can be forgotten. Copy the `initiative` gate block at `readiness-gates.md:220` and change the type, transitions, and criteria ids; keep `severity: advisory` so a spike never hard-blocks. Criteria use the existing `section(N) has >=1 declared-item` and `body does not contain marker` predicates — no new predicate kind.

### 3.3 API Contract (if applicable)
Not applicable — internal module surface only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | detectWorkItemTypeFromFm, detectWorkItemType, transitions map, KNOWN_TYPES row count |
| Acceptance tests | 4 | One per Gherkin scenario in §2.1 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `work-item-id.ts` is unmodified.
- [ ] Both knowledge-doc mirrors updated.
- [ ] Peer/Architect Review passed.


## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `cleargate-cli/src/lib/work-item-type.ts:8` — the closed `WorkItemType` union, plus the frontmatter-key table (:15), prefix table (:29) and `WORK_ITEM_TRANSITIONS` (:75). Single registration point.
- **Surface:** `cleargate-cli/src/lib/work-item-id.ts:41` — `TYPE_PREFIXES`, which already contains `SPIKE` at :49. Read-only here.
- **Surface:** `.cleargate/knowledge/readiness-gates.md` — the `initiative` advisory gate block is the shape this story copies.
- **Surface:** `.cleargate/knowledge/cleargate-protocol.md` — the KNOWN_TYPES advisory registry.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — the closed-set predicate evaluator the new criteria reuse unchanged.
- **Coverage of this story's scope:** high — roughly 85% extension. Every mechanism exists; this story only registers a new value into surfaces built to be registered into.

## Prior work

- [[EPIC-054]] — parent epic, WS2.
- [[BUG-041]] — established `TYPE_PREFIXES` as the one id grammar and placed `SPIKE` in it; this story closes the divergence between that grammar and the type registry.
- [[STORY-054-01]] — supplies the template this type validates.
- No prior item registers a spike type.

## Why not simpler?

- **Smallest existing surface that could carry this story:** `cleargate-cli/src/lib/work-item-type.ts` — it already carries every table this story writes to; nothing net-new is required structurally.
- **Why isn't extension / parameterization / config sufficient?** Extension *is* what this story does — no new abstraction is introduced. The reason it cannot be pure config is that `WorkItemType` is a closed TypeScript union consumed by a `Record<WorkItemType, string[]>`; a config-driven type would erase the compile-time guarantee that every type has a declared transition, which is precisely the check that stops a half-registered type shipping.

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

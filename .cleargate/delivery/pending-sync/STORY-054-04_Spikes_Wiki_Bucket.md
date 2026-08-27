---
story_id: STORY-054-04
parent_epic_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
ambiguity: 🟢 Low
context_source: EPIC-054 (approved Gate 1 2026-08-25, ambiguity 🟢, gate epic.ready-for-decomposition ✅ 12 criteria), workstream WS4. Decomposed 2026-08-25 for SPRINT-39. Granularity Rubric run at decomposition time — see §1.5.
actor: ClearGate maintainer
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-08-25T12:00:00Z
updated_at: 2026-08-25T19:12:58Z
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
  last_gate_check: 2026-08-25T19:12:58Z
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

# STORY-054-04: Spikes reach the awareness layer
**Complexity:** L2 — one config key plus four hardcoded bucket lists

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer, I want spikes compiled into the wiki, so that a spike's findings are addressable instead of surviving only when someone hand-copies them into a knowledge file.

### 1.2 Detailed Requirements
- Requirement 1: Add `spikes` to `wiki.ingest_buckets` in `.cleargate/config.yml:12` and the canonical mirror.
- Requirement 2: Add `spikes` to `ACTIVE_BUCKET_ORDER` and `ARCHIVE_BUCKET_ORDER` in `cleargate-cli/src/wiki/page-schema.ts` (:181, :184) and to the display-label map (:176).
- Requirement 3: Add `spikes` to `BUCKET_DIRS` in `cleargate-cli/src/wiki/load-wiki.ts:13`.
- Requirement 4: Add `spikes` to the bucket list in `cleargate-cli/src/wiki/synthesis/product-state.ts:36`.
- Requirement 5: Record, in the story's commit message or a code comment, that four independent hardcoded lists had to change — the same divergence class BUG-041 eliminated for id parsing — so a follow-up unification CR has evidence.

### 1.3 Out of Scope
Unifying the four bucket lists into one exported constant. That is the right eventual fix and is deliberately deferred to a follow-up CR so this story stays mechanical. Stories remain excluded from the wiki; this story does not revisit that decision.

### 1.4 Open Questions

- **Question:** Should spikes be ingested at all, given the four-site cost?
- **Recommended:** Yes. Initiatives — the closest analogue, also a document-is-the-deliverable type — are already ingested, and an un-ingested spike reproduces the orphaned-citation failure EPIC-054 exists to close.
- **Human decision:** Accepted 2026-08-25; recorded in EPIC-054 §6 as a flagged decision, and named as the first workstream to drop if the epic is trimmed.

### 1.5 Risks

- **Risk:** A fifth bucket list exists somewhere ungrepped, so spikes render inconsistently.
- **Mitigation:** Grep for each of the four known list literals before implementing and assert the count; the acceptance test asserts a spike page appears in both the index and product-state.
- **Risk:** Granularity Rubric — one goal, five files, all in one subsystem, three scenarios, L2. No split signal trips.
- **Mitigation:** None needed; recorded for audit.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Spikes in the awareness layer

  Scenario: A spike is ingested
    Given a charter at .cleargate/delivery/pending-sync with a spike id
    When cleargate wiki ingest runs against it
    Then a page is created under .cleargate/wiki/spikes
    And the wiki index lists it

  Scenario: Spikes appear in product state
    Given at least one ingested spike
    When the product-state synthesis page is recompiled
    Then it counts spikes alongside the other buckets

  Scenario: Error - a bucket list is missed
    Given spikes added to only some of the bucket lists
    When the bucket-parity test runs
    Then it fails and names the list that does not contain spikes
```

### 2.2 Verification Steps (Manual)
- [ ] `cleargate wiki build` produces a `spikes` section without error.
- [ ] `grep -rn "'bugs'" cleargate-cli/src/wiki/` returns no list that lacks `spikes`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/wiki/page-schema.ts` |
| Related Files | `cleargate-cli/src/wiki/load-wiki.ts`, `cleargate-cli/src/wiki/synthesis/product-state.ts`, `.cleargate/config.yml` |
| Mirrors | `cleargate-planning/.cleargate/config.yml` |
| New Files Needed | Yes — one `*.node.test.ts` asserting bucket-list parity |

### 3.2 Technical Logic
The four lists are independent literals, so the only safe change is to edit all four and then pin them with a parity test that asserts every bucket name appearing in one list appears in all of them. That test is the durable value of this story — without it, the fifth list to be added diverges silently, exactly as the id parsers did before BUG-041.

### 3.3 API Contract (if applicable)
Not applicable — internal module surface only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | Bucket-list parity across all four literals |
| Acceptance tests | 2 | Ingest produces a spikes page; product-state counts it |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `config.yml` mirror updated.
- [ ] Follow-up unification CR noted for the four-list divergence.
- [ ] Peer/Architect Review passed.


## Existing Surfaces

> L1 reuse audit. List source-tree implementations the request could extend. Cite file:line.

- **Surface:** `cleargate-cli/src/wiki/page-schema.ts` — `ACTIVE_BUCKET_ORDER` and `ARCHIVE_BUCKET_ORDER` plus the label map.
- **Surface:** `cleargate-cli/src/wiki/load-wiki.ts` — `BUCKET_DIRS`, a third independent list of the same names.
- **Surface:** `cleargate-cli/src/wiki/synthesis/product-state.ts` — a fourth list, used for counts.
- **Surface:** `.cleargate/config.yml` — `wiki.ingest_buckets`, the allowlist that decides what compiles.
- **Coverage of this story's scope:** high — roughly 90% extension. Every list and the ingest path exist; this story adds one name to each and pins them.

## Prior work

- [[EPIC-054]] — parent epic, WS4.
- [[BUG-041]] — the precedent: N independent parsers of the same vocabulary, agreeing on the common case and diverging silently. The four bucket lists are the same class.
- [[STORY-054-01]] and [[STORY-054-02]] — supply the documents and the type this bucket compiles.
- No prior item adds a wiki bucket.

## Why not simpler?

- **Smallest existing surface that could carry this story:** `cleargate-cli/src/wiki/page-schema.ts` — the ingest and render pipeline already handles every bucket generically; only the name lists are hardcoded.
- **Why isn't extension / parameterization / config sufficient?** Extension is sufficient for the feature and that is exactly what ships. What is *not* sufficient is editing the four lists without pinning them: the lists are duplicated data with no shared source, so a purely additive change leaves the next bucket free to diverge. The parity test is the minimum that makes the addition safe, and it is cheaper than the unification refactor it defers.

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

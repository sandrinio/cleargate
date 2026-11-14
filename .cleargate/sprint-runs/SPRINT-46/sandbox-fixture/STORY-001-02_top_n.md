---
story_id: STORY-001-02
parent_epic_ref: EPIC-001
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: "fixture"
approved_at: "2026-11-15T10:00:00Z"
ambiguity: 🟢 Low
context_source: "EPIC-001 (pre-approved fixture) / verified against internal/tally/count.go in the seeded repo"
actor: Library caller
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
area: sandbox
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T10:00:00.000Z
updated_at: 2026-11-15T10:00:00.000Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-001-02: TopN with tie-break
**Complexity:** L2 — one new function and one new type in a new file, plus its test file; known pattern.

## 1. The Spec (The Contract)

### 1.1 User Story
As a caller of the tally package, I want the N most frequent words from a count map, so that I can report the top results without sorting by hand.

### 1.2 Detailed Requirements
- Requirement 1: `type Pair struct { Word string; Count int }` and `func TopN(counts map[string]int, n int) []Pair` in `internal/tally/top.go`.
- Requirement 2: results are ordered by `Count` descending; words with equal counts are ordered alphabetically (ascending, byte order).
- Requirement 3: when `n` is larger than the number of words, all words are returned.
- Requirement 4: when `n <= 0`, an empty (non-nil) slice is returned.

### 1.3 Out of Scope
A `--top` command-line flag, changes to `Count`, and any change under `cmd/tally/` or `internal/textutil/`.

### 1.4 Open Questions

- **Question:** Should `TopN` return nil or an empty slice for `n <= 0`?
- **Recommended:** An empty, non-nil slice, so callers can range over it and compare with `len`.
- **Human decision:** Agreed.

### 1.5 Risks

- **Risk:** Go map iteration order is random, so an unstable sort could make results differ between runs.
- **Mitigation:** Sort with a total order (count descending, then word ascending) so equal inputs always give equal output.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One way through: a function call with a map and a number. |
| Interfaces | F | Only the Go function exposes the behaviour. |
| Data | T | Behaviour differs by the size of n relative to the map (larger than, zero or negative). |
| Rules | T | Ordering rules constrain the outcome: count first, then alphabetical. |

```gherkin
Feature: TopN with tie-break

  @rules
  Scenario: Highest count first
    Given counts {"the": 3, "fox": 2, "dog": 1}
    When TopN is called with n = 2
    Then the result is [{the 3} {fox 2}]

  @rules
  Scenario: Ties are ordered alphabetically
    Given counts {"b": 2, "a": 2, "c": 1}
    When TopN is called with n = 3
    Then the result is [{a 2} {b 2} {c 1}]

  @data
  Scenario: n larger than the number of words returns all words
    Given counts {"a": 1, "b": 2}
    When TopN is called with n = 10
    Then the result is [{b 2} {a 1}]

  @data
  Scenario: n of zero or less returns an empty result
    Given counts {"a": 1}
    When TopN is called with n = 0, and again with n = -1
    Then both results are empty slices with length 0
```

### 2.2 Verification Steps (Manual)
- [ ] `go test ./internal/tally/...` passes.
- [ ] `go vet ./...` is clean.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File (new) | `internal/tally/top.go` |
| Test File (new) | `internal/tally/top_test.go` |
| New Files Needed | Yes |

### 3.2 Technical Logic
Copy the map into a `[]Pair`, `sort.Slice` with the comparison `a.Count != b.Count ? a.Count > b.Count : a.Word < b.Word`, then cut to `min(n, len)`. Return `[]Pair{}` when `n <= 0`.

### 3.3 API Contract (if applicable)
`type Pair struct { Word string; Count int }`; `func TopN(counts map[string]int, n int) []Pair`.

## Task Breakdown

- [ ] Add `Pair` and `TopN` in `internal/tally/top.go`.
- [ ] Add table tests for the four scenarios in `internal/tally/top_test.go`.
- [ ] Run `go vet ./...` and `go test ./...`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers the epic's Unit level (TopN behaviour). No user journey step: TopN is not yet called by the command.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | One per Gherkin scenario in §2.1. |
| Integration tests | 0 | n/a — pure function, no I/O. |
| E2E / acceptance tests | 4 | The four unit cases are the acceptance tests. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `internal/tally/count.go:5` — `Count` produces the map that `TopN` consumes.
- **Coverage of this requirement:** none — there is no ranking code yet; `TopN` is a net-new function beside `Count`.

## Prior work

- none found

## Why not simpler?

- **Smallest existing surface that could carry this:** `internal/tally/count.go:5` — `Count` returns a map and could be changed to return a slice, but that would break its callers.
- **Why isn't extension / parameterization / config sufficient?** Changing `Count` would alter an existing contract and its tests; a separate function in its own file keeps `Count` untouched and keeps this story disjoint from the others.

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

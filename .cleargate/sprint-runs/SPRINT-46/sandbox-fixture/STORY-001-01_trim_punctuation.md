---
story_id: STORY-001-01
parent_epic_ref: EPIC-001
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: "fixture"
approved_at: "2026-11-15T06:00:00Z"
ambiguity: 🟢 Low
context_source: "EPIC-001 (pre-approved fixture) / verified against internal/textutil/clean.go in the seeded repo"
actor: CLI user
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
area: sandbox
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T06:00:00.000Z
updated_at: 2026-11-15T06:00:00.000Z
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

# STORY-001-01: Trim punctuation in Normalize
**Complexity:** L1 — one function in one file plus its test; known pattern.

## 1. The Spec (The Contract)

### 1.1 User Story
As a CLI user, I want "Go," "go." and "GO!" to count as the same word, so that word counts are not split by the punctuation around a word.

### 1.2 Detailed Requirements
- Requirement 1: `Normalize` lowercases its input (as today) and also removes leading and trailing punctuation, trimming runes for which `unicode.IsPunct` is true at each end.
- Requirement 2: punctuation inside a word is kept, so `"don't"` stays `"don't"`.

### 1.3 Out of Scope
Changing `cmd/tally/main.go` (including dropping empty tokens), `Count`, any whitespace handling, and symbols that are not punctuation (`$`, `+`).

### 1.4 Open Questions

- **Question:** Should empty results (a token that was only punctuation) be filtered out by the caller?
- **Recommended:** Not in this story; `Normalize` just returns `""`. Filtering is a separate change in the command.
- **Human decision:** Agreed, out of scope for this story.

### 1.5 Risks

- **Risk:** Trimming too much could remove characters that belong to a token.
- **Mitigation:** Trim only `unicode.IsPunct` runes at the two ends; the test cases cover trailing and leading marks and an interior apostrophe.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One way through: a function call with a string. |
| Interfaces | F | Only the Go function exposes the behaviour. |
| Data | T | Behaviour differs by token shape: marks at the ends versus inside. |
| Rules | T | A rule constrains the outcome: interior punctuation is kept. |

```gherkin
Feature: Trim punctuation in Normalize

  @data
  Scenario: Surrounding punctuation is removed
    Given the tokens "Go,", "go." and "GO!"
    When each is passed to Normalize
    Then every result is "go"

  @rules
  Scenario: Interior punctuation is kept
    Given the token "Don't"
    When it is passed to Normalize
    Then the result is "don't"
```

### 2.2 Verification Steps (Manual)
- [ ] `go test ./internal/textutil/...` passes.
- [ ] `go vet ./...` is clean.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `internal/textutil/clean.go` |
| Related Files | `internal/textutil/clean_test.go` |
| New Files Needed | No |

### 3.2 Technical Logic
Lowercase with `strings.ToLower`, then `strings.TrimFunc(s, unicode.IsPunct)`. Extend `TestNormalize` in `clean_test.go` with the cases from §2.1.

### 3.3 API Contract (if applicable)
`func Normalize(s string) string` — signature unchanged.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers the epic's Unit level (Normalize behaviour). Journey step: words normalised before counting.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | One per Gherkin scenario in §2.1, added to `TestNormalize`. |
| Integration tests | 0 | n/a — single pure function. |
| E2E / acceptance tests | 2 | The two unit cases above are the acceptance tests. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `internal/textutil/clean.go:7` — `Normalize` lowercases only.
- **Coverage of this requirement:** partial — lowercasing exists, trimming does not.

## Prior work

- none found

## Why not simpler?

- **Smallest existing surface that could carry this:** `internal/textutil/clean.go:7` — the story edits it in place.
- **Why isn't extension / parameterization / config sufficient?** Extension is what the story is: no new function or option is needed, only the trim added to the existing function.

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

---
story_id: STORY-001-04
parent_epic_ref: EPIC-001
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: "fixture"
approved_at: "2026-11-15T06:00:00Z"
ambiguity: 🟢 Low
context_source: "EPIC-001 (pre-approved fixture) / verified against cmd/tally/main.go in the seeded repo; consumes TopN from STORY-001-02 and builds on the --json flag from STORY-001-03"
actor: CLI user
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
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

# STORY-001-04: --top flag
**Complexity:** L2 — one flag in one file that calls an existing helper, plus a test file; depends on two other stories.

## 1. The Spec (The Contract)

### 1.1 User Story
As a CLI user, I want `tally --top N <file>` to print only the N most frequent words, so that I can see the main words in a file without scrolling through every one.

### 1.2 Detailed Requirements
- **Dependencies (must merge first):** this story consumes `tally.TopN` and `tally.Pair` from STORY-001-02 (`internal/tally/top.go`), so it must merge after STORY-001-02. It also edits the argument parsing that STORY-001-03 adds (`--json`), so it must merge after STORY-001-03. STORY-001-01 is not a dependency.
- Requirement 1: `tally --top N <file>` prints the N most frequent words as `word<TAB>count` lines, in `tally.TopN` order (highest count first, ties alphabetical). N is a positive integer.
- Requirement 2: `--top N` and `--json` may be given together in either order before the file. With both, the output is the JSON array of the top N, in `TopN` order, using the same compact format as STORY-001-03 (`[{"word":...,"count":...},...]`).
- Requirement 3: if N is not a positive integer (for example `abc` or `0`), print the usage line `usage: tally [--json] [--top N] <file>` to stderr and exit 2. This replaces the usage line from STORY-001-03.

### 1.3 Out of Scope
Changing the output without `--top` (it stays exactly as STORY-001-03 leaves it), `tally.TopN`, `Count`, `textutil.Normalize`, or `testdata/sample.txt`; flags other than `--json` and `--top`; the `--top=N` spelling.

### 1.4 Open Questions

- **Question:** Do the expected outputs depend on whether STORY-001-01 (punctuation trimming) has merged?
- **Recommended:** Not if the scenarios use their own input with no punctuation, as below. The scenarios do not use `testdata/sample.txt`.
- **Human decision:** Agreed.

### 1.5 Risks

- **Risk:** This story and STORY-001-03 both edit `cmd/tally/main.go`, so they collide if built in parallel.
- **Mitigation:** Intentional. This story builds after STORY-001-03 merges, on top of its argument parsing.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful ways through: `--top` alone and `--top` with `--json`. |
| Interfaces | F | The CLI is the only surface for this behaviour. |
| Data | F | Behaviour does not vary by data type or volume. |
| Rules | T | A rule constrains the outcome: N must be a positive integer. |

```gherkin
Feature: --top flag

  @paths
  Scenario: --top prints the N most frequent words
    Given a file containing "b a b c c c"
    When I run "tally --top 2 <file>"
    Then the output is "c<TAB>3" then "b<TAB>2", one per line, and the exit code is 0

  @paths
  Scenario: --top works together with --json
    Given a file containing "b a b c c c"
    When I run "tally --json --top 1 <file>"
    Then the output is the single line [{"word":"c","count":3}] and the exit code is 0

  @rules
  Scenario: A bad N is rejected
    Given a file containing "b a b c c c"
    When I run "tally --top abc <file>", and again with "--top 0"
    Then "usage: tally [--json] [--top N] <file>" is printed to stderr and the exit code is 2 both times
```

### 2.2 Verification Steps (Manual)
- [ ] `go test ./cmd/tally/...` passes.
- [ ] `go vet ./...` is clean.
- [ ] `make check` passes with `TALLY_DB_URL` set to any value.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cmd/tally/main.go` |
| Test File (new in 001-03, extended here) | `cmd/tally/main_test.go` |
| New Files Needed | No |

### 3.2 Technical Logic
Extend the argument parsing from STORY-001-03 to accept `--json` and `--top N` in any order before the file, and update the usage line. When `--top` is set, call `tally.TopN(counts, n)` and render its `[]tally.Pair` in that order with the existing text or JSON renderer (the JSON renderer must keep the given order instead of re-sorting by word when it receives ranked pairs; the default path still sorts by word). Add tests for the argument parsing and the ranked rendering in `cmd/tally/main_test.go`, which STORY-001-03 creates; extend it, do not replace it.

### 3.3 API Contract (if applicable)

Consumes (from another story in this sprint, STORY-001-02, which must merge first):
- `internal/tally/top.go: TopN` — `func TopN(counts map[string]int, n int) []Pair`
- `internal/tally/top.go: Pair` — `type Pair struct { Word string; Count int }`

Provides: none (command-line behaviour only). Command line: `tally [--json] [--top N] <file>`.

## Task Breakdown

- [ ] Wait for STORY-001-02 and STORY-001-03 to be merged; start from the branch that contains both.
- [ ] Extend argument parsing in `cmd/tally/main.go` for `--top N` together with `--json`, and update the usage line.
- [ ] Call `tally.TopN` and render the ranked pairs in text and JSON form.
- [ ] Add tests for the three scenarios in `cmd/tally/main_test.go`.
- [ ] Run `go vet ./...` and `go test ./...`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers the epic's Unit level; the journey step "Count words in a file as JSON" gains a top-N variant.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | One per Gherkin scenario in §2.1, on the parsing and rendering functions. |
| Integration tests | 0 | n/a — no declared proof tier; the unit tests drive the command logic. |
| E2E / acceptance tests | 3 | The three unit cases are the acceptance tests. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `internal/tally/top.go:1` — `TopN` and `Pair`, created by STORY-001-02 (does not exist until that story merges); this story consumes them.
- **Surface:** `cmd/tally/main.go:14` — `main`; STORY-001-03 adds the `--json` parsing this story extends.
- **Coverage of this requirement:** partial — ranking comes from STORY-001-02 and the flag parsing from STORY-001-03; only the `--top` wiring is new.

## Prior work

- none found

## Why not simpler?

- **Smallest existing surface that could carry this:** `cmd/tally/main.go:14` plus `TopN` from STORY-001-02; no new file is needed.
- **Why isn't extension / parameterization / config sufficient?** Extension is what the story is: one more flag in the existing parser calling an existing helper. Merging it into STORY-001-03 would join two unrelated goals (output format and ranking) and remove the dependency on STORY-001-02.

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

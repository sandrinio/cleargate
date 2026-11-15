---
story_id: STORY-001-03
parent_epic_ref: EPIC-001
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: "fixture"
approved_at: "2026-11-15T06:00:00Z"
ambiguity: 🟢 Low
context_source: "EPIC-001 (pre-approved fixture) / verified against cmd/tally/main.go in the seeded repo"
actor: CLI user
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
proof_tier: live
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

# STORY-001-03: JSON output for tally
**Complexity:** L2 — one flag and one output renderer in one file, plus a test file; known pattern.

## 1. The Spec (The Contract)

### 1.1 User Story
As a CLI user, I want `tally --json <file>` to print the counts as JSON, so that other programs can read the result without parsing tab-separated text.

### 1.2 Detailed Requirements
- Requirement 1: `tally --json <file>` prints one line: a JSON array of objects `{"word":<string>,"count":<number>}`, sorted by `word` ascending (byte order), compact (no spaces), followed by a newline. Exit code 0.
- Requirement 2: `tally <file>` without the flag prints exactly what it prints today (`word<TAB>count` lines).
- Requirement 3: `--json` is accepted only as the first argument, before the file. Any other argument shape (no arguments, `--json` alone, extra arguments) prints the usage line `usage: tally [--json] <file>` to stderr and exits 2.

### 1.3 Out of Scope
Changing `textutil.Normalize` or `tally.Count` (the JSON simply reflects whatever `Normalize` does at the time), using `TopN`, pretty-printed JSON, and flags other than `--json`.

### 1.4 Open Questions

- **Question:** The proof's expected output depends on whether STORY-001-01 (punctuation trimming) has merged. How is this story kept independent of it?
- **Recommended:** The `## Proof` section lists the exact expected output for both states (before and after STORY-001-01) and accepts either. No change to `testdata/sample.txt` and no ordering between the two stories.
- **Human decision:** Agreed.

### 1.5 Risks

- **Risk:** `encoding/json` escapes `<`, `>` and `&` in strings, so output could differ from a hand-written expectation for words containing them.
- **Mitigation:** None of the sample words contain those characters; the proof output was derived from `testdata/sample.txt` only.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful ways through: with `--json` and without it. |
| Interfaces | T | The same counts are exposed as tab-separated text and as JSON. |
| Data | F | Output shape does not vary by data type or volume. |
| Rules | F | The only rule (sorted by word) is asserted in the JSON scenario itself. |

```gherkin
Feature: JSON output for tally

  @interfaces
  Scenario: --json prints a sorted JSON array
    Given the file testdata/sample.txt
    When I run "tally --json testdata/sample.txt"
    Then one line is printed that parses as a JSON array of {"word","count"} objects
    And the objects are sorted by word ascending
    And the exit code is 0

  @paths
  Scenario: Without --json the text output is unchanged
    Given the file testdata/sample.txt
    When I run "tally testdata/sample.txt"
    Then each line is "word<TAB>count", sorted by word

  Scenario: Bad arguments are rejected
    Given the arguments "--json" with no file
    When I run tally
    Then "usage: tally [--json] <file>" is printed to stderr and the exit code is 2
```

### 2.2 Verification Steps (Manual)
- [ ] `go test ./cmd/tally/...` passes.
- [ ] `go vet ./...` is clean.
- [ ] The proof command in `## Proof` prints one of the two expected outputs.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cmd/tally/main.go` |
| Test File (new) | `cmd/tally/main_test.go` |
| New Files Needed | Yes |

### 3.2 Technical Logic
Parse arguments by hand: `[file]` is text mode, `[--json file]` is JSON mode, anything else prints the usage line and exits 2. Move rendering into small functions (for example `renderText(counts)` and `renderJSON(counts)`) so `main_test.go` can test them without running the binary. `renderJSON` fills a slice of structs with a `word` string and a `count` int (json tags `word` and `count`) in sorted-word order and calls `json.Marshal`.

### 3.3 API Contract (if applicable)
Command line: `tally [--json] <file>`. Stdout: text lines or one JSON line as in §1.2. Exit 0 on success, 1 on file read error, 2 on bad arguments.

## Task Breakdown

- [ ] Add argument parsing for `[--json] <file>` and the new usage line in `cmd/tally/main.go`.
- [ ] Add `renderText` and `renderJSON` and call them from `main`.
- [ ] Add tests for both renderers in `cmd/tally/main_test.go`.
- [ ] Run `go vet ./...`, `go test ./...` and the command in `## Proof`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers the epic's Unit level and its Real-host end-to-end level; implements the journey "Count words in a file as JSON".

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | `renderJSON` and `renderText` on a small counts map. |
| Integration tests | 0 | n/a — covered by the proof command. |
| E2E / acceptance tests | 1 | The `## Proof` command run against the real sample file. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Proof

Tier: `live` — the built command is run against the real sample file.

```
go run ./cmd/tally --json testdata/sample.txt
```

Independence from STORY-001-01. The command output depends on whether `textutil.Normalize` already trims punctuation, because `testdata/sample.txt` contains "Go, go. GO!". The proof does not wait for STORY-001-01. It accepts exactly one of the two outputs below. Pass when the printed line equals A (punctuation not yet trimmed) or B (STORY-001-01 merged). Each is one line followed by a newline. Anything else fails.

A, lowercase-only normalisation:

```
[{"word":"and","count":1},{"word":"dog","count":1},{"word":"fox","count":2},{"word":"go!","count":1},{"word":"go,","count":1},{"word":"go.","count":1},{"word":"lazy","count":1},{"word":"quick","count":1},{"word":"the","count":3}]
```

B, with punctuation trimmed:

```
[{"word":"and","count":1},{"word":"dog","count":1},{"word":"fox","count":2},{"word":"go","count":3},{"word":"lazy","count":1},{"word":"quick","count":1},{"word":"the","count":3}]
```

The exit code must be 0 in both cases.

## Existing Surfaces

- **Surface:** `cmd/tally/main.go:14` — `main` reads the file, normalises, counts and prints `word<TAB>count` sorted by word.
- **Coverage of this requirement:** partial — reading, counting and sorted keys exist; argument parsing for the flag and JSON rendering are new.

## Prior work

- none found

## Why not simpler?

- **Smallest existing surface that could carry this:** `cmd/tally/main.go:14` — the story edits `main` in place.
- **Why isn't extension / parameterization / config sufficient?** Extension is what the story is. The standard `flag` package would also work, but the usage rule in §1.2 (the flag only before the file, exit 2 otherwise) is a few lines of explicit parsing and keeps the text-mode path byte-for-byte unchanged.

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

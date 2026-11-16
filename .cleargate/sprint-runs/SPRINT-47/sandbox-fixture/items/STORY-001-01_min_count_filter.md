---
story_id: STORY-001-01
parent_epic_ref: EPIC-001
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Ready
approved: true
approved_by: "fixture"
approved_at: "2026-11-16T15:00:00Z"
ambiguity: 🟢 Low
context_source: "EPIC-001 (pre-approved fixture) / verified against cmd/tally/main.go in the seeded repo"
actor: CLI user
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
proof_tier: unit
area: sandbox
db_write_set: []
deferred_verification: []
created_at: 2026-11-16T15:00:00.000Z
updated_at: 2026-11-16T15:00:00.000Z
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

# STORY-001-01: Minimum count filter
**Complexity:** L1 — one flag in one file plus its test.

## 1. The Spec (The Contract)

### 1.1 User Story
As a CLI user, I want `tally --min N <file>` to print only words that occur at least N times, so that I can hide the long tail of single occurrences.

### 1.2 Detailed Requirements
- Requirement 1: `tally --min N <file>` prints the same `word<TAB>count` lines as today, keeping only words whose count is at least N, sorted by word. N is a positive integer; `--min 1` prints everything.
- Requirement 2: `--min` with a value that is not a positive integer prints the usage text to stderr and exits 2.

### 1.3 Out of Scope
Other flags, `--sql`, help text wording (STORY-001-03).

### 1.4 Open Questions

- **Question:** Is `--min 0` valid?
- **Recommended:** No — N must be a positive integer; 0 is rejected with exit 2.
- **Human decision:** Agreed (fixture).

### 1.5 Risks

- **Risk:** A later story replaces argument parsing and drops the flag.
- **Mitigation:** EPIC-001 rule 2 — every flag lives on the one `flag.FlagSet`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One successful path: filter by the threshold. |
| Interfaces | F | One surface, the command line. |
| Data | F | Output shape does not vary by data. |
| Rules | T | The threshold rule and the positive-integer rule. |

```gherkin
Feature: Minimum count filter

  @rules
  Scenario: --min keeps only frequent words
    Given the file testdata/sample.txt
    When I run "tally --min 2 testdata/sample.txt"
    Then only "fox\t2" and "the\t3" are printed, sorted by word, and the exit code is 0

  @rules
  Scenario: A threshold that is not a positive integer is rejected
    When I run "tally --min 0 testdata/sample.txt"
    Then the usage text is printed to stderr and the exit code is 2
```

### 2.2 Verification Steps (Manual)
- [ ] `go test ./...` passes.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cmd/tally/main.go` |
| Related Files | `cmd/tally/main_test.go` |
| New Files Needed | Yes — `cmd/tally/main_test.go` if it does not exist |

### 3.2 Technical Logic
Register `--min` (int, default 1) on the command's `flag.FlagSet` (EPIC-001 rule 2); after counting, skip words whose count is below the threshold. A value below 1 prints the FlagSet usage to stderr and exits 2. Keep the filtering in a small function so `main_test.go` can test it without running the binary.

### 3.3 API Contract (if applicable)
Command line: `tally [--min N] <file>`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | One per scenario. Epic level: Unit. |
| Integration tests | 0 | n/a |
| E2E / acceptance tests | 0 | The unit proof below. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Proof

- **Tier:** unit
- **Expected result:** the repo's unit tests pass (`gate-checks.json` `proof.unit`, i.e. `go test ./...`), including the new `--min` tests.

## Existing Surfaces

- **Surface:** `cmd/tally/main.go:14` — `main` reads the file, normalises, counts and prints `word<TAB>count` sorted by word; arguments are parsed by hand from `os.Args`.
- **Coverage of this requirement:** partial — reading, counting and sorted output exist; this flag is new.

## Prior work

- none found

## Why not simpler?

- **Smallest existing surface that could carry this:** `cmd/tally/main.go:14` — the story extends `main` in place.
- **Why isn't extension / parameterization / config sufficient?** It is an extension: one flag on the existing command, registered on the command's single `flag.FlagSet` (EPIC-001 rule 2), with rendering in a small helper so it can be unit tested.

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

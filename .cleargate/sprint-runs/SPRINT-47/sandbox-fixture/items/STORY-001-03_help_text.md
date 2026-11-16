---
story_id: STORY-001-03
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
actor: New CLI user
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
proof_tier: human
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

# STORY-001-03: Help text
**Complexity:** L1 — a help text on the existing command.

## 1. The Spec (The Contract)

### 1.1 User Story
As a new CLI user, I want `tally --help` to explain what tally does and list its flags, so that I can use it without reading the source.

### 1.2 Detailed Requirements
- Requirement 1: `tally --help` (and `-h`) prints, to stdout, a first line `usage: tally [flags] <file>`, one sentence saying what tally does, and a `flags:` list with one line per flag registered on the command's `flag.FlagSet` (generated from it, so later flags appear automatically); exit 0.
- Requirement 2: the text reads clearly to a first-time user.

### 1.3 Out of Scope
Man pages, colours, and any flag behaviour.

### 1.4 Open Questions

- **Question:** stdout or stderr for `--help`?
- **Recommended:** stdout with exit 0 (help was asked for); errors keep printing usage to stderr with exit 2.
- **Human decision:** Agreed (fixture).

### 1.5 Risks

- **Risk:** The help text drifts from the real flags.
- **Mitigation:** The flag list is generated from the FlagSet (Requirement 1).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | `--help` and `-h`. |
| Interfaces | F | One surface, the command line. |
| Data | F | No data. |
| Rules | T | Every registered flag is listed. |

```gherkin
Feature: Help text

  @paths
  Scenario: --help and -h print the help and exit 0
    When I run "tally --help" and "tally -h"
    Then both print a first line "usage: tally [flags] <file>" and a one-sentence description to stdout, and exit 0

  @rules
  Scenario: Every registered flag is listed
    When I run "tally --help"
    Then the "flags:" section has one line for each flag registered on the command's FlagSet

  Scenario: The owner finds the help clear
    When the owner reads "tally --help"
    Then the owner confirms it explains tally and its flags clearly
```

### 2.2 Verification Steps (Manual)
- [ ] The owner reads `go run ./cmd/tally --help` at the walkthrough.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cmd/tally/main.go` |
| Related Files | `cmd/tally/main_test.go` |
| New Files Needed | Yes — `cmd/tally/main_test.go` if it does not exist |

### 3.2 Technical Logic
Set the FlagSet's `Usage` to print the usage line, the description and `flags:` followed by the FlagSet's defaults; handle `--help`/`-h` by printing it to stdout and exiting 0.

### 3.3 API Contract (if applicable)
Command line: `tally --help`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | Scenarios 1 and 2. Epic level: Unit. |
| Integration tests | 0 | n/a |
| E2E / acceptance tests | 0 | The owner's check below (human tier). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Proof

- **Tier:** human
- **Why human:** whether the help text reads clearly to a first-time user is a judgement only the owner can make.
- **Steps:** at the walkthrough the owner runs `go run ./cmd/tally --help` on the sprint branch and reads it.
- **Expected result:** the owner confirms the help explains what tally does and lists every flag clearly.

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

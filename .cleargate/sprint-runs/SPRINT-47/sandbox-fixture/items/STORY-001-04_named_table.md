---
story_id: STORY-001-04
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
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
proof_tier: container
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

# STORY-001-04: Named table for SQL output
**Complexity:** L2 — a table-name flag on the SQL output, proven against a real PostgreSQL 18.

## 1. The Spec (The Contract)

### 1.1 User Story
As a CLI user, I want `tally --sql --table NAME <file>` to write the counts into a table I name, so that I can keep counts for several files side by side.

### 1.2 Detailed Requirements
- Requirement 1: `tally --sql --table NAME <file>` prints the same SQL as `--sql` with `tally_counts` replaced by NAME in both the CREATE TABLE and every INSERT; exit 0.
- Requirement 2: NAME must match `^[a-z_][a-z0-9_]{0,62}$`; any other NAME prints the usage text to stderr and exits 2. `--table` without `--sql` also exits 2.
- Requirement 3: counts loaded into two different tables stay separate.

### 1.3 Out of Scope
Schemas, quoting arbitrary identifiers, connecting from Go.

### 1.4 Open Questions

- **Question:** Why restrict NAME rather than quote it?
- **Recommended:** A plain lowercase identifier needs no quoting and cannot inject SQL.
- **Human decision:** Agreed (fixture).

### 1.5 Risks

- **Risk:** NAME reaches the SQL unvalidated.
- **Mitigation:** Requirement 2's pattern, checked before any output.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Default table and a named table. |
| Interfaces | F | One surface, the command line. |
| Data | F | Same data as STORY-001-02. |
| Rules | T | Identifier rule; `--table` needs `--sql`. |

```gherkin
Feature: Named table for SQL output

  @paths
  Scenario: --table names the table in every statement
    When I run "tally --sql --table words_a testdata/sample.txt"
    Then the CREATE TABLE and every INSERT use words_a, and the exit code is 0

  @rules
  Scenario: An invalid table name or --table without --sql is rejected
    When I run "tally --sql --table Bad-Name testdata/sample.txt" or "tally --table words_a testdata/sample.txt"
    Then the usage text is printed to stderr and the exit code is 2

  @holdout @rules
  Scenario: Two tables keep separate counts
    Given sample.txt loaded into table t_alpha and apostrophes.txt loaded into table t_beta in PostgreSQL 18
    When both tables are queried
    Then each holds only its own file's words
```

### 2.2 Verification Steps (Manual)
- [ ] `go test ./...` passes; the `## Proof` command prints `e2e-table: ok`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cmd/tally/sql.go` |
| Related Files | `cmd/tally/main.go`, `cmd/tally/sql_test.go` |
| New Files Needed | No |

### 3.2 Technical Logic
Register `--table` (string, default `tally_counts`) on the FlagSet; validate it with the pattern before printing; pass it to the SQL renderer from STORY-001-02 (`renderSQL` gains a table parameter).

### 3.3 API Contract (if applicable)
Command line: `tally --sql [--table NAME] <file>`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | Scenarios 1 and 2. Epic level: Unit. |
| Integration tests | 0 | n/a |
| E2E / acceptance tests | 1 | The container proof below (real PostgreSQL 18). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Proof

- **Tier:** container
- **Expected result:** the script prints `e2e-table: ok` and exits 0 — it loads two files into two named tables in the throwaway PostgreSQL 18 container `cg-s47-pg`, checks each table's rows, and checks an invalid name exits 2. Note for this sandbox run: the first time the prove stage runs this proof it fails on purpose (SPRINT-47 goal check (c) exercises the prove-stage rework route); the script says so in its output.

```sh
bash scripts/e2e-table.sh
```

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

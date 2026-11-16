---
story_id: STORY-001-02
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

# STORY-001-02: SQL output for tally
**Complexity:** L2 — one flag and a SQL renderer in the command package, proven against a real PostgreSQL 18.

## 1. The Spec (The Contract)

### 1.1 User Story
As a CLI user, I want `tally --sql <file>` to print the counts as SQL that loads into PostgreSQL, so that I can query word counts with SQL.

### 1.2 Detailed Requirements
- Requirement 1: `tally --sql <file>` prints `CREATE TABLE IF NOT EXISTS tally_counts (word text PRIMARY KEY, n integer NOT NULL);` followed by one `INSERT INTO tally_counts (word, n) VALUES (...);` line per word, sorted by word; exit 0.
- Requirement 2: the printed SQL loads into PostgreSQL 18 with `psql -v ON_ERROR_STOP=1` for any input file, and every word reads back exactly as `tally` counted it.
- Requirement 3: `tally <file>` without the flag prints exactly what it prints today.

### 1.3 Out of Scope
Choosing the table name (STORY-001-04), connecting to a database from Go (the output is SQL text; no driver, EPIC-001 rule 1).

### 1.4 Open Questions

- **Question:** Should the output drop and recreate the table?
- **Recommended:** No — `CREATE TABLE IF NOT EXISTS` only; the proof drops the table before loading.
- **Human decision:** Agreed (fixture).

### 1.5 Risks

- **Risk:** Words containing characters that are special in SQL literals break the load.
- **Mitigation:** Requirement 2 and the proof load real files into a real PostgreSQL.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | With and without `--sql`. |
| Interfaces | T | Text output and SQL output of the same counts. |
| Data | T | A file whose words contain an apostrophe. |
| Rules | F | No business rule beyond the output format. |

```gherkin
Feature: SQL output for tally

  @interfaces
  Scenario: --sql prints a CREATE TABLE and sorted INSERTs
    Given the file testdata/sample.txt
    When I run "tally --sql testdata/sample.txt"
    Then the first line is the CREATE TABLE statement for tally_counts
    And one INSERT line per word follows, sorted by word, and the exit code is 0

  @paths
  Scenario: Without --sql the text output is unchanged
    When I run "tally testdata/sample.txt"
    Then each line is "word<TAB>count", sorted by word

  @holdout @data
  Scenario: Words with an apostrophe load into PostgreSQL
    Given the file testdata/apostrophes.txt
    When "tally --sql testdata/apostrophes.txt" is loaded into PostgreSQL 18 with ON_ERROR_STOP
    Then the load succeeds and the row for "don't" has n = 2
```

### 2.2 Verification Steps (Manual)
- [ ] `go test ./...` passes; the `## Proof` command prints `e2e-sql: ok`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cmd/tally/main.go` |
| Related Files | `cmd/tally/sql.go`, `cmd/tally/sql_test.go` |
| New Files Needed | Yes — `cmd/tally/sql.go`, `cmd/tally/sql_test.go` |

### 3.2 Technical Logic
Register `--sql` (bool) on the command's `flag.FlagSet`. Put rendering in `renderSQL(counts map[string]int) string` in `cmd/tally/sql.go`. Standard library only.

### 3.3 API Contract (if applicable)
Command line: `tally [--sql] <file>`; output as in §1.2.

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
- **Expected result:** the script prints `e2e-sql: ok` and exits 0 — it loads `tally --sql` output for `testdata/sample.txt` and `testdata/apostrophes.txt` into the throwaway PostgreSQL 18 container `cg-s47-pg` and checks the rows.

```sh
bash scripts/e2e-sql.sh
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

---
epic_id: EPIC-001
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
approved_by: "fixture"
approved_at: "2026-11-16T15:00:00Z"
ambiguity: 🟢 Low
area: sandbox
context_source: "Sandbox fixture for the SPRINT-47 goal check (c); pre-approved, no upstream proposal. Grounded against the seeded tally repo (cmd/tally)."
owner: "fixture"
target_date: null
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

# EPIC-001: Tally output and filters

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Add a minimum-count filter, SQL output that loads into PostgreSQL, a named table for that output, and a help text to the tally command.</objective>
  <architecture_rules>
    <rule>Standard library only; no new Go module dependencies (the SQL output is text; no database driver).</rule>
    <rule>All flags are registered on one flag.FlagSet in cmd/tally, so --help lists every flag.</rule>
    <rule>No changes to go.mod, testdata/sample.txt, testdata/apostrophes.txt, scripts/ or README.md.</rule>
  </architecture_rules>
  <target_files>
    <file path="cmd/tally/main.go" action="modify" />
    <file path="cmd/tally/sql.go" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
`tally` prints every word, cannot feed a database, and has no help text.

**Success Metrics (North Star):**
- Metric 1: `tally --min 2 testdata/sample.txt` prints only the words seen at least twice.
- Metric 2: `tally --sql` output loads into PostgreSQL 18 without error.
- Metric 3: `tally --help` explains the tool and lists its flags.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `--min N` filter (STORY-001-01).
- [ ] `--sql` output (STORY-001-02).
- [ ] `--help` text (STORY-001-03).
- [ ] `--table NAME` for the SQL output (STORY-001-04).

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Connecting to a database from Go; reading standard input; any other flag.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Security | Table names are validated identifiers; no SQL is built from unvalidated input. |

## Existing Surfaces

- **Surface:** `cmd/tally/main.go:14` — `main` reads the file, normalises, counts and prints `word<TAB>count` sorted by word.
- **Coverage of this epic's scope:** partial — the command exists and is extended; the flags and SQL output are new.

## Prior work

- none found

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `cmd/tally/main.go:14`; every story extends it.
- **Why isn't extension / parameterization / config sufficient?** The epic is four extensions of one command; the only new file is the SQL renderer.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cmd/tally/main.go` — flags on one FlagSet, help text, `--min` filtering.
- `cmd/tally/sql.go` — new file: SQL rendering with a table name.

**Data Changes:**
- None in the repo; the SQL output targets a table the user loads it into.

## 5. Acceptance Criteria

```gherkin
Feature: Tally output and filters

  Scenario: SQL output loads into PostgreSQL
    Given testdata/sample.txt
    When "tally --sql testdata/sample.txt" is loaded into PostgreSQL 18
    Then the table holds one row per word

  Scenario: Bad arguments are rejected
    Given an invalid --min or --table value
    When I run tally
    Then the usage text is printed and the exit code is 2
```

## Testing Strategy

- **What "working" means:** the built command filters, prints loadable SQL into named tables, and explains itself; proven per item at its declared tier.
- **Oracle:** expected outputs written in each story from the test files; a real PostgreSQL 18 for the SQL items; the owner for the help text.
- **Known-positive case:** `testdata/sample.txt` and `testdata/apostrophes.txt`.
- **Known-negative case:** `--min 0` and `--table Bad-Name` exit 2.
- **Baseline:** before work starts `go vet ./...` and `make check` pass with `TALLY_DB_URL` set.
- **Release gate:** every item's evidence exists at its tier; run by the sprint loop.
- **Regression guard:** unit tests in `cmd/tally/`, run by `go test ./...`.

| Level | What it proves | Where the tests live | Who runs them, when |
|---|---|---|---|
| Unit | Filtering, SQL rendering, help text, name validation | `cmd/tally/*_test.go` | Developer and QA, every story |
| Contract | n/a — no frozen interface between packages | n/a | n/a |
| Integration | n/a — covered by the container proofs | n/a | n/a |
| Real-host end-to-end | SQL output loads into a real PostgreSQL 18 | `scripts/e2e-sql.sh`, `scripts/e2e-table.sh` | the prove stage, per item |
| Eval | n/a — no model-dependent behaviour | n/a | n/a |

### User journeys

| Journey | Actor | Path (trigger → steps → end) | Observable end state | Walked by |
|---|---|---|---|---|
| Load word counts into PostgreSQL | CLI user | run `tally --sql --table words file` → pipe into psql | a table of word counts | `scripts/e2e-table.sh` |

## 6. AI Interrogation Loop (Human Input Required)

*(none — all questions resolved; see the stories' Open Questions)*

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
- [x] Testing Strategy answers how we test this, including its user journeys and real-host proof or why it isn't needed.

---
epic_id: EPIC-001
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: "fixture"
approved_at: "2026-11-15T06:00:00Z"
ambiguity: 🟢 Low
area: sandbox
context_source: "Sandbox fixture for the SPRINT-46 end-to-end run; pre-approved, no upstream proposal. Grounded against the seeded tally repo (internal/textutil, internal/tally, cmd/tally)."
owner: "fixture"
target_date: null
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

# EPIC-001: Tally CLI improvements

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make the tally word counter ignore surrounding punctuation, expose a top-N helper, and offer JSON output, as three independent changes.</objective>
  <architecture_rules>
    <rule>Standard library only; no new Go module dependencies.</rule>
    <rule>Each change stays inside its own package directory: internal/textutil, internal/tally, cmd/tally.</rule>
    <rule>No changes to go.mod, testdata/sample.txt or README.md.</rule>
  </architecture_rules>
  <target_files>
    <file path="internal/textutil/clean.go" action="modify" />
    <file path="internal/tally/top.go" action="create" />
    <file path="cmd/tally/main.go" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
`tally` counts "Go,", "go." and "GO!" as three different words, cannot rank its results, and prints only tab-separated text that other programs have to parse by hand.

**Success Metrics (North Star):**
- Metric 1: `tally testdata/sample.txt` reports `go` once with count 3 (today: three separate entries).
- Metric 2: `tally.TopN` returns the highest-count words first, ties alphabetical.
- Metric 3: `tally --json <file>` prints a JSON array that `jq` parses without error.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `textutil.Normalize` trims leading and trailing punctuation (STORY-001-01).
- [ ] `tally.TopN` helper in the tally package (STORY-001-02).
- [ ] `tally --json <file>` output mode (STORY-001-03).

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Wiring `TopN` into the command line (no `--top` flag).
- Unicode-aware tokenising, stop words, stemming or any other text analysis.
- Reading from standard input, multiple files, or any other new flag besides `--json`.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Security | Reads only the file named on the command line; no network or other file access. |

## Existing Surfaces

- **Surface:** `internal/textutil/clean.go:7` — `Normalize` lowercases a token only.
- **Surface:** `internal/tally/count.go:5` — `Count` builds a word to count map.
- **Surface:** `cmd/tally/main.go:14` — `main` reads the file, normalises, counts and prints `word<TAB>count` sorted by word.
- **Coverage of this epic's scope:** partial — Normalize, Count and the command exist and are extended; TopN and JSON output are new.

## Prior work

- none found

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `internal/textutil/clean.go:7`, `internal/tally/count.go:5` and `cmd/tally/main.go:14`; each story extends exactly one of them.
- **Why isn't extension / parameterization / config sufficient?** The three changes are independent behaviours in three different packages, so they are three stories rather than one. Nothing larger than extension of the existing functions plus one new file is needed.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `internal/textutil/clean.go` — `Normalize` also trims leading and trailing punctuation.
- `internal/tally/top.go` — new file: `Pair` type and `TopN`.
- `cmd/tally/main.go` — `--json` flag and JSON rendering.

**Data Changes:**
- None. No persistent storage; the JSON output is a new, additive output format.

## 5. Acceptance Criteria

```gherkin
Feature: Tally CLI improvements

  Scenario: Punctuation no longer splits a word
    Given a file containing "Go, go. GO!"
    When I run tally on it
    Then one entry "go" with count 3 is printed

  Scenario: Bad arguments are rejected
    Given no file argument
    When I run tally
    Then a usage line is printed and the exit code is 2
```

## Testing Strategy

- **What "working" means:** running the built `tally` binary on `testdata/sample.txt` prints the expected counts, and with `--json` prints a valid JSON array of the same counts.
- **Oracle:** the expected outputs written in each story, derived by hand from `testdata/sample.txt`, not from the code under test; `jq` as an independent JSON parser.
- **Known-positive case:** `testdata/sample.txt` (contains "Go, go. GO!" and repeated plain words).
- **Known-negative case:** running `tally` with no file argument must exit 2 and print a usage line.
- **Baseline:** before work starts `go vet ./...` and `go test ./...` pass; `tally testdata/sample.txt` prints `go!`, `go,` and `go.` as separate entries.
- **Release gate:** `go vet ./...` and `go test ./...` pass on the merged sprint branch; the proof command in STORY-001-03 passes. Run by the sprint loop.
- **Regression guard:** unit tests per story under `internal/` and `cmd/tally/`, run by `go test ./...`.

| Level | What it proves | Where the tests live | Who runs them, when |
|---|---|---|---|
| Unit | `Normalize` and `TopN` behave as specified; JSON rendering is correct | `internal/textutil/clean_test.go`, `internal/tally/top_test.go`, `cmd/tally/main_test.go` | Developer and QA, `go test ./...` on every story |
| Contract | n/a — no interface between packages is frozen by this epic | n/a | n/a |
| Integration | n/a — covered by the real-host end-to-end level below | n/a | n/a |
| Real-host end-to-end | The built command prints the expected output on the sample file | proof command in STORY-001-03 | QA-Verify, once per sprint |
| Eval | n/a — no model-dependent behaviour | n/a | n/a |

### User journeys

| Journey | Actor | Path (trigger → steps → end) | Observable end state | Walked by |
|---|---|---|---|---|
| Count words in a file as JSON | CLI user | run `tally --json testdata/sample.txt` → file read → words normalised and counted → JSON printed | a JSON array of `{"word","count"}` sorted by word | proof command in STORY-001-03 |

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

---
sprint_id: "SPRINT-01"
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: "block"
status: "Draft"
start_date: "2026-11-15"
end_date: "2026-11-15"
created_at: "2026-11-15T06:00:00.000Z"
updated_at: "2026-11-15T06:00:00.000Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
area: sandbox
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
epics:
  - EPIC-001
stories:
  - STORY-001-01
  - STORY-001-02
  - STORY-001-03
  - STORY-001-04
proposals: []
context_source: "Decomposes EPIC-001 (Tally CLI improvements, pre-approved fixture) into STORY-001-01..04. Sandbox for the SPRINT-46 end-to-end run."
---

# SPRINT-01: Tally improvements

## 0. Stakeholder Brief

- **Sprint Goal:** Punctuation no longer splits words, the tally package can rank words with `TopN`, and `tally --json` prints the counts as JSON.
- **Business Outcome:** none beyond the exercise; this is a throwaway repo used to run the ClearGate coding loop end to end.
- **Risks (top 3):** STORY-001-01..03 must stay file-disjoint so they can run in one wave, and STORY-001-04 must merge after 001-02 (consumes `TopN`) and 001-03 (shares `cmd/tally/main.go`); story 03's proof must pass whether or not story 01 has merged; a fresh repo has no previous sprint, so preflight has nothing to compare against.
- **Metrics:** `go vet ./...` and `go test ./...` pass on the merged sprint branch; `tally --json testdata/sample.txt` prints the expected line from STORY-001-03's `## Proof`.

## Sprint Goal
Punctuation no longer splits words, the tally package can rank words with `TopN`, and `tally --json testdata/sample.txt` prints the counts as a JSON array, `tally --top N` prints the N most frequent words, all four merged with `go vet ./...` and `go test ./...` green.

## 1. Consolidated Deliverables

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-001-01` | Trim punctuation in Normalize | fast | M1 | y | low |
| `STORY-001-02` | TopN with tie-break | standard | M1 | y | low |
| `STORY-001-03` | JSON output for tally | runtime | M1 | y | low |
| `STORY-001-04` | --top flag | standard | M1 | n (after 001-02, 001-03) | med |

## 2. Execution Strategy
*(Written by Architect during Sprint Design Review. Required before sprint start.)*

### 2.1 Phase Plan
{Contract-first DAG. Build set: every story whose base exists builds at once. Contracts: `contract/S-NN-<slug>` (base, owner story, frozen exports). Per story: base (sprint/S-NN or a contract branch) and upstream (integration edges). Merges: one at a time, in upstream order; re-sync if the sprint branch moved.}
Example:
- Contract C1 `contract/S-NN-api` (base sprint/S-NN; owner STORY-NNN-01; frozen: `src/api.ts: getThing(id: string): Promise<Thing>`)
- Build now: STORY-NNN-01 (base sprint/S-NN) ‖ STORY-NNN-02 (base contract/S-NN-api)
- Integrate: STORY-NNN-02 after STORY-NNN-01 merges
- GOAL_RELATION: advances | off critical path (one line per milestone)

### 2.2 Merge Ordering (Shared-File Surface Analysis)
{List files touched by more than one story. For each shared file, specify which story lands first and why.}

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.cleargate/knowledge/cleargate-enforcement.md` | STORY-NNN-01, STORY-NNN-02 | 01 → 02 | 01 adds §2; 02 amends §2 |

### 2.3 Shared-Surface Warnings
{Explicit conflict risks. One bullet per risk. Cite file + story pair.}
- None identified. (Replace with actual warnings if applicable.)

### 2.4 Lane Audit
{Architect populates one row per fast-lane story during Sprint Design Review. Empty by default — rows added only for non-`standard` lanes.}

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `STORY-NNN-NN` | fast | <one-line rationale> |

### 2.5 ADR-Conflict Flags
{Any story whose implementation conflicts with an Architectural Decision Record in `.cleargate/knowledge/` or prior sprint decisions. One bullet per flag.}
- None identified. (Replace with actual flags if applicable.)

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Stories collide on a file | 001-01..03 are disjoint by construction (`internal/textutil/`, `internal/tally/`, `cmd/tally/`). 001-04 shares `cmd/tally/main.go` with 001-03 on purpose and runs in a later wave. |
| STORY-001-04 consumes `TopN` from STORY-001-02 | 001-04 merges after 001-02 and 001-03. |
| STORY-001-03's proof depends on whether STORY-001-01 has merged | The proof accepts both outputs, so merge order does not matter. |
| Fresh repo has no previous sprint | Preflight is expected to report no prior sprint; not a failure. |

## Metrics & Metadata
- **Expected Impact:** `tally testdata/sample.txt` reports `go` once with count 3; `tally --json` available; `TopN` available to callers.
- **Priority Alignment:** none; equal priority; 001-04 depends on 001-02 and 001-03.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** 001-01, 001-02 and 001-03 start at once; 001-04 starts after 001-02 and 001-03 have merged.
- **Relevant Context:** `internal/textutil/clean.go`, `internal/tally/count.go`, `cmd/tally/main.go`, `testdata/sample.txt`; `internal/tally/top.go` once 001-02 has merged.
- **Constraints:** standard library only; do not edit `go.mod`, `testdata/sample.txt` or `README.md`.

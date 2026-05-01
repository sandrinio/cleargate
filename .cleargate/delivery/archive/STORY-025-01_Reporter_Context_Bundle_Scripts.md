---
story_id: STORY-025-01
parent_epic_ref: EPIC-025
parent_cleargate_id: "EPIC-025"
sprint_cleargate_id: SPRINT-18
carry_over: false
status: Done
ambiguity: 🟢 Low
context_source: EPIC-025 (decomposition wrapper) + CR-021 §3.2.4 (prep_reporter_context.mjs spec) + CR-021 §3.2.5 (count_tokens.mjs spec). M1 of CR-021's milestone plan — foundational scripts.
actor: Reporter agent
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
created_at: 2026-05-01T20:30:00Z
updated_at: 2026-05-01T20:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T11:15:59Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-025-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T11:15:58Z
  sessions: []
---

# STORY-025-01: Reporter Context-Bundle Scripts (`prep_reporter_context.mjs` + `count_tokens.mjs`)
**Complexity:** L2 — two new scripts, ~250 LOC combined, no surface dependencies on other SPRINT-18 stories.

## 1. The Spec (The Contract)

### 1.1 User Story
As the **Reporter agent**, I want a **curated context bundle** built before I'm spawned at sprint close, so that I read ~30-50KB of digest instead of ~200KB of raw sprint artifacts and can focus on synthesis rather than collation.

### 1.2 Detailed Requirements

- **R1 — `prep_reporter_context.mjs <sprint-id>`** (NEW, ~150 LOC at `.cleargate/scripts/prep_reporter_context.mjs`). Writes `.cleargate/sprint-runs/<sprint-id>/.reporter-context.md` containing, in order:
  - Sprint plan slices: §1 Consolidated Deliverables, §2 Execution Strategy, §5 Risks (read from `pending-sync/SPRINT-<#>_*.md` or `archive/` — search both).
  - `state.json` one-liner per story: `STORY-NNN-NN | <state> | <lane> | qa_bounces=N arch_bounces=N`.
  - Milestone plans `M<N>.md` verbatim from `.cleargate/sprint-runs/<sprint-id>/plans/`.
  - `git log --stat sprint/S-NN ^main` digest (subject + LOC delta per commit).
  - Token-ledger digest from `count_tokens.mjs` invocation (totals + per-agent breakdown + anomalies).
  - FLASHCARD date-window slice — entries dated within `[sprint.start_date, sprint.end_date]` from sprint frontmatter.
  - Pointer to REPORT template at `.cleargate/templates/sprint_report.md`.
- **R2 — `count_tokens.mjs <sprint-id>`** (NEW, ~100 LOC at `.cleargate/scripts/count_tokens.mjs`). Reads `.cleargate/sprint-runs/<sprint-id>/token-ledger.jsonl`, aggregates by `work_item_id` + `agent_type`, prints (or returns when `--json`) a digest:
  ```
  Total tokens this sprint: <N> (input: <X> / output: <Y> / cache_read: <Z>)
  Per-agent breakdown:
    architect: <N> (across <M> dispatches)
    developer: <N> (across <M> dispatches)
    qa: <N>        (across <M> dispatches)
    reporter: <N>  (across <M> dispatches)
  Anomalies:
    - STORY-XXX-YY: 4× higher than median story cost
    - <other flags as detected>
  ```
- **R3 — Bundle size budget.** `.reporter-context.md` MUST be ≤80KB (target: 30-50KB). Script logs the final size to stdout.
- **R4 — Resilience.** Missing inputs (e.g., no milestone plans for off-sprint sprints, empty FLASHCARD date-window) reduce that subsection to a one-liner ("No milestone plans for SPRINT-NN.") and continue. Missing token ledger is a hard error (exit 1, stderr lists the path attempted).
- **R5 — `count_tokens.mjs` standalone.** Callable independently; `prep_reporter_context.mjs` invokes it via `node count_tokens.mjs <sprint-id> --json` and embeds the JSON-decoded digest. Both scripts share a small helper for ledger row parsing — extract into `.cleargate/scripts/lib/ledger-digest.mjs` if duplication exceeds 20 LOC.

### 1.3 Out of Scope
- Fixing the SubagentStop attribution Red (token-ledger rows attributed to orchestrator session) — this story only **reads** what the ledger contains; it does not fix the upstream attribution. Token-ledger Red is carried forward (user 2026-05-01: "leave it be for now").
- Wiring `prep_reporter_context.mjs` into `close_sprint.mjs` Step 3.5 — that's STORY-025-03's job.
- Updating `reporter.md` agent definition to read `.reporter-context.md` first — that's STORY-025-05's job.

### 1.4 Open Questions

- **Question:** If `count_tokens.mjs` finds the ledger empty (e.g., off-sprint scratch dir), should it exit 0 with empty totals or exit 1?
  **Recommended:** Exit 0 with totals=0 and a stdout note "Ledger empty for SPRINT-NN (0 rows)." Avoids breaking `prep_reporter_context.mjs` for thin sprints. Hard error reserved for missing-file case.
  **Human decision:** _accept recommended unless objection_

- **Question:** Anomaly detection threshold for "X× higher than median story cost" — pick 3× or 4×?
  **Recommended:** **4×** — matches CR-021 §3.2.5 example output. Tunable later via constant.
  **Human decision:** _accept recommended_

### 1.5 Risks

- **Risk:** FLASHCARD.md date-window scan picks up entries from outside the sprint window when `sprint.start_date` is in the future relative to commits (observed in SPRINT-17 — see flashcard `2026-05-01 #closeout #script #fallback`).
  **Mitigation:** Apply Strategy-3 `git log --grep "STORY-025"` fallback when the planned date filter returns zero rows but git history shows in-window commits. Document the fallback chain in the script header (matches the pattern in `prep_doc_refresh.mjs` shipped under STORY-024-04).

- **Risk:** Ledger row schema may have rotated `work_item_id` / `agent_type` between SPRINT-15 (CR-018) and now.
  **Mitigation:** Schema-tolerant parser — accept `work_item_id || work_item || null`, `agent_type || agent || 'unknown'`. Log a warning to stderr when fallback triggers.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Reporter context-bundle scripts

  Scenario: prep_reporter_context.mjs builds the bundle for a closed sprint
    Given a fixture sprint dir at .cleargate/sprint-runs/SPRINT-fixture/ with state.json + token-ledger.jsonl + plans/M1.md + a SPRINT-fixture_*.md plan in pending-sync/
    When `node .cleargate/scripts/prep_reporter_context.mjs SPRINT-fixture` runs
    Then the script exits 0
    And .cleargate/sprint-runs/SPRINT-fixture/.reporter-context.md is written
    And the file size is ≤80KB
    And the file contains the strings "Sprint Plan Slices", "State.json Summary", "Milestone Plans", "Git Log Digest", "Token Ledger Digest", "Flashcard Slice"

  Scenario: prep_reporter_context.mjs handles missing milestone plans gracefully
    Given a fixture sprint with no plans/ subdirectory
    When the script runs
    Then it exits 0
    And the bundle's "Milestone Plans" section is the one-liner "No milestone plans for SPRINT-fixture."

  Scenario: prep_reporter_context.mjs hard-fails when token-ledger.jsonl is missing
    Given a fixture sprint with no token-ledger.jsonl file
    When the script runs
    Then it exits 1
    And stderr contains the missing-path string

  Scenario: count_tokens.mjs produces digest from a populated ledger
    Given a fixture token-ledger.jsonl with rows attributed to architect/developer/qa/reporter agents across 3 distinct work_item_ids
    When `node .cleargate/scripts/count_tokens.mjs SPRINT-fixture` runs
    Then stdout contains "Total tokens this sprint:" with a non-zero number
    And stdout contains a per-agent breakdown line for each of architect/developer/qa/reporter
    And stdout contains "Anomalies:" section (may be empty if no row exceeds 4× median)

  Scenario: count_tokens.mjs --json emits machine-readable digest
    Given the same fixture ledger
    When `node .cleargate/scripts/count_tokens.mjs SPRINT-fixture --json` runs
    Then stdout is valid JSON
    And the JSON has keys: total, by_agent, by_work_item, anomalies

  Scenario: count_tokens.mjs handles empty ledger
    Given a fixture sprint with token-ledger.jsonl containing zero rows
    When the script runs
    Then it exits 0
    And stdout contains "Ledger empty for SPRINT-fixture (0 rows)."
```

### 2.2 Verification Steps (Manual)
- [ ] Run `node .cleargate/scripts/prep_reporter_context.mjs SPRINT-17` (already-closed sprint) — inspect output bundle size and section coverage.
- [ ] Run `node .cleargate/scripts/count_tokens.mjs SPRINT-17` — verify per-agent breakdown matches the SPRINT-17 REPORT.md §3 token rows (within rounding).
- [ ] Confirm script headers document the Strategy-3 fallback chain for date-window scanning (per FLASHCARD `2026-05-01 #closeout #script #fallback`).

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/scripts/prep_reporter_context.mjs` (NEW) |
| Related Files | `.cleargate/scripts/count_tokens.mjs` (NEW), `.cleargate/scripts/lib/ledger-digest.mjs` (NEW if duplication >20 LOC; otherwise inline) |
| Test Files | `.cleargate/scripts/test/test_prep_reporter_context.sh` (NEW), `.cleargate/scripts/test/test_count_tokens.sh` (NEW), or vitest equivalents under `cleargate-cli/test/scripts/` |
| New Files Needed | Yes — 2 scripts (+1 lib if needed) + 2 tests |

### 3.2 Technical Logic

**`prep_reporter_context.mjs <sprint-id>` workflow:**
1. Parse sprint-id, derive `sprintDir = .cleargate/sprint-runs/<sprint-id>/`.
2. Hard-error if `<sprintDir>/token-ledger.jsonl` missing (exit 1).
3. Build sections in order:
   - **Sprint Plan Slices** — search `pending-sync/SPRINT-*.md` and `archive/SPRINT-*.md` for filename matching `<sprint-id>_*.md`; extract §1 / §2 / §5 by markdown heading regex.
   - **State.json Summary** — read `<sprintDir>/state.json`, format one-liner per story.
   - **Milestone Plans** — concat `<sprintDir>/plans/M*.md` verbatim with separator headers.
   - **Git Log Digest** — exec `git log --stat sprint/S-<NN> ^main 2>/dev/null` (silent fail if branch absent). Parse subject + LOC delta.
   - **Token Ledger Digest** — exec `node count_tokens.mjs <sprint-id> --json`, embed parsed digest as markdown.
   - **Flashcard Slice** — read `.cleargate/FLASHCARD.md`, filter rows where `YYYY-MM-DD` prefix falls within `[sprint.start_date, sprint.end_date]`. If zero matches, apply Strategy-3 fallback: `git log --grep "STORY-025" --pretty=%s sprint/S-<NN>` and surface commit subjects as "would-be flashcard candidates" instead.
   - **REPORT template pointer** — one line citing the path.
4. Write to `<sprintDir>/.reporter-context.md`.
5. Log final size to stdout: `Bundle ready: 42KB at <path>`.
6. Exit 0.

**`count_tokens.mjs <sprint-id> [--json]`:**
1. Read `<sprintDir>/token-ledger.jsonl`, parse JSONL rows (schema-tolerant — accept `work_item_id || work_item`, `agent_type || agent`).
2. Aggregate: total (input + output + cache_read + cache_creation), by_agent map, by_work_item map.
3. Compute per-story median; flag anomalies where row > 4× median.
4. If `--json` flag, emit `{total, by_agent, by_work_item, anomalies}` as JSON to stdout.
5. Otherwise, emit human-readable digest matching CR-021 §3.2.5 example shape.

### 3.3 API Contract

| Script | Args | stdout (default) | stdout (--json) | Exit code |
|---|---|---|---|---|
| `prep_reporter_context.mjs` | `<sprint-id>` | `Bundle ready: <N>KB at <path>` | n/a | 0 success / 1 missing ledger |
| `count_tokens.mjs` | `<sprint-id> [--json]` | human digest | JSON `{total, by_agent, by_work_item, anomalies}` | 0 always (empty ledger ok) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Integration tests | 6 | One per Gherkin scenario in §2.1. Real fixture sprint dir under `.cleargate/scripts/test/fixtures/`. No mocks. |
| Manual verification | 3 | Per §2.2. |

### 4.2 Definition of Done
- [ ] All 6 Gherkin scenarios pass.
- [ ] Both scripts have executable shebang + script-header comment block documenting purpose, args, exit codes, fallback chain.
- [ ] Bundle size verified ≤80KB on real SPRINT-17 input.
- [ ] No regression: `node .cleargate/scripts/state-scripts.test.mjs` exits 0; `cleargate doctor` exits 0.
- [ ] Commit message: `feat(EPIC-025): STORY-025-01 Reporter context-bundle scripts`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green:
- [x] Gherkin scenarios cover all detailed requirements in §1.2.
- [x] Implementation Guide §3 maps to specific, verified file paths (cross-checked against CR-021 §3.2.4 + §3.2.5).
- [x] No "TBDs" remain.

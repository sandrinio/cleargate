---
story_id: STORY-064-01
parent_epic_ref: EPIC-064
parent_cleargate_id: EPIC-064
sprint_cleargate_id: SPRINT-45
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-14T00:00:00Z
ambiguity: 🟢 Low
context_source: "EPIC-064 §4; verified 2026-11-14 on dispenser_adapter session 3a9277ef: subagents/workflows/wf_01856b8c-d1a/ holds 12 agent transcripts whose .meta.json carries agentType, workflowPhase and descriptions such as '003-01 QA-Red fix 1'; git on sprint/S-03 holds qa-red(STORY-003-01): correct test defects (fix 1) and a (rework) commit while state.json records 0 bounces"
area: measurement,reporting
actor: Reporter agent at sprint close; owner measuring a field sprint
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-13T22:57:07.985Z
updated_at: 2026-11-13T22:57:07.985Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T22:58:57Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-064-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T22:58:57Z
  sessions: []
last_contradict_sha: "72ee6d1855762516f6a9562f8486578de0f740c568c8700cc6587d54bf8dffa2"
---

# STORY-064-01: Per-Item Metrics Derived From Transcripts and Git
**Complexity:** L2 — one new script plus its tests; consumes CR-120's reader.

## 1. The Spec (The Contract)

### 1.1 User Story
As the Reporter at sprint close, I want each item's dispatches, rework rounds, wall time and tokens computed from the host's transcripts and from git, so that the report states what happened without anyone recounting by hand.

### 1.2 Detailed Requirements
- **R1 — Command.** `node .cleargate/scripts/sprint_metrics.mjs <sprint-id> [--json]` reads the sprint directory (`CLEARGATE_SPRINT_DIR` overrides it, as in `count_tokens.mjs`). It writes `<sprintDir>/metrics.json` and prints a per-item table, or the JSON with `--json`. It always exits 0 except for a usage error (exit 2).
- **R2 — Roster.** The roster is the set of keys of `state.json` `stories`. Anything not in the roster is never reported as an item.
- **R3 — Dispatches.** Dispatch rows come from CR-120's exported reader (`readDispatches`, contract C1 in the sprint plan). Each row is matched to a roster item by its `description`:
  - An exact roster ID in the description matches.
  - So does a short form equal to a roster ID with its type prefix removed (`003-01` matches `STORY-003-01`; `001` alone matches nothing).
  - A description naming no roster item is **sprint-level** when its `workflow_phase` or description says plan, design review, SDR, reader, synth, preflight, close or report.
  - Otherwise it is **unattributed**.
  - A description naming two or more roster items (full IDs or short forms), or a short form shared by two roster items, is **unattributed**. *(CR:spec-clarification, SPRINT-45 M1 plan, 2026-11-14.)*
- **R4 — Rework rules.** Amended 2026-11-14 after the holdout recount showed "dispatches minus one" overcounting 15 against 4 and 31 against 8.
  - **Kinds of dispatch.** A dispatch is a round candidate only if it is completed (`completed: true` in contract C1) and its role is one of:
    - `qa` doing red tests (phase `QA-Red`, or a description saying QA-Red/red);
    - `developer` building (phase `Build`, or a top-level developer dispatch);
    - `qa` verifying (phase `Verify`, or a description saying verify).
  - **Never rounds.** Dispatches in phases `Integrate`, `Pre-verify` (or a description with `pre`), `Prepare`, `Wiring`, `Post-flight`, `Merge`, `Contract` and `Plan`, and every non-`qa`/`developer` helper, count as dispatches but never as rounds.
  - **Planned passes.** A description carrying `pass N` marks planned contract-first work: each distinct pass expects one dispatch per role.
  - **Post-integration verify.** A verify dispatch that follows an `Integrate` dispatch for the same item, with no Build dispatch in between, is planned, not a re-verify.
  - **Post-merge replay.** A dispatch whose first timestamp is after the item's first `merge(story/<ID>)` commit is a replay. It is counted in `post_merge`, never as a round.
  - **Counts.** After those exclusions:
    - `red_corrections` = red dispatches minus the expected count (one, or one per pass), floor 0;
    - `dev_reruns` = Build dispatches minus the expected count, floor 0;
    - `verify_reruns` = verify dispatches minus one, floor 0;
    - `total` = the sum of the three.
  - **Reported beside the counts.** `interrupted` (dispatches not completed) and `post_merge` are reported per item, so excluded work stays visible.
- **R5 — Git cross-check.** Classification is by subject prefix, so a `merge(story/<ID>): feat(…)` subject is a merge, not a build. In each repo of the repo list (R6), commits whose subject names a roster item and whose author date falls in the sprint window are classified:
  - `red_written`: the first `qa-red(<ID>)` commit.
  - `red_corrected`: any later `qa-red(<ID>)` commit.
  - `build`: the first `feat(…)`/`fix(…)` commit naming the item.
  - `rework`: any later `feat(…)`/`fix(…)` commit naming the item, or any later subject containing `(rework)`. A `(rework)` subject that is the item's first build counts as build only.
  - The same subject text committed in two repos (an outer and a cli commit for one change) counts once.
  - `integrate`: subjects starting `integrate(`, or `merge(sprint/<branch>): integrate <ID>`.
  - `merged`: subjects starting `merge(story/<ID>)`.

  Git-derived rework is `red_corrected + rework`.
- **R6 — Repo list.** `["."]` plus `wiki.brief.release_repos` from `.cleargate/config.yml` when present, de-duplicated, resolved against the project root. A path that is not a git repository is skipped with a warning.
- **R7 — Sprint window.** Start is the earliest `ts` in `events.jsonl`. End is the latest `ts` there, or now if the sprint is not Completed.
- **R8 — Disagreement.** Each item records its `state.json` `qa_bounces` and `arch_bounces`. `disagrees` is true when dispatch-derived rework and git-derived rework differ, or when either differs from `qa_bounces + arch_bounces`.
- **R9 — Degradation.** With no dispatch rows (transcripts gone, reader failed), every item reports `dispatch_source: "not measured"` and its rework from git alone. Missing git repos degrade the same way. Neither case throws.
- **R10 — Output shape.** `metrics.json` follows contract C2 in the sprint plan: `schema`, `sprint_id`, `generated_at`, `sources`, `items`, `sprint_level`, `unattributed`, `totals`. Each item carries `dispatches`, `rework`, `git`, `wall_ms`, `tokens`, `models`, `state_counters`, `disagrees`, `dispatch_source`. No prompt or message text is copied. `totals.dispatches` and `totals.tokens` cover every subagent dispatch read (items, sprint-level and unattributed), so `unattributed.share = unattributed.tokens / totals.tokens`; `totals.rework` sums the items' `rework.total`; `sources.repos` lists only the repos actually read, and a skipped path appears only in `sources.warnings`. *(CR:spec-clarification SC-3, SPRINT-45 M2 plan, 2026-11-14; no C2 key renamed or retyped.)*

### 1.3 Out of Scope
- Reading transcript files directly. That is CR-120's reader; this story imports it.
- Changing `state.json`, `events.jsonl` or any counter.
- Report and bundle changes (STORY-064-02).
- Codex or other-host transcripts.

### 1.4 Open Questions

- **Question:** When dispatch-derived and git-derived rework differ, which one does `total` report?
- **Recommended:** The dispatch-derived figure, because a round can happen without a commit. Git is the cross-check, and the difference sets `disagrees`. Git becomes `total` only when dispatch data is not measured (R9).
- **Human decision:** Accepted at Gate 1 (owner confirmed in the SPRINT-45 Brief, 2026-11-14).

### 1.5 Risks

- **Risk:** Short-form matching attributes a dispatch to the wrong item when two roster IDs share a numeric tail (for example `STORY-003-01` and `CR-003-01`).
- **Mitigation:** An ambiguous short form matches nothing and counts as unattributed. A unit test pins this.
- **Risk:** Orchestrators describe dispatches inconsistently, so attribution falls below the epic's 95% target.
- **Mitigation:** CR-120 adds the `<stage> <ITEM-ID>` description rule. The unattributed share is reported, so the gap is visible rather than hidden.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful sources of rework: dispatch rows, and git when dispatch data is not measured |
| Interfaces | T | Human table on stdout and `metrics.json` / `--json` |
| Data | T | Full IDs, short forms, sprint-level and unattributed descriptions |
| Rules | T | R4 round rules and exclusions, R8 disagreement rule |

```gherkin
Feature: Per-item metrics derived from transcripts and git

  @paths @rules
  Scenario: A workflow-run red-test correction is counted from dispatches
    Given a fixture sprint with roster STORY-003-01 and BUG-001
    And dispatch rows "003-01 QA-Red r1" (qa, QA-Red), "003-01 commit red r1" (general-purpose, QA-Red), "003-01 QA-Red fix 1" (qa, QA-Red) and "003-01 developer c1" (developer, Build)
    And 60 synthetic transcripts in the fixture session
    When sprint_metrics runs for the sprint
    Then STORY-003-01 has red_corrections 1, dev_reruns 0, verify_reruns 0 and total 1
    And the general-purpose dispatch counts as a dispatch but not as a round
    And the run completes in under 10 seconds

  @data
  Scenario Outline: Descriptions are matched to the roster or classed
    Given a roster of STORY-003-01, CR-003-01 and BUG-001
    When a dispatch described "<description>" with phase "<phase>" is matched
    Then it is attributed to "<result>"

    Examples:
      | description              | phase   | result        |
      | BUG-001 developer c1     | Build   | BUG-001       |
      | 003-01 QA-Red r1         | QA-Red  | unattributed  |
      | SDR reader STORY-003-01  | Plan    | STORY-003-01  |
      | M1 plan                  | Plan    | sprint-level  |
      | Generate sample week     |         | unattributed  |

  @rules
  Scenario Outline: Planned and infrastructure dispatches are not rework
    Given STORY-002-07 with one red, one Build and one Verify dispatch, merged at 12:00
    And an extra dispatch "<extra>" in phase "<phase>" starting at <start>, completed <completed>
    When sprint_metrics runs
    Then STORY-002-07 has rework total 0
    And the extra dispatch is counted under "<bucket>"

    Examples:
      | extra                      | phase      | start | completed | bucket       |
      | 002-07 QA-Red pass 2 r1    | QA-Red     | 10:00 | true      | dispatches   |
      | 002-07 integrate           | Integrate  | 10:30 | true      | dispatches   |
      | 002-07 QA-Verify pre c1    | Pre-verify | 10:40 | true      | dispatches   |
      | 002-07 developer c2        | Build      | 10:50 | false     | interrupted  |
      | 002-07 developer c1        | Build      | 12:30 | true      | post_merge   |

  @rules
  Scenario: Git rework is classified and a disagreeing counter is flagged
    Given a fixture git repo with "qa-red(STORY-003-01): write failing tests", "qa-red(STORY-003-01): correct test defects (fix 1)", "feat(EPIC-003): STORY-003-01 Adapters", "feat(EPIC-003): STORY-003-01 Adapters (rework)" and "merge(story/STORY-003-01): …" inside the sprint window
    And state.json records qa_bounces 0 and arch_bounces 0 for STORY-003-01
    When sprint_metrics runs
    Then STORY-003-01 git shows red_written 1, red_corrected 1, build 1, rework 1 and merged 1
    And disagrees is true

  @interfaces
  Scenario: The JSON output follows contract C2
    Given the fixture sprint
    When sprint_metrics runs with --json
    Then stdout parses as JSON with schema 1 and the keys sources, items, sprint_level, unattributed and totals
    And metrics.json in the sprint directory holds the same document
    And no value in it contains text copied from a transcript message

  @paths
  Scenario: Missing transcripts fall back to git and never fail
    Given a fixture sprint whose sessions have no subagents directory
    When sprint_metrics runs
    Then it exits 0 and prints a "dispatch data: not measured" warning
    And every item carries dispatch_source "not measured" with total taken from git
```

### 2.2 Verification Steps (Manual)
- [ ] Run `node cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs SPRINT-03` with `CLEARGATE_SPRINT_DIR` pointed at dispenser_adapter's SPRINT-03 and compare its STORY-003-01 and BUG-001 rows with the holdout recount.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/config.example.yml` |
| Test Files | `cleargate-cli/test/scripts/sprint-metrics.red.node.test.ts`, `cleargate-cli/test/scripts/sprint-metrics.red.integration.node.test.ts` (green only after CR-120 integrates), `cleargate-cli/test/fixtures/sprint-metrics/` |
| New Files Needed | Yes — `sprint_metrics.mjs`, its test file and fixture tree |

### 3.2 Technical Logic
- Import `readDispatches` and `discoverSessions` from `./subagent-ledger.mjs` (contract C1). Until CR-120 merges, the contract branch carries a stub with the frozen signatures.
- Read `state.json` for the roster and counters, and `events.jsonl` for the window.
- Matching, rework and git rules exactly as R3–R8. Git is read with `git -C <repo> log --format=%H%x09%aI%x09%s` and filtered in process. No shell pipelines.
- Write `metrics.json` with `atomicWrite` from `state-events.mjs` (read-only import; that file is not modified).
- Add a commented `metrics:` note to `config.example.yml` saying the repo list reuses `wiki.brief.release_repos`. No new config key is introduced.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `sprint_metrics.mjs <sprint-id> [--json]` | CLI | None | positional sprint id | contract C2 document on stdout with `--json`; table otherwise |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 11 | Matching (5 outline rows), R4 exclusions (5 outline rows), git classification and ambiguity rule — epic level Unit |
| Integration tests | 2 | Fixture session tree + fixture git repo end to end; missing-transcripts fallback — epic level Integration, journey "Measure a field sprint" |
| E2E / acceptance tests | 6 | 1 per Gherkin scenario in §2.1 |
| Performance test | 1 | 60-transcript fixture under 10 s, measured by wall-clock in the test; baseline is the epic budget |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] Manual check §2.2 recorded in the Developer report.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/count_tokens.mjs:1-40` — CLI pattern to follow: positional sprint id, `--json`, `CLEARGATE_SPRINT_DIR` override, exit codes.
- **Coverage of this requirement:** partial — same shape; reads the wrong source.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/state-events.mjs:65-120` — `readEvents` and `atomicWrite`, imported read-only.
- **Coverage of this requirement:** partial — supplies the window and the write helper.

## Prior work

- [[CR-120]] — the dispatch reader this story consumes.
- [[CR-106]] — event log; read-only here.
- [[EPIC-013]] — first-pass rate definition the derived rework feeds.

## Why not simpler?

- **Smallest existing surface that could carry this:** `count_tokens.mjs`.
- **Why isn't extension / parameterization / config sufficient?** `count_tokens.mjs` is a token digest with a locked JSON shape that `prep_reporter_context.mjs` and `close_sprint.mjs` consume. Adding rework, git classification and roster matching to it would change that public shape, and it would put two unrelated jobs in one script. A sibling script keeps the old shape stable and is the one new file this needs.

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

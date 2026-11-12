---
story_id: STORY-063-12
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 story 063-12; grounded against cleargate-cli main 2026-11-12
actor: QA agent and release owner
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: wiki,testing,cleargate-cli,orientation
db_write_set: []
deferred_verification: []
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:33:55Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-063-12
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:33:02Z
  sessions: []
---

# STORY-063-12: Truth Oracle and Orientation Eval
**Complexity:** L3 — an independent ground-truth script with a fact-by-fact test in `npm test`, plus a live clean-room eval with 12 headless sessions, scored without an LLM judge.

## 1. The Spec (The Contract)

### 1.1 User Story
As the QA agent and the release owner, I want proof that the session brief tells the truth and actually makes a fresh orchestrator session oriented, so that EPIC-063's M2 ships on evidence. Unit tests can pass while the model never sees or uses the output, which is how the current hook failed for months.

### 1.2 Detailed Requirements
- **R1 — Independent oracle.** New `cleargate-cli/scripts/brief-oracle.sh` takes a repo path and prints JSON with one key per brief fact, matching STORY-063-11's line contract: active sprint, waiting-on-you counts and IDs, P0/P1 bugs, last closed, carried with no sprint, planned with 🟢 counts, latest decisions, release.
  - It uses only shell, `grep`, `sed`, `jq` and `git`.
  - It imports or executes no `cleargate` code, so a bug in the compilers cannot also be in the oracle.
- **R2 — Compare mode.** `brief-oracle.sh --compare <brief.md> <repo>` parses the brief's prefixed lines, prints one `mismatch: <fact> brief=<…> truth=<…>` line per difference, and exits 1 on any mismatch or 0 when all facts agree. Ordering-insensitive for ID lists; respects the brief's `+N more` truncation by checking the shown IDs are a correct prefix and N matches.
- **R3 — Oracle test in `npm test`.** New `cleargate-cli/test/wiki/brief-truth-oracle.node.test.ts`.
  - It builds the wiki and runs `doctor --session-start` on two fixture repos, one with an active sprint and one without, then runs compare mode.
  - It fails on any mismatch.
  - It also plants one wrong fact (a removed carried ID) and asserts compare mode catches it (the oracle's own known-negative).
  - It requires `jq` and `git`, as the hooks already do. A missing `jq` fails the test with a clear message instead of skipping it, so a green run always means the oracle ran.
- **R4 — Fixture corpus.** New `cleargate-cli/test/fixtures/orientation-corpus/`: a small but complete planning tree. It holds:
  - **Sprints:** an active sprint with `state.json`; a completed sprint with a `SPRINT-NN_REPORT.md` and carried items (`carry_over: true`); a planned sprint.
  - **Epics:** epics with CR and bug children.
  - **Bugs:** severities P0–P3.
  - **Decisions:** answered and placeholder decision lines, one "supersedes" sentence.
  - **Gate 4 leftovers:** a `contradictions.md` entry with `label: null` and a `.doc-refresh-checklist.md` with an open `- [ ]`.
  - **Git:** the test creates a git repo with one tag at setup.
  R3 and R5 share it.
- **R5 — Orientation eval (manual release gate).** New `cleargate-cli/scripts/clean-room/orientation-eval.mjs` runs as follows:
  1. Packs and installs the working tree with the clean-room helpers (`packArtifact` and `installArtifact`, `cleargate-cli/scripts/clean-room/artifact.mjs:45,88`) into a temp repo.
  2. Copies in the R4 corpus and runs `cleargate wiki build`.
  3. Runs 12 fresh `claude -p --output-format stream-json --include-hook-events` sessions, one per question.
  4. Writes an evidence file.

  **Questions** live in `cleargate-cli/scripts/clean-room/fixtures/orientation-questions.json`:
  - **8 answerable from the brief:** active sprint, last verdict, carried items, planned next, waiting on owner, P0/P1 bugs, latest decisions, release state.
  - **4 needing the index or item pages:** duplicate check for a described idea, an epic's children, a bug's root cause, what a decision superseded.
- **R6 — Scoring without an LLM judge.** Each question lists required tokens (IDs, counts or a distinctive phrase). The brief questions take them from the oracle's JSON; the 4 page questions have fixed tokens in the questions file. An answer is correct when every required token appears in the session's final `result`.
  - Tool calls are counted from `tool_use` content blocks in the stream (a new counter in `orientation-eval.mjs`; `parseClaudeStream`, `cleargate-cli/scripts/clean-room/evidence.mjs:311`, returns hooks and results but no tool-use count, and stays unchanged).
  - The SessionStart `hook_response` must contain the brief's `Active sprint:` line, which proves injection end to end.
- **R7 — Verdict.** PASS when at least 11 of 12 answers are correct and the 8 brief questions each used zero tool calls. Otherwise FAIL. A session that could not run (no `claude` on PATH, timeout) is recorded as "not run", and the overall verdict is INCOMPLETE with exit code non-zero. It is never scored as a wrong answer.
- **R9 — Gating model.** Only a run with `--model claude-opus-5-5` produces a release verdict. A run with any other model is labelled `smoke` in the evidence file and its verdict line, and never counts for the release gate.
- **R8 — Baseline mode.** `--version 0.28.0` installs the published 0.28.0 from npm instead of packing the working tree, runs the same 12 questions on the same corpus, and records the score labelled `baseline`, with no pass bar. It is run once before M2 work starts.

### 1.3 Out of Scope
- Writing the brief (063-11), index (063-09) or decisions page (063-10).
- An LLM-as-judge scorer.
- Running the eval in `npm test` or CI. It spends model tokens, so it is a manual release gate run by QA.
- Codex live sessions (consistent with EPIC-063's "no live Codex run").
- The M1 clean-room proof of the contradiction loop (STORY-063-07).

### 1.4 Open Questions

- **Question (Q1):** Which model runs the eval?
- **Recommended:** `claude-opus-5-5`, the model the owner orchestrates with, because the eval measures orchestrator orientation. A `--model` flag allows cheaper smoke runs, but only an Opus run counts for the release gate. Cost per run is 12 short sessions.
- **Human decision:** Owner approved 2026-11-12: `claude-opus-5-5` for the gating run; `--model` allows cheaper smoke runs that are labelled `smoke` and never count (R9).

- **Question (Q2):** The oracle (deterministic, in `npm test`) and the eval (live, manual) share the fixture corpus and the line contract, but they touch different areas: a test script versus the clean-room harness. Keep them as one L3 story, or split them into two stories (oracle, then eval)?
- **Recommended:** Keep one story. The corpus and the question tokens are derived from the oracle's output, so splitting would create a cross-story dependency on a fixture with no other consumer. If the Architect sees L3 plus high bounce exposure, split along the interface axis (oracle first).
- **Human decision:** Owner approved 2026-11-12: keep it as one story (L3, medium bounce exposure).

### 1.5 Risks

- **Risk:** Token-containment scoring passes an answer that names the right ID while saying something wrong about it.
- **Mitigation:** Required tokens include a count or state where the fact has one (for example `SPRINT-9` plus `3 stories`). A spot-check of the evidence file is part of §2.2.
- **Risk:** The eval is flaky across runs.
- **Mitigation:** The evidence file records every answer and tool count. A FAIL is re-run once; two FAILs block the release.
- **Risk:** The oracle and the compiler drift apart in their definition of "open" or "carried".
- **Mitigation:** Both definitions are written down in STORY-063-11 §1.2 R2. A divergence shows up as a mismatch line naming the fact, which is the point of having two implementations.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Fixture with an active sprint vs without; eval on the working tree vs on the 0.28.0 baseline. |
| Interfaces | T | Two surfaces: the oracle script (`npm test`) and the clean-room eval (live `claude -p`). |
| Data | T | Two fixture corpora; brief vs page-dependent questions. |
| Rules | T | Pass bar (≥ 11/12, zero tool calls on 8); "not run" is never scored as wrong. |

```gherkin
Feature: Truth oracle and orientation eval

  @paths @data
  Scenario Outline: The brief agrees with the independent oracle
    Given the orientation fixture corpus <variant>
    And `cleargate wiki build` and `cleargate doctor --session-start` have run
    When `scripts/brief-oracle.sh --compare` runs on the printed brief
    Then it exits 0 with no mismatch lines
    And brief-oracle.sh contains no reference to `cleargate`, `dist/` or `src/`

    Examples:
      | variant                       |
      | with SPRINT-9 active          |
      | with no active sprint         |

  @rules
  Scenario: Error — a wrong fact in the brief fails the test
    Given a printed brief from which one carried item ID has been removed
    When compare mode runs
    Then it prints "mismatch: carried" with the brief and truth values
    And it exits 1
    And when `jq` is not on PATH, the oracle test fails with "jq required" instead of skipping

  @interfaces @rules
  Scenario: The live eval scores a release candidate
    Given a clean-room install of the packed working tree with the orientation corpus and a built wiki
    When `node scripts/clean-room/orientation-eval.mjs run --model claude-opus-5-5` runs
    Then 12 fresh sessions run, one per question
    And every session's SessionStart hook_response contains the "Active sprint:" line
    And the evidence file records each answer, its required tokens found, and its tool-call count
    And the verdict is PASS only if at least 11 answers are correct and the 8 brief questions used zero tool calls
    And the same run with `--model claude-sonnet-5-5` is labelled "smoke" and produces no release verdict

  @paths
  Scenario: The baseline is recorded against today's release
    Given the same corpus
    When `orientation-eval.mjs run --version 0.28.0` runs
    Then the evidence file records the score labelled "baseline" with no pass bar applied

  Scenario: Error — a session that cannot run is not scored as a wrong answer
    Given `claude` is not on PATH, or a session exceeds its timeout
    When the eval runs
    Then that question is recorded as "not run"
    And the overall verdict is INCOMPLETE and the script exits non-zero
```

### 2.2 Verification Steps (Manual)
- [ ] Before M2 work starts: run the baseline (R8) and commit its evidence file.
- [ ] Before the 0.30.0 release: run the eval on the release candidate with `claude-opus-5-5`. It must PASS. Spot-check 3 answers in the evidence file against the corpus.
- [ ] Dogfood after release: `cleargate-cli/scripts/brief-oracle.sh --compare .cleargate/wiki/brief.md .` in the meta-repo exits 0 on the real corpus.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scripts/brief-oracle.sh` |
| Related Files | `cleargate-cli/scripts/clean-room/artifact.mjs`, `cleargate-cli/scripts/clean-room/evidence.mjs`, `cleargate-cli/scripts/clean-room/fixtures` |
| New Files Needed | Yes — `cleargate-cli/scripts/brief-oracle.sh`, `cleargate-cli/test/wiki/brief-truth-oracle.node.test.ts`, `cleargate-cli/test/fixtures/orientation-corpus/` (tree), `cleargate-cli/scripts/clean-room/orientation-eval.mjs`, `cleargate-cli/scripts/clean-room/fixtures/orientation-questions.json` |

### 3.2 Technical Logic
- **Dependencies.** Depends on STORY-063-11 (the brief and its line contract), so `parallel_eligible: n`. It is the M2 release gate.
- **Oracle.** One function per fact, each a short `grep` and `sed` over raw frontmatter, plus `jq` on `state.json`. Definitions are copied in words from STORY-063-11 §1.2 R2, not from its code:
  - open = status not in Completed/Done/Abandoned/Closed/Resolved;
  - carried = `carry_over: true` and the named sprint is terminal or null;
  - P0/P1 = `severity` starts `P0` or `P1`, quotes stripped.
  
  Emit JSON with `jq -n`.
- **Compare.** Parse the brief with the fixed prefixes from 063-11 §3.3; normalise ID lists to sorted sets; handle `+N more`.
- **Test.** Copy `test/fixtures/orientation-corpus/` to a temp dir, `git init`, commit, tag `v0.0.1`, then add one commit. Run `node dist/cli.js wiki build` and `doctor --session-start` (the same pattern other tests use to spawn `dist/cli.js`; a full suite needs `npm run build` first, as the SPRINT-44 flashcard notes). Then spawn the oracle.
- **Eval.**
  - Import `packArtifact` and `installArtifact` from `artifact.mjs`. Don't import `claude-baseline.mjs`: it runs `main()` on import (`artifact.mjs` header, M5-A11).
  - Spawn `claude -p "<question>" --output-format stream-json --include-hook-events --model <m>` with a per-question timeout.
  - Count `tool_use` blocks in assistant messages with a local counter. Read the SessionStart `hook_response` via `parseClaudeStream`.
  - Write the evidence file with `markdownCell` and `oneLine` (`evidence.mjs:194,203`).
  - For `--version`, run `npm install cleargate@<v>` into the container instead of packing.

### 3.3 API Contract (if applicable)

| Command | Output | Exit |
|---|---|---|
| `brief-oracle.sh <repo>` | JSON facts object (keys: `active_sprint`, `waiting`, `p0p1`, `last_closed`, `carried`, `planned`, `decisions`, `release`) | 0 |
| `brief-oracle.sh --compare <brief.md> <repo>` | `mismatch: <fact> brief=<…> truth=<…>` lines | 0 when all match, 1 otherwise |
| `orientation-eval.mjs run [--model m] [--version v] [--evidence path]` | evidence markdown; final `VERDICT: PASS|FAIL|INCOMPLETE` line (`baseline` label when `--version`) | 0 on PASS or baseline, non-zero otherwise |

## Task Breakdown

- [ ] Build the orientation fixture corpus (R4).
- [ ] Write `brief-oracle.sh` (facts mode) from the written definitions in 063-11 §1.2.
- [ ] Add compare mode and the oracle test, including the planted-mismatch case.
- [ ] Write `orientation-questions.json` (12 questions, required tokens or oracle keys).
- [ ] Write `orientation-eval.mjs` (install, corpus, 12 sessions, tool-use counter, hook check, scoring, verdict, `--version` baseline).
- [ ] Run the baseline against 0.28.0 and commit the evidence.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | Compare-mode parsing and `+N more` handling; the tool-use counter on a recorded stream; the scorer on recorded answers; the R9 `smoke` labelling for a non-Opus model. EPIC-063 verification level: unit. |
| Integration tests | 3 | Oracle-vs-brief on both fixture variants plus the planted mismatch (`brief-truth-oracle.node.test.ts`, default suite: needs `jq`/`git`, no network). EPIC-063 verification level: truth oracle. |
| E2E / acceptance tests | 2 | Orientation eval on the release candidate (must PASS) and the 0.28.0 baseline run. Manual release gate. EPIC-063 verification level: live end-to-end. Plus the dogfood compare on the meta-repo corpus (§2.2). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scripts/clean-room/artifact.mjs:45` `packArtifact` and `:88` `installArtifact`. Pack and install into a clean container, shared by the SPRINT-41 harnesses.
- **Surface:** `cleargate-cli/scripts/clean-room/evidence.mjs:311` `parseClaudeStream`, which reads `--include-hook-events` streams (hooks, tool errors, result), and `:194`/`:203` `oneLine`/`markdownCell`.
- **Surface:** `cleargate-cli/scripts/clean-room/claude-baseline.mjs:15` (usage) and `:239-240` (`--output-format stream-json`). The headless-session pattern to follow.
- **Coverage of this requirement:** partial. Install and stream parsing are reused; the oracle, scorer and question set are new.

## Prior work

- [[EPIC-063]] — parent; this is story 063-12 (truth oracle + orientation eval).
- [[EPIC-058]] — Multi-host adapters (Draft; SPRINT-41). Built the clean-room harness reused here (STORY-058-08/09/10).
- [[BUG-066]] — `test_close_pipeline.sh` reports PASS for scenarios that never run (Draft). Why R7 never scores a non-run as a result.
- [[BUG-054]] — Gate criteria pass on unedited templates (Draft). Same lesson: a check must be able to fail. R3's planted mismatch proves the oracle can.
- Depends on STORY-063-11 (brief and line contract).

## Why not simpler?

- **Smallest existing surface that could carry this:** the clean-room harness for install and streams; nothing existing computes brief facts independently.
- **Why isn't extension / parameterization / config sufficient?** A test that calls the compiler's own functions to check the compiler's output can't catch a wrong definition, so the oracle has to be independent. The question "does a fresh session get oriented?" can only be answered by running fresh sessions, which no unit test does. Token-containment scoring keeps the eval deterministic, so no LLM judge is needed.

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

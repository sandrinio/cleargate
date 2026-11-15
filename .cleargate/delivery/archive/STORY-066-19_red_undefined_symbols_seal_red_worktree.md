---
story_id: STORY-066-19
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,scripts
status: "Completed"
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T11:32:50Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox run 2, finding S7 (.cleargate/field-trials/2026-11-sandbox-s46.md; run 2 STORY-001-02-pre-arch-scan.txt) and run 1 finding B10 (ORCHESTRATOR_FINDINGS.md); design source .cleargate/sprint-runs/SPRINT-46/plans/iteration-3-scoping.md §5 (B10), §6, §8; owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; OD-1..OD-12 ratified in sprint-context Mid-Sprint Amendments, 'Iteration 3')"
actor: QA-Red sealing red tests in a Go or TypeScript repo
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T11:32:50Z
updated_at: 2026-11-15T11:32:50Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T11:32:50Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  sessions: []
---

# STORY-066-19: Red tests that only name not-yet-written symbols do not trigger Architect passes; seal_red resolves --worktree from the repo root
**Complexity:** L2 — one script: a pure classifier behind the existing seal flow, and one path-resolution fix.

## 1. The Spec (The Contract)

### 1.1 User Story
As QA-Red sealing a red test in a Go or TypeScript repo, I want a typecheck failure that only names symbols the story has not written yet to be recorded as the expected red state, and a relative `--worktree` to resolve from the repo root, so that a normal red test does not cost two Architect dispatches and the seal works from any directory.

### 1.2 Detailed Requirements
- Requirement 1 (finding S7): after the scan, when the report's only `[FAIL]` is `typecheck`, `seal_red.mjs` classifies its `  | ` block as expected-red when all hold: (1) fewer than 40 `  | ` lines (the scan keeps `tail -n 40`; a full block may be truncated, so the flag stays); (2) at least one diagnostic, where a diagnostic is `<path>:<line>:<col>: <msg>` (Go, optional `vet: ` prefix stripped) or `<path>(<line>,<col>): error TS<n>: <msg>` or `<path>:<line>:<col> - error TS<n>: <msg>` (tsc); (3) every diagnostic's path, normalised against the worktree, is one of the sealed files passed after `--`; (4) every diagnostic message is an undefined-symbol message: Go `undefined: <ident>` or `<x>.<Y> undefined (type … has no field or method <Y>)`; tsc TS2304, TS2305, TS2724, TS2307, TS2339 or TS2552; (5) every other non-blank line is noise from an allow-list: `# <pkg>` / `# [<pkg>]`, `> <npm script line>`, `npm (ERR!|error|warn) …`, `make(\[\d+\])?: \*\*\* …`, `exit status \d+`, `Found \d+ errors?…`, and tsc's per-file summary table.
- Requirement 2 (the seal JSON): when the block is classified expected-red, the seal JSON carries `scan_exit: 0`, `flags` without `typecheck`, and the additive keys `expected_red: ["<diagnostic>", …]` and `scan_exit_raw: 1` (pinned interface P9). `seal_red.mjs` exits 0. The report file still shows the raw `[FAIL]`. Any other typecheck error (a redeclaration such as run 1's S5 `run`, an error in a non-red file, a syntax error, `too many errors`) keeps today's `flags: ["typecheck"]` and `scan_exit: 1`.
- Requirement 3 (finding B10): `--worktree` is used as given when absolute. A relative value is resolved against cwd when that path exists, else against the main checkout (`git rev-parse --path-format=absolute --git-common-dir`; the parent when the basename is `.git`). When neither exists, `seal_red.mjs` exits 2 naming both paths.

### 1.3 Out of Scope
- `pre_gate_runner.sh`, `pre_gate_common.sh` and `wave_runner.js`: the shared scan and the runner are untouched; the runner reads `scan_exit` and `flags` as today.
- Any QA-Red prompt change: the agent copies `scan_exit` and `flags` from the seal JSON as today (`wave_runner.js:65`).
- Re-sealing after a Developer commit and re-running an ESCALATED item: intake.
- Live `.claude/` and `.cleargate/` copies: re-synced at SPRINT-46 Gate 4.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Change the shared scan or only the seal?
- **Recommended:** Only `seal_red.mjs`. The shared scan and the runner stay untouched, so no sealed red needs re-scoping (scoping §6, OD-10: S7 is in iteration 3).
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation.
- **Question:** A misspelt reference to an existing symbol also reads `undefined:` and now skips Architect TPV. Acceptable?
- **Recommended:** Yes. The Developer's `Red-Test` block routes it back to QA-Red (STORY-066-13), costing one Developer pass instead of one TPV; that is the trade the coordinator proposed.
- **Human decision:** Resolved by the orchestrator under the owner's delegation per the recommendation.

### 1.5 Risks

- **Risk:** the misspelt-reference case above.
- **Mitigation:** the cost is bounded to one Developer pass; every other typecheck error keeps the flag.
- **Risk:** the allow-list misses a noise line for another toolchain, so a real expected red keeps its flag.
- **Mitigation:** the failure direction is today's behaviour (the Architect pass runs); noise lines can be added later.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Expected-red seal, and a relative `--worktree` resolved from the repo root. |
| Interfaces | F | One interface: the `seal_red.mjs` CLI and its JSON; Go and tsc are data shapes, not interfaces. |
| Data | T | Go and tsc diagnostic shapes (Scenario Outline). |
| Rules | T | Any other typecheck error, or a truncated block, keeps the flag. |

```gherkin
Feature: Red tests that only name not-yet-written symbols seal clean

  @paths
  Scenario: A Go red test that only names an undefined symbol seals clean
    Given a fixture whose pre-arch scan reports only "[FAIL] typecheck" with the diagnostic "vet: internal/tally/top_test.go:13:12: undefined: Pair"
    And internal/tally/top_test.go is a sealed red file passed after "--"
    When seal_red.mjs STORY-909-01 --worktree <worktree> -- internal/tally/top_test.go runs
    Then it exits 0 and the seal JSON has scan_exit 0, scan_exit_raw 1 and no "typecheck" in flags
    And expected_red lists the diagnostic

  @data
  Scenario Outline: tsc undefined-symbol diagnostics in a red file seal clean
    Given the scan reports only "[FAIL] typecheck" with the diagnostic "<diagnostic>" in a sealed red file
    When seal_red.mjs runs
    Then the seal JSON has scan_exit 0 and expected_red lists the diagnostic

    Examples:
      | diagnostic                                                              |
      | src/top.red.node.test.ts(4,10): error TS2304: Cannot find name 'topN'.  |
      | src/top.red.node.test.ts(2,21): error TS2307: Cannot find module './top.js' or its corresponding type declarations. |

  @rules
  Scenario Outline: Any other typecheck error keeps the flag
    Given the scan reports only "[FAIL] typecheck" with "<case>"
    When seal_red.mjs runs
    Then the seal JSON has scan_exit 1, "typecheck" in flags, and no expected_red

    Examples:
      | case                                                              |
      | a redeclaration error in the red file                             |
      | an undefined-symbol error in a file that is not a sealed red file |
      | a syntax error beside an undefined-symbol error                   |
      | a block of 40 lines (possibly truncated)                          |

  @paths
  Scenario: A relative --worktree resolves from the repo root
    Given the worktree .worktrees/STORY-909-02 exists under the main checkout
    When seal_red.mjs STORY-909-02 --worktree .worktrees/STORY-909-02 runs with cwd inside that worktree
    Then it resolves the worktree against the main checkout and seals
    And a value that exists in neither place exits 2 naming both paths
```

### 2.2 Verification Steps (Manual)
- [x] Goal check (d) run 3 on the Go sandbox: dispatch counts per lane are 1 / 3 / 5 / 3 (the standard and runtime items no longer pay `architect-tpv` and `architect-review` for the expected red).

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs` |
| Related Files | `cleargate-cli/test/scripts/seal-red-expected-red.red.node.test.ts`, `cleargate-cli/test/scripts/seal-red-expected-red.red.integration.node.test.ts`, `cleargate-cli/test/scripts/seal-red.integration.node.test.ts` |
| New Files Needed | Yes — the two red test files; `seal-red.integration.node.test.ts` (STORY-066-07's name) gets one additive scenario for B10 in QA-Red's commit |

### 3.2 Technical Logic
1. **Root cause.** QA-Red's seal runs `pre_gate_runner.sh arch` (`seal_red.mjs:118-121`); its typecheck step fails on any non-zero exit (`pre_gate_runner.sh:188-194`, `pre_gate_common.sh:100-107`). In Go a red test that calls a symbol the item will create fails `go vet` (`vet: internal/tally/top_test.go:13:12: undefined: Pair`). `seal_red.mjs:126-131` turns the `[FAIL] typecheck` line into `flags: ["typecheck"]`, `scan_exit: 1`; `wave_runner.js:48` `scanFlagged` is true and `:112` runs every `scan-flagged` stage: `architect-tpv` and, on standard, `architect-review`. Run 2: STORY-001-02 standard had 5 dispatches instead of 3, STORY-001-03 runtime 6 instead of 5.
2. **Classifier.** An exported pure function in `seal_red.mjs` (input: the report's typecheck block, the sealed file list, the worktree; output: `{ expectedRed: string[] } | null`). The seal flow calls it after the scan and rewrites `scan_exit`, `flags` and the additive keys only when it returns a value.
3. **Path resolution (`seal_red.mjs:72`).** `path.resolve(worktree)` becomes the rule of Requirement 3. The main-checkout lookup follows the flashcard 2026-09-27 `#worktree #scripts`.
4. **Tests.** New red unit cases for the classifier (Go and tsc shapes, red-file vs non-red path, mixed error, 40-line block) and one integration seal on a fixture whose `arch.typecheck` prints a Go undefined error. The existing `seal-red.integration.node.test.ts` uses `arch.typecheck: ''` (`:63-64`) and stays as it is, plus the one additive B10 scenario.
5. **Base and merge.** Base cli `main` bf21e96. No other story in iteration 3 edits `seal_red.mjs`.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `seal_red.mjs <ID> --worktree <path> -- <files>` (stdout JSON) | CLI | None | `--worktree` may be relative to cwd or to the main checkout | existing keys unchanged; additive `expected_red: string[]` and `scan_exit_raw: number`, only on a classified seal (P9) |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Unit (the classifier), Integration (`seal_red.mjs` on a fixture repo), Release gate (Goal check (d) run 3).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | Classifier: Go shape, tsc shapes, non-red path, mixed error and 40-line block. |
| Integration tests | 3 | `*.red.integration.node.test.ts`: a Go undefined-error seal is clean; a relative `--worktree` from inside the worktree; a value in neither place exits 2. |
| E2E / acceptance tests | 4 | One per Gherkin scenario. |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] `seal-red.integration`, `segment-stages.red` and `wave-runner.red.integration` stay green.
- [x] Goal check (d) run 3 shows the dispatch counts 1 / 3 / 5 / 3 on a Go repo.
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs:72` — `path.resolve(worktree)`; `:118-121` the arch scan; `:126-131` the `typecheck` flag and `scan_exit: 1`; `:56-65` item lookup with `matchesId`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:188-194` and `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_common.sh:100-107` — the typecheck step that fails on any non-zero exit; not changed.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:48`, `:65`, `:112` — `scanFlagged` and the `scan-flagged` stages; not changed.
- **Surface:** `cleargate-cli/test/scripts/seal-red.integration.node.test.ts:63-64` — fixtures use `arch.typecheck: ''`; `cleargate-cli/test/integration/wave-runner.red.integration.node.test.ts` reads seal fields only.
- **Coverage of this requirement:** partial. The seal runs the scan and records its result; it has no notion of an expected red, and it resolves `--worktree` against cwd only.

## Prior work

- [[EPIC-066]] — parent; Goal check (d) is its release gate.
- [[STORY-066-07]] — created `seal_red.mjs` and its tests.
- [[CR-081]] — the seal and the pre-gate scan; adjacent.
- Sandbox finding S7 (run 2, raised again in the iteration-3 scoping) and B10 (run 1): TPV on the expected red; `--worktree` against cwd.
- cleargate-wiki-query 2026-11-15: no prior item classifies an expected red in the seal.

## Why not simpler?

- **Smallest existing surface that could carry this:** `seal_red.mjs` only; the scan, the runner and the agent prompts are untouched.
- **Why isn't extension / parameterization / config sufficient?** The scan reports any typecheck failure as a flag by design, and the runner turns every flag into Architect passes. Only the seal sees both the diagnostics and the list of sealed files, so only it can tell an expected red from a real error.

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

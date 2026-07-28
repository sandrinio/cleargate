---
story_id: STORY-051-04
parent_epic_ref: EPIC-051
parent_cleargate_id: EPIC-051
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
ambiguity: 🟢 Low
context_source: EPIC-051 decomposition (framework self-audit 2026-07-17) + verified codebase grounding + recorded direct approval
area: framework/enforcement
actor: ClearGate maintainer (pre-commit / story assertion)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-07-17T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
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
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-17T18:17:05Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-051-04: Remove the CLEARGATE_EXEC_MODE=v1 Silent Bypass from assert_story_files
**Complexity:** L2 — delete the retired-axis env branch in `assert_story_files.mjs` so the story-file assertion always hard-fails on MISSING/UNAPPROVED/STUB-EMPTY, then repair and re-mirror its test.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer running the pre-commit / sprint-init story assertion, I want `assert_story_files.mjs` to hard-fail (non-zero exit) on every MISSING / UNAPPROVED / STUB-EMPTY item with no environment escape hatch, so that a stray `CLEARGATE_EXEC_MODE=v1` can no longer silently downgrade the gate to a warning and manufacture false assurance that a sprint's work-item files are all present and approved.

### 1.2 Detailed Requirements
- Delete the `execMode` env read (`const execMode = process.env.CLEARGATE_EXEC_MODE ?? 'v2'`, line 233, plus its `// Allow test-isolation override…` comment line 232) and collapse the `if (execMode === 'v2') { exit(1) } else { exit(0) }` branch (lines 257-262) into an unconditional `process.exit(1)` on `hasProblems`.
- The three other exit paths are unchanged: clean run → `exit 0` with the `OK:` summary; usage/parse error → `exit 2`; the `--emit-json` early-return path (lines 213-230) is untouched.
- Remove the `CLEARGATE_EXEC_MODE  override execution_mode ('v1'|'v2') — for test isolation` line from the header doc block (line 20). The `CLEARGATE_REPO_ROOT` doc line stays.
- Introduce no replacement environment variable. `CLEARGATE_ADVISORY=1` remains the only sanctioned soft lever framework-wide; whether it should also soften *this standalone gate* is EPIC-051's open question Q1 (still unresolved at the epic level) and is explicitly NOT wired here.
- Update `test_assert_story_files.sh`: (a) drop the retired "v1 warns but does not block" expectation; (b) add a regression assertion that running the standalone script with `CLEARGATE_EXEC_MODE=v1` exported and a missing item still exits non-zero; (c) fix the `make_story_file` fixture so the "all present" cases produce approved, non-stub files and the suite returns green.
- A grep of all three `assert_story_files.mjs` copies (canonical + live + payload) for `CLEARGATE_EXEC_MODE` returns zero occurrences.
- Sync all three copies of the script and all three copies of the test to byte-identical: canonical → live by hand-diff, canonical → payload by `npm run prebuild`.

### 1.3 Out of Scope
- Changing what counts as STUB-EMPTY (`assertWorkItemApproved` / `has_heading` logic) or the work-item file discovery logic (`findWorkItemFile`, `extractWorkItemIds`, `extractDeliverablesSection`).
- Wiring `CLEARGATE_ADVISORY` into the standalone `assert_story_files.mjs` main path (that is the unresolved EPIC-051 Q1 decision).
- Sweeping residual `execution_mode` / v1 / v2 vocabulary from other shipping surfaces — docs, agents, `story.md`, other script comments — which is a separate EPIC-051 story.
- Any change to `init_sprint.mjs`, which was already converted to unconditional enforcement (with `CLEARGATE_ADVISORY=1` break-glass) by STORY-070-01 and never sets `CLEARGATE_EXEC_MODE`.

### 1.4 Open Questions
> Every decision this story depends on is RESOLVED — the removal is unambiguous (the axis it reads was retired by CR-070/CR-074).
- **Question:** Should the standalone `assert_story_files.mjs` honor `CLEARGATE_ADVISORY=1` as a break-glass the way `init_sprint.mjs` already does?
- **Recommended:** Not in this story — deletion of the retired bypass is self-contained; advisory coverage is a separate policy fork.
- **Human decision:** Deferred to EPIC-051's open question Q1 (still unresolved at the epic level — Q1 asks whether `CLEARGATE_ADVISORY` becomes the universal strength knob across all gates). This story removes the dead lever only; it does not add a new one, so it is compatible with either Q1 outcome.

### 1.5 Risks
- **Risk:** A CI job or another test relies on `CLEARGATE_EXEC_MODE=v1` for isolation and depends on the soft (exit 0) path; removing the branch turns that into a hard failure. / **Mitigation:** Repo-wide grep already run — the only `CLEARGATE_EXEC_MODE` hits are the three `assert_story_files.mjs` copies and the EPIC-051 planning doc; no CI, no other script, no other test sets it. `init_sprint.mjs` invokes the assertion with only `CLEARGATE_REPO_ROOT` set and gates on the exit code, so no live caller depends on the env.
- **Risk:** Shared-file collision with the EPIC-051 vocabulary-sweep story, which also edits script header comments. / **Mitigation:** This story owns `assert_story_files.mjs` and its test outright; the sweep story excludes those two files. Sequence this M0 story ahead of the later-milestone sweep; reconcile at merge if both branches are open.
- **Risk:** Blind `cp` during mirror sync clobbers live-only content (FLASHCARD 2026-07-17). / **Mitigation:** `diff` canonical against live before copying; regenerate the payload via `npm run prebuild` rather than hand-copying.
- **Risk:** The test file already fails in three of its four scenario groups (it predates STORY-070-01's always-enforce and the approval/stub checks), so "make the test green" is larger than a one-line assertion add. / **Mitigation:** Bringing the whole `test_assert_story_files.sh` suite green is folded into this story's DoD, since this story is the one staging that file.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)
```gherkin
Feature: assert_story_files always hard-fails on a broken story surface

  Scenario: Missing item hard-fails with no env set
    Given a sprint file referencing STORY-096-01 and STORY-096-02 in its "## 1. Consolidated Deliverables" section
    And only STORY-096-01 has an approved, non-empty file
    And no CLEARGATE_EXEC_MODE env is set
    When I run assert_story_files.mjs against the sprint file
    Then it exits with a non-zero code
    And stderr contains "MISSING" and names STORY-096-02

  Scenario: The removed bypass is inert
    Given the same sprint file with STORY-096-02 still missing
    And CLEARGATE_EXEC_MODE=v1 is exported in the environment
    When I run assert_story_files.mjs against the sprint file
    Then it still exits with a non-zero code
    And it does not print any "v1: warn only" continuation

  Scenario: Clean surface passes
    Given every referenced item has an approved, non-stub file in pending-sync/ or archive/
    When I run assert_story_files.mjs against the sprint file
    Then it exits 0 and stdout begins with "OK:"

  Scenario: The header doc no longer advertises the env override
    Given the three assert_story_files.mjs copies (canonical, live, payload)
    When I grep them for "CLEARGATE_EXEC_MODE"
    Then zero occurrences are found

  Scenario: Mirrors are in sync and the suite is green
    Given the edited canonical script and test
    When I hand-diff canonical against live and run npm run prebuild for the payload
    Then all three script copies and all three test copies are byte-identical
    And test_assert_story_files.sh reports all scenarios passed
```

### 2.2 Verification Steps (Manual)
- [ ] `grep -rn CLEARGATE_EXEC_MODE cleargate-planning/.cleargate/scripts/assert_story_files.mjs .cleargate/scripts/assert_story_files.mjs cleargate-cli/templates/cleargate-planning/.cleargate/scripts/assert_story_files.mjs` returns nothing.
- [ ] `bash cleargate-planning/.cleargate/scripts/test/test_assert_story_files.sh` prints "All tests passed." and exits 0.
- [ ] Manually run the standalone script against a sprint fixture with a missing item and `CLEARGATE_EXEC_MODE=v1` exported → non-zero exit, `MISSING` on stderr.
- [ ] `diff` canonical vs live and canonical vs payload for both the script and the test → identical.
- [ ] After `npm run prebuild`, `git diff` shows the payload script/test copies match canonical.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-planning/.cleargate/scripts/assert_story_files.mjs` — delete header doc line 20, delete the `execMode` read (lines 232-233), collapse the exit branch (lines 257-262) to unconditional `process.exit(1)`. |
| Related File (live mirror) | `.cleargate/scripts/assert_story_files.mjs` — hand-synced to match canonical (diff first; currently byte-identical). |
| Related File (payload mirror) | `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/assert_story_files.mjs` — regenerated by `npm run prebuild` (`copy-planning-payload.mjs`); do not hand-edit. |
| Related File (test, canonical) | `cleargate-planning/.cleargate/scripts/test/test_assert_story_files.sh` — fix `make_story_file` fixture, retire the v1-warn assertions, add the `CLEARGATE_EXEC_MODE=v1`-is-inert regression check, update the header comment block. |
| Related File (test, live mirror) | `.cleargate/scripts/test/test_assert_story_files.sh` — hand-synced to match canonical (currently byte-identical). |
| Related File (test, payload mirror) | `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/test/test_assert_story_files.sh` — regenerated by `npm run prebuild`. |
| New Files Needed | None. |

### 3.2 Technical Logic
**Script change (`assert_story_files.mjs`).** In `main()` the current tail reads:

```
// Allow test-isolation override of execution_mode
const execMode = process.env.CLEARGATE_EXEC_MODE ?? 'v2';
const { missing, present, unapproved, empty } = assertWorkItemFiles(sprintFilePath, REPO_ROOT);
const hasProblems = missing.length > 0 || unapproved.length > 0 || empty.length > 0;
...
if (execMode === 'v2') {
  process.exit(1);
} else {
  // v1: warn only, exit 0
  process.exit(0);
}
```

Delete the comment + `execMode` const (lines 232-233), keep the `assertWorkItemFiles` call and the structured-stderr block unchanged, and replace the terminal `if/else` (lines 257-262) with a single unconditional `process.exit(1);`. `main()` now exits non-zero whenever `hasProblems` is true, exits 0 on the clean `OK:` path (unchanged, still returns before this point), and exits 2 on usage/read/parse errors (unchanged). The `--emit-json` branch (lines 213-230) returns before this code and is untouched. Also delete the `CLEARGATE_EXEC_MODE` line from the header doc block (line 20); leave the `CLEARGATE_REPO_ROOT` doc line.

**Test change (`test_assert_story_files.sh`).** The suite currently has four scenarios; three groups are already red because the fixtures predate the always-enforce + approval/stub reality. Changes:
- `make_story_file` (lines 115-120) writes only `# <ID>: Placeholder` — an H1 with no frontmatter and no `## ` heading, which the assertion flags as UNAPPROVED and STUB-EMPTY. Rewrite it to emit a file with `approved: true` frontmatter and at least one `## ` body heading, so "present" files pass.
- Scenario 3 ("v1 init warns but does not block", lines 184-210) asserts retired behavior. `init_sprint.mjs` now always blocks a missing story (STORY-070-01). Re-cast Scenario 3 as "sprint init blocks a missing story regardless of any `execution_mode` fixture field": expect exit 1, no `state.json`, and `STORY-097-02` on stderr.
- Scenario 4 (standalone CLI, lines 212-246): keep "missing → non-zero"; the "all present → exit 0 / OK:" checks now pass with the fixed fixture. Add a regression sub-check: export `CLEARGATE_EXEC_MODE=v1` and run the standalone script against the still-missing fixture — assert exit is still non-zero (proves the removed bypass is inert). This is the one sanctioned `CLEARGATE_EXEC_MODE` reference left in the tree, and it asserts absence-of-effect.
- Update the header comment block (lines 4-8) to describe the new scenarios and drop the v1/v2 framing.

**Mirror sync.** After canonical edits: `diff` canonical vs live for both files and copy across only if content matches expectation (never blind `cp` — FLASHCARD 2026-07-17); run `npm run prebuild` to regenerate the two payload copies; confirm `git diff` shows payload == canonical.

### 3.3 API Contract (if applicable)

| Invocation | Condition | Exit code | Change |
|---|---|---|---|
| `node assert_story_files.mjs <sprint-file>` | all items present, approved, non-empty | `0` (`OK:` on stdout) | unchanged |
| `node assert_story_files.mjs <sprint-file>` | ≥1 MISSING / UNAPPROVED / STUB-EMPTY | `1` (structured stderr) | **now unconditional** — was `0` when `CLEARGATE_EXEC_MODE` != `v2` |
| `node assert_story_files.mjs <sprint-file> --emit-json` | any | `0` (JSON `workItemIds` on stdout) | unchanged |
| `node assert_story_files.mjs` (no arg / `--`) or unreadable/unparseable sprint file | usage / parse error | `2` | unchanged |
| env `CLEARGATE_EXEC_MODE` | any value | (no effect) | **removed** — no longer read |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Shell assertion (existing suite) | all groups green | `test_assert_story_files.sh` — bash harness driving `node`; the repo's runner for this script. Not a node:test file, but the canonical test for this gate; no new vitest anywhere. |
| Regression assertion (new) | 1 | Standalone run with `CLEARGATE_EXEC_MODE=v1` exported + a missing item → non-zero exit. |
| Clean-pass assertion | 1 | All items present/approved/non-stub → exit 0 + `OK:`. |

### 4.2 Definition of Done (The Gate)
- [ ] `execMode` env read, its comment, the `if (execMode === 'v2')` branch, and header doc line 20 removed from canonical `assert_story_files.mjs`; terminal path is unconditional `exit(1)`.
- [ ] `test_assert_story_files.sh` green end-to-end, including the `CLEARGATE_EXEC_MODE=v1`-is-inert regression check and the fixed approved/non-stub fixture.
- [ ] Gherkin §2.1 scenarios all covered by the shell suite (missing hard-fail, bypass inert, clean pass, header grep, mirror parity).
- [ ] `grep -rn CLEARGATE_EXEC_MODE` across the three script copies returns 0 occurrences.
- [ ] Canonical → live hand-synced and `npm run prebuild` re-mirrored the payload; both script mirrors and both test mirrors byte-identical to canonical (`diff` clean).
- [ ] No new environment variable or config switch introduced; `CLEARGATE_ADVISORY` untouched.

## Existing Surfaces
> L1 reuse audit.
- **Surface:** `cleargate-planning/.cleargate/scripts/assert_story_files.mjs:233,257-262` — the `CLEARGATE_EXEC_MODE` read and the `execMode`-conditional exit branch; this is the exact code being deleted.
- **Coverage of this requirement:** none — the requirement IS the removal of this surface; there is nothing to reuse, only to delete.
- **Surface:** `cleargate-planning/.cleargate/scripts/init_sprint.mjs:128-146` — the already-shipped always-enforce pattern (unconditional block on `exitCode !== 0`, with `CLEARGATE_ADVISORY=1` as the sole break-glass, STORY-070-01).
- **Coverage of this requirement:** partial — it is the precedent this story mirrors for the standalone path (`init_sprint.mjs` never reads `CLEARGATE_EXEC_MODE`), but it governs the init caller, not the standalone CLI, so the standalone still needed the fix.
- **Surface:** `cleargate-planning/.cleargate/scripts/test/test_assert_story_files.sh:212-246` — the Scenario-4 standalone-CLI harness that the new regression assertion extends.
- **Coverage of this requirement:** partial — the harness scaffolding (tmpdir, `make_sprint_file`, exit-capture) is reused; the v1-warn assertions and stub fixture are replaced.

## Why not simpler?
- **Smallest existing surface that could carry this:** `assert_story_files.mjs` `main()` itself — this is a net-*negative*-LOC deletion inside an existing function, not new code.
- **Why isn't extension / parameterization / config sufficient?** The entire defect is that a config/env switch (`CLEARGATE_EXEC_MODE`) silently softened a gate that documentation calls always-enforced, and the axis it keys off (`execution_mode` / v1 / v2) was retired by CR-070/CR-074. Adding a parameter or config would reintroduce exactly the retired behavior-switch the epic forbids. The only sanctioned strength lever, `CLEARGATE_ADVISORY`, already exists and is wired at `init_sprint.mjs:140`; wiring it into the standalone path is a separate, still-open epic-level decision (EPIC-051 Q1). The correct move here is deletion, and deletion is already the simplest possible change.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — approved at Gate 1 (2026-07-17)**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

> Boxes 1-5 are literally satisfied: the policy decision (remove the retired bypass, keep `CLEARGATE_ADVISORY` as the only lever) is resolved at the epic level, every cited path was Read/Grepped and confirmed (script lines 20/232-233/257-262, test lines 115-120/184-246, all three mirrors byte-identical, `init_sprint.mjs` already always-enforces). The remaining gap to 🟢 is the epic-level `approved: true` — EPIC-051 is still 🔴 with open policy forks (including Q1), which is not this story's to set.
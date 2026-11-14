---
bug_id: BUG-133
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-45
carry_over: false
area: cli-upgrade
status: "Completed"
severity: P2-Medium
reporter: orchestrator (field upgrade watch 0.27.0 → 0.30.1 in a Python target repo, replayed on a scratch copy; same output reported from a Go target repo, 2026-11-13)
approved: true
approved_by: sandrinio
approved_at: 2026-11-14T00:00:00Z
context_source: "Field upgrade watch 2026-11-13: dry run, no-TTY run and --yes run replayed on a scratch copy of the target repo's 0.27.0 scaffold (331/253/333 lines); the Go target repo reported ~60 overwritten lines for 8 changed files; code grounding at cli main dbccc79: src/commands/upgrade.ts:299-320 (applyAlwaysOverwrite prints '[always] overwritten:' for every always file, changed or not), :613-650 (the whole changelog slice since the installed version is printed before the plan), dry-run label 'state=user-modified → clean' for always/pin-aware files"
created_at: 2026-11-13T09:14:27.230Z
updated_at: 2026-11-13T23:02:54Z
created_at_version: strategy-phase-pre-init
updated_at_version: 37c2b2f1-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T23:02:54Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: 5dde0f455476545b5e85ee45c3cf09672b683556f2ba765a5e4e22443898abce
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-11-14T11:17:06Z
  sessions:
    - session: 72e522d7-caa6-4837-81f5-8fa60f84f8b5
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-13T09:27:06Z
    - session: c4ede09a-83a2-42d8-bef2-7869c2129d06
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-13T23:05:42Z
---

# BUG-133: Upgrade output buries the files that lost local edits

### Open Questions

- **Question:** What should upgrade print for an `always` file whose content is already the package's?
- **Recommended:** Nothing per file; one summary line at the end: `[always] 38 unchanged, 19 updated (15 had local edits)`. Each updated file keeps its own line, and a file with local edits says so: `[always] overwritten (local edits replaced): <path>`.
- **Human decision:** As recommended (owner approved with the SPRINT-45 Brief, 2026-11-14). The dry run applies the same rule: a file the run would leave unchanged gets no per-file line, except a host surgery target (.claude/settings.json, .mcp.json, CLAUDE.md), whose line §4 keeps; one line `[dry-run] <U> unchanged (not listed)` precedes `N files planned`. *(CR:spec-clarification, SPRINT-45 M1 plan, 2026-11-14.)*

- **Question:** What should the dry-run label be for a locally edited `always` or `pin-aware` file?
- **Recommended:** `state=user-modified → overwritten, local edits lost` instead of `→ clean`. CR-115's grouped warning still lists these files at the top; this fixes the per-file line it leaves unchanged.
- **Human decision:** As recommended (owner approved with the SPRINT-45 Brief, 2026-11-14). A locally edited merge-3way file reads `→ asks: keep, take or edit` without --yes and `→ overwritten, local edits lost` with --yes. *(CR:spec-clarification, SPRINT-45 M1 plan, 2026-11-14.)*

- **Question:** How much of the changelog should upgrade print?
- **Recommended:** Print the plan first. After it, print only each version's `### Upgrade notes` subsection for the versions in range, newest first, followed by one line naming the package's `CHANGELOG.md` for the full notes. Superseded notes stay in the changelog but are not printed as steps to follow.
- **Human decision:** As recommended (owner approved with the SPRINT-45 Brief, 2026-11-14).

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** The upgrade output makes the few files that change, above all the ones whose local edits are replaced, easy to find.

**Actual Behavior:**
- `applyAlwaysOverwrite` (`upgrade.ts:299-320`) writes and prints `[always] overwritten: <path>` for every `always` file, whether or not its content changed. In the replay, 57 files were printed as overwritten; 38 were byte-identical to the package. The Go repo saw about 60 such lines for 8 files that actually differed.
- The dry run labels a locally edited `always` file `action=overwrite  state=user-modified → clean`. The 16 files whose edits were about to be replaced read as "clean".
- Before the plan, the dry run prints the whole changelog since the installed version (`upgrade.ts:613-650`): 248 lines for 0.27.0 → 0.30.1, including the 0.29.0 and 0.30.0 "re-run `cleargate init`" notes that 0.30.1 supersedes. The plan starts at line 249 of 331.

## 2. Reproduction Protocol
1. A repo installed at 0.27.0 with local edits to 3 `always` scripts and the `pin-aware` session-start hook.
2. `npx cleargate@0.30.1 upgrade --dry-run`: count changelog lines before the first `[dry-run]` line; read the labels of the 4 edited files.
3. `npx cleargate@0.30.1 upgrade --yes`: count `[always] overwritten:` lines and compare with the files whose bytes changed (`git diff --stat`).

Edge conditions:
- A merge-3way file's output is unchanged.
- An `always` file that differs only in mode is reported as updated.
- `--only <tier>` reports only that tier's files.
- With no version change, no release notes are printed (as today).

## 3. Evidence & Context
Dry-run action tally from the replay (0.27.0 → 0.30.1):
```
  38 action=overwrite state=clean
  15 action=overwrite state=user-modified → clean
   7 action=merge-3way state=clean
   5 action=merge-3way state=upstream-changed → clean
   4 action=merge-3way state=both-changed → clean
   3 action=overwrite state=upstream-changed → clean
   2 action=pin-aware state=clean
   1 action=pin-aware state=user-modified → clean
   1 action=pin-aware state=upstream-changed → clean
```
Dry-run layout: `## [0.30.1]` at line 1, `## [0.30.0]` at 74, `## [0.29.0]` at 138, `## [0.28.0]` at 207, first `[dry-run]` line at 249.
`--yes` run: `command grep -c '\[always\] overwritten:'` → `57`.
Go repo report: "~60 `[always] overwritten:` lines, 8 files actually differed".

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/commands/upgrade.ts` (`applyAlwaysOverwrite`, the dry-run label for `always`/`pin-aware` files, §1b changelog print).
- `cleargate-cli/src/lib/changelog.ts` (`sliceChangelog`: return the Upgrade notes subsection).
- `cleargate-cli/src/lib/changelog.ts`: add `extractUpgradeNotes`; `sliceChangelog`'s locked return is unchanged. Tests re-scoped by QA-Red: `cleargate-cli/test/commands/upgrade-changelog.node.test.ts` (notes now follow the plan; fixture sections carry `### Upgrade notes`), `cleargate-cli/test/commands/upgrade-state-parity.red.node.test.ts` (a file neither run changes gets no line). New: `cleargate-cli/test/commands/upgrade-output.red.integration.node.test.ts`. The goal-check reason: Goal Acceptance Check 2 ("the dry run lists only files that change"). *(CR:spec-clarification, SPRINT-45 M1 plan, 2026-11-14.)*

Clarifications from the SPRINT-45 design review (2026-11-14):
- `upgrade.ts:1127` prints a second `[always] overwritten:` line, for the example config. The same changed-bytes rule applies to it.
- The dry-run label (`upgrade.ts:834-846`) projects `→ clean` for every non-clean file, whatever its policy. The truthful label applies to any file whose local edits the run would replace, not only `always`/`pin-aware` files.

SC-7, from the SPRINT-45 walkthrough (UR:bug, owner OK 2026-11-14). Goal check 2 on two dispenser_adapter copies found a false warning. Both runs said `gate-checks.json` would lose local edits: the dry run said `→ overwritten, local edits lost`, and `--yes` printed `[always] overwritten (local edits replaced)`. Upgrade then wrote the repo's gate commands back. On the copy at current HEAD the file came out byte-identical; on the copy at its 0.28.0 install, detection only filled empty values. The cause: upgrade overwrites `.cleargate/scripts/gate-checks.json` and then re-applies the gate-command plan (BUG-037/BUG-121: non-empty `qa.test`, `qa.typecheck` and `arch.typecheck` are kept, empty ones filled by detection). Both outputs judge the file against the raw package file. They also judge it against an install sha that is stale, because the snapshot records the package sha and not the restored file. Rule, for this file only (the one file upgrade post-processes):
- **Would it change?** Both runs compare the file on disk with what upgrade leaves behind: the package file with the gate-command plan applied, written the way `applyTestStack` writes it. When the plan changes no field, that is the package bytes. Equal (bytes and mode) → unchanged: no per-file line, counted in `[dry-run] <U> unchanged (not listed)` and in the real run's `[always] <U> unchanged …` summary.
- **Local edits.** The three gate-command fields are never local edits, because upgrade keeps or fills them. The file has local edits only when, with those three fields set aside, its parsed JSON differs from the package's. Only then do the runs print `→ overwritten, local edits lost` and `[always] overwritten (local edits replaced): <path>`.
- **Changes, but no local edits:** the dry-run label is `state=<state> → updated, no local edits lost`, and the real run prints `[always] overwritten: <path>` and counts it as updated. The existing `gate-checks.json: kept … / … (detected)` line is unchanged.
- Out of scope: re-hashing the install snapshot after the restore, and what upgrade writes to the file.

**Do NOT modify:** what upgrade writes (CR-115 and CR-132 own write behaviour); the no-TTY refusal (BUG-120); the settings.json, `.mcp.json` and CLAUDE.md lines (BUG-093, BUG-095).

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/upgrade-output.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | dry run and real run |
| Interfaces | F | one command |
| Data | T | unchanged, upstream-changed, locally edited files |
| Rules | T | a lost local edit is never labelled clean |

```gherkin
Feature: Upgrade output shows what changed

  @data
  Scenario: Unchanged always files are summarised, not listed
    Given 3 always files identical to the package and 1 that upstream changed
    When cleargate upgrade --yes runs
    Then exactly one "[always] overwritten" line is printed
    And a summary line reads "[always] 3 unchanged, 1 updated (0 had local edits)"

  @rules
  Scenario: A locally edited always file says its edits are replaced
    Given an always file with local edits
    When cleargate upgrade --dry-run runs
    Then its line reads "state=user-modified → overwritten, local edits lost"
    And no line labels it "→ clean"

  @rules
  Scenario: The real run names the replaced edits
    Given an always file with local edits
    When cleargate upgrade --yes runs
    Then a line reads "[always] overwritten (local edits replaced): <path>"

  @paths
  Scenario: The dry run shows the plan before the release notes
    Given an install at 0.27.0 and a package at 0.30.1
    When cleargate upgrade --dry-run runs
    Then the first output line is a plan line
    And only "Upgrade notes" subsections follow, then a line naming CHANGELOG.md

  @rules
  Scenario: gate-checks.json whose only difference is its gate commands is unchanged (SC-7)
    Given an install whose gate-checks.json equals the package file with non-empty qa.test, qa.typecheck and arch.typecheck, as applyTestStack writes it
    And the install snapshot records the package sha for it
    When cleargate upgrade --dry-run runs
    Then no line names .cleargate/scripts/gate-checks.json with an action
    And it is counted in "[dry-run] <U> unchanged (not listed)"
    When cleargate upgrade --yes runs
    Then no "[always]" line names it, the summary counts it as unchanged, and the file is byte-identical afterwards

  @rules
  Scenario: gate-checks.json that changes without local edits is not called lost (SC-7)
    Given an install whose gate-checks.json has empty gate commands and a repo whose test stack detection fills them
    When cleargate upgrade --dry-run runs
    Then its line reads "→ updated, no local edits lost" and no line says "overwritten, local edits lost" for it
    When cleargate upgrade --yes runs
    Then a line reads "[always] overwritten: .cleargate/scripts/gate-checks.json" and no line says "local edits replaced" for it

  @rules
  Scenario: gate-checks.json with an edit outside the gate commands still warns (SC-7)
    Given an install whose gate-checks.json has a changed qa.debug_patterns list
    When cleargate upgrade --dry-run runs
    Then its line reads "→ overwritten, local edits lost"
    When cleargate upgrade --yes runs
    Then a line reads "[always] overwritten (local edits replaced): .cleargate/scripts/gate-checks.json"
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario |
| Integration tests | 1 | dry run and `--yes` on a fixture install at an older version |
| E2E / acceptance tests | 0 | the next field upgrade |

---

## Prior work

- [[CR-115]] (Approved, unscheduled): a grouped warning at the top naming user-modified files; keeps the per-file lines as they are, so it does not remove this noise.
- [[BUG-120]] (Completed, 0.30.1): no-TTY upgrade; its repro shows these lines without treating them as a defect.
- [[CR-132]] (Draft): keeps local edits by merging; this bug is only about what the output says.

## Context Source

**context_source:** field upgrade watch 2026-11-13, replayed on a scratch copy; Go repo report; code grounding at cli main `dbccc79`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.

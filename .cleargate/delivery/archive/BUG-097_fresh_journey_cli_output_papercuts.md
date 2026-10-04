---
bug_id: BUG-097
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-41"
carry_over: false
area: cli-output
status: "Completed"
severity: P3-Low
reporter: orchestrator (SPRINT-41 fresh-folder journey, 2026-09-26)
approved: true
approved_by: sandrinio
approved_at: 2026-09-26T09:30:00Z
context_source: fresh-folder journey reports/fresh-journey-smoke.md FJ-2..FJ-5, verified against cli main 35580b0 source; owner directive 'log every issue you find and fix them'
created_at: 2026-09-26T09:30:00Z
updated_at: 2026-09-26T09:30:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-26T09:14:41Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-097
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-26T09:14:41Z
  sessions: []
---

# BUG-097: Four CLI output defects a new user hits in the first session (gate -v, stamp --dry-run, wiki query, scaffold-lint)

### Open Questions

- **Question:** Should FJ-6 (`stamp_error: no ledger rows` on a freshly drafted item) be fixed here as well?
- **Recommended:** No. It is specified behaviour: `cleargate-protocol.md:495` reads "Missing ledger row → `draft_tokens:{…null…, stamp_error:"<reason>"}` — never fabricate", and `stamp-tokens.node.test.ts:326` pins it. Changing it is a protocol change, not a bug fix.
- **Human decision:** Recommended option taken (FJ-6 recorded as by-design in `reports/fresh-journey-smoke.md`). Owner directive 2026-09-26: "log every issue you find and fix them".

## 1. The Anomaly (Expected vs. Actual)
All four were found in a fresh `cleargate init --yes` project (`reports/fresh-journey-smoke.md`) and confirmed in cli main `35580b0` source.

1. **`gate check -v` on a pass (FJ-2).**
   - Expected: `--verbose` is documented as "show full expected-vs-actual detail per criterion", so it prints the per-criterion lines whatever the outcome.
   - Actual: the `if (opts.verbose)` block (`src/commands/gate.ts:322-327`) sits inside the failure `else`. A passing gate prints only the summary line.
2. **`stamp --dry-run` preview (FJ-3).**
   - Expected: nested frontmatter values render readably and count as unchanged when their content is equal.
   - Actual: `buildDiffPreview` (`src/commands/stamp.ts:44-55`) uses `String(value)`, so the preview prints `[object Object]`. It also compares with `===`, so two equal objects parsed separately always show as a `-`/`+` change.
3. **`wiki query` result lines (FJ-4).**
   - Expected: each match renders once, as `- [[ID]] — <excerpt>`.
   - Actual: the excerpt is the whole index line, which already starts with `- [[ID]]` (`src/commands/wiki-query.ts:78`, `:124`). The output reads `- [[EPIC-001]] — - [[EPIC-001]] (epic) — Draft — Task Storage`.
4. **`scaffold-lint` in a target repo (FJ-5).**
   - Expected: `scaffold-lint: clean` is printed once.
   - Actual: `runScaffoldLint`'s no-`cleargate-planning/` early return prints it (`src/commands/scaffold-lint.ts:125`), then `scaffoldLintHandler` prints it again whenever the exit code is 0 (`:62`). Every repo `cleargate init` installs into has no `cleargate-planning/`.

## 2. Reproduction Protocol
In a fresh dir: `git init`, then `node <cli>/dist/cli.js init --yes`, then `new epic probe`, and fill the epic in until `gate check` passes. Then:
1. `gate check <epic> -v` → a single `✅ … passed (N criteria)` line, with no `[pass]` lines.
2. `stamp <epic> --dry-run` → ` cached_gate_result: [object Object]`.
3. `wiki build`, then `wiki query "probe"` → a duplicated `- [[EPIC-001]] — - [[EPIC-001]]` prefix.
4. `scaffold-lint` → `scaffold-lint: clean` printed twice.

Edge conditions:
- a failing gate with `-v` keeps today's output: the failures first, then all per-criterion lines;
- an advisory gate;
- a `stamp --dry-run` on a key whose value really changed must still show `-`/`+`;
- a `wiki query` excerpt line that does not start with `- [[` must render unchanged;
- `scaffold-lint` with a real `cleargate-planning/` dir and findings must keep its exit code and output.

## 3. Evidence & Context
```
$ cleargate gate check EPIC-001_task_storage.md -v
Gate: epic.ready-for-decomposition (enforcing)
✅ epic.ready-for-decomposition passed (12 criteria)

$ cleargate stamp EPIC-001_task_storage.md --dry-run
 cached_gate_result: [object Object]
 draft_tokens: [object Object]

$ cleargate wiki query "storage"
- [[EPIC-001]] — - [[EPIC-001]] (epic) — Draft — Task Storage

$ cleargate scaffold-lint
scaffold-lint: clean
scaffold-lint: clean
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/commands/gate.ts` (the verbose block only)
- `cleargate-cli/src/commands/stamp.ts` (`buildDiffPreview` only)
- `cleargate-cli/src/commands/wiki-query.ts` (the result-line rendering only)
- `cleargate-cli/src/commands/scaffold-lint.ts` (print "clean" in exactly one place)
- the reds are appended to `test/commands/gate-unit.node.test.ts`, `test/commands/stamp.node.test.ts`, `test/wiki/query.node.test.ts` and `test/commands/scaffold-lint.node.test.ts`; no new test files.
Do not touch `scaffold/**`, `stamp-tokens.ts`, or the protocol. There are no payload changes.

## Task Breakdown
- [x] QA-Red: one failing test per defect, plus the preserved edge behaviours from §2
- [x] `gate.ts`: emit the per-criterion lines under `-v` on a pass too
- [x] Export buildDiffPreview from stamp.ts for unit tests
- [x] `stamp.ts`: render objects and arrays as compact JSON; compare them by serialized value
- [x] `wiki-query.ts`: drop a leading `- [[ID]]` (and its separator) from the excerpt before prefixing
- [x] `scaffold-lint.ts`: print "clean" once on every clean path
- [x] typecheck plus the four targeted test files

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- <each of the four targeted test files>` (solo, one at a time).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | `gate -v` on a pass and on a fail; `scaffold-lint` with and without `cleargate-planning/` |
| Interfaces | T | Four separate CLI commands |
| Data | T | `stamp` preview for scalar, nested object and array values; changed vs unchanged |
| Rules | T | A real change still shows as `-`/`+`; a failing gate's output order is kept |

```gherkin
Feature: New-user CLI output is correct

  @paths @interfaces
  Scenario: gate check -v prints per-criterion detail on a pass
    Given a work item that passes its readiness gate
    When `gate check <file> -v` runs
    Then one `[pass] <id>: <detail>` line is printed per criterion after the summary line

  @rules
  Scenario: gate check -v on a failure keeps its output
    Given a work item that fails one criterion
    When `gate check <file> -v` runs
    Then the ❌ failure lines come first, followed by every per-criterion line

  @data @rules
  Scenario Outline: stamp --dry-run renders values readably
    Given a frontmatter key holding <value> that is <state>
    When `stamp <file> --dry-run` runs
    Then the preview shows <rendering> and never `[object Object]`
    Examples:
      | value           | state     | rendering                  |
      | a nested object | unchanged | one ` ` line of JSON       |
      | a nested object | changed   | `-` and `+` lines of JSON  |
      | a scalar        | changed   | `-` and `+` scalar lines   |

  @interfaces
  Scenario: wiki query prints each match's wikilink once
    Given a wiki index line `- [[EPIC-001]] (epic) — Draft — Task Storage`
    When `wiki query "storage"` runs
    Then the result line is `- [[EPIC-001]] — (epic) — Draft — Task Storage` with exactly one `[[EPIC-001]]`

  @paths
  Scenario: scaffold-lint says clean once in a target repo
    Given a project with no cleargate-planning/ directory
    When `scaffold-lint` runs
    Then stdout contains `scaffold-lint: clean` exactly once and the exit code is 0
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | one per scenario (the outline counts once per example) |
| Integration tests | 0 | pure output formatting, driven through each handler's stdout seam |
| E2E / acceptance tests | 0 | re-checked by hand in the fresh-journey project at DevOps |

---

## Prior work

- [[BUG-067]] — `stamp` frontmatter corruption behind `<instructions>`; same command, different defect.
- [[BUG-047]] — the stamp cache deadlock; same area, different defect.
- none found for gate verbose output, the wiki query prefix, or scaffold-lint output.

## Context Source

**context_source:** `reports/fresh-journey-smoke.md` FJ-2..FJ-5, each confirmed against cli main `35580b0` source.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.

---
bug_id: BUG-130
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: doctor
status: Draft
severity: P3-Low
reporter: orchestrator (relayed from a Go target repo on 0.30.1, 2026-11-13; reproduced in a scratch dir)
approved: false
context_source: "Go target repo on 0.30.1 (doctor named an item whose gate had since passed), reproduced 2026-11-13 with one hook-log line and one passing item; code grounding at cli main dbccc79: src/commands/doctor.ts:221-260 (latest gate-check.log entry per file in 24h; gate!=0 printed as 'gate check failing'), scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh:9 (the only writer of hook-log/gate-check.log); src/commands/gate.ts never writes the log"
created_at: 2026-11-13T09:14:26.690Z
updated_at: 2026-11-13T09:14:26.690Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T09:18:48Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-130
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T09:18:47Z
  sessions: []
last_contradict_sha: "d8656e217f2a9c3a5da83a1b48ac6c49eb8d088ab5811110330cda3494da410a"
---

# BUG-130: doctor reports a gate failure the item no longer has

### Open Questions

- **Question:** How should doctor know a logged gate failure is stale?
- **Recommended:** Before printing `gate check failing`, read the file's own `cached_gate_result`. If it passes and its `last_gate_check` is newer than the log entry, drop the line; if the file is gone, drop it too. The frontmatter is written by every gate run (hook, `cleargate gate check`, push), so it is the current answer; the log only sees hook runs.
- **Human decision:** pending

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `cleargate doctor` prints `gate check failing at …` only for items whose readiness gate is failing now.

**Actual Behavior:** Only the PostToolUse hook (`stamp-and-gate.sh`) writes `hook-log/gate-check.log`; `cleargate gate check` does not. Doctor (`doctor.ts:221-260`) prints the latest log entry per file from the last 24 hours. So when a draft failed its gate on an edit (normal before approval) and was then checked again from the CLI and passed, the failing hook entry stays the latest one, and doctor keeps reporting it for up to 24 hours. In the field repo doctor named an item that `cleargate gate check` had just passed, while the brief said `0 failing gates`.

## 2. Reproduction Protocol
1. An item whose frontmatter has `cached_gate_result.pass: true` and a `last_gate_check` of now.
2. `hook-log/gate-check.log` with one line two hours old: `[<ts>] stamp=0 gate=1 ingest=0 file=<item path>`.
3. `cleargate doctor`.

Edge conditions:
- An item whose `cached_gate_result.pass` is still `false` keeps its `gate check failing` line.
- A log entry newer than the item's `last_gate_check` keeps its line.
- A `stamp` or `ingest` failure (`⚠ hook failure`) is unaffected.
- A logged file that no longer exists (moved to archive) is not reported.

## 3. Evidence & Context
Scratch reproduction on 0.30.1 (item passing, last checked now; one gate=1 hook entry 2 hours old):
```
gate check failing at 2026-11-13T07:18:18Z: gate=1 file=<repo>/.cleargate/delivery/pending-sync/STORY-002-03_keygen.md (a readiness result, not a hook failure)
```
`src/commands/doctor.ts:252-258`:
```ts
        } else if (entry.gate !== 0) {
          stdout(
            `gate check failing at ${entry.ts}: gate=${entry.gate} file=${entry.file} (a readiness result, not a hook failure)`
          );
```
`command grep -n 'gate-check.log' src/commands/gate.ts` → no match.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/commands/doctor.ts` (`runHookHealth`, :221-260).

**Do NOT modify:** the hook's log format (`stamp-and-gate.sh`); the `⚠ hook failure` path for stamp and ingest; BUG-124's latest-entry-per-file rule.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/doctor-stale-gate.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | one doctor path |
| Interfaces | F | doctor only (`--session-start` does not print the hook log) |
| Data | T | item passing, failing, re-failed after the check, gone |
| Rules | T | the item's current gate result wins over an older log entry |

```gherkin
Feature: doctor reports only gate failures that are current

  @data
  Scenario Outline: A logged gate failure is printed only while it is true
    Given a gate=1 hook-log entry at 10:00 for an item and the item's state is <state>
    When cleargate doctor runs
    Then "gate check failing" for that item is <printed>

    Examples:
      | state                                        | printed     |
      | cached_gate_result.pass true, checked 11:00  | not printed |
      | cached_gate_result.pass false, checked 11:00 | printed     |
      | cached_gate_result.pass true, checked 09:00  | printed     |
      | the file no longer exists                    | not printed |

  @rules
  Scenario: A stamp failure is still a hook failure
    Given a stamp=1 hook-log entry for an item whose gate passes
    When cleargate doctor runs
    Then a "⚠ hook failure" line names that item
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | one per example row plus the stamp rule |
| Integration tests | 0 | doctor reads two local files; the unit test drives the command |
| E2E / acceptance tests | 0 | the next field doctor run |

---

## Prior work

- [[BUG-124]] (Completed, 0.30.1): renamed gate exits to `gate check failing` and kept only the latest entry per file; did not consult the item's current gate result.
- [[CR-009]], [[CR-093]], [[BUG-105]], [[BUG-107]]: the hook log as a hook output; related, none covers doctor reading it as state.

## Context Source

**context_source:** Go target repo on 0.30.1, reproduced in a scratch dir; code grounding at cli main `dbccc79`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.

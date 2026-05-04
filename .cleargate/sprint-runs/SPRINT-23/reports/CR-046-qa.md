# QA Report: CR-046 run_script.sh wrapper + script-incidents

role: qa

**CR:** CR-046
**Dev commit:** 0540f9d
**Worktree:** `.worktrees/CR-046`
**QA date:** 2026-05-04

---

## TYPECHECK: pass

`cd cleargate-cli && npm run typecheck` — clean, 0 errors.

---

## TESTS: 31 passed, 0 failed, 0 skipped (full suite)

Full `npm test` (node:test only) run in `cleargate-cli` worktree. No regressions.

---

## ACCEPTANCE COVERAGE: 7 of 7 Gherkin scenarios have matching tests

| Criterion (CR-046 §4) | Result | Evidence |
|---|---|---|
| #1 `bash run_script.sh true` exits 0; no incident JSON | PASS | Scenario 1 — 3 tests pass |
| #2 `bash run_script.sh false` exits 1; JSON written | PASS | Scenario 2 + 3 — 6 tests pass |
| #3 Incident JSON validates against `script-incident.ts` schema | PASS | Scenario 4 — `isScriptIncident` type guard verified via duck-type; all 9 required fields present with correct types |
| #4 5 red test scenarios pass | PASS | Scenarios 1–5 + self-exemption sub-scenarios = 17 tests; all pass |
| #5 SKILL.md §C mandates wrapper | PASS | §C.3 QA-Red, §C.4 Developer, §C.5 QA-Verify, §C.6 Architect Pass all got wrapper-mandatory bullet; §C.11 Script Invocation Contract added |
| #6 reporter.md aggregates `## Script Incidents` | PASS | Workflow step 7 added; `## Script Invocation` section added to reporter.md |
| #7 Mirror parity empty | PASS | `diff canonical npm-payload` = empty for all 5 agent files + SKILL.md; `diff .cleargate/scripts/run_script.sh cleargate-planning/.cleargate/scripts/run_script.sh` = empty |

---

## SPOT-CHECKS

### Wrapper interface
- Arbitrary-cmd interface confirmed: `bash run_script.sh <command> [args...]` (line 5–7 of script, `"$@"` on line 87).
- Old script-name-relative interface removed entirely.

### Self-exemption
- `RUN_SCRIPT_ACTIVE=1` guard at lines 29–32 with `exec "$@"` passthrough — correct.
- Guard is set via `export RUN_SCRIPT_ACTIVE=1` at line 84, before the wrapped command runs.
- Test scenario verifies via source-text regex; passes.

### Incident JSON path
- Writes to `.cleargate/sprint-runs/<sprint-id>/.script-incidents/<ts>-<hash>.json`.
- Falls back to `_off-sprint/.script-incidents/` when `.active` absent.
- Hash uses `shasum -a 1` (portable on macOS bash 3.2).

### Schema fields (§0.5 Q4)
`ts`, `command`, `args`, `cwd`, `exit_code`, `stdout`, `stderr`, `agent_type`, `work_item_id` — all present in `script-incident.ts` interface and written by wrapper. `isScriptIncident()` type guard exported.

### Bash portability
- `bash -n` syntax check on macOS bash 3.2.57: clean.
- No `mapfile`/`readarray`/`${var,,}` bashisms found.
- Truncation uses `${content:0:$MAX_BYTES}` (char-index not byte-count — known ASCII-safe limitation per M1 plan §Risks; acceptable for v1).

### Agent prompts — 5 of 5
All 5 agents (architect, developer, qa, devops, reporter) have verbatim-identical `## Script Invocation` section body.

### Mirror parity
- `.cleargate/scripts/run_script.sh` ↔ `cleargate-planning/.cleargate/scripts/run_script.sh`: byte-identical.
- All 5 agent `.md` files: canonical ↔ npm-payload byte-identical.
- `SKILL.md`: canonical ↔ npm-payload byte-identical.

---

## MISSING: none

---

## REGRESSIONS: none

Full 31-test suite passes; pre-existing tests unaffected.

---

## VERDICT: ship it

All 7 acceptance criteria verified. Wrapper rewrites the old script-name-relative interface to arbitrary-cmd. Self-exemption guard correct. Schema matches §0.5 Q4 exactly. 5 agent prompts identical. SKILL.md §C.3–C.6 + §C.11 all updated. Mirror parity empty across all surfaces. 31 tests pass, 0 fail, 0 skip.

---

QA: PASS

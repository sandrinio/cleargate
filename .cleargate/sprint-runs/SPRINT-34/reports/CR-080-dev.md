# CR-080 Developer Report

**Story:** CR-080
**Sprint:** SPRINT-34
**Lane:** fast (no QA-Red pre-exists)

## Summary

Fixed two isolated shell-wrapper correctness bugs (F5 + F8):

**F5** — Added `WORKTREE="$(cd "$WORKTREE" && pwd)"` immediately after the `[[ ! -d "$WORKTREE" ]]` validation check in `pre_gate_runner.sh`. This single-point normalization ensures REPORT_FILE, `cd "$WORKTREE"`, `git -C "$WORKTREE"`, and `grep` downstream all receive an absolute path regardless of whether the caller passed a relative or absolute worktree argument. Fixes the doubled-path ENOENT on relative input.

**F8** — Added explicit `export` for the five documented ClearGate config vars (`CLEARGATE_STATE_FILE`, `ORCHESTRATOR_PROJECT_DIR`, `CLAUDE_PROJECT_DIR`, `AGENT_TYPE`, `WORK_ITEM_ID`) at both the normal invocation path (before `"$@"`) and the self-exemption fast path (`exec "$@"`) in `run_script.sh`. Updated the header `Env vars read:` block to document `CLEARGATE_STATE_FILE`, `CLAUDE_PROJECT_DIR`, and `RUN_SCRIPT_ENV_ALLOWLIST`. The allowlist opt-in is implemented as a scaffolded loop (sets `_allowed_env` var) but does NOT strip the environment — pass-through is the default as required.

## Files Changed

- `.cleargate/scripts/pre_gate_runner.sh` — F5 realpath-at-entry
- `.cleargate/scripts/run_script.sh` — F8 env pass-through + header doc
- `cleargate-planning/.cleargate/scripts/pre_gate_runner.sh` — canonical mirror (byte-identical)
- `cleargate-planning/.cleargate/scripts/run_script.sh` — canonical mirror (byte-identical)
- `.cleargate/scripts/test/cr080_wrapper.test.sh` — new test harness (4 assertions)
- `cleargate-planning/.cleargate/scripts/test/cr080_wrapper.test.sh` — canonical mirror (byte-identical)

## Test Results

All 4 assertions pass:
- PASS: F5-1: relative-worktree-path — report written at correct absolute location
- PASS: F5-2: absolute-worktree-path — report written at correct location
- PASS: F8-3: CLEARGATE_STATE_FILE forwarded to child
- PASS: F8-4: allowlist opt-in — full pass-through preserved when RUN_SCRIPT_ENV_ALLOWLIST set

Regression checks:
- `bash .cleargate/scripts/pre_gate_runner.sh arch "$PWD" sprint/S-34` — exit 0, 3 passed
- `bash .cleargate/scripts/run_script.sh node -e 'process.stdout.write("wrapper-ok")'` — prints "wrapper-ok"

## Deviations from Plan

None. CR §3 sandbox followed exactly.

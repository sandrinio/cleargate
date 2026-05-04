# CR-054 QA-Red Report

**Sprint:** SPRINT-25
**CR:** CR-054 — run_script.sh UTF-8 Byte-Correct Truncation
**Gate:** QA-Red (write failing test; no implementation)
**Date:** 2026-05-04

## Status

QA-RED: WRITTEN

## Test File

Path: `.worktrees/CR-054/cleargate-cli/test/scripts/run-script-utf8-truncation.red.node.test.ts`

## Test Run Result (baseline)

```
tests 3
pass  2
fail  1
```

Failing test (correct — this is the Red gate):
```
✖ incident.stderr byte-length ≤ MAX_STREAM_BYTES + TRUNCATION_SUFFIX bytes + 4 slack
  AssertionError: Buffer.byteLength(incident.stderr) = 8207 exceeds allowed max 4115
  (MAX_STREAM_BYTES=4096 + suffix=15 + slack=4).
  BASELINE BUG: bash ${content:0:N} truncates by char-index (4096 chars × 2 bytes = 8192 bytes),
  not byte-count. Fix: use head -c $MAX_BYTES.
```

## Scenario Coverage

| Scenario | Test | Baseline | Purpose |
|---|---|---|---|
| 1a — UTF-8 byte-count assertion | `incident.stderr byte-length ≤ MAX_STREAM_BYTES + suffix + 4` | FAIL (8207 > 4115) | Primary RED gate — char-vs-byte regression |
| 1b — JSON parse round-trip | `incident JSON raw file is valid JSON` | PASS | Acceptance #4 — valid even on buggy baseline (Node JSON.stringify escapes partial UTF-8) |
| 2 — ASCII parity | `incident.stderr byte-length ≤ MAX_STREAM_BYTES + suffix + 4 (ASCII input)` | PASS | Regression guard — ASCII must work on both baseline and fixed |

## Baseline Fail Mechanics

- Payload: `process.stderr.write('р'.repeat(5000))` → 5000 cyrillic chars × 2 bytes = **10000 bytes** to stderr.
- Current `_truncate_stream` at `run_script.sh:113-124` runs `${content:0:$MAX_BYTES}` where `MAX_BYTES=4096`.
- Bash `${var:0:N}` is char-index, not byte-count. 4096 chars × 2 bytes/char = **8192 bytes**.
- With `TRUNCATION_SUFFIX` (15 bytes): total = **8207 bytes**.
- Assertion limit: `4096 + 15 + 4 = 4115`.
- `8207 > 4115` → FAIL RED.

## Typecheck

PASS (tsc --noEmit exits 0)

## First-Attempt Error (corrected during QA-Red)

First version used `sh -c "cat utf8-payload.txt >&2; exit 1"` with a wrapScript fixture file.
The file was placed at `tmpdir/utf8-payload.txt` but `sh` ran with repo-root as CWD → `cat` emitted
"No such file or directory" (~30 bytes) instead of the 10000-byte payload → byte assertion passed
(30 < 4115) → test was incorrectly GREEN on baseline.

Fix: switched to `node -e "process.stderr.write('р'.repeat(5000)); process.exit(1)"` — embeds
payload generation in the command, no file path dependency.

## Notes for Developer

- Acceptance #3 assertion: `Buffer.byteLength(incident.stderr, 'utf8') ≤ 4096 + 15 + 4 = 4115`
- Fix target: `.cleargate/scripts/run_script.sh` line 117-122 `_truncate_stream()` — replace `${content:0:$MAX_BYTES}` with `head -c $MAX_BYTES "$file"` (and adjust suffix condition to use `wc -c` on source file).
- Mirror parity required: `cleargate-planning/.cleargate/scripts/run_script.sh` same diff, same commit.
- MANIFEST.json regen required after canonical mirror edit (per M1 plan bounce risks).

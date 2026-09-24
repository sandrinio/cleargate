# BUG-089 QA-Red — resealed after TPV wiring correction

role: qa

## Sealed red surface

- `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/BUG-089/meta/cleargate-cli/test/hooks/hook-signal.red.node.test.ts`
- SHA-256: `92d8fa3e47f6e6811a88759f307000b0ce0be65d06ed1b3acc4427e4efa637eb`

The amended test uses only dynamically created fixtures below the isolated
`CG_TEST/sprint-41-D2QMC1/fixtures/BUG-089` root. It preserves Node through a
fixture-bin symlink while excluding `cleargate`, disables `npx`, explicitly
selects planning enforce mode for blocking cases, clears inherited advisory and
skip variables, and creates a real pending-flashcard report for Task coverage.
No production file was read, edited, or changed by QA-Red.

## Baseline command and result

```text
ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/BUG-089/meta \
  bash /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh \
  npm run test:file -- test/hooks/hook-signal.red.node.test.ts
```

Targeted command exit: `1`.

```text
tests 12
pass  0
fail  12
skipped 0
```

Expected baseline causes: the resolver module is absent; each actual matching
PreToolUse settings command lacks explicit `--host claude`; and consequently
the registered-command wrapper cases cannot yet reach the shared resolver.
Before the permanent-red run, the same copied-hook fixture was independently
exercised against the existing registered edit command (without the planned
host assertion): it reached the hook and reproduced fail-open exit `1`, not an
absent-file exit. This is baseline diagnostic evidence only, not a sealed test.
The test is deliberately strict: resolver `missing`, `failed`, and unexpected
statuses must produce exact exit `2` for both edit and pending-flashcard Task
branches. Warn, active-sprint-bypass, and explicit flashcard-skip controls are
also retained as required allowed-zero tests once the commands are wired.

## Required implementation outcome

Implement `resolveHookSignal({host:'claude', decision})` with block `2` and
allow `0`; reject invalid host/decision; wire both registered PreToolUse command
entries with explicit Claude selection; and convert missing/failed/unexpected
resolver outcomes to exact exit `2` without changing default warn semantics or
the allowed bypass/skip controls.

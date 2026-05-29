# STORY-068-01 Developer Report

**Story:** STORY-068-01 — Drop `shell: true` from `cleargate init` child_process spawns + add grep regression guard
**Sprint:** SPRINT-30
**Branch:** story/STORY-068-01
**Commit:** 3a151a89
**Date:** 2026-05-19

## Summary

Implemented the single-site refactor at `cleargate-cli/src/commands/init.ts:452`: swapped `spawnSyncFn('command', ['-v', 'cleargate'], { shell: true, ... })` to `spawnSyncFn('which', ['cleargate'], { encoding: 'utf8', timeout: 3000 })` per the dispatch override (M1 §6 Open Decision 2). The `command` builtin cannot be invoked without `shell: true`; `which` is a real binary on macOS/Linux. Added a one-line Windows-not-supported comment above the call.

Added trust-boundary comment to `gate-run.ts:80` (no code change). Added `check:no-shell-true-in-init` npm script to `package.json`. Renamed `init-no-dep0190.red.node.test.ts` → `init-no-dep0190.node.test.ts` (QA-Red file deleted per dispatch instruction and flashcard 2026-05-19 #qa-red).

## Files Changed

- `cleargate-cli/src/commands/init.ts` — drop shell:true + swap command to which
- `cleargate-cli/src/commands/gate-run.ts` — add trust-boundary comment (no code change)
- `cleargate-cli/package.json` — add check:no-shell-true-in-init script
- `cleargate-cli/test/commands/init-no-dep0190.node.test.ts` — new (renamed from .red.)
- `cleargate-cli/test/commands/init-no-dep0190.red.node.test.ts` — deleted

## Test Results

- New tests: 2 passed, 0 failed (Scenario 1: clean transcript, Scenario 2: grep-gate)
- Full suite: pre-existing failures in unrelated tests (close_sprint pipeline, wiki page, version checks) — these exist on the sprint/S-30 baseline before this story's changes

## Typecheck: pass

## Script Incidents

None.

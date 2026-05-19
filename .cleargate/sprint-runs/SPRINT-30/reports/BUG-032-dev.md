---
story_id: BUG-032
sprint_id: SPRINT-30
role: developer
commit_sha: 19b9e6a7
typecheck: pass
tests_pass: 11
tests_fail: 0
date: 2026-05-19
---

# BUG-032 Developer Report

## Summary

Implemented the same-sprint story backsync step missing from `close_sprint.mjs`. Root cause (confirmed by QA-Red): neither `reconcileCrossSprintOrphans` (skips active sprint via `.active` sentinel) nor any other close pipeline step was flipping same-sprint story frontmatter at close time. Both Case A (Draft, approved:false) and Case B (Approved, approved:true) share this single root cause.

## Changes

1. **`cleargate-cli/src/lib/lifecycle-reconcile.ts`** — Added `reconcileCurrentSprintStories(opts)` export. Iterates over state.json stories, uses existing `findArtifactFile()` for ID→file lookup (handles any ID format including test fixtures like `STORY-TEST-01`), atomically sets `status: "Completed"` + `approved: true` in frontmatter, and moves file from pending-sync to archive. Idempotent: already-terminal files are skipped.

2. **`.cleargate/scripts/close_sprint.mjs`** — Added Step 2.6d (same-sprint story backsync) between Step 2.6c (parent rollup) and Step 2.7 (worktree check). Runs unconditionally — no `CLEARGATE_SKIP_*` seam, pure FS ops, no git calls. Mirror updated at `cleargate-planning/.cleargate/scripts/close_sprint.mjs`.

3. **`cleargate-cli/src/commands/sprint.ts`** — Added `--retroactive` to `reconcileLifecycleCliHandler` opts. When set, calls `reconcileCurrentSprintStories({retroactive:true})` which scans ALL Completed sprints and flips drifted Done stories (pdf_processor SPRINT-01 use case).

4. **`cleargate-cli/src/cli.ts`** — Registered `--retroactive` option on the `reconcile-lifecycle` commander subcommand.

5. **`cleargate-cli/test/lib/close-sprint-backsync.node.test.ts`** — Renamed from `.red.` suffix. All 11 tests pass.

## Key Design Decision

`findArtifactFile(deliveryRoot, id)` is used for ID lookup rather than the prefix-split pattern used in `reconcileCrossSprintOrphans`. This is necessary because `STORY-TEST-01`.split('_')[0]` returns `'STORY-TEST'` which fails `idType()`. The `findArtifactFile()` approach correctly searches for `STORY-TEST-01_*.md` in pending-sync and handles all real-world + fixture ID formats.

## Idempotence Verified

Running close_sprint twice: first run flips and archives; second run finds file already in archive + terminal status, skips cleanly with "1 already terminal" message.

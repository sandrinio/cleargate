# STORY-014-08 Dev Report

**Story:** STORY-014-08 — sprint archive wrapper
**Commit:** 5a5a314
**Branch:** story/STORY-014-08

## Summary

Added `cleargate sprint archive <sprint-id> [--dry-run]` subcommand to the CLI.

## Files Changed

- `cleargate-cli/src/commands/sprint.ts` — added `sprintArchiveHandler` + private helpers (`parseFileFrontmatter`, `serializeFileContent`, `atomicWriteStr`, `deriveSprintBranchForArchive`, `stampFile`, `storyKeysForEpic`). Added `import * as fs` and `import yaml from 'js-yaml'`.
- `cleargate-cli/src/cli.ts` — imported `sprintArchiveHandler`; wired `sprint archive <sprint-id> [--dry-run]` subcommand after `sprint close`.
- `cleargate-cli/test/commands/sprint-archive.test.ts` — new file with 15 tests covering all 4 Gherkin scenarios + orphan scenario.

## Test Results

- 15 new tests: all pass
- Pre-existing failures (unchanged): snapshot-drift S-1, bootstrap-root.test.ts file error
- Total: 825 passing (baseline was 810 before this story)
- Typecheck: clean

## Deviations from Plan

None. Implemented exactly as specified in the M2.md blueprint. Used tmpdir fixture approach with real filesystem (no mocks) as required. Stash verification confirmed tests fail without implementation.

## Flashcards Recorded

None — no surprises. The `js-yaml` CORE_SCHEMA frontmatter pattern was already established; the `spawnFn` seam pattern matched `story.ts` exactly.

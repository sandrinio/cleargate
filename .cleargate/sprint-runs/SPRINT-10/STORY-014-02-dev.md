---
story_id: "STORY-014-02"
sprint_id: "SPRINT-10"
role: "developer"
status: "done"
commit: "ed1daf4"
branch: "story/STORY-014-02"
merged_to: "sprint/SPRINT-10"
qa_bounces: "0"
arch_bounces: "0"
---

# Dev Report: STORY-014-02 Gate-2 Story-File Assertion

## Summary

Implemented the Gate-2 story-file assertion for v2 sprints. All 4 Gherkin scenarios pass; existing 8 state-script tests unaffected.

## Files Changed

- **NEW** `.cleargate/scripts/assert_story_files.mjs` — standalone CLI; parses `§1 Consolidated Deliverables` for `STORY-\d+-\d+` IDs, checks `pending-sync/` via `fs.readdirSync` + prefix match. Exit 0 = all present; exit 1 = missing list on stderr as JSON + human-readable line.
- **MOD** `.cleargate/scripts/init_sprint.mjs` — reads `execution_mode` from sprint-file frontmatter (single-field regex, no YAML parser); under v2 spawns `assert_story_files.mjs` and blocks state.json write on failure; under v1 warns only.
- **NEW** `.cleargate/scripts/test/test_assert_story_files.sh` — 4 scenarios, 15 assertions.
- **MOD** `.cleargate/knowledge/cleargate-protocol.md` §2 Gate 2 — added story-file assertion bullet.
- All 4 surfaces mirrored to `cleargate-planning/`.

## Test Results

- New tests: 15 passed, 0 failed
- Existing state-scripts tests: 8 passed, 0 failed
- Stash-verify: 7 scenarios fail without the code change (confirmed).

## Deviations from Plan

- Story-ID regex `STORY-\d+-\d+` requires digit-only parts. Test fixtures must use IDs like `STORY-099-01`, not `STORY-SC1-01`. Plan did not mention this constraint; test suite updated accordingly.
- `runAssertStoryFiles` in `init_sprint.mjs` uses `__dirname` (actual scripts dir) rather than `CLEARGATE_REPO_ROOT` to locate `assert_story_files.mjs`, so test isolation tmpdir doesn't need to contain the scripts.
- Section extraction uses `content.split(/^(?=## )/m)` + `.find()` rather than a regex with `\z` end-anchor (JS doesn't support `\z`).

## Flashcard

Recorded: `STORY-\d+-\d+` regex requires digit-only parts — test fixture IDs with alpha segments (e.g. STORY-SC1-01) produce zero matches silently.

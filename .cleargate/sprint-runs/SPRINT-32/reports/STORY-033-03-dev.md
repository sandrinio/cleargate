# STORY-033-03 Developer Report

**Story:** STORY-033-03 Architect Planning Workflow (SDR fan-out)
**Sprint:** SPRINT-32
**Commit:** 8c833e43
**Branch:** story/STORY-033-03

## Summary

Implemented all deliverables per M2 blueprint:

1. `.cleargate/scripts/collision_surface.sh` — standalone fork of `file_surface_diff.sh`'s `parse_surface_paths()`. Fixes the single-column bug (original `val=cols[2]` → fork iterates all columns). Uses bash 3.2-portable `awk '!seen[$0]++'` dedup (no `declare -A` or `mapfile`). Path-shape guard requires `/` in token (conservative bias to avoid label-cell over-match).

2. `.claude/agents/architect-reader.md` + `.claude/agents/architect-synth.md` — new SDR fan-out agents. Reader returns the pinned digest schema. Synth documents the five-clause predicate, tiny-sprint floor (N≤2), fail-safe-serialize rule, and `waves.json` contract.

3. `db_write_set: []` advisory field added to `.cleargate/templates/story.md` frontmatter.

4. Non-destructive SDR planning-workflow pointer block added to `cleargate-planning/.claude/agents/architect.md` after the `**Output:**` paragraph in `## Sprint Design Review`.

5. All canonical mirrors synced: `cleargate-planning/.claude/agents/`, `cleargate-planning/.cleargate/scripts/collision_surface.sh`, `cleargate-planning/.cleargate/templates/story.md`, `npm run prebuild` completed.

## Deviations from Plan

None. Blueprint followed exactly.

## Pre-existing Test Failures

Two test failures exist in the suite before this story and are unrelated to STORY-033-03:
- `test/wiki/ingest.node.test.ts` — `ReferenceError: require is not defined` (ESM issue in pre-existing test)
- `test/wiki/lint-index-budget.node.test.ts` — assertion failure (pre-existing)

Both were failing on the QA-Red commit before this developer commit.

## Key Implementation Notes

- **bash 3.2 portability:** macOS ships bash 3.2 which lacks `declare -A` (associative arrays) and `mapfile`. Used `awk '!seen[$0]++'` for dedup. FLASHCARD-worthy.
- **Column-1 over-match mitigation:** Tightened path-shape guard to require `/` (not just `.` or `/`) to avoid emitting label cells like "Primary File (new)" from column 1.
- **Live `.claude/` is gitignored:** Tests pass because they check the physical filesystem path (`.worktrees/STORY-033-03/.claude/agents/`), not whether files are git-tracked.

## Files Changed

- `.cleargate/scripts/collision_surface.sh` (created)
- `.cleargate/templates/story.md` (modified — db_write_set field)
- `cleargate-planning/.claude/agents/architect.md` (modified — SDR pointer)
- `cleargate-planning/.claude/agents/architect-reader.md` (created)
- `cleargate-planning/.claude/agents/architect-synth.md` (created)
- `cleargate-planning/.cleargate/scripts/collision_surface.sh` (created)
- `cleargate-planning/.cleargate/templates/story.md` (modified)
- `cleargate-planning/MANIFEST.json` (modified — prebuild)

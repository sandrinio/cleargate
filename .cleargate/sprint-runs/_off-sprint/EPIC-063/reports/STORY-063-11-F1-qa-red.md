# STORY-063-11-F1 QA-Red (role: qa, Mode: RED)

QA-RED: WRITTEN
BASELINE_FAIL: 15 reds fail, 4 guards pass (19 tests), against c7e371f

## Files (worktree wt11f1, uncommitted)
- test/wiki/session-brief-f1.red.node.test.ts (F1-1, F1-2, F1-3; 14 tests: 11 red, 3 guard)
- test/docs/session-brief-f1-docs.red.node.test.ts (F1-4; 5 tests: 4 red, 1 guard)
Both import helpers from test/wiki/_brief-support.ts and test/helpers/scaffold-roots.js. No src/ edits.

## Reds and failure reasons
- F1-1 (5 red): self-referencing sprint file is counted. S2 shape prints `6/6` not `5/5`; non-green self-ref gives `2/4` not `2/3`; self-only gives `1/1` not `0/0`; another sprint file naming SPRINT-9 gives `2/2` not `1/1`; two self-ref sprints give `3/3; 2/4` not `2/2; 1/3`.
- F1-2 (3 red): title `;` kept: `BUG-9 A; BUG-9 b` not `BUG-9 A, BUG-9 b`; `BUG-8 X; Y; BUG-9 Z` not `BUG-8 X, Y; BUG-9 Z`; `a;b c; d ...` still has `;` (also pins 10-word cut after replace).
- F1-3 (3 red): terminal plan still returns `activeId: 'SPRINT-9'` (Completed, and each of Done/Abandoned/Closed/Resolved); end to end the Planned line prints `+1 more` instead of unchanged `+2 more`. Line text is pinned exact: `Active sprint: SPRINT-9 — Ship the brief — Completed/closed — 1 stories: Done=1`.
- F1-4 (4 red): README still says "derived entirely"; arch sentence absent (scaffold/core/.cleargate/README.md:74, whitespace-normalised slice); `src/commands/wiki-ingest.ts` lines 822, 831, 839 say "all five"; fewer than 3 "all six".

## Guards (pass at baseline, must stay green)
- F1-1: non-sprint members (CR, BUG) of every bucket still count (1/2).
- F1-2: a title without `;` unchanged.
- F1-3: non-terminal active plan still gets N-1 (`+2` -> `+1`, G-M2-63).
- F1-4: README "wiki is a cache" paragraph still names brief.md and index.md.

## Shape changes for the Dev (pre-existing 11 reds + handlers/docs files)
None break. Checked: no existing sprintDoc/richDocs sprint carries `sprint_cleargate_id` (test/wiki/_brief-support.ts richDocs, session-brief.red.node.test.ts:148-168 and 373-378, session-brief-handlers.red.node.test.ts:69,149-181), so every existing `n/m` pin (e.g. `SPRINT-9 — 2/5 🟢`, `SPRINT-42 — 5/5 🟢`, `SPRINT-10 — 1/3 🟢`) is unchanged by F1-1. No existing P0/P1 title contains `;`. Existing tests pass an `activeId` directly to renderLiveBrief or use a non-terminal plan, so F1-3 leaves them alone. No test pins "derived entirely" or "all five" elsewhere (grep of test/). Note `all five` in src/commands/sprint.ts is unrelated (preflight checks); do not change it.

## Ambiguity defaults
- F1-1 treats "is a sprint" as the item's bucket being sprints (a sprint file naming another sprint is also excluded, per G-M2-66 "id does not start SPRINT-").
- F1-2: `;` replaced anywhere in the title (with or without following space); cut applies after replacement.
- F1-3: pinned exact line and `activeId: null` for all TERMINAL_STATUSES; `line` content untouched.
- F1-4: comment pin is "no 'all five' in wiki-ingest.ts and at least 3 'all six'" (exact comment wording left to the Dev).

## Run
`export TMPDIR=$(mktemp -d /tmp/qr11f1.XXXX); npx tsx --test test/wiki/session-brief-f1.red.node.test.ts test/docs/session-brief-f1-docs.red.node.test.ts` -> pass 4, fail 15.

flashcards_flagged: []

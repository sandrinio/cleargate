# STORY-063-11-F2 QA-Red (role: qa)

QA-RED: WRITTEN
RED_TESTS (worktree wt11f2, branch story/STORY-063-11-F2, uncommitted):
- test/wiki/session-brief-f2.red.node.test.ts (16 tests: 9 provablyNoTags, 5 equivalence, 2 error mapping)
- test/commands/doctor-session-brief-f2.red.node.test.ts (4 tests: 2 reds, 2 guards)
BASELINE_FAIL: 18 red, 2 guards green (20 tests); runtime ~8 s wall at baseline (two reds burn ~2.5 s each; green run is faster).

## Failure reasons at 5c5a183
- 9 provablyNoTags + 5 equivalence + 2 error-mapping: `api.provablyNoTags` / `api.startReleaseLookup is not a function` (missing exports; namespace import so each test fails individually).
- Zero-spawn through doctor: 2 describe invocations logged (notags and tagged), expected 1.
- Start order: shim log empty at runSessionStart's first stdout line (lookup is only spawned in printSessionBrief).
- Guards (hold at baseline, must stay green): not-built path and no-.cleargate path log zero git invocations.

## Coverage vs the ask
1 provablyNoTags: all 9 listed cases. 2 equivalence on real repos: tagged, untagged, no commits, no .git, packed-only tag, .git-file worktree, `[]` fallback, 100 B cap (150-char repo name). 3 ENOENT (PATH = empty dir) and timeout (shim `exec sleep 5`, ~1 s). 4 logging shim, exactly one describe for `tagged`, line `Release: notags no tags; tagged: v1.0.0 + 2 commits`. 5 start order. 6 guards.

## Ambiguity defaults
- Item 5 determinism: the stdout callback's first call (the membership banner, emitted before any other work) spins synchronously up to 1.5 s until the shim log contains a `describe` line. A spawned child keeps running while the parent is blocked, so if the lookup was started first the log appears in ms; otherwise the assertion fails. No wall-time assertion. Cost on a red run: 1.5 s; on green: a few ms. Driven through runSessionStart directly (same as `runStart` helper), not doctorHandler.
- Shim is installed by prepending to in-process `process.env.PATH` (restored in afterEach); child spawns inherit it. Fixtures are built before the override.
- Real-git fixtures reuse `makeGitRepo`/`git` from test/wiki/_brief-support.ts (GIT_CONFIG_GLOBAL=/dev/null, NOSYSTEM, author env); worktree/pack-refs go through the same `git` helper.
- provablyNoTags is tested with synthetic `.git` dirs (fake refs, no real git), per the ask.
- "Zero invocations" guards count any git call, not only describe. If doctor later spawns git for another reason, that guard needs narrowing to describe.
- Timeout case relies on GIT_TIMEOUT_MS = 1000 (< the 5 s sleep); if raised above 5 s the shim sleep must grow.

flashcards_flagged:
  - "2026-11-12 · #qa-red #test-harness · prove 'spawned before X' by spin-waiting in the first stdout callback for a PATH-shim log line, not by timing"

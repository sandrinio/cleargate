# STORY-062-02 QA-Red
QA-RED: WRITTEN
Files (worktree .worktrees/STORY-062-02/cleargate-cli/test/dashboard/):
- backlog.red.node.test.ts: 18 tests, 18 fail (collector over fixture tree, GET /data, GET / DATA blob)
- backlog-tab.red.node.test.ts: 13 tests, 13 fail (SSR frame, grouping, badges, filters, epic expansion, diagnostics; node:vm harness)
Typecheck clean. Failures are "not yet implemented" assertions (C2 stub returns empty lists; panel is placeholder), not wiring errors.
Gherkin: outline rows x4, epics expand (collector + view), filters (type+search, no fetch, poll-stable), malformed file (collector + /data), sprint exclusion.
Notes: backlog.node.test.ts left free for Developer. Harness asserts containers/behaviour only, never stub copy; vm values compared after JSON round-trip.

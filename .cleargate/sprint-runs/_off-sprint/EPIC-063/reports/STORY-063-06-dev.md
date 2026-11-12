# STORY-063-06 dev report
role: developer
STORY: STORY-063-06
STATUS: done
COMMIT: d9e401e (cleargate-cli, branch story/STORY-063-06)
TYPECHECK: pass
TESTS: full npm test 4090 total, 4088 pass, 0 fail, 2 skipped (gated budget test runs only under CLEARGATE_PERF=1; it passed separately)
PERF (20 runs, /usr/bin/time -p, outer repo, p95 = 19th of 20, CLEARGATE_NO_UPDATE_CHECK=1): base 360 ms, after 390 ms, delta +30 ms (limit 100). Load averages during measurement 7.68/8.64/8.21 before, 8.18/8.70/8.23 after (busy machine). Gated test (a), synthetic 150-draft tree: pass. Alarm prints 0 lines on the outer repo (matches "0 candidates today"). Checkout dist mtimes verified unchanged.
FILES_CHANGED: cleargate-cli/src/lib/wiki/unchecked-drafts.ts (new), cleargate-cli/src/commands/doctor.ts, cleargate-cli/test/commands/doctor-contradiction-alarm.red.integration.node.test.ts (TPV amends A1-A3 only)
NOTES: loadWikiConfig throw is caught -> buckets unset, still alarming; runSessionStart call is try/catch wrapped, outcome untouched, uses cli?.now?.() ?? new Date(). Alarm emitted between the drift line and the BUG-036 stale-sentinel block.
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }
  - { r_id: "R2", covered: true, deferred: false, clarified: false }
  - { r_id: "R3", covered: true, deferred: false, clarified: false }
  - { r_id: "R4", covered: true, deferred: false, clarified: false }
  - { r_id: "R5", covered: true, deferred: false, clarified: false }
  - { r_id: "R6", covered: true, deferred: false, clarified: false }
plan_deviations:
  - { what: "scratch-build recipe (git archive + tsup in scratch) instead of plan's tsup --out-dir", why: "TPV section 7 / decision 15: --out-dir overwrites checkout dist/MANIFEST.json", orchestrator_confirmed: true }
  - { what: "applied TPV amends A1-A3 to the gated integration test", why: "decision 15 explicit authorization", orchestrator_confirmed: true }
adjacent_files:
  - "cleargate-cli/src/commands/doctor.ts"
flashcards_flagged:
  - "2026-11-12 · #doctor #test-harness · CLEARGATE_HOME is read by no src module; subprocess doctor runs need CLEARGATE_NO_UPDATE_CHECK=1 or they hit ~/.cleargate + npm."
  - "2026-11-12 · #doctor #perf · doctor --session-start exits 1 on this repo (gate-failed pending-sync items); perf harnesses compare exit across sides, never pin 0."

# STORY-063-05 QA-Red
QA-RED: WRITTEN
RED_TESTS: cleargate-cli/test/wiki/active-sprint-sentinel.red.node.test.ts (17 tests, 17 fail at baseline)
Also: test/wiki/build.node.test.ts Scenario 13 retitled (assertions untouched; 81/81 pass).
Coverage: Gherkin 1 (absent+empty), 2, 3, 4, 5 (ingest vs build), 6, 7; R5 updated_at/number fallback; missing state.json; C5.1 compile signature; G16 readSprintRunState (ok/missing/invalid JSON/non-object/null) and parseSprintPlanTable.
Not tested: G14 staleness; dashboard (test/dashboard unchanged).
Fixtures: temp repos via buildFixture, real wikiBuildHandler/wikiIngestHandler with templateDir; exit seam tolerates exit(0).
Note for Dev: build's active-sprint page must say "no active sprint" (case-insensitive); stale warning line must contain "stale" and the sentinel id exactly once; per-item lines `STORY-ID ... — <state>`.

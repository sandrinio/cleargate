# STORY-066-11 Developer report (role: developer)

Commit: see story/STORY-066-11 tip. Typecheck pass. prebuild pass (both scripts in payload).
Tests: wave-runner.red U1,U2,U4,U5,U6,U7 pass; I2 pass; I1 integration-gated (fails at --validate, null qaSha, as M3 predicts).
U3 FAILS: spec mismatch in the sealed test. Its last sub-case (TPV BLOCKED-WIRING-GAP -> "QA-Red STORY-L pass 2") runs a standard item with the DEFAULT red result (scan_exit 0, flags []). By C-4 and the C1 table, architect-tpv is scan-flagged, so it is never dispatched there; the first sub-case in the same test requires that exact red result to yield 3 calls. The two cannot both hold. Fix needed in QA-Red: give the gap sub-case a flagged seal (scan_exit 1), as the M3 U3 row intends ("A standard seal with scan_exit 1 ... One TPV BLOCKED-WIRING-GAP leads to pass 2"). Runner TPV-gap routing (archBounces++, rewind to red) is implemented and was checked only by reading, not by that test.
Deviations: none from plan. Local normaliseLane in the builder (replace by the C1 import at integration). Wave-item one-id check lives in main(), not buildWaveArgs, because U4 uses ids like STORY-R.

## Integration

- Merged cli main 4d1fbb2 into story/STORY-066-11 (no conflicts): 50035c4. gen:codex no diff; prebuild ok.
- stagesFor('fast'|'standard'|'runtime') byte-equal to C1 47901fe. Local normaliseLane removed from wave_runner_args.mjs; now imported from segment_stages.mjs.
- Adapters: seal_red.mjs stdout has sealed_sha, scan_exit, flags (ok). qa.md has QA: PASS | PASS-PENDING-SMOKE | FAIL and DEFECT_IN: none | code | red-test | spec (ok). update_state.mjs --defect-in accepts code|red-test|spec (DEFECT_IN_VALUES); runner maps none to no replay (ok). merge_story.mjs JSON { id, step, exit, tail, conflict_files?, post_merge_test? }, exits 0/2/3/4/5 (ok); the runner reads no merge JSON (merge is the orchestrator's barrier; runner only takes args.merged), so no runner change needed.
- Tests: U1-U7 7/7, I1+I2 2/2, segment-stages 8/8, merge-story 2/2, no-inline-id-regex 7/7, no-execution-mode-vocabulary 9/9, wiki-config-brief 5/5, index-lint-config 16/16, upgrade-mcp-refresh 21/21; typecheck clean. I1 output: evidence/goal-check-a-I1.txt.

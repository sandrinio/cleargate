# STORY-066-11 Developer report (role: developer)

Commit: see story/STORY-066-11 tip. Typecheck pass. prebuild pass (both scripts in payload).
Tests: wave-runner.red U1,U2,U4,U5,U6,U7 pass; I2 pass; I1 integration-gated (fails at --validate, null qaSha, as M3 predicts).
U3 FAILS: spec mismatch in the sealed test. Its last sub-case (TPV BLOCKED-WIRING-GAP -> "QA-Red STORY-L pass 2") runs a standard item with the DEFAULT red result (scan_exit 0, flags []). By C-4 and the C1 table, architect-tpv is scan-flagged, so it is never dispatched there; the first sub-case in the same test requires that exact red result to yield 3 calls. The two cannot both hold. Fix needed in QA-Red: give the gap sub-case a flagged seal (scan_exit 1), as the M3 U3 row intends ("A standard seal with scan_exit 1 ... One TPV BLOCKED-WIRING-GAP leads to pass 2"). Runner TPV-gap routing (archBounces++, rewind to red) is implemented and was checked only by reading, not by that test.
Deviations: none from plan. Local normaliseLane in the builder (replace by the C1 import at integration). Wave-item one-id check lives in main(), not buildWaveArgs, because U4 uses ids like STORY-R.

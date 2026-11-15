# DevOps Report — STORY-066-06 (Stage table, contract C1)

## Merge
- cli main merge: a3c7beb (no-ff, local only; no push/publish; no dist rebuild in cli main)
- Integration: 037d5a6 (merge main 00848ec into story/STORY-066-06), clean, no conflicts
- gen:codex left no diff; prebuild and typecheck clean
- Diff stat of story vs main: 12 files, +458/-12 (segment_stages.mjs new; launch_wave, dispatch_serial, protocol, loop-script, tests)

## Targeted tests (story worktree after integration)
13 files (QA's 10 + assign-lane, assign-lane-init-sprint, seal-red.integration): 154/154 pass, 0 fail.

## Post-merge suite (tip tree at a3c7beb, evidence/suite-after-STORY-066-06.txt)
- Unit: 5583 tests, 5581 pass, 0 fail, 2 skipped
- Integration: 880 tests, 752 pass, 86 fail, 7 skipped
- Failing names vs baseline-failures / baseline-integration-failures / suite-after-STORY-066-05-fix: all but 8 already present.
- 8 new names, all rule-11 canonical-live parity class (06 edited canonical protocol, launch_wave.mjs, dispatch_serial.mjs; live unchanged until Gate 4):
  - Protocol byte-identical / mirror checks: "Protocol §14 completeness and scaffold-mirror", "Scenario 10: diff between dogfood and scaffold protocol files is empty", "Scenario 1: Protocol files list Abandoned", "Scenario: Protocol live and mirror are byte-identical", "both protocol files are byte-identical", "live cleargate-protocol.md === mirror cleargate-protocol.md", "Test 26 — canonical/live protocol are byte-identical…" (5b knowledge class)
  - "Test 28 — the three scaffold scripts are byte-identical between canonical and the live outer mirror" (scripts parity)
- Regressions: none. doctor-session-brief-f2 flake did not fire.
- Suggested sprint-context rule-18 addition: the 8 names above, from the 066-06 merge.

## Teardown
Both porcelains empty; cli worktree, outer host (.claude symlink removed) and branch story/STORY-066-06 (was 037d5a6) removed. cli main porcelain empty.

## State
STORY-066-06 -> Done via update_state.mjs.

## Proof (sprint plan §1)
"Unit — stagesFor per lane; verdict validation with lane and stages_run": QA-Verify's run incl. real dispatch_serial.mjs next on a fixture is in reports/STORY-066-06-qa.md. Merge-lane re-run: segment-stages.red and dispatch-verdict-modes.red pass (154/154 above).

contract/S-46-stages not moved (orchestrator fast-forwards to a3c7beb or the integrated story tip 037d5a6 per contract rule).

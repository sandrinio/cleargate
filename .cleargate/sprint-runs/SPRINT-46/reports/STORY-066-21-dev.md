# STORY-066-21 dev report (role: developer)
STATUS: done. COMMIT: a22e6b2 on story/STORY-066-21. TYPECHECK: pass. gen:codex + prebuild clean (only expected diffs). build ok (worktree only).
Sealed reds: sprint-root-outputs 3/3, merge-story-carry 3/3, bounce-readiness-runtime-state 1/1, expected-red-not-a-flag 1/1.
Regression list: all 0 fail (seal-red 7, seal-red-expected-red int 5 / node 3, qa-red-seal-content 1, wave-runner 2, subagent-ledger 32, pre-gate-any-stack 8, merge-story node 2 / int 8, resume 7, amend-a node 1 / int pass, test-waiver 2, test-command-env 3, skill-md-conditional-architect 18, loop-spec 9, wave-execution-barrier 23, serial-pointers 3, d5-qa-red-files 2, wave-runner-sandbox-fixes 7, codex-render 3, codex-codegen 30, agent-environment 2).
Shell: cr080 exit 0. cr081 (scenario-6 reads nonexistent scaffold/core/cleargate-planning/.../qa.md) and cr079 (provision-symlink-exists) exit 1; both are layout/path failures unrelated to this diff (not in the plan's pin list as expectedly green; QA-Verify to confirm against main).
Note: running the shell tests creates scaffold/core/.cleargate/sprint-runs/_off-sprint/pre-gate.jsonl; deleted before commit.
Plan followed verbatim; no deviations.

## Amendment A

Commit ac8f0c0 (only `scaffold/core/.cleargate/scripts/merge_story.mjs`). A1 applied (`CARRIED_LEDGERS`, `isCarriedOutput`, `{ carried, kept, dropped }`, teardown notice). Deviation: A1's loop head was first blocked (sealed R2-T3 tracks `state.json`, so it shows ` M`, not `??`); the orchestrator ruled Amendment A' and the loop head is now the A1' form (`isSprintRunOutput` skip; non-carried => dropped unless status has `D`; then `??` gate).

Verification (each file alone, TMPDIR under /private/tmp/dv21b.*): typecheck clean; tests/pass/fail:
- merge-story-carry-state.red.integration 1/1/0
- sprint-root-outputs.red.integration 3/3/0
- merge-story-carry.red.integration 3/3/0
- bounce-readiness-runtime-state.red.integration 1/1/0
- expected-red-not-a-flag.red 1/1/0
- merge-story.red 2/2/0
- merge-story.red.integration 8/8/0
- merge-story-resume.red.integration 7/7/0
- merge-story-amend-a.red 1/1/0
- merge-story-amend-a.red.integration 3/3/0
- merge-story-test-waiver.red.integration 2/2/0
- test-command-env.red.integration 3/3/0

No sealed test needed editing; none asserted an exact tail that gained the new line. `npm run prebuild` left the tree clean (only my edit before commit).

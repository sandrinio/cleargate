# DevOps Report — STORY-066-17

role: devops

## Merge Result
- cli main: ff4f258 -> fd3c471 (`git merge --no-ff story/STORY-066-17`, local only)
- Integration: not needed (main ff4f258 already an ancestor of story tip acd3e14)
- Story commits: seal 4b225db, Dev 41a86ee, seal 2 1f32eb7, rework a8c59ae, integration acd3e14

## Targeted tests (story tree, after prebuild+build; pre-merge tree identical to merged tree)
All 10 listed files exit 0: close-sprint-finish 6/0, close-sprint-finish-restore 5/0, sprint-finish 2/0, prep-doc-refresh 1/0, hardening-043-05 16/0, backsync 11/0, assume-ack-guard 19/0, sprint-skill-a3-a4-lanes 2/0, codex-sprint-execution-render 3/0, loop-spec-three-paths 9/0.
`bug076_077_close_path.red.sh` (TMPDIR /private/tmp/m17.*): Passed 8, Failed 0.

## Post-merge suite (tip tree at fd3c471) — evidence/suite-after-STORY-066-17.txt
- Unit: 5651/5653 pass, 0 fail (2 skipped/other)
- Integration: 792/930 pass, 96 fail; 315 unique failing names
- Failing-name set is identical to suite-after-STORY-066-16.txt (comm: 0 new, 0 gone). New failures: none. +11 integration tests, all green.
- No test residue in tip tree, main checkout or story trees.

## Teardown / State
- Story cli wt and outer host removed (status clean), branch story/STORY-066-17 deleted (-d).
- state.json: STORY-066-17 = Done.
- Task Breakdown rows ticked (rule 20); left unticked: "Goal check (d) runs 3a and 3b pass on an RC that includes this story".

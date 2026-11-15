# STORY-066-04 QA-Verify (role: qa)
QA: PASS
Typecheck pass. Targeted: 87/87 pass (4 sealed reds, sprint-unit, sprint*, decomp-gate, dashboard, sentinel, frontmatter-fence, clean-room-baseline-coexistence). test_prep_qa_context.sh 6/6. prebuild clean.
Surface: a68a056..00209fd = §3.1 files + sprint-unit (C-1); Developer commit touches only record_baseline.mjs, prep_qa_context.mjs, sprint.ts; sealed reds untouched.
Real dist run (worktree build, fixture with failing node:test): sprint init exit 0; baseline.json keys sprint_id,base_sha,command,exit_code,failing,tail,recorded_at; base_sha = HEAD; failing ["bad one","test/a.test.mjs:3:1"]; CLEARGATE_NO_BASELINE=1 writes no file. Fixture deleted.
extractFailing on real node:test TAP/spec/default output and Go output: correct, sorted, deduped, sync.
Notes (non-blocking): spec `✖ <file>` lines skipped by FILE_NAME_RE (documented, test-required); unavailable prose still says "recompute via cleargate gate test" (plan wanted replacement; spec R8 does not mandate); prose uses "and N more" not "… and N more".
Task Breakdown rows: orchestrator ticks (rule 20).

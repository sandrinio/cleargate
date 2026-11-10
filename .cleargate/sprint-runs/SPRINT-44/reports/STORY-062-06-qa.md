role: qa
STORY: STORY-062-06
QA: PASS
TYPECHECK: pass
TESTS: dashboard files 318 pass, 0 fail, 0 skipped (all test/dashboard/*.node.test.ts); full suite not run (merge lane)
ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios (red file 11/11 now green)
MISSING: none
REGRESSIONS: none
CHECKS:
1. 24e0382..450e8e1 touches src/dashboard/render.ts only; no red test touched after 24e0382.
2. R1-R4 read against the diff: select first in bar (Not done selected, All statuses, sorted statuses via rebuild); done set Completed/Abandoned case-insensitive, open/empty/exact; kids filtered by status clause only for expand button and child rows; f.status persists, rebuild keeps chosen value, redraw skip present.
3. TPV read: `out === cgBacklogState.html` compare, then store and assign; never reads el.innerHTML. The No matching items path is the ternary branch of `out`, so it uses the same check.
4. Manual: render(collect+collectBacklog, cwd=repo) from the worktree; status select first in .bl-filters, before type, Not done selected; embedded data holds 137 items incl. 32 Completed, 1 Abandoned (filter client-only). No server started.
VERDICT: ship it. Task Breakdown rows unticked (detached host; orchestrator ticks at merge, advisory).
flashcards_flagged: []

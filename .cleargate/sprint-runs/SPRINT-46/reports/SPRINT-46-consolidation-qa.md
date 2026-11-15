# SPRINT-46 consolidation QA (role: qa, Mode: CONSOLIDATION)

QA: PASS
Tree: consolidation/S-46 @ 54d4df0 on cli main c15d105. Typecheck/build by author; build re-run here OK.

## Behaviour preservation (git show 54d4df0)
- No test/red file touched; record_baseline.mjs untouched; no user-visible string or exit code changed.
- merge_story.mjs: local lastLine removed; imports lastLine from record_baseline.mjs (already imported module, export verified, body byte-identical). statusEntries(cwd) = same git args + parsePorcelainZ at 4 sites.
- dispatch_serial.mjs exports resolveRepoRoot (body unchanged); wave_runner_args.mjs imports it from dispatch_serial.mjs (module already imported). Leftover execFileSync/path imports in wave_runner_args are harmless.
- init_sprint.mjs: LANE_RANK imported from assign_lane.mjs (already imported); same values used as before.
- sprint.ts: readTestWaiver from init/detect-test-stack.js + .trim(). New import edge: src/commands/sprint.ts -> src/init/detect-test-stack.ts (TS, same package; the only new edge). Semantics equal (non-string/missing/unreadable -> '').

## Suites
- Unit (npm test, S46-consolidation wt): 5661 tests, 5658 pass, 1 fail. The fail is the documented load flake (doctor-session-brief-f2.red "release_repos [notags, tagged]..." + parent STORY-063-11-F2); alone: 4/4 pass.
- Integration, first run in S46-consolidation (cli-only, no outer host): 934 tests / 300 fail - NOT comparable; outer-repo-dependent tests (root CLAUDE.md, package.json, live files) fail without an outer host. Layout artefact, discarded as evidence (kept in suite-after-consolidation.txt).
- Integration, re-run in outer-host layout (same as baseline; throwaway host at sprint/S-46 + nested detached cli wt at 54d4df0, node_modules/.claude links, prebuild+build): 938 tests, 800 pass, 96 fail, 315 unique failing names. Identical to suite-after-STORY-066-18.txt (938/96/315). comm: zero new names.
- Evidence: evidence/suite-after-consolidation.txt (unit + layout-artefact integration), evidence/suite-after-consolidation-integration-outerhost.txt (the valid integration leg).
- Throwaway host removed; no residue in consolidation worktree.

## Consolidation merge (devops)

- Preconditions: cli main and consolidation worktree clean; main at c15d105 (unmoved).
- Merge: `merge(consolidation/S-46): SPRINT-46 consolidation pass`, no-ff, SHA 5198aaa (5 files, 16+/44-).
- Diff check: `git diff --stat 54d4df0 main` empty, so the merged tree is the QA'd tree; no further suite run.
- Teardown: worktree node_modules symlink removed (target intact), worktree removed, branch consolidation/S-46 deleted (was 54d4df0). Empty leftover dir `.worktrees/S46-consolidation` remains. Not pushed, dist not rebuilt.

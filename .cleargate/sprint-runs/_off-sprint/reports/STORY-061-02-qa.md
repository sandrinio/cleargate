# STORY-061-02 QA report
role: qa
STORY: STORY-061-02
Commit: ef90ce424498165c631b883ff495772e0e2cf18c (story/STORY-061-02, parent f8320ca)
QA: PASS
TYPECHECK: pass (npm run typecheck, exit 0, at the commit in the fresh clone)
TESTS: standalone fresh clone 3599 tests, 3597 pass, 0 fail, 0 cancelled, 2 skipped. Nested default 3599 / 3597 / 0 / 0 / 2. Nested integration (33 files) 83 / 83 / 0 / 0.
ACCEPTANCE_COVERAGE: 5 of 5
MISSING: none
REGRESSIONS: none (0 of base's passing titles missing at head)

## Checks
1. Surface: name-status f8320ca..ef90ce4 = 56 M, 26 A (22 siblings + 4 fixtures), 2 R099 (snapshot-drift, clean-room). Nothing under src/, scripts/, scaffold/; no tgz. PASS.
2. Gherkin 1 (fresh clone, parent not meta-repo, CLEARGATE_META_ROOT unset, `npm install && npm run build && npm test`): exit 0, 0 fail, 0 cancelled; `git status --porcelain --untracked-files=all` empty. PASS.
   - Run 1 failed once: `init-from-source` Scenario 1 saw a foreign `setup-probe-*` dir in the shared $TMPDIR (it diffs the os.tmpdir() listing; the dir is created by the agent tool environment, not by ClearGate code). The file is untouched by the story and passes 3 of 3 in isolation. Run 2 used a private TMPDIR subdir and was green. Environmental flake, not a story defect (see flashcards).
3. Gherkin 2: nested full 3599/3597/0/0; nested integration over the 33 created or renamed files (list verified from `git diff --name-status 89f0230 ef90ce4`) 83/83, 0 fail, 0 cancelled. Pass floor 3597 + 83 = 3680 >= 3642. Meta-repo scratch clone `git status --porcelain --untracked-files=all` empty before, after the full run, and after the integration run (the base delta was 50 files). PASS.
4. Gherkin 3 (push-hierarchy): the idempotency test (now in push-hierarchy.live.integration) passes `<tmp>/.cleargate/delivery/pending-sync` to the script, not the root. I reproduced the run: the dir holds STORY-042-01.md, run 1 prints "1 written, 0 skipped", run 2 "0 written, 1 skipped", SHA identical (f0341111...). The test asserts both counts, so it is not vacuous, and it keeps the `afterSha === beforeSha` assert. The other 3 script tests pass `tmpDir`. No script call omits the dir argument. Meta-repo status clean after the run. PASS.
5. Gherkin 4 and 5 (guard, scenarios 7 and 8): read the code (pure fs scanner, self-excluded only, no allowlist, no opt-out marker). Manual break in the scratch standalone clone: __dirname climb to CLAUDE.md is flagged and named (`climb:../CLAUDE.md @2`); a CLEARGATE_META_ROOT mention in a comment is flagged; `'../../../mcp/src/x'` is flagged (climb and lit); a synthetic `'mcp/src/index.ts'` key is not flagged (OD-2). Probe files removed, tree clean, guard back to 8/8. Machine-path regex over `test`: no output. META_ROOT/CLEARGATE_META_ROOT outside integration/fixtures: only the guard file itself. PASS.
6. R5/parity: multiset of passing titles in the base nested log (4849 spec lines) vs head default + integration: 0 missing. Diff of it/test/describe lines over every touched `.red` file shows only the planned moves and the R3-split titles (T4c, T5c, Test 26/27 (canonical), license, no-exec). The kept assertion text is unchanged. PASS.
7. Deviations:
   a. E7 GATE-4 NOTE test: confirmed the removed code was fs.existsSync + two readFileSync + `if (a !== b) console.log(...)`. No assertion. `assert.ok(true, ...)` kept, title kept. R5 holds. ACCEPT.
   b. Siblings copy only needed helpers: no assertion changes, title parity proven above. ACCEPT.
8. Typecheck clean.
9. Spot reads: push-hierarchy.live sibling (header, Sc9-safe, no planning-keyed REL); license-contract default R3-split test (reads the cli LICENSE, a real assertion); readiness-corpus fixture (4 synthetic files, no machine paths, valid frontmatter so the smoke test is not early-return); red-green-example `TSX_BIN = join(CLI_ROOT,'node_modules','.bin','tsx')` with CLI_ROOT = resolve(__dirname,'..','..'). All fine.

## Notes (non-blocking)
- Dev found `agent-developer-section.integration` Scenario 2 swaps assert.strictEqual args (message as expected). Pre-existing, not in the created/renamed set. Also `_archive/protocol-section-24.integration` has 3 pre-existing failures (01's report). Both are follow-ups, not part of this story.
- Task Breakdown rows not ticked (story file lives in the meta-repo). Advisory only.
- Logs: /private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/5c4c27ca-5b59-46c3-afb6-33f34939820e/scratchpad/qa2/ (fresh-test.log, fresh-test-run1.log, nested-full.out, nested-int.out) and scratchpad/lay/logs/qa02-*.

## Flashcards proposed
- 2026-11-07 · #qa #test-harness · init-from-source diffs os.tmpdir(); foreign tmp dirs flake it. Run full suites with a private TMPDIR subdir.
- 2026-11-07 · #qa #macos · tsx IPC socket path caps near 104 chars; a deep scratch TMPDIR gives EINVAL listen. Use a short private TMPDIR.

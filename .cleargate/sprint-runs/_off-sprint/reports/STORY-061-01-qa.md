STORY: STORY-061-01   QA: PASS   (Mode: VERIFY, commit cbe6efeef56059061ca017505c6e4d3e36fd736e, harness --ref with FULL sha; short sha fails the fetch and silently reuses a stale tree)
1 Surface: PASS. 43 files, all in §3.1; 8 .live.integration siblings = A; serial-twins = R098 rename; nothing in src/, scripts/, scaffold/; no tgz in commit.
2 Gherkin1 standalone: PASS. 54 default files: 783 tests, 782 pass, 0 fail, 0 cancelled, 1 skipped; cli status delta none.
3 Gherkin2 nested: PASS. All 82 files at head vs base: 1115 tests/1054 pass/36 fail/21 cancelled, byte-identical failure set to base (protocol-24 x3 + out-of-scope vitest-conversion etc. integration files, all pre-existing at 89f0230). Passing titles: every base title present at head, 3 extra describe-level titles only. Base+head counts equal 358 for in-scope.
4 Gherkin3: PASS. cli delta none. Meta-repo delta in broad runs (EPIC-058 move; 50 archive edits in full npm test) is identical at base 89f0230 (pre-existing, out of scope).
5 Gherkin4/5 greps: PASS. Scenario-4 regex: no output. /Users/ssuladze: none. ClearGate-path regex: none. Remaining /Users/ = 4 synthetic fixtures (clean-room-evidence, codex-hooks-harness).
6 DoD: nested full npm test 3647 tests, 3642 pass, 3 fail = snapshot-drift + red-green-example x2 (== epic base list); base full = 3674/3669, delta -27 = the 27 tests moved to integration tier. Standalone full: 3647 tests, 3437 pass, 187 fail, 14 cancelled (epic base 3667/394/28); no failure in test/scripts or test/helpers.
7 Typecheck: pass.
8 Spot-read: 7-4.red (parity scenario moved verbatim to live sibling), assume-ack-guard, dedupe-frontmatter: assertions unchanged; CLEARGATE_REPO_ROOT = per-run tmpdir; stageCanonicalScripts copies canonical->tmp, no scaffold writes.
Notes: stray untracked cleargate-0.25.0.tgz in real cli checkout (not in commit; remove before merge). Task Breakdown rows unchecked (advisory).

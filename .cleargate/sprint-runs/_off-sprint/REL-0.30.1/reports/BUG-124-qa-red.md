# BUG-124 QA-Red (U3 commit 2) — role: qa

QA-RED: WRITTEN
BASELINE_FAIL: 44 new cases red on HEAD 962eabc (brief-labels 27 of 35, doctor-hook-log 13 of 18, BUG-124 integration describe 4 of 6 incl. jq precheck) + 87 existing cases re-pinned to the new behaviour and now red.
Worktree /Users/ssuladze/Documents/Dev/cg-wt/u3, uncommitted. No src, scaffold or oracle script touched.

## Files (worktree-relative)
NEW
- test/wiki/brief-labels.red.node.test.ts — Sc1-Sc5 + edges (35 cases)
- test/commands/doctor-hook-log.red.node.test.ts — Sc6 (18 cases, in-process doctorHandler({}), no subprocess)
EDITED
- test/wiki/brief-labels-oracle.red.integration.node.test.ts — added describe('BUG-124') (6 cases); BUG-123 describe untouched (import line +runsFile)
- test/wiki/session-brief.red.node.test.ts — Waiting rich/:185/:202/:208/:234, Last closed :140/:273 (:278/:283/:288 kept), release unit pins use basename(root), synthetic Waiting l5/l3 (104 drafts)
- test/wiki/session-brief-f3.red.node.test.ts — per-reason forms (`in <m> item[s]`, `(<ids>; <u> drafts never checked)`), CU(n) helper, level-0 predicate no longer "no parens" (the never-checked parenthetical stays)
- test/wiki/session-brief-f2.red.node.test.ts — `[]` falls back to "." now named by directory
- test/wiki/_brief-support.ts — WAIT_SYNTH l5/l3/l0
- test/wiki/_oracle-support.ts — CORPUS_LABEL 'acme-app' (corpusRepo root dir), RELEASE, LAST_CLOSED (no `— carried 2`), FACTS_A.waiting +question_count 1 +unchecked_drafts 23, LINES_A.waiting, Facts type, repoOf `name` option
- test/wiki/brief-oracle.red.node.test.ts — LIVE0 -> live0(repo, unchecked), release label pins, F3 waiting forms + new noun/count wrong-forms
- test/wiki/brief-oracle-edges.red.integration.node.test.ts — D4 :217, D8 default/empty/decoy ('acme-app'), E4 facts, E6 tails, F3 waitRepo (L5/L3/L0, question_count 4, unchecked_drafts 11), level-0 predicate
- test/commands/doctor-session-brief.red.node.test.ts — Last closed :64, default-repo Release pins (basename)
- test/wiki/index-rows.red.node.test.ts, test/wiki/index-tiers.red.node.test.ts — no `[expand]`
- test/wiki/fixtures/expected-index-hierarchical.md — line 23 only
Unchanged on purpose: brief-truth-oracle.red (flows from _oracle-support), session-brief-f1 / handlers / doctor-session-brief-f2/perf (their Release/Waiting text is hand-fed input or named repos), orientation-eval-* (green).

## Red and why (HEAD)
brief-labels (27): Sc1 x9 (HEAD prints "<items> open questions (ids)"); Sc2 x6 (no never-checked part), +2 level 0/5 on synthetic; Sc3 x3 (HEAD appends `— carried N` when the stories line has it); Sc4 x6 (label `.`), incl. doctor e2e; Sc5 x2 (HEAD writes `[expand](archive/…)`).
  Controls green on HEAD (8): zero questions, unchanged lines, not-counted drafts (sha set / approved / Approved status / archived), ids-only contradictions, named repo keeps name, 3 Last-closed carried-from-section/unknown/no-report.
doctor-hook-log (13): superseded gate=1 still prints `⚠ hook failure`; no `gate check failing at … (a readiness result, not a hook failure)` wording; no latest-per-file; no chronological order.
  Controls green (5): ingest=1, stamp=1, gate+ingest, >24h entry, old-failing-then-clean.
Integration BUG-124 (4 red, 2 green): printed Waiting/Last closed/Release old shape; oracle facts lack question_count/unchecked_drafts; compare-exit-0 case fails on the printed-line pin first (compiler and oracle agree on the OLD shape on base, so compare alone cannot red); planted pre-fix lines are accepted by the base oracle (must mismatch). Green: jq precheck, and "wrong in-3-items / wrong draft count / wrong question count" (mismatch either way).
Edited existing: session-brief 11, f3 9, f2 1, doctor-session-brief 3, index-rows 1, index-tiers 1, build-index-hierarchical golden 1 (fixture line 23), brief-oracle.red 47 (oracle script still old: facts and compare), brief-truth-oracle 2 ("third witness", A and B), brief-oracle-edges 11.

## Hand-computed numbers (independent of the compiler)
- richDocs: 23 never-checked drafts (every Draft in pending-sync; SPRINT-9 Active, SPRINT-08/archive excluded). syntheticRepo(decisions=2): 104 (7+25+30+40+2). Orientation corpus: 23 (24 pending files minus approved Active SPRINT-9), question_count 1. brief-oracle F3 waitRepo: 11 drafts, 4 questions. E4 repo: 4 drafts.
- Never-checked rule used: pending-sync, status Draft/In Review, not `approved: true`, `last_contradict_sha` absent/null/"" ; every bucket (stories too); counted whether or not the draft appears in contradictions.md.

## Interpretation calls for Dev / TPV (flag if wrong)
1. The `.` label (basename of the resolved root) applies to ALL release forms (`<dir>: <tag> + n commits`, `<dir> no tags`, `<dir> unavailable`), not only `no tags`. The plan's LIVE0 pin (`Release: . unavailable`) and G-R-31 imply it. Tests derive expected labels from `path.basename(root)` or the fixed dir `acme-app`.
2. Level 0 keeps `in <m> item[s]` on the questions part and `(<u> drafts never checked)` on contradictions; only ids drop.
3. The R3 level-0 predicate in f3 and the edges file had to change from "no `(`" to "no id list" (`\([A-Z]+-\d`), since level 0 legitimately keeps a parenthetical.
4. Oracle must add `waiting.question_count` and `waiting.unchecked_drafts`; its release label = `${d##*/}` of the repo dir (tests use dir `acme-app`; a root of `/` falling back to `.` is not tested).
5. Added budget risk: the Waiting line grows ~30 B; R3 tests are pad-searching so should adapt, but Dev should rerun session-brief.red R3 describes.
6. Test files are not in tsconfig; Facts type extended only in _oracle-support (orientation-eval-f3 builds `waiting` literals without the two new fields; runtime-safe).

flashcards_flagged:
  - "2026-11-13 · #qa-red #test-harness · a label rule that touches every fixture (never-checked drafts, repo name) needs hand-counted fixtures; count with a script over the raw docs, not the compiler"

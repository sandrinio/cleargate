# BUG-123 QA-Red (U3 commit 1) — role: qa

QA-RED: WRITTEN
BASELINE_FAIL: 50 red on base b9fe36a (unit file 38 of 46, 8 are controls; integration file 4 of 5; edited existing files 8 = 3 session-brief + 2 truth-oracle + 3 oracle-edges D7)

## Files (worktree /Users/ssuladze/Documents/Dev/cg-wt/u3, uncommitted)
- NEW test/wiki/decisions-forms-and-brief-line.red.node.test.ts (46 cases)
- NEW test/wiki/brief-labels-oracle.red.integration.node.test.ts (describe('BUG-123'), 5 cases; BUG-124 adds its describe later)
- EDIT test/wiki/session-brief.red.node.test.ts (3 Decisions pins)
- EDIT test/wiki/_oracle-support.ts (LINES_A.decisions, D7 comment)
- EDIT test/wiki/brief-oracle-edges.red.integration.node.test.ts (D7 describe: 1 pin rewritten, 3 added)

## Red and why (base)
Unit file: Sc1 numbered/`Question 12` forms, two-numbered-pairs, QUESTION_RE (question text null on base);
extractDecisionPairsWithRecommendation / isAcceptanceAnswer (11 table cases) / briefDecisionCandidates (3) /
decisionSections / checkUnrecognisedDecisionSections (3) are missing exports; Sc2 (4) shows "Accepted the recommendation"
not the recommendation; Sc3 (4) duplicates + `.` kept; Sc4 (4) no `…`, `,;` and `.;`; Sc5 id-desc/updated_at ordering
(base: approved_at day, id ascending); Sc6 lint prints no `warn: decisions-unrecognised`.
Controls that pass on base (guard against over-fixing): `**Question:**` unchanged, orphan answer `(no question text)`,
page not deduped, latestDecisions contract, exactly-12-words no `…`, undated/approved_at-only ordering, different-answers kept.

Integration file (in-process wiki build + doctorHandler --session-start from source, dist stub in the fixture repo; no dist build):
- printed Decisions line == hand-computed EXPECTED_LINE (red: old shape)
- oracle facts JSON `decisions` == 5 distinct ids ordered by updated_at (red: oracle dups EPIC-32, base order)
- `doctor --session-start | brief-oracle.sh --compare - <root>` exit 0 — NOTE: on base compiler and oracle both
  have the old rules and AGREE, so the compare alone cannot red. The case asserts the printed line equals EXPECTED_LINE
  first (red for the bug's reason), then the compare (R5: compiler + oracle + fixtures move together).
- planted pre-fix line (EPIC-32 twice) must mismatch `decisions` (red on base: oracle expects the dup)
- jq precondition passes.

## Existing tests edited to the new behaviour (never weakened)
- session-brief.red: "more than 12 words" now asserts the `…` form; same-key tie EPIC-9 before EPIC-10 (id desc);
  G-M2-59 excerpt now `w9 w10…`. 3 red on base.
- _oracle-support.ts LINES_A.decisions: no trailing `.` on any entry (FACTS_A ids unchanged: corpus order and
  distinct answers are unaffected). Now red on base: brief-truth-oracle.red "a third witness" (2 cases, A and B variants).
- brief-oracle-edges D7: date test now updated_at-then-approved_at to the second, id desc, undated last
  (['EPIC-6','EPIC-2','EPIC-3','EPIC-1','EPIC-5']); old "duplicates never merged" replaced by distinct-answers (stays green) +
  new dedupe, acceptance->recommendation source. 3 red on base.
- Not changed because 123 does not touch them: FACTS_A, brief-oracle.red.node (62 pass), session-brief-f1/f2/f3, handlers,
  doctor-session-brief, decisions-unit/page/f1/wiring, extract-sections-f1 — all green on base (checked).

## Notes for Dev
- `latestDecisions`/page ordering stay approved_at-first; brief ordering uses updated_at first (G-R-25).
- Oracle D7 must mirror: updated_at-else-approved_at to the second, id desc, dedupe by excerpt/source, acceptance -> recommended,
  `Question N` regex, so the three edited oracle D7 cases and the integration file go green.
- Test files are not in tsconfig (tsc excludes them); dynamic imports destructure new exports.
flashcards_flagged: []

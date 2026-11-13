# BUG-123 F2 QA-Red (role: qa)

QA-RED: WRITTEN
RED_TESTS: test/wiki/decisions-question-qualifiers.red.node.test.ts (worktree /Users/ssuladze/Documents/Dev/cg-wt/u6, uncommitted, base 2da466a)
BASELINE_FAIL: 8 of 11 cases (3 pass: 2 intended guards + the jq precondition)

Red (reason: QUESTION_RE / oracle ERE do not accept the qualified forms):
- Sc1 x6: `**Question (Q1):**`, `**Question (OQ2):**`, `**Question (Q1, resolved):**`, `**Q1, question:**`, `**q3, Question:**`, `**Q2,question:**` render `(no question text)` instead of the text.
- Sc3: brief Waiting counts 1 open question, expected 2 (`**Question (Q2):**` with `{Waiting}` plus unanswered `**Question (Q3):**`).
- Sc4: printed TS count 2 vs expected 6; the oracle's question_count is also short on base (probe on a subset gave 2 where 3 is right), so the oracle side is red too. Values are asserted (TS, oracle, then equality) before any compare.

Green on base (guards, must stay green): Sc2 `**Questions:**` and `**Questionnaire:**` keep `(no question text)`; jq precondition.

Notes: Sc4 corpus expects 6 open questions in EPIC-1..5, none from EPIC-6/7 (`**Questions:**`/`**Questionnaire:**` with a real answer). Fixtures synthetic; in-process, oracle run as child process, no dist build.
flashcards_flagged: []

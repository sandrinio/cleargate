# BUG-124 Dev (U3 commit 2) — role: developer

STATUS: done, with one red test that contradicts G-R-34 (see below)
COMMIT: 6c59d2c on story/REL-0301-brief (parent 76c0f6f)

## Files
- src/wiki/synthesis/session-brief.ts: openQuestionCount over decisionSections, isNeverChecked, Waiting parts, carried-once, Release dir label
- src/wiki/page-schema.ts: archive lines without `[expand]` (one hunk)
- src/commands/doctor.ts: latest entry per file, gate-only line, chronological order (Python byte edit)
- scripts/brief-oracle.sh: PF_lcs/PF_approved, per-item NQ, UNC, `question_count`/`unchecked_drafts` facts, D4 carried, release label via builtins (`$(cd && pwd)` is not an exec; spawn pin green), compare-mode nouns and draft suffix

## Gates
- `npm run typecheck` clean; `npm run check:no-inline-id-regex` clean.
- Green (`npm run test:file -- <file>`): brief-labels 35/35, doctor-hook-log 18/18, session-brief 75/75, session-brief-f3 14/14, session-brief-f2 16/16, doctor-session-brief 28/28, index-rows 46/46, index-tiers 17/17, brief-oracle 62/62, brief-truth-oracle 15/15, brief-labels-oracle (integration, in-process) 11/11, brief-oracle-edges 82/83.
- Wider run (all test/wiki/*.node.test.ts, test/commands/doctor*, importers of the four modules): 1797 pass, 2 fail names, see below. R3 budget describes in session-brief.red pass.
- Note: my glob also swept test/wiki/*.live.integration files in that wider run (not intended). Its only non-doctor failures are the live mirror-parity ones (cleargate-planning diff), unrelated.
- dist-dependent failures (doctor-drift-guard / doctor-retired-field suites): identical with change stashed.

## Red test I believe is wrong (not edited)
`test/wiki/brief-oracle-edges.red.integration.node.test.ts:171`, "an item in several sets is listed under each reason (F3); with nothing waiting all four lists are empty":
`assert.deepEqual(facts(repoOf({})).waiting, { gates: [], questions: [], contradictions: [], checklists: [] })`.
Actual: the same plus `question_count: 0, unchecked_drafts: 0`. Passes on base, fails with my change. G-R-34 says `waiting` gains both keys, and `_oracle-support.ts` FACTS_A (QA-Red) already expects them, so this expected object should carry `question_count: 0, unchecked_drafts: 0`. Needs QA-Red to fix that one line.

## Plan deviations
none.

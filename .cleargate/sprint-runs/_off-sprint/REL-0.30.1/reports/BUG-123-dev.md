# BUG-123 Dev (U3 commit 1) — role: developer

STATUS: done
COMMIT: 962eabc (branch story/REL-0301-brief, on top of red f469f9e)
TYPECHECK: pass; check:no-inline-id-regex: clean

## Files changed
- src/wiki/extract-sections.ts: QUESTION_RE numbered form; extractDecisionPairsWithRecommendation (one internal parser; extractDecisionPairs strips the key); isAcceptanceAnswer
- src/wiki/synthesis/decisions.ts: decisionSections (extracted), briefDecisionCandidates; latestDecisions / page untouched
- src/wiki/synthesis/session-brief.ts: excerpt rules, candidates + dedupe, first 5
- src/wiki/lint-checks.ts: checkUnrecognisedDecisionSections
- src/commands/wiki-lint.ts: raw scan kept in a local, warning appended to `warnings` (printed before summary, not a finding)
- scripts/brief-oracle.sh: question regex, REC capture, isaccept/excerpt awk mirrors, updated_at-else-approved_at key to the second, id-desc ties, dedupe in D7 (no new spawns)
- test/wiki/session-brief-handlers.red.node.test.ts: see deviation

## Tests
- decisions-forms-and-brief-line.red.node.test.ts: 46/46
- brief-labels-oracle.red.integration.node.test.ts (test:file): 5/5
- brief-oracle-edges.red.integration.node.test.ts: 83/83
- Default-tier sweep (70 files: test/wiki/*, test/commands/doctor*, wiki-lint*, and every test importing the touched modules; no .live.integration): 1637 tests, 1629 pass after fix. Remaining non-pass = 6 cancelled + 2 asserts in doctor-drift-guard / doctor-retired-field, which need `dist/cli.js` (absent in the worktree). Identical on base (stashed run: 10 pass, 6 cancelled). Not caused by this change.

## Plan deviation
- `session-brief-handlers.red` "stamp-only ingest ... leaves brief.md untouched (mtime)" failed: it set EPIC-3 `updated_at` to 2026-11-20, which under G-R-25 (brief orders by updated_at) legitimately reorders Decisions. The plan lists this file under "existing tests that change shape" but QA-Red did not edit it. I changed the stamp to `updated_at: "2026-11-01T00:00:00Z"` (equal to approved_at, so the sort key is unchanged); intent kept. Orchestrator should confirm / have QA-Verify look at it. Not a BUG-123 red test.

## Notes
- Heading name in the lint warning is derived by comparing the section to `findSection(body, /ai interrogation loop/)` because `decisionSections` returns text without the heading.
- Never ran build, wiki build, doctor on the meta-repo.

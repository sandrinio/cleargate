# CR-035 QA Report

**STORY:** CR-035
**QA:** PASS
**COMMIT:** 361a4d4
**WORKTREE:** .worktrees/CR-035

## Checks

**TYPECHECK:** pass (Dev-reported; not re-run per skip-rerun guidance)
**TESTS:** 1,619 passed, 20 failed (pre-existing), 0 skipped (Dev-reported). 2 new CR-035 scenarios confirmed in test file.

## Acceptance Coverage

**ACCEPTANCE_COVERAGE:** 5 of 5 CR-035 §4 acceptance scenarios have matching evidence

| AC | Description | Evidence |
|----|-------------|----------|
| AC1 | Bug reproduces pre-CR — documented in context_source | context_source §0 narrates the 11-row vs 24M gap |
| AC2 | Fix produces correct numbers — digest emits sprint_work/sprint_total/reporter_pass | Scenario 1 asserts sprint_work_tokens: 6,600 and sprint_total_tokens: 26,000 |
| AC3 | No "ledger-primary" label — uses "session-totals"/"ledger-deltas-by-agent" | `grep ledger-primary cleargate-planning/.claude/agents/reporter.md` → 0 matches; correct labels at L47–48 |
| AC4 | CR-036 coupling — Reporter pass drops post-CR-036 | Deferred (W4 observational). Accepted per M3 §CR-035 plan |
| AC5 | Scaffold mirror diffs empty | `diff cleargate-planning/.claude/agents/reporter.md cleargate-cli/templates/cleargate-planning/.claude/agents/reporter.md` → empty |

## Verification Point Map

| Check | Result |
|-------|--------|
| Object.values sum in prep_reporter_context.mjs | PASS — L301 `Object.values(raw).reduce(...)` sums uuid-keyed entries |
| sprintWorkTokens = total.sum - reporter_sum | PASS — L322 `total.sum - reporterSum` |
| sessionTotalsSource fallback note | PASS — L312–313 legacy-fallback path + L332 note emission |
| reporter.md Source 1 / Source 2 / Source 3 two-line split format | PASS — canonical L47–60 |
| No prep_reporter_context.mjs mirror in cleargate-planning | PASS — directory confirmed absent |
| npm payload mirror (cleargate-cli/templates/...) byte-equal | PASS — empty diff |
| Live .claude/agents/reporter.md | NOTE — gitignored; not in commit (expected). Requires cleargate init re-sync post-merge. |
| Test scenario 1: UUID-keyed .session-totals.json | PASS — file read, 2 scenarios confirmed |
| Test scenario 2: missing .session-totals.json fallback | PASS — checks null + legacy-fallback string |

## MISSING

none

## REGRESSIONS

none — 20 pre-existing failures confirmed unrelated to CR-035 surface (no overlap with reporter.md, prep_reporter_context.mjs, test_prep_reporter_context.test.ts)

## VERDICT

Ship it. All 5 acceptance scenarios are covered. The two-line split is implemented in canonical reporter.md and the npm payload mirror. prep_reporter_context.mjs correctly parses the UUID-keyed .session-totals.json shape via Object.values sum. The 2 new test scenarios cover the positive case and the legacy-fallback. The live .claude/agents/reporter.md divergence is the expected dogfood-split state (gitignored) — orchestrator must run `cleargate init` post-merge to propagate to the live instance.

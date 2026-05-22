# Developer Report: STORY-070-01

**Story:** STORY-070-01 — Collapse `execution_mode` to single always-enforced behavior + schema v3 migrator + advisory env hatch
**Sprint:** SPRINT-30 (M2, Wave 4)
**Commit:** `145a28c2`
**Branch:** `story/STORY-070-01`

## Summary

Implemented the full CR-070 vocabulary collapse. All 34 files from the prior-session staged surface were verified against the M2 §3 blueprint, all 5 QA-Red test files (39 scenarios) pass, typecheck is clean, and the grep-gate npm script exits 0.

**Key deliverables:**
- `.cleargate/scripts/_migrate-schema-v3.mjs` — new strip-on-read migrator; atomic tmp+rename; idempotent; logs `[migrator] STORY-070-01: stripped execution_mode from <path>` when a migration occurs
- `.cleargate/scripts/state.schema.json` — `schema_version` const bumped 2→3; `execution_mode` removed from `properties` and `required`
- Four `.cleargate/scripts/*.mjs` — v1/v2 mode branches collapsed to unconditional; migrator wired immediately after each `JSON.parse()`
- `cleargate-cli/src/util/gate-mode.ts` — `isAdvisory()` export; only `CLEARGATE_ADVISORY=1` returns true
- `cleargate-cli/src/commands/sprint.ts` — preflight gate-failure exit wired with advisory check; all `readSprintExecutionMode/printInertAndExit` call sites removed
- `cleargate-cli/src/cli.ts`, `gate.ts`, `state.ts`, `story.ts` — vocabulary strings purged (`(v2 only — inert under v1)`, `execution_mode lookup`)
- `cleargate-cli/src/commands/doctor.ts` — pending-sync frontmatter scan for retired field; advisory-only line emitted
- `cleargate-planning/CLAUDE.md` — `**Sprint mode.**` paragraph deleted
- `cleargate-cli/templates/cleargate-planning/CLAUDE.md` — synced via `npm run prebuild` (confirmed byte-identical)
- `.cleargate/templates/Sprint Plan Template.md` — `execution_mode:` field line + comment block removed
- `.cleargate/knowledge/cleargate-enforcement.md` — advisory caveats rewritten to always-enforces; "Operator Emergency Levers" subsection added
- `cleargate-cli/package.json` — `check:no-execution-mode-vocabulary` script added; excludes archive/node_modules/test/sprint-runs/fixtures/package.json

## Mid-Flight Pickup

Prior Developer session staged 3 new files (the two NEW file additions + cleargate-planning mirror). The stash/pop cycle during testing temporarily moved staged changes to unstaged working tree. Staged all 34 files before committing.

## Gap Analysis vs Blueprint

No blueprint gaps found. All 8 Gherkin scenarios are covered. The 5 Red test files map exactly to the blueprint's test shape table.

## Pre-existing Failures

83 failures in the full suite at baseline (QA-Red commit). Verified via stash/pop. Failures in:
- `test/scripts/test_update_state.node.test.ts` Scenario 2 (malformed `assert.strictEqual` args — pre-existing bug)
- `test/commands/story-unit.node.test.ts` Scenarios 1/2/5 — pre-existing
- `test/scripts/test_close_sprint_v21.node.test.ts` Scenario 24 — pre-existing
- Wiki tests (mcp/package.json absent in worktree, `require` in ESM context, etc.) — environment/pre-existing

None of these regressed from this story's changes.

## Three-Site Mirror Status

- Canonical `cleargate-planning/CLAUDE.md`: `**Sprint mode.**` paragraph deleted (staged)
- NPM payload `cleargate-cli/templates/cleargate-planning/CLAUDE.md`: synced via `npm run prebuild`; confirmed byte-identical via `diff`
- Live `/.claude/CLAUDE.md`: NOT touched — orchestrator post-merge DoD item (`cleargate init` re-run against meta-repo)

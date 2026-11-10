# STORY-061-01 dev report
role: developer
Commit: cbe6efe on story/STORY-061-01 (cleargate-cli repo). Typecheck: clean (`npm run typecheck`).

## Harness summary blocks (verbatim, final working tree == committed tree)
Standalone, 30 default files (28 - serial-twins + report-filename + migrate-status-to-completed.red + scaffold-layout.red):
```
=== standalone (exit 0)
ℹ tests 367 ℹ pass 366 ℹ fail 0 ℹ cancelled 0 ℹ skipped 1
  cli git-status delta: none
```
Nested, 30 default + 11 integration (2 R4 + 8 live siblings + serial-twins):
```
=== nested (exit 1)
ℹ tests 401 ℹ pass 397 ℹ fail 3 ℹ cancelled 0 ℹ skipped 1
  FAIL    3 test/scripts/_archive/protocol-section-24.integration.node.test.ts
  cli git-status delta: none
  meta-repo git-status delta: none
```
Nested default tier alone: tests 367 pass 366 fail 0 cancelled 0 skipped 1, deltas none/none.
Nested integration tier alone: tests 34 pass 31 fail 3 (protocol-section-24, pre-existing), deltas none/none.
The 2 extra default files (migrate-status-to-completed.red, scaffold-layout.red; OD-2/OD-3 edits): 39 pass, 0 fail, deltas none/none.

## Per-tier passing vs base
| Tier | Base (89f0230) | Now (base file set) |
|---|---|---|
| nested default (28 files + report-filename) | 346 + 8 = 354 | 327 (366 - 39 from the 2 extra files) = 354 - 27 moved |
| nested integration (2 R4 files) | 4 | 31 = 4 + 27 moved |
| total | 358 (350 + report-filename 8) | 358 |
Parity: 358 >= 358. A title multiset comparison (all ✔ lines) of base logs vs final logs finds zero base titles missing.

## Greps
Scenario 4 (plan §Verification greps, default-tier .ts incl. helper modules): no output. Scenario 5 (`/(Users|home)/[^/'"]+/.*ClearGate`): no output.

## Moved titles (27 tests, titles unchanged; each appears once across tiers)
- close-sprint-assume-ack-guard.live: `root CLAUDE.md: sprint-close guardrail mentions CLEARGATE_CI_ACK`
- close-sprint-step-2-6c.live: `live and canonical close_sprint.mjs are byte-identical`
- close-sprint-step-7-4.live: `diff between live and canonical close_sprint.mjs is empty (mirror parity)`
- enforcement-section-13.live (5): `CLAUDE.md (live) does NOT contain "Sprint Execution Gate." paragraph (moved to skill)`; `CLAUDE.md (live) does NOT contain the old "(CR-021)" parenthetical`; `CLAUDE.md (live) contains the sprint-execution skill pointer (R2)`; `Sprint execution skill pointer is identical in live and canonical CLAUDE.md`; `live and canonical enforcement.md are byte-identical`
- migrate-schema-v3.live (5): `migrator exits 0 on SPRINT-28 fixture copy`; `schema_version becomes 3 in the fixture copy`; `execution_mode key is absent in the fixture copy`; `all other fields from SPRINT-28 state.json are preserved in fixture copy`; `the live SPRINT-28 state.json is NOT modified by this test`
- scaffold-relocation.live (4): `the executable set under scaffold/ equals the tracked 100755 set in the pre-relocation snapshot`; `CLAUDE.md Dogfood split section names both new scaffold roots as canonical`; `CLAUDE.md keeps the literal "NPM payload (generated, gitignored)" label`; `cleargate-planning/DEPRECATED.md exists and names both new roots`
- serial-twins.red.integration (1, git mv): `Test 28 — the three scaffold scripts are byte-identical between canonical and the live outer mirror`
- status-vocab-phase-b.live (2): `pending-sync has no status: Done or status: Verified frontmatter lines`; `archive has no status: Done or status: Verified frontmatter lines`
- template-claude-md.live (7): `live CLAUDE.md contains "Ambiguity Gate criteria are evaluated literally"`; `live and canonical CLAUDE.md literal-rule paragraph text is byte-identical`; `template {Bug,CR,epic,hotfix,story}.md: live preamble region === canonical preamble region` (5)

## Notes
- Task Breakdown rows in the story file were not ticked (off-sprint, story file not in this commit's surface); the work for every row is done.
- Full default `npm test` nested was not run (not in the orchestrator's done list); QA should run it per story §4.2.
- A stray empty file `test/helpers/rap-script.red.node.test.ts` created by a bad `sed -i` was deleted before any commit.
- No test failed for a non-location reason.

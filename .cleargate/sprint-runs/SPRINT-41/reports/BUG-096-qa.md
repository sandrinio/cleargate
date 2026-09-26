role: qa

# BUG-096 — QA-Verify report

```
STORY: BUG-096
QA: PASS
TYPECHECK: pass
TESTS: 3 passed, 0 failed, 0 skipped (init-fixture-cleanup.red.node.test.ts, solo; scoped to touched-file neighborhood per lane playbook)
ACCEPTANCE_COVERAGE: 3 of 3 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none
VERDICT: ship it — diff matches the pinned change shape byte-for-byte, stays inside the mkShortTmpDir region, no caller/src edits; all 3 QA-Red scenarios are red-now-green (CR-081); every anchor and every caller of init-fixture.ts is green at its pinned/expected count; M2 baseline hash and file count unchanged (read-only); leak probe shows zero net new /tmp entries.
```

## Commit / worktree

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-096/cleargate-cli`, branch `story/BUG-096`.
- QA-Red `1619fad`, Developer `266c1ba`, base `35580b0` (STORY-058-09 merge; cli-only item, no upstream per Rule 19/CR-124).
- `git diff 35580b0 266c1ba --stat`: `test/helpers/init-fixture-cleanup.red.node.test.ts` (221 new lines, QA-Red) + `test/helpers/init-fixture.ts` (26 insertions / 1 deletion, Dev). No other files.
- `git diff 1619fad 266c1ba` shows the Dev-only delta is exactly `TRACKED_TMP_DIRS`, `cleanupRegistered`, `registerTmpCleanup()`, the rewritten `mkShortTmpDir`, and the new `trackedTmpDirs()` export — byte-for-byte the pinned shape in `plans/M5-fixwave.md` §BUG-096, entirely inside the `mkShortTmpDir` region. No caller file, no `src/**` touched.

## Diff-vs-plan check

`npm run typecheck` in `<cw>`: clean (exit 0, tsc --noEmit).

## Counts table (all solo, `npm run test:file -- <file>`)

| File | Tests | Pass | Fail | Skip | Expected | Match |
|---|---|---|---|---|---|---|
| `test/helpers/init-fixture-cleanup.red.node.test.ts` | 3 | 3 | 0 | 0 | 3/3 (red→green, CR-081) | yes |
| `test/commands/init-host-selection.red.node.test.ts` | 10 | 10 | 0 | 0 | 10/10 | yes |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13 | 13 | 0 | 0 | 13/13 | yes |
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19 | 19 | 0 | 0 | 19/19 | yes |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 5 | 5 | 0 | 0 | 5/5 | yes |
| `test/commands/init-host-parity.red.integration.node.test.ts` (same baseline env) | 15 | 15 | 0 | 0 | 15/15 | yes |
| `test/commands/init.node.test.ts` | 29 | 29 | 0 | 0 | — | yes |

**Every other file importing `test/helpers/init-fixture`** (`command grep -rl "helpers/init-fixture" test`), solo:

| File | Tests | Pass | Fail | Skip |
|---|---|---|---|---|
| `test/commands/uninstall-reinit.red.node.test.ts` | 4 | 4 | 0 | 0 |
| `test/commands/verify-install-cli.red.integration.node.test.ts` | 5 | 5 | 0 | 0 |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16 | 16 | 0 | 0 |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3 | 3 | 0 | 0 |
| `test/commands/verify-install.red.node.test.ts` | 42 | 42 | 0 | 0 |
| `test/hosts/host-lifecycle.red.node.test.ts` | 17 | 17 | 0 | 0 |

All green, none regressed.

## M2 baseline integrity (read-only)

`find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → 425 (unchanged).
`find … -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — matches the required hash exactly. Baseline never written to.

## Leak evidence

Solo run of `test/commands/init-host-selection.red.node.test.ts` (10/10 pass), attributed by name diff (other lanes run the unpatched fixture concurrently against the same `/tmp`, per sprint-context Rule 20):

```
before = 364 entries matching /private/tmp/cg-s41-fix-* /private/tmp/cg-s41-payload-*
after  = 364 entries (identical set)
comm -13 before after → (empty — zero new entries)
comm -23 before after → (empty — nothing removed either; set is byte-identical)
```

Zero net new `/tmp` entries attributable to this run — the exit-hook cleanup is load-bearing, not incidental.

## Gherkin → test map

| Gherkin scenario (BUG-096 §5 / M5-fixwave §BUG-096) | Test | Result |
|---|---|---|
| "Scenario and payload dirs are removed when the test process exits" | B1 `removes the scenario and payload dirs when the child exits normally` | PASS (red-now-green, CR-081) |
| "Cleanup also runs when the test process fails" | B2 `cleans up even when the child throws after the scenario runs` | PASS (red-now-green, CR-081) |
| "A captured baseline survives cleanup" | B3 `never tracks a captured baseline dir for cleanup, and the baseline survives` | PASS (red-now-green, CR-081) |

3 of 3 scenarios covered. No `deferred_verification` entry on this bug — full-PASS branch applies (CR-081 × CR-082 decision order, step b).

## DoD / Task Breakdown (advisory)

Bug's `## Task Breakdown` (4 rows) is unticked in the outer pending-sync file — Dev's report explains this is out of the cli-only dispatch's scope (the outer host worktree is a detached `sprint/S-41` checkout with no story branch to commit the tick to) and lists all 4 as done with evidence pointers. Advisory per EPIC-054 WS7 — not a bounce criterion; flagging for the orchestrator/DevOps to tick at the boundary step, as the Dev report itself requests.

Verification Protocol command (`npm run test:file -- test/helpers/init-fixture-cleanup.red.node.test.ts`, solo) run and green, matching §5's required minimum (3 unit tests, 0 integration, 0 e2e).

## Worktree / checkout statuses

```
<cw> (cleargate-cli, story/BUG-096): clean, HEAD 266c1ba
outer host worktree (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-096): clean, detached HEAD 42f4fbc4 (BUG-090 QA-Red report; unrelated concurrent lane, not this dispatch)
outer main checkout (/Users/ssuladze/Documents/Dev/ClearGate, sprint/S-41): only pre-existing/concurrent orchestrator+ledger writes
  M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
  M .cleargate/sprint-runs/SPRINT-41/events.jsonl
  M .cleargate/sprint-runs/SPRINT-41/state.json
  M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
No back-sync, no stash/checkout/reset, no edits or commits made by this QA-Verify dispatch. No bare `cleargate` invoked; the cli main checkout was never touched.

## flashcards_flagged

```yaml
flashcards_flagged: []
```

Both mechanics-relevant flashcards for this bug (`#worktree #git #danger` shared-stash-stack rule; `#qa-red #test-harness #tmp` snapshot-diff self-cleanup) are already recorded in `.cleargate/FLASHCARD.md` by QA-Red / the Dev-incident note — nothing new to add.

# BUG-097 — Developer report

role: developer

```
STORY: BUG-097
STATUS: done
COMMIT: 7993d37 (cli story/BUG-097)
TYPECHECK: pass
TESTS: 198 passed, 0 failed (74 targeted-file + 124 cross-file-anchor, all solo; excludes 2 out-of-scope integration-tier files with pre-existing unrelated failures — see below)
FILES_CHANGED:
  - cleargate-cli/src/commands/gate.ts
  - cleargate-cli/src/commands/scaffold-lint.ts
  - cleargate-cli/src/commands/stamp.ts
  - cleargate-cli/src/commands/wiki-query.ts
NOTES: All four pinned change shapes landed as specified, with one adaptation the blueprint prose didn't pin: the sealed S2/S3 tests type `buildDiffPreview` as returning `string[]` and call array methods (`.includes`/`.filter`/`.some`) on the result directly, not on a joined string — so the export now returns `string[]` and `stampHandler` joins with `\n` at the one call site (preserving the single-stdout-call shape S1/S4 already pin). `runScaffoldLint`'s now-unused `stdoutFn` parameter was dropped (noUnusedParameters:true would otherwise fail typecheck); it was private and not imported by any test. Ran two extra out-of-scope integration-tier files for due diligence (`gate-v2.integration.node.test.ts`, `foreign-repo.integration.node.test.ts`); both have pre-existing failures in code paths my diff never touches (gateQaHandler/gateArchHandler run_script.sh routing; `.install-manifest.json` field assertions) — confirmed disjoint from the edited lines, not a regression, and both are excluded from the default `npm test` tier per package.json. Two `.script-incidents/*.json` files that gate-v2's own synthetic SPRINT-99 fixture produced were deleted before commit (not part of scope). Task Breakdown checkboxes in the outer BUG-097 item file were left untouched: this is a cli-only item, the outer host worktree is detached (no branch), and the dispatch's Scope section restricts edits to the 4 cli src files — ticking those boxes has no commit surface available to me here and is left to the orchestrator/DevOps.
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }
  - { r_id: "R2", covered: true, deferred: false, clarified: false }
  - { r_id: "R3", covered: true, deferred: false, clarified: false }
  - { r_id: "R4", covered: true, deferred: false, clarified: false }
  - { r_id: "R5", covered: true, deferred: false, clarified: false }
plan_deviations:
  - { what: "buildDiffPreview returns string[] instead of a joined string", why: "sealed QA-Red tests S2/S3 type the export as string[] and call array methods on it directly; blueprint prose didn't pin a return shape", orchestrator_confirmed: false }
  - { what: "dropped unused stdoutFn param from private runScaffoldLint helper", why: "noUnusedParameters:true fails typecheck once the early-return print is deleted; helper is unexported, no test imports it directly", orchestrator_confirmed: false }
adjacent_files: []
flashcards_flagged:
  - "2026-09-26 · #cli #stamp #test-harness · buildDiffPreview: a sealed test can pin string[] return while blueprint prose implies a joined string."
```

## R-mapping (from BUG-097 §5 Gherkin)

- R1 — `gate check -v` on a pass prints per-criterion `[pass]` lines after the summary (G1).
- R2 — `gate check -v` on a failure keeps `❌`/`⚠` lines before per-criterion detail (G2, G3 anchors — preserved behavior).
- R3 — `stamp --dry-run` renders scalar/nested-object values readably, never `[object Object]`, and a real change still shows `-`/`+` (S1, S2, S3, S4).
- R4 — `wiki query` prints each match's wikilink exactly once (Q1, Q3; Q2 anchor for the non-`- [[`-prefixed case).
- R5 — `scaffold-lint` prints `clean` exactly once on every clean path (L1, L2, L3).

FJ-6 (`stamp_error` on a fresh draft) is explicitly out of scope per the item's own Open Questions — by-design, not a requirement here.

## Per-file test counts (solo)

| File | Total | Pass | Fail |
|---|---|---|---|
| `test/commands/gate-unit.node.test.ts` | 28 | 28 | 0 |
| `test/commands/stamp.node.test.ts` | 10 | 10 | 0 |
| `test/wiki/query.node.test.ts` | 26 | 26 | 0 |
| `test/commands/scaffold-lint.node.test.ts` | 10 | 10 | 0 |
| **Total** | **74** | **74** | **0** |

Matches the QA-Red pinned totals exactly (7 reds + 6 anchors, now all green, plus the pre-existing 61).

## Cross-file anchors (solo)

| File | Tests | Pass | Fail |
|---|---|---|---|
| `test/commands/gate.node.test.ts` | 3 | 3 | 0 |
| `test/commands/stamp-tokens.node.test.ts` | 9 | 9 | 0 |
| `test/commands/cli-gating.node.test.ts` | 20 | 20 | 0 |
| `test/commands/sprint-preflight.node.test.ts` (grep-discovered importer) | 27 | 27 | 0 |
| `test/lib/work-item-type-spike.node.test.ts` (grep-discovered importer) | 12 | 12 | 0 |
| `test/lib/frontmatter-writers.red.node.test.ts` (grep-discovered importer, sealed BUG-067 reds) | 30 | 30 | 0 |
| `test/cli.node.test.ts` (post-`npm run build`, spawns dist) | 23 | 23 | 0 |

`npm run typecheck` — clean.

## Out-of-scope integration-tier files (grep-discovered, run for due diligence)

- `test/commands/gate-v2.integration.node.test.ts` — 3/5 fail. Imports `gateQaHandler`/`gateArchHandler` (line 422/457), disjoint from the edited `gateCheckHandler` block (line ~311-336, ends before 341). Failures are about `run_script.sh` argument order (`pre_gate_runner.sh` vs `bash`) — pre-existing, unrelated to this diff. Excluded from default `npm test` (package.json:46 filters `*.integration.node.test.ts`), and not in the QA-Red pinned anchor list.
- `test/integration/foreign-repo.integration.node.test.ts` — 2/7 fail (ran until timeout budget; failures on Scenarios 1-2, unrelated to scaffold-lint). Failure is `.install-manifest.json cleargate_version field` assertion — an `init`/manifest surface my diff never touches. Its own Scenario-3 scaffold-lint assertion uses `.toContain('scaffold-lint: clean')`, compatible with either 1 or 2 occurrences, so it isn't discriminating for BUG-097 either way.
- Two e2e red-integration files that import `gateCheckHandler` (`frontmatter-authoring.red.integration.node.test.ts`, `spidr-coverage.red.integration.node.test.ts`) were not run: neither passes `verbose: true`, so the edited branch is inert for them regardless of outcome.

## Git status (all three trees)

```
$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-097/cleargate-cli status --porcelain
(clean)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-097 status --porcelain
(clean, HEAD detached)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/delivery/pending-sync/... (28 pre-existing items from parallel lanes)
 M .cleargate/sprint-runs/SPRINT-41/{.session-totals.json,events.jsonl,plans/replan-contract-first.md,state.json,token-ledger.jsonl}
?? .cleargate/sprint-runs/SPRINT-41/reports/CR-124-tpv-reseal.patch
```
The outer main-checkout diffs pre-date this dispatch (parallel lanes / hook-owned ledgers); this Developer dispatch made no outer edits — cli-only item, outer host worktree stayed detached.

## Script Incidents

None from my own commands. Two incident files (`_off-sprint/.script-incidents/*.json`) were produced as a side effect of running the out-of-scope `gate-v2.integration.node.test.ts` (it spawns `run_script.sh` against a deliberately-missing synthetic `.worktrees/STORY-99-01` fixture as part of its own test design) and were deleted before commit — not part of this item's scope.

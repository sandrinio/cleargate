# BUG-097 — QA-Verify report

role: qa

```
STORY: BUG-097
QA: PASS
TYPECHECK: pass
TESTS: 208 passed, 0 failed, 0 skipped (all in-scope targeted + anchor + grep-discovered-importer + e2e-red + dist-cli files, solo); plus 2 out-of-scope integration-tier files with 5 pre-existing failures confirmed disjoint from this diff (see Regressions)
ACCEPTANCE_COVERAGE: 7 of 7 Gherkin scenarios (outline counted per-example, matching the item's own §5 minimum-count table) have matching passing tests
MISSING: none
REGRESSIONS: none
VERDICT: Ship it. Diff shape matches the M5-fixwave.md blueprint exactly (4 src/commands/*.ts files only, test files sealed and untouched since qa-red d41efe0). Typecheck clean. All 4 targeted files plus every anchor, cross-file importer, e2e red, and the post-build dist smoke are green. Both deviations are sound (sealed-test-driven, cosmetic, no other callers). The behavioural smoke against the real fresh-journey fixture confirms all 4 FJ defects are fixed with no unintended writes. Two disjoint integration-tier files carry pre-existing unrelated failures, reproduced and confirmed out of this diff's blast radius by code-region disjointness, not counted against acceptance.
flashcards_flagged:
  - "2026-09-26 · #qa #gate · gate check skips the frontmatter rewrite when cached_gate_result is already current; verify via git diff, not plan prose."
```

## 1. Diff shape vs blueprint

`git diff 35580b0 7993d37 --stat`: 8 files, 4 src + 4 test (sealed at qa-red, byte-identical dev-side: `git diff d41efe0 7993d37 --stat` touches only the 4 `src/commands/*.ts` files). No `scaffold/**`, no `CHANGELOG.md` (plan does not require one for this item), no new test files.

Per-file change shape checked against the pinned blueprint (M5-fixwave.md §BUG-097 "Change shapes (pinned)"):
- `gate.ts:311-336` — the `if (opts.verbose)` block moved out of the failure `else`, runs after either branch, format unchanged. Matches pinned shape exactly.
- `stamp.ts:25-58,122` — `renderValue`/`sameValue` added exactly as pinned; `buildDiffPreview` exported; call site joins with `\n`. Matches, modulo the return-type deviation ruled below.
- `wiki-query.ts:53-70,141` — `stripLeadingWikilink` added, byte-equivalent to the pinned algorithm (prefix check, `trimStart()`, drop one leading `— `). Matches pinned shape exactly.
- `scaffold-lint.ts:59,76-125` — the early-return print deleted; the handler's single print now covers the clean path. Matches pinned shape (the dropped `stdoutFn` param is a plan deviation, ruled below).

## 2. Typecheck + targeted tests (solo)

`npm run typecheck` in `<cw>` — clean, exit 0.

| File | Tests | Pass | Fail |
|---|---|---|---|
| `test/commands/gate-unit.node.test.ts` | 28 | 28 | 0 |
| `test/commands/stamp.node.test.ts` | 10 | 10 | 0 |
| `test/wiki/query.node.test.ts` | 26 | 26 | 0 |
| `test/commands/scaffold-lint.node.test.ts` | 10 | 10 | 0 |

Matches QA-Red's pinned totals (7 red now green: G1, S1, S2, S3, Q1, Q3, L1; 6 preserved-behavior anchors: G2, G3, S4, Q2, L2, L3).

**Named anchors:**

| File | Tests | Pass | Fail |
|---|---|---|---|
| `test/commands/gate.node.test.ts` | 3 | 3 | 0 |
| `test/commands/stamp-tokens.node.test.ts` | 9 | 9 | 0 |
| `test/commands/cli-gating.node.test.ts` | 20 | 20 | 0 |

**Grep-discovered importers of the 4 changed modules** (`command grep -rl` for each module path in `test/`), non-integration:

| File | Tests | Pass | Fail |
|---|---|---|---|
| `test/lib/work-item-type-spike.node.test.ts` | 12 | 12 | 0 |
| `test/commands/sprint-preflight.node.test.ts` | 27 | 27 | 0 |
| `test/lib/frontmatter-writers.red.node.test.ts` | 30 | 30 | 0 |

**E2E red-integration importers of `gate.ts` (Dev flagged as inert but did not run; I ran both for due diligence — neither passes `verbose: true` per a `command grep -n verbose` on both files, confirmed inert, and both are fully green):**

| File | Tests | Pass | Fail |
|---|---|---|---|
| `test/e2e/frontmatter-authoring.red.integration.node.test.ts` | 9 | 9 | 0 |
| `test/e2e/spidr-coverage.red.integration.node.test.ts` | 1 | 1 | 0 |

**Post-build dist smoke** (`npm run build` in `<cw>`, then):

| File | Tests | Pass | Fail |
|---|---|---|---|
| `test/cli.node.test.ts` | 23 | 23 | 0 |

## 3. Deviation rulings

1. **`buildDiffPreview` returns `string[]` instead of a joined string.** ACCEPT. QA-Red's own sealed S2/S3 tests (`d41efe0`, unmodified by Dev) call `.includes`/`.filter`/`.some` directly on the return value — arrays only, not a string. The sealed test is the real contract, and blueprint prose ("has lines ...") was ambiguous on return shape, not prescriptive. `command grep -rn buildDiffPreview src/ test/` shows exactly one call site (`stamp.ts:122`, joins with `\n`, preserving the single-`stdout()`-call shape S1/S4 pin) and the two sealed-test imports — no other caller breaks. This flashcard is already recorded (`FLASHCARD.md:12`, `#cli #test-harness`); not re-flagged.
2. **`runScaffoldLint` dropped the dead `stdoutFn` param.** ACCEPT. The helper is private/unexported (`command grep -rn runScaffoldLint src/ test/` shows only its own definition and the one internal call site in `scaffoldLintHandler`); no test imports it directly. Required to keep `noUnusedParameters: true` clean once the early-return print was deleted. Cosmetic, no external surface.

## 4. Behavioural smoke (fresh-journey fixture, `/private/tmp/cg-s41-fresh-journey`)

Per M5-fixwave.md's own BUG-097 DevOps hand-recheck instruction, reused the existing fresh-journey scratch project (not a new mktemp — this is the Architect-pinned re-check target and the "before" state is the fresh-journey-smoke.md report's own recorded evidence). Ran the fixed dist (`<cw>/dist/cli.js`, built from `7993d37`) against it, one call per command:

**FJ-2 (gate check -v on a pass).**
- Before (fresh-journey-smoke.md FJ-2 evidence): `Gate: ...` + `✅ ... passed (12 criteria)` — 2 lines, no detail.
- After: same 2 lines, then 12 `[pass] ...` lines, one per criterion. Fixed.

**FJ-3 (stamp --dry-run [object Object]).**
- Before: ` cached_gate_result: [object Object]` / ` draft_tokens: [object Object]`.
- After: ` cached_gate_result: {"pass":true,"failing_criteria":[],"last_gate_check":"2026-09-26T08:58:03Z","transition":"ready-for-decomposition"}` and the `draft_tokens` object similarly, both as single unchanged-context lines (no `[object Object]` anywhere in output); the genuinely-changed `updated_at`/`updated_at_version` keys still show as `-`/`+` scalar lines. Fixed, and the "real change still shows -/+" edge case holds.

**FJ-4 (wiki query duplicate wikilink).**
- Before: `- [[EPIC-001]] — - [[EPIC-001]] (epic) — Draft — Task Storage`.
- After: `- [[EPIC-001]] — (epic) — Draft — Task Storage`, exactly one `[[EPIC-001]]` occurrence. Fixed.

**FJ-5 (scaffold-lint double clean).**
- Before: `scaffold-lint: clean` printed twice.
- After: printed once. Fixed.

**Side-effect check:** `git -C /private/tmp/cg-s41-fresh-journey status --porcelain` after all 4 commands shows no diff on `EPIC-001_task_storage.md` (the plan's prose claim that `gate check` "writes the cached gate into the scratch project only" did not materialize here — the on-disk `cached_gate_result`/`last_gate_check` already matched, so no rewrite occurred; confirmed via `git diff --stat`, empty). The 3 modified `STORY-*` files and the untracked `.cleargate/sprint-runs/` dir already existed from the original fresh-journey-smoke.md session (step 10e) and are unrelated to this dispatch.

## 5. Regressions (2 out-of-scope integration-tier files, reproduced)

- **`test/commands/gate-v2.integration.node.test.ts`**: 2/5 pass, 3/5 fail. Failures are all in `gateQaHandler` (`gate.ts:422`) / `gateArchHandler` (`gate.ts:457`) — a `run_script.sh pre_gate_runner.sh` argv-ordering assertion (`actual: 'bash', expected: 'pre_gate_runner.sh'`). The edited region is `gateCheckHandler`, `gate.ts:152-341` (verbose block at `:320-336`), fully disjoint from `:422`/`:457`. Confirmed pre-existing and unrelated by code-region disjointness (matches Dev's claim).
- **`test/integration/foreign-repo.integration.node.test.ts`**: 4/6 pass, 2/6 fail (Scenario 1 + Scenario 2, "Init into blank Node/bare Go repo"). Failure is an `.install-manifest.json cleargate_version field` assertion, an init/manifest surface untouched by this diff. **Scenario 3 ("scaffold-lint on installed Node scaffold is clean"), the one scenario that exercises the changed code, passed** — its assertion is `toContain('scaffold-lint: clean')`, compatible with either 1 or 2 occurrences, so it wasn't discriminating either way, and it stayed green.

Both files are excluded from the default `npm test` tier (`*.integration.node.test.ts` filter) and from the QA-Red pinned anchor list. Neither is a regression introduced by this diff.

## 6. Gherkin → test map (BUG-097 §5)

| Gherkin scenario | Test(s) | Status |
|---|---|---|
| `gate check -v` prints per-criterion detail on a pass | G1 | red → green |
| `gate check -v` on a failure keeps its output | G2 (anchor); G3 (advisory-gate anchor, extra) | green (unchanged) |
| stamp outline: nested object, unchanged → one JSON line | S1; S3 (extra, two separately-built equal objects) | red → green |
| stamp outline: nested object, changed → `-`/`+` JSON lines | S2 | red → green |
| stamp outline: scalar, changed → `-`/`+` scalar lines | S4 (anchor) | green (unchanged) |
| wiki query prints each match's wikilink once | Q1 (index row); Q3 (code-map row) | red → green |
| (implicit) a non-`- [[`-prefixed excerpt renders unchanged | Q2 (anchor) | green (unchanged) |
| scaffold-lint says clean once in a target repo | L1 | red → green |
| (implicit) clean-with-planning-dir / findings paths unchanged | L2, L3 (anchors) | green (unchanged) |

All 7 scenarios in the item's own minimum-count table (outline counted per-example) have matching passing tests; no MISSING entries. Per CR-081, the 7 originally-red tests (QA-Red `d41efe0`, `BASELINE_FAIL: 7`) now passing against Dev's commit fully satisfy acceptance coverage — no separate green-path file required or expected, and none was added.

## 7. Task Breakdown (advisory)

All 7 `- [ ]` rows in the item's `## Task Breakdown` remain unchecked in the pending-sync file. Per the Dev report, this is because the item is cli-only, the outer host worktree stays detached with no commit surface, and the dispatch scope restricted edits to the 4 cli src files. Advisory only, not a bounce criterion — the underlying work (QA-Red tests, all 4 src fixes, typecheck) is verified done above; ticking the boxes is an orchestrator/DevOps bookkeeping step against the outer item file.

## 8. Git status (all three trees)

```
$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-097/cleargate-cli status --porcelain
(clean)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-097 status --porcelain
(clean, HEAD detached)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/reports/BUG-090-qa-red-reseal.md
```
The 4 modified files are the pre-existing hook-owned ledger/session files (not written by this dispatch). The untracked `BUG-090-qa-red-reseal.md` belongs to a parallel lane, not this dispatch. This QA dispatch made no edits, no commits, and no writes to any tracked path anywhere — it did transiently create 2 untracked `.script-incidents/*.json` files in `<cw>` as a side effect of running `gate-v2.integration.node.test.ts` (same synthetic-fixture side effect Dev's own report describes); both were deleted before finishing, and `<cw>` is confirmed clean above. The `/private/tmp/cg-s41-fresh-journey` scratch fixture used for the behavioural smoke was not modified (verified via `git status --porcelain` there, §4).

## Script Incidents

None attributable to this dispatch's own commands. Two transient `.script-incidents/*.json` files appeared under `<cw>/.cleargate/sprint-runs/_off-sprint/.script-incidents/` as a side effect of running the out-of-scope `gate-v2.integration.node.test.ts` (its own synthetic-fixture design, per Dev's report); deleted before finishing (§8).

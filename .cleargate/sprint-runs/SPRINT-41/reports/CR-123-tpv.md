# CR-123 TPV — Round 1

role: architect

## Verdict

`TPV: BLOCKED-WIRING-GAP — S7's extractGateBlock(text, 'epic') matches the first epic yaml block (ready-for-decomposition, readiness-gates.md:108-139), which has no gherkin-error-path, so S7-1 and S7-2 read `null` today and after any correct fix; key the extractor on `transition: ready-for-coding`.`

Inputs: cli `story/CR-123` at QA-Red `eaa4c62`. Outer worktree `.worktrees/CR-123` at `1ccbf3d7`. CR-123 body. M1 plan §CR-123 (`plans/M1.md:30-146`). QA-Red report.

## The gap (the only blocker)

- The helper is at `test/lib/readiness-predicates-spidr-coverage.red.node.test.ts:397-401`. Its regex is ```` ```yaml\n- work_item_type: epic\n[\s\S]*?\n``` ````, and the lazy match stops at the first closing fence.
- The gates doc holds **two** epic blocks. `ready-for-decomposition` spans `:108-139` and has no `gherkin-error-path`. `ready-for-coding` spans `:141-158`, and its `:150` line is the one CR-123 tightens.
- M1 plan `:32` forbids touching the `ready-for-decomposition` block. So no correct implementation can put `gherkin-error-path` where the helper looks.
- Observed at baseline (worktree, override set): S7-1 gives `actual: null, expected: "body contains 'Scenario: Error'"`. S7-2 fails its guard with `gherkin-error-path check missing from the epic gate block`. They are red for the wrong reason. The QA-Red report files them as "doc-content mismatches", but the helper never reaches the doc line.
- **Proof.** I built a scratch copy: a minimal contract-conformant `evalSpidrCoverage`, plus simulated canonical template and gates-doc edits per M1 plan `:71-86`. Result: 41/43 pass, and the only reds are S7-1 and S7-2. I then swapped in an extractor keyed on the transition (```` ```yaml\n- work_item_type: epic\n  transition: ready-for-coding\n[\s\S]*?\n``` ````):
  - 32/32 pass against the scratch fix.
  - Against the unedited worktree, S7-1 goes red for the right reason (`actual: "body contains 'Error'"`).
  - The scratch was deleted afterwards. Neither repo was edited.

**QA-Red fix (same file, test-only):**
1. Locate the epic block by `work_item_type: epic` **and** `transition: ready-for-coding` in S7-1 and S7-2.
2. In S8 "NOT registered in the epic" (`:476-481`), assert absence across **both** epic blocks (for example `text.matchAll` over every epic yaml fence). Today it checks only `ready-for-decomposition`, so the guard is vacuous for the block that matters.
3. Story, cr and bug each have exactly one block (`:160`, `:193`, `:220`), so S8's other three lookups are sound.

## Check-by-check

| # | Check | Result |
|---|---|---|
| 1 | Imports resolve | PASS. `evaluate` (`src/lib/readiness-predicates.ts:166`) and `ParsedDoc` (`:27`) exist. The doctrine test imports only node builtins plus dynamic `js-yaml` (`:190`), which is present in cli `node_modules`. |
| 2 | Signatures | PASS. `evaluate(predicate, doc, opts?)` returns `{pass, detail}`. `makeDoc` builds `{fm, body, absPath}`, matching `ParsedDoc`. `'spidr-coverage'` is the bare shape string M1 plan `:37` names. `body contains 'Scenario: Error'` parses via `:79` and is not a heading needle (`headingTitleOf`, `:475`). |
| 3 | Fixtures exist | PASS, except the S7 extractor above. All fixtures are inline strings except the canonical templates and gates doc read via `CANON`. Those exist in the worktree, and `templateBodyOf` works on all four: `<instructions>` precedes the first `---` in story `:1-65`, CR `:1-29`, Bug `:1-29` and epic `:1-34`. |
| 4 | Cleanup | PASS. Both files are read-only: no `writeFileSync`, `mkdtemp` or hooks, so no after-hook is required. |
| 5 | Naming | PASS. `*.red.node.test.ts` is the unit layer per sprint-context §Test Stack. |

## Dispatch questions

**A — which file each doc assertion reads.** The spidr test roots at `META_ROOT = CLEARGATE_META_ROOT ?? <cli>/..` (`:75-80`) and `CANON = META_ROOT/cleargate-planning/.cleargate`. S1 and S7-4 read the canonical templates. S7-1, S7-2 and S8 read the canonical `knowledge/readiness-gates.md`. With the override set to `.worktrees/CR-123`, every read hits the worktree **canonical**, never the live `.cleargate/` twin. Nothing reads MAIN or `cleargate-cli/templates/cleargate-planning`. S7-2 does read the check dynamically, from canonical (subject to the extractor gap). The live twins are covered only by CR §4 item 11 (`diff -q`, hand check).

**B — the doctrine test.** It honours the override: `REPO_ROOT = CLEARGATE_META_ROOT ?? <cli>/..` (`test/docs/test-layers-declared-doctrine.red.node.test.ts:79-83`), and `CANON_ROOT = REPO_ROOT/cleargate-planning`. The moved `:328` assertion reads the canonical gates doc. The moved `:358` assertion reads `CLI_ROOT/src/lib/readiness-predicates.ts`, the branch file. With the override, both go green before the merge on a correct implementation (proved in scratch). Without the override it reads MAIN and stays red until the outer merge. That is expected, and it is not a gap.

**C — can a correct implementation pass every scenario?** Yes, once the S7 extractor is fixed (32/32 proved).
- **S1** reads the templates the Developer will edit. That is compatible: "unedited" means "unfilled". Before the template edit a correct predicate returns `not-applicable` and S1 stays red. After the edit, the template's column-0 lead-in and `{T or F}` table fail with a Cover-cell detail and S1 goes green. S1 therefore *requires* the template edit, which is the T8 idiom. It is not a false premise.
- **S7-4** also reads the live-to-be-edited `epic.md`. It stays green only if the epic skeleton keeps the brace before `Error` (`Scenario: {Error — …}`, M1 plan `:77`).
- **Self-fire.** Column 0 plus fence awareness passes all three S2 cases. S2-3 puts the lead-in at **column 0** inside a 4-backtick ```` ````markdown ```` fence, so the trigger's fence tracking must be generic. The gherkin-tag regex from M1 plan `:68` does not match ```` ````markdown ````. CR-123's real body is safe even without fence awareness: every mention (`:47`, `:81` at 2-space indent, `:107`, `:178`) is off column 0.

**D — naming, cleanup, typecheck.** Naming and cleanup PASS (above).
- **Typecheck:** `npm run typecheck` in the cli checkout exits 0, both run directly and through `run_script.sh`.
- The cli `tsconfig.json` excludes `**/*.test.ts`, so that command does not cover the red files. I checked them separately with a scratch tsconfig that extends the cli config (strict, `noUnusedLocals`), including both red files: `tsc` exit 0.
- **Pre-gate `typecheck: exit 254`** is structural. The outer worktree has no nested `cleargate-cli`, the same cause as `BUG-067-tpv.md:13`. It is not a code defect.

## Developer hints (binding on a correct implementation; derived from test wiring)

1. Trigger fence tracking must be generic: an opener of 3 or more backticks or tildes with any info string, closed by the same character at a length ≥ the opener. Do not reuse the gherkin-only regexes for the trigger. They stay correct for tag collection.
2. A Cover-cell failure detail must contain the axis name **and** `Cover` or `T or F`, because S1 asserts `/t or f|cover/i`. Every other failure detail must contain the axis name.
3. Keep the epic skeleton as `Scenario: {Error — …}`, with the brace before `Error`, or S7-4 flips red.
4. Add no `---` line inside any template `<instructions>` block. `templateBodyOf` (`:96-103`) keys on the first `---` line.
5. In story, CR and Bug, the lead-in sits at column 0 outside any fence, and the table is the first `|` block after it.

## Test commands

The Developer runs these from the cli on `story/CR-123`. QA-Verify runs the same.

```bash
cd /Users/ssuladze/Documents/Dev/ClearGate && bash .cleargate/scripts/run_script.sh bash -c "cd cleargate-cli && \
  CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-123 npm run test:file -- \
  test/lib/readiness-predicates-spidr-coverage.red.node.test.ts \
  test/docs/test-layers-declared-doctrine.red.node.test.ts \
  test/lib/readiness-predicates-test-layers-declared.red.node.test.ts"
bash .cleargate/scripts/run_script.sh bash -c "cd cleargate-cli && npm run typecheck"
```

No override; these are vacuous for spidr before the merge (M1 plan `:110-115`): `npm run test:file -- test/commands/gate-unit.node.test.ts test/lib/readiness-predicates.node.test.ts test/lib/work-item-type-spike.node.test.ts`. Never set `CLEARGATE_META_ROOT` on a full-suite run, and never `npm run build` on the story branch.

Expected at green: spidr 32/32, doctrine 11/11, test-layers 17/17.

## Open decisions for orchestrator (non-blocking)

- M1 plan scenario 10 (the E2E through `newHandler` → `gateCheckHandler`, `plans/M1.md:104`) and the CR's declared "E2E 2" (`CR-123:195`) are absent from the red suite. QA-Red mapped CR §4 items 1-7 only. That is a coverage question, not a wiring one. Since the file is bouncing to QA-Red anyway, decide whether to add it in the same round.

## Script Incidents

None. The wrapped typecheck exited 0. The scratch proof ran from the session scratchpad and has been deleted.

flashcards_flagged: ["2026-09-25 · #test-harness #readiness-gates · readiness-gates.md has TWO epic yaml blocks; a work_item_type-only regex hits ready-for-decomposition — key on transition too"]

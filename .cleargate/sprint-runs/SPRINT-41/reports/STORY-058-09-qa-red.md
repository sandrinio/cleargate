# STORY-058-09 — QA-Red report

role: qa

## Commit

cli `story/STORY-058-09` @ `eed511c` (`qa-red(STORY-058-09): write failing tests`), cut from cli `main` `1b742b3` (STORY-058-08 merge commit). Two-repo item; QA-Red wrote only in the cli repo, per dispatch.

## Files written

- `cleargate-cli/test/scripts/clean-room-evidence.red.node.test.ts` — unit scenarios E1-E7 plus M4-A16 (hook-identity) and M4-A17 (mcp-connect name filter). 39 tests.
- `cleargate-cli/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` — Scenario A (A1-A5, plus A4b for M4-A2) and Scenario B (B1-B6). Header `// @cleargate-tier: integration`. 12 tests. Never invokes `claude -p`; the live half is `claude-baseline.mjs run`'s job (unwritten, Developer's), and QA-Red does not touch it.

No implementation file was written or edited (`scripts/clean-room/{evidence,probe-items,claude-baseline}.mjs` do not exist at this commit — Developer's task).

## Per-scenario table

### Unit file — `clean-room-evidence.red.node.test.ts` (all red: `ERR_MODULE_NOT_FOUND` for `scripts/clean-room/evidence.mjs` or `probe-items.mjs`, per-test dynamic import)

| Scenario | Tests | Reason |
|---|---|---|
| E1 parseClaudeStream | 1 | module not found: evidence.mjs |
| E2 claudeLiveVerdicts (a-h, incl. M4-A16 hook-identity g/h, M4-A17 mcp-connect) | 10 | module not found: evidence.mjs |
| E3 checkEvidence | 5 | module not found: evidence.mjs |
| E4 compareInstallTrees | 7 | module not found: evidence.mjs |
| E5 probe items (authorProbeEpic/approveProbeStory/declareProbeSprint) | 5 | module not found: probe-items.mjs |
| E6 validateContainer | 6 | module not found: evidence.mjs |
| E7 computeArtifactInputs | 3 | module not found: evidence.mjs |
| **Total** | **39** | **0 pass / 39 fail, both runs** |

### E2E file — `clean-room-claude-baseline.red.integration.node.test.ts` (12 tests; 9 regression anchors green, 3 reds)

| Scenario | Result | Reason |
|---|---|---|
| A1 PATH identity + tarball contents | PASS `[REGRESSION ANCHOR]` | byte-neutral (Rule 2); -08 already ships this |
| A2 machine checks (verify-install/doctor exit 0, live ids) | PASS `[REGRESSION ANCHOR]` | byte-neutral |
| A3 install shape (NOFLAG_TOP_LEVEL/CLAUDE_AGENTS/CLAUDE_SKILLS from evidence.mjs) | FAIL | module not found: evidence.mjs |
| A4 SessionStart→new epic→PreToolUse:Edit→PostToolUse:Edit cycle | FAIL | module not found: probe-items.mjs |
| A4b (M4-A2/V8) active-sprint sentinel drive | PASS `[REGRESSION ANCHOR]` | BUG-085's empty-array guard already fixed |
| A5 limits statement | PASS | diagnostic-only, always green |
| B1 genuinely separate installs | PASS `[REGRESSION ANCHOR]` | byte-neutral |
| B2 host set (installedHosts) | PASS `[REGRESSION ANCHOR]` | -06/-07 already ship `installedHosts` |
| B3 verify-install --host claude --json (all room) | PASS `[REGRESSION ANCHOR]` | byte-neutral |
| B4 compareInstallTrees(noflag, all) | FAIL | module not found: evidence.mjs |
| B5 core/claude snapshot entries identical | PASS `[REGRESSION ANCHOR]` | byte-neutral |
| B6 explicit foreign-command scan | PASS `[REGRESSION ANCHOR]` | byte-neutral, plain text scan |

Every FAIL is `ERR_MODULE_NOT_FOUND`, confirmed both runs. Every PASS is a deliberate regression anchor (marked in-file with `[REGRESSION ANCHOR]`), not a gap in coverage — STORY-058-09 packs no new byte (every new file lives under `scripts/clean-room/` or `test/`, both outside `package.json`'s `files`), so the underlying install these anchors probe is unchanged from post-STORY-058-08 `main`. This is the same pattern flashcard 2026-08-30 `#test-harness #tpv` ("an already-green anchor can be a mutant's sole killer") describes as legitimate, and the dispatch's own "mark any regression anchor explicitly" clause anticipates it.

## Baseline fail counts (both runs, SOLO)

| File | tests | pass | fail | Run 1 | Run 2 |
|---|---|---|---|---|---|
| `clean-room-evidence.red.node.test.ts` | 39 | 0 | 39 | identical | identical (same 39 failing names, same `ERR_MODULE_NOT_FOUND`) |
| `clean-room-claude-baseline.red.integration.node.test.ts` | 12 | 9 | 3 | identical | identical (same 3 failing names: A3, A4, B4) |

`BASELINE_FAIL` (combined): **42** failing scenarios against `1b742b3`, all named and reproduced twice.

## Verify

- `npm run typecheck` — exit 0 (checked after each file, and again after both).
- Both files run SOLO, twice each — identical pass/fail counts and failing-test names both times (see table above).

### Sealed files stay green (SOLO)

| File | Expected | Measured |
|---|---|---|
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19/19 | 19/19 |
| `test/hosts/host-selection.red.node.test.ts` | 11/11 | 11/11 |
| `test/commands/init-host-selection.red.node.test.ts` | 10/10 | 10/10 |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 | 4/4 |
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18/18 | 18/18 |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 |
| `test/hosts/host-lifecycle.red.node.test.ts` | 17/17 | 17/17 |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 | 3/3 |
| `test/hosts/manifest-query.red.node.test.ts` | 6/6 | 6/6 |
| `test/commands/doctor-per-host.red.node.test.ts` | 10/10 | 10/10 |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 | 6/6 |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 | 16/16 |
| `test/commands/uninstall-reinit.red.node.test.ts` | 4/4 | 4/4 |
| BUG-085: `test/lib/drift-check-scaffold.red.node.test.ts` | 24/24 | 24/24 |
| BUG-085: `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | 13/13 | 13/13 |
| BUG-085: `test/commands/doctor-drift-guard.node.test.ts` | 13/13 | 13/13 |
| `test/commands/verify-install.red.node.test.ts` | 42/42 (dispatch-pinned figure; matches measured, not M4-A14's earlier 41/41 estimate) | 42/42 |
| `test/commands/verify-install-cli.red.integration.node.test.ts` | 5/5 | 5/5 |
| `test/docs/clean-room-verification-doc.red.node.test.ts` | 9/9 | 9/9 |

All 19 sealed files exact-match; zero regressions.

### Parity (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`)

- `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` — 5/5.
- `test/commands/init-host-parity.red.integration.node.test.ts` — 15/15.

### Baseline hash

`find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` (425 files, absolute paths):

- Before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`
- After: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (unchanged)

### Outer status

- Start: `.cleargate/sprint-runs/SPRINT-41/{.session-totals.json,events.jsonl,state.json,token-ledger.jsonl}` modified (orchestration ledger, pre-existing); one untracked `.pending-task-*.json`.
- End: same four modified ledger files, unchanged; the untracked `.pending-task-*.json` is gone (consumed elsewhere, not by this dispatch). No outer file was written by QA-Red. `SMOKE RULE` honored: every `cleargate init` invocation ran inside the e2e test's own `spawnSync(cwd=<mktemp room>)`, never a bare shell command against `/Users/ssuladze/Documents/Dev/ClearGate`.

## Plan ambiguities (orchestrator_confirmed: false)

1. **`claudeLiveVerdicts`'s `inputs` parameter shape is prose-only.** M4 plan §STORY-058-09 pins the function signature as `claudeLiveVerdicts(inputs)` and describes each verdict's PASS condition in bullets, but never gives the parameter's TypeScript/JS shape. This file invents `ClaudeLiveVerdictInputs` (`s1`, `s2`, `s3?`, `hasAgentsMd`, `gateCheckLine`, `epicWikiPageExists`, `epicRaw`, `ledgerHasQaRow`, `identity?`) strictly from the bullets' own vocabulary. `orchestrator_confirmed: false` — the Developer/Architect may reshape this; if so, this file's E2/A-scenario tests need a matching edit (not a re-seal, since the *behavior* pinned is unchanged, only the parameter shape).
2. **`validateContainer`'s `probes` DI shape.** The plan's prose gives the four probe names (`exists`, `realpath`, `tmpRoots`, `insideGitWorkTree`) but not their exact signatures. This file assumes `exists(path): boolean`, `realpath(path): string`, `tmpRoots(): string[]`, `insideGitWorkTree(parentDir): boolean`. `orchestrator_confirmed: false`.
3. **`mcp-connect`'s verdict `detail` format (M4-A17)** is asserted only by a loose substring check (`detail.includes('cleargate')`) since the plan does not pin an exact rendering — only the *content* (name-filtered entry, non-project count). `orchestrator_confirmed: false` if the Architect wants a stricter shape pinned later.
4. **"BUG-085's three" sealed files** — the dispatch names this set without listing filenames. This report interprets it as `drift-check-scaffold.red.node.test.ts`, `pending-task-sentinel-cards.red.node.test.ts`, and `doctor-drift-guard.node.test.ts` (BUG-085's "New Files Needed" lists only the first two; the third is inferred from BUG-085-qa.md's own sealed-check table, which treats all three as the story's regression set). `orchestrator_confirmed: false`.
5. **`verify-install.red.node.test.ts`'s expected count.** The dispatch's "Verify" section pins 42; M4-A14 ("Expected after round 2") had earlier estimated 41/41. Measured reality is 42/42 (both matches the dispatch and is what shipped) — noting the discrepancy with the plan's own interim estimate for the record, not as a defect.

## flashcards_flagged

flashcards_flagged:
  - "2026-09-26 · #qa-red #clean-room #test-harness · A byte-neutral story's e2e reds must mark already-green regression-anchor cases explicitly, not force them red."
  - "2026-09-26 · #qa-red #test-harness · claudeLiveVerdicts' inputs shape is prose-only in the plan; QA-Red must invent + flag the DI shape as an ambiguity, not silently pin one."

STATUS=done

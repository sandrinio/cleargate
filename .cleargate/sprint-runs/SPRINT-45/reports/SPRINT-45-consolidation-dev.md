# SPRINT-45 — Phase D.5 consolidation (Developer)

- Branch: `consolidation/S-45` (cli, off main 8de3d7c)
- Commit: `7d93c52` refactor(SPRINT-45): consolidation pass over the sprint diff
- Files: 4 changed, +46 / -45. No test, snapshot, or generated file touched.
- `npm run gen:codex`: no diff. `npm run prebuild` (incl. `build-codex-payload.mjs --check`): exit 0.

## Changes

| # | File | Change | Reason |
|---|---|---|---|
| 1 | `src/commands/upgrade.ts` (dry-run label) | `entryHasLocalEdits(...)` computed once into `localEdits`, then branched: edits → overwrite/pin-aware/merge-3way labels; no edits + gate-checks.json + overwrite → SC-7 "updated, no local edits lost". | The BUG-133 r2 SC-7 branch was layered over the r1 branch, so the same condition (and its two file reads) ran twice for gate-checks.json, and `!isSurgery` was repeated. The labels and conditions are the same for every case; the helper only reads files. |
| 2 | `src/commands/upgrade.ts` (helpers) | `expectedMode` moved above the BUG-018/BUG-122 JSDoc blocks. | BUG-133 put it between those docs and `copyPackageMode`, so they documented the wrong function. Comments only. |
| 3 | `src/init/detect-test-stack.ts` | New private `gateCommandsOf(parsed)`; `readGateCommands` and `projectGateChecks` both use it. | BUG-133 SC-7 copied `readGateCommands`'s three-field `strField` extraction instead of reusing it. This mirrors the `renderGateChecks` extraction the same item already made. |
| 4 | `scaffold/core/.cleargate/scripts/prep_reporter_context.mjs` | Dropped the inner `try/catch` around `renderMeasuredMetrics`; added `mmFirstLine(err)` for the error-first-line expression it repeated three times; `mmCut` is now `String(str).slice(0, n)`. | The inner catch gave the same `render failed: …` line as the outer catch it sat inside. `slice` already returns the whole string when it is shorter than n. |
| 5 | `scaffold/core/.cleargate/scripts/subagent-ledger.mjs` | Private `compareStrings(a, b)`; `walkAgentFiles` sort and `readDispatches` row sort use it (`started_at`, then `agent_id`). | Replaces a 2-deep and a 4-deep nested-ternary comparator with one readable helper. Same ordering. C1 exports, `DispatchRow` shape, and sync readers unchanged. |

## Considered and left alone

- **Different windowing in `count_tokens.mjs` and `sprint_metrics.mjs`.** `count_tokens` windows only on the fallback source; `sprint_metrics` windows every dispatch (SC-5). Unifying them would change `count_tokens`' `subagent` figures, so it would change behaviour.
- **`projectRootFor` in `sprint_metrics` and the transcripts-root derivation in `subagent-ledger.discoverSessions`.** Both work out the project root from `<root>/.cleargate/sprint-runs/<id>`. Sharing it would mean a new export on the frozen C1 module, and the two fall back differently (`cwd` vs a warning). The gain was too small for that.
- **`readJsonSafe` (subagent-ledger) vs `readJson` (sprint_metrics).** The two are identical, but sharing them needs a new C1 export or a new lib file (surface-whitelist, MANIFEST). Not worth it for 3 lines.
- **Three different error-message idioms across the scripts** (`err && err.message ? …`, `err instanceof Error ? …`, `String((err && err.message) || err)`). These give different text for non-`Error` throwables, so unifying them would change some warning strings.
- **`NOT_MEASURED` defined in both `prep_reporter_context` and `sprint_metrics`.** `prep_reporter_context` deliberately runs `sprint_metrics` as a child process, so a missing or broken script becomes a "not measured" line. An import would bring back the crash it guards against.
- **Per-usage token summing in `count_tokens.measureSubagents` and `sprint_metrics.buildMetrics`.** These are separate scripts that handle nulls differently, and sharing the code needs a new export.
- **`mergeUpstreamSettings` closures (`key`, `hasHooks`, `isCg`).** They are re-created on every event. Hoisting them is a matter of taste.
- **`claude.ts` and `codex.ts` cast styles** (`as SettingsJson` vs `Parameters<…>[0]`). Each file keeps its own existing style.
- **Other matters of taste, skipped:** the nested ternary for the `models` column in `renderMeasuredMetrics`; the cryptic `DNM`/`GNM` names; `computeRework`'s `!(!lastBuild || …)`; `let` → `const` for `sprintLevel`/`unattributed` in `buildMetrics`; a module-level type for the `'overwrite' | 'skip' | 'merge-3way' | 'pin-aware'` union (its second use is in a function-local interface); the redundant `catch { gatePlan = undefined }`.
- **Not reviewed for simplification:** `pricing.ts` (a data table only), `changelog.ts` `extractUpgradeNotes` (already minimal), `token-ledger.sh` (a one-key change), and the `ledger-digest.mjs` constant.

## Verification

- `npm run typecheck`: exit 0.
- `npm run prebuild`: exit 0. `gen:codex` left no diff.
- Script tests (`TMPDIR=/private/tmp/s45c npm run test:file -- …`): subagent-ledger.red, sprint-metrics.red, sprint-metrics.r2.red, sprint-metrics.red.integration, prep-reporter-measured-metrics.red, test_prep_reporter_context, scripts-fence-bug098.red, agents/reporter-content, test_close_sprint_v21.integration.
  - **219 tests: 215 pass, 4 fail.** All 4 failures are in `test_close_sprint_v21.integration` (Scenario 10 ×3: Step 3.5 blocks when prep_reporter_context fails; Scenario 24 ×1: CAND-SPRINT-TEST-S).
  - These 4 are not caused by this pass. With my changes reverted (patch saved, files checked out at 8de3d7c, patch re-applied and checked byte-identical), the same file gives the same 4 failures (81 tests, 77 pass). Two of them (`Step 3.5 FAILED`, CAND-SPRINT-TEST-S) are already in `evidence/baseline-failures-dbccc79.txt`. The other two (`pipeline exits 1 …`, `sprint_status stays Active …`) are not in that list. Scenario 10 forces the failure by leaving out `token-ledger.jsonl` ("prep_reporter_context.mjs exits 1 (hard error per R4)", test line ~668). STORY-064-02 SC-1 (BUG-081) changed exactly that case to a warning plus exit 0. So these two came in with the STORY-064-02 merge and are not a consolidation regression. The test's premise is out of date. That is QA-Red territory, and it is flagged for the orchestrator.
- Upgrade and gate-command tests: upgrade, upgrade-output.red, upgrade-output.red.integration, upgrade-gate-checks-output.red, upgrade-changelog, upgrade-state-parity.red, upgrade-pin-and-prune, upgrade-settings-order.red.integration, upgrade-preserves-gate-commands, gate-commands-kept.red, init-test-stack-detect.red, upgrade-registers-new-files, upgrade-payload-root, upgrade-per-host.red, upgrade-no-tty.red, upgrade-claude-md.red, upgrade-mcp-refresh.red, upgrade-restart-warning.red, install-state-parity.red, install-state-new-entry.red, lifecycle-codex.red, lifecycle-per-host.red.integration.
  - **204 tests: 204 pass, 0 fail.**

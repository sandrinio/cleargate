role: qa

# STORY-058-12 QA-Red RE-SEAL report

```
QA-RED: WRITTEN
RESEAL_APPLIED: ed47ca875b6a2c00ff5bb4811f9e821b0c608820e21bcb592bdd47a59c9f76ef
CLI_COMMIT: 03cbb33
BASELINE_FAIL: 62 red + 2 anchors (unchanged from sealed commit e320ec4)
flashcards_flagged: []
```

## 3-point gate (all passed)

(a) `shasum -a 256 reports/STORY-058-12-tpv-reseal.patch` = `ed47ca875b6a2c00ff5bb4811f9e821b0c608820e21bcb592bdd47a59c9f76ef` — matches.

(b) `<cw>` (`.worktrees/STORY-058-12/cleargate-cli`) HEAD = `e320ec4` (short), branch `story/STORY-058-12`, `git status --porcelain` empty. `git apply --check` on the patch: clean.

(c) After `git apply` + `git add -A`, `git diff --cached --name-only` listed exactly 8 files, all under `test/`, all `*.red.node.test.ts` — no `src/`, `scaffold/`, `scripts/`, fixture or `init-fixture.ts` path present:
- `test/commands/init-codex-sprint-execution.red.node.test.ts`
- `test/hosts/dispatch-mode.red.node.test.ts`
- `test/scaffold/skill-md-serial-pointers.red.node.test.ts`
- `test/scripts/codex-sprint-execution-render.red.node.test.ts`
- `test/scripts/dispatch-serial-cli.red.node.test.ts`
- `test/scripts/dispatch-serial.red.node.test.ts`
- `test/scripts/dispatch-verdict-modes.red.node.test.ts`
- `test/scripts/flashcard-gate-parity.red.node.test.ts`

Diff stat: +157/-20 across the 8 files — matches TPV's `RESEAL_SCOPE`.

## Re-measurement at re-sealed tree (before commit), all 15 -12 files, run solo via `npm run test:file`

| File (abbrev) | Path | tests | pass | fail |
|---|---|---|---|---|
| dvm | test/scripts/dispatch-verdict-modes.red.node.test.ts | 5 | 1 | 4 |
| ds | test/scripts/dispatch-serial.red.node.test.ts | 8 | 0 | 8 |
| cli | test/scripts/dispatch-serial-cli.red.node.test.ts | 7 | 0 | 7 |
| fg | test/scripts/flashcard-gate-parity.red.node.test.ts | 14 | 0 | 14 |
| smsp | test/scaffold/skill-md-serial-pointers.red.node.test.ts | 3 | 1 | 2 |
| doc | test/scaffold/dispatch-serial-doc.red.node.test.ts | 3 | 0 | 3 |
| docs | test/docs/serial-dispatch-docs.red.node.test.ts | 2 | 0 | 2 |
| twins | test/scripts/serial-twins.red.node.test.ts | 1 | 0 | 1 |
| dm | test/hosts/dispatch-mode.red.node.test.ts | 2 | 0 | 2 |
| render | test/scripts/codex-sprint-execution-render.red.node.test.ts | 3 | 0 | 3 |
| ics | test/commands/init-codex-sprint-execution.red.node.test.ts | 3 | 0 | 3 |
| e2e | test/e2e/claude-dispatch-path.red.integration.node.test.ts | 1 | 1 | 0 |
| portable-skills | test/scaffold/portable-skills.red.node.test.ts | 6 | 5 | 1 |
| codex-hooks-harness | test/scripts/codex-hooks-harness.red.node.test.ts | 85 | 74 | 11 |
| lifecycle-codex | test/commands/lifecycle-codex.red.node.test.ts | 6 | 5 | 1 |

Totals: 149 tests, 87 pass, **62 fail**. The 2 anchors (`dispatch-verdict-modes` Test 1, `skill-md-serial-pointers` Test 21 — implicit in the 1/5 and 1/3 pass counts) stayed green. Per-file fail counts on the 8 re-sealed files, in TPV's cited order (dvm, ds, cli, fg, smsp, dm, render, ics): **4, 8, 7, 14, 2, 2, 3, 3** — exact match to the TPV's "`e320ec4` + re-seal, no build" row. All other 7 files' counts are unchanged from the sealed baseline table (doc 0/3, docs 0/2, twins 0/1, e2e 1/1, portable-skills 5/6, codex-hooks-harness 74/85, lifecycle-codex 5/6).

Note: `test/e2e/claude-dispatch-path.red.integration.node.test.ts` — the TPV report's short name "e2e" — lives under `test/e2e/`, not `test/integration/`; located by grepping the sealed commit's file list before running.

**M2 parity pair** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, read-only compare): `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` = 0 pass / 5 tests; `test/commands/init-host-parity.red.integration.node.test.ts` = 0 pass / 15 tests. Unchanged, as expected.

## Red reasons (verified against TPV's "Red reasons after the re-seal")

- **dvm** — `AssertionError`: "Got unwanted exception: GREEN with {metering: unavailable} must be accepted in serial mode" (Test 2); "a synthesized extra key beside metering:unavailable must be rejected" (Test 3); "Missing expected exception: expected a TypeError matching /unknown mode 'x'/" (Test 4); usage-line mismatch — asserted 4 functions, module exports 6 (Test 4b). Matches.
- **ds** — every failing test throws `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../scaffold/core/.cleargate/scripts/dispatch_serial.mjs'`. Matches.
- **fg** — every failing test throws `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../scaffold/core/.cleargate/scripts/lib/flashcard-gate.mjs'`. Matches.
- **cli** — node's own `Error: Cannot find module '.../scaffold/core/.cleargate/scripts/dispatch_serial.mjs'` (child process exit 1, `MODULE_NOT_FOUND`). Matches.
- **smsp** — "expected exactly 4 more lines (2 blank + P1 + P2), got a delta of 0"; "canonical dispatch-serial.md does not exist yet". Matches.
- **dm** — Test 29: `dispatchMode` strict-equal assertion fails (undefined vs `'wave-parallel'`/`'serial'` — property not implemented yet); Test 30: "a wave-parallel-only selection must NOT admit the serial dispatch surface". Matches.
- **render** — "renderCodexSprintExecution must be exported from scripts/build-codex-payload.mjs" (x2); "planCodexPayload must plan core/.agents/skills/sprint-execution/SKILL.md". Matches.
- **ics** — plain `existsSync` assertions on `.agents/skills/sprint-execution/SKILL.md` and `.claude/skills/sprint-execution/dispatch-serial.md`. Matches.

No wiring/syntax error was found in any test; every failure is attributable to missing STORY-058-12 implementation, consistent with the TPV's satisfiability finding.

## Commit

`git -C <cw> commit` on `story/STORY-058-12`, new sha **`03cbb33`** (short) — 8 files changed, 157 insertions, 20 deletions. `cleargate-cli` has no pre-commit hook (rule 12); `--no-verify` was not used. `<ow>` (outer worktree) was untouched throughout — `git status --porcelain` empty before and after.

## Script Incidents

None. No `run_script.sh` invocation — all commands were direct `npm run test:file` / `git` calls inside `<cw>`, per the dispatch's own test-runner instructions.

```yaml
flashcards_flagged: []
```

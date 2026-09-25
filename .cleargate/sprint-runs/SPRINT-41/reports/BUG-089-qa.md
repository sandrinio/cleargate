# BUG-089 QA-Verify

role: qa

## Mode

VERIFY — read-only acceptance trace. Preflight read of
`.cleargate/sprint-runs/SPRINT-41/sprint-context.md` done first (Cross-Cutting
Rules 9-15 applied throughout, esp. rule 15's two-repo verification order).

Commits verified: cli `story/BUG-089` @ `9493236` (on top of frozen red
`dc78bcc`, `a23c655`); outer worktree `story/BUG-089` @ `ae3e9120` (on top of
frozen red `5bdd45c5`, `a32bb634`, `da545597`). Both worktrees clean before
and after this pass (`git status --porcelain` empty in `.worktrees/BUG-089`;
no stray writes in either the cli checkout or the outer MAIN checkout beyond
pre-existing/gitignored artifacts).

## Targeted re-runs (all via `run_script.sh`, all green except the one named
Rule-15 case)

| Command | Result |
|---|---|
| `CLEARGATE_META_ROOT=<worktree> npm run test:file -- test/hooks/hook-signal.red.node.test.ts test/hooks/hook-signal.red.integration.node.test.ts test/commands/init.node.test.ts` | 45/46 pass. The 1 failure is `test/commands/init.node.test.ts`'s "BUG-089 snapshot" test — confirmed by source read (`test/commands/init.node.test.ts:131`, `const META_ROOT = path.resolve(__testDirname, '..','..','..')`, no `CLEARGATE_META_ROOT` branch) and by inspecting the actual assertion diff: `actual` is byte-for-byte the outer MAIN checkout's still-unfixed `cleargate-planning/.claude/hooks/pre-edit-gate.sh` (bare `exit 1`, no `--host` parsing) — verified directly via `grep -n "exit 1\|HOST=" cleargate-planning/.claude/hooks/pre-edit-gate.sh` in the main checkout, which shows only line 166 `exit 1`. This is the Rule-15 stale-canonical read, not a regression. |
| `CLEARGATE_META_ROOT=<worktree> npm run test:file -- test/commands/init.node.test.ts` (isolated) | 28/29 pass, same single named failure. |
| `PRE_EDIT_GATE_HOOK=<worktree>/cleargate-planning/.claude/hooks/pre-edit-gate.sh bash test/scripts/test_pre_edit_gate.sh` | 11/11 pass, incl. Case 4/7 exit-2 assertions. |
| `bash .cleargate/scripts/test/test_flashcard_enforcement.sh` (run from inside the worktree — script's own `SCRIPT_DIR`-relative `REPO_ROOT` resolves to the worktree without any override needed) | 12/12 pass, incl. S1 exit-2. |
| `bash .cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` (same worktree-relative resolution) | 10/10 pass — confirms the exit-2 change did not break BUG-068 dispatch-attribution wiring. |
| `npm run typecheck` (cli) | clean, exit 0. |

## Full-suite claim audit (dispatch item 2 — full `npm test` NOT re-run per
instruction; audited instead)

Developer's claim: wrapped mandated `npm test` → 2669 pass / 26 fail / 3
skip; unwrapped diagnostic → 2686 pass / 9 fail / 3 skip, all 9 named as
Rule-15 stale-canonical reads. Audited both failure classes against source,
not trusted on the Developer's word:

1. **9 Rule-15 failures** — `test/commands/init.node.test.ts:131`'s
   `META_ROOT` (verified above, no env override) plus
   `test/hooks/hook-signal.red.node.test.ts:91-93`'s own `META_ROOT`, which
   **does** support `CLEARGATE_META_ROOT` but falls back to
   `path.resolve(CLI_ROOT, '..')` (verified by reading the source) when unset
   — exactly what a bare `npm test` does. That file's `HOOK_ASSET` feeds the
   U5-U12 "direct script invocation" sub-tests (4 per script × 2 scripts = 8),
   which spawn the shell hook directly and so read the outer MAIN checkout's
   still-unfixed canonical when the env var is absent. 1 (init snapshot) + 8
   (U5-U12) = 9. Mechanism confirmed by source read, not asserted on trust.
2. **17 run_script.sh reentrancy failures** (present only in the wrapped
   26-failure run, not the unwrapped 9-failure run) — this is a pre-existing,
   independently flashcarded artifact unrelated to BUG-089:
   `.cleargate/FLASHCARD.md` 2026-06-04 `#test #run_script #isolation`
   ("Running `npm test` via `bash run_script.sh npm test` leaks
   `RUN_SCRIPT_ACTIVE=1` into the test child env…") and reconfirmed
   2026-07-19 (`#test-harness #qa`, "invoke npm test directly for full-suite
   reruns"). Not something this fix introduced.

No failure in either full-suite run was left unexplained by the above two
mechanisms. Zero regressions found.

## Acceptance trace (dispatch item 3, scenario by scenario)

| Scenario | Evidence |
|---|---|
| resolver `block`→2 / `allow`→0 | `resolveHookSignal` in `src/hooks/hook-signal.ts` (read in full) + U1-U2 pass |
| unknown host / unknown decision rejected | `hook-signal.ts` throws on both; U3-U4 pass |
| both blocking branches (`pre-edit-gate.sh`, `pending-task-sentinel.sh`) exit exactly 2 | source read confirms `exit 2` unconditional after the `hook signal` call on both scripts; `test_pre_edit_gate.sh` Case 4/7, `test_flashcard_enforcement.sh` S1, integration I2/I3, unit U5-U12 all pass |
| missing CLI / failed / unexpected resolver outcomes fail closed at 2 | U7-U12 (4 sub-tests × 2 scripts) pass; source shows `SIGNAL_EXIT -ne 2` is logged but `exit 2` always runs regardless |
| warn mode stays 0 | U13 passes (non-vacuous per TPV's W1 repair — verified the stub now forces "uncovered" so warn-mode's exit-0 is a real assertion, not an accident); `test_pre_edit_gate.sh` Case 3/11 pass |
| active-sprint bypass stays 0 | U14 passes; `test_pre_edit_gate.sh` Case 8 passes |
| `CLEARGATE_ADVISORY=1` (pending-task-sentinel.sh only, per enforcement.md §15) stays 0 | U15 passes (retargeted per TPV); `test_flashcard_enforcement.sh` Scenario 3 passes; confirmed no new honor site added to `pre-edit-gate.sh` (grep shows CLEARGATE_ADVISORY only in `pending-task-sentinel.sh`) |
| `SKIP_FLASHCARD_GATE=1` stays 0 | U16 passes |
| non-blocking hooks untouched | commit diffs touch only `pre-edit-gate.sh` + `pending-task-sentinel.sh`; `pre-tool-use-task.sh`/`pre-tool-use-autonomy.sh`/`stamp-and-gate.sh` absent from both commits' file lists; `bug068_dispatch_tool_name.red.sh` 10/10 confirms `pre-tool-use-task.sh` wiring intact |
| canonical `settings.json` carries `--host claude`, matchers unchanged | diff read in full: only the two `command` strings changed, `Edit\|Write` / `Task\|Agent` matchers untouched; I1 passes |
| both `cleargate-enforcement.md` copies byte-identical, no longer claim exit-1-blocked | `cmp` → identical; grepped both for `exit 1` — only remaining hits are unrelated (`sprint reconcile-lifecycle`, Step 2.7/2.8 close-gate exits, which are correctly still exit-1 git/CLI mechanisms, not PreToolUse hooks) |

E2E (real Claude session denial, BUG-089 §5 row 3 / Task Breakdown row 6) is
explicitly out of scope for this dispatch (item 5) — the orchestrator proves
it at barrier B0 after merge; not scored here.

## Plan-deviation review (dispatch item 4)

`src/commands/init.ts`'s `HOOK_ADDITION` gaining `--host claude`: confirmed
necessary and correct. `mergeSettings` (`src/init/merge-settings.ts:10`,
"de-dup merge inner hooks[] by exact `command` string match") dedups by exact
string; the canonical payload's `settings.json` and `HOOK_ADDITION`'s literal
are now byte-identical (`grep` both →
`${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh --host claude`
verbatim). Without this fix a fresh `cleargate init` would register
`pre-edit-gate.sh` twice under `PreToolUse` `Edit|Write`. Grepped
`src/**/*.ts` for any other hardcoded `pre-edit-gate.sh` / `pending-task-sentinel.sh`
command-string literal outside test files — none found; `HOOK_ADDITION` has
no `pending-task-sentinel.sh` entry at all (only `pre-edit-gate.sh` under
PreToolUse and `stamp-and-gate.sh` under PostToolUse), so there is no parallel
double-registration risk for the sentinel script. `test/commands/init.node.test.ts`'s
CR-059 scenario 5 fixture was updated to match and passes.

§4 self-amendment coverage: every file touched in both commits maps either to
the item's original §4 Execution Sandbox list, the Developer's own
self-amendment paragraph, or is an expected auto-ingest side effect (wiki
pages, dev/qa report files) — no untracked scope creep found.

## flashcards_flagged

[] — no new QA-side gotchas; the two failure mechanisms audited above are
already covered by existing active flashcards (2026-06-04/2026-07-19
`#run_script` reentrancy; multiple `#test-harness #cross-repo` cards on
`META_ROOT`/`CLEARGATE_META_ROOT` defaulting to the outer MAIN checkout).

## Verdict

QA: PASS

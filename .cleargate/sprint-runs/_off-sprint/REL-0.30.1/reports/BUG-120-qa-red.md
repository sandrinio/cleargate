# BUG-120 QA-Red (role: qa) — REL-0.30.1 U2

QA-RED: WRITTEN
BASELINE_FAIL: 9 of 12 in upgrade-no-tty.red.node.test.ts; 1 of 4 new cases in upgrade-state-parity.red; 2 of 2 in the integration `describe('BUG-120')` (base HEAD 7844e56)

Files (worktree-relative, uncommitted, /Users/ssuladze/Documents/Dev/cg-wt/u2):
- A test/commands/upgrade-no-tty.red.node.test.ts (12 tests, synthetic payload + explicit packageRoot; real promptMergeChoice driven by PassThrough stdin; baseline hangs are raced against a 4 s timeout so they fail instead of sticking)
- M test/commands/upgrade-field-path.red.integration.node.test.ts (adds `describe('BUG-120')`, 2 tests, spawn `upgrade` with stdin /dev/null; BUG-122 describe untouched)
- M test/commands/upgrade-state-parity.red.node.test.ts (shape edit: adds a describe keeping `state=` meaningful for upstream-changed under the new take line; 2 tests)

Red on base, and why:
- Sc1 refusal: base asks about every merge-3way file (incl. upstream-changed) and waits on the ended stdin -> hangs ("timed out ... hung waiting for input"), no exit 2.
- Sc2 input ends mid-run: base prompt never settles on `end` -> hang; no exit 1 / stop text.
- Sc3 outline: base prompts 4 files ([protocol, bug(clean), epic(missing), story]) instead of only the user-modified one; no `[take] ... (unchanged locally|missing locally)` lines.
- Units: `MergePromptClosedError` not exported (4 cases: end, partial line, close, already ended); `"t\nk\n"` one chunk -> second prompt hangs (leftover lost); ours==upstream with stale install hash -> both-changed -> prompted.
- Parity (new, "no flag, prompt seam"): upstream-changed is prompted on base (prompted != 0).
- Integration A (user-modified template, `upgrade </dev/null`): built base 0.30.0-line CLI prompts (first on a `clean` .claude/settings.json), exits 0 silently with no complete and no exit 2; tree check not reached. Integration B (outdated untouched install): exits 0 with no `[upgrade] complete.` (stops at the same unsettled prompt).

Green on base (controls, not red): Sc4 `stdinIsTTY:false` + `--yes` completes (new version + pin); dry run with no terminal never refuses; injected promptMergeChoice counts as a terminal (user-modified prompted, not refused); parity `--yes` variant (base `[yes] taking theirs: ... state=upstream-changed` carries `state=`); BUG-122 describe stays green on the scratch HEAD build (/tmp/cgb.jL4U).

Shape edits: grepped `promptMergeChoice`, `\[take\]`, `\[yes\]`, `callCount`/`promptCalled` in test/commands/upgrade*.ts and upgrade callers. No existing test asserts a prompt count or a `[take]`/`[yes]` line for an upstream-changed/clean file: upgrade.node.test.ts :309-791 use user-modified fixtures (install != current, pkg != install is only reached via user-modified or both-changed paths they pin), pin-and-prune :197 is pin-aware, restart-warning uses `always`, the rest use `--yes` without asserting lines. All still green on HEAD (upgrade 14, pin-and-prune 11, changelog 7, restart-warning 4, registers-new-files 4, claude-md 4, per-host 6, preserves-gate-commands 4, install-state-parity 23). `npx tsc --noEmit` clean.

Notes for Dev: `stdinIsTTY` is typed locally in the red file (`UpgradeCliOptions & { stdinIsTTY?: boolean }`); adding it to UpgradeCliOptions keeps it compiling. The Sc2 input is `k` with no newline (partial line, per G-R-11). README sentence is not tested.

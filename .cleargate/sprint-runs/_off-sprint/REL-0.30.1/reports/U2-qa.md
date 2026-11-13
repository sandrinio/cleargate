# U2 QA-Verify (role: qa) — BUG-122, BUG-120, BUG-121, BUG-095 — REL-0.30.1

QA: PASS  (HEAD 1ff45ee, branch story/REL-0301-upgrade, base b9fe36a)

## 1. Diff vs G-R items
- Fix commits do not alter reds: `git diff <red>..<fix> -- test` is empty for 122 (6e0fdde..7844e56), 120 (7652da0..302e60f), 121 (1d49861..350b27e), 095 (c2e1e1c..57c06df).
- Re-scope 1d49861 (121): `init --force` now expects `Skipped (exists)` plus no gate line when nothing changed, and the gate line replacing `Skipped` when a field changed. Intent (values kept, change announced) is kept. Premise verified: `FIRST_INSTALL_ONLY` in src/init/copy-payload.ts:89.
- Re-scope 1ff45ee (095): only the indentation of the nested user-server needle; full-file equality above it unchanged.
- G-R-2..7 (settings projection, one hash space, effectiveInstallSha, post-write hash, upgraded_at/generated_at, modes), G-R-8..12 (stdinIsTTY seam, 4-branch front, refuse-before-write exit 2, MergePromptClosedError + WeakMap leftover + pause, mid-run exit 1), G-R-13/14 (gate API, lines in init/upgrade/dry-run), G-R-15..19 (planUntrackedRefresh, repinMcpJson, block refresh, outputs, verify-install detail), G-R-20 (README) all present as specified.
- Deviation, accepted (orchestrator re-scope): init prints the gate line only when action is `skipped`; plan's `overwritten` branch is unreachable (first-install-only).
- claude.ts: no `mcpServers`, no `CLEARGATE:START` (command grep: 0 matches). `planUntrackedRefresh` sits between `remove` and `mergeSurgeryTarget`, key appended after `mergeSurgeryTarget,`; settings branch untouched.
- `git merge-tree --write-tree --name-only main story/REL-0301-upgrade` (main = 391f79d, includes BUG-093 and BUG-125): exit 0, no conflicts (tree 0faef74). The merged tree typechecks, and the six U2 reds plus claude-merge-surgery-settings.red and host-adapter-contract.red are 114/114 green there. A scratch build of the merged tree keeps both user hooks after `upgrade --yes` (G1) and the settings dry run reads `clean`, snapshot hash = RC manifest hash.

## 2. Checks (fresh shell, private TMPDIR)
| command | result |
|---|---|
| npm run typecheck | exit 0 |
| check:no-shell-true-in-init | exit 0 (command grep count 0) |
| check:no-inline-id-regex | exit 0 |
| U2 reds: install-state-parity, upgrade-no-tty, upgrade-state-parity, gate-commands-kept, upgrade-mcp-refresh, test/docs/readme-upgrading | 88 pass, 0 fail, 0 skipped |
| 60 default-tier files test/commands/{upgrade,init,verify-install,lifecycle,doctor,uninstall}*, test/hosts/*, test/init/*, test/lib/*manifest* (run per file) | 56 files green; 4 files fail, all pre-existing |
Failing files (also fail on base b9fe36a, cause `dist/cli.js not found`, worktree and base archive have no dist): doctor-drift-guard.node.test.ts, doctor-retired-field.red.node.test.ts, init-no-dep0190.node.test.ts, init-restart-banner.node.test.ts. No regression introduced.

## 3. Scratch build of 1ff45ee (/tmp/cgb.GxB2, build exit 0)
`CLEARGATE_BUILT_CLI=<scratch>/dist/cli.js npm run test:file -- test/commands/upgrade-field-path.red.integration.node.test.ts` -> 6 pass, 0 fail. Same file against the 0.30.0 base CLI: 5 fail, 1 pass (control). So the reds are real.

## 4. Scenario map (all green; MISSING: none)
BUG-122: Sc1 outline -> install-state-parity Sc1 x3 (upgrade, re-init, no-user-hooks) + integration. Sc2 -> Sc2 (edited CG PostToolUse reads user-modified). Sc3 -> Sc3 x4 (+ integration). Sc4 -> Sc4 (0644 -> 0755).
BUG-120: Sc1 -> upgrade-no-tty Sc1 (+ integration, + real CLI probe below). Sc2 -> Sc2 (+ prompt end/close/already-ended/partial-line units). Sc3 outline -> Sc3 + "ours == upstream stale hash" unit. Sc4 -> Sc4.
BUG-121: Sc1 outline -> gate-commands-kept Sc1 (upgrade and init) + integration. Sc2 -> Sc2. Sc3 -> Sc3 (init and upgrade). Sc4 -> Sc4.
BUG-095: Sc1 -> upgrade-mcp-refresh Sc1 (+ integration, verify-install exit 0). Sc2 -> Sc2. Sc3 -> Sc3 x3. Sc4 -> Sc4 x3. Plus edges, dry run, restart warning, G-R-19 strings, tree parity, README file.
Task Breakdown rows: advisory only, not bounced.

## 5. Field rehearsal (scratch CLI, version reads 0.30.0 = "0.30.1"; source repo untouched, fp f0894855... start/end equal)
| room | step | expectation | result |
|---|---|---|---|
| R0 | dry-run | exit 0, writes nothing, 10 upstream-changed merge-3way incl settings | PASS (fp equal) |
| R0 | `upgrade </dev/null` | exit 0, `[upgrade] complete.`, no keep-mine prompt, 10 `[take] … state=upstream-changed (unchanged locally)`, clean files silent | PASS (10 takes, 0 prompts) |
| R0 | state after | version/pin new, installed_at 2026-10-30T18:10:35.620Z, generated_at = RC manifest, upgraded_at set, session-start pin new, Stop hook kept, gate line with 3 detected | PASS |
| R0 | dry-run after | no user-modified on pin-aware hooks, settings clean | PASS (only gate-checks.json `user-modified → clean`, known R4 risk) |
| R1 | 1 dry-run | exit 0, fp unchanged; settings `both-changed → clean`; gate line (2 kept, 1 detected); `.mcp.json action=repin cleargate@0.27.0 → new`; CLAUDE.md block-refresh (moves block to top; 67 lines); config.example overwrite; hooks read upstream-changed → clean | PASS |
| R1 | 2 `upgrade </dev/null` | exit 2, stderr starts `upgrade needs a terminal to ask about 1 file(s); re-run with --yes`, lists settings.json, fp unchanged, no [always]/[pin] | PASS |
| R1 | 3 `upgrade --yes </dev/null` | exit 0, complete | PASS |
| R1 | 3 / 093 | USER-OWN-POSTTOOLUSE-HOOK, USER-IN-CG-MATCHER ==1, build.py ==1 | build.py 1; USER hooks 0 on THIS branch (BUG-093 is U1, not merged here); with U1 merged (scratch build of merge tree) both = 1. Not a U2 defect |
| R1 | 3 / 121 | make check / make lint / go vet; line printed | PASS |
| R1 | 3 / 122 | settings snapshot hash = RC manifest (82fcd1ed…); dates; dedupe_frontmatter.mjs 755 | PASS |
| R1 | 3 / 095 | .mcp.json pinned new; block byte-equal to payload; outside-block text equal (line-anchored split; block moved 72 → 0); example cmp-equal; restart warning lists settings.json and .mcp.json | PASS |
| R1 | 4 dry-run 2 | settings clean; no mcp/CLAUDE/example line; gate line 3 kept; only non-clean file gate-checks.json | PASS |
| R1 | 5 verify-install | exit 0; mcp-registration, instruction-block PASS | PASS |
| R1 | 6 init </dev/null after commit | exit 0; `Skipped (exists) …gate-checks.json`, no gate line; no `mode change`; installed_at unchanged, upgraded_at advanced | PASS, with findings F1/F2 below |
| R1 | 7 dry-run 3 | settings clean | PASS |
| R2 | init </dev/null | gate line replaces Skipped, values kept, installed_at 2026-10-30T18:10:35.620Z, upgraded_at set, generated_at = RC; dry run settings clean; user hooks kept (1 each); other files user-modified (expected) | PASS |

## 6. Edge probes
- Legacy snapshot whose raw settings hash equals the file: R0 (0.28 snapshot, pristine) reads upstream-changed, taken with no prompt. PASS.
- Killed mid-run: out of scope.
- `"t\nk\n"`: piped to the built CLI without a terminal it correctly refuses (exit 2, names both files, tree unchanged; G-R-8 rule). Under a real pty (python pty, both as one write and as two), both prompts are answered: `[take] …/epic.md`, `[keep] …/story.md`, `[upgrade] complete.`, exit 0. PASS. (A `script -q` pipe harness closes stdin early and gives the exit-1 "input ended" path with the stop message and written-files list; that is the designed behaviour.)
- `.mcp.json` with CRLF + tabs + another server + extra top-level key: repinned, deep-equal except the cleargate pin, key order kept, rewritten in init's 2-space LF format. No-entry and malformed cases: file untouched, the specified stderr line. PASS.
- `--only cli-config`: dry run lists mcp, block, example; `--only template`: no mcp/block/example line and real run leaves .mcp.json, CLAUDE.md, config.example.yml bit-identical. PASS.

## Findings (none blocking)
- F1 (low, new, out of the four §5 scenarios): after `upgrade --yes` then `init` the snapshot differs from upgrade's beyond `upgraded_at`. Input: R1 room where the 0.28 snapshot lacks `.claude/hooks/post-shell-ingest.sh` (state untracked). upgrade appends that entry at the end of `files` without `owner`; init sorts it into place and adds `"owner": "claude"`. Pre-existing `updateSnapshotEntry` behaviour, not in 122's Gherkin. Follow-up candidate.
- F2 (info): the same init also changes the gate-checks.json snapshot hash (known BUG-091, R4 risk) and refreshes `.cleargate/.gitignore` (+`/.dashboard.json`), init bootstrap which upgrade never writes. Plan step 6 says to triage unexplained diffs; these are pre-existing and out of the four bugs.
- F3 (info): `upgrade --only template` still runs the gate-commands fill (and prints the line in dry run), because the BUG-037 block was always unconditional. Not a regression.
- F4 (info): `repinMcpJson` replaces the whole `mcpServers.cleargate` entry, so a user-customised cleargate entry (different command or env) is reset to the npx shape. Same as what `init` does; documented in G-R-16.

## Script Incidents
none.

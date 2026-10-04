# BUG-089 Architect Post-Flight (§C.6)

role: architect

## Verdict

ARCH: PASS

## Why dispatched

The pre-gate scan's only flag is structural: `typecheck: exit 254`. `gate-checks.json` runs `npm --prefix cleargate-cli` inside the outer worktree, and that worktree never contains the nested cli repo. The fix is not at fault. The cli typecheck is clean on `story/BUG-089` (QA report, targeted re-runs table). The non-removable safeguard still requires a live Architect.

## Scope reviewed (read-only)

- cli `story/BUG-089` @ `9493236`, on top of red `dc78bcc` and `a23c655`. Files: `src/hooks/hook-signal.ts`, `src/commands/hook.ts`, `src/cli.ts:514-527`, `src/commands/init.ts:39-70`, and the init test with the new snapshot.
- outer `story/BUG-089` @ `ae3e9120`. Files: canonical `pre-edit-gate.sh`, `pending-task-sentinel.sh`, `settings.json`, both `cleargate-enforcement.md` copies (byte-identical per QA), and the item's §4 self-amendment.
- Reports: `BUG-089-dev.md`, `BUG-089-qa.md`, and `plans/M0.md` §"BUG-089 prerequisite". M0 mandates the following: "Blocking wrappers must convert missing resolver, unknown host, resolver failure and unexpected status to 2."
- Also read: `src/init/merge-settings.ts`, `src/init/copy-payload.ts:79-83,160-205`, `src/commands/upgrade.ts:425-443`, `src/lib/settings-json-surgery.ts:32-35`, `.cleargate/sprint-runs/SPRINT-41/b0-live-resync.mjs`, the `b0-live-proof.sh` fixture paths, and STORY-058-10 §3.2 (lines 65, 87, 167, 173).

## Q1. Is `hook-signal.ts` a clean extension point for STORY-058-10's Codex mapping?

**TypeScript side: yes.**
- `HOST_SIGNAL_MAP` is keyed by host string (`hook-signal.ts:36-41`).
- Adding Codex is one new row. Unknown hosts and unknown decisions throw (`:52-63`), and the CLI turns a throw into exit 2 (`hook.ts:25-32`).
- The command verb is host-neutral: `hook signal <decision> --host <host>`, with `--host` required (`cli.ts:521-527`).
- `hook` is not in `GATED_COMMANDS` (`cli.ts:39-51`), so it works in pre-member state.
- One more change will be needed for Codex: `HookSignal` is `{ exitCode: 0 | 2 }` (`:23-25`), with no field for stdout. If Codex's real block contract needs a JSON decision on stdout, STORY-058-10 must widen this type (e.g. `stdout?: string`) and have `hookSignalHandler` write it. STORY-058-10:167 already anticipates this ("exit code, and any JSON decision field the host contract needs").

**Shell side: acceptable for BUG-089, with one Claude assumption that STORY-058-10 must change.**
- Both blocking tails run the resolver with output discarded (`> /dev/null 2>&1`) and then `exit 2` unconditionally. See `pre-edit-gate.sh:201-207` and `pending-task-sentinel.sh:215-221`.
- So the value the resolver returns is used only for a log line. For Claude this is correct and is exactly what M0 mandated: fail closed as 2.
- For a host whose block signal is not "exit 2 with no stdout", both tails need changing: forward the resolver's stdout and exit with its code when it is a known block code. A per-host fail-closed fallback must still live in the shell for the case where the CLI is missing. The CLI cannot resolve its own absence, so that one host constant belongs in the shell.
- This is a carry-forward to STORY-058-10, not a defect in BUG-089. STORY-058-10:173 already requires proving Codex's signal against the real binary, so that proof will show whether the tail needs to change.

**Pre-existing Claude couplings the shell side keeps.** None were added by this fix; STORY-058-10 and -11 already own them.
- `pending-task-sentinel.sh:36` expands `${CLAUDE_PROJECT_DIR}` under `set -u`. If both it and `ORCHESTRATOR_PROJECT_DIR` are unset, the script dies before any gate with exit 1 (measured with bash 3.2: exit 1, "unbound variable"). STORY-058-10:87 and the STORY-058-11 shim own this.
- The stdin parse assumes Claude's payload shape (`tool_input.file_path`, `tool_name`, `subagent_type`).
- The default `HOST="claude"` when `--host` is absent is the right backward-compatibility choice: existing settings.json files without the flag keep working. STORY-058-10 must register Codex with an explicit `--host codex` and assert it the way I1 does for Claude.

**Nit (not a bounce).** The docstring in `hook.ts:10-12` says every resolver failure exits 2. But when `--host` is missing, commander rejects the call before the handler runs, and commander exits 1. The shell passes `--host` every time and fails closed on any non-2 exit anyway, so this cannot be reached through the hooks.

**Rule-5 note.** The flashcard gate's decision logic, i.e. parsing the report files (`pending-task-sentinel.sh:91-163`), is still written in shell. That predates BUG-089. STORY-058-10 must reuse this script with `--host`, not fork it; STORY-058-10:173 already says so.

## Q2. Does every blocking-branch outcome end in exactly exit 2?

**Yes.** In both scripts, `exit 2` is the last statement of the blocking branch and has no condition attached. Neither script uses `set -e` or any `trap`. Neither blocking branch runs inside a subshell: the `{ ... } 2>>` group in `pending-task-sentinel.sh:227-278` is a brace group that comes after the gate. `SIGNAL_EXIT` is always numeric.

| Path | pre-edit-gate.sh | pending-task-sentinel.sh |
|---|---|---|
| CLI resolved, `hook` verb present | 2 | 2 |
| Old dist or global cleargate without the `hook` verb (commander exits 1) | logged, then 2 | logged, then 2 |
| `node` or CLI missing (127) | logged, then 2 | logged, then 2 |
| Unknown host / empty `--host=` (the handler exits 2) | 2 | 2 |
| Log append fails (no `set -e`) | 2 | 2 |
| `set -e` / trap / subshell | none present | none present |
| `CG` array unset under `set -u` | cannot happen: step 4 (`:121-144`) always runs before step 7 | cannot happen: all three branches set `CG` (`:195-214`) |

**Outcomes other than exit 2 never reach the blocking branch.** All of these predate BUG-089, and none is a blocking branch that falls through to 0 or 1.
- **jq missing** (sentinel only): `TOOL_NAME_EARLY` comes back empty, so `IS_AGENT_SPAWN=0`, so the gate is skipped and the script exits 0 (fail-open). pre-edit-gate does not use jq.
- **node missing** (pre-edit-gate): `FILE` comes back empty, so the script exits 0 at `:75-77` (fail-open by design).
- **Unset `CLAUDE_PROJECT_DIR`**: pre-edit-gate falls back to `$(pwd)`. The sentinel dies at `:36` with exit 1, before the gate runs.
- **Latent bash 3.2 bug** (`/usr/bin/env bash` resolves to `/bin/bash` 3.2.57 on this machine). With `set -u`, `for REPORT_FILE in "${REPORT_FILES[@]}"` (`pending-task-sentinel.sh:102`) is a fatal "unbound variable" error when the array is empty (measured: exit 1). So with an active sprint and zero dev/qa reports, the hook exits 1 and never writes the dispatch sentinel, and that dispatch's token attribution is lost. It never affects the blocking branch, because blocking requires cards, which requires reports. This predates BUG-089 and belongs with BUG-085 M3 or a new bug. Fix: `${REPORT_FILES[@]+"${REPORT_FILES[@]}"}`.

**Residual risk: host timeout (low).** The blocking branch now spawns one more process before `exit 2`. If that spawn hangs long enough to hit the host's hook timeout, the outcome becomes a timeout, which Claude does not treat as a block.
- On the dist and PATH branches this costs one extra node start-up.
- On the `npx -y cleargate@<pin>` fallback with a cold cache, it costs a package fetch. pre-edit-gate already pays that cost for `doctor`. For the sentinel it is a new dependency on a path that previously called no CLI at all.
- Not a bounce. Record it for STORY-058-10's Codex timing evidence.

## Q3. HOOK_ADDITION exact-string coupling

**Acceptable for this bug. Needs a guard, owned by STORY-058-09. Not a bounce.**

1. **Fresh install.** `copyPayload` writes the canonical settings.json, then `mergeSettings(existing, HOOK_ADDITION)` dedups on exact `command` strings (`merge-settings.ts:83-87`). The strings are now identical (`init.ts:52` matches the canonical `settings.json`), so there is no duplicate. The only guard, though, is a code comment. The idempotency test at `test/commands/init.node.test.ts:283-294` counts only `PostToolUse` `Edit|Write` entries. Nothing counts `PreToolUse` `Edit|Write` inner hooks, so the next edit to either string would double-register silently.
   - **Guard:** add `PreToolUse` `Edit|Write` inner-hook count `=== 1` to that scenario-2 test.
   - **Better:** build HOOK_ADDITION's pre-edit-gate entry from the payload's settings.json at runtime, so there is one source.
   - **Owner:** STORY-058-09. Its host-selector rework already rewrites what init merges into settings.json.
2. **Re-running init without `--force` on an install made before BUG-089.** settings.json and `pre-edit-gate.sh` both differ from the payload, so both are skipped (`copy-payload.ts:182-190`; neither file is first-install-only per `:79-83`). `mergeSettings` then appends `pre-edit-gate.sh --host claude` next to the old `pre-edit-gate.sh`.
   - Result: two registrations, both running the OLD `exit 1` body. doctor runs twice per edit, and the gate is still fail-open.
   - Enforcement is no worse than before, but users now see a duplicate entry in settings.json. The `--force` path is clean: settings.json is overwritten from canonical and then dedup'd.
   - `cleargate upgrade` does not duplicate either: `upgrade.ts:437` replaces each event array wholesale.
   - **Owner:** the per-host ownership rules in the install manifest (Cross-Cutting Rule 7; BUG-085 M3 / STORY-058-09).
3. The developer already flagged the flashcard for this (`#cli #settings-json #danger` in `BUG-089-dev.md`). I am not duplicating it.

## Q4. DevOps merge order

**The order is sound.** Carry out these specifics:

1. **Commit this report before merging.** `BUG-089-arch.md` is untracked in `.worktrees/BUG-089`. Commit it on `story/BUG-089` so the merge carries it.
2. **Outer merge has one conflict, in `.cleargate/wiki/log.md`.** `git merge-tree --write-tree sprint/S-41 story/BUG-089` shows `CONFLICT (content)` there, and no other overlap. Since the merge base `7359c154`, `sprint/S-41` has touched only sprint-runs state and ledger, the SPRINT-41 plan, STORY-058-10, FLASHCARD.md and sprint-context.
   - Both sides append ingest entries at the end of the file (sprint: 1 entry at 2026-09-24T23:44:26Z; story: 2 entries).
   - Resolve by keeping both: the sprint's appended block first, then the story's. Never pick one side.
3. **cli merge fast-forwards.** `main` (`3364802`) is an ancestor of `story/BUG-089`.
4. **Full cli suite.** Run it once, as plain `npm test`. Do not run it through `run_script.sh`, which adds 17 known failures from the `RUN_SCRIPT_ACTIVE` re-entry problem (FLASHCARD 2026-06-04 and 2026-07-19; QA audit item 2).
   - The baseline moves from 2683 tests to 2698, because BUG-089 adds 15.
   - Pass criterion: **2695 pass / 0 fail / 3 skipped**.
   - The developer's 9 Rule-15 failures (the init snapshot test, plus hook-signal U5-U12 across two scripts) must turn green once the outer half is on `sprint/S-41`. Any failure left over is a regression, so halt.
5. **Order of the rule-14 revert and BD.** Run the rule-14 revert (`git checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json`) after the suite and BEFORE the `dist` rebuild.
   - BD's `prebuild` (`tsx scripts/build-manifest.ts`) then rewrites the outer `cleargate-planning/MANIFEST.json` correctly. Its sha256 values for `pending-task-sentinel.sh`, `pre-edit-gate.sh` and `settings.json` are currently stale: `pending-task-sentinel.sh` is `2449e3bb…` in the manifest vs `ee029672…` in canonical.
   - Commit that regenerated MANIFEST.json on `sprint/S-41` as the once-per-wave step after merging (FLASHCARD 2026-07-18 `#dogfood #sync #build`). Do not revert it.
6. **Build dist before the live re-sync.** Live hooks resolve `cleargate-cli/dist/cli.js` first. If they are re-synced before BD, blocking still exits 2, but each block logs `hook-signal-non-2 exit=1`. `b0-live-resync.mjs:41` already refuses to run unless canonical carries `--host claude`, which enforces outer-first. It does not go through `cleargate init`, so the duplicate from Q3 item 2 cannot happen at B0.
7. **Operational trap at B0 (not a defect).**
   - The live `pending-task-sentinel.sh` currently checks `tool_name == "Task"`, which predates BUG-068 (`/.claude/hooks/pending-task-sentinel.sh:53`). `.cleargate/hook-log/pending-task-sentinel.log` has zero `flashcard-gate` lines, so the flashcard gate has never fired live.
   - Re-syncing at B0 makes that gate reachable (via the `Agent` tool name) and blocking (exit 2) at the same moment.
   - The main checkout has zero `.processed-*` markers under `SPRINT-41/`, plus at least one flagged card: `reports/STORY-058-12-ports-dev.md` (the tsx IPC card). After the outer merge there is also `BUG-089-dev.md`'s `#cli #settings-json #danger` card.
   - Once the orchestrator restarts after B0, its first `Agent` dispatch will be refused until each outstanding card is recorded or rejected and marked with `touch .cleargate/sprint-runs/SPRINT-41/.processed-<hash>`.
   - The B0 proof itself is unaffected: `b0-live-proof.sh:26,66` uses an isolated `/tmp/b0-*` `SPRINT-FX` fixture.

## Carry-forwards (no action in BUG-089)

| To | Item |
|---|---|
| STORY-058-10 | Change the shell tails to forward resolver stdout and exit with the resolved block code if Codex's signal is not "exit 2 with no stdout". Widen `HookSignal`. Register Codex with an explicit `--host codex` and test it. Include the added process spawn in the timing evidence. |
| STORY-058-09 | Add a guard so there is exactly one `PreToolUse` `Edit|Write` pre-edit-gate entry after init. Build HOOK_ADDITION from payload settings. |
| BUG-085 M3 / new bug | bash 3.2 empty-array fatal at `pending-task-sentinel.sh:102`, which drops the dispatch sentinel when there are no reports. Re-running init without `--force` duplicates pre-edit-gate on installs made before BUG-089. |

## Script Incidents

None. Only read-only `git`/`grep`/`sed`/`cat` commands were run, plus two small bash probes in the session scratchpad. Nothing was written to either repo apart from this report.

## flashcards_flagged

- "2026-09-25 · #merge #wiki · .cleargate/wiki/log.md is ingest-appended at EOF on every branch; story→sprint merges conflict there — keep both blocks, never pick a side."
- "2026-09-25 · #hooks #gate #dogfood · B0 re-sync arms the live flashcard gate (Task→Agent + exit 2) at once: touch .processed-<hash> for every flagged card before first post-restart dispatch."
- "2026-09-25 · #bash #macos · bash 3.2 + set -u: \"${arr[@]}\" on an empty array is fatal (exit 1); use ${arr[@]+\"${arr[@]}\"} (pending-task-sentinel.sh:102)."
- "2026-09-25 · #hooks #codex · BUG-089 shell tails hardcode exit 2 and discard resolver stdout; a host needing JSON/other code must change the tail, not just hook-signal.ts."

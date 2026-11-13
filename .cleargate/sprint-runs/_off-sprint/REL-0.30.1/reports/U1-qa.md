role: qa
# U1 (BUG-093) QA-Verify
QA: PASS (with one non-blocking finding F1, pre-existing, outside the reds' scope)

## Checks
1. Diff `b9fe36a..19b7fa5 -- src`: only `src/hosts/claude.ts`, 10+/7-, inside the settings.json branch of `mergeSurgeryTarget`. Matches G-R-1: `mergeSettings(removeClearGateHooks(ours), theirs)` via deps; theirs without/with empty hooks -> `removeClearGateHooks(ours)` serialized (no empty `hooks:{}`); malformed either side -> unchanged `return theirs`. `git diff eab49da..19b7fa5 -- test` is empty (reds untouched). `codex.ts`, `init`, `merge-settings.ts` not touched.
2. Fresh shell, TMPDIR private: `npm run typecheck` exit 0. Per-file `npm run test:file`, all 0 fail / 0 skipped: test/hosts/* default tier (9 files, incl. claude-merge-surgery-settings.red 7/7, codex-adapter 16, host-adapter-contract 19), test/commands/upgrade*.node.test.ts (10 files: upgrade 14, upgrade-claude-md 4, upgrade-per-host 6, pin-and-prune 11, ...), test/lib/settings-json-surgery 13, test/commands/init 36 (init merge path), uninstall-per-host 16, uninstall-reinit 4, verify-install 42, verify-install-codex-shape 20, post-shell-ingest-wiring 10, codex-payload 14. (No test/init/merge-settings* file exists; mergeSettings is covered via init.node.test.ts and the hosts files.)
3. Scratch build of 19b7fa5 in /tmp/cgb.svwc (build exit 0): `CLEARGATE_BUILT_CLI=/tmp/cgb.svwc/dist/cli.js npm run test:file -- test/commands/upgrade-user-hooks.red.integration.node.test.ts` -> pass 1 fail 0. Same test against the 0.30.0 base dist: pass 0 fail 1 (red proven).
4. Gherkin map:
   - "user hook under a ClearGate event survives; CG hooks equal upstream" -> unit case 1 + integration red (both green).
   - "user hook inside Edit|Write matcher survives beside upstream command" -> unit case 2 (green).
   - Pins: Notification control (3), no-hooks theirs (4), malformed (5), stale pre-edit-gate replaced (6), permissions kept/theirs extras not imported (7).
   - MISSING: none. Task Breakdown rows: advisory, all executed.
5. Edge probes (tsx script in /tmp, read-only): ours with a user command inside the Edit|Write group beside a stale CG pre-edit-gate.sh and a user SessionStart hook, theirs canonical-like -> user `./u.sh` and `./ss.sh` kept, stale CG command replaced by `--host claude` one, no duplicate; second application is byte-identical (idempotent). Codex adapter and init unchanged by diff.

## Findings
F1 (non-blocking, pre-existing, not a regression): `isClearGateCommand(h.command)` calls `command.includes(...)`, so a user hook with no `command` field (type `prompt`/`http`/`agent`) inside any event throws inside `removeClearGateHooks`; the surgery's catch then returns `theirs`, i.e. the full overwrite fallback and ALL user hooks and permissions are lost.
Failing input: ours `{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"prompt","prompt":"p"},{"type":"command","command":"./u.sh"}]}]}}`, theirs `{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pre-tool-use-task.sh"}]}]}}` -> output === theirs. Base code called the same function and behaved identically. Suggest a follow-up guard in `src/lib/settings-json-surgery.ts` (`typeof command === 'string'`) or a conscious waiver; the bug's stated reds and Gherkin do not cover it.

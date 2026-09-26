role: developer

# STORY-058-10 — Developer pass D (M5-A47): coexistence rows wired into the Claude clean-room driver

```
STORY: STORY-058-10
STATUS: done
COMMIT: b12240b (cli story/STORY-058-10, parent 393c286; one new commit, no amend, no D2 needed)
TYPECHECK: pass
TESTS: 170 passed, 0 failed (coexistence 24/24, clean-room-evidence 60/60, init-codex 6/6, -09 e2e 13/13, codex-hooks-harness 67/67)
FILES_CHANGED: cleargate-cli/scripts/clean-room/claude-baseline.mjs, cleargate-cli/scripts/clean-room/evidence.mjs (inside compareInstallTrees only)
NOTES: Pass D applies M5-A1/A4/A5/A7/A8/A9(b) as written. It imports the four existing helpers and changes no hook, src, scaffold, test, probe-items or ARTIFACT_INPUT_PATHS input. It does not import artifact.mjs, and the driver still exports nothing. The M5-A6 witness from this branch exits 0 with result PASS and empty findings; every required row matches M5-A47 (table below). One M5-A2 driver bullet was not in the pass-D list and was left alone (see plan_deviations).
```

Worktree: `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-10/cleargate-cli`. Branch `story/STORY-058-10` and HEAD `393c286` were checked before editing. The cli main checkout was not touched.

## Per-amendment application table

Line numbers are for `b12240b`. "was" means the line at `393c286`.

| Amendment | File:lines (b12240b) | Change |
|---|---|---|
| imports (M5-A47 contracts) | `claude-baseline.mjs:41-42`, `:44-50` | Imports `hostSetVerdict` and `agentsSkillsParityVerdict` from `evidence.mjs`, and `plantAgentsMdCanary` and `S3_PROMPT` from `probe-items.mjs`. |
| **M5-A1** S3 canary | `claude-baseline.mjs:345-346`, `:351-373`, `:377`, `:379` (was `:334`, `:342`, `:344`) | Runs after S2 and after the S1/S2 evidence reads, and only when `<room>/AGENTS.md` exists.<br>• Sets `word = crypto.randomBytes(6).toString('hex')` and keeps the original bytes and their sha256.<br>• Writes `plantAgentsMdCanary(original, word)`, runs S3 with `S3_PROMPT` through `runClaudeSession` (same flags), and writes the original bytes back in a `finally`.<br>• Passes `s3: parseClaudeStream(...)` and `canary: word` to `claudeLiveVerdicts`.<br>• Transcript: `evidence/<room>.S3.stream.jsonl`. |
| **M5-A1** room-isolation | `claude-baseline.mjs:387-388` (was `:352`) | `isolationOk` also requires `agentsMdRestored`, i.e. the restored file's sha256 equals the original's. It is `true` when the room has no AGENTS.md. |
| **M5-A4** host-set | `claude-baseline.mjs:556-563` (was `:503`), `:592-593` | `allResolvedHosts = verifyAllClaude.parsed?.installed ?? []`.<br>`hostSetVerdict({ registered, noflagInstalled: verifyNoflag.parsed?.installed ?? [], allInstalled })` feeds the cross-room row `host-set` (same status in both columns, detail as evidence). |
| **M5-A5** parity | `claude-baseline.mjs:392` (returns `s1`), `:609-619`, `:658-666` (was `:581`) | `runRoomProbeAndSessions` returns its parsed `s1`.<br>`agentsSkillsParityVerdict(noflag.s1?.init ?? null, all.s1?.init ?? null)` feeds the cross-room row `claude.live.agents-skills-parity`.<br>The verdict-map equality finding now compares the maps without `agents-md-exposure` and `mcp-connect`. |
| **M5-A7** hermetic children | `claude-baseline.mjs:477-483` (binDir/env/npmCache hoisted before step 1), `:495-499`, `:501`, `:504`, `:511`, `:515-519` (was `:464`), `:521`, `:525`, `:529`, `:536-537` | The global install is `npm install --global --prefix <C>/tools --cache <C>/npm-cache <tarball>`.<br>Every child spawned after the container exists now has an explicit `cwd` and `env: scrubbedEnv(<C>/tools/bin)`. That covers git clone (container), npm run build (src), npm pack (src), git rev-parse (src), npm install (container), `command -v cleargate` (container), `verify-install --help` (container), `claude --version` (container) and both `git init`s (room).<br>The tool preconditions are exempt, as the plan says. |
| **M5-A8** record fields | `claude-baseline.mjs:308-310`, `:394`, `:642-647`; `:445-446`, `:679`, `:719` (was `:594`, `:634`) | `.active` is read right after sprint-init, before the active-sprint drive, and returned as `activeAfterSprintInit`. Each room's evidence cell gets `; .active after sprint-init: present\|absent` appended.<br>`startedAt` is captured on the first line of `runCommand` and used by both the PASS/FAIL record and the crash record. |
| **M5-A9 (b)** comparator | `evidence.mjs:162-172` (was `:162-168`) | Rule (b) is derived from `CLAUDE_OBSERVABLE`: `files` match exactly, and `dirs` match as the prefix `${dir}/`. The semantics equal the old literal. The symlink part of M5-A9 was already in pass B (`walkTree`, `:112-117`), and the `compareInstallTrees` signature is unchanged (C1). |

## K12 (run before the commit, in `<cw>`)

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `node --check scripts/clean-room/claude-baseline.mjs` (and `evidence.mjs`) | exit 0 / exit 0 |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | tests 24 · pass 24 · fail 0 · skipped 0 |
| `test/scripts/clean-room-evidence.red.node.test.ts` | tests 60 · pass 60 · fail 0 · skipped 0 |
| `test/commands/init-codex.red.node.test.ts` | tests 6 · pass 6 · fail 0 · skipped 0 |
| `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` | tests 13 · pass 13 · fail 0 · skipped 0 |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | tests 67 · pass 67 · fail 0 · skipped 0 |
| `node scripts/build-codex-payload.mjs --check` | exit 0 |
| `git diff 393c286 -- scaffold src test` | empty |
| RS-4 precondition greps (retargeted, M5-A47) | `plantAgentsMdCanary(` → `claude-baseline.mjs:364`; `hostSetVerdict(` → `:558`; `agentsSkillsParityVerdict(` → `:610` — all hit |

## Witness (M5-A6 run, harness lane; one call, no `--evidence`)

The command:
```
(cd <mktemp -d under the session scratchpad> && node /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-10/cleargate-cli/scripts/clean-room/claude-baseline.mjs run --ref story/STORY-058-10 --container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T143140Z-10 --label "passD STORY-058-10" --known-fail sprint-init=BUG-090)
```

**Result: exit 0**, stdout `claude-baseline run: PASS`. Duration was about 2.5 min, with five haiku sessions (S1 and S2 in each room, plus S3 in the all room).

`summary.json` metadata:
- startedAt: 2026-09-26T14:31:56.593Z. This is the run start (M5-A8), not the end.
- cli_sha: b12240bd5915566290bc8b1752776c33416a6ef0
- artifact_inputs: 19c521c81af8725d57be55c63dcd38c688a4a36b9513a1e84e40f8a8fbb83b23
- artifact: cleargate-0.26.1.tgz, sha256 28045b1f00a795cf611209cafc2aecdad3a23f6de8187da2fe444668d72e98ab
- claude: 2.1.283 (Claude Code), model claude-haiku-4-5-20251001
- cleargate resolved: `<C>/tools/bin/cleargate`
- registered hosts: claude, codex · --host all resolved to: claude, codex
- findings: **none** (empty array). There is no "vacuous" finding and no verdict-map difference finding.

| Check | no flag | --host all | Evidence |
|---|---|---|---|
| room-isolation | PASS | PASS | |
| verify-install | PASS | PASS | |
| doctor | PASS | PASS | |
| tree-comparison | PASS | PASS | |
| host-set | PASS | PASS | noflag=[claude]; all=[claude, codex]; registered=[claude, codex] |
| claude.live.session-start | PASS | PASS | |
| claude.live.pre-tool-use | PASS | PASS | |
| claude.live.post-tool-use | PASS | PASS | |
| claude.live.dispatch | PASS | PASS | |
| claude.live.agents-skills | PASS | PASS | |
| claude.live.agents-md-exposure | N/A | PASS | |
| claude.live.hook-identity | PASS | PASS | |
| claude.live.agents-skills-parity | PASS | PASS | |
| claude.live.mcp-connect | INFO | INFO | noflag: cleargate: status=pending source=project; non-project entries: 4 \| all: cleargate: status=connected source=project; non-project entries: 4 |
| sprint-init | FAIL-KNOWN (BUG-090) | FAIL-KNOWN (BUG-090) | noflag: exit 1 — UNAPPROVED (1): STORY-001-01 ⏎ ERROR: sprint init blocked — 0 items missing, 1 unapproved, 0 stub-empty. … \| all: (same) |
| check-scaffold | INFO | INFO | noflag exit 0 \| all exit 0 (F8 note) |
| active-sprint | INFO | INFO | noflag: sentinel drive ok (exit 0, 1 pending file(s)); .active after sprint-init: absent \| all: sentinel drive ok (exit 0, 1 pending file(s)); .active after sprint-init: absent |
| verify-install-all-plain | N/A | PASS | |

Against the M5-A47 required outcome: exit 0 ✔; agents-md-exposure N/A / PASS ✔; host-set PASS ✔; agents-skills-parity PASS ✔; verify-install-all-plain PASS in all ✔; sprint-init FAIL-KNOWN (BUG-090) ×2 ✔.

Checks made before deleting the container:
- The all room's S3 `result` is `"NONE"` (1 turn, not an error).
- The restored `repo-all/AGENTS.md` has 0 canary lines, and its sha256 `a83f9575…15b0` equals `scaffold/hosts/codex/AGENTS.md`.
- `repo-noflag` has no AGENTS.md, which is why that column is N/A.

Cleanup:
- The container `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T143140Z-10` and the scratch cwd are deleted.
- No leftover processes reference the container.
- The four pre-existing `cg-cleanroom-*` containers under `Dev/` are not mine and were left alone.
- The driver's two recorded Claude session dirs under `~/.claude/projects/-Users-ssuladze-Documents-Dev-cg-cleanroom-20260926T143140Z-10-repo-{noflag,all}` were left in place. They are outside both repos and are the run's `session_dirs`.

## Git statuses (after the witness)

- `git -C <ow> status --porcelain`: empty. No `.cleargate/delivery` back-sync occurred.
- `git -C <cw> status --porcelain`: empty (HEAD `b12240b`).
- `git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain`: the 4 ledger files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`), plus this report once it is written.
- Observed, not mine: the cli main checkout (`main`) has an untracked `cleargate-0.25.0.tgz`. It predates this pass, and I did not touch that checkout.

## Structured handoff

```yaml
r_coverage:
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # coexistence harness: the M5-A1/A4/A5/A7/A8/A9(b) driver wiring is now real; the M5-A6 witness PASSes (b12240b)
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # unchanged since pass C (no src/hook byte changed)
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # unchanged since pass C
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # unchanged since pass C
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # build-codex-payload --check exit 0
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # unchanged since pass C; the >=1 live Codex run stays RS-4L (deferred_verification)
plan_deviations:
  - { what: "M5-A2 driver bullet not applied", why: "M5-A2's 'the driver joins per-room details with ; never |' is not in M5-A47's pass-D list (A1/A4/A5/A7/A8/A9b), so the existing ' | ' joins (mcp-connect, sprint-init, check-scaffold, active-sprint) were left alone; markdownCell escapes | so every table line still has 4 cells. Orchestrator/architect to schedule if wanted.", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/scripts/clean-room/evidence.mjs"       # computeArtifactInputs' internal git calls inherit the parent env (outside K11; M5-A7 lists only driver call sites)
  - "cleargate-cli/scripts/clean-room/artifact.mjs"       # parallel pack/install implementation; consolidation is the M5-A11 close follow-up
  - "cleargate-cli/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts"
flashcards_flagged:
  - "2026-09-26 · #shell #zsh · Agent shell is zsh: ${PIPESTATUS[0]} is empty; redirect to a log and read $? instead of piping."
```

Placement notes (these are not deviations):
- S3 runs after the S1/S2 evidence reads (the gate-check line, the wiki page and `epicRaw`), so the S3 session cannot perturb S1/S2 verdict inputs. It still runs after S2, as M5-A1 requires.
- `host-set` sits after `tree-comparison` with the other cross-room rows. The parity row follows `claude.live.hook-identity`.
- Row order does not affect `decideRun`.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked; the harness and tests ran directly, as the dispatch specified.

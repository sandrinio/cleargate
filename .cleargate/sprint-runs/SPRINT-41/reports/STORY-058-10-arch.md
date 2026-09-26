# STORY-058-10 — Architect post-flight (Developer passes A + B + C)

role: architect

POST-FLIGHT: FAIL

**Why it fails.** One gap blocks, and pass D fixes it (M5-A47). The Claude clean-room driver was never wired for coexistence:
- M5-A1, A4, A5, A7 and A8 each require edits to `scripts/clean-room/claude-baseline.mjs`.
- Pass B added only the pure helpers. `claude-baseline.mjs` is byte-unchanged since `7ce56a2`.
- Pass B also added `host-set` and `claude.live.agents-skills-parity` to `GATING_CHECKS`. The driver emits neither row, so every Claude baseline run from this branch is FAIL.
- That breaks the M5-A6 QA witness, BUG-090's QA-Verify run, and the RS-4, RS-5 and RS-CLOSE runs (Goal checks 2–3).

**What passes.** Everything else conforms to the blueprint:
- AD-2, AD-3, AD-6, AD-7 and AD-8;
- the K1, K6 and pass-C file lists;
- single-source hooks: the generated copies are byte-identical and `--check` exits 0;
- the Claude path of the 4 hooks, which is observably unchanged;
- C1: every frozen name, type and hook byte is identical at `d0f0d95` and `393c286`.

**Subject.**
- cli worktree `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-10/cleargate-cli`, `story/STORY-058-10`.
- Pass A `560a4f1`, pass B `d0f0d95`, pass C `393c286`. Base `35580b0`.
- The worktree was clean throughout.

## 1. Blueprint conformance

| Check | Result | Evidence (read at `393c286`) |
|---|---|---|
| AD-2 command template | PASS | `scaffold/hosts/codex/.codex/hooks.json`: all 5 commands are `R="$(git rev-parse --show-toplevel)" && CLAUDE_PROJECT_DIR="$R" exec "$R/.codex/hooks/<s>"`. `--host codex` is on the 4 non-SessionStart hooks, and SessionStart has none. |
| AD-3 registrations | PASS | 5 groups with one hook each. Matchers are `Edit\|Write\|apply_patch` ×2 and `Agent\|.*spawn_agent`. SessionStart and SubagentStop have no matcher. |
| AD-6 dispatch identity | PASS | **Sentinel** (`pending-task-sentinel.sh`), host-conditional:<br>• `*spawn_agent` counts as a spawn;<br>• `agent_type // "default"` and `message` are read;<br>• the file is `.pending-codex-task-<turn>-$$-$RANDOM.json` with `host:"codex"`;<br>• the parser `:104-225` is untouched.<br>**Ledger** (`token-ledger.sh`): the codex branch sits right after `INPUT="$(cat)"` (M5-A24). It:<br>• resolves `.active`, else `_off-sprint`;<br>• claims the oldest sentinel with a matching `agent_type`, else the oldest overall;<br>• writes one `codex-identity … metering=unavailable` line;<br>• exits 0 with no ledger row. |
| AD-7 edit targets | PASS | `src/hooks/normalized-event.ts` covers realpath-relative headers (M5-A26), absolute headers kept verbatim (R-N1), dedup, and `null` for an unparsable payload (R-N2). The hidden `hook edit-targets` verb uses `process.exitCode`. Both hooks call it only when `HOST=codex` and there is no `file_path`. In `pre-edit-gate`, an `edit-targets` failure blocks in enforce (with a stderr reason) and logs then exits 0 in warn. |
| AD-8 hook signal | PASS | `hook-signal.ts` adds `codex: {block:{exitCode:2}, allow:{exitCode:0}}`. Both blocking tails print to stderr before `exit 2`. |
| K1 (pass A file list) | PASS | 28 files, all on K1. `doctor.ts` changes only its imports, the `DoctorCliOptions.installViewOpts` seam (M5-A16 item 7) and the body of `runCheckScaffold`. `session-load-delta.ts` is untouched (M5-A33), and so is every canonical hook. |
| K6 (pass B file list) | PASS as a list; **the file gap is F1** | 20 files, all on K6. `claude-baseline.mjs` is allowed by K6 and required by M5-A1..A8, but was not edited. |
| Pass C file list | PASS | Only `codex-appserver.mjs`, `mock-responses.mjs` and `codex-hooks.mjs` changed. `git diff d0f0d95 393c286 -- scaffold src test package.json scripts/build-codex-payload.mjs scripts/clean-room/{evidence,probe-items,artifact}.mjs` is empty. |
| Single-source hooks | PASS | The 5 `.codex/hooks/*.sh` sha256 equal their canonical Claude scripts, at git mode 100755. `node scripts/build-codex-payload.mjs --check` exited 0 (run read-only here). `prebuild` starts with `--check`. |
| Claude path of the 4 hooks | PASS; perf cost is FU-1 | **Host detection:**<br>• Claude `settings.json` invokes `token-ledger.sh` and `stamp-and-gate.sh` with no arguments, so `HOST` defaults to `claude`.<br>• Neither script used positional arguments before -10.<br>• Every codex branch is gated on `HOST=codex`.<br>**Per hook:**<br>• `stamp-and-gate`: `null` and empty `file_path` → exit 0, as before; the loop over one target is equivalent.<br>• `pre-edit-gate`: same exit code, stdout, stderr and log lines. The `.active` bypass writes no log, so running it before the whitelist is invisible.<br>• Test 40 (neutrality vs `hooks-pre-058-10/`) is green per passes A–C. |

## 2. Deviation rulings

| # | Pass | Deviation | Ruling | Note / required fix |
|---|---|---|---|---|
| A-1 | A | `build-codex-payload.mjs` checks its entry point via realpath | ACCEPT (already accepted) | — |
| B-1 | B | `packArtifact` resolves `ref` to a sha, clones plainly, then checks out the sha | **ACCEPT** | Strictly better than `--branch`. Branch, `HEAD` and bare-sha refs all work, including from a linked worktree (re-plan P10). |
| B-2 | B | `npm install --cache <C>/npm-cache` fallback when `cliRoot` has no `node_modules` | **ACCEPT** | **When it fires:** only for test 46's ephemeral clone. From `<cw>`, the `node_modules` symlink resolves, so the fast path runs.<br>**What it does:** it fetches from the network. `package-lock.json` is untracked in cli, so it resolves fresh versions within semver. That is acceptable for a unit fixture, and it runs in the harness lane (re-plan §9).<br>**Evidence runs** (QA, RS-4, RS-CLOSE) never take this path. |
| B-3 | B | `--cache <C>/npm-cache` on the global install | **ACCEPT** | This is M5-A7's mandated form, so it is conformance, not a deviation. |
| B-4 | B | Task Breakdown ticks deferred to the orchestrator | **ACCEPT** | -10 is cli-only and has no outer story branch. The orchestrator ticks rows in its merge-lane chore commit on `sprint/S-41`:<br>• **Tick at the -10 merge:** rows 202–209 and 211. Row 208's "session-load delta" clause is satisfied by M5-A33 (no edit).<br>• **Row 210:** only after pass D plus a PASS on the M5-A6 run.<br>• **Row 212:** only after the RS-4L live PASS, because its text includes the live run. |
| B-5 | B | Test 46 not green | **CLOSED by pass C** | Test 46 is 1/1 at `393c286`; all 10 gating verdicts PASS. |
| **F1** | B | *(not self-reported; the pass-B `r_coverage` R5 claim "M5-A1..A9 covered" is false)* The Claude driver's coexistence wiring is missing | **FAIL** | See §2.1. The fix is pass D, per M5-A47. |
| C-a | C | `hooksListBefore` is `trustRoom`'s listing after workspace trust and before hash trust | **ACCEPT** | This is the only correct reading given H2: an untrusted workspace lists no project hooks, so a literal pre-`trustRoom` listing can never satisfy the verdict. The M5 phrase "untrusted before trustRoom" confused `trustRoom`'s two writes. Replacement verdict text is **M5-A45**. |
| C-b | C | The mock routes by request content, falls back to the index script, and `url` is `…/v1` | **ACCEPT** | **URL:** `…/v1` is the provider `base_url` per M5-A37; pass B's `…/v1/responses` did not conform.<br>**Routing:** the new routing is additive. A responder that returns a non-array, or throws, falls back to the script (`mock-responses.mjs:59-69`), so test 42's contract is unchanged.<br>Precedence and -13's `routes` placement are pinned in **M5-A46**. |
| C-c | C | `CLEARGATE_PLANNING_GATE_MODE=enforce` for the whole app-server session | **ACCEPT; it weakens nothing** | Only `pre-edit-gate.sh` reads the variable (`command grep` over the 5 hooks). Per session:<br>**C2 is stronger under enforce.** Its epic target is whitelisted (`.cleargate/*` once the physical `REPO_ROOT` is stripped), so the gate `continue`s before any doctor call, in either mode. But under warn, a failed `hook edit-targets` logs and exits 0, so a PreToolUse "completed" would prove nothing about target resolution. Under enforce it proves resolution. The post-tool-use half comes from `stamp-and-gate`, which ignores the mode.<br>**C4 needs enforce.** Under warn, a blocked edit also completes, so edit-allow would be vacuous (M5-A39). Under enforce, "completed + file exists" proves `doctor --can-edit` returned allowed for the approved story.<br>**C3 requires it.**<br>**C5, C6 and SessionStart** are unaffected: `pending-task-sentinel` and `token-ledger` never read the mode.<br>Pinned in **M5-A46**. |
| C-d | C | The C2 patch header is room-relative, not absolute | **ACCEPT; not a gap for RS-4L** | The blueprint never required an absolute C2 header, and relative is what H8 measured.<br>**Where absolute headers are witnessed:** only unit test 15 (R-N1, kept verbatim), plus 15b for realpath-relative. Scripted C2–C4 are all relative.<br>**Why RS-4L is safe:** its container is `/Users/ssuladze/Documents/Dev/cg-cleanroom-…`, and `realpath` confirms that path is physical. So an absolute header written by a live model equals the physical `REPO_ROOT` prefix that `pre-edit-gate.sh:238-242` strips. Relative and absolute are both handled.<br>**Remaining defect:** an absolute header written through a *symlinked* path (FU-2). |
| C-e | C | New exports `prepareCodexRooms`, `runCodexSessions`, `scriptedResponder`, `flattenHooksList`, plus the optional `turnTimeoutMs` | **ACCEPT** | All additive. `runCodexHooks(options)` keeps its signature and result shape. `stripInstructionsBlock` is byte-identical. The orchestrator had already confirmed this. |

### 2.1 F1 — the required fix (pass D, M5-A47)

**The defect (measured):**
- `git diff 35580b0 393c286 -- scripts/clean-room/claude-baseline.mjs` is empty.
- Feeding `decideRun` the driver's exact row-id set, every row PASS, still returns `FAIL` with reasons `["missing gating row: host-set","missing gating row: claude.live.agents-skills-parity"]`.
- A real run also FAILs `claude.live.agents-md-exposure.all`. `--host all` now installs `AGENTS.md`, and the driver passes `s3: null, canary: null` (`claude-baseline.mjs:339-345`), which `agentsMdExposureVerdict` maps to FAIL.
- The run may crash earlier than that. The global install (`:464`) has no `--cache`, and the tarball now fetches `toml-eslint-parser` (the M5-A7 EACCES class).
- The -09 e2e installs via `tar -xzf` and never runs the driver, which is why every suite stayed green.

**The fix:** Developer pass D, following M5-A47 K11/K12 verbatim.
- Files: `claude-baseline.mjs`, plus `evidence.mjs` inside `compareInstallTrees` only.
- Wiring:
  - **M5-A1:** the S3 canary, and the `AGENTS.md` sha check inside room isolation.
  - **M5-A4:** `allResolvedHosts` comes from `installed`, and the driver emits a `host-set` row.
  - **M5-A5:** `runRoomProbeAndSessions` returns `s1`, and the driver emits a parity row. The verdict-map equality check at `:581` excludes `agents-md-exposure` and `mcp-connect`.
  - **M5-A7:** `--cache` on the global install, and an explicit `cwd` plus scrubbed env for every child process.
  - **M5-A8:** the `.active after sprint-init` note in the evidence cell, and `startedAt` captured at the start of `runCommand` (`:594`, `:634`).
  - **M5-A9:** comparator rule (b) is derived from `CLAUDE_OBSERVABLE`.
- Then QA-Verify re-runs M5-A6 with `--container /Users/ssuladze/Documents/Dev/cg-cleanroom-<utc>-10`.
- The orchestrator records `arch_bounces` (`update_state.mjs STORY-058-10 --arch-bounce`).

**What pass D does not require re-running:**
- Pass D changes no hook byte, no `src/**` file, and no `ARTIFACT_INPUT_PATHS` input, so test 46 and the codex scripted verdicts need no re-run.
- The M5-A6 run is the only live witness.

**Parallel QA-Verify.** If the QA-Verify now running reports M5-A6 as PASS at `393c286`, that contradicts the code above and must be re-examined. The expected result is exit 1, or a crash before completion.

**M5-A12 defect found along the way.** Its RS-4 precondition greps target `probe-items.mjs` and `evidence.mjs`, where the helpers are defined. Both already hit at `393c286`, so RS-4 would have started with the driver still unwired. M5-A47 retargets them to `claude-baseline.mjs`.

## 3. Plan amendments written (append-only, `plans/M5.md` §"Amendments from post-flight (STORY-058-10, 2026-09-26)")

**M5-A45: `codex.live.discovery` replacement text.** Verbatim:

> | `codex.live.discovery` | `registrations` (repo-codex `.codex/hooks.json`, camelCase event names) is non-empty. It is checked against two `hooks/list` snapshots of the room's realpath. **Before** is taken inside `trustRoom`, after the workspace-trust write and before any `trusted_hash` write. **After** is taken once `trustRoom` has returned. In each snapshot, every registration has at least one entry with the same `eventName`, `matcher` and `command`. Every such entry has `source:"project"` and `enabled:true`, and a `trustStatus` of `untrusted` in *before* and `trusted` in *after*. |

It also rewords the "Discovery." bullet: "`hooks/list` lists every `.codex/hooks.json` registration. Each is `untrusted` after workspace trust and before hash trust, and `trusted` after hash trust. An untrusted workspace lists none (H2)."

**M5-A46: scripted-session rules as built.** These bind -11 and -13:
- `enforce` applies to the whole session, and the amendment gives the reason for each turn;
- scripted headers are cwd-relative;
- the mock `url` is the base_url;
- responder precedence is content, then script, and -13's `routes` is implemented as a responder;
- a spawn turn settles on the child;
- every turn and every request is bounded.

**M5-A47: pass D scope.** It covers K11/K12, the witness, the retargeted M5-A12 greps, and states that C1 is unaffected.

## 4. Contract C1 impact

**C1 stays at `d0f0d95`.** No contract re-point is needed.
- Pass C changed only harness internals, which C1 does not freeze (re-plan §2).
- Pass D will too: `claude-baseline.mjs` exports nothing, and `compareInstallTrees` keeps its signature.
- The orchestrator logs one line in sprint §4: "`393c286` (pass C) and pass D change no C1-frozen name, type or hook byte."

**Byte identity at `d0f0d95` and `393c286`.**
- `git diff d0f0d95 393c286 -- scaffold src test` is empty.
- Canonical raw sha256, identical at both commits and equal to the generated `.codex/hooks/` copies (git mode 100755):

| Hook | sha256 |
|---|---|
| `pre-edit-gate.sh` | `10092444c4221a81943d3476bea2029bc42bc39a97cae447a03cdaf9f4d45474` |
| `stamp-and-gate.sh` | `da609645ec2dbfbdbb0868def31a6ed4ecd38e8bc5d488ef0799414dc8455ec4` |
| `pending-task-sentinel.sh` | `43a3cb26408109e7974f08db2dc38cf2cc2c4ea9e2fd6d5f23b556a6abfc1b30` (matches the M5 "Superseded" row) |
| `token-ledger.sh` | `f4d832bacff0f6d3f8fbccf5083dbee99690cbf369873fa2b7a72c47e37dee9e` |
| `session-start.sh` (unchanged by -10) | `9803bce60f59548dc683599278f8b9ecf5a0c3ec2258056c1672f1f3aabc0bbb` |

- Consequence: -11's `test/fixtures/hooks-pre-058-11/`, frozen at C1, needs no re-freeze for pass C or pass D.

**Frozen signatures.**
- Unchanged: `codexHookVerdicts`, `CODEX_GATING_IDS`, `renderCodexRunSection` and `checkCodexEvidence`. Pass C did not touch `evidence.mjs`.
- `runCodexHooks(options)` keeps its signature; `turnTimeoutMs` is optional.
- `CodexAppServer.start` still uses argv `['app-server']`, sends `initialize` then `initialized`, and answers `{decision:'decline'}`.
- **One value-level change:** `startMockResponses().url` went from `…/v1/responses` to `…/v1`, which restores conformance with M5-A37. Any consumer code built on C1 that derives `base_url` from `url` must use the pass-C value at integration.

**Seams STORY-058-11 must build on at integration.** Rule 21 applies: pass C's `codex-hooks.mjs` wins, since it was about 719 changed lines, and -11 re-applies only its insertions.
1. **Where the probes go.** Put `codex.live.roles` and `codex.live.skills` in `runCodexSessions(opts)` (`codex-hooks.mjs:253`), not in `runCodexHooks`. That function owns the scrubbed `codexEnv` (with `CODEX_HOME`, `HOME` and enforce), `client`, `mockServer`, `roomReal` and the `turn()` closure (`:318-340`).
2. **Where the spawn schema is.** It is not in `body.tools`, so the -11 blueprint line "request `tools`" is superseded by pass C's measurement. It sits in the `body.input[i]` item whose `type` is `"additional_tools"`, under namespace `collaboration`, tool `spawn_agent`. The `agent_type` property appears only when `.codex/agents/*.toml` exist.
3. **Reading full request bodies.** `turnDumps` stores only the output of `summarizeRequest`, which keeps routing keys. So -11 adds `mockServer.requests.slice(reqBefore)` for C6 to `inputs` (for example `inputs.c6.requests`). The child's request is the one whose `client_metadata["x-codex-turn-metadata"].agent_name` is `/root/cg_probe`.
4. **The qa branch.** `hasQaRole` (`:386-393`, `expectedAgentType` `:427`) switches C5/C6 to `agent_type:'qa'` automatically once `qa.toml` ships. It is untested until -11. -11's QA-Verify scripted run is its first witness. That run must confirm `scriptedResponder`'s child routing (`:170`, `JSON.stringify(last).includes(CHILD_TASK)`) still matches when the role's `developer_instructions` join the child's input.
5. **The skills probe.** `codex.live.skills` runs `codex debug prompt-input` with `codexEnv`, after `trustRoom`.
6. **The verdicts.** Add the roles/skills verdicts to `codexHookVerdicts` and `CODEX_GATING_IDS` in `evidence.mjs`. The codex region is untouched by pass C, and pass D touches only `compareInstallTrees`, so this merge is mechanical.
7. **Settling and discovery.** Keep pass C's `settle` predicate for C6 (`childSettled`), and M5-A45's discovery semantics.

**Seams STORY-058-13 must build on.** -13 picks up pass C through cli `main` at its integration (C3 → C2 → C1 base).
1. **Mock routes.** Implement `startMockResponses({ routes, usage })` on pass C's `respond`/`setResponder` interception point (`mock-responses.mjs:59-69`), as a responder built by `buildLoopRoutes` (M5-A46).
   - Record `NO-ROUTE`/`unrouted` and `served` from inside that responder path.
   - `usage(i)` replaces the `USAGE` constant only when it is supplied.
   - `script` and `respond` stay as they are.
2. **`runLoopTurn`.** Reuse pass C's protocol corrections, never re-derive them:
   - `thread/start` returns the id at `result.thread.id`;
   - `turn/start` takes `{threadId, cwd, approvalPolicy, input:[{type:'text', text, text_elements:[]}]}` and returns `result.turn.id`;
   - completion is keyed on `turn/completed.params.turn.id`;
   - `request()` is bounded, and pending requests reject when the child exits.
3. **Other `codex-appserver.mjs` additions:**
   - `listProjectHooks(client, roomRealpath)` is `flattenHooksList(await client.request('hooks/list', { cwds: [roomRealpath] }))`;
   - `configWrites` counts every `config/batchWrite` inside `request()`;
   - export the existing `keyPath()` (`codex-appserver.mjs:230-232`) rather than re-implementing it, because batch edits are `{keyPath, value, mergeStrategy:'upsert'}`.
4. **Control verdicts.** They reuse `codexHookVerdicts`, fed raw `{method, params}` notifications per session. Spawn turns settle on the terminal `subAgentActivity` item plus `subagentStop`.
5. **Trust.** `--trust harness` uses `trustRoom`, which returns `{hooks, listed}`. Under step L's human trust, the M5-A45 "before" snapshot is taken after the TUI's workspace trust and before hash approval.
6. **Environment.** Use `scrubbedEnv` from `artifact.mjs`, which also scrubs `CODEX_*` and `OPENAI_*`. Never use `claude-baseline.mjs`'s private one (`:54-65`).

**BUG-090 (a C1 consumer).**
- It is pass-C-neutral. Pass C calls `approveProbeStory(stripInstructionsBlock(storyRaw))`, so BUG-090's `approveProbeStory` flip does not change C4.
- Its QA-Verify `claude-baseline.mjs run`, which happens after -10 is integrated, needs pass D merged with -10. Without it, that run FAILs for F1's reasons.

## 5. RS-4a readiness

RS-4a runs after -10's merge and BD. The source is cli `main`'s `scaffold/hosts/claude/.claude/hooks/`, via `node /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/b0-live-resync.mjs`: first a dry run, then `--apply`.
- The live pin is `0.20.0`, read from the live `stamp-and-gate.sh` `# cleargate-pin:` line.
- The expected hashes are canonical at `393c286` with `__CLEARGATE_VERSION__` replaced by `0.20.0`. They hold as long as no hook byte changes before the merge: pass D changes none, and no upstream item edits these hooks.

| Live file (`OUTER/.claude/hooks/`) | Now (= cli `main` `35580b0` + pin) | Expected after RS-4a (mode 0755) |
|---|---|---|
| `pre-edit-gate.sh` | `cb06ccc2ab863f52eee1971fe68574d090fd7ad7078f961323ce2594517508c5` | `4e401831b09e171ad4f0ec8ae49e218cf666556cf27fa507958820f9ac053e0a` (1 placeholder) |
| `stamp-and-gate.sh` | `9c6beeda6d1a0db19b1c6e21de8f20b9845317d40f32d7f4d390025d652a5462` | `f1c4eaf99ea07c7570c9c23383c0d304ce429ceaeedfe20d0ca776b882913b79` (2 placeholders) |
| `pending-task-sentinel.sh` | `444becd20e458c7982203243b7e6d8471905d90120660eca430405804fbb4d1b` | `fe597ef080df2b70e3f8c7935886687b28de0df01b35ba1074ef451bf5f30766` (1 placeholder) |
| `token-ledger.sh` | `ec83cebc66d73b841b544cd4f5734244d8a3f63251660944548e5d7f60b4d3b5` | `f4d832bacff0f6d3f8fbccf5083dbee99690cbf369873fa2b7a72c47e37dee9e` (no placeholder: equals canonical raw) |

**Expected states:**
- **After merge and BD, before RS-4a:** `node cleargate-cli/dist/cli.js doctor` prints `scaffold drift` lines for exactly these 4 files, and `canonical-live-parity` 5d is red. Both are expected (M5-A30).
- **Dry run:** the `changes` list is exactly `hooks/pre-edit-gate.sh`, `hooks/stamp-and-gate.sh`, `hooks/pending-task-sentinel.sh` and `hooks/token-ledger.sh`, with the before/after hashes above. Any extra entry halts the step. `session-start.sh` must not appear: it stays `14d73e83bd2f7052a237489785aa65322b152c02a904b14dea421c4d99c44cb4`.
- **After `--apply`:**
  - `shasum` of live matches the right-hand column;
  - `doctor` shows no drift;
  - 5d PASSes (step 3b);
  - `.claude/settings.json` is untouched, so no restart is needed.
  - In this Claude session, the next Agent dispatch writes a `.pending-task-*` sentinel (the Claude name, not `.pending-codex-task-*`) and one `wrote sentinel` line in `hook-log/pending-task-sentinel.log`.
  - The next SubagentStop appends a ledger row exactly as before.
  - The next Edit logs the usual `stamp=… gate=… ingest=…` line.

## 6. Follow-ups for close

These are to be filed at close under EPIC-058; none blocks -10 beyond F1. The six items in M5 "Orchestrator actions 7" still stand, and FU-3 extends the last of them.

- **FU-1: extra work on whitelisted edits in `pre-edit-gate.sh` (Claude path).**
  - The whitelist test now sits inside the per-target loop (`scaffold/hosts/claude/.claude/hooks/pre-edit-gate.sh:244`).
  - Before it, a whitelisted edit now runs `resolve_cg` (`:206`), a `node` process for `PROMPT_SNIPPET` (`:209`) and `grep -rl` over pending-sync (`:224`). Before -10 it exited at the whitelist check.
  - Exit code, streams and log lines are unchanged (test 40); latency is not, and this hits every `.cleargate/**` edit.
  - Fix: a pre-pass over `TARGETS` that exits 0 before `:196` when every target is whitelisted. That keeps R-H2's rule of never short-circuiting a mixed list.
  - This is a hook edit, so it needs a sanctioned row, codex regeneration and a live re-sync. It is out of scope for the -11 build already running on C1.
- **FU-2: absolute headers through a symlinked path miss the whitelist** (`src/hooks/normalized-event.ts:46`).
  - An absolute apply_patch header written via a symlinked path (macOS `/tmp/…` or `/var/…`) is kept verbatim.
  - It therefore never matches the physical `REPO_ROOT` prefix that `pre-edit-gate.sh:240-242` strips. `.cleargate/**` targets skip the whitelist and go to `doctor --can-edit`, which blocks them under enforce.
  - Fix: realpath the longest existing ancestor of an absolute header.
  - Not reachable in the RS-4L container, whose path is physical.
- **FU-3: harness children in `artifact.mjs` are not hermetic** (the M5-A7 class, at `scripts/clean-room/artifact.mjs:53-55,67,69-70,78,93`).
  - These children inherit the caller's cwd and full env (`CLAUDE_*`, `CLEARGATE_*`, `GIT_*`), and `codex-hooks.mjs` runs from OUTER at RS-4 and RS-CLOSE.
  - It measured harmless in test 46 and the pass-C drivers.
  - Fold it into the existing close follow-up "consolidate `artifact.mjs` with `claude-baseline.mjs`". That work must also unify the two scrub lists: `claude-baseline.mjs:54` lacks `CODEX_` and `OPENAI_`, while `artifact.mjs:23` has them.

## Script Incidents

None. No `run_script.sh` wrapper was invoked.

**Probes run, all read-only:**
- `git diff/show/ls-tree/log` in the -10 worktree and on cli `main`;
- `node scripts/build-codex-payload.mjs --check` (exit 0);
- one in-process `decideRun` call (a pure function);
- `shasum` of the live and canonical-plus-pin hooks.

Nothing was built, committed or checked out, and no harness ran. Outer status was the 4 ledger files at start; this report and the `plans/M5.md` append are my only writes.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #test-harness #clean-room #danger · New GATING_CHECKS ids need the live driver to emit the rows; helpers alone make decideRun FAIL 'missing gating row'."
  - "2026-09-26 · #plan #boundary · A precondition grep must hit the driver that wires a helper, not the module defining it, or it passes unwired."
  - "2026-09-26 · #codex #trust · Untrusted workspaces list no project hooks: the 'untrusted' discovery snapshot sits between workspace and hash trust."
  - "2026-09-26 · #codex #test-harness · Drive Codex sessions under enforce: warn lets a blocked edit complete, so edit-allow and edit-targets fail open unseen."
  - "2026-09-26 · #hooks #perf · Moving a whitelist exit into a per-target loop makes whitelisted Claude edits pay CLI resolve + node + grep first."
  - "2026-09-26 · #codex #hooks · An absolute apply_patch header via a symlinked path misses the physical REPO_ROOT strip; realpath its existing ancestor."
```

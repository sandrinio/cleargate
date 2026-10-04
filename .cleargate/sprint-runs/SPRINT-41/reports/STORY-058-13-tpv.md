role: architect

# STORY-058-13 TPV report

```
TPV: REJECTED
RESEAL_PATCH: reports/STORY-058-13-tpv-reseal.patch
RESEAL_SHA256: cc65720bc57c6e2a5a9e943c2e7d855a89f9c7475ef843d55690fabd0e70c8f7
RESEAL_SCOPE: 3 test files, +294/-59 (verify-install-codex-shape, codex-loop-evidence, codex-loop-harness); git apply --check clean on cli 1111659 (also read-only against <cw>); 0 CR bytes; no src/scaffold/script/fixture/helper change
PLAN_AMENDMENT: plans/M6.md "## Amendments from TPV (STORY-058-13, 2026-09-27; role: architect; append-only)" TPV13-A1..A6
COUNTS_AFTER_RESEAL: unchanged. Default tier +84 (20+43+21), integration +4. At 1111659 + re-seal: 87 red; anchors A-11 and the 8 untouched cases of the amended -10 file; e2e Part B is a diagnostic skip without CLEARGATE_CODEX_BIN. D4 = 3653 / 3651 / 0 / 2
```

## Verdict in one paragraph

The seal is wired correctly. The counts reproduce exactly, every import resolves, and every red fails for the right reason. A plan-conformant build turns 76 of the 87 reds green. **The other 11 sealed assertions cannot pass on any plan-conformant build:**
- `verify-install-codex-shape` Tests 1, 3, 9 and 11b: a synthetic snapshot without `pin_version`.
- `codex-loop-harness` 20c, 21e and 21g: a spawn read as `input`, `threadParams` asserted on turn/start, and the -10 fake rejecting batchWrite.
- `codex-loop-evidence` 14, 14b, 15.29 and 15.30: an S5 stream that contradicts F6.6 and the real binary, and INFO rows asserted PASS.

Four plan texts also make e2e Part B and Run 1 unsatisfiable. I measured each one with the pinned binary:
- the idle-only settle rule;
- the `node --test test/` fixture;
- a DevOps `update_state.mjs` step with no `CLEARGATE_STATE_FILE`;
- the SubagentStart and SubagentStop joins.

With the re-seal and TPV13-A1..A6, a scratch build ran the S5 loop end to end under the pinned codex with the scripted provider. All six `LOOP_TRANSPORT_IDS` passed, `hook-matrix` passed, and metering was `matchesProvider:true` for all five dispatches. On a conformant build the re-sealed suite kills 83 of 85 plausible wrong builds; the sealed suite kills 39. The 2 survivors are equivalent. The integration against the real cli `main` `f0c33f7` (-12 and BUG-099 merged) auto-merges with no conflict.

## Reproduced counts

Scratch root `/private/tmp/cg-s41-tpv13-20260926T212340`:
- Each tree is a `git clone --no-hardlinks` nested in an outer clone at `story/STORY-058-13` (`e1973fe6`).
- `.claude` is a copy of `OUTER/.claude`, and `node_modules` is symlinked.
- `prebuild` and `build` ran in scratch only.

| Tree | shape | CLI (int) | evidence | harness | e2e (int) | -10 amend | red |
|---|---|---|---|---|---|---|---|
| `1111659` sealed | 1/20 | 0/2 | 0/43 | 0/21 | 1/2 (B skip) | 8/9 | **87** (= QA-Red) |
| sealed + re-seal | 1/20 | 0/2 | 0/43 | 0/21 | 1/2 | 8/9 | 87 |
| conformant A (+B units), sealed tests | 16/20 | 2/2 | 39/43 | 18/21 | 2/2 (B skip) | 9/9 | 11 unsatisfiable |
| conformant A+B + re-seal | 20/20 | 2/2 | 43/43 | 21/21 | 2/2 (B skip) | 9/9 | 0 |
| integrated (merge `f0c33f7`) + re-seal | 20/20 | 2/2 | 43/43 | 21/21 | 2/2 | 9/9 | 0 |

**Red reasons at `1111659`, same with the re-seal:**
- shape: 19 `AssertionError`s on the real `HOST_VERIFIERS.codex` (1 id instead of 8, `undefined` checks).
- CLI: missing ids and the exit code.
- evidence: 43 × `ERR_MODULE_NOT_FOUND` inside each test.
- harness: 9 × `ERR_MODULE_NOT_FOUND` (`loop-script.mjs`), missing-export asserts, `runLoopTurn is not a function`, and `served` undefined.
- -10 amend: the null-snapshot `deepStrictEqual`.

No wiring error in any file.

## Check 1: counts and anchors

Reproduced exactly (table above):
- Default tier: +84, from 20 + 43 + 21.
- Integration tier: +4.
- Anchors: A-11, plus the -10 file's 8 untouched cases.
- e2e Part B: counted as a pass (diagnostic skip).

`npm run typecheck` exits 0 on every tree. Tests are outside `tsconfig` `include`, so the re-seal's casts are not type-checked.

## Check 2: plan-conformant build

**Pass A** is built in full (`src/commands/verify-install.ts` plus the CHANGELOG line, per F6.2):
- `splitViewRoot` option, context field, default, and handler forward;
- the 8 checks with the exact detail strings;
- 2 live ids.

Results:
- Shape: 16/20 against the sealed tests (the 4 failures are U1 below), 20/20 re-sealed.
- CLI integration 2/2. e2e Part A 2/2: a real `npm pack` artifact, `init --host codex`, and 8 codex ids passing.
- Amended -10 file 9/9. `verify-install.red` 42/42, `verify-install-cli` 5/5.

**Pass B units** are built in full:
- `mock-responses` routes, usage, `served`, `unrouted`, and the TypeError;
- `codex-appserver`: `threadParams`, `runLoopTurn`, `configWrites`, `listProjectHooks`;
- `codex-hooks`: 12 exports plus `readCodexRegistrations`;
- `loop-script.mjs` (`authorLoopStory` per F6.4 verbatim, `buildLoopRoutes`, `loadLoopFixtures`);
- `loop-evidence.mjs` (every M6:735–742 export plus `humanTrustDiscovery`).

Results: evidence 39/43 and harness 18/21 against the sealed tests; 43/43 and 21/21 re-sealed.

**Real-binary measurements.** These used the pinned `codex-cli 0.154.0-alpha.6.2` (sha256 re-measured `1d8b80de…afa`), the scripted provider, a scratch `CODEX_HOME` and `HOME`, and the container `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T213806Z-tpv13`, since removed. No live provider, no dedicated `CODEX_HOME`, no `~/.codex`, no `login status`.
- **P1:** `codex app-server generate-ts` gives `ThreadStatus = {type:'idle'|'notLoaded'|'systemError'} | {type:'active',…}` and `HookCompletedNotification {threadId, turnId, run}`.
- **P2:** a code-mode `exec` wrapping `apply_patch`:
  - it produces a `fileChange` whose id is `exec-<uuid>`;
  - its preToolUse and postToolUse run ids end `:exec-<uuid>` on the same thread, so **the F6.6 join holds and the "measure first" stop does not trigger**.
- **P2, exec_command:** a nested `exec_command` yields a `commandExecution` item (`/bin/zsh -c '<cmd>'`, `exitCode`).
- **P2, spawn:**
  - the spawn is a root-thread `subAgentActivity` item with kind `started` and id = the call id, gated by a root preToolUse ending `:<call id>`;
  - **SubagentStop runs on the child thread with the suffix-less id `subagent-stop:4:<hooks.json>`**;
  - **no SubagentStart** fires, because it is unregistered;
  - SessionStart fires once per root thread and never on a child.
- **P3:** the S5 loop with the TPV `buildLoopRoutes` in a freshly prepared room (installed from the packed scratch artifact; epic, story and sprint authored; `sprint init` exit 0).
  - **Attempt 1** exposed two plan defects. The settle failed: after the children finish, their last status is `notLoaded`, so the idle-only rule hit the 600 s timeout. The test command failed: `node --test test/` exits 1 on Node ≥ 22 (measured on node v25.9.0), so `outcome` FAILs, and the qa-red "must fail" step turns into a false red. (The probe itself also skipped `declareProbeSprint`, so `sprint init` refused; that was my probe's omission, not a plan defect.)
  - **Attempt 2**, with those fixed, exposed a failed state step: `update_state.mjs` without `CLEARGATE_STATE_FILE` exits 1, so `terminal-state` FAILs. Every other loop id passed.
  - **Attempt 3** was run with all three TPV13-A4 fixes. It took 67.6 s with no `unrouted` request and produced:
    - five dispatches `architect, qa, developer, qa, devops`;
    - the worktree created from `sprint/S-01` and removed, the branch deleted;
    - a DevOps-thread merge whose second parent is the story head;
    - `state.json` `Done` (`events.jsonl` Ready to Bounce → Done);
    - `npm test` 0, the import probe `hello-world`;
    - the serial verdict GREEN with `{metering:'unavailable'}` and record exit 0;
    - five identity lines, `hook-matrix` PASS, and `matchesProvider:true` for 5 of 5 dispatches.

**Not built:** `codex-loop.mjs` (prepare, run and check, plus `prepareCodexLoop`/`runCodexLoop`), `fixtures/codex-loop/**` and the Codex section of `clean-room-verification.md`. S1–S4 were not re-run through the -13 routes. They reuse -10's measured hooks (RS-4/RS-5 scripted PASS), and P2 shows that the code-mode nesting they now use fires the same hooks with the same joins. The e2e Part B and a full Run 1 therefore stay unproven end to end. The loop half is proven.

## Check 3: unsatisfiable sealed assertions (11) and the re-seal

| # | Sealed test | Why no conformant build passes | Re-seal |
|---|---|---|---|
| U1 | shape Tests 1, 3, 9, 11b | `makeCtx`'s synthetic snapshot has no `pin_version`. F6.2 compares `buildStdioEntry(snapshot.pin_version ?? version)` (= `cleargate@0.26.1`) with the fixture install's `cleargate@0.0.0-m2`, so `codex.mcp-registration` FAILs on a correct install. | `makeCtx` reads the install's own snapshot. 11b pins the single detail verbatim. |
| U2 | harness 20c | It reads `call.input.fork_turns`. F6.5 builds spawns with `spawnAgentItem`: `function_call`, JSON-string `arguments`, no `input`. | `JSON.parse(call.arguments)`, plus the `STORY=001-01 ` prefix and the agent_type order (F8 row). |
| U3 | harness 21e | It asserts `turn/start` `params.threadParams`, but F6.3 spreads it into **thread/start**. The stub also lacks `serverRequests` (runTurn returns a copy of it, so it throws a TypeError) and uses `status:'idle'`, while P1 gives `{type:'idle'}`. | Assert the exact thread/start params and no `threadParams` on turn/start. The stub carries `serverRequests`, `{type:'idle'}` and a `{type:'notLoaded'}` thread. A 200 ms quiet window is asserted. |
| U4 | harness 21g | It awaits `request('config/batchWrite')` on the -10 fake, which answers every unknown method with `error: unhandled`, and -10's `request()` rejects on that. | An `initialize` does not count. `assert.rejects` on batchWrite, then it counts 1. A rejected `hooks/list` does not count. |
| U5 | evidence 14, 14b | The S5 stream has no root SessionStart, no pre/post runs on its two edits, and no dispatch gate on its five spawns. Its SubagentStop is joinable only by a run-id suffix equal to the child thread, which the binary never emits (P2), and its `thread-dev` is a substring of `thread-devops`. Any F6.6 hook matrix FAILs the baseline. Rows 15.17/15.18 add edits indistinguishable from the baseline's, and a conformant build's dispatch verdict FAILs every sealed input, so rows 15.1–15.5 and 15.17–15.20 pass vacuously. | Rebuilt on the P2/P3 shapes. The -10 `controls` copy stays verbatim. |
| U6 | evidence 15.29, 15.30 | They require every record entry to be PASS. M6:738 puts INFO rows (metering, trust-posture, wall-clock) in the record. | Only the pinned gating ids, and both halves PASS. |

**The re-seal also pins untested plan text:**
- **By value:** the constants `PINNED_CODEX_SHA256`, `LOOP_TRANSPORT_IDS` and `ENFORCEMENT_IDS`.
- **Metering:** metering INFO `unavailable`, and `- metering: unavailable` in the rendered section.
- **Hook matrix:** a gate-less spawn FAILs, and a blocked edit that still gets a PostToolUse FAILs.
- **Trust subtrees:** under human posture, a changed subtree FAILs the result.
- **Serial verdict:** a complete measured tokens object passes `validateVerdicts` but FAILs serial-verdict.
- **Test 15.17:** keeps its PostToolUse, so only the missing pre-hook check can fail it.
- **Test 15.18:** keeps its PreToolUse, so only the missing post-hook check can fail it.
- **Metering data:** realistic `childUsage` shapes; P3's record/provider field mapping.
- **Mock step index:** it follows the `*_output` count, not the request count.
- **Verify-install shape rules:**
  - matcher-sensitive wiring;
  - `skip` when `!versionMatches`;
  - hooks-executable over snapshot-only and hooks.json-only scripts;
  - instruction-block compared only when `versionMatches`;
  - the roles key set regardless of version, and the roles/skills byte compares;
  - the handler forwarding `splitViewRoot`.
- **Temp dirs:** cleaned at exit. The sealed files left 687 `cg-s41-13-*` dirs in `$TMPDIR` across runs.

## Check 4: mutants (85, plus 1 composite)

"Masked" means the kill lands in one of the 11 unsatisfiable tests, or in a row that passes vacuously on the sealed stream. "Integ" means only the integration tier kills it.

| Group | Sealed killed | Masked | Survived | Equivalent | Re-sealed killed |
|---|---|---|---|---|---|
| A: verify-install (24) | 11 | 4 | 9 | 0 | 24 (MA22 integ only) |
| B: loop evidence, harness, routes (61) | 28 | 23 | 8 | 2 | 59 |
| **Total** | **39** | **27** | **17** | **2** | **83** |

**Requested wrong builds:**

| Wrong build | Id | Sealed | Re-sealed |
|---|---|---|---|
| discovery graded on the untrusted listing under human trust | MB1 | killed | killed |
| negative controls PASS with no gated call | MB2 | killed | killed |
| missing devops dispatch: verdict | MB5 | masked | killed |
| missing devops dispatch: routes | MB56 | masked | killed |
| substring route markers | MB49 | killed | killed |
| metering claimed verified | MB28 | survived | killed |
| rendered section claims metering verified | MB29 | survived | killed |
| `splitViewRoot` missing treated as PASS | MA1 | masked | killed |
| identity agent_type ≠ rollout role | MB7 | masked | killed |
| roles parsed by regex over the raw text | MB39 | survived | survived: **equivalent** on measured rollouts (`source.subagent.thread_spawn.agent_role` precedes and equals `payload.agent_role`) |

**Other results:**
- The second equivalent is MB6: identity count unchecked. It is redundant with the identity-vs-rollout check.
- The composite MBX, a "sealed-shape build" that joins SubagentStop by run id, survives the sealed suite and is killed by the re-seal.
- **Sealed survivors killed by the re-seal:**
  - Group A: MA7, MA9, MA10, MA11, MA13, MA16, MA17, MA18 and MA21.
  - Group B: MB9, MB15, MB28, MB29, MB33, MB34, MB41 and MB48.
- **Masked, all killed by the re-seal:**
  - Group A: MA1–MA3 and MA20.
  - Group B: MB5, MB7, MB8, MB13, MB17–MB24, MB30–MB32, MB44–MB46, MB48b, MB51–MB53 and MB56.

## Check 5: cross-item fallout

The set is the E8/F8 anchors, the rule-16 set (25 `CLEARGATE_META_ROOT` files, helper excluded, no override), the M2 pair (`CLEARGATE_INIT_BASELINE` read only) and every file that imports a touched module. That is 64 files run solo, plus `readiness-predicates-spidr-coverage` (32/32 on all trees). The harness-lane or paid e2e files were not run: `clean-room-claude-baseline`, `codex-hooks` e2e, `claude-dispatch-path`, `frontmatter-authoring`, `spidr-coverage` e2e and `sprint-init-fresh-install`.

| Tree | Tests | Pass | Fail |
|---|---|---|---|
| sealed `1111659` | 971 | 877 | 94 = -13's 86 reds + 8 twin-parity |
| conformant | 971 | 963 | 8 twin-parity |
| integrated | 971 | 971 | 0 |

- **No file got worse, and no other item's sealed test turns red.**
- The 8 twin-parity cases are these:
  - `codex-enforcement-delta` (1)
  - `contract-first-dag-text` T4
  - `serial-dispatch-docs` 26 and 27
  - `file-surface-gate-e2e` (1)
  - `ratchet-retired` (1)
  - `enforcement-section-13` (1)
  - `serial-twins` 28
- They fail only because `<ow>` sits at `e1973fe6`, before -12's outer twins (`0fe9f88d`). They clear on `sprint/S-41`. F8's "rule 16 … 338/338" was cited from -12's integrate report and does not hold in `<ow>` today (TPV13-A5).
- On the integrated tree, BUG-099's test is 4/4 and the -13 e2e is 2/2 (Part A). Both script gates, `--check` and typecheck exit 0, and verify-pack reports **232 files / payload 88** (unchanged).

## Check 6: integration forecast

Real cli `main` is `f0c33f7`: `e720592`, then -12's merge `5f25a20`, then BUG-099 `abd9afb`, merged 01:42 +0400. Simulation: conformant -13 plus the re-seal, committed in scratch on `9a94ff2`, then `git merge --no-ff f0c33f7`.

**cli: no conflict.**
- **`codex-hooks.mjs` auto-merges.** BUG-099's hunks are the usage line (`:26`, `[--story STORY-058-10]`) and `checkCommand`'s `--write-result` block (`:866–884`). -13's hunks are the `export` keywords (`:110–142` and the leaf readers after `runCodexHooks`), the call-site swap (`:321–333`) and `readCodexRegistrations` beside `camelizeEvent`.
- **Resolution if a placement differs.** Take `main`'s usage header and `checkCommand` verbatim (BUG-099 owns them). Then re-apply -13's `export` keywords and the extraction. Never add `--story` handling in -13.
- **`CHANGELOG.md`:** untouched on `main` since `9a94ff2`, so there is no conflict. F12's "CHANGELOG only; keep both" does not arise.
- **`init-fixture.ts`:** no interaction (F5). `main`'s tail (BUG-098 ×2, -12 ×1/×3) arrives unmodified.
- **Delta check:** `git diff --numstat real-main HEAD` equals `git diff --numstat 9a94ff2 <-13 tip>`.

**outer.** `git merge --no-ff sprint/S-41` (`c5bb05e2`) is clean. Upstream touches neither -13 outer path, so F6.9's pre-merge check is empty.

**After integration.** Run 1 reads `stale` because BUG-098 changed `src/**`, so the F6.9 scripted re-run applies. `sprint-execution-mirror` is 4/4 after RS-5 and is no longer a named red.

**D4.** BUG-099's recorded total **3569 / 3567 / 0 / 2** plus 84 default tier = **3653 / 3651 / 0 / 2**.

## Developer brief

**Precedence.** This brief first, then M6 TPV13-A1..A6, then F0–F12 with errata (plus PF12 for -12's driver behaviour), then the M6 -13 blueprint.

**Start gate.** Start only after QA-Red applies `reports/STORY-058-13-tpv-reseal.patch` on `1111659` and re-measures 87 red with the same anchors. The 3-point gate:
- sha256 `cc65720b…c8f7`;
- `git apply --check` clean;
- the staged list is the 3 files, +294/−59.

**Paths.**
- cli `<cw>` = `OUTER/.worktrees/STORY-058-13/cleargate-cli`.
- outer `<ow>` = `OUTER/.worktrees/STORY-058-13`.
- Run `npm run prebuild && npm run build` in `<cw>` before the CLI integration file and the e2e.
- Commit before running the e2e: it packs HEAD.

**Pass A.**
- **Allow-list:** `src/commands/verify-install.ts`, and `CHANGELOG.md` (the M6:670–671 line, first under `## Unreleased` / `### Added`).
- **Make-green set:**
  - shape 20/20, CLI 2/2, e2e Part A, and the -10 file 9/9;
  - `verify-install.red` 42/42, `verify-install-cli` 5/5;
  - the M2 pair 5/5 and 15/15, compared against `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`.
- **Pinned (F6.2):**
  - `splitViewRoot?: string` on `VerifyInstallOptions`, and `splitViewRoot: string` on `VerifyCtx`;
  - the default `<pkg>/templates/scaffold`, with the `process.cwd()` fallback;
  - `splitViewRoot: cli.splitViewRoot` in the handler's forward list;
  - the 8 ids in order, with every detail string;
  - `split view unavailable: <String(root)>` as the single detail;
  - owned roots only for foreign hooks;
  - `snapshot.pin_version ?? version`;
  - 2 live ids with F6.2's descriptions.

**Pass B.**
- **Allow-list, cli:**
  - `scripts/clean-room/mock-responses.mjs`;
  - `codex-appserver.mjs`;
  - `codex-hooks.mjs`: the 12 exports, `readCodexRegistrations` beside `camelizeEvent`, and the call-site swap, nothing else;
  - new `codex-loop.mjs`, `loop-evidence.mjs`, `loop-script.mjs`;
  - `fixtures/codex-loop/**` with the TPV13-A4 bytes.
- **Allow-list, outer `<ow>`** (both uncommitted until integration):
  - `clean-room-verification.md` `### Codex (STORY-058-13)` under `## Other hosts`, with no `npm publish`;
  - `codex-loop-evidence.md`.
- **Never:**
  - `scripts/clean-room/{evidence,artifact,probe-items,claude-baseline}.mjs`;
  - `scaffold/**`, `scripts/build-codex-payload.mjs`;
  - `src/hosts|init|lib/**`, `test/**`, `package.json`.
- **Make-green set:**
  1. evidence 43/43 and harness 21/21;
  2. then `CLEARGATE_CODEX_BIN=<PINNED> npm run test:file -- test/e2e/codex-loop.red.integration.node.test.ts`, which must PASS with `matchesProvider` true for every dispatch;
  3. then Run 1 in the harness lane: `node scripts/clean-room/codex-loop.mjs run --codex-bin <PINNED> --provider scripted --trust harness --ref story/STORY-058-13 --container /Users/ssuladze/Documents/Dev/cg-cleanroom-<utc>-13run1 --meta-repo /Users/ssuladze/Documents/Dev/ClearGate --evidence <ow>/.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md --label "wave17 scripted"`.
  - The anchor `codex-hooks-harness` stays 91/91, and the witness `test/e2e/codex-hooks.red.integration.node.test.ts` (test 46) stays green.
- **Pinned:**
  - F6.3, with TPV13-A4.1's settle, which is **not** "idle".
  - `runLoopTurn` never rejects; on failure it returns `{timedOut:true, reason, notifications}`.
  - `served` entries are `{i, marker, step, responseId, usage}`.
  - The TypeError message is `startMockResponses: routes and respond are mutually exclusive`.
  - F6.4 body verbatim.
  - F6.5 markers, prompts and route order, with TPV13-A4.2–5.
  - F6.6 with TPV13-A2 and TPV13-A3.
  - F6.7 CLI, with TPV13-A4.6's in-process API.
  - The record pipeline is M6:730 verbatim.
  - Constants by value (M6:735–737).

**Build-phase reds.**
- None, if the orchestrator fast-forwards `<ow>` (TPV13-A5).
- Otherwise the 8 twin-parity cases listed in Check 5 are expected until integration. Do not chase them.

**Commits.** M6:989–990:
- `feat(EPIC-058): STORY-058-13 pass A — verify-install for Codex`;
- `feat(EPIC-058): STORY-058-13 pass B — Codex loop harness and evidence`.

**D4.** 3653 / 3651 / 0 / 2.

## Orchestrator actions

1. Commit `plans/M6.md` (TPV13-A1..A6), this report and `reports/STORY-058-13-tpv-reseal.patch` on `sprint/S-41` as a chore (`SKIP_SURFACE_GATE=1`, rule 17).
2. Recommended, before the Developer starts: `git -C OUTER/.worktrees/STORY-058-13 merge --ff-only sprint/S-41`. Do it only while `git status --porcelain` there is empty; `story/STORY-058-13` (`e1973fe6`) is an ancestor. This clears the 8 twin-parity reds during the build.
3. Dispatch QA-Red to apply the patch on `<cw>` @ `1111659` with the 3-point gate, re-measure 87 red, and commit.
4. Dispatch Developer pass A, then pass B, citing this brief and TPV13-A1..A6. Integrate against cli `main` `f0c33f7`, or its successor.
5. Optional hygiene: `$TMPDIR` holds 687 leaked `cg-s41-13-*` dirs from runs of the sealed tests. I did not delete them, because the rule forbids glob deletes. Remove them by exact path if wanted.

## Script Incidents

None. `run_script.sh` was not invoked.

## Scratch and git status

- **Scratch and container removed.** Scratch `/private/tmp/cg-s41-tpv13-20260926T212340` and container `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T213806Z-tpv13` were removed by exact path at the end.
- **Real checkouts untouched.**
  - `<cw>` and `<ow>` `git status --porcelain` were empty before and after. The only `<cw>` interaction was a read-only `git apply --check`.
  - The cli main checkout saw only read-only `rev-parse`, `log` and `diff`, and a `git fetch` *from* it into scratch.
  - I did not touch `.worktrees/STORY-058-12` or `.worktrees/BUG-099`.
- **No commits.** Nothing was committed, stashed or built outside scratch.
- **Credentials untouched.** The dedicated `CODEX_HOME`, `~/.codex` and every auth file were not touched. There was no `login status` and no `--provider live`. The M2 baseline was read only through `CLEARGATE_INIT_BASELINE`.
- **Files written:** this report, the patch, and the M6 amendment.

```yaml
flashcards_flagged:
  - "2026-09-27 · #codex #app-server · A finished child thread ends {type:'notLoaded'}, never idle; an 'every thread idle' settle never fires."
  - "2026-09-27 · #codex #hooks · Codex SubagentStop runs on the child thread with a suffix-less run id; join a dispatch by threadId."
  - "2026-09-27 · #test-harness #node · node>=22 --test treats a dir arg as a module path (exit 1); pass a quoted glob 'test/**/*.test.mjs'."
  - "2026-09-27 · #tpv #clean-room · Probe a synthetic app-server stream against the pinned binary before sealing; 4 sealed shapes were wrong."
```

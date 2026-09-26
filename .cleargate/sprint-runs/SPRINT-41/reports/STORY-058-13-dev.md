role: developer

# STORY-058-13 Developer report (pass A, pass B + Run 1)

```
STORY: STORY-058-13
STATUS: done
COMMIT: pass A 608e45c · pass B 7a7bfa6 · fix none (cli story/STORY-058-13, on the re-seal b91c39d)
TYPECHECK: pass
TESTS: 84 new default-tier passed (shape 20/20, evidence 43/43, harness 21/21), 0 failed; integration CLI 2/2, e2e 2/2 (Part B run on the pinned binary); anchors all green (below)
FILES_CHANGED: cli src/commands/verify-install.ts, CHANGELOG.md (pass A); scripts/clean-room/{mock-responses,codex-appserver,codex-hooks}.mjs (modified), scripts/clean-room/{codex-loop,loop-evidence,loop-script}.mjs (new), scripts/clean-room/fixtures/codex-loop/** (11 new, pass B); outer <ow> .cleargate/knowledge/clean-room-verification.md (modified) and .cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md (new) — both left uncommitted (F6.9)
NOTES: see "Notes" at the end.
```

Paths: `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-13/cleargate-cli`, `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-13`. The pinned codex sha256 was re-measured before every use: `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa` (`codex-cli 0.154.0-alpha.6.2`).

I did not open any QA-Red red-test source file. I worked from the brief, TPV13-A1..A6, F0–F12 and the M6 blueprint, the QA-Red and re-seal reports, and the test-run output. Every make-green file passed on its first run after its implementation, so no runtime probing of test inputs was needed.

## Pass A — `verify-install` for Codex (commit `608e45c`)

**Allow-list:** only `src/commands/verify-install.ts` and `CHANGELOG.md` (the M6:670–671 line, first under `## Unreleased` / `### Added`).

**What was built (F6.2):**
- `VerifyInstallOptions.splitViewRoot?`, `VerifyCtx.splitViewRoot`, and the default `<pkg>/templates/scaffold` with the `process.cwd()` fallback.
- `splitViewRoot: cli.splitViewRoot` added to the handler's forward list. No CLI flag.
- 8 checks in pinned order, with every F6.2 detail string. A null snapshot gives 8 skips.
- An unavailable split view returns the single detail `split view unavailable: <String(root)>`. It covers hooks-wiring, instruction-block (the content compare only), roles, and skills (the core root). It never throws.
- no-foreign-hooks checks owned roots only. The pin is `snapshot.pin_version ?? version`.
- The 2 live ids use F6.2's descriptions.
- TOML is parsed through `toml-eslint-parser`, imported directly. `src/init/**` is untouched.

| Make-green file | Result |
|---|---|
| `test/commands/verify-install-codex-shape.red.node.test.ts` | **20/20** |
| `test/commands/verify-install-codex-cli.red.integration.node.test.ts` (after `npm run prebuild && npm run build` in `<cw>`) | **2/2** |
| `test/e2e/codex-loop.red.integration.node.test.ts` Part A (after the commit, no `CLEARGATE_CODEX_BIN`) | **2/2** (Part A pass; Part B `NOT RUN` diagnostic) |
| `test/commands/verify-install-codex.red.node.test.ts` (the -10 amendment) | **9/9** |
| `test/commands/verify-install.red.node.test.ts` | **42/42** |
| `test/commands/verify-install-cli.red.integration.node.test.ts` | **5/5** |
| M2 pair, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (compare only): `claude-adapter-init-parity` / `init-host-parity` | **5/5**, **15/15** |

## Pass B — Codex loop harness and evidence (commit `7a7bfa6`)

**Allow-list honoured:**
- `mock-responses.mjs`: `routes`, `usage`, `served` and `unrouted`; the pinned TypeError; plus a `setRoutes` seam.
- `codex-appserver.mjs`: `runTurn` `threadParams`, `runLoopTurn`, `client.configWrites`, `listProjectHooks`.
- `codex-hooks.mjs`: the 12 exports, `readCodexRegistrations` beside `camelizeEvent`, and the call-site swap. The usage header and `checkCommand` are untouched (TPV13-A7), and no bodies changed.
- New: `codex-loop.mjs`, `loop-evidence.mjs`, `loop-script.mjs`, and `fixtures/codex-loop/**` with the TPV13-A4 bytes.

The "Never" list is untouched: `evidence|artifact|probe-items|claude-baseline.mjs`, `scaffold/**`, `build-codex-payload.mjs`, `src/hosts|init|lib/**`, `test/**` and `package.json`. There is no CHANGELOG line, because `scripts/**` is not packed.

| Make-green file | Result |
|---|---|
| `test/scripts/codex-loop-evidence.red.node.test.ts` | **43/43** |
| `test/scripts/codex-loop-harness.red.node.test.ts` | **21/21** |
| `CLEARGATE_CODEX_BIN=<PINNED> npm run test:file -- test/e2e/codex-loop.red.integration.node.test.ts` (after the pass-B commit) | **2/2 PASS** (114 s) |

**e2e Part B** passed in 105.7 s. The in-process prepare + run went into `$TMPDIR/cg-s41-13-codexloop-e2e-1790465168390`. Its `summary.json`: `result PASS`, `loop_transport PASS`, `enforcement_parity PASS`, no unrouted request. Per-dispatch `matchesProvider`:

| # | role | records | matchesProvider |
|---|---|---|---|
| 1 | architect | 3 | true |
| 2 | qa (QA-Red) | 5 | true |
| 3 | developer | 5 | true |
| 4 | qa (QA-Verify) | 4 | true |
| 5 | devops | 5 | true |

The test leaves its container (about 166 MB) in `$TMPDIR`. I removed it by exact path after reading the summary.

**Measure-first facts (F6.6, TPV13-A2), from the first scripted run on the pinned binary:**
- **fileChange joins.** A code-mode `apply_patch` gives a `fileChange` whose id is `exec-<uuid>`, on the calling thread. Its preToolUse and postToolUse run ids end `:<that id>`, so the join holds and the spec-gap stop did not trigger.
- **Commands.** A nested `exec_command` gives a `commandExecution` item on the calling thread, with `command = /bin/zsh -c '<cmd>'` and `exitCode`. So `commandSource: 'items'`, and commands are matched by containment.
- **SubagentStop.** The run id is `subagent-stop:4:<room>/.codex/hooks.json`, with no suffix, on the child thread. It is joined by thread. No SubagentStart fires.
- **Rollouts.** A `token_usage_record` rollout line is `{type:'token_usage_record', payload:{response_id, usage:{input_tokens, cached_input_tokens, cache_write_input_tokens, output_tokens, reasoning_output_tokens, total_tokens}, turn_token_usage, thread_token_usage}}`. The child role is read from `session_meta.payload.agent_role`.

## Run 1 (harness lane, the brief's exact command) — PASS

```
node scripts/clean-room/codex-loop.mjs run --codex-bin <PINNED> --provider scripted --trust harness --ref story/STORY-058-13 --container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1 --meta-repo /Users/ssuladze/Documents/Dev/ClearGate --evidence <ow>/.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md --label "wave17 scripted"
```

**Run facts:**
- Exit 0. Appended as **Run 1** to `<ow>/.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md` (new file, uncommitted).
- Container, kept: `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1`, holding `prepare.json`, `evidence/summary.json` and `evidence/inputs.json`.
- `cli_sha` `7a7bfa6f9f81ca9051a1ddeba47134539f5de041`; `artifact_inputs` `96fe91375711e3aa3edaea0b85e25cd10db3243c2dad5c0b6b8201884ded7f1f`; artifact tgz sha256 `feed23ce5902783c9f302e55ffd8b44c2800d941e27ebea2457f2755861f9152`; `codex_sha256` = pinned.
- Timing: 86.2 s end to end. Sessions: S1 9.7 s, S2a 9.8 s, S2b 9.8 s, S3 8.0 s, S4 9.8 s, S5 36.4 s.
- No unrouted mock request.
- The single finding is "removed src/cg-probe.ts after S2a (recorded)".

| Check | Result | Detail |
|---|---|---|
| codex.live.discovery | PASS | untrusted listing before trustRoom, trusted after |
| codex.live.session-start | PASS | S2b |
| codex.live.post-tool-use | PASS | S2b (`stamp=0 gate=0 ingest=0`) |
| codex.live.edit-deny | PASS | S1, 1 attempt |
| codex.live.edit-allow | PASS | S2a, 1 attempt |
| codex.live.dispatch-deny | PASS | S3, 1 attempt |
| codex.live.dispatch-identity | PASS | S4, 1 attempt |
| codex.loop.dispatches | PASS | 5 dispatches: architect, qa, developer, qa, devops |
| codex.loop.worktree | PASS | `git worktree add .worktrees/STORY-001-01 -b story/STORY-001-01 sprint/S-01`; isolated; removed |
| codex.loop.merge | PASS | merge_sha `ec9575630fcaa20298fab127a147e7a934b348f9` (second parent = the recorded qaSha; ran on the devops thread) |
| codex.loop.terminal-state | PASS | Done; STORY-001-01 ∅ → Ready to Bounce → Done |
| codex.loop.outcome | PASS | `src/slugify.mjs` on sprint/S-01; `hello-world`; `npm test` 0 |
| codex.loop.serial-verdict | PASS | GREEN, serial-valid, `{metering:'unavailable'}`, record exit 0 |
| codex.loop.hook-matrix | PASS | every trigger has its hook |
| codex.loop.no-synthetic-usage | PASS | no room ledger rows |
| codex.loop.path-identity | PASS | hooks and role shells both `<C>/tools/bin/cleargate` |
| codex.loop.meta-repo-untouched | PASS | no STORY-001-01/SPRINT-01 line appended to the meta-repo |
| codex.loop.metering | INFO | unavailable; 5/5 dispatches with records; provider match 5/5 (architect 3, qa 5, developer 5, qa 4, devops 5 records, all `true`) |
| codex.loop.trust-posture | INFO | harness-exact-hash: 5 hooks, configWrites 2 |
| codex.loop.wall-clock | INFO | per dispatch 2.9–4.8 s |
| **loop_transport / enforcement_parity / result** | **PASS / PASS / PASS** | verify-install 0, doctor 0 |

**`check`.** `codex-loop.mjs check --evidence <ow>/…/codex-loop-evidence.md --cli <cw> --ref story/STORY-058-13` exits 1 with "needs a live human-trust PASS run on the final artifact inputs". That is expected: the scripted run is current, and the live run is step L.

## Anchors (solo in `<cw>`, counted with `npm run test:file` + `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

| Group | Result |
|---|---|
| `codex-hooks-harness.red` | **91/91** |
| test-46 witness `CLEARGATE_CODEX_BIN=<PINNED> … test/e2e/codex-hooks.red.integration.node.test.ts` | **1/1 PASS** (82 s, after the pass-B commit: it clones HEAD) |
| `clean-room-evidence.red` / `clean-room-baseline-coexistence.red` | **60/60**, **24/24** |
| -12 contract: `dispatch-verdict-modes` / `dispatch-serial` / `dispatch-serial-cli` / `flashcard-gate-parity` | **5/5, 8/8, 7/7, 14/14** |
| host/payload: `init-codex` / `codex-adapter` / `lifecycle-codex` / `host-lifecycle` / `codex-payload` / `init-codex-sprint-execution` | 6/6, 16/16, 6/6, 17/17, 14/14, 3/3 |
| **rule-16 set** (`command grep -rl CLEARGATE_META_ROOT test`, helper excluded, 25 files, no override; run after the doc edit) | **338/338, 0 fail, 0 skip** (`clean-room-verification-doc.red` 9/9) |
| `npm run typecheck` / `node scripts/check-no-inline-id-regex.mjs` / `node scripts/build-codex-payload.mjs --check` | exit 0 / 0 / 0 |

Not run, because it is not in the brief's anchor list: `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts`. Its `verify-install-all-plain` row now runs the 8 codex checks; it is listed under adjacent_files.

**Git state after the dispatch:**
- `<cw>` is clean at `7a7bfa6`.
- `<ow>` has only the two authored files, uncommitted.
- The outer main checkout shows only the orchestrator's pre-existing ledger/state modifications.

## D4

BUG-099's recorded total plus 84 default tier = **3653 / 3651 / 0 / 2**. I did not run the full suite; it runs in the merge lane only.

## Task Breakdown rows satisfied (not ticked; the delivery file was not edited)

- `- [ ] Pass A: extend HOST_VERIFIERS.codex (hooks wiring, executable bits, foreign hooks, AGENTS.md block, MCP registration, roles, skills) reading the packed split view (VerifyInstallOptions.splitViewRoot; an unavailable split view fails, never passes); live ids for loop transport and enforcement parity` — satisfied by `608e45c`.
- `- [ ] Pass B: codex-loop.mjs prepare/run/check, loop-evidence.mjs, loop-script.mjs (incl. authorLoopStory), fixtures; mock routes, runLoopTurn and codex-hooks.mjs helper exports; clean-room-verification.md Codex section; Run 1 (scripted) appended to codex-loop-evidence.md` — satisfied by `7a7bfa6`, the uncommitted `<ow>` doc section, and Run 1 PASS.

Open rows: Integrate, QA-Verify, Step L, and the gap follow-ups.

## Notes

- **Outer doc.** `### Codex (STORY-058-13)` replaces the one-paragraph pointer under `## Other hosts`. It covers prepare → owner trust → run, `CODEX_HOME`/`HOME`/`.zprofile` (X9), the sandbox posture (X8), scripted vs live vs human trust, and `check`. The subsection contains no `npm publish`.
- **Cosmetic, not fixed (no fix commit).** Run 1's `cleargate resolved: hooks …` line renders the raw `command -v` trailing newline as ` ⏎ `. The verdict trims it, so the result is unaffected, and Run 1 is append-only. Rendering-only follow-up: trim in `renderLoopRunSection`.
- **Scratch and containers.** Scratch under `/private/tmp/cg-s41-dev13-{ts,probe}` (an offline `app-server generate-ts` and a one-turn tool-schema probe on a scratch `CODEX_HOME`) and the debug container `…/cg-cleanroom-20260926T231852Z-13dev1` were removed by exact path. No dedicated `CODEX_HOME`, no `~/.codex`, no `login status`, no live provider.

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # loop completes; scripted Run 1 + e2e Part B (live primary = step L)
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # per-dispatch hooks, negative/positive controls, missing enforcement fails
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # metering unavailable + host telemetry probe; no ledger rows
  - { r_id: "R4", covered: false, deferred: true, clarified: false }   # posture disclosed (covered); human trust of exact hashes = step L (owner)
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # verify-install --host codex machine-checkable half
plan_deviations:
  - { what: "update_state root check lives in terminal-state, not merge", why: "M6:794 lists update_state.mjs among merge's forbidden root patterns; keeping it there flips two ids for the single-fault 'update_state … Done on the root thread' row, so merge forbids git merge/worktree remove/branch -d and terminal-state forbids root update_state", orchestrator_confirmed: false }
  - { what: "role threads from identity lines", why: "merge/terminal-state/worktree find the devops/qa-red/developer child threads by identity-line agent_type → agent_id, so a missing devops dispatch flips only codex.loop.dispatches", orchestrator_confirmed: false }
  - { what: "storyHeadSha = the recorded verdict's qaSha", why: "DevOps deletes story/STORY-001-01 before the harness reads git; the second merge parent is checked against the QA-verified head the serial verdict names (fallback: the qa(STORY-001-01): verify commit)", orchestrator_confirmed: false }
  - { what: "scripted idleMs 5000, control timeouts 180 s / 600 s", why: "plan default idleMs 15000 kept for live; the non-active settle rule (TPV13-A4.1) is unchanged, only the quiet window is shorter for the deterministic mock", orchestrator_confirmed: false }
  - { what: "unspecified detail strings and seams", why: "role TOML parse failure '<rel> does not parse: <msg>'; missing split AGENTS.md 'AGENTS.md: payload AGENTS.md is unavailable for comparison'; served records every request (marker null when unrouted), unrouted = {i, responseId, body}, setRoutes seam; runLoopTurn adds timedOut:false on success; perDispatchHookMatrix takes an optional {rootThreadId}", orchestrator_confirmed: false }
  - { what: "evidence section adds ### Findings; gaps carry 'to be filed at step L6'", why: "findings are recorded, never dropped; follow-up ids are filed at step L6 (M6:1025)", orchestrator_confirmed: false }
  - { what: "harness-side git runs with HOME=<C>/home and -c commit.gpgsign=false", why: "keeps the user's global git config (signing, identity) out of the clean room", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts"
  - "cleargate-cli/scripts/clean-room/claude-baseline.mjs"
  - "cleargate-cli/test/e2e/codex-hooks.red.integration.node.test.ts"
```

## Script Incidents

None. `run_script.sh` was not invoked.

```yaml
flashcards_flagged:
  - "2026-09-27 · #codex #app-server · Code-mode tools.exec_command takes {cmd, login, workdir, yield_time_ms}; workdir defaults to the turn cwd."
  - "2026-09-27 · #test-harness #tmp · codex-loop e2e Part B leaves its ~166MB container in $TMPDIR; remove it by exact path after a run."
```

role: architect

# STORY-058-13 Architect post-flight (build commits)

```
VERDICT: FAIL (one blocking finding; plan-origin; measured remediation of about 20 lines in one file)
REVIEWED: cli story/STORY-058-13 build commits 608e45c (pass A) and 7a7bfa6 (pass B), on b91c39d (TPV re-seal) / 1111659 (seal) / 9a94ff2 (C3)
          outer .worktrees/STORY-058-13 @ 452a114c plus 2 uncommitted files (clean-room doc edit, codex-loop-evidence.md Run 1)
          Run 1 container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T232955Z-13run1 (read only)
BLUEPRINT: plans/M6.md -13 blueprint (:633-1041), F0-F12 + errata (:2391), PF12 (:2933), TPV13-A1..A6 (:2995);
           reports/STORY-058-13-tpv.md Developer brief
BLOCKING FINDINGS: B1. codex.loop.terminal-state FAILs on ANY update_state.mjs command run on the root thread (M6:794, carried into
           loop-evidence.mjs:357-358). The installed Codex playbook tells the orchestrator to run one on the happy path:
           "On `QA: PASS`: update state to `QA Passed`, proceed." (generated .agents/skills/sprint-execution/SKILL.md:448;
           the bounce counters are at :384 and :446, escalation at :552). The scripted routes never do this, so Run 1 PASSes.
           A live orchestrator that follows the playbook, as step L requires, turns a correct loop into terminal-state FAIL.
           loop_transport then FAILs and result FAILs. Step L allows one retry, and a second FAIL is BLOCKED with no waiver.
REMEDIATION: loop-evidence.mjs only (patch in §6, measured in scratch): only the DevOps-owned `… Done` transition is forbidden
           on the root (other root update_state calls are recorded in the detail); merge and terminal-state FAIL when
           rootThreadId is absent (vacuity V1); the resolved-path line is trimmed (the cosmetic "⏎"). Sealed suite unchanged
           (evidence 43/43, harness 21/21). No test count change. No artifact-input change (scripts/clean-room/** is not in
           ARTIFACT_INPUT_PATHS), so the fix triggers no scripted re-run and Run 1 stays current.
ATTRIBUTION: the defect is the plan's (M6:794 copied SKILL.md:536's forbidden list and missed :448), not the Developer's; the
           build follows the plan text exactly. Charge the arch bounce to the plan.
```

**Method.** On the real checkouts I only read:
- `git show` / `git diff` of the two build commits, never the moving `<cw>` working tree. The concurrent INTEGRATE had BUG-098 files staged there.
- `cat` of the two uncommitted `<ow>` files.
- Read-only reads of the Run 1 container: `prepare.json`, `evidence/{inputs,summary}.json`, and the room's installed `.agents/skills/sprint-execution/{SKILL,dispatch-serial}.md`.

Everything that built or executed ran in `/private/tmp/cg-s41-pf13-20260926T233742`:
- `outer/` is a `--no-hardlinks` clone of `<ow>` at `452a114c`, plus copies of the 2 uncommitted files and of `OUTER/.claude`;
- `outer/cleargate-cli` is a cli clone at `7a7bfa6`;
- `pre/cleargate-cli` is a cli clone at `b91c39d`, the pre-pass-A tree;
- `node_modules` is symlinked from the cli main checkout;
- prebuild, build and typecheck exited 0 on both trees.

**Not done** (coordinator's brief change): no codex binary, no clean-room harness, no codex-loop e2e (Part A or B), no `CODEX_HOME`, no `~/.codex`, no `login status`, no `--provider live`, no `--trust human`. Goal-condition integrity comes from the code and the default-tier tests. On top of that, Run 1's measured `inputs.json` is re-graded in memory through the scratch build's `codexLoopVerdicts`, with 22 single-fault mutations (§2.2).

## 1. Conformance: PASS

**Pass A (`608e45c`): `src/commands/verify-install.ts` + `CHANGELOG.md`, against F6.2 and the TPV brief's pins.**

| Pin | As built | Result |
|---|---|---|
| `VerifyInstallOptions.splitViewRoot?` / `VerifyCtx.splitViewRoot` | `:88` / `:67` | exact |
| Default `<pkg>/templates/scaffold`, `process.cwd()` fallback | `resolvePackageDefaults` `:147-170` (`:153` fallback, `:168` package root); `runVerifyInstall` `:993` | exact |
| Handler forward, no CLI flag | `:1121` `splitViewRoot: cli.splitViewRoot`; `src/cli.ts` untouched | exact |
| 8 ids in pinned order; null snapshot → 8 skips | `CODEX_HOST_CHECK_IDS` `:601`; `codexVerifier.checks` `:905-921` | exact |
| Detail strings | hooks-wiring `missing: .codex/hooks.json` / `unparseable: …` / `missing: <Event> <matcher> <script>` / `missing script: <rel>`; hooks-executable sorted rels; no-foreign-hooks `<Event> <matcher> <command>` and `['.codex/hooks.json']`; instruction-block `AGENTS.md`, the line-exact marker message, `AGENTS.md: bounded block content differs from the payload`; mcp-registration `absent: .codex/config.toml`, `… does not parse: <msg>`, `absent: mcp_servers.cleargate`, `… does not match the expected registration`; roles `missing:` / `keys <sorted>` / `differs from the payload`; skills `missing:` / `differs from the payload` | exact (plus D5's two unspecified strings) |
| `split view unavailable: <String(root)>`, single detail, never throws, never passes | `codexSplitDir` `:645-650`, `splitUnavailable` `:652-654`; applied to hooks-wiring, instruction-block (content compare only), roles, skills (core root) | exact |
| `snapshot.pin_version ?? version` | instruction-block pin and `buildStdioEntry(ctx.snapshot?.pin_version ?? ctx.version)` | exact |
| Owned roots only for foreign hooks | `pathUnderRoots(adapter.ownedRoots(), scriptRel)`; `--host <x≠codex>` token | exact |
| TOML via `toml-eslint-parser`, `src/init/**` untouched | direct import `:36` | exact |
| 2 live ids + descriptions | `:955`, `:961`, F6.2 text byte-equal | exact |
| CHANGELOG | first line under `## Unreleased` / `### Added`, M6:670-671 verbatim | exact |

**Pass B (`7a7bfa6`): against F6.3-F6.7, TPV13-A2/A3/A4 and the M6:730 pipeline.**

| Pin | As built | Result |
|---|---|---|
| `routes` / `usage` / `served {i, marker, step, responseId, usage}` / `unrouted` | `mock-responses.mjs:89` (first marker found in the raw `bodyText`), `:96`, `:125`; step = `*_output` count, capped at the last step | exact |
| TypeError text | `:57` `startMockResponses: routes and respond are mutually exclusive` | exact |
| `runTurn` `threadParams` spread into **thread/start** after the 3 keys | `codex-appserver.mjs:292-302` | exact |
| `runLoopTurn` settle ≠ idle (TPV13-A4.1) | `:376-414`. A thread blocks the settle only if its last `thread/status/changed` is `active` (`:396`); idle, `notLoaded` and `systemError` all count as settled. The settle also needs `idleMs` of quiet, after runTurn's own `turn/completed` | exact |
| `runLoopTurn` never rejects | `:412` → `{timedOut:true, reason, notifications}`; success adds `timedOut:false` (D5) | exact |
| `configWrites`, `listProjectHooks` | `:52`, `:175`; `:277` | exact |
| `codex-hooks.mjs`: the 12 exports, `readCodexRegistrations` beside `camelizeEvent`, call-site swap, nothing else | The diff adds only `export` keywords to the 12 names; no body changes. `readCodexRegistrations` at `:637`, after `camelizeEvent` `:620`; the call site is `:322`. The usage header and `checkCommand` are untouched (TPV13-A7) | exact |
| F6.4 body | `loop-script.mjs:86-91`, verbatim; an absent block throws `stripInstructionsBlock`'s message | exact |
| Markers, route order, no substring markers | Measured order: 5 root/control markers, then `CHILD_TASK`, then 5 `ROLE=` markers. Substring pairs: none | exact |
| Prompts | S1/S2a/S2b/S3/S4 per the F6.5 table; S5 **byte-equal** to M6:781 (compared programmatically) | exact |
| Record pipeline | the orchestrator route's exec embeds M6:730 **byte-for-byte** (programmatic `includes`) | exact |
| Fixture bytes | `seed/package.json` (TPV13-A4.2 glob), `seed/README.md`, `red-test.mjs`, `impl.mjs` exact; `waves.json` exact per M6:708 (no trailing newline); `story-body.md` has `## Task Breakdown` and `## Prior work` `- none found`; dev/qa reports carry `flashcards_flagged: []` | exact |
| DevOps state step (TPV13-A4.3) | `CLEARGATE_STATE_FILE='<room>/…/state.json' node .cleargate/scripts/update_state.mjs STORY-001-01 Done`, workdir = room | exact |
| Constants by value | `PINNED_CODEX_SHA256`, `LOOP_TRANSPORT_IDS` (6), `ENFORCEMENT_IDS` (11) equal M6:735-737 in value and order | exact |
| TPV13-A2 joins | hook run ↔ item by `run.id` suffix + same `threadId` (`endsWithCall`); SubagentStop by child thread; no SubagentStart; serial interval = `subAgentActivity` started → completed/interrupted; hook-matrix grades S5 only; spawns deduped by item id | exact |
| TPV13-A3 input contract, `serial-verdict` deep-equal, `childUsage` mapping | `loop-evidence.mjs:374-390`, `:533-580` | exact |
| F6.6 overlays | human-trust discovery `:473-491`, applied only under `posture:'human'` (`:506-508`); negative-control INCONCLUSIVE `:510-527` | exact |
| F6.7 CLI | `run --container` 3 cases (`:1024-1049`), `--meta-repo` default `realpath(CLI_ROOT/..)`, realpath main guard `:1088-1095`, `check --write-result` -09 shape with `story: 'STORY-058-13'` `:935-949`, `--help` exit 0 (measured); in-process `prepareCodexLoop` `:186` / `runCodexLoop` `:495` (TPV13-A4.6) | exact |

**File allow-list and Never list: PASS.**
- **Pass A** changes exactly `CHANGELOG.md` and `src/commands/verify-install.ts`.
- **Pass B** changes exactly 17 files:
  - `codex-appserver.mjs`, `codex-hooks.mjs` and `mock-responses.mjs` modified;
  - `codex-loop.mjs`, `loop-evidence.mjs` and `loop-script.mjs` new;
  - 11 new fixtures.
- **Empty diffs:**
  - `git diff b91c39d 7a7bfa6 -- test package.json scaffold src/hosts src/init src/lib scripts/build-codex-payload.mjs scripts/clean-room/{evidence,artifact,probe-items,claude-baseline}.mjs`;
  - `git diff 608e45c 7a7bfa6 -- src CHANGELOG.md` (pass B edits no pass-A file);
  - `git diff b91c39d 608e45c -- scripts` (pass A edits no script).

**Default-tier and anchor runs** (scratch at `7a7bfa6`, solo `npm run test:file`, counted from the `ℹ` lines):

| Set | Result |
|---|---|
| Make-green: `verify-install-codex-shape` / `codex-loop-evidence` / `codex-loop-harness` | **20/20, 43/43, 21/21** |
| -10 amend `verify-install-codex` / `verify-install.red` / `verify-install-cli` (int) / `verify-install-codex-cli` (int) | 9/9, 42/42, 5/5, 2/2 |
| `codex-hooks-harness` / `clean-room-evidence` / `clean-room-baseline-coexistence` | 91/91, 60/60, 24/24 |
| host/payload: `init-codex`, `codex-adapter`, `lifecycle-codex`, `host-lifecycle`, `codex-payload`, `init-codex-sprint-execution` | 6, 16, 6, 17, 14, 3 (all green) |
| -12 contract: `dispatch-verdict-modes`, `dispatch-serial`, `dispatch-serial-cli`, `flashcard-gate-parity` | 5, 8, 7, 14 (all green) |
| M2 pair, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (compare only) | `claude-adapter-init-parity` 5/5, `init-host-parity` 15/15 |
| Rule-16 sweep (25 `CLEARGATE_META_ROOT` files, helper excluded, no override; META_ROOT = scratch outer with the doc edit) | **338/338/0/0** (25 files; `clean-room-verification-doc` 9/9 is the doc-edit witness; no twin-parity red, because `<ow>` is at `452a114c`, after -12's twins) |

## 2. Goal-condition integrity: no vacuous PASS on the gating path (one vacuity inside loop_transport, fixed by the remediation)

### 2.1 From the code: each clause of condition 5 and where it is enforced

| Clause | Enforced by | Vacuity check |
|---|---|---|
| Negative controls are a real host denial | `codexHookVerdicts` edit-deny / dispatch-deny need a **`blocked`** preToolUse run on the graded turn (FAIL detail `preToolUse not blocked in C3/C5`). Overlays: zero preToolUse runs + file absent → `INCONCLUSIVE` (`:513-518`); zero preToolUse runs + no `subAgentActivity` → `INCONCLUSIVE` (`:519-527`). `enforcement_parity` INCONCLUSIVE ⇒ `result` FAIL (`:656-668`) | A control with no gated call is never PASS (measured, §2.2 rows 5-6) |
| Positive controls are real allows | edit-allow needs `probeExists` after S2a; dispatch-identity needs exactly one identity line with the expected `agent_type`, `work_item=STORY-001-01`, `metering=unavailable`, `agent_id` = the child thread, and the ledger row count unchanged | §2.2 rows 9-10 |
| Four role dispatches + DevOps, in order, with identity = rollout role | `dispatchesVerdict` `:235-263`: ≥1 root `subAgentActivity` started; each has exactly 1 identity line (joined by `agent_id` = child), a rollout, identity `agent_type` === rollout `agent_role`, exactly 1 completed SubagentStop on the child thread; non-overlapping intervals; ordered subsequence `architect, qa, developer, qa, devops` | §2.2 rows 11-12, 15 |
| DevOps-thread merge actually happened | `mergeVerdict` `:313-329`: a merge commit on `sprint/S-01` with ≥2 parents; second parent = `storyHeadSha`; no `git merge` / `worktree remove` / `branch -d` on the root; a merge command on a devops-identified thread; `merge_sha` recorded | §2.2 rows 13-14. **V1:** when `rootThreadId` is absent, the root scan is skipped. hook-matrix then FAILs (`result` FAIL), but `loop_transport` can read PASS. Fixed by the remediation |
| Per-dispatch hooks fired | `hookMatrixVerdict` `:400-433`: exactly 1 completed root SessionStart and none elsewhere; every completed `fileChange` has a completed pre + post (suffix + thread); a blocked pre has no post; every dispatch has a completed dispatch gate and a completed SubagentStop | §2.2 rows 15-16 |
| Metering explicit, never synthesized | `codex.loop.metering` is INFO and always `unavailable …` (`:597`); `serial-verdict` needs `tokens` deep-equal `{metering:'unavailable'}` (`:385`); `no-synthetic-usage` needs every room ledger empty (`:435-441`, all `sprint-runs/*/token-ledger.jsonl`, `codex-loop.mjs:445-461`); the render always prints `- metering: unavailable`. `matchesProvider` is `null` for live and needs ≥1 record for true | §2.2 rows 17-19 |
| Human-trust discovery grades only the trusted listing (TPV13-A2) | Under `posture:'human'`, `run` refuses (exit 2) unless every room hook key is `trustStatus:'trusted'` (`codex-loop.mjs:597-605`). `trust.listing` is that pre-session listing. `humanTrustDiscovery` needs every registration's matches to be `source:'project'`, `enabled:true`, `trusted`. `result` also needs `configWrites === 0` and unchanged trust subtrees (`trustViolations` `:600-607`) | §2.2 rows 1-4 |
| Remaining gap is honest | `checkLoopEvidence` (`:935-948`) needs the last live + `human` run PASS on the same artifact inputs. There is no waiver or known-fail flag, and `--codex-sha` only filters runs. Measured in scratch: `check --ref 7a7bfa6` → exit 1 `needs a live human-trust PASS run on the final artifact inputs`; `--ref b91c39d` → `stale` | step L is required and not waivable |

### 2.2 Re-grade of Run 1's measured inputs (in memory, scratch `loop-evidence.mjs` at `7a7bfa6`)

- **Reproduction.** `codexLoopVerdicts(inputs.json)` reproduces `summary.json`: 0 of 20 rows differ, `result` PASS.
- **Mutations.** Each row below is one mutation applied to the real data. The table shows the ids that changed and the result.

| # | Mutation on real data | Changed ids → result |
|---|---|---|
| 1 | human posture, real trusted listing, `configWrites 0`, subtrees equal | none → **PASS** (`humanTrustDiscovery`: 5 registrations trusted). The real listing's `matcher` is `null` for SessionStart/SubagentStop, matching the registrations |
| 2 | human posture with the measured `configWrites 2` | result **FAIL** (both halves PASS) |
| 3 | human posture, SessionStart entry `untrusted` | discovery FAIL → FAIL |
| 4 | human posture graded on the **untrusted** before-listing | discovery FAIL → FAIL |
| 5 | S1: preToolUse runs stripped, file absent | edit-deny **INCONCLUSIVE** → parity INCONCLUSIVE → FAIL |
| 6 | S3: preToolUse runs + subAgentActivity stripped | dispatch-deny **INCONCLUSIVE** → FAIL |
| 7 | S1: no gated call, file present | edit-deny FAIL |
| 8 | S1 / S3 gate `completed` instead of `blocked` | edit-deny / dispatch-deny FAIL |
| 9 | S2a file absent | edit-allow FAIL |
| 10 | S4 identity line removed | dispatch-identity FAIL |
| 11 | devops dispatch removed from the S5 notifications (identity line kept) | dispatches FAIL only |
| 12 | devops dispatch fully absent | dispatches, merge, terminal-state FAIL |
| 13 | devops merge command moved to the root thread | merge FAIL |
| 14 | no merge commit | merge FAIL |
| 15 | developer SubagentStop removed | dispatches + hook-matrix FAIL |
| 16 | one S5 PostToolUse removed | hook-matrix FAIL |
| 17 | verdict `tokens` = measured-shaped zeros | serial-verdict FAIL |
| 18 | a zero row in the room ledger | no-synthetic-usage FAIL |
| 19 | provider `live` (no `served`) | metering stays INFO `unavailable`; no provider match claimed |
| 20 | **root ran `update_state.mjs STORY-001-01 --qa-bounce`** (or `"QA Passed"`) | **terminal-state FAIL → loop_transport FAIL → result FAIL** (B1) |
| 21 | `rootThreadId` absent | hook-matrix FAIL; **merge and terminal-state stay PASS** (V1) |
| 22 | (remediation applied) rows 20 / root `Done` / row 21 | row 20 → PASS, recorded as `orchestrator update_state (recorded, playbook-prescribed): 1`; root `Done` → terminal-state FAIL; row 21 → merge + terminal-state FAIL |

### 2.3 Run 1's evidence, audited against its own inputs

- **Dispatches.** Five, in order: architect, qa, developer, qa, devops.
  - Each has one identity line whose `agent_type` equals its rollout `session_meta.payload.agent_role`, and each has one completed SubagentStop on its child thread.
  - Each has a completed root dispatch gate ending `:<call id>`.
  - The root has SessionStart `completed ×1`.
- **Merge.** `merge_sha` is `ec957563…`. Its parents are `ea8b3d04…` and `a1881ba4…`, and `a1881ba4…` is the recorded verdict's `qaSha`. The merge command ran on the devops-identified thread.
- **State.** STORY-001-01 went ∅ → Ready to Bounce → Done.
- **Controls.** All are real host decisions from `inputs.json`:
  - **S1:** `preToolUse:blocked` on `exec-db3f…`, feedback "ClearGate: planning-first gate — no approved story covers …/src/cg-probe.ts", warn line `mode=enforce would_block … tool=apply_patch`, `probeExists:false`.
  - **S2a:** a completed `fileChange` with completed pre and post, `probeExists:true`.
  - **S2b:** gate line `stamp=0 gate=0 ingest=0 file=…EPIC-001_cleanroom_probe.md`.
  - **S3:** `preToolUse:blocked` on `call_spawn_deny`, feedback "FLASHCARD GATE BLOCKED: 1 unprocessed flashcard(s)…", no `subAgentActivity`.
  - **S4:** `preToolUse:completed`, a subagent started and completed, SubagentStop, and one identity line `agent_type=qa … work_item=STORY-001-01 … metering=unavailable`.
- **Attempts.** 1 each.
- **Metering.** `unavailable`, 5/5 dispatches with records, provider match 5/5 on `response_id` and all five usage fields.
- **Evidence-format notes** (non-blocking, FU-6):
  - The Controls table's Evidence column shows only the pointer text when a verdict detail is empty, so a reader must open `inputs.json` to see the denial.
  - The Trust section labels `currentHash` as `trusted_hash`. The host's `hooks/list` exposes `currentHash` + `trustStatus` and no `trustedHash` field.

## 3. Deviation rulings

| # | Deviation (dev report) | Ruling |
|---|---|---|
| D1 | `update_state` root check moved from merge to terminal-state | **ACCEPT the placement.** It is a state transition, and the sealed single-fault row "update_state … Done ran on the root thread" must flip only terminal-state (under M6:794's placement it flipped merge too). **The check's breadth is B1** (§6): the move kept M6:794's "any `update_state.mjs`" rule, which contradicts SKILL.md:448. The remediation keeps the placement and narrows the rule to `… Done`. |
| D2 | Role child threads taken from identity lines (`agent_type` → `agent_id`) | **ACCEPT with follow-up (FU-3).** It is consistent with TPV13-A2 (a dispatch's `agent_type` *is* its one identity line), and it keeps "devops missing" a single fault (measured, §2.2 row 11). Taken together the ids are sound. loop_transport needs dispatches PASS, so there must be a root devops dispatch with exactly one identity line and a matching rollout role. A forged identity line naming another dispatch's thread gives that dispatch 2 lines, and dispatches FAILs. Residual: merge does not require the thread that ran the merge to be a *root* dispatch child. A devops grandchild merge plus a separate root devops dispatch would pass. |
| D3 | `storyHeadSha` = the recorded verdict's `qaSha` (fallback: the `qa(STORY-001-01): verify` commit), because DevOps deletes the story branch | **ACCEPT with follow-up (FU-4).** No independent story-head witness survives the deletion: the branch reflog and the worktree's HEAD log go with it. "Second parent = the head QA verified, as recorded in the serial verdict" is a meaningful protocol check, and a mismatch FAILs, never passes. Live-run risk (R3, §5): `dispatch-serial.md:55` defines `qaSha` only as "required on GREEN … Never invent a SHA". If a live QA-Verify commits after the head it verified, or the orchestrator records the developer commit while a later story commit exists, merge false-FAILs. If the orchestrator back-fills `qaSha` from the merge, the check becomes tautological. The fallback subject search is scripted-specific. |
| cosmetic | ` ⏎ ` in Run 1's `cleargate resolved: hooks …` line (raw `command -v` newline through `oneLine`) | **Fix now, bundled into the B1 remediation.** It is render-only (`renderLoopRunSection` trims string path values), the verdict already trims, and no sealed test pins the line. Run 1 stays as appended (append-only). Future runs render clean. |
| D4 | scripted `idleMs` 5000, control timeouts 180 s / 600 s | **ACCEPT.** The settle rule (TPV13-A4.1) is unchanged; live keeps 15 000. |
| D5 | Unspecified detail strings and seams (role TOML parse failure, missing split `AGENTS.md`, `served` for every request with a null marker when unrouted, `unrouted {i, responseId, body}`, `setRoutes`, `timedOut:false` on success, `perDispatchHookMatrix {rootThreadId}`) | **ACCEPT.** All are additive and inside allow-listed files. None changes a pinned shape. |
| D6 | `### Findings` section; gaps read "to be filed at step L6" | **ACCEPT.** Findings are recorded, never dropped. Step L6 replaces the placeholder follow-up ids with the filed ones. |
| D7 | Harness-side git runs with `HOME=<C>/home` and `-c commit.gpgsign=false` | **ACCEPT.** It keeps the user's global git config out of the clean room. |

## 4. Claude path untouched: PASS

- **Pass A's hunks** are: imports, `VerifyCtx`, `VerifyInstallOptions`, `resolvePackageDefaults`, the new codex section, the `runVerifyInstall` ctx line, and the handler forward. **No claude check function has a hunk.**
- **Nothing else changed.** Nothing under `scaffold/**` or `src/{hosts,init,lib}/**` changed in either pass, and neither did `src/cli.ts`.
- **Differential, scratch builds `b91c39d` vs `7a7bfa6`.** Both ran `verify-install --json` against the same installs, made by single `(cd <literal mktemp> && …)` calls:
  - **No-flag Claude install.** The plain and `--host claude` JSON reports are **identical**: 12 checks, ok, 0 `codex.*`. The human-readable `--host claude` report is **byte-identical**.
  - **`--host all` install, `--host claude`.** The report is **identical**.
  - **`--host all` install, plain.** The non-codex check rows and the non-codex live rows are identical. The 8 codex ids all `pass`, and the codex live list = -10's six + `codex.live.loop-transport` + `codex.live.enforcement-parity`. Exit 0.
- **M2 pair** (compare only): 5/5 and 15/15.

## 5. Step L readiness: READY once B1's fix lands and the F10 L0 gates hold

**The F10 commands match the built CLI.**

| Flag / behaviour (F10) | Built |
|---|---|
| `prepare --codex-bin --expect-version --provider live --codex-home --ref --container` | `prepareCli` / `prepareCodexLoop` `:186-302`; live runs `<bin> login status` with only `CODEX_HOME` overridden (`:213-217`) |
| The owner command printed by prepare | `ownerTrustCommand` `:305-307` = `cd <C>/repo-loop && env -i PATH="<C>/tools/bin:/usr/bin:/bin:/usr/sbin:/sbin" HOME="<C>/home" CODEX_HOME="<dedicated>" TERM="$TERM" <pinned codex>`, identical to F10 L2 (Run 1's `prepare.json`: `binDir` = `<C>/tools/bin`); the five hook names are printed |
| `run --container <C> --trust human --model gpt-5.6-terra --meta-repo <abs> --evidence <abs> --label <text>` | `runCli` `:1023-1064`. `provider`, `codexHome` and `codex` come from `prepare.json`, and the binary is re-hashed (exit 2 on mismatch). In live mode it writes nothing into `CODEX_HOME`; it reads only `config.toml` (trust subtrees) and `sessions/**/rollout-*-<agent_id>.jsonl` |
| Exit 2 = trust missing | `CodexLoopRefusal` before any session, no evidence appended (`:597-605`, `:842`) |
| Evidence path | `--evidence` resolved against cwd, so the absolute path works; `appendRunToEvidenceFile` numbers the next run (Run 2, or Run 3 if the F6.9 scripted re-run appends first) |
| `check --evidence --cli --ref` | `checkCommand` `:918-957` |

**Commands, in order.** Harness lane. Every call is a single `(cd <literal dir> && …)`. `<P>` = `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV/bin/codex`. `<H>` = `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-home-8pZx6h`. `<C>` = `/Users/ssuladze/Documents/Dev/cg-cleanroom-<utc>-13live`.

**Preconditions:**
- B1's fix commit, INTEGRATE, and the F6.9 scripted re-run if `stale`;
- QA-Verify on the integrated tree;
- the post-flight delta re-check PASS (§8);
- OD1 done;
- every other cli item merged, and the merge lane frozen.

**Before the owner acts:**
1. **L0, RS-4L:**
   `(cd /Users/ssuladze/Documents/Dev/ClearGate && node cleargate-cli/scripts/clean-room/codex-hooks.mjs run --codex-bin <P> --provider live --codex-home <H> --evidence .cleargate/sprint-runs/SPRINT-41/codex-hooks-evidence.md --label "RS-4L live")`, then
   `(cd /Users/ssuladze/Documents/Dev/ClearGate && node cleargate-cli/scripts/clean-room/codex-hooks.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/codex-hooks-evidence.md)`.
   An auth FAIL halts; ask the owner.
2. **L1:** `shasum -a 256 <P>` = `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa`; `<P> --version` = `codex-cli 0.154.0-alpha.6.2`; both story branches committed and clean, apart from `<ow>`'s authored files.
3. **L2:** `(cd /Users/ssuladze/Documents/Dev/ClearGate && node /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-13/cleargate-cli/scripts/clean-room/codex-loop.mjs prepare --codex-bin <P> --expect-version 0.154.0-alpha.6.2 --provider live --codex-home <H> --ref story/STORY-058-13 --container <C>)`.
   Send the owner the printed `cd <C>/repo-loop && env -i … <P>` line.

**The owner acts (L3).**

**After "trusted":**
4. **L4:** `(cd /Users/ssuladze/Documents/Dev/ClearGate && node /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-13/cleargate-cli/scripts/clean-room/codex-loop.mjs run --container <C> --trust human --model gpt-5.6-terra --meta-repo /Users/ssuladze/Documents/Dev/ClearGate --evidence /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-13/.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md --label "wave17 primary")`.
   - Exit 0 = PASS.
   - Exit 2 = redo L3.
   - Exit 1 = one retry from a fresh L2 (a new `<C>`).
   - A second exit 1 = BLOCKED, with no waiver.
   - `--meta-repo` is mandatory here: the default is `realpath(<cw>/..)` = `<ow>`, which is not the meta-repo main checkout.
5. **L5:** `ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate bash /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh node /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/update_state.mjs STORY-058-13 "Architect Passed"`. This must be a genuine transition; a same-state call is a no-op. Then:
   - `git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-13 add .cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md`;
   - `git -C /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-13 commit -m "evidence(STORY-058-13): primary live human-trust Codex loop run"`.
6. **L6:** one Draft item per new `### Gaps` row, via `node /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/dist/cli.js new <bug|cr> "<slug>"` (chore on `sprint/S-41`). Then amend the Gaps column in `<ow>` and commit, following the L5 pattern.
7. **L7:** `(cd /Users/ssuladze/Documents/Dev/ClearGate && node .worktrees/STORY-058-13/cleargate-cli/scripts/clean-room/codex-loop.mjs check --evidence .worktrees/STORY-058-13/.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md --cli .worktrees/STORY-058-13/cleargate-cli --ref story/STORY-058-13)`.
   It must exit 0 before the DevOps dispatch.

**What the owner does.** First, once, OD1: run `CODEX_HOME=<H> <P> login` and finish the sign-in; no agent reads that directory's credentials. Second, when the orchestrator sends the `cd <C>/repo-loop && env -i …` command after L2, paste it. In the Codex TUI, trust the workspace. At "N hooks need review before they can run", choose **Review hooks** and trust the five ClearGate hooks: `session-start.sh`, `pre-edit-gate.sh`, `pending-task-sentinel.sh`, `stamp-and-gate.sh`, `token-ledger.sh`. If that notice does not appear, open `/hooks` and trust each ClearGate hook. Then quit without sending any prompt, so no model call happens, and reply "trusted". The primary run that follows uses the owner's Codex quota: six or more agents on `gpt-5.6-terra`, 20–90 minutes.

**Live-run risks that remain after the fix.** None of these is a harness defect or vacuity. Each is a strict grader meeting a free-running model; F10's one retry covers them, and a repeat is BLOCKED.
- **R1.** The orchestrator runs `dispatch_serial.mjs next` or `record` from inside the worktree and exits 2. This is F12's recorded cwd risk.
- **R2.** `codex.loop.worktree` needs the literal `git worktree add .worktrees/STORY-001-01 -b story/STORY-001-01 sprint/S-01` (containment). A `git -C <room> worktree add …` form fails it. The playbook tells the orchestrator to run the printed `worktreeCommand` verbatim.
- **R3.** Merge `qaSha` equality (D3).
- **R4.** A child given a second turn (`send_input` / `interacted`) produces a second SubagentStop and identity line. That FAILs dispatches under the sealed "exactly one" rule (F8 15d).

## 6. B1: the finding and the measured remediation

**Finding.**
- **The plan text.** M6:794 lists `update_state.mjs` among the orchestrator's forbidden root patterns. D1 moved that check into `terminalStateVerdict`, whose root check is `commandsOn(loop, [rootThreadId]).find((c) => c.command.includes('update_state.mjs'))` (`loop-evidence.mjs:357-358`).
- **What the installed playbook prescribes to the orchestrator:**
  - happy path: `QA Passed` (`.agents/skills/sprint-execution/SKILL.md:448`);
  - rework path: `--qa-bounce` (`:446`) and `--arch-bounce` (`:384`);
  - escalation: `Escalated` (`:552`).
- **The only transition §C.7 hands to DevOps** is the `Done` step (`:527`).
- **The playbook's own "Forbidden orchestrator patterns" list** (`:536`) says a root `update_state.mjs` is "classify as edge case and document in sprint §4". It is not a loop failure.
- **The effect.** A live orchestrator that follows the playbook correctly FAILs terminal-state, loop_transport and result. Measured on Run 1's real data (§2.2 row 20).

**Remediation.** This is the Developer's commit on `story/STORY-058-13` after the INTEGRATE merge; scope is `scripts/clean-room/loop-evidence.mjs` only. The patch was measured in scratch: sealed `codex-loop-evidence` 43/43 and `codex-loop-harness` 21/21 unchanged, and the §2.2 row-22 outcomes. It is the reference, not a mandate on exact wording:

```diff
--- a/scripts/clean-room/loop-evidence.mjs
+++ b/scripts/clean-room/loop-evidence.mjs
@@ mergeVerdict
   if (parents[1] !== loop.storyHeadSha) {
     return fail(`merge ${merge.sha}: second parent ${parents[1]} is not the story head ${loop.storyHeadSha}`);
+  }
+  if (typeof loop.rootThreadId !== 'string' || loop.rootThreadId === '') {
+    return fail('no root thread id: the orchestrator-forbidden patterns cannot be checked');
   }
   for (const c of commandsOn(loop, [loop.rootThreadId])) {
@@ terminalStateVerdict
   if (state !== 'Done') return fail(`state.json ${LOOP_STORY_ID}.state = ${state}`);
-  const rootState = commandsOn(loop, [loop.rootThreadId]).find((c) => c.command.includes('update_state.mjs'));
-  if (rootState) return fail(`the orchestrator (root thread) ran update_state.mjs: ${rootState.command}`);
+  if (typeof loop.rootThreadId !== 'string' || loop.rootThreadId === '') {
+    return fail('no root thread id: the orchestrator-forbidden Done transition cannot be checked');
+  }
+  const rootStateCmds = commandsOn(loop, [loop.rootThreadId]).filter((c) => c.command.includes('update_state.mjs'));
+  const rootDone = rootStateCmds.find((c) => isDoneStateCommand(c.command));
+  if (rootDone) return fail(`the orchestrator (root thread) ran the DevOps-owned Done transition: ${rootDone.command}`);
   const devopsState = commandsOn(loop, threadsOfRole(loop, 'devops')).find((c) => isDoneStateCommand(c.command));
   if (!devopsState) return fail(`no update_state.mjs ${LOOP_STORY_ID} Done ran on the devops thread`);
   const transitions = eventTransitions(loop.eventsJsonl);
-  return pass(`Done; transitions: ${transitions.length > 0 ? transitions.join('; ') : 'n/a'}`);
+  const rootNote = rootStateCmds.length > 0 ? `; orchestrator update_state (recorded, playbook-prescribed): ${rootStateCmds.length}` : '';
+  return pass(`Done; transitions: ${transitions.length > 0 ? transitions.join('; ') : 'n/a'}${rootNote}`);
@@ renderLoopRunSection
-    `- cleargate resolved: hooks ${oneLine(na(r.pathIdentity?.hookSide))} · role shells ${oneLine(na(r.pathIdentity?.roleShell))}`,
+    `- cleargate resolved: hooks ${oneLine(na(typeof r.pathIdentity?.hookSide === 'string' ? r.pathIdentity.hookSide.trim() : r.pathIdentity?.hookSide))} · role shells ${oneLine(na(typeof r.pathIdentity?.roleShell === 'string' ? r.pathIdentity.roleShell.trim() : r.pathIdentity?.roleShell))}`,
```

**Constraints on the fix commit:**
- Commit: `fix(EPIC-058): STORY-058-13 post-flight B1 — root update_state ban narrowed to Done; root-thread guard; trimmed path line`.
- No other file changes: no test, and the D4 count is unchanged at 3653 / 3651 / 0 / 2.
- Verify:
  - `codex-loop-evidence` 43/43 and `codex-loop-harness` 21/21;
  - `codex-hooks-harness` 91/91;
  - typecheck.
- **No harness run is needed for the fix**: `scripts/clean-room/**` is outside `ARTIFACT_INPUT_PATHS`, so `artifact_inputs` does not move.
- F6.9's post-integration scripted re-run is triggered by BUG-098 (`stale`), not by this fix. It can run before or after the fix; either way the scripted verdicts are identical, because the scripted routes run no root `update_state`.
- Sealed-test impact: the row "update_state … Done ran on the root thread" still flips exactly terminal-state. No sealed row pins a non-Done root call, a missing `rootThreadId`, or the rendered path line (grepped).

## 7. Follow-ups (non-blocking; file under EPIC-058 at close)

- **FU-1 (pin B1 in a test).** Add one sealed evidence row: a root `update_state.mjs STORY-001-01 "QA Passed"` keeps terminal-state PASS. It is QA-Red's, at the next touch; not in this bounce, so D4 does not move.
- **FU-2 (verify-install vacuity V2).** `codex.roles` passes with zero payload roles when `<split>/hosts/codex` exists but `.codex/agents` is missing or empty (`names = []`). `codex.skills` behaves the same way on an empty `core/.agents/skills`. An empty payload set should fail with `split view unavailable: …`.
- **FU-3 (D2 residual).** In `mergeVerdict` / `terminalStateVerdict` / `worktreeVerdict`, restrict role threads to identity lines whose `agent_id` is a root-dispatched child. This needs a QA-Red re-scope of the "devops missing" row's mutation, which today removes only the notifications.
- **FU-4 (D3, live robustness).** Replace the equality `parents[1] === storyHeadSha` with harness-supplied ancestry facts, all raw strings from `git merge-base --is-ancestor`:
  - `qaSha` ⊑ `parents[1]`;
  - `devSha` ⊑ `parents[1]`;
  - `parents[1]` ⋢ `parents[0]`.

  Also name the source (verdict or subject fallback) in the detail.
- **FU-5 (anchor hardening, V3).** `parseLoopRuns` picks each anchor as the first match anywhere in the section. A header anchor that renders `n/a` would let a later `- result: PASS` in Gaps, Findings or State transitions be picked. `codex-loop` always renders result, provider and posture, so this is not reachable today. Restrict the picks to the header block (before the first `###`).
- **FU-6 (evidence legibility).** In the Controls table, print the blocked run id and the first feedback line for the deny controls, and the fileChange/subagent id for the allow controls. Rename the Trust section's `trusted_hash` to `currentHash (trustStatus trusted)`.
- **FU-7 (`dispatches` edge).** `agentType === rolloutRole` passes when both are `undefined`. Only an extra, non-required dispatch can reach this. Require a defined role.
- **FU-8 (prepare hint).** The printed "Then: … run --container <C> --trust human" line omits `--meta-repo` and `--evidence`. Print the full F10 L4 form.
- **FU-9 (live multi-turn children, R4).** Allow n ≥ 1 SubagentStop runs and identity lines per child, provided every identity line agrees on `agent_type` and matches the rollout role. This needs a QA-Red re-scope of F8 15d.

## 8. Observations for the orchestrator

- **Order after this FAIL.**
  1. Let INTEGRATE finish (TPV13-A6 forecast: auto-merge, delta numstat identical).
  2. Developer B1 fix commit.
  3. F6.9 `check`: expect `stale`, then the scripted re-run.
  4. QA-Verify on the integrated tree plus the fix.
  5. **Post-flight delta re-check.** This review stays valid for everything but the delta, so the re-check covers only:
     - `git diff 7a7bfa6 <fix tip>` = the merge of `main` plus the §6 hunks;
     - `git diff --numstat main <fix tip>` equals `git diff --numstat 9a94ff2 7a7bfa6` + `loop-evidence.mjs`;
     - the re-grade probe below;
     - evidence 43/43.
  6. RS-4L.
  7. Step L.
- **Re-grade probe for QA-Verify and the re-check.** Import the tip's `loop-evidence.mjs` and feed the new scripted run's `inputs.json` through `codexLoopVerdicts`:
  - as recorded: PASS;
  - with a root `update_state.mjs STORY-001-01 "QA Passed"` command added: PASS;
  - with a root `… Done` command added: terminal-state FAIL;
  - with `rootThreadId` deleted: merge and terminal-state FAIL.
- **INTEGRATE landed while this review was finishing.** Measured read-only at the end:
  - cli `5594a41` = `integrate(STORY-058-13): merge cli main f0c33f7`, with parents `7a7bfa6` and `f0c33f7`;
  - outer `d6c5264e` = `integrate(STORY-058-13): merge sprint/S-41`;
  - `git diff --numstat f0c33f7 5594a41` equals `git diff --numstat 9a94ff2 7a7bfa6`, so the integrated delta is exactly the reviewed build delta;
  - `loop-evidence.mjs`, `codex-loop.mjs`, `loop-script.mjs` and `verify-install.ts` are unchanged by the merge.

  The §6 patch therefore applies as written on `5594a41`. The re-check's numstat baseline becomes `main` (`f0c33f7`) vs the fix tip, which must equal the reviewed delta plus `loop-evidence.mjs`.
- **`<ow>` was at `452a114c` during the review.** That is after -12's twins, so TPV13-A5's 8 twin-parity reds do not arise. The rule-16 sweep above ran on exactly that tree.
- **The "⏎" in Run 1 stays**: the evidence file is append-only. The next appended run renders clean.

## Plan amendments to append to M6.md

The orchestrator appends the block below to the end of `plans/M6.md` verbatim.

````markdown
## Post-flight rulings (STORY-058-13, 2026-09-27; role: architect; append-only)

Source: `reports/STORY-058-13-arch.md` (VERDICT: FAIL, one blocking finding, plan-origin). Binding for STORY-058-13; wins over M6:794, F6.6 and TPV13-A2/A3 where they differ. No Gherkin, scope, file-list or test-count change.

**PF13-A1: Root-thread `update_state` rule (replaces M6:794's `update_state.mjs` entry; B1).**
- `codex.loop.terminal-state` FAILs iff the root thread ran the DevOps-owned transition: a command containing `update_state.mjs`, `STORY-001-01` and the word `Done`. That is the same `isDoneStateCommand` the devops-thread check uses, and it applies whatever the exit code.
- Any other root `update_state.mjs` command is recorded in the PASS detail (`orchestrator update_state (recorded, playbook-prescribed): <n>`), never FAILed. This covers `QA Passed`, `--qa-bounce`, `--arch-bounce` and `Escalated`, which the installed Codex SKILL.md prescribes to the orchestrator at :448, :446, :384 and :552; its own forbidden list at :536 says "classify as edge case and document".
- The check stays in terminal-state (D1). The M6:794 merge check keeps `git merge`, `git worktree remove` and `git branch -d` on the root.
- `codex.loop.merge` and `codex.loop.terminal-state` FAIL (`no root thread id: …`) when `loop.rootThreadId` is not a non-empty string. The root-pattern scans never skip.
- `renderLoopRunSection` trims string `pathIdentity.hookSide` / `roleShell` values in the `- cleargate resolved:` line (render only; verdict inputs stay raw).

**PF13-A2: Deviation rulings (bring the plan in line with the build at cli `7a7bfa6`).**
- D1 (root `update_state` check in terminal-state, not merge): ACCEPT the placement; the breadth is PF13-A1.
- D2 (role child threads from identity lines `agent_type` → `agent_id`): ACCEPT; PF13-FU-3.
- D3 (`storyHeadSha` = the recorded verdict's `qaSha`, fallback the `qa(STORY-001-01): verify` commit): ACCEPT; PF13-FU-4; live risk R3.
- D4 (scripted `idleMs` 5000; control timeouts 180 s / 600 s): ACCEPT.
- D5 (unspecified detail strings and seams: role TOML parse failure `<rel> does not parse: <msg>`; `AGENTS.md: payload AGENTS.md is unavailable for comparison`; `served` records every request with `marker:null` when unrouted; `unrouted {i, responseId, body}`; `setRoutes`; `timedOut:false` on success; `perDispatchHookMatrix(…, {rootThreadId})`): ACCEPT.
- D6 (`### Findings`; gaps "to be filed at step L6"): ACCEPT.
- D7 (harness git with `HOME=<C>/home`, `-c commit.gpgsign=false`): ACCEPT.

**PF13-A3: Order to step L.** INTEGRATE, then the Developer PF13-A1 fix commit (`scripts/clean-room/loop-evidence.mjs` only; `fix(EPIC-058): STORY-058-13 post-flight B1 — …`; no test change; D4 3653 unchanged), then the F6.9 check / scripted re-run, then QA-Verify on the integrated tree plus the fix, then the post-flight delta re-check (`git diff --numstat main <tip>` = `git diff --numstat 9a94ff2 7a7bfa6` + `loop-evidence.mjs`; re-grade probe: root `QA Passed` → PASS, root `Done` → terminal-state FAIL, no `rootThreadId` → merge and terminal-state FAIL), then RS-4L, then step L (F10 unchanged; `--meta-repo /Users/ssuladze/Documents/Dev/ClearGate` is mandatory in L4). The fix moves no artifact input (`scripts/clean-room/**` is outside `ARTIFACT_INPUT_PATHS`).

**PF13-A4: Recorded live risks for step L (F10's single retry covers them; a repeat is BLOCKED).** R1: `dispatch_serial.mjs` run from inside the worktree exits 2 (F12). R2: `codex.loop.worktree` needs the literal printed `worktreeCommand` (a `git -C` form fails). R3: merge needs `qaSha` = the merge's second parent (D3). R4: a child given a second turn yields a second SubagentStop and identity line (F8 15d "exactly one").

**PF13-A5: Follow-ups (file under EPIC-058 at close).** PF13-FU-1: a sealed evidence row — root `update_state … "QA Passed"` keeps terminal-state PASS. PF13-FU-2: `codex.roles` / `codex.skills` pass on an empty payload listing; make it fail. PF13-FU-3: restrict role threads to root-dispatched children (QA-Red re-scope of "devops missing"). PF13-FU-4: ancestry-based merge check from harness-supplied `--is-ancestor` facts, naming the storyHead source. PF13-FU-5: `parseLoopRuns` anchors picked from the header block only. PF13-FU-6: the Controls evidence column shows the blocked run id and feedback line; the Trust `trusted_hash` label becomes `currentHash (trustStatus trusted)`. PF13-FU-7: `dispatches` requires a defined role (undefined === undefined passes today). PF13-FU-8: prepare's printed run hint shows the full F10 L4 form. PF13-FU-9: allow multi-turn children when every identity line agrees (QA-Red re-scope of F8 15d).
````

## Script Incidents

None. `run_script.sh` was not invoked.

## Scratch and git status at the end

- **Deleted by exact path:**
  - scratch `/private/tmp/cg-s41-pf13-20260926T233742`, which held the outer and cli clones at `7a7bfa6`, the pre clone at `b91c39d`, the smoke installs, the logs and the prototype patch;
  - the session-scratchpad subdir `pf13/`.
- **No containers created.** The Run 1 container was only read.
- **Protected state.** The protected `/private/tmp` dirs, the dedicated `CODEX_HOME`, `~/.codex` and the auth files were not touched. The M2 baseline was read only through `CLEARGATE_INIT_BASELINE`.
- **`<cw>`.** Read-only `git show` / `diff` / `log` of the build commits and of `5594a41` only. Its working tree was not touched. At the end, HEAD is `5594a41` (INTEGRATE, not by me).
- **`<ow>`.** Read-only: the 2 uncommitted files were read, not modified. At the end, HEAD is `d6c5264e` (the INTEGRATE merge, not by me), and the same 2 files are still uncommitted.
- **cli main checkout.** Not touched; its `node_modules` was used as a symlink target only.
- **Files written:** this report. `plans/M6.md` was not edited.

```yaml
flashcards_flagged:
  - "2026-09-27 · #codex #clean-room #post-flight · Codex SKILL.md:448 has the orchestrator set QA Passed; forbid only root Done, never all update_state."
  - "2026-09-27 · #post-flight #clean-room · Re-grade a kept run's inputs.json with in-memory mutations: proves non-vacuity on real data, no harness."
  - "2026-09-27 · #verdicts #danger · A check scanning 'commands on rootThreadId' passes vacuously when the id is absent; FAIL on a missing root."
```

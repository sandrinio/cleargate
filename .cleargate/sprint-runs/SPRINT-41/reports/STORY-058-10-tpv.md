# STORY-058-10 — TPV report (Test Pattern Validation)
role: architect
TPV: REJECTED — 12 sealed tests can't pass against a plan-literal build, and sealed test 42 hangs. 111 of 164 mutants survive the sealed files; after the re-seal, 162 are killed and the other 2 are equivalent.

> Saved verbatim by the orchestrator from the TPV agent's final message; the harness blocked the subagent's own report write. The re-seal patch sits beside this report as `STORY-058-10-tpv-reseal.patch` (127 KB). Orchestrator re-verification 2026-09-26: sha256 `310c26dc8f2cc98764ec858c8e704f15697c131a63ede05018efe31dd829a2d3`, 2105 lines, 0 CR, 0 lines starting with three backticks; `git apply --check` clean on `story/STORY-058-10` @ `59d8949`; 13 files, +1220/−246.

**Why it's rejected**
- **Tests that can't pass:**
  - Test 2 expects a `Created .codex/hooks.json` line the plan never pins.
  - Test 12 counts `^[features]$` lines, but the string literal it keeps contains one, so the count is always 2.
  - Test 19 treats `rel` as relative to `hosts/codex`; the plan says scaffold-relative.
  - Test 23 uses `hosts:['claude']`, which takes AD-5's flat fast path and never reads the fixture.
  - Test 26 reads the fixture's stubbed manifest, which has no entries.
  - Test 33b uses a fake codex that never strips `AGENTS.md`, and AD-4 keeps `[features]`, so `.codex/` survives.
  - Coexistence scenario 5: the plan's canary text contains `clean-room canary` twice.
  - Test 35 compares logical `/var` with git's physical `/private/var`.
  - Test 43 asserts a bare `'decline'`; the real app-server reply is `{decision:'decline'}`.
  - Test 44's invented flat input can't express the verdict table.
  - Test 46 passes a tmp container, which `validateContainer` refuses.
- **Test 42 hangs:** the mock handler throws on the `{text}` step, and the fetch never returns (no timeout).
- **What survives the sealed files:** all 52 codex verdict conditions, the whitelist short-circuit fail-open in `pre-edit-gate`, the `addHost` preflight, the AD-3 matchers, the M3-A3 copy filter and the vacuous `--check` gate.
- **Two plan defects, fixed by amendment:**
  - **M5-A33:** the session-load-delta bullet breaks sealed -07 `upgrade-per-host` Scenario 10.
  - **M5-A39:** the orchestrator's C4 input, verified below.

## Subject
- The cli is at `story/STORY-058-10` @ `59d8949`, parent `35580b0`. I reproduced QA-Red's sealed counts exactly (118 red, 7 anchors).
- All work ran in a scratch root, `/private/tmp/cg-s41-tpv-058-10`, now deleted:
  - a simulation clone, with `toml-eslint-parser@1.0.3` installed via a scratch npm cache;
  - a sealed-witness clone;
  - a `git archive` copy of `sprint/S-41` as the parent.
- The real checkouts were read-only. The cli is still at `59d8949`, plus its pre-existing `cleargate-0.25.0.tgz`.
- The pinned codex ran only `--version`, the offline `app-server generate-ts`, and test 46's version probe. There was no provider and no login, and `HOME`/`CODEX_HOME` pointed at scratch.

## Simulation
The plan-conformant build is three scratch commits (typecheck clean at each):
- **`60b46a9`, pass A:** codex adapter, TOML surgery, registry and payload filter, `install-view` plus `skipRootFiles`, init/lifecycle/host/upgrade/doctor changes, the codex verifier, the codex signal map, and payload plus codegen.
- **`213f601`, pass B:**
  - `normalized-event` and `hook edit-targets`;
  - host-conditional codex branches in the 4 hooks, with the copies regenerated;
  - the 3 snapshot locks;
  - the coexistence functions;
  - codex verdicts, render and check;
  - `mock-responses` and `codex-appserver`;
  - `codex-hooks.mjs`, where `runCodexHooks` is only a stub.
- **`a8b4dde`:** the M5-A33 fix.

The protocol ground truth comes from `codex app-server generate-ts`. The hook run summary has `{id, eventName, status, entries[{kind,text}]}`, and the status is one of running, completed, failed, blocked or stopped. Items arrive via `item/started` and `item/completed`; there is no `item/updated`. Approval replies are `{decision}`.

## Red→green table
**Sealed files against the conformant build:**

| File | Result | Cause |
|---|---|---|
| codex-adapter | 12/13 | test 2 |
| inject-codex-config | 15/16 | test 12 |
| codex-payload | 9/10 | test 19 |
| install-view | 7/8 | test 23 |
| init-codex | 4/5 | test 26 |
| lifecycle-codex | 4/5 | test 33b |
| coexistence | 19/20 | scenario 5 |
| codex-hook-scripts | 12/13 | test 35 |
| harness | hangs; 9/12 with test 42 skipped | tests 42, 43, 44 |
| e2e test 46 | red | tmp container |
| hook-signal-codex, verify-install-codex, normalized-event, init.node, hooks-snapshots | green | — |
| parity files | 5/5, 15/15 | — |

**Re-sealed files:**

| File | Red at seal | Anchors | Green after pass A | Green after pass B |
|---|---|---|---|---|
| codex-adapter | 15 | 1 | 16 | 16 |
| inject-codex-config | 22 | 0 | 22 | 22 |
| hook-signal-codex (unchanged) | 2 | 1 | 3 | 3 |
| codex-payload | 14 | 0 | 14 | 14 |
| install-view | 12 | 0 | 12 | 12 |
| init-codex | 6 | 0 | 6 | 6 |
| lifecycle-codex | 6 | 0 | 6 | 6 |
| verify-install-codex | 9 | 0 | 9 | 9 |
| coexistence | 23 | 1 | 2 | 24 |
| codex-hook-scripts | 12 | 6 | 7 | 18 |
| normalized-event | 11 | 0 | 0 | 11 |
| harness | 67 | 0 | 0 | 67 |
| init.node | 2 | — | 29 | 31 |
| hooks-snapshots | 1 | — | 14 | 15 |
| **Default-tier red** | **202** | 9 | **114 red** | **0** |

- **Test 46:** a diagnostic skip without the binary. With `CLEARGATE_CODEX_BIN` it is red for the right reason, measured against the pinned binary: `Cannot find module …/codex-hooks.mjs` in the HEAD clone.
- **Parity files:** red at pass A on exactly the 4 hook rows; 5/5 and 15/15 once those four refusals are neutralized. Green (5/5, 15/15) after pass B.

## Mutant table (164 mutants; killed = a new failing test name versus that file's unmutated baseline)
| Area | Sealed kills | Re-seal kills | What the re-seal adds |
|---|---|---|---|
| TOML (T1–T13) | 6/12 | 11/12 | T2 is equivalent; R-T3/T7/T8 kill T5, T9, T10 and T1/T3 |
| Adapter (A1–A13, I1) | 9/13 | 13/13 | R-A2..A5 |
| Registry, view, init, lifecycle, upgrade, verifier, codegen, payload, tiers (R/V/N/L/U/VI/HS/B/P/TIER/UNTR) | 13/38 | 38/38 | V1 needed R-V5/R-I5; N1 needed R-I2; N3 R-V4; N4/N5 R-I5; L1 R-L3; U1 R-L1; P-M1..M4 R-P1; UNTR R-P5 |
| Hooks (PEG, SG, ST, TL) | 12/23 | 22/23 | SG4 is equivalent; PEG2–4 R-H2; SG2 R-H5; SG3 and TL1 R-H4; TL2/4/5 R-H3; TL3 R-H6 |
| normalized-event (NE1–6) | 4/6 | 6/6 | R-N1, R-N2 |
| Coexistence (C1–C14) | 8/14 | 14/14 | R-C1..C6 |
| Codex verdicts (CV, 52 conditions) | 0/52 | 52/52 | R-X3, one isolated negative per condition |
| Evidence check and harness modules (K1–K6, M1–M6) | 1/11 | 11/11 | R-X1, R-X2, R-X4 |
| **Total** | **53** | **162** | 2 equivalent |

## Regression witnesses (each file solo; sealed clone vs conformant build)
Everything is unchanged and green except these. **Expected changes:**
- `init.node`: 29/31 → 31/31.
- `hooks-snapshots`: 14/15 → 15/15.
- Parity: 0/5 and 0/15 → 5/5 and 15/15.
- `canonical-live-parity` 5d: live `token-ledger.sh` equals canonical at `59d8949` but differs after pass B (compared with `cmp`), so 5d is red until RS-4a, per M5-A30.

**Green files:**
- `upgrade-per-host`: 6/6 with M5-A33 (5/6 with the plan-literal session-load delta).
- The -09 TPV's 19 contract files, `clean-room-evidence` 60/60, `verify-install` 42/42, and the M5-A32 list.
- The 22 upgrade/doctor/uninstall/host command files.
- `test_pre_edit_gate.sh` 11/11.
- The -09 e2e, 13/13.

**Failures identical on both sides (scratch environment):** `scaffold-relocation` case 4 (the archived meta-root isn't a git repo), plus `cr-026-integration`, `run-id-ledger-attribution` and `token-ledger-delta`. The last three read the live `<META_ROOT>/.claude/hooks/token-ledger.sh`.

The M2 baseline hash is `bdc4bb1a…62b2` (425 files) before and after.

## Rulings (binding)
**QA-Red #1 — `codexHookVerdicts`.** QA-Red's shape is replaced. The function lives in `scripts/clean-room/evidence.mjs` with `CODEX_GATING_IDS` (the 10 ids below, at minimum) and `CODEX_INFO_IDS`; `codex-hooks.mjs` may re-export it.

```ts
inputs = {
  registrations: [{eventName, matcher|null, command}],     // repo-codex .codex/hooks.json, camelCase events
  hooksListBefore: HookMetadata[], hooksListAfter: HookMetadata[],   // hooks/list data[].hooks for the room
  turns: { C2, C3, C4, C5, C6 },                            // each { notifications: [{method, params}] }, raw
  c2: { gateCheckLine: string|null, epicRaw: string|null },
  c3: { probeExists: boolean, warnLogLines: string[] },     // pre-edit-gate-warn.log lines appended in C3
  c4: { probeExists: boolean },
  c5: { pendingCodexSentinels: number },
  c6: { tokenLedgerLogLines: string[], pendingCodexSentinels: number, ledgerRowsBefore: number, ledgerRowsAfter: number, expectedAgentType: 'qa'|'default' },
  sharedHooks: { commands: string[], hashes: Record<script, {codex: sha|null, claude: sha|null}> },  // repo-all
  claudeControl: { hooks: parseClaudeStream(...).hooks, fileExists: boolean } | null,
  verifyInstallExitCodes: number[],
  trust: { posture: string, trusted: [{key, hash}] },
}
// → Record<id, {status:'PASS'|'FAIL'|'INFO', detail}>
```

Rules. "Runs" means the `hook/completed.params.run` records for an event; "items" means `params.item` of any `item/*` notification.

| Verdict | PASS iff |
|---|---|
| discovery | registrations is non-empty, and in each list (before = `untrusted`, after = `trusted`) every registration's matching entries (same eventName, matcher and command) exist and each has source `project`, `enabled` true and that trust status |
| session-start | a C2 `sessionStart` run with status `completed` has a `context` entry matching `/^ClearGate state: /m` |
| post-tool-use | a completed C2 `fileChange` item has a change whose path ends `EPIC-001_cleanroom_probe.md`; the pre and post runs whose `run.id` ends `:${item.id}` are non-empty and all completed; the gate line matches `stamp=0 gate=0 ingest=0 file=.*EPIC-001_cleanroom_probe\.md$`; and `frontmatterIntact` passes |
| edit-deny | a C3 `preToolUse` run is `blocked` with a `feedback` entry containing `planning-first gate`; the probe file is absent; and a warn-log line matches `mode=enforce would_block file=\S*/src/cg-probe\.ts` |
| edit-allow | C4 `preToolUse` runs are non-empty and all completed, and the probe file exists |
| dispatch-deny | a C5 run is `blocked` with feedback `FLASHCARD GATE BLOCKED`; there is no `subAgentActivity` item, no subagent run, and no sentinel |
| dispatch-identity | C6 pre runs all completed; exactly 1 `subagentStop`; exactly 1 distinct `agentThreadId`; exactly 1 ` codex-identity ` line whose `agent_type` equals the expected one, `work_item=STORY-001-01`, `metering=unavailable`, and `agent_id` equals that thread; 0 sentinels left; ledger rows unchanged |
| shared-hooks | commands are non-empty, and every `/.codex/hooks/<s>` has non-null, equal hashes; a FAIL names `.codex/hooks/<s>` |
| claude.control.edit-deny | FAILs when the input is null (`not run: claude not on PATH`); otherwise needs `PreToolUse:Write` with `exit_code` 2 and the file absent |
| verify-install | exactly 3 exit codes, all 0 |
| metering | always INFO, detail `unavailable` |
| trust-posture | always INFO, detail `<posture>: <n> hooks` |

**QA-Red #2 — how `CodexAppServer.start` spawns.** It runs `bin` with argv `['app-server']`, and sends `initialize` then `initialized` inside `start()`. Server requests are answered `{decision:'decline'}` and recorded in `serverRequests`. `mock-responses` steps are arrays of output items, and `requests` holds the parsed bodies (M5-A37).

**QA-Red #3 — the extra fixtures.** Not required (M5-A43).

**QA-Red #4 — test 23.** Accepted as a contextual witness; re-sealed to a claude+codex fixture, plus a direct `buildInstallView` witness.

**QA-Red #5 — tests 31/32 go red earlier than the plan says.** Accepted. The -07 prune and doctor contracts apply once pass A lands, and R-L1 makes test 31 environment-proof.

**QA-Red #6 — init tests bypass `openInstallView`.** Accepted. The init wiring is now witnessed by R-I2 (test 28 through `--from-source`) and R-I5.

**TPV #3 — the harness export.** `codex-hooks.mjs` is safe to import and exports `runCodexHooks(options)`. `--expect-version` takes the bare version (M5-A38).

**TPV #4 — the C4 edit-allow probe (the orchestrator's input, verified).** At `35580b0`, `doctor.ts:1022` and `:738` skip any file that doesn't start with `---`, so an `<instructions>`-led approved story never counts. I measured `approveProbeStory(template)` → `blocked: no_approved_stories` and `approveProbeStory(stripInstructionsBlock(template))` → `allowed`.
- C4 therefore strips the `<instructions>` block first, using `stripInstructionsBlock(raw)` exported from `codex-hooks.mjs`, then calls `approveProbeStory`.
- -10 edits `doctor.ts` only inside `runCheckScaffold`, never touches `approveProbeStory`, and never relies on the approve step's insert shape.
- The R-X5 witness asserts nothing about the unstripped case, so it survives BUG-090's FW-A2 removing that check.

## Binding Dev constraints
**Pass A — install surfaces**
- **K1 — files you may touch:**
  - `src/hosts/{codex,registry,types,lifecycle}.ts`;
  - `src/init/{inject-codex-config,inject-claude-md}.ts`;
  - `src/lib/{install-view.ts,scaffold-layout.mjs,scaffold-layout.d.mts,manifest-builder.ts,settings-json-surgery.ts}`;
  - `src/commands/{init,host,upgrade,verify-install}.ts`, and `doctor.ts` inside `runCheckScaffold` only;
  - `src/hooks/hook-signal.ts`;
  - `scaffold/hosts/codex/{AGENTS.md,.codex/hooks.json}` plus the generated `.codex/hooks/*.sh`;
  - `scripts/build-codex-payload.mjs`;
  - `scripts/clean-room/evidence.mjs`, the `ARTIFACT_INPUT_PATHS` line only;
  - `package.json`, `CHANGELOG.md`.

  Do not touch `session-load-delta.ts` (M5-A33) or any canonical hook.
- **K2 — contracts:** the blueprint as amended by M5-A15..A19, A26..A29, A33..A35, A37 and A41. In particular:
  - `.codex/hooks.json` is written and reported by byte equality;
  - no-op installs write nothing;
  - the init preflight comes before Step 2 and exits 2 with `[cleargate init] ERROR: <message naming the file>`;
  - the `--from-source` view uses prefix `cleargate-from-source-` and is cleaned up through `fromSourceTempDir`;
  - the copy step excludes root-level surgery targets;
  - `addHost` preflight becomes `HostLifecycleError(…,2)` before `copyPayload`;
  - `HOST_VERIFIERS` is frozen `{claude, codex}`.
- **K3 — the dependency:** `npm install --cache <scratch>/npmcache toml-eslint-parser@^1.0.3` under `dependencies`. `package-lock.json` is untracked in the cli repo; never stage it.
- **K4 — commit message:** `feat(EPIC-058): STORY-058-10 pass A — codex adapter, TOML-preserving .codex/config.toml, install view, codex payload + codegen, verify-install codex`
- **K5 — verify before committing:**
  - `npm run typecheck`;
  - each pass-A file solo, with exactly the pass-A counts above;
  - coexistence 2/24, hook-scripts 7/18, normalized-event 0/11, harness 0/67;
  - the parity files in compare mode red, with the first failure being the pending-task-sentinel row;
  - `node scripts/build-codex-payload.mjs --check` exits 0;
  - baseline hash still `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`.

**Pass B — enforcement under Codex, and the harness**
- **K6 — files you may touch:**
  - `src/hooks/normalized-event.ts`, `src/commands/hook.ts`, `src/cli.ts`;
  - the 4 canonical hooks, and their regenerated codex copies in the same commit;
  - `scripts/clean-room/{evidence,probe-items,mock-responses,codex-appserver,codex-hooks,artifact}.mjs`;
  - `claude-baseline.mjs`, for M5-A1 and A4..A8 only;
  - the 3 locks under `test/snapshots/hooks/*.story-058-10.sh`, which are the only test files you write.

  Nothing else from pass A (M5-A40).
- **K7 — contracts:** AD-6..8, M5-A22..A26, A28, A36..A39, and the rulings. The hook branches are host-conditional. The codex loop gates every target, and a whitelisted target `continue`s (it never exits). The stderr reason prints before exit 2. The identity line follows the AD-6 format, claiming the oldest matching sentinel, else the oldest; there is no ledger row. `editTargets` returns `null` for a missing command. C4 strips `<instructions>`.
- **K8 — commit message:** `feat(EPIC-058): STORY-058-10 pass B — codex hook branches + hook edit-targets, coexistence harness, codex clean-room harness`
- **K9 — verify before QA:**
  - typecheck;
  - every re-sealed file solo and green;
  - parity 5/5 and 15/15;
  - the witness list above, including `test/hooks/*.node.test.ts` and `test_pre_edit_gate.sh`;
  - the -09 e2e on the committed branch;
  - test 46 with `CLEARGATE_CODEX_BIN` (commit first; scripted only);
  - 5d red, and named as expected;
  - the baseline hash unchanged; `--check` exits 0.

**Both passes**
- **K10:**
  - Follow the SMOKE RULE: one `(cd /private/tmp/<literal> && node …)` per writing CLI call.
  - Never run `npm run build` or `npm run prebuild` in the cli main checkout (M5-A41).
  - Stage explicit paths only, never `git add -A`, because of the untracked tgz.
  - Never use `--no-verify`, push or publish.
  - Never run a bare `cleargate`.
  - Don't edit test files, except the 3 locks.
  - The dev report records the FU-1 re-run.

## Re-seal diff
- **Location:** `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-10-tpv-reseal.patch`
- **Size and hash:** 2105 lines, 13 files. sha256 `310c26dc8f2cc98764ec858c8e704f15697c131a63ede05018efe31dd829a2d3`.
- **Checks already run:**
  - `git apply --check` is clean on a fresh `59d8949` clone.
  - It has no CRs and no lines starting with three backticks.
- **QA-Red applies it with:**
  1. `shasum -a 256 <patch>`
  2. `git apply --check <patch> && git apply <patch>`
  3. commit `qa-red(STORY-058-10): TPV re-seal R-A1..R-F1`
- **Then re-measure:** 202 red plus 9 new anchors in the default tier.

The re-seal adds these witnesses:
- **codex-adapter:** R-A1–A5.
- **inject-codex-config:** R-T1–T8.
- **codex-payload:** R-P1–P5.
- **install-view:** R-V1–V5.
- **init-codex:** R-I1–I5.
- **lifecycle-codex:** R-L1–L4.
- **verify-install-codex:** R-VI1–VI2.
- **Coexistence:** R-C1–C7.
- **Hook scripts:** R-H1–H6.
- **normalized-event:** R-N1–N2.
- **Harness:** R-X1–X5.
- **Test 46:** R-E1, in process.
- **init-fixture:** R-F1, the G16 sentinel refusal.

## Expected counts after the re-seal
- **Full suite, by arithmetic from QA-Red's measured 3223 / 3103 / 118 / 2:** 3309 total, 3105 pass, 202 fail, 2 skipped. After pass B: 3309 total, 3307 pass, 0 fail, 2 skipped.
- **After pass A:** 114 red.
- **Default-tier per-file counts:** in the re-sealed table above.

## Plan amendments
Appended to `plans/M5.md` as **M5-A33..A44**:
- **A33:** the hooks.json install line, and no session-load-delta edit;
- **A34:** `rel` is scaffold-relative, and `--check` names each file;
- **A35:** AD-4 means `.codex/config.toml` survives; test 33 and DevOps smoke step 9 are reworded;
- **A36:** ruling #1;
- **A37:** the harness module contracts;
- **A38:** `runCodexHooks`;
- **A39:** the C4 strip, correcting M5.md:420;
- **A40:** the pass-B file set;
- **A41:** no prebuild or build in the main checkout;
- **A42:** G16, and the fix-wave entry gate's init-fixture expectation;
- **A43:** the extra fixtures are not required;
- **A44:** counts.

## Script incidents
None. No `.cleargate/scripts/*` wrapper was invoked.

## Outer status
- **Start:** the 4 modified ledger files, plus a `.pending-task-*.json` sentinel that was gone by my first check.
- **End:** the 4 ledger files, `M plans/M5.md` (my append), and `?? reports/STORY-058-10-tpv-reseal.patch` (mine).
- **Cli:** unchanged at `59d8949`, plus its pre-existing tgz.
- **Cleanup:** I deleted the scratch root and the roughly 3.9k temp dirs my runs created: `cg-s41-*` (sparing `cg-s41-m2-init-baseline`), `cleargate-view-*`, `cleargate-from-source-*` and `cg-cai/cit/vi-*`. I killed every process I started; the only app-server still running is ChatGPT.app's own codex.
- **Nothing was committed.**

## Flashcards
```yaml
flashcards_flagged:
  - "2026-09-26 · #test-harness #tpv · A verdict fn fed one flat stream can't tell C3's blocked run from C4's completed one; key inputs by session."
  - "2026-09-26 · #test-harness #tpv #danger · A mock HTTP handler that throws leaves a fetch-awaiting test hanging forever (no timeout)."
  - "2026-09-26 · #codex #app-server · codex app-server generate-ts --out <dir> emits the exact protocol types offline; read them, don't guess."
  - "2026-09-26 · #codex #app-server · Approval replies are {decision:'decline'}; there is no item/updated (only item/started, item/completed)."
  - "2026-09-26 · #test-harness #tpv · A kept literal that itself holds the anchored line (a TOML [features] string) makes a ^…$ count unsatisfiable."
  - "2026-09-26 · #hooks #doctor #danger · doctor --can-edit/--session-start skip non-'---'-led files; strip <instructions> before approving."
  - "2026-09-26 · #test-harness #tpv · Put the whitelisted target first in a multi-target gate test, or 'exit 0 on first whitelisted' fails open unseen."
  - "2026-09-26 · #test-harness #upgrade · Sealed -07 fixtures use a non-hooks .codex/hooks.json; a hooks-only session-load delta drops its warning."
  - "2026-09-26 · #test-harness #tpv · A 'claims the matching sentinel' test where the match is also the newest can't kill newest-wins; age it oldest."
```

STATUS=done

role: architect
# M5 entry — anchor re-derivation at cli 35580b0 (STORY-058-10 QA-Red readiness)

## Readiness verdict

**READY-WITH-AMENDMENTS.**
- Apply **E12** to `STORY-058-10` on `sprint/S-41`, then re-gate. That is the only precondition.
- Dispatch QA-Red with two sources:
  - `plans/M5.md` §"Entry re-derivation at cli 35580b0 (wave14 entry, 2026-09-26)" (M5-A15..M5-A32, binding);
  - the -10 blueprint plus M5-A1..A14.
- **No new dispatch blockers.**
- **OD1 (the codex login)** blocks nothing before RS-4 step 5. The QA-Verify live run is optional; the close gate needs one live PASS, at RS-4 at the latest.

## T-M5 table

| # | Result | Consequence |
|---|---|---|
| T-M5-1 (after -05) | **Confirmed.** `host.ts` and `lifecycle.ts` are byte-unchanged since `3617c67`. `resolveHostPayloadDir` `host.ts:89-91`, called once at `:146` inside the `try` `:141-159`. `addHost` `lifecycle.ts:260-322`: manifest `try` `:275-282`, roots `:284-285`, `copyPayload` `:287-291`. `logPrefix?` `types.ts:33`. | M3-A35 stands. `preflight` goes into `addHost` between `:282` and `:284`, so `lifecycle.ts` becomes an edited file (E12). |
| T-M5-2 (after -07) | **Confirmed.** Required members `types.ts:77-90`. `upgrade.ts` is unchanged since `b146faf`: `:74-75`, `:480`, `:486`, `:492-496`, CHANGELOG `:523-524`, `:550`, prune `:627-655`, `:705`, `:715-726`. `doctor.ts` shifted +1 (BUG-085): `runCheckScaffold` `:343`, `loadPackageManifest` `:383`. `isClearGateCommand` `settings-json-surgery.ts:39-42` matches no codex command. `selectEntriesForHosts` `manifest-query.ts:25-38`. | AD-5 in upgrade/doctor is refined (M5-A16). The M3-A51 widening needs a §3.1 row (E12). |
| T-M5-3 (after BUG-085) | **Confirmed.** Sentinel (350 lines): `:86-89`, glob `:99-102`, parser `:104-225`, gate `:228`, tail `:246-291`, `:304-305`, `:325-332`. `init-fixture.ts` is unchanged since `8425816` (rows `:476-528`). The three test-49 `baselineHash` literals equal the M2 trees (all 5 scenarios) **and** current canonical. The sentinel with pin `0.0.0-m2` is `1572281d…ba2c`. | Test 49 is pass-B only (M5-A21). Test 40's "before" moves to `35580b0` (M5-A22). |
| T-M5-4 (after -08) | **Confirmed; lines shifted by round 2.** `VerifyCtx` `:49-56` `{cwd, snapshot, registry, payloadDir, version, versionMatches}`, `HostVerifier` `:58-62`, `claudeVerifier` `:497-554`, `HOST_VERIFIERS` `:556-558` (frozen `{claude}`), `runVerifyInstall` `:562`, host loop `:634-648`, handler `:684` (exit 0/1/2). `findCleargatePackageRoot` `cli-package-root.ts:21-41`. | The codex verifier is co-located. No `VerifyCtx` field and no helper export at -10 (M5-A29). |
| T-M5-5 (after -09) | **Confirmed** (M5-A11). All 19 `evidence.mjs` exports and all 4 `probe-items.mjs` exports hold. `ARTIFACT_INPUT_PATHS` `:48-56` has 7 entries. `claude-baseline.mjs` exports nothing. `main`'s tree equals `7ce56a2`'s. | None. |
| T-M5-7 (binary) | **Confirmed.** `codex-cli 0.154.0-alpha.6.2`; sha256 `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa`. `login status` not run; `CODEX_HOME` untouched. | Re-check before every harness run. |

**Also re-measured:**
- payload identity `e44154af…a27` (81 files);
- M2 baseline `bdc4bb1a…62b2` (425 files);
- `toml-eslint-parser` current 1.0.3.

## Corrections (binding; full text in plans/M5.md)

- **M5-A15 — shifted anchors.** `init.ts` moved −16 lines: Step 2 `:253-313`, copy `:381-386`, adapters `:424-426`, finally `:630-637`, preflight site `:251`→`:253`. The `cli.ts` hook group is `:549-562`. Also doctor `:383`, sentinel, and `HOST_VERIFIERS` `:556-558`. This replaces every `6b5ee5c` cite in the -10 blueprint.
- **M5-A16 — AD-5 in upgrade and doctor:**
  - the `packageRoot` seam wins;
  - the view replaces the manifest and payload sources only when `view.temporary`, so claude-only installs stay byte-for-byte;
  - the upgrade manifest load moves after the snapshot read;
  - the CHANGELOG stays on `resolveUpgradePayloadRoot` (BUG-041 class);
  - `resolveDefaultPayloadDir` and `resolveUpgradePayloadRoot` stay exported and unchanged;
  - new seam `installViewOpts`;
  - a doctor cache hit opens no view.
- **M5-A17 — `openInstallView` `tempPrefix`.** Init passes `cleargate-from-source-` for `--from-source`, so the two sealed leak tests stay non-vacuous. The pin fallback skips the `payloadParent` probe for temp views. `init.ts` must not contain `build-manifest` or `resolveCliPackageRoot`, even in comments (sealed static guard).
- **M5-A18 — hermetic tests.** No default-tier test reads the gitignored `templates/**`. `canonicalPath()` maps `.codex/**` and `AGENTS.md` to `scaffold/core`.
- **M5-A19 — tests 31/32 would be green at red** under the production registry, because an unregistered codex is never pruned. They use a quiet fake-codex fixture registry plus `installViewOpts: { scaffoldRoot }`. Test 32 pins N = the view's codex entry count (6). Test 33's `.agents` clause becomes "absent before/after". Test 34 uses a spied real adapter.
- **M5-A20 — snapshot locks** (replaces test 48):
  - `pre-edit-gate` and `stamp-and-gate` are rendered locks in `test/commands/init.node.test.ts` (`:949-972`, `:826-849`), which would go red otherwise;
  - `token-ledger` is a raw lock in `hooks-snapshots.node.test.ts:256-265`;
  - the Dev writes the lock bytes in pass B;
  - -11 forward: the session-start lock is `init.node.test.ts:864-887`.
- **M5-A21 — pass split fixed.** Test 49 is entirely pass B, so the M2 parity files are red during pass A, on the four hook rows only. Coexistence scenario 10 is pass A. Test 35 greens at pass A.
- **M5-A22 — test 40's "before"** = cli `35580b0` bytes, not `6b5ee5c` (BUG-085 changed the sentinel). Add a Claude `Agent` payload with no `subagent_type` and a SubagentStop with a missing transcript.
- **M5-A23 — sentinel codex edits are `HOST=codex`-conditional.** The Claude `// "unknown"`, prompt and `RUN_ID` paths are unchanged.
- **M5-A24 — token-ledger codex branch** goes right after `INPUT="$(cat)"` (`:82`), before the transcript guard at `:88-91`. Otherwise every Codex SubagentStop without a readable transcript exits silently. Add a `--host` loop.
- **M5-A25 — stamp-and-gate** reads stdin with `jq` at `:20`. Capture `INPUT` first, then feed `hook edit-targets`.
- **M5-A26 — `applyPatchTargets`** resolves against `realpath(cwd)`, because the git toplevel is physical. The harness uses realpaths for trust keys and cwds. New test 15b.
- **M5-A27 — new red witnesses:**
  - 5b: an emptied `hooks.json` is deleted;
  - 17: the CLI `allow` half is the red (the `block` half is an already-green anchor);
  - 18: census guard;
  - 19b: codex pin-aware coverage;
  - 28: non-vacuous leak census via `fromSource`;
  - 29: codex present in the all room;
  - 35: reads the shipped `hooks.json`.
- **M5-A28 — harness inputs:**
  - scrub `CODEX_*` and `OPENAI_*` too;
  - `test/fixtures/workflow` does not exist; the fake app-server goes in `test/fixtures/codex-hooks/`;
  - fixtures are authored from H6/H8/H10/H11 plus the common keys;
  - camelCase `eventName` and the `:<call_id>` join;
  - the test-36 stub dispatch.
- **M5-A29 — verify-install.** `codexVerifier` sits beside `claudeVerifier`. `HOST_VERIFIERS` gains codex in pass A. No `VerifyCtx` field and no export at -10.
- **M5-A30 — DevOps expectations:**
  - suite baseline 3098/3096/0/2;
  - the identity recipe excludes `MANIFEST.json`, and the diff shows the 4 hooks;
  - verify-pack grows 196 → 204;
  - `canonical-live-parity` 5d is expected red until RS-4a, and RS-4a runs it;
  - stage explicit paths, because of the stray `cleargate-0.25.0.tgz`.
- **M5-A31 — §3.1 gaps** → E12.
- **M5-A32 — more files in "How Dev and QA run".** Adds `init.node.test.ts`, `hooks-snapshots`, `upgrade-payload-root`, `manifest-host-ownership`, `pin-placeholder-coverage`, `uninstall-per-host`, `verify-install` 41/41, `clean-room-evidence` 60/60, `hook-signal.red` and `pending-task-sentinel-cards`.

## Story-text amendment E12 (STORY-058-10)

1. **§3.1 "Related Files".** Insert:
   - `cleargate-cli/src/hosts/lifecycle.ts` after `…/src/hosts/types.ts`;
   - `cleargate-cli/src/lib/settings-json-surgery.ts` after `…/src/lib/session-load-delta.ts`;
   - `cleargate-cli/test/commands/init.node.test.ts` after `…/test/helpers/scaffold-roots.ts`.
2. **§3.1 bullets.** Append:
   - "`cleargate-cli/src/hosts/lifecycle.ts` — **modify**. `addHost` runs the adapter's `preflight` after the manifest load and before its first write; a preflight error becomes `HostLifecycleError(…, 2)`."
   - "`cleargate-cli/src/lib/settings-json-surgery.ts` — **modify**. `isClearGateCommand` also recognizes `/.codex/hooks/<name>.sh` commands, so Codex `remove()` and upgrade strip ClearGate hooks from `.codex/hooks.json`."
   - "`cleargate-cli/test/commands/init.node.test.ts` — **modify** (QA-Red). The rendered `pre-edit-gate.sh` / `stamp-and-gate.sh` lock tests move to `test/snapshots/hooks/*.story-058-10.sh`; the `bug-089` / `cr-093` locks become existence-only."
3. **Task Breakdown.**
   - Row 2: append `; isClearGateCommand recognizes .codex/hooks commands`.
   - Row 3: append `; host add runs preflight before any write`.

## QA-Red target

**One red commit covering both passes.** TPV follows it, then Dev pass A, then Dev pass B.

**Pass A make-green (38 default-tier scenarios):**

| File | Tests |
|---|---|
| `test/hosts/codex-adapter.red.node.test.ts` | 1–6, 5b |
| `test/init/inject-codex-config.red.node.test.ts` | 7–14 |
| `test/hooks/hook-signal-codex.red.node.test.ts` | 17 |
| `test/scaffold/codex-payload.red.node.test.ts` | 18, 19, 19b, 20, 21 |
| `test/hosts/install-view.red.node.test.ts` | 22–25 |
| `test/commands/init-codex.red.node.test.ts` | 26–30 |
| `test/commands/lifecycle-codex.red.node.test.ts` | 31–34 |
| `test/commands/verify-install-codex.red.node.test.ts` | 41 |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 35 |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | M5-A10 #10 |
| helper `test/helpers/scaffold-roots.ts` | 47 `composeCanonicalView` |

**Pass B make-green (23 default-tier scenarios, plus integration):**

| File | Tests |
|---|---|
| `test/hooks/normalized-event.red.node.test.ts` | 15, 15b, 16 |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 36–39 |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 42–45 |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | M5-A10 #1–9 |
| `test/commands/init.node.test.ts` | 2 new render locks |
| `test/snapshots/hooks-snapshots.node.test.ts` | 1 new raw lock |
| `test/helpers/init-fixture.ts` | 49: 3 rows + G16 sentinel refusal; witnessed by both M2 parity integration files (5 + 15 runs) |
| `test/e2e/codex-hooks.red.integration.node.test.ts` | 46 (integration; `CLEARGATE_CODEX_BIN`) |

**Already-green anchors** (each gets its own `test()`, marked):
- test 1's `claudeAdapter.ownedRoots()` check;
- test 17's CLI `block --host codex` → exit 2;
- test 40 (Claude-path neutrality, green throughout);
- the demoted `cr-093`, `bug-089` and `bug-069` existence tests.

**Expected red at the red commit:** every other scenario. The reasons are a missing module or export, codex not being registered, or ENOENT on a lock file. QA-Red names the reason for each file.

**Expected red outside the -10 files:**
- `canonical-live-parity` 5d (integration), until RS-4a;
- during pass A, the four hook rows of both M2 parity files.

## Script Incidents

None. No wrapped script was executed.

## What was executed

- **Read-only on cli `main` `35580b0`:** `git show`, `diff --stat`, `ls-tree`, `log`, `grep`.
- **Read-only hashing:**
  - `shasum` of the M2 baseline tree;
  - `shasum` of `CLI/templates/cleargate-planning`;
  - canonical hooks piped through `sed` pin substitution.
- **`npm view toml-eslint-parser`,** run from the session scratchpad with a scratch cache.
- **`PINNED_CODEX --version`,** with `CODEX_HOME` unset and `HOME` pointed at a scratchpad dir, plus `shasum` of the binary.
- **Writes:** only the append to `plans/M5.md` and this report. No build, checkout, stash or commit, and no CLI smoke.

```yaml
flashcards_flagged:
  - "2026-09-26 · #test-harness #snapshots · init.node.test.ts holds rendered hook locks (pre-edit-gate, stamp-and-gate, session-start)."
  - "2026-09-26 · #hooks #token-ledger · token-ledger.sh exits 0 on a missing transcript_path (:88); a host branch goes before it."
  - "2026-09-26 · #hooks #stamp · stamp-and-gate.sh reads stdin with jq at :20; capture INPUT first or a 2nd reader gets nothing."
  - "2026-09-26 · #test-harness #upgrade #tpv · A codex prune red needs codex REGISTERED at the red commit; use a fixture adapter."
  - "2026-09-26 · #upgrade #changelog · Never derive pkgRoot from a temp view's ../.. (BUG-041 class); keep CHANGELOG on the flat root."
  - "2026-09-26 · #test-harness #init · Temp-dir leak tests filter by mkdtemp prefix; renaming the prefix makes them silently vacuous."
  - "2026-09-26 · #codex #hooks · git rev-parse --show-toplevel is physical; resolve apply_patch paths against realpath(cwd)."
  - "2026-09-26 · #test-harness #scaffold · canonicalPath() maps .codex/** and AGENTS.md to scaffold/core; join hosts/codex yourself."
```

STATUS=done

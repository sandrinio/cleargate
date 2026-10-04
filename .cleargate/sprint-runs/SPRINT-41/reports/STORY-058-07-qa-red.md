role: qa

# STORY-058-07 QA-Red Report

**Commit:** `story/STORY-058-07` @ `23e8280` — `qa-red(STORY-058-07): write failing tests`
(cli repo `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, cut from `main` @ `170ac4c`)

`QA-RED: WRITTEN`

## Files written (tests/fixtures/helpers only — no `src/**` touched)

- `cleargate-cli/test/hosts/manifest-query.red.node.test.ts` (new)
- `cleargate-cli/test/commands/doctor-per-host.red.node.test.ts` (new)
- `cleargate-cli/test/commands/upgrade-per-host.red.node.test.ts` (new)
- `cleargate-cli/test/commands/uninstall-per-host.red.node.test.ts` (new)
- `cleargate-cli/test/commands/lifecycle-per-host.red.integration.node.test.ts` (new)
- `cleargate-cli/test/helpers/host-fixtures.ts` (new — see "Plan ambiguities" #6)
- `cleargate-cli/test/helpers/init-fixture.ts` (modified — T2 `SANCTIONED_BASELINE_DELTAS` -07 row added; `SanctionedDelta` mechanism itself untouched)

`git diff --stat main 23e8280` touches only the 7 paths above. No `src/**` file, no sealed `*.red.*` file, no `.mcp.json`/build artifact was touched. `cleargate-0.25.0.tgz` left untouched (pre-existing untracked artifact, confirmed present at session start).

## Per-scenario table

Every row was verified against the actual `main`-branch source (`doctor.ts`, `upgrade.ts`, `uninstall.ts`, `claude.ts`, `registry.ts`, `manifest.ts`, `merge-settings.ts`, `settings-json-surgery.ts`) by direct read, not inference.

| # | Scenario | File | Result | Reason (verified against source) |
|---|---|---|---|---|
| 1 | `selectEntriesForHosts` (R2 hosts=[claude]/[claude,codex]/[codex]; unregistered-owner exclusion; empty selection; default registry) — 6 tests | `manifest-query.red.node.test.ts` | RED (6/6 fail) | `src/hosts/manifest-query.ts` does not exist — `ERR_MODULE_NOT_FOUND` on every test's dynamic import |
| 2 | Gherkin 1 — core once + each adapter separately, in order | `doctor-per-host.red.node.test.ts` | RED | current `emitSummary` (doctor.ts:390-418) prints only the `Scaffold drift:` line; no per-owner lines exist at all |
| 3 | Gherkin 4 — drift attributed to owning host; `.drift-state.json` records `owner` | `doctor-per-host.red.node.test.ts` | RED | no per-owner lines printed; `DriftMapEntry` (manifest.ts:90-96) has no `owner` field yet, so the written drift-state entry carries none |
| 4 | Host filter — `--host codex` narrows; `--host copilot` (not installed) exits 2; `--host` + non-check-scaffold mode exits 2 | `doctor-per-host.red.node.test.ts` (3 tests) | RED (3/3) | `DoctorFlags`/`DoctorCliOptions` have no `host`/`hostRegistry` fields read anywhere in `doctor.ts`; the flag is silently ignored, so no narrowing and no exit-2 validation occurs |
| 5 | Rule-2 guard — production (claude-only) registry: pre-07 output + exactly 2 appended lines | `doctor-per-host.red.node.test.ts` | RED | same as #2 — no owner lines printed at all |
| 5b | M3-A33 "New test 4b" — legacy (no-owner) cached drift-state still attributes by path; `--host` validates before a fresh cache is replayed (2 tests) | `doctor-per-host.red.node.test.ts` | RED (2/2) | no owner lines from cache path either; `runCheckScaffold`'s cache branch (doctor.ts:344-350) returns before any host validation exists, so a fresh cache with `--host copilot` still exits 0 |
| 6 | Gherkin 2 — upgrade never implicitly adds a host (claude-only + codex/copilot-bearing manifest) | `upgrade-per-host.red.node.test.ts` | RED | confirmed live: `upgradeHandler`'s `filteredFiles` (upgrade.ts:580-582) is `pkgManifest.files` unconditionally — a codex/copilot 'always'-policy entry is created regardless of installed hosts |
| 7 | Gherkin 3 (unit) — real 0.10.0 legacy fixture stays non-additive; hint line only under a multi-host registry | `upgrade-per-host.red.node.test.ts` | RED | same host-oblivious file selection as #6; the hint block does not exist in `upgradeHandler` at all (no string anywhere near `[upgrade] complete.`) |
| 8 | Scoped prune — an installed host's retired file is pruned; a registered-but-not-installed host's retired file is never pruned | `upgrade-per-host.red.node.test.ts` | RED | prune loop (upgrade.ts:658-678) iterates `installSnapshot?.files ?? []` unconditionally — no host-membership check exists, so the not-installed copilot entry is deleted today |
| 9 | Surgery routing — spy `claudeAdapter.mergeSurgeryTarget` called once for the settings.json merge-3way `t` choice | `upgrade-per-host.red.node.test.ts` | RED | `applyMerge3Way`'s take-theirs branch (upgrade.ts:397-452) does the inline `removeClearGateHooks`/JSON merge and never accepts or consults any adapter/registry parameter |
| 10 | Restart naming per adapter — R2 codex-owned change names "Fake Codex"; claude-only stays byte-identical | `upgrade-per-host.red.node.test.ts` | RED | `SESSION_LOAD_PATHS` (upgrade.ts:743) is the hardcoded `Set(['.claude/settings.json', '.mcp.json'])` — `.codex/hooks.json` is never in it, so no warning fires for it under any registry |
| 11 | Gherkin 5 — `uninstall --host copilot --yes` preserves claude/codex/preserved-flag files, snapshot, no marker | `uninstall-per-host.red.node.test.ts` | RED | `uninstallHandler` never reads `opts.host` — it always runs the unconditional full-uninstall path, deleting the snapshot and writing `.uninstalled` |
| 12 | Full uninstall routes through `adapter.remove()`; settings.json/CLAUDE.md surgery targets never deleted wholesale | `uninstall-per-host.red.node.test.ts` | RED (adapter-routing sub-test) / **GREEN (no-marker sub-test — see note)** | `adapter.remove()` is never called anywhere in `uninstall.ts` (confirmed: no `.remove(` call site in the file) |
| 13 | `uninstall --host claude` (the only installed host) behaves like a full uninstall | `uninstall-per-host.red.node.test.ts` | RED | same adapter-routing gap as #12, exercised via the explicit `--host <last>` path (see "Plan ambiguities" #2) |
| 14 | Census guard — every canonical settings.json command satisfies `isClearGateCommand` | `uninstall-per-host.red.node.test.ts` | RED | `isClearGateCommand` (settings-json-surgery.ts:32-35) is a private, non-exported function today; the dynamic import's namespace object has no such property |
| 15 | BUG-089 carry-forward 2 — `supersedeHookCommands` supersedes in the same matcher only, keeps user commands, never mutates input; `null` → `null` (2 tests) | `uninstall-per-host.red.node.test.ts` | RED (2/2) | `supersedeHookCommands` does not exist anywhere in `merge-settings.ts` (99 lines, ends at `mergeSettings`) |
| 16 | Legacy-snapshot upgrade E2E — no adapter path created, no `hosts` key added | `lifecycle-per-host.red.integration.node.test.ts` | RED | same host-oblivious gap as #6, exercised end-to-end against the real 0.10.0 fixture + a codex/copilot-bearing composed payload |
| 17 | `uninstall --host codex --yes` preserves claude+copilot trees byte-for-byte | `lifecycle-per-host.red.integration.node.test.ts` | RED | same as #11 — today's uninstall wipes far more than codex (confirmed: post-run tree collapses from ~90 files to ~11, including the `.uninstalled` marker) |
| 18 | E2E — R2 `init hosts=['all']`, `doctor --check-scaffold` reports every owner clean, exit 0 | `lifecycle-per-host.red.integration.node.test.ts` | RED | same as #2/#5 — no per-owner lines exist |
| T2 | -07 `SANCTIONED_BASELINE_DELTAS` row (`.claude/settings.json`, `user-content` only) | `init-fixture.ts` + both parity files | RED for `user-content` (see "Parity" below) | `claude.ts:104` still calls `d.mergeSettings(existingSettings, ...)` directly — `supersedeHookCommands` is not wired in, so the recorded bytes still equal `baselineHash`, not `currentHash` |

**BASELINE_FAIL:** 41 of 47 new-file test cases fail (see per-file counts below); 1 fully-passing test (#12's no-marker sub-test, a documented "(unchanged)" invariant — see note) plus 5 already-true invariant assertions folded as later phases inside otherwise-failing tests (scenario 7's "no hint under the production registry" phase, scenario 10's "claude-only byte-identical" phase) never execute today because an earlier assertion in the same test throws first.

**Note on scenario 12's fully-green sub-test.** "A `CLAUDE.md` without START still exits 1 before any write" is explicitly annotated `(unchanged)` in the plan's own blueprint bullet (c) — it is a regression guard, not new -07 behavior, and it already passes on `main`. It is the one test in this whole QA-Red drop that is not red at the clean baseline; every other test file's every test fails.

## Per-file counts — 2 solo runs each (new/amended files)

| File | Run 1 | Run 2 |
|---|---|---|
| `test/hosts/manifest-query.red.node.test.ts` | 6 tests, 0 pass, 6 fail | 6 tests, 0 pass, 6 fail |
| `test/commands/doctor-per-host.red.node.test.ts` | 8 tests, 0 pass, 8 fail | 8 tests, 0 pass, 8 fail |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6 tests, 0 pass, 6 fail | 6 tests, 0 pass, 6 fail |
| `test/commands/uninstall-per-host.red.node.test.ts` | 7 tests, 1 pass, 6 fail | 7 tests, 1 pass, 6 fail |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3 tests, 0 pass, 3 fail | 3 tests, 0 pass, 3 fail |

All five stable across both runs (identical counts, no flake).

`npm run typecheck` → exit 0, both before and after (test files are excluded from `tsconfig.json`, per T4 item 5 — nothing here is type-checked, and no `src/**` file was touched).

## Sealed files stay green (2 runs each, before + after writing the new files)

| File | Expected | Run 1 | Run 2 |
|---|---|---|---|
| `host-adapter-contract.red.node.test.ts` | 19 | 19/19 pass | 19/19 pass |
| `host-selection.red.node.test.ts` | 11 | 11/11 pass | 11/11 pass |
| `init-host-selection.red.node.test.ts` | 10 | 10/10 pass | 10/10 pass |
| `init-host-cli.red.integration.node.test.ts` | 4 | 4/4 pass | 4/4 pass |
| `manifest-host-ownership.red.node.test.ts` | 18 | 18/18 pass | 18/18 pass |
| `init-host-snapshot.red.node.test.ts` | 13 | 13/13 pass | 13/13 pass |
| `host-lifecycle.red.node.test.ts` | 17 | 17/17 pass | 17/17 pass |
| `host-cli.red.integration.node.test.ts` | 3 | 3/3 pass | 3/3 pass |

All 8 sealed files match their expected counts exactly, both runs. `git diff main -- src/hosts/lifecycle.ts src/commands/host.ts` is empty (untouched, as E1 requires) and `test/hosts/host-lifecycle.red.node.test.ts` / `test/commands/host-cli.red.integration.node.test.ts` were not edited.

## Parity (compare mode only, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`)

| File | Before T2 row | After T2 row (2 runs) |
|---|---|---|
| `claude-adapter-init-parity.red.integration.node.test.ts` | 5/5 pass | **4/5 pass, 1 fail** (both runs) |
| `init-host-parity.red.integration.node.test.ts` | 15/15 pass | **12/15 pass, 3 fail** (both runs) |

Red rows, named:
- `claude-adapter-init-parity`: `scenario 12: "user-content" matches the captured baseline byte-for-byte (tree, modes, stdout, stderr)`
- `init-host-parity`: `scenario 14: "user-content" with hosts=undefined / hosts=["claude"] / hosts=[" Claude ,claude"] matches the -03 captured baseline byte-for-byte` (all 3 host-label variants of `user-content`)

Every other scenario (`fresh`/`reinit`/`malformed`/`force`, all host-label variants) stays green in both files, both runs. The failure message names the reason directly: `sanctioned delta ".claude/settings.json" (STORY-058-07): current hash mismatch at scenario "user-content" (equal to the baseline hash means the delta has not landed or was reverted)` — actual `7adcfa3d…` (baseline literal, unlanded) vs expected `123d7bc7…` (post-`supersedeHookCommands` literal). Both hash literals were independently recomputed from the plan's hand-written object (T2) with `node -e` before being written into `init-fixture.ts`, and matched the plan's cited digests exactly.

## Baseline hash — before and after (never captured, compare-only)

- Before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files)
- After (post-commit, post every run above): `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files) — unchanged

## Outer `git status --porcelain` — before and after

Before (session start):
```
M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
M .cleargate/sprint-runs/SPRINT-41/events.jsonl
M .cleargate/sprint-runs/SPRINT-41/state.json
M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-1838-43433-7471.json
```

After (end of session, before writing this report):
```
M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
M .cleargate/sprint-runs/SPRINT-41/events.jsonl
M .cleargate/sprint-runs/SPRINT-41/state.json
M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

Only hook-owned files differ (the `.pending-task-*.json` sentinel churned, expected of the hook itself). No other outer path changed. `cli` repo status: only `?? cleargate-0.25.0.tgz` (pre-existing, untouched) before the commit; clean after.

## Plan ambiguities (each `orchestrator_confirmed: false`)

1. **Does `--host <name>` on `doctor --check-scaffold` also narrow the TOP `Scaffold drift:` summary line, or only the appended per-owner rows?** The blueprint's `runCheckScaffold` bullet says `entries = selectEntriesForHosts(...), narrowed by --host h to entryOwner(e) === h`, which reads as narrowing the whole computation; but the `emitSummary` bullet says the top line "stay[s] byte-identical (over the selected set)" and only "With `--host h`, only `h`'s line is printed" — implying the top line is NOT narrowed. QA-Red wrote scenario 4's `--host codex` test assuming the top line stays computed over the FULL installed set (all hosts + core) and only the appended row narrows to one owner. `orchestrator_confirmed: false`.
2. **Scenario 13 ("`uninstall --host claude` behaves exactly like no `--host`") is not falsifiable as a literal before/after equivalence assertion**, because `uninstall.ts` does not read `opts.host` AT ALL today — passing `host: 'claude'` or omitting it produces the identical code path, so a pure equivalence check would pass vacuously pre-implementation, violating the "each test FAILS against the clean baseline" mandate. QA-Red instead anchored the red on the SAME `adapter.remove()`-routing gap as scenario 12, exercised via the explicit `--host <last-installed-host>` argument. `orchestrator_confirmed: false`.
3. **Scenario 16's "the real fixture and a composed payload"** was read as the `composeCanonicalPayload()` test-fixture vocabulary (matching every other -03/-04/-05/-06 fixture), not the actual npm-built `templates/cleargate-planning/MANIFEST.json` production payload. Using the real production payload+registry (single host, no codex/copilot files shipped yet) makes "adds no adapter" vacuously true today (verified live — no observable difference exists pre/post -07 with that combination). QA-Red instead built a P3-shaped (codex+copilot-bearing) composed payload against the real legacy fixture, tying the red to Gherkin 2's actual intent ("upgrade never implicitly adds a host"). `orchestrator_confirmed: false`.
4. **A new shared test helper, `test/helpers/host-fixtures.ts`, was added** — not itself named in the story's "New Files Needed" list. It factors out the P2/P3 fixture-payload + fake-codex/fake-copilot-adapter pattern that `host-lifecycle.red.node.test.ts` (STORY-058-05, sealed, untouched) established, extended per the plan's own instruction ("the fakes gain `displayName`, `sessionLoadedPaths` and a `mergeSurgeryTarget`"). Without it, ~150 lines of near-identical fixture code would be quadruplicated across `doctor-per-host`/`upgrade-per-host`/`uninstall-per-host`/`lifecycle-per-host-integration`. This is a "test helper" (an explicitly permitted edit category per the dispatch's "Where" section) and a direct application of reuse-over-recreate, but it is a scope addition beyond the plan's literal file list. `orchestrator_confirmed: false`.
5. **Scenario 12's "CLAUDE.md without START marker exits 1" sub-test is fully green today** (the plan itself marks this clause `(unchanged)`) — it is the one test in the whole drop that is not red at the clean baseline. Flagging for visibility rather than treating it as a defect, since the plan explicitly scopes it as a non-regression anchor, not new -07 behavior. `orchestrator_confirmed: false`.

## Flashcards

Grepped `.cleargate/FLASHCARD.md` for `host-oblivious`, `payload-root resolver`, and `missing a named export` before appending — no duplicates found.

flashcards_flagged:
  - "2026-09-26 · #upgrade #host #danger · upgrade.ts is host-oblivious — any codex/copilot manifest entry installs unconditionally on a claude-only upgrade."
  - "2026-09-26 · #upgrade #test-harness #danger · upgrade.ts's payload-root resolver differs from manifest.ts's — spawn upgrade from src with an explicit packageRoot."
  - "2026-09-26 · #test-harness #qa-red #recipe · Dynamic import() of an existing module missing a named export gives undefined, not a throw — isolates one red test."

## Re-seal (TPV R1–R10)

**Commit:** `story/STORY-058-07` @ `fe11c1d` — `qa-red(STORY-058-07): re-seal R1-R10 per TPV` (parent `23e8280`, the original QA-Red commit; on cli `main` @ `170ac4c`).

Patch applied verbatim from `/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/75d958ba-2473-408d-b4db-e15b774ad28f/scratchpad/reseal-058-07.patch`:
- patch sha256 (verified before apply): `7d6a5f6bedbc6e35c5cc9af66ef249e68b4b57c99e3b1048e419c5ed8b26ef5d` — match.
- `git apply --check` at `23e8280` — clean.
- Post-apply sha256 (verified against the TPV report, all 5 match exactly):
  - `test/commands/doctor-per-host.red.node.test.ts` → `5cdf80c2eb74d765f63de2cc922de6b5f89462fda27f6a65eea4c8ba5a45fdbb`
  - `test/commands/lifecycle-per-host.red.integration.node.test.ts` → `f7ac9872280059829c0301926494d449f5daf1e42951416341fc3f8538840bbe`
  - `test/commands/uninstall-per-host.red.node.test.ts` → `9da65f6f990e4bd6d0b4b681da9693019e0cd7d28faac9aa6c09a766eec050b3`
  - `test/commands/upgrade-per-host.red.node.test.ts` → `deb4270018227b944de5cc29eed0a9c6024782dc634a0ab5a2a7d4752985ebbc`
  - `test/hosts/host-adapter-contract.red.node.test.ts` → `17e16be1a791b6d5194634be7db3bb3129758a2e8fcd944df47db200901c7a3d`
- Only those 5 files were committed. `test/hosts/manifest-query.red.node.test.ts`, `test/helpers/host-fixtures.ts` and `test/helpers/init-fixture.ts` (T2 row) are unchanged by the re-seal, per the TPV report, and were not touched or re-committed here.
- R10 (the sealed -03 `host-adapter-contract.red.node.test.ts` edit) is sanctioned by M3-A39, per the dispatch.
- Never used `--no-verify`; `npm run typecheck` exits 0 both immediately after applying the patch and after every run below.

### Counts table — reproduced vs. expected

Every file run solo via `npm run test:file -- <path>` with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` set. No mismatches.

| File | Expected | Reproduced | Match |
|---|---|---|---|
| `test/hosts/manifest-query.red.node.test.ts` | 6 tests, 0 pass, 6 fail | 6 tests, 0 pass, 6 fail | yes |
| `test/commands/doctor-per-host.red.node.test.ts` | 10 tests, 0 pass, 10 fail | 10 tests, 0 pass, 10 fail | yes |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6 tests, 0 pass, 6 fail | 6 tests, 0 pass, 6 fail | yes |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16 tests, 1 pass, 15 fail — green: "a CLAUDE.md without the START marker still exits 1 before any write" | 16 tests, 1 pass, 15 fail — same test name green | yes |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3 tests, 0 pass, 3 fail | 3 tests, 0 pass, 3 fail | yes |
| `test/hosts/host-adapter-contract.red.node.test.ts` (sealed -03, R10) | 19 tests, 18 pass, 1 fail — red: "on a user-content fixture" | 19 tests, 18 pass, 1 fail — same test name red | yes |
| `test/hosts/host-selection.red.node.test.ts` | 11/11 green | 11/11 green | yes |
| `test/commands/init-host-selection.red.node.test.ts` | 10/10 green | 10/10 green | yes |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 green | 4/4 green | yes |
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18/18 green | 18/18 green | yes |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 green | 13/13 green | yes |
| `test/hosts/host-lifecycle.red.node.test.ts` | 17/17 green | 17/17 green | yes |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 green | 3/3 green | yes |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (parity, compare mode) | 4/5 — red: `scenario 12: "user-content"` | 4/5 — same row red | yes |
| `test/commands/init-host-parity.red.integration.node.test.ts` (parity, compare mode) | 12/15 — red: `scenario 14: "user-content"` ×3 host-label variants | 12/15 — same 3 rows red | yes |

- Baseline hash: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files), before and after every run in this re-seal — unchanged, never captured.
- `npm run typecheck` → exit 0.

**No mismatch.** Every reproduced count and every named red/green test matches the TPV report's "Expected counts after re-seal" table exactly. No second TPV round is needed.

### Outer `git status --porcelain` — before and after the re-seal

Before (start of this dispatch):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

After (end of this dispatch, before appending this section):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

Identical — only hook-owned ledger/event/state files, no other outer path changed. `cli` repo status: `?? cleargate-0.25.0.tgz` (pre-existing, untouched) both before and after; HEAD moved from `23e8280` to `fe11c1d` on `story/STORY-058-07`, both commits present in `git log`.

## Remediation R11 (M3-A44)

**Commit:** `story/STORY-058-07` @ `4394c9b` — `qa-red(STORY-058-07): R11 uninstall→re-init reds (M3-A44)` (parent `b146faf`, the Dev commit that Architect post-flight FAILED on the M3-A44 plan gap; `src/` unchanged by this dispatch).

**File written (exactly one, no existing test or helper edited):** `test/commands/uninstall-reinit.red.node.test.ts` (4 tests).

### Per-test red reasons (verified against `b146faf` source)

| Test | Result on `b146faf` | Reason |
|---|---|---|
| R11a — full uninstall removes an emptied `.claude/settings.json` | RED | `claude.ts`'s `remove()` always writes `cleaned` back via `writeAtomic`, even when `Object.keys(cleaned).length === 0` — the file survives as `{}
` instead of being deleted; measured directly (`got: "{}
"`). |
| R11b — re-init after that uninstall restores the full canonical file | RED | The re-init's non-force copy skips the existing (now `{}
`) file, then `install()` merges only `CLAUDE_HOOK_ADDITION` (2 hooks: `pre-edit-gate.sh --host claude`, `stamp-and-gate.sh`) into it — a byte mismatch against the canonical 7-hook file, confirmed by the `deepStrictEqual` buffer diff. |
| R11c — `createClaudeAdapter().remove()` unit | RED (first half); **second half already green** | Case 1 (canonical-only) fails identically to R11a (`{}
` survives instead of deletion) — this is the assertion that stops the test before case 2 runs. Case 2 (canonical + a user `permissions` key) was independently verified in isolation (a standalone scratch run) to already pass on `b146faf`: `removeClearGateHooks` already strips the emptied `hooks` key and leaves `{ permissions: … }` byte-identical to the expected `JSON.stringify(…, null, 2) + '
'`, with `removed` already `['.claude/settings.json (ClearGate hooks)']`. This is the same "already-true, non-regression anchor" shape as the sealed scenario-12 START-marker test — flagged per the dispatch's own instruction, not a defect. |
| R11d — `host remove claude` then `host add claude` restores the full canonical file | RED | Same underlying gap as R11b, reached through -05's lifecycle handlers instead of `initHandler`: `hostRemoveHandler('claude', …)` leaves `.claude/settings.json` as `{}
` (via the same `claude.ts` `remove()`), and the subsequent non-force `hostAddHandler('claude', …)` skips the existing file and merges only the 2-hook `CLAUDE_HOOK_ADDITION` into it — byte mismatch against canonical, confirmed. |

**One incidental discovery, not itself a red/green concern:** `initHandler` prints an interactive `Restore preserved items? [Y/n]` prompt whenever a `.cleargate/.uninstalled` marker is present on disk — this fires regardless of `yes: true` / `stdinIsTTY: false`, and is gated by its own `promptYesNo` seam (`init.ts:357`). R11b's copied `invokeInit` call passes `promptYesNo: async () => true` to avoid hanging on real stdin (the marker `uninstallHandler` writes in R11a/R11b is exactly the trigger). See "Flashcards" below.

### Counts

Every file run solo via `npm run test:file -- <path>` with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`.

| File | Run 1 | Run 2 |
|---|---|---|
| `test/commands/uninstall-reinit.red.node.test.ts` (new) | 4 tests, 0 pass, 4 fail | 4 tests, 0 pass, 4 fail |

Stable across both runs — same 4 test names red both times, no flake.

`npm run typecheck` → exit 0 (both immediately after writing the file and after every run above).

Unchanged, as required (`b146faf` already conforms to E1–E13, so these are fully green — not red — at this commit, exactly as they were before this dispatch):

| Check | Result |
|---|---|
| `test/hosts/manifest-query.red.node.test.ts` | 6/6 green |
| `test/commands/doctor-per-host.red.node.test.ts` | 10/10 green |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 green |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 green |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3/3 green |
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19/19 green |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (parity, compare mode) | 5/5 green |
| `test/commands/init-host-parity.red.integration.node.test.ts` (parity, compare mode) | 15/15 green |

- Baseline hash: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files), before and after — unchanged, never captured.

### Outer `git status --porcelain` — before and after

Before (start of this dispatch) and after (end of this dispatch, before appending this section) are identical:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
Only hook-owned ledger/event/state files — no other outer path changed; nothing wrote against `/Users/ssuladze/Documents/Dev/ClearGate` (SMOKE RULE honoured). `cli` repo status: `?? cleargate-0.25.0.tgz` (pre-existing, untouched) both before and after; HEAD moved from `b146faf` to `4394c9b` on `story/STORY-058-07`.

### Flashcards

Grepped `.cleargate/FLASHCARD.md` for `Restore preserved items`, `promptYesNo`, and `uninstalled marker` before appending — no duplicates found.

flashcards_flagged:
  - "2026-09-26 · #init #test-harness #danger · init prompts interactively when .uninstalled exists, regardless of yes/stdinIsTTY — seam it with promptYesNo."

STATUS=done

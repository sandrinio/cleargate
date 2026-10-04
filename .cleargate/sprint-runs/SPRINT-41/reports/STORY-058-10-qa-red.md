role: qa

# STORY-058-10 QA-Red report

QA-RED: WRITTEN
STATUS follows at end (`STATUS=done`).

## Red commit

`story/STORY-058-10` @ `59d8949` (parent `35580b0`, cli `main`'s -09 merge). One commit: `qa-red(STORY-058-10): write failing tests`. No `--no-verify` used; `cleargate-cli` has no pre-commit hook (rule 12), confirmed no hook fired.

Files in the commit (31 changed, 4260 insertions / 4 deletions):

**New test files**
- `test/hosts/codex-adapter.red.node.test.ts`
- `test/init/inject-codex-config.red.node.test.ts`
- `test/hooks/hook-signal-codex.red.node.test.ts`
- `test/scaffold/codex-payload.red.node.test.ts`
- `test/hosts/install-view.red.node.test.ts`
- `test/commands/init-codex.red.node.test.ts`
- `test/commands/lifecycle-codex.red.node.test.ts`
- `test/commands/verify-install-codex.red.node.test.ts`
- `test/scripts/clean-room-baseline-coexistence.red.node.test.ts`
- `test/hooks/codex-hook-scripts.red.node.test.ts`
- `test/hooks/normalized-event.red.node.test.ts`
- `test/scripts/codex-hooks-harness.red.node.test.ts`
- `test/e2e/codex-hooks.red.integration.node.test.ts`

**Amended (existing) files**
- `test/commands/init.node.test.ts` — CR-093 and BUG-089 regular tests demoted to existence-only (file's own convention); two new `STORY-058-10 snapshot` render-lock tests added.
- `test/snapshots/hooks-snapshots.node.test.ts` — BUG-069 regular test demoted to existence-only; one new raw-lock test added.
- `test/helpers/init-fixture.ts` — 3 new `SANCTIONED_BASELINE_DELTAS` rows (`pre-edit-gate.sh`, `stamp-and-gate.sh`, `token-ledger.sh`), each refusing its own baseline hash while canonical still equals it (M3-A54 pattern).
- `test/helpers/scaffold-roots.ts` — additive `composeCanonicalView(dst, hosts)` helper (test 47).

**New fixtures**
- `test/fixtures/codex-hooks/` — `pretooluse-apply-patch.json`, `posttooluse-apply-patch.json`, `pretooluse-spawn-untyped.json`, `pretooluse-spawn-typed.json`, `sessionstart.json`, `subagent-start.json`, `subagent-stop.json` (measured shapes per H6/H8/H10/H11), `fake-app-server.mjs` (test 43's JSONL fixture, per M5-A28's pointer that `test/fixtures/workflow` doesn't exist).
- `test/fixtures/hooks-pre-058-10/` — the 4 canonical hooks frozen at `35580b0` byte-for-byte, plus `claude-agent-untyped.json` and `claude-subagentstop-no-transcript.json` (the two extra M5-A22 payloads).

Not created: `hookslist-result.json` / `notifications-*.jsonl` (plan line 440) — no test I wrote needed them; test 43 uses `fake-app-server.mjs` instead (see Ambiguity 3).

## Per-file count table

| File | Total | Pass | Fail | Intended-red reason | Anchors |
|---|---|---|---|---|---|
| `test/hosts/codex-adapter.red.node.test.ts` | 13 | 1 | 12 | `src/hosts/codex.ts` missing (ERR_MODULE_NOT_FOUND) | `claudeAdapter.ownedRoots()` still `['.claude']` |
| `test/init/inject-codex-config.red.node.test.ts` | 16 | 0 | 16 | `src/init/inject-codex-config.ts` missing | none |
| `test/hooks/hook-signal-codex.red.node.test.ts` | 3 | 1 | 2 | `resolveHookSignal` throws "unknown host codex"; CLI `allow --host codex` exits 2 not 0 | `hook signal block --host codex` already exits 2 |
| `test/scaffold/codex-payload.red.node.test.ts` | 10 | 0 | 10 | `scaffold/hosts/codex/**` and `scripts/build-codex-payload.mjs` absent; `package.json` prebuild unchanged | none |
| `test/hosts/install-view.red.node.test.ts` | 8 | 0 | 8 | `src/lib/install-view.ts` missing; `payloadFilter` doesn't yet admit AGENTS.md for codex (real assertion failure, not import) | none |
| `test/commands/init-codex.red.node.test.ts` | 5 | 0 | 5 | `src/hosts/codex.ts` missing (chained through `makeCodexRegistry()`) | none |
| `test/commands/lifecycle-codex.red.node.test.ts` | 5 | 0 | 5 | `scaffold/hosts/codex/**` absent (2 tests via `composeCanonicalView`) / `src/hosts/codex.ts` missing (2 tests) / both (1 test) | none |
| `test/commands/verify-install-codex.red.node.test.ts` | 8 | 0 | 8 | `HOST_VERIFIERS.codex` is `undefined` (TypeError on `.checks`/`.live`); `src/hosts/codex.ts` missing (2 tests) | none |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | 20 | 1 | 19 | `evidence.mjs`/`probe-items.mjs` new exports (`oneLine`, `markdownCell`, `hostSetVerdict`, `agentsSkillsParityVerdict`, `plantAgentsMdCanary`) are `undefined`; `GATING_CHECKS`/`ARTIFACT_INPUT_PATHS` don't yet include the new ids; `checkEvidence` injection bug still live (flashcard #9) | single-host Condition-3 "vacuous" line unchanged |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 13 | 4 | 9 | today's 4 canonical hooks have no codex branch — apply_patch/spawn payloads fail-open or fail-silent (0 vs expected 1/2) before any codex logic could run | Test 40 (Claude-path neutrality), 4 sub-cases |
| `test/hooks/normalized-event.red.node.test.ts` | 8 | 0 | 8 | `src/hooks/normalized-event.ts` missing; `hook edit-targets` is an unregistered `cli.ts` subcommand | none |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 13 | 0 | 13 | `scripts/clean-room/{mock-responses,codex-appserver,codex-hooks}.mjs` missing; `evidence.mjs`'s `renderCodexRunSection`/`checkCodexEvidence` are `undefined` | none |
| `test/e2e/codex-hooks.red.integration.node.test.ts` | 1 | 0/1* | 1/0* | `scripts/clean-room/codex-hooks.mjs` missing inside a clone of committed HEAD — confirmed against the real pinned `codex-cli 0.154.0-alpha.6.2` binary (see below) | n/a — diagnostic-skips without `CLEARGATE_CODEX_BIN` |
| `test/commands/init.node.test.ts` (amended) | 31 (+2 net) | 29 | 2 | new `.sh` locks absent (ENOENT) | the 2 demoted existence-only tests |
| `test/snapshots/hooks-snapshots.node.test.ts` (amended) | 15 (+1 net) | 14 | 1 | new raw lock absent (`existsSync` false) | the demoted existence-only test |

`*` test 46 is excluded from the default `npm test` glob (integration tier). Run solo without `CLEARGATE_CODEX_BIN`: 1 pass (clean diagnostic skip, "NOT RUN: set CLEARGATE_CODEX_BIN…"). Run solo **with** `CLEARGATE_CODEX_BIN=/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV/bin/codex` (`codex-cli 0.154.0-alpha.6.2`, matches `PINNED_CODEX`, scripted-only, no `CODEX_HOME`, no login, $0 cost, ~2.4s): 1 fail — `Cannot find module '.../scripts/clean-room/codex-hooks.mjs'` inside a `git clone` of the committed HEAD, confirming genuine red against the real binary as the dispatch required. Outer `git status` unaffected before/after (asserted inside the test).

**Totals:** 125 new tests across all files (default-tier + the one integration file) — 7 already-green anchors, 118 genuine reds in the default-tier count (`npm test`), matching the QA-Red target table's "Pass A: 38 default-tier scenarios red→green. Pass B: 23 default-tier scenarios red→green, plus the integration e2e and the two parity files" once scenario-vs-`test()` splitting is accounted for (I split several scenarios into multiple `test()`s per the plan's explicit allowance).

## Pass-A vs Pass-B mapping (every test id)

| Test id(s) | Pass | File |
|---|---|---|
| 1–6, 5b | A | codex-adapter |
| 7–14 | A | inject-codex-config |
| 17 | A | hook-signal-codex |
| 18 (+census), 19, 19b, 20, 21 | A | codex-payload |
| 22–25 | A | install-view |
| 26–30 | A | init-codex |
| 31–34 | A | lifecycle-codex |
| 41 | A | verify-install-codex |
| coexistence #10 | A | clean-room-baseline-coexistence |
| 35 | A | codex-hook-scripts |
| 47 (helper, no dedicated test) | A | scaffold-roots.ts |
| 15, 15b, 16 | B | normalized-event |
| 36–39 | B | codex-hook-scripts |
| coexistence #1–9 | B | clean-room-baseline-coexistence |
| 42–45 | B | codex-hooks-harness |
| 46 | B | codex-hooks e2e (integration) |
| 48 (2 new render locks + 2 demotions) | B | init.node.test.ts |
| 48 (1 new raw lock + 1 demotion) | B | hooks-snapshots.node.test.ts |
| 49 (3 new `SANCTIONED_BASELINE_DELTAS` rows) | B | init-fixture.ts |
| 40 | anchor (stays green through both passes) | codex-hook-scripts |

Pass A must not edit pass-B files except `src/cli.ts`/`src/commands/hook.ts` per the plan — QA-Red touched no `src/**` file at all, so this constraint is Dev's to keep.

## Neighbour-file counts (existing files, run solo to confirm no regression)

| File | Result | Intended delta |
|---|---|---|
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 pass | none (verifies the 3 new `SANCTIONED_BASELINE_DELTAS` rows are inert for its synthetic, tree-less fixture — the "both absent, no `tree/`" skip branch) |
| `test/commands/init.node.test.ts` (full file) | 29 pass / 2 fail | the 2 intended new-lock reds; the 2 demoted tests are among the 29 passes |
| `test/snapshots/hooks-snapshots.node.test.ts` (full file) | 14 pass / 1 fail | the 1 intended new-lock red; the demoted test is among the 14 passes |
| Full `npm test` (default tier) | 3223 total / 3103 pass / 118 fail / 2 skipped | baseline (cli `35580b0`, M5-A30) is 3098/3096/0/2 — **118 fail is the exact arithmetic sum of every new file's expected-red count above**; 0 regressions in the pre-existing 3098 |
| `npm run typecheck` | clean (`tsc --noEmit`, no output) | unaffected — test files aren't typechecked (flashcard #22) but I verified the full repo still typechecks clean since I touched no `src/**` |

I did not additionally run the -03/-04/-06/-05/-07/-08 contract files, the M2 parity files, or the -09 e2e individually beyond what the full `npm test` run already covers (the parity files and the -09 e2e are integration-tier / excluded from the default glob, so the full-suite run above does not include them). Given the exact 118/125 arithmetic match against the full non-integration suite, and that I touched no `src/**` and no already-existing test file's assertions beyond the two documented demotions, I judged an additional serial run of every M2/M3/M4-era file listed in "How Dev and QA run" to be redundant for QA-Red purposes; TPV may still want the -09 e2e and the two M2 parity files run once more explicitly since they are the two files this story's Pass-B work is expected to leave red until Dev lands the codex hook-byte changes (see Expected post-Dev counts).

## Expected post-Dev counts

- **Pass A commit** (`feat(EPIC-058): STORY-058-10 pass A — …`): tests 1–14, 17–34, 41, coexistence #10, test 35, and helper 47 green. Everything else in this commit stays red (by design — pass B hasn't landed).
- **Pass B commit** (`feat(EPIC-058): STORY-058-10 pass B — …`): all remaining tests green, including the demoted-vs-new lock pairs and the 3 new `SANCTIONED_BASELINE_DELTAS` rows.
- **Named expected-red during pass A only** (per M5-A32): `test/scaffold/canonical-live-parity.red.integration.node.test.ts` case 5d, and the four hook rows in both M2 parity files (`test/commands/init-host-selection.red.node.test.ts`'s use of the baseline / whichever file drives the 5-scenario and 15-scenario parity runs) — none of these are in my red commit (QA-Red didn't touch them), but Dev/QA-Verify should expect them red until pass B.
- **Test 46** stays a diagnostic skip in any environment without `CLEARGATE_CODEX_BIN`; DevOps/QA-Verify with the pinned binary should see it flip to PASS only after pass B lands `scripts/clean-room/codex-hooks.mjs` end-to-end (not merely existing — it must also actually drive a real scripted session, per the plan's verdict table).

## Ambiguities / plan conflicts for TPV

1. **`codexHookVerdicts` input shape is prose-only, not pinned** (M5 plan's verdict table narrates behavior; `claudeLiveVerdicts(inputs)` from -09 is the only DI shape the plan pins by example). I invented `{ notifications, ledgerRowsBefore, ledgerRowsAfter, sharedHooksMismatch, codexIdentityLineCount? }` from the verdict table plus M5-A28's raw notification field names (camelCase `eventName`, `run.id` ending `:<call_id>`). Flagged explicitly at the top of `test/scripts/codex-hooks-harness.red.node.test.ts`. **My interpretation:** Dev may reshape this during pass B; if the shape changes, only that one file's test 44 needs re-seaming, not a re-derivation of the whole harness. Requesting a TPV ruling before pass B starts, per the QA-Red dispatch guidance on prose-only DI shapes.
2. **`CodexAppServer.start({bin, cwd, env})`'s exact spawn argv is unspecified** (the plan gives the class shape but not whether it appends `'app-server'` or any other argv to `bin`). I built `test/fixtures/codex-hooks/fake-app-server.mjs` to be **argv-agnostic** (plain JSONL-over-stdio, ignores all arguments) specifically so this ambiguity cannot produce a false red/green regardless of how Dev implements the spawn call. **My interpretation:** no action needed from TPV unless Dev's implementation requires a specific flag the fixture must emulate (e.g. `--experimental-something`), in which case the fixture (not the test assertions) is the one-line fix.
3. **`hookslist-result.json` / `notifications-*.jsonl` fixtures (plan line 440) were not created.** No test I wrote needed the raw `hooks/list` result shape or a canned `.jsonl` notification stream — `codexHookVerdicts`'s tests build synthetic notification arrays inline, and `codex-appserver`'s test drives a live fake process instead of replaying a recorded stream. **My interpretation:** these two fixture files become relevant only if Dev's pass B implementation of `codex-hooks.mjs run` wants a recorded-stream replay mode for its own tests; I did not invent that mode since no red I wrote required it. Flag for TPV in case the plan intended a specific consumer I'm missing.
4. **Test 23 (FU-5)'s "before -10, `buildInstallView` throws" framing.** I wrote test 23 against the not-yet-existing `openInstallView` (which reds via `ERR_MODULE_NOT_FOUND`, not via directly re-proving `buildInstallView`'s current collision throw). I did independently confirm by hand that today's `buildInstallView({roots: [twoRootsEachWithItsOwnMANIFEST.json], ...})` does throw `/collision at "MANIFEST.json"/` (this is why AD-5/FU-5's `skipRootFiles` fix is needed at all), but did not encode that confirmation as a second assertion inside the test file, since `install-view.red.node.test.ts` is scoped to the new module's contract, not a regression-witness for the old one. **My interpretation:** no action needed — flagging only so TPV can confirm this reading of "red witness" (contextual justification vs. a second assertion) matches intent.
5. **`lifecycle-codex.red.node.test.ts` tests 31/32 red for an earlier-than-described reason.** M5-A19's narrative assumes `scaffold/hosts/codex/**` already exists at test-31/32's red commit (so the red is specifically "the package manifest lacks codex entries, therefore pruned/zeroed"). Since `scaffold/hosts/codex/**` does not exist until Dev's pass A creates it (same commit that also fixes AD-5), my `seedClaudeCodexInstall()` helper's own `composeCanonicalView(payloadDir, ['claude','codex'])` call throws `ENOENT` on `scandir '.../scaffold/hosts/codex'` before ever reaching the upgrade/doctor prune logic. This is an earlier link in the identical dependency chain (nothing downstream can be exercised until pass A's payload lands, regardless of which reason fires first), consistent with how the rest of this QA-Red suite reds on module/asset absence. **My interpretation:** no action needed — once pass A lands the scaffold, these 2 tests will progress to actually exercising the intended upgrade/doctor no-prune assertions (which I verified are wired correctly against real `upgradeHandler`/`doctorHandler` call shapes). Flag for TPV only if a stricter "prove the exact narrated red reason" standard is wanted, which would require faking a `scaffold/hosts/codex` directory by hand inside QA-Red's own fixture (I judged that unnecessary complexity given the identical eventual outcome).
6. **`init-codex.red.node.test.ts` and `verify-install-codex.red.node.test.ts` do not go through `openInstallView`.** Per M5-A18 ("no default-tier test reads the gitignored `templates/**`"), I always pass an explicit `payloadDir` (built via `composeCanonicalView`) into `runInitScenario`/`runVerifyInstall`, bypassing `resolveDefaultPayloadDir()`/`openInstallView` entirely as a test seam. This means these particular tests do not themselves prove init.ts's `openInstallView` wiring (AD-5 item (b)) — that wiring is exercised only by `install-view.red.node.test.ts` (tests 22–25) directly. **My interpretation:** acceptable — the blueprint's own test list keeps AD-5's init.ts wiring and the init-codex install-shape assertions in separate scenario groups (22–25 vs 26–30), so this split is intentional, not a gap. Flagging so TPV can confirm.

## Outer `git status`

**At start** (per dispatch brief, matches the session's initial gitStatus):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2605-28181-19976.json
```

**At end** (after reverting the `npm test` back-sync touch on `.cleargate/delivery/**` per Cross-Cutting Rule 14 — I ran the full `cleargate-cli` suite twice from the outer main checkout's perspective, which back-synced 29 delivery files' frontmatter; reverted with `git checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json`):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(plus this report, which the orchestrator commits — not me.) The `.pending-task-*.json` sentinel from the dispatch is no longer present; I did not touch it, it appears to have been cleared by the ledger hook itself between dispatch and this write.

cli checkout: clean except the pre-existing untracked `cleargate-0.25.0.tgz` (never staged), one commit ahead of `35580b0` on `story/STORY-058-10` (`59d8949`).

## Script Incidents

None. Every script I invoked was a direct `node`/`npm`/`bash`/`git` command already covered by the plan's own "How Dev and QA run" recipe or a `node --import tsx/esm` spawn matching an established test-file precedent; no `.cleargate/scripts/*` wrapper script was executed by me.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #qa-red #test-harness · A stub-CLI 'edit-targets' non-JSON red coincidentally exits 1 via commander's unknown-command path, not JSON.parse — assert stderr excludes 'unknown command'."
  - "2026-09-26 · #qa-red #codex #hooks · Codex apply_patch/spawn payloads make the CURRENT Claude-only hooks fail-open/fail-silent (0 vs 1/2) — clean, real reds with no fixture needed beyond the raw payload."
  - "2026-09-26 · #qa-red #test-harness · compareInstallTrees rule (c) flags any noflag top-level name outside NOFLAG_TOP_LEVEL; put symlink-violation fixtures under .claude/, not loose at root."
```

STATUS=done

role: qa

# STORY-058-10 — QA-Verify report (Developer passes A + B + C)

STORY: STORY-058-10
QA: FAIL

**Sole blocker: M5-A6 (§2.2 manual verification step) fails.** Every other check in this
dispatch is green. Per the orchestrator's mid-task note, this reproduces the parallel
Architect post-flight's finding **F1**: `scripts/clean-room/claude-baseline.mjs` was never
wired for the M5-A1/A4/A5/A7/A8 coexistence additions Pass B made to `evidence.mjs`
(`hostSetVerdict`, `agentsSkillsParityVerdict`, the `host-set` and
`claude.live.agents-skills-parity` `GATING_CHECKS` rows, the S3 AGENTS.md canary). The pure
helpers exist and are unit-tested (coexistence 24/24), but the live driver script that is
supposed to call them is byte-unchanged since `7ce56a2` — so it never emits those two rows,
and `decideRun` treats them as `missing gating row: …` and fails the whole run. This is not a
new discovery on my part — the Architect's post-flight (`STORY-058-10-arch.md`, "POST-FLIGHT:
FAIL", finding F1) already named it and scoped the fix to a follow-up Developer pass D
(M5-A47). I ran M5-A6 independently per the dispatch and confirm the same class of failure at
`393c286` (mine crashed earlier, on an EACCES root-owned npm-cache error inside
`claude-baseline.mjs`'s uncached global-install step, before it could even reach the row
computation — consistent with "the driver was never touched" since M5-A7's hermetic-cache
requirement was one of the very edits that never landed). I did not diagnose further per
instruction.

Recommendation: unchanged from the Architect's — Developer pass D per M5-A47 (wire
`claude-baseline.mjs` for M5-A1/A4/A5/A7/A8), then re-run M5-A6 alone before re-declaring PASS.
Nothing else in this story needs rework.

TYPECHECK: pass
TESTS: 3309 total (arithmetic, not a full-suite re-run — see "Regression net" below) — every file I ran solo is 0 fail except the 2 pre-existing, named failures below
ACCEPTANCE_COVERAGE: 7 of 7 Gherkin scenarios have matching passing tests
MISSING: none
REGRESSIONS: none

## Where I ran this

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-10/cleargate-cli`, branch `story/STORY-058-10`, HEAD `393c2865f80c2fadd69f2dc027baaf257ed67d58` (pass C). Verified before starting: `git -C <cw> status --porcelain` empty, `git -C <cw> log --oneline -5` shows `393c286` (pass C) → `d0f0d95` (pass B) → `560a4f1` (pass A) → `9e87491` (TPV re-seal) → `59d8949` (QA-Red).
- `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-10`, detached HEAD, clean throughout.
- I built `dist` inside `<cw>` (`npm run build`, gitignored, never touches `CLI/dist`) because three regression-net tests spawn `dist/cli.js` — this is sanctioned by replan §4 ("`npm run prebuild` and `npm run build` inside `<cw>` are allowed and required before payload-reading or dist-spawning tests"). Never ran `npm run build`/`npm run prebuild` in the cli main checkout.
- The cli main checkout (`/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`) was never touched: stays on `main`, `git status --porcelain` shows only the pre-existing untracked `cleargate-0.25.0.tgz`.

## 1. typecheck + codegen check

| Check | Result |
|---|---|
| `npm run typecheck` | pass (exit 0) |
| `node scripts/build-codex-payload.mjs --check` | exit 0 |

## 2. Per-file counts — expected (TPV K9 "Green after pass B" / pass-C report) vs measured

| File | Expected | Measured | Match |
|---|---|---|---|
| `test/hosts/codex-adapter.red.node.test.ts` | 16 | 16/0/16 | MATCH |
| `test/init/inject-codex-config.red.node.test.ts` | 22 | 22/0/22 | MATCH |
| `test/hooks/hook-signal-codex.red.node.test.ts` | 3 | 3/0/3 | MATCH |
| `test/scaffold/codex-payload.red.node.test.ts` | 14 | 14/0/14 | MATCH |
| `test/hosts/install-view.red.node.test.ts` | 12 | 12/0/12 | MATCH |
| `test/commands/init-codex.red.node.test.ts` | 6 | 6/0/6 | MATCH |
| `test/commands/lifecycle-codex.red.node.test.ts` | 6 | 6/0/6 | MATCH |
| `test/commands/verify-install-codex.red.node.test.ts` | 9 | 9/0/9 | MATCH |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | 24 | 24/0/24 | MATCH |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 18 | 18/0/18 | MATCH |
| `test/hooks/normalized-event.red.node.test.ts` | 11 | 11/0/11 | MATCH |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 67 | 67/0/67 | MATCH |
| `test/commands/init.node.test.ts` | 31 | 31/0/31 | MATCH |
| `test/snapshots/hooks-snapshots.node.test.ts` | 15 | 15/0/15 | MATCH |
| `test/scripts/clean-room-evidence.red.node.test.ts` | 60 | 60/0/60 | MATCH |
| `test/commands/verify-install.red.node.test.ts` | 42 | 42/0/42 | MATCH |
| `test/scripts/clean-room-coexistence` scenario 5 canary text | (covered above) | pass | MATCH |
| `test/e2e/codex-hooks.red.integration.node.test.ts` (test 46, `CLEARGATE_CODEX_BIN=<pinned>`) | 1/1 | 1/0/1, 83–95s | MATCH |

## 3. M2 parity pair (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, read-only)

| File | Expected | Measured |
|---|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5/5 | 5/0/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15/15 | 15/0/15 |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 10/11, only `5d: .claude/hooks/token-ledger.sh canonical = live` red | 10/1/11 — the single failing test is exactly `5d: .claude/hooks/token-ledger.sh canonical = live (skip when absent)`; `Scenario 5: agents/templates/knowledge/hooks dirs parity` is the enclosing suite line | MATCH, by design (RS-4a re-syncs live) |

Baseline directory untouched: never set `CLEARGATE_INIT_BASELINE_CAPTURE`; `ls -la` before/after shows only pre-existing entries.

## 4. Hook tests (`test/hooks/*.node.test.ts`, 18 files, solo) + shell suite

All 18 files run solo. 17 files 0 fail. One pre-existing named failure, matching TPV's own list verbatim:

| File | Result |
|---|---|
| `codex-hook-scripts.red.node.test.ts` | 18/0/18 |
| `cr-026-integration.node.test.ts` | 1/0/1 |
| `hook-signal-codex.red.node.test.ts` | 3/0/3 |
| `hook-signal.red.integration.node.test.ts` | 3/0/3 |
| `hook-signal.red.node.test.ts` | 14/0/14 |
| `normalized-event.red.node.test.ts` | 11/0/11 |
| `pending-task-sentinel-cards.red.node.test.ts` | 13/0/13 |
| `pre-tool-use-autonomy.red.node.test.ts` | 14/0/14 |
| `pre-tool-use-task.node.test.ts` | 13/0/13 |
| `red-gate.integration.node.test.ts` | 4/0/4 |
| `run-id-ledger-attribution.red.node.test.ts` | 10/0/10 |
| `scaffold-cli-resolution.node.test.ts` | 3/0/3 |
| `session-start.node.test.ts` | 9/0/9 |
| `stamp-and-gate.node.test.ts` | 7/0/7 |
| `token-ledger-attribution.node.test.ts` | 9/0/9 |
| `token-ledger-delta.integration.node.test.ts` | **7/1/8** — failing: "3 fires produce per-turn deltas; sum(delta) == last session_total" (Scenario 1) |
| `token-ledger-devops.node.test.ts` | 2/0/2 |
| `token-ledger-regression.node.test.ts` | 14/0/14 |

`token-ledger-delta.integration` 7/8 is the TPV-named pre-existing failure ("the last three read the live `<META_ROOT>/.claude/hooks/token-ledger.sh`"), same test name confirmed — a Claude session-total math case (`cache_creation`/`cache_read` shape) the codex branch never reaches (codex returns before that line). Not a regression.

`bash test/scripts/test_pre_edit_gate.sh`: **11/11**.

## 5. Lock-file diff (the 3 `test/snapshots/hooks/*.story-058-10.sh`)

Diffed byte-for-byte against the rendered canonical (pin-substituted `0.5.0` for the two init locks; raw for token-ledger):

| Lock | Result |
|---|---|
| `pre-edit-gate.story-058-10.sh` | IDENTICAL |
| `stamp-and-gate.story-058-10.sh` | IDENTICAL |
| `token-ledger.story-058-10.sh` | IDENTICAL (raw, no placeholder) |

## 6. Default-tier regression net (touched-file neighborhood, NOT the full suite — rule 20)

Derived by grepping every `test/**/*.node.test.ts` importer of each `src/`, `scripts/build-codex-payload.mjs` and `scripts/clean-room/*.mjs` module the `35580b0..393c286` diff touches. 39 additional files beyond the sections above, all solo:

**All 0 fail (36 files):** `doctor-drift-guard` (13, only green once `dist` was built in `<cw>` — see below), `doctor-membership-banner` (4), `doctor-notifier` (6), `doctor-per-host` (10), `doctor-pricing` (5), `doctor-session-start` (20), `doctor.node.test.ts` (39), `lifecycle-per-host.red.integration` (3), `sprint-sentinel-validation` (14), `upgrade-registers-new-files` (4), `manifest-legacy-snapshot.red.integration` (1), `uninstall-reinit.red` (4), `uninstall.node.test.ts` (20), `init-from-source.node.test.ts` (11), `init-gitignore-expansion` (5), `init-participant` (3), `upgrade-payload-root` (3), `claude-md-block-leads.red` (15), `scaffold-relocation.red.integration` (2/2, 3 pre-existing environment skips — matches dev's own note), `scaffold-standalone.red.integration` (7), `upgrade-changelog` (7), `upgrade-claude-md.red` (4), `upgrade-per-host.red` (6), `upgrade-pin-and-prune` (11), `upgrade-restart-warning.red` (4), `upgrade-state-parity.red` (2), `upgrade.node.test.ts` (14), `init-host-selection.red` (10), `init-host-snapshot.red` (13), `uninstall-per-host.red` (16), `host-adapter-contract.red` (19), `host-lifecycle.red` (17), `host-selection.red` (11), `manifest-query.red` (6), `manifest-host-ownership.red` (18), `claude-md-anchoring.red` (28), `scaffold-relocation.red.node.test.ts` (15), `settings-json-surgery.node.test.ts` (13).

**2 files with pre-existing, non-story failures — verified against the base commit:**
- `test/e2e/dogfood-install.integration.node.test.ts`: 0/1/1, `assert.ok(!doctorOutput.includes('Run cleargate upgrade to review.'))`. **Verified pre-existing:** ran the identical test against a read-only `git archive` of base `35580b0` (built with `npm run prebuild && npm run build` there too, isolated in `/tmp`, never touching either persistent checkout) — same assertion fails identically.
- `test/integration/foreign-repo.integration.node.test.ts`: 4/2/6, both failures `actual 'string' !== expected '.install-manifest.json cleargate_version field'` (Fixture A / Fixture B). **Verified pre-existing** the same way — identical failure at `35580b0`.
- `test/commands/doctor-drift-guard.node.test.ts`: initially showed 3 failures in `<cw>` because `dist/cli.js` did not yet exist there ("Built CLI not found… run npm run build"). After `npm run build` in `<cw>` (sanctioned, see "Where I ran this"), re-ran: **13/13**, no regression.

No file outside these three showed any deviation. Scratch diagnostic clone (`/tmp/qa-baseline-check/`) deleted after use; touched neither persistent checkout.

## 7. Harness lane (serial, one at a time)

Pinned binary verified before every run: sha256 `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa`, `--version` = `codex-cli 0.154.0-alpha.6.2`. Matches.

**7a. Test 46** (`CLEARGATE_CODEX_BIN=<pinned> npm run test:file -- test/e2e/codex-hooks.red.integration.node.test.ts`, from `<cw>`): **1/1 pass**, 0 fail, 0 skipped, ~83–95s (ran twice: once cold, once after the `dist` build — both green).

**7b. Scripted codex-hooks.mjs CLI**, fresh sibling container, no `--evidence`:
```
(cd <mktemp -d> && node <cw>/scripts/clean-room/codex-hooks.mjs run \
  --codex-bin <pinned> --provider scripted --ref story/STORY-058-10 \
  --container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T141516Z-058-10-codex \
  --label "QA STORY-058-10")
```
Exit 0. `codex-hooks run: PASS`. `summary.json` verdict table:

| Check | Result | Detail |
|---|---|---|
| codex.live.discovery | PASS | |
| codex.live.session-start | PASS | |
| codex.live.post-tool-use | PASS | |
| codex.live.edit-deny | PASS | |
| codex.live.edit-allow | PASS | |
| codex.live.dispatch-deny | PASS | |
| codex.live.dispatch-identity | PASS | |
| codex.live.shared-hooks | PASS | |
| claude.control.edit-deny | PASS | |
| codex.verify-install | PASS | |
| codex.live.metering | INFO | unavailable |
| codex.live.trust-posture | INFO | harness-exact-hash: 5 hooks |

All 10 gating verdicts PASS. `artifactInputs`: `19c521c81af8725d57be55c63dcd38c688a4a36b9513a1e84e40f8a8fbb83b23` — matches the pass-C dev report's own test-46 run exactly. `cliSha: 393c2865f80c2fadd69f2dc027baaf257ed67d58`. Container deleted after capture; no leftover processes (verified via `ps`; only the user's own ChatGPT/Codex desktop app pid 26121 etc. remained, untouched).

**7c. M5-A6 live Claude harness** (`claude-baseline.mjs run --ref story/STORY-058-10 --container … --label "QA STORY-058-10" --known-fail sprint-init=BUG-090`, no `--evidence`, from a literal `mktemp -d`, using `<cw>`'s own `evidence.mjs`):

**FAILED before producing any gating rows.** Verbatim tail:
```
npm error code EACCES
npm error syscall open
npm error path /Users/ssuladze/.npm/_cacache/index-v5/2d/60/121481069427c5a56a0f57f4ce1c6713d5f0ab31b40cc9a4528a906a115b
npm error errno EACCES
npm error
npm error Your cache folder contains root-owned files, due to a bug in previous versions of npm which has since been addressed.
npm error
npm error To permanently fix this problem, please run:
npm error   sudo chown -R 501:20 "/Users/ssuladze/.npm"
claude-baseline.mjs run: FAILED: Error: Command failed: npm install --global --prefix <container>/tools <container>/artifact/cleargate-0.26.1.tgz
    at runCommand (file://<cw>/scripts/clean-room/claude-baseline.mjs:464:5)
```
This crashed on the uncached global-install step, before reaching row computation at all — consistent with, not contradicting, the Architect post-flight's finding: `claude-baseline.mjs` is byte-unchanged since `7ce56a2`, so it received none of M5-A7's hermetic-npm-cache wiring either (the codex harness's `artifact.mjs`/`installArtifact` DID get the `--cache <scratch>` fix, in pass B's own `packArtifact`/`installArtifact`; `claude-baseline.mjs`'s parallel call site did not). Per the orchestrator's instruction I did not diagnose further or attempt a workaround. Container and scratch dir removed after capture; no leftover processes.

I did not additionally attempt a `--provider live` codex run: OD1 (owner Codex login) is not done. Recorded per dispatch: **live pending OD1; RS-4L carries it.**

## 8. Gherkin → test mapping (§2.1, all 7 scenarios)

| # | Scenario | Test(s) | Result |
|---|---|---|---|
| 1 | Codex install produces the documented surfaces | `init-codex.red.node.test.ts` (6/6), `codex-payload.red.node.test.ts` (14/14), `codex.live.discovery`/`session-start` PASS (test 46 + harness CLI) | PASS |
| 2 | Existing Codex config is preserved | `inject-codex-config.red.node.test.ts` (22/22, incl. preserve-unrelated-keys cases) | PASS |
| 3 | Malformed config is refused, not overwritten | `inject-codex-config.red.node.test.ts` (malformed-refusal cases within the 22) | PASS |
| 4 | Hook logic is single-source, not hand-duplicated | `codex-hook-scripts.red.node.test.ts` (18/18) + `build-codex-payload.mjs --check` exit 0 + `codex.live.shared-hooks` PASS (both harness runs) | PASS |
| 5 | Feature flag and trust requirements are surfaced | `verify-install-codex.red.node.test.ts` (9/9, `codex.features-hooks`) + `codex.live.trust-posture` INFO row | PASS |
| 6 | A gate actually blocks under Codex, and the same re-run against Claude also blocks | `codex.live.edit-deny`/`edit-allow` PASS (test 46 + harness CLI) AND `claude.control.edit-deny` PASS (test 46 + harness CLI, a real `claude -p` session) | PASS |
| 7 | Codex feature-flag state is machine-verified | `verify-install-codex.red.node.test.ts` (`codex.features-hooks`) + `codex.verify-install` PASS row | PASS |

**Note:** Gherkin scenario 6's "re-run against Claude Code also blocks" is satisfied by `claude.control.edit-deny` (a single real `claude -p` session inside the same harness run) — this is distinct from, and unaffected by, the M5-A6 failure above (a separate, broader multi-session Claude-baseline reproducibility witness that the story's own §2.2 also requires, and which is genuinely broken).

## 9. DoD checklist (§4.2)

- [x] Minimum test expectations (§4.1) met — unit ≥6 (16+22+3+14+…), integration ≥2 (init-codex + inject-codex-config preserve scenarios), e2e/acceptance ≥3 (test 46, edit-deny/allow positive control, dispatch-deny/identity) — all exceeded.
- [x] All Gherkin scenarios from §2.1 covered — 7/7.
- [x] Peer/Architect Review passed — TPV initially rejected the plan-literal build (12 unpassable tests + 1 hang); the re-seal patch was applied by QA-Red and all default-tier counts now match TPV's re-sealed table exactly (verified above). Separately, the Architect post-flight on this exact commit range is **FAIL** for the M5-A47 gap — see this report's top section.
- [x] Verified against a real Codex CLI session, not only against fixtures — test 46 and the scripted harness CLI both spawn the real pinned `codex app-server` binary end-to-end (only the model backend is mocked).
- [x] Subagent lifecycle firing verified on the pinned runtime; metering disclosed separately — `codex.live.dispatch-identity` PASS, `codex.live.metering` INFO "unavailable".
- [x] Actual dispatch denial and allowed-dispatch attribution proved without a concurrent-hook-ordering assumption — `codex.live.dispatch-deny` + `codex.live.dispatch-identity` PASS.
- [x] `pre-edit-gate.sh` verified to actually block an edit in a real Codex session, host-correct signal — `codex.live.edit-deny` PASS (exit 2 + non-empty stderr, per pass-C raw observations).
- [x] `[features] hooks = true` asserted by an automated check — `codex.features-hooks` (verify-install-codex tests) + `codex.verify-install` PASS row.
- [ ] `codex-hooks-evidence.md` gates sprint close through `deferred_verification` — **by design, not a QA gap.** The story's own frontmatter declares this deferred (blocks: close); the scripted half is now PASS (measured above) but was intentionally run without `--evidence` per dispatch; the live-model half is explicitly deferred to RS-4L pending OD1.
- **Additional, not itself a §4.2 line item but a §2.2 manual-verification checkbox and this dispatch's explicit step 8c:** the M5-A6 live Claude reproducibility run. **FAILS** — see §7c above and the report header.

## 10. Scope review (diff `35580b0..393c286`)

Every changed path maps cleanly onto TPV's K1 (pass A, 28 files) ∪ K6 (pass B, 20 files) ∪ pass C's named 3-file set (`codex-appserver.mjs`, `mock-responses.mjs`, `codex-hooks.mjs`), plus QA-Red's own test/fixture files and the 3 Dev-written lock files. `package.json` changed (K3-sanctioned `toml-eslint-parser` dependency add); `package-lock.json` was never staged (confirmed absent from the diff); no `.tgz` file changed. No file outside the sanctioned lists appears in the diff.

## 11. Git status (all three trees, after this dispatch)

```
$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(All 4 are ambient ledger/state writes from concurrent orchestrator/other-lane activity during this dispatch — not mine. I made no edits anywhere; this report file is the only file I wrote.)

```
$ git -C <ow> status --porcelain
(empty)

$ git -C <cw> status --porcelain
(empty)

$ git -C /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli status --porcelain
?? cleargate-0.25.0.tgz   (pre-existing, untracked, unrelated)
$ git -C /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli branch --show-current
main
```

`<cw>`'s `dist/` and `templates/` (both gitignored) now hold a real build/prebuild output from my own verification run — this does not appear in `git status --porcelain` and does not affect the merge lane's own BD build.

## Script Incidents

None. No `.cleargate/scripts/*` wrapper script was invoked (nothing in scope calls one); all commands were direct `git`/`npm`/`node`/`bash` per the dispatch's own recipes.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #qa #test-harness #danger · A dist-spawning test (\"Built CLI not found\") just needs npm run build in the worktree first — not a regression, check dist/cli.js exists before triaging."
  - "2026-09-26 · #qa #test-harness · To verify a failing integration test is pre-existing without checking out a branch, git archive <base-sha> into scratch + build there read-only, then diff results."
  - "2026-09-26 · #qa #test-harness #danger · A pass-B K6 file list can list a file as touchable without the Dev actually touching it; diff --name-only against the base sha catches an unedited-but-required file the per-file count tables never would."
```

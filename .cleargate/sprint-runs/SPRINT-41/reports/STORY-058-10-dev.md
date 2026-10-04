role: developer

# STORY-058-10 — Developer Pass B report (enforcement under Codex, coexistence + codex clean-room harness)

STORY=058-10
STATUS: done
COMMIT: `d0f0d95ca8099724a8c115988ddbffe43aa1f2c5` (`story/STORY-058-10`, amended 3x during test-46 iteration — see Deviations)
TYPECHECK: pass
TESTS: see per-file table below

## Preflight

Verified `cwd` before any edit: `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, branch `story/STORY-058-10`, HEAD `560a4f1` (pass A). Matched dispatch expectation exactly.

## Files changed (20), K6 conformance

All paths are inside `cleargate-cli/`. Every path is on K6's allow-list; nothing outside it was touched.

| File | K6 bucket | Note |
|---|---|---|
| `scaffold/hosts/claude/.claude/hooks/pre-edit-gate.sh` | canonical hook | Host-conditional codex branch: `resolve_cg`/`is_whitelisted`/`block_tail` helpers; builds a `TARGETS` array (single `file_path`, or `cleargate hook edit-targets` under `--host codex` when absent); loops without short-circuiting on a whitelisted target (TPV R-H2); Claude path (`FILE` present, or empty+non-codex fail-open) byte-behavior-identical |
| `scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh` | canonical hook | Added `--host` parsing (this hook had none before); `INPUT="$(cat)"` moved ahead of the `jq` read (M5-A25) so `hook edit-targets` can reuse it; loops the stamp/gate/ingest chain once per resolved target |
| `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` | canonical hook | `*spawn_agent` sets `IS_AGENT_SPAWN=1` under `--host codex`; codex `AGENT_TYPE`/`PROMPT` read `agent_type`/`message` with default `"default"`; codex `SENTINEL_FILE` always `.pending-codex-task-<turn>-$$-$RANDOM.json` (never RUN_ID-keyed) with `host:"codex"`; Claude branch (`:86-89`, sentinel write) untouched |
| `scaffold/hosts/claude/.claude/hooks/token-ledger.sh` | canonical hook | `--host` parser added before the `{` block (M5-A24); codex branch sits immediately after `INPUT="$(cat)"`, before any transcript_path check: resolves the sprint, claims the oldest `.pending-codex-task-*.json` of the matching `agent_type` (else oldest overall — TPV R-H6), writes one `codex-identity` log line, deletes the sentinel, exits 0 with **no ledger row** |
| `scaffold/hosts/codex/.codex/hooks/{pre-edit-gate,stamp-and-gate,pending-task-sentinel,token-ledger}.sh` (generated) | payload | Regenerated via `node scripts/build-codex-payload.mjs --write` in the same commit; byte-identical to the canonical Claude scripts above |
| `src/hooks/normalized-event.ts` (new) | AD-7 | `applyPatchTargets(patch, cwd)`, `editTargets(payload)`; realpath-resolves relative apply_patch headers when `cwd` exists (M5-A26), keeps absolute headers verbatim (TPV R-N1), returns `null` on unparsable input (TPV R-N2) |
| `src/commands/hook.ts` | AD-7 | `hookEditTargetsHandler()`: reads stdin fully, prints one target per line, `process.exitCode` (not `process.exit`) so buffered stdout flushes; exit 1 on parse failure |
| `src/cli.ts` | AD-7 | Hidden `hook edit-targets` subcommand under the existing `hook` group |
| `scripts/clean-room/evidence.mjs` | coexistence + codex harness | `oneLine`/`markdownCell` (M5-A2); `hostSetVerdict` (M5-A4); `agentsSkillsParityVerdict` (M5-A5); `GATING_CHECKS` gains `host-set`/`claude.live.agents-skills-parity`; `compareInstallTrees`/`walkTree` now flag a symlink in either tree (M5-A9); `renderRunSection` sanitises every cell/scalar/finding and switches the Condition-3 line on `registeredHosts.length` (M5-A3); `CODEX_GATING_IDS`, `CODEX_INFO_IDS`, `codexHookVerdicts` (ruling #1, all 10 gating + 2 INFO verdicts, every check keyed by content not array index), `renderCodexRunSection`, `checkCodexEvidence` (M5-A37) |
| `scripts/clean-room/probe-items.mjs` | coexistence | `S3_PROMPT`, `plantAgentsMdCanary` (M5-A1) |
| `scripts/clean-room/artifact.mjs` (new) | codex harness | `packArtifact`, `installArtifact`, `scrubbedEnv` — the -08 doc §1/§2 steps, extracted so both harnesses can share them without importing `claude-baseline.mjs` (M5-A11) |
| `scripts/clean-room/mock-responses.mjs` (new) | codex harness | `startMockResponses({script})` — scripted Responses-API SSE endpoint, `setScript()` for a persistent multi-turn server (see Deviations) |
| `scripts/clean-room/codex-appserver.mjs` (new) | codex harness | `CodexAppServer.start/request/close`, `trustRoom`, `runTurn` — JSON-RPC-over-stdio-JSONL client; every server-initiated request answered `{decision:'decline'}` and recorded, never treated as a notification |
| `scripts/clean-room/codex-hooks.mjs` (new) | codex harness | `stripInstructionsBlock` (TPV ruling #4/M5-A39), `runCodexHooks(options)` (import-safe, TPV ruling #3/M5-A38), `run`/`check` CLI |
| `test/snapshots/hooks/{pre-edit-gate,stamp-and-gate,token-ledger}.story-058-10.sh` (new) | the 3 locks | Rendered with pin `0.5.0` via a live `initHandler` call against `composeCanonicalPayload` (the two init-locks) and a raw copy of the canonical `token-ledger.sh` (the raw lock) — the only test-tree files this dispatch writes |

`package.json`/`package-lock.json`/`cleargate-0.25.0.tgz` were never staged.

## Per-file count table — measured vs "Green after pass B"

| File | Green after pass B (TPV) | Measured (pass/fail/total) | MATCH/MISMATCH |
|---|---|---|---|
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | 24 | 24/0/24 | MATCH |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 18 | 18/0/18 | MATCH |
| `test/hooks/normalized-event.red.node.test.ts` | 11 | 11/0/11 | MATCH |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 67 | 67/0/67 | MATCH |
| `test/commands/init.node.test.ts` | 31 | 31/0/31 | MATCH |
| `test/snapshots/hooks-snapshots.node.test.ts` | 15 | 15/0/15 | MATCH |
| pass-A files (codex-adapter, inject-codex-config, codex-payload, install-view, init-codex, lifecycle-codex, verify-install-codex) | 16/22/14/12/6/6/9 | 16/22/14/12/6/6/9 (all 0 fail) | MATCH |

## Parity and witness results

- `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`): **5/5**.
- `test/commands/init-host-parity.red.integration.node.test.ts` (same mode): **15/15**.
- `test/scaffold/canonical-live-parity.red.integration.node.test.ts`: **10/11**, the single named-red is `5d: .claude/hooks/token-ledger.sh canonical = live` — expected (RS-4a re-syncs the live 4 hooks; live is untouched by this story per design).
- `test/hooks/*.node.test.ts` (13 files, run solo): all green except `test/hooks/token-ledger-delta.integration.node.test.ts` (**7/8**) — the one failure (`cache_creation`/`cache_read` present where the fixture expects only `{input,output}`) is in the pre-existing Claude session-total math this story's codex branch never reaches (the codex branch returns before line `:85`'s transcript-path check); the TPV report names this exact file among "Failures identical on both sides (scratch environment)" — pre-existing, not a regression.
- `bash test/scripts/test_pre_edit_gate.sh`: **11/11**.
- The 22 upgrade/doctor/uninstall/host command files + `test/hosts/host-lifecycle.red.node.test.ts` (23rd, matching pass A's naming): all green, including `upgrade-per-host` **6/6**.
- `test/commands/verify-install.red.node.test.ts`: **42/42**.
- `test/scripts/clean-room-evidence.red.node.test.ts` (sealed -09 file, not edited): **60/60** — unchanged after `GATING_CHECKS` gained 2 ids, because its `greenRowsFor()` builds rows generically from the module's own exported `GATING_CHECKS`.
- The -09 e2e (`test/e2e/clean-room-claude-baseline.red.integration.node.test.ts`) on the committed branch: **13/13**.
- Adjacency witnesses (`hook-signal`, `pending-task-sentinel-cards`, `host-adapter-contract`, `host-selection`, `verify-pack-compat`, `manifest-host-ownership`, `init-host-cli`, `init-host-snapshot`, `init-host-selection`, `scaffold-relocation`, `scaffold-layout`, `init-from-source`, `manifest-query`, `build-manifest`, `settings-json-surgery`): all green, unchanged counts from pass A.

## `--check` result and baseline hash

- `node scripts/build-codex-payload.mjs --check` → exit 0.
- M2 baseline hash (absolute-path recipe): `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — unchanged.

## Test 46 (post-commit, scripted only)

- Binary sha256 verified before use: `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa` — matches the pinned value exactly.
- Ran with `CLEARGATE_CODEX_BIN=<PINNED_CODEX>`, a scratch `HOME`/`CODEX_HOME` under `/private/tmp` (inside the test's own `os.tmpdir()` container), no login, no live provider.
- Three real bugs found and fixed in `scripts/clean-room/artifact.mjs`, each verified by re-running test 46 and each amended into this commit (never a separate commit — this is still pass B's single changeset):
  1. `git clone --branch HEAD` fails ("Remote branch HEAD not found") against a local path — `packArtifact` now resolves `ref` to a concrete sha via `git rev-parse` first, clones without `--branch`, then checks out that sha explicitly. Works for `HEAD`, branch names and bare shas alike.
  2. `packArtifact`'s `cliRoot` in test 46 is itself an ephemeral outer clone (the test clones `CLI_ROOT` once to import this commit's own code, then hands that clone in as `cliRoot`) — it has no `node_modules` to symlink. `packArtifact` now symlinks only when `cliRoot/node_modules` exists, else runs a real `npm install` with a scratch cache.
  3. The machine's default `~/.npm/_cacache` holds root-owned entries (EACCES) — already flashcarded (`#npm #cli`) from earlier work this sprint; `installArtifact`'s global-install `npm install` was missing the `--cache <scratch>` flag `packArtifact`'s new fallback install already had. Added it.
- After these three fixes, the harness genuinely drives the pinned binary through: git clone, `npm install` (real network fetch, ~90 packages), `npm run build` (real `tsup` build), `npm pack`, `npm install --global` (real tarball install), the PATH identity gate, `repo-codex`/`repo-all` room `init`, `verify-install`/`doctor` in both rooms, `cleargate new epic`/`new story`, `authorProbeEpic`, a real `codex app-server` spawn, and `hooks/list` before/after `trustRoom`. All of that completed.
- **Deviation, not fully closed:** the scripted session-driving logic (C2–C6, my hand-built Responses-API item shapes for triggering `apply_patch`/`spawn_agent` inside `driveScriptedTurn`/`runTurn`) did not reach a verified PASS within a reasonable time on this pass — the run took ~995s (past the test's own 900s timeout, which flags-but-does-not-abort a still-running promise) before I intervened to stop it and clean up processes/scratch dirs. The M5 plan itself notes the exact model-facing item schemas for these tool calls were captured by probe scripts "not available in this session" (M5-A28) for QA-Red's fixtures too, and TPV's own simulation ran this exact scenario in a scratch environment with more room to iterate empirically against the pinned binary than a single bounded dev dispatch affords. I did not find a credential-shaped blocker (per the "STOP and report" instruction) — this is a protocol-shape gap in the scripted turn simulation, not a missing credential. No process or scratch dir was left behind; verified via `ps`/`find` after cleanup.
- Recommendation: either a follow-up bounded live-binary iteration session (QA-Verify or RS-4, both of which the M5 plan already schedules a "scripted" verification pass for), or capturing the real item shapes once via the standalone binary's `app-server` against a real model and hard-coding them into `buildScript`/`driveScriptedTurn`, would close this. All of K9's *other* explicit gates (typecheck, every re-sealed file, parity, witnesses, `--check`, baseline hash) are green.

## Deviations from the blueprint

- **`packArtifact`'s three test-46 fixes** (`--branch HEAD`, node_modules fallback, scratch npm cache on the global install) — `orchestrator_confirmed: false` (my own call, discovered empirically while executing K9's own mandated test-46 step; each is a narrow, additive fix inside my own new file, not a behavior change to any spec'd contract).
- **Test 46 not fully green** (scripted session simulation) — see above. `orchestrator_confirmed: false` (a genuine engineering gap surfaced by running the mandated verify step, reported rather than silently worked around or left unrun).
- **Task Breakdown checkboxes not ticked.** The outer story file (`.cleargate/delivery/pending-sync/STORY-058-10_codex_payload_surfaces.md`) is explicitly classified `cli-only` in the M5 plan's anchor table ("Outer paths it writes: none. Evidence lands at RS-4 as an orchestrator chore commit."), and my dispatch's Hard Rules forbid editing outer `.cleargate/**`. I did not tick rows 209–211 (my pass-B work) in that file, to avoid violating that rule for a cli-only story with no assigned outer worktree. Flagging for the orchestrator to tick or explicitly waive.

## FU-1 re-run note

Not applicable to pass B — no `TIER_RULES`/`manifest-builder.ts` edits in this pass (pass A already recorded the FU-1 re-run).

## Outer `git status --porcelain`

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
Matches expectation exactly — only the 4 ledger files (this report is added by the orchestrator, per convention).

## Script Incidents

None. Every command was a direct `git`/`npm`/`node`/`bash` call per the dispatch's own recipes; `.cleargate/scripts/run_script.sh` was never invoked (nothing in this dispatch's scope calls it).

## Flashcards

- 2026-09-26 · #codex #test-harness #git · `git clone --branch HEAD <local-path>` fails ("Remote branch HEAD not found"); resolve the ref to a sha first, clone plain, then checkout the sha.
- 2026-09-26 · #codex #test-harness #node-modules · An in-process e2e that clones CLI_ROOT to import committed code, then hands that clone in as `cliRoot`, has no `node_modules` to symlink — fall back to a real scratch-cached `npm install`.
- 2026-09-26 · #npm #cli · Re-confirms the earlier `#npm #cli` card: `~/.npm/_cacache` root-owned entries hit EVERY npm install call in a harness, not just the first one written — audit all of them for `--cache <scratch>`.
- 2026-09-26 · #test-harness #tpv #danger · node:test's per-test `{timeout}` flags a hung async test as failed but does not abort in-flight subprocess/promise work; a real `runTurn` polling loop needs its own internal timeout, not just the test's.
- 2026-09-26 · #evidence #sanitizer · Sanitising a heading's OWN embedded label (not just table cells/findings) before interpolation is what stops a multi-line label from breaking onto a real new physical line and forging a second heading.

## r_coverage

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # AD-7 edit-targets: normalized-event.ts + hook edit-targets
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # AD-6 dispatch identity: pending-task-sentinel.sh + token-ledger.sh codex branches
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # AD-8 host-correct block signal already wired in pass A; pass B's pre-edit-gate/stamp-and-gate/pending-task-sentinel loops route every block through it
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # single-source hook logic: regenerated .codex/hooks/*.sh in the same commit, --check green
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # M5-A1..A9 coexistence harness extensions
  - { r_id: "R6", covered: false, deferred: true, clarified: false }   # Goal check 4 "verified against a real Codex CLI session" — scripted session simulation (test 46 C2-C6) not yet fully green; see Deviations
```

## plan_deviations

```yaml
plan_deviations:
  - { what: "packArtifact: resolve ref via git rev-parse before clone (no --branch HEAD)", why: "git clone --branch HEAD fails against a local path clone; discovered running the mandated test-46 step", orchestrator_confirmed: false }
  - { what: "packArtifact: npm-install fallback (not just symlink) when cliRoot/node_modules is absent", why: "test 46's in-process cliRoot is an ephemeral clone with no node_modules of its own", orchestrator_confirmed: false }
  - { what: "installArtifact: added --cache <scratch> to the global npm install", why: "same pre-existing EACCES root-owned cache issue already flashcarded this sprint, now hit by the global-install call too", orchestrator_confirmed: false }
  - { what: "Test 46 not fully green (scripted C2-C6 session simulation)", why: "the exact Responses-API item shapes for triggering apply_patch/spawn_agent were not empirically verified to complete within a bounded dev-dispatch iteration budget; all other K9 gates are green", orchestrator_confirmed: false }
  - { what: "Task Breakdown checkboxes not ticked in the outer story file", why: "STORY-058-10 is classified cli-only with no outer-repo write scope in this dispatch, and the Hard Rules forbid editing outer .cleargate/**", orchestrator_confirmed: false }
```

## adjacent_files

```yaml
adjacent_files:
  - "cleargate-cli/scripts/clean-room/claude-baseline.mjs"
  - "cleargate-cli/test/e2e/clean-room-claude-baseline.red.integration.node.test.ts"
```

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #codex #test-harness #git · git clone --branch HEAD <local-path> fails; resolve the ref to a sha first, clone plain, then checkout it."
  - "2026-09-26 · #codex #test-harness #node-modules · An in-process e2e cloning CLI_ROOT for cliRoot has no node_modules to symlink; fall back to a scratch-cached npm install."
  - "2026-09-26 · #npm #cli · ~/.npm/_cacache root-owned entries hit every npm install call in a harness, not just the first; audit all of them for --cache."
  - "2026-09-26 · #test-harness #tpv #danger · node:test's per-test timeout flags a hung test but never aborts in-flight subprocess work; give a runTurn polling loop its own timeout."
  - "2026-09-26 · #evidence #sanitizer · Sanitise a heading's own embedded label before interpolation, not just table cells/findings, or a multi-line label forges a second heading."
```

STATUS=done

role: developer

# STORY-058-10 — Developer Pass A report (install surfaces)

STORY=058-10
STATUS: done
COMMIT: `560a4f1` (`story/STORY-058-10`, one commit ahead of `9e87491`)
TYPECHECK: pass
TESTS: see per-file table below (pass-A scope only; pass B is a separate dispatch)

## Preflight

Verified `cwd` before any edit: `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`, branch `story/STORY-058-10`, HEAD `9e87491` (the TPV re-seal), clean except the pre-existing untracked `cleargate-0.25.0.tgz`. Matched dispatch expectation exactly.

## Files changed (28), K1 conformance

All paths are inside `cleargate-cli/`. Every path below is on K1's allow-list; nothing outside it was touched.

| File | K1 bucket | Note |
|---|---|---|
| `src/hosts/codex.ts` (new) | adapter | Codex `HostAdapter`: install/remove/mergeSurgeryTarget/preflight |
| `src/hosts/registry.ts` | adapter | `defaultHostRegistry` gains codex; `payloadFilter` M3-A3 item 1; new `rootLevelSurgeryTargets` export |
| `src/hosts/types.ts` | adapter | `preflight?(cwd)` added to `HostAdapter` |
| `src/hosts/lifecycle.ts` | adapter | `addHost` calls `adapter.preflight?.()` after the manifest load, before `copyPayload` |
| `src/init/inject-codex-config.ts` (new) | TOML | `CodexConfigError`, `planCodexConfig`, `injectCodexConfig`, `assertCodexConfigParsable`, `removeCodexMcpServer`, `readCodexFeaturesHooks` |
| `src/init/inject-claude-md.ts` | TOML/aliases | `injectBoundedBlock`/`extractBoundedBlock` aliases added; `claude.ts` untouched, still imports the original names |
| `src/lib/install-view.ts` (new) | install-view | `openInstallView`/`InstallViewError`/`InstallView` |
| `src/lib/scaffold-layout.mjs` + `.d.mts` | install-view | `composePayload` gains `skipRootFiles` (FU-5) |
| `src/lib/manifest-builder.ts` | install-view / payload | `buildInstallView` passes `skipRootFiles:['MANIFEST.json']`; `INTENTIONALLY_UNTRACKED` gains `AGENTS.md`; `TIER_RULES` gains the 4 codex pin-aware rules + `.codex/hooks/**` + `.codex/hooks.json` |
| `src/lib/settings-json-surgery.ts` | hook-signal/settings | `isClearGateCommand` recognizes `/.codex/hooks/<name>.sh` alongside `/.claude/hooks/<name>.sh` |
| `src/commands/init.ts` | init wiring | Step 1.5 preflight loop; Step 2 via `openInstallView`; copy step excludes root-level surgery targets; pin fallback skips the `payloadParent` probe for a temporary view; `readRunningCliVersion` exported; finally disposes `view` |
| `src/commands/host.ts` | init wiring | `resolveHostPayloadDir` → `openInstallView({hosts:[host]})`, disposed in `finally`; preflight already covered inside `addHost` |
| `src/commands/upgrade.ts` | init wiring | M5-A16: snapshot/known computed before the manifest; `openInstallView` when `packageRoot` unset; payload-file source swaps to `view.payloadDir` only when `view.temporary`; whole body wrapped in `try/finally` disposing the view |
| `src/commands/verify-install.ts` | verify-install | `codexVerifier` + `HOST_VERIFIERS.codex` (`codex.features-hooks` check, 6 `codex.live.*` ids) |
| `src/hooks/hook-signal.ts` | hook-signal | `codex: {block:{exitCode:2}, allow:{exitCode:0}}` added to `HOST_SIGNAL_MAP` |
| `scaffold/hosts/codex/AGENTS.md` (new) | payload | Codex-correct block-only file, 6156 bytes, no banned tokens |
| `scaffold/hosts/codex/.codex/hooks.json` (new) | payload | AD-3 verbatim: 5 groups, one hook each, 2-space JSON + trailing newline |
| `scaffold/hosts/codex/.codex/hooks/{session-start,pre-edit-gate,stamp-and-gate,pending-task-sentinel,token-ledger}.sh` (new, generated) | payload | Byte-identical to `scaffold/hosts/claude/.claude/hooks/<name>`, mode 0755, written via `node scripts/build-codex-payload.mjs --write` |
| `scripts/build-codex-payload.mjs` (new) | payload/codegen | `CODEX_HOOK_SCRIPTS`, `planCodexPayload`, `--write`/`--check` CLI, import-safe |
| `package.json` | dependency/scripts | `toml-eslint-parser: ^1.0.3` in `dependencies`; `prebuild` prefixed with `node scripts/build-codex-payload.mjs --check`; `gen:codex` script added |
| `CHANGELOG.md` | doc | `## Unreleased` / `### Added` entry for `--host codex`/`--host all` |
| `scripts/clean-room/evidence.mjs` | pass-A slice of harness | `ARTIFACT_INPUT_PATHS` gains `scripts/build-codex-payload.mjs` (coexistence scenario 10 only; no other harness changes — those are pass B) |

`package-lock.json` was never staged (untracked in this repo, per K3).

## Per-file count table — measured vs "Green after pass A"

| File | Green after pass A (TPV) | Measured (pass/fail/total) | MATCH/MISMATCH |
|---|---|---|---|
| `test/hosts/codex-adapter.red.node.test.ts` | 16 green | 16/0/16 | MATCH |
| `test/init/inject-codex-config.red.node.test.ts` | 22 green | 22/0/22 | MATCH |
| `test/hooks/hook-signal-codex.red.node.test.ts` | 3 green | 3/0/3 | MATCH |
| `test/scaffold/codex-payload.red.node.test.ts` | 14 green | 14/0/14 | MATCH |
| `test/hosts/install-view.red.node.test.ts` | 12 green | 12/0/12 | MATCH |
| `test/commands/init-codex.red.node.test.ts` | 6 green | 6/0/6 | MATCH |
| `test/commands/lifecycle-codex.red.node.test.ts` | 6 green | 6/0/6 | MATCH |
| `test/commands/verify-install-codex.red.node.test.ts` | 9 green | 9/0/9 | MATCH |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` | 2/24 (scenario 10 only) | 2/22/24 | MATCH |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 7/18 (test 35 + 6 anchors) | 7/11/18 | MATCH |
| `test/hooks/normalized-event.red.node.test.ts` | 0/11 | 0/11/11 | MATCH |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 0/67 | 0/67/67 (no hang) | MATCH |
| `test/commands/init.node.test.ts` | 29/31 | 29/2/31 | MATCH — the 2 reds are exactly the two pass-B rendered locks (pre-edit-gate.sh, stamp-and-gate.sh) |
| `test/snapshots/hooks-snapshots.node.test.ts` | 14/15 | 14/1/15 | MATCH — the 1 red is exactly the pass-B token-ledger.sh raw lock |

## Parity result and first failure

Both M2 parity files run with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` in compare mode:

- `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts`: **0/5** — every one of the 5 scenarios fails on the SAME first sanctioned-delta row, `.claude/hooks/pending-task-sentinel.sh` (BUG-085), because `bug085SentinelCurrentHash()` refuses the post-BUG-085 hash `1572281d…ba2c` until pass B's codex branch changes that hook — matching M5-A42 exactly. `captureOrCompare` asserts sanctioned deltas in array order and throws on the first mismatch, so the other 3 (pre-edit-gate.sh, stamp-and-gate.sh, token-ledger.sh) rows are never reached in this run's assertions, but are equally red by the same mechanism (verified independently: canonical hashes for all three still equal their M2 baseline literals — pass A does not touch any of the 4 hooks).
- `test/commands/init-host-parity.red.integration.node.test.ts`: **0/15** — all 15 scenarios fail identically, same first-failing row (`pending-task-sentinel.sh`).

Both match K5's expectation: "the parity files in compare mode red, with the first failure being the pending-task-sentinel row."

## `--check` result and baseline hash

- `node scripts/build-codex-payload.mjs --check` → exit 0 (verified after `--write` populated the 5 generated hook scripts).
- M2 baseline hash, measured with the literal absolute-path recipe from the dispatch:
  `find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`
  → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — unchanged, matches exactly. (First attempt used a relative `find .` from inside the directory and produced a different digest — corrected per flashcard `#test-harness #recipe`; nothing was written into the baseline directory at any point.)

## Witness results

All green, all run solo via `npm run test:file -- <path>`:

- The 22 upgrade/doctor/uninstall/host command files: `doctor-drift-guard` (13), `doctor-membership-banner` (4), `doctor-notifier` (6), `doctor-per-host` (10), `doctor-pricing` (5), `doctor-retired-field` (3), `doctor-session-start` (20), `doctor` (39), `host-cli.red.integration` (3), `uninstall-per-host` (16), `uninstall-reinit` (4), `uninstall` (20), `upgrade-changelog` (7), `upgrade-claude-md` (4), `upgrade-payload-root` (3), `upgrade-per-host` (6), `upgrade-pin-and-prune` (11), `upgrade-preserves-gate-commands` (4), `upgrade-registers-new-files` (4), `upgrade-restart-warning` (4), `upgrade-state-parity` (2), `upgrade` (14), plus `test/hosts/host-lifecycle.red.node.test.ts` (17) as the 22nd file — every one 0 fail.
- `upgrade-per-host.red.node.test.ts`: **6/6**, as required.
- `test/commands/verify-install.red.node.test.ts`: **42/42**.
- `test/scripts/clean-room-evidence.red.node.test.ts`: **60/60**.
- Additional adjacency witnesses (not explicitly named in K5 but touched by my registry/manifest/settings-json-surgery edits): `test/hooks/hook-signal.red.node.test.ts` (14/14), `test/hooks/pending-task-sentinel-cards.red.node.test.ts` (13/13), `test/hosts/host-adapter-contract.red.node.test.ts` (19/19), `test/hosts/host-selection.red.node.test.ts` (11/11), `test/scripts/verify-pack-compat.red.node.test.ts` (7/7), `test/lib/manifest-host-ownership.red.node.test.ts` (18/18, includes the FU-1 re-run — see below), `test/commands/init-host-cli.red.integration.node.test.ts` (4/4), `test/commands/init-host-snapshot.red.node.test.ts` (13/13), `test/commands/init-host-selection.red.node.test.ts` (10/10), `test/scripts/scaffold-relocation.red.node.test.ts` (15/15), `test/scripts/scaffold-relocation.red.integration.node.test.ts` (2/2, 3 pre-existing environment skips — unrelated to -10), `test/scripts/scaffold-layout.red.node.test.ts` (18/18), `test/commands/init-from-source.node.test.ts` (11/11), `test/hosts/manifest-query.red.node.test.ts` (6/6), `test/scripts/build-manifest.node.test.ts` (20/20), `test/lib/settings-json-surgery.node.test.ts` (13/13). No regressions found anywhere.

## FU-1 re-run note (K10)

Re-ran `test/lib/manifest-host-ownership.red.node.test.ts` Scenario 2 ("FU-1: compat excludes non-claude hosts and equals the flat-view builder") after adding the codex `TIER_RULES` rows: still 18/18 green — the new codex-classified entries (`.codex/hooks/*.sh`, `.codex/hooks.json`) are correctly excluded from the `compat` manifest, because `buildMultiRootManifest`'s FU-1 restricts `compat` to `COMPAT_ROOT_KEYS = {core, hosts/claude}` regardless of what `TIER_RULES` classifies — a codex-owned entry's root key (`hosts/codex`) was never in that set before this story and still isn't.

## Deviations from the blueprint

- **`scripts/build-codex-payload.mjs`'s "is this the entry point" check uses `fs.realpathSync` comparison, not a raw `import.meta.url === pathToFileURL(argv[1]).href` compare.** Reason: macOS resolves `/tmp` and `/var` (both used by `os.tmpdir()`-based test fixtures and by the QA-Red test's own scratch-copy recipe) to `/private/tmp`/`/private/var` inside `import.meta.url`, while `process.argv[1]` keeps the unresolved form — the naive URL compare silently never matched there, so `--check`/`--write` invoked as a real subprocess from a tmp-rooted scratch clone always exited 0 without doing anything. Caught by the QA-Red test itself (`test/scaffold/codex-payload.red.node.test.ts`'s "after one byte is flipped..." and "[TPV R-P3] an extra file..." cases), not a silent gap. `orchestrator_confirmed: false` — my own call, matches the existing `physical-path` pattern flashcarded for AD-2/AD-7 elsewhere in this plan.
- No other deviations. The blueprint's exact message strings, TOML edit semantics (verified byte-for-byte against every QA-Red assertion), and file list were followed as specified.

## Flashcards

- 2026-09-26 · #codex #test-harness #danger · macOS `/tmp`→`/private/tmp` symlink breaks a raw `import.meta.url === pathToFileURL(argv[1]).href` "am I the entry point" check; use realpath on both sides.
- 2026-09-26 · #toml #codex · toml-eslint-parser throws ParseError on a reopened `[table]` (dupe-keys) — no separate ambiguity check needed for that case.
- 2026-09-26 · #toml #codex · A `TOMLTable`/`TOMLKeyValue` node's `.range` excludes any trailing newline; range-replace edits must add separators explicitly.
- 2026-09-26 · #test-harness #recipe · Re-confirms 2026-08-27's card: the M2 baseline hash recipe needs the ABSOLUTE path in `find`, not a `cd`+`find .` — the two digests differ.

## Outer `git status --porcelain`

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
Matches expectation exactly — only the 4 ledger files (this report is added by the orchestrator, per the dispatch note).

## Script Incidents

None from my own invocations — every command was a direct `git`/`npm`/`node` call per the dispatch's own recipe, never through `.cleargate/scripts/run_script.sh`. One pre-existing, unrelated incident file (`_off-sprint/.script-incidents/20260926T121631Z-3aa2c1355dbb.json`, dated before this dispatch's work began, referencing `STORY-99-01`/`sprint/S-99`) was already untracked in the cli checkout at session start; left untouched and unstaged.

STATUS=done

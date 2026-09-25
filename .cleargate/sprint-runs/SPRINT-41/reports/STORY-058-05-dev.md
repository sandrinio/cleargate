# STORY-058-05 — Developer

role: developer

**Commit:** cli `story/STORY-058-05` @ `3617c67814e6da4ad237d291137957a9bd93fa68`
("feat(EPIC-058): STORY-058-05 cleargate host list | add | remove"), parent
`156c864` (QA-Red re-seal per TPV R1-R10). Implemented against the TPV
Binding Developer constraints D1-D12 (`reports/STORY-058-05-tpv.md`) and
plans/M3.md §STORY-058-05, T3, T4, M3-A2, M3-A5, M3-A14..A18, M3-A24..A30.

## Files changed

| File | Change |
|---|---|
| `src/hosts/lifecycle.ts` | **new** — `HostHealthRow`, `computeHostHealth`, `isPreservedOnRemoval`, `HostRemovalPlan`, `planHostRemoval`, `executeHostRemoval`, `addHost`, `HostLifecycleError` |
| `src/commands/host.ts` | **new** — `hostListHandler`, `hostAddHandler`, `hostRemoveHandler`, `HostCommandOptions` |
| `src/hosts/types.ts` | `InstallCtx.logPrefix?` + sink-convention/remove()-never-rejects doc comments |
| `src/hosts/claude.ts` | 12 `[cleargate init] ` literals → `${p}` (`p = ctx.logPrefix ?? '[cleargate init] '`); `remove()`'s CLAUDE.md `readFileSync` moved inside its `try` (T4 item 2) |
| `src/cli.ts` | import beside old `:36`; `host` command group (list/add/remove) registered between old `:165`/`:167`, not gated |

Untracked pre-existing `cleargate-0.25.0.tgz` left alone (confirmed still untracked after commit).

## Count table

| Check | Expected (TPV) | Measured |
|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 |
| `test/hosts/host-lifecycle.red.node.test.ts` | 17/17 | 17/17 (first attempt) |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 | 3/3 (first attempt) |
| `host-adapter-contract.red.node.test.ts` | 19/19 | 19/19 |
| `host-selection.red.node.test.ts` | 11/11 | 11/11 |
| `init-host-selection.red.node.test.ts` | 10/10 | 10/10 |
| `init-host-cli.red.integration.node.test.ts` | 4/4 | 4/4 |
| `manifest-host-ownership.red.node.test.ts` | 18/18 | 18/18 |
| `init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 |
| `claude-adapter-init-parity` (compare mode) | 5/5 | 5/5 |
| `init-host-parity` (compare mode) | 15/15 | 15/15 |
| Baseline hash (`/private/tmp/cg-s41-m2-init-baseline`) | unchanged | `bdc4bb1a...` before and after — unchanged |
| `command grep -c "\[cleargate init\] " src/hosts/claude.ts` | 1 | 1 |
| 50-file regression witness sweep | 0 fail | 0 fail (all 50 files, every one solo) |
| `git diff main` on the 6 unchanged files | empty | empty |

No test-run cycle needed a second attempt — both new red files went green on the first implementation, matching the TPV's "Expected counts after re-seal" exactly. Per D11 I did not stash the change to re-verify red-without-implementation: the dispatch's hard rules forbid `git stash`, and QA-Red + TPV already established and reproduced the pre-implementation red baseline (0/17, 0/3) twice each (QA-Red's own report, then the TPV re-seal measurement) — re-deriving that here would only reproduce work already on record.

## Witness NAME diff

All 50 regression-witness files ran solo with 0 failures (full list and per-file
pass/fail counts below). Since every file's fail count is 0, there is no
failing-name set to diff against main `6b5ee5c` — an empty set trivially equals
an empty set.

```
tests 23 pass 23 fail 0  :: test/cli.node.test.ts
tests 39 pass 39 fail 0  :: test/commands/doctor.node.test.ts
tests  7 pass  7 fail 0  :: test/commands/doctor-drift-guard.node.test.ts
tests  4 pass  4 fail 0  :: test/commands/doctor-membership-banner.node.test.ts
tests  6 pass  6 fail 0  :: test/commands/doctor-notifier.node.test.ts
tests  5 pass  5 fail 0  :: test/commands/doctor-pricing.node.test.ts
tests  3 pass  3 fail 0  :: test/commands/doctor-retired-field.red.node.test.ts
tests 20 pass 20 fail 0  :: test/commands/doctor-session-start.node.test.ts
tests 29 pass 29 fail 0  :: test/commands/init.node.test.ts
tests 11 pass 11 fail 0  :: test/commands/init-from-source.node.test.ts
tests  2 pass  2 fail 0  :: test/commands/init-from-source-dist.integration.node.test.ts
tests  5 pass  5 fail 0  :: test/commands/init-gitignore-expansion.node.test.ts
tests  4 pass  4 fail 0  :: test/commands/init-host-cli.red.integration.node.test.ts
tests  1 pass  0 fail 0  :: test/commands/init-host-parity.red.integration.node.test.ts (skipped — CLEARGATE_INIT_BASELINE unset; run separately in compare mode above, 15/15)
tests 10 pass 10 fail 0  :: test/commands/init-host-selection.red.node.test.ts
tests 13 pass 13 fail 0  :: test/commands/init-host-snapshot.red.node.test.ts
tests  2 pass  2 fail 0  :: test/commands/init-no-dep0190.node.test.ts
tests  3 pass  3 fail 0  :: test/commands/init-participant.node.test.ts
tests  3 pass  3 fail 0  :: test/commands/init-restart-banner.node.test.ts
tests  9 pass  9 fail 0  :: test/commands/init-root-gitignore.node.test.ts
tests 20 pass 20 fail 0  :: test/commands/uninstall.node.test.ts
tests 14 pass 14 fail 0  :: test/commands/upgrade.node.test.ts
tests  7 pass  7 fail 0  :: test/commands/upgrade-changelog.node.test.ts
tests  4 pass  4 fail 0  :: test/commands/upgrade-claude-md.red.node.test.ts
tests  3 pass  3 fail 0  :: test/commands/upgrade-payload-root.node.test.ts
tests 11 pass 11 fail 0  :: test/commands/upgrade-pin-and-prune.node.test.ts
tests  4 pass  4 fail 0  :: test/commands/upgrade-preserves-gate-commands.node.test.ts
tests  4 pass  4 fail 0  :: test/commands/upgrade-registers-new-files.node.test.ts
tests  4 pass  4 fail 0  :: test/commands/upgrade-restart-warning.red.node.test.ts
tests  2 pass  2 fail 0  :: test/commands/upgrade-state-parity.red.node.test.ts
tests 15 pass 15 fail 0  :: test/init/claude-md-block-leads.red.node.test.ts
tests  2 pass  2 fail 0  :: test/init/copy-payload-manifest.red.node.test.ts
tests  4 pass  4 fail 0  :: test/init/copy-payload-perms.node.test.ts
tests 14 pass 14 fail 0  :: test/init/init-test-stack-detect.red.node.test.ts
tests 12 pass 12 fail 0  :: test/init/inject-mcp-json.node.test.ts
tests  1 pass  0 fail 0  :: test/hosts/claude-adapter-init-parity.red.integration.node.test.ts (skipped — CLEARGATE_INIT_BASELINE unset; run separately in compare mode above, 5/5)
tests 19 pass 19 fail 0  :: test/hosts/host-adapter-contract.red.node.test.ts
tests 11 pass 11 fail 0  :: test/hosts/host-selection.red.node.test.ts
tests 28 pass 28 fail 0  :: test/lib/claude-md-anchoring.red.node.test.ts
tests 10 pass 10 fail 0  :: test/lib/claude-md-surgery.node.test.ts
tests 18 pass 18 fail 0  :: test/lib/manifest-host-ownership.red.node.test.ts
tests  1 pass  1 fail 0  :: test/lib/manifest-legacy-snapshot.red.integration.node.test.ts
tests 30 pass 30 fail 0  :: test/lib/manifest.node.test.ts
tests 13 pass 13 fail 0  :: test/lib/settings-json-surgery.node.test.ts
tests 20 pass 20 fail 0  :: test/scripts/build-manifest.node.test.ts
tests 18 pass 18 fail 0  :: test/scripts/template-claude-md.node.test.ts
tests  7 pass  7 fail 0  :: test/scripts/verify-pack-compat.red.node.test.ts
tests  3 pass  3 fail 0  :: test/hooks/scaffold-cli-resolution.node.test.ts
tests  2 pass  2 fail 0  :: test/integration/init-pre-member-isolation.node.test.ts
tests  4 pass  4 fail 0  :: test/docs/claude-md-block-leads-relocation.red.node.test.ts
```

`test/cli.node.test.ts` is 23/23 (matches the "unless it spawns dist" caveat — it exercises `src/cli.ts` directly via the tsx-spawn recipe, not `dist/cli.js`, so the new `host` command group is already visible to it and did not need a dist rebuild to show up green).

## Static-check outputs

**`command grep -n "e\.owner\|snapshot\.hosts\|\.hosts\b" src/hosts/lifecycle.ts src/commands/host.ts`:**
```
src/hosts/lifecycle.ts:14: * Never read `e.owner` or `snapshot.hosts` directly — always `entryOwner(e)`
src/hosts/lifecycle.ts:63:    ...hosts.filter((h) => !registryNames.includes(h as HostName)),
```
Two matches, both non-issues:
1. Line 14 is the file's own doc comment *stating* the rule ("Never read `e.owner` or `snapshot.hosts` directly") — prose quoting the forbidden patterns, not a live property read.
2. Line 63 is `...hosts.filter(...)` inside `computeHostHealth`, where `hosts` is the **local** variable `const hosts = installedHosts(snapshot);` (line 58) — never a direct `snapshot.hosts` access. The grep's `\.hosts\b` pattern text-matches the spread operator's third dot immediately abutting the identifier `hosts` (`...hosts` contains the substring `.hosts`), a syntactic coincidence, not a property access. No other match exists in either file — `host.ts` has zero occurrences of either pattern.

**`git diff main --stat -- src/hosts/registry.ts src/lib/manifest.ts src/commands/init.ts src/init/copy-payload.ts src/commands/uninstall.ts src/lib/settings-json-surgery.ts`:** empty (no output).

## New anchors for -07 (M3 T12)

**`src/hosts/lifecycle.ts`** (all exported, per D1):
```
32  export interface HostHealthRow
39  export class HostLifecycleError extends Error
53  export function computeHostHealth(cwd, snapshot, registry)
76  export function isPreservedOnRemoval(entry)
80  export interface HostRemovalPlan
101 export function planHostRemoval(snapshot, host, registry)
205 export async function executeHostRemoval(plan, ctx)
260 export async function addHost(ctx)
```

**`src/commands/host.ts`** (handlers):
```
25  export interface HostCommandOptions
111 export async function hostListHandler(opts?)
133 export async function hostAddHandler(name, opts?)
162 export async function hostRemoveHandler(name, opts?)
```
Private helpers (not exported, for -07 to know they exist but must re-derive/import differently if reused): `resolveOptions` (:41), `readSnapshotOrExit` (:59), `resolveHostPayloadDir` (:87), `resolveAdapterOrExit` (:94).

**`src/cli.ts`** — `host` command group and shifted anchors after the +22-line insertion (file is now 804 lines, was 782):
```
36  import { defaultHostRegistry, HOST_PROFILES, collectHostOption } from './hosts/registry.js';
37  import { hostListHandler, hostAddHandler, hostRemoveHandler } from './commands/host.js';
147 .command('init')
169 const host = program.command('host')...
171   .command('list')
177   .command('add <name>')
183   .command('remove <name>')
190 .command('whoami')          (was :167 pre-insertion)
597 .command('doctor')          (was :~575 pre-insertion, per M3-A6's "after :583" note — verify against -07's own dispatch before trusting this number blind, since -06/-04 merges after -05 could shift it further)
655 .command('uninstall')       (was :~632 pre-insertion)
```
M3-A6 told -07 to add `--host` after doctor's line and after uninstall's line on the anchors recorded *before* -05 landed; those numbers have now shifted by +23 net lines (22 from the host group + 1 from the import). -07 should re-grep `.command('doctor')` / `.command('uninstall')` on its own branch rather than trust a number carried two stories forward.

## Deviations from D1-D12

None. Every D1-D12 constraint, M3-A16/A24/A25/A26/A27/A28/A29 rule, and the T3/T4 sink-convention and log-prefix contract were implemented as specified and passed on the first test run with no rework. The two "extra" grep matches in the static check above are pre-existing textual coincidences (doc prose and a spread-operator dot), not deviations from the ownership-access rule itself.

## Script Incidents

None. Every command run went through `npm run test:file`/`npm run typecheck`/`git`/`command grep`/`shasum`/`find` directly, per the dispatch's own "Verify" section (which specifies these commands literally) — no `.cleargate/scripts/*` script was invoked, so `run_script.sh` wrapping does not apply.

```yaml
flashcards_flagged: []
```

No new flashcard: every surprise this story could have produced (the `readInstallManifest: undefined` fixture trap, the `entryOwner`/`installedHosts` accessor rule, the sink-convention split, the payload-error-exits-2 rule) was already recorded by QA-Red/TPV in the two prior reports (`STORY-058-05-qa-red.md`, `STORY-058-05-tpv.md`) before I started, and the implementation matched those cards exactly with no new lesson surfacing during Dev.

STATUS=done

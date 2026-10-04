# STORY-058-05 — QA-Verify

role: qa

**QA: PASS**

Subject: cli `story/STORY-058-05` @ `3617c67814e6da4ad237d291137957a9bd93fa68`, chain re-seal `156c864` → red `764f063` → cli `main` `6b5ee5c`. Main checkout was read-only throughout (no `npm run build`, no stash/checkout, no writes into `src/`/`test/`, no bare `cleargate`, no full `npm test`). Where the dispatch's real-CLI smoke (e) required a genuinely bundled `dist/` (the real `host add` command path has no `--from-source`/payload-override flag; `resolveDefaultPayloadDir()` only resolves correctly against a bundled `dist/cli.js`), I followed the TPV's own sanctioned pattern: a throwaway scratch clone (`git clone` of the local repo into `/private/tmp/cg-qa-058-05-scratch`, `node_modules` symlinked, `checkout 3617c67`, `npm run prebuild && npm run build`), never touching the main checkout, deleted afterward.

## 1. Sealed-test integrity (D10 / D12)

| Check | Expected | Measured | Result |
|---|---|---|---|
| `git diff 156c864 3617c67 --stat -- test/` | empty | empty | PASS |
| `git diff 156c864 3617c67 --stat` file set | `src/cli.ts`, `src/commands/host.ts`, `src/hosts/claude.ts`, `src/hosts/lifecycle.ts`, `src/hosts/types.ts` | exactly those 5 files, no others | PASS |
| `git diff main --stat` on `registry.ts`, `manifest.ts`, `init.ts`, `copy-payload.ts`, `uninstall.ts`, `settings-json-surgery.ts` | empty | empty | PASS |

## 2. Typecheck

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |

## 3. Solo re-run counts

| File | Expected | Measured |
|---|---|---|
| `test/hosts/host-lifecycle.red.node.test.ts` | 17/17 | 17/17 |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 | 3/3 |
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19/19 | 19/19 |
| `test/hosts/host-selection.red.node.test.ts` | 11/11 | 11/11 |
| `test/commands/init-host-selection.red.node.test.ts` | 10/10 | 10/10 |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 | 4/4 |
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18/18 | 18/18 |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 |
| `claude-adapter-init-parity` (compare mode) | 5/5 | 5/5 |
| `init-host-parity` (compare mode) | 15/15 | 15/15 |
| Baseline hash (`/private/tmp/cg-s41-m2-init-baseline`, 425 files) | `bdc4bb1a...` unchanged | `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` before AND after, 425 files both times |
| Witness spot-check: `uninstall.node.test.ts` | 20/20 | 20/20 |
| Witness spot-check: `upgrade.node.test.ts` | 14/14 | 14/14 |
| Witness spot-check: `settings-json-surgery.node.test.ts` | 13/13 | 13/13 |

All counts match the TPV's "Expected counts after re-seal" exactly.

## 4. Static checks

| Check | Expected | Measured |
|---|---|---|
| `command grep -c "\[cleargate init\] " src/hosts/claude.ts` | 1 | 1 |
| `command grep -n "e\.owner\|snapshot\.hosts" src/hosts/lifecycle.ts src/commands/host.ts` | doc prose only | one hit: `lifecycle.ts:14`, the file's own doc comment stating the rule ("Never read `e.owner` or `snapshot.hosts` directly") — not a live property read. `host.ts`: zero hits. |
| `host` in `GATED_COMMANDS` (`cli.ts:41-`) | not present | confirmed absent; `cli.ts:168` even carries an explicit comment "not in GATED_COMMANDS" |

## 5. D1–D12 conformance (read against `src/hosts/lifecycle.ts`, `src/commands/host.ts`, diffs of `types.ts`/`claude.ts`/`cli.ts`)

| Constraint | Verified against source | Result |
|---|---|---|
| D1 — exact export set + `HostLifecycleError(message, exitCode)`, `name`, `readonly exitCode`; pinned imports | `lifecycle.ts` exports exactly `HostHealthRow`, `HostLifecycleError`, `computeHostHealth`, `isPreservedOnRemoval`, `HostRemovalPlan`, `planHostRemoval`, `executeHostRemoval`, `addHost` — no more, no less. Imports match pinned list verbatim. | PASS |
| D2 — `planHostRemoval` pure, no `fs`; error order not-installed(2) → only-host(1); M3-A16 predicate verbatim | Confirmed: no `fs.*` call inside the function body; `installed.includes(host)` check precedes `installed.length === 1` check; orphan predicate is `!isHostOwned && owner === 'core' && pathUnderRoots(sharedRoots, entry.path) && !stillAdmitted(entry.path)`, using `payloadFilter(registry, nextKnown)` exactly as M3-A16 specifies | PASS |
| D3 — `executeHostRemoval` order: raw-snapshot re-read (M3-A29) → unlink (ENOENT-tolerant, warn+continue on other errors) → prune (M3-A27) → `adapter.remove` with T4-wrapped sinks (`(s) => ctx.stdout(s+'\n')`) → atomic write of `{...raw, files: nextFiles, hosts: nextHosts}` | Order matches exactly; snapshot read is the function's first statement, before any unlink; sink wrapping matches D3 point 4 verbatim; write is last | PASS |
| D4 — `addHost` order: resolve → read raw snapshot → `loadPackageManifest` wrapped (M3-A25, throws `HostLifecycleError(2)` before `copyPayload`) → `copyPayload(force:false, include=owned∪shared, init's verbs)` → `install` with `logPrefix` → merge `files`/`hosts` (`mergeInstalledHosts`) → atomic write preserving other keys | Order and verb strings (`Created`/`Overwritten`/`Skipped (exists)`) match `init.ts`'s own mapping exactly; `loadPackageManifest` call precedes `copyPayload` (the first write), satisfying "nothing written on any error path" | PASS |
| M3-A26 — a preserved orphaned-shared entry goes to `keeps`, still dropped from `nextFiles` | Code: any entry marked `drop` (host-owned or orphaned-shared) that is a surgery target or `isPreservedOnRemoval` goes to `keeps`, not `deletes`; `nextFiles` excludes every `drop`-set entry regardless of `keeps`/`deletes` split. No fixture exercises this branch (TPV noted this too); verified by direct code read as instructed. | PASS (code-read) |
| D5 — `computeHostHealth` row order (core, then installed-in-registry-order, then unknown-installed), counts via `entryOwner`, missing via `existsSync`, `hosts = installedHosts(snapshot)` | Matches exactly | PASS |
| D6 — `host.ts`: `PREFIX`, raw default sinks, `cwd = opts.cwd ?? process.cwd()` (never `CLEARGATE_REPO_ROOT`), default registry `defaultHostRegistry`; handler order snapshot→resolve→operation; `list` healthy path returns without `exit`, unhealthy calls `exit(1)` | Matches exactly, confirmed by source read and by the (c) real-CLI smoke (`host list` exits 0 when healthy) | PASS |
| D7 — `types.ts` doc comments (`logPrefix?`, raw/line-sink distinction, `remove()` never rejects) | Present verbatim in the diff | PASS |
| D8 — `claude.ts` 12 `[cleargate init] ` → `${p}` sites, `remove()`'s `readFileSync` moved inside `try` | Counted 12 converted call sites in the diff; grep count of the literal is 1 (the fallback default string); `readFileSync` now inside the `try` block | PASS |
| D9 — `cli.ts` import placement, group between `init` and `whoami`, not in `GATED_COMMANDS` | Confirmed via diff and grep | PASS |
| D10 — unchanged files, all of `test/` | Confirmed empty diffs (§1 above) | PASS |
| M3-A28 — uniform `[cleargate host] ` prefix, raw default sinks | Confirmed in code and via the real-dist smoke (e): every printed line in the `host add claude` re-run carries the prefix | PASS |
| M3-A29 — raw-snapshot re-read at `executeHostRemoval` entry | Confirmed: `JSON.parse(await readFile(snapshotPath, ...))` is the function's first statement | PASS |

## 6. Real-CLI smokes (tsx, source-only for a–d; scratch-built dist for e per note above)

| Smoke | Expected | Measured | Result |
|---|---|---|---|
| (a) `host --help` | lists `list`/`add`/`remove` | listed exactly those three subcommands | PASS |
| (b) `host add bogus` in empty dir | exit 2, stderr names `cleargate init`, dir stays empty | exit 2; stderr: `[cleargate host] ERROR: no ClearGate install found ... Run: cleargate init`; dir empty after | PASS |
| (c) fresh `init --from-source <CLI>/scaffold --pin 0.0.0-qa` then `host list` | exit 0, `installed: claude`, rows `core`/`claude` | exit 0; `installed: claude`; rows `core files=50 missing=0 healthy=yes`, `claude files=24 missing=0 healthy=yes` | PASS |
| (d) `host remove claude` on that target | exit 1, names `cleargate uninstall`, snapshot byte-unchanged | exit 1; message names `cleargate uninstall` verbatim; snapshot sha256 identical before/after | PASS |
| (e) `host add claude` idempotence | exit 0, `hosts` stays `["claude"]`, `.claude/settings.json` gains no duplicate hook entries | Real `dist/cli.js` built in a throwaway scratch clone (main checkout untouched): exit 0; `hosts` stayed `["claude"]`; `.claude/settings.json` sha256 identical before/after; every printed line carried `[cleargate host] ` and every payload file reported `Skipped (exists)` | PASS |

All fixtures (`/tmp/cg-qa-058-05-{a,b,c,e}.*`, `/private/tmp/cg-qa-058-05-scratch`) were removed afterward with separate literal-path `rm -rf --` calls; the main checkout's `git status`/HEAD are unchanged from before QA started (only the pre-existing untracked `cleargate-0.25.0.tgz`).

**Note on (e)'s method:** the dispatch's tsx recipe for (a)–(d) runs `src/cli.ts` unbundled. `resolveHostPayloadDir`/`resolveDefaultPayloadDir()` (pre-existing, out of this story's diff) computes the package root from `import.meta.url`, assuming the bundled `dist/cli.js` layout (`dirname = dist/`, one level up = package root). Run unbundled from `src/commands/init.ts`, that same arithmetic resolves to `<CLI_ROOT>/src/templates/cleargate-planning` — one directory short of the real templates root — so **any** command hitting the default payload path (including bare `cleargate init` with no flags) fails identically when tsx-run from source; this is confirmed pre-existing and unrelated to STORY-058-05. `host add`/`host remove` have no `--from-source` equivalent (by design — `payloadDir` is a programmatic test seam only), so (e) needed a genuinely bundled binary. Flagged as a flashcard below for future QA dispatches.

## 7. Gherkin + DoD map

| §2.1 Gherkin scenario | Covered by |
|---|---|
| Add is additive and leaves other hosts untouched | `host-lifecycle.red` Scenario 1 (+ 1b) |
| Add is idempotent | `host-lifecycle.red` Scenario 2 |
| Remove preserves everything it does not own | `host-lifecycle.red` Scenario 3 (+ 3b, the safety-property unit) |
| Shared assets survive while another consumer remains | `host-lifecycle.red` Scenario 4 |
| Removing the last host is refused | `host-lifecycle.red` Scenario 5 |
| List reports the installed set | `host-lifecycle.red` Scenario 6 |

6 of 6 Gherkin scenarios have matching, passing tests — all sealed red files that were failing at baseline (0/17, 0/3, per QA-Red/TPV) and are now green against this commit (CR-081 red-now-green; no separate green-path duplicate was required or written).

**DoD §4.2 "remove is proven to delete only manifest-owned entries, asserted directly on ownership rather than via tree diff":** met by Scenario 3b, a pure `planHostRemoval` unit test over a synthetic snapshot with `owner != path` in both directions (`claude-owned-outside-roots.md` is claude-owned but outside `.claude/`; `.claude/core-owned-inside-root.md` is core-owned despite living under `.claude/`) — this proves selection is by `entryOwner`, not location, exactly per the DoD wording and per flashcard `2026-09-26 · #test-harness #host #manifest`.

**§4.1 minimum test expectations:** unit ≥5 (12 describe blocks present), integration ≥2 (3 present: scenarios 9, 10a, 10b), E2E ≥1 (scenario 11 present) — all exceeded.

**Task Breakdown (advisory, EPIC-054 WS7):** the story file's `## Task Breakdown` rows are still `- [ ]` unchecked in the current pending-sync copy, even though the M3 plan's "amendment D5" supersedes them and every superseding item was completed and verified above. Advisory only — not a bounce criterion.

## 8. Flashcard grep

Grepped `.cleargate/FLASHCARD.md` for `#qa #host #manifest` before starting — the relevant cards (owner!=path fixture rule, entryOwner/installedHosts accessor discipline, sink-convention split, resolveDefaultPayloadDir dist-vs-src resolution) were already applied by QA-Red/TPV/Dev and verified above.

## Verdict

`deferred_verification` is `[]` in the story frontmatter — no deferred-acceptance gate applies (verdict step a is a no-op). All Gherkin scenarios are covered by passing tests, including red-now-green coverage (verdict step b) — no deviations found across sealed-test integrity, typecheck, targeted/witness re-runs, static checks, D1–D12 conformance, real-CLI smokes, or the Gherkin/DoD map.

**VERDICT:** Ship it. STORY-058-05 does exactly what D1–D12 and the M3 blueprint (as amended by M3-A24..A30) specify; every measured count reproduces the TPV's expected counts precisely; the safety property (ownership-not-path deletion) is asserted directly per the DoD; no regression in the 50-witness class (3 spot-checked here, all green) or in M2 parity (5/5, 15/15, baseline hash unchanged). No fix requested.

```yaml
flashcards_flagged:
  - "2026-09-26 · #qa #test-harness #tsx · resolveDefaultPayloadDir() assumes bundled dist/; a tsx-unbundled src smoke of bare init/host add needs a scratch dist build, not --from-source."
```

STATUS=done

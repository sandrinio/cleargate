# STORY-058-07 QA-Verify Report
role: qa

**STORY: STORY-058-07** — Per-host scoping of doctor, upgrade, uninstall, and prune (SPRINT-41 M3, wave10, cli-only)

**Subject:** cli `story/STORY-058-07` @ `b146faf` (Dev commit), parent `fe11c1d` (qa-red re-seal per TPV R1–R10), parent `23e8280` (qa-red original), cut from cli `main` @ `170ac4c`. Independent re-run, read-only against the main checkout: no build, no stash, no branch switch, no bare `cleargate`, no full `npm test`.

## QA: PASS

## 1. Sealed-test integrity

| Check | Command | Result |
|---|---|---|
| Dev touched no test file | `git diff fe11c1d b146faf --stat -- test/` | empty — OK |
| Dev diff is `src/` only | `git diff fe11c1d b146faf --stat` | 10 files, all under `src/`: `cli.ts`, `commands/{doctor,uninstall,upgrade}.ts`, `hosts/{claude,manifest-query(new),types}.ts`, `init/merge-settings.ts`, `lib/{manifest,settings-json-surgery}.ts` — matches the story's Related/New Files list exactly |
| E11 — untouched-file guard | `git diff main -- src/hosts/lifecycle.ts src/commands/host.ts src/lib/session-load-delta.ts src/lib/drift-check.ts src/hosts/registry.ts` | empty — OK |

## 2. Typecheck

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 (clean `tsc --noEmit`) |

## 3. Test re-run — SOLO, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` on every run, no capture flag

Baseline hash (425 files): `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — identical before and after every run below.

| File | Expected | Reproduced | Match |
|---|---|---|---|
| `test/hosts/manifest-query.red.node.test.ts` | 6/6 | 6/6 | yes |
| `test/commands/doctor-per-host.red.node.test.ts` | 10/10 | 10/10 | yes |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 | 6/6 | yes |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 | 16/16 | yes |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3/3 | 3/3 | yes |
| `test/hosts/host-adapter-contract.red.node.test.ts` (sealed -03, R10) | 19/19 | 19/19 | yes |
| `test/hosts/host-selection.red.node.test.ts` | 11/11 | 11/11 | yes |
| `test/commands/init-host-selection.red.node.test.ts` | 10/10 | 10/10 | yes |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 | 4/4 | yes |
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18/18 | 18/18 | yes |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 | yes |
| `test/hosts/host-lifecycle.red.node.test.ts` | 17/17 | 17/17 | yes |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 | 3/3 | yes |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare) | 5/5 | 5/5 | yes |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare) | 15/15 | 15/15 | yes |

Recorded `user-content` `.claude/settings.json` sha256 confirmed unchanged from Dev/TPV: `123d7bc742e7c7fadab80e2949db5cbe8b140884178ac74fc4cab47ad81109c7`.

Spot-checked 4 regression witnesses, all green: `uninstall.node` 20/20, `upgrade.node` 14/14, `upgrade-claude-md.red.node` 4/4 (unmodified, byte-identical names), `doctor.node` 39/39.

No mismatch anywhere. Every count reproduces the TPV report's "Expected counts after re-seal" table exactly.

## 4. Static checks

| Check | Command | Result |
|---|---|---|
| No hardcoded surgery literals in `claude.ts` | `command grep -n "CLEARGATE:START\|mcpServers" src/hosts/claude.ts` | no match — E1 satisfied |
| `.owner` reads in doctor/upgrade/uninstall | `command grep -an "\.owner\b" src/commands/{doctor,upgrade,uninstall}.ts` | exactly one hit: `doctor.ts:436`, `(entry as Partial<DriftMapEntry>).owner ?? entryOwner(entry.entry)` — the one sanctioned defensive cache read (M3-A33); every write site uses `entryOwner(<snapshot entry> ?? <package entry>)` |
| `isClearGateCommand` exported, 7-hook alternation | `command grep -n "isClearGateCommand\|token-ledger\|..." src/lib/settings-json-surgery.ts` | exported (was private); regex widened to `token-ledger\|stamp-and-gate\|session-start\|wiki-ingest\|pre-edit-gate\|pre-tool-use-task\|pending-task-sentinel\|pre-tool-use-autonomy\|cleargate-[^/]*` — all 7 shipped hooks present |
| No `CLEARGATE_META_ROOT` added | `command grep -rn "CLEARGATE_META_ROOT" src/` | no match |

## 5. E1–E13 conformance (diff read against TPV binding constraints)

Read the full `fe11c1d..b146faf` diff for every touched file against M3-A6/A20/A33/A36–A43 and the TPV's E1–E13.

| Constraint | File | Verified |
|---|---|---|
| E1/M3-A38 — `mergeSurgeryTarget` moved verbatim, `[skip]` built from imported `CLEARGATE_START` | `claude.ts` | yes — byte-identical logic, no raw `CLEARGATE:START`/`mcpServers` literal, `supersedeHookCommands` wired as 7th `ClaudeAdapterDeps` key, applied before `mergeSettings`, `existingSettings` never reassigned |
| E2/M3-A36 — `--host` narrows only at emit, cache always full | `doctor.ts` | yes — `driftMap`/`.drift-state.json` always built over the full `selectEntriesForHosts(pkg, installed, registry)`; `emitSummary(map, verbose, stdout, owners, host)` filters `entries` internally and computes top line + hint + owner lines + verbose lines all over the filtered set when `host` is given |
| E3/M3-A33 — `runCheckScaffold` order | `doctor.ts` | yes — `loadInstallSnapshot` → `installedHosts` → `--host` validation (stdout + `configError`, before cache) → owners list → cache/compute; the non-check-scaffold `--host` guard sits in `doctorHandler` right after `selectMode` (stderr + exit 2) |
| E4 — owner-line format and placement | `doctor.ts` | yes — `` `  ${owner}: ${um} user-modified, ${uc} upstream-changed, ${bc} both-changed, ${clean} clean` ``, after the `Run cleargate upgrade to review.` line (or top line), before verbose lines |
| E5/E8/M3-A20 — `owner: entryOwner(...)` at both `DriftMapEntry` sites, never `e.owner` | `doctor.ts`, `upgrade.ts` | yes — both construction sites use `entryOwner(snapEntry ?? entry)`; `DriftMapEntry.owner` is a required field (typecheck confirms) |
| E6 — `installedHosts(snapshot)` including null | `doctor.ts`, `upgrade.ts`, `uninstall.ts` | yes — all three call `installedHosts(installSnapshot)`/`installedHosts(snapshot)` even for a null/legacy snapshot |
| E7/M3-A42 — hint placement, restart blocks per adapter | `upgrade.ts` | yes — hint prints once, immediately after `[upgrade] complete.`, before the pruned/kept-modified/restart lines; one restart block per installed adapter in registry order, first-declaring-adapter-wins for shared paths; claude-only output byte-identical to pre-07 (confirmed by unmodified `upgrade-restart-warning.red.node` 4/4) |
| E9/M3-A31/A32 — uninstall partial path order, gates, preview, dry-run, sink adapter | `uninstall.ts` | yes — resolve → last-host test → `planHostRemoval` → dirty-tree gate over `deletes ∪ keeps` → CLAUDE.md gate iff `h==='claude'` → tier-override gate (exit 2) → preview → dry-run/confirm → `executeHostRemoval` with `s.replace(/\n$/, '')` sink adapter and `logPrefix: 'cleargate uninstall: '` |
| E10 — full uninstall path | `uninstall.ts` | yes — marker pre-validation gated on `installed.includes('claude')`; classify loop skips `surgeryTargetPaths` (union of installed adapters' `surgeryTargets()`); the two inline CLAUDE.md/settings.json surgery blocks are replaced by `adapter.remove({cwd, stdout, stderr})` per installed adapter in registry order with byte-identical removed-path labels; `shouldPreserve` rule 3.5 added after the tier overrides and the user-artifact default |
| E11 | (§1 above) | empty diff confirmed |
| E12/M3-A6 — `cli.ts` options | `cli.ts` | yes — `--host <name>` added to `doctor` and `uninstall`, no `collectHostOption`, single value each |
| E13 — Dev touches no test file | (§1 above) | confirmed |
| Deviation — `confirmTypedName` shared helper | `uninstall.ts` | verified: byte-identical prompt text and seam (`opts.promptName`) between the extracted helper and the pre-058-07 inline block, by diff read and by `uninstall.node.test.ts` 20/20 unmodified plus every new partial-path test passing |

## 6. Real-CLI smokes via tsx (source, no `dist`)

Every writing command run as one `(cd <literal tmp> && …)` call; each scratch dir deleted afterward with a literal `rm -rf --`.

| # | Smoke | Result |
|---|---|---|
| a | `doctor --help` / `uninstall --help` list `--host` | both confirmed |
| b | Fresh claude-only install (tmpA, `init --yes --from-source <scaffold> --pin 0.0.0-qa`) → `doctor --check-scaffold` | exit 0; stdout = top line + exactly `  core: 0 user-modified, 1 upstream-changed, 0 both-changed, 48 clean` + `  claude: 0 user-modified, 0 upstream-changed, 0 both-changed, 24 clean` (the one pre-existing `gate-checks.json` core drift, per flashcard 2026-09-25 `#doctor #drift`) |
| b | `doctor --check-scaffold --host nope` | exit 2: `cleargate doctor: host "nope" is not installed (installed: claude)` |
| b | `doctor --host claude` (no `--check-scaffold`) | exit 2: `cleargate doctor: --host applies only to --check-scaffold` |
| c | tmpA: `uninstall --dry-run --yes` | exit 0; tree listing before/after identical (diff empty); `.claude/settings.json` absent from both `[remove]` and `[keep]` buckets entirely (surgery target, E10) |
| d | tmpB: real `uninstall --yes` (full path) | exit 0; `.claude/settings.json` survives holding only the injected user hook (`my-own-hook.sh`) — none of the 7 canonical commands remain; `.cleargate/.uninstalled` marker written with full `removed`/`preserved` lists |
| d | tmpB2 (seeded CLAUDE.md prose) → init → `uninstall --yes` | CLAUDE.md after uninstall = exactly the pre-existing prose (`# My Own Project Notes\n\nThis is user prose that must survive.`), block fully stripped, no `CLEARGATE:START`/`END` remaining |
| e | tmpC (claude-only): `uninstall --host claude --dry-run --yes` | exit 0; behaves as the full path (identical `[remove]`/`[keep]` buckets to the no-`--host` dry-run); no disk change |
| e | tmpC: `uninstall --host bogus` | exit 2: `cleargate uninstall: Unknown host "bogus". Valid hosts: claude.` |
| f | tmpC: `upgrade --dry-run` | exit 0; no `[upgrade] hint:` line anywhere in output (production/claude-only registry, Rule 2) |

Outer `git status --porcelain` and cli `git status --porcelain` were unchanged (only hook-owned ledger files) before and after every smoke — no meta-repo or main-checkout write occurred (Mid-Sprint Amendments SMOKE RULE honored).

## 7. Gherkin + DoD map

| §2.1 Scenario | Covered by |
|---|---|
| Doctor reports each adapter independently | `doctor-per-host` Scenario 2 (unit) + smoke 6b (live) |
| Upgrade never implicitly adds a host | `upgrade-per-host` Scenarios 6/7 (unit; R1 re-seal fixed the unsatisfiable `CLAUDE.md`-sanity assertion) |
| Legacy snapshot upgrades as a Claude install | `upgrade-per-host` Scenario 7 (unit, real 0.10.0 fixture) + `lifecycle-per-host` Scenario 16 (integration, E2E) |
| Drift is attributed to the owning host | `doctor-per-host` Scenario 3 (Gherkin 4) |
| Uninstalling one host preserves the others | `uninstall-per-host` Scenario 11 (Gherkin 5) + `lifecycle-per-host` Scenario 17 (byte-for-byte tree diff) |

DoD §4.1 minimums: unit ≥6 (36 delivered across the four new unit files), integration ≥2 (3 delivered in `lifecycle-per-host`), E2E ≥1 (Scenario 18, `--host all` → all-clean). All exceeded.

DoD §4.2: every doctor test injects an `exit` seam (confirmed: `doctorHandler(` called 10+1 times across `doctor-per-host`/`lifecycle-per-host`, each paired with `makeExitCapture`). The shared-helper/no-split box was already ticked by the Architect (`selectEntriesForHosts`, M3 plan §Order) and is correct — the four command paths do share one manifest-query helper.

**BUG-089 carry-forward 2** covered by `uninstall-per-host` Scenario 15's re-sealed 15a/15c/15d (drop-only semantics, cross-matcher non-touch, non-force-install end-to-end supersede, and a same-first-token non-ClearGate command surviving).

**Settings.json wholesale-deletion bug fix** witnessed by `uninstall-per-host` line 108's test title ("claudeAdapter.remove is called once; settings.json/CLAUDE.md surgery targets are never deleted wholesale") and independently confirmed live by smoke 6c/6d (`.claude/settings.json` never appears in the classify buckets, and survives full uninstall with only user content).

**Advisory (EPIC-054 WS7):** the story's `## Task Breakdown` section has all 7 rows unchecked in the file. Per the Dev report, this was an explicit orchestrator instruction for this dispatch ("don't tick the Task Breakdown"). Every row's substance is independently verified complete above (QA-Red scenarios 1–18 exist and pass; `selectEntriesForHosts` shipped; doctor/upgrade/uninstall per-host behavior shipped; `isClearGateCommand`/`supersedeHookCommands` shipped; legacy path verified, typecheck/witnesses/parity all green). Advisory only — not a bounce reason.

## VERDICT

Ship it. Sealed-test integrity is clean (Dev touched no test file, no unrelated `src/` surface, E11's untouched-file list is empty). Typecheck is clean. Every one of the 15 listed test files reproduces its TPV-expected count exactly, with zero mismatches, against an unchanged 425-file baseline hash. All four static-check greps come back exactly as specified (one sanctioned `.owner` read, no hardcoded surgery literals, 7-hook `isClearGateCommand` alternation, no `CLEARGATE_META_ROOT`). A full diff read confirms every binding TPV constraint (E1–E13, M3-A6/A20/A33/A36–A43) is implemented as specified, including the subtle "narrow only at emit, never the cache" doctor rule and the per-adapter upgrade restart/hint placement. Ten live CLI smokes across four independent clean-room installs (tmpA/B/B2/C) all matched expected exit codes and byte-level output, including the two behaviors most likely to regress silently: `.claude/settings.json` is never wholesale-deleted before its surgery runs (BUG fixed, confirmed live), and CLAUDE.md's user prose outside the bounded block survives a full uninstall. No regressions found in 20 spot-run/full-run witness files. All five Gherkin scenarios and both DoD minimums map cleanly to passing tests. The only finding is advisory (unchecked Task Breakdown boxes, explicitly directed by this dispatch) and does not affect the verdict.

flashcards_flagged: []

STATUS=done

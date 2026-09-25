# STORY-058-07 — Architect Post-Flight
role: architect

ARCH: FAIL — the uninstall → re-init restore path now installs 2 of the 7 Claude hooks; main installs all 7.
- A full uninstall now leaves `.claude/settings.json` behind as `{}` (blueprint (b), plan gap).
- The uninstall's own "Run cleargate init … to restore" re-init skips that existing file. It merges only `CLAUDE_HOOK_ADDITION` into it.
- That is a Claude-observable regression (Rule 2), measured.
- The fix is M3-A44: remove an emptied settings file in `claude.remove()`, plus 4 reds, a whitespace revert and a CHANGELOG entry.
- The Dev commit itself conforms to every binding constraint (E1–E13, M3-A36..A43). The bounce is attributable to the plan, not to Dev conformance.

## Subject

- **Branch:** cli `story/STORY-058-07` @ `b146faf` (Dev), on re-seal `fe11c1d` → QA-Red `23e8280` → main `170ac4c`.
- **Change size:** `git diff --stat fe11c1d b146faf` covers 10 `src` files (+553/−140) and no test file (E13).
- **How I inspected it:** `git show` / `diff` only. The main checkout stays on `story/STORY-058-07`, with status `?? cleargate-0.25.0.tgz` only (pre-existing), before and after.
- **Probes:** two `tsx` probes wrote only under `scratchpad/arch07/`, each run as one `(cd <literal dir> && …)` call.
  - One ran against the `b146faf` source.
  - One ran against a `git archive` of `170ac4c`, with `node_modules` symlinked.
- **Not duplicated:** QA-Verify's suite and count re-runs.

## Conformance

| Constraint | Verdict | Evidence (`b146faf`) |
|---|---|---|
| E1 / M3-A38: no `CLEARGATE:START` / `mcpServers` literal in `claude.ts`; verbatim move | pass | `command grep -c` → 0. `mergeSurgeryTarget` (`claude.ts:237-291`) is the `upgrade.ts` take-theirs body with `stderr` → `io.stderr`, returns in place of assignments, helpers through `d.*`, and the `[skip]` text built from `CLEARGATE_START`. |
| E2 / M3-A36: narrow at emit only; the cache stays full | pass | `runCheckScaffold` builds and writes the map over `selectEntriesForHosts` (`doctor.ts:383`, `:416`). `emitSummary` filters by `owner ?? entryOwner(entry)` (`:435-439`). |
| E3 / M3-A33: snapshot → installed → `--host` check → owners → cache → compute; guard after `selectMode` | pass | `:357-373`. Guard at `:1095-1099`. |
| E4: owner-line format and placement | pass | `:457-469`: after the upgrade hint, before the verbose lines. |
| E5: `owner: entryOwner(snap ?? pkg)` at both sites, no cast | pass | `doctor.ts:408`, `upgrade.ts:796`. The one cast is the sanctioned defensive read of a legacy cache entry. |
| E6: `installedHosts` in all three commands; `known` in registry order | pass | `upgrade.ts:493-497`, `doctor.ts:358`/`:370`, and `uninstall.ts` (`installed`, `knownInstalledHosts`). |
| E7 / M3-A42: hint once after `complete.`; one restart block per adapter; first adapter wins | pass | `upgrade.ts:900`, `:720-726`, `:917-935`. |
| E8: `supersedeHookCommands` | pass | Deep clone; `null` → `null`; same event and same matcher only; the three drop conditions; guards a non-string `command`; `hooks: []` kept. 7th deps key. `existingSettings` never reassigned. |
| E9 / M3-A31/A32: uninstall partial path | pass | Order resolve → last-host test → plan → dirty gate over `deletes ∪ keeps` → `CLAUDE.md` gate iff claude → override gate (exit 2) → preview → dry-run buckets → confirmation → `executeHostRemoval` with the `s.replace(/\n$/, '')` sink adapter. Returns with no marker. |
| E10: full uninstall | pass | Pre-validation iff claude is installed. Classify skips installed adapters' surgery targets. `adapter.remove()` runs in registry order. Rule 3.5 comes after the user-artifact rule. Unused imports dropped. |
| E11: `lifecycle.ts`, `host.ts`, `session-load-delta.ts`, `drift-check.ts`, `registry.ts` untouched | pass | Empty `git diff --stat main b146faf -- …`. |
| E12: one-name `--host` options at the as-built anchors | pass | `cli.ts:606`, `:665`. |
| E13: the Dev commit touches no test | pass | Only `src/**`. |
| M3-A37 (scenario 13 falls through) / M3-A39 (R10 by QA-Red) / M3-A43 | pass | `isLastHost` falls through to the full path. R10 is in `fe11c1d`, not the Dev commit. |

**Deviation ruling: `confirmTypedName` (`uninstall.ts`). SANCTIONED.**
- It is a pure extraction of the typed-name prompt. The prompt text, the `opts.promptName` seam and the `name mismatch — aborting` handling stay at the call site.
- It is shared by the two paths that M3-A32 says use the same confirmation.
- Reuse-first, and it causes no byte change: the unmodified `uninstall.node.test.ts` runs 20/20.
- QA-Verify and DevOps do not flag it.
- The Dev's `shouldPreserve` "nuance" is E10 verbatim, so there is nothing to rule on. `preserve_on_uninstall` is true only for `.cleargate/FLASHCARD.md` (a user-artifact tier) in both the dist manifest and the meta-repo snapshot, so rule 3.5 is a no-op for every production Claude install.

**One stray edit, fixed by M3-A44 D2.** `merge-settings.ts:92`, inside the supposedly unchanged `mergeSettings`, was re-indented from 8 to 4 spaces. It has no behavioural effect.

## Design quality

1. **Is `selectEntriesForHosts` the single manifest query? For doctor, upgrade and prune: yes.** Uninstall uses equivalent logic.
   - Call sites: `doctor.ts:383`, `upgrade.ts:550` (selection) and `upgrade.ts:633` (prune candidates). The prune's "still shipped" set is also the selected set (`:630`).
   - Uninstall does not call it:
     - The partial path uses -05's `planHostRemoval`. That is set-equivalent to `selected(installed) \ selected(next)`, minus surgery targets and preserved entries. I checked this per ownership class: host-owned, orphaned shared core, undeclared core and unregistered owner.
     - The full path intentionally takes every snapshot entry.
   - The story's split criterion holds: doctor+drift share one helper, and upgrade+prune+uninstall share the ownership model. The equivalence rests on two implementations, so FU-6 adds a property test.
   - The story's Task Breakdown wording "shared by doctor, upgrade, uninstall and prune" overstates it for uninstall.
2. **Rule 2: are Claude-only outputs byte-identical except for the sanctioned additions? Yes for init, doctor and upgrade. No for the uninstall → re-init path.**
   - **init:** only the T2 `user-content` delta. The recorded hash is `123d7bc7…`, and parity is 5/5 and 15/15 per the Dev report.
   - **doctor:** default mode and `--session-start` bodies are byte-unchanged. `--check-scaffold` adds exactly the two owner lines, and its top line counts the same set, because under the production registry `selected` = all compat entries.
   - **upgrade, claude-only:**
     - Selection and prune are identical.
     - Surgery routing: the only manifest path among `CLAUDE.md`, `settings.json` and `.mcp.json` is `.claude/settings.json` (the dist manifest has 74 entries), so exact-path routing equals the old basename match.
     - The restart block is identical: the unmodified `upgrade-restart-warning.red` passes 4/4.
     - The hint is silent under the production registry.
   - **uninstall:** see finding 3.
3. **The uninstall settings.json fix is correct for user hooks, but leaves a residue that breaks re-init. This is the FAIL.**
   - With user hooks, the file correctly survives with only user hooks. The widened predicate recognizes all 7.
   - Without user hooks, it survives as `{}`.
   - The measured probe (full table in M3-A44):

     | Tree | After re-init |
     |---|---|
     | main `170ac4c` | 7/7 hooks |
     | `b146faf` | 2/7 hooks: no SessionStart banner, no flashcard gate or dispatch sentinel, no token-ledger, no autonomy guard |

   - It also changes, for every existing user:
     - The preview count drops by 1.
     - `--dry-run` no longer lists `.claude/settings.json`.
     - The marker's `removed` list carries labels instead of the path.
     - `--remove <tier>` can no longer delete a settings file that holds user hooks.
   - These need a CHANGELOG note (M3-A44 D3; there is none at `b146faf`).
   - The root cause is pre-existing: `init` into any existing `.claude/settings.json` merges only `CLAUDE_HOOK_ADDITION` (2 of 7 hooks). The M2 `user-content` baseline itself records it. -07 made it reachable on the default path. FU-3 files the root cause separately.
4. **Legacy owner-less snapshots are handled.**
   - The meta-repo's real snapshot is 0.10.0: 65 entries, no `owner`, no `hosts`, and `.claude/settings.json` present.
   - `installedHosts` → `['claude']`, and `entryOwner` attributes by path. Doctor then adds `core`/`claude` lines. Upgrade never writes `hosts` (7a/16). A pre-07 `.drift-state.json` is read defensively (4b-1).
   - There is no `.drift-state.json` in `OUTER` today, but the M3 DevOps smoke 1 would create one. It is not gitignored, so the smoke is replaced (M3-A45).
5. **The `HostAdapter` contract grew by three required members** (`types.ts:77-90`). `createHostRegistry` does not validate them (sealed fakes stay valid), and `tsc` enforces them for `src/**` adapters. For -10 (M3-A51):
   - `isClearGateCommand` is anchored on `/.claude/hooks/` and matches no codex command, so AD-4's `removeClearGateHooks` would strip nothing from `.codex/hooks.json`. The regex must widen.
   - `supersedeHookCommands`' first-token key would be the `R="$(git` prelude for every codex command. Do not reuse it as is.
   - Codex `remove()` must mirror M3-A44.
   - `AGENTS.md`, like `CLAUDE.md`, never reaches `mergeSurgeryTarget` from a production upgrade (`INTENTIONALLY_UNTRACKED`).

## Forward risks

- **BUG-085.**
  - `doctor.ts` stacking is clean: -07 left the bodies of `runHookHealth` (`:163-288`) and `runSessionStart` (`:586`) byte-unchanged.
  - Three binding amendments come from re-measurement (M3-A46..A48, below). The only forced anchor corrections are the CLAUDE.md grep key and the doctor-drift-guard range.
- **-08 / -09.**
  - V5/V6 are resolved.
  - Check 4 inherits `selectEntriesForHosts`' rule that an installed-but-unregistered host's entries are never selected, so check 3 (`manifest-hosts`) owns that failure. This is consistent.
  - -08's CHANGELOG edit appends to the `### Added` section that M3-A44 creates.
  - -09's fresh rooms never hit the M3-A44 or FU-3 paths.
- **-10.**
  - M3-A51 is binding (see finding 5).
  - AD-5 stays binding before codex registers. -07's scoped prune protects only unregistered or uninstalled hosts. A registered, installed codex entry missing from the compat manifest is pruned (`upgrade.ts:630-633`).
- **-12.** M3-A48 changes the hook quirk that the JS flashcard-gate port must replicate (AD-M6-5 quirk 1). The orchestrator mirrors the change into M6.

## Binding amendments before BUG-085's QA-Red seals

All are in `plans/M3.md` §"As-built resolution after STORY-058-07":
- **M3-A46.** The `ClearGate drift:` line goes after the CR-009 resolver line (line 3, not line 2).
  - Why: six `doctor-session-start` assertions pin `out[1]` = `cleargate CLI:`.
  - Scenario 12 is reworded to match.
- **M3-A47.** doctor-drift-guard re-roots all 7 cases, because they share builders.
  - The 3 dist-spawning cases are red against a pre-BUG-085 `dist` by construction. Dev and QA use a story-branch or scratch build (rule 11). DevOps names the file in the post-BD witnesses.
- **M3-A48.** The sentinel read loop becomes `while IFS= read -r line || [[ -n "${line}" ]]`.
  - Why: this avoids a false fail-closed on a final `]` with no newline, and a silently ungated final list card.
  - New hook test 17b.
- **M3-A49.** The CLAUDE.md grep key `DEPRECATED, frozen` is corrected to `deprecated, frozen` (`:121`).
  - F1–F3 are applied and correct.
  - F4 (optional) fixes two stale BUG §4 citations.
- **M3-A50.** Constraints: BUG-085 leaves the -07 regions and the `--host` guard untouched, and `checkCanonicalDrift` never reads the manifest.
  - RS-BUG085 steps 7–8 are read-only for OUTER (measured).

## FU routing

| FU | Finding | Target | Severity |
|---|---|---|---|
| FU-1 | M3-A44: emptied `.claude/settings.json` residue (D1), the `mergeSettings` whitespace revert (D2), CHANGELOG (D3), reds R11a–d, story amendment E8 | -07 re-dispatch (this FAIL) | binding |
| FU-2 | M3-A45: DevOps smoke 1 writes `.drift-state.json` into OUTER (SMOKE RULE); replace it; add the uninstall → re-init smoke 3 | -07 DevOps | binding |
| FU-3 | `init` into any existing `.claude/settings.json` wires only `CLAUDE_HOOK_ADDITION` (2 of 7 hooks). Pre-existing, and recorded in the M2 `user-content` baseline. Every Claude Code repo with project settings gets no SessionStart banner, flashcard gate, dispatch attribution or autonomy guard. The fix changes the T2 row's `currentHash` (a new strict row). | New BUG, filed now; the orchestrator schedules it (recommended: after BUG-085 if a slot frees, else next sprint) | P1, pre-existing |
| FU-4 | Upgrade take-theirs for settings.json (`claude.ts` `mergeSurgeryTarget`, moved verbatim) spreads `theirs.hooks` per event, so user hooks under any event ClearGate also uses are dropped on `upgrade --yes`. Fix: `mergeSettings(removeClearGateHooks(ours), theirs)`, M5 AD-4's form. | New BUG, close follow-up | P2, pre-existing |
| FU-5 | A full uninstall deletes an installed-but-unregistered host's tracked files, including its surgery targets, wholesale. It should refuse with exit 2, as verify-install's `<host>.no-verifier` does. | Close follow-up (reachable only by unpublished builds between -07 and -10) | low |
| FU-6 | `planHostRemoval` re-derives selection. Add a property test that `deletes ∪ surgery-keeps ∪ preserved-keeps` = `selected(installed) \ selected(next)`, or re-express it through `selectEntriesForHosts`. | Close follow-up (EPIC-043 hygiene) | low |
| FU-7 | `.drift-state.json` is not keyed by host set. After `host add/remove`, a `--session-start-mode` replay within 24 h prints a stale owner set. `addHost` / `executeHostRemoval` should delete the file. | Close follow-up (optional in -10) | low |
| FU-8 | M3-A51: the codex predicate widening, the census guard, no first-token supersede, an emptied `.codex/hooks.json` removed on `remove()` | -10 | binding |
| FU-9 | M3-A48 → M6 AD-M6-5: quirk 1 dropped; the parity fixture expects the final no-newline card to be gated; the port covers BUG-085's JSON mode | M6 / -12 (the orchestrator mirrors it) | binding |
| FU-10 | -08 appends to -07's `### Added` CHANGELOG section instead of creating a second one | -08 (M4 mirror) | binding |

## Adjacent Implementations row (final, for `sprint-context.md` after -07 merges with M3-A44)

| Story | Module / Export | Path |
|-------|----------------|------|
| STORY-058-07 | **`selectEntriesForHosts(entries, hosts, registry = defaultHostRegistry)`**: the one manifest query (`hosts ∩ registry.names()`; `payloadFilter` AND an owner check; legacy entries by path; an unregistered owner is never selected). Used by doctor `--check-scaffold`, upgrade selection and upgrade prune.<br>• **`HostAdapter.displayName` / `sessionLoadedPaths()` / `mergeSurgeryTarget(relPath, ours, theirs, { stderr })`** are **required**; `null` means leave the file unchanged. Claude: `'Claude Code'`, `['.claude/settings.json', '.mcp.json']`, the `CLAUDE.md` block and settings hook merge moved from upgrade.<br>• **`supersedeHookCommands(existing, addition)`**: drops same-event, same-matcher, same-first-token stale ClearGate variants; never adds; the 7th `ClaudeAdapterDeps` key. Keyed on the first token, so not reusable for codex commands.<br>• **`isClearGateCommand`** is exported and covers the 7 shipped hooks. It matches `/.claude/hooks/` only; codex needs M3-A51.<br>• **`DriftMapEntry.owner`** is required; read cached entries as `e.owner ?? entryOwner(e.entry)`.<br>• `DoctorFlags.host`, `DoctorCliOptions.hostRegistry`, `UpgradeCliOptions.hostRegistry`, `UninstallOptions.host` / `hostRegistry`.<br>• `doctor --check-scaffold --host <h>` narrows at emit only. `uninstall --host <h>` is -05's pair with a line→raw sink adapter; the last host is a full uninstall.<br>• A full uninstall runs every installed adapter's `remove()`. Claude `remove()` deletes an emptied `.claude/settings.json` (M3-A44).<br>• Test helper: P2/P3 payloads, R2/R3 registries, complete fakes. | `cleargate-cli/src/hosts/manifest-query.ts`, `src/hosts/types.ts`, `src/hosts/claude.ts`, `src/init/merge-settings.ts`, `src/lib/settings-json-surgery.ts`, `src/lib/manifest.ts`, `src/commands/{doctor,upgrade,uninstall}.ts`, `src/cli.ts`, `test/helpers/host-fixtures.ts` |

## Plan append

`plans/M3.md` now ends with §"As-built resolution after STORY-058-07", written before this report. It holds:
- M3-A44: the remediation spec (D1–D3, R11a–d, E8, route)
- M3-A45: the DevOps smoke corrections
- the T11 anchor tables: `doctor.ts`, `drift-check.ts`, `pending-task-sentinel.sh`, `manifest-builder.ts` TIER_RULES, `init-fixture.ts` SANCTIONED rows with re-measured baseline literals, `canonical-live-parity` Scenario 4, doctor-drift-guard, outer bug068, and the CLAUDE.md keys
- M3-A46..A50 (BUG-085)
- M4 V5/V6, for the orchestrator to mirror into M4
- the -08 CHANGELOG coordination note
- M3-A51 (-10 forward; resolves M5 T-M5-2)
- the tag status table

Nothing earlier in the file was touched.

## Outer `git status --porcelain`

At the start of this dispatch:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

At the end, before this report was written, the list was the same plus ` M .cleargate/sprint-runs/SPRINT-41/plans/M3.md` (this dispatch's append-only amendment). This report (`??`) is the only other path written. The cli checkout is unchanged: still `story/STORY-058-07` @ `b146faf`, `?? cleargate-0.25.0.tgz`.

## Script incidents

None. No `.cleargate/scripts/*` script was invoked. The version check does not apply, because no dependency is added or pinned.

## Flashcards

```yaml
flashcards_flagged:
  - "2026-09-26 · #uninstall #init #settings-json #danger · An emptied .claude/settings.json left by uninstall makes re-init merge only CLAUDE_HOOK_ADDITION: 2 of 7 hooks."
  - "2026-09-26 · #init #settings-json #danger · init into an existing .claude/settings.json wires only CLAUDE_HOOK_ADDITION (2 of 7); SessionStart etc never land."
  - "2026-09-26 · #upgrade #settings-json #danger · upgrade take-theirs spreads theirs.hooks per event: user hooks under any ClearGate event are dropped."
  - "2026-09-26 · #codex #settings-json · isClearGateCommand matches /.claude/hooks/ only; codex commands (/.codex/hooks/, R=\"$(git prelude) never match."
  - "2026-09-26 · #doctor #smoke #danger · doctor --check-scaffold writes .cleargate/.drift-state.json (not gitignored here); never smoke it with --cwd OUTER."
  - "2026-09-26 · #hooks #flashcard-gate · A fail-closed parser under 'while read -r' misses an unterminated last line; use '|| [[ -n $line ]]' (BUG-085)."
  - "2026-09-26 · #doctor #session-start · runSessionStart line 2 is the resolver line (6 tests pin out[1]); add new lines after it, not after the banner."
```

STATUS=done

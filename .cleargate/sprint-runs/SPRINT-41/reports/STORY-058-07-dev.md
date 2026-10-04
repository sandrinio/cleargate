role: developer

# STORY-058-07 Dev Report

**SHA:** `b146faf` on `story/STORY-058-07` (cli repo `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`), parent `fe11c1d` (qa-red re-seal), cut from cli `main` @ `170ac4c`.

## Files changed

- `src/hosts/manifest-query.ts` — **new**. `selectEntriesForHosts(entries, hosts, registry = defaultHostRegistry)`: `known = hosts ∩ registry.names()`; keeps an entry iff `payloadFilter(registry, known)(e.path)` **and** (`entryOwner(e) === 'core'` or `known.includes(entryOwner(e))`). The second clause is load-bearing — `payloadFilter` alone returns `true` (fallthrough) for a path under no root this registry knows about, which would wrongly admit an entry owned by an unregistered host.
- `src/hosts/types.ts` — `HostAdapter` gains `displayName: string`, `sessionLoadedPaths(): readonly string[]`, `mergeSurgeryTarget(relPath, ours, theirs, io): string | null`. All three **required** (no `?`).
- `src/hosts/claude.ts` — the three new members (`'Claude Code'`, `['.claude/settings.json', '.mcp.json']`, and `mergeSurgeryTarget` moved verbatim from `upgrade.ts`'s take-theirs branch, per M3-A38 building the `[skip]` text from the imported `CLEARGATE_START` constant); `supersedeHookCommands` as the 7th `ClaudeAdapterDeps` key, applied in `install()` immediately before `mergeSettings` (`existingSettings` itself never reassigned).
- `src/init/merge-settings.ts` — `supersedeHookCommands(existing, addition)`: deep-clones, `null → null`, drops a same-matcher inner hook whose first whitespace token equals the addition's and whose full command differs and which `isClearGateCommand` recognizes; never adds, never mutates.
- `src/lib/settings-json-surgery.ts` — `isClearGateCommand` exported (was private), alternation widened to the 7 shipped hooks (`token-ledger|stamp-and-gate|session-start|wiki-ingest|pre-edit-gate|pre-tool-use-task|pending-task-sentinel|pre-tool-use-autonomy|cleargate-[^/]*`); doc list updated.
- `src/lib/manifest.ts` — `DriftMapEntry.owner: ManifestOwner` (required — a construction site that omits it now fails `npm run typecheck`, per M3-A33's design intent).
- `src/commands/doctor.ts` — `DoctorFlags.host?`, `DoctorCliOptions.hostRegistry?`; the `--host` + non-check-scaffold guard in `doctorHandler` right after `selectMode`; `runCheckScaffold` now orders `loadInstallSnapshot → installedHosts → --host validation (stdout + configError, before any cache read) → owners list → cache/compute over selectEntriesForHosts`; `emitSummary(map, verbose, stdout, owners, host?)` narrows every output (top line, hint line, owner lines, verbose lines) at emit time only — the written `.drift-state.json` and the cache branch always hold the full selected set (M3-A36); each `DriftMapEntry` gets `owner: entryOwner(snapEntry ?? entry)`; a cached (legacy) entry is read as `(entry as Partial<DriftMapEntry>).owner ?? entryOwner(entry.entry)`.
- `src/commands/upgrade.ts` — `UpgradeCliOptions.hostRegistry?`; `installed`/`known`/`installedAdapters` computed right after the snapshot load; `filteredFiles` and the prune candidate/target sets both go through `selectEntriesForHosts`; `isClaudeMd`/`isSettingsJson` deleted; the take-theirs branch of `applyMerge3Way` (new `installedAdapters` parameter) routes through `adapter.mergeSurgeryTarget`, `null` → `{ updated: false, newSha: null }`; `SESSION_LOAD_PATHS` is the union of every installed adapter's `sessionLoadedPaths()` with first-adapter-wins ownership; one restart block per installed adapter in registry order; the host-add hint prints once immediately after `[upgrade] complete.`; the second `DriftMapEntry` literal gets `owner`.
- `src/commands/uninstall.ts` — `UninstallOptions.host?`/`hostRegistry?`; a new `--host` partial path right after the snapshot load, in the order registry.resolve → last-host test (falls through to the full path) → `planHostRemoval` → dirty-tree gate (scoped to `[...plan.deletes, ...plan.keeps]`) → CLAUDE.md marker gate (only when `host === 'claude'`) → tier-override gate (exit 2) → preview/dry-run/confirmation → `executeHostRemoval` with a raw→line sink adapter (`s.replace(/\n$/, '')`); full path: the CLAUDE.md marker pre-validation now gates on `installed.includes('claude')`, the classify loop skips every path under any installed adapter's `surgeryTargets()`, and the two inline CLAUDE.md/settings.json surgery blocks are replaced by `adapter.remove({cwd, stdout, stderr})` per installed adapter in registry order (fixes a pre-existing bug: `.claude/settings.json` — tier `cli-config` — was deleted wholesale by the generic removal loop before its surgery ever ran); `shouldPreserve` gains the `preserve_on_uninstall` rule; a new `confirmTypedName` helper shares the typed-confirmation prompt between the two paths (byte-identical prompt/output).
- `src/cli.ts` — `--host <name>` added to `doctor` and `uninstall` (no `collectHostOption`; single value; `opts.host` threaded straight through).

## Count table (solo, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` on every run)

| File | Expected | Actual |
|---|---|---|
| `test/hosts/manifest-query.red.node.test.ts` | 6/6 | 6/6 |
| `test/commands/doctor-per-host.red.node.test.ts` | 10/10 | 10/10 |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 | 6/6 |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 | 16/16 |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3/3 | 3/3 |
| `host-adapter-contract.red.node.test.ts` (sealed, R10) | 19/19 | 19/19 |
| `host-selection.red.node.test.ts` | 11 | 11/11 |
| `init-host-selection.red.node.test.ts` | 10 | 10/10 |
| `init-host-cli.red.integration.node.test.ts` | 4 | 4/4 |
| `manifest-host-ownership.red.node.test.ts` | 18 | 18/18 |
| `init-host-snapshot.red.node.test.ts` | 13 | 13/13 |
| `host-lifecycle.red.node.test.ts` | 17 | 17/17 |
| `host-cli.red.integration.node.test.ts` | 3 | 3/3 |
| `claude-adapter-init-parity.red.integration.node.test.ts` (compare) | 5/5 | 5/5 |
| `init-host-parity.red.integration.node.test.ts` (compare) | 15/15 | 15/15 |

Recorded `user-content` `.claude/settings.json` sha256 (compare mode, via the parity pass): `123d7bc742e7c7fadab80e2949db5cbe8b140884178ac74fc4cab47ad81109c7` — matches the report's expected value exactly.

Regression witnesses (all 20 from the TPV list run; no mismatch): `doctor-drift-guard.node` 7/7, `doctor-membership-banner.node` 4/4, `doctor-notifier.node` 6/6, `doctor-pricing.node` 5/5, `doctor-retired-field.red.node` 3/3, `doctor-session-start.node` 20/20, `doctor.node` 39/39, `uninstall.node` 20/20, `upgrade-changelog.node` 7/7, `upgrade-claude-md.red.node` 4/4 (unmodified, byte-identical test names), `upgrade-payload-root.node` 3/3, `upgrade-pin-and-prune.node` 11/11, `upgrade-preserves-gate-commands.node` 4/4, `upgrade-registers-new-files.node` 4/4, `upgrade-restart-warning.red.node` 4/4, `upgrade-state-parity.red.node` 2/2, `upgrade.node` 14/14, `lib/settings-json-surgery.node` 13/13, `lib/manifest.node` 30/30, `commands/init.node` 29/29.

## Witness NAME diff

No diff — every regression-witness file's test names and pass counts are unchanged from the TPV's sealed-vs-conformant baseline (all "empty" fail-name diffs reproduced). `doctor-drift-guard` and `doctor-retired-field` ran against the pre-existing `dist/` (built 2026-09-26 01:21, predating this Dev commit) per the dispatch's note — DevOps rebuilds `dist` from `main` at BD.

## Static-check outputs

- `command grep -n "CLEARGATE:START\|mcpServers" src/hosts/claude.ts` → **no match** (exit 1). E1 satisfied.
- `command grep -an "e\.owner" src/commands/doctor.ts src/commands/upgrade.ts src/commands/uninstall.ts` → **no match**. Broader `command grep -an "\.owner\b"` across those three files finds exactly one hit: `doctor.ts:436`, `(entry as Partial<DriftMapEntry>).owner ?? entryOwner(entry.entry)` — the one sanctioned defensive READ of a possibly-legacy cached entry, always falling back through `entryOwner`. Every WRITE site (`doctor.ts`, `upgrade.ts`) constructs `owner: entryOwner(<snapshot entry> ?? <package entry>)`.
- `git diff main -- src/hosts/lifecycle.ts src/commands/host.ts src/lib/session-load-delta.ts src/lib/drift-check.ts src/hosts/registry.ts` → **empty** (0 lines). E11 satisfied.
- Baseline integrity, before and after every run: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files) — unchanged.

## Outer status

Before: `M .cleargate/sprint-runs/SPRINT-41/{.session-totals.json,events.jsonl,state.json,token-ledger.jsonl}` plus a hook-owned `.pending-task-*.json` sentinel.
After: identical four `M` lines (sentinel churned/removed, hook-owned). No other outer path touched; nothing under `.cleargate/delivery/**` or `cleargate-planning/**` was written by this dispatch.

## New anchors (for BUG-085 → M3 T11, M4 V5–V6)

- `src/commands/doctor.ts` (1142 lines): `runHookHealth`'s drift block (`checkCanonicalDrift`, `grep -a`) is now `:275-287` (was `:267-279` on `a821d40`); `runSessionStart` is now `:586` (was `:526`).
- `selectEntriesForHosts` — `src/hosts/manifest-query.ts:25`.
- `src/cli.ts`: `.command('doctor')` `:597`, `.command('upgrade')` `:637`, `.command('uninstall')` `:657`.
- `HostAdapter` new members — `src/hosts/types.ts`: `displayName` `:78`, `sessionLoadedPaths` `:84`, `mergeSurgeryTarget` `:90` (for -10's codex adapter).

## Deviations from E1–E13

None substantive. One reading nuance on `shouldPreserve`'s rule ordering: the TPV E10 text places rule 3.5 (`preserve_on_uninstall`) after BOTH the tier overrides AND the user-artifact default (not merely after the overrides, as the story's own §1.2 phrasing alone would suggest) — implemented in that exact order. Since every rule here is an independent "return true if this condition holds, else fall through" branch, the position of 3.5 relative to the user-artifact check has no observable effect on any input (verified against scenario 12c and by inspection), so this was never a behavioral gap, only a documentation-order correction applied for exactness.

## Notes

Implemented `confirmTypedName` as one shared helper for the typed-project-name confirmation prompt, used by both the `--host` partial path and the pre-existing full-uninstall path, instead of duplicating the ~15-line inline block. Output bytes and seam usage (`opts.promptName`) are identical to the pre-058-07 inline version — verified by the unmodified `test/commands/uninstall.node.test.ts` (20/20) and the new partial-path tests. This is a code-organization choice, not a behavior change; flagged as a plan deviation since it wasn't named in the blueprint, though it does not touch any binding constraint text and every dependent test passed unmodified.

No Task Breakdown rows were ticked in the story file, per this dispatch's explicit "don't edit the outer meta-repo except your report, and don't tick the Task Breakdown" instruction — this appears to conflict with the general Developer contract's box-ticking mandate; deferred to the orchestrator's explicit override for this dispatch.

r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }
  - { r_id: "R2", covered: true, deferred: false, clarified: false }
  - { r_id: "R3", covered: true, deferred: false, clarified: false }
  - { r_id: "R4", covered: true, deferred: false, clarified: false }
  - { r_id: "R5", covered: true, deferred: false, clarified: false }
plan_deviations:
  - { what: "confirmTypedName extracted as a shared helper for the typed-confirmation prompt (used by both the --host partial path and the full-uninstall path) instead of duplicating the inline block", why: "avoids ~15 lines of duplicated interactive-prompt logic; byte-identical output and seam contract, verified by the unmodified uninstall.node.test.ts (20/20) plus every new partial-path test", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/src/commands/host.ts"
  - "cleargate-cli/src/hosts/lifecycle.ts"
  - "cleargate-cli/src/commands/init.ts"
  - "cleargate-cli/test/helpers/host-fixtures.ts"
flashcards_flagged:
  - "2026-09-26 · #manifest #host · selectEntriesForHosts needs payloadFilter AND an owner check — payloadFilter alone admits an unregistered host's entry (fallthrough true)."
  - "2026-09-26 · #manifest #doctor #upgrade · A required (non-optional) DriftMapEntry.owner turns a missed construction-site omission into a typecheck failure, not a silent runtime gap."

## Remediation (M3-A44)

**SHA:** `384a628` on `story/STORY-058-07` (parent `4394c9b`, the QA-Red R11 commit, on Dev `b146faf`).

**Files:** `CHANGELOG.md`, `src/hosts/claude.ts`, `src/init/merge-settings.ts` — exactly the three named in the TPV delta round's binding constraint 4. No other file touched.

### `git diff --stat 4394c9b HEAD`

```
 CHANGELOG.md               | 16 ++++++++++++++++
 src/hosts/claude.ts        | 17 ++++++++++++++---
 src/init/merge-settings.ts |  2 +-
 3 files changed, 31 insertions(+), 4 deletions(-)
```

### The gap and the fix

`claude.ts`'s `remove()` always wrote the settings surgery's remainder back, so a fresh (no-user-hooks) install left `.claude/settings.json` as `{}\n` after a full uninstall instead of removing it. Because `copy-payload.ts` skips an existing file on a non-force `init`, the uninstall's own restore hint then only merged `CLAUDE_HOOK_ADDITION` (2 hooks) into that `{}` instead of installing the full canonical 7-hook file. D1 makes `remove()` unlink the file when `removeClearGateHooks` empties it entirely (nothing user-authored left); a file that still holds a user key or hook survives, labeled as before. D2 is a pure whitespace fix to `mergeSettings` (the STORY-058-07 Dev commit had accidentally re-indented one match-arm literal from 8 to 4 spaces during the `supersedeHookCommands` insertion — a lesson in always diffing an insertion-only change against the pre-story baseline, not just running the tests, since the wrong indentation was cosmetically harmless to every test in the suite). D3 adds the three verbatim CHANGELOG entries.

### Count table (solo, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`)

| File | Expected | Actual |
|---|---|---|
| `test/commands/uninstall-reinit.red.node.test.ts` (R11) | 4/4 | 4/4 |
| `test/hosts/manifest-query.red.node.test.ts` | 6/6 | 6/6 |
| `test/commands/doctor-per-host.red.node.test.ts` | 10/10 | 10/10 |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 | 6/6 |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 | 16/16 |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3/3 | 3/3 |
| `host-adapter-contract.red.node.test.ts` | 19/19 | 19/19 |
| `claude-adapter-init-parity.red.integration.node.test.ts` (compare) | 5/5 | 5/5 |
| `init-host-parity.red.integration.node.test.ts` (compare) | 15/15 | 15/15 |
| `uninstall.node.test.ts` | 20/20 | 20/20 |
| `host-lifecycle.red.node.test.ts` | 17/17 | 17/17 |
| `host-cli.red.integration.node.test.ts` | 3/3 | 3/3 |
| `lib/settings-json-surgery.node.test.ts` | 13/13 | 13/13 |
| `commands/init.node.test.ts` | 29/29 | 29/29 |
| `changelog-format.node.test.ts` | green | 5/5 green (ran against the pre-existing on-disk `dist/`, built before this dispatch; not rebuilt here, per Rule 11) |
| `lib/changelog-slice.node.test.ts` | 14/14 | 14/14 |
| `upgrade-changelog.node.test.ts` | 7/7 | 7/7 |

`npm run typecheck` → exit 0, before and after.

### D2 numstat

```
$ git diff 170ac4c --numstat -- src/init/merge-settings.ts
55	0	src/init/merge-settings.ts
```

Insertion-only, as the binding constraint requires — `mergeSettings` itself is byte-identical to `170ac4c`, only the `isClearGateCommand` import and the new `supersedeHookCommands` export were added.

### `claude.ts` hunk — the unlink inside the `try`

```diff
-    // Surgery: settings.json — remove ClearGate hooks only
+    // Surgery: settings.json — remove ClearGate hooks only. STORY-058-07
+    // M3-A44: when stripping ClearGate's hooks empties the object entirely
+    // (nothing user-authored remains), delete the file instead of writing
+    // back "{}" — a leftover "{}" survives copy-payload.ts's non-force
+    // skip-if-exists rule, so a restoring `cleargate init` would only MERGE
+    // CLAUDE_HOOK_ADDITION (2 hooks) into it instead of installing the full
+    // canonical file.
     const settingsPath = path.join(cwd, '.claude', 'settings.json');
     if (fs.existsSync(settingsPath)) {
       try {
         const raw = fs.readFileSync(settingsPath, 'utf8');
         const settings = JSON.parse(raw) as ClaudeSettings;
         const cleaned = d.removeClearGateHooks(settings);
-        writeAtomic(settingsPath, JSON.stringify(cleaned, null, 2) + '\n');
-        removed.push('.claude/settings.json (ClearGate hooks)');
+        if (Object.keys(cleaned).length === 0) {
+          fs.unlinkSync(settingsPath);
+          removed.push('.claude/settings.json');
+        } else {
+          writeAtomic(settingsPath, JSON.stringify(cleaned, null, 2) + '\n');
+          removed.push('.claude/settings.json (ClearGate hooks)');
+        }
       } catch (err) {
         stderr(`Warning: could not update settings.json: ${(err as Error).message}`);
       }
```

`fs.unlinkSync` sits lexically inside the existing `try`, after `removeClearGateHooks` and before the `catch` — the `catch`'s `Warning: could not update settings.json: …` string is unchanged and now also covers an `unlinkSync` failure, per binding constraint 1.

### Baseline / outer status

Baseline hash before and after: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files) — unchanged. Outer `git status --porcelain` before and after this dispatch: only the four hook-owned `.cleargate/sprint-runs/SPRINT-41/{.session-totals.json,events.jsonl,state.json,token-ledger.jsonl}` lines, plus this report file (`??`, untracked, not committed). Cli repo: `?? cleargate-0.25.0.tgz` (pre-existing, untouched) both before and after; no `dist/` build was run.

### Deviations

None. All three files match the binding constraint's file list exactly; D1/D2/D3 applied verbatim per M3-A44.

flashcards_flagged:
  - "2026-09-26 · #test-harness #git · A whitespace-only slip inside an Edit tool's matched span is invisible to a green test suite — diff an insertion-only change against the pre-story baseline (git diff <base> --numstat), not just the tests."

STATUS=done

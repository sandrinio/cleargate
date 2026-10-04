# STORY-058-05 — Architect post-flight

role: architect

ARCH: PASS

`3617c67` conforms to TPV D1–D12, M3-A24..A30 and the T3/T4 contract, with no deviations. The ownership gate, write-nothing error paths and `logPrefix` neutrality all hold. -05's API fits -07's `uninstall --host`, provided -07 adapts two sinks and makes four decisions that the -07 blueprint never took. Those are binding amendments M3-A31..A33, which the orchestrator applies before -07's QA-Red seals.

**Reviewed:**
- cli `story/STORY-058-05` @ `3617c67` (the Dev commit), on re-seal `156c864`, on sealed `764f063`, on main `6b5ee5c`. I read it through `git show`/`git diff` only; nothing in the main checkout was built, stashed or checked out.
- `plans/M3.md`: the -05/-07 blueprints, T3/T4, M3-A1..A30, E1–E6, and the tag list.
- The -05 story file.
- The reports `STORY-058-05-{qa-red,tpv,dev}.md`.
- `plans/M4.md` V4–V6, and `plans/M5.md` AD-5 and T-M5-1/2.

QA-Verify's re-runs are not duplicated here.

**Plan output.** I appended `## As-built resolution after STORY-058-05` to `plans/M3.md` (line 2039). It carries T12, the -07 anchor tables, M3-A31..A35, the E1/E5 corrections plus a new E7, M4 V4, and the tag status.

## Conformance

| Constraint | Result | Evidence at `3617c67` |
|---|---|---|
| D1 exports and imports | Pass | 8 exports (`lifecycle.ts:32,39,53,76,80,101,205,260`); the helpers are private. The import set is exact (`:20-30`). No `e.owner` or `snapshot.hosts` read in either file. `host.ts` reads only `snapshot.pin_version`, which is allowed. |
| D2 `planHostRemoval` | Pass | Pure (no `fs`). The checks run not-installed (2) `:104`, then only-host (1) `:107`, then `resolve` `:114`, with the messages verbatim. M3-A16 is verbatim (`:116-117`, `:131-132`). M3-A26 (`:136-140`). `nextFiles` keeps its order (`:143`). |
| D3 `executeHostRemoval` | Pass | The raw read comes before the first unlink (`:215-216`). `ENOENT` is ignored; any other error warns and continues (`:224-231`). Prune (`:234`). The wrapped line sinks (`:239-243`) are the last stderr writer. `{ ...raw, files, hosts }` is written atomically (`:245-246`). |
| D4 `addHost` | Pass | Steps 1–7 run in order. M3-A25 `:275-282` runs before `copyPayload` `:287`. Init's verbs are byte-equal (`init.ts:403-411`). `mergeInstalledHosts` `:318`. |
| D5 `computeHostHealth` | Pass | Row order is core, then registry, then unknown hosts (`:60-64`). Counts use `entryOwner`. |
| D6 `host.ts` | Pass | `PREFIX`, raw default sinks, `cwd = opts.cwd ?? process.cwd()`. The order is snapshot → `resolve` → operation. An unparseable snapshot exits 2. The healthy `list` returns without calling `exit`. The pin is `opts.pin ?? snapshot.pin_version ?? 'latest'`. |
| D7 `types.ts` | Pass | `logPrefix?` `:33`; the sink-convention and never-rejects docs are at `:22-25`, `:38-42` and `:71-75`. |
| D8 `claude.ts` | Pass | 12 `${p}` sites. `command grep -c "\[cleargate init\] "` → `1`. `readFileSync` moved into the `try` (`:197`). |
| D9 `cli.ts` | Pass | Import `:37`; group `:168-187`, with the blueprint descriptions verbatim; not in `GATED_COMMANDS` (`:41-53`). |
| D10 files unchanged | Pass | `git diff main 3617c67 -- src/commands/init.ts src/hosts/registry.ts src/lib src/init src/commands/uninstall.ts test/helpers` is empty. |
| D11 / D12 sealed files | Pass | The Dev commit touches no test. The sha256s of both red files at `3617c67` equal TPV's (`171e2cdc…`, `4911ac5f…`). |
| M3-A24 / A30 | Pass | The re-seal was applied verbatim. The Dev counts of 17/17 and 3/3 reproduce TPV's expected counts. |
| M3-A25..A29 | Pass | Rows D2–D4 and D6 above. M3-A27 is exact (`pruneEmptyDirs` `:160-181`: only visited directories, deepest first, `rmdirSync` only when empty). |

## Design quality

1. **The `lifecycle.ts` API fits -07's `uninstall --host`, with one adapter and four decisions the -07 blueprint lacked.** The pair `planHostRemoval(snapshot, h, registry)` / `executeHostRemoval(plan, { cwd: target, adapter, … })` covers the blueprint's "partial" path as written: `[remove]`/`[keep]` from `plan.deletes`/`plan.keeps`, no marker, and the snapshot rewritten by `executeHostRemoval`.
   - **Gap 1, sinks.** `executeHostRemoval`'s ctx sinks are raw; uninstall's are line sinks (`uninstall.ts:256-257`). Passing uninstall's sinks straight in double-spaces every line. **M3-A31** binds a `s.replace(/\n$/, '')` adapter and `logPrefix: 'cleargate uninstall: '`, and adds test 11b.
   - **Gap 2, unspecified gates.** The blueprint said nothing about the partial path's uncommitted-changes check, CLAUDE.md markers, `--preserve`/`--remove`, the preview line, or dry-run buckets. **M3-A32** decides each one and adds tests 11c and 11d.
   - `lifecycle.ts` needs no change. E5's "last host is a full uninstall" is decided before `planHostRemoval`, so its exit-1 message is unreachable from uninstall.
2. **Removal is safe on legacy owner-less snapshots.** I ran `planHostRemoval` read-only over the committed real 0.10.0 fixture (sha `fa0c79ac…`, byte-equal to OUTER's live snapshot; 65 entries, no `owner`, no `hosts`), with a fake codex registered.
   - As-is, `remove claude` → `HostLifecycleError` exit 1 (last host).
   - With codex entries added (`hosts: [claude, codex]`), `remove claude` deletes exactly the 20 owner-less `.claude/**` entries. `.claude/settings.json` goes to `keeps` as a surgery target. No core entry is touched; `nextFiles` is 46 = 65 − 21 + 2.
   - `remove codex` deletes only the codex entry and the orphaned `.agents` entry, and leaves all 65 legacy entries.
   - Scenario 3b pins the owner-over-path rule directly. In the meta-repo, pruning cannot remove `.claude/hooks/` or `.claude/`: live-only files (not in the snapshot) and the kept `settings.json` keep them non-empty.
3. **`resolveHostPayloadDir` is a single site.** It is defined once (`host.ts:89-91`) and called once (`:146`, an argument expression inside `hostAddHandler`'s `try`). `lifecycle.ts` takes `payloadDir` and never resolves one. This fits M3-A4 / M5 AD-5.
   - -10 must hoist the call to dispose the view in `finally`.
   - -10 must map `InstallViewError` and adapter `preflight` errors to `HostLifecycleError(2)`, because `host.ts` rethrows anything else as a crash.
   - Both are **M3-A35**, which also resolves M5 T-M5-1.
4. **Error paths write nothing.**
   - `list` is read-only.
   - `add`:
     - A missing or unparseable snapshot, or an unknown host, exits 2 before any read of the payload.
     - A missing `payloadDir`, missing `MANIFEST.json` or unparseable `MANIFEST.json` → `HostLifecycleError(2)` before `copyPayload`. `loadPackageManifest` throws when the file is absent (`manifest.ts:177-181`); 7d pins it.
   - `remove`:
     - The same three handler checks.
     - Not-installed and last-host come from a pure throw.
     - `executeHostRemoval` re-reads the raw snapshot before its first unlink.
   - The one residual case is a snapshot or package manifest that parses but has the wrong shape (`null`, `{}`, `files` not an array): `readSnapshotOrExit` returns `null` → silent exit 0, or `raw.files`/`pkg.files` throws after the copy. It is not reachable from any ClearGate writer. FU-7.
5. **`logPrefix` is byte-neutral, proven two ways.**
   - **Static proof.**
     - Each of the 12 sites is an exact substring swap of `[cleargate init] ` for `${p}` (`git diff 156c864 3617c67 -- src/hosts/claude.ts`).
     - `p` defaults to the identical literal.
     - `init.ts` is unchanged against main, and its `installCtx` (`:441`) carries no `logPrefix`. So every init path prints `'[cleargate init] ' + rest`, the same bytes as before.
     - The `remove()` edit changes behaviour only when `readFileSync` throws: a rejection becomes a warning. `uninstall` does not call `claudeAdapter.remove` yet.
   - **Dynamic proof** (recorded; not re-run here, QA-Verify owns it):
     - Parity compare mode is 5/5 and 15/15 at QA-Red, at TPV (conformant build) and at Dev (`3617c67`). The baseline digest `bdc4bb1a…` is unchanged throughout.
     - TPV mutant M10a (a changed default) takes parity to 0/5 and 0/15, which shows parity is sensitive to it.
     - Scenario 12 pins the non-default path (M10b/M10c).

## Findings (non-blocking)

- **F1 — `host remove` is silent on success.** `executeHostRemoval` returns its labels, but `hostRemoveHandler` (`:170-172`) prints none. This conforms to the blueprint and D6, which specify no remove output; it is poor UX for the epic's only destructive command. FU-6.
- **F2 — `host remove` has no dry-run and no uncommitted-changes gate.** `uninstall` has both (`uninstall.ts:313-323`, `:367-389`). `host remove` also deletes a user-edited file, or a user file adopted at a payload path by an earlier non-force install, because its entry is host-owned. That matches uninstall's framework-tier deletion, and `uninstall --host` (-07) gets the gate through M3-A32. FU-6.
- **F3 — a non-`ENOENT` unlink failure drops the entry from the snapshot anyway** (D3 as specified). The file stays on disk untracked. FU-8.
- **F4 — re-adding an installed host rebases skipped files' snapshot sha to the payload sha.** `lifecycle.ts:313-318` does this, exactly as non-force `init` Step 7 does (`init.ts:601-610`). Drift then reports an out-of-date file as `user-modified`. This is pre-existing semantics. FU-9.
- **F5 — the Dev report's anchors are slightly off.** It says the `cli.ts` shift is "+23"; it is +22 (`.command('doctor')` `:575` → `:597`). Its `host.ts` private-helper lines are off by 2–5. The Dev's `.command('doctor')`/`.command('uninstall')` numbers themselves are correct. M3 T12 records the measured values.
- **F6 — `doctor.ts` carries raw NUL bytes** (`:887`, `:889`, the pre-existing `globMatch` placeholder). Plain `grep` returns `Binary file matches`, so -07 and BUG-085 grep keys need `-a`. This is M3-A34, plus a flashcard.

## Forward risks and binding amendments

**Before -07's QA-Red seals (binding).** The orchestrator applies E1–E6 plus the corrections in the M3 section:
- the E1 Related-Files and bullet additions
- the E5 append
- the new E7 (Existing Surfaces `upgrade.ts:208` → `:248-257`/`:397-452`/`:743`, and `uninstall.ts:325` → `:325-342`/`:434-457`)

Then **M3-A31** (sink adapter + `logPrefix`, test 11b), **M3-A32** (partial-path gates and output, tests 11c/11d) and **M3-A33** bind. M3-A33 means:
- `--host` is validated before the drift cache
- `DriftMapEntry.owner` is set at **both** `doctor.ts:373-379` and `upgrade.ts:806-812`, or typecheck fails
- `emitSummary` reads `e.owner ?? entryOwner(e.entry)` for pre-(-07) caches
- test 4b

**Other forward risks:**
- **-07:**
  - `claude.ts` supersede now goes above `:104` (T4 item 4, re-anchored).
  - The widened `isClearGateCommand` does not red -05's sealed scenario 8, which asserts only that the user hook survives, the prose survives, and `.mcp.json` is unchanged.
  - T11 stays open.
- **BUG-085:** no -05 impact. `doctor.ts` is untouched, so the drift block `:267-279` and `runSessionStart` `:526` are as at `a821d40` until -07 moves them. Use `grep -a`.
- **-08:**
  - V4 resolved: the hook.js import is unshifted at `cli.ts:34`, and the host import landed at `:37`.
  - V6 stays open.
  - `computeHostHealth` returns counts only, so it is not a replacement for -08's per-path `payload-files` check; there is no duplication hazard.
  - The CLAUDE.md-block pre-member command list omits `host`, as it omits `verify-install` (M4 OD 7). Extend that close follow-up.
- **-09:** none. `host` is a new help entry only, and the clean-room baseline pins no `--help` text.
- **-10:** **M3-A35** binds:
  - the view hoist and dispose
  - `InstallViewError` and `preflight` errors → `HostLifecycleError(2)`
  - `preflight` between `lifecycle.ts:282` and `:284`
  - codex `remove()` gets line sinks; codex `install()` uses `logPrefix`

  A future `.mcp.json` MCP-entry removal on `host remove claude` must amend -05's sealed scenario 8 (`.mcp.json` byte-unchanged) as a contract change.

## FU routing

| FU | Finding | Target | Severity |
|---|---|---|---|
| FU-1 | `uninstall --host` sink adapter and `logPrefix` (M3-A31) | -07 (binding, before QA-Red) | high |
| FU-2 | Partial-path gates and output (M3-A32) | -07 (binding, before QA-Red) | high |
| FU-3 | `--host` validated before the drift cache; `owner` at both `DriftMapEntry` sites; defensive owner read of cached entries (M3-A33) | -07 (binding, before QA-Red) | med |
| FU-4 | `doctor.ts` NUL bytes → `grep -a` (M3-A34) | -07, BUG-085 dispatch text | low |
| FU-5 | Payload-view hoist and dispose; `InstallViewError`/`preflight` → `HostLifecycleError(2)`; `preflight` placement (M3-A35) | -10 (binding) | high |
| FU-6 | `host remove` success summary; `--dry-run`; uncommitted-changes gate, or preservation of modified files (F1, F2) | Close backlog (CR) | med |
| FU-7 | Install-snapshot and package-manifest shape validation (`null`/`{}`/non-array `files`) across host, doctor, upgrade and uninstall | Close backlog (CR) | low |
| FU-8 | Keep entries whose unlink failed in `nextFiles` (F3) | Close backlog | low |
| FU-9 | A non-force re-add or re-init rebases skipped files' snapshot sha to the payload (F4) | Close backlog (CR) | low |
| FU-10 | Pre-member command list in the CLAUDE.md block omits `host` (extends M4 OD 7) | Close backlog | low |

## Adjacent Implementations (final row for -05)

| Story | Module / Export | Path |
|---|---|---|
| STORY-058-05 | **`planHostRemoval(snapshot, host, registry)`**<br>• Pure.<br>• Deletes by `entryOwner === host` plus orphaned shared entries (M3-A16 via `payloadFilter(nextKnown)`).<br>• Surgery targets and preserved entries go to `keeps`.<br>• Throws `HostLifecycleError` 2 (not installed) before 1 (last host).<br><br>**`executeHostRemoval(plan, { cwd, adapter, stdout, stderr, logPrefix })`**<br>• Ctx sinks are **raw**; wrap line sinks as in M3-A31.<br>• Re-reads the raw snapshot.<br>• Prunes empty directories (M3-A27).<br>• Wraps `RemoveCtx` line sinks.<br>• Writes `{ ...raw, files, hosts }`.<br><br>**`addHost(ctx)`**<br>• Order: resolve → snapshot → `loadPackageManifest` (error → `HostLifecycleError(2)`) → `copyPayload` (owned ∪ shared, non-force) → `install({ logPrefix })` → merge with `mergeInstalledHosts`.<br><br>**Other exports**<br>• `computeHostHealth` (counts only).<br>• `isPreservedOnRemoval`.<br>• `HostLifecycleError(message, 1 \| 2)`.<br>• `HostHealthRow`, `HostRemovalPlan`.<br>• `hostListHandler` / `hostAddHandler` / `hostRemoveHandler` and `HostCommandOptions`. The private `resolveHostPayloadDir` is the -10 payload site.<br>• `InstallCtx.logPrefix?`, default `'[cleargate init] '`.<br>• `cleargate host list \| add <name> \| remove <name>`, not gated. | `cleargate-cli/src/hosts/lifecycle.ts`, `src/commands/host.ts`, `src/hosts/types.ts`, `src/hosts/claude.ts`, `src/cli.ts` |

## Environment observation (not part of the verdict; for the orchestrator)

At **01:02:56–01:03:31 local** (2026-09-25T21:02–21:03Z), a process that was not this post-flight ran `init --pin 0.0.0-qa` with `cwd` = OUTER. The pin suggests QA-Verify's smoke. At 01:12 something was still rewriting `.cleargate/wiki/**`. My own executions were read-only. OUTER's snapshot hashed `fa0c79ac…` (legacy) when I first checked it in this session.

Observed damage in OUTER, all tracked except the last item:
- **`.mcp.json`:** `cleargate@0.10.0` → `cleargate@0.0.0-qa`, a version that does not exist on npm. The cleargate MCP server fails to start in the next Claude session.
- **`.cleargate/.install-manifest.json`:** the legacy 0.10.0 snapshot (65 entries, no `owner`/`hosts`) is replaced by a 74-entry, owner-stamped snapshot with `hosts: ['claude']` and `pin_version: 0.0.0-qa`.
  - Doctor's pin reverse-substitution now uses `0.0.0-qa` against live hooks pinned `0.20.0`.
  - The TPV/DevOps smoke-1 expectation (`core files=44`, `claude files=21`, exit 1) no longer holds.
- **`.cleargate/scripts/gate-checks.json`:** rewritten (applyTestStack).
- **`.gitignore`:** a managed block was added.
- **`.cleargate/.gitignore`:** modified.
- **`.cleargate/wiki/**`:** about 300 files rewritten, and some deleted.
- **Live `.claude/settings.json`** (gitignored): rewritten, but byte-identical to canonical (`c36adcfd…`). It is benign. Live hooks were untouched: non-force skip, and no `0.0.0-qa` in `.claude/hooks/*.sh`.
- `CLAUDE.md` content is unchanged.

**Action for the orchestrator:**
1. Once the parallel process finishes, confirm who ran it.
2. Restore only the named tracked paths: `git checkout -- .mcp.json .cleargate/.install-manifest.json .cleargate/scripts/gate-checks.json .gitignore .cleargate/.gitignore .cleargate/wiki`.
3. **Do not** blanket-revert `.cleargate/`. `plans/M3.md` holds this post-flight's intended append, and this report is new.

## Script Incidents

None; no `.cleargate/scripts/*` script was invoked. The executions were:
- read-only `git show`/`diff`/`log`, `shasum`, and `command grep`/`perl` byte probes in the cli repo
- `node -e` reads of the outer legacy snapshot
- one `npx tsx` run of a scratchpad probe (`scratchpad/legacy-probe.ts`) that imports `src/hosts/{lifecycle,registry,claude}.ts` and calls only the pure `planHostRemoval` and the read-only `computeHostHealth`

No build, stash or checkout ran, and no file was written in either repo apart from this report and the M3 append. Version check: no dependency is added or pinned, so `npm view` is not applicable.

```yaml
flashcards_flagged:
  - "2026-09-26 · #doctor #grep · doctor.ts holds raw NUL bytes (globMatch :887/:889); plain grep says 'Binary file matches' — use grep -a."
  - "2026-09-26 · #host #uninstall #contract · executeHostRemoval's ctx sinks are RAW; uninstall's are LINE sinks — strip the trailing \\n first."
  - "2026-09-26 · #doctor #drift · check-scaffold --session-start-mode replays an old .drift-state.json; new DriftMapEntry fields may be absent."
  - "2026-09-26 · #host #uninstall #danger · host remove has no dry-run or dirty-tree gate (uninstall has both); edited files at ClearGate paths go."
  - "2026-09-26 · #zsh #git · zsh reads `git show $C:src/x` as a :s modifier ('bad substitution'); write \"${C}:src/x\"."
```

STATUS=done

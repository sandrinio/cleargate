# STORY-062-03 — Architect Post-Flight (§C.6)

role: architect

**Verdict: ARCH: PASS**

I reviewed Dev commit `eeaa8b4` on `story/STORY-062-03`. It sits on QA-Red `8f89633`, which sits on C3 `contract/S-44-scope` `1cdd65d`, which sits on cli `main` `5cbad8d`. The worktree was read-only and `git status --porcelain` stayed empty before and after my runs.

## Dispatch flag: `typecheck: exit code 254`

This is the known BUG-087 false fail. `npm run typecheck` in the worktree exits 0 (I re-ran it here). No structural signal.

Targeted re-run in the worktree with `TMPDIR=/tmp/cg44a3`:
- `sprint-scope.red.node.test.ts` + `sprint-scope.node.test.ts`: 50/50 pass. This includes "R9 sha is sha256 of the sprint file raw bytes after stamp/gate/ingest, and chains via expectSha".
- `cr075-standalone-contract.node.test.ts` (the EPIC-061 coupling guard): green.
- `cli-gating.node.test.ts`: green. `sprint add|remove` falls in the open, ungated subset.
- `test/cli.node.test.ts` fails 20 tests. All 20 spawn `dist/cli.js`, and the worktree has no `dist/`. This is the environment, not a regression (flashcards 2026-09-26 #qa #worktree, #test-harness #tpv). The merge lane runs it against the main checkout's dist.

## 1. Conformance to M1 (STORY-062-03) and the SDR §2.1 freeze rules

| Check | Result | Evidence |
|---|---|---|
| C3 frozen names and types unchanged | PASS | `SprintScopeOptions` (`sprint-scope.ts:32-38`), `SprintScopeResult` (`:56-66`) and the `sprintScopeHandler(opts, cli?) : Promise<SprintScopeResult>` signature (`:319-322`) match the C3 stub at `1cdd65d:9-39` field for field. |
| Optional seams only | PASS | `SprintScopeCli` gains only `now`, `getVersion`, `stampFn`, `gateFn` and `ingestFn`, all optional (`:44-53`), with the M1 types (`plans/M1.md:286-289`). |
| Handler never calls `process.exit` | PASS | `sprint-scope.ts` contains no `process.exit`. Gate and ingest receive a throwing `ExitSignal` seam (`:599-601`, `:621-623`). Gate's only `exitFn` calls inside the handler are outside any swallowing try (`gate.ts:152-337`; its one try at `:236-240` wraps `evaluate`). The same holds for ingest (`wiki-ingest.ts:83-330`). The purity test pins this. The exit lives in the `cli.ts` action only (worktree `cli.ts:426`). |
| No import of `commands/sprint.ts` | PASS | I walked the transitive relative imports of `sprint-scope.ts`: 30 modules. None of them is `commands/sprint.ts`, `dashboard/*` or `cli.ts`, so 04's `serve.ts → sprint-scope.ts` edge cannot close a cycle (M2 risk 3). |
| Paths from `cli.cwd` | PASS | `cwd = cli?.cwd ?? resolveProjectRoot(process.cwd())` (`:324`) feeds `findSprintPlanFile`, `resolveActiveSprint`, the pending-sync and archive dirs, `getCodebaseVersion({ cwd })`, and the `cwd` passed to gate and ingest (`:595`, `:617`). |
| Refusal precedence (M1 step 2, items 1–8) | PASS | `:375-463` follow the plan order: no ids, routing, sprint missing, archived, framing, `expectSha` (code 3), active or `state.json`, Completed, then per-id errors. |
| Stale-claim amendment (sprint-context 07:35Z) | PASS | `:436-457`. A claim by a Completed sprint, an archived sprint, or a sprint with no file is reassigned with a warning. A claim by an open sprint is refused with the `cleargate sprint remove <OTHER> <ID>` hint. |
| Line-level edit, no `yaml.dump`, re-parse invariant | PASS | `editYamlList` (`:168-234`) and `setYamlScalar` (`:240-263`) edit lines only. `js-yaml` is used solely to *parse* a flow list (`:193`). `verifyEdit` (`:286-311`) checks every non-target key, key order, the preamble slice and the body slice. |
| Write discipline | PASS | TOCTOU re-read (`:548-560`), items written before the sprint file, tmp files named `<file>.cg-tmp-<pid>` (no `.md` suffix, so 02's `readdir` never parses one), restore on failure (`:561-581`). |
| R7 three phases, failures become warnings | PASS | stamp all, then gate all, then ingest all (`:633-646`). Gate exit 1 with empty stderr counts as a gate failure, not an error (`:606`). |
| `cli.ts` registration | PASS | One import after `:18` and the `add`/`remove` loop after the `sprint close` block (`:413-428`). Optional keys are omitted when undefined. Nothing else in `cli.ts` changed. |

## 2. Cross-story fit with STORY-062-04 (two in-process calls: remove, then add)

- **The returned sha chains.** `result.sha` is `sha256Hex(fs.readFileSync(sprintPath))`, a Buffer of raw bytes, taken after all three post-write phases (`:669`).
  - On a no-op, `sha` is the sha computed on entry (`:396`), so `remove` → `add` with `expectSha: r1.sha` passes 03's code-3 check (`:398`) whether or not `remove` wrote anything.
  - This is the same hash 04's `collectPlan` uses (`createHash('sha256').update(buf)`, `plans/M2.md:82`), so `GET /data` after a commit reports `body.sha`.
  - 04's `runSerial` queue makes sure no other writer runs between the two calls.
- **Seam behaviour inside the daemon.** 04 passes `{ cwd, stdout, stderr }` and no stamp, gate or ingest seams, so the real pipeline runs with throwing exit seams. A failing gate or ingest becomes a warning, not a dead daemon.
  - Any unexpected throw (for example the unguarded final `readFileSync` at `:669`) rejects the promise. 04's plan maps that to a 500 and keeps `/healthz` up (`plans/M2.md:385`).
  - The daemon child is spawned with `cwd: opts.cwd` (`story/STORY-062-01:src/dashboard/daemon.ts:259`), so the cwd-less git runners in wiki ingest (`git-sha.ts:16-18`) run in the project root in production.
- **Codes.** 0, 1 and 3 match 04's 200, 422 and 409 mapping. 04 substitutes its own `sprint file changed — reload` literal, so 03's text is not on the wire.
- **04's branch carries the C3 stub byte-for-byte.** `git diff contract/S-44-plan story/STORY-062-04 -- src/commands/sprint-scope.ts` is empty, so 04's integration takes 03's file without conflict.

## 3. Merge-order change (03 before 01): safe

- **Read-only previews (`git merge-tree --write-tree`) are all clean:**
  - `story/STORY-062-01 × story/STORY-062-03`: exit 0, tree `2c11832`
  - `story/STORY-062-02 × story/STORY-062-03`: exit 0
  - `story/STORY-062-04 × story/STORY-062-03`: exit 0
- **`cli.ts` in the 01+03 merged tree:**
  - 03's import is at :19 and its loop at :414–430.
  - 01's `sprint dashboard` is at :461 and the top-level `program.command('dashboard')` at :493.
  - The two stories' blocks don't touch, so 01's top-level `dashboard` insertion stays clear.
- **No code dependency in either direction.** 01 changes `sprint.ts`, `daemon.ts`, `serve.ts`, `render.ts` and `init.ts`. 03 imports none of them. 01 does not touch `sprint-file-locate.ts` (`resolveActiveSprint` and `findSprintPlanFile` are unchanged).
- **Process consequence (not a blocker).** `main` moves when 03 merges, so 01 must integrate before its own merge (sprint-context rule 13, "If main moves before the merge, integrate again"):
  - in 01's cli worktree, `git merge --no-ff main`
  - `npm run prebuild`
  - typecheck and 01's targeted tests
  - QA-Verify on the integrated tree

  `contract/S-44-scope` needs no fast-forward, because no frozen export changed.

## Advisory (non-blocking, follow-up candidates)

1. **Two sha computations differ in type.** The entry sha (`:396`) and the TOCTOU compare hash the utf8-*decoded* string, while the final sha (`:669`) and 04 hash the Buffer.
   - They are identical for valid UTF-8. BOM and CRLF survive the decode.
   - They diverge only on invalid UTF-8 bytes, which would give a permanent 409 for that file.
   - Fix: read once as a Buffer, hash the Buffer, decode for parsing.
2. **R8 unready warnings iterate written item files (`:650`), not `changed` ids.** An id whose list entry is added while its item already names the sprint gets no unready warning.
3. **Process deviation, sanctioned.** M1 ground rule 2 says the Developer never edits `test/**`, yet the Developer authored the new `test/commands/sprint-scope.node.test.ts`. This matches story §3.1 and QA-Red's handoff note, which left the helper unit tests to the Developer. The red file is untouched (`git show --stat eeaa8b4`: 3 files, red file not among them).
4. **Bookkeeping.** `plans/waves.json` `merge_order` and sprint-context rule 14 still read 01 → 03 → 02 → 04. The orchestrator should append the swap to sprint-context `## Mid-Sprint Amendments` so the Reporter and DevOps see the actual order.

## Script Incidents

None. No wrapped script was invoked.

flashcards_flagged:
- `2026-11-10 · #zsh #git · "$T:src/x" in zsh reads :s as a modifier (bad substitution); write "${T}:src/x" for git show <tree>:<path>.`
- `2026-11-10 · #merge #contract · Swapping two no-upstream items' merge order makes the later one re-integrate main + re-QA (rule 13); preview with merge-tree.`

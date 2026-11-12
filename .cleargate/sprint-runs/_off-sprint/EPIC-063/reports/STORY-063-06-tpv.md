# STORY-063-06 TPV
TPV: APPROVED

role: architect (TPV mode). Red commit 656cb71 on `story/STORY-063-06` (cleargate-cli; base main 0f9aeee). Read-only: no checkout edits, no commits, no branch switch. All builds were done in the session scratchpad from `git archive`. Before and after the builds, the mtimes of the checkout's `dist/cli.js` and `dist/MANIFEST.json` were checked and had not changed.

One required amend to the **gated** budget file (A1–A3 below) must land before Developer dispatch. It changes no red/green outcome under `npm test`, so it is not a wiring bounce and needs no TPV re-check.

## Evidence

| Run | Result |
|---|---|
| The 3 red files at 656cb71 (checkout, private TMPDIR) | 49 red, 1 green (malformed-config anchor), 1 skip (gated budget test). Unit reds: `ERR_MODULE_NOT_FOUND` / ENOENT for `src/lib/wiki/unchecked-drafts.ts`. Doctor reds: no alarm line, with the drift and stale-sentinel harness lines printing correctly. Each fails for the right reason. |
| Same files against a throwaway reference impl (scratch `git archive` copy: new module plus a 7-line hook in `runSessionStart`) | **50/50 pass** |
| Existing suites against that reference: `doctor-drift-guard`, `doctor-session-start`, `doctor-membership-banner`, `doctor-notifier`, `doctor`, `sprint-sentinel-validation`, `doctor-fence.red`, `doctor-per-host.red`, `doctor-retired-field.red`, `doctor-pricing` | 120 tests, 114 pass, **0 fail** (6 are TODO-marked "lags BD") |
| Gated budget test, default synthetic tree, scratch builds of `main` and the reference | pass |
| Gated budget test with `CG_PERF_CWD=<this repo>` | **FAIL**: `unexpected exit 1` on the warm-up run (finding F1) |
| Manual timing on this repo, 20 runs per side | hrtime p95 265.9 → 285.7 ms (+19.8). `/usr/bin/time -p` p95 400 → 430 ms (+30). Exit 1 on both sides. No alarm line, which matches the story's "0 candidates today". |

## 1. Coverage: every requirement has a red that fails for the right reason

| Requirement | Reds (file:line) |
|---|---|
| R1 (at most one line; silent when none) | doctor `.red.node.test.ts:171` (`hits.length === 1`), `:233` (none, then a positive control) |
| R2 bucket | unit `:203` (config omits stories), `:212` (narrower list), `:220` (no-bucket name / .txt / archive) |
| R2 filter | unit `:183` (Draft, In Review, approved absent), `:192` (approved, Completed, Active, Abandoned, plus a control) |
| R2 window | unit `:145` (8 boundary ages), `:164` (future-dated), `:172` (injected `now`); doctor `:247` |
| R3 (missing or stale stamp; shared hash) | unit `:240`, `:247`, `:254`, `:262`, `:274`, `:285`, `:295` (`<instructions>` preamble, which proves the 063-01 hash is reused) |
| R4 (count, ≤5 ids, oldest first, text) | unit `:334`, `:411`–`:468`; doctor `:177` (exact line), `:198` |
| R5 (placement, informational only) | doctor `:264`, `:274`, `:291`, `:304`, `:312`, `:325`, `:343` |
| R6 (no git or network; reuse) | unit `:476`–`:507` (source greps), plus the gated budget file |
| Gherkin 1–5 | doctor `:233`, `:171`, `:183`, `:216`, `:198` (each has a unit twin) |
| Gherkin 6 (error) | unit `:247` and `:262`; doctor `:325` |
| Gherkin 7 (budget) | `.red.integration.node.test.ts:87` (gated) |
| Plan 1–6 | the same tests as Gherkin 1–6. Plan 4's "config omits stories" is in both fixtures (unit `:52-68`, doctor `:55-59`). |
| Plan 7 | gated file (see F1–F3) |
| Plan 8 (SPIKE) | unit `:369`, plus the end-to-end test at `:377` |
| Plan 9 | Confirmed. `command grep -l updated_at` over every test that exercises session-start returns only the two new files. The `test/scripts/*` hits are close-sprint fixtures and never run `doctor --session-start`. |

**Over-constraint review.** No red pins a detail that C6 left open, beyond the four below. All four are acceptable.
- doctor `:288` `alarm === drift + 1` ("immediately after"). R5 only requires "between". Nothing else is emitted between `doctor.ts:677` and `:679` today, so the pin is free. Keep it.
- R4 string pinned byte-for-byte (`⚠️` U+26A0 U+FE0F, em dash). The plan (C6 approach step 3) fixes "R4 text verbatim", so this is a contract, not an over-pin.
- unit `:164` future-dated excluded. This follows arithmetically from `now - t > 24h`. Keep it.
- `deepEqual(..., { count, ids })` forbids extra keys on the result. That matches C6.1 exactly.

## 2. Boundary: both ends exclusive is correct

Story R2: "more than 24 hours and less than 7 days old". Plan C6 approach step 2: `now - t > 24h && now - t < 7d`. Unit `:145` pins 24h out, 24h+1s in, 7d−1s in, 7d out. All three sources agree. Gherkin 1's "1–7 days ago" is descriptive and does not conflict.

## 3. Placement: satisfiable without reordering anything

On main 0f9aeee the line numbers are unchanged since the plan: the drift `if` block is at `doctor.ts:672-677`, the BUG-036 comment starts at `:679`, and `resolveActiveSprint` is at `:692`. Insert the alarm between `:677` and `:679`.

The existing pins are unaffected:
- `doctor-drift-guard.node.test.ts:519` pins `lines[2]` = drift, and the alarm comes after it.
- `doctor-membership-banner:74-168` pins `lines[0]`/`[1]`.
- `doctor-session-start:498` requires `reminderIdx > 1`.
- `sprint-sentinel-validation:269-297` uses regexes over the joined output.

The reference-impl run above confirms 0 regressions. The pending-sync pass at `:755` must stay where it is; the alarm uses its own walk (plan C6 approach step 1).

## 4. Malformed config: the anchor is right, and it does guard something

`loadWikiConfig` throws `Malformed YAML in …` (`wiki-config.ts:92`). I verified that it throws on the test's exact YAML (doctor `:346`). Without a catch, `runSessionStart` rejects and the anchor test turns red, so although it is green at baseline it is a real regression guard.

The behaviour is correct. The banner must not depend on an informational check, the same rule the drift line follows (BUG-085, `:668-669`) and the notifier follows (`:704-705`, "Silent no-op on any error; never touches outcome").

**Decision for the Developer** (the test accepts either option; this picks one):
- Inside `checkUncheckedDrafts`, catch the `loadWikiConfig` throw and use `ingest_buckets = undefined`. Keep scanning and keep alarming. With a malformed config every `wiki ingest` throws at `wiki-ingest.ts:162`, so Phase 4 never runs, and that is exactly the silent drop this alarm exists to surface.
- Also wrap the call in `runSessionStart` in `try { … } catch { /* informational only */ }` as the outer guard.

## 5. SPIKE end-to-end (unit `:377`): sealed

- `makeRepo()` is a `mkdtempSync` under `os.tmpdir()` and is removed by `afterEach` (`:48-50`).
- `cwd: root` is passed, so `resolveProjectRootForFile` is never reached (`wiki-contradict.ts:194`).
- `now` is injected and findings come via `stdin: '[]'`.
- The handler makes no git call (`wiki-contradict.ts:193-275`). `GitRunner` is imported as a type only.
- The stamp is `contradictContentHash`, not a SHA.
- The exit seam correctly expects `exit(0)` (`wiki-contradict.ts:274`).
- The raw-file mirror stamp lands in the frontmatter only, so the hash is unchanged and the alarm clears. This passed under the reference impl.

## 6. R6 source greps: reasonable, with three traps for the Developer

The greps read only `src/lib/wiki/unchecked-drafts.ts` (`SRC_FILE`, unit `:27`), not its transitive imports. Importing `parseFrontmatter`, `parsePage`, `deriveBucket`, `loadWikiConfig` or anything from `contradict.ts` is therefore allowed, even though `contradict.ts` imports `createHash` (`:15`) and `doctor.ts` imports `spawnSync` (`:12`).

Traps, all on that one file and including its comments:
- `\bexec\s*\(` (`:485`) also matches `RegExp.prototype.exec`. Do not use `/…/.exec(...)`.
- `createHash(`, `PHASE4_TRIGGER_STATUSES` and the literal `'In Review'`/`"In Review"` must not appear anywhere, comments included (`:498-499`).
- `spawn(`, `fetch(` and `execSync(` must not appear, even in a comment such as "never calls spawn()" (`:484`, `:490`).

## 7. Budget test: sound on its default path; three defects on the gated file

The default path is sound. Because `git archive` scratch builds contain no `templates/cleargate-planning/`, tsup's onSuccess skips the MANIFEST copy, and both builds run. The default synthetic 150-draft tree passed: the baseline printed no alarm and the after-build did.

Defects:
- **F1.** `.red.integration.node.test.ts:70` asserts `r.status === 0 || r.status === 2`. On this repo `doctor --session-start` exits **1**: 10 pending-sync items carry `cached_gate_result.pass: false`, so the blocker is set at `doctor.ts:834`. As a result the documented `CG_PERF_CWD=<this repo>` mode fails on the warm-up, and that is exactly the input Gherkin 7 and plan 7 name. R5's real rule is "exit unchanged by the check", not "exit ∈ {0,2}".
- **F2.** `:65` sets `CLEARGATE_HOME`, but `command grep -rn CLEARGATE_HOME src/` finds 0 hits, so it does nothing. The child reads the real `~/.cleargate` (membership and the update cache), and when that cache is stale or absent it fetches the npm registry with a 2 s timeout (`registry-check.ts:160`). That adds network jitter to a p95 delta. `CLEARGATE_NO_UPDATE_CHECK=1` (`registry-check.ts:140`) removes it.
- **F3.** `syntheticTree()` (`:41`) is never removed, which leaves orphan state (TPV check 4).
- **F4 (doc only).** `:12-13` says "scratch `tsup --out-dir` build of the branch". That is the unsafe recipe: `tsup.config.ts:60-62` resolves `pkgRoot` from the config file's own location, so `--out-dir` in the checkout still writes the checkout's `dist/MANIFEST.json` (FLASHCARD 2026-09-25 `#build #dogfood-split #danger`). `templates/cleargate-planning/MANIFEST.json` exists in the checkout today (22655 B vs dist 22383 B), so the copy would really fire.

### Required amend (QA-Red, `test/commands/doctor-contradiction-alarm.red.integration.node.test.ts`, before Developer dispatch)

A1: in `timeRuns` (`:64-82`):
- Replace `:65` with
  `const env = { ...process.env, CLEARGATE_NO_UPDATE_CHECK: '1' };`
- Replace `:70` with
  `assert.ok(r.error === undefined && r.status !== null, \`doctor did not run: ${String(r.error)} ${r.stderr}\`);`
- Make `run` and `timeRuns` also return `status: r.status` from the last timed run.

Then after `:90`, add
`assert.equal(after.status, before.status, 'R5: the check never changes the exit code');`

A2: wrap the body of the test at `:87` in `try { … } finally { if (!process.env['CG_PERF_CWD']) fs.rmSync(cwd, { recursive: true, force: true }); }`.

A3: in the header (`:12-13`), replace the build recipe text with:
`git archive <ref> | tar -x -C <scratch>; ln -s <checkout>/node_modules <scratch>/node_modules; (cd <scratch> && ./node_modules/.bin/tsup). NEVER tsup --out-dir in the checkout: onSuccess writes <checkout>/dist/MANIFEST.json (tsup.config.ts:60-62).`

Until the amend lands, the Developer must not use `CG_PERF_CWD`, and must export `CLEARGATE_NO_UPDATE_CHECK=1` when running the gated file. The env spread at `:65` passes it through to the child.

### Developer scratch-build and timing recipe (exact)

`git archive` reads commits only. A new untracked `unchecked-drafts.ts` is invisible to `git stash create`, so **commit the story first**, then:

```bash
cd /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli
export TMPDIR=$(mktemp -d /tmp/dev06.XXXX)
S=$(mktemp -d /tmp/perf06.XXXX); mkdir -p "$S/base" "$S/after"
stat -f '%m %N' dist/cli.js dist/MANIFEST.json > "$S/dist.before"
git archive 0f9aeee              | tar -x -C "$S/base"    # pre-change build = branch base (cli main)
git archive story/STORY-063-06   | tar -x -C "$S/after"   # your committed branch tip
ln -s "$PWD/node_modules" "$S/base/node_modules"; ln -s "$PWD/node_modules" "$S/after/node_modules"
(cd "$S/base"  && ./node_modules/.bin/tsup >/dev/null)    # expect the warning "cleargate-planning/MANIFEST.json not found"; that is correct
(cd "$S/after" && ./node_modules/.bin/tsup >/dev/null)
stat -f '%m %N' dist/cli.js dist/MANIFEST.json | diff - "$S/dist.before" && echo "checkout dist untouched"

# (a) gated test, synthetic tree
CLEARGATE_NO_UPDATE_CHECK=1 CLEARGATE_PERF=1 CG_PERF_BASELINE_CLI="$S/base/dist/cli.js" CG_PERF_AFTER_CLI="$S/after/dist/cli.js" \
  npm run test:file -- test/commands/doctor-contradiction-alarm.red.integration.node.test.ts

# (b) Task Breakdown row 4: this repo, /usr/bin/time, 20 runs, p95 = 19th of 20. Exit 1 is expected on both sides.
cd /Users/ssuladze/Documents/Dev/ClearGate
for side in base after; do
  CLEARGATE_NO_UPDATE_CHECK=1 node "$S/$side/dist/cli.js" doctor --session-start >/dev/null 2>&1   # warm-up
  for i in $(seq 20); do
    /usr/bin/time -p sh -c "CLEARGATE_NO_UPDATE_CHECK=1 node $S/$side/dist/cli.js doctor --session-start >/dev/null 2>&1" 2>&1 | awk '/^real/{print $2*1000}'
  done | sort -n | sed -n 19p | sed "s/^/$side p95 ms: /"
done
```

Record both p95 values and the delta in the dev report. The TPV reference measured +20–30 ms. Run on a quiet machine (FLASHCARD 2026-11-12 `#hooks #perf`).

## 8. Hidden traps

- `isBucketIngestable(b, undefined)` and `(b, [])` both return true (`wiki-config.ts:58-60`). Both fixture families ship a config that omits `stories`. Do not hardcode a stories skip; the config is the rule.
- `deriveBucket` throws on unknown prefixes (`derive-bucket.ts:73`), so wrap it in try and skip (unit `:220`). Do **not** write an ID regex instead: `scripts/check-no-inline-id-regex.mjs` scans `src/` and runs under `npm test` (`test/scripts/no-inline-id-regex.node.test.ts:18`), and the R6 `exec(` grep also bites.
- `parsePage` (`page-schema.ts:77`, `parseFmRaw` `:115-122`) throws only when the opening or closing `---` is missing. Garbage between the fences parses leniently and yields `last_contradict_sha: undefined`. Both outcomes must count as unchecked. Wrap the read and parse together in try.
- Raw frontmatter must come from `parseFrontmatter` (locator-based), not a first-`---` split. Unit `:295` has a `---` inside an `<instructions>` preamble. `parseFrontmatter` uses CORE_SCHEMA, so `updated_at` stays a string; use `Date.parse(String(fm['updated_at']))` and skip on NaN.
- `now`: use `cli?.now?.() ?? new Date()` (`DoctorCliOptions.now`, `doctor.ts:50`). `runSessionStart` takes `cli` as its 4th argument; `doctorHandler` already threads it (`:1176`). Never call `Date.now()` inside the helper, because the frozen 2031 clock catches it.
- Sort ascending by `t`, and tie-break by id so the order is deterministic (ties are not pinned).
- `contradictContentHash` cannot throw once `parseFrontmatter` has succeeded on the same `raw` (same locator), but keep the plan's "hash throw → unchecked" path anyway.

## Developer hints (beyond the plan's C6 blueprint, which is binding)

1. New file `src/lib/wiki/unchecked-drafts.ts` exports exactly `UncheckedDrafts`, `checkUncheckedDrafts(cwd, now)` and `formatUncheckedDraftsLine(r)`. Imports:
   - `parseFrontmatter` (`../../wiki/parse-frontmatter.js`)
   - `deriveBucket` (`../../wiki/derive-bucket.js`)
   - `parsePage` (`../../wiki/page-schema.js`)
   - `loadWikiConfig`, `isBucketIngestable` (`../wiki-config.js`)
   - `contradictContentHash`, `phase4SkipReason` (`./contradict.js`)
2. Call `loadWikiConfig` once per scan, not once per file.
3. `ids` holds ALL unchecked ids. Only `formatUncheckedDraftsLine` slices to 5.
4. The doctor change is the import plus one guarded block between `:677` and `:679`. Leave `outcome` untouched, leave the `:755` pass alone, and do not add the alarm to hook-health mode (doctor `:354`).
5. Keep the red file names as committed (`.red.` infix). Do not edit them; that is the surface gate.
6. Green bar: the 3 red files, plus the 10 doctor suites listed under Evidence, plus `test/scripts/no-inline-id-regex.node.test.ts`, plus `npm run typecheck`.

## For the orchestrator

- Route A1–A3 to QA-Red now, as a single `qa-red(STORY-063-06): amend gated budget test` commit. Then dispatch the Developer. No TPV re-check is needed, because the edits are verbatim above and touch only the gated file.
- M1.md `:43-44` and approach step 7 of the 06 blueprint (`:793`) prescribe `npx tsup --out-dir <scratch>/dist` "from the branch". That recipe overwrites the checkout's `dist/MANIFEST.json` (`tsup.config.ts:60-62`). Use the recipe in §7 instead. 07 and §R timing steps must not copy the plan's version.

## Script Incidents
None. No `run_script.sh` scripts were invoked.

## Flashcard candidates
- `2026-11-12 · #doctor #test-harness · CLEARGATE_HOME is read by no src module; subprocess doctor runs need CLEARGATE_NO_UPDATE_CHECK=1 or they hit ~/.cleargate + npm.`
- `2026-11-12 · #doctor #perf · doctor --session-start exits 1 on this repo (gate-failed pending-sync items); perf harnesses compare exit across sides, never pin 0.`

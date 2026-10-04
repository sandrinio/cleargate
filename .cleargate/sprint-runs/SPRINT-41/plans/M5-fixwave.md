# Milestone: M5 fix wave — BUG-096 → BUG-097 → BUG-090
## Stories: BUG-096, BUG-097, BUG-090
## Wave: wave14-fw1 (BUG-096) → BD → wave14-fw2 (BUG-097) → BD → wave14-fw3 (BUG-090) → BD. Strictly serial (R1). Runs after wave14 (STORY-058-10) → BD → RS-4a and before wave15 (STORY-058-11).

role: architect. This plan binds the three fix-wave items. `plans/M5.md` is not edited. Where this file changes an M5/M6 instruction, the change is an FW-A amendment below, and the orchestrator mirrors it.

**GOAL_RELATION:** BUG-090 serves the Sprint Goal directly: "freshly scaffolded work items … start gating". Today `sprint init` rejects every `<instructions>`-led story, and the epic and story templates carry no `approved:` key to flip. The clean-room `sprint-init` row is FAIL-KNOWN (BUG-090) in Run 1. BUG-096 and BUG-097 are hygiene defects found on the same fresh-folder journey (owner, 2026-09-26: "log every issue you find and fix them"). Neither is on a Goal Acceptance Check path. BUG-096 cuts /tmp growth during the wave's heavier runs.

**Measured at cli `35580b0`, in the scratch clone `/private/tmp/cg-s41-fixwave-plan`.** Read-only on the cli main checkout; nothing built.

- **The TS locator picks the FIRST eligible fence.**
  - A phantom `---\nstamp_error: x\n---` block before `<instructions>` (the BUG-067 corruption signature) returns span `{start:0,end:22}`, and `parseFrontmatter` returns `{stamp_error:"x"}`.
  - A CRLF header behind `<instructions>` is found with `eol:'\r\n'`.
  - A file with no header returns `null`.
  - An unterminated header, `<instructions>` block or fence throws `locateFrontmatter: …` (`src/lib/frontmatter-locator.ts:62-121`).
- **Delivery-corpus census:** 556 files in `pending-sync/` + `archive/`.
  - The TS locator throws on 0 and returns null on 0. The old `^---\n` regex hits 551.
  - The 5 files it misses are the instructions-led drafts BUG-091..095.
  - SPRINT-41's Step-2.9 deferred set is the same under both parsers: {STORY-058-09, STORY-058-10, STORY-058-13}.
- **Step 2.9 fail-open reproduced.** Canonical `close_sprint.mjs` was run on an instructions-led story carrying `deferred_verification … blocks: close` and no result file. It printed `Step 2.9 passed: no deferred verifications declared.` and exited 0.
- **Step 2.6c fail-open reproduced.** A fixture stub `walkActiveParents` returned auto-flip for an instructions-led epic. The script printed `Step 2.6c warning: parent rollup unavailable: No frontmatter in …/EPIC-900_probe.md`. No parent was flipped or archived, including a second, already-Completed parent.
- **`assert_story_files.mjs` fixtures:** the instructions-led approved story, the CRLF instructions-led story, the phantom-led story and an approved stub all report `UNAPPROVED`. Only the `---`-led CRLF story passes.
- **Fresh-install integration reproduced.** Flow: `runInitScenario('fresh')` → `newHandler` epic/story/sprint → `approveProbeStory` → `declareProbeSprint` → `<room>/.cleargate/scripts/init_sprint.mjs SPRINT-01 --stories STORY-001-01`. Result: `UNAPPROVED (1): STORY-001-01`, exit 1, no `.active`.
- **M2 baseline** `/private/tmp/cg-s41-m2-init-baseline`: `bdc4bb1a…62b2`, 425 files. Across all 5 scenarios, the 5 BUG-090 payload files equal current canonical and the live mirrors:
  - `assert_story_files.mjs` `ef7b0226…441d`
  - `close_sprint.mjs` `76098f36…9246`
  - `epic.md` `bb338706…57ac`
  - `story.md` `862099f8…9f21`
  - `hotfix.md` `2a75055e…95e2`
  - all mode 644
- **Leak rate.** One child `runInitScenario('fresh')` leaves 2 dirs (`cg-s41-fix-fresh-*`, `cg-s41-payload-*`). /tmp holds about 470 of them, and other runs add more concurrently.
- **Base counts, solo, in the clone** (outer `.cleargate/{scripts,templates,knowledge}` copied beside it):

  | File | Pass/total |
  |---|---|
  | gate-unit | 25/25 |
  | stamp | 6/6 |
  | wiki query | 23/23 |
  | scaffold-lint | 7/7 |
  | push | 7/7 |
  | sync-acquire | 9/9 |
  | doctor | 39/39 |
  | test_assert_work_item_files | 20/20 |
  | clean-room-evidence | 60/60 |
  | frontmatter-locator | 11/11 |
  | step-7-4 | 6/6 |
  | gate-section-index-pinning | 14/14 |
  | init-host-snapshot | 13/13 |
  | canonical shell `test_assert_story_files.sh` | 15/15 |

  `close-sprint-step-2-6c` had 5 environment failures in the clone because it has no built dist. It passes in the main checkout.

## Order

1. **Entry gate (orchestrator, read-only):**
   - -10 has merged to cli `main`, BD is done, and RS-4a is done.
   - Record the -10 merge SHA as `M10`.
   - Run `git -C CLI diff 35580b0 M10 --stat -- test/helpers/init-fixture.ts src/commands/doctor.ts scripts/clean-room/probe-items.mjs scaffold/core/.cleargate/scripts/assert_story_files.mjs scaffold/core/.cleargate/scripts/close_sprint.mjs scaffold/core/.cleargate/templates`. The expected hunks are:
     - `init-fixture.ts`: rows appended to `SANCTIONED_BASELINE_DELTAS` only (-10 plus any M5-A33+ TPV rows).
     - `doctor.ts`: -10's AD-5 edits inside `runCheckScaffold` only.
     - `probe-items.mjs`: `S3_PROMPT` and `plantAgentsMdCanary` added.
     - `approveProbeStory`: unchanged.
     - The five scaffold/core files: **no change**.

     If any of the five scaffold/core files changed, the BUG-090 delta-row literals below are void. Halt and re-dispatch the Architect.
   - Record post--10 DevOps numbers as `T10/P10/0/2` (full suite) and `V10` (verify-pack entries; planned 204, payload 80).
2. **wave14-fw1 BUG-096.** Test helper only. Goes first so every later run in the wave stops leaking. BUG-090's integration test uses `runInitScenario` and inherits the cleanup.
3. **wave14-fw2 BUG-097.** Four src output fixes, cli only.
4. **wave14-fw3 BUG-090.** Two-repo. Goes last because it is the largest, and it must land before -11 (wave15) and RS-4 so both run without `--known-fail`.
5. No pair is parallelizable. R1 allows one item in flight in the single cli checkout. BUG-096 and BUG-090 both edit `test/helpers/init-fixture.ts`, in different regions.

## Per-story blueprint

### BUG-096 — init-fixture temp-dir cleanup (cli `story/BUG-096`, cli only)

**Cross-story coupling.**
- `test/helpers/init-fixture.ts` is shared with -10 (appends rows at the array tail), BUG-090 (appends 5 more rows later in this wave) and -11 (rows plus a sanctioned addition).
- BUG-096 edits only the `mkShortTmpDir` region (`init-fixture.ts:55-85` at `35580b0`: `SHORT_TMP_BASE` `:55-62`, `mkShortTmpDir` `:65-67`, `getComposedPayloadDir` `:76-85`).
- No caller file changes. No `src/**`.

**Change shape (pinned).**
```ts
const TRACKED_TMP_DIRS = new Set<string>();
let cleanupRegistered = false;

function registerTmpCleanup(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  process.on('exit', () => {
    for (const dir of TRACKED_TMP_DIRS) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort at exit */ }
    }
  });
}

function mkShortTmpDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(SHORT_TMP_BASE, prefix));
  TRACKED_TMP_DIRS.add(dir);
  registerTmpCleanup();
  return dir;
}

/** Test-only: snapshot of the dirs this process will remove at exit. */
export function trackedTmpDirs(): readonly string[] { return [...TRACKED_TMP_DIRS]; }
```
- **One listener per process** (the guard flag), so there is no MaxListeners warning.
- **`process.on('exit')` is the right hook:**
  - node:test isolates each test file in its own process (`scripts/run-default-tests.mjs:37-46`, `--test`, no isolation override).
  - `'exit'` fires on a normal end, on `process.exit`, and after an uncaught exception.
  - It does not fire on SIGKILL; that case stays out of scope.
- `rmSync` does not follow symlinks.

**The capture-mode baseline is never in the set. Proof:**
1. The only `TRACKED_TMP_DIRS.add` site is `mkShortTmpDir`. Its callers are `getComposedPayloadDir` (`:79`) and `runInitScenario` (`:283`), and no others.
2. `captureOrCompare` takes `baselineDir` as a parameter (from `$CLEARGATE_INIT_BASELINE`). It creates it with `fs.mkdirSync` (`:598-601`), never `mkShortTmpDir`, and copies bytes out of the tracked `sourceDir` into it (`:602-609`).
3. Test B3 asserts it at runtime: the baseline survives, and `trackedTmpDirs()` holds no path that is a prefix of the baseline or under it.

**QA-Red** — new file `cleargate-cli/test/helpers/init-fixture-cleanup.red.node.test.ts`, default tier. The bug text says `init-fixture-cleanup.node.test.ts`; FW-A5 renames it to the sprint's red naming (precedent: `test/helpers/wrap-script.red.node.test.ts`).
- **Harness shape**, identical in all three tests:
  - `spawnSync(process.execPath, ['--import','tsx/esm','--input-type=module','-e', SCRIPT], { cwd: CLI_ROOT, encoding:'utf8', timeout: 120_000, env })`.
  - `CLI_ROOT` comes from `test/helpers/scaffold-roots.ts`. `cwd` must be `CLI_ROOT`, or tsx does not resolve (flashcard 2026-08-30).
  - `env` is `process.env` minus `CLEARGATE_INIT_BASELINE` and `CLEARGATE_INIT_BASELINE_CAPTURE`, plus what the test sets.
  - The child imports `./test/helpers/init-fixture.ts`. It prints one marker line, `CG_DIRS=<json>`; `initHandler` also prints a restart banner to real stdout, so the parent extracts the marker with `/^CG_DIRS=(.*)$/m`.
- **B1** "scenario and payload dirs are removed when the child exits normally":
  - The child runs `r = await runInitScenario('fresh')`, then prints `{dir: r.dir, dirs: trackedTmpDirs(), exist: dirs.map(fs.existsSync)}`.
  - Parent asserts: `status === 0`; `dirs` includes `r.dir`; `path.basename(r.dir)` starts with `cg-s41-fix-fresh-`; exactly one `dirs` entry's basename starts with `cg-s41-payload-`; every `exist` is true.
  - After the exit, none of `dirs` exists.
- **B2** "cleanup also runs when the child throws": same as B1, then `throw new Error('cg-bug096-boom')` after printing. Assert `status !== 0`, stderr includes `cg-bug096-boom`, and none of `dirs` exists.
- **B3** "a captured baseline survives cleanup":
  - The parent makes `base = fs.mkdtempSync(path.join(os.tmpdir(),'cg-bug096-base-'))` and `baselineDir = path.join(base,'baseline')`, which must not exist yet.
  - The child env adds `CLEARGATE_INIT_BASELINE_CAPTURE=1` and `CG_BUG096_BASELINE=<baselineDir>`.
  - The child runs `runInitScenario('fresh')`, then `captureOrCompare(process.env.CG_BUG096_BASELINE,'fresh',r,r.dir)`, and prints `{dir, dirs, tracksBaseline}`. `tracksBaseline` is true iff any tracked dir equals, contains, or is contained by `baselineDir`.
  - Parent asserts: `tracksBaseline === false`; `<baselineDir>/fresh/meta.json` exists; `<baselineDir>/fresh/tree/.claude/settings.json` exists; `r.dir` does not exist.
  - An `after` hook removes `base`.
- **Red at the red commit: 3/3.** `trackedTmpDirs` is not exported, so the child throws TypeError and prints no marker. Anchors: none.
- **Never** point a test at `/private/tmp/cg-s41-m2-init-baseline`.

**Anchors that must stay green (solo, `npm run test:file -- <file>` from `cleargate-cli`):**
- `test/commands/init-host-selection.red.node.test.ts`
- `test/commands/init-host-snapshot.red.node.test.ts` (13/13)
- `test/hosts/host-adapter-contract.red.node.test.ts`
- the M2 parity pair, with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (compare mode):
  - `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (5/5)
  - `test/commands/init-host-parity.red.integration.node.test.ts` (15/15)

**Loop depth: QA-Red → Developer → QA-Verify → DevOps.**
- **No live TPV.** This plan pins every wiring point: one import path, one new export, the spawn shape and the marker. The `pre_gate_runner.sh` wiring scan decides as usual, and any flag dispatches TPV (safeguard).
- **No post-flight** unless the §C.6 scan flags. There is no src, payload, scaffold, hook or cross-repo surface.

**QA-Verify.**
- Run the new file plus the anchors above, solo.
- Re-measure the M2 baseline, `find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`, and require `bdc4bb1a…62b2`, 425 files.
- Run a leak probe:
  1. `ls -d /tmp/cg-s41-fix-* /tmp/cg-s41-payload-* > before`.
  2. Solo-run `init-host-selection.red.node.test.ts`.
  3. `ls` again. The set difference must be empty.

**DevOps (cli only).**
- Merge `story/BUG-096` → cli `main` (`--no-ff`). Stage explicit paths; the checkout holds an untracked `cleargate-0.25.0.tgz`.
- Full suite once, expecting **`T10+3` tests / `P10+3` pass / 0 fail / 2 skipped**. Then the Rule-14 outer revert.
- BD (cheap; keeps "dist == main" literal).
- Payload identity unchanged, and `verify-pack` OK at `V10` entries.
- Repeat the M2-baseline hash and the leak probe.
- Hygiene: after the hash check, remove the old leak artifacts with `find /private/tmp -maxdepth 1 -type d \( -name 'cg-s41-fix-*' -o -name 'cg-s41-payload-*' \) -mmin +30 -exec rm -rf {} +`. Both prefixes are exact, and the baseline name matches neither.
- No live mirror and no `.claude/` re-sync.

**Follow-ups only (not this wave):**
- `test/helpers/host-fixtures.ts:47-49` `mkTmp` creates dirs under `os.tmpdir()` and leaves cleanup to each caller; it is unaudited.
- `test/helpers/wrap-script.ts:112` already cleans up in a `finally`, so it is fine.
- Callers that pass their own `payloadDir` own their dirs.

---

### BUG-097 — four CLI output defects (cli `story/BUG-097`, cli only)

**Cross-story coupling.** None with -10 or -11: neither declares `gate.ts`, `stamp.ts`, `wiki-query.ts` or `scaffold-lint.ts`. No hook runs `gate check -v`; `stamp-and-gate.sh` runs `gate check` without `-v`, so live hook logs are unchanged. No `scaffold/**`, no payload, no `stamp-tokens.ts`, no protocol.

**Change shapes (pinned).**
1. **`src/commands/gate.ts:311-327`.**
   - Move the `if (opts.verbose)` block out of the failure `else`, so it runs after either branch.
   - Its format is unchanged: `stdoutFn(\`  [${r.pass ? 'pass' : 'fail'}] ${r.id}: ${r.detail}\`)` for every `allResults` entry.
   - On a pass, the order is header, then `✅`, then the per-criterion lines.
   - On a failure, the order is kept: `❌`/`⚠` lines, then the per-criterion lines. Exit routing is unchanged.
   - Edge: an OR-group alternative that failed individually prints `[fail]` even when the gate passes. That is accurate detail; see G1's fixture choice.
2. **`src/commands/stamp.ts:33-58`.**
   - `export` the function `buildDiffPreview` (a new named export, for unit tests).
   - Add `renderValue(v)`: `v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v)` (compact JSON; `null` still renders `null`).
   - Replace `bVal === aVal` with `sameValue(bVal, aVal)`. It is `JSON.stringify(a) === JSON.stringify(b)` when both are non-null objects, else `===`.
   - Use `renderValue` on all three line kinds. A real change still prints `-` then `+`.
3. **`src/commands/wiki-query.ts:122-124`.**
   - Before prefixing, `display = stripLeadingWikilink(excerpt, id)`:
     1. If `excerpt` starts with `` `- [[${id}]]` ``, drop that prefix, then `trimStart()`, then drop one leading `'— '` if present.
     2. Otherwise leave it unchanged.
   - Push `display ? \`- [[${id}]] — ${display}\` : \`- [[${id}]]\``.
   - This covers both index shapes:
     - the row format from `src/wiki/page-schema.ts:362-366`, `- [[ID]] (type) — status — title`;
     - the code-map line from `:445`, `- [[code/pkg]] — N exported symbols`.
   - `searchIndex` (`:57-82`) is unchanged.
   - The persisted topic body reuses `bodyLines`, so it gets the same fix.
4. **`src/commands/scaffold-lint.ts:122-126`.** Delete `stdoutFn('scaffold-lint: clean')` inside `runScaffoldLint`'s no-planning-dir early return. The handler's single print (`:61-63`) now covers every clean path. Findings (exit 1) and a malformed blocklist (exit 2) print no "clean".

**QA-Red** — all tests appended to the four existing files, default tier. FW-A6 records this choice over new files: the fixtures (`GATES_DOC`, `PASSING_EPIC`, `FRESH_FILE`, `STAMPED_FILE`, `makeIndex`) are file-local, and duplicating them would fork them. New `describe` blocks are titled `BUG-097 …`.

`test/commands/gate-unit.node.test.ts` (+3). The fixture epic gate has 2 criteria and no OR-group (`:158-167`); the fixture story gate has 4 (`:180-193`).
- **G1 [red]** `PASSING_EPIC` with `{verbose:true}`:
  - No exit.
  - `out` is exactly 4 lines:
    1. `Gate: epic.ready-for-decomposition (enforcing)`
    2. `✅ epic.ready-for-decomposition passed (2 criteria)`
    3. a line matching `/^  \[pass\] no-tbds: /`
    4. a line matching `/^  \[pass\] scope-in-populated: /`
- **G2 [anchor, green at base]** `FAILING_STORY_VERBOSE` with `-v`: the index of the first `❌` line is below the index of the first `/^  \[(pass|fail)\] /` line, and there are exactly 4 such lines.
- **G3 [anchor]** `PROPOSAL_WITH_TBD` (advisory) with `-v`: `⚠` lines come before the 2 per-criterion lines. No exit.

`test/commands/stamp.node.test.ts` (+4)
- **S1 [red]** Dry-run on `FRESH_FILE` with a `cached_gate_result:` block mapping added (`pass: null`, `failing_criteria: []`, `last_gate_check: null`):
  - exactly one line equals ` cached_gate_result: {"pass":null,"failing_criteria":[],"last_gate_check":null}`;
  - no line contains `[object Object]`;
  - no line starts with `-cached_gate_result` or `+cached_gate_result`.
- **S2 [red]** `buildDiffPreview('f.md', {k:{a:1}}, {k:{a:2}})` has lines `-k: {"a":1}` and `+k: {"a":2}`, and none contains `[object Object]`.
- **S3 [red]** `buildDiffPreview('f.md', {k:{a:[1]}}, {k:{a:[1]}})`, with two separately built objects, has exactly one `k` line, ` k: {"a":[1]}`, and no `-k`/`+k` line.
- **S4 [anchor]** Dry-run on `STAMPED_FILE` with `now` = `FIXED_NOW_2`: lines `-updated_at: 2026-01-01T09:00:00Z` and `+updated_at: 2026-01-01T10:05:00Z` are both present.

`test/wiki/query.node.test.ts` (+3)
- **Q1 [red]** Index line `- [[EPIC-001]] (epic) — Draft — Task Storage`, query `storage`:
  - stdout contains the line `- [[EPIC-001]] — (epic) — Draft — Task Storage` exactly;
  - `stdout.split('[[EPIC-001]]').length - 1 === 1`.
- **Q2 [anchor]** Table-row index line `| [[PROPOSAL-x]] | proposal | Draft | path.md |`: the result line is `- [[PROPOSAL-x]] — | [[PROPOSAL-x]] | proposal | Draft | path.md |`, unchanged. This pins "a non-`- [[` excerpt renders unchanged".
- **Q3 [red]** Index line `- [[code/cli]] — 12 exported symbols`, query `exported`: the result line is exactly `- [[code/cli]] — 12 exported symbols`.

`test/commands/scaffold-lint.node.test.ts` (+3)
- **L1 [red]** `planningDir` points at a missing dir: exit is not called, and `out.lines.filter(l => l === 'scaffold-lint: clean').length === 1`.
- **L2 [anchor]** An existing clean planning dir (Scenario 1's fixture): exactly one `clean` line.
- **L3 [anchor]** A planning dir with a `drizzle` finding (Scenario 2's fixture): exit 1, and zero `clean` lines.

**Totals.** +13 tests: 7 red (G1, S1, S2, S3, Q1, Q3, L1) and 6 anchors. S2 and S3 are red by absent export (flashcard 2026-09-26: `import()` of a missing named export yields `undefined`, so there is one red per export).

**Anchors that must stay green (solo):** the four files' existing tests, 25 + 6 + 23 + 7. Also `test/commands/gate.node.test.ts`, `test/commands/stamp-tokens.node.test.ts` and `test/commands/cli-gating.node.test.ts` (it references scaffold-lint). `npm run typecheck`.

**Loop depth: QA-Red → Developer → QA-Verify → DevOps.**
- **No live TPV.** All seams already exist in the same files (`gateCheckHandler` cli seams, `stampHandler` cli seams, `wikiQueryHandler` opts, `scaffoldLintHandler` `planningDir`). The one new import (`buildDiffPreview`) is red by absence by design.
- **No post-flight** unless the scan flags. There are no payload, hook or cross-repo surfaces.

**DevOps (cli only).**
- Merge.
- Full suite **`T10+16` / `P10+16` / 0 / 2**, then the Rule-14 revert.
- BD (src changed).
- Payload identity **unchanged**, and `verify-pack` OK at `V10`.
- Hand re-check in the fresh-journey project, per BUG-097 §5. Each command is ONE `(cd /private/tmp/cg-s41-fresh-journey && node /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/dist/cli.js …)` call, never in the background:
  - `gate check .cleargate/delivery/pending-sync/EPIC-001_task_storage.md -v` prints per-criterion lines after `✅`. It writes the cached gate into the scratch project only.
  - `stamp … --dry-run` has no `[object Object]`.
  - `wiki query "storage"` has one `[[EPIC-001]]`.
  - `scaffold-lint` prints `clean` once.

---

### BUG-090 — position-independent fences in the sprint scripts, plus `approved:` in the templates (cli `story/BUG-090` + outer `.worktrees/BUG-090` on `story/BUG-090`)

#### (a) Script-local fence locator: contract and site census

**Contract (pinned).** Add `export function locateFrontmatterFence(raw)` to canonical `scaffold/core/.cleargate/scripts/assert_story_files.mjs`. It is a line-for-line JS port of `linesOf`, `isFenceStart` and `locateFrontmatter` (`src/lib/frontmatter-locator.ts:34-121`):
- It returns the same `{start,end,yamlStart,yamlEnd,eol}` shape.
- It returns `null` only when no fence exists.
- It throws `new Error('locateFrontmatter: missing closing ---')`, `'locateFrontmatter: unterminated <instructions> block'` or `'locateFrontmatter: unterminated Markdown fence'`, byte-identical messages, for parity.
- It honours the leading BOM (`'﻿'`, line 0 only, `start` +1).
- `<instructions>` and `</instructions>` are exact lines, and the block content is opaque.
- ```/~~~ fenced examples are opaque until their matching closer.
- The opener and closer are exact column-zero `---` lines. `----`, `  ---` and `---suffix` are not fences.
- CRLF sets `eol:'\r\n'`.
- It needs no regex that puts a type word next to an ID escape. `scripts/check-no-inline-id-regex.mjs:60-78` scans `assert_story_files.mjs`, so the port must not put `STORY|BUG|…` and `-\d` on one line.

The script cannot import the TS module, because it ships as standalone ESM (BUG-090 Open Question, resolved). The two implementations are pinned to one fixture table: test file 1 below.

**The "demoted phantom fence" ruling (FW-A1).** BUG-067's locator does **not** skip a phantom block that precedes `<instructions>` (measured above). BUG-090's Gherkin example "a demoted phantom fence before `<instructions>` → approved" contradicts its own "same contract as BUG-067" clause. Parity wins, so there are two fixtures:
- **P1**, a phantom `---…---` inside the `<instructions>` block: opaque, the real fence is read, **approved**.
- **P2**, the BUG-067 corruption signature (a phantom block at offset 0, then `<instructions>`, then the real block): the locator reads the phantom block, so the item is **UNAPPROVED**, exit 1. This fails closed, and it matches `gate check`, which reads the same phantom block and cannot detect a type.

**`assertWorkItemApproved(filePath)` (pinned).** Now exported. It keeps the exact `approved` regex from `:168`.
```js
let span = null;
try { span = locateFrontmatterFence(content); } catch { span = null; }
if (span) {
  const fmBlock = content.slice(span.yamlStart, span.yamlEnd);
  body = content.slice(span.end);
  approved = /^approved:\s*["']?(true)["']?\s*$/m.test(fmBlock);
}
```
- On `null` or a throw, `approved = false` and `body = content`, as the regex no-match path behaves today.
- For a no-frontmatter file, the observable output is unchanged: unapproved takes precedence over stub-empty (`:219-224`), so `has_heading` never surfaces.
- The body now excludes the `<instructions>` preamble. That preamble is guidance, not content, which is what fixture A9 pins.

**Census of canonical `scaffold/core/.cleargate/scripts/*.mjs`** (plus `lib/*.mjs`), via `command grep -nE "\^---|'---'|lines\[0\]|startsWith\('---" …`:

| Site (at `35580b0`) | Reads | Ruling |
|---|---|---|
| `assert_story_files.mjs:162` | approval + body of §1 items | **FIX**, through `locateFrontmatterFence` |
| `close_sprint.mjs:250` `readFmStatus` (called `:666`, Step 2.6c archive of an already-Completed parent) | parent status | **FIX**, same file; an instructions-led epic is never archived |
| `close_sprint.mjs:587` `setFrontmatterStatusAtomic` (called `:628`, Step 2.6c flip) | parent status write | **FIX**, span splice; today it throws, and the throw aborts all of 2.6c through the outer catch `:693-695` (measured) |
| `close_sprint.mjs:711` `/^start_date:\s*(.+)$/m` on raw | sprint start date | **LEAVE**: a whole-file multiline scan is already position-independent; `Sprint Plan Template.md` has `start_date:` only at `:48`, outside `<instructions>` (`:1-37`) |
| `close_sprint.mjs:1035` `parseFrontmatterFields` | Step 2.9 membership | **FIX** |
| `close_sprint.mjs:1053` `parseDeferredVerifications` | Step 2.9 entries | **FIX** |
| `dedupe_frontmatter.mjs:60` `lines[0] !== '---'` | BUG-025 one-shot dedupe tool | **LEAVE** → follow-up. It skips instructions-led files and counts them `skipped`, so it never mis-writes |
| `prefill_report.mjs:41` | agent reports under sprint-runs | **LEAVE**: agent-written, `---`-led by construction, never template-scaffolded |
| `prep_qa_context.mjs:125` `parseFrontmatter` | nothing: defined, never called (grep: 1 hit, the definition) | **LEAVE** (dead code) |
| `prep_reporter_context.mjs:84` (called `:487`) | sprint-plan dates for the Reporter bundle | **LEAVE** → follow-up. It degrades to null dates; no gate reads it. Fixing it would add a 6th payload delta row |
| `suggest_improvements.mjs:81,94,358,534,679,698` | markdown table separators | not frontmatter, n/a |

**`close_sprint.mjs` change shape (pinned).**
- Add `import { locateFrontmatterFence } from './assert_story_files.mjs';` to the import block (`:77-84`). `assert_story_files.mjs` has an `isMain` guard (`:289-290`), so importing it never runs `main()`.
- Add one module-level helper, `fenceYaml(raw)`. It returns `{span, yaml: raw.slice(span.yamlStart, span.yamlEnd)}`, or `null` on null or a throw.
- `readFmStatus`: `fm = fenceYaml(raw)`; `null` → return null; otherwise use the same status regex on `fm.yaml` (then `.trim()`, which strips a CRLF `\r`).
- `setFrontmatterStatusAtomic`:
  - `null` → `throw new Error(\`No frontmatter in ${filePath}\`)` (unchanged).
  - Otherwise, `newFm = fm.yaml.replace(/^status:.*$/m, \`status: ${newStatus}\`)` and `newRaw = raw.slice(0, fm.span.yamlStart) + newFm + raw.slice(fm.span.yamlEnd)`.
  - A splice by offsets replaces `raw.replace(fm[1], …)`. It never matches text in the preamble, and the JS `$`/`.` rules keep a CRLF `\r`.
- `parseFrontmatterFields` and `parseDeferredVerifications`: `null` → `{}` / `[]`; otherwise operate on `fm.yaml`.
- Equivalence: the census proves the yaml slice, minus its trailing EOL, equals the old capture for all 551 `---`-led files.
- **Coupling (danger):** close_sprint now statically imports a named export. The live pair must change in **one outer commit**, or `close_sprint.mjs` fails at ESM link time. In target repos both are `overwrite_policy: 'always'` (`src/lib/manifest-builder.ts:227-234`), so `upgrade` moves them together.

**This sprint's own close.** SPRINT-41's Step-2.9 items (-09, -10, -13) are `---`-led, with an unquoted `sprint_cleargate_id: SPRINT-41` and multi-line lists. Their parse is unchanged; census: the same deferred set, 0 throws, 0 nulls. Step 2.6c on `---`-led parents (EPIC-058) produces identical bytes, because the old `raw.replace(fm[1],…)` hit offset 4 and the splice writes the same range. DevOps re-proves this with the shipped script after the merge (step D7 below).

#### (b) Templates, and every `approved` consumer

**Templates (canonical and live, byte-identical).** Insert one line, `approved: false`, **directly after the `status:` line**:
- `epic.md:43` becomes `:44`;
- `story.md:74` becomes `:75`;
- `hotfix.md:35` becomes `:36`. hotfix is FW-A2's scope add: its Ambiguity Gate line `hotfix.md:111` also demands `approved: true`, and `assert_story_files` accepts `HOTFIX-\d+` §1 ids.

Why directly after `status:`:
- `CR.md:36-37` and `spike.md:52-53` use the same placement.
- It keeps the sealed -09 test E5-4 green unchanged. E5-4 asserts `/^status: .*\napproved: true$/m` on `approveProbeStory(canonical story.md)` (`test/scripts/clean-room-evidence.red.node.test.ts:890-903`).

The line is bare, with no comment. Post-delta sha256 values, computed from first principles:
- epic `d99b995b04043a425126b57af4e312e67d091828b05962bff3ac458411c67a1b`
- story `e77368548efac3258b289ca566657b3535a77fbbce446fc28c604e5815baa5c5`
- hotfix `38edde0df8a4eadf5baaa470abf32fc2f5f742c8bd7e9fc4a2d4fff799a8b471`

Any other byte change fails the parity rows.

**Consumers that scaffold, flip or parse `approved`:**

| Consumer | Today | Ruling |
|---|---|---|
| `cleargate new` (`src/commands/new.ts:175-190,315-333`) | substitutes placeholders only | no change; `approved: false` flows through verbatim |
| `scripts/clean-room/probe-items.mjs:65-68` `approveProbeStory` | **inserts** `approved: true` after the first `status:` line | **FIX (danger).** With a scaffolded `approved: false` it would write a **duplicate YAML key**: `js-yaml` throws "duplicated mapping key", so gate, stamp and `parseFrontmatter` all fail. Consumers: -09 `claude-baseline.mjs:275`, -10 `codex-hooks.mjs` C4 (M5.md:396,420), -13 (M6.md:692,770,954). New shape below |
| `probe-items.mjs:24-56` `authorProbeEpic` | inserts `approved_by`/`approved_at` after `status:` | no change. The epic keeps `approved: false` after them; no gate reads an epic's own `approved`, and E5-1's regex `/^status: .*\napproved_by: …\napproved_at: …$/m` still matches |
| `claude-baseline.mjs` (`sprint init` in the room `:291-301`) | FAIL-KNOWN via `--known-fail` | no code change; see (d) |
| Gate predicates (`readiness-gates.md`, `src/lib/readiness-predicates.ts`) | no criterion reads a story's, epic's or hotfix's own `approved`. `frontmatter(parent_ref).approved == true` reads the *parent* through the positional `readFrontmatterFromFile` (`readiness-predicates.ts:434-462`) | no change here; the positional parent read goes to follow-up BUG-098 |
| Wiki ingest (`src/wiki/synthesis/open-gates.ts:24-31`) | Gate-1 filter covers `proposals` only | no change |
| `push.ts:271-277` | one message for absent and false | **FIX**, see (c) |
| stamp paths (`stamp-frontmatter.ts`, `stamp-tokens.ts`) | keys preserved through the re-serialize | no change (BUG-067 e2e `test/e2e/frontmatter-authoring.red.integration.node.test.ts` covers the round trip) |
| `lifecycle-reconcile.ts:912` `setFrontmatterFieldAtomic('approved','true')` (2.6d) | regex replace of an existing key, so no duplicate; positional fence at `:777` | no change here; the positional `:777` goes to follow-up BUG-098 |
| `doctor.ts:748` (`runSessionStart` `:587`) and `:1031` (`runCanEdit` `:981`) | a `raw.trimStart().startsWith('---')` sniff (`:738`, `:1022`) **skips** instructions-led items before `parseFrontmatter` | **FIX (FW-A2)**: delete both sniff lines. `parseFrontmatter` already locates the fence or throws, and the existing `catch { continue; }` handles no-frontmatter files. After the fix, an approved fresh story unblocks enforce-mode `--can-edit` and suppresses the planning-first reminder, and a failing instructions-led item appears in the SessionStart blocked list. `doctor.ts:854` (`--pricing`) is **LEAVE** → BUG-098 |
| `sync.ts:478` | `=== true` | no change |
| Fixtures that snapshot a fresh epic, story or hotfix | M2 init baseline (5 files × 5 scenarios); `gate-section-index-pinning` S1c two-tree parity; `template-sync-fields` (integration) live === mirror; `new-command` (computed at runtime from the template) | delta rows below; parity is satisfied by the outer mirror |

**`approveProbeStory` (pinned).** The status anchor stays first, so the sealed E5-6 throw on a missing status line is unchanged.
```js
export function approveProbeStory(raw) {
  if (!STATUS_LINE_RE.test(raw)) throw anchorNotFound('story status line');
  const approvedLines = raw.match(/^approved:.*$/gm) ?? [];
  if (approvedLines.length > 1) throw anchorNotFound('single story approved line');
  if (approvedLines.length === 1) return raw.replace(/^approved:.*$/m, 'approved: true');
  return raw.replace(STATUS_LINE_RE, (line) => `${line}\napproved: true`); // legacy templates (pre-BUG-090 refs)
}
```
The whole-file scan is safe: the only `approved:` mention in the canonical `story.md` `<instructions>` block is `- [ ] \`approved: true\`…`, which does not start at column zero with `approved:`.

**M2 init-parity: 5 `SANCTIONED_BASELINE_DELTAS` rows.**
- Append them after -10's rows (and any M5-A33+ rows) in `test/helpers/init-fixture.ts`, with `item: 'BUG-090'` and `scenarios: 'all'`.
- They are strict on both sides (M3-A8). Do not re-capture the baseline.

| rel | baselineHash | currentHash |
|---|---|---|
| `.cleargate/templates/epic.md` | `'bb33870663319bad4e4cd45bc84701b516f2abd782206523417daec9005257ac'` | literal `'d99b995b04043a425126b57af4e312e67d091828b05962bff3ac458411c67a1b'` |
| `.cleargate/templates/story.md` | `'862099f8bce51664a0fe66c9f33a2a623cfeec6e4fe4eafaf3ec59212ecc9f21'` | literal `'e77368548efac3258b289ca566657b3535a77fbbce446fc28c604e5815baa5c5'` |
| `.cleargate/templates/hotfix.md` | `'2a75055eb5d0e9591e7741d3af8ff7917303863a5ee649c79aeffc8ac49195e2'` | literal `'38edde0df8a4eadf5baaa470abf32fc2f5f742c8bd7e9fc4a2d4fff799a8b471'` |
| `.cleargate/scripts/assert_story_files.mjs` | `'ef7b02262e9a9fbb3ad4a52548f01cee7f8d62577c98c9303612b771d808441d'` | `currentPinSubstitutedHash(rel)`, refused when equal to the baseline (BUG-085 pattern, `init-fixture.ts:498-510`); returns `'<BUG-090 assert_story_files.mjs delta not landed: canonical still …>'` |
| `.cleargate/scripts/close_sprint.mjs` | `'76098f3625a1938da6fe6e1a09935ff7e7f5c25f899509f70f92244156af9246'` | same refuse-baseline pattern |

- The template rows pin literals because their post-delta bytes are fully specified. The script rows derive from canonical because the post-delta bytes are the Developer's (flashcard 2026-09-26: refuse the baseline, or pin a literal).
- Mode is 644 on both sides.
- The synthetic Scenario-15 fixtures (`init-host-snapshot.red.node.test.ts:214-340`) skip absent-both-sides rows through the no-`tree/` rule (`init-fixture.ts:641`), so they stay 13/13.
- A new payload file is **not** expressible in this mechanism: a one-sided entry throws (`:642-647`). That is why the locator lives in `assert_story_files.mjs` and not in a new `scripts/lib/*.mjs`.

#### (c) `push.ts:271-277` wording

The existing message is pinned by `test/commands/push.node.test.ts:228-248` (`toContain('approved: false')`) and `test/commands/sync-acquire.node.test.ts:176-208` (`includes('approved: false')`). Both stay green.

```ts
if (!isSprintReport && fm['approved'] !== true) {
  const hasKey = Object.prototype.hasOwnProperty.call(fm, 'approved');
  stderr(hasKey
    ? `Error: push refused — ${itemId} has approved: ${JSON.stringify(fm['approved'])}. Set approved: true in frontmatter after review.\n`
    : `Error: push refused — ${itemId} has no approved key in its frontmatter. Add approved: true after review.\n`);
  exit(1);
  return;
}
```
`JSON.stringify(false)` is `false`, so the false-path text is byte-identical to today's. `"true"` (a string) now renders as `has approved: "true"` instead of the misleading `false`. The missing-key test at `push.node.test.ts:250-262` asserts only exit and no-MCP, so it stays green.

#### (d) Clean-room harness known-fail

- **Behaviour when `--known-fail sprint-init=BUG-090` is declared and the check PASSES.**
  - `decideRun` (`scripts/clean-room/evidence.mjs:364-400`) relabels a column only when it equals `'FAIL'`. A PASS stays PASS, no reason is recorded, and `result` is unaffected; `sprint-init` is in `NON_GATING_CHECKS` (`:76-82`).
  - `parseKnownFail` (`claude-baseline.mjs:394-404`) reads only the CLI flag; **there is no harness default**.
  - So a stale flag is silently harmless. It is dropped anyway so every command line tells the truth (FW-A7..A11). No harness code changes.
- **Updates.**
  - `waves.json` RS-4 and RS-CLOSE drop the flag (see the waves.json section).
  - M5-A6's -11 bullet and M5-A12 step 2 drop it (FW-A7, FW-A8).
  - M5-A13 is retired (FW-A9).
  - M6 RS-5 and its carry notes drop it (FW-A10).
  - -10's own QA-Verify run (M5-A6, first bullet) keeps it, because it runs before BUG-090.
- **Append-only.** `clean-room-evidence.md` Run 1 (`sprint-init` FAIL-KNOWN (BUG-090) ×2) is never edited. RS-4's Run 2 records `sprint-init` PASS ×2.
- **What changes inside each room once `sprint init` passes** (checked against the code; the QA-Verify harness run is the witness):
  - `.active`=SPRINT-01 exists during S1, S2 and S3.
  - `pre-edit-gate.sh:115-119` takes the sprint-active bypass (exit 0). `preToolUseVerdict` checks exit codes only.
  - The sentinel's flashcard gate arms. `SPRINT-01/` has no `*-dev.md`/`*-qa.md`, so there are zero cards and no block (`pending-task-sentinel.sh:91-102`).
  - The ledger row lands in `SPRINT-01/token-ledger.jsonl`. `findLedgerFiles` scans every `sprint-runs/*/` (`claude-baseline.mjs:108-117`).
  - `runActiveSprintDrive` restores `.active`=SPRINT-01 (`:176-209`).
  - The machine checks (tree-comparison, doctor, verify-install) run before any probe (`:486-496`), so they are unaffected.

#### (e) Live mirrors and the outer shell test

- **Who, when, how.**
  1. The orchestrator commits FW-A1..A4 to the BUG-090 file on `sprint/S-41` and re-gates it with `node OUTER/cleargate-cli/dist/cli.js gate check <file>`. Only then does it cut `.worktrees/BUG-090` on `story/BUG-090` from `sprint/S-41` (flashcard #worktree #planning).
  2. The **Developer**, after the cli Dev commit, byte-copies the 5 canonical files. Copies with `cp` from `CLI/scaffold/core/.cleargate/{scripts/assert_story_files.mjs,scripts/close_sprint.mjs,templates/epic.md,templates/story.md,templates/hotfix.md}` to the same rel paths under `.worktrees/BUG-090/.cleargate/`.
  3. `cmp` each pair; all 5 must be identical.
  4. Commit all 5 in **one** outer commit on `story/BUG-090`. The atomic import pair requires this.
- **Surface gate.** `file_surface_diff.sh:106-157` derives `story_num="${story_id#STORY-}"`. A `BUG-*` active item therefore resolves no file, and the gate skips (fail-open for bugs). Observation only; follow-up.
- **Outer shell test** `.cleargate/scripts/test/test_assert_story_files.sh`, byte-identical to canonical, 15/15 at base:
  - **not extended** (FW-A3): node:test is the sprint runner, and the new node reds cover every Gherkin case;
  - `scripts/test/**` is excluded from the payload (`manifest-builder.ts:86-95`);
  - run it unchanged as an anchor, in the cli clone (`bash cleargate-cli/scaffold/core/.cleargate/scripts/test/test_assert_story_files.sh`) and in the outer worktree after the mirror (`bash .cleargate/scripts/test/test_assert_story_files.sh`). Both must be 15/15.

#### Files (BUG-090, complete)

- **cli, modify:**
  - `scaffold/core/.cleargate/scripts/assert_story_files.mjs`
  - `scaffold/core/.cleargate/scripts/close_sprint.mjs`
  - `scaffold/core/.cleargate/templates/{epic,story,hotfix}.md`
  - `scripts/clean-room/probe-items.mjs`
  - `src/commands/push.ts`
  - `src/commands/doctor.ts`
  - `test/helpers/init-fixture.ts`
  - `test/commands/push.node.test.ts`
  - `test/commands/doctor.node.test.ts`
  - `test/commands/doctor-session-start.node.test.ts`
- **cli, create:**
  - `test/scripts/frontmatter-fence-parity.red.node.test.ts`
  - `test/scripts/assert-story-files-fence.red.node.test.ts`
  - `test/scripts/close-sprint-fence.red.node.test.ts`
  - `test/scripts/template-approved-key.red.node.test.ts`
  - `test/e2e/sprint-init-fresh-install.red.integration.node.test.ts`
- **outer (`.worktrees/BUG-090`), modify:** `.cleargate/scripts/assert_story_files.mjs`, `.cleargate/scripts/close_sprint.mjs`, `.cleargate/templates/{epic,story,hotfix}.md`, plus the item file and reports per usual practice.

#### QA-Red (BUG-090) — red commit on cli `story/BUG-090`, cut from cli `main` after the BUG-097 merge

Tests spawn or import **canonical** paths through `canonicalPath()` (`test/helpers/scaffold-roots.ts:36-43`), never `META_ROOT/.cleargate/scripts`, so the reds go red→green inside the cli branch (Rule 15).

1. **`test/scripts/frontmatter-fence-parity.red.node.test.ts`** (13 tests)
   - Setup: `import()` of `pathToFileURL(canonicalPath('.cleargate/scripts/assert_story_files.mjs'))` for the export `locateFrontmatterFence`, and `src/lib/frontmatter-locator.ts` for `locateFrontmatter`.
   - For each fixture, both return deep-equal spans, or both `null`, or both throw with the same `message`.

   | # | Fixture | Expected |
   |---|---|---|
   | F1 | `---\na: 1\n---\nbody` | span |
   | F2 | `<instructions>\nx\n</instructions>\n\n---\na: 1\n---\n` | span |
   | F3 | `---\r\na: 1\r\n---\r\n` | CRLF span |
   | F4 | instructions + CRLF | span |
   | F5 | `﻿---\na: 1\n---\n` | `start: 1` |
   | F6 | P1: a phantom block inside `<instructions>` | the real span |
   | F7 | P2: a phantom block at offset 0 before `<instructions>` | the phantom span, `start 0` |
   | F8 | a fenced ```yaml example holding `---` before the header | the real span |
   | F9 | `# T\n\n## H\n` | `null` |
   | F10 | `---\na: 1\n` | throws missing closing |
   | F11 | `<instructions>\nabc\n` | throws unterminated instructions |
   | F12 | `----\n  ---\n---suffix\n` | `null` |
   | F13 | "```yaml\n---\nx: 1\n---\n" | throws unterminated fence |

   Red 13/13: the export is missing, so the call throws TypeError.
2. **`test/scripts/assert-story-files-fence.red.node.test.ts`** (9 tests)
   - Setup: spawn `node <canonical assert_story_files.mjs> <sprint file>` with `CLEARGATE_REPO_ROOT=<tmp fixture>`. The fixture has a `pending-sync/STORY-900-0N_x.md` and a sprint file whose `## 1. Consolidated Deliverables` table names that one id (shape as in `test/scripts/fixtures/sprint-multi-type`).
   - Expected lines:
     - `OK: all 1 work-item file(s) present, approved, and non-empty in pending-sync/ or archive/`
     - `UNAPPROVED (1): <id>`
     - `STUB-EMPTY (1): <id>`

   | # | State at red commit | Fixture | Expected |
   |---|---|---|---|
   | A1 | red | instructions-led, `approved: true`, LF | exit 0, OK |
   | A2 | anchor | `---`-led approved | exit 0 |
   | A3 | red | instructions-led CRLF approved | exit 0 |
   | A4 | anchor | `---`-led CRLF approved | exit 0 |
   | A5 | red | P1 phantom inside instructions + real approved | exit 0 |
   | A6 | anchor, stays green | P2 corruption signature + real `approved: true` below | exit 1, UNAPPROVED (the ruling) |
   | A7 | anchor | instructions-led `approved: false` | exit 1, UNAPPROVED (Gherkin 6) |
   | A8 | anchor | no frontmatter, with a `## ` heading | exit 1, UNAPPROVED; stderr has no `STUB-EMPTY` |
   | A9 | red | instructions-led, approved, a `## Guidance` line inside `<instructions>`, and no `## ` in the body | exit 1, STUB-EMPTY; base says UNAPPROVED |

   Red 4 (A1, A3, A5, A9); anchors 5.
3. **`test/scripts/close-sprint-fence.red.node.test.ts`** (4 tests)
   - Setup: spawn canonical `close_sprint.mjs SPRINT-900` with:
     - `CLEARGATE_REPO_ROOT`=fixture;
     - `CLEARGATE_SPRINT_DIR`=`<fx>/.cleargate/sprint-runs/SPRINT-900`;
     - `CLEARGATE_STATE_FILE`=its `state.json`: one story `Done`, schema-valid, same shape as the prototype;
     - `CLEARGATE_SKIP_LIFECYCLE_CHECK=1`, `CLEARGATE_SKIP_WORKTREE_CHECK=1`, `CLEARGATE_SKIP_MERGE_CHECK=1`, `CLEARGATE_SKIP_BUNDLE_CHECK=1`.
   - No `--assume-ack`: the script halts at Step 4 and exits 0, with every write inside the fixture.
   - Use unquoted `story_id` and `sprint_cleargate_id` values. Step 2.9 compares raw values (`:1040`); follow-up.

   | # | State at red commit | Scenario | Expected |
   |---|---|---|---|
   | C1 | red | Step 2.9: instructions-led `STORY-900-01`, `sprint_cleargate_id: SPRINT-900`, a multi-line `deferred_verification` with `command: node probe.mjs` and `blocks: close`, no result file; add `CLEARGATE_SKIP_PARENT_ROLLUP=1` | exit 1; stderr has `Step 2.9 failed: 1 deferred verification(s) not green:` and `  - STORY-900-01: command="node probe.mjs" reason=no result file`. Base stdout: `Step 2.9 passed: no deferred verifications declared.` |
   | C2 | anchor | the same as a `---`-led file in SPRINT-41's exact shape (description/command/blocks keys) | the same two stderr lines |
   | C3 | red | Step 2.6c flip (see stub below): an auto-flip verdict for instructions-led `EPIC-900` (`status: "Active"`, terminal_children `['STORY-900-01']`) | stdout has `Step 2.6c: EPIC-900 status Active → Completed (1/1 children Completed: STORY-900-01) → archived at archive/EPIC-900_probe.md` and `Step 2.6c passed: 1 parent(s) auto-flipped; no halts.`; archived bytes === `original.replace('status: "Active"', 'status: Completed')` (preamble byte-identical); the pending-sync copy is gone. Base stderr: `Step 2.6c warning: parent rollup unavailable: No frontmatter in` |
   | C4 | red | Step 2.6c already-Completed: only a `no-op` verdict for instructions-led `EPIC-901` (`status: "Completed"`) | stdout has `Step 2.6c: EPIC-901 already Completed but in pending-sync → archived at archive/EPIC-901_done.md`; archived bytes === the original |

   - C1 and C2 add `CLEARGATE_SKIP_PARENT_ROLLUP=1`. C3 and C4 add `CLEARGATE_SKIP_DEFERRED_VERIFY_CHECK=1` and do **not** set `SKIP_PARENT_ROLLUP`.
   - **2.6c stub (measured working):**
     - `<fx>/node_modules/cleargate/package.json` = `{"type":"module"}`.
     - `<fx>/node_modules/cleargate/dist/lib/lifecycle-reconcile.js` exports `async function walkActiveParents()`, returning fixed verdict objects `{verdict, parent_id, parent_path:<abs>, current_status, terminal_children}`.
     - This resolves because `resolveCliBin(scaffold/core)` misses and then falls back to `REPO_ROOT` (`close_sprint.mjs:235-244,604-607`). No dependency on a built dist.
   - Red 3 (C1, C3, C4); anchor 1.
4. **`test/scripts/template-approved-key.red.node.test.ts`** (7 tests)

   | # | State at red commit | Test |
   |---|---|---|
   | T1 | red | Canonical `epic.md`: the frontmatter located by `parseFrontmatter` has `approved === false`; the located block has exactly one `^approved:` line; the raw line immediately after its single `^status: ` line is `approved: false` |
   | T2 | red | T1 for `story.md` |
   | T3 | red | T1 for `hotfix.md` |
   | T4 | anchor | `Bug.md`, `CR.md` and `spike.md` all locate `approved === false` |
   | T5 | red | Input = canonical `story.md` with every `^approved:.*\n` line removed, then `approved: false` inserted after the status line. `approveProbeStory(input)` has exactly one `^approved:` line, `approved: true`, directly after `status:`; the `<instructions>` slice is byte-identical. Base: two approved lines |
   | T6 | red | Input with two `^approved:` lines throws `/probe-items: anchor not found: single story approved line/` |
   | T7 | anchor | Legacy input (every `^approved:` line removed): output matches `/^status: .*\napproved: true$/m` with one approved line |

   Red 5; anchors 2.
5. **`test/commands/push.node.test.ts`** (+2 tests, reusing `makeLocalFile` and `makeTestSeams`)
   - **P1 [red]:** no `approved` key. Expect exit 1 and no MCP call; stderr contains `has no approved key` and does not contain `has approved: false`.
   - **P2 [red]:** `approved: 'true'` (a string). Stderr contains `has approved: "true"`.
6. **`test/commands/doctor.node.test.ts`** (+1 test)
   - **D1 [red]** `runCanEdit('src/foo.ts', dir, …)`. Pending-sync holds `<instructions>\nx\n</instructions>\n\n---\nstory_id: "STORY-001"\napproved: true\n---\n\n# Story\n` with no `implementation_files`. Expect no exit code, and output that contains `allowed`. Base output: `blocked: no_approved_stories`.
7. **`test/commands/doctor-session-start.node.test.ts`** (+2 tests)
   - **D2 [red]** `runSessionStart(dir, out)` with that instructions-led approved story. Output does not include `Triage first, draft second:`.
   - **D3 [red]** An instructions-led item with `cached_gate_result: {"pass":false,"failing_criteria":[{"id":"no-tbds"}],"last_gate_check":"2026-04-19T10:00:00Z"}`. Output names its id and includes `no-tbds`.
8. **`test/e2e/sprint-init-fresh-install.red.integration.node.test.ts`** (2 tests, integration tier, run named)
   - **I1 [red]:**
     1. `r = await runInitScenario('fresh')`, then `newHandler` for `epic probe`, `story probe-story --epic EPIC-001` and `sprint probe`, with `cli.cwd = r.dir` and exit 0 swallowed. `newHandler` calls `exit(0)` on success (`new.ts:349`).
     2. Assert the scaffolded epic and story each hold exactly one `^approved: false$` line inside their located frontmatter.
     3. Apply `approveProbeStory` (instructions intact) and `declareProbeSprint`.
     4. Spawn `<r.dir>/.cleargate/scripts/init_sprint.mjs SPRINT-01 --stories STORY-001-01` with `CLEARGATE_REPO_ROOT=r.dir`.
     5. Expect exit 0; `<r.dir>/.cleargate/sprint-runs/.active` equals `SPRINT-01` after trim; `SPRINT-01/state.json` holds `STORY-001-01`.
     - Base: `UNAPPROVED (1): STORY-001-01`, exit 1.
   - **I2 [red]:** Same install. Strip the story's `<instructions>…</instructions>` block and flip with `raw.replace(/^approved: false$/m, 'approved: true')`, not `approveProbeStory`. Run `init_sprint.mjs`: exit 0. At base the replace is a no-op, so the result is UNAPPROVED.
9. **`test/helpers/init-fixture.ts`** (+5 delta rows, as in (b))
   - Red at the red commit on every run of `claude-adapter-init-parity.red.integration.node.test.ts` (5) and `init-host-parity.red.integration.node.test.ts` (15), when run with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`. Green after Dev.

**Totals (BUG-090).**
- Default tier +38: 30 red at the red commit, 8 anchors (A2, A4, A6, A7, A8, C2, T4, T7).
- Integration +2, both red.
- Both parity files flip, 20 runs, with no count change.

**Anchors that must stay green (solo, from `cleargate-cli`):**
- `test/scripts/clean-room-evidence.red.node.test.ts` 60/60 (E5-1, E5-4, E5-6 unchanged)
- `test/lib/frontmatter-locator.red.node.test.ts` 11/11
- `test/scripts/test_assert_work_item_files.node.test.ts` 20/20 (live script; `---`-led fixtures)
- `test/commands/push.node.test.ts` (existing 7)
- `test/commands/sync-acquire.node.test.ts` 9/9
- `test/commands/doctor.node.test.ts` (existing 39)
- `test/commands/doctor-session-start.node.test.ts` (existing)
- `test/commands/init-host-snapshot.red.node.test.ts` 13/13
- `test/scripts/status-vocab-phase-b.red.node.test.ts` (it runs `prebuild` itself)
- `test/lib/work-item-id.node.test.ts`
- `test/scripts/no-inline-id-regex.node.test.ts`
- `test/commands/no-exec-mode-vocab.node.test.ts`
- `-10`'s `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` (imports `probe-items.mjs`)
- canonical `test_assert_story_files.sh` 15/15
- `npm run typecheck`

**Expected pre-merge reds (Rule 15; name them, never "fix").** These tests hardcode `META_ROOT = <cli>/..` (the outer MAIN checkout), so they compare canonical against the unmerged live mirror:
- `test/docs/gate-section-index-pinning.node.test.ts` S1c two-tree parity for `epic.md`, `story.md` and `hotfix.md` (`:97-100`).
- `test/scripts/close-sprint-step-2-6c.red.node.test.ts` Scenario 5, live vs canonical `close_sprint.mjs` (`:454-468`).
- `test/scripts/close-sprint-step-7-4.red.node.test.ts` Scenario 3 (`:192`).
- Integration tier, named runs only: `test/scripts/template-sync-fields.integration.node.test.ts` "live === mirror"; `test/scaffold/canonical-live-parity.red.integration.node.test.ts` scripts and templates cases.

All of these must be green in the DevOps post-merge suite, which runs after the outer half is merged first.

**Rule 16 (BUG-090 edits outer live templates and scripts).**
- Developer and QA-Verify run every file from `command grep -rl CLEARGATE_META_ROOT cleargate-cli/test` (21 test files, excluding `helpers/scaffold-roots.ts`) with `CLEARGATE_META_ROOT=<.worktrees/BUG-090>`, one at a time.
- Accepted non-green results are limited to the flashcard-2026-09-26 ENOENT class: an outer worktree has no gitignored `cleargate-cli/`. Each must be named.
- `test/scripts/close-sprint-assume-ack-guard.node.test.ts` under the override spawns the worktree's `close_sprint.mjs`. That makes it the pre-merge witness that the live import pair links.

**Loop depth: full loop — QA-Red → live TPV → Developer → QA-Verify (with one live clean-room harness run) → live Architect post-flight → DevOps (two-repo).**

Why nothing is skipped:
- The item edits the script that will close **this** sprint (Steps 2.6c and 2.9).
- It edits 5 installed payload files under hash-anchored parity rows.
- It edits a gate-enforcement consumer (`doctor --can-edit`).
- It creates a cross-repo twin whose two scripts are coupled by an ESM import.
- It changes a harness probe consumed by -09, -10 and -13.

The **TPV checks**, in addition to the standard five:
1. Both parity imports resolve: canonical `.mjs` and TS.
2. Each spawn's env set reaches the named step. C1 and C3 must print their `Step 2.9` / `Step 2.6c` lines, not a Step-1 error.
3. The stub reconciler path resolves through the `REPO_ROOT` fallback.
4. The delta-row script `currentHash` refuses the baseline.
5. No sealed -09 or -10 test file is edited.
6. I1 runs `init_sprint.mjs` from the **room**, not from the meta repo.

The **post-flight checks:**
- the census parity (the shipped script against the TS locator);
- the splice correctness at `:587`;
- the no-new-file rule;
- the import coupling;
- the `approveProbeStory` consumers.

**QA-Verify additions.**
- One live harness run, per BUG-090 §5 ("E2E: covered by the -09 clean-room harness `sprint-init` check once fixed"): `(cd <literal mktemp dir> && node /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/scripts/clean-room/claude-baseline.mjs run --ref story/BUG-090 --label "QA BUG-090")`.
  - No `--evidence`, no `--known-fail`, never in the background.
  - The cli checkout sits on `story/BUG-090`, so the imported `probe-items.mjs` matches the ref.
  - Must exit 0.
  - Every gating row reproduces -10's QA-Verify rows:
    - `agents-md-exposure`: noflag N/A, all PASS;
    - `host-set`, `claude.live.agents-skills-parity` and `verify-install-all-plain` (all): PASS;
    - `sprint-init`: **PASS ×2**;
    - `active-sprint` cell (M5-A8): `.active after sprint-init: present` ×2.
  - Record the `summary.json` rows in `reports/BUG-090-qa.md`.
  - A gating row that newly FAILs means an active-sprint side effect: FAIL QA and route back to the Architect.
- Anchors and Rule 16 as above. M2 baseline hash `bdc4bb1a…62b2`, 425 files.

**DevOps (BUG-090, one turn; Rule 15 order; mirrors BUG-085's practice).**
- **D1** Pre-merge: copy the current payload for the identity diff, `cp -R CLI/templates/cleargate-planning /private/tmp/cg-s41-fw-payload-pre-090` (the name matches neither leak prefix).
- **D2** Merge the outer `story/BUG-090` → `sprint/S-41` (`--no-ff`) **first**. Then run `(cd /Users/ssuladze/Documents/Dev/ClearGate && node .cleargate/scripts/close_sprint.mjs; echo $?)`: it must print usage and exit 2. A SyntaxError means the import pair is broken, and DevOps halts. Also `node .cleargate/scripts/assert_story_files.mjs` must exit 2 with usage.
- **D3** Merge the cli `story/BUG-090` → `main` (`--no-ff`) **second**, explicit paths.
- **D4** Full suite once, expecting **`T10+54` tests / `P10+54` pass / 0 fail / 2 skipped** (cumulative over the wave: +3 +13 +38). Then the Rule-14 revert. If a failure names `dist/cli.js`, re-run that file solo after BD (flashcard 2026-09-25); it must pass.
- **D5** BD. `prebuild` payload count unchanged (80), `build-manifest` count unchanged.
- **D6** Payload identity **changes**:
  - `diff -r /private/tmp/cg-s41-fw-payload-pre-090 CLI/templates/cleargate-planning` lists exactly `.cleargate/scripts/assert_story_files.mjs`, `.cleargate/scripts/close_sprint.mjs`, `.cleargate/templates/{epic,story,hotfix}.md` and `MANIFEST.json`;
  - the same 5 files change in the `templates/scaffold/core/` split view, plus its per-root `MANIFEST.json`;
  - `templates/scaffold/hosts/codex/**` is unchanged;
  - `node scripts/verify-pack.mjs` OK at **`V10` entries** (no entry added or removed).
- **D7** Post-merge live witnesses, read-only:
  1. `cmp` live vs canonical for the 5 files.
  2. `node cleargate-cli/dist/cli.js doctor` exits 0 with no `scaffold drift:` line.
  3. `bash .cleargate/scripts/test/test_assert_story_files.sh` gives 15/15.
  4. Named integration runs: `canonical-live-parity.red.integration` (all cases, incl. 5d, which is green since RS-4a) and `template-sync-fields.integration`.
  5. The M2 parity pair with `CLEARGATE_INIT_BASELINE`: 5/5 and 15/15.
  6. `test/e2e/sprint-init-fresh-install.red.integration.node.test.ts`: 2/2.
  7. `test/e2e/frontmatter-authoring.red.integration.node.test.ts` after BD (templates changed; it spawns the built CLI through the rendered hook).
  8. The Step-2.9 equivalence census with the shipped script: `(cd /Users/ssuladze/Documents/Dev/ClearGate && node --input-type=module -e "…")`. It imports `./.cleargate/scripts/assert_story_files.mjs` and walks `.cleargate/delivery/{pending-sync,archive}/*.md`. For each file, `locateFrontmatterFence` inside try/catch and the `parseFrontmatterFields` rule. Expected: 0 throws; the SPRINT-41 deferred set equals `[STORY-058-09, STORY-058-10, STORY-058-13]`.
  9. M2 baseline `bdc4bb1a…62b2`, 425 files.
- **D8** No live `.claude/` re-sync: no `scaffold/hosts/claude/**` file changed. No restart. The live templates and scripts are tracked outer files, synced by the D2 merge itself.
- **D9** Orchestrator actions after the merge:
  - add Adjacent-Implementations rows: `locateFrontmatterFence(raw)` and `assertWorkItemApproved(filePath)` from `.cleargate/scripts/assert_story_files.mjs` (close_sprint imports the first); BUG-096 `trackedTmpDirs()` (`test/helpers/init-fixture.ts`); BUG-097 `buildDiffPreview` (`src/commands/stamp.ts`);
  - apply the waves.json edits;
  - append the §4 log line.

## Story-text amendments (the orchestrator applies each on `sprint/S-41` before that item's QA-Red seals, then re-gates it with `node OUTER/cleargate-cli/dist/cli.js gate check <file>`)

**FW-A1 — BUG-090 §5 Gherkin.**
- In the Scenario Outline Examples, replace the row `| a demoted phantom fence before <instructions> |` with `| a phantom fence block inside the <instructions> block |`.
- Append, after "An unapproved instructions-led story is still rejected":
```gherkin
  @rules
  Scenario: A BUG-067-corrupted item is read from its first fence
    Given an approved story whose file carries a phantom `---` block before its <instructions> block
    When assert_story_files reads it
    Then it reports UNAPPROVED and exits 1, reading the same block `gate check` reads

  @interfaces
  Scenario: doctor reads approval behind an instructions block
    Given an approved <instructions>-led story in pending-sync and no active sprint
    When `doctor --can-edit src/x.ts` and `doctor --session-start` run
    Then can-edit allows the edit and the planning-first reminder is not printed

  @interfaces
  Scenario: Step 2.6c flips an instructions-led epic
    Given the lifecycle reconciler returns auto-flip for an <instructions>-led epic
    When close_sprint.mjs Step 2.6c runs
    Then the epic's status becomes Completed, its <instructions> block is byte-identical, and it is archived
```
- Replace the §2 Edge-conditions phrase "(the locator must pick the real fence, as BUG-067's locator does)" with "(a phantom block *inside* `<instructions>` is opaque and the real fence is read; a phantom block *before* `<instructions>`, the BUG-067 corruption signature, is the first fence, so the item reads UNAPPROVED — parity with BUG-067's locator, measured 2026-09-26)".
- Replace the test-count table: Unit tests 38 (default tier); Integration tests 2, plus the two M2 parity files; E2E: the -09 harness `sprint-init` row, once at QA-Verify and again at RS-4.

**FW-A2 — BUG-090 §4 scope adds** (owner directive 2026-09-26). Append to "Investigate / Modify":
- `cleargate-cli/scaffold/core/.cleargate/templates/hotfix.md` and its live mirror: `approved: false` after `status:`.
- `close_sprint.mjs:250` (`readFmStatus`) and `:587` (`setFrontmatterStatusAtomic`): the same locator (Step 2.6c).
- `cleargate-cli/src/commands/doctor.ts:738,1022`: delete the positional sniffs (the approval readers for `--session-start` and `--can-edit`).
- `cleargate-cli/scripts/clean-room/probe-items.mjs` `approveProbeStory`: flip the scaffolded key in place (prevents a duplicate YAML key).
- `cleargate-cli/test/helpers/init-fixture.ts`: 5 sanctioned-delta rows.

Replace "This is the only `src/` change" with "`src/` changes: `push.ts` (wording) and `doctor.ts` (two sniff deletions)".

Site census rulings for the other scripts, recorded here per the bug's own task row:
- `dedupe_frontmatter.mjs:60`: leave, follow-up.
- `prefill_report.mjs:41`: leave, agent reports only.
- `prep_qa_context.mjs:125`: leave, dead code.
- `prep_reporter_context.mjs:84`: leave, follow-up.
- `close_sprint.mjs:711`: leave, already position-independent.

**FW-A3 — BUG-090 §5 command.** Replace it with:
- `cd cleargate-cli`, then each of these solo via `npm run test:file --`:
  - `test/scripts/frontmatter-fence-parity.red.node.test.ts`
  - `test/scripts/assert-story-files-fence.red.node.test.ts`
  - `test/scripts/close-sprint-fence.red.node.test.ts`
  - `test/scripts/template-approved-key.red.node.test.ts`
  - `test/commands/push.node.test.ts`
  - `test/commands/doctor.node.test.ts`
  - `test/commands/doctor-session-start.node.test.ts`
  - `test/e2e/sprint-init-fresh-install.red.integration.node.test.ts`
- `bash .cleargate/scripts/test/test_assert_story_files.sh` (unchanged; it is a regression anchor and is not extended).

**FW-A4 — BUG-090 Task Breakdown.** Replace the 6 rows with:
- `- [ ] QA-Red: fence-parity table (script vs TS locator), assert_story_files fence spawns, close_sprint Step 2.9 + 2.6c spawns, template approved-key + approveProbeStory flip, push wording, doctor can-edit/session-start, fresh-install sprint-init integration, 5 M2 sanctioned-delta rows`
- `- [ ] Export locateFrontmatterFence (JS port of frontmatter-locator.ts) and assertWorkItemApproved from assert_story_files.mjs; use them at :162`
- `- [ ] close_sprint.mjs imports locateFrontmatterFence; fix :250, :587 (span splice), :1035, :1053 (null or throw → skip)`
- `- [ ] Scaffold approved: false directly after status: in epic.md, story.md and hotfix.md`
- `- [ ] approveProbeStory flips the scaffolded approved key in place; throws on two approved lines`
- `- [ ] push.ts: absent-key wording; a present non-true value is rendered with JSON.stringify`
- `- [ ] doctor.ts: delete the positional sniffs in runSessionStart and runCanEdit`
- `- [ ] Byte-copy the 5 canonical files to the live mirror in one outer commit; typecheck and targeted tests`

**FW-A5 — BUG-096.**
- §4/§5: the new test file is `cleargate-cli/test/helpers/init-fixture-cleanup.red.node.test.ts`.
- Task Breakdown: insert, after row 2, `- [ ] Export trackedTmpDirs() from init-fixture.ts (test-only snapshot of the cleanup set)`.

**FW-A6 — BUG-097.**
- §4: "the matching existing test files" now reads: the reds are appended to `test/commands/gate-unit.node.test.ts`, `test/commands/stamp.node.test.ts`, `test/wiki/query.node.test.ts` and `test/commands/scaffold-lint.node.test.ts`, with no new files.
- Task Breakdown: insert `- [ ] Export buildDiffPreview from stamp.ts for unit tests` before the stamp row.

**FW-A7 — M5-A6, second bullet (-11 QA-Verify).** The command drops `--known-fail sprint-init=BUG-090`. The expected rows add `sprint-init` PASS ×2.

**FW-A8 — M5-A12, step 2.**
- The command becomes `(cd /Users/ssuladze/Documents/Dev/ClearGate && node cleargate-cli/scripts/clean-room/claude-baseline.mjs run --evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md --label "RS-4 after STORY-058-11")`.
- In the expected list, replace `sprint-init FAIL-KNOWN (BUG-090) ×2` with `sprint-init PASS ×2; active-sprint cell ".active after sprint-init: present" ×2`.
- Triage adds: "`sprint-init` FAIL → a BUG-090 regression: reopen BUG-090; never re-declare it known-fail".

**FW-A9 — M5-A13 is retired.** BUG-090 lands in the M5 fix wave, not after M6.

**FW-A10 — M6 carry** (the orchestrator mirrors this into `plans/M6.md` as an append-only note):
- `M6.md:1182` (RS-5 command) drops `--known-fail sprint-init=BUG-090`.
- `M6.md:1483` becomes "`sprint-init` reads PASS; no known-fail flag".
- `M6.md:1266` "BUG-090 remains for the un-authored path" becomes "resolved in the M5 fix wave".
- `M6.md:954`: the premise "passes `assert_story_files.mjs`'s regex (`/^---\r?\n/`)" becomes "passes `locateFrontmatterFence`". `approveProbeStory(authorLoopStory(raw, body))` now **flips** the scaffolded `approved: false`. -13 must not add a second `approved:` line.
- -13's harness inherits the flip.

**FW-A11** — the waves.json edits below.

**FW-A12 — sprint-context Mid-Sprint Amendment line** (orchestrator appends it; append-only):
`2026-09-26T<hh:mm>Z · BUG-090 / BUG-096 / BUG-097 · fix-wave plan plans/M5-fixwave.md: BUG-090 scope adds hotfix.md, close_sprint 2.6c sites (:250/:587), doctor.ts sniff deletions (:738/:1022) and the approveProbeStory flip; phantom-fence Gherkin corrected to BUG-067 parity (P2 → UNAPPROVED); --known-fail sprint-init=BUG-090 retired from -11 QA, RS-4, RS-5, RS-CLOSE; remaining TS positional sites → BUG-098 (to file).`

## waves.json (proposed; the orchestrator applies it; nothing is applied by this plan)

1. Insert after the `wave14` object and before `wave15`:
```json
{
  "wave": "wave14-fw1", "milestone": "M5-fixwave", "stories": ["BUG-096"], "parallel": false,
  "repo": "cli", "repo_order": ["cli", "dist-rebuild"], "lane": "standard",
  "after": ["STORY-058-10", "RS-4a"],
  "rationale": "Owner fresh-folder directive 2026-09-26 (Mid-Sprint Amendment 09:30Z). Test helper only (test/helpers/init-fixture.ts mkShortTmpDir region + one new red file). First so every later run in the wave stops leaking /tmp. Shares init-fixture.ts with -10 (rows), BUG-090 (rows) and -11; serial by R1. Plan: plans/M5-fixwave.md.",
  "dispatch_blockers": [], "boundary_after": ["BD"]
},
{
  "wave": "wave14-fw2", "milestone": "M5-fixwave", "stories": ["BUG-097"], "parallel": false,
  "repo": "cli", "repo_order": ["cli", "dist-rebuild"], "lane": "standard",
  "after": ["BUG-096"],
  "rationale": "Four src output fixes (gate.ts verbose, stamp.ts buildDiffPreview, wiki-query.ts prefix, scaffold-lint.ts double print). No payload, no scaffold, no hook. Not declared by -10 or -11. Plan: plans/M5-fixwave.md.",
  "dispatch_blockers": [], "boundary_after": ["BD"]
},
{
  "wave": "wave14-fw3", "milestone": "M5-fixwave", "stories": ["BUG-090"], "parallel": false,
  "repo": "both", "repo_order": ["outer", "cli", "dist-rebuild"], "lane": "standard",
  "after": ["BUG-097"],
  "rationale": "Goal-serving: position-independent fences in assert_story_files.mjs + close_sprint.mjs (2.6c, 2.9), approved: false in epic/story/hotfix templates, doctor sniff deletions, push wording, approveProbeStory flip. Two-repo: outer live-mirror commit (5 files, one commit, ESM import pair) merges first, cli second (Rule 15, overrides execution.repo_field). Full loop incl. live TPV + post-flight. Before -11 and RS-4 so both run without --known-fail. Plan: plans/M5-fixwave.md.",
  "dispatch_blockers": [], "boundary_after": ["BD"]
}
```
2. `wave15.after`: `["STORY-058-10"]` becomes `["BUG-090"]`.
3. `boundary_steps` RS-4 `action`, step (2): replace `claude-baseline.mjs run --label "RS-4 after STORY-058-11" --known-fail sprint-init=BUG-090 -> PASS (Goal checks 2-3)` with `claude-baseline.mjs run --label "RS-4 after STORY-058-11" -> PASS (Goal checks 2-3); sprint-init PASS x2 (BUG-090 fixed in wave14-fw3; a FAIL reopens BUG-090, never re-declare known-fail)`.
4. `boundary_steps` RS-CLOSE `action`: delete ` --known-fail sprint-init=BUG-090`.
5. `lane_assignments` adds `"BUG-096": "standard", "BUG-097": "standard", "BUG-090": "standard"`.
6. `story_count_in_milestone` and `story_count_planned` go from 17 to 20. `execution.note`'s "All 17 items" becomes "All 20 items".
7. `rulings` adds `"fix_wave_placement": "wave14-fw1..fw3 (BUG-096, BUG-097, BUG-090) run after wave14 → BD → RS-4a and before wave15; registered by the 2026-09-26T09:30Z amendment; plan plans/M5-fixwave.md."`

## BUG-098 — remaining positional frontmatter sites (cli `story/BUG-098` + outer `.worktrees/BUG-098` on `story/BUG-098`; wave14-fw4)

role: architect. This section replaces the Follow-ups bullet "BUG-098 (to file)" and resolves Open decision 4. The item is in-sprint and goal-critical ("stop corrupting").

**Base and dependency (pinned).**
- The red commit is cut from cli `main` **after BUG-090 merges**, and after BUG-090's BD.
- Entry gate, all read-only:
  - `command grep -n "export function locateFrontmatterFence" CLI/scaffold/core/.cleargate/scripts/assert_story_files.mjs` hits.
  - The same grep on the live `OUTER/.cleargate/scripts/assert_story_files.mjs` hits.
  - `node OUTER/.cleargate/scripts/close_sprint.mjs` exits 2 with usage, which proves BUG-090's live import pair links.
- The two BUG-098 scripts `import { locateFrontmatterFence } from './assert_story_files.mjs'`. Without BUG-090's export, they fail at ESM link time, both in canonical and in the live mirror.
- Line numbers below are at `35580b0`. Re-derive them by content at the red commit:
  - BUG-090 deletes one line in `doctor.ts` above `:854`, so it becomes `:853`.
  - -10 edits `doctor.ts` `runCheckScaffold`.
  - No fix-wave item or -10 touches the other TS files.

**Measured at `35580b0`, in the scratch clone.**
- **`sprint init --allow-drift` phantom write-back reproduced.** The probe used `sprintInitHandler` with a `gitRunner` stub (`feat(CR-001)`) against a `CR-001` whose status is `Draft`. The sprint plan was `<instructions>`-led and held `context_source: "orig"`. After the run, the file starts with `---\ncontext_source: "lifecycle waiver: 2026-09-26 for CR-001"\n---\n\n<instructions>…`, and the real block is intact below it.
  - **Cascade:** the decomposition gate then reads the phantom (first fence) and reports "sprint declares no epics or proposals — waived via --allow-drift". The plan's `epics: [EPIC-001]` became invisible.
- `reconcileCurrentSprintStories` (Step 2.6d) on an instructions-led `Done` story throws `Error: No frontmatter in …/STORY-900-01_probe.md`. The file stays in pending-sync.
- `prep_reporter_context.mjs` on an instructions-led sprint plan whose dates are 2026-05-01..31 writes `No flashcard entries found in sprint window (no date window available).` Once `<instructions>` is stripped, it writes `… [2026-05-01 → 2026-05-31].`
- A broader grep, `command grep -rnE "startsWith\(['\"]---|/\^---|indexOf\(['\"]\\\\?n?---|lines\[0\] (!==|===) ['\"]---|match\(/\^---" src`, found **one site the census missed**: `src/lib/intake.ts:263`.
- M2 baseline, all 5 scenarios, equal to canonical and live:
  - `prep_reporter_context.mjs` `31d041da56a7187e480a1b7100c0828310f56ff5ed4b29d6fe9c6c7111c45f06`, mode 644;
  - `dedupe_frontmatter.mjs` `6bf2816399cad2ab6f8f770de5eb920c3547b6fad9295c81f08aa6a4f894ef21`, mode **755**.
- `backfill_hierarchy.mjs` is **not** in `scaffold/core` (`ls` ENOENT). It is live-only in the meta repo.

### Site list and rulings

| # | Site (at `35580b0`) | Reads/writes | Today on an `<instructions>`-led item | Ruling |
|---|---|---|---|---|
| 1 | `src/commands/sprint.ts:745-766` `parseFileFrontmatter` (readers `:307` `lifecycle_init_mode`, `:628` `start_date`, `:959` `epics`, `:1024` `parent_epic_ref`) | read | `{fm:{}, body: raw}` | **FIX** through `locateFrontmatter` |
| 2 | `sprint.ts:396-411` `--allow-drift` waiver → `serializeFileContent(fm, body)` | write | phantom block planted (measured) | **FIX**: splice into the span |
| 3 | `sprint.ts:807-812` `stampFile` (archive loop `:1105-1107`) | write | phantom `status`/`completed_at` block | **FIX**: splice |
| 4 | `sprint.ts:823-848` `stampSprintClose` (`:1067`) | write | phantom block | **FIX**: splice |
| 5 | `src/lib/lifecycle-reconcile.ts:775-791` `setFrontmatterFieldAtomic` (2.6d, `:910`, `:912`) | write | throws; close stops (measured) | **FIX**: splice |
| 6 | `src/lib/readiness-predicates.ts:434-462` `readFrontmatterFromFile` (`frontmatter(<ref>).…` predicates) | read | `{}`, so `parent-approved` fails for an approved parent | **FIX**: locate, then the existing line parser over the YAML slice. The value semantics (strings) are unchanged |
| 7 | `src/commands/doctor.ts:257` (`runHookHealth`, retired `execution_mode:` advisory) | read | miss (no advisory) | **FIX** |
| 8 | `src/commands/doctor.ts:854` (`runPricing`) | read | exit 2 "file has no frontmatter" | **FIX**. `null` span keeps the message and exit 2; a throw becomes "cannot parse frontmatter", exit 2 (the existing branch `:862-869`) |
| 9 | `src/lib/frontmatter-merge.ts:91-100` `parseBlock` | read | throws | **FIX**: drop the guard, so `parseFrontmatter` locates or throws. `mergeFrontmatterConflict` has no `src/` caller today (only `test/lib/frontmatter-merge.node.test.ts`); aligned for its future sync consumer |
| 10 | `src/lib/slug.ts:160-169` `extractFrontmatterBlock` (`nextProposalId` `:87`, `findByRemoteId` `:142`) | read | skipped. `nextProposalId` can hand out a **duplicate** `PROP-NNN`, and `findByRemoteId` misses the item | **FIX** |
| 11 | `src/lib/wiki/contradict.ts:492-516` `upsertFrontmatterField` (`last_contradict_sha` on the raw item, `:196`) | write | silently unstamped | **FIX**: splice |
| 12 | `src/commands/wiki-audit-status.ts:248-270` `applyStatusFix` | write | unchanged, yet "applied N fix(es)" is printed and the next run still drifts | **FIX**: splice |
| 13 | `src/lib/intake.ts:238-275` `hasAnyRemoteAuthored` (`:263` `raw.indexOf('\n---', 4)`) | read | scans the `<instructions>` preamble, not the frontmatter, so the R10 warning is wrong | **FIX** (new site; FW-A13) |
| 14 | `scaffold/core/.cleargate/scripts/prep_reporter_context.mjs:83-96` `parseFrontmatter` (`:487` sprint dates) | read | null dates (measured) | **FIX** with `locateFrontmatterFence` |
| 15 | `scaffold/core/.cleargate/scripts/dedupe_frontmatter.mjs:58-71` `parseFmLines` and the rebuild `:193-201` | read+write | skipped | **FIX** with `locateFrontmatterFence`; rebuild by span |
| 16 | `.cleargate/scripts/backfill_hierarchy.mjs:69-82` `parseFm` (**live-only**, not shipped) | read+write | skipped (fail-closed) | **LEAVE**. See below |
| 17 | `src/wiki/page-schema.ts:117`, `src/wiki/code-map/page-schema.ts:89` | read | n/a | **LEAVE**: generated wiki pages, `---`-led by construction |
| 18 | `src/commands/push.ts:235` | read | n/a | **LEAVE**: sprint reports, `---`-led by construction |
| 19 | `src/commands/push.ts:341`, `src/commands/sync.ts:575`, `src/lib/sync/work-items.ts:327` (push-side write-backs) | write | whole-file rewrite; the `<instructions>` preamble is dropped and the frontmatter is read from the real block | **LEAVE**. There is no phantom and no author-data loss. The protocol's end state for an authored item carries zero `<instructions>`. The paths are member-only (pre-member exits 2 first). Tracked in sprint §4 as BUG-067 carry-forward (1), filed at close |
| 20 | `src/commands/pull.ts:172`, `src/commands/sync.ts:665` (pull-side write-backs) | write | the body is replaced by the remote's by design | **LEAVE**: the remote is authoritative for the body. Same §4 carry-forward |
| 21 | `src/lib/merge-ui.ts:33`, `src/lib/lifecycle-reconcile.ts:276` | — | diff-hunk and git-log separators | n/a, not frontmatter |

**`backfill_hierarchy.mjs` ruling: LEAVE, fail-closed** (the SPRINT-41 M0 follow-up is closed by this ruling).
1. It is live-only (`OUTER/.cleargate/scripts/`). It is not in `scaffold/core`, not in the payload, and not in the drift check's canonical-driven set (`plans/M3.md:773`), so no user install runs it.
2. It is a manual one-shot and not hook-wired (FLASHCARD 2026-08-27 `#frontmatter #backfill #correction`).
3. Its fail-closed `!raw.startsWith('---')` skip is the only thing keeping freshly scaffolded, `<instructions>`-led items out of its body-regex sprint fallback (`/\bSPRINT-(\d+)\b/` over the first 50 body lines, `:88-120`). That fallback re-owned 19 items in SPRINT-39 (FLASHCARD `#frontmatter #backfill #danger`; BUG-067-arch.md §1).

Making it locator-aware without first removing that fallback would widen BUG-048's blast radius to every new item. If the script ever needs `<instructions>`-led coverage, the prerequisite is a separate item that deletes the body-regex fallback. BUG-098 §4's listing of it under `scaffold/core/…/scripts` is corrected by FW-A13.

### Change shape (pinned)

**Shared TS helper.** Add two exports to BUG-067's `src/lib/frontmatter-locator.ts`, next to `replaceFrontmatter`. This is reuse, not a second locator.
```ts
/** YAML text between the fences, without the EOL that precedes the closing fence. */
export function frontmatterYaml(raw: string, span: FrontmatterSpan): string {
  const y = raw.slice(span.yamlStart, span.yamlEnd);
  if (y.endsWith('\r\n')) return y.slice(0, -2);
  if (y.endsWith('\n')) return y.slice(0, -1);
  return y;
}
/** Replace only the YAML between the fences; every byte outside [span.start, span.end) is retained. */
export function withFrontmatterYaml(raw: string, span: FrontmatterSpan, yamlText: string): string {
  const inner = yamlText === '' ? '' : yamlText.split(/\r?\n/).join(span.eol) + span.eol;
  return replaceFrontmatter(raw, span, `---${span.eol}${inner}---`);
}
```
- An unchanged YAML text round-trips byte-identical, whether LF, CRLF or empty `---\n---`. The locator guarantees the fences are exact `---` lines.
- The block carries no trailing EOL (FLASHCARD 2026-09-25 `#frontmatter #locator`).
- Every TS writer in this item goes through `withFrontmatterYaml`, so the bytes outside the span stay identical.

**`sprint.ts` (sites 1-4).**
- `parseFileFrontmatter(raw)` returns `{ fm, body, span, parseOk }`:
  - `span = locateFrontmatter(raw)`, inside try/catch. A throw becomes `null`.
  - `span === null`: `{fm:{}, body: raw, span:null, parseOk:false}`, today's fallback.
  - Otherwise `yaml.load(frontmatterYaml(raw, span), CORE_SCHEMA)`. A non-object or a throw gives `parseOk:false` and `fm:{}`.
  - `body` keeps today's convention for the readers: bytes after the closing fence, minus one leading blank line.
- Extract `dumpFrontmatterYaml(fm)`: the exact `yaml.dump` options of `serializeFileContent` (`:772-782`), then `.replace(/\n+$/, '')`.
- New `rewriteFrontmatter(raw, parsed, fm)`:
  - `span && parseOk` → `withFrontmatterYaml(raw, span, dumpFrontmatterYaml(fm))`;
  - `span && !parseOk` → `raw`, unchanged. A malformed block is never overwritten or shadowed;
  - `!span` → `serializeFileContent(fm, parsed.body)`, today's no-frontmatter fallback, which writes the only block.
- `:407`, `stampFile` and `stampSprintClose` call `rewriteFrontmatter`. `stampSprintClose` reports `didChange: false` and skips the write when the result equals `previousContent`.
- For `---`-led files, the bytes inside the span are the same `yaml.dump` output as today. One deliberate change: the body separator after the closing fence is now preserved instead of normalized to one blank line. The existing tests assert with `includes`, so they stay green.

**`lifecycle-reconcile.ts` (site 5).**
- `span = locateFrontmatter(raw)`, inside try/catch. `null` or a throw raises `new Error(\`No frontmatter in ${filePath}\`)`, as today.
- `y = frontmatterYaml(raw, span)`. Apply today's transform to `y` unchanged: replace `^${field}:.*$`, or `y.trimEnd() + '\n' + \`${field}: ${rawValue}\``.
- `newRaw = withFrontmatterYaml(raw, span, y2)`, written with the existing tmp+rename.
- For LF `---`-led files this is byte-identical to today's `raw.replace(fm[1], newFm)`: `y` equals the old capture.

**`readiness-predicates.ts` (site 6).** `lines = frontmatterYaml(raw, span).split('\n')`, with `null`/throw → `{}`. The existing loop over those lines is unchanged; its `.trim()` absorbs a CRLF `\r`. S4 of `test/docs/gate-section-index-pinning.node.test.ts` pins by content, not line numbers (`:602-615`), so moving code above `evalSection` is safe.

**Remaining readers and writers.**
- **Readers (sites 7, 10, 13):** `span` (try/catch → treated as absent), then `frontmatterYaml(raw, span)` in place of the old slice or regex capture:
  - `doctor.ts:257` tests `/^execution_mode:/m` on it;
  - `slug.ts` `extractFrontmatterBlock` returns it, or `null`;
  - `intake.ts` tests its `source:` regex on it.
- **Writers (sites 11, 12):** the existing line-edit over `frontmatterYaml(raw, span).split('\n')`, then `withFrontmatterYaml`. `null` or a throw returns `raw`, unchanged, as today.
- **`runPricing` (site 8):** replace the sniff with a `locateFrontmatter` try: `null` → the existing "file has no frontmatter" exit 2; a throw → the existing "cannot parse frontmatter" exit 2; otherwise `parseFrontmatter` as today.
- **`parseBlock` (site 9):** delete `if (!trimmed.startsWith('---')) throw …`. `parseFrontmatter` (located) throws on absent frontmatter.

**Scripts (sites 14-15, canonical plus live, byte-identical).** Both add `import { locateFrontmatterFence } from './assert_story_files.mjs';`.
- **`prep_reporter_context.mjs` `parseFrontmatter(content)`:**
  - `let span = null; try { span = locateFrontmatterFence(content); } catch {}`; no span → `{}`.
  - Otherwise the existing field loop over `content.slice(span.yamlStart, span.yamlEnd).split('\n')`. Its `"?([^"]*)"?\s*$` plus `.trim()` already tolerates `\r`.
- **`dedupe_frontmatter.mjs`:**
  - `parseFmLines(raw)` becomes `span` (try/catch → `null` → skipped, as today).
  - `yaml = raw.slice(span.yamlStart, span.yamlEnd)`, `fmLines = yaml.split('\n')`; pop one trailing `''` (the final EOL) and remember it.
  - Rebuild as `raw.slice(0, span.yamlStart) + cleaned.join('\n') + (hadFinalEol ? '\n' : '') + raw.slice(span.yamlEnd)`.
  - CRLF lines keep their `\r`, because each element still ends in `\r`. CRLF files were skipped before; they are now deduped.
  - The output strings are unchanged: `rewritten: <rel> (removed duplicate keys: …)` and the `Dedupe complete:` summary.
  - Mode stays **755**. The M2 row asserts mode on both sides.
- Both keep `check-no-inline-id-regex` clean: no type word next to an ID escape on one line.

### QA-Red (BUG-098) — one red commit on cli `story/BUG-098`

Canonical paths go through `canonicalPath()`. TS tests call exported entry points with the existing seams. Nothing spawns `dist/cli.js` (flashcard 2026-09-25 `#cross-repo #test-harness`). Each new `describe` is titled `BUG-098 …`.

1. **`test/lib/frontmatter-yaml-splice.red.node.test.ts`** (new, 4 red: exports missing)
   - **H1:** an LF `<instructions>`-led file; `withFrontmatterYaml(raw, span, frontmatterYaml(raw, span)) === raw`.
   - **H2:** the same with CRLF, and the rewritten block uses `\r\n`.
   - **H3:** empty `---\n---` round-trips.
   - **H4:** after an edit that replaces one line, `out.slice(0, span.start) === raw.slice(0, span.start)` and the bytes after the closing fence are identical.
2. **`test/commands/sprint-frontmatter-fence.red.node.test.ts`** (new, 5 red). Seams: `sprintInitHandler(…, { cwd, gitRunner, spawnFn: () => ({status:0,stdout:'',stderr:''}), stdout, stderr, exit: throwing })`, with the `gitRunner` line format of `test/lib/lifecycle-reconcile.node.test.ts:183-192`.
   - **S1:** an `<instructions>`-led plan (`context_source: "orig"`, `epics: [EPIC-001]`), `CR-001` Draft, `feat(CR-001)`, `allowDrift: true`. Afterwards:
     - the preamble bytes are identical;
     - `locateFrontmatter(after).start` equals the original start;
     - the parsed `fm.context_source` includes `orig` and `lifecycle waiver: `, and `for CR-001`;
     - `sprint_id` and `epics` are preserved;
     - the bytes after the closing fence are identical;
     - no `---` line precedes `<instructions>`.
   - **S2:** S1 with CRLF; the new block's lines end `\r\n`.
   - **S3:** `stampSprintClose` on an `<instructions>`-led sprint file: `didChange === true`, the preamble and body are identical, and `fm.status === 'Completed'` with `completed_at` set.
   - **S4:** read path. An `<instructions>`-led plan with `lifecycle_init_mode: "block"`, drift present, `allowDrift` false. Exit 1, and stderr contains `lifecycle drift blocks sprint activation (lifecycle_init_mode: block)`. Base reads `{}`, so it takes warn mode and proceeds.
   - **S5:** an `<instructions>`-led plan whose frontmatter is malformed YAML (`epics: [unterminated`), with `allowDrift: true`. The file is byte-identical afterwards. Base plants a phantom.
3. **`test/commands/sprint-archive.node.test.ts`** (amend, +1 red)
   - **S6:** using the existing `buildFixture`, rewrite `STORY-099-01_Test_Story_1.md` as `<instructions>`-led before `sprintArchiveHandler`. The archived file's preamble is identical, and its located frontmatter has `status: Done` and `completed_at`.
4. **`test/lib/lifecycle-reconcile-fence.red.node.test.ts`** (new, 2 red)
   - **L1:** `reconcileCurrentSprintStories({deliveryRoot, sprintRunsRoot, sprintId:'SPRINT-900'})` with `STORY-900-01` Done in `state.json`. The pending-sync file is `<instructions>`-led, with `status: "Draft"` and `approved: false`. Expect:
     - the result lists `STORY-900-01` as flipped;
     - `archive/STORY-900-01_probe.md` exists;
     - its bytes equal the original with exactly those two lines replaced, by `status: "Completed"` and `approved: true`.
     - Base throws `No frontmatter in` (measured).
   - **L2:** the same with CRLF and no `approved` key. The appended `approved: true` line ends `\r\n`, the closing fence stays on its own line, and the preamble is identical.
5. **`test/commands/gate-unit.node.test.ts`** (amend the `CR-030 γ` block, +2 red; reuse `OR_GROUP_GATES_DOC`)
   - **R1:** an `<instructions>`-led initiative with `status: "Triaged"` → no `❌ parent-approved`.
   - **R2:** an `<instructions>`-led proposal with `approved: true` → no `❌ parent-approved`.
6. **`test/commands/doctor-fence.red.node.test.ts`** (new, 2 red + 1 anchor)
   - **D4:** `doctorHandler({}, {cwd, stdout, stderr, exit: throwing})`. Always pass `exit` (FLASHCARD 2026-09-02). Use the minimal fixture of `test/commands/doctor-retired-field.red.node.test.ts:45-112`, with the sprint file `<instructions>`-led and carrying `execution_mode: v1`. Stdout contains ``[advisory] 1 sprint files carry a retired `execution_mode:` field; consider removing.``
   - **D5:** `runPricing(<instructions-led item with draft_tokens>, cwd, …)`. Exit is not 2, and stdout carries the USD estimate line (the success shape of `test/commands/doctor-pricing.node.test.ts:180-200`).
   - **D6 [anchor]:** a file with no frontmatter → exit 2, and stderr contains `file has no frontmatter`.
7. **`test/lib/slug.node.test.ts`** (amend, +2 red)
   - **SL1:** pending-sync holds an `<instructions>`-led `PROPOSAL-004_x.md` with `proposal_id: "PROP-004"` → `nextProposalId(root) === 'PROP-005'`. Base: `PROP-001`.
   - **SL2:** an `<instructions>`-led item with `remote_id: "LIN-42"` → `findByRemoteId(root, 'LIN-42')` returns its path. Base: `null`.
8. **`test/lib/frontmatter-merge.node.test.ts`** (amend, +1 red)
   - **FM1:** `mergeFrontmatterConflict(<instructions-led local file text>, <remote block>)` returns the merged block with the remote-only field present. Base throws.
9. **`test/wiki/contradict.node.test.ts`** (amend, +1 red)
   - **C1:** `commitPhase4Findings` with an `<instructions>`-led raw file. Its located block gains `last_contradict_sha: "<sha>"`; the preamble and body are identical, and the only diff is the one inserted line.
10. **`test/wiki/audit-status.node.test.ts`** (amend, +1 red)
    - **W1:** an archived `<instructions>`-led epic with `status: "Ready"`. `--fix --yes` changes only the status line (to `status: "Abandoned"`); the preamble is identical; the second run exits 0 with `audit-status: clean (0 drift)`.
11. **`test/lib/intake.node.test.ts`** (amend, +1 red)
    - **I1:** the `r10NoWarnIfPriorIntake` shape with the prior remote-authored file `<instructions>`-led → no R10 WARN.
12. **`test/scripts/scripts-fence-bug098.red.node.test.ts`** (new, 2 red + 2 anchors; spawns canonical scripts)
    - **P1:** `prep_reporter_context.mjs SPRINT-fixture` with `CLEARGATE_SPRINT_DIR`, `CLEARGATE_PENDING_SYNC_DIR`=tmp, and an `<instructions>`-led plan with `start_date: 2026-05-01` / `end_date: 2026-05-31`. The bundle contains `[2026-05-01 → 2026-05-31]` and not `(no date window available)` (measured base).
    - **P2 [anchor]:** the same plan `---`-led.
    - **DD1:** `dedupe_frontmatter.mjs <tmpdir>` over an `<instructions>`-led file holding `approved: false` … `approved: true`. Stdout contains `removed duplicate keys: approved`, and the file equals the original minus the first `approved:` line, preamble identical. Base: `0 rewritten, 1 skipped`.
    - **DD2 [anchor]:** the same file `---`-led.
13. **`test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts`** (new, integration tier, 1 red; BUG-098 §5's integration row)
    - Flow: `runInitScenario('fresh')` (auto-cleaned after BUG-096), then `newHandler` sprint `probe` plus a `CR-001`, then `sprintInitHandler({…, allowDrift:true}, {cwd: r.dir, gitRunner, spawnFn})`.
    - Assert S1's invariants on the real template-scaffolded plan.
14. **`test/helpers/init-fixture.ts`** (+2 `SANCTIONED_BASELINE_DELTAS` rows, `item: 'BUG-098'`, `scenarios: 'all'`, appended after BUG-090's rows):

    | rel | baselineHash | currentHash |
    |---|---|---|
    | `.cleargate/scripts/prep_reporter_context.mjs` | `'31d041da56a7187e480a1b7100c0828310f56ff5ed4b29d6fe9c6c7111c45f06'` | `currentPinSubstitutedHash(rel)`, refused when equal to the baseline |
    | `.cleargate/scripts/dedupe_frontmatter.mjs` | `'6bf2816399cad2ab6f8f770de5eb920c3547b6fad9295c81f08aa6a4f894ef21'` | same pattern; mode 755 on both sides |

    Both are red at the red commit on the 5 + 15 M2 parity runs (with `CLEARGATE_INIT_BASELINE`) and green after Dev.

**Totals.**
- Default tier +27: **24 red**, 3 anchors (D6, P2, DD2).
- Integration +1, red.
- The 20 parity runs flip, with no count change.

**Anchors that must stay green (solo):**
- the existing tests of every amended file: `sprint-archive`, `gate-unit`, `slug`, `frontmatter-merge`, `contradict`, `audit-status`, `intake`;
- `test/lib/lifecycle-reconcile.node.test.ts`, `test/lib/close-sprint-backsync.node.test.ts`, `test/commands/sprint-init-decomp-gate.node.test.ts`, `test/commands/sprint-sentinel-validation.node.test.ts`;
- `test/commands/sprint-archive-stamp.integration.node.test.ts` (named);
- `test/commands/doctor.node.test.ts`, `test/commands/doctor-pricing.node.test.ts`, `test/commands/doctor-session-start.node.test.ts`;
- `test/lib/readiness-predicates.node.test.ts`, `test/lib/frontmatter-locator.red.node.test.ts` (11/11), `test/docs/gate-section-index-pinning.node.test.ts`;
- `test/scripts/test_prep_reporter_context.node.test.ts` and `test/scripts/dedupe-frontmatter.node.test.ts` (both read the live scripts; `---`-led fixtures);
- `test/scripts/no-inline-id-regex.node.test.ts`;
- BUG-090's four new fence files;
- `npm run typecheck`.

**Expected pre-merge reds (Rule 15):** none in the default tier. No default-tier test compares these two scripts live vs canonical. Integration only: `test/scaffold/canonical-live-parity.red.integration.node.test.ts` script cases, named runs.

**Rule 16:** BUG-098 edits two outer live scripts, so run the `CLEARGATE_META_ROOT` list with `CLEARGATE_META_ROOT=<.worktrees/BUG-098>`, exactly as for BUG-090.

### Loop depth: full loop — QA-Red → live TPV → Developer → QA-Verify → live Architect post-flight → DevOps (two-repo). No live harness run.

- **Live TPV: yes.**
  - 13 entry points, each with its own seam: `gitRunner`, `spawnFn`, throwing `exit` for `sprintInitHandler` and `doctorHandler`, the `reconcileCurrentSprintStories` fixture roots, `commitPhase4Findings` opts, audit `fix`/`yes`, and the script env seams.
  - Two scripts whose imports depend on BUG-090.
  - The delta rows' refuse-baseline pattern.
  - One wrong seam makes a red vacuous (flashcard 2026-09-26: TPV must simulate the reds against a conformant build).
- **Post-flight: yes.** It checks:
  - 6 writers, 3 of which rewrite work items at sprint init, archive and close;
  - the bytes-outside-span invariant, everywhere;
  - the malformed-YAML no-write rule;
  - the shared-helper usage, with no private re-implementations;
  - `parent-approved` gate semantics.
- **No live clean-room harness at QA-Verify.** The only room-visible read is `lifecycle_init_mode`, and the Sprint Plan Template's value (`"warn"`, template `:44`) equals today's default. The -09 `sprint-init` row is re-witnessed at RS-4, which now follows wave15.

### DevOps (BUG-098, one turn; Rule 15 order)

1. **Pre-merge:** `cp -R CLI/templates/cleargate-planning /private/tmp/cg-s41-fw-payload-pre-098`.
2. **Outer merge first.** Merge the outer `story/BUG-098` → `sprint/S-41`. The outer half is **one commit** holding both live scripts, byte copies of canonical (`cmp`). Then, one call each, `node OUTER/.cleargate/scripts/prep_reporter_context.mjs` and `node OUTER/.cleargate/scripts/dedupe_frontmatter.mjs --dry-run /private/tmp/cg-s41-fw-empty-dir`, using a fresh empty dir.
   - The first must print usage or a controlled error, **not** a SyntaxError about `locateFrontmatterFence`.
   - The second must print `Dedupe complete: 0 would-rewrite, 0 skipped, 0 errors.`
3. **Cli merge second.** Merge the cli `story/BUG-098` → `main`.
4. **Full suite once:** **`T090+27` tests / `P090+27` pass / 0 fail / 2 skipped**, where `T090/P090` are BUG-090's post-merge numbers (cumulative over the wave: `T10+81`). Then the Rule-14 revert. Re-run dist-spawning failures after BD, solo.
5. **BD.**
6. **Payload identity changes.**
   - `diff -r /private/tmp/cg-s41-fw-payload-pre-098 CLI/templates/cleargate-planning` lists exactly `.cleargate/scripts/prep_reporter_context.mjs`, `.cleargate/scripts/dedupe_frontmatter.mjs` and `MANIFEST.json`.
   - The same 2 scripts change in `templates/scaffold/core/`, plus its per-root `MANIFEST.json`.
   - `dedupe_frontmatter.mjs` is still mode 755.
   - `verify-pack` OK at `V10` entries (no entry added).
7. **Witnesses:**
   - `cmp` live vs canonical for the 2 scripts;
   - `node cleargate-cli/dist/cli.js doctor` exits 0 with no `scaffold drift:` line;
   - named integration runs: the M2 parity pair (5/5, 15/15), `canonical-live-parity`, `sprint-allow-drift-fresh-install` (1/1) and `sprint-archive-stamp`;
   - M2 baseline `bdc4bb1a…62b2`, 425 files.
8. **No `.claude/` re-sync.** `backfill_hierarchy.mjs` stays byte-unchanged.
9. **Orchestrator: Adjacent-Implementations row:** `frontmatterYaml(raw, span)` and `withFrontmatterYaml(raw, span, yamlText)` (`src/lib/frontmatter-locator.ts`); every TS frontmatter write now splices through them.

### Collisions with STORY-058-11 (wave15, now `after: ["BUG-098"]`)

- **`test/helpers/init-fixture.ts`** is the only shared file. BUG-098 appends 2 changed-file rows after BUG-090's 5. -11 then appends its 8 hook rows plus the `harness.sh` sanctioned addition, and extends `captureOrCompare` for added files. It must keep the BUG-090 and BUG-098 rows intact, and those rows must stay green under -11's extension.
- **None of -11's declared surfaces overlap.**
  - -11 §3.1 names no `sprint.ts`, `lifecycle-reconcile.ts`, `readiness-predicates.ts`, `doctor.ts`, `slug.ts`, `frontmatter-merge.ts`, `intake.ts`, `wiki-audit-status.ts`, `prep_reporter_context.mjs` or `dedupe_frontmatter.mjs`.
  - The one "contradict" hit is the `cleargate-wiki-contradict.toml` agent file, not `src/lib/wiki/contradict.ts`.
- **-11's 9-hook Claude parity** runs frozen pre-shim hooks and current hooks against the same dist. BUG-098 changes no hook-invoked output: the hooks call `doctor --session-start`, `--can-edit`, `stamp-tokens`, `gate check` and `wiki ingest`, and none of those paths is touched here. `runHookHealth`'s advisory is default-mode doctor, not session-start.
- **-11 QA-Red** bases on cli `main` after BUG-098. Its M5-A6 harness repeat runs with no `--known-fail` (FW-A7).

### Story-text amendments for BUG-098 (the orchestrator applies them on `sprint/S-41` before QA-Red seals, then re-gates)

**FW-A13 — BUG-098 §4.** Replace the "Investigate / Modify" list with:
- `cleargate-cli/src/lib/frontmatter-locator.ts`: add the exports `frontmatterYaml` and `withFrontmatterYaml` (the shared splice helper).
- `cleargate-cli/src/commands/sprint.ts`: `parseFileFrontmatter` and its readers (`:307`, `:628`, `:959`, `:1024`), plus the writers `:396-411`, `stampFile` and `stampSprintClose`.
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` (`setFrontmatterFieldAtomic`), `src/lib/readiness-predicates.ts` (`readFrontmatterFromFile`).
- `cleargate-cli/src/commands/doctor.ts:257,854`, `src/lib/frontmatter-merge.ts:91-100`, `src/lib/slug.ts:160-169`, `src/lib/wiki/contradict.ts:492-516`, `src/commands/wiki-audit-status.ts:248-270`, `src/lib/intake.ts:263` (new site).
- `cleargate-cli/scaffold/core/.cleargate/scripts/{prep_reporter_context,dedupe_frontmatter}.mjs` plus the live mirrors, in one outer commit, using BUG-090's exported `locateFrontmatterFence`.
- `cleargate-cli/test/helpers/init-fixture.ts`: 2 sanctioned-delta rows.
- **Leave:**
  - `.cleargate/scripts/backfill_hierarchy.mjs`: live-only and not shipped; its fail-closed skip guards against the BUG-048 body-regex sprint re-ownership.
  - `src/wiki/page-schema.ts:117`, `src/wiki/code-map/page-schema.ts:89`, `src/commands/push.ts:235`.
  - The push/pull/sync whole-file write-backs `push.ts:341`, `pull.ts:172`, `sync.ts:575,665`, `sync/work-items.ts:327`: sprint §4 BUG-067 carry-forward (1).
- Add to §1 "Other readers": `src/lib/intake.ts:263` (`hasAnyRemoteAuthored` scans the `<instructions>` preamble).
- In §3, replace "`--allow-drift` phantom write-back reproduced in /private/tmp/cg-s41-fixwave-plan" with "reproduced 2026-09-26 in /private/tmp/cg-s41-fixwave-plan; the decomposition gate then reads the phantom and reports 'no epics or proposals'".

**FW-A14 — BUG-098 §5.**
- Command: `cd cleargate-cli`, then each of these solo via `npm run test:file --`:
  - `test/lib/frontmatter-yaml-splice.red.node.test.ts`
  - `test/commands/sprint-frontmatter-fence.red.node.test.ts`
  - `test/commands/sprint-archive.node.test.ts`
  - `test/lib/lifecycle-reconcile-fence.red.node.test.ts`
  - `test/commands/gate-unit.node.test.ts`
  - `test/commands/doctor-fence.red.node.test.ts`
  - `test/lib/slug.node.test.ts`
  - `test/lib/frontmatter-merge.node.test.ts`
  - `test/wiki/contradict.node.test.ts`
  - `test/wiki/audit-status.node.test.ts`
  - `test/lib/intake.node.test.ts`
  - `test/scripts/scripts-fence-bug098.red.node.test.ts`
  - `test/e2e/sprint-allow-drift-fresh-install.red.integration.node.test.ts`
- Test-count table: Unit tests 27 (default tier); Integration tests 1, plus the two M2 parity files; E2E: the clean-room `sprint-init` row at RS-4.
- Append this Gherkin scenario:
```gherkin
  @rules
  Scenario: A malformed frontmatter behind <instructions> is never rewritten
    Given an <instructions>-led sprint plan whose frontmatter is not valid YAML
    When `cleargate sprint init <id> --allow-drift` records its waiver
    Then the file is byte-identical and no block is planted before <instructions>
```

**FW-A15 — BUG-098 Task Breakdown.** Replace the 6 rows with:
- `- [ ] QA-Red: splice-helper reds; --allow-drift (LF, CRLF, malformed), stampSprintClose, archive stampFile, lifecycle_init_mode read; 2.6d set-field (LF, CRLF append); parent-approved (initiative, proposal); doctor advisory + pricing; slug ×2; merge; contradict stamp; audit-status fix; intake R10; two script spawns; fresh-install --allow-drift integration; 2 M2 delta rows`
- `- [ ] Add frontmatterYaml / withFrontmatterYaml to src/lib/frontmatter-locator.ts`
- `- [ ] sprint.ts: parseFileFrontmatter through locateFrontmatter; waiver, stampFile and stampSprintClose splice via rewriteFrontmatter; malformed YAML → no write`
- `- [ ] Fix setFrontmatterFieldAtomic and readFrontmatterFromFile the same way`
- `- [ ] Fix doctor :257/:854, frontmatter-merge, slug, contradict, wiki-audit-status, intake`
- `- [ ] prep_reporter_context.mjs and dedupe_frontmatter.mjs import locateFrontmatterFence (needs BUG-090); byte-copy both to the live mirror in one outer commit`
- `- [ ] Typecheck and the targeted tests`

## Cross-story risks

**Collisions with STORY-058-10** (sealed red at `59d8949`; TPV running now, appending M5-A33+ to `plans/M5.md`):
1. **`test/helpers/init-fixture.ts`.**
   - -10 appends 3 `SANCTIONED_BASELINE_DELTAS` rows (`pre-edit-gate.sh`, `stamp-and-gate.sh`, `token-ledger.sh`, measured in the `59d8949` diff). TPV may add more.
   - BUG-096 edits `:55-85` only. BUG-090 appends 5 rows **after** whatever `main` holds at its red commit.
   - Both fix-wave items base on post--10 `main`. There is no textual overlap with -10's hunk, but the entry gate re-checks it.
2. **Payload composition and identity.**
   - -10 adds `templates/scaffold/hosts/codex/**`, with verify-pack at 196 → 204 per M5-A30.
   - BUG-090 changes the bytes of 5 **core** files. The flat Claude payload and the core split view change; the codex host root does not.
   - The fix wave adds no packed entry, so verify-pack stays at `V10`.
   - The -10 DevOps `diff -r` recipe (M5-A30) must not be re-used as BUG-090's baseline. Use D1's fresh copy.
3. **The codex payload ships scaffold/core.** A `--host codex` install gets the new templates and scripts automatically, from one source. No -10 red test pins a core template or script hash (grep of the `59d8949` test tree: none). -10's `codex-hooks.mjs` C4 uses `approveProbeStory` and inherits the flip.
4. **`scripts/clean-room/probe-items.mjs`.** -10 pass B adds `S3_PROMPT` and `plantAgentsMdCanary` (M5-A1). BUG-090 edits only `approveProbeStory`. Serial.
5. **`src/commands/doctor.ts`.** -10 edits `runCheckScaffold` (M5-A16). BUG-090 deletes one line each in `runSessionStart` and `runCanEdit`. Re-derive by content: exactly two `if (!raw.trimStart().startsWith('---')) continue;` lines. The third sniff, in `runPricing` (`:854`), stays.
6. **M5.md:420's premise is false at `35580b0`** (see Open decision 1). `runCanEdit` does **not** read an instructions-led approved story, because `doctor.ts:1022` skips it before `parseFrontmatter`. So `codex.live.edit-allow` (C4, run after `approveProbeStory` with `<instructions>` intact) either FAILs under enforce, or passes vacuously in warn mode, at -10's QA-Verify. After BUG-090, the premise holds.

**Collisions with STORY-058-11** (story file §3.1; M5 F1–F8):
- `test/helpers/init-fixture.ts`: -11 adds M2 rows for 8 hooks plus the `harness.sh` "sanctioned addition". The current mechanism cannot express an added file (`:642-647`), so -11 extends `captureOrCompare`. BUG-090's rows land first and are plain changed-file rows, with no interplay.
- -11's 9-hook Claude parity compares frozen pre-shim hooks with current hooks under the **same** dist. BUG-090 changes `runCanEdit` behaviour for both sides equally, so parity holds.
- -11's `evidence.mjs` and `codex-hooks.mjs` edits: BUG-090 touches neither.
- F1–F8 do not overlap the fix wave.
- -11 QA-Red bases on `main` after BUG-090 and must not reintroduce `--known-fail` (FW-A7).

**Within the wave:**
- BUG-090's `test/e2e/sprint-init-fresh-install…` uses `runInitScenario`, and after BUG-096 its room is auto-removed. Do not `rmSync` it in a way that races the exit handler; `force:true` makes a double removal harmless.
- BUG-097's `stamp.ts` export and BUG-090's `push.ts`/`doctor.ts` edits do not overlap.

**Close-time:** the live `close_sprint.mjs` and `assert_story_files.mjs` must move in one commit (D2 proves the link). SPRINT-41's own Step 2.9 is proven unchanged by census and re-proven at D7.

## Open decisions for orchestrator

1. **(Urgent, -10 in flight.)** Route to the running -10 TPV: "M5.md:420's premise is false at `35580b0`. `doctor.ts:1022` `raw.trimStart().startsWith('---')` skips `<instructions>`-led stories in `runCanEdit`. C4 (`codex.live.edit-allow`) needs the probe story's `<instructions>` block stripped before `approveProbeStory`, with M6.md:187's 'authored items strip `<instructions>`' as precedent. Otherwise C4 is red under enforce, or vacuous under warn." BUG-090 later removes the sniff, and then both shapes pass. This plan does not edit M5.md.
2. **Accept FW-A1**, the phantom-fence Gherkin correction. BUG-090's own two clauses contradict each other ("same contract as BUG-067" versus "a phantom before `<instructions>` → approved"). The contradiction was resolved by measurement toward parity and fail-closed.
3. **Accept FW-A2's scope adds** (hotfix.md, close_sprint `:250`/`:587`, doctor `:738`/`:1022`, the probe-items flip) and append FW-A12. Every add is either the same defect in a file BUG-090 already edits, or an `approved` reader or writer on the fresh-story journey.
4. **File BUG-098 (next free id)** for the remaining TS positional-fence sites. Recommendation: schedule it before or in M6, because the `--allow-drift` path corrupts data. See Follow-ups.

## Follow-ups (logged; not in this wave)

- **BUG-098 (to file) — TS positional-fence carry-forward**, at `35580b0`:
  - `src/commands/sprint.ts:745-760` `parseFileFrontmatter`. It is **data-corrupting**: the `--allow-drift` waiver write-back at `:396-406` serializes `{fm:{}, body: raw}` into a new block **before** an instructions-led sprint plan's `<instructions>`, which is BUG-067's phantom signature. Other callers: `:307`, `:628`, `:808`, `:828`, `:959`, `:1024`.
  - `src/lib/lifecycle-reconcile.ts:777` `setFrontmatterFieldAtomic` (2.6d throws on instructions-led stories, so close is blocked at Step 2.6).
  - `src/lib/readiness-predicates.ts:434-462` `readFrontmatterFromFile` (the parent `approved`/`status` of an instructions-led proposal or initiative reads `{}`, so `parent-approved` fails).
  - `src/commands/doctor.ts:257` and `:854` (`--pricing`).
  - `src/lib/frontmatter-merge.ts:93`.
  - `src/lib/slug.ts:162`.
  - `src/lib/wiki/contradict.ts:495`.
  - `src/commands/wiki-audit-status.ts:251`.
  - Leave: `src/wiki/page-schema.ts:117` and `src/wiki/code-map/page-schema.ts:89` (generated pages, `---`-led by construction); `src/commands/push.ts:235` (sprint reports).
- **Scripts:** `prep_reporter_context.mjs:84` (null dates for instructions-led sprint plans); `dedupe_frontmatter.mjs:60` (skips instructions-led files).
- **Step 2.9 quoted values:** `close_sprint.mjs:1040` compares raw values, so `sprint_cleargate_id: "SPRINT-41"` (quoted) is skipped (fail-open), and a quoted `story_id` names a `"STORY-…".json` result file. Stamp re-serializes most values bare, so exposure is narrow.
- **Surface gate:** `file_surface_diff.sh:106-157` strips only `STORY-`, so a `BUG-*` active item resolves no file and the gate skips. Hygiene.
- **Harness:** `decideRun` could report "known-fail declared but check passed" (`evidence.mjs:369-377`). Optional.
- **Test helper:** `test/helpers/host-fixtures.ts:47-49` `mkTmp`, caller-owned cleanup, unaudited.

## Flashcards

- `2026-09-26 · #frontmatter #locator · BUG-067's locator returns the FIRST fence: a phantom block before <instructions> wins, not the real one.`
- `2026-09-26 · #clean-room #frontmatter #danger · approveProbeStory inserted approved: true; once templates scaffold approved: false it must flip or YAML dup-keys.`
- `2026-09-26 · #frontmatter #doctor · doctor runCanEdit/runSessionStart skip <instructions>-led items via trimStart().startsWith('---').`
- `2026-09-26 · #scripts #esm #danger · close_sprint.mjs static-imports assert_story_files.mjs: sync the live pair in ONE commit or close won't link.`
- `2026-09-26 · #test-harness #init · SANCTIONED_BASELINE_DELTAS can't express an added payload file (one-sided entry throws); keep fixes in-file.`
- `2026-09-26 · #test-harness #scripts · Spawning scaffold/core close_sprint.mjs: stub <fx>/node_modules/cleargate/dist/lib for Step 2.6c.`
- `2026-09-26 · #clean-room #harness · --known-fail relabels only FAIL; a fixed check PASSes silently with the flag still set — drop it.`
- `2026-09-26 · #test-harness #init · A child importing init-fixture needs cwd=CLI_ROOT and a marker line: initHandler prints a banner to stdout.`
- `2026-09-26 · #scripts #frontmatter · close_sprint Step 2.9 compares raw values: quoted sprint_cleargate_id "SPRINT-41" is skipped (fail-open).`
- `2026-09-26 · #surface-gate #scripts · file_surface_diff.sh strips only STORY- from the active id; a BUG-* active item resolves no file, gate skips.`
- `2026-09-26 · #frontmatter #sprint-init #danger · sprint.ts parseFileFrontmatter --allow-drift write-back plants a phantom block on instructions-led plans.`
- `2026-09-26 · #frontmatter #sprint-init #danger · (BUG-098) --allow-drift phantom then hides epics: the decomposition gate reads the phantom ("no epics").`
- `2026-09-26 · #frontmatter #close · (BUG-098) reconcileCurrentSprintStories throws "No frontmatter" on an instructions-led Done story; close stops at 2.6d.`
- `2026-09-26 · #frontmatter #intake · (BUG-098) intake hasAnyRemoteAuthored scans up to the first \n--- — the <instructions> preamble, not frontmatter.`
- `2026-09-26 · #frontmatter #locator · (BUG-098) The span's YAML slice ends with the EOL before the closing fence; strip it before an append or the fence glues on.`
- `2026-09-26 · #test-harness #init · (BUG-098) dedupe_frontmatter.mjs ships mode 755; delta rows assert mode on both sides — never drop the exec bit.`
- `2026-09-26 · #frontmatter #backfill · (BUG-098) backfill_hierarchy.mjs is live-only; its fail-closed skip is what shields fresh items from BUG-048 re-ownership.`

## Script Incidents

None. Every probe ran in the scratch clone `/private/tmp/cg-s41-fixwave-plan`:
- canonical scripts against fixture repos under that directory;
- one child `runInitScenario` (its 2 leaked dirs were removed);
- targeted `npm run test:file` runs.

Nothing ran against the meta repo's sprint state, and no `run_script.sh`-wrapped script was invoked. Version check skipped: no dependency is added or changed in this wave.

STATUS=done

## Superseded by plans/replan-contract-first.md (2026-09-26)

- Order items 1–5 ("strictly serial") and the bases "cut from cli main after the BUG-097 merge" and "after BUG-090 merges" are replaced: BUG-096 at `35580b0`, BUG-097 at `main`, BUG-090 at C1, BUG-098 at C4.
- The entry-gate greps run at integration.
- DevOps counts are the previous merge's total plus the item's own delta.
- The payload-identity baseline copy is taken immediately before each merge.
- Harness runs pass `--container`.

## FW-A16 — BUG-090 TPV re-seal (2026-09-26, role: architect; append-only)

Source: `reports/BUG-090-tpv.md` (verdict REJECTED → re-seal). The patch is `reports/BUG-090-tpv-reseal.patch`, sha256 `28d4f07c6da5e2fe84332bb3fd14076c55ab3a33f0e0c2970652d1af22f51b27`. It applies cleanly on cli `dbdcfc8` and changes 3 test files. No src, scaffold, script or template file changes.

- **QA-Red test list, amended.**
  - `frontmatter-fence-parity.red.node.test.ts`: 13 tests become 21. Add F14–F21, one fixture per framing rule that (a) pins and F1–F13 leave unexercised. Each covers a port mutant that survived:
    - exact-line `<instructions>` opener and closer;
    - the fence closer's char and its length;
    - opener and closer indentation of 0–3 spaces;
    - a `--- ` closer with trailing space;
    - an instructions-before-fence precedence case;
    - a BOM that is stripped on line 0 only.
  - `assert-story-files-fence.red.node.test.ts`: 9 tests become 11.
    - A10 [red]: a `----`-closed malformed block with `approved: true` reads as UNAPPROVED, exit 1, with no crash. Base exits 0, because the offset-0 regex reads `----` as the closer. This pins "on null or a throw, approved = false".
    - A11 [red]: `assertWorkItemApproved` is a named export (C4) and returns `{approved, has_heading}`.
  - `close-sprint-fence.red.node.test.ts`: still 4 tests. The preambles of C1, C3 and C4 each gain one column-0 example line inside `<instructions>`: C1 gets `deferred_verification: []`; C3 and C4 get `status: "Draft"`. This kills whole-file scans at the 2.9 list parse, the 2.6c flip and the 2.6c no-op read. The expected bytes are unchanged.
- **Totals (supersedes "Default tier +38").** Default tier +48: 40 red at the red commit and 8 anchors (A2, A4, A6, A7, A8, C2, T4, T7). Integration +2, both red. Both parity files flip, 20 runs.
- **Counts that follow.**
  - DevOps D4 is the previous total **+48**; replan §9 BUG-090 "+38" is void.
  - BUG-090 §5's test-count table Unit tests: 38 becomes 48. The orchestrator amends the item on `sprint/S-41` before the Developer is dispatched, then re-gates it.
- **Developer K-gates added.** They are post-flight inspection items for the accepted residual survivors A04, C09 and D03:
  1. `git diff --numstat -- src/commands/doctor.ts` is exactly `0 2`, and `runPricing`'s sniff remains, so the count of `trimStart().startsWith('---')` in doctor.ts is 1. That site is BUG-098's.
  2. The `approved` regex line in `assert_story_files.mjs` is byte-identical to base `:168`.
  3. Every close_sprint parse site reads `fenceYaml(raw).yaml`, never `raw`.
- **Pre-existing, not BUG-090's.** `test/scripts/template-sync-fields.integration.node.test.ts` has 4 failures, "live template X — parseFrontmatter returns all 6 new keys". The test bug is at `:78`: `field in (fm, msg)` uses the comma operator, so it throws on every template, including the untouched `CR.md` and `Bug.md`, at any commit. Name it in QA-Verify and DevOps D7-4. Follow-up.

## FW-A17 — BUG-098 TPV (2026-09-26, role: architect; append-only)

Source: `reports/BUG-098-tpv.md` (verdict REJECTED → re-seal). The patch is `reports/BUG-098-tpv-reseal.patch`, sha256 `6485674b31cc0b38c4ba588651562bcc4f76c30540020f005391128f8e5eed4e`. It applies cleanly on cli `2ea4832` and changes 12 test files. No src, scaffold, script or template file changes. Counts are unchanged: default tier +27 (24 red, 3 anchors D6, P2, DD2), integration +1, and the 20 parity runs flip.

**1. QA-Red test list, amended.**
- **Decoys.** Every `<instructions>` block in BUG-098's fixtures gains a column-0 example header: a `---` pair holding site-relevant decoy keys. This kills first-`---`-anywhere scans (private re-implementations of the locator).
  - Last-wins readers also get a column-0 decoy line in the body: R1, R2, P1 and P2.
  - D4 adds a second sprint file that carries `execution_mode:` only inside its `<instructions>` example. The count must be exactly 1.
  - SL2 adds a sibling file that sorts first and names `LIN-42` only inside its example header.
  - I1 gains an expect-WARN half: `source: "remote-authored"` appears only inside the example, and the real header says `local-authored`.
- **Exact bytes, per this plan's own wording.**
  - S1, S2, S3 and S6 compare `raw.slice(span.end)` before and after. The sealed check compared only the last N bytes, which cannot see an inserted separator.
  - S2 asserts that every line of the rewritten header ends CRLF.
  - The S3 and S6 fixtures have no blank line after the closer, which pins "the body separator is preserved".
  - L1, L2, C1 ("the only diff is the one inserted line"), W1 ("changes only the status line"), DD1 ("equals the original minus the first `approved:` line") and DD2 compare whole files.
- **Other additions.**
  - D5 adds the locator-throw case: an unterminated `<instructions>` block gives exit 2 and "cannot parse frontmatter".
  - R1 and R2 re-throw any non-exit error, and assert the `Gate: epic.ready-for-decomposition` header as the non-vacuity signal. The describe's "No TBDs here." fails `no-tbds` by design, so the exit code carries no signal.
  - FM1 asserts the local `story_id`.
  - The e2e asserts that `epics` survives and that the bytes after the closer are identical.
  - S3 and S5 each gain a malformed-framing half (item 2).

**2. Change shape, amended (binding; supersedes "A throw becomes `null`" under `sprint.ts (sites 1-4)`).**
- `parseFileFrontmatter` returns `framingError: true` (with `fm: {}`, `span: null`, `parseOk: false`) when `locateFrontmatter` throws. A `null` span keeps `framingError: false`.
- `rewriteFrontmatter` checks `if (parsed.framingError) return raw;` before any other branch. The waiver write, `stampFile` and `stampSprintClose` therefore never write a file whose framing the locator rejects. `stampSprintClose` then reports `didChange: false` through the existing equality rule.
- Readers still treat a throw as absent frontmatter (`fm: {}`).
- **Why.** The pinned shape turned a throw into `null`, and its `!span` branch then serialized a new block in front of `<instructions>`. Measured in the TPV scratch on an unterminated-header plan and on an unterminated-`<instructions>` plan: the `--allow-drift` waiver and `stampSprintClose` both planted a phantom. That breaks the item's `@rules` Gherkin and BUG-067's locator contract ("the caller must not fall back to treating the file as having no frontmatter").

**3. Build-phase twin rule.** This supersedes Task Breakdown row 6's timing for the build phase.
- In the build phase the Developer edits canonical only. They do **not** copy the two twins into `<ow>`.
- `<ow>` was cut from `sprint/S-41` before BUG-090's outer merge, so its live `assert_story_files.mjs` has no `locateFrontmatterFence`. Twins placed there fail ESM link. They turn `test/scripts/test_prep_reporter_context.node.test.ts` (0/2) and `test/scripts/dedupe-frontmatter.node.test.ts` (1/5) red (measured).
- The twins are made at integration (rule 21):
  1. `git merge --no-ff sprint/S-41` brings BUG-090's live pair.
  2. `cp` both scripts from the integrated canonical, then `cmp`. `dedupe_frontmatter.mjs` stays mode 755.
  3. Both land in the one outer commit.
- Measured on the simulated integrated tree: both anchors green, and `canonical-live-parity` 11/11.

**4. Named build-phase reds.** These are two-repo artifacts, not BUG-098's:
- `test/docs/gate-section-index-pinning.node.test.ts` S1c, 13/14;
- `test/scaffold/canonical-live-parity.red.integration.node.test.ts` 5a (integration tier).

Both come from BUG-090's `approved: false` templates in C4 canonical against the pre-merge live mirror. Both clear at integration (measured 14/14 and 11/11).

**5. Anchor count drift.** `gate-unit` is 27/27 at C4 and 30/30 on the integrated tree, because BUG-097 adds 3.

**6. Post-flight K-gates** (for the structure that no behavioural test can pin):
- K1: each of the 10 TS files imports its reader or writer from `frontmatter-locator` (`locateFrontmatter`, plus `frontmatterYaml`, plus `withFrontmatterYaml` for the writers). There is no private fence scan.
- K2: `command grep -nE "lines\[0\] !== '---'|startsWith\('---'\)|indexOf\('\\\\n---'|match\(/\^---"` over those 10 files lists no BUG-098 site.
- K3: the count of `trimStart().startsWith('---')` in `doctor.ts` is 0.
- K4: `rewriteFrontmatter` tests `framingError` first.
- K5: both scripts `import { locateFrontmatterFence } from './assert_story_files.mjs';`. `dedupe_frontmatter.mjs` is 755 in canonical and in live.
- K6: `git diff --name-only 2ea4832..<dev>` stays within the 12-file allow-list in the TPV report.

**7. DevOps D4 is unchanged:** the previous merge total **+27**.

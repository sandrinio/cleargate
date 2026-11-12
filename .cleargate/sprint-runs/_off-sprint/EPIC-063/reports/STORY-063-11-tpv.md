# STORY-063-11 TPV (role: architect, Mode: TPV, off-sprint EPIC-063 M2)

**TPV: BOUNCE.** QA-Red has 10 changes to make (listed below). The proposed plan amendments are G-M2-61 … G-M2-65 (below). They are for the orchestrator to copy into `plans/M2.md` § Amendments; I have not edited M2.md. If the 10 changes are applied exactly as written, a TPV re-check can be waived (13 / 08 / 09 precedent).

The branch is `story/STORY-063-11` @ e9e28c1, in worktree `scratchpad/wt11`, based on 68f9ee0. I worked read-only:
- I made no src or test edits.
- One temporary timing script ran in the worktree and was deleted. `git status` is clean.
- I did not run `npm run build` or `tsup`.
- I did not run wiki build, wiki ingest or doctor on the outer repo.

I checked against cli `main` ffb3a71 (10 merged), G-M2-59/60 and decision 13.

## Evidence
- **Unit, config and docs files** (`TMPDIR=$(mktemp -d /tmp/tpv11.XXXX) npx tsx --test …`):
  - 67 tests fail with `Cannot find module src/wiki/synthesis/session-brief.js`.
  - 2 tests fail on `lastAction` deep-equal.
  - The config and docs reds fail for 11 reasons: there is no `wiki.brief`; step 1 still says "Read this first" / "~3k"; the README still says "~3k-token"; there is no `brief.md` in §10.1/§10.2; there is no `brief:` block in config.example.
- **Handler, doctor, perf and hook files:** 50 tests, 47 fail and 3 pass.
  - 44 fail with `precondition: wiki build wrote wiki/brief.md`.
  - 1 fails because `BUCKET_SYNTHESIS_MAP` has no `brief`.
  - 2 fail because there is no "not built" line.
  - The 3 passes are guards: no `.cleargate/`, and "no hook change" ×2.
  - Every red fails for the right reason.
- **10's real exports** (ffb3a71):
  - `latestDecisions(allItems, n)` reads exactly the two D2 section patterns (`decisions.ts` `answeredPairs`).
  - It orders by date desc, undated last, ties in C order.
  - `readUnlabelledContradictions(wikiRoot)` parses `label: null`.
  - The reds' D7 and D2 c expectations match both functions.
  - `SYNTHESIS_PAGES` and `BUCKET_SYNTHESIS_MAP` now carry `decisions`, so the map pins take both pages.
  - `recompileSynthesis` writes `decisions` only on a byte difference. G-M2-64 asks the same of `brief`.
- **09 code the reds lean on:**
  - `rankCompletedSprints` reads report `generated_at` through `parseFrontmatter`, which uses js-yaml with `CORE_SCHEMA`. So the 5 null spellings and the unparseable-report case (G-M2-55 item 4) already hold in 09's code. These reds guard that 11 calls it over `allItems`.
  - `readSprintRunState('[]')` returns `ok` with 0 stories, and `'null'` returns `malformed`. This matters for default 7.
- **Timing, measured here:**
  - `git describe --tags --long` takes p50 64 ms, p95 126 ms and max 153 ms at load 8–12.
  - The in-process `runSessionStart` with/without p95 delta, with no git spawns: 12 trials of 20 interleaved pairs at load ≈ 14 gave −15 … +10 ms.
  - I simulated the as-written perf test with a zero-overhead brief (2 spawns + 3 ms). Over 15 trials at load 8–13, it false-failed 5 times. Interleaving the phases still left 4/15 failures. Change 4 rewrites that test.
- **Hygiene:**
  - No fixture contains a machine path or private data. Git identity is `qa@example.invalid`, and `GIT_CONFIG_GLOBAL=/dev/null`.
  - The hook stub writes absolute paths at runtime, inside temp fixtures only.
  - The live R6 file is read-only and named `*.live.integration.node.test.ts`, with `@cleargate-tier: integration`.
  - Every `afterEach` removes its temp roots.

## 1. Coverage
Each Gherkin scenario has reds that fail now for an 11 reason:

| Gherkin | Reds |
|---|---|
| S1 | doctor + handlers |
| S2 | ×3 sentinel spellings + live refresh |
| S3 | hooks ×2 hosts, docs step 1 ×2, perf |
| S4 | unit R3 |
| S5 | live R6 + 2-repo doctor case |
| S6 | all four inputs, plus exit codes |

R1–R6 are covered, and so are:
- C11.2 exports, C11.3 and C11.5;
- G-M2-21, -22, -23 (active line), -24, -25 and -27;
- blueprint scenarios 1–11;
- G-M2-55 items 1–6.

Gaps, each closed by a numbered change:
- **G-M2-59** (excerpt sanitizing: `[[`/`]]` removed, `;` → `,`, whitespace collapsed, no ellipsis). Nothing pins it → change 2.
- **G-M2-60** (the brief compiles from the scan, never from the relations input that carries an out-of-tree file). The handler reds pin outcomes only, which is consistent, but nothing distinguishes the two mechanisms → change 3.
- **The level-0 forms of truncated lists**, plus where `Planned:` and `Decisions:` stop shrinking. Unpinned, and a natural implementation prints a false `Planned: none` → G-M2-62, change 5.
- **G-M2-21 when the active sprint is hidden inside `+N more`.** Unpinned, and the printed N contradicts 12's truth → G-M2-63, change 6.
- **The release lookup timeout / error mapping and the release-line cap** (G-M2-23 says "each live line"). Unpinned → G-M2-61, changes 7–8.
- **G5c's measure** counts every line's newline (`wc -c`). The reds measure `join('\n')`, which can pass at 1,501 tokens → G-M2-62 item 3, change 9.

## 2. Over-fitting / reds that cannot fail
- **`carry_over: "true"` pinned as not carried** (`session-brief.red:350`). This contradicts the D-universe rule ("values have quotes stripped"), which the 12 oracle implements. So TS and the oracle would disagree on such an item → G-M2-64, change 1.
- **`one spawn per repo` (`:563`)** is not over-fitting. It enforces the blueprint's single `describe --long` call, which is the build (default 11 ruling).
- **"Lists never re-grow after a drop"** (`:722-725`) and the monotone drop vector are the plan's sequence (shrink, then drop), stated literally. Kept.
- **The `now()`-throws red** (`doctor:114`) can fail even if the Dev wraps the printer in `try`, because the brief then never prints. Kept.
- **No red that cannot fail.** The two mtime reds (`handlers:118`, `:127`) are live: `SHA_RUNNER` makes `checkContentUnchanged` false, so ingest never takes the no-op exit. The pass/fail of `:127` depends on whether the ingest is stamp-only. G-M2-64's "brief writes only on a byte difference on every ingest path" makes it robust.

## 3. Rulings on QA-Red's 16 defaults
The orchestrator's #4/#5/#7/#9/#10 are QA-Red's #5/#6/#8/#11/#13.

| # | Default | Ruling |
|---|---|---|
| 1 | Live strings are whole lines, prefix included | **ACCEPT** (C11.2 returns lines). |
| 2 | ` +N more` after the last item, no comma | **ACCEPT** for C11.1. 13's `, +N more` is the relations-block contract, not this one. |
| 3 | Incremental shrink: one list per step, re-check after each, all lists reach 3 before any goes to 0 | **ACCEPT.** The level-3 pass is sections 7, 6, 5, 3, 2. The level-0 pass is narrowed by #4. |
| 4 | Decisions' shrink form unpinned | **OVERRIDE (G-M2-62).** `Decisions:` and `Planned:` have no count. A zero-ID form would say nothing (`Decisions:`) or lie (`Planned: none`). Both go 5→3 and never to 0; at 3, Decisions shows 3 entries with no suffix. The level-0 pass covers sections 5, 3 and 2 only. Changes 5a and 5b. |
| 5 | Drop order 7, 6, 5, 4, 3; Waiting never dropped | **ACCEPT** (blueprint literal). |
| 6 | Truncation line `[…more in wiki/index.md]` (C11.2), not the Gherkin's bare text | **ACCEPT.** C11.2 and C12.2 both use the bracketed form. Gherkin S4's "the last line reads '…more in wiki/index.md'" is met by containment. This is a literal substitution, recorded in G-M2-62 item 4 (G-M2-32 precedent). |
| 7 | A state.json holding `null` or `[]` prints `state unknown` | **ACCEPT.** C5 is final, so `readSprintRunState`'s mapping stays as it is (`[]` → `ok`). session-brief.ts trusts an `ok` read only when `state.json` parses to a non-null, non-array object. It does one extra read, only on `ok`. Same result as 12's `jq -e 'type == "object"'` (G-M2-64). |
| 8 | Section budget 6000 − 400 − 100·r over the fact lines + truncation line | **ACCEPT**, with exact newline accounting (G-M2-62 item 3). The reds stay compatible, and the threshold shift stays exactly 100 B per repo. |
| 9 | Planned `m` counts every type; `n` counts 🟢; the sentinel sprint stays in `brief.md` | **ACCEPT** (D6 literal, G-M2-21). |
| 10 | `(date unknown)`, `no stories line`, carried unpinned there | **ACCEPT.** With no `**Stories:**` line, D4's fallback still applies (`### Carried Over` starting `None` → 0, else `unknown`). No new pin. |
| 11 | Calibrated perf allowance; one spawn per repo | **Allowance: OVERRIDE (G-M2-65).** Any p95-of-20 that contains git execs false-fails about 1 run in 3 at this machine's load, calibrated or not. The default-tier red times a spawn-free brief: interleaved pairs, flat **70 ms** (100 ms cumulative over 0.28.0 minus 06's ~30 ms). Change 4. **One spawn per repo: ACCEPT.** The Dev builds the live single-spawn lookup with a 1 s timeout (G-M2-61). The story's ingest-time "as of" fallback is **not** built in 11; only a §R step 7 G6 failure reopens it, by orchestrator decision. |
| 12 | Reports need `SPRINT-\d{2,}` | **ACCEPT.** It binds 12's oracle report lookup. |
| 13 | Decision sections = the two D2 patterns | **ACCEPT.** 11 adds no section logic of its own. D7 = `latestDecisions(allItems, 5)` as merged in ffb3a71. G-M2-58 binds the oracle and G-M2-59 governs the excerpt. |
| 14 | `Release: .: <tag> + <n> commits` | **ACCEPT** (C11.5 "labelled verbatim"). |
| 15 | R6 is a release-step live check | **ACCEPT**, with the skip guard fixed (change 10). §R step 1 names it as an expected red (G-M2-65). |
| 16 | Hook test: copied hook + `lib/`, tsx stub, 3 runs per host | **ACCEPT** (G-M2-27). No timing assert. A 60 s spawn timeout per run is ample. Output is deterministic because `.` has no `.git` in the fixture. |

Binding notes, checked:
- The unchecked-draft alarm stays a doctor line printed before the brief. No red puts it in `brief.md`, and `doctor:85` requires only brief lines after `ClearGate brief:`.
- The 1,500-token cap is enforced on G5c's measure (change 9).
- The R6 pointer follows decision 4 / G-M2-26 (`meta-pointer.live:31-43`).
- Decision 13: no red requires a decisions clause in step 1, and none should be added.

## 4. Flakiness
- **Perf red:** flaky as written (5/15 simulated false failures) → change 4.
- **Real-git doctor reds** (`doctor:161`, `:181`, `:188`, `:292`, and the perf red's first run): these assert exact `Release:` lines. Under the blueprint's 300 ms `spawnSync` timeout, an exec that took 350 ms (QA-Red measured up to that at load 15) prints `no tags` for a tagged repo, so these reds would flake.
  - The fix is in the implementation contract (G-M2-61: 1,000 ms; timeout → `unavailable`), not in the tests.
  - The same timeout would otherwise also cause false G5b mismatches.
- **Hook reds:** functional only, 7 hook runs of about 1.5 s each. No flake risk found.
- **Truncation binary searches:** each search over the deterministic compile is about 15 builds. They are not timing-sensitive.

## 5. Shape-change reds (Dev edits, not QA)
- **QA-Red's 3** (synthesis-parity map pins, `doctor-session-start.node.test.ts:287` 2→3, relocation live test 3 until §R) are correct.
- After merging main (ffb3a71), every real bucket's map pin lists both `decisions` and `brief`; `unknown` stays `[]`.
- `doctor-session-start.node.test.ts:293-305` (the ≤ 400-char blocked chunk) now also collects the "not built" line. It stays under 400 (about 214 chars) and needs no edit.

## Changes for QA-Red (numbered; apply exactly)
1. **`test/wiki/session-brief.red.node.test.ts:348-351` (D5).**
   - Under the D-universe rule (G-M2-64), `BUG-1` with `carry_over: "true"` counts.
   - Expect `'4 — BUG-1, BUG-102, BUG-99, CR-7'`; `BUG-2` (`false`) still does not count.
   - Retitle "carry_over exactly true" as "carry_over true, quoted or not".
2. **Same file, D7 describe, after `:425`.** New red, G-M2-59:
   - Two items: `EPIC-1` with `approved_at: "2026-11-02T00:00:00Z"` and body `decisionBody('Keep [[CR-5]]; drop the old cache;  then ship it in w9 w10 w11 w12 w13')`, and `EPIC-2` with `approved_at: "2026-11-01T00:00:00Z"` and body `decisionBody('Plain answer')`.
   - Assert `factOf(out, 'Decisions:') === '[[EPIC-1]] Keep CR-5, drop the old cache, then ship it in w9 w10; [[EPIC-2]] Plain answer'`.
   - Exact equality pins three things: the `[[`/`]]` removal, `;` → `,`, and "first 12 words, no ellipsis".
3. **`test/wiki/session-brief-handlers.red.node.test.ts`, the G-M2-55 item 5 describe, after `:171`.** New red, G-M2-60:
   - Build `makeRepo(docs(false))`, then `age(briefPath(fx))`.
   - Write an out-of-tree story directly under `delivery/`: `path.join(fx.deliveryRoot, 'STORY-042-03_Item.md')` = `docText({ id: 'STORY-042-03', fm: ['sprint_cleargate_id: SPRINT-42', 'ambiguity: 🟢 Low'] })`. `scanRawItems` never reads it; `refreshRelationPages` appends it to its relations input.
   - `runIngest` on it: code 0, and stdout includes `skipped`.
   - Then assert:
     - `planned(fx) === 'SPRINT-42 — 1/2 🟢'`;
     - `mtimeS(briefPath(fx)) === PAST`;
     - `readBrief(fx)` equals `readBrief(await freshBuild(fx))`.
4. **`test/commands/doctor-session-brief-perf.red.node.test.ts`: rewrite the timing.** This refines G-M2-27 (G-M2-65).
   - **Setup.** Config `release_repos: [cleargate-cli, mcp]` with **no** git repos created. Both are then `unavailable`, with zero spawns.
   - **Warm-up.** One run per arm.
   - **20 iterations, interleaved.** Each iteration times one run with `brief.md` present and one run after `fs.renameSync(brief, brief + '.off')`, then renames it back. Alternate which arm goes first on odd iterations.
   - **First-run asserts.** With the brief: `ClearGate brief:` appears and the Release line is `'Release: cleargate-cli unavailable; mcp unavailable'`. Without it: the output includes `NOT_BUILT`.
   - **Budget.** Assert `p95(with) − p95(without) ≤ 70` and log both p95s.
   - **Remove** `gitExecP95`, the allowance formula and `spawnSync`.
   - **Header comment.** Exec count is pinned by the D8 unit reds (`:563`, `:574`). The real 20-run timing with git is §R step 7.
5. **Same unit file, R3 describe** (with `syntheticRepo` in `test/wiki/_brief-support.ts:330` gaining a 3rd parameter `decisions = 2`, which adds answered `EPIC-1..EPIC-<decisions>` with distinct `approved_at` dates and 5-word answers). Two new reds (G-M2-62):
   - **5a.** Binary-search the smallest pad where `!/CR-3\d\d/.test(fact(out, 'Carried, no sprint:') ?? '')`. At that pad assert:
     - `factOf(out, 'Carried, no sprint:') === '25'`;
     - `factOf(out, 'Planned:') === 'SPRINT-60 — 0/0 🟢; SPRINT-61 — 0/0 🟢; SPRINT-62 — 0/0 🟢 +4 more'`;
     - P0/P1 has 3 `; `-entries and ends ` +27 more`;
     - Waiting ends ` — EPIC-100, EPIC-101, EPIC-102 +37 more`;
     - `Decisions:` is present with 2 entries;
     - the last line is `TRUNC_LINE`.
   - **5b.** With `decisions = 6`, binary-search the smallest truncating pad. Assert:
     - `Decisions:` holds exactly 3 `[[` and no `more`;
     - `Planned:` still has 5 entries + ` +2 more`.
6. **Same file, renderLiveBrief describe, after `:640`.** New red, G-M2-63. The file `Planned:` is `SPRINT-1 — 0/0 🟢; SPRINT-2 — 0/0 🟢; SPRINT-3 — 0/0 🟢 +2 more`.
   - `activeId 'SPRINT-5'` → `'Planned: SPRINT-1 — 0/0 🟢; SPRINT-2 — 0/0 🟢; SPRINT-3 — 0/0 🟢 +1 more'`.
   - With the file at `… +1 more` and `activeId 'SPRINT-4'` → the suffix is dropped (`…; SPRINT-3 — 0/0 🟢`).
   - `activeId 'SPRINT-0'` (not shown, sorts before the last shown entry) → unchanged.
7. **Same file, D8 describe, after `:596`.** New red, G-M2-61: a repo with `.git` whose `run` returns `{ status: null, stdout: '', stderr: '' }` → `'Release: a unavailable'`.
8. **G-M2-61 cap and empty list.**
   - **D8 describe:** `mkRepoDir(fx.root, 'x'.repeat(150))`, then `releaseLine(fx.root, ['x'.repeat(150)], fake('v1.0.0', 1))`. Assert ≤ 100 bytes, ending with `…`, starting with `Release: xxx`.
   - **`test/lib/wiki-config-brief.red.node.test.ts:39-42`:** add `brief(repoWith('wiki:\n  brief:\n    release_repos: []\n'))` deep-equals `{ release_repos: ['.'] }`.
9. **`test/commands/doctor-session-brief.red.node.test.ts:80` and `:285`.** Measure like G5c: `factLines(s.brief).reduce((n, l) => n + bytes(l) + 1, 0) <= 6000`, in place of `tokens(join('\n')) <= 1500`.
10. **`test/docs/session-brief-meta-pointer.live.integration.node.test.ts:30` and `:55`.**
    - Skip unless `fs.existsSync(path.join(META_ROOT, '.cleargate', 'delivery'))` (the plan's live-tier guard) **and** the file exists.
    - A standalone cli checkout whose parent holds an unrelated `CLAUDE.md` must skip, not fail.

## Amendment proposals (for `plans/M2.md` § Amendments; G-M2-57..60 already exist)

- **G-M2-61 (D8 release lookup; binds 11, with a note for 12).**
  - **Build.**
    - The lookup is live: one `spawnSync('git', ['-C', <abs repo>, 'describe', '--tags', '--long', '--abbrev=7'], { encoding: 'utf8', timeout: 1000 })` per repo whose `<repo>/.git` (file or dir) exists, and no spawn otherwise.
    - The story §3.2 ingest-time "as of <date>" fallback is not built in 11. Only a §R step 7 G6 failure reopens it, by orchestrator decision.
  - **Timeout.** 1,000 ms supersedes story §3.2's and the blueprint's 300 ms. Describe was measured at p50 64 / p95 126 / max 153 ms at load 8–12, and QA-Red saw up to 350 ms at load 15. The timeout is a hang guard; at 300 ms it turns a tagged repo into a false line in the default tier and in G5b.
  - **Mapping.** Each of these prints `<repo> unavailable`:
    - no `.git`;
    - a spawn `error`, or `status === null` (timeout, git absent);
    - `status` 0 with trimmed stdout not matching `^(.*)-(\d+)-g[0-9a-f]+$`.

    A non-zero `status` prints `<repo> no tags`.
  - **Cap.** `releaseLine`, the only function that knows the repo count, cuts its whole line (prefix included) to `LIVE_RELEASE_RESERVE_PER_REPO × repos.length` bytes. The cut lands on a UTF-8 boundary and appends `…`, the same cut as the active line. `renderLiveBrief` caps only the active line.
  - **Config.** `wiki.brief.release_repos: []` falls back to `['.']`, the same as a non-list.
  - **12.** The oracle keeps its two-call form and never times out.
- **G-M2-62 (R3 truncation made exact; binds 11, with a C12.2 note for 12).**
  1. **Steps.** Each step is followed by a fit check, and truncation stops at the first fit:
     - (a) level 3, one list per step, in section order 7, 6, 5, 3, 2;
     - (b) level 0, sections 5, 3, 2 only. `Planned:` and `Decisions:` have no count, so they stay at 3 until dropped;
     - (c) drop whole sections 7, 6, 5, 4, 3. Section 2 is never dropped.

     No list grows back after a drop.
  2. **Forms.**
     - Level 3: the first 3 entries then ` +N more` (N = total − 3) for Waiting, P0/P1, Carried and Planned. `Decisions:` shows its first 3 entries with no suffix.
     - Level 0: the count part only, with ` — …` omitted: `P0/P1 bugs: 30`, `Carried, no sprint: 25`, `Waiting on you: <a> failing gates · … · <d> unfinished close checklists`.
  3. **Budget accounting.**
     - Each compile-time fact line and the truncation line (when present) counts its bytes + 1 (`\n`). Their sum must be ≤ `BRIEF_TOKEN_CAP×4 − LIVE_ACTIVE_RESERVE − LIVE_RELEASE_RESERVE_PER_REPO × r − 2`. The 2 bytes are the two live lines' newlines.
     - Live lines are capped at 400 and 100·r bytes, newline excluded.
     - Then G5c's measure (`wc -c` over the eight prefixed lines) is ≤ 6,000 B = 1,500 tokens on every input. Without this, the worst case is 6,003 B = 1,501 tokens.
     - `r` is `release_repos.length` at compile time. Accepted edge: a later `release_repos` change with no rebuild can exceed the cap by 100 B per added repo until the next ingest or build.
  4. **Truncation line.** It is `[…more in wiki/index.md]` (C11.2/C12.2). This is a literal substitution for Gherkin S4's bare text, recorded here as the G-M2-32 precedent requires.
  5. **12 (C12.2).** A counted list line with no IDs is k = 0 and has no `+N` to check. `Decisions:` compares its k shown ids (G-M2-59) and has no `+N`.
- **G-M2-63 (G-M2-21 when the active sprint is hidden; binds 11).**
  - `renderLiveBrief` removes the live active sprint's `Planned:` entry when it is shown.
  - When it is not shown, the line ends ` +N more`, and the active ID sorts after the last shown entry in D6 order (numeric stem asc, ties in C order, no stem last), print N−1. At 0, the suffix is dropped.
  - Otherwise the line is unchanged.
  - Reason: with ≥ 6 non-terminal sprints, or with Planned truncated to 3, the active sprint sits inside `+N`. An unchanged N contradicts 12's truth (|D6 minus active| − k), which is a G5b mismatch.
- **G-M2-64 (TS reads facts the D-universe way; binds 11).**
  - **Quoted scalars.** D-universe strips quotes. So `carry_over` (D5) counts as YAML `true` or the string `"true"`, and `cached_gate_result.pass` (D2 a) counts as YAML `false` or the string `"false"`. Corpus today: 35 `carry_over: true` and 75 `pass: false`, none quoted.
  - **D1.** `readSprintRunState` stays as C5 froze it. session-brief.ts trusts an `ok` read only when `state.json` parses to a non-null, non-array object; otherwise it prints `state unknown`.
  - **Write path.** On every ingest path, `brief.md` is written only when its bytes differ (as 10 does for `decisions`); the bootstrap writes it when it is missing. Build writes it as it writes the other pages.
- **G-M2-65 (§R and the default-tier timing; refines G-M2-27).**
  - **Default-tier timing.** The in-process timing red times a spawn-free brief: release repos without `.git`, 20 interleaved pairs, p95 delta ≤ **70 ms**. The 100 ms budget is cumulative over 0.28.0, and 06 already spent ~30 ms (flashcard 2026-11-12 `#perf #budget`). The D8 unit reds pin the exec count. Measured noise at load ≈ 14 is −15 … +10 ms; with real git execs, the test false-fails about 1/3 even when calibrated.
  - **§R step 7 (G6).** The "before" side is **v0.28.0**, not v0.29.0 (same flashcard). Run it **after step 9**, so the "after" side makes the two git calls (`cleargate-cli`, `mcp`) this repo ships with.
  - **§R step 1.** The `npm run test:integration` expected reds gain `test/docs/session-brief-meta-pointer.live.integration.node.test.ts` (2 tests) until step 9.

## Proposed flashcards (for orchestrator approval; not appended)
- `2026-11-12 · #perf #test-harness · p95-of-20 timings with git execs false-fail ~1/3 at load 8–13 even calibrated; time the exec-free path, pin exec count.` This supersedes the 2026-11-12 `#qa-red #perf` calibration card.
- `2026-11-12 · #wiki #brief · A 300 ms git timeout under load prints "no tags" for a tagged repo; map timeouts to "unavailable", allow 1 s.`
- `2026-11-12 · #wiki #brief · Planned/Decisions carry no count: shrinking them to 0 IDs prints a lie ("Planned: none"); count-less lists stop at 3.`
- `2026-11-12 · #wiki #brief · A "+N more" list that hides the live active sprint must print N-1 at render, or the oracle's +N mismatches.`

*Script incidents: none. No `run_script.sh` invocation; the timing probes ran from the scratchpad and one temporary file in wt11, which was deleted.*

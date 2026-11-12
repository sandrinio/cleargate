# STORY-063-12 TPV (role: architect, Mode: TPV, off-sprint EPIC-063 M2)

**TPV: BOUNCE** (11 numbered changes for QA-Red, below)

Reviewed: wt12 `story/STORY-063-12` @ 81ed826 (base cli main 7e08cf1). Checked against STORY-063-11 as built (936892a, merged as c7e371f), M2 C11/C12, D1–D8, G-M2-46/55/58..70 and decision 16.

## What I ran (nothing in wt12 or the main checkout was modified)
- **wt12 reds at HEAD**, load ≈ 11:
  - `brief-oracle.red`: 106 red, 1 guard. Every red fails with bash exit 127 (`scripts/brief-oracle.sh` missing). Wall time **48.8 s**, all of it setup and failing spawns.
  - `orientation-eval.red`: 52 red, 1 guard. Failures are the missing module (exit 1 instead of 2 in the CLI cases). 1.7 s.
  - `cr075-standalone-contract`: 8/8 green with the new files.
  - All of these are the right reasons.
- **11 as built**, in a scratch tree (`git archive 936892a` plus wt12's 43 new files; since deleted):
  - `brief-truth-oracle.red`: "eight prefixed lines in C11.1 order" and the "third witness" both **pass** for both variants. The 9 other reds fail only on the missing oracle (exit 127).
  - The corpus guards pass.
  - LINES_A/B therefore match 11 byte for byte, as the 11 post-flight also found.
- **Proposed corpus edits, against 936892a.** The SPRINT-9 `sprint_goal: |` block scalar and the bait `**Stories:**` line (change 4) print byte-identical Active and Last closed lines. The SPRINT-10 self-reference prints `2/4` until 11-F1 (G-M2-66) lands, and `2/3` after it. So with change 4b, the third witness and the corpus compare reds depend on 11-F1, which is expected and in order.
- **Exec cost at load ≈ 11:** jq 61 ms, awk 75 ms, git 113 ms per process. One corpus copy plus git init takes about 0.5 s.
- **Real-corpus census** (read-only `scanRawItems` over 623 raw files):
  - 0 frontmatter parse skips.
  - 5 files start with `<instructions>`.
  - 5 of 6 `sprint_goal` values are `|` block scalars (SPRINT-42 and SPRINT-43 among them).
  - 17 `# ` titles contain `; `, BUG-068 among them (Completed).
  - Every real state.json has `last_action` ≤ 88 chars.
- **Platform facts:**
  - macOS bash is 3.2.57, and awk is BSD one-true-awk 20200816 (it supports `{n}` intervals).
  - jq is 1.7.1-apple, BSD sed and BSD sort.
  - Under `en_US.UTF-8`, `sort` orders `done Done Zed`. Under this shell's `LANG=C.UTF-8` it orders `Done Zed done`, the same as C order.

## Judgement

### 1. Coverage
Every Gherkin scenario (S1 Outline A/B and the static check; S2 planted carried plus jq missing; S3, S4, S5 as units), every R (R1 to R9) and C12.1–C12.3 has a red that fails now for the right reason. The gaps that bit or would bite on real data:
- **D1 block-scalar goal** (G-M2-69.2). The corpus uses only quoted scalars, and 5 of 6 real plans use `|`. → change 4a and change 6 E1.
- **G-M2-69.3/.4/.5/.6 and G-M2-66/67** (decision 16) have no reds. → changes 4, 5 and 6.
- **`release_repos` block lists** have no red. This repo's own `config.yml` uses block style for `ingest_buckets`. → G-M2-74, change 6 E8.
- **C-order reds are vacuous on this machine.** `LANG=C.UTF-8` already sorts in code-unit order, so a script without `LC_ALL=C` passes them. → change 1.
- **Missing live lines are excused by the truncation line.** C12.2 as worded lets a brief drop `Active sprint:`, `Waiting on you:` and `Release:` behind `[…more in wiki/index.md]`. C11.2's live markers and G-M2-62.1 never drop them. → G-M2-72, change 5.
- **Story R2's "ordering-insensitive" vs C12.2's D-order prefix.** This is unpinned, and C12.2 wins (G-M2-20). → change 5.
- **Raw brief.md in compare mode** (the §2.2 step 3 spec gap). → G-M2-73, change 5.
- **Eval:**
  - Substring scoring false-PASSes `SPRINT-9` on "SPRINT-99", and the corpus itself carries SPRINT-99 (BUG-15).
  - Case-sensitive scoring false-FAILs "Rollup counter…".
  - The Gherkin S3 clause "records each answer" is unpinned.
  - The cost-cap flag and the default model have no red: a default `--model` other than Opus would make the `--version 0.28.0` baseline incomparable with the candidate.
  - → G-M2-77, change 8.
- **No exec-count property on the oracle.** A per-file loop would cost about 8 s per run on the corpus and minutes on the real one. → G-M2-75, change 6 E9.

### 2. Agreement with 11 as built
The line prefixes, ` +N more`, `[…more in wiki/index.md]`, `<ID> — <goal> — state unknown`, `<repo> unavailable` / `<repo> no tags` / `<repo>: <tag> + <n> commits`, the N−1 rule (`Planned: SPRINT-10 — 2/3 🟢 +1 more`) and the Decisions `[[ID]]` sequence all match 936892a.

P0/P1 parsing:
- A naive `; ` split works today. G-M2-67 makes it the rule, and 11-F1 makes titles free of `;`.
- The real titles carry ` — `, backticks, commas and an unbalanced `("`. G-M2-67 already defines the rule ("after the first ` — `"); the red is change 5(e).

No red fails against a correct 11 plus 12, except the third witness and the corpus compare between change 4b and 11-F1. That gap is intended.

### 3. Over-fitting
- The facts JSON value shapes and the exit codes FAIL=1, INCOMPLETE=3 and usage=2 go beyond C12. I am **ratifying them, not loosening them** (G-M2-71, G-M2-77): the eval and G5b need stable shapes, and distinct exit codes are useful.
- The `renderEvidence`, `corpusTreeSha256` and `runQuestion` signatures are test seams the Dev implements. They are acceptable.
- No red is vacuous: the facts helper throws without JSON, and the independence regex requires `\bjq\b`.
- One red is weak: the C-order reds under `LANG=C.UTF-8` (change 1).

### 4. Rulings on the QA-Red defaults

| # | Default | Ruling |
|---|---|---|
| 1 | Facts JSON value shapes | **ACCEPT**, frozen as G-M2-71 |
| 2 | Non-Decisions lists ordering unpinned | **OVERRIDE**: every list compares in D-order (C12.2; story R2's "ordering-insensitive" is superseded). Red in change 5(d). |
| 3 | Mismatch stream unpinned | **OVERRIDE**: `mismatch:` lines go to stdout. Diagnostics, usage and jq/marker errors go to stderr (change 2). Value rendering after `brief=`/`truth=` stays unpinned, except the planted carried case. |
| 4 | Titles/excerpts not compared; third witness pins 11 | **ACCEPT** (verified green against 936892a) |
| 5 | Spec gap §2.2 step 3 | **RULED** in G-M2-73: the pipe form is canonical, and the oracle refuses raw `brief.md` with exit 2 (change 5(f)) |
| 6 | Exit 2 for usage / unreadable brief / missing repo | **ACCEPT** (G-M2-71) |
| 7 | `release_repos` flow form only | **OVERRIDE**: block lists, `[]` and decoys too (G-M2-74, change 6 E8) |
| 8 | Eval defaults | INCOMPLETE beats BASELINE and SMOKE (exit 3); FAIL and SMOKE FAIL exit 1; `hookOk false` fails release and smoke runs and is `n/a` for baseline; empty token lists are never correct: **ACCEPT**. Token case sensitivity: **OVERRIDE**, case-insensitive with a trailing-digit boundary. `--model` default: **OVERRIDE**, `claude-opus-5-5` (GATING_MODEL). BASELINE wins over SMOKE when `--version` is given with a non-Opus model: **added**. All in G-M2-77. |
| 9 | Waiting tokens = first five ids | **ACCEPT** |
| 10 | Page tokens EPIC-23, CR-130+BUG-26, `rollup counter`, CR-099 | **ACCEPT** |
| 11 | No live `*.integration` eval test | **ACCEPT** (manual §R step 8; baseline per G-M2-28) |
| 12 | 2-digit sprint ids for reports | **ACCEPT** (`isSprintReportPath` needs `SPRINT-\d{2,}`) |

### 5. Hygiene, flake and cost
- **Portability.** The tests spawn `bash` from PATH, which is 3.2 on macOS, with BSD awk/sed/sort/find, and GNU tools on Linux.
  - The Dev must avoid bash 4 features (`declare -A`, `mapfile`, `${v,,}`), GNU-only options (`sed -i`, `grep -P`, `find -printf`, `sort -V`, gawk's `gensub` and 3-arg `match`) and jq ≥ 1.7-only builtins (`trim`, `ltrimstr`/`rtrimstr` are fine, `pick`, `abs`, `toarray`).
  - `export LC_ALL=C` goes at the top.
  - `jq` presence is checked first, as already pinned.
- **Machine paths.** None in the fixtures; the corpus guard checks it.
- **Cost.** `run-default-tests.mjs` runs files **serially** (`--test-concurrency=1`).
  - As sealed: about 150 oracle runs × ~1.5 s (an oracle with ~20 execs at load ≈ 11), plus about 50 corpus copies × ~0.6 s, plus 11 wiki builds in R3. That adds **≈ 5 min to every `npm test` at load 10–15** (about 1 min on a quiet machine).
  - After changes 3, 5, 6 and 7: about 45 s for the oracle file (50 compare spawns, 4 at a time), about 25 s for R3 (4 builds) and about 5 s for the eval, so **≈ 1.2 min**.
  - The D1–D8 synthetic matrix (≈ 70 repos) moves to `*.red.integration.node.test.ts` (≈ 2–3 min, run targeted plus at §R step 1).
- **Naming.** All new default-tier files are `*.node.test.ts`. The edges file is `.red.integration.node.test.ts`. The eval's live run is not a test.
- **Orphan process.** `fakeClaude('sleep 10')` leaves an orphan `sleep` for 10 s after `spawnSync`'s 500 ms timeout (measured). → `exec sleep 10`.

## Bounce list (QA-Red applies exactly; wt12 line numbers at 81ed826)

### Change 1: `test/wiki/_oracle-support.ts:73`
The default env becomes `{ ...process.env, TZ: 'UTC', LC_ALL: 'en_US.UTF-8', LANG: 'en_US.UTF-8' }`. A non-C collation locale makes the C-order reds bite. On a Linux machine without the locale, this falls back to C harmlessly.

### Change 2: `test/wiki/_oracle-support.ts:81`
`mismatches` reads **stdout only**: `stdout.split('\n').filter((l) => l.startsWith('mismatch:'))`. `out` still holds both streams for messages. (Default 3 overridden; G-M2-71.)

### Change 3: `test/wiki/_oracle-support.ts` additions
- **(a) `sharedCorpus`.** `export function sharedCorpus(o: CorpusOpts = {}): string` is memoised by `${o.active !== false}|${o.git !== false}`. It returns one read-only `corpusRepo(o)` per key for the life of the file. Tests that write into a repo keep `corpusRepo()`.
- **(b) `SHELL_TOOLS`.** `export const SHELL_TOOLS` is the tool array now inline at `:116`. `pathWithoutJq` uses it.
- **(c) Async runner.**
  - `export function runOracleAsync(args: string[], opts: { input?: string; env?: NodeJS.ProcessEnv; cwd?: string } = {}): Promise<Run>`. It uses `spawn('bash', [ORACLE, ...args])` with the same default env as change 1, writes `opts.input ?? ''` to stdin and ends it, collects both streams, kills the child after 60 s, and resolves on `close` with the same `Run` shape (stdout-only `mismatches`). A spawn `error` resolves with `status: null`.
  - `export const compareAsync = (briefText: string, repo: string, opts: { cwd?: string } = {}): Promise<Run> => runOracleAsync(['--compare', '-', repo], { input: briefText, cwd: opts.cwd });`

### Change 4: corpus (`test/fixtures/orientation-corpus/.cleargate/…`) and its guards
- **(a) G-M2-69.2, end to end.** In `delivery/pending-sync/SPRINT-9_Session_Brief_Rollout.md`, replace the line `sprint_goal: "Ship the session brief so a fresh orchestrator starts oriented"` with these three lines:
  ```
  sprint_goal: |
    Ship the session brief so a fresh orchestrator
    starts oriented
  ```
  `ACTIVE_LINE_A` is unchanged (verified on 936892a).
- **(b) G-M2-66.** In `delivery/pending-sync/SPRINT-10_Index_Follow_Ups.md`, insert `sprint_cleargate_id: SPRINT-10` on the line after `sprint_goal:`. LINES_A/B and FACTS_A/B stay `2/3`. They are red on 936892a (`2/4`) and green after 11-F1.
- **(c) G-M2-69.6, end to end.** In `sprint-runs/SPRINT-08/SPRINT-08_REPORT.md`, the `**Stories:**` line becomes exactly:
  `**Stories:** 5 planned, 3 shipped, 2 carried over  (see **Notes:** "late QA \ backlog`
  That is two spaces before `(`, one literal backslash and an unbalanced `"`/`(`. Then `_oracle-support.ts:141` becomes:
  `export const LAST_CLOSED = 'SPRINT-08 (2026-10-05) — Shipped — 5 planned, 3 shipped, 2 carried over  (see **Notes:** "late QA \\ backlog — carried 2';`
  936892a prints exactly this.
- **(d) `test/wiki/orientation-corpus.node.test.ts`:**
  - `:43` (the `SPRINT-10 has 3 members` guard): the filter becomes `(i) => i.fm['sprint_cleargate_id'] === 'SPRINT-10' && !i.id.startsWith('SPRINT-')`. Without it, the guard reads 4.
  - Add to that test: `assert.equal(items.find((i) => i.id === 'SPRINT-10')?.fm['sprint_cleargate_id'], 'SPRINT-10');`
  - Add to the sprints test (`:24`): `assert.match(fs.readFileSync(path.join(cg('delivery', 'pending-sync'), 'SPRINT-9_Session_Brief_Rollout.md'), 'utf8'), /^sprint_goal: \|\n  Ship the session brief/m);` and `assert.match(report, /^\*\*Stories:\*\* 5 planned, 3 shipped, 2 carried over {2}\(see \*\*Notes:\*\* "late QA \\ backlog$/m);`

### Change 5: `test/wiki/brief-oracle.red.node.test.ts` (default tier)
- **(a) Move the edges out.** Move the describes at `:163` (D1), `:197` (D2), `:291` (D3), `:326` (D4), `:390` (D5/D6), `:431` (D7) and `:486` (D8), with their helpers at `:142-161`, `:318-324`, `:426-429` and `:473-484`, into the new `test/wiki/brief-oracle-edges.red.integration.node.test.ts`. Change nothing except the change 6 additions. Keep the header contract comment in both files.
- **(b) Memoise facts.**
  - The variant A describe (`:80`) computes `facts(sharedCorpus())` once in a `before` hook. Each D-assertion test reads that value.
  - "two runs are identical" makes one more `runOracle([sharedCorpus()])` and compares its stdout with the first run's stdout, which `before` keeps.
  - Variant B uses `sharedCorpus({ active: false })`. The no-git case uses `sharedCorpus({ git: false })`. The relative-path case uses `cwd: sharedCorpus()`. The space case copies `sharedCorpus()`.
  - "facts mode is read-only" (`:68`) keeps a private `corpusRepo()`.
- **(c) Run the compare blocks concurrently.**
  - The four compare describes (`:524`, `:544`, `:585`, `:656`) get `{ concurrency: 4 }`. Their tests become `async`, every `compare(...)` becomes `await compareAsync(...)`, every `runOracle(...)` becomes `await runOracleAsync(...)`, and `corpusRepo()` becomes `sharedCorpus()` (or `sharedCorpus({ active: false })`).
  - The exception is "the oracle reads the raw files" (`:573`), which keeps a private `corpusRepo()`.
  - The "exit codes and errors" describe (`:669`) stays synchronous.
- **(d) G-M2-72, new and changed tests.**
  - `:633`: replace `` `Planned: none\n${TRUNC_LINE}\n` `` with `` `${LIVE0}Planned: none\n${TRUNC_LINE}\n` ``.
  - `:648`: prefix both briefs with `LIVE0`. Define it at file top:
    `const LIVE0 = 'Active sprint: none\nWaiting on you: 0 failing gates · 0 open questions · 0 unlabelled contradictions · 0 unfinished close checklists\nRelease: . unavailable\n';`
  - New test in the `:656` describe: `'the truncation line never excuses Active sprint, Waiting on you or Release (C11.2 live lines; G-M2-62.1)'`:
    - `bad(await compareAsync(brief({ active: null }, LINES_A, [TRUNC_LINE]), sharedCorpus()), ['active_sprint']);`
    - `bad(await compareAsync(brief({ waiting: null, release: null }, LINES_A, [TRUNC_LINE]), sharedCorpus()), ['release', 'waiting']);`
  - New test in the `:585` describe: `'lists compare in D-order (C12.2): a shuffled list is a mismatch'`:
    - `bad(…brief({ carried: 'Carried, no sprint: 4 — BUG-13, BUG-12, BUG-15, STORY-008-05' })…, ['carried'])`
    - `bad(…brief({ waiting: w(' — CR-130, BUG-22, CR-098-Legacy-Hyphen-Slug, EPIC-22, SPRINT-08, STORY-009-04') })…, ['waiting'])`
    - `bad(…brief({ planned: 'Planned: SPRINT-11 — 0/1 🟢; SPRINT-10 — 2/3 🟢' })…, ['planned'])`
- **(e) G-M2-67, new test in the `:585` describe:** `'P0/P1 titles may carry " — ", backticks, ** and quotes (G-M2-67 split)'`:
  - `ok(…brief({ p0p1: P0P1_TRICKY })…)`, where ``const P0P1_TRICKY = 'P0/P1 bugs: 3 — BUG-20 Webhook — retry `drops` the **"second"** event; BUG-21 Login (times "out — on **slow**; BUG-25 Cache — \'stale\' `page`';``
  - ``ok(…brief({ p0p1: 'P0/P1 bugs: 3 — BUG-20 Webhook — retry `drops` **"x"**; BUG-21 a — b +1 more' })…)``
  - `bad(…brief({ p0p1: 'P0/P1 bugs: 3 — BUG-20 Webhook — retry; BUG-25 Login — x; BUG-21 y' })…, ['p0p1'])`
- **(f) G-M2-69.6, new test in the `:585` describe:** `'brief text is data: globs, quotes, parens and backslashes never expand or break the parse'`:
  - Setup: `const bait = tmp('cg-bait-'); for (const n of ['aNotes:b', 'a"second"b', '[[EPIC-99]]']) fs.writeFileSync(path.join(bait, n), '');`
  - Input: `const input = brief({ p0p1: P0P1_TRICKY, decisions: 'Decisions: [[CR-130]] **Label:** raised it ("make decisions, see *; [[EPIC-20]] a (b; [[EPIC-20]] "c; [[CR-14]] d \\ e; [[EPIC-23]] f' });`
  - `ok(await runOracleAsync(['--compare', '-', sharedCorpus()], { input, cwd: bait }));`
  - `bad(await runOracleAsync(['--compare', '-', sharedCorpus()], { input: input.replace('over  (see', 'over (see'), cwd: bait }), ['last_closed']);` This proves interior whitespace is compared, not word-split away.
- **(g) G-M2-73, new test in the `:669` describe:** `'a raw wiki/brief.md (live markers) is refused: exit 2, stderr points at doctor --session-start, no mismatch line'`:
  - Input: `['# Session Brief', '', '> Generated by x.', '', '<!-- live:active-sprint -->', LINES_A.waiting, LINES_A.p0p1, LINES_A.lastClosed, LINES_A.carried, LINES_B.planned, LINES_A.decisions, '<!-- live:release -->', ''].join('\n')` against `corpusRepo()`.
  - Assert `status === 2`, `stderr` matches `/doctor --session-start/`, and `mismatches` is `[]`.
- **(h) Header contract comment.** Add: mismatch lines on stdout; raw `brief.md` input → exit 2; `Active sprint:` / `Waiting on you:` / `Release:` are never excused; lists compare in D-order; the live-cap prefix rule (G-M2-69.5).

### Change 6: new `test/wiki/brief-oracle-edges.red.integration.node.test.ts`
This holds the moved edges plus the tests below. It stays synchronous and imports from `_oracle-support.js`.

**E1 (G-M2-69.2, G-M2-76a): D1 goal forms.**
- For each `ind` of `['|', '|-', '>', '>-']`: `assert.equal(d1({ goal: `${ind}\n  Goal text\n    here\nowner: "not the goal"` }), OK_LINE)`.
- For each `v` of `['""', '~', 'null', 'Null', 'NULL']`: `assert.equal(d1({ goal: v }), 'SPRINT-12 — no goal — Active/x done — 1 stories: Done=1')`.

**E2 (G-M2-69.3): D1 on an `ok` object.**
- `d1({ state: '{}' })` → `'SPRINT-12 — Goal text here — / — 0 stories'`
- `d1({ state: JSON.stringify({ sprint_status: 'Active', stories: { S1: { state: 'Done' }, S2: {}, S3: 3, S4: { state: 7 } } }) })` → `'SPRINT-12 — Goal text here — Active/ — 4 stories: Done=1, unknown=3'`
- `d1({ state: JSON.stringify({ sprint_status: 1, last_action: 'x done', stories: [] }) })` → `'SPRINT-12 — Goal text here — /x done — 0 stories'`
- All three are 936892a's own output for the same input (read from `activeSprintLine` and `readSprintRunState`).

**E3 (G-M2-76b): D2 b orphan answers.** `item(f, 'EPIC-1', { body: loopSection('- **Human Answer:** {Waiting}') })` and `item(f, 'EPIC-2', { body: loopSection('- **Human Answer:** Decided') })` → `open_questions === 1`, `ids` deep-equal `['EPIC-1']`.

**E4 (G-M2-69.1): rows are files.**
- Fixture: `sprint(f, 'SPRINT-5', 'Draft')`.
- CR-7: `item(f, 'CR-7', { file: 'CR-7_One.md', fm: [...failGate, 'carry_over: true'] })` and `item(f, 'CR-7', { file: 'CR-7_Two.md', fm: [...failGate, 'carry_over: true'] })`.
- STORY-001-01: `item(f, 'STORY-001-01', { file: 'STORY-001-01_A.md', fm: ['sprint_cleargate_id: SPRINT-5', 'ambiguity: 🟢 Low'] })` and `item(f, 'STORY-001-01', { file: 'STORY-001-01_B.md', dir: 'archive', status: 'Completed', fm: ['sprint_cleargate_id: SPRINT-5', 'ambiguity: 🟢 Low'] })`.
- Expected:
  - `waiting` deep-equals `{ failing_gates: 2, open_questions: 0, unlabelled_contradictions: 0, close_checklists: 0, ids: ['CR-7'] }`
  - `carried` deep-equals `{ count: 2, ids: ['CR-7', 'CR-7'] }`
  - `planned` deep-equals `[{ id: 'SPRINT-5', green: 2, members: 2 }]`

**E5 (G-M2-69.4): D4 details.** Each case uses `closed(f, 'SPRINT-05', '2026-09-01T00:00:00Z')`.
- (i) `report(f, 'SPRINT-05', ['generated_at: "2026-09-01T00:00:00Z"'], '**Stories:** 4 planned, 4 shipped\n')` → `'SPRINT-05 (2026-09-01) — unknown — 4 planned, 4 shipped — carried unknown'`
- (ii) `report(f, 'SPRINT-05', ['status: "Shipped"', 'generated_at: "2026-09-01T00:00:00Z"'], '**Stories:**\n\n**Stories:** 9 planned, 2 carried\n\n## 4. Carried over (from the plan)\n\n> guidance\n\nNone.\n')` → `'SPRINT-05 (2026-09-01) — Shipped — no stories line — carried 0'`
- (iii) Same as (ii) but the body is `'**Stories:** 4 planned, 3 shipped\n\n### Carried Over\n\nnone of note\n'` → `'SPRINT-05 (2026-09-01) — Shipped — 4 planned, 3 shipped — carried unknown'`

**E6 (G-M2-69.5): live caps.**
- Helper, mirroring `session-brief.ts` `capBytes`:
  ```ts
  const capBytes = (s: string, max: number): string => {
    if (Buffer.byteLength(s) <= max) return s;
    let out = '';
    for (const ch of s) {
      if (Buffer.byteLength(out + ch) + 3 > max) break;
      out += ch;
    }
    return `${out}…`;
  };
  ```
- Active cap:
  - Split `d1` into `d1Repo(o): string` (builds and returns the repo) and `d1(o) = facts(d1Repo(o)).active_sprint`. The repo is `d1Repo` with `state: JSON.stringify({ sprint_status: 'Active', last_action: 'x'.repeat(500), stories: { S1: { state: 'Done' } } })`.
  - `truth = facts(repo).active_sprint`. Assert it equals `` `SPRINT-12 — Goal text here — Active/${'x'.repeat(500)} — 1 stories: Done=1` ``.
  - `const line = capBytes(`Active sprint: ${truth}`, 400);` and `const tail = 'Waiting on you: 0 failing gates · 0 open questions · 0 unlabelled contradictions · 0 unfinished close checklists\nRelease: . unavailable\n[…more in wiki/index.md]\n';`
  - `ok(compare(`${line}\n${tail}`, repo))`
  - `bad(compare(`${line.slice(0, -2)}y…\n${tail}`, repo), ['active_sprint'])`
  - On `repo2 = d1Repo()` (OK_LINE truth): `bad(compare(`Active sprint: SPRINT-12 — Goal text…\n${tail}`, repo2), ['active_sprint'])`
- Release cap:
  - `const tag = `v1-${'a'.repeat(120)}`;`
  - `repoOf({}, { git: { tag } })` → `const rl = capBytes(`Release: .: ${tag} + 0 commits`, 100);`
  - `ok(compare(`Active sprint: none\nWaiting on you: 0 failing gates · 0 open questions · 0 unlabelled contradictions · 0 unfinished close checklists\n${rl}\n[…more in wiki/index.md]\n`, repo))`

**E7 (G-M2-66): a sprint is not its own member.** In the D6 test (moved from `:409`), after the `for` loop, add `sprint(f, 'SPRINT-5', 'Draft', ['sprint_cleargate_id: SPRINT-5', 'ambiguity: 🟢 Low']);` (same file key, so it overwrites). The expected array is unchanged: `{ id: 'SPRINT-5', green: 1, members: 2 }`.

**E8 (G-M2-74): `release_repos` parsing.** Add `withConfig(setup, configText)`, which is `withRepos` with a raw config string.
- Block list with a comment and a decoy:
  - Config: `'wiki:\n  ingest_buckets:\n    - epics\n  # release line\n  brief:\n    release_repos:\n      - a\n      - "sub/b"\n\ngates:\n  release_repos: [nope]\n'`
  - Setup: `mkGit(root, 'a'); git(<a>, 'tag', 'v1.0.0'); mkGit(root, 'sub/b')`
  - Expected: `'a: v1.0.0 + 0 commits; sub/b no tags'`
- `'wiki:\n  brief:\n    release_repos: []\n'` → `'. unavailable'`
- Decoys only, `'gates:\n  release_repos: [nope]\nbrief:\n  release_repos: [nope]\n'` → `'. unavailable'`

**E9 (G-M2-75): spawn count does not scale with delivery files.**
- `countingPath(log)` writes one `#!/bin/sh` wrapper per `[...SHELL_TOOLS, 'jq']` found by `command -v`: `printf '%s\n' '<tool>' >> "$EXEC_LOG"` then `exec '<abs path>' "$@"`, mode 0755.
- `small = corpusRepo()`. `big = corpusRepo()` plus 60 files `big/.cleargate/delivery/archive/CR-5NN_Filler.md`, written with `item()` text: status `Completed`, no other fields.
- Assert `facts(big)` deep-equals `facts(small)`, so the fillers are inert.
- Run each through `runOracle([repo], { env: { PATH: shim, HOME: process.env['HOME'] ?? '/', TZ: 'UTC', EXEC_LOG: <fresh log> } })`. Assert:
  - both exit 0;
  - `count(big) === count(small)`;
  - `count(small) <= 40`;
  - the small log includes the lines `jq` and `git`.

### Change 7: `test/wiki/brief-truth-oracle.red.node.test.ts`
- Add `const once = new Map<boolean, Promise<Built>>(); const shared = (a: boolean): Promise<Built> => { if (!once.has(a)) once.set(a, built(a)); return once.get(a)!; };`
- The tests at `:84`, `:90`, `:97` and `:103`, and the two planted tests at `:123` and `:134`, use `await shared(active)` (`shared(true)` for the planted ones).
- `:111` keeps a fresh `built(active)`.
- `:55`: `cleargateHome: tmp('cg-r3-home-')`, which registers it for cleanup.

### Change 8: `test/scripts/orientation-eval.red.node.test.ts`
- **(a) Scoring test.** In the `:138` describe, add `'scoring matches whole ids and ignores case (G-M2-77)'`:
  - `scoreAnswer('The active sprint is SPRINT-99.', ['SPRINT-9']).correct === false`
  - `scoreAnswer('Active: **SPRINT-9**, 4 stories.', ['SPRINT-9']).correct === true`
  - `scoreAnswer('sprint-9 is active', ['SPRINT-9']).correct === true`
  - `scoreAnswer('Released v0.0.10 yesterday', ['v0.0.1']).correct === false`
  - `scoreAnswer('Rollup counter resets when two stories share a line.', ['rollup counter']).correct === true`
- **(b) Recorded answers.** In `:383` `evRows`, set `answer: `Answer text for q${String(i + 1).padStart(2, '0')}``. Add `'the evidence records every question\'s final answer (Gherkin S3)'`: for `i` in 1..12, `md.includes(`Answer text for q${String(i).padStart(2, '0')}`)`.
- **(c)** `:287`: `fakeClaude('exec sleep 10')`.
- **(d) parseArgs.** In the `:521` describe, add `'parseArgs: defaults and flags (G-M2-77)'`:
  - `const a = m['parseArgs'](['run']);`
  - Assert `a.cmd === 'run'`, `a.model === 'claude-opus-5-5'`, `a.ref === 'main'`, `a.maxBudgetUsd === 2`, and `a.version`, `a.container` and `a.evidence` all `undefined`.
  - `const b = m['parseArgs'](['run', '--model', 'claude-sonnet-5-5', '--version', '0.28.0', '--ref', 'abc123', '--container', '/abs/c', '--evidence', 'e.md', '--max-budget-usd', '0.5']);` Assert each field, with `b.maxBudgetUsd === 0.5`.
  - `assert.throws(() => m['parseArgs'](['run', '--max-budget-usd', 'abc']))`, the same for `'0'` and `'-1'`, and for `['run', '--bogus']`.
  - Add a CLI test: `cli(['run', '--max-budget-usd', 'abc'])` → `status === 2` and `stderr` matches `/max-budget-usd/`.
- **(e)** In the R8 test at `:355`, add `assert.equal(m['computeVerdict']({ model: 'claude-sonnet-5-5', version: '0.28.0', rows: rows12() }).line, 'VERDICT: BASELINE 12/12');`
- **(f)** Header contract: add `parseArgs(argv) -> { cmd, model, version, ref, container, evidence, maxBudgetUsd }`.

### Change 9: report and commit
Commit as one `qa-red(STORY-063-12): apply TPV bounce (G-M2-66/67/69, G-M2-71..77)`. Report the new red, guard and integration counts and the measured wall time of the three default files at the current `uptime`.

### Change 10: unchanged
`brief-oracle.red` keeps its `:47` script-hygiene describe and the jq guards as they are.

### Change 11: orchestrator action, not QA-Red
Before 12's Dev: merge cli `main` (11 at c7e371f plus 11-F1) into `story/STORY-063-12`. After that merge, R3's reds fail only on the missing oracle. The third witness and the corpus compare need 11-F1's G-M2-66 (`2/3`).

## Amendment proposals (G-M2-71+)

- **G-M2-71 (C12.1/C12.2 output contract; ratifies QA-Red defaults 1, 3, 6).**
  - Facts JSON:
    `{ active_sprint: string, waiting: { failing_gates, open_questions, unlabelled_contradictions, close_checklists, ids[] }, p0p1: { count, ids[] }, last_closed: string, carried: { count, ids[] }, planned: [{ id, green, members }], decisions: string[], release: string }`
    - String facts are the text after the prefix, uncapped.
    - ID lists are complete, in D-order. `planned` has the live active sprint removed. `decisions` is the first 5 D7 ids, duplicates kept.
  - `mismatch: <json key> brief=<…> truth=<…>` lines go to **stdout**. Diagnostics go to stderr.
  - Exit codes: 0 when everything agrees; 1 on any mismatch; 2 for a usage error, unknown option, unreadable brief file, missing repo, absent jq (`brief-oracle: jq required`, before any work) or raw `brief.md` input (G-M2-73).
  - The script exports `LC_ALL=C` first.
- **G-M2-72 (C12.2 strictness).**
  1. Every list (Waiting, P0/P1, Carried, Planned, Decisions) compares as the first k of the truth in D-order. Story R2's "ordering-insensitive" is superseded (G-M2-20).
  2. A missing `Active sprint:`, `Waiting on you:` or `Release:` line is a mismatch even when the truncation line is present: C11.2 substitutes the live lines, and G-M2-62.1 never drops section 2. Only sections 3–7 are excused by `[…more in wiki/index.md]`.
- **G-M2-73 (spec gap: story §2.2 step 3).**
  - The raw-file form `brief-oracle.sh --compare .cleargate/wiki/brief.md .` is superseded: `brief.md` holds the two live markers and an unfiltered `Planned:`.
  - The canonical dogfood/G5b form is `CLEARGATE_NO_UPDATE_CHECK=1 node cleargate-cli/dist/cli.js doctor --session-start | bash cleargate-cli/scripts/brief-oracle.sh --compare - .` (§R step 10).
  - The oracle refuses any input containing a line equal to `<!-- live:active-sprint -->` or `<!-- live:release -->`: exit 2, with a stderr line naming `doctor --session-start`. The message must avoid ` cleargate ` as a bare word (G-M2-32 regex).
  - The orchestrator edits the story's §2.2 step 3 text to the pipe form.
- **G-M2-74 (D8 config in the oracle).**
  - Read only `wiki.brief.release_repos`, as a flow list (`["."]`, `[a, "b"]`) or a block list (`- a`). Comments and blank lines are ignored.
  - An absent key, a non-list or `[]` gives `['.']`. Entries are trimmed with quotes stripped, and empty entries are dropped.
  - Relative entries resolve against the repo root; absolute entries are used as they are (path.resolve semantics). Labels are verbatim.
- **G-M2-75 (oracle cost).**
  - Facts mode spawns the same number of processes whatever the number of delivery files, and at most 40 on the orientation corpus.
  - Tools are called by name through PATH.
  - All delivery frontmatter and sections are read in one awk pass. There are no per-file `sed`/`grep`/`jq` loops.
  - Reason: test files run serially in `npm test`, and the oracle runs about 50 times in the default tier plus once per G5b on 623 files.
- **G-M2-76 (D-rules as 11 built them, beyond G-M2-69).**
  - (a) A `sprint_goal` that is empty, `~`, `null`, `Null` or `NULL` → `no goal`.
  - (b) D2 b counts an item when any pair in its §6 / Open Questions sections has `isPlaceholderAnswer(answer)`, including an orphan answer (`question: null`).
- **G-M2-77 (eval; overrides QA-Red default 8 in part).**
  1. **Scoring.** Containment is case-insensitive. A token whose last character is a digit matches only where the next character is not a digit (`SPRINT-9` ∉ "SPRINT-99", `v0.0.1` ∉ "v0.0.10"). `found` lists the tokens as given.
  2. **`parseArgs` export.** `export function parseArgs(argv)` returns `{ cmd, model = GATING_MODEL, version, ref = 'main', container, evidence, maxBudgetUsd = 2 }`. An unknown flag, or a `--max-budget-usd` that is not a positive finite number, throws, and the CLI exits 2. A default of Opus keeps the `--version 0.28.0` baseline comparable with the candidate.
  3. **Verdict precedence.** INCOMPLETE (exit 3) > BASELINE (when `--version` is given, whatever the model; exit 0) > SMOKE (non-Opus) > PASS/FAIL. FAIL and SMOKE FAIL exit 1; usage and refusals exit 2.
  4. **Answers.** The evidence file records every question's final answer text through `markdownCell`, as Gherkin S3 requires.
  5. **Refusal order.** `run` calls `validateContainer` before any tool pre-check, and never pre-checks `claude`: a missing `claude` is "not run" (R7), not a refusal. Do not copy `ingest-loop.mjs`'s tool check, which runs first.
- **G-M2-78 (12's test tiers and §R).**
  - The D1–D8 synthetic-repo edges live in `test/wiki/brief-oracle-edges.red.integration.node.test.ts`. The Dev and QA run it targeted, and §R step 1 `npm run test:integration` expects it green.
  - The default tier holds hygiene, corpus facts A/B, compare mode (4 spawns at a time), R3 and the eval units.
  - The Dev records the default-tier wall time of the three files, with `uptime`, in the dev report.

## Proposed flashcards (orchestrator approval; not appended)
- `2026-11-12 · #test-harness #shell · LANG=C.UTF-8 already sorts in C order, so a C-order red passes without LC_ALL=C; run it under en_US.UTF-8.`
- `2026-11-12 · #test-harness #perf · npm test runs files serially; a red file spawning bash ~150× adds minutes. Memoize repos, run spawns concurrently.`
- `2026-11-12 · #oracle #shell · Unquoted brief text globs (**Notes:** → cwd files) and word-splits double spaces; test compare in a glob-bait cwd.`
- `2026-11-12 · #eval #scoring · Substring scoring: SPRINT-9 matches SPRINT-99, v0.0.1 matches v0.0.10; a digit-final token needs a non-digit after it.`
- `2026-11-12 · #oracle #perf · Pin a shell oracle's cost as spawn count, unchanged with 60 more files (logging PATH shim), never as wall time.`
- `2026-11-12 · #shell #macos · macOS bash is 3.2 (no declare -A, mapfile, ${v,,}); jq trim/pick/abs need 1.7+; BSD sed/find lack -i/-printf.`

## Script Incidents
None. No `run_script.sh` invocation. The scratch tree (`git archive 936892a` plus wt12's files) and its read-only census of the outer delivery tree ran from the session scratchpad and are deleted.

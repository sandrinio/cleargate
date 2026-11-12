# STORY-063-11 Architect post-flight (role: architect, off-sprint EPIC-063 M2)

**ARCH: PASS-WITH-FOLLOW-UPS.** No F1 is needed before merge. 11-F1 runs after the merge, inside M2, and merges before 12's Dev starts. It has four small items (F1-1..F1-4). Amendments G-M2-66..70 are proposed below; I have not edited M2.md.

I reviewed `git diff a863745..936892a` on `story/STORY-063-11` in the main cli checkout, read-only.
- I made no code edits or commits.
- I did not run a build, `tsup`, any `wiki` command or `doctor` against the outer repo, or the full suite.
- Facts were checked on a scratch copy of the outer `.cleargate/{delivery,sprint-runs (no ledgers),config.yml,wiki/contradictions.md}` at `scratchpad/arch11/repo`.
- Scripts are in `scratchpad/arch11/scripts/`: `indep.py` is an independent Python D2–D7 implementation; `d4.py`; `ts-facts.mts`, `ts-print.mts` and `ts-time.mts` run 11's source through tsx.

## 1. Plan conformance

The C11.2 exports are all present with the frozen signatures. The C11.1 line shapes, C11.3 `lastAction` (additive; the error→`missing` mapping is unchanged) and C11.5 are implemented. Each amendment checked against the code:

| Rule | Verdict | Where |
|---|---|---|
| G-M2-55 items 1–4 | ✓ | `lastClosedLine(allItems…)` uses `completed[0].report.absPath`. D6 does its own selection with `sprintOrder` (numeric stem asc, ties in C order, no stem last). The null spellings come through 09's `partitionSprints`. |
| G-M2-55 item 5 / G-M2-60 | ✓ | `refreshRelationPages` returns `scanned` or `null`. The brief compiles from that scan, never from the relations `items`. It writes only when `brief.md` exists and the bytes differ. Errors are swallowed, and there is no second `scanRawItems`. |
| G-M2-55 item 6 (README) | ✓, with one wording defect → F1-4 | |
| G-M2-59 | ✓ | `excerpt()`: `[[`/`]]` removed, `;`→`,`, words collapsed, 12 words, no ellipsis. |
| G-M2-61 | ✓ | `.git` check before any spawn; one `describe --tags --long --abbrev=7` with a 1,000 ms timeout; a spawn error or `null` status → unavailable; non-zero → no tags; unparsable output → unavailable; the whole line is capped at 100·r bytes on a code-point boundary; `[]` → `['.']` in both `releaseLine` and the config. |
| G-M2-62 | ✓ | Level-3 steps 7,6,5,3,2, then level-0 steps 5,3,2, then drop 7,6,5,4,3, with a fit check after each step. The budget is `6000−400−100r−2` with bytes+1 per line, and the truncation line is counted only when truncating. `Planned:`/`Decisions:` never go to 0. |
| G-M2-63 | ✓ as written; edge → G-M2-68 | `adjustPlanned` |
| G-M2-64 | ✓ | `isBool` for quoted `"true"`/`"false"`. D1 re-reads `state.json` on `ok` and requires a non-null, non-array object. Brief writes are `onlyIfChanged \|\| page==='brief'` on every ingest path. Build always writes it, and bootstrap writes it when missing. |
| G-M2-65 | ✓ | The perf red is exec-free (0.9 ms delta). §R notes → G-M2-70. |
| G-M2-21/23/24/25, decisions 4, 12–15 | ✓ | No `session-start.sh` change on either host. R6 is untouched (it belongs to §R). There is no decisions clause in step 1. |

Deviations, each accepted, with no follow-up unless noted:
1. `WikiConfig.wiki.brief` is required, not C11.5's `brief?`. It is always defaulted, and typecheck plus the full suite are green.
2. `activeSprintLine` resolves the sentinel again instead of receiving `runSessionStart`'s `resolveActiveSprint` result (blueprint step 2). C11.2 has no parameter for it, and it costs 0.1 ms (measured).
3. Story §3.2's `renderBrief(sections)` is not exported. C11.2 omits it, and truncation lives in `compile`.
4. `compile`'s `items` argument is unused. Every fact reads `allItems`, which is the D-universe per G-M2-55.
5. An `ok` state with zero stories prints `… — 0 stories` (no colon), and a report with no `status` prints `unknown`. Neither C11.1 nor D4 spells these out; both are bound for 12 in G-M2-69.
6. The unlisted edit to `decisions-wiring.red` and the kept stories sentence in step 1 were ratified by decision 15.
7. The README says brief and index are "derived entirely from `delivery/`". The brief also reads `sprint-runs/`, `wiki/contradictions.md` and git → **F1-4**.

The doctor restructure is behaviour-neutral for the existing output:
- `git diff -w` shows only `const reportPendingSync = (): void => {`, `};`, the call, and `printSessionBrief`.
- Nothing followed the tail before, so the two `return`s now leave only the local function.
- The `outcome.blocker` assignment and the planning-first reminder are unchanged.
- The file has 2 NUL bytes before and after the change.
- The only output change is one trailing line when `.cleargate/` exists (the pin went from 2 to 3).

## 2. Truth on the real corpus (scratch copy; all 8 lines reproduced from source)

| Fact | Dev line | Independent check | Verdict |
|---|---|---|---|
| D2 a | 21 | `indep.py`: 21; the ID set equals the TS set | ✓ |
| D2 b | 48 | `indep.py` (G-M2-46 rules re-implemented in Python): 48, identical ID set. All 48 are open (42 Draft, 6 Triaged) with real placeholders: 32× `{populated during Brief review}`, 12× `_Waiting_`, 11× `Unresolved — …`, 10× `_____`, … | ✓. The plan's "29" predates G-M2-46, which predicted 47. The +1 is the owner's new untracked `CR-131` (Draft). |
| D2 c / d | 0 / 5 | `label: null` ×0; checklists SPRINT-16/23/28/36/39 | ✓. The union is 68 unique IDs, so 5 shown + 63 more ✓. |
| D3 | 15, BUG-030/050/053/054/055 +10 | all P1-High; C order | ✓ |
| D4 | SPRINT-44 (2026-11-10) — Shipped — `4 planned / 6 shipped (…) / 0 carried over` — carried 0 | `d4.py`: key `2026-11-10T18:30:00Z`, then SPRINT-41 `2026-10-04` | ✓ |
| D5 | 18 | BUG-102..116, CR-112, EPIC-058, PROPOSAL-029 | ✓ |
| D6 | SPRINT-18/31/37/42/43 | Statuses Approved/Draft/Draft/Draft/Draft. Counts match D6 as written. | ✓ to the definition, but see the two findings below |
| D7 | CR-126 ×4, EPIC-063 | `indep.py`: CR-126 has 4 pairs, then EPIC-063, all dated `2026-11-12`; ties go by id in C order | ✓ |
| D8 | `cleargate-cli: v0.29.0 + 29 commits; mcp no tags` | Oracle two-call form: `v0.29.0 + 30` (+1 = the Dev commit); mcp `describe --abbrev=0` exits 128 | ✓ |

D6 findings:
- **SPRINT-18 really is non-terminal by its data.** `archive/SPRINT-18_Prepare_Close_Observe_Mechanics.md` has `status: "Approved"` and `activated_at: null`, yet `sprint-runs/SPRINT-18/SPRINT-18_REPORT.md` exists (`status: Draft`, generated 2026-05-01) and all 9 members are Completed. D6 reads status, so the brief and the oracle agree. This is a data fix, not a code fix (open decision 4).
- **Every real m is inflated by one.** 43 of the 44 sprint files carry `sprint_cleargate_id: <own id>`, so D6 counts the sprint itself as a member. For example, `SPRINT-42 — 5/7 🟢` covers six members (EPIC-059, STORY-059-01..04, BUG-052) plus the sprint file. On any real repo whose plans self-reference, Gherkin S2's "5 items, 5 🟢 → 5/5" prints 5/6. 12's corpus sprints do not self-reference, so no test catches it → **G-M2-66 / F1-1**.

The Decisions excerpts stop mid-thought (for example `("make decisions`, `Decided as recommended:`) and leave unbalanced `"`/`(`. That does not matter to 12's compare, which reads only the `[[ID]]` sequence (G-M2-59). It matters only to a shell oracle that `eval`s or word-splits lines (G-M2-69 item 6).

P0/P1 titles: no open P0/P1 title contains `;` or `+N more` today. However, BUG-068 (P1, Completed) has a mid-title `; `. When an item like that is open, a `; ` split yields a non-ID entry → **G-M2-67 / F1-2**. Backticks, `**` and the trailing comma left by the 10-word cut do not affect ID parsing.

## 3. Downstream readiness for 12
- **11 on 12's corpus.** I ran 11's `compile`, `activeSprintLine` and `renderLiveBrief` from source on a copy of `wt12/test/fixtures/orientation-corpus` (`ts-print.mts`). All seven non-git lines are **byte-identical** to 12's hand-computed `LINES_A`: `ACTIVE_LINE_A`, `LAST_CLOSED`, Waiting `+1 more`, P0/P1, Carried incl. quoted BUG-13, Planned, and the five Decisions with G-M2-59 excerpts. 12's R3 reds therefore only need 12's script.
- **Effect of 11-F1.** F1-1..F1-3 do not change `LINES_A`/`LINES_B`: the corpus has no self-referencing sprint, no `;` title and an `Active` SPRINT-9.
- **Exports and line formats** match C12.1/C12.2 and 12's QA-Red contract: complete ID lists, `planned: [{id, green, members}]`, and Decisions as an id sequence with duplicates.
- **Rules 12's oracle needs that are not yet written:** the P0/P1 split (G-M2-67), file-keyed records, block-scalar `sprint_goal`, D1/D4 details, live-line caps and shell hygiene (G-M2-69).

## 4. Risks
1. **G6 session-start budget (§R step 7): likely FAIL at today's load.**
   - Measured at load ≈ 12 (`ts-time.mts`): `releaseLine(['cleargate-cli','mcp'])` via node `spawnSync` takes p50 259 ms and max 314 ms.
   - Single `git describe` calls (Python spawner, 20 runs): cleargate-cli p50 86 / p95 122 ms; mcp (no tags) p50 72 / p95 97 ms; `node -e 0` p50 109 ms.
   - The rest of the brief costs about 1 ms. About 70 ms remain after 06 (G-M2-65).
   - The outcome depends on load, so it is better learned before §R than during it → G-M2-70 and open decisions 2–3.
2. **Hook output on both hosts.** Both `session-start.sh` files pass doctor stdout through unchanged with `|| true`. The brief prints before the claude hook's `Load skill` line. About 2 KB in total; no host cap applies.
3. **`brief.md` churn.** The file holds no timestamp and no live line. Commits, tags and `state.json` do not change it; only fact changes do. Ingest writes it only on a byte difference, and build always writes it (as with the other pages).
   - Cost: compile takes p50 55 ms (max 126 ms at load 12) per mapped ingest and per excluded-bucket (story) ingest. Within that, `latestDecisions` is p50 31 ms and runs twice per ingest (decisions page + brief), and `partitionSprints` now runs three times.
   - Upgrade path: the first ingest after upgrading takes the bootstrap path (`brief.md` missing → all six pages), the same as `decisions` did in 10.
4. **Live re-sync at §R.**
   - From step 2 (`npm run build`), live sessions print `ClearGate brief: not built …` until the step 5 build. This is expected.
   - Step 9 must nest `brief:` under the existing `wiki:` mapping. A second top-level `wiki:` key is a js-yaml duplicate-key error: `loadWikiConfig` throws, wiki build/ingest/lint fail, and the brief silently falls back to `.` (G-M2-70).
   - The relocation test 3 and the meta-pointer live tests are red until steps 3 and 9, as planned.
5. **Two "waiting" numbers at session start (outside M2).** Doctor's existing blocked list prints `26 items blocked` (pending-sync, any status: 5 of them are terminal). The brief prints `21 failing gates` (open items, both directories). Story §1.3 forbids changing doctor's lines in 11.

## 5. Decision: F1 placement

**Before merge: none.** Nothing ships before §R, and 11's output on 12's corpus already equals 12's expectations.

**11-F1 (after merge, inside M2; merged before 12's Dev, as in the 10-F1 pipelining; no TPV, orchestrator review as in the F1 precedent):**
- **F1-1 (G-M2-66):** Planned members exclude sprint files (`i.bucket !== 'sprints'`). Add a unit red: a sprint file naming itself with `ambiguity: 🟢` leaves `n/m` unchanged. This one ships a wrong number on every real repo.
- **F1-2 (G-M2-67):** P0/P1 titles get `;`→`,` before the 10-word cut. Add a unit red: a title `A; BUG-9 b` yields one entry.
- **F1-3 (G-M2-68):** `activeSprintLine` returns `activeId: null` for a terminal active plan. Add a unit red per G-M2-68.
- **F1-4:** README "derived entirely from `delivery/`" becomes: "derived: the index from `delivery/`; the brief from `delivery/`, `sprint-runs/` and `wiki/contradictions.md`, with its Active sprint and Release lines computed live at session start". Also fix the `recompileSynthesis` comments "writing all five" / "recompile all five pages" to "six".

**Outside M2 (follow-up list):**
- Decisions usefulness: answer-only 12-word excerpts, and day-granular dates that let one CR fill 4 of 5 slots.
- Waiting IDs in C order put old bugs first; priority ordering.
- Doctor `items blocked` vs brief `failing gates` (risk 5).
- `latestDecisions` and `partitionSprints` recomputed per ingest (BUG-086 line).
- SPRINT-18 data, if the owner declines the open-decision-4 default.

## Amendment proposals (for `plans/M2.md` § Amendments; the next free number is 66)

- **G-M2-66 (D6 members exclude sprint files; binds 11-F1 and 12; refines D6 and story R2 item 6).**
  - Measured: 43 of 44 sprint files carry `sprint_cleargate_id: <own id>`, so D6 as written counts each sprint as its own member: `SPRINT-42 — 5/7 🟢` for 6 work items, `SPRINT-18 — 9/10 🟢` for 9. Gherkin S2 ("5 items, 5 🟢 → 5/5") reads 5/6 on a real self-referencing plan.
  - Rule: m = #{i ∈ R: i is not a sprint (id does not start `SPRINT-`) ∧ `sprint_cleargate_id` = s}; n = those of m whose `ambiguity` starts `🟢`.
  - 11-F1 implements it (F1-1). 12's oracle applies the same filter. 12's TPV adds `sprint_cleargate_id: SPRINT-10` to the corpus file `SPRINT-10_Index_Follow_Ups.md`; `LINES_A/B` and `FACTS_A/B` are unchanged (`2/3`). 11-F1 merges before 12's Dev.
- **G-M2-67 (P0/P1 entries are parseable; binds 11-F1 and 12; extends G-M2-59 to D3).**
  - **11:** each P0/P1 title has every `;` replaced by `,` before the 10-word cut. Entries stay joined with `; `.
  - **12 (C12.2):** to read P0/P1 IDs, take the text after the first ` — `; drop one end-anchored ` \+(\d+) more$` (its N is the `+N`); split on `; `; each piece's first space-delimited token is the id. Titles may contain ` — ` (15 open titles do, G-M2-47), backticks, `**` and quotes; none of that affects the split.
  - Evidence: BUG-068 (P1, Completed today) has a mid-title `; `. No open P0/P1 title has one, so G5b holds before F1-2.
  - Accepted residual: the last shown title's 10-word cut ending in `+<digits> more`.
- **G-M2-68 (G-M2-63 applies only to a non-terminal active sprint; binds 11-F1).**
  - `activeSprintLine` returns `activeId: null` when the active plan's frontmatter `status` is in `TERMINAL_STATUSES` (it already parses that frontmatter for `sprint_goal`). The `line` is unchanged.
  - Reason: G-M2-63's N−1 assumes the active sprint is in D6. A terminal sprint still named by `.active` (for example, its plan flipped to Completed before the sentinel was cleared) is not in D6. The decrement would then print one less than 12's truth (|D6 − active| − k = |D6| − k).
  - 12: no change.
  - Red: `.active` = SPRINT-9 with plan `status: Completed`, and a file `Planned:` ending ` +2 more` where SPRINT-9 sorts after the last shown entry → the printed line is unchanged.
- **G-M2-69 (oracle rules not yet written; binds 12; no 11 change, since 11's output already follows them on 12's corpus).**
  1. **Records are files.** R is a set of files, so key rows by path, never by id (an id-keyed awk array merges files). Today PROPOSAL-013 has an Approved and a Completed file, and STORY-014-01 and STORY-014-02 have two files each. D2 a/b, D5 (count and list) and D6 m/n count files. Only the Waiting ID list is `unique()`.
  2. **D1 goal.** `sprint_goal` is a YAML block scalar (`|`, `|-`, `>`, `>-`) in 5 of 6 real plans. Take the following lines indented deeper than the key, collapse whitespace and keep the first 15 words; quoted scalars lose their quotes. 12's corpus SPRINT-9 uses a quoted scalar, so 12's TPV adds a D1 unit red with `sprint_goal: |`.
  3. **D1 on an `ok` object.**
     - `.stories` absent or not an object → n = 0.
     - n = 0 prints `0 stories` (no colon).
     - A story whose `state` is not a string counts as `unknown`.
     - A non-string `sprint_status` or `last_action` is empty, so the line can read `Active/` or `/`.
  4. **D4.**
     - A report with an absent or empty frontmatter `status` prints `unknown`.
     - The Stories line is the first `**Stories:**` match in the report body, trimmed. An empty match prints `no stories line` with no further search.
     - `### Carried Over` follows the `findSection` rule: a level 2–6 heading whose number-stripped text starts with `carried over` (case-insensitive), the first non-empty such section, `>` lines dropped. `None` is a case-sensitive prefix of its first non-empty trimmed line.
  5. **Live caps.** An `Active sprint:` or `Release:` line that ends in `…` while the truth line is longer than its cap (400 B; 100·r B) compares as a byte prefix: the brief text before `…` must start the truth line.
  6. **Brief text is data.** Lines carry backticks, `**`, `*`, and unbalanced `"`/`(` (e.g. `("make decisions`). Read them with `IFS= read -r`, quote every expansion and never `eval` (an unquoted `**Label:**` globs).
- **G-M2-70 (§R; refines steps 7, 9 and 11).**
  - **Step 9:** `brief: { release_repos: [cleargate-cli, mcp] }` goes under the existing top-level `wiki:` mapping of `.cleargate/config.yml` (which already holds `index_token_ceiling`, `bucket_pagination_ceiling` and `ingest_buckets`). A second `wiki:` key makes `loadWikiConfig` throw. Then confirm that `node cleargate-cli/dist/cli.js wiki lint` keeps its exit status and that `doctor --session-start` prints `Release: cleargate-cli: …; mcp no tags`.
  - **Step 7 (G6):**
    - Measured 2026-11-12 at load ≈ 12: the two describes take p50 259 ms via node `spawnSync`. Single describes: cli p50 86 ms, mcp p50 72 ms. About 70 ms remain (G-M2-65).
    - Run G6 at load average < 4 (no parallel agents or suites) and record `uptime` with the numbers.
    - Do a dry run right after 11-F1 merges, not at §R: a scratch build of cli `main` vs v0.28.0, on a scratch copy of this repo's `.cleargate` with symlinks `cleargate-cli` and `mcp` and `release_repos` set.
  - **Step 11:** the dogfood `Planned:` shows SPRINT-18 until its `status` is fixed (open decision 4). The brief and the oracle agree, so G5b is unaffected.

## Open decisions for orchestrator (each has a default)
1. **11-F1 scope and timing.** Default: F1-1..F1-4 after the merge, inside M2, merged before 12's Dev; QA-Red, then Dev, then orchestrator review (no TPV). F1-3 is the only optional item; if dropped, it goes to the out-of-M2 list.
2. **G6 dry run before §R.** Default: yes, at load < 4, right after 11-F1 merges (G-M2-70).
3. **If the dry run fails at load < 4.** Default order:
   - (a) A zero-spawn `no tags` pre-check for a repo whose `.git` is a directory, has no `reftable/`, has no file under `refs/tags/`, and has no `refs/tags/` line in `packed-refs`. It is semantically identical to describe's non-zero exit and saves the mcp spawn here.
   - (b) If still over, the story §3.2 ingest-time "as of <date>" fallback (decision 14).
4. **SPRINT-18 status.** Default: the owner flips `status` to `Completed` in a separate meta-repo chore commit before §R step 11, not inside the R6 commit. Alternative: `Abandoned`.
5. **Routing to 12.** Default: the 12-side parts of G-M2-66, G-M2-67 and G-M2-69 go to 12's TPV as numbered changes: the corpus self-reference, a P0/P1 `;`-title compare red, and a D1 block-scalar red.

## Script Incidents
None. No `run_script.sh` invocation; read-only scratchpad scripts only.

flashcards_flagged:
- "2026-11-12 · #wiki #brief · 43/44 sprint files set sprint_cleargate_id to their own id; a 'members of sprint X' count must skip sprint files."
- "2026-11-12 · #oracle #wiki · Key oracle rows by file, not id: PROPOSAL-013 has an Approved and a Completed file; id-keyed awk arrays merge them."

# STORY-063-11 QA-Red (role: qa, Mode: RED, off-sprint EPIC-063 M2)

QA-RED: WRITTEN
Worktree `scratchpad/wt11`, branch `story/STORY-063-11`, base main 68f9ee0. Nothing committed. No `src/` or `scaffold/` edits (new files under `test/` only).
Baseline: 128 default-tier reds + 2 live reds; 8 default-tier and 2 live guards stay green by design.
STORY-063-10 (`latestDecisions`, `SYNTHESIS_PAGES`) had not landed in wt11: the D7 cases also stay red on that until 10 merges.

## Files (all under cleargate-cli/test/)
| File | Kind | Red | Green (guards) |
|---|---|---|---|
| wiki/session-brief.red.node.test.ts | unit: C11.2 exports, layout, D1-D8, renderLiveBrief, R3 truncation, C11.3 `lastAction` | 69 | 0 |
| wiki/session-brief-handlers.red.node.test.ts | handler: `wiki build` / `wiki ingest` write and refresh `brief.md`; G-M2-55 item 5; blueprint scenario 11 (A1) | 16 | 0 |
| commands/doctor-session-brief.red.node.test.ts | `doctorHandler({sessionStart:true})`: printing, order, live sections, errors, exit codes | 27 | 1 (no `.cleargate/` prints nothing) |
| commands/doctor-session-brief-perf.red.node.test.ts | in-process `runSessionStart` timing, 20 vs 20, 2 release repos | 1 | 0 |
| hooks/session-start-brief.red.node.test.ts | hook contract, both hosts, 3 runs each; "no hook change" | 3 | 2 (no `brief` in either hook) |
| lib/wiki-config-brief.red.node.test.ts | `wiki.brief.release_repos` + `config.example.yml` | 4 | 1 (other wiki keys unaffected) |
| docs/session-brief-docs.red.node.test.ts | R5 step 1 (both hosts), README paragraph, protocol §10.1/§10.2, gen:codex `--check` | 8 | 4 (steps 2-4 and markers x2, §10.1 existing lines, codex check) |
| docs/session-brief-meta-pointer.live.integration.node.test.ts | R6 on the meta-repo (read-only; needs `CLEARGATE_META_ROOT`, skipped otherwise) | 2 | 2 (locked decisions survive; 90-line floor) |
| wiki/_brief-support.ts | helpers: fixture repo builder, rich + synthetic corpora, doctor driver, git fixtures | - | - |

Default-tier total: 136 tests (128 red, 8 green). Live: 4 (2 red, 2 green; run with `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate`, read-only).

## Every red was run against 68f9ee0; the reasons
- unit file: 67 x `Cannot find module src/wiki/synthesis/session-brief.js`; 2 x `lastAction` absent on `SprintRunState`.
- handlers: 15 x `precondition: wiki build wrote wiki/brief.md`; 1 x `BUCKET_SYNTHESIS_MAP` has no `brief`.
- doctor: 25 x the same build precondition; 2 x no brief block printed / no "not built" line.
- hooks: 3 x build precondition. perf: precondition (the timed run prints no brief, so equal timings cannot pass vacuously).
- config/docs: `loadWikiConfig` has no `wiki.brief`; step 1 still says "Read this first" / "~3k tokens"; README still says "~3k-token orientation page"; protocol §10.1/§10.2 have no `brief.md`; `config.example.yml` has no `brief:` block.
- live: the Shipped/Active/Planned-next bullets are still in `./CLAUDE.md`; `wiki.brief.release_repos` is unset in `.cleargate/config.yml`.

## Self-consistency check (no src edit)
I rsynced the worktree to a scratch copy (`scratchpad/ref`, deleted afterwards), wrote a throwaway reference implementation there (compiler, doctor printer, build/ingest wiring, config, `lastAction`), and ran every new test against it: 118/119 of the unit, handler, doctor, perf and config reds pass (the one left is the `config.example.yml` doc pin, which needs a scaffold edit); the hook tests pass for both hosts (5/5). This proves no test contradicts the plan or another test; it is not an implementation Developer should reuse.
It also found five test defects, now fixed: single-digit sprint dirs cannot carry reports (see ambiguity 12), `cloneCorpus` drops `contradictions.md`, `doctorHandler` itself reads `cli.now()`, a wrong 15-word goal literal, and a rich-fixture `Planned` count.

## Scenario -> test map
| Gherkin / requirement | Tests |
|---|---|
| S1 `@paths` all 8 prefixes while a sprint is active | doctor "Gherkin 1" (order, live active line, compile-time lines as in `brief.md`, Planned minus active, no H1/note/markers, <= 1,500 tokens); unit "rich fixture, line by line" (6 lines) |
| S1 "after `wiki ingest` of a bug now P1-High, `brief.md` lists it" | handlers "Gherkin 1" (+ equals a fresh build) |
| S2 `@paths` no active sprint, SPRINT-42 5/5 | doctor "Gherkin 2" x3 sentinel spellings + live refresh when the sentinel is removed after the build |
| S3 Outline claude / codex | hooks (both hosts x3 runs, order, exit 0, deterministic); docs step 1 x2 hosts; perf (in-process, G-M2-27) |
| S4 `@data @rules` truncation | unit "R3": 40/30/25 corpus untruncated lists; threshold search -> Planned 5->3 first, all sections kept, marker last; over by a lot -> lists to 0 then drops 7,6,5,4,3; budget moves exactly 100 B per release repo; doctor "R3 / G-M2-23" (live active line cut to 400 B, <= 1,500 tokens) |
| S5 meta-repo R6 | live R6 file (pointer line, locked decisions kept, 90-line floor, `release_repos`); doctor "release_repos" two repos; config tests |
| S6 error: no `brief.md` | doctor "not built" (exit 0, last line); `.cleargate/` absent -> nothing (guard) |
| S6 error: `.active` names SPRINT-99, no plan | doctor stale sentinel (BUG-036 warning kept); unit D1 |
| S6 error: release path not a repo / no tags | unit D8; doctor "D8 through doctor" with real git repos |
| exit codes unchanged | doctor "never changes an exit code" (1 with and without `brief.md`); outcome untouched |
| R1 build + ingest wiring | handlers (build writes; deterministic; every bucket in the map; bootstrap set; stamp-only `carry_over`; parity; mtime untouched) |
| G-M2-55 item 5 excluded-bucket refresh | handlers: flip story to 🟢 -> `2/2 🟢` == fresh build; unchanged re-ingest leaves mtime; no other page written; never bootstraps |
| G-M2-55 items 1-4 | unit: D4 over allItems, D6 own selection + numeric/tie order, `generated_at` spelled `` `~` `null` `Null` `NULL` x5, unparseable report frontmatter |
| D1 incl. A3 | unit (absent / directory / malformed / `null` / `[]` -> one text) + doctor + precondition `readSprintRunState` = `missing` for EISDIR |
| D2-D8 edge cases | unit: D2 a/b/c/d + dedupe + `+N more`; D3 order/titles; D4 six fallbacks; D5; D6; D7 (12 words, date, id order); D8 seam cases |
| C11.3 `lastAction` | unit (string, absent, non-string, missing, malformed) |
| C11.5 config | wiki-config tests |
| blueprint 5 perf | perf file |
| blueprint 9 parity | handlers (build vs build + ingest; two clocks) |
| blueprint 10 (A3) | unit + doctor |
| blueprint 11 (A1) | handlers: sentinel absent and set; Last closed == first Recently Completed == first Shipped |
| R5 + G-M2-55 item 6 | docs file |
| G-M2-25 no hook change | hooks "no session-start.sh change" (green guard) |
| Task Breakdown rows | all but "at release: meta-repo commit + live re-sync + doctor exit 0" (live file covers the commit; re-sync and doctor are §R) |

## Shape-change reds (existing tests the story deliberately changes; green today, red once the Dev lands; Dev edits, not QA)
Confirmed by running the existing suites against the reference implementation (the other ~50 failures in that run are environment ones: missing dist, meta-repo paths, license/README, clean-room; the doctor-retired-field, close-sprint-backsync and scaffold-cli-resolution ones were re-run on 68f9ee0 and fail there too).
1. `test/wiki/wiki-ingest-synthesis-parity.red.node.test.ts`, 8 map tests (`sprints`, `epics`, `proposals`, `stories`, `crs`, `bugs`, `initiatives`, `topics`, each `deepStrictEqual` on the page list): every real bucket now also maps to `brief`. `unknown` stays `[]`. Story 10 edits the same tests for `decisions`: expect a merge conflict; resolve by listing both.
2. `test/commands/doctor-session-start.node.test.ts` "emits only the resolver-status line when zero items are blocked" (`out.length === 2`): its fixture has `.cleargate/`, so it now prints the "not built" line (3 lines). Add the line to the assertion. The sibling "pending-sync directory does not exist" case (no `.cleargate/`) stays 2 and is the green guard.
3. `test/docs/claude-md-block-leads-relocation.live.integration.node.test.ts` test 3 (block hash live vs canonical): red on this branch until the §R live re-sync, as the plan says.
No other existing test failed with the reference implementation (checked: `doctor-contradiction-alarm`, `doctor-per-host`, `sprint-sentinel-validation`, the 09 index tests, `bucket-registry-parity`, `ingest-docs-match-code`).

## Ambiguities (default chosen; where pinned, it is flagged)
1. **Prefix inside the live strings.** `activeSprintLine().line`, `releaseLine()` and `renderLiveBrief`'s `live.active` / `live.release` are whole printed lines, prefix included (the marker occupies a whole line). Pinned strictly.
2. **ID-list overflow suffix.** ` +N more` directly after the last item (space, no comma), exactly as the C11.1 table reads (`<ID>, …[ +N more]`); applies to Waiting, P0/P1, Carried, Planned. 13's TPV used `, +N more`: the table wins here. Pinned strictly.
3. **Incremental shrink.** R3 is read as one list at a time, lowest priority first (7, 6, 5, 3, 2), re-checking the fit after each step; all reach 3 before any goes to 0. Pinned: just over the budget only Planned goes 5->3 while Carried, P0/P1 and Waiting keep 5. If the TPV prefers "every list to 3 at once", change that one test.
4. **Decisions under shrink.** C11.1 gives `Decisions:` no `+N more`, so its shrink form is unpinned (the corpora keep <= 2 decisions at the overflow points).
5. **Drop order is 7, 6, 5, 4, 3.** Last closed (4) goes before P0/P1 (3); Waiting and Active never. The blueprint's "drop 7 up to 3" is read that way. Pinned as a monotone presence vector, not exact sections.
6. **Truncation line is `[…more in wiki/index.md]`** (plan C11.2), not the Gherkin's bare `…more in wiki/index.md`. Plan wins; it is the last line in the file and in the printout.
7. **D1 and non-objects.** state.json holding `null` or an array (JSON, but not an object) prints `state unknown`, though `readSprintRunState` returns `ok` for `[]`. D1 says "containing a JSON object". The Dev must check the type; the 12 oracle (`jq -e type=="object"`) agrees.
8. **Budget arithmetic.** The section budget is `6000 - 400 - 100 x repos` bytes over the joined fact lines plus the truncation line, `repos` = `wiki.brief.release_repos.length`. Pinned: threshold shifts by exactly 200 B between 1 and 3 repos; fact lines <= budget.
9. **Planned `m`** counts every item type naming the sprint (a bug naming SPRINT-9 counts), `n` those whose `ambiguity` starts 🟢; the sentinel sprint stays in `brief.md` (G-M2-21 removes it at print time).
10. **D4 details.** `(date unknown)` when the key is null; a report without a `**Stories:**` line prints `no stories line` (its carried value is not pinned); the Stories text is verbatim.
11. **Perf allowance is calibrated.** This machine's git exec costs 100-350 ms under load average 15, so a flat 100 ms with two execs cannot pass on any implementation. The test measures p95 of the very call the brief makes (20 runs) and allows `100 + 2 x max(0, exec - 15)` ms; on a quiet machine this is ~100 ms. The 20-run real-dist p95 stays at §R step 7 (G-M2-27). The unit test "one spawn per repo" pins the single `describe --tags --long` form (D8 permits it; a two-call form fails it). If the Dev takes the plan's ingest-time fallback instead, this pin and the Release lines must be revisited via the orchestrator.
12. **Reports need `SPRINT-\d{2,}`.** `isSprintReportPath` (`derive-bucket.ts:30-37`) ignores single-digit sprint dirs, so `SPRINT-8` can never have a report. Fixtures use `SPRINT-08` / `SPRINT-05` where a report is needed. Found by the reference run; the 12 oracle's D4 report lookup must mirror it.
13. **Which sections count as decisions for D7** (C10.2 is silent): the same two as D2 (`/ai interrogation loop/`, `/open questions/`). Fixtures use `## 6. AI Interrogation Loop`.
14. **`Release:` label for `.`** is `.` verbatim: `Release: .: v0.29.0 + 3 commits`.
15. **R6 is a release-step check** (outer repo). It is a `*.live.integration` file, red until §R step 9; it reads, never runs, anything against the meta-repo.
16. **Hook test** copies the scaffold hook and `lib/` beside a fixture and sets `CLAUDE_PROJECT_DIR`; the fixture's `dist/cli.js` is a CJS stub that re-runs `src/cli.ts` through tsx (absolute `--import` URL). 3 runs per host, about 1.5 s each.

## flashcards_flagged
- "2026-11-12 · #qa-red #wiki · isSprintReportPath needs SPRINT-\d{2,}: a single-digit sprint dir never has a report; fixtures and the 12 oracle use 2-digit IDs."
- "2026-11-12 · #qa-red #perf · An in-process timing red that contains git execs must calibrate on that exec's own p95 (git is 100-350 ms at load 15): allowance = 100 + n x (exec - 15)."
- "2026-11-12 · #qa-red #test-harness · cloneCorpus drops wiki/contradictions.md; a build-vs-ingest parity red on a page that reads it must copy it into the fresh clone."
- "2026-11-12 · #qa-red #doctor · doctorHandler reads cli.now() itself (doctor.ts:1151); to prove a path never reads the clock, call runSessionStart directly."
- "2026-11-12 · #qa-red #test-harness · Prove reds are self-consistent without touching src/: rsync the worktree (no .git) to scratchpad, write a throwaway implementation there, run the reds, delete it."

## TPV bounce applied
Applied exactly as written in `STORY-063-11-tpv.md` "Changes for QA-Red" (committed reds were e9e28c1). Test edits only, nothing committed. Line numbers are in the working tree (about 4-8 lines below the TPV's, which read e9e28c1 before my edits shifted them).

| # | Change | Where |
|---|---|---|
| 1 | D5: `BUG-1` with `carry_over: "true"` counts -> `'4 — BUG-1, BUG-102, BUG-99, CR-7'`; retitled "carry_over true (quoted or not)" | `wiki/session-brief.red.node.test.ts:348-351` |
| 2 | G-M2-59 excerpt red (`[[`/`]]` removed, `;` -> `,`, 12 words, no ellipsis) | same file, `:427` |
| 3 | G-M2-60 out-of-tree story red (code 0, `skipped`, Planned `1/2`, brief mtime kept, equals fresh build) | `wiki/session-brief-handlers.red.node.test.ts:173` |
| 4 | Perf rewritten: no git repos (both `unavailable`), 20 interleaved pairs via rename, first-run asserts, p95 delta <= 70 ms; `gitExecP95`, allowance and `spawnSync` removed; header comment points at the D8 unit reds and §R step 7 | `commands/doctor-session-brief-perf.red.node.test.ts` (whole file) |
| 5 | `syntheticRepo(pad, o, decisions = 2)`; reds 5a (Carried -> `25`, Planned 3 + `+4 more`, P0/P1 3 + `+27 more`, Waiting 3 + `+37 more`, 2 Decisions, marker last) and 5b (6 decisions: exactly 3 `[[`, no `more`, Planned 5 + `+2 more`) | `wiki/_brief-support.ts` (`syntheticRepo`); unit file `:783`, `:797` |
| 6 | G-M2-63 N-1 red (3 cases) | unit file `:671` |
| 7 | G-M2-61 `status: null` -> `Release: a unavailable` | unit file `:593` |
| 8 | 100 B/repo cap red; `release_repos: []` -> `['.']` | unit file `:600`; `lib/wiki-config-brief.red.node.test.ts:42` |
| 9 | G5c byte measure (`g5cBytes`, each line +1, <= 6000) replaces the token check at both places | `commands/doctor-session-brief.red.node.test.ts:42`, `:82`, `:287` |
| 10 | Live R6 file skips unless `META_ROOT/.cleargate/delivery` exists and the file exists (`IS_META`) | `docs/session-brief-meta-pointer.live.integration.node.test.ts:23`, `:33`, `:58` |

Overridden defaults (per the TPV): my #4/#5 shrink-to-0 for Planned/Decisions (now stay at 3) and the calibrated perf allowance (#9) are replaced. The older "over by a lot" red still holds: it only asserts that remaining Waiting/P0/P1/Carried lines show no IDs.

### Counts at base 68f9ee0 (re-run)
Default tier: 143 tests = 135 red + 8 guards (was 128 + 8). Per file red/green: unit 75/0, handlers 17/0, doctor 27/1, perf 1/0, hooks 3/2, wiki-config 4/1, docs 8/4. Live: 4 tests (2 red, 2 green) with `CLEARGATE_META_ROOT` set; with it unset the file now skips (0 tests), as change 10 requires.
Reasons: the 6 new unit reds fail on the missing `session-brief.js` module (STORY-063-10 is not in wt11, so D7 cases also need `latestDecisions`); the new handlers red fails on the `brief.md` build precondition; the wiki-config `[]` case fails on the absent `wiki.brief`; perf fails on the first-run brief assertion; doctor reds fail on the build precondition.
I did not rebuild the throwaway reference implementation for these 6 reds (optional in the dispatch), so 5a/5b arithmetic rests on the TPV's G-M2-62 numbers.

### flashcards_flagged (additions)
- "2026-11-12 · #qa-red #perf · Default-tier timing reds must be exec-free (repos without .git) with interleaved pairs; calibrating on a real git exec still false-fails ~1/3 at load."

# STORY-063-12 QA-Red (role: qa, Mode: RED, off-sprint EPIC-063 M2)

QA-RED: WRITTEN
Worktree `scratchpad/wt12`, branch `story/STORY-063-12`, base cli main 7e08cf1. Nothing committed. No `src/`, `scripts/`, `templates/` or `scaffold/` edits: new files under `test/` only (the corpus is a test fixture). No outer-repo file touched or read; no live Claude/Codex session; no network; no `npm run build` / `tsup`; every file is `*.node.test.ts` (default tier).

Baseline against 7e08cf1: **171 reds + 14 guards = 185 tests.**

## Files (all under cleargate-cli/test/)
| File | Kind | Red | Guard (green by design) |
|---|---|---|---|
| wiki/brief-oracle.red.node.test.ts | the oracle script in isolation: hygiene, facts mode (corpus A/B + D1-D8 edge cases), compare mode, exit codes, jq-missing | 106 | 1 (jq is on PATH: fails, never skips, when jq is absent) |
| wiki/brief-truth-oracle.red.node.test.ts | R3: in-process `wikiBuildHandler` + `doctorHandler({sessionStart:true})` on the corpus (variant A, variant B), then `--compare`; planted faults; jq-missing | 13 | 2 (jq guard, one per variant) |
| scripts/orientation-eval.red.node.test.ts | model-free units for `orientation-eval.mjs` + `orientation-questions.json` + CLI refusals | 52 | 1 (`parseClaudeStream` still returns exactly `{init,hooks,toolErrors,result}`) |
| wiki/orientation-corpus.node.test.ts | R4 shape guards for the fixture | 0 | 10 |
| wiki/_oracle-support.ts | helpers + the hand-computed truth (`FACTS_A/B`, `LINES_A/B`) | - | - |
| fixtures/orientation-corpus/ (38 files) | R4 corpus | - | - |

Names: the story lists `brief-truth-oracle.node.test.ts` and `orientation-eval.node.test.ts`; the reds carry `.red.` per the M1/M2 convention (CR-081: a now-green red is its own green, no rename needed).

## Failure reasons at 7e08cf1
- brief-oracle (106): `scripts/brief-oracle.sh` does not exist (bash exit 127, "No such file"). The existence/exec-bit/static-regex tests fail on that directly.
- brief-truth-oracle (13): 10 fail on `precondition: wiki build wrote wiki/brief.md (STORY-063-11)` (11 is not in this worktree); the 3 planted-fault / jq-missing cases fail the same precondition or on the missing script. They go green only after 11 AND 12 are merged.
- orientation-eval (52): `orientation-eval.mjs` and `orientation-questions.json` do not exist (import/ENOENT assertions). The CLI-refusal tests fail on the missing driver (exit 1 from node, not 2).
- orientation-corpus guards: green (corpus exists).

## Self-consistency (nothing in the worktree)
I rsynced the worktree (no .git) to `scratchpad/wt12ref` and wrote THROWAWAY references there (deleted from the report's deliverables; never in wt12):
- an oracle (`brief-oracle.sh` -> node, built on the repo's own src modules `scanRawItems`, `latestDecisions`, `findSection`, `extractDecisionPairs`, `partitionSprints`): **103 of 107 oracle reds pass**. The 4 failures are reference limitations, not test defects: (1) the independence regex (the reference is a node wrapper, which the regex must flag), (2) the relative-path case (the reference's `node --import tsx` resolves tsx from the cwd), (3)+(4) two test defects of mine (a one-line synthetic brief makes every other line a mismatch) which I fixed (use the truncation line) and re-ran green.
- The reference's facts on the corpus equal my hand-computed `FACTS_A` for all seven non-git facts (release needs git).
- an eval driver + 12-question file: **53 of 53 eval reds pass**.
- R3 plumbing (no 11 code): `wikiBuildHandler` and `doctorHandler` run in-process on the corpus copy, `contradictions.md` survives the build, doctor prints the resolver line and the blocked list. The brief-dependent assertions cannot be proven without 11; they are the printed-line contract from 11's own reds (C11.1 plus G-M2-59/62/63 formats).

## Scenario -> test map
| Gherkin / requirement | Tests |
|---|---|
| S1 Outline "agrees with the oracle" (A: SPRINT-9 active; B: no active) | brief-truth-oracle (per variant: all 8 prefixed lines, `--compare` file and stdin exit 0, hand-computed third witness); oracle facts A/B |
| S1 "no reference to cleargate, dist/ or src/" | oracle "independence (G-M2-32)" (the plan's regex, not the Gherkin's literal text); `bash -n`; shebang; 0755 |
| S2 planted fault, "mismatch: carried", exit 1 | oracle compare (planted carried, both values shown) and brief-truth-oracle (printed brief with BUG-13 removed; also a P0/P1 plant) |
| S2 "jq not on PATH -> jq required, not skipped" | oracle (PATH without jq, both modes, exit 2, stderr) + brief-truth-oracle; `requireJq` guards fail instead of skipping |
| S3 live eval: 12 sessions, hook line, evidence, verdict, smoke | eval units: `runQuestion` (fake claude: argv, cwd, transcript), `hookInjected`, `countToolUses`, `scoreAnswer`, `evaluateTranscript`, `computeVerdict`, `renderEvidence`; manual release run is §2.2 |
| S4 baseline `--version 0.28.0` | `computeVerdict` BASELINE (7/12, 0/12, tool-using), evidence "baseline" label; the npm install path is manual (§2.2) |
| S5 cannot run -> "not run", INCOMPLETE, non-zero | `runQuestion` (no claude on PATH; timeout) -> `{ran:false}`; `computeVerdict` (11+1 not run is INCOMPLETE not PASS; 10+2 not FAIL; exit 3); evidence row "not run" |
| R1 JSON, one key per fact | oracle facts A/B, D1-D8 edge cases (D1 x14 incl. A3 state-unknown x7, D2 a/b/c/d + union, D3, D4 x15, D5, D6, D7, D8) |
| R2 compare, `+N more`, ordering | oracle compare (single-fact mutations x9, planted, two facts, A-vs-B, ID lists, k=0, k=3, +N, N-1 for G-M2-63, Decisions sequence, missing lines vs truncation line, noise/indented lines, stdin and file) |
| R3 in `npm test` | brief-truth-oracle (default tier, no dist, no network) |
| R4 corpus | orientation-corpus guards; corpus hand-computed in `_oracle-support.ts` |
| R5/R6 questions + scoring | questions file x4 (12 questions, 8 keys, page tokens answerable from the corpus, no prompt leaks its answer); scorer; tool-use counter on a stream with `PostToolUse:Bash` hook events + `Skill` |
| R7/R9 verdict, Opus-only gate, smoke label | `computeVerdict`, `renderEvidence` labels |
| R8 baseline label | as S4 |
| C12.1 exit 2 + `brief-oracle: jq required` | oracle + R3 |
| C12.2 mismatch lines, exit 0/1, missing line vs truncation line, k/+N, k=0, Decisions sequence | oracle compare |
| C12.3 VERDICT line forms and exit codes | `computeVerdict` (PASS 0, FAIL 1, INCOMPLETE 3, SMOKE PASS/FAIL k/12 0/1, BASELINE k/12 0) |
| budget flags | `runQuestion`: `--max-turns 8`, `--max-budget-usd 2` default, override honoured |
| "must NOT count PostToolUse:Bash hook events or Skill" | `countToolUses` x5 and `evaluateTranscript` with a stream containing both |
| G-M2-46/55/58/59/61/62.5/63/64/65 | D2 b forms and placeholders (G-M2-46), unset spellings and D4 key rules (G-M2-55), D7 sections/dates/nested/orphans (G-M2-58), Decisions `[[ID]]` sequence (G-M2-59), D8 two-call form (G-M2-61), k=0 (G-M2-62.5), N-1 (G-M2-63), quoted `"true"`/`"false"` (G-M2-64) |

## Contracts the Developer must implement exactly (pinned in the test headers)
`brief-oracle.sh <repo>` prints one JSON object:
`{ active_sprint: string, waiting: {failing_gates, open_questions, unlabelled_contradictions, close_checklists, ids[]}, p0p1: {count, ids[]}, last_closed: string, carried: {count, ids[]}, planned: [{id, green, members}], decisions: string[], release: string }`
- string facts are the text after the prefix (D1/D4/D8 exact); id lists are COMPLETE (the first-5 cut is compare-side); `planned` is D6 order with the live active sprint removed; `decisions` is the first 5 D7 ids, duplicates kept.
- compare: `mismatch: <json key> brief=<…> truth=<…>` (stdout or stderr), exit 0/1; usage error, unreadable brief file or missing repo -> exit 2; no jq -> exit 2 and `brief-oracle: jq required` on stderr, before any work.
`orientation-eval.mjs` exports `GATING_MODEL, countToolUses, hookInjected, scoreAnswer, requiredTokensFor, evaluateTranscript, runQuestion, computeVerdict, renderEvidence, corpusTreeSha256`, behind an `import.meta` main guard (signatures in the test header). `orientation-questions.json`: an array (or `{questions}`) of `{id, kind: 'brief'|'page', key?, prompt, requiredTokens?}`.
Hints: tests spawn `bash` from PATH, so avoid bash-4-only features (macOS /bin/bash is 3.2) and GNU-only awk/sed; the static regex also flags the words `node`, `npx`, `tsx`, `cleargate` as separate words in COMMENTS; use `LC_ALL=C sort`.

## Shape-change reds for the Dev
None. No existing test reads the new paths (checked: no test enumerates `scripts/` or `scripts/clean-room/`; `check-no-inline-id-regex` scans only `src/` and the scaffold scripts). The 3 shape changes carried by 11 (map pins, `doctor-session-start` 2->3, relocation live test 3) are 11's.

## Ambiguities (default chosen; unpinned items listed)
1. **JSON value shapes** of the 8 facts are not in C12.1 (keys only): chosen as above. Say so if 11/TPV prefer another shape; only `_oracle-support.ts` and the eval's `requiredTokensFor` read it.
2. **R2 "ordering-insensitive" vs C12.2 "first k in D-order"**: NOT pinned either way for the non-Decisions lists (a shuffled-but-same-set list is unpinned). Pinned strict only where the plan is explicit: Decisions (sequence, duplicates kept, G-M2-59) and P0/P1 (a P1-only prefix is a wrong prefix).
3. **Mismatch output stream** (stdout vs stderr) unpinned; tests read both. Mismatch value rendering after `brief=`/`truth=` unpinned except that the truth side names the removed carried id and the brief side does not.
4. **Titles** in `P0/P1 bugs:` and excerpts in `Decisions:` are not compared (C12.2 compares ids). The R3 "third witness" does pin them against 11's printed output (titles = deriveTitle, 10 words; excerpts per G-M2-59).
5. **SPEC GAP, §2.2 step 3 / §R step 10**: `brief-oracle.sh --compare .cleargate/wiki/brief.md .` on the RAW file has markers, not `Active sprint:`/`Release:` lines, so by C12.2's literal "a missing prefixed line is a mismatch" it exits 1. §R step 10's `doctor --session-start | … --compare - .` is right. Recommend amending §2.2 step 3 to the pipe form. Not tested (no red on the raw file).
6. **Exit code 2** for usage / unreadable brief / missing repo is my default (C12 only fixes jq=2); it keeps 1 meaning "mismatch".
7. **release_repos** parsing: pinned for the flow-list form (`["."]`, `[a, sub/b, "c"]`) that §R step 9 writes; block lists unpinned.
8. **Eval defaults**: INCOMPLETE (exit 3) wins over BASELINE and SMOKE; FAIL/SMOKE FAIL exit 1; a non-injected brief (`hookOk === false`) fails a release/smoke run, `'n/a'` for baseline; scoring an empty token list throws or is wrong; token containment case-sensitivity unpinned; `--model` default unpinned; `run` with `--container` that exists/relative/no subcommand -> exit 2.
9. **Waiting tokens** are the first five ids only (the sixth sits behind `+1 more`; requiring it would make the question unanswerable from the brief).
10. **Page questions are bound to the corpus**: duplicate check -> `EPIC-23`; EPIC-20's children -> `CR-130` and `BUG-26`; BUG-26 root cause -> the phrase `rollup counter`; what CR-130 superseded -> `CR-099`. The Developer writes prompts, not tokens, around these (a red asserts each token occurs in the corpus and no prompt contains its own token).
11. **No live `*.integration` test**: the live eval and the 0.28.0 baseline need packing, an install, network and model spend, and `validateContainer` refuses temp roots and git work trees; they stay the manual §2.2 gate. The dogfood compare on the meta-repo is §R step 10.
12. Fixtures use 2-digit sprint IDs where a report is needed (SPRINT-08); SPRINT-9/10/11 carry none.

## Corpus facts (hand-computed; the Dev must keep them true or update `_oracle-support.ts`)
Active SPRINT-9 (4 stories: Architect Passed=1, Done=2, Ready to Bounce=1); Waiting `3 · 1 · 1 · 1` with ids BUG-22, CR-098-Legacy-Hyphen-Slug, CR-130, EPIC-22, SPRINT-08, STORY-009-04 (6, so `+1 more`); P0/P1 BUG-20, BUG-21, BUG-25; Last closed `SPRINT-08 (2026-10-05) — Shipped — 5 planned, 3 shipped, 2 carried over — carried 2` (Abandoned SPRINT-07 is newer, older Completed SPRINT-06 exists); Carried BUG-12, BUG-13 (quoted "true"), BUG-15, STORY-008-05; Planned SPRINT-10 2/3, SPRINT-11 0/1 (+ SPRINT-9 2/4 with no active); Decisions CR-130, EPIC-20 x2, CR-14, EPIC-23; Release `.: v0.0.1 + 1 commits`. It carries one `<instructions>`-led item whose block holds a `---` line (STORY-010-02, an SPRINT-10 member, so a wrong frontmatter locator changes 2/3), a legacy hyphen-slug id, an indented-`Human decision` form, an inline form, a placeholder answer, and `approved_at: null`.

## flashcards_flagged
- "2026-11-12 · #qa-red #oracle · A throwaway reference built on the src modules proves corpus expectations; its own limits (node wrapper, cwd tsx) fail the independence/relative-path reds by design."
- "2026-11-12 · #qa-red #test-harness · Import a .mjs driver in a CHILD process first: with no import.meta guard it runs main() and kills the test runner."
- "2026-11-12 · #qa-red #oracle · A one-line synthetic brief makes every other prefixed line a mismatch; add the truncation line to excuse them."
- "2026-11-12 · #brief #oracle · brief.md holds markers, not the live Active/Release lines: --compare on the file mismatches; pipe doctor --session-start."

## TPV bounce applied
Applied Changes 1–9 as written (Change 10 left as is; Change 11 is the orchestrator's). Edits are in wt12 on top of 81ed826, uncommitted. Suggested commit subject: `qa-red(STORY-063-12): apply TPV bounce (G-M2-66/67/69, G-M2-71..77)`.
Line numbers are in the working tree (they moved when the edges were cut out).

| # | Change | Where (wt12 working tree) |
|---|---|---|
| 1 | default env `LC_ALL`/`LANG` = `en_US.UTF-8` | `test/wiki/_oracle-support.ts:78` (`defaultEnv`, used by `runOracle` `:86` and `runOracleAsync` `:100`) |
| 2 | `mismatches` from stdout only | `_oracle-support.ts:80-82` (`toRun`) |
| 3 | `sharedCorpus` `:69`, `SHELL_TOOLS` `:142` (used by `pathWithoutJq` `:147`), `runOracleAsync` `:94`, `compareAsync` `:133` | `_oracle-support.ts` |
| 4a | SPRINT-9 `sprint_goal` as a block scalar | `fixtures/orientation-corpus/.cleargate/delivery/pending-sync/SPRINT-9_Session_Brief_Rollout.md` |
| 4b | SPRINT-10 `sprint_cleargate_id: SPRINT-10` | `.../SPRINT-10_Index_Follow_Ups.md:5` |
| 4c | bait `**Stories:**` line; `LAST_CLOSED` | `.../sprint-runs/SPRINT-08/SPRINT-08_REPORT.md:9`; `_oracle-support.ts:171` |
| 4d | corpus guards (members filter, SPRINT-10 self-reference, block-scalar and bait asserts) | `test/wiki/orientation-corpus.node.test.ts` (members guard, sprints guard) |
| 5a | D1–D8 describes and helpers moved out | new `test/wiki/brief-oracle-edges.red.integration.node.test.ts` (bodies unchanged; D6 gets E7 at `:301`) |
| 5b | variant A computes facts once in `before`; variant B/no-git/relative/space use `sharedCorpus`; read-only test keeps `corpusRepo()` | `brief-oracle.red.node.test.ts` (variant A and B describes) |
| 5c | four compare describes `{ concurrency: 4 }`, async, `compareAsync`/`runOracleAsync`, `sharedCorpus` (the raw-files test keeps `corpusRepo()`); exit-codes describe stays sync | `brief-oracle.red.node.test.ts:~150-310` |
| 5d | `LIVE0` prefix on the two synthetic-repo briefs; truncation-never-excuses test `:299`; D-order test `:213` | same file |
| 5e | G-M2-67 title test (`P0P1_TRICKY`) | same file `:218` |
| 5f | no-glob / quotes / backslash test; interior-whitespace bad case | same file `:223` |
| 5g | raw `brief.md` refused (exit 2, stderr, no mismatch) | same file `:331` |
| 5h | header contract (stdout, exit 2, never-excused lines, D-order, live caps) | same file `:1-25` |
| 6 | E1 `:418`, E2 (same describe), E3/E4 `:436`, E5 `:459`, E6 `:487` (`d1Repo` split `:35`, `capBytes`), E7 `:301`, E8 `:507`, E9 `:526` | edges file |
| 7 | `shared(active)` once per variant; the raw-file test keeps `built()`; `cleargateHome: tmp(...)` | `brief-truth-oracle.red.node.test.ts` (`once`/`shared` after `built`) |
| 8a-f | whole-id/case scoring test, recorded answers + evidence test, `exec sleep 10`, `parseArgs` + CLI budget tests, BASELINE-over-SMOKE assert, header | `orientation-eval.red.node.test.ts:161, :395, :420, :297, :568, :371` |

Nothing improvised beyond the list. One judgement call inside Change 5b: variant A's `before` stores the `runOracle` result (not a throwing `facts()`), so a missing script fails each test with the child's output instead of one suite-level hook error.

### Counts at 81ed826 + this bounce (against wt12, no oracle, no 11)
- Default tier: **142 tests = 128 red + 14 guards** (oracle 60 = 59+1, R3 15 = 13+2, eval 57 = 56+1, corpus 10 guards).
- Integration tier (`brief-oracle-edges.red.integration`): **73 tests, 73 red, 0 guards**. Run targeted: `npm run test:file -- test/wiki/brief-oracle-edges.red.integration.node.test.ts` (and at §R step 1).
- Was 171 red + 14 guards in one default tier; the 70-odd D1–D8 reds moved to the integration tier.

### Reds that need STORY-063-11 / 11-F1 (not in wt12; expected)
- All 13 R3 reds (`brief-truth-oracle`): fail on `precondition: wiki build wrote wiki/brief.md`. After 11, the third-witness and compare reds also need 11-F1's G-M2-66 (Planned `2/3`, not `2/4`) and G-M2-67 (`;`→`,` in titles). Everything else in R3 needs only the oracle.
- The corpus guards are green now and independent of 11.

### Self-consistency (scratch only; deleted)
Throwaway references in `scratchpad` (never in wt12): an oracle patched for the new contract (stdout mismatches, raw-brief refusal, live lines never excused, members skip sprint files) passes **58 of 60** default oracle reds (the 2 failures are by design: the reference is a node script, so the independence red must flag it); an eval driver with `parseArgs`, case/digit-boundary scoring and recorded answers passes **57 of 57** eval reds and the 10 corpus guards. Not re-proven with a reference: the edges file (73 reds; they are the old matrix plus E1–E9 verbatim from the TPV), E6 live caps, E8 block lists, E9 spawn counts, and R3.
`tsc --noEmit` (strict, noUnusedLocals) on all six test files: clean.

### Measured wall time (`uptime` before/after)
- At wt12 (reds, no oracle): oracle file 19.9 s, R3 10.1 s, eval 2.2 s, corpus 1.5 s (load 7.0 / 9.2 / 10.6, 22:05).
- Against the throwaway references (the oracle reference starts a node+tsx process per call, so it is slower than a shell oracle will be): oracle file **49.8 s**, eval **4.2 s** (load 7.5 / 8.9 / 10.4 before, 11.9 / 9.9 / 10.6 after, 22:06-22:07). R3 cannot be timed green without 11; its red run is 10.1 s (it stops at the first build precondition after one corpus build per variant).

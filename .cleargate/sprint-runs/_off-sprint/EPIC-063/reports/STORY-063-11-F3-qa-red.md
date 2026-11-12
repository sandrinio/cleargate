# STORY-063-11-F3 QA-Red (Waiting line names each item's reason)

Worktree: .../scratchpad/wt11f3 (branch story/STORY-063-11-F3 @ 0840783). No production code touched (src/ and scripts/ clean; `tsc --noEmit` clean). Not committed.

## Corpus check
Verified from test/fixtures/orientation-corpus and session-brief.ts:312-324: gates = STORY-009-04, CR-098-Legacy-Hyphen-Slug, BUG-22 (CR-099 is archived/closed); questions = EPIC-22; unlabelled contradictions = CR-130 (EPIC-23 is labelled); checklists = SPRINT-08. All match the brief's stated line; nothing differs.

## Facts shape chosen (oracle facts mode)
`waiting: { gates: string[], questions: string[], contradictions: string[], checklists: string[] }` — ALL ids of each reason, C order, duplicates kept (one per row, like `carried`); each list's length is the count. The old `failing_gates/open_questions/unlabelled_contradictions/close_checklists/ids` keys are gone (a `deepEqual` pins the exact four keys).
Consequence flagged for Dev: two files with one id (E4) now give `gates: ['CR-7','CR-7']` and the line `2 failing gates (CR-7, CR-7)`; the compiler's per-reason lists must likewise not be deduped (gateIds etc. are not today; only the removed union was).

## Compare semantics pinned (oracle)
Per part: count equals the truth, noun singular iff n=1, listed ids are an in-order prefix of that reason's truth, `+k` present iff ids are hidden and k = n - shown; a part with n=0 has no parens; level 0 = counts only. Attribution is by part. The old merged `— <ids>` form, a trailing list, extra/gap/shuffled/mis-attributed ids, wrong noun number, a `+k` with nothing hidden, a hidden id with no `+k` are all `mismatch: waiting`. NOT pinned (left to Dev): whether a part may show fewer ids than min(n, L) with a correct `+k`, and whether parts must share one level.

## Files
New: test/wiki/session-brief-f3.red.node.test.ts (14 tests), test/scripts/orientation-eval-f3.red.node.test.ts (6).
Changed: test/wiki/_brief-support.ts (+`waitingSyntheticRepo(pad)`, `WAIT_SYNTH`), test/wiki/_oracle-support.ts, test/wiki/session-brief.red.node.test.ts, test/wiki/brief-oracle.red.node.test.ts, test/wiki/brief-oracle-edges.red.integration.node.test.ts, test/scripts/orientation-eval.red.node.test.ts.
Untouched and still green (zero-count line is unchanged: plural, no parens): session-brief-f1.red, session-brief-f2.red, session-brief-handlers.red, commands/doctor-session-brief.red (28/28), brief-truth-oracle.red's structure (see below), orientation-eval-f1.red, orientation-eval.red BRIEF_OUT line 71, LIVE0/E6 tails.

## Sealed-expectation edits (old -> new, why)
- _oracle-support.ts: `Facts.waiting` type -> four id lists (F3 facts shape). `FACTS_A.waiting` {counts, ids:[6 union]} -> `{gates:[BUG-22,CR-098-Legacy-Hyphen-Slug,STORY-009-04], questions:[EPIC-22], contradictions:[CR-130], checklists:[SPRINT-08]}`. `LINES_A.waiting` old merged line -> `Waiting on you: 3 failing gates (BUG-22, CR-098-Legacy-Hyphen-Slug, STORY-009-04) · 1 open question (EPIC-22) · 1 unlabelled contradiction (CR-130) · 1 unfinished close checklist (SPRINT-08)`.
- session-brief.red: rich-fixture "Waiting on you (D2)" `2 failing gates · 1 open questions · 1 unlabelled contradictions · 1 unfinished close checklists — BUG-30, CR-4, CR-5, EPIC-2, SPRINT-08` -> `2 failing gates (CR-4, EPIC-2) · 1 open question (BUG-30) · 1 unlabelled contradiction (CR-5) · 1 unfinished close checklist (SPRINT-08)`. D2 a: startsWith/endsWith -> equal `2 failing gates (EPIC-1, STORY-005-01) · 0 …`. D2 b: -> `0 failing gates · 5 open questions (CR-10, EPIC-4, EPIC-5, EPIC-6, EPIC-7) · …`. "counts items": `· 1 open questions` -> `· 1 open question (EPIC-1) ·`. D2 c: `· 2 unlabelled contradictions ·`+endsWith ` — EPIC-8, EPIC-9` -> `· 2 unlabelled contradictions (EPIC-8, EPIC-9) ·`. D2 d: -> endsWith `· 2 unfinished close checklists (SPRINT-3, SPRINT-6)`. "ID in several sets" (title reworded): `8 failing gates · 1 open questions … — CR-10..CR-14 +3 more` -> `8 failing gates (CR-10, CR-11, CR-12, CR-13, CR-14 +3 more) · 1 open question (EPIC-1) · 0 … · 0 …`. R3 default lists: `40 failing gates · … — EPIC-100..EPIC-104 +35 more` -> `40 failing gates (EPIC-100, …, EPIC-104 +35 more) · 0 open questions · 0 … · 0 …`. R3 G-M2-62(a)/(b): endsWith ` — EPIC-100, EPIC-101, EPIC-102 +37 more` -> equal `40 failing gates (EPIC-100, EPIC-101, EPIC-102 +37 more) · 0 … `. (`startsWith('40 failing gates')` at level 0 and the empty-corpus line are unchanged and green.)
- brief-oracle.red: header contract (facts shape + compare rule); D2 test retitled (compares to new FACTS_A). Removed the old-format Waiting compare tests ("first five ids and N = |truth|-5", "k=3 shrunk", "all six ids, no suffix", old k=0 waiting) and the old-merged `w()` helper; the shuffled-list test now shuffles the gates part. Replaced with F3 tests (below). Existing `waiting` single-fault cases (`4 failing gates`, `EPIC-22 -> EPIC-23`) kept as is.
- brief-oracle-edges.red.integration: every `.failing_gates/.open_questions/.unlabelled_contradictions/.close_checklists/.ids` assertion (D2 a,b×3,c,d, several-sets, E3, E4) -> `deepEqual` on `.gates/.questions/.contradictions/.checklists`; "listed once" -> "listed under each reason"; E4 -> `{gates:['CR-7','CR-7'], questions:[], contradictions:[], checklists:[]}`.
- orientation-eval.red: "waiting: only the first five ids … never the sixth" -> required tokens for the corpus are exactly BUG-22, CR-098-Legacy-Hyphen-Slug, CR-130, EPIC-22, SPRINT-08, STORY-009-04 (the old first-5-of-union rule is gone).

## New reds
session-brief-f3.red (compiler; levels 3/0 found by binary search on the report pad, format-independent): singular/plural ×4 reasons, all-singular line, zero part, no ` — `, n=5 vs n=6, contradictions +1, level-5 per-reason cut with EPIC-100 under gates and contradictions, C order per reason, level 3 line, level 0 line (+ guard: level 3 precedes level 0).
brief-oracle.red F3: corpus line accepted at 5/3 and counts-only accepted; k=0 wrong count; attribution (2 swaps); noun number (4 wrong forms); old merged form (2 variants); id-list faults (extra, missing no +k, gap, foreign id, +k with nothing hidden).
brief-oracle-edges.red.integration F3: facts per reason on a repo with 8 gates / 4 questions / 1 contradiction / 2 checklists (CR-10 under two reasons); L5/L3/L0 accepted; wrong +k/count/gap/shuffle/extra; mis-attribution; noun number; merged form; duplicate-id rows; round trip: the compiler's real level-5/3/0 text on `waitingSyntheticRepo` accepted by the oracle on the same repo.
orientation-eval-f3.red: corpus tokens, all-empty -> ['none'] (guard), single reason, first 5 of each reason, dedupe, sixth-of-one-first-of-another.

## Run at baseline (failing now)
Totals: 82 reds. Per file:
- session-brief-f3.red: 13 fail, 1 pass (guard). Failing reasons: old plural nouns / no parens / trailing ` — ids` (e.g. level 3 actual `… 1 unlabelled contradictions · 6 unfinished close checklists — EPIC-100, EPIC-101, EPIC-102 +43 more`).
- session-brief.red: 9 fail / 66 pass: `Waiting on you (D2, F3): each reason names its own IDs in C order`; D2 `a`, `b`, `b counts items, not pairs`, `c`, `d`; `an ID that is in several sets is listed under each reason…`; R3 `40 failing gates, 30 P0/P1 bugs, 25 carried…`; `G-M2-62 (a)/(b)…`.
- brief-oracle.red: 38 fail / 24 pass. Cause: facts keys (D2 waiting, whole-object, 4 facts tests) plus every compare test that feeds `LINES_A` (it now carries the new Waiting line, which the old oracle rejects) — these go green with the oracle change alone; the genuine F3 reds are `F3: the corpus Waiting line passes…`, `F3: k = 0…`, `F3: the old merged form is a mismatch`.
- brief-oracle-edges.red.integration: 14 fail / 67 pass: D2 a, b×3, c, d, several-sets, E3, E4 (facts keys) and F3 `facts: each reason lists…`, `level 5, level 3 and level 0 lines that match the truth are accepted`, `a wrong noun number…`, `two files with one id are two rows…`, `the compiler's own level-5, level-3 and level-0 Waiting text…`. Guards that pass vacuously until the oracle exists: wrong +k/gap, mis-attribution, merged form (the old oracle rejects any new-format line).
- brief-truth-oracle.red: 2 fail (`a third witness: every printed line equals the hand-computed line for the corpus` ×2 — compiler emits the old line); the compare/planted-fault tests stay green until compiler and oracle diverge, so Dev must change both.
- orientation-eval.red + orientation-eval-f3.red: 6 fail (`waiting (F3): …`; f3 corpus / one reason / first five of each / dedupe / sixth-of-one-first-of-another) + 1 guard (`all four reasons empty -> ["none"]`).
Self-check: a throwaway compiler reference (per-reason parts, sorted C order, `moreOf`) made session-brief-f3 + session-brief.red 89/89 pass and the two `third witness` tests pass; src restored (git diff on src/ empty). The oracle side was not self-checked against a reference (jq change not prototyped).

## What the Developer provides
- `session-brief.ts` Waiting section: per-reason lists (sorted by byCOrder, not deduped), `<n> <noun>` with singular at n=1, ` (<first L ids>[ +<n-L> more])` for n>0 at L∈{5,3}, none at n=0 or level 0, ` · ` join, no trailing list.
- `scripts/brief-oracle.sh`: facts `waiting` shape above (awk emits per-reason `WI` rows, e.g. typed rows); compare logic above; keep bash+awk+jq, LC_ALL=C, spawn budget, no node.
- `orientation-eval.mjs` `requiredTokensFor('waiting')`: union (deduped) of `facts.waiting.{gates,questions,contradictions,checklists}[0..5)`, `['none']` when all empty.
- Not covered by a red: CHANGELOG.md still describes the old line (release-note edit at the orchestrator's step); the brief-oracle.sh header comment line 7.

## flashcards_flagged
none
